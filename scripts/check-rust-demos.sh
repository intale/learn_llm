#!/usr/bin/env bash
set -euo pipefail

export LC_ALL=C
export TZ=UTC
export CARGO_NET_OFFLINE=true
export CARGO_TERM_COLOR=never

script_dir=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
repository_root=$(CDPATH= cd -- "${script_dir}/.." && pwd)
temporary_directory=$(mktemp -d)
metadata_path="${temporary_directory}/metadata.json"
demo_manifest_path="${temporary_directory}/chapter-demos.tsv"

cleanup() {
  rm -rf -- "${temporary_directory}"
}
trap cleanup EXIT

cargo metadata \
  --format-version 1 \
  --locked \
  --offline \
  --no-deps \
  --manifest-path "${repository_root}/Cargo.toml" \
  >"${metadata_path}"

node --input-type=module - "${repository_root}" "${metadata_path}" >"${demo_manifest_path}" <<'NODE'
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
} from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

const [repositoryRoot, metadataPath] = process.argv.slice(2).map((value) =>
  resolve(value),
);
process.on('uncaughtException', (error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
const chapterIdPattern = /^\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const packagePattern = /^ch\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const demoRoot = join(repositoryRoot, 'rust/demos');
const contractRoot = join(repositoryRoot, 'curriculum/chapters');

function fail(message) {
  throw new Error(`Rust demo check failed: ${message}`);
}

function parseContract(path) {
  const source = readFileSync(path, 'utf8');
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) fail(`${path}: missing JSON frontmatter`);
  try {
    return JSON.parse(match[1]);
  } catch (error) {
    fail(`${path}: invalid JSON frontmatter: ${error.message}`);
  }
}

function duplicate(values, label) {
  if (new Set(values).size !== values.length) fail(`duplicate ${label}`);
}

const contracts = readdirSync(contractRoot, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
  .map((entry) => {
    const path = join(contractRoot, entry.name);
    const data = parseContract(path);
    if (!chapterIdPattern.test(data.chapter_id)) {
      fail(`${path}: invalid chapter_id`);
    }
    if (!Number.isInteger(data.order) || data.order < 1) {
      fail(`${path}: invalid chapter order`);
    }
    if (!data.chapter_id.startsWith(String(data.order).padStart(2, '0') + '-')) {
      fail(`${path}: chapter_id prefix and order differ`);
    }
    const expectedPackage = `ch${data.chapter_id}`;
    if (data.rust?.package !== expectedPackage) {
      fail(`${path}: rust.package must equal ${expectedPackage}`);
    }
    return { path, data, packageName: expectedPackage };
  })
  .sort((left, right) => left.data.order - right.data.order);

if (contracts.length === 0) fail('no chapter contracts were found');
duplicate(contracts.map((contract) => contract.data.chapter_id), 'contract chapter_id');
duplicate(contracts.map((contract) => contract.data.order), 'contract order');
contracts.forEach((contract, index) => {
  if (contract.data.order !== index + 1) {
    fail('chapter contracts must form a contiguous prefix beginning at order 1');
  }
});

const chapterEntries = [];
for (const entry of readdirSync(demoRoot, { withFileTypes: true })) {
  const path = join(demoRoot, entry.name);
  if (entry.name === 'chapter-demo-template') {
    try {
      lstatSync(join(path, 'expected.txt'));
      fail('chapter-demo-template must not contain expected.txt');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    continue;
  }
  if (!packagePattern.test(entry.name)) {
    if (existsSync(join(path, 'expected.txt'))) {
      fail(`${path}: only chapter demo directories may contain expected.txt`);
    }
    continue;
  }
  const stats = lstatSync(path);
  if (!entry.isDirectory() || stats.isSymbolicLink()) {
    fail(`${path}: chapter demo must be a real immediate directory`);
  }
  chapterEntries.push({ packageName: entry.name, path });
}

if (chapterEntries.length === 0) fail('no chapter demo directories were found');
duplicate(chapterEntries.map((entry) => entry.packageName), 'chapter demo directory');

const contractPackages = contracts.map((contract) => contract.packageName).sort();
const directoryPackages = chapterEntries.map((entry) => entry.packageName).sort();
if (JSON.stringify(contractPackages) !== JSON.stringify(directoryPackages)) {
  fail(
    `contract/demo directory mismatch: contracts=[${contractPackages.join(', ')}], demos=[${directoryPackages.join(', ')}]`,
  );
}

let metadata;
try {
  metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
} catch (error) {
  fail(`invalid cargo metadata JSON: ${error.message}`);
}
if (!Array.isArray(metadata.packages) || !Array.isArray(metadata.workspace_members)) {
  fail('cargo metadata is missing packages or workspace_members');
}
duplicate(metadata.packages.map((pkg) => pkg.id), 'Cargo package ID');
const workspaceMembers = new Set(metadata.workspace_members);
const chapterPackages = metadata.packages.filter((pkg) =>
  packagePattern.test(pkg.name),
);
const metadataNames = chapterPackages.map((pkg) => pkg.name).sort();
duplicate(metadataNames, 'Cargo chapter package name');
if (JSON.stringify(metadataNames) !== JSON.stringify(contractPackages)) {
  fail(
    `contract/Cargo package mismatch: contracts=[${contractPackages.join(', ')}], Cargo=[${metadataNames.join(', ')}]`,
  );
}

for (const pkg of chapterPackages.sort((left, right) => left.name.localeCompare(right.name))) {
  if (!workspaceMembers.has(pkg.id)) fail(`${pkg.name}: package is not a workspace member`);
  const demoDirectory = join(demoRoot, pkg.name);
  const expectedManifest = join(demoDirectory, 'Cargo.toml');
  if (resolve(pkg.manifest_path) !== resolve(expectedManifest)) {
    fail(`${pkg.name}: manifest is not the immediate matching demo Cargo.toml`);
  }
  if (basename(dirname(pkg.manifest_path)) !== pkg.name) {
    fail(`${pkg.name}: package name and directory differ`);
  }
  const bins = pkg.targets.filter((target) => target.kind.includes('bin'));
  if (bins.length !== 1) fail(`${pkg.name}: expected exactly one binary target`);
  const bin = bins[0];
  const expectedMain = join(demoDirectory, 'src/main.rs');
  if (bin.name !== pkg.name || resolve(bin.src_path) !== resolve(expectedMain)) {
    fail(`${pkg.name}: binary must share the package name and use src/main.rs`);
  }

  const fixture = join(demoDirectory, 'expected.txt');
  let fixtureStats;
  try {
    fixtureStats = lstatSync(fixture);
  } catch (error) {
    if (error.code === 'ENOENT') fail(`${pkg.name}: missing expected.txt`);
    throw error;
  }
  if (!fixtureStats.isFile() || fixtureStats.isSymbolicLink() || fixtureStats.size === 0) {
    fail(`${pkg.name}: expected.txt must be a nonempty regular file`);
  }
  const contract = contracts.find((candidate) => candidate.packageName === pkg.name);
  if (readFileSync(fixture, 'utf8') !== contract.data.rust.expected_output) {
    fail(`${pkg.name}: expected.txt differs byte-for-byte from contract rust.expected_output`);
  }
  process.stdout.write(`${pkg.name}\0${bin.name}\0${fixture}\0`);
}
NODE

if [[ ! -s "${demo_manifest_path}" ]]; then
  echo "Rust demo check failed: no runnable chapter demos were discovered." >&2
  exit 1
fi

checked=0
while IFS= read -r -d '' package_name && \
  IFS= read -r -d '' binary_name && \
  IFS= read -r -d '' expected_path; do
  actual_path="${temporary_directory}/${package_name}.actual.txt"
  cargo run \
    --quiet \
    --locked \
    --offline \
    --manifest-path "${repository_root}/Cargo.toml" \
    --package "${package_name}" \
    --bin "${binary_name}" \
    >"${actual_path}"
  if ! diff -u \
    --label "${expected_path}" \
    --label "${package_name} stdout" \
    "${expected_path}" \
    "${actual_path}"; then
    echo "Rust demo check failed: deterministic stdout drifted for ${package_name}." >&2
    exit 1
  fi
  checked=$((checked + 1))
done <"${demo_manifest_path}"

echo "Rust demo check passed: ${checked} discovered chapter demo(s)."
