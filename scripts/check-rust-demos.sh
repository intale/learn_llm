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
import { pathToFileURL } from 'node:url';

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

const { verifyProductLock } = await import(pathToFileURL(
  join(repositoryRoot, 'scripts/lib/course-publication-lock.mjs'),
).href);
const { readChapterContractSummaries } = await import(pathToFileURL(
  join(repositoryRoot, 'scripts/check-site-content.mjs'),
).href);
const { readCourseConfiguration } = await import(pathToFileURL(
  join(repositoryRoot, 'scripts/check-course-boundaries.mjs'),
).href);
const lock = verifyProductLock(repositoryRoot);
const practicalCourse = readCourseConfiguration(repositoryRoot).courses.find(
  (course) => course.id === 'practical-llm-in-rust',
);
const practicalLock = lock.courses.find(
  (course) => course.courseId === practicalCourse.id,
);
const practicalContracts = readChapterContractSummaries(repositoryRoot, {
  course: practicalCourse,
}).flatMap(({ data }) => {
  if (!practicalLock.chapters.some(
    (chapter) => chapter.chapterId === data.chapter_id && chapter.order === data.order,
  )) fail('Practical contract is outside the current product lock');
  if (data.order === 0 && data.rust === null) return [];
  const packageName = `practical-ch${data.chapter_id}`;
  if (data.rust?.package !== packageName) fail('Practical demo contract/package mismatch');
  return [{data, packageName}];
});
const practicalDemoNames = practicalContracts.map(({packageName}) => packageName).sort();
duplicate(practicalDemoNames, 'Practical demo registration');
if (practicalDemoNames.length !== 10) fail('expected exactly ten registered Practical demos');
console.error(`Registered Practical demo directories: ${practicalDemoNames.join(', ')}`);

const chapterContracts = readdirSync(contractRoot, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
  .map((entry) => {
    const path = join(contractRoot, entry.name);
    const data = parseContract(path);
    if (!chapterIdPattern.test(data.chapter_id)) {
      fail(`${path}: invalid chapter_id`);
    }
    if (!Number.isInteger(data.order) || data.order < 0) {
      fail(`${path}: invalid chapter order`);
    }
    if (!data.chapter_id.startsWith(String(data.order).padStart(2, '0') + '-')) {
      fail(`${path}: chapter_id prefix and order differ`);
    }
    const orientation = data.chapter_kind === 'orientation';
    if (orientation) {
      if (
        data.chapter_id !== '00-llm-parts' ||
        data.order !== 0 ||
        data.formula !== null ||
        data.rust !== null
      ) {
        fail(`${path}: the Chapter 0 orientation must have null formula and Rust plans`);
      }
      return { path, data, packageName: null };
    }
    const expectedPackage = `ch${data.chapter_id}`;
    if (data.rust?.package !== expectedPackage) {
      fail(`${path}: rust.package must equal ${expectedPackage}`);
    }
    return { path, data, packageName: expectedPackage };
  })
  .sort((left, right) => left.data.order - right.data.order);

if (chapterContracts.length === 0) fail('no chapter contracts were found');
duplicate(chapterContracts.map((contract) => contract.data.chapter_id), 'contract chapter_id');
duplicate(chapterContracts.map((contract) => contract.data.order), 'contract order');
const firstOrder = chapterContracts[0]?.data.order;
if (firstOrder !== 0 && firstOrder !== 1) {
  fail('chapter contracts must begin at order 0 or 1');
}
chapterContracts.forEach((contract, index) => {
  if (contract.data.order !== firstOrder + index) {
    fail('chapter contracts must form a contiguous prefix');
  }
});
const contracts = chapterContracts.filter((contract) => contract.packageName !== null);

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
    if (practicalDemoNames.includes(entry.name)) {
      const stats = lstatSync(path);
      if (!entry.isDirectory() || stats.isSymbolicLink()) {
        fail(`${path}: registered Practical demo must be a real immediate directory`);
      }
      continue;
    }
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
const workspacePackages = metadata.packages.filter((pkg) =>
  workspaceMembers.has(pkg.id),
);
const exampleOwners = new Map();
for (const pkg of workspacePackages) {
  for (const target of pkg.targets.filter((target) =>
    target.kind.includes('example'),
  )) {
    const previousOwner = exampleOwners.get(target.name);
    if (previousOwner !== undefined) {
      fail(
        `duplicate Cargo example target name ${JSON.stringify(target.name)}: ` +
          `${previousOwner} and ${pkg.name}`,
      );
    }
    exampleOwners.set(target.name, pkg.name);
  }
}

const chapterPackages = workspacePackages.filter((pkg) =>
  packagePattern.test(pkg.name),
);
const metadataNames = chapterPackages.map((pkg) => pkg.name).sort();
duplicate(metadataNames, 'Cargo chapter package name');
if (JSON.stringify(metadataNames) !== JSON.stringify(contractPackages)) {
  fail(
    `contract/Cargo package mismatch: contracts=[${contractPackages.join(', ')}], Cargo=[${metadataNames.join(', ')}]`,
  );
}

const practicalPackages = workspacePackages.filter((pkg) =>
  practicalDemoNames.includes(pkg.name),
);
const practicalMetadataNames = practicalPackages.map((pkg) => pkg.name).sort();
duplicate(practicalMetadataNames, 'Cargo Practical package name');
if (JSON.stringify(practicalMetadataNames) !== JSON.stringify(practicalDemoNames)) {
  fail(
    `Practical contract/Cargo package mismatch: contracts=[${practicalDemoNames.join(', ')}], Cargo=[${practicalMetadataNames.join(', ')}]`,
  );
}

const runnableRecords = [];
let traceCount = 0;
const runnableContracts = [...contracts, ...practicalContracts];
for (const pkg of [...chapterPackages, ...practicalPackages].sort((left, right) => left.name.localeCompare(right.name))) {
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
  const contract = runnableContracts.find((candidate) => candidate.packageName === pkg.name);
  if (readFileSync(fixture, 'utf8') !== contract.data.rust.expected_output) {
    fail(`${pkg.name}: expected.txt differs byte-for-byte from contract rust.expected_output`);
  }
  if (pkg.name === 'practical-ch07-configurable-decoder-core') {
    const fullTrace = join(repositoryRoot, 'site/src/data/course/configurable-decoder-core-trace.json');
    const traceStats = lstatSync(fullTrace);
    if (!traceStats.isFile() || traceStats.isSymbolicLink() || traceStats.size === 0) {
      fail(`${pkg.name}: complete site trace must be a nonempty regular file`);
    }
  }
  if (pkg.name === 'practical-ch08-dropout-semantics') {
    const compactTrace = join(repositoryRoot, 'site/src/data/course/dropout-semantics-trace.json');
    const traceStats = lstatSync(compactTrace);
    if (!traceStats.isFile() || traceStats.isSymbolicLink() || traceStats.size === 0) {
      fail(`${pkg.name}: compact site trace must be a nonempty regular file`);
    }
    if (!readFileSync(compactTrace).equals(readFileSync(fixture))) {
      fail(`${pkg.name}: compact site trace differs byte-for-byte from expected.txt`);
    }
  }
  const stdinPath = pkg.name === 'practical-ch02-corpus-preparation'
    ? join(demoDirectory, 'fixtures/prepared.jsonl')
    : '/dev/null';
  if (stdinPath !== '/dev/null') {
    const inputStats = lstatSync(stdinPath);
    if (!inputStats.isFile() || inputStats.isSymbolicLink() || inputStats.size === 0) {
      fail(`${pkg.name}: stdin fixture must be a nonempty regular file`);
    }
  }

  const traceSource = join(demoDirectory, 'examples/diagram_trace.rs');
  const traceFixture = join(demoDirectory, 'diagram-trace.txt');
  let traceSourceStats = null;
  let traceFixtureStats = null;
  try {
    traceSourceStats = lstatSync(traceSource);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  try {
    traceFixtureStats = lstatSync(traceFixture);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if ((traceSourceStats === null) !== (traceFixtureStats === null)) {
    fail(`${pkg.name}: diagram trace source and fixture must either both exist or both be absent`);
  }

  let traceTargetName = '';
  let traceFixturePath = '';
  const traceTargets = pkg.targets.filter(
    (target) =>
      target.kind.includes('example') &&
      resolve(target.src_path) === resolve(traceSource),
  );
  if (traceSourceStats !== null && traceFixtureStats !== null) {
    if (
      !traceSourceStats.isFile() ||
      traceSourceStats.isSymbolicLink() ||
      traceSourceStats.size === 0
    ) {
      fail(`${pkg.name}: examples/diagram_trace.rs must be a nonempty regular file`);
    }
    if (
      !traceFixtureStats.isFile() ||
      traceFixtureStats.isSymbolicLink() ||
      traceFixtureStats.size === 0
    ) {
      fail(`${pkg.name}: diagram-trace.txt must be a nonempty regular file`);
    }
    if (traceTargets.length !== 1) {
      fail(`${pkg.name}: expected exactly one Cargo example target for examples/diagram_trace.rs`);
    }
    const expectedTraceName = `${pkg.name}-trace`;
    if (traceTargets[0].name !== expectedTraceName) {
      fail(
        `${pkg.name}: diagram trace target must be named ${expectedTraceName}, got ${traceTargets[0].name}`,
      );
    }
    traceTargetName = traceTargets[0].name;
    traceFixturePath = traceFixture;
    traceCount += 1;
  } else if (traceTargets.length !== 0) {
    fail(`${pkg.name}: Cargo metadata registers a missing diagram trace source`);
  }

  runnableRecords.push([
    pkg.name,
    bin.name,
    fixture,
    traceTargetName,
    traceFixturePath,
    stdinPath,
  ]);
}

if (traceCount !== 34) {
  fail(`expected 34 diagram trace examples, found ${traceCount}`);
}
for (const record of runnableRecords) {
  process.stdout.write(`${record.join('\0')}\0`);
}
NODE

if [[ ! -s "${demo_manifest_path}" ]]; then
  echo "Rust demo check failed: no runnable chapter demos were discovered." >&2
  exit 1
fi

checked=0
trace_checked=0
original_checked=0
practical_checked=0
while IFS= read -r -d '' package_name && \
  IFS= read -r -d '' binary_name && \
  IFS= read -r -d '' expected_path && \
  IFS= read -r -d '' trace_target_name && \
  IFS= read -r -d '' trace_expected_path && \
  IFS= read -r -d '' stdin_path; do
  actual_path="${temporary_directory}/${package_name}.actual.txt"
  if cargo run \
    --quiet \
    --locked \
    --offline \
    --manifest-path "${repository_root}/Cargo.toml" \
    --package "${package_name}" \
    --bin "${binary_name}" \
    >"${actual_path}" <"${stdin_path}"; then
    :
  else
    execution_status=$?
    echo "Rust demo check failed: execution failed for ${package_name}." >&2
    exit "${execution_status}"
  fi
  if ! diff -u \
    --label "${expected_path}" \
    --label "${package_name} stdout" \
    "${expected_path}" \
    "${actual_path}"; then
    echo "Rust demo check failed: deterministic stdout drifted for ${package_name}." >&2
    exit 1
  fi
  checked=$((checked + 1))
  if [[ "${package_name}" == practical-ch* ]]; then
    practical_checked=$((practical_checked + 1))
  else
    original_checked=$((original_checked + 1))
  fi

  if [[ "${package_name}" == practical-ch07-configurable-decoder-core ]]; then
    actual_configurable_trace_path="${temporary_directory}/${package_name}.full-trace.actual.txt"
    cargo run \
      --quiet \
      --locked \
      --offline \
      --manifest-path "${repository_root}/Cargo.toml" \
      --package "${package_name}" \
      --bin "${binary_name}" \
      -- --trace \
      >"${actual_configurable_trace_path}" </dev/null
    if ! diff -u \
      --label "site/src/data/course/configurable-decoder-core-trace.json" \
      --label "${package_name} --trace stdout" \
      "${repository_root}/site/src/data/course/configurable-decoder-core-trace.json" \
      "${actual_configurable_trace_path}"; then
      echo "Rust demo check failed: complete configurable decoder site trace drifted." >&2
      exit 1
    fi
  fi

  if [[ "${package_name}" == practical-ch08-dropout-semantics ]]; then
    actual_dropout_trace_path="${temporary_directory}/${package_name}.detailed-trace.actual.ndjson"
    cargo run \
      --quiet \
      --locked \
      --offline \
      --manifest-path "${repository_root}/Cargo.toml" \
      --package "${package_name}" \
      --bin "${binary_name}" \
      -- --trace \
      >"${actual_dropout_trace_path}" </dev/null
    node --input-type=module - "${expected_path}" "${actual_dropout_trace_path}" <<'NODE'
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';

function fail(message) {
  throw new Error(`Rust demo check failed: dropout detailed trace ${message}`);
}
const [expectedPath, tracePath] = process.argv.slice(2);
const expectedBytes = readFileSync(expectedPath, 'utf8');
const expected = JSON.parse(expectedBytes);
const lines = readFileSync(tracePath, 'utf8').split('\n');
if (lines.pop() !== '' || lines.some((line) => line.length === 0)) fail('requires nonempty LF-terminated NDJSON records');
if (lines.some((line) => Buffer.byteLength(line + '\n') > 2097152)) fail('record exceeds the existing 2MiB encoding ceiling');
const records = lines.map((line) => JSON.parse(line));
const schema = 'practical-dropout-semantics-v1';
const counts = {
  'primitive-fixtures': 1,
  'operator-recompute': 3,
  'full-core-recompute': 1,
  'committed-snapshot': 4,
  'update-header': 4,
  'update-category': 48,
  'resume-update-comparison': 6,
  summary: 1,
};
if (records.length !== 68 || records.some((record) => record.schema !== schema || !(record.record_type in counts))) fail('schema, type or total record count differs');
for (const [type, count] of Object.entries(counts)) {
  if (records.filter((record) => record.record_type === type).length !== count) fail(`${type} count differs`);
}
const prefix = `{"record_type":"summary","schema":"${schema}","summary":`;
const finalLine = lines.at(-1);
if (!finalLine.startsWith(prefix) || !finalLine.endsWith('}') || finalLine.slice(prefix.length, -1) + '\n' !== expectedBytes) fail('final summary differs byte-for-byte from compact stdout');
const primitive = records[0];
if (primitive.record_type !== 'primitive-fixtures' || ['primitive', 'fixed_mask', 'modes_grid_history'].some((key) => !isDeepStrictEqual(primitive[key], expected[key]))) fail('primitive record differs from compact summary');
const operators = records.filter((record) => record.record_type === 'operator-recompute');
if (!isDeepStrictEqual(operators.map((record) => record.point), ['R1', 'R2', 'R3'])) fail('operator point registry differs');
const headers = records.filter((record) => record.record_type === 'update-header');
if (!isDeepStrictEqual(headers.map((record) => record.step), [1, 2, 3, 4])) fail('update step registry differs');
const categories = ['adaptive-delta', 'adaptive-direction', 'clipped-gradient', 'corrected-first-moment', 'corrected-second-moment', 'decay-delta', 'effective-gradient', 'first-moment', 'parameter-after', 'parameter-before', 'raw-gradient', 'second-moment'];
for (const update of expected.resume.updates) {
  const rows = records.filter((record) => record.record_type === 'update-category' && record.step === update.step);
  if (!isDeepStrictEqual(rows.map((record) => record.category).sort(), categories)) fail(`step ${update.step} category registry differs`);
  for (const row of rows) {
    if (row.branch !== 'uninterrupted' || !Array.isArray(row.bits) || row.bits.length !== update.categories[row.category].coordinates || row.bits.some((word) => typeof word !== 'string' || !/^[0-9a-f]{16}$/.test(word))) fail(`step ${update.step} category coordinate representation differs`);
  }
}
for (const point of expected.resume.points) {
  if (records.filter((record) => record.record_type === 'resume-update-comparison' && record.point === point.point).length !== point.remaining_updates_compared) fail(`${point.point} continuation record count differs`);
}
console.log('Dropout detailed trace check passed: 68 records; exact compact summary; R1..R3 and U1..U3 record/category counts.');
NODE
  fi

  if [[ -n "${trace_target_name}" ]]; then
    actual_trace_path="${temporary_directory}/${package_name}.trace.actual.txt"
    cargo run \
      --quiet \
      --locked \
      --offline \
      --manifest-path "${repository_root}/Cargo.toml" \
      --package "${package_name}" \
      --example "${trace_target_name}" \
      >"${actual_trace_path}" </dev/null
    if ! diff -u \
      --label "${trace_expected_path}" \
      --label "${package_name} trace stdout" \
      "${trace_expected_path}" \
      "${actual_trace_path}"; then
      echo "Rust demo check failed: deterministic diagram trace stdout drifted for ${package_name}." >&2
      exit 1
    fi
    trace_checked=$((trace_checked + 1))
  fi
done <"${demo_manifest_path}"

if [[ ${original_checked} -ne 39 ]]; then
  echo "Rust demo check failed: expected 39 checked first-course chapter demos, got ${original_checked}." >&2
  exit 1
fi

if [[ ${practical_checked} -ne 10 ]]; then
  echo "Rust demo check failed: expected ten checked Practical chapter demos, got ${practical_checked}." >&2
  exit 1
fi

if [[ ${trace_checked} -ne 34 ]]; then
  echo "Rust demo check failed: expected 34 checked diagram traces, got ${trace_checked}." >&2
  exit 1
fi

echo "Rust demo check passed: ${original_checked} first-course chapter demo(s), ${practical_checked} Practical chapter demo(s), ${trace_checked} checked diagram trace(s)."
