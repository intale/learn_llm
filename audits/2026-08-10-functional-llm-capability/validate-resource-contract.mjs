#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));

function findRepositoryRoot(start) {
  let current = resolve(start);
  while (true) {
    if (
      existsSync(join(current, "BUILD_STATE.yaml")) &&
      existsSync(join(current, "DECISIONS.md")) &&
      existsSync(join(current, "Cargo.toml"))
    ) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      throw new Error("cannot find repository root from validator path");
    }
    current = parent;
  }
}

const repositoryRoot = findRepositoryRoot(scriptDir);

function safePath(argument) {
  if (isAbsolute(argument)) {
    throw new Error("contract path must be repository-relative");
  }
  const path = resolve(repositoryRoot, argument);
  if (relative(repositoryRoot, path).startsWith("..")) {
    throw new Error("contract path must remain inside the repository");
  }
  const parts = relative(repositoryRoot, dirname(path)).split("/").filter(Boolean);
  let current = repositoryRoot;
  for (const part of parts) {
    current = join(current, part);
    if (!existsSync(current)) {
      throw new Error(`contract parent is missing: ${relative(repositoryRoot, current)}`);
    }
    const stat = lstatSync(current);
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new Error(`contract parent must be a nonsymlink directory: ${relative(repositoryRoot, current)}`);
    }
  }
  return path;
}

function parseArgs(argv) {
  if (argv.length === 0) {
    return safePath("audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md");
  }
  if (argv.length !== 2 || argv[0] !== "--contract" || !argv[1]) {
    throw new Error("usage: validate-resource-contract.mjs [--contract <repo-relative-path>]");
  }
  return safePath(argv[1]);
}

const failures = [];
const fail = (message) => failures.push(message);
const contractPath = parseArgs(process.argv.slice(2));

let contract = "";
if (!existsSync(contractPath)) {
  fail(`contract is missing: ${relative(repositoryRoot, contractPath)}`);
} else {
  const stat = lstatSync(contractPath);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    fail(`contract must be a nonsymlink regular file: ${relative(repositoryRoot, contractPath)}`);
  } else {
    const bytes = readFileSync(contractPath);
    if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      fail("contract must not contain a UTF-8 BOM");
    }
    try {
      contract = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      fail("contract must be valid UTF-8");
    }
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function requireFileHash(path, expected, label) {
  const absolute = join(repositoryRoot, path);
  if (!existsSync(absolute)) {
    fail(`${label} is missing: ${path}`);
    return;
  }
  const stat = lstatSync(absolute);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    fail(`${label} must be a nonsymlink regular file: ${path}`);
    return;
  }
  const actual = sha256(readFileSync(absolute));
  if (actual !== expected) {
    fail(`${label} SHA-256 is ${actual}; expected ${expected}`);
  }
}

requireFileHash(
  "audits/2026-08-10-functional-llm-capability/coverage.md",
  "42a2fd6ea482995c280f1c55d1a8c30a494968116edc57594579a7b1da2f4fb1",
  "accepted capability coverage",
);
requireFileHash(
  "audits/2026-08-10-functional-llm-capability/requirements.md",
  "d3ae678bcfb1695c8c7e21ac047f2da5b415f31220842e3be07c9d4b7e6d4006",
  "accepted capability requirements",
);
requireFileHash(
  "audits/2026-08-10-functional-llm-capability/validate-coverage.mjs",
  "ce71141c802c2411cc29a2322d20bef277a92ab550316cb4c295b13ac387bf0f",
  "accepted capability validator",
);
requireFileHash(
  "Cargo.toml",
  "e30b38f0e40df2181bab5e8d07c959ec895e0928cf8bfae7f2816c86ccbd55e1",
  "protected root Cargo manifest",
);
requireFileHash(
  "Cargo.lock",
  "b9491c2c89096a48ea62c98f79b5851272df4cb3afca09d41b80ed679b5a7fe1",
  "protected Cargo lockfile",
);
requireFileHash(
  "rust/crates/llm-from-scratch/Cargo.toml",
  "180014d04643dda079314877db6a508179a5da03edaa3c02edded1ae51520f1d",
  "protected scalar-crate Cargo manifest",
);

if (contract) {
  if (contract.startsWith("\uFEFF")) {
    fail("contract must not contain a UTF-8 BOM");
  }
  if (!contract.endsWith("\n") || contract.endsWith("\n\n")) {
    fail("contract must end with exactly one LF");
  }
  if (/\r/u.test(contract)) {
    fail("contract must use LF line endings");
  }
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(contract)) {
    fail("contract contains a forbidden control byte");
  }
  if (/ +$/gmu.test(contract)) {
    fail("contract contains trailing spaces");
  }
  if (/\b(?:TODO|TBD|FIXME)\b|<fill|to be decided/iu.test(contract)) {
    fail("contract contains an unfinished placeholder");
  }
  const expectedPreamble = [
    "# Functional laptop LLM resource and dependency contract",
    "",
    "- Contract ID: `functional-laptop-llm-resource-v1`",
    "- Status: `frozen-before-acquisition`",
    "- Accepted capability coverage SHA-256: `42a2fd6ea482995c280f1c55d1a8c30a494968116edc57594579a7b1da2f4fb1`",
    "- Accepted capability requirements SHA-256: `d3ae678bcfb1695c8c7e21ac047f2da5b415f31220842e3be07c9d4b7e6d4006`",
    "- Accepted capability validator SHA-256: `ce71141c802c2411cc29a2322d20bef277a92ab550316cb4c295b13ac387bf0f`",
    "- Input commit: `d719c6dae3dcc74675e1ecb19a2b1fabd89a5925`",
    "- Hardware/profile evidence SHA-256: `3b386511afb3e1ddc4e87ca5df2ad5e66f21f5e0bfc515ea8692747623488f81`",
    "- Dataset/model evidence SHA-256: `b8c14707c3b88ec0f08817f704638d01b3edadbccf533e3ffc6d427728075930`",
    "- Dependency/artifact/persistence evidence SHA-256: `8552345408cc86639cb041d1fb2e097dc4cc3fc2aeadad067e17372ca9b9aebe`",
    "- Scalar source manifest SHA-256: `397c5ff4b406adf9446eae525d1c7337e010c785d9e142d0e3eeaa09d4cf36e8` over exactly 40 regular files as C-sorted repository-relative `sha256sum` lines.",
    "- Scope: one causal decoder-only autoregressive text/token model family, its resource planner, its future supporting-plumbing boundary, and its offline artifact provenance.",
    "- Acquisition state: no corpus shard, model weight, CUDA artifact, database image, GPU kernel, or training job was acquired or executed by this contract step; pinned validation rebuilt the repository workspace image and rehydrated only the pre-existing locked Rust crate cache, selecting no dependency and changing no manifest, lockfile, or product source.",
    "",
  ].join("\n");
  if (!contract.startsWith(expectedPreamble)) {
    fail("contract preamble differs from the frozen identity, scope, or acquisition boundary");
  }
  for (const exact of [
    "one causal decoder-only autoregressive text/token model family",
    "no public generic input trait",
    "ordinary text token-ID path and cached single-token path",
    "compiler features are limited to backend/device/kernel plumbing",
    "PostgreSQL and pgvector are not selected",
    "each new crate remains prospective",
    "This step authorizes no bulk acquisition",
  ]) {
    if (!contract.includes(exact)) {
      fail(`contract omits required boundary text: ${exact}`);
    }
  }
  for (const exact of [
    "# Functional laptop LLM resource and dependency contract",
    "- Contract ID: `functional-laptop-llm-resource-v1`",
    "- Status: `frozen-before-acquisition`",
    "- Accepted capability coverage SHA-256: `42a2fd6ea482995c280f1c55d1a8c30a494968116edc57594579a7b1da2f4fb1`",
    "- Accepted capability requirements SHA-256: `d3ae678bcfb1695c8c7e21ac047f2da5b415f31220842e3be07c9d4b7e6d4006`",
    "- Accepted capability validator SHA-256: `ce71141c802c2411cc29a2322d20bef277a92ab550316cb4c295b13ac387bf0f`",
    "- Input commit: `d719c6dae3dcc74675e1ecb19a2b1fabd89a5925`",
    "- Hardware/profile evidence SHA-256: `3b386511afb3e1ddc4e87ca5df2ad5e66f21f5e0bfc515ea8692747623488f81`",
    "- Dataset/model evidence SHA-256: `b8c14707c3b88ec0f08817f704638d01b3edadbccf533e3ffc6d427728075930`",
    "- Dependency/artifact/persistence evidence SHA-256: `8552345408cc86639cb041d1fb2e097dc4cc3fc2aeadad067e17372ca9b9aebe`",
    "- Scalar source manifest SHA-256: `397c5ff4b406adf9446eae525d1c7337e010c785d9e142d0e3eeaa09d4cf36e8` over exactly 40 regular files as C-sorted repository-relative `sha256sum` lines.",
    "- Parameter elements: `P = V*D + L*(2*D*D + 2*D*D*Hkv/Hq + 3*D*F + 2*D) + D`.",
    "- KV bytes: `KV_bytes = 2*B*L*C*Hkv*(D/Hq)*bkv`.",
    "- Linear plus nonmasked-causal matmul MACs: `MAC_causal = B*C*(L*(2*D*D + 2*D*D*Hkv/Hq + 3*D*F) + D*V) + B*L*D*C*(C+1)`.",
    "- Current materialized-dense-attention matmul MACs: `MAC_dense = B*C*(L*(2*D*D + 2*D*D*Hkv/Hq + 3*D*F) + D*V) + 2*B*L*D*C*C`.",
    "- Persistent state bytes: `State_bytes = sum_i(round_up(elements_i*bytes_i, alignment_i))` over separately named weights, master weights, gradients, optimizer moments, scaler state, and persistent buffers. Aliased tied weights and views are counted once at their owning allocation.",
    "- Peak activation bytes: `Activation_peak_bytes = max_event(sum_i(live_elements_i*bytes_i) + workspace_bytes_event)` over a generated liveness/event ledger.",
    "- Communication bytes: `Comm_bytes = sum_event(message_count_event*payload_elements_event*dtype_bytes_event)` over the selected topology, with exactly zero events and zero bytes for `world_size=1`.",
  ]) {
    if (!contract.includes(exact)) {
      fail(`contract omits or changes frozen text: ${exact}`);
    }
  }
}

function scalarSourceManifest() {
  const sourceRoot = join(repositoryRoot, "rust/crates/llm-from-scratch/src");
  const paths = [];
  function walk(directory) {
    for (const name of readdirSync(directory).sort()) {
      const path = join(directory, name);
      const stat = lstatSync(path);
      if (stat.isSymbolicLink()) {
        fail(`protected scalar source contains symlink: ${relative(repositoryRoot, path)}`);
      } else if (stat.isDirectory()) {
        walk(path);
      } else if (stat.isFile()) {
        paths.push(path);
      } else {
        fail(`protected scalar source contains nonregular entry: ${relative(repositoryRoot, path)}`);
      }
    }
  }
  walk(sourceRoot);
  paths.sort((left, right) => Buffer.from(relative(repositoryRoot, left)).compare(Buffer.from(relative(repositoryRoot, right))));
  const lines = paths.map((path) => `${sha256(readFileSync(path))}  ${relative(repositoryRoot, path)}\n`).join("");
  return { count: paths.length, digest: sha256(Buffer.from(lines, "utf8")) };
}

const scalarManifest = scalarSourceManifest();
if (scalarManifest.count !== 40 || scalarManifest.digest !== "397c5ff4b406adf9446eae525d1c7337e010c785d9e142d0e3eeaa09d4cf36e8") {
  fail(`protected scalar source manifest is ${scalarManifest.count} files/${scalarManifest.digest}; expected 40/397c5ff4b406adf9446eae525d1c7337e010c785d9e142d0e3eeaa09d4cf36e8`);
}

function exactlyOne(regex, label) {
  const matches = [...contract.matchAll(regex)];
  if (matches.length !== 1) {
    fail(`${label} occurs ${matches.length} times; expected exactly one`);
    return null;
  }
  const match = matches[0];
  const start = match.index;
  const end = start + match[0].length;
  if ((start > 0 && contract[start - 1] !== "\n") || (end < contract.length && contract[end] !== "\n")) {
    fail(`${label} must occupy one complete standalone line`);
  }
  return match;
}

function exactRecord(name, expected, label = name) {
  const match = exactlyOne(new RegExp("`" + name + "\\(([^`]+)\\)`", "gu"), `${label} machine record`);
  if (match && match[1] !== expected) {
    fail(`${label} machine record differs from the frozen contract`);
  }
  return match;
}

function parseFields(text) {
  const fields = new Map();
  for (const item of text.split(";")) {
    const separator = item.indexOf("=");
    if (separator <= 0) {
      fail(`machine record item lacks one key=value separator: ${item}`);
      continue;
    }
    const key = item.slice(0, separator);
    const value = item.slice(separator + 1);
    if (fields.has(key)) {
      fail(`machine record repeats field ${key}`);
    }
    fields.set(key, value);
  }
  return fields;
}

function numberField(fields, key, label) {
  const raw = fields.get(key);
  if (!raw || !/^(?:0|[1-9]\d*)$/u.test(raw)) {
    fail(`${label} field ${key} must be one canonical nonnegative integer; received ${raw ?? "missing"}`);
    return 0n;
  }
  return BigInt(raw);
}

exactRecord(
  "model_schema",
  "version=1;family=causal-decoder-only-autoregressive-text-token;normalization=pre-rmsnorm;position=rope;attention=causal-gqa;activation=swiglu;bias=false;embedding_head=tied-transpose;input=token-ids;output=text-token-logits",
  "model schema",
);
exactRecord(
  "config_ownership",
  "semantic=V,D,L,Hq,Hkv,F,C,rope-policy,rope-base,rms-epsilon,causal-mask,tied-head,vocabulary-id,tokenizer-id,dtype-policy,parameter-family;run=B,N,microbatch,accumulation,seeds,world-size,topology,sharding,collectives,backend,device,kernel,resource-profile;features=backend,device,kernel",
  "configuration ownership",
);
exactRecord(
  "planner_arithmetic",
  "version=1;input_bytes_max=1048576;encoding=canonical-json-utf8;keys=unique;integers=canonical-unsigned;arithmetic=checked-u128;dimensions=positive;division=exact-before-multiply;conversions=range-checked-u64-usize-file-offset;forbidden=saturating,wrapping,truncating,floating-resource-planning;failure=before-allocation",
  "planner arithmetic",
);

const expectedScales = new Map([
  ["reference", { V: 266n, D: 4n, L: 1n, Hq: 1n, Hkv: 1n, F: 4n, C: 4n, B: 16n, N: 2048n, P: 1188n }],
  ["bridge", { V: 266n, D: 16n, L: 2n, Hq: 2n, Hkv: 2n, F: 20n, C: 16n, B: 8n, N: 65536n, P: 8304n }],
  ["laptop", { V: 16384n, D: 512n, L: 8n, Hq: 8n, Hkv: 2n, F: 1536n, C: 512n, B: 1n, N: 20000000n, P: 32514560n }],
  ["production-plan", { V: 128000n, D: 8192n, L: 80n, Hq: 64n, Hkv: 8n, F: 28672n, C: 32768n, B: 1n, N: 15000000000000n, P: 69500936192n }],
]);

const scaleMatches = [...contract.matchAll(/`scale\(([^;]+);([^`]+)\)`/gu)];
if (scaleMatches.length !== expectedScales.size) {
  fail(`scale inventory has ${scaleMatches.length} records; expected ${expectedScales.size}`);
}
const scales = new Map();
for (const match of scaleMatches) {
  const name = match[1];
  if (scales.has(name)) {
    fail(`duplicate scale ${name}`);
    continue;
  }
  const fields = parseFields(match[2]);
  const expected = expectedScales.get(name);
  if (!expected) {
    fail(`unexpected scale ${name}`);
    continue;
  }
  const actual = {};
  for (const key of Object.keys(expected)) {
    actual[key] = numberField(fields, key, `scale ${name}`);
    if (actual[key] !== expected[key]) {
      fail(`scale ${name} ${key} is ${actual[key]}; expected ${expected[key]}`);
    }
  }
  if (fields.size !== Object.keys(expected).length) {
    fail(`scale ${name} has ${fields.size} fields; expected ${Object.keys(expected).length}`);
  }
  if (
    Object.values(actual).some((value) => value <= 0n) ||
    actual.D % actual.Hq !== 0n ||
    actual.Hq % actual.Hkv !== 0n ||
    (actual.D / actual.Hq) % 2n !== 0n
  ) {
    fail(`scale ${name} violates positivity, head divisibility, or even RoPE head width`);
  }
  const p = actual.V * actual.D + actual.L * (
    2n * actual.D * actual.D +
    2n * actual.D * actual.D * actual.Hkv / actual.Hq +
    3n * actual.D * actual.F +
    2n * actual.D
  ) + actual.D;
  if (p !== actual.P) {
    fail(`scale ${name} recomputes P=${p}; record says ${actual.P}`);
  }
  scales.set(name, actual);
}

for (const name of expectedScales.keys()) {
  if (!scales.has(name)) {
    fail(`scale inventory omits ${name}`);
  }
}

const evaluationScaleMatch = exactlyOne(/`evaluation_scale\(seed-sensitivity;([^`]+)\)`/gu, "seed-sensitivity evaluation scale");
if (evaluationScaleMatch) {
  const fields = parseFields(evaluationScaleMatch[1]);
  const expected = {
    V: 8192n, D: 256n, L: 3n, Hq: 4n, Hkv: 1n, F: 768n, C: 256n, B: 1n,
    N: 1000000n, P: 4359936n, KV_bf16: 196608n, MAC_causal: 1166213120n,
    MAC_dense: 1216348160n,
  };
  const actual = {};
  for (const [key, value] of Object.entries(expected)) {
    actual[key] = numberField(fields, key, "seed-sensitivity evaluation scale");
    if (actual[key] !== value) fail(`seed-sensitivity ${key} is ${actual[key]}; expected ${value}`);
  }
  if (
    fields.size !== Object.keys(expected).length ||
    Object.values(actual).some((value) => value <= 0n) ||
    actual.D % actual.Hq !== 0n ||
    actual.Hq % actual.Hkv !== 0n ||
    (actual.D / actual.Hq) % 2n !== 0n
  ) {
    fail("seed-sensitivity fields or head invariants differ");
  }
  const p = actual.V * actual.D + actual.L * (
    2n * actual.D * actual.D + 2n * actual.D * actual.D * actual.Hkv / actual.Hq +
    3n * actual.D * actual.F + 2n * actual.D
  ) + actual.D;
  const kv = 2n * actual.B * actual.L * actual.C * actual.Hkv * (actual.D / actual.Hq) * 2n;
  const linear = actual.B * actual.C * (
    actual.L * (2n * actual.D * actual.D + 2n * actual.D * actual.D * actual.Hkv / actual.Hq + 3n * actual.D * actual.F) + actual.D * actual.V
  );
  const causal = linear + actual.B * actual.L * actual.D * actual.C * (actual.C + 1n);
  const dense = linear + 2n * actual.B * actual.L * actual.D * actual.C * actual.C;
  if (p !== actual.P || kv !== actual.KV_bf16 || causal !== actual.MAC_causal || dense !== actual.MAC_dense) {
    fail("seed-sensitivity parameter/KV/MAC arithmetic does not replay");
  }
}

function parseNamedSeries(prefix, expected) {
  const match = exactlyOne(new RegExp("`" + prefix + "\\(([^`]+)\\)`", "gu"), prefix);
  if (!match) return;
  const fields = parseFields(match[1]);
  if (fields.size !== Object.keys(expected).length) {
    fail(`${prefix} has ${fields.size} values; expected ${Object.keys(expected).length}`);
  }
  for (const [name, value] of Object.entries(expected)) {
    const actual = numberField(fields, name, prefix);
    if (actual !== value) {
      fail(`${prefix} ${name} is ${actual}; expected ${value}`);
    }
  }
}

parseNamedSeries("mac_causal", {
  reference: 76544n,
  bridge: 1122304n,
  laptop: 17718837248n,
  "production-plan": 2981072375644160n,
});
parseNamedSeries("mac_dense", {
  reference: 77312n,
  bridge: 1183744n,
  laptop: 18790481920n,
  "production-plan": 3684738342584320n,
});
parseNamedSeries("kv_bf16_full_context", {
  reference: 1024n,
  bridge: 16384n,
  laptop: 2097152n,
  "production-plan": 10737418240n,
});
parseNamedSeries("dense_parameter_state_lower_bound", {
  alignment: 1n,
  extras: 0n,
  reference_fp16: 2376n,
  reference_fp32: 4752n,
  reference_mixed_adamw: 21384n,
  bridge_fp16: 16608n,
  bridge_fp32: 33216n,
  bridge_mixed_adamw: 149472n,
  laptop_fp16: 65029120n,
  laptop_fp32: 130058240n,
  laptop_mixed_adamw: 585262080n,
  production_bf16: 139001872384n,
  production_fp32: 278003744768n,
  production_mixed_adamw: 1251016851456n,
});

const communicationMatch = exactlyOne(
  /`communication_fixture\(id=production-tp8-forward-plan;([^`]+)\)`/gu,
  "production TP8 communication fixture",
);
if (communicationMatch) {
  const fields = parseFields(communicationMatch[1]);
  const expected = {
    world_size: 8n,
    layers: 80n,
    events_per_layer: 2n,
    events: 160n,
    messages_per_rank_event: 14n,
    payload_elements_per_message: 33554432n,
    dtype_bytes: 2n,
    bytes_per_rank_event: 939524096n,
    bytes_per_rank: 150323855360n,
    bytes_all_ranks: 1202590842880n,
  };
  const actual = {};
  for (const [key, value] of Object.entries(expected)) {
    actual[key] = numberField(fields, key, "production TP8 communication fixture");
    if (actual[key] !== value) fail(`production TP8 ${key} is ${actual[key]}; expected ${value}`);
  }
  if (fields.size !== Object.keys(expected).length + 2) {
    fail(`production TP8 communication fixture has ${fields.size + 1} fields including id; expected ${Object.keys(expected).length + 3}`);
  }
  if (fields.get("topology") !== "tensor-parallel-ring" || fields.get("execution") !== "none") {
    fail("production TP8 communication fixture topology/execution differs");
  }
  const bytesPerRankEvent = actual.messages_per_rank_event * actual.payload_elements_per_message * actual.dtype_bytes;
  const events = actual.layers * actual.events_per_layer;
  const bytesPerRank = bytesPerRankEvent * events;
  const bytesAllRanks = bytesPerRank * actual.world_size;
  if (
    events !== actual.events ||
    bytesPerRankEvent !== actual.bytes_per_rank_event ||
    bytesPerRank !== actual.bytes_per_rank ||
    bytesAllRanks !== actual.bytes_all_ranks
  ) {
    fail("production TP8 communication arithmetic does not replay");
  }
}

for (const [name, scale] of scales) {
  const causal = scale.B * scale.C * (
    scale.L * (2n * scale.D * scale.D + 2n * scale.D * scale.D * scale.Hkv / scale.Hq + 3n * scale.D * scale.F) + scale.D * scale.V
  ) + scale.B * scale.L * scale.D * scale.C * (scale.C + 1n);
  const dense = scale.B * scale.C * (
    scale.L * (2n * scale.D * scale.D + 2n * scale.D * scale.D * scale.Hkv / scale.Hq + 3n * scale.D * scale.F) + scale.D * scale.V
  ) + 2n * scale.B * scale.L * scale.D * scale.C * scale.C;
  const kv = 2n * scale.B * scale.L * scale.C * scale.Hkv * (scale.D / scale.Hq) * 2n;
  const expectedCausal = {
    reference: 76544n, bridge: 1122304n, laptop: 17718837248n, "production-plan": 2981072375644160n,
  }[name];
  const expectedDense = {
    reference: 77312n, bridge: 1183744n, laptop: 18790481920n, "production-plan": 3684738342584320n,
  }[name];
  const expectedKv = {
    reference: 1024n, bridge: 16384n, laptop: 2097152n, "production-plan": 10737418240n,
  }[name];
  if (causal !== expectedCausal) fail(`${name} recomputes MAC_causal=${causal}; expected ${expectedCausal}`);
  if (dense !== expectedDense) fail(`${name} recomputes MAC_dense=${dense}; expected ${expectedDense}`);
  if (kv !== expectedKv) fail(`${name} recomputes BF16 KV=${kv}; expected ${expectedKv}`);
}

const expectedProfiles = new Map([
  ["reference-ci", { state: "planned", scale: "reference", device: "cpu", dtype: "f64", P_max: 1188n, C_max: 4n, N_max: 2048n, microbatch_max: 16n, accumulation_max: 1n, installed_host_bytes_min: 1073741824n, installed_host_bytes_recommended: 1073741824n, host_bytes_max: 268435456n, device_bytes_max: 0n, device_headroom_bytes_min: 0n, disk_bytes_max: 1073741824n, download_bytes_max: 0n, wall_seconds_max: 600n, calibration_tokens_min: 0n }],
  ["bridge-ci", { state: "planned", scale: "bridge", device: "cpu", dtype: "f64", P_max: 8304n, C_max: 16n, N_max: 65536n, microbatch_max: 8n, accumulation_max: 1n, installed_host_bytes_min: 1073741824n, installed_host_bytes_recommended: 1073741824n, host_bytes_max: 268435456n, device_bytes_max: 0n, device_headroom_bytes_min: 0n, disk_bytes_max: 1073741824n, download_bytes_max: 0n, wall_seconds_max: 600n, calibration_tokens_min: 0n }],
  ["8gb-gpu-smoke", { state: "planned", scale: "laptop", device: "rtx4070-laptop-8gb", dtype: "wgpu-vulkan-fp16-fp32-protected-dynamicv1", P_max: 32514560n, C_max: 128n, N_max: 65536n, microbatch_max: 1n, accumulation_max: 8n, installed_host_bytes_min: 8589934592n, installed_host_bytes_recommended: 17179869184n, host_bytes_max: 8589934592n, device_bytes_max: 2147483648n, device_headroom_bytes_min: 536870912n, disk_bytes_max: 5000000000n, download_bytes_max: 536870912n, wall_seconds_max: 900n, calibration_policy: "gpu-synchronized-v1", probe_seconds_min: 300n, probe_seconds_max: 900n, probe_synchronized_microsteps_min: 100n, probe_windows: 10n, calibration_tokens_min: 10240n, throughput_valid_tokens_per_second_min: 128n, throughput_stat: "lower-aggregate-or-p10-window", second_half_median_percent_of_first_min: 85n }],
  ["8gb-seed-sensitivity", { state: "planned", scale: "seed-sensitivity", device: "rtx4070-laptop-8gb", dtype: "wgpu-vulkan-fp16-fp32-protected-dynamicv1", P_max: 4359936n, C_max: 256n, N_max: 1000000n, microbatch_max: 1n, accumulation_max: 32n, installed_host_bytes_min: 17179869184n, installed_host_bytes_recommended: 34359738368n, host_bytes_max: 8589934592n, device_bytes_max: 4294967296n, device_headroom_bytes_min: 536870912n, disk_bytes_max: 10000000000n, download_bytes_max: 0n, wall_seconds_max: 7200n, all_seeds_wall_seconds_max: 21600n, calibration_policy: "gpu-synchronized-v1", probe_seconds_min: 300n, probe_seconds_max: 900n, probe_synchronized_microsteps_min: 100n, probe_windows: 10n, calibration_tokens_min: 10240n, throughput_valid_tokens_per_second_min: 200n, throughput_stat: "lower-aggregate-or-p10-window", second_half_median_percent_of_first_min: 85n, seeds: "104729,130363,15485863" }],
  ["8gb-gpu-core", { state: "planned", scale: "laptop", device: "rtx4070-laptop-8gb", dtype: "wgpu-vulkan-fp16-fp32-protected-dynamicv1", P_max: 32514560n, C_max: 512n, N_max: 20000000n, microbatch_max: 1n, accumulation_max: 64n, valid_tokens_per_update_max: 32768n, installed_host_bytes_min: 17179869184n, installed_host_bytes_recommended: 34359738368n, host_bytes_max: 12884901888n, device_bytes_max: 6710886400n, device_headroom_bytes_min: 536870912n, disk_bytes_max: 30000000000n, download_bytes_max: 4000000000n, wall_seconds_max: 108000n, calibration_policy: "gpu-synchronized-v1", probe_seconds_min: 300n, probe_seconds_max: 900n, probe_synchronized_microsteps_min: 100n, probe_windows: 10n, calibration_tokens_min: 10240n, throughput_valid_tokens_per_second_min: 350n, throughput_stat: "lower-aggregate-or-p10-window", second_half_median_percent_of_first_min: 85n, projection: "fixed3600-plus-1.5N-over-rate" }],
  ["8gb-adapter", { state: "blocked-artifact-selection", scale: "selected-compatible-20m-50m", device: "rtx4070-laptop-8gb", dtype: "wgpu-vulkan-fp16-fp32-protected-dynamicv1-and-artifact-bound", P_max: 50000000n, C_max: 512n, N_max: 1048576n, microbatch_max: 1n, accumulation_max: 32n, installed_host_bytes_min: 17179869184n, installed_host_bytes_recommended: 34359738368n, host_bytes_max: 12884901888n, device_bytes_max: 6710886400n, device_headroom_bytes_min: 536870912n, disk_bytes_max: 21474836480n, download_bytes_max: 536870912n, wall_seconds_max: 43200n, calibration_policy: "gpu-synchronized-v1", probe_seconds_min_per_phase: 300n, probe_seconds_max_per_phase: 900n, probe_synchronized_microsteps_min_per_phase: 100n, probe_windows: 10n, calibration_tokens_min: 10240n, throughput_sft_response_tokens_per_second_min: 100n, throughput_preference_response_tokens_per_second_min: 25n, throughput_stat: "lower-aggregate-or-p10-window", second_half_median_percent_of_first_min: 85n }],
  ["production-plan-only", { state: "plan-refuse", scale: "production-plan", device: "none", dtype: "bf16-accounting", P_max: 69500936192n, C_max: 32768n, N_max: 15000000000000n, microbatch_max: 1n, accumulation_max: 1n, installed_host_bytes_min: 1073741824n, installed_host_bytes_recommended: 1073741824n, host_bytes_max: 268435456n, device_bytes_max: 0n, device_headroom_bytes_min: 0n, disk_bytes_max: 67108864n, download_bytes_max: 0n, wall_seconds_max: 30n, calibration_tokens_min: 0n }],
]);

exactRecord(
  "calibration_policy",
  "id=gpu-synchronized-v1;probe_seconds_min=300;probe_seconds_max=900;synchronized_microsteps_min=100;windows=10;throughput_stat=lower-aggregate-or-p10-window;second_half_median_percent_of_first_min=85;warmup=discard-named-segment;hidden-fallback=reject",
  "GPU calibration policy",
);

const profileMatches = [...contract.matchAll(/`profile\(([^;]+);([^`]+)\)`/gu)];
if (profileMatches.length !== expectedProfiles.size) {
  fail(`profile inventory has ${profileMatches.length} records; expected ${expectedProfiles.size}`);
}

const toleranceMatches = [...contract.matchAll(/`tolerance\(([^`]+)\)`/gu)];
exactRecord(
  "numeric_policy",
  "version=1;combine=atol-plus-rtol-max-abs;f32-u=2^-24;gamma-k=k*u/(1-k*u);dot-matmul-bound=4*gamma-k*sum-abs-products-plus-output-rounding;require=k*u<1;unknown-accumulation=refuse;nonfinite=exact-class;discrete=exact",
  "numeric comparison policy",
);
const expectedTolerances = new Map([
  ["scalar-f64", ["0", "0", "bitwise-bytes-and-events"]],
  ["f32-elementwise", ["0.000001", "0.00001", "exact-special-value-policy"]],
  ["f32-rmsnorm-softmax-rope-logits-loss", ["0.00001", "0.0001", "probability-row-sum-0.00001-and-masked-zero"]],
  ["f32-gradients-update", ["0.00001", "0.0005", "gradient-cosine-0.99999-and-same-clip-skip"]],
  ["bf16-stored-primitive", ["0.0078125", "0.015625", "decode-exact-bf16-bits"]],
  ["bf16-logits-loss", ["0.03125", "0.03125", "top1-margin-over-twice-max-error"]],
  ["bf16-gradients-update", ["0.0625", "0.0625", "gradient-cosine-0.999-and-same-clip-overflow-skip"]],
  ["fp16-stored-primitive", ["0.001953125", "0.00390625", "exact-fp16-bits-and-loss-scaling"]],
  ["fp16-logits-loss", ["0.015625", "0.015625", "finite-and-top1-margin"]],
  ["fp16-gradients-update", ["0.03125", "0.03125", "gradient-cosine-0.999-and-same-unscale-clip-skip"]],
]);
if (toleranceMatches.length !== expectedTolerances.size) {
  fail(`tolerance inventory has ${toleranceMatches.length} records; expected ${expectedTolerances.size}`);
}
const toleranceIds = new Set();
for (const match of toleranceMatches) {
  const fields = parseFields(match[1]);
  const id = fields.get("id");
  if (!id || toleranceIds.has(id)) fail(`missing or duplicate tolerance ${id ?? "missing"}`);
  else toleranceIds.add(id);
  const expected = expectedTolerances.get(id);
  if (!expected) {
    fail(`unexpected tolerance ${id ?? "missing"}`);
    continue;
  }
  if (fields.size !== 4) {
    fail(`tolerance ${id} has ${fields.size} fields; expected 4`);
  }
  for (const [key, value] of [["atol", expected[0]], ["rtol", expected[1]], ["extra", expected[2]]]) {
    if (fields.get(key) !== value) fail(`tolerance ${id} ${key} differs`);
  }
}
for (const id of expectedTolerances.keys()) {
  if (!toleranceIds.has(id)) fail(`tolerance inventory omits ${id}`);
}
const profileNames = new Set();
const profileRecords = new Map();
for (const match of profileMatches) {
  const name = match[1];
  if (profileNames.has(name)) fail(`duplicate profile ${name}`);
  profileNames.add(name);
  const expected = expectedProfiles.get(name);
  if (!expected) {
    fail(`unexpected profile ${name}`);
    continue;
  }
  const fields = parseFields(match[2]);
  profileRecords.set(name, fields);
  if (fields.size !== Object.keys(expected).length) {
    fail(`profile ${name} has ${fields.size} fields; expected ${Object.keys(expected).length}`);
  }
  for (const [key, value] of Object.entries(expected)) {
    if (typeof value === "bigint") {
      const actual = numberField(fields, key, `profile ${name}`);
      if (actual !== value) fail(`profile ${name} ${key} is ${actual}; expected ${value}`);
    } else if (fields.get(key) !== value) {
      fail(`profile ${name} ${key} is ${fields.get(key) ?? "missing"}; expected ${value}`);
    }
  }
}
for (const name of expectedProfiles.keys()) {
  if (!profileNames.has(name)) fail(`profile inventory omits ${name}`);
}

const coreProfile = profileRecords.get("8gb-gpu-core");
if (coreProfile) {
  const context = numberField(coreProfile, "C_max", "core profile cross-check");
  const microbatch = numberField(coreProfile, "microbatch_max", "core profile cross-check");
  const accumulation = numberField(coreProfile, "accumulation_max", "core profile cross-check");
  const perUpdate = numberField(coreProfile, "valid_tokens_per_update_max", "core profile cross-check");
  const tokenBudget = numberField(coreProfile, "N_max", "core profile cross-check");
  const rate = numberField(coreProfile, "throughput_valid_tokens_per_second_min", "core profile cross-check");
  const wall = numberField(coreProfile, "wall_seconds_max", "core profile cross-check");
  if (context * microbatch * accumulation !== perUpdate) {
    fail("core profile valid_tokens_per_update_max does not equal C*microbatch*accumulation");
  }
  const projected = 3600n + (3n * tokenBudget + 2n * rate - 1n) / (2n * rate);
  if (projected > wall) fail(`core profile frozen projection ${projected}s exceeds ${wall}s`);
}

const expectedPreparedInput = "version=1;visibility=crate-private;shape=B,T,D;metadata=positions,attention-mask,segment-ids,loss-eligibility,provenance-id,semantic-config-sha256,run-config-sha256,dtype,device,artifact-id;producers=text-token-ids,cached-text-token;core=one-causal-decoder;tied-text-head=true";
const preparedInputMatch = exactlyOne(/`prepared_input\(([^`]+)\)`/gu, "prepared input machine record");
if (preparedInputMatch?.[1] !== expectedPreparedInput) {
  fail("prepared input machine record differs from the frozen private text-token seam");
}

const retrievalEnvelopeMatch = exactlyOne(/`retrieval_envelope\(([^`]+)\)`/gu, "retrieval envelope");
if (retrievalEnvelopeMatch) {
  const fields = parseFields(retrievalEnvelopeMatch[1]);
  const expected = {
    records_max: 1000n, dimension: 384n, vector_bytes: 1536000n,
    text_metadata_bytes_max: 16777216n, k_max: 10n, process_bytes_max: 536870912n,
    queries_min: 100n, fixed_score_fixtures_min: 10n, warm_p95_milliseconds_max: 100n,
  };
  for (const [key, value] of Object.entries(expected)) {
    const actual = numberField(fields, key, "retrieval envelope");
    if (actual !== value) fail(`retrieval envelope ${key} is ${actual}; expected ${value}`);
  }
  if (fields.size !== Object.keys(expected).length + 3) fail(`retrieval envelope has ${fields.size} fields; expected 12`);
  if (expected.records_max * expected.dimension * 4n !== expected.vector_bytes) fail("validator retrieval vector-byte fixture is inconsistent");
  if (fields.get("authorization") !== "before-ranking") fail("retrieval authorization must precede ranking");
  if (fields.get("score_order") !== "descending") fail("retrieval score order must be descending");
  if (fields.get("tie_order") !== "document-id-utf8-ascending") fail("retrieval tie order differs");
}

const postgresqlTriggerMatch = exactlyOne(/`postgresql_trigger\(([^`]+)\)`/gu, "PostgreSQL trigger");
if (postgresqlTriggerMatch) {
  const fields = parseFields(postgresqlTriggerMatch[1]);
  const expected = {
    records: 100000n, dimension: 384n, raw_vector_bytes: 153600000n, queries: 1000n,
    k: 10n, repetitions: 3n, single_p95_milliseconds_over: 100n,
    crossings_min: 2n,
    concurrency16_p95_milliseconds_over: 250n, rss_bytes_over: 536870912n,
    recovery_seconds_over: 30n, writers_min: 4n,
  };
  for (const [key, value] of Object.entries(expected)) {
    const actual = numberField(fields, key, "PostgreSQL trigger");
    if (actual !== value) fail(`PostgreSQL trigger ${key} is ${actual}; expected ${value}`);
  }
  if (fields.size !== Object.keys(expected).length + 3) fail(`PostgreSQL trigger has ${fields.size} fields; expected 15`);
  if (fields.get("selectivities_percent") !== "100,10,1") fail("PostgreSQL trigger selectivity series differs");
  if (fields.get("concurrency") !== "1,4,8,16") fail("PostgreSQL trigger concurrency series differs");
  if (expected.records * expected.dimension * 4n !== expected.raw_vector_bytes) fail("validator PostgreSQL vector-byte fixture is inconsistent");
  if (fields.get("decision") !== "unselected-until-crossed") fail("PostgreSQL trigger must remain unselected");
}

const deviceMatch = exactlyOne(/`device_admission\(([^`]+)\)`/gu, "device admission");
if (deviceMatch) {
  const fields = parseFields(deviceMatch[1]);
  const expected = {
    name: "rtx4070-laptop-8gb",
    "nvml-name": "NVIDIA-GeForce-RTX-4070-Laptop-GPU",
    "compute-capability": "8.9",
    total_bytes_min: 7945689498n,
    startup_free_bytes_min: 7516192768n,
    peak_free_bytes_min: 536870912n,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (typeof value === "bigint") {
      const actual = numberField(fields, key, "device admission");
      if (actual !== value) fail(`device admission ${key} is ${actual}; expected ${value}`);
    } else if (fields.get(key) !== value) {
      fail(`device admission ${key} is ${fields.get(key) ?? "missing"}; expected ${value}`);
    }
  }
  if (fields.size !== Object.keys(expected).length) fail(`device admission has ${fields.size} fields; expected ${Object.keys(expected).length}`);
}

const partitionMatch = exactlyOne(/`core_partition\(([^`]+)\)`/gu, "core partition");
if (partitionMatch) {
  const fields = parseFields(partitionMatch[1]);
  const expected = {
    state: 805306368n,
    activations: 3221225472n,
    workspace: 1610612736n,
    kv: 67108864n,
    batch_metadata: 67108864n,
    slack: 939524096n,
  };
  const values = [];
  for (const [key, value] of Object.entries(expected)) {
    const actual = numberField(fields, key, "core partition");
    values.push(actual);
    if (actual !== value) fail(`core partition ${key} is ${actual}; expected ${value}`);
  }
  const total = numberField(fields, "total", "core partition");
  if (fields.size !== Object.keys(expected).length + 1) fail(`core partition has ${fields.size} fields; expected 7`);
  const sum = values.reduce((left, right) => left + right, 0n);
  if (sum !== 6710886400n || total !== sum) {
    fail(`core partition sums to ${sum} and records ${total}; expected 6710886400`);
  }
}

for (const [label, regex] of [
  ["model schema", /`model_schema\([^`]+\)`/gu],
  ["config ownership", /`config_ownership\([^`]+\)`/gu],
  ["prepared input", /`prepared_input\([^`]+\)`/gu],
  ["freeze policy", /`freeze_policy\([^`]+\)`/gu],
  ["resume policy", /`resume_policy\([^`]+\)`/gu],
  ["acquisition manifest", /`acquisition_manifest\([^`]+\)`/gu],
  ["dependency policy", /`dependency_policy\([^`]+\)`/gu],
  ["persistence policy", /`persistence\([^`]+\)`/gu],
  ["retrieval policy", /`retrieval\([^`]+\)`/gu],
  ["PostgreSQL policy", /`postgresql\([^`]+\)`/gu],
]) {
  exactlyOne(regex, label);
}

for (const [name, expected, label] of [
  ["freeze_policy", "version=1;before-result=quality-thresholds,equivalence-tolerances,resource-limits,latency-limits,memory-limits,seeds,selection-rule,stopping-rule,overlap-threshold;replacement-after-result=forbidden", "freeze policy"],
  ["resume_policy", "cpu=bitwise;gpu-discrete=exact;gpu-numeric=predeclared-deterministic-or-tolerance;hidden-fallback=forbidden;oom=atomic-last-good", "resume policy"],
  ["seed_registry", "version=1;reference=39;gpu-smoke=4070;core=39;cheap-sensitivity=104729,130363,15485863;adapter-sft=41,43,47;adapter-preference=53,59,61;generation-evaluation=101,103,107,109,127;stream-initialization=1;stream-corpus-order=2;stream-packing=3;stream-optional-dropout=4;stream-sampling=5;stream-evaluation-bootstrap=6", "seed registry"],
  ["acquisition_manifest", "version=1;required=artifact-id,kind,upstream-revision,requested-url,resolved-url,sha256,bytes,media-type,license-id,license-text-sha256,attribution,provenance,filter-script-sha256,filter-config-sha256,redistribution,cache-path;publication=staged-verify-atomic;raw-cache=gitignored;network=separate-declared-step", "acquisition manifest"],
  ["config_manifest", "version=1;canonical-json=true;identity=sha256;binds=model-schema,semantic-fields,run-fields,tokenizer-id,artifact-id,resource-profile;unknown-fields=reject", "configuration manifest"],
  ["run_manifest", "version=1;canonical-json=true;identity=sha256;binds=semantic-config-sha256,run-config-sha256,source-commit,dependency-receipt-sha256,device-driver-backend-kernel-dtype-identity,artifact-dag-root,resource-profile,resource-plan,allocator-counters,thresholds,seeds,phase,terminal-state;unknown-fields=reject", "run manifest"],
  ["artifact_schema", "version=1;canonical-json=true;identity=manifest-sha256;kinds=dataset,config-manifest,run-manifest,tokenizer,dense-safetensors,quantized-gguf-v3-subset,adapter,reference-checkpoint,training-resume,retrieval-fixture,evaluation;unknown-fields=reject;payload-coverage=exact;paths=portable-regular-only", "artifact schema"],
  ["dense_format", "name=safetensors;release=0.8.0;role=container-syntax-only;course-wrapper=required;chapter35-checkpoint-replacement=false", "dense format"],
  ["quantized_format", "name=gguf;version=3;status=required-later-but-parser-unselected;subset=one-commit-pinned-decoder-only-family;sidecars=reject;quantization-course-owned=true", "quantized format"],
  ["dependency_policy", "version=1;scalar-reference=byte-protected;allowed=allocation,storage,transfer,device,stream,gemm,primitive-dispatch,tensor-container,json,http,sse,cli,tls,compression,checksum,metrics,conditional-database-plumbing;forbidden=tokenizer,pretokenizer,bpe,filtering,dedup,packing,masking,rope,attention,online-softmax,rmsnorm,swiglu,decoder,loss,autodiff,optimizer,clipping,accumulation,checkpoint-policy,quantization,calibration,sampling,constrained-decoding,kv-scheduler,peft,lora,preference-optimization,retrieval-policy,generation,trainer,model-runtime;offline-lock=true", "dependency policy"],
  ["persistence", "default=immutable-content-addressed-files;identity=sha256;publication=fsync-and-atomic-rename;database=unselected", "persistence policy"],
  ["retrieval", "default=bounded-in-memory-filesystem-exact-top-k;vectors=provided-provenance-bound;authorization=before-ranking;ties=frozen-total-order;database=not-required", "retrieval policy"],
  ["postgresql", "disposition=unselected-optional-advanced;trigger=measured-capacity-or-latency-or-concurrency-recovery-need;mandatory-dependency=false;pgvector=unselected", "PostgreSQL policy"],
  ["postgresql_adapter_requirements", "version=1;status=conditional-only;artifacts=Dockerfile,Compose;pins=postgresql-image-digest,pgvector-version;tests=clean-empty-initialization,migrations,health,least-privilege,concurrent-rust-conformance,durable-restart,backup-restore,schema-rollback-forward-fix,upgrade,oracle-equivalence;interface=course-owned;sql-client-types-in-core=forbidden", "conditional PostgreSQL adapter requirements"],
]) {
  exactRecord(name, expected, label);
}

const sourceFileMatches = [...contract.matchAll(/`source_file\(([^`]+)\)`/gu)];
if (sourceFileMatches.length !== 2) {
  fail(`raw-source inventory has ${sourceFileMatches.length} records; expected 2`);
}
const expectedSourceFiles = new Map([
  ["tinystories-train-raw", { bytes: 1924281556n, sha256: "c5cf5e22ff13614e830afbe61a99fbcbe8bcb7dd72252b989fa1117a368d401f", path: "TinyStories-train.txt", url: "https://huggingface.co/datasets/roneneldan/TinyStories/resolve/f54c09fd23315a6f9c86f9dc80f725de7d8f9c64/TinyStories-train.txt" }],
  ["tinystories-valid-raw", { bytes: 19447282n, sha256: "94e431816c4cce81ff71e4408ff8d3bda9a42e8d2663986697c3954288cb38b4", path: "TinyStories-valid.txt", url: "https://huggingface.co/datasets/roneneldan/TinyStories/resolve/f54c09fd23315a6f9c86f9dc80f725de7d8f9c64/TinyStories-valid.txt" }],
]);
let sourceByteSum = 0n;
for (const match of sourceFileMatches) {
  const fields = parseFields(match[1]);
  const id = fields.get("id");
  const expected = expectedSourceFiles.get(id);
  if (!expected) {
    fail(`unexpected raw source ${id ?? "missing"}`);
    continue;
  }
  const bytes = numberField(fields, "bytes", `raw source ${id}`);
  if (fields.size !== 12) fail(`raw source ${id} has ${fields.size} fields; expected 12`);
  sourceByteSum += bytes;
  if (bytes !== expected.bytes) fail(`raw source ${id} bytes differ`);
  if (fields.get("sha256") !== expected.sha256) fail(`raw source ${id} SHA-256 differs`);
  if (fields.get("relative-path") !== expected.path) fail(`raw source ${id} path differs`);
  if (fields.get("resolved-url") !== expected.url) fail(`raw source ${id} resolved URL differs`);
  if (fields.get("media-type") !== "text/plain-utf8-expected") fail(`raw source ${id} media type differs`);
  if (fields.get("revision") !== "f54c09fd23315a6f9c86f9dc80f725de7d8f9c64") fail(`raw source ${id} revision differs`);
  if (fields.get("license") !== "CDLA-Sharing-1.0") fail(`raw source ${id} license differs`);
  if (fields.get("language") !== "en" || fields.get("domain") !== "synthetic-short-stories") fail(`raw source ${id} language/domain differs`);
  const expectedKind = id === "tinystories-train-raw" ? "raw-corpus" : "raw-heldout-source";
  if (fields.get("kind") !== expectedKind) fail(`raw source ${id} kind differs`);
  if (fields.get("acquisition") !== "blocked-until-manifest") fail(`raw source ${id} must remain acquisition-blocked`);
}
if (sourceByteSum !== 1943728838n) fail(`raw-source bytes sum to ${sourceByteSum}; expected 1943728838`);

const candidateMatches = [...contract.matchAll(/`candidate\(([^;]+);([^`]+)\)`/gu)];
const candidates = new Map(candidateMatches.map((match) => [match[1], parseFields(match[2])]));
if (candidateMatches.length !== 2 || candidates.size !== 2) {
  fail(`candidate disposition inventory has ${candidateMatches.length} records and ${candidates.size} IDs; expected 2/2`);
}
if (candidates.get("imported-model")?.get("disposition") !== "deferred") {
  fail("imported model must remain fail-closed deferred in contract v1");
}
if (candidates.get("dataset")?.get("disposition") !== "selected-raw-source-only") {
  fail("dataset disposition must select only the exact raw source pair");
}
if (numberField(candidates.get("dataset") ?? new Map(), "bytes", "dataset candidate") !== 1943728838n) {
  fail("selected dataset candidate byte sum differs");
}
const datasetCandidate = candidates.get("dataset");
if (datasetCandidate) {
  if (datasetCandidate.size !== 6) fail(`dataset candidate has ${datasetCandidate.size} fields; expected 6`);
  for (const [key, value] of [
    ["disposition", "selected-raw-source-only"],
    ["id", "roneneldan-TinyStories-original-text-pair"],
    ["revision", "f54c09fd23315a6f9c86f9dc80f725de7d8f9c64"],
    ["license", "CDLA-Sharing-1.0"],
    ["derived-corpus", "blocked-filter-split-license-receipts"],
  ]) {
    if (datasetCandidate.get(key) !== value) fail(`dataset candidate ${key} differs`);
  }
}
const importedCandidate = candidates.get("imported-model");
if (importedCandidate) {
  if (importedCandidate.size !== 2) fail(`imported-model candidate has ${importedCandidate.size} fields; expected 2`);
  if (importedCandidate.get("reason") !== "selection-requires-exact-revision-compatible-schema-license-model-card-bytes-tokenizer-template-and-derivative-license-path") {
    fail("imported-model deferral reason differs");
  }
}

const modelCandidateMatches = [...contract.matchAll(/`model_candidate\(([^`]+)\)`/gu)];
if (modelCandidateMatches.length !== 3) {
  fail(`model candidate inventory has ${modelCandidateMatches.length} records; expected 3`);
}

const sourceRecordMatches = [...contract.matchAll(/^`source_record\(([^`\r\n]+)\)`$/gmu)];
if (sourceRecordMatches.length !== 55) {
  fail(`source register has ${sourceRecordMatches.length} records; expected 55`);
}
const sourceIds = new Set();
for (const match of sourceRecordMatches) {
  const fields = parseFields(match[1]);
  const id = fields.get("id");
  if (!id || sourceIds.has(id)) fail(`missing or duplicate source record ${id ?? "missing"}`);
  else sourceIds.add(id);
  if (fields.size !== 5) fail(`source ${id ?? "missing"} has ${fields.size} fields; expected 5`);
  if (!["official-hardware", "official-specification", "official-artifact-metadata", "official-license", "official-source", "primary-paper"].includes(fields.get("kind"))) {
    fail(`source ${id ?? "missing"} has invalid kind ${fields.get("kind") ?? "missing"}`);
  }
  if (!/^https:\/\//u.test(fields.get("url") ?? "")) fail(`source ${id ?? "missing"} lacks HTTPS URL`);
  if (!(fields.get("supports") ?? "")) fail(`source ${id ?? "missing"} lacks supports scope`);
  if (!(fields.get("limit") ?? "")) fail(`source ${id ?? "missing"} lacks claim limit`);
}
const expectedSourceIds = new Set([
  ...Array.from({ length: 11 }, (_, index) => `HWP-${String(index + 1).padStart(2, "0")}`),
  ...Array.from({ length: 10 }, (_, index) => `DM-${String(index + 1).padStart(2, "0")}`),
  ...Array.from({ length: 34 }, (_, index) => `DAP-${String(index + 1).padStart(2, "0")}`),
]);
if (sourceIds.size !== expectedSourceIds.size || [...sourceIds].some((id) => !expectedSourceIds.has(id))) {
  fail("source register ID inventory differs from the frozen 55-record set");
}
const sortedSourceRecords = sourceRecordMatches
  .map((match) => `source_record(${match[1]})`)
  .sort((left, right) => Buffer.from(left).compare(Buffer.from(right)));
const sourceRegisterDigest = sha256(Buffer.from(`${sortedSourceRecords.join("\n")}\n`, "utf8"));
if (sourceRegisterDigest !== "0c25614afa82de281a96235429a969d4aecd3d22c73c5b75ad1962434199951b") {
  fail(`source register digest is ${sourceRegisterDigest}; expected 0c25614afa82de281a96235429a969d4aecd3d22c73c5b75ad1962434199951b`);
}
const sortedDapRecords = sourceRecordMatches
  .filter((match) => match[1].startsWith("id=DAP-"))
  .map((match) => `source_record(${match[1]})`)
  .sort((left, right) => Buffer.from(left).compare(Buffer.from(right)));
const dapRegisterDigest = sha256(Buffer.from(`${sortedDapRecords.join("\n")}\n`, "utf8"));
if (dapRegisterDigest !== "4aa352946cead209e5a64bf89884c162c0e27d1d2e0f5439903c72826ecd3aca") {
  fail(`DAP source register digest is ${dapRegisterDigest}; expected 4aa352946cead209e5a64bf89884c162c0e27d1d2e0f5439903c72826ecd3aca`);
}
exactRecord(
  "source_register",
  "version=1;HWP=11;DM=10;DAP=34;total=55;dap_sorted_record_sha256=4aa352946cead209e5a64bf89884c162c0e27d1d2e0f5439903c72826ecd3aca;all_sorted_record_sha256=0c25614afa82de281a96235429a969d4aecd3d22c73c5b75ad1962434199951b;observation_date=2026-08-13",
  "source register summary",
);
const modelCandidates = new Map();
for (const match of modelCandidateMatches) {
  const fields = parseFields(match[1]);
  const id = fields.get("id");
  if (!id || modelCandidates.has(id)) fail(`missing or duplicate model candidate ${id ?? "missing"}`);
  else modelCandidates.set(id, fields);
}
for (const [id, revision, artifact, bytes, digest, disposition] of [
  ["EleutherAI-pythia-31m", "e556ace21b489575e94e9d50b6dad2fcc7419679", "model.safetensors", 60997960n, "02ddadd516061264cd44b47c84ae49c6641f869e6d3f06c7d0e4855f31e34059", "rejected-incompatible-gpt-neox"],
  ["roneneldan-TinyStories-33M", "2ad0a164221b7c4d21cac7c46aec74f6f98dbfc8", "pytorch_model.bin", 290854321n, "41316d3bad3cf7766cbc36443a71c5ef05321a1c4fa14855df537998c6dad302", "rejected-incompatible-gpt-neo-and-incomplete-license-tokenizer"],
  ["karpathy-stories42M", "0bd21da7698eaf29a0d7de3992de8a46ef624add", "stories42M.bin", 167020572n, "9f65a1000e17d0bc167dd6332e0ce5119a0222a3d920cead5bce413bfab2ee7b", "deferred-leading-candidate-incomplete-config-tokenizer-training-license-conversion-lineage"],
]) {
  const record = modelCandidates.get(id);
  if (record?.size !== 6) fail(`model candidate ${id} must have exactly 6 fields`);
  if (record?.get("revision") !== revision) fail(`model candidate ${id} revision differs`);
  if (record?.get("artifact") !== artifact) fail(`model candidate ${id} artifact differs`);
  if (numberField(record ?? new Map(), "bytes", `model candidate ${id}`) !== bytes) fail(`model candidate ${id} byte count differs`);
  if (record?.get("sha256") !== digest) fail(`model candidate ${id} SHA-256 differs`);
  if (record?.get("disposition") !== disposition) {
    fail(`model candidate ${id} disposition differs`);
  }
}

if (!/same-filesystem temporary files/iu.test(contract) || !/atomic\s+rename/iu.test(contract)) {
  fail("contract must require same-filesystem staging and atomic publication");
}
if (!/authorization\s+filters eligible IDs before ranking/iu.test(contract)) {
  fail("retrieval must filter authorization before ranking");
}
if (!/stable brute-force exact top-k/iu.test(contract)) {
  fail("mandatory retrieval must be stable brute-force exact top-k");
}
if (!/PostgreSQL and pgvector are not selected/iu.test(contract) || !/mandatory-dependency=false/u.test(contract)) {
  fail("PostgreSQL/pgvector must remain unselected and nonmandatory");
}
if (/postgresql\([^`]*mandatory-dependency=true[^`]*\)/iu.test(contract)) {
  fail("contract appears to make PostgreSQL/pgvector mandatory");
}

const forbiddenDependencyConcepts = [
  "tokenizer", "pretokenizer", "bpe", "filtering", "dedup", "packing", "masking",
  "rope", "attention", "online-softmax", "rmsnorm", "swiglu", "decoder", "loss",
  "autodiff", "optimizer", "clipping", "accumulation", "checkpoint-policy",
  "quantization", "calibration", "sampling", "constrained-decoding", "kv-scheduler",
  "peft", "lora", "preference-optimization", "retrieval-policy", "generation", "trainer",
  "model-runtime",
];
const dependencyMatch = exactlyOne(/`dependency_policy\(([^`]+)\)`/gu, "dependency policy fields");
if (dependencyMatch) {
  const fields = parseFields(dependencyMatch[1]);
  const forbidden = new Set((fields.get("forbidden") ?? "").split(","));
  for (const concept of forbiddenDependencyConcepts) {
    if (!forbidden.has(concept)) fail(`dependency policy omits forbidden concept ${concept}`);
  }
  if (fields.get("offline-lock") !== "true") fail("dependency policy must require offline lock");
}

const dependencyMatches = [...contract.matchAll(/`dependency\(([^`]+)\)`/gu)];
const expectedDependencies = new Map([
  ["serde", ["1.0.229", "selected-current", "derive", "json-shape-adapter-only"]],
  ["serde_json", ["1.0.151", "selected-current", "default", "json-syntax-only"]],
  ["safetensors", ["0.8.0", "prospective-graph-blocked", "none-to-be-confirmed", "dense-container-syntax-only"]],
  ["sha2", ["0.11.0", "prospective-graph-blocked", "default-off-std-if-required", "streaming-sha256-only"]],
  ["wgpu", ["30.0.0", "prospective-graph-blocked", "std,vulkan,wgsl,strict_asserts", "safe-vulkan-allocation-transfer-course-kernel-dispatch"]],
  ["pollster", ["1.0.1", "prospective-graph-blocked", "no-macro", "bounded-wgpu-init-only"]],
  ["bytemuck", ["1.25.2", "prospective-graph-blocked", "default-off-no-derive", "checked-primitive-host-byte-views"]],
  ["nvml-wrapper", ["0.12.1", "optional-prospective-graph-blocked", "none", "nvidia-observation-only"]],
  ["clap", ["4.6.6", "prospective-graph-blocked", "std,help,usage,error-context", "cli-syntax-only"]],
  ["axum", ["0.8.9", "prospective-graph-blocked", "http1,json,tokio", "loopback-http-sse-framing-only"]],
  ["tokio", ["1.53.1", "prospective-graph-blocked", "rt-multi-thread,net,signal,sync,time", "local-transport-runtime-only"]],
  ["gguf-rs-lib", ["0.2.5", "deferred-parser-admission", "std-only-if-admitted", "gguf-v3-primitive-syntax-only"]],
  ["postgresql-pgvector-stack", ["none", "unselected", "none", "none-mandatory"]],
]);
if (dependencyMatches.length !== expectedDependencies.size) {
  fail(`dependency inventory has ${dependencyMatches.length} records; expected ${expectedDependencies.size}`);
}
const dependencyIds = new Set();
for (const match of dependencyMatches) {
  const fields = parseFields(match[1]);
  const id = fields.get("id");
  if (!id || dependencyIds.has(id)) fail(`missing or duplicate dependency ${id ?? "missing"}`);
  else dependencyIds.add(id);
  const expected = expectedDependencies.get(id);
  if (!expected) {
    fail(`unexpected dependency ${id ?? "missing"}`);
    continue;
  }
  if (fields.get("version") !== expected[0]) fail(`dependency ${id} version differs`);
  if (fields.get("status") !== expected[1]) fail(`dependency ${id} status differs`);
  if (fields.get("features") !== expected[2]) fail(`dependency ${id} features differ`);
  if (fields.get("role") !== expected[3]) fail(`dependency ${id} role differs`);
  if (fields.size !== 5) fail(`dependency ${id} has ${fields.size} fields; expected 5`);
}
for (const id of expectedDependencies.keys()) {
  if (!dependencyIds.has(id)) fail(`dependency inventory omits ${id}`);
}

const currentGraphMatch = exactlyOne(/`current_dependency_graph\(([^`]+)\)`/gu, "current dependency graph");
if (currentGraphMatch) {
  const fields = parseFields(currentGraphMatch[1]);
  const expectedPackages = "itoa@1.0.18,memchr@2.8.3,proc-macro2@1.0.107,quote@1.0.47,serde@1.0.229,serde_core@1.0.229,serde_derive@1.0.229,serde_json@1.0.151,syn@3.0.3,unicode-ident@1.0.24,zmij@1.0.23";
  if (fields.get("packages") !== expectedPackages) fail("current dependency graph package inventory differs");
  if (fields.get("cargo-lock-sha256") !== "b9491c2c89096a48ea62c98f79b5851272df4cb3afca09d41b80ed679b5a7fe1") fail("current dependency graph lock hash differs");
  if (fields.get("version") !== "1" || fields.size !== 3) fail("current dependency graph version or field count differs");
}

const expectedMachineRecordCounts = new Map([
  ["model_schema", 1], ["config_ownership", 1], ["planner_arithmetic", 1],
  ["scale", 4], ["evaluation_scale", 1], ["mac_causal", 1], ["mac_dense", 1],
  ["kv_bf16_full_context", 1], ["dense_parameter_state_lower_bound", 1],
  ["communication_fixture", 1], ["prepared_input", 1], ["device_admission", 1],
  ["core_partition", 1], ["calibration_policy", 1], ["profile", 7],
  ["config_manifest", 1], ["run_manifest", 1], ["numeric_policy", 1], ["tolerance", 10],
  ["freeze_policy", 1], ["resume_policy", 1], ["seed_registry", 1],
  ["acquisition_manifest", 1], ["artifact_schema", 1], ["dense_format", 1],
  ["quantized_format", 1], ["source_file", 2], ["candidate", 2],
  ["model_candidate", 3], ["dependency_policy", 1], ["current_dependency_graph", 1],
  ["dependency", 13], ["retrieval_envelope", 1], ["postgresql_trigger", 1],
  ["postgresql_adapter_requirements", 1], ["persistence", 1], ["retrieval", 1],
  ["postgresql", 1], ["source_record", 55], ["source_register", 1],
]);
const actualMachineRecordCounts = new Map();
for (const match of contract.matchAll(/^`([a-z][a-z0-9_]*)\(([^`\r\n]+)\)`$/gmu)) {
  actualMachineRecordCounts.set(match[1], (actualMachineRecordCounts.get(match[1]) ?? 0) + 1);
}
for (const [name, count] of expectedMachineRecordCounts) {
  if (actualMachineRecordCounts.get(name) !== count) {
    fail(`standalone ${name} record count is ${actualMachineRecordCounts.get(name) ?? 0}; expected ${count}`);
  }
}
for (const name of actualMachineRecordCounts.keys()) {
  if (!expectedMachineRecordCounts.has(name)) fail(`unknown standalone machine-record kind ${name}`);
}

if (failures.length > 0) {
  for (const message of failures) process.stderr.write(`- ${message}\n`);
  process.stderr.write(`resource contract validation failed with ${failures.length} error(s)\n`);
  process.exit(1);
}

process.stdout.write(
  `resource contract validation passed: ${expectedScales.size} scales, ${expectedProfiles.size} profiles, ${candidateMatches.length} candidate dispositions, contract sha256 ${sha256(Buffer.from(contract, "utf8"))}\n`,
);
