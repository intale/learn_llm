#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { closeSync, existsSync, lstatSync, openSync, readFileSync, readSync, readdirSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {loadFrozenFunctionalDesign} from './lib/frozen-functional-design.mjs';
import { validateCurrentCorpusPlan, validateCurrentCorpusQueue, jsonDigest, CORPUS_MIGRATION_STEP } from './lib/functional-corpus-migration-v2.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const directInvocation=process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url);
const explicitHistoryRoot=directInvocation?parseArgs(process.argv.slice(2))['--root']:process.env.COURSE_HISTORY_ROOT;
if(!explicitHistoryRoot)throw new Error('explicit --root or COURSE_HISTORY_ROOT must select the exported original functional checkpoint');
const DEFAULT_ROOT=resolve(explicitHistoryRoot);
const {EMBEDDED_CONSTANTS,EMBEDDED_SCHEMA,EMBEDDED_QUEUE,EMBEDDED_CHAPTER_RECORDS,EMBEDDED_PLAN_DATA,EMBEDDED_PLAN_BODY}=loadFrozenFunctionalDesign(DEFAULT_ROOT);
const DEFAULTS = Object.freeze({
  plan: 'curriculum/functional-laptop-llm-extension-plan.md',
  coursePlan: 'curriculum/course-plan.md',
  readme: 'curriculum/README.md',
  state: 'BUILD_STATE.yaml'
});
const PUBLISHED_PREDECESSOR_SHA256 = '20fda59082cdb47d69b25f9095d85f70e10ec5fd200cdd5fc245a8d76bf4c72a';
const EXECUTION_COMPATIBILITY_PATH = 'configs/functional-execution-compatibility-v5.json';
const EXECUTION_COMPATIBILITY_SHA256 = 'b31900ee1e361901cfbf082a839536848dda7b5e52bef46e03369307fbc96114';
const PUBLISHED_CONSTANTS_SHA256 = /* exact immutable constants SHA-256 */ "3129cbde349f8fad45982713a865fc0769796ef6a53e7eb572020d8e5cc40a22";
const PUBLISHED_SCHEMA_SHA256 = /* exact immutable schema SHA-256 */ "d6c45ad5603d4529a9ca8529a8191283225d30bb4fd8c25a74b6098f8351d0af";
const PUBLISHED_QUEUE_SHA256 = /* exact immutable queue SHA-256 */ "4b7922089c5bb5f45288ccb6f002ce9756a011e6e5ccc1a2b3898fc809c339fc";
const PUBLISHED_CHAPTER_RECORDS_SHA256 = /* exact immutable chapter-records SHA-256 */ "bf0870d9e4bb715db6de70cba99c634a7f6062fdfb98b5860d24c76ae7e0bed2";
const PUBLISHED_EXTENSION_PLAN_SHA256 = /* exact immutable published extension-plan SHA-256 */ "be619fa7e8a09adc95b7e7d7ab89b23a1c2998389f43b69a53bd92748aedfd6d";
const ACCEPTED_PATHS = Object.freeze({
  coverage_sha256: 'audits/2026-08-10-functional-llm-capability/coverage.md',
  requirements_sha256: 'audits/2026-08-10-functional-llm-capability/requirements.md',
  coverage_validator_sha256: 'audits/2026-08-10-functional-llm-capability/validate-coverage.mjs',
  resource_contract_sha256: 'audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md',
  resource_validator_sha256: 'audits/2026-08-10-functional-llm-capability/validate-resource-contract.mjs'
});

function fail(message) {
  throw new Error(message);
}
function check(condition, message) {
  if (!condition) fail(message);
}
function assertSelectedModelBinding(actual, selected, label) {
  check(typeof selected === 'string' && selected.trim().length > 0, label + ' selected model is missing');
  check(typeof actual === 'string' && actual.trim().length > 0 && actual === selected, label + ' selected model identity drift');
}
function validateVisualDiagnosticsPolicy(generation) {
  check(generation && typeof generation === 'object' && !Array.isArray(generation), 'content generation policy missing');
  check(!Object.hasOwn(generation, 'affected_rendered_image_review'), 'routine image-review gate is excluded');
  deepEqual(generation.human_reported_visual_diagnostics, {
    contexts_max: 1, model_policy: 'user-selected-model',
    input_image_bytes_max: 16777216, input_tokens_max: 65536,
    output_bytes_max: 262144, output_tokens_max: 8192, wall_seconds_max: 900,
    required: false, trigger: 'human-adjudicator-reports-visual-artifact',
    screenshots: 'only-if-needed-to-investigate-reported-issue',
  }, 'optional human-reported visual diagnostics policy');
}
const OUT_OF_SCOPE_MODEL_SURFACE = String.raw`(?:multimodal|mmproj|image[ -]+input|audio|video|diffusion|encoder[ -]*only|encoder[ -]*decoder|seq2seq|sequence[ -]*to[ -]*sequence|auto[ -]*encoder|cross[ -]*attention|bidirectional[ -]+attention|projector|resampler|modality|non[ -]*text[ -]+producer|(?:model|neural|retrieval|sentence)[ -]+encoder|retrieval[ -]+encoder(?:[ -]+model)?|rerank(?:er|ing)[ -]+(?:model|network)|masked[ -]+language[ -]+model|masked[ -]+token[ -]+(?:objective|prediction|modeling)|\bMLM\b|bidirectional[ -]+(?:language[ -]+model|transformer|encoder)|non[ -]*(?:autoregressive|causal)[ -]+(?:language[ -]+)?model|parallel[ -]+token[ -]+(?:prediction|generation|model)|permutation[ -]+language[ -]+model|denoising[ -]+(?:language[ -]+)?model|denoising[ -]+objective|causal[ -]+denois(?:ing|er)|\bBERT(?:[ -]+model)?\b|\bT5(?:[ -]+model)?\b|(?:recurrent|RNN|LSTM|GRU)[ -]+(?:language[ -]+)?model|(?:state[ -]*space|SSM|Mamba)[ -]+(?:language[ -]+)?model|(?:vision|convolutional)[ -]+(?:language[ -]+)?(?:transformer|model)|\bGAN[ -]+model|(?:reward|embedding|classification|discriminator|verifier)[ -]+(?:language[ -]+)?model|verifier[ -]*model[ -]+weights?|speculative[ -]+helper[ -]+network|auxiliary[ -]+neural[ -]+network|model[ -]+ensemble|dual[ -]*model[ -]+architecture|decoder[ -]*only[ -]+transformer[ -]+sibling|decoder[ -]+model[ -]+B(?:[ -]+in[ -]+addition[ -]+to[ -]+model[ -]+A)?|(?:another|extra|separate|fallback|sibling|third|two|multiple|additional|auxiliary|companion|parallel|replacement|spare|independent|one[ -]+more)[ -]+(?:causal[ -]+)?(?:transformers?|decoders?|cores?|heads?|models?|model[ -]+paths?|networks?|neural[ -]+networks?|model[ -]+weights?|model[ -]+forward[ -]+paths?)|second[ -]*(?:language[ -]+)?(?:causal[ -]+)?(?:transformer|decoder|core|head|model|output[ -]+head|model[ -]+core)|alternate[ -]+(?:transformer|decoder|core|head|model|model[ -]+path|output[ -]+head|model[ -]+core)|draft[ -]+(?:model|weights?|forward(?:[ -]+pass)?|decoder|head|core))`;
const MODEL_AUTHORIZATION_ACTION = String.raw`(?:implement(?:s|ed|ing)?|add(?:s|ed|ing)?|creat(?:e|es|ed|ing)|support(?:s|ed|ing)?|accept(?:s|ed|ing)?|produc(?:e|es|ed|ing)|recogniz(?:e|es|ed|ing)|generat(?:e|es|ed|ing)|expos(?:e|es|ed|ing)|reserv(?:e|es|ed|ing)|plan(?:s|ned|ning)?|load(?:s|ed|ing)?|run(?:s|ning)?|ran|instantiat(?:e|es|ed|ing)|execut(?:e|es|ed|ing)|train(?:s|ed|ing)?|import(?:s|ed|ing)?|build(?:s|ing)?|built|allow(?:s|ed|ing)?|us(?:e|es|ed|ing)|rout(?:e|es|ed|ing)|deploy(?:s|ed|ing)?|ship(?:s|ped|ping)?)`;
const MODEL_AUTHORIZATION_NEGATION = /\b(?:no|not|never|without|forbid(?:s|den)?|reject(?:s|ed)?|exclud(?:e|es|ed)|absence|absent|cannot|does not|do not|must not|only one|sole|single|prevents?|precludes?)\b|\b(?:rather than|instead of)\b/i;
const ACTION_THEN_MODEL_SURFACE = new RegExp(MODEL_AUTHORIZATION_ACTION + String.raw`\b[^.\n;]{0,160}\b` + OUT_OF_SCOPE_MODEL_SURFACE,'ig');
const MODEL_SURFACE_THEN_PASSIVE_ACTION = new RegExp(String.raw`\b` + OUT_OF_SCOPE_MODEL_SURFACE + String.raw`\b[^.\n;]{0,100}\b(?:is|are|be|being|will be|can be|may be)\s+` + MODEL_AUTHORIZATION_ACTION,'ig');
function assertNoPositiveModelAuthorization(value, label) {
  const visit = (entry, path) => {
    if (typeof entry === 'string') {
      for (const pattern of [ACTION_THEN_MODEL_SURFACE,MODEL_SURFACE_THEN_PASSIVE_ACTION]) {
        pattern.lastIndex = 0;
        for (const match of entry.matchAll(pattern)) {
          const start = Math.max(entry.lastIndexOf('.',match.index) + 1,entry.lastIndexOf(';',match.index) + 1,entry.lastIndexOf('\n',match.index) + 1);
          const endCandidates = [entry.indexOf('.',match.index),entry.indexOf(';',match.index),entry.indexOf('\n',match.index)].filter((index) => index >= 0);
          const end = endCandidates.length ? Math.min(...endCandidates) : entry.length;
          const clause = entry.slice(start,end);
          check(MODEL_AUTHORIZATION_NEGATION.test(clause), label + ' authorizes an out-of-scope model surface at ' + path + ': ' + match[0]);
        }
      }
      return;
    }
    if (Array.isArray(entry)) for (let index = 0; index < entry.length; index += 1) visit(entry[index],path + '[' + index + ']');
    else if (entry && typeof entry === 'object') for (const [key,child] of Object.entries(entry)) visit(child,path + '.' + key);
  };
  visit(value,'$');
}
function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}
function hashRegularFile(path) {
  const handle = openSync(path, 'r');
  const digest = createHash('sha256');
  const buffer = Buffer.allocUnsafe(1048576);
  let bytes = 0;
  try {
    for (;;) {
      const count = readSync(handle,buffer,0,buffer.length,null);
      if (count === 0) break;
      digest.update(buffer.subarray(0,count));
      bytes += count;
    }
  } finally {
    closeSync(handle);
  }
  return {bytes,sha256:digest.digest('hex')};
}
function hashRegularFilePrefix(path, prefixBytes) {
  check(Number.isSafeInteger(prefixBytes) && prefixBytes >= 0, 'prefix byte count invalid');
  const handle = openSync(path, 'r');
  const digest = createHash('sha256');
  const buffer = Buffer.allocUnsafe(Math.min(1048576, Math.max(1,prefixBytes)));
  let bytes = 0;
  try {
    while (bytes < prefixBytes) {
      const count = readSync(handle,buffer,0,Math.min(buffer.length,prefixBytes - bytes),null);
      check(count > 0, 'file ended before immutable prefix');
      digest.update(buffer.subarray(0,count));
      bytes += count;
    }
  } finally {
    closeSync(handle);
  }
  return {bytes,sha256:digest.digest('hex')};
}
function pathInventory(root, relativePath, label) {
  check(typeof relativePath === 'string' && relativePath.length > 0 && !relativePath.includes('\0') && !relativePath.includes('<'), label + ' inventory path invalid');
  const absolute = resolve(root,relativePath);
  const rel = relative(root,absolute);
  check(rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel), label + ' inventory path escapes root');
  check(existsSync(absolute), label + ' inventory path missing ' + relativePath);
  const records = [];
  const walk = (absolutePath,repoPath) => {
    const stat = lstatSync(absolutePath);
    check(!stat.isSymbolicLink(), label + ' inventory path is a symlink ' + repoPath);
    if (stat.isDirectory()) {
      for (const entry of readdirSync(absolutePath,{withFileTypes:true}).sort((a,b) => Buffer.from(a.name).compare(Buffer.from(b.name)))) {
        check(!entry.isSymbolicLink(), label + ' inventory contains a symlink ' + repoPath + '/' + entry.name);
        walk(resolve(absolutePath,entry.name),repoPath + '/' + entry.name);
      }
      return;
    }
    check(stat.isFile(), label + ' inventory contains a nonregular path ' + repoPath);
    const observed = hashRegularFile(absolutePath);
    records.push({path:repoPath,bytes:observed.bytes,sha256:observed.sha256});
  };
  walk(absolute,relativePath.replace(/\/$/,''));
  return {path:relativePath.replace(/\/$/,''),files:records,inventory_sha256:sha256(Buffer.from(canonicalJson(records)))};
}
function repoPathTokens(value) {
  const tokens = [];
  const visit = (entry) => {
    if (typeof entry === 'string') {
      const regex = /(?:^|[\s='"(:,\[])((?:\.dockerignore|AGENTS\.md|BUILD_STATE\.yaml|DECISIONS\.md|Cargo\.toml|Cargo\.lock|course|(?:\.agents|scripts|configs|audits|rust|site|curriculum|artifacts)\/[A-Za-z0-9._<>/-]+))/g;
      for (const match of entry.matchAll(regex)) tokens.push(match[1].replace(/[),.;:'"]+$/,''));
    } else if (Array.isArray(entry)) {
      for (const child of entry) visit(child);
    } else if (entry && typeof entry === 'object') {
      for (const child of Object.values(entry)) visit(child);
    }
  };
  visit(value);
  return [...new Set(tokens.filter((path) => !path.includes('<') && !path.startsWith('/')))].sort((a,b) => Buffer.from(a).compare(Buffer.from(b)));
}
function closedCommandRepoPaths(validateCommands, targetRecords) {
  const selected = [validateCommands];
  const visit = (value,key = '') => {
    if (Array.isArray(value)) { for (const child of value) visit(child,key); return; }
    if (!value || typeof value !== 'object') return;
    for (const [childKey,child] of Object.entries(value)) {
      if (/(?:^|_)(?:commands?|closed_command|driver|spec|phase_spec|validator|checker|runner|tests?|scripts?|config|allowlist|patch)(?:$|_)/i.test(childKey)) selected.push(child);
      else if (child && typeof child === 'object') visit(child,childKey);
    }
  };
  for (const record of targetRecords) visit(record);
  return repoPathTokens(selected).filter((path) => !path.startsWith('artifacts/'));
}
function inputReceiptPaths(targetRecords) {
  const paths = [];
  const add = (value) => {
    if (typeof value === 'string' && value.startsWith('artifacts/') && value.endsWith('.json')) paths.push(value);
    if (Array.isArray(value)) for (const child of value) add(child);
    if (value && typeof value === 'object' && !Array.isArray(value)) for (const child of Object.values(value)) add(child);
  };
  for (const record of targetRecords) {
    add(record.input_receipts);
    add(record.input_receipt);
    add(record.input_cache_receipts);
    add(record.input_receipt_mounts);
    add(record.runtime_image_selector?.receipt);
    add(record.runtime_selector?.receipt);
    add(record.runtime_receipt);
    add(record.toolchain_selector?.receipt);
    add(record.oracle_toolchain_selector?.receipt);
    add(record.admission_receipt_selector?.input_receipt);
    for (const value of Object.values(record.cache_mounts || {})) {
      const selected = typeof value === 'string' ? value.match(/^entry-selected-by-(artifacts\/.+\.json)$/) : null;
      if (selected) paths.push(selected[1]);
    }
    for (const value of Object.values(record.input_cache_mounts || {})) {
      const selected = typeof value === 'string' ? value.match(/^entry-selected-by-(artifacts\/.+\.json)$/) : null;
      if (selected) paths.push(selected[1]);
    }
  }
  return [...new Set(paths)].sort((a,b) => Buffer.from(a).compare(Buffer.from(b)));
}
function inputCacheReceiptPaths(targetRecords) {
  const paths = [];
  const add = (value) => {
    if (typeof value === 'string' && value.startsWith('artifacts/') && value.endsWith('.json')) paths.push(value);
    if (Array.isArray(value)) for (const child of value) add(child);
    if (value && typeof value === 'object' && !Array.isArray(value)) for (const child of Object.values(value)) add(child);
  };
  for (const record of targetRecords) {
    add(record.input_cache_receipts);
    add(record.input_cache_receipt);
    for (const value of Object.values(record.cache_mounts || {})) {
      const selected = typeof value === 'string' ? value.match(/^entry-selected-by-(artifacts\/.+\.json)$/) : null;
      if (selected) paths.push(selected[1]);
    }
    for (const value of Object.values(record.input_cache_mounts || {})) {
      const selected = typeof value === 'string' ? value.match(/^entry-selected-by-(artifacts\/.+\.json)$/) : null;
      if (selected) paths.push(selected[1]);
    }
  }
  return [...new Set(paths)].sort((a,b) => Buffer.from(a).compare(Buffer.from(b)));
}
function findReceiptCacheIdentity(receipt, label) {
  const digests = [];
  const paths = [];
  const visit = (value,key = '') => {
    if (typeof value === 'string') {
      if (['cache_entry_sha256','cache_entry_digest','cache_entry_hash'].includes(key)) {
        const normalized = value.startsWith('sha256:') ? value.slice(7) : value;
        check(/^[0-9a-f]{64}$/.test(normalized), label + ' cache-entry digest invalid');
        digests.push(normalized);
      }
      if (['cache_entry_path','cache_path','canonical_cache_entry_path'].includes(key)) paths.push(value);
      return;
    }
    if (Array.isArray(value)) { for (const child of value) visit(child,key); return; }
    if (value && typeof value === 'object') for (const [childKey,child] of Object.entries(value)) visit(child,childKey);
  };
  visit(receipt);
  unique(digests,label + ' cache-entry digests');
  unique(paths,label + ' cache-entry paths');
  check(digests.length <= 1 && paths.length <= 1, label + ' receipt contains ambiguous cache identities');
  return {sha256_or_absent:digests[0] || 'absent',path_or_absent:paths[0] || 'absent'};
}
function exactArray(actual, expected, label) {
  check(Array.isArray(actual), label + ' must be an array');
  check(actual.length === expected.length, label + ' length ' + actual.length + ' != ' + expected.length);
  for (let index = 0; index < expected.length; index += 1) {
    check(actual[index] === expected[index], label + '[' + index + '] drift');
  }
}
function unique(values, label) {
  check(new Set(values).size === values.length, label + ' contains duplicates');
}
function exactSet(actual, expected, label) {
  unique(actual, label);
  exactArray([...actual].sort(), [...expected].sort(), label);
}
function parseArgs(argv) {
  const valued = new Set([
    '--root', '--constants', '--schema', '--queue', '--plan', '--course-plan', '--readme', '--state',
    '--records', '--coverage', '--requirements', '--coverage-validator', '--resource-contract', '--resource-validator',
    '--expected-constants-sha256', '--expected-schema-sha256', '--expected-queue-sha256',
    '--expected-records-sha256', '--expected-plan-sha256'
  ]);
  const boolean = new Set(['--initial-publication']);
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const name = argv[index];
    check(valued.has(name) || boolean.has(name), 'unknown or positional argument ' + JSON.stringify(name));
    check(!Object.hasOwn(result, name), 'duplicate flag ' + name);
    if (boolean.has(name)) {
      result[name] = true;
      continue;
    }
    const value = argv[index + 1];
    check(value && !value.startsWith('--'), name + ' requires one value');
    result[name] = value;
    index += 1;
  }
  return result;
}
function resolveInside(root, input, label) {
  check(typeof input === 'string' && input.length > 0 && !input.includes('\0'), label + ' path invalid');
  const path = resolve(root, input);
  const rel = relative(root, path);
  check(rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel), label + ' escapes root');
  const stat = lstatSync(path);
  check(stat.isFile() && !stat.isSymbolicLink(), label + ' must be a regular nonsymlink file');
  const real = realpathSync(path);
  const realRel = relative(realpathSync(root), real);
  check(realRel !== '..' && !realRel.startsWith('..' + sep) && !isAbsolute(realRel), label + ' resolves outside root');
  return path;
}
function readBounded(root, input, label, limit) {
  const path = resolveInside(root, input, label);
  const bytes = readFileSync(path);
  check(bytes.length <= limit, label + ' exceeds ' + limit + ' bytes');
  check(!(bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf), label + ' starts with UTF-8 BOM');
  const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  return { path, bytes, text, hash: sha256(bytes) };
}

function parseJsonExact(text, label) {
  let cursor = 0;
  function whitespace() {
    while (cursor < text.length && '\t\n\r '.includes(text[cursor])) cursor += 1;
  }
  function stringToken() {
    check(text[cursor] === '"', label + ': expected string at ' + cursor);
    const start = cursor;
    cursor += 1;
    while (cursor < text.length) {
      const code = text.charCodeAt(cursor);
      if (code === 0x22) {
        cursor += 1;
        return JSON.parse(text.slice(start, cursor));
      }
      if (code === 0x5c) {
        cursor += 1;
        check(cursor < text.length, label + ': truncated escape');
        if (text[cursor] === 'u') {
          check(new RegExp('^[0-9a-fA-F]{4}$').test(text.slice(cursor + 1, cursor + 5)), label + ': invalid Unicode escape');
          cursor += 5;
        } else {
          check('"\\/bfnrt'.includes(text[cursor]), label + ': invalid escape');
          cursor += 1;
        }
      } else {
        check(code >= 0x20, label + ': raw control in string');
        cursor += 1;
      }
    }
    fail(label + ': unterminated string');
  }
  function value() {
    whitespace();
    if (text[cursor] === '{') {
      cursor += 1;
      whitespace();
      const keys = new Set();
      if (text[cursor] === '}') {
        cursor += 1;
        return;
      }
      for (;;) {
        const key = stringToken();
        check(!keys.has(key), label + ': duplicate key ' + JSON.stringify(key));
        keys.add(key);
        whitespace();
        check(text[cursor] === ':', label + ': expected colon');
        cursor += 1;
        value();
        whitespace();
        if (text[cursor] === '}') {
          cursor += 1;
          return;
        }
        check(text[cursor] === ',', label + ': expected comma');
        cursor += 1;
        whitespace();
      }
    }
    if (text[cursor] === '[') {
      cursor += 1;
      whitespace();
      if (text[cursor] === ']') {
        cursor += 1;
        return;
      }
      for (;;) {
        value();
        whitespace();
        if (text[cursor] === ']') {
          cursor += 1;
          return;
        }
        check(text[cursor] === ',', label + ': expected array comma');
        cursor += 1;
      }
    }
    if (text[cursor] === '"') {
      stringToken();
      return;
    }
    const start = cursor;
    while (cursor < text.length && !'\t\n\r ,}]'.includes(text[cursor])) cursor += 1;
    check(cursor > start, label + ': missing value');
  }
  value();
  whitespace();
  check(cursor === text.length, label + ': trailing bytes');
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(label + ': invalid JSON: ' + error.message);
  }
}
function parseFrontmatter(markdown, label) {
  check(markdown.startsWith('---\n'), label + ': missing opening JSON frontmatter delimiter');
  const end = markdown.indexOf('\n---\n', 4);
  check(end >= 0 && end <= 2097152, label + ': missing or oversized frontmatter');
  return { data: parseJsonExact(markdown.slice(4, end), label + ' frontmatter'), body: markdown.slice(end + 5) };
}
function safeOutput(input, label) {
  check(typeof input === 'string' && input.length > 0, label + ' empty');
  check(!isAbsolute(input) && !input.includes('\\') && !input.includes('*') && !input.includes('?') && !input.includes('$'), label + ' unsafe');
  const normalized = input.endsWith('/') ? input.slice(0, -1) : input;
  const pieces = normalized.split('/');
  check(pieces.every((piece) => piece && piece !== '.' && piece !== '..'), label + ' unsafe segment');
  return normalized;
}
function deepEqual(actual, expected, label) {
  const canonical = (value) => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map((key) => [key,canonical(value[key])])) : value;
  check(JSON.stringify(canonical(actual)) === JSON.stringify(canonical(expected)), label + ' drift');
}
function assertEmbeddedConstants(constants, label) {
  if (EMBEDDED_CONSTANTS !== null) deepEqual(constants, EMBEDDED_CONSTANTS, label + ' immutable embedded constants');
  if (PUBLISHED_CONSTANTS_SHA256 !== null) check(sha256(publishedJsonBytes(constants)) === PUBLISHED_CONSTANTS_SHA256, label + ' immutable constants canonical-byte SHA-256 drift');
}
function assertEmbeddedQueue(queue, label) {
  if (EMBEDDED_QUEUE !== null) deepEqual(queue, EMBEDDED_QUEUE, label + ' immutable embedded implementation queue');
  if (PUBLISHED_QUEUE_SHA256 !== null) check(sha256(publishedJsonBytes(queue)) === PUBLISHED_QUEUE_SHA256, label + ' immutable queue canonical-byte SHA-256 drift');
}
function assertPublishedDesignBundle(label) {
  check(
    EMBEDDED_CONSTANTS !== null && EMBEDDED_SCHEMA !== null && EMBEDDED_QUEUE !== null &&
    EMBEDDED_CHAPTER_RECORDS !== null && EMBEDDED_PLAN_DATA !== null && EMBEDDED_PLAN_BODY !== null &&
    [PUBLISHED_CONSTANTS_SHA256,PUBLISHED_SCHEMA_SHA256,PUBLISHED_QUEUE_SHA256,PUBLISHED_CHAPTER_RECORDS_SHA256,PUBLISHED_EXTENSION_PLAN_SHA256].every((value) => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value)),
    label + ' is available only from the composed authoritative checker; the run-only template exports are nonauthoritative'
  );
  check(sha256(publishedJsonBytes(EMBEDDED_CONSTANTS)) === PUBLISHED_CONSTANTS_SHA256, label + ' embedded constants identity drift');
  check(sha256(publishedJsonBytes(EMBEDDED_SCHEMA)) === PUBLISHED_SCHEMA_SHA256, label + ' embedded schema identity drift');
  check(sha256(publishedJsonBytes(EMBEDDED_QUEUE)) === PUBLISHED_QUEUE_SHA256, label + ' embedded queue identity drift');
  check(sha256(publishedJsonBytes(EMBEDDED_CHAPTER_RECORDS)) === PUBLISHED_CHAPTER_RECORDS_SHA256, label + ' embedded chapter-record identity drift');
  const planBytes = Buffer.from('---\n' + JSON.stringify(EMBEDDED_PLAN_DATA, null, 2) + '\n---\n' + EMBEDDED_PLAN_BODY, 'utf8');
  check(sha256(planBytes) === PUBLISHED_EXTENSION_PLAN_SHA256, label + ' embedded plan identity drift');
  deepEqual(EMBEDDED_PLAN_DATA.design_input_identities, {
    constants_sha256:PUBLISHED_CONSTANTS_SHA256,
    schema_sha256:PUBLISHED_SCHEMA_SHA256,
    queue_sha256:PUBLISHED_QUEUE_SHA256,
    chapter_records_sha256:PUBLISHED_CHAPTER_RECORDS_SHA256,
    chapter_projection_sha256:sha256(publishedJsonBytes(EMBEDDED_PLAN_DATA.chapters))
  }, label + ' embedded design-input identity closure');
}
function publishedJsonBytes(value) {
  return Buffer.from(JSON.stringify(value, null, 2) + '\n', 'utf8');
}
function canonicalJson(value) {
  const canonical = (node) => Array.isArray(node) ? node.map(canonical) : node && typeof node === 'object' ? Object.fromEntries(Object.keys(node).sort((a,b) => Buffer.from(a).compare(Buffer.from(b))).map((key) => [key,canonical(node[key])])) : node;
  return JSON.stringify(canonical(value)) + '\n';
}
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function readExecutionCompatibility(root) {
  const file = readBounded(root, EXECUTION_COMPATIBILITY_PATH, 'execution compatibility', 65536);
  check(file.hash === EXECUTION_COMPATIBILITY_SHA256, 'execution compatibility exact-byte drift');
  const contract = parseJsonExact(file.text, 'execution compatibility');
  check(contract.schema_version === 1 && contract.compatibility_id === 'functional-ch40-execution-compatibility-v5', 'execution compatibility identity drift');
  const upstream = readBounded(root, contract.upstream_compatibility.path, 'upstream execution compatibility', 65536);
  check(upstream.hash === contract.upstream_compatibility.sha256 && upstream.hash === 'e2e1c1c821361bd4bb6e73775e2dc726333268dd348dd5ff595af69117aa732f', 'upstream execution compatibility exact-byte drift');
  check(contract.approved_policy_binding.plan_sha256 === PUBLISHED_EXTENSION_PLAN_SHA256, 'execution compatibility published plan drift');
  exactArray(contract.released_steps, [EMBEDDED_QUEUE.steps[0].id,contract.replacement_setup.step_spec.id,...EMBEDDED_QUEUE.steps.slice(1,5).map((step) => step.id)], 'execution compatibility exact released prefix');
  check(contract.release_terminal_step === 'implement-ch40-reference-core-handoff', 'execution compatibility release boundary drift');
  const original = Object.fromEntries(['id','objective','depends_on','inputs','outputs','acceptance','validate','cost'].map((field) => [field, EMBEDDED_QUEUE.steps[0][field]]));
  check(sha256(Buffer.from(JSON.stringify(original))) === contract.setup_amendment.original_step_spec_sha256, 'hashing amendment original foundation binding drift');
  check(contract.setup_amendment.step_spec.id === original.id, 'hashing amendment foundation identity drift');
  check(contract.replacement_setup.step_spec.id === 'establish-ch40-course-toolchain-v2' && contract.replacement_setup.replaces.length === 1 && contract.replacement_setup.replaces[0] === original.id, 'Chapter 40 environment replacement identity/replacement drift');
  deepEqual(contract.replacement_setup.successor_dependency_overrides, [{step_id:'establish-functional-firefox-execution-boundary',from:original.id,to:contract.replacement_setup.step_spec.id}], 'Chapter 40 setup successor dependency override');
  deepEqual(contract.replacement_setup.successor_input_overrides, [{step_id:'establish-functional-firefox-execution-boundary',index:0,from:original.id + ' receipt',to:'completed ' + contract.replacement_setup.step_spec.id + ' checkpoint'}], 'Chapter 40 setup successor input override');
  deepEqual(contract.replacement_setup.checker_output_handoff, {path:'scripts/check-functional-laptop-llm-plan.mjs',from_step:'design-functional-laptop-llm-curriculum-extension',to_step:'establish-ch40-course-toolchain-v2'}, 'Chapter 40 checker output handoff');
  const firefox = EMBEDDED_QUEUE.steps.find((step) => step.id === 'establish-functional-firefox-execution-boundary');
  const firefoxFields = ['id','objective','depends_on','inputs','outputs','acceptance','validate','cost'];
  const originalFirefoxSpec = Object.fromEntries(firefoxFields.map((field) => [field,firefox[field]]));
  const firefoxAmendment = contract.firefox_setup_amendment;
  check(firefoxAmendment.step_id === firefox.id && firefoxAmendment.runner_identity === 'ordinary-course-workflow-no-firefox-target-registry-or-custom-receipt', 'Firefox ordinary-workflow amendment identity drift');
  check(firefoxAmendment.original_step_spec_sha256 === sha256(Buffer.from(JSON.stringify(originalFirefoxSpec))), 'Firefox amendment original frozen-step binding drift');
  deepEqual(firefoxAmendment.preserved_preflight_runs, [
    {run_id:'20261004T193953Z-establish-functional-firefox-execution-boundary-01',status:'interrupted',run_projection_sha256:'1f19c187000f4e7d8a1147cf15d3d75304017135b3f584ef76733e2a764ace66'}
  ], 'Firefox replacement preserved preflight history');
  deepEqual(firefoxAmendment.output_handoffs, [
    {path:'Dockerfile',from_step:'establish-ch40-course-toolchain-v2',to_step:firefox.id,requires_incoming_inventory:'artifacts/functional-laptop/step-output-inventories/establish-ch40-course-toolchain-v2.json'},
    {path:'scripts/check-functional-laptop-llm-plan.mjs',from_step:'establish-ch40-course-toolchain-v2',to_step:firefox.id,requires_incoming_inventory:'artifacts/functional-laptop/step-output-inventories/establish-ch40-course-toolchain-v2.json'},
    {path:'scripts/tests/check-functional-execution-compatibility.test.mjs',from_step:'establish-ch40-course-toolchain-v2',to_step:firefox.id,requires_incoming_inventory:'artifacts/functional-laptop/step-output-inventories/establish-ch40-course-toolchain-v2.json'}
  ], 'Firefox setup exact predecessor output handoffs');
  for (const handoff of firefoxAmendment.output_handoffs) deepEqual(contract.setup_amendment.output_transitions[handoff.path], {from_step:handoff.from_step,to_step:handoff.to_step,requires_incoming_inventory:handoff.requires_incoming_inventory}, 'Firefox setup output transition ' + handoff.path);
  deepEqual(contract.replacement_setup.preserved_preflight_runs, [
    {run_id:'20261004T171721Z-establish-ch40-course-toolchain-v2-01',status:'interrupted',run_projection_sha256:'1ac907ed10b34e0d8503564d5d1aecdb90d6770bcf3be3d1725f84e1e65c4831'},
    {run_id:'20261004T180106Z-establish-ch40-course-toolchain-v2-02',status:'interrupted',run_projection_sha256:'7fc330e7881237587020071eb6c4f3e6c4a5b75216b19ecf20ce791024932bc6'},
    {run_id:'20261004T182451Z-establish-ch40-course-toolchain-v2-03',status:'interrupted',run_projection_sha256:'2f0d11013e12123537e4f9251ec27eb3e66c54c7346fa80bb55c416f86a28e4c'},
    {run_id:'20261004T184000Z-establish-ch40-course-toolchain-v2-04',status:'interrupted',run_projection_sha256:'fecbb57a07cb4520f36f1f681de3238e10c6aa22ebadb6a42d86902b21f23a4c'}
  ], 'Chapter 40 replacement preserved preflight history');
  deepEqual(contract.replacement_setup.chapter40_history_policy_override, {
    step_id:'implement-ch40-reference-core-handoff',
    remove_inputs:['artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json'],
    remove_outputs:['artifacts/functional-laptop/chapters/40-reference-core-handoff/history-source-evidence-receipt.json'],
    remove_acceptance:["Resolve exactly the chapter's frozen earlier/later accepted source IDs through the closed N1 evidence runner; bind revision/final URL/response and extraction hashes, claim locator and review receipts without search, crawl, third source or fallback citation.","The canonical history receipt embeds the complete bounded transport and extraction subrecord for each exact historical source, binds artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json, and remains auditable on a fresh clone without any .build cache body."],
    append_acceptance:'Use accurate historical claims supported by ordinary primary-source citations; retain the repository\'s copyright and quotation limits without requiring a custom source-acquisition or history-toolchain receipt.',
    remove_validate:['scripts/run-functional-history-source-evidence.sh --step implement-ch40-reference-core-handoff --chapter 40-reference-core-handoff --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json','scripts/run-functional-offline.sh --step implement-ch40-reference-core-handoff --target implement-ch40-reference-core-handoff-v1'],
    prepend_validate:'./course run cargo test --locked -p llm-from-scratch --test ch40_reference_core_handoff'
  }, 'Chapter 40 retired history-toolchain gates');
  return contract;
}
function effectiveExecutionConstants(constants, contract) {
  assertEmbeddedConstants(constants, 'effective execution constants');
  const result = structuredClone(constants);
  const registry = result.execution_boundary_records.offline_workspace.target_registry;
  registry.push(structuredClone(contract.setup_amendment.additional_target_record));
  const owned = contract.bootstrap_owned_runtime_selector;
  check(owned.step_id === contract.setup_amendment.step_spec.id && owned.target_id === 'history-source-extractors-v1', 'bootstrap output selector exact owner/target drift');
  check(owned.output_selector_field === 'owner_produced_runtime_image_selector', 'bootstrap output selector field drift');
  const target = registry.find((entry) => entry.step_id === owned.step_id && entry.target_id === owned.target_id);
  check(target, 'bootstrap output selector target missing');
  deepEqual(target.runtime_image_selector, owned.expected_input_selector, 'bootstrap original runtime selector');
  check(contract.setup_amendment.step_spec.outputs.includes(target.runtime_image_selector.receipt), 'bootstrap runtime selector is not an owner-produced output');
  target.owner_produced_runtime_image_selector = {...target.runtime_image_selector, requirement:owned.requirement};
  delete target.runtime_image_selector;
  return result;
}
function validateExecutionCompatibilityState(document, contract) {
  const immutableFields = ['id','objective','depends_on','inputs','outputs','acceptance','validate','cost'];
  const spec = (step) => Object.fromEntries(immutableFields.map((field) => [field,step[field]]));
  const functionalIndex = document.builds.findIndex((build) => build.build_id === EMBEDDED_CONSTANTS.state_lifecycle_contract.functional_build_id);
  check(functionalIndex >= 0, 'execution compatibility functional build missing');
  const later = document.builds.slice(functionalIndex + 1);
  exactArray(later.map((build) => build.build_id), [...contract.intervening_builds.map((build) => build.build_id),contract.compatibility_build.build_id,...contract.post_compatibility_builds.map((build) => build.build_id)], 'execution compatibility intervening build inventory');
  for (let index = 0; index < contract.intervening_builds.length; index += 1) {
    check(later[index].status === contract.intervening_builds[index].status && later[index].status === 'completed' && sha256(Buffer.from(JSON.stringify(later[index]))) === contract.intervening_builds[index].projection_sha256, 'execution compatibility intervening build drift ' + later[index].build_id);
  }
  const compatibilityBuild = later[contract.intervening_builds.length];
  for (let index = 0; index < contract.post_compatibility_builds.length; index += 1) {
    const expected = contract.post_compatibility_builds[index];
    const observed = later[contract.intervening_builds.length + 1 + index];
    check(observed.status === expected.status && sha256(Buffer.from(JSON.stringify(observed))) === expected.projection_sha256, 'execution compatibility post-snapshot build drift ' + observed.build_id);
    if (observed.status === 'active') check(observed.build_id === 'route-concurrent-luna-machinery-maintenance-20261004', 'only the recorded machinery maintenance build may remain active in the post-compatibility snapshot');
  }
  const buildSpec = {
    build_id:compatibilityBuild.build_id,objective:compatibilityBuild.objective,
    budget:Object.fromEntries(Object.entries(compatibilityBuild.budget).filter(([field]) => field !== 'spent')),
    completion_criteria:compatibilityBuild.completion_criteria,steps:compatibilityBuild.steps.map(spec)
  };
  check(sha256(Buffer.from(JSON.stringify(buildSpec))) === contract.compatibility_build.spec_sha256, 'execution compatibility build specification drift');
  const compatibilityStep = compatibilityBuild.steps[0];
  check(compatibilityStep.id === contract.compatibility_build.step_id, 'execution compatibility step identity drift');
  const ready = compatibilityBuild.status === 'completed' && compatibilityStep.status === 'completed' && compatibilityStep.runs.at(-1)?.status === 'succeeded';
  const preparing = compatibilityBuild.status === 'active' && compatibilityStep.status === 'running' && compatibilityStep.runs.at(-1)?.status === 'running';
  check(ready || preparing, 'execution compatibility must be preparing or completed');
  const functional = document.builds[functionalIndex];
  const maintenance = functional.steps.find((step) => step.id === contract.held_maintenance.step_id);
  check(maintenance && maintenance.status === 'pending' && maintenance.runs.length === 0 && sha256(Buffer.from(JSON.stringify(spec(maintenance)))) === contract.held_maintenance.immutable_spec_sha256, 'execution compatibility repairs must remain held and unchanged');
  for (const step of functional.steps.slice(4)) {
    if (!contract.released_steps.includes(step.id) || preparing) check(step.status === 'pending' && step.runs.length === 0, 'execution compatibility unreleased step advanced ' + step.id);
  }
  return {ready,preparing,compatibilityBuild,compatibilityStep};
}
function buildBootstrapInputFingerprint(root, requestedStepId = null) {
  const contract = readExecutionCompatibility(root);
  const constants = effectiveExecutionConstants(EMBEDDED_CONSTANTS, contract);
  const document = parseStateYaml(readFileSync(resolve(root, 'BUILD_STATE.yaml'), 'utf8'), root);
  const functional = document.builds.find((build) => build.build_id === constants.state_lifecycle_contract.functional_build_id);
  const byId = new Map(functional.steps.map((step) => [step.id,step]));
  const stepId = requestedStepId ?? contract.setup_amendment.step_spec.id;
  const expectedStepSpec = stepId === contract.setup_amendment.step_spec.id
    ? contract.setup_amendment.step_spec
    : stepId === contract.replacement_setup.step_spec.id
      ? contract.replacement_setup.step_spec
      : stepId === contract.firefox_setup_amendment.step_id
        ? contract.firefox_setup_amendment.step_spec
      : fail('fingerprint builder step is not a fixed bootstrap owner');
  const step = byId.get(stepId);
  const fields = ['id','objective','depends_on','inputs','outputs','acceptance','validate','cost'];
  const spec = Object.fromEntries(fields.map((field) => [field,step[field]]));
  deepEqual(spec, expectedStepSpec, 'bootstrap fingerprint exact step specification');
  const fpContract = constants.state_lifecycle_contract.successor_run_fingerprint_contract;
  const historical = (path) => {
    const visited = new Set();
    const search = (id) => {
      if (visited.has(id)) return null;
      visited.add(id);
      const prior = byId.get(id);
      const found = prior?.runs.at(-1)?.artifacts.find((artifact) => artifact.path === path);
      if (found) return found.sha256;
      for (const parent of prior?.depends_on || []) { const result = search(parent); if (result) return result; }
      return null;
    };
    for (const parent of step.depends_on) { const result = search(parent); if (result) return result; }
    return fpContract.baseline_lock_hashes[path];
  };
  const fileInventory = (path) => {
    const inventory = pathInventory(root, path, 'bootstrap fingerprint');
    return {path,kind:inventory.files.length === 1 && inventory.files[0].path === path ? 'regular-file' : 'directory-tree',files:inventory.files,inventory_sha256:inventory.inventory_sha256};
  };
  const declared = repoPathTokens(step.inputs).map((path) => {
    if (path === 'BUILD_STATE.yaml') return {path,kind:'mutable-build-ledger',contract_sha256:sha256(Buffer.from(canonicalJson(constants.state_lifecycle_contract)))};
    if (path === 'DECISIONS.md') return {path,kind:'append-only-decision-ledger',prefix_bytes:constants.state_lifecycle_contract.decisions_prefix.bytes,prefix_sha256:constants.state_lifecycle_contract.decisions_prefix.sha256};
    const hash = historical(path);
    return hash ? {path,kind:'dependency-artifact',sha256:hash} : fileInventory(path);
  });
  const dependencies = step.depends_on.map((id) => {
    const prior = byId.get(id), run = prior?.runs.at(-1);
    check(prior?.status === 'completed' && run?.status === 'succeeded', 'bootstrap dependency not completed ' + id);
    return {id,status:prior.status,artifacts:run.artifacts.map(({path,sha256}) => ({path,sha256})).sort((a,b) => Buffer.from(a.path).compare(Buffer.from(b.path)))};
  });
  const targets = step.id === contract.firefox_setup_amendment.step_id ? [] : ['offline_workspace','firefox','artifact_cache','gpu','validation_oracles','postgresql']
    .flatMap((name) => constants.execution_boundary_records[name]?.target_registry || [])
    .filter((target) => target.step_id === step.id)
    .sort((a,b) => Buffer.from((a.target_id || '') + '\0' + (a.phase || '')).compare(Buffer.from((b.target_id || '') + '\0' + (b.phase || ''))));
  check(inputReceiptPaths(targets).length === 0, 'cold bootstrap unexpectedly requires an external input receipt');
  const commands = closedCommandRepoPaths(step.validate, targets).map((path) => {
    const hash = historical(path);
    if (hash) return {path,kind:'dependency-artifact',sha256:hash};
    if (step.outputs.some((output) => path === output.replace(/\/$/,'') || (output.endsWith('/') && path.startsWith(output)))) return {path,kind:'current-step-output',preflight_identity:'not-an-input; final bytes are bound by the succeeded-run artifact and canonical output inventory'};
    return fileInventory(path);
  });
  const incomingTransitions = Object.values(contract.setup_amendment.output_transitions).filter((transition) => transition.to_step === step.id && typeof transition.requires_incoming_inventory === 'string');
  const incomingInventories = Object.fromEntries([...new Set(incomingTransitions.map((transition) => transition.requires_incoming_inventory))].sort().map((path) => [path,hashRegularFile(resolveInside(root,path,'bootstrap incoming output inventory')).sha256]));
  const commit = execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
  return {
    source_commit_sha1:commit,
    source_tree_sha1:execFileSync('git',['-C',root,'rev-parse',commit + '^{tree}'],{encoding:'utf8'}).trim(),
    plan_sha256:PUBLISHED_EXTENSION_PLAN_SHA256,
    checker_sha256:sha256(readFileSync(fileURLToPath(import.meta.url))),
    step_spec_sha256:sha256(Buffer.from(JSON.stringify(spec))),
    input_hashes:{declared_inputs_sha256:sha256(Buffer.from(JSON.stringify(step.inputs))),declared_input_path_inventory:declared,dependency_artifact_inventory_sha256:sha256(Buffer.from(canonicalJson(dependencies))),transition_incoming_inventories:incomingInventories},
    lock_hashes:{cargo_lock_sha256:historical('Cargo.lock'),site_package_lock_sha256:historical('site/package-lock.json'),workspace_image_lock_sha256_or_absent:'absent'},
    runner_identity:{target_registry_sha256:sha256(Buffer.from(canonicalJson(targets))),runtime_selector_receipt_sha256_or_absent:'absent',closed_command_path_inventory:commands},
    cache_receipts:[]
  };
}
function parseStateYaml(state, root) {
  let parse;
  try {
    const requireFromSite = createRequire(resolve(root, 'site/package.json'));
    ({ parse } = requireFromSite('yaml'));
  } catch (error) {
    fail('pinned site YAML parser unavailable: ' + error.message);
  }
  let document;
  try {
    document = parse(state, { maxAliasCount: 0, prettyErrors: true, strict: true, uniqueKeys: true });
  } catch (error) {
    fail('BUILD_STATE YAML parse failed: ' + error.message);
  }
  check(isRecord(document) && Array.isArray(document.builds), 'BUILD_STATE root/builds shape invalid');
  return document;
}
function validateRunHistory(step, label, globalRunIds = null, strictFingerprint = false, expectedStep = null, planHash = null, checkerHash = null, root = null, transitionContext = null) {
  check(Array.isArray(step.runs), label + '.runs must be an array');
  unique(step.runs.map((run) => {
    check(isRecord(run), label + ' run must be a mapping');
    const required = ['run_id','started_at','status','input_fingerprint','staging_dir','commands','artifacts','validation','notes'];
    for (const field of required) check(Object.hasOwn(run, field), label + ' run missing ' + field);
    check(typeof run.run_id === 'string' && run.run_id.length > 0, label + ' run_id missing');
    if (globalRunIds) {
      check(!globalRunIds.has(run.run_id), label + ' duplicates global run_id ' + run.run_id);
      globalRunIds.add(run.run_id);
    }
    check(typeof run.started_at === 'string' && run.started_at.length > 0, label + ' started_at missing');
    check(['running','succeeded','failed','interrupted'].includes(run.status), label + ' run status invalid');
    const preservedRuns = expectedStep?.id === 'establish-ch40-course-toolchain-v2'
      ? transitionContext?.compatibility?.replacement_setup.preserved_preflight_runs
      : expectedStep?.id === 'establish-functional-firefox-execution-boundary'
        ? transitionContext?.compatibility?.firefox_setup_amendment?.preserved_preflight_runs
        : [];
    const preservedPreflight = strictFingerprint ? preservedRuns?.find((entry) => entry.run_id === run.run_id) : null;
    if (preservedPreflight) {
      check(run.status === preservedPreflight.status && sha256(Buffer.from(canonicalJson(run))) === preservedPreflight.run_projection_sha256, label + ' preserved replacement preflight projection drift');
    }
    const strictRunFingerprint = strictFingerprint && !preservedPreflight;
    if (strictRunFingerprint) check(isRecord(run.input_fingerprint) && Object.keys(run.input_fingerprint).length > 0, label + ' input_fingerprint must be a nonempty mapping');
    else check((isRecord(run.input_fingerprint) && Object.keys(run.input_fingerprint).length > 0) || (typeof run.input_fingerprint === 'string' && run.input_fingerprint.length > 0), label + ' legacy input_fingerprint must be nonempty');
    check(typeof run.staging_dir === 'string' && run.staging_dir.length > 0, label + ' staging_dir missing');
    check(Array.isArray(run.commands) && Array.isArray(run.artifacts) && Array.isArray(run.validation), label + ' commands/artifacts/validation must be arrays');
    check(typeof run.notes === 'string' && run.notes.length > 0, label + ' notes missing');
    if (run.status === 'running') check(!Object.hasOwn(run, 'finished_at') || run.finished_at === null, label + ' running run has finished_at');
    else check(typeof run.finished_at === 'string' && run.finished_at.length > 0, label + ' stopped run lacks finished_at');
    if (strictRunFingerprint) {
      const utcTimestamp = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\dZ$/;
      const runId = /^(\d{8}T\d{6}Z)-[a-z0-9](?:[a-z0-9-]*[a-z0-9])?-(?:0[1-9]|[1-9]\d+)$/;
      const identity = run.run_id.match(runId);
      check(identity, label + ' run_id must be UTC timestamp, stable lowercase slug, and positive two-digit attempt');
      check(utcTimestamp.test(run.started_at) && !Number.isNaN(Date.parse(run.started_at)), label + ' started_at must be an exact UTC second timestamp');
      const startedIdentity = run.started_at.replaceAll('-', '').replaceAll(':', '');
      check(identity[1] === startedIdentity, label + ' run_id timestamp must equal started_at');
      if (run.status !== 'running') {
        check(utcTimestamp.test(run.finished_at) && !Number.isNaN(Date.parse(run.finished_at)), label + ' finished_at must be an exact UTC second timestamp');
        check(Date.parse(run.finished_at) >= Date.parse(run.started_at), label + ' finished_at precedes started_at');
      }
      check(run.staging_dir === '.build/runs/' + run.run_id + '/', label + ' staging_dir must be the run-bound normalized directory');
      check(run.commands.every((command) => typeof command === 'string' && command.trim()), label + ' commands must contain only nonblank strings');
      const fingerprint = run.input_fingerprint;
      const fingerprintFields = ['source_commit_sha1','source_tree_sha1','plan_sha256','checker_sha256','step_spec_sha256','input_hashes','lock_hashes','runner_identity','cache_receipts'];
      exactSet(Object.keys(fingerprint),fingerprintFields,label + ' input_fingerprint fields');
      check(typeof fingerprint.source_commit_sha1 === 'string' && /^[0-9a-f]{40}$/.test(fingerprint.source_commit_sha1), label + ' source commit SHA-1 fingerprint invalid');
      check(root, label + ' strict fingerprint requires repository root');
      try {
        execFileSync('git',['-C',root,'cat-file','-e',fingerprint.source_commit_sha1 + '^{commit}'],{stdio:'ignore'});
        execFileSync('git',['-C',root,'merge-base','--is-ancestor',fingerprint.source_commit_sha1,'HEAD'],{stdio:'ignore'});
      } catch {
        fail(label + ' source commit fingerprint does not resolve to an immutable ancestor commit object');
      }
      check(typeof fingerprint.source_tree_sha1 === 'string' && /^[0-9a-f]{40}$/.test(fingerprint.source_tree_sha1), label + ' source tree SHA-1 fingerprint invalid');
      const resolvedSourceTree = execFileSync('git',['-C',root,'rev-parse',fingerprint.source_commit_sha1 + '^{tree}'],{encoding:'utf8'}).trim();
      check(fingerprint.source_tree_sha1 === resolvedSourceTree, label + ' source tree SHA-1 does not match the exact source commit tree');
      check(typeof fingerprint.plan_sha256 === 'string' && /^[0-9a-f]{64}$/.test(fingerprint.plan_sha256), label + ' plan fingerprint invalid');
      check(typeof fingerprint.checker_sha256 === 'string' && /^[0-9a-f]{64}$/.test(fingerprint.checker_sha256), label + ' checker fingerprint invalid');
      check(typeof fingerprint.step_spec_sha256 === 'string' && /^[0-9a-f]{64}$/.test(fingerprint.step_spec_sha256), label + ' step-spec fingerprint invalid');
      check(isRecord(fingerprint.input_hashes), label + ' input hashes must be a mapping');
      check(isRecord(fingerprint.lock_hashes), label + ' lock hashes must be a mapping');
      check(isRecord(fingerprint.runner_identity), label + ' runner identity must be a mapping');
      check(Array.isArray(fingerprint.cache_receipts), label + ' cache receipts must be an array');
      if (planHash) check(fingerprint.plan_sha256 === planHash, label + ' run plan hash drift');
      if (checkerHash && fingerprint.checker_sha256 !== checkerHash) {
        const ownsCheckerOutput = expectedStep?.outputs.includes('scripts/check-functional-laptop-llm-plan.mjs') === true;
        check(ownsCheckerOutput, label + ' run checker hash drift outside the step-owned checker output');
      }
      if (checkerHash && run.status === 'succeeded' && expectedStep?.outputs.includes('scripts/check-functional-laptop-llm-plan.mjs')) {
        const checkerArtifact = run.artifacts.find((artifact) => artifact.path === 'scripts/check-functional-laptop-llm-plan.mjs');
        const checkerHandoff = transitionContext?.compatibility?.firefox_setup_amendment?.output_handoffs?.find((handoff) =>
          handoff.path === 'scripts/check-functional-laptop-llm-plan.mjs' && handoff.from_step === expectedStep.id &&
          handoff.to_step === transitionContext.compatibility.firefox_setup_amendment.step_id &&
          handoff.requires_incoming_inventory === 'artifacts/functional-laptop/step-output-inventories/establish-ch40-course-toolchain-v2.json');
        check(checkerArtifact && (checkerArtifact.sha256 === checkerHash || checkerHandoff), label + ' succeeded owner run lacks the final checker SHA-256 or exact successor handoff');
      }
      if (expectedStep) {
        const immutable = Object.fromEntries(['id','objective','depends_on','inputs','outputs','acceptance','validate','cost'].map((field) => [field, expectedStep[field]]));
      check(fingerprint.step_spec_sha256 === sha256(Buffer.from(JSON.stringify(immutable))), label + ' run ' + run.run_id + ' step-spec hash drift');
        const fpContract = transitionContext?.constants?.state_lifecycle_contract?.successor_run_fingerprint_contract;
        check(fpContract, label + ' exact successor-run fingerprint contract unavailable');
        check(fpContract.source_commit_field === 'source_commit_sha1', label + ' source commit fingerprint contract drift');
        check(fpContract.source_tree_field === 'source_tree_sha1', label + ' source tree fingerprint contract drift');
        const historicDependencyHash = (path) => {
          const visited = new Set();
          const search = (id) => {
            if (visited.has(id)) return null;
            visited.add(id);
            const dependencyStep = transitionContext.byId.get(id);
            if (!dependencyStep) return null;
            const artifact = dependencyStep.runs.at(-1)?.artifacts?.find((entry) => entry.path === path);
            if (artifact) return artifact.sha256;
            for (const parent of dependencyStep.depends_on || []) { const found = search(parent); if (found) return found; }
            return null;
          };
          for (const dependency of expectedStep.depends_on) { const found = search(dependency); if (found) return found; }
          return fpContract.baseline_lock_hashes[path];
        };
        exactSet(Object.keys(fingerprint.input_hashes),fpContract.input_hash_keys,label + ' input_hashes keys');
        check(fingerprint.input_hashes.declared_inputs_sha256 === sha256(Buffer.from(JSON.stringify(expectedStep.inputs))), label + ' declared input-list fingerprint drift');
        const declaredInputPaths = repoPathTokens(expectedStep.inputs);
        const declaredInputInventory = declaredInputPaths.map((path) => {
          if (path === 'BUILD_STATE.yaml') return {path,kind:'mutable-build-ledger',contract_sha256:sha256(Buffer.from(canonicalJson(transitionContext.constants.state_lifecycle_contract)))};
          if (path === 'DECISIONS.md') return {path,kind:'append-only-decision-ledger',prefix_bytes:transitionContext.constants.state_lifecycle_contract.decisions_prefix.bytes,prefix_sha256:transitionContext.constants.state_lifecycle_contract.decisions_prefix.sha256};
          const historic = historicDependencyHash(path);
          if (historic) return {path,kind:'dependency-artifact',sha256:historic};
          const inventory = pathInventory(root,path,label + ' declared input');
          return {path,kind:inventory.files.length === 1 && inventory.files[0].path === path ? 'regular-file' : 'directory-tree',files:inventory.files,inventory_sha256:inventory.inventory_sha256};
        });
        deepEqual(fingerprint.input_hashes.declared_input_path_inventory,declaredInputInventory,label + ' declared input byte/tree inventory');
        const dependencyInventory = expectedStep.depends_on.map((dependency) => {
          const dependencyStep = transitionContext.byId.get(dependency);
          check(dependencyStep, label + ' fingerprint unknown dependency ' + dependency);
          const dependencyRun = dependencyStep.runs.at(-1);
          const artifacts = dependencyRun?.status === 'succeeded' ? dependencyRun.artifacts.map((artifact) => ({path:artifact.path,sha256:artifact.sha256})).sort((a,b) => Buffer.from(a.path).compare(Buffer.from(b.path))) : [];
          return {id:dependency,status:dependencyStep.status,artifacts};
        });
        check(fingerprint.input_hashes.dependency_artifact_inventory_sha256 === sha256(Buffer.from(canonicalJson(dependencyInventory))), label + ' dependency artifact inventory fingerprint drift');
        const incomingTransitions = Object.values(transitionContext.conditional || {}).filter((transition) => transition.to_step === expectedStep.id && typeof transition.requires_incoming_inventory === 'string');
        const expectedIncomingInventoryPaths = [...new Set(incomingTransitions.map((transition) => transition.requires_incoming_inventory))].sort();
        check(isRecord(fingerprint.input_hashes.transition_incoming_inventories), label + ' transition incoming inventories must be a mapping');
        exactSet(Object.keys(fingerprint.input_hashes.transition_incoming_inventories),expectedIncomingInventoryPaths,label + ' transition incoming-inventory keys');
        for (const path of expectedIncomingInventoryPaths) check(fingerprint.input_hashes.transition_incoming_inventories[path] === hashRegularFile(resolveInside(root,path,label + ' transition incoming inventory')).sha256, label + ' transition incoming-inventory byte hash drift ' + path);
        exactSet(Object.keys(fingerprint.lock_hashes),fpContract.lock_hash_keys,label + ' lock_hashes keys');
        check(fingerprint.lock_hashes.cargo_lock_sha256 === historicDependencyHash('Cargo.lock') && fingerprint.lock_hashes.site_package_lock_sha256 === historicDependencyHash('site/package-lock.json'), label + ' predecessor lock fingerprint drift');
        const registries = ['offline_workspace','firefox','artifact_cache','gpu','validation_oracles','postgresql'].flatMap((name) => transitionContext.constants.execution_boundary_records[name]?.target_registry || []);
        const targetRecords = expectedStep.id === transitionContext.compatibility.firefox_setup_amendment.step_id ? [] : registries.filter((record) => record.step_id === expectedStep.id).sort((a,b) => Buffer.from((a.target_id || '') + '\0' + (a.phase || '')).compare(Buffer.from((b.target_id || '') + '\0' + (b.phase || ''))));
        exactSet(Object.keys(fingerprint.runner_identity),fpContract.runner_identity_keys,label + ' runner_identity keys');
        check(fingerprint.runner_identity.target_registry_sha256 === sha256(Buffer.from(canonicalJson(targetRecords))), label + ' closed target-registry fingerprint drift');
        const selectorPaths = [...new Set(targetRecords.flatMap((record) => [record.runtime_image_selector?.receipt,record.runtime_selector?.receipt,record.runtime_receipt].filter((value) => typeof value === 'string')))].sort();
        const selectorInventory = selectorPaths.map((path) => ({path,sha256:hashRegularFile(resolveInside(root,path,label + ' runtime selector')).sha256}));
        const selectorHash = selectorInventory.length === 0 ? 'absent' : sha256(Buffer.from(canonicalJson(selectorInventory)));
        check(fingerprint.runner_identity.runtime_selector_receipt_sha256_or_absent === selectorHash && fingerprint.lock_hashes.workspace_image_lock_sha256_or_absent === selectorHash, label + ' runtime selector/image-lock fingerprint drift');
        const runnerPaths = closedCommandRepoPaths(expectedStep.validate,targetRecords);
        const runnerInventory = runnerPaths.map((path) => {
          const historic = historicDependencyHash(path);
          if (historic) return {path,kind:'dependency-artifact',sha256:historic};
          const ownedNow = expectedStep.outputs.some((output) => path === output.replace(/\/$/,'') || (output.endsWith('/') && path.startsWith(output)));
          if (ownedNow) return {path,kind:'current-step-output',preflight_identity:'not-an-input; final bytes are bound by the succeeded-run artifact and canonical output inventory'};
          const inventory = pathInventory(root,path,label + ' closed command path');
          return {path,kind:inventory.files.length === 1 && inventory.files[0].path === path ? 'regular-file' : 'directory-tree',files:inventory.files,inventory_sha256:inventory.inventory_sha256};
        });
        deepEqual(fingerprint.runner_identity.closed_command_path_inventory,runnerInventory,label + ' complete closed-command path inventory');
        const expectedReceiptPaths = inputReceiptPaths(targetRecords);
        const cacheRequiredPaths = new Set(inputCacheReceiptPaths(targetRecords));
        exactArray(fingerprint.cache_receipts.map((receipt) => receipt.path),expectedReceiptPaths,label + ' exact target-derived input/cache receipt path coverage');
        unique(fingerprint.cache_receipts.map((receipt) => receipt.path),label + ' cache receipt paths');
        for (const receipt of fingerprint.cache_receipts) {
          exactSet(Object.keys(receipt),fpContract.cache_receipt_keys,label + ' cache receipt fields');
          check(safeOutput(receipt.path,label + ' cache receipt path') === receipt.path && /^[0-9a-f]{64}$/.test(receipt.sha256), label + ' cache receipt identity invalid');
          const receiptFile = readBounded(root,receipt.path,label + ' cache receipt',16777216);
          check(receiptFile.hash === receipt.sha256, label + ' cache receipt byte hash drift ' + receipt.path);
          const receiptJson = parseJsonExact(receiptFile.text,label + ' cache receipt ' + receipt.path);
          const cacheIdentity = findReceiptCacheIdentity(receiptJson,label + ' cache receipt ' + receipt.path);
          check(receipt.cache_entry_sha256_or_absent === cacheIdentity.sha256_or_absent && receipt.cache_entry_path_or_absent === cacheIdentity.path_or_absent, label + ' cache-entry identity drift ' + receipt.path);
          if (cacheRequiredPaths.has(receipt.path)) check(cacheIdentity.sha256_or_absent !== 'absent' && cacheIdentity.path_or_absent !== 'absent', label + ' mounted cache receipt lacks exact cache-entry digest/path ' + receipt.path);
        }
      }
      for (const artifact of run.artifacts) {
        check(isRecord(artifact) && typeof artifact.path === 'string' && artifact.path.trim(), label + ' artifact must have a nonblank path');
        check(safeOutput(artifact.path, label + ' artifact.path') === artifact.path.replace(/\/$/, ''), label + ' artifact path must be normalized');
        check(typeof artifact.sha256 === 'string' && /^[0-9a-f]{64}$/.test(artifact.sha256), label + ' artifact must have a lowercase SHA-256');
      }
      for (const result of run.validation) {
        check(isRecord(result) && typeof result.command === 'string' && result.command.trim(), label + ' validation record must have a nonblank command');
        check(['passed','failed','skipped'].includes(result.status), label + ' validation status invalid');
        check(typeof result.notes === 'string' && result.notes.trim(), label + ' validation notes missing');
      }
    }
    return run.run_id;
  }), label + ' run IDs');
  const last = step.runs.at(-1);
  const runningRuns = step.runs.filter((run) => run.status === 'running');
  if (step.status === 'running') {
    check(runningRuns.length === 1 && last === runningRuns[0], label + ' running lifecycle requires exactly one final running attempt');
  } else {
    check(runningRuns.length === 0, label + ' non-running lifecycle retains a running attempt');
  }
  if (strictFingerprint) {
    if (step.status === 'completed') {
      check(last?.status === 'succeeded', label + ' completed step must end in succeeded run');
      check(last.commands.length > 0, label + ' completed step must record executed commands');
      check(last.artifacts.length > 0, label + ' completed step must record canonical artifacts');
      exactArray(last.validation.map((entry) => entry.command), expectedStep.validate, label + ' completed validation command coverage');
      check(last.validation.every((entry) => entry.status === 'passed'), label + ' completed step must pass every declared validation');
      const owned = expectedStep.outputs.filter((path) => !['BUILD_STATE.yaml','DECISIONS.md'].includes(path));
      check(root, label + ' completed artifact verification requires repository root');
      unique(last.artifacts.map((artifact) => artifact.path), label + ' completed run artifact paths');
      const canonicalArtifacts = last.artifacts.filter((artifact) => !artifact.path.startsWith(last.staging_dir));
      const stagingArtifacts = last.artifacts.filter((artifact) => artifact.path.startsWith(last.staging_dir));
      check(stagingArtifacts.every((artifact) => artifact.path.startsWith('.build/runs/' + last.run_id + '/')), label + ' run-only artifact escapes its exact staging directory');
      const ownedBy = (path) => owned.some((output) => {
        const normalized = output.replace(/\/$/, '');
        return path === normalized || (output.endsWith('/') && path.startsWith(normalized + '/'));
      });
      check(canonicalArtifacts.every((artifact) => ownedBy(artifact.path)), label + ' completed run records an unowned canonical artifact');
      const artifactByPath = new Map(canonicalArtifacts.map((artifact) => [artifact.path,artifact]));
      const transitionedBindingFor = (path, oldSha256) => {
      const transition = transitionContext?.conditional?.[path];
      if (!transition || transition.from_step !== expectedStep.id) return false;
      const successor = transitionContext.byId.get(transition.to_step);
      const successorRun = successor?.runs?.at(-1);
      const handoffInProgress = successor?.status === 'running' && successorRun?.status === 'running';
      if (successor?.status !== 'completed' && !handoffInProgress) return false;
      if (!handoffInProgress) check(successorRun?.status === 'succeeded', label + ' transitioned successor lacks a succeeded run for ' + path);
      const receiptPath = transition.requires_incoming_inventory;
      check(typeof receiptPath === 'string' && receiptPath.length > 0, label + ' transitioned output lacks an incoming-inventory contract for ' + path);
      const receiptFile = readBounded(root,receiptPath,label + ' transitioned incoming inventory ' + path,16777216);
      if (handoffInProgress) check(successorRun.input_fingerprint?.input_hashes?.transition_incoming_inventories?.[receiptPath] === receiptFile.hash, label + ' running successor does not bind the exact predecessor inventory for ' + path);
      const receiptArtifact = successorRun.artifacts.find((artifact) => artifact.path === receiptPath);
        const fingerprintHash = successorRun.input_fingerprint?.input_hashes?.transition_incoming_inventories?.[receiptPath];
        check((receiptArtifact && receiptArtifact.sha256 === receiptFile.hash) || fingerprintHash === receiptFile.hash, label + ' transitioned successor does not hash-bind the incoming inventory ' + receiptPath);
        const receipt = parseJsonExact(receiptFile.text,label + ' transitioned incoming inventory ' + path);
        const files = Array.isArray(receipt.files) ? receipt.files : Array.isArray(receipt.canonical_outputs) ? receipt.canonical_outputs : [];
        const structured = files.some((entry) => isRecord(entry) && entry.path === path && entry.sha256 === oldSha256) || receipt.incoming_path_hashes?.[path] === oldSha256 || receipt.path_hashes?.[path] === oldSha256;
        check(structured, label + ' transitioned incoming inventory does not bind the exact predecessor bytes for ' + path);
        return true;
      };
      const inventoryPath = `artifacts/functional-laptop/step-output-inventories/${expectedStep.id}.json`;
      check(owned.includes(inventoryPath) && artifactByPath.has(inventoryPath), label + ' completed step lacks its canonical output inventory artifact');
      const directOutputs = owned.filter((path) => !path.endsWith('/'));
      for (const path of directOutputs) check(artifactByPath.has(path), label + ' completed step omits declared canonical file output ' + path);
      for (const artifact of canonicalArtifacts) {
        const absolute = resolve(root, artifact.path);
        check(existsSync(absolute), label + ' completed artifact missing on disk ' + artifact.path);
        const stat = lstatSync(absolute);
        check(stat.isFile() && !stat.isSymbolicLink(), label + ' completed artifact must be a regular non-symlink file ' + artifact.path);
        if (!transitionedBindingFor(artifact.path,artifact.sha256)) check(hashRegularFile(absolute).sha256 === artifact.sha256, label + ' completed artifact byte hash drift ' + artifact.path);
      }
      const inventoryFile = readBounded(root,inventoryPath,label + ' canonical output inventory',16777216);
      const inventory = parseJsonExact(inventoryFile.text,label + ' canonical output inventory');
      check(inventoryFile.text === canonicalJson(inventory), label + ' canonical output inventory is not canonical JSON');
      exactSet(Object.keys(inventory), ['schema_version','step_id','declared_outputs_sha256','files','inventory_root_sha256'], label + ' canonical output inventory fields');
      check(inventory.schema_version === 1 && inventory.step_id === expectedStep.id && inventory.declared_outputs_sha256 === sha256(Buffer.from(JSON.stringify(expectedStep.outputs))), label + ' canonical output inventory identity/declared-output binding drift');
      check(Array.isArray(inventory.files), label + ' canonical output inventory files missing');
      unique(inventory.files.map((entry) => entry.path), label + ' canonical output inventory paths');
      exactArray(inventory.files.map((entry) => entry.path), [...inventory.files.map((entry) => entry.path)].sort((a,b) => Buffer.from(a).compare(Buffer.from(b))), label + ' canonical output inventory UTF-8 path order');
      const actualPaths = new Set(directOutputs.filter((path) => path !== inventoryPath));
      function inventoryDirectory(relativeRoot) {
        const absoluteRoot = resolve(root,relativeRoot);
        check(existsSync(absoluteRoot) && lstatSync(absoluteRoot).isDirectory() && !lstatSync(absoluteRoot).isSymbolicLink(), label + ' declared output directory missing/nonregular ' + relativeRoot);
        const walk = (absoluteDirectory,relativeDirectory) => {
          for (const entry of readdirSync(absoluteDirectory,{withFileTypes:true})) {
            const absolute = resolve(absoluteDirectory,entry.name);
            const relativePath = relativeDirectory + '/' + entry.name;
            check(!entry.isSymbolicLink(), label + ' output inventory traverses symlink ' + relativePath);
            if (entry.isDirectory()) walk(absolute,relativePath);
            else { check(entry.isFile(), label + ' output inventory contains nonregular entry ' + relativePath); actualPaths.add(relativePath); }
          }
        };
        walk(absoluteRoot,relativeRoot.replace(/\/$/,''));
      }
      for (const path of owned.filter((output) => output.endsWith('/'))) inventoryDirectory(path);
      exactSet(inventory.files.map((entry) => entry.path), [...actualPaths], label + ' canonical output inventory exhaustive coverage');
      const inventoryLines = [];
      for (const entry of inventory.files) {
        exactSet(Object.keys(entry), ['path','bytes','sha256'], label + ' canonical output inventory file fields');
        check(actualPaths.has(entry.path) && Number.isSafeInteger(entry.bytes) && entry.bytes >= 0 && /^[0-9a-f]{64}$/.test(entry.sha256), label + ' canonical output inventory file record invalid ' + entry.path);
        const absolute = resolve(root,entry.path);
        check(existsSync(absolute) && lstatSync(absolute).isFile() && !lstatSync(absolute).isSymbolicLink(), label + ' canonical output inventory path is not a regular file ' + entry.path);
        if (transitionedBindingFor(entry.path,entry.sha256)) check(artifactByPath.get(entry.path)?.sha256 === entry.sha256, label + ' transitioned predecessor run/inventory hash drift ' + entry.path);
        else {
          const observed = hashRegularFile(absolute);
          check(observed.bytes === entry.bytes && observed.sha256 === entry.sha256, label + ' canonical output inventory byte/hash drift ' + entry.path);
        }
        inventoryLines.push(`${entry.path}\t${entry.bytes}\t${entry.sha256}\n`);
      }
      check(inventory.inventory_root_sha256 === sha256(Buffer.from(inventoryLines.join(''))), label + ' canonical output inventory root hash drift');
    }
    if (step.status === 'running') check(last?.status === 'running', label + ' running step must end in running run');
    if (step.status === 'pending' && last) check(['failed','interrupted'].includes(last.status), label + ' pending step history must end failed/interrupted');
    if (step.status === 'blocked') {
      check(last && ['failed','interrupted'].includes(last.status), label + ' blocked step must end in a failed/interrupted attempt');
      check(last.notes.trim().length > 0, label + ' blocked step must preserve a concrete reason');
    }
  }
}
function selectionProtocol(constants) {
  const target = constants.execution_boundary_records.artifact_cache.target_registry.find((record) => record.step_id === 'select-functional-open-model' && record.candidate_admission_protocol);
  check(target, 'open-model selection admission target missing');
  return target.candidate_admission_protocol;
}
function validateSelectionFingerprints(root, step, constants) {
  const protocol = selectionProtocol(constants);
  const expected = {
    seed_registry_sha256:sha256(Buffer.from(JSON.stringify(constants.open_model_candidate_registry.candidates))),
    admission_protocol_sha256:sha256(Buffer.from(JSON.stringify(protocol))),
    query_inventory_sha256:sha256(Buffer.from(JSON.stringify(protocol.discovery_queries))),
    allowlist_sha256:sha256(Buffer.from(JSON.stringify({allowed_hosts:protocol.allowed_hosts,github_source_policy:protocol.github_source_policy}))),
    accepted_resource_contract_sha256:constants.accepted_inputs.resource_contract_sha256
  };
  let priorBlockedExternalInventory = null;
  let priorPreMetadataTechnicalBlock = null;
  let priorFinishedAt = null;
  for (let runIndex = 0; runIndex < step.runs.length; runIndex += 1) {
    const run = step.runs[runIndex];
    check(priorPreMetadataTechnicalBlock === null, 'a pre/mid-fetch technical-resource block without a complete stable external-content inventory permits safe continuation of that exact run only; a later run requires a superseding design or an explicit externally provable resume contract: ' + priorPreMetadataTechnicalBlock);
    const startedAt = Date.parse(run.started_at);
    check(Number.isFinite(startedAt), 'model-selection attempt started_at is invalid ' + run.run_id);
    if (priorFinishedAt !== null) check(priorFinishedAt <= startedAt, 'model-selection attempts overlap or are out of chronological order before ' + run.run_id);
    if (run.status === 'running') check(runIndex === step.runs.length - 1, 'only the final model-selection attempt may be running');
    else {
      const finishedAt = Date.parse(run.finished_at);
      check(Number.isFinite(finishedAt) && finishedAt >= startedAt, 'model-selection stopped attempt finish time invalid ' + run.run_id);
      priorFinishedAt = finishedAt;
    }
    const state = run.input_fingerprint.selection_external_state;
    check(isRecord(state), 'model-selection run fingerprint missing selection_external_state');
    exactSet(Object.keys(state), protocol.run_fingerprint_contract.required_keys, 'model-selection external-state fingerprint keys');
    for (const [field,value] of Object.entries(expected)) check(state[field] === value, 'model-selection fingerprint drift ' + field);
    for (const field of ['stable_external_content_inventory_sha256','raw_response_inventory_merkle_sha256','candidate_discovery_manifest_sha256']) check((['running','failed','interrupted'].includes(run.status) && state[field] === 'pending') || /^[0-9a-f]{64}$/.test(state[field]), 'model-selection fingerprint invalid ' + field);
    check(state.admission_receipt_sha256_or_absent === 'absent' || /^[0-9a-f]{64}$/.test(state.admission_receipt_sha256_or_absent), 'model-selection admission receipt fingerprint invalid');
    const attemptPrefix = `${protocol.attempt_root}/${run.run_id}/`;
    unique(run.artifacts.map((artifact) => artifact.path),'model-selection attempt artifact paths ' + run.run_id);
    const artifactByPath = new Map(run.artifacts.map((artifact) => [artifact.path,artifact]));
    const metadataComplete = ['metadata/candidate-discovery-manifest.json','metadata/metadata-publication-receipt.json'].every((name) => artifactByPath.has(attemptPrefix + name));
    const decisionPath = protocol.selection_decision_contract.path.replace('<run-id>',run.run_id);
    const technicalPath = protocol.technical_resource_block_contract.path.replace('<run-id>',run.run_id);
    const decisionDeclared = artifactByPath.has(decisionPath);
    const technicalDeclared = artifactByPath.has(technicalPath);
    check(!(decisionDeclared && technicalDeclared), 'model-selection attempt declares both semantic and technical terminal dispositions ' + run.run_id);
    if (run.status === 'running') check(!decisionDeclared && !technicalDeclared, 'running model-selection attempt declares terminal evidence ' + run.run_id);
    else check(decisionDeclared || technicalDeclared, 'every stopped model-selection attempt must declare one durable semantic or technical terminal receipt ' + run.run_id);
    if (metadataComplete) {
      check(/^[0-9a-f]{64}$/.test(state.stable_external_content_inventory_sha256) && /^[0-9a-f]{64}$/.test(state.raw_response_inventory_merkle_sha256) && /^[0-9a-f]{64}$/.test(state.candidate_discovery_manifest_sha256), 'metadata-complete model-selection attempt lacks exact stable/external inventory/manifest fingerprint');
      if (priorBlockedExternalInventory !== null) check(state.stable_external_content_inventory_sha256 !== priorBlockedExternalInventory, 'metadata-complete model-selection retry after a terminal blocked decision lacks changed stable external content before judgment routing');
    }
    if (decisionDeclared) {
      check(metadataComplete && /^[0-9a-f]{64}$/.test(state.raw_response_inventory_merkle_sha256) && /^[0-9a-f]{64}$/.test(state.candidate_discovery_manifest_sha256), 'terminal semantic model-selection attempt lacks complete external inventory/manifest fingerprint');
      const decisionFile = readBounded(root,decisionPath,'model-selection durable terminal semantic decision',1048576);
      const decision = parseJsonExact(decisionFile.text,'model-selection durable terminal semantic decision');
      check(decisionFile.text === canonicalJson(decision), 'model-selection durable terminal semantic decision is not canonical JSON');
      exactSet(Object.keys(decision),protocol.selection_decision_contract.required_keys,'model-selection durable terminal semantic decision fields');
      check(artifactByPath.get(decisionPath).sha256 === decisionFile.hash && decision.protocol_id === protocol.protocol_id && decision.stable_external_content_inventory_sha256 === state.stable_external_content_inventory_sha256 && decision.raw_response_inventory_merkle_sha256 === state.raw_response_inventory_merkle_sha256 && protocol.selection_decision_contract.dispositions.includes(decision.disposition), 'model-selection stopped semantic decision byte/run/fingerprint/disposition binding drift');
      if (['blocked-no-admissible-candidate','blocked-multiple-admissible-candidates'].includes(decision.disposition)) priorBlockedExternalInventory = state.stable_external_content_inventory_sha256;
      else check(decision.disposition === 'provisionally-selected-for-acquisition' && run.status === 'succeeded' && runIndex === step.runs.length - 1, 'only the final succeeded model-selection attempt may carry a provisional selection decision');
    }
    if (technicalDeclared) {
      const technicalFile = readBounded(root,technicalPath,'model-selection technical retry receipt',1048576);
      const technical = parseJsonExact(technicalFile.text,'model-selection technical retry receipt');
      check(technicalFile.text === canonicalJson(technical), 'model-selection technical retry receipt is not canonical JSON');
      exactSet(Object.keys(technical),protocol.technical_resource_block_contract.required_fields,'model-selection technical retry receipt fields');
      check(technical.disposition === 'technical-resource-blocked' && technical.attempt_run_id === run.run_id && artifactByPath.get(technicalPath).sha256 === technicalFile.hash, 'model-selection technical retry receipt is not bound to the stopped run');
      if (/^[0-9a-f]{64}$/.test(technical.stable_external_content_inventory_sha256_or_absent)) {
        check(metadataComplete && technical.stable_external_content_inventory_sha256_or_absent === state.stable_external_content_inventory_sha256, 'model-selection technical block stable external identity is not the exact complete metadata fingerprint');
        priorBlockedExternalInventory = technical.stable_external_content_inventory_sha256_or_absent;
      } else {
        check(technical.stable_external_content_inventory_sha256_or_absent === 'absent' && !metadataComplete && technical.retry_disposition.includes('same') && technical.retry_disposition.includes('run'), 'pre/mid-fetch technical block without stable external identity lacks exact same-run-only retry disposition');
        if (runIndex + 1 < step.runs.length) priorPreMetadataTechnicalBlock = run.run_id;
      }
    }
  }
}
function validateOpenModelSelectionState(root, constants, step) {
  const protocol = selectionProtocol(constants);
  const contract = protocol.selection_receipt_contract;
  const receiptPath = contract.path;
  const receiptPresent = existsSync(resolve(root, receiptPath));
  const attemptPath = (template, runId) => {
    check(typeof template === 'string' && template.includes('<run-id>') && /^[0-9]{8}T[0-9]{6}Z-[a-z0-9-]+-(?:0[1-9]|[1-9]\d+)$/.test(runId), 'open-model attempt path/run identity invalid');
    const path = template.replace('<run-id>', runId);
    check(!path.includes('<') && path.startsWith(protocol.attempt_root + '/' + runId + '/'), 'open-model attempt path escaped exact immutable run root');
    return path;
  };
  const attemptRootFor = (runId) => `${protocol.attempt_root}/${runId}`;
  const listAttemptTree = (runId) => {
    const relativeRoot = attemptRootFor(runId);
    const absoluteRoot = resolve(root,relativeRoot);
    if (!existsSync(absoluteRoot)) return {exists:false,files:[],directories:[]};
    const rootStat = lstatSync(absoluteRoot);
    check(rootStat.isDirectory() && !rootStat.isSymbolicLink(), 'open-model attempt root must be a regular non-symlink directory');
    const files = [];
    const directories = [];
    const walk = (absoluteDirectory,relativeDirectory) => {
      for (const entry of readdirSync(absoluteDirectory,{withFileTypes:true})) {
        const absolute = resolve(absoluteDirectory,entry.name);
        const relativePath = relativeDirectory + '/' + entry.name;
        check(!entry.isSymbolicLink(), 'open-model attempt tree contains a symlink ' + relativePath);
        if (entry.isDirectory()) { directories.push(relativePath); walk(absolute,relativePath); }
        else { check(entry.isFile(), 'open-model attempt tree contains a nonregular file ' + relativePath); files.push(relativePath); }
      }
    };
    walk(absoluteRoot,relativeRoot);
    files.sort((a,b) => Buffer.from(a).compare(Buffer.from(b)));
    directories.sort((a,b) => Buffer.from(a).compare(Buffer.from(b)));
    for (const path of files) check(!protocol.attempt_evidence_contract.forbidden_suffixes.some((suffix) => path.toLowerCase().endsWith(suffix)), 'open-model attempt tree contains a forbidden payload/archive/executable suffix ' + path);
    return {exists:true,files,directories};
  };
  const inventoryRoot = (paths,label) => {
    const sorted = [...paths].sort((a,b) => Buffer.from(a).compare(Buffer.from(b)));
    unique(sorted,label + ' paths');
    const lines = [];
    for (const path of sorted) {
      const file = readBounded(root,path,label + ' file ' + path,protocol.request_limits.total_expanded_bytes_max);
      lines.push(`${path}\t${file.bytes.length}\t${file.hash}\n`);
    }
    return sha256(Buffer.from(lines.join('')));
  };
  function validateManifest(file, runId, metadataOnly = false) {
    const manifest = parseJsonExact(file.text, 'open-model candidate discovery manifest');
    const manifestContract = protocol.candidate_manifest_contract;
    const rawContract = protocol.raw_response_publication_contract;
    const rawRoot = attemptPath(rawContract.root, runId);
    const manifestPath = attemptPath(protocol.candidate_manifest,runId);
    check(file.path === resolve(root,manifestPath), 'open-model discovery manifest path/run binding drift');
    exactSet(Object.keys(manifest), manifestContract.required_top_level_fields, 'open-model candidate discovery manifest fields');
    check(manifest.schema_version === manifestContract.schema_version && manifest.derivation_version === manifestContract.canonical_derivation_version, 'open-model discovery manifest derivation identity drift');
    check(file.text === canonicalJson(manifest), 'open-model discovery manifest is not canonical deterministic JSON');
    check(manifest.seed_registry_sha256 === sha256(Buffer.from(JSON.stringify(constants.open_model_candidate_registry.candidates))) && manifest.admission_protocol_sha256 === sha256(Buffer.from(JSON.stringify(protocol))) && manifest.accepted_resource_contract_sha256 === constants.accepted_inputs.resource_contract_sha256 && manifest.query_inventory_sha256 === sha256(Buffer.from(JSON.stringify(protocol.discovery_queries))), 'open-model discovery manifest immutable input binding drift');
    check(Array.isArray(manifest.raw_response_receipts) && manifest.raw_response_receipts.length >= protocol.discovery_queries.length && manifest.raw_response_receipts.length <= protocol.request_limits.requests_max, 'open-model discovery manifest raw-response request count invalid');
    unique(manifest.raw_response_receipts.map((record) => record.receipt_sha256), 'open-model per-request transport receipt identities');
    unique(manifest.raw_response_receipts.map((record) => record.transport_receipt_path), 'open-model per-request transport receipt paths');
    const lines = [];
    const stableLines = [];
    const phaseStats = new Map(protocol.fetch_phase_contract.phases.map((phase) => [phase.id,{records:[],downloadBytes:0,expandedBytes:0,started:null,finished:null}]));
    let totalBytes = 0;
    let totalExpandedBytes = 0;
    let earliestStarted = null;
    let latestFinished = null;
    const responseReceiptHashes = new Set();
    const responseByReceipt = new Map();
    const responseByBodyPath = new Map();
    const rawInventoryPaths = new Set();
    const validateEndpoint = (endpoint, label) => {
      exactSet(Object.keys(endpoint), rawContract.endpoint_record_keys, label + ' fields');
      check(endpoint.scheme === 'https' && typeof endpoint.host === 'string' && endpoint.host.length > 0 && typeof endpoint.path === 'string' && endpoint.path.startsWith('/') && !endpoint.path.includes('..') && !endpoint.path.includes('\\'), label + ' scheme/host/path invalid');
      check(Array.isArray(endpoint.query_keys), label + ' query-key inventory missing');
      unique(endpoint.query_keys, label + ' query-key inventory');
      exactArray(endpoint.query_keys,[...endpoint.query_keys].sort((a,b) => Buffer.from(a).compare(Buffer.from(b))),label + ' query-key canonical order');
      check(endpoint.query_keys.every((key) => /^[A-Za-z0-9_.~-]{1,128}$/.test(key)) && endpoint.query_key_inventory_sha256 === sha256(Buffer.from(canonicalJson(endpoint.query_keys))) && endpoint.query_values_redacted === true && endpoint.transport_caps_passed === true, label + ' query redaction/cap evidence invalid');
      return endpoint;
    };
    for (let index = 0; index < manifest.raw_response_receipts.length; index += 1) {
      const record = manifest.raw_response_receipts[index];
      exactSet(Object.keys(record), manifestContract.raw_response_receipt_keys, 'open-model raw response receipt keys');
      check(phaseStats.has(record.fetch_phase_id), 'open-model raw response fetch phase ID invalid');
      check(record.method === 'GET', 'open-model evidence response must come from exact GET');
      check(Array.isArray(record.request_header_inventory), 'open-model request-header inventory missing');
      exactArray(record.request_header_inventory.map((entry) => entry.name),protocol.transport_receipt_contract.request_header_inventory.map((name) => name.toLowerCase()).sort(),'open-model exact normalized request-header names');
      for (const entry of record.request_header_inventory) {
        exactSet(Object.keys(entry),protocol.transport_receipt_contract.request_header_record_keys,'open-model request-header record fields');
        check(/^[a-z][a-z0-9-]*$/.test(entry.name) && /^[0-9a-f]{64}$/.test(entry.value_sha256), 'open-model request-header identity invalid');
      }
      check(record.request_header_inventory_sha256 === sha256(Buffer.from(canonicalJson(record.request_header_inventory))) && record.authorization_absent === true && record.cookie_absent === true, 'open-model request headers/auth disposition drift');
      check(protocol.transport_receipt_contract.response_encoding.includes(record.content_encoding), 'open-model response content encoding outside exact policy');
      check(/^selection-[a-z0-9-]+$/.test(record.retry_operation) && /^[0-9a-f]{64}$/.test(record.retry_attempt_receipt_sha256), 'open-model exact retry attempt evidence invalid');
      check(['discovery','candidate-metadata','candidate-source'].includes(record.request_role), 'open-model raw response role invalid');
      check(Number.isSafeInteger(record.page) && record.page >= 1 && record.page <= protocol.request_limits.pages_per_query_max, 'open-model raw response page invalid');
      if (index < protocol.discovery_queries.length) check(record.request_role === 'discovery' && record.query_id === 'discovery-' + (index + 1) && record.page === 1 && record.request_url === protocol.discovery_queries[index], 'open-model discovery query identity/order drift');
      else {
        check(record.request_role !== 'discovery', 'open-model extra/unordered discovery request');
        check(record.query_id === 'request-' + sha256(Buffer.from(record.request_url)).slice(0,16), 'open-model candidate request query ID is not deterministically derived from its exact URL');
        const hfImmutable = /^https:\/\/huggingface\.co\/(?:api\/models\/)?[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/(?:revision|resolve)\/[0-9a-f]{40}(?:\?blobs=true|\/[A-Za-z0-9_.\/-]+)?$/.test(record.request_url);
        const githubImmutable = /^https:\/\/(?:api\.github\.com\/repos\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/git\/(?:commits\/[0-9a-f]{40}|trees\/[0-9a-f]{40}\?recursive=1)|raw\.githubusercontent\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/[0-9a-f]{40}\/[A-Za-z0-9_.\/-]+)$/.test(record.request_url);
        check((record.request_role === 'candidate-metadata' && hfImmutable) || (record.request_role === 'candidate-source' && githubImmutable), 'open-model candidate evidence URL is not immutable/derived by the closed protocol');
        if (record.request_role === 'candidate-metadata') {
          check(!protocol.hf_metadata_redirect_policy.forbidden_path_suffixes.some((suffix) => new URL(record.request_url).pathname.endsWith(suffix)), 'open-model candidate metadata request attempts a forbidden weight payload');
          if (!protocol.static_seed_endpoints.includes(record.request_url)) {
            const match = record.request_url.match(/^https:\/\/huggingface\.co\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\/(?:resolve\/([0-9a-f]{40})\/([A-Za-z0-9_.\/-]+)|api\/models\/never)$/);
            const apiMatch = record.request_url.match(/^https:\/\/huggingface\.co\/api\/models\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\/revision\/([0-9a-f]{40})\?blobs=true$/);
            check(apiMatch || match, 'open-model candidate metadata request is outside exact immutable API/resolve grammar');
            if (match) check(protocol.hf_metadata_file_allowlist.includes(match[3]) && !match[3].includes('..') && !match[3].startsWith('/'), 'open-model candidate metadata path is outside the exact file allowlist');
          }
        }
      }
      const requestPath = new URL(record.request_url).pathname;
      const metadataLeaf = requestPath.split('/').at(-1);
      const expectedFetchPhase = record.request_role === 'discovery' ? 'discovery-api-config'
        : record.request_role === 'candidate-source' ? 'semantic-primary-evidence'
        : requestPath.includes('/api/models/') || ['config.json','generation_config.json'].includes(metadataLeaf) ? 'discovery-api-config'
        : ['tokenizer.json','tokenizer_config.json','special_tokens_map.json'].includes(metadataLeaf) ? 'tokenizer-machine'
        : 'semantic-primary-evidence';
      check(record.fetch_phase_id === expectedFetchPhase, 'open-model raw response assigned to the wrong deterministic fetch phase');
      const phase = record.request_role === 'discovery' ? protocol.network_phase_contract.discovery
        : record.request_role === 'candidate-source' ? protocol.network_phase_contract.candidate_github
        : protocol.static_seed_endpoints.includes(record.request_url) ? protocol.network_phase_contract.seed_registry
        : protocol.network_phase_contract.candidate_huggingface;
      const requestHosts = phase.request_hosts || phase.hosts;
      const redirectHosts = phase.redirect_hosts || phase.hosts;
      const resolvedHosts = [...new Set([...requestHosts,...redirectHosts])];
      const resolvedEndpoint = validateEndpoint(record.resolved_endpoint,'open-model resolved endpoint');
      check(requestHosts.includes(new URL(record.request_url).hostname) && resolvedHosts.includes(resolvedEndpoint.host), 'open-model request/resolved host outside exact phase allowlist');
      check(Array.isArray(record.redirect_inventory) && record.redirect_inventory.length <= protocol.request_limits.redirects_per_request_max, 'open-model redirect inventory outside exact cap');
      for (const [redirectIndex,endpoint] of record.redirect_inventory.entries()) check(resolvedHosts.includes(validateEndpoint(endpoint,`open-model redirect endpoint ${redirectIndex}`).host), 'open-model redirect endpoint host outside exact phase allowlist');
      check(Number.isSafeInteger(record.status) && record.status >= 200 && record.status < 300 && Number.isSafeInteger(record.bytes) && record.bytes >= 0 && record.bytes <= protocol.request_limits.response_bytes_max, 'open-model raw response final status/encoded bytes invalid');
      check(phase.media_types.includes(record.media_type), 'open-model raw response media type outside exact phase allowlist');
      check(Number.isSafeInteger(record.expanded_bytes) && record.expanded_bytes >= 0 && record.expanded_bytes <= protocol.request_limits.total_expanded_bytes_max, 'open-model raw response expanded bytes invalid');
      check(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(record.started_at) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(record.finished_at), 'open-model raw response timestamps are not exact UTC milliseconds');
      const startedMs = Date.parse(record.started_at);
      const finishedMs = Date.parse(record.finished_at);
      check(Number.isSafeInteger(record.wall_milliseconds) && record.wall_milliseconds >= 0 && finishedMs - startedMs === record.wall_milliseconds && record.wall_milliseconds <= protocol.request_limits.wall_seconds_max * 1000, 'open-model raw response wall counter/timestamps invalid');
      for (const field of ['sha256','response_header_sha256','receipt_sha256']) check(/^[0-9a-f]{64}$/.test(record[field]), 'open-model raw response invalid ' + field);
      check(record.body_path === `${rawRoot}/${record.sha256}.body` && record.transport_receipt_path === `${rawRoot}/${record.receipt_sha256}.transport.json`, 'open-model raw response canonical body/transport path drift');
      const bodyFile = readBounded(root, record.body_path, 'open-model raw response body', protocol.request_limits.total_expanded_bytes_max);
      check(bodyFile.bytes.length === record.expanded_bytes && bodyFile.hash === record.sha256, 'open-model raw response expanded-body byte identity drift');
      const transportFile = readBounded(root, record.transport_receipt_path, 'open-model raw response transport receipt', 262144);
      check(transportFile.hash === record.receipt_sha256, 'open-model raw response transport receipt hash drift');
      const transport = parseJsonExact(transportFile.text, 'open-model raw response transport receipt');
      check(transportFile.text === canonicalJson(transport), 'open-model raw response transport receipt is not canonical JSON');
      exactSet(Object.keys(transport), rawContract.transport_receipt_keys, 'open-model transport receipt fields');
      deepEqual(transport, {
        schema_version:rawContract.transport_receipt_schema_version,
        fetch_phase_id:record.fetch_phase_id,
        request_role:record.request_role,
        query_id:record.query_id,
        page:record.page,
        method:record.method,
        request_url:record.request_url,
        request_header_inventory:record.request_header_inventory,
        request_header_inventory_sha256:record.request_header_inventory_sha256,
        authorization_absent:record.authorization_absent,
        cookie_absent:record.cookie_absent,
        resolved_endpoint:record.resolved_endpoint,
        status:record.status,
        media_type:record.media_type,
        content_encoding:record.content_encoding,
        bytes:record.bytes,
        expanded_bytes:record.expanded_bytes,
        started_at:record.started_at,
        finished_at:record.finished_at,
        wall_milliseconds:record.wall_milliseconds,
        retry_operation:record.retry_operation,
        retry_attempt_receipt_sha256:record.retry_attempt_receipt_sha256,
        body_path:record.body_path,
        body_sha256:record.sha256,
        response_header_sha256:record.response_header_sha256,
        redirect_inventory:record.redirect_inventory
      }, 'open-model raw response transport/body binding');
      responseReceiptHashes.add(record.receipt_sha256);
      rawInventoryPaths.add(record.body_path);
      rawInventoryPaths.add(record.transport_receipt_path);
      responseByReceipt.set(record.receipt_sha256, {record,bodyFile,transportFile,transport});
      responseByBodyPath.set(record.body_path, {record,bodyFile,transportFile,transport});
      totalBytes += record.bytes;
      totalExpandedBytes += record.expanded_bytes;
      earliestStarted = earliestStarted === null || startedMs < earliestStarted ? startedMs : earliestStarted;
      latestFinished = latestFinished === null || finishedMs > latestFinished ? finishedMs : latestFinished;
      lines.push([record.fetch_phase_id,record.request_role,record.query_id,record.page,record.request_url,canonicalJson(record.resolved_endpoint).trimEnd(),record.status,record.media_type,record.bytes,record.expanded_bytes,record.started_at,record.finished_at,record.wall_milliseconds,record.sha256,record.response_header_sha256,record.receipt_sha256,canonicalJson(record.redirect_inventory).trimEnd()].join('\t') + '\n');
      stableLines.push([record.fetch_phase_id,record.request_role,record.query_id,record.page,record.request_url,`${record.resolved_endpoint.scheme}://${record.resolved_endpoint.host}${record.resolved_endpoint.path}`,record.status,record.media_type,record.expanded_bytes,record.sha256].join('\t') + '\n');
      const phaseStat = phaseStats.get(record.fetch_phase_id);
      phaseStat.records.push(record);
      phaseStat.downloadBytes += record.bytes;
      phaseStat.expandedBytes += record.expanded_bytes;
      phaseStat.started = phaseStat.started === null || startedMs < phaseStat.started ? startedMs : phaseStat.started;
      phaseStat.finished = phaseStat.finished === null || finishedMs > phaseStat.finished ? finishedMs : phaseStat.finished;
    }
    const tree = listAttemptTree(runId);
    check(tree.exists, 'open-model published metadata attempt root missing');
    const metadataRoot = dirname(rawRoot);
    check(tree.directories.includes(metadataRoot) && tree.directories.includes(rawRoot) && !tree.directories.some((path) => path.startsWith(metadataRoot + '/') && path !== rawRoot), 'open-model attempt metadata directory inventory');
    exactSet(tree.files.filter((path) => path.startsWith(rawRoot + '/')), [...rawInventoryPaths], 'open-model raw-response exact referenced file inventory');
    for (const source of responseByReceipt.values()) {
      if (source.record.request_role !== 'candidate-source' || !source.record.request_url.startsWith('https://raw.githubusercontent.com/')) continue;
      const match = source.record.request_url.match(/^https:\/\/raw\.githubusercontent\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/([0-9a-f]{40})\/([A-Za-z0-9_.\/-]+)$/);
      check(match, 'open-model GitHub raw source URL grammar drift');
      const [,owner,repository,commit,path] = match;
      check(!path.includes('..') && !path.startsWith('/') && !/\.(?:zip|tar|gz|tgz|whl|so|dll|dylib|exe|bin)$/i.test(path), 'open-model GitHub raw source path is unsafe/executable');
      const commitUrl = `https://api.github.com/repos/${owner}/${repository}/git/commits/${commit}`;
      const commitSource = [...responseByReceipt.values()].find((entry) => entry.record.request_role === 'candidate-source' && entry.record.request_url === commitUrl);
      check(commitSource, 'open-model GitHub raw source lacks its immutable commit receipt');
      const commitRecord = parseJsonExact(commitSource.bodyFile.text, 'open-model GitHub commit response');
      check(commitRecord.sha === commit && isRecord(commitRecord.tree) && /^[0-9a-f]{40}$/.test(commitRecord.tree.sha), 'open-model GitHub commit response identity/tree SHA drift');
      const treeUrl = `https://api.github.com/repos/${owner}/${repository}/git/trees/${commitRecord.tree.sha}?recursive=1`;
      const treeSource = [...responseByReceipt.values()].find((entry) => entry.record.request_role === 'candidate-source' && entry.record.request_url === treeUrl);
      check(treeSource, 'open-model GitHub raw source lacks its immutable recursive-tree receipt');
      const treeRecord = parseJsonExact(treeSource.bodyFile.text, 'open-model GitHub tree response');
      check(treeRecord.sha === commitRecord.tree.sha && treeRecord.truncated === false && Array.isArray(treeRecord.tree), 'open-model GitHub tree response identity/truncation drift');
      unique(treeRecord.tree.map((entry) => entry.path),'open-model GitHub tree paths');
      const treeEntry = treeRecord.tree.find((entry) => entry.path === path);
      check(treeEntry && treeEntry.type === 'blob' && ['100644','100755'].includes(treeEntry.mode) && /^[0-9a-f]{40}$/.test(treeEntry.sha), 'open-model GitHub source path is absent or not an admitted regular blob');
      const gitBlobSha1 = createHash('sha1').update(Buffer.from(`blob ${source.bodyFile.bytes.length}\0`)).update(source.bodyFile.bytes).digest('hex');
      check(gitBlobSha1 === treeEntry.sha, 'open-model GitHub raw body bytes do not match the immutable Git tree blob identity');
    }
    check(totalBytes <= protocol.request_limits.total_download_bytes_max && totalExpandedBytes <= protocol.request_limits.total_expanded_bytes_max, 'open-model raw response encoded/expanded aggregate byte cap exceeded');
    check(manifest.raw_response_inventory_merkle_sha256 === sha256(Buffer.from(lines.join(''))), 'open-model raw-response inventory root is not recomputed from exact receipts');
    const stableExternalContentInventorySha256 = sha256(Buffer.from(stableLines.join('')));
    check(manifest.stable_external_content_inventory_sha256 === stableExternalContentInventorySha256, 'open-model stable external-content inventory root drift');
    check(manifest.technical_resource_block_or_absent === 'absent', 'a complete metadata manifest cannot contain or masquerade as a technical-resource block');
    check(Array.isArray(manifest.fetch_phase_records), 'open-model fetch phase records missing');
    exactArray(manifest.fetch_phase_records.map((record) => record.phase_id),protocol.fetch_phase_contract.phases.map((phase) => phase.id),'open-model fetch phase record order');
    const candidateIdentity = (candidate,label) => { exactSet(Object.keys(candidate),protocol.fetch_phase_contract.identity_keys,label + ' fields'); check(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(candidate.candidate_id) && /^[0-9a-f]{40}$/.test(candidate.immutable_revision),label + ' invalid'); return candidate.candidate_id + '\0' + candidate.immutable_revision; };
    let priorSurvivors = null;
    let priorPhaseFinished = null;
    const phaseRequestCounts = {};
    const phaseByteCounts = {};
    for (let index = 0; index < protocol.fetch_phase_contract.phases.length; index += 1) {
      const phaseContract = protocol.fetch_phase_contract.phases[index];
      const phaseRecord = manifest.fetch_phase_records[index];
      const stats = phaseStats.get(phaseContract.id);
      exactSet(Object.keys(phaseRecord),protocol.fetch_phase_contract.record_keys,'open-model fetch phase record fields');
      check(Array.isArray(phaseRecord.candidate_input_identities) && Array.isArray(phaseRecord.candidate_survivor_identities), 'open-model fetch phase candidate inventories missing');
      const inputKeys = phaseRecord.candidate_input_identities.map((candidate) => candidateIdentity(candidate,'open-model fetch phase input identity'));
      const survivorKeys = phaseRecord.candidate_survivor_identities.map((candidate) => candidateIdentity(candidate,'open-model fetch phase survivor identity'));
      unique(inputKeys,'open-model fetch phase input identities');
      unique(survivorKeys,'open-model fetch phase survivor identities');
      exactArray(inputKeys,[...inputKeys].sort((a,b) => Buffer.from(a).compare(Buffer.from(b))),'open-model fetch phase input UTF-8 order');
      exactArray(survivorKeys,[...survivorKeys].sort((a,b) => Buffer.from(a).compare(Buffer.from(b))),'open-model fetch phase survivor UTF-8 order');
      check(inputKeys.length <= phaseContract.candidate_input_max && survivorKeys.length <= (index + 1 < protocol.fetch_phase_contract.phases.length ? protocol.fetch_phase_contract.phases[index + 1].candidate_input_max : phaseContract.candidate_input_max) && survivorKeys.every((key) => inputKeys.includes(key)), 'open-model fetch phase survivor/input cap or subset drift');
      if (priorSurvivors !== null) exactArray(inputKeys,priorSurvivors,'open-model fetch phase input is not the exact prior-phase survivor inventory');
      priorSurvivors = survivorKeys;
      check(phaseRecord.request_count === stats.records.length && phaseRecord.request_count <= phaseContract.requests_max && phaseRecord.download_bytes === stats.downloadBytes && phaseRecord.download_bytes <= phaseContract.download_bytes_max && phaseRecord.expanded_bytes === stats.expandedBytes, 'open-model fetch phase request/byte counters or caps drift');
      check(stats.records.length > 0 && Date.parse(phaseRecord.started_at) === stats.started && Date.parse(phaseRecord.finished_at) === stats.finished && phaseRecord.wall_milliseconds === stats.finished - stats.started && Number.isSafeInteger(phaseRecord.wall_milliseconds) && phaseRecord.wall_milliseconds >= 0, 'open-model fetch phase timing inventory drift');
      if (priorPhaseFinished !== null) check(priorPhaseFinished <= stats.started, 'open-model fetch phases overlap or execute before the prior survivor gate closes');
      priorPhaseFinished = stats.finished;
      check(phaseRecord.exhaustive_complete === true && phaseRecord.failure_or_absent === 'absent', 'open-model complete manifest contains a truncated/failed fetch phase');
      phaseRequestCounts[phaseContract.id] = phaseRecord.request_count;
      phaseByteCounts[phaseContract.id] = {download_bytes:phaseRecord.download_bytes,expanded_bytes:phaseRecord.expanded_bytes};
    }
    const publicationFile = readBounded(root, attemptPath(rawContract.publication_receipt,runId), 'open-model metadata publication receipt', 262144);
    const publication = parseJsonExact(publicationFile.text, 'open-model metadata publication receipt');
    check(publicationFile.text === canonicalJson(publication), 'open-model metadata publication receipt is not canonical JSON');
    exactSet(Object.keys(publication), rawContract.publication_receipt_fields, 'open-model metadata publication receipt fields');
    check(publication.schema_version === 1 && publication.protocol_id === protocol.protocol_id && /^[0-9a-f]{64}$/.test(publication.cache_entry_sha256) && publication.cache_entry_path === `.build/artifact-cache/functional-v1/sha256/${publication.cache_entry_sha256}/payload` && /^[0-9a-f]{64}$/.test(publication.canonical_inventory_sha256), 'open-model metadata publication identity/hash/cache-path fields invalid');
    const uniqueBodyCount = new Set(manifest.raw_response_receipts.map((record) => record.body_path)).size;
    check(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(publication.started_at) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(publication.finished_at), 'open-model metadata publication timestamps invalid');
    check(Date.parse(publication.started_at) === earliestStarted && Date.parse(publication.finished_at) === latestFinished && Number.isSafeInteger(publication.wall_milliseconds) && publication.wall_milliseconds === latestFinished - earliestStarted && publication.wall_milliseconds <= protocol.request_limits.wall_seconds_max * 1000, 'open-model metadata publication wall envelope does not match exact request inventory');
    const rawCacheInventorySha256 = inventoryRoot([...rawInventoryPaths],'open-model raw cache inventory');
    const metadataCanonicalInventorySha256 = inventoryRoot([...rawInventoryPaths,manifestPath],'open-model metadata canonical inventory');
    check(publication.raw_response_inventory_merkle_sha256 === manifest.raw_response_inventory_merkle_sha256 && publication.stable_external_content_inventory_sha256 === stableExternalContentInventorySha256 && publication.candidate_discovery_manifest_sha256 === file.hash && publication.cache_entry_sha256 === rawCacheInventorySha256 && publication.canonical_inventory_sha256 === metadataCanonicalInventorySha256 && publication.file_count === uniqueBodyCount + manifest.raw_response_receipts.length + 1 && publication.total_bytes === totalBytes && publication.total_expanded_bytes === totalExpandedBytes && publication.fsync_complete === true && publication.atomic_rename_complete === true, 'open-model metadata publication does not bind the exact deduplicated-body, stable-content, per-request transport and discovery-manifest inventory atomically');
    deepEqual(publication.phase_request_counts,phaseRequestCounts,'open-model metadata publication phase request counters');
    deepEqual(publication.phase_download_and_expanded_bytes,phaseByteCounts,'open-model metadata publication phase byte counters');
    check(Array.isArray(manifest.candidates), 'open-model discovery manifest candidates missing');
    unique(manifest.candidates.map((candidate) => candidate.candidate_id + '\0' + candidate.immutable_revision), 'open-model discovery candidate identities');
    const derivedCandidates = constants.open_model_candidate_registry.candidates.map((candidate) => ({candidate_id:candidate.candidate_id,immutable_revision:candidate.immutable_revision}));
    const derivedSeen = new Set(derivedCandidates.map((candidate) => candidate.candidate_id + '\0' + candidate.immutable_revision));
    let discoveredNew = 0;
    for (let index = 0; index < protocol.discovery_queries.length; index += 1) {
      const source = responseByReceipt.get(manifest.raw_response_receipts[index].receipt_sha256);
      const body = parseJsonExact(source.bodyFile.text, 'open-model discovery response body');
      check(Array.isArray(body), 'open-model discovery response body is not the frozen JSON array shape');
      for (const item of body) {
        if (!isRecord(item) || item.pipeline_tag !== 'text-generation') continue;
        const candidateId = typeof item.id === 'string' ? item.id : item.modelId;
        if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(candidateId || '') || !/^[0-9a-f]{40}$/.test(item.sha || '')) continue;
        const key = candidateId + '\0' + item.sha;
        if (derivedSeen.has(key)) continue;
        if (discoveredNew >= protocol.discovery_candidate_derivation_contract.new_candidates_max) continue;
        derivedSeen.add(key);
        derivedCandidates.push({candidate_id:candidateId,immutable_revision:item.sha});
        discoveredNew += 1;
      }
    }
    exactArray(manifest.candidates.map((candidate) => ({candidate_id:candidate.candidate_id,immutable_revision:candidate.immutable_revision})), derivedCandidates, 'open-model manifest does not exactly cover deterministic seed plus bounded discovery candidate identities');
    const allCandidateKeys = derivedCandidates.map((candidate) => candidate.candidate_id + '\0' + candidate.immutable_revision).sort((a,b) => Buffer.from(a).compare(Buffer.from(b)));
    exactArray(manifest.fetch_phase_records[0].candidate_input_identities.map((candidate) => candidate.candidate_id + '\0' + candidate.immutable_revision),allCandidateKeys,'open-model first fetch phase does not cover every exact seed/discovered candidate');
    const manifestCandidateByKey = new Map();
    const sourceEvidenceByCandidateKey = new Map();
    const assignedSourceEvidence = new Set();
    for (const candidate of manifest.candidates) {
      exactSet(Object.keys(candidate), manifestContract.candidate_record_keys, 'open-model discovery candidate fields');
      check(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(candidate.candidate_id) && /^[0-9a-f]{40}$/.test(candidate.immutable_revision), 'open-model discovery candidate immutable identity invalid');
      check(candidate.official_repository_url === 'https://huggingface.co/' + candidate.candidate_id && /^[0-9a-f]{64}$/.test(candidate.metadata_receipt_sha256), 'open-model discovery candidate repository/metadata identity drift');
      check(responseReceiptHashes.has(candidate.metadata_receipt_sha256), 'open-model discovery candidate metadata receipt is not in the raw response inventory');
      const metadataSource = responseByReceipt.get(candidate.metadata_receipt_sha256);
      check(metadataSource.record.request_role === 'candidate-metadata' && metadataSource.record.request_url === `https://huggingface.co/api/models/${candidate.candidate_id}/revision/${candidate.immutable_revision}?blobs=true`, 'open-model discovery candidate metadata receipt belongs to another candidate or revision');
      check(Array.isArray(candidate.source_evidence_receipts), 'open-model discovery source-evidence inventory missing');
      const candidateSourceSet = new Set();
      if (candidate.source_locator_or_absent === 'absent') check(candidate.source_evidence_receipts.length === 0, 'open-model candidate without a metadata-derived source locator has GitHub evidence authority');
      else {
        exactSet(Object.keys(candidate.source_locator_or_absent),manifestContract.source_locator_keys,'open-model metadata-derived source locator fields');
        const locator = candidate.source_locator_or_absent;
        check(/^[A-Za-z0-9_.-]+$/.test(locator.repository_owner) && /^[A-Za-z0-9_.-]+$/.test(locator.repository_name) && /^[0-9a-f]{40}$/.test(locator.commit_sha), 'open-model metadata-derived source locator identity invalid');
        const derivationSource = responseByReceipt.get(locator.derivation_transport_receipt_sha256);
        check(derivationSource && derivationSource.record.request_role === 'candidate-metadata' && (derivationSource.record.request_url === `https://huggingface.co/api/models/${candidate.candidate_id}/revision/${candidate.immutable_revision}?blobs=true` || derivationSource.record.request_url.startsWith(`https://huggingface.co/${candidate.candidate_id}/resolve/${candidate.immutable_revision}/`)), 'open-model source locator was not derived from this candidate/revision metadata');
        check(Number.isSafeInteger(locator.start_byte) && Number.isSafeInteger(locator.end_byte) && locator.start_byte >= 0 && locator.end_byte > locator.start_byte && locator.end_byte <= derivationSource.bodyFile.bytes.length && locator.end_byte - locator.start_byte <= 512, 'open-model source locator evidence span invalid');
        const locatorBytes = derivationSource.bodyFile.bytes.subarray(locator.start_byte,locator.end_byte);
        check(sha256(locatorBytes) === locator.excerpt_sha256, 'open-model source locator evidence span hash drift');
        const locatorText = new TextDecoder('utf-8',{fatal:true}).decode(locatorBytes).trim();
        check(locatorText === `https://github.com/${locator.repository_owner}/${locator.repository_name}/tree/${locator.commit_sha}` || locatorText === `https://github.com/${locator.repository_owner}/${locator.repository_name}/commit/${locator.commit_sha}`, 'open-model source locator evidence bytes do not state the exact repository/commit');
        unique(candidate.source_evidence_receipts.map((record) => record.transport_receipt_sha256), 'open-model candidate source-evidence receipt identities');
        exactArray(candidate.source_evidence_receipts.map((record) => record.request_url),candidate.source_evidence_receipts.map((record) => record.request_url).sort((a,b) => Buffer.from(a).compare(Buffer.from(b))),'open-model candidate source-evidence URL order');
        for (const record of candidate.source_evidence_receipts) {
          exactSet(Object.keys(record),manifestContract.source_evidence_record_keys,'open-model candidate source-evidence record fields');
          check(manifestContract.source_evidence_roles.includes(record.role), 'open-model candidate source-evidence role invalid');
          const source = responseByReceipt.get(record.transport_receipt_sha256);
          check(source && source.record.request_role === 'candidate-source' && source.record.request_url === record.request_url, 'open-model candidate source-evidence record is not an exact published GitHub response');
          const prefix = `https://api.github.com/repos/${locator.repository_owner}/${locator.repository_name}/git/`;
          const rawPrefix = `https://raw.githubusercontent.com/${locator.repository_owner}/${locator.repository_name}/${locator.commit_sha}/`;
          if (record.role === 'commit') check(record.request_url === prefix + `commits/${locator.commit_sha}` && record.path_or_api_role === 'commit', 'open-model candidate commit evidence identity drift');
          else if (record.role === 'tree') check(record.request_url.startsWith(prefix + 'trees/') && record.request_url.endsWith('?recursive=1') && record.path_or_api_role === 'tree', 'open-model candidate tree evidence identity drift');
          else check(record.request_url.startsWith(rawPrefix) && record.path_or_api_role === record.request_url.slice(rawPrefix.length) && !record.path_or_api_role.includes('..'), 'open-model candidate source-file evidence identity/path drift');
          check(!assignedSourceEvidence.has(record.transport_receipt_sha256), 'open-model GitHub source receipt is assigned to multiple candidates');
          assignedSourceEvidence.add(record.transport_receipt_sha256);
          candidateSourceSet.add(record.transport_receipt_sha256);
        }
        check(candidate.source_evidence_receipts.some((record) => record.role === 'commit') && candidate.source_evidence_receipts.some((record) => record.role === 'tree'), 'open-model candidate source inventory lacks immutable commit/tree receipts');
      }
      manifestCandidateByKey.set(candidate.candidate_id + '\0' + candidate.immutable_revision,candidate);
      sourceEvidenceByCandidateKey.set(candidate.candidate_id + '\0' + candidate.immutable_revision,candidateSourceSet);
    }
    exactSet([...assignedSourceEvidence],[...responseByReceipt.values()].filter((entry) => entry.record.request_role === 'candidate-source').map((entry) => entry.record.receipt_sha256),'open-model candidate-source exact one-candidate assignment');
    const candidateKeyByResponse = new Map();
    for (const candidate of manifest.candidates) {
      const key = candidate.candidate_id + '\0' + candidate.immutable_revision;
      const apiUrl = `https://huggingface.co/api/models/${candidate.candidate_id}/revision/${candidate.immutable_revision}?blobs=true`;
      const resolvePrefix = `https://huggingface.co/${candidate.candidate_id}/resolve/${candidate.immutable_revision}/`;
      for (const entry of responseByReceipt.values()) {
        if (entry.record.request_role === 'candidate-metadata' && (entry.record.request_url === apiUrl || entry.record.request_url.startsWith(resolvePrefix))) {
          check(!candidateKeyByResponse.has(entry.record.receipt_sha256), 'open-model metadata response is assigned to multiple candidate identities');
          candidateKeyByResponse.set(entry.record.receipt_sha256,key);
        }
      }
      for (const receiptSha256 of sourceEvidenceByCandidateKey.get(key) || []) {
        check(!candidateKeyByResponse.has(receiptSha256), 'open-model source response is assigned to multiple candidate identities');
        candidateKeyByResponse.set(receiptSha256,key);
      }
    }
    exactSet([...candidateKeyByResponse.keys()],[...responseByReceipt.values()].filter((entry) => entry.record.request_role !== 'discovery').map((entry) => entry.record.receipt_sha256),'open-model every non-discovery request exact candidate assignment');
    const expectedRequestOrder = manifest.raw_response_receipts.slice(0,protocol.discovery_queries.length).map((record) => record.receipt_sha256);
    for (const [phaseIndex,phaseContract] of protocol.fetch_phase_contract.phases.entries()) {
      const phaseInputKeys = manifest.fetch_phase_records[phaseIndex].candidate_input_identities.map((candidate) => candidate.candidate_id + '\0' + candidate.immutable_revision);
      for (const key of phaseInputKeys) {
        const records = [...responseByReceipt.values()].filter((entry) => entry.record.fetch_phase_id === phaseContract.id && entry.record.request_role !== 'discovery' && candidateKeyByResponse.get(entry.record.receipt_sha256) === key).sort((a,b) => Buffer.from(a.record.request_url).compare(Buffer.from(b.record.request_url)) || a.record.page - b.record.page);
        unique(records.map((entry) => entry.record.request_url + '\0' + entry.record.page),'open-model exact candidate/phase request identities');
        expectedRequestOrder.push(...records.map((entry) => entry.record.receipt_sha256));
      }
      for (const entry of responseByReceipt.values()) if (entry.record.fetch_phase_id === phaseContract.id && entry.record.request_role !== 'discovery') check(phaseInputKeys.includes(candidateKeyByResponse.get(entry.record.receipt_sha256)), 'open-model request executed before its candidate entered the exact phase input survivor set');
    }
    exactArray(manifest.raw_response_receipts.map((record) => record.receipt_sha256),expectedRequestOrder,'open-model raw response inventory is not in exact phase/candidate/revision/path request order');
    if (metadataOnly) {
      return {manifest,responseByReceipt,responseByBodyPath,metadataPublicationFile:publicationFile,rawInventoryPaths:[...rawInventoryPaths]};
    }
    const dispositionsContract = protocol.candidate_dispositions_contract;
    const machineContract = protocol.machine_prefilter_contract;
    const machineFile = readBounded(root,attemptPath(machineContract.path,runId),'open-model deterministic machine prefilter',8388608);
    const machine = parseJsonExact(machineFile.text,'open-model deterministic machine prefilter');
    check(machineFile.text === canonicalJson(machine), 'open-model deterministic machine prefilter is not canonical JSON');
    exactSet(Object.keys(machine),machineContract.required_top_level_keys,'open-model machine prefilter fields');
    check(machine.schema_version === machineContract.schema_version && machine.protocol_id === protocol.protocol_id && machine.raw_response_inventory_merkle_sha256 === manifest.raw_response_inventory_merkle_sha256 && machine.candidate_discovery_manifest_sha256 === file.hash && Array.isArray(machine.candidate_machine_results), 'open-model machine prefilter identity/inventory drift');
    const expectedParityHashes = Object.fromEntries(Object.entries(machineContract.parity_prerequisite_receipts).map(([id,path]) => [id,hashRegularFile(resolveInside(root,path,'open-model parity prerequisite ' + id)).sha256]));
    deepEqual(machine.parity_prerequisite_hashes,expectedParityHashes,'open-model machine prefilter exact parity prerequisite hashes');
    exactArray(machine.candidate_machine_results.map((candidate) => ({candidate_id:candidate.candidate_id,immutable_revision:candidate.immutable_revision})),derivedCandidates,'open-model machine prefilter candidate order');
    const machineByCandidate = new Map();
    const configByCandidate = new Map();
    const parameterFormula = 'P=V*D+L*(2*D^2+2*D^2*Hkv/Hq+3*D*F+2*D)+D';
    for (const candidate of machine.candidate_machine_results) {
      exactSet(Object.keys(candidate),machineContract.candidate_record_keys,'open-model machine candidate fields');
      const key = candidate.candidate_id + '\0' + candidate.immutable_revision;
      const manifestCandidate = manifestCandidateByKey.get(key);
      check(manifestCandidate && Array.isArray(candidate.gate_records), 'open-model machine candidate is not in discovery manifest');
      const configUrl = `https://huggingface.co/${candidate.candidate_id}/resolve/${candidate.immutable_revision}/config.json`;
      const configSources = [...responseByReceipt.values()].filter((entry) => entry.record.request_role === 'candidate-metadata' && entry.record.request_url === configUrl);
      check(configSources.length <= 1, 'open-model candidate has duplicate exact config requests');
      const configSource = configSources[0] || null;
      check(candidate.config_transport_receipt_sha256_or_absent === (configSource ? configSource.record.receipt_sha256 : 'absent'), 'open-model machine candidate config receipt omission/substitution');
      let config = null;
      if (configSource) { try { config = JSON.parse(configSource.bodyFile.text); } catch {} }
      const finitePositive = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0;
      const integerPositive = (value) => Number.isSafeInteger(value) && value > 0;
      const valuesPresent = config && ['vocab_size','hidden_size','num_hidden_layers','num_attention_heads','num_key_value_heads','intermediate_size','max_position_embeddings'].every((name) => integerPositive(config[name]));
      const divisibility = valuesPresent && config.hidden_size % config.num_attention_heads === 0 && config.num_attention_heads % config.num_key_value_heads === 0 && (config.hidden_size / config.num_attention_heads) % 2 === 0;
      const causal = Boolean(config && config.model_type === 'llama' && Array.isArray(config.architectures) && config.architectures.length === 1 && config.architectures[0] === 'LlamaForCausalLM' && config.is_encoder_decoder !== true && config.add_cross_attention !== true && !Object.keys(config).some((name) => /(?:encoder|cross_attention|vision|audio|image|modality|second_decoder)/i.test(name)));
      const biasFreeExpected = Boolean(config && config.attention_bias === false && config.mlp_bias === false && !Object.keys(config).some((name) => /norm_bias|layer_norm_bias/i.test(name)));
      const supportedKeys = Boolean(config && Object.keys(config).every((name) => machineContract.supported_config_keys.includes(name)));
      const architectureComplete = Boolean(causal && divisibility && supportedKeys && config.hidden_act === 'silu' && finitePositive(config.rms_norm_eps) && finitePositive(config.rope_theta) && (config.rope_scaling === null || config.rope_scaling === undefined) && (config.sliding_window === null || config.sliding_window === undefined) && (config.attention_dropout === 0 || config.attention_dropout === undefined) && config.tie_word_embeddings === true && (config.head_dim === undefined || config.head_dim === config.hidden_size / config.num_attention_heads) && ['float32','float16','bfloat16'].includes(config.torch_dtype));
      const parameterCount = valuesPresent && divisibility ? config.vocab_size * config.hidden_size + config.num_hidden_layers * (2 * config.hidden_size * config.hidden_size + 2 * config.hidden_size * config.hidden_size * config.num_key_value_heads / config.num_attention_heads + 3 * config.hidden_size * config.intermediate_size + 2 * config.hidden_size) + config.hidden_size : null;
      const inRange = Number.isSafeInteger(parameterCount) && parameterCount >= 20000000 && parameterCount <= 50000000;
      const configEvidence = configSource ? [configSource.record.receipt_sha256] : [];
      const parityEvidence = Object.values(expectedParityHashes).sort();
      const expectedGates = [
        ['parameter_range_20m_to_50m',inRange,config ? (inRange ? 'recomputed-expected-parameter-count-in-range' : 'recomputed-expected-parameter-count-out-of-range-or-invalid') : 'exact-config-evidence-unavailable',configEvidence],
        ['causal_autoregressive_decoder_only_text',causal,config ? (causal ? 'exact-config-is-one-causal-autoregressive-decoder-only-text-model' : 'exact-config-has-unsupported-or-noncausal-architecture') : 'exact-config-evidence-unavailable',configEvidence],
        ['bias_free',biasFreeExpected,config ? (biasFreeExpected ? 'exact-config-declares-supported-projections-bias-free-physical-header-proof-deferred-to-n3' : 'exact-config-does-not-declare-the-supported-bias-free-schema') : 'exact-config-evidence-unavailable',configEvidence],
        ['architecture_config_complete',architectureComplete,config ? (architectureComplete ? 'exact-config-fully-matches-supported-course-schema' : 'exact-config-missing-or-adds-unsupported-semantic-fields') : 'exact-config-evidence-unavailable',configEvidence],
        ['independent_parity_plan_complete',true,'all-exact-preselection-parity-prerequisite-receipts-recomputed',parityEvidence]
      ].map(([gateId,result,reason,evidenceSha256s]) => ({gate_id:gateId,claim_proposition:protocol.semantic_claim_catalog[gateId].proposition,method:protocol.semantic_claim_catalog[gateId].method,result,reason,evidence_sha256s:evidenceSha256s}));
      exactArray(candidate.gate_records.map((gate) => gate.gate_id),dispositionsContract.machine_gate_ids,'open-model machine gate order');
      for (const gate of candidate.gate_records) exactSet(Object.keys(gate),machineContract.gate_record_keys,'open-model machine gate fields');
      deepEqual(candidate.gate_records,expectedGates,'open-model machine gate deterministic derivation ' + key);
      const configPrefilterPassed = expectedGates.every((gate) => gate.result);
      check(candidate.config_prefilter_passed === configPrefilterPassed, 'open-model config-prefilter result is not the conjunction of exact config/parity gates');
      const exactMetadataSource = (leaf,label) => {
        const url = `https://huggingface.co/${candidate.candidate_id}/resolve/${candidate.immutable_revision}/${leaf}`;
        const matches = [...responseByReceipt.values()].filter((entry) => entry.record.request_role === 'candidate-metadata' && entry.record.request_url === url);
        check(matches.length <= 1, label + ' has duplicate exact requests');
        return matches[0] || null;
      };
      const tokenizerSource = exactMetadataSource('tokenizer.json','open-model tokenizer machine source');
      const tokenizerConfigSource = exactMetadataSource('tokenizer_config.json','open-model tokenizer-config machine source');
      const specialTokensSource = exactMetadataSource('special_tokens_map.json','open-model special-tokens machine source');
      check(candidate.tokenizer_transport_receipt_sha256_or_absent === (tokenizerSource?.record.receipt_sha256 || 'absent') && candidate.tokenizer_config_transport_receipt_sha256_or_absent === (tokenizerConfigSource?.record.receipt_sha256 || 'absent') && candidate.special_tokens_transport_receipt_sha256_or_absent === (specialTokensSource?.record.receipt_sha256 || 'absent'), 'open-model tokenizer machine receipt omission/substitution');
      let tokenizer = null;
      let tokenizerConfig = null;
      let specialTokens = null;
      try { if (tokenizerSource) tokenizer = JSON.parse(tokenizerSource.bodyFile.text); } catch {}
      try { if (tokenizerConfigSource) tokenizerConfig = JSON.parse(tokenizerConfigSource.bodyFile.text); } catch {}
      try { if (specialTokensSource) specialTokens = JSON.parse(specialTokensSource.bodyFile.text); } catch {}
      const tokenContent = (value) => typeof value === 'string' ? value : isRecord(value) && typeof value.content === 'string' ? value.content : null;
      const bosContent = tokenContent(tokenizerConfig?.bos_token) || tokenContent(specialTokens?.bos_token);
      const eosContent = tokenContent(tokenizerConfig?.eos_token) || tokenContent(specialTokens?.eos_token);
      const model = tokenizer?.model;
      const tokenizerMachineCompatible = Boolean(configPrefilterPassed && tokenizer && tokenizerConfig && specialTokens && isRecord(model) && model.type === 'BPE' && isRecord(model.vocab) && Array.isArray(model.merges) && model.merges.length > 0 && Object.keys(model.vocab).length === config.vocab_size && model.dropout === null && (model.unk_token === null || model.unk_token === undefined) && (model.continuing_subword_prefix === null || model.continuing_subword_prefix === '') && (model.end_of_word_suffix === null || model.end_of_word_suffix === '') && model.fuse_unk === false && model.byte_fallback === false && (model.ignore_merges === false || model.ignore_merges === undefined) && (tokenizer.normalizer === null || tokenizer.normalizer === undefined) && tokenizer.pre_tokenizer?.type === 'ByteLevel' && tokenizer.pre_tokenizer.add_prefix_space === false && tokenizer.pre_tokenizer.trim_offsets === true && tokenizer.pre_tokenizer.use_regex === true && tokenizer.decoder?.type === 'ByteLevel' && tokenizer.decoder.add_prefix_space === true && tokenizer.decoder.trim_offsets === true && tokenizer.decoder.use_regex === true && (tokenizer.post_processor === null || tokenizer.post_processor === undefined) && (tokenizer.padding === null || tokenizer.padding === undefined) && (tokenizer.truncation === null || tokenizer.truncation === undefined) && bosContent && eosContent && model.vocab[bosContent] === config.bos_token_id && model.vocab[eosContent] === config.eos_token_id && tokenizerConfig.pad_token == null && specialTokens.pad_token == null && tokenizerConfig.chat_template == null && tokenizerConfig.auto_map == null && tokenizerConfig.trust_remote_code !== true && !Object.keys(tokenizerConfig).some((name) => /(?:remote_code|custom_code|auto_map)/i.test(name) && tokenizerConfig[name] != null));
      check(candidate.tokenizer_machine_compatible === tokenizerMachineCompatible, 'open-model tokenizer machine compatibility is not deterministically parsed from exact candidate-bound bytes');
      check(candidate.machine_eligible === (configPrefilterPassed && tokenizerMachineCompatible), 'open-model machine eligibility is not exact config-prefilter AND tokenizer compatibility');
      machineByCandidate.set(key,candidate);
      configByCandidate.set(key,{config,configSource,parameterCount});
    }

    const sortedMachineKeys = (predicate) => machine.candidate_machine_results.filter(predicate).map((candidate) => candidate.candidate_id + '\0' + candidate.immutable_revision).sort((a,b) => Buffer.from(a).compare(Buffer.from(b)));
    const configSurvivors = sortedMachineKeys((candidate) => candidate.config_prefilter_passed);
    const tokenizerSurvivors = sortedMachineKeys((candidate) => candidate.machine_eligible);
    exactArray(manifest.fetch_phase_records[0].candidate_survivor_identities.map((candidate) => candidate.candidate_id + '\0' + candidate.immutable_revision),configSurvivors,'open-model phase-1 survivors are not the exact deterministic config prefilter');
    exactArray(manifest.fetch_phase_records[1].candidate_input_identities.map((candidate) => candidate.candidate_id + '\0' + candidate.immutable_revision),configSurvivors,'open-model tokenizer phase input is not the exact deterministic config survivor set');
    exactArray(manifest.fetch_phase_records[1].candidate_survivor_identities.map((candidate) => candidate.candidate_id + '\0' + candidate.immutable_revision),tokenizerSurvivors,'open-model tokenizer phase survivors are not the exact deterministic tokenizer-compatible set');
    exactArray(manifest.fetch_phase_records[2].candidate_input_identities.map((candidate) => candidate.candidate_id + '\0' + candidate.immutable_revision),tokenizerSurvivors,'open-model semantic evidence phase input is not the exact deterministic tokenizer survivor set');
    exactArray(manifest.fetch_phase_records[2].candidate_survivor_identities.map((candidate) => candidate.candidate_id + '\0' + candidate.immutable_revision),tokenizerSurvivors,'open-model complete semantic evidence phase may not omit or silently reject a machine-eligible candidate');

    const workflow = protocol.semantic_judgment_workflow;
    const semanticContract = protocol.semantic_assessments_contract;
    const semanticFile = readBounded(root,attemptPath(semanticContract.path,runId),'open-model author semantic assessments',8388608);
    const semantic = parseJsonExact(semanticFile.text,'open-model author semantic assessments');
    check(semanticFile.text === canonicalJson(semantic), 'open-model author semantic assessments are not canonical JSON');
    exactSet(Object.keys(semantic),semanticContract.required_top_level_keys,'open-model author semantic assessment fields');
    check(semantic.schema_version === semanticContract.schema_version && semantic.protocol_id === protocol.protocol_id && typeof semantic.author_context_id === 'string' && semantic.author_context_id.length >= 16 && semantic.raw_response_inventory_merkle_sha256 === manifest.raw_response_inventory_merkle_sha256 && semantic.machine_prefilter_sha256 === machineFile.hash && semantic.verdict === 'complete' && Array.isArray(semantic.candidate_assessments), 'open-model author semantic assessment identity/verdict drift');
    const eligibleCandidates = manifest.candidates.filter((candidate) => machineByCandidate.get(candidate.candidate_id + '\0' + candidate.immutable_revision).machine_eligible);
    exactArray(semantic.candidate_assessments.map((candidate) => ({candidate_id:candidate.candidate_id,immutable_revision:candidate.immutable_revision})),eligibleCandidates.map((candidate) => ({candidate_id:candidate.candidate_id,immutable_revision:candidate.immutable_revision})),'open-model author semantic eligible-candidate order');
    const evidenceReceiptsByCandidate = new Map();
    const evidenceRolesByCandidate = new Map();
    for (const candidate of manifest.candidates) {
      const key = candidate.candidate_id + '\0' + candidate.immutable_revision;
      const exactApi = `https://huggingface.co/api/models/${candidate.candidate_id}/revision/${candidate.immutable_revision}?blobs=true`;
      const exactFilePrefix = `https://huggingface.co/${candidate.candidate_id}/resolve/${candidate.immutable_revision}/`;
      const receipts = new Set();
      const roles = new Map();
      for (const source of responseByReceipt.values()) {
        if (source.record.request_role === 'candidate-metadata' && (source.record.request_url === exactApi || source.record.request_url.startsWith(exactFilePrefix))) {
          receipts.add(source.record.receipt_sha256);
          roles.set(source.record.receipt_sha256,source.record.request_url === exactApi ? 'hf:api' : 'hf:' + source.record.request_url.slice(exactFilePrefix.length));
        }
      }
      for (const sourceRecord of candidate.source_evidence_receipts) { receipts.add(sourceRecord.transport_receipt_sha256); roles.set(sourceRecord.transport_receipt_sha256,'github:' + sourceRecord.role); }
      evidenceReceiptsByCandidate.set(key,receipts);
      evidenceRolesByCandidate.set(key,roles);
    }
    const validateSpan = (span,keys,candidateKey,gateId,label) => {
      exactSet(Object.keys(span),keys,label + ' fields');
      const source = responseByReceipt.get(span.transport_receipt_sha256);
      check(source && evidenceReceiptsByCandidate.get(candidateKey).has(span.transport_receipt_sha256), label + ' cites another candidate or unbound response');
      check(source.record.body_path === span.body_path && source.bodyFile.hash === span.body_sha256 && source.transportFile.hash === span.transport_receipt_sha256, label + ' source/body/transport binding drift');
      check(Number.isSafeInteger(span.start_byte) && Number.isSafeInteger(span.end_byte) && span.start_byte >= 0 && span.end_byte > span.start_byte && span.end_byte <= source.bodyFile.bytes.length && span.end_byte - span.start_byte <= 4096 && sha256(source.bodyFile.bytes.subarray(span.start_byte,span.end_byte)) === span.excerpt_sha256, label + ' byte span/hash drift');
      check(span.claim_id === `MODEL-GATE-${String(dispositionsContract.gate_ids.indexOf(gateId) + 1).padStart(2,'0')}`, label + ' claim identity drift');
    };
    const authorByKey = new Map();
    for (const candidate of semantic.candidate_assessments) {
      exactSet(Object.keys(candidate),semanticContract.candidate_record_keys,'open-model author semantic candidate fields');
      const candidateKey = candidate.candidate_id + '\0' + candidate.immutable_revision;
      check(machineByCandidate.get(candidateKey)?.machine_eligible === true, 'open-model author routed a machine-ineligible candidate');
      exactArray(candidate.gate_records.map((gate) => gate.gate_id),dispositionsContract.semantic_gate_ids,'open-model author semantic gate order');
      for (const gate of candidate.gate_records) {
        exactSet(Object.keys(gate),semanticContract.gate_record_keys,'open-model author semantic gate fields');
        const claim = protocol.semantic_claim_catalog[gate.gate_id];
        check(claim && gate.claim_proposition === claim.proposition && gate.method === claim.method && typeof gate.result === 'boolean' && typeof gate.reason === 'string' && gate.reason.trim().length > 0 && Array.isArray(gate.evidence_spans), 'open-model author semantic gate identity/value drift');
        for (const span of gate.evidence_spans) validateSpan(span,semanticContract.span_record_keys,candidateKey,gate.gate_id,'open-model author semantic evidence span');
        check(gate.result ? gate.evidence_spans.length > 0 : true, 'open-model true semantic gate lacks exact primary-source evidence spans');
        authorByKey.set(candidateKey + '\0' + gate.gate_id,gate);
      }
    }

    const reviewContract = protocol.semantic_review_contract;
    const reviewFile = readBounded(root,attemptPath(reviewContract.path,runId),'open-model independent semantic evidence review',8388608);
    const review = parseJsonExact(reviewFile.text,'open-model independent semantic evidence review');
    check(reviewFile.text === canonicalJson(review), 'open-model independent semantic evidence review is not canonical JSON');
    exactSet(Object.keys(review),reviewContract.required_top_level_keys,'open-model independent semantic evidence review fields');
    check(review.schema_version === reviewContract.schema_version && review.protocol_id === protocol.protocol_id && typeof review.review_context_id === 'string' && review.review_context_id.length >= 16 && review.author_context_id === semantic.author_context_id && review.raw_response_inventory_merkle_sha256 === manifest.raw_response_inventory_merkle_sha256 && review.machine_prefilter_sha256 === machineFile.hash && review.semantic_assessments_sha256 === semanticFile.hash && review.verdict === 'pass' && Array.isArray(review.assessments), 'open-model independent semantic review identity/verdict drift');
    const expectedAssessmentKeys = eligibleCandidates.flatMap((candidate) => dispositionsContract.semantic_gate_ids.map((gateId) => `${candidate.candidate_id}\0${candidate.immutable_revision}\0${gateId}`));
    exactArray(review.assessments.map((assessment) => `${assessment.candidate_id}\0${assessment.immutable_revision}\0${assessment.gate_id}`),expectedAssessmentKeys,'open-model independent semantic review exact eligible-candidate/gate order');
    const reviewByKey = new Map();
    for (const assessment of review.assessments) {
      exactSet(Object.keys(assessment),reviewContract.assessment_keys,'open-model independent semantic review assessment fields');
      const candidateKey = assessment.candidate_id + '\0' + assessment.immutable_revision;
      const key = candidateKey + '\0' + assessment.gate_id;
      const authored = authorByKey.get(key);
      const claim = protocol.semantic_claim_catalog[assessment.gate_id];
      check(authored && claim && assessment.claim_proposition === claim.proposition && assessment.method === claim.method && assessment.author_result === authored.result && assessment.author_reason === authored.reason && reviewContract.assessment_judgments.includes(assessment.assessment_judgment) && typeof assessment.reason === 'string' && assessment.reason.trim().length > 0 && Array.isArray(assessment.evidence_spans), 'open-model independent semantic review author echo/judgment drift ' + key);
      if (assessment.assessment_judgment === 'supported') check(assessment.replacement_result_or_absent === 'absent', 'supported semantic review invents a replacement result');
      else check(typeof assessment.replacement_result_or_absent === 'boolean', 'rejected semantic review lacks one exact replacement boolean');
      for (const span of assessment.evidence_spans) validateSpan(span,reviewContract.span_keys,candidateKey,assessment.gate_id,'open-model independent semantic review span');
      check(assessment.evidence_spans.length > 0, 'open-model independent semantic review lacks bounded rationale evidence');
      reviewByKey.set(key,assessment);
    }

    const adjudicationContract = protocol.semantic_adjudication_contract;
    const adjudicationFile = readBounded(root,attemptPath(adjudicationContract.path,runId),'open-model independent semantic evidence adjudication',8388608);
    const adjudication = parseJsonExact(adjudicationFile.text,'open-model independent semantic evidence adjudication');
    check(adjudicationFile.text === canonicalJson(adjudication), 'open-model independent semantic evidence adjudication is not canonical JSON');
    exactSet(Object.keys(adjudication),adjudicationContract.required_top_level_keys,'open-model independent semantic evidence adjudication fields');
    check(adjudication.schema_version === adjudicationContract.schema_version && adjudication.protocol_id === protocol.protocol_id && typeof adjudication.adjudicator_context_id === 'string' && adjudication.adjudicator_context_id.length >= 16 && adjudication.review_context_id === review.review_context_id && adjudication.author_context_id === semantic.author_context_id && adjudication.machine_prefilter_sha256 === machineFile.hash && adjudication.semantic_assessments_sha256 === semanticFile.hash && adjudication.semantic_review_sha256 === reviewFile.hash && adjudication.verdict === 'pass' && Array.isArray(adjudication.judgments), 'open-model independent semantic adjudication identity/context/verdict drift');
    exactArray(adjudication.judgments.map((judgment) => `${judgment.candidate_id}\0${judgment.immutable_revision}\0${judgment.gate_id}`),expectedAssessmentKeys,'open-model independent semantic adjudication exact eligible-candidate/gate order');
    const finalSemanticByKey = new Map();
    for (const judgment of adjudication.judgments) {
      exactSet(Object.keys(judgment),adjudicationContract.judgment_keys,'open-model independent semantic adjudication judgment fields');
      const key = `${judgment.candidate_id}\0${judgment.immutable_revision}\0${judgment.gate_id}`;
      const reviewed = reviewByKey.get(key);
      check(reviewed && judgment.review_assessment_judgment === reviewed.assessment_judgment && judgment.author_result === reviewed.author_result && judgment.replacement_result_or_absent === reviewed.replacement_result_or_absent && judgment.judgment === 'supported', 'open-model independent semantic adjudication does not soundly bind the review assessment');
      const derivedFinal = reviewed.assessment_judgment === 'supported' ? reviewed.author_result : reviewed.replacement_result_or_absent;
      check(judgment.final_result === derivedFinal, 'open-model semantic adjudicator final result is not the deterministic author-or-replacement choice');
      finalSemanticByKey.set(key,derivedFinal);
    }

    const eligibleReceiptSet = new Set(eligibleCandidates.flatMap((candidate) => [...evidenceReceiptsByCandidate.get(candidate.candidate_id + '\0' + candidate.immutable_revision)]));
    const evidenceResources = [...eligibleReceiptSet].map((receiptSha) => {
      const source = responseByReceipt.get(receiptSha);
      return {transport_receipt_sha256:receiptSha,request_url:source.record.request_url,media_type:source.record.media_type,body_path:source.record.body_path,body_sha256:source.bodyFile.hash,bytes:source.bodyFile.bytes.length,body_base64:source.bodyFile.bytes.toString('base64'),transport_receipt:source.transport};
    }).sort((a,b) => Buffer.from(a.request_url + '\0' + a.transport_receipt_sha256).compare(Buffer.from(b.request_url + '\0' + b.transport_receipt_sha256)));
    const absenceProofs = eligibleCandidates.flatMap((candidate) => {
      const key = candidate.candidate_id + '\0' + candidate.immutable_revision;
      const roles = evidenceRolesByCandidate.get(key);
      return dispositionsContract.semantic_gate_ids.map((gateId) => {
        const required = workflow.semantic_evidence_roles_by_gate[gateId];
        const presentReceipts = [...roles.entries()].filter(([,role]) => required.includes(role)).map(([receipt]) => receipt).sort();
        const presentRoles = new Set([...roles.values()]);
        return {candidate_id:candidate.candidate_id,immutable_revision:candidate.immutable_revision,gate_id:gateId,required_evidence_roles:required,present_transport_receipt_sha256s:presentReceipts,absent_evidence_roles:required.filter((role) => !presentRoles.has(role)),raw_response_inventory_merkle_sha256:manifest.raw_response_inventory_merkle_sha256};
      });
    });
    const roleResponses = {author:semanticFile,reviewer:reviewFile,adjudicator:adjudicationFile};
    const workflowFiles = [];
    const contexts = [];
    const receiptsByRole = new Map();
    const protocolSha256 = sha256(Buffer.from(JSON.stringify(protocol)));
    const claimCatalogSha256 = sha256(Buffer.from(JSON.stringify(protocol.semantic_claim_catalog)));
    for (const role of workflow.roles) {
      const roleRoot = attemptPath(workflow.role_roots[role],runId);
      const files = Object.fromEntries(workflow.artifact_names.map((name) => [name,readBounded(root,`${roleRoot}/${name}`,`open-model ${role} judgment ${name}`,16777216)]));
      workflowFiles.push(...Object.values(files));
      const context = parseJsonExact(files['context-manifest.json'].text,`open-model ${role} judgment context manifest`);
      check(files['context-manifest.json'].text === canonicalJson(context), `open-model ${role} judgment context manifest is not canonical JSON`);
      exactSet(Object.keys(context),workflow.context_manifest_keys,`open-model ${role} judgment context fields`);
      check(context.schema_version === workflow.schema_version && context.role === role && typeof context.context_id === 'string' && context.context_id.length >= 16 && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(context.started_at), `open-model ${role} judgment context identity/time drift`);
      check(workflow.routing_authority.model_policy === 'user-selected-model', 'open-model semantic judgment model selection policy drift');
      // The external route freezes the actual user-selected identity in the
      // author context. All three fresh roles retain that selection; no alias
      // or tier is selected by the checker.
      assertSelectedModelBinding(context.model, contexts[0]?.model ?? context.model, `open-model ${role} judgment context`);
      exactArray(context.isolated_from_context_ids,contexts.map((entry) => entry.context_id),`open-model ${role} judgment context isolation chain`);
      check(!contexts.some((entry) => entry.context_id === context.context_id), 'open-model semantic judgment contexts are not pairwise distinct');
      contexts.push(context);
      check(files['prompt.txt'].text === workflow.exact_prompts[role] + '\n', `open-model ${role} judgment exact canonical prompt drift`);
      const bundle = parseJsonExact(files['bundle.json'].text,`open-model ${role} judgment bundle`);
      check(files['bundle.json'].text === canonicalJson(bundle), `open-model ${role} judgment bundle is not canonical JSON`);
      exactSet(Object.keys(bundle),workflow.bundle_keys_by_role[role],`open-model ${role} judgment bundle fields`);
      const baseBundle = {schema_version:workflow.schema_version,role,protocol_sha256,raw_response_inventory_merkle_sha256:manifest.raw_response_inventory_merkle_sha256,candidate_discovery_manifest_sha256:file.hash,candidate_discovery_manifest:manifest,claim_catalog_sha256:claimCatalogSha256,claim_catalog:protocol.semantic_claim_catalog,machine_prefilter_sha256:machineFile.hash,machine_prefilter:machine,evidence_resources:evidenceResources,absence_proofs:absenceProofs};
      if (role !== 'author') Object.assign(baseBundle,{semantic_assessments_sha256:semanticFile.hash,semantic_assessments:semantic,author_receipt_sha256:receiptsByRole.get('author').hash});
      if (role === 'adjudicator') Object.assign(baseBundle,{semantic_review_sha256:reviewFile.hash,semantic_review:review,reviewer_receipt_sha256:receiptsByRole.get('reviewer').hash});
      deepEqual(bundle,baseBundle,`open-model ${role} judgment bundle exact complete model-visible inputs`);
      for (const resource of bundle.evidence_resources) {
        exactSet(Object.keys(resource),workflow.evidence_resource_keys,`open-model ${role} evidence resource fields`);
        const source = responseByReceipt.get(resource.transport_receipt_sha256);
        check(source && resource.request_url === source.record.request_url && resource.media_type === source.record.media_type && resource.body_path === source.record.body_path && resource.body_sha256 === source.bodyFile.hash && resource.bytes === source.bodyFile.bytes.length && resource.body_base64 === source.bodyFile.bytes.toString('base64'), `open-model ${role} embedded evidence resource bytes drift`);
        deepEqual(resource.transport_receipt,source.transport,`open-model ${role} embedded evidence transport receipt`);
      }
      for (const proof of bundle.absence_proofs) exactSet(Object.keys(proof),workflow.absence_proof_keys,`open-model ${role} absence proof fields`);
      const responseSchema = parseJsonExact(files['response-schema.json'].text,`open-model ${role} judgment response schema`);
      check(files['response-schema.json'].text === canonicalJson(responseSchema), `open-model ${role} judgment response schema is not canonical JSON`);
      deepEqual(responseSchema,workflow.response_schema_by_role[role],`open-model ${role} judgment exact closed response schema`);
      const routing = parseJsonExact(files['routing-manifest.json'].text,`open-model ${role} judgment routing manifest`);
      check(files['routing-manifest.json'].text === canonicalJson(routing), `open-model ${role} judgment routing manifest is not canonical JSON`);
      exactSet(Object.keys(routing),workflow.routing_manifest_keys,`open-model ${role} judgment routing fields`);
      deepEqual(routing,{schema_version:workflow.schema_version,role,context_manifest_sha256:files['context-manifest.json'].hash,prompt_sha256:files['prompt.txt'].hash,bundle_sha256:files['bundle.json'].hash,response_schema_sha256:files['response-schema.json'].hash},`open-model ${role} judgment routing byte bindings`);
      const receiptFile = files['receipt.json'];
      const seal = parseJsonExact(receiptFile.text,`open-model ${role} judgment external receipt`);
      check(receiptFile.text === canonicalJson(seal), `open-model ${role} judgment external receipt is not canonical JSON`);
      exactSet(Object.keys(seal),workflow.receipt_keys,`open-model ${role} judgment external receipt fields`);
      const upstream = role === 'author' ? 'absent' : receiptsByRole.get(role === 'reviewer' ? 'author' : 'reviewer').hash;
      const responseFile = roleResponses[role];
      check(seal.schema_version === workflow.schema_version && seal.role === role && seal.routing_manifest_sha256 === files['routing-manifest.json'].hash && seal.context_manifest_sha256 === files['context-manifest.json'].hash && seal.prompt_sha256 === files['prompt.txt'].hash && seal.bundle_sha256 === files['bundle.json'].hash && seal.response_schema_sha256 === files['response-schema.json'].hash && seal.raw_response_sha256 === responseFile.hash && seal.sealed_record_sha256 === responseFile.hash && seal.upstream_receipt_sha256_or_absent === upstream, `open-model ${role} judgment external receipt byte/upstream binding drift`);
      const computedInputBytes = files['context-manifest.json'].bytes.length + files['prompt.txt'].bytes.length + files['bundle.json'].bytes.length + files['response-schema.json'].bytes.length;
      check(seal.input_bytes === computedInputBytes && seal.input_bytes <= workflow.routing_authority.input_bytes_per_call_max && seal.output_bytes === responseFile.bytes.length && seal.output_bytes <= workflow.routing_authority.output_bytes_per_call_max, `open-model ${role} judgment routed byte budget drift`);
      receiptsByRole.set(role,receiptFile);
    }
    check(contexts[0].context_id === semantic.author_context_id && contexts[1].context_id === review.review_context_id && contexts[2].context_id === adjudication.adjudicator_context_id, 'open-model judgment response context identities do not equal their externally routed context manifests');
    check([...roleResponses.values()].reduce((sum,file) => sum + file.bytes.length,0) <= workflow.routing_authority.total_output_bytes_max, 'open-model semantic judgment total output byte budget exceeded');

    const dispositionsFile = readBounded(root, attemptPath(dispositionsContract.path,runId), 'open-model deterministic candidate dispositions', 8388608);
    const dispositions = parseJsonExact(dispositionsFile.text, 'open-model deterministic candidate dispositions');
    check(dispositionsFile.text === canonicalJson(dispositions), 'open-model candidate dispositions are not canonical JSON');
    exactSet(Object.keys(dispositions), dispositionsContract.required_top_level_keys, 'open-model candidate dispositions fields');
    check(dispositions.schema_version === dispositionsContract.schema_version && dispositions.protocol_id === protocol.protocol_id && dispositions.raw_response_inventory_merkle_sha256 === manifest.raw_response_inventory_merkle_sha256 && dispositions.machine_prefilter_sha256 === machineFile.hash && dispositions.semantic_assessments_sha256 === semanticFile.hash && dispositions.semantic_review_sha256 === reviewFile.hash && dispositions.semantic_adjudication_sha256 === adjudicationFile.hash && Array.isArray(dispositions.candidate_dispositions), 'open-model deterministic candidate dispositions upstream binding drift');
    const expectedDispositions = manifest.candidates.map((manifestCandidate) => {
      const key = manifestCandidate.candidate_id + '\0' + manifestCandidate.immutable_revision;
      const machineCandidate = machineByCandidate.get(key);
      const semanticGateRecords = machineCandidate.machine_eligible ? dispositionsContract.semantic_gate_ids.map((gateId) => {
        const authored = authorByKey.get(key + '\0' + gateId);
        const reviewed = reviewByKey.get(key + '\0' + gateId);
        const finalResult = finalSemanticByKey.get(key + '\0' + gateId);
        return {gate_id:gateId,claim_proposition:authored.claim_proposition,method:authored.method,result:finalResult,reason:reviewed.assessment_judgment === 'supported' ? authored.reason : reviewed.reason,evidence_spans:reviewed.assessment_judgment === 'supported' ? authored.evidence_spans : reviewed.evidence_spans};
      }) : [];
      const admitted = machineCandidate.machine_eligible && semanticGateRecords.every((gate) => gate.result === true);
      return {candidate_id:manifestCandidate.candidate_id,immutable_revision:manifestCandidate.immutable_revision,metadata_transport_receipt_sha256:manifestCandidate.metadata_receipt_sha256,machine_gate_records:machineCandidate.gate_records,semantic_gate_records:semanticGateRecords,evaluation_status:machineCandidate.machine_eligible ? 'machine-eligible-semantically-reviewed' : 'machine-ineligible-not-routed',disposition:admitted ? 'admitted' : 'deferred-failed-unchanged-gates'};
    });
    deepEqual(dispositions.candidate_dispositions,expectedDispositions,'open-model aggregate dispositions are not the deterministic post-adjudication projection');
    for (const candidate of dispositions.candidate_dispositions) {
      exactSet(Object.keys(candidate),dispositionsContract.candidate_record_keys,'open-model aggregate candidate disposition fields');
      for (const gate of candidate.machine_gate_records) exactSet(Object.keys(gate),dispositionsContract.machine_gate_record_keys,'open-model aggregate machine gate fields');
      for (const gate of candidate.semantic_gate_records) exactSet(Object.keys(gate),dispositionsContract.semantic_gate_record_keys,'open-model aggregate semantic gate fields');
    }
    const admittedDispositionRecords = dispositions.candidate_dispositions.filter((candidate) => candidate.disposition === 'admitted');
    const decisionContract = protocol.selection_decision_contract;
    const decisionFile = readBounded(root, attemptPath(decisionContract.path,runId), 'open-model selection decision', 1048576);
    const decision = parseJsonExact(decisionFile.text, 'open-model selection decision');
    check(decisionFile.text === canonicalJson(decision), 'open-model selection decision is not canonical JSON');
    exactSet(Object.keys(decision), decisionContract.required_keys, 'open-model selection decision fields');
    check(decision.schema_version === decisionContract.schema_version && decision.protocol_id === protocol.protocol_id && decision.stable_external_content_inventory_sha256 === manifest.stable_external_content_inventory_sha256 && decision.raw_response_inventory_merkle_sha256 === manifest.raw_response_inventory_merkle_sha256 && decision.candidate_discovery_manifest_sha256 === file.hash && decision.machine_prefilter_sha256 === machineFile.hash && decision.semantic_assessments_sha256 === semanticFile.hash && decision.candidate_dispositions_sha256 === dispositionsFile.hash && decision.semantic_review_sha256 === reviewFile.hash && decision.semantic_adjudication_sha256 === adjudicationFile.hash && decisionContract.dispositions.includes(decision.disposition), 'open-model selection decision identity/upstream/disposition drift');
    if (admittedDispositionRecords.length === 0) check(decision.disposition === 'blocked-no-admissible-candidate' && decision.selected_candidate_or_absent === 'absent', 'open-model no-admissible decision drift');
    else if (admittedDispositionRecords.length > 1) check(decision.disposition === 'blocked-multiple-admissible-candidates' && decision.selected_candidate_or_absent === 'absent', 'open-model multiple-admissible decision must block without silently downgrading a passing candidate');
    else {
      check(decision.disposition === 'provisionally-selected-for-acquisition' && isRecord(decision.selected_candidate_or_absent), 'open-model sole-admissible decision does not provisionally select exactly one candidate for N3 admission');
      deepEqual(decision.selected_candidate_or_absent,{candidate_id:admittedDispositionRecords[0].candidate_id,immutable_revision:admittedDispositionRecords[0].immutable_revision},'open-model selected decision identity');
    }
    return {manifest,responseByReceipt,responseByBodyPath,metadataPublicationFile:publicationFile,rawInventoryPaths:[...rawInventoryPaths],machine,machineFile,semantic,semanticFile,dispositions,dispositionsFile,review,reviewFile,adjudication,adjudicationFile,workflowFiles,decision,decisionFile};
  }
  function validateSelectionPublication(validatedManifest, machineHash, evidenceHash, selectionHash, runId) {
    const publicationContract = protocol.selection_publication_contract;
    const publicationFile = readBounded(root, attemptPath(publicationContract.path,runId), 'open-model selection publication receipt', 262144);
    const publication = parseJsonExact(publicationFile.text, 'open-model selection publication receipt');
    check(publicationFile.text === canonicalJson(publication), 'open-model selection publication receipt is not canonical JSON');
    exactSet(Object.keys(publication), publicationContract.required_keys, 'open-model selection publication receipt fields');
    check(publication.schema_version === publicationContract.schema_version && publication.protocol_id === protocol.protocol_id && /^[0-9a-f]{64}$/.test(publication.canonical_inventory_sha256) && /^[0-9a-f]{64}$/.test(publication.semantic_output_inventory_sha256), 'open-model selection publication identity/hash fields invalid');
    const judgmentPublicationPath = attemptPath(protocol.semantic_judgment_workflow.routing_publication.receipt,runId);
    const judgmentPublicationFile = readBounded(root,judgmentPublicationPath,'open-model judgment publication receipt',1048576);
    const judgmentPublication = parseJsonExact(judgmentPublicationFile.text,'open-model judgment publication receipt');
    check(judgmentPublicationFile.text === canonicalJson(judgmentPublication), 'open-model judgment publication receipt is not canonical JSON');
    exactSet(Object.keys(judgmentPublication),protocol.semantic_judgment_workflow.routing_publication.required_fields,'open-model judgment publication fields');
    const judgmentCachePaths = [...validatedManifest.workflowFiles,validatedManifest.semanticFile,validatedManifest.reviewFile,validatedManifest.adjudicationFile].map((entry) => relative(root,entry.path)).sort((a,b) => Buffer.from(a).compare(Buffer.from(b)));
    const judgmentCacheInventorySha256 = inventoryRoot(judgmentCachePaths,'open-model judgment cache inventory');
    check(judgmentPublication.schema_version === 1 && judgmentPublication.protocol_id === protocol.protocol_id && judgmentPublication.metadata_publication_receipt_sha256 === validatedManifest.metadataPublicationFile.hash && judgmentPublication.stable_external_content_inventory_sha256 === validatedManifest.manifest.stable_external_content_inventory_sha256 && judgmentPublication.cache_entry_sha256 === judgmentCacheInventorySha256 && judgmentPublication.cache_entry_path === `.build/artifact-cache/functional-v1/sha256/${judgmentPublication.cache_entry_sha256}/payload` && judgmentPublication.canonical_inventory_sha256 === judgmentCacheInventorySha256 && judgmentPublication.fsync_complete === true && judgmentPublication.atomic_rename_complete === true, 'open-model judgment publication upstream/cache-inventory/path/atomic identity drift');
    check(publication.metadata_publication_receipt_sha256 === validatedManifest.metadataPublicationFile.hash && publication.stable_external_content_inventory_sha256 === validatedManifest.manifest.stable_external_content_inventory_sha256 && publication.judgment_publication_receipt_sha256 === judgmentPublicationFile.hash && publication.raw_response_inventory_merkle_sha256 === validatedManifest.manifest.raw_response_inventory_merkle_sha256 && publication.candidate_discovery_manifest_sha256 === sha256(Buffer.from(canonicalJson(validatedManifest.manifest))) && publication.machine_prefilter_sha256 === validatedManifest.machineFile.hash && publication.semantic_assessments_sha256 === validatedManifest.semanticFile.hash && publication.candidate_dispositions_sha256 === validatedManifest.dispositionsFile.hash && publication.semantic_review_sha256 === validatedManifest.reviewFile.hash && publication.semantic_adjudication_sha256 === validatedManifest.adjudicationFile.hash && publication.selection_decision_sha256 === validatedManifest.decisionFile.hash, 'open-model selection publication does not bind exact metadata/judgment/manifest/machine/author/review/adjudication/disposition/decision bytes');
    check(publication.machine_gate_derivation_sha256_or_absent === machineHash && publication.evidence_admission_sha256_or_absent === evidenceHash && publication.selection_receipt_sha256_or_absent === selectionHash && publication.disposition === validatedManifest.decision.disposition, 'open-model selection publication conditional artifact/disposition binding drift');
    const publicationPath = attemptPath(publicationContract.path,runId);
    const expectedFiles = [
      ...validatedManifest.rawInventoryPaths,
      attemptPath(protocol.candidate_manifest,runId),
      attemptPath(protocol.raw_response_publication_contract.publication_receipt,runId),
      attemptPath(protocol.machine_prefilter_contract.path,runId),
      attemptPath(protocol.semantic_assessments_contract.path,runId),
      attemptPath(protocol.candidate_dispositions_contract.path,runId),
      attemptPath(protocol.semantic_review_contract.path,runId),
      attemptPath(protocol.semantic_adjudication_contract.path,runId),
      attemptPath(protocol.selection_decision_contract.path,runId),
      judgmentPublicationPath,
      publicationPath
    ];
    for (const role of protocol.semantic_judgment_workflow.roles) {
      const roleRoot = attemptPath(protocol.semantic_judgment_workflow.role_roots[role],runId);
      for (const name of protocol.semantic_judgment_workflow.artifact_names) expectedFiles.push(`${roleRoot}/${name}`);
    }
    if (machineHash !== 'absent') expectedFiles.push(attemptPath(protocol.machine_derivation_contract.path,runId));
    if (evidenceHash !== 'absent') expectedFiles.push(attemptPath(protocol.evidence_admission_contract.path,runId));
    const tree = listAttemptTree(runId);
    const rawRoot = attemptPath(protocol.raw_response_publication_contract.root,runId);
    const metadataRoot = dirname(rawRoot);
    const semanticRoot = dirname(publicationPath);
    const judgmentRoot = semanticRoot + '/judgments';
    exactSet(tree.directories,[metadataRoot,rawRoot,semanticRoot,judgmentRoot,...protocol.semantic_judgment_workflow.roles.map((role) => attemptPath(protocol.semantic_judgment_workflow.role_roots[role],runId))], 'open-model semantic attempt directory inventory');
    exactSet(tree.files,expectedFiles, 'open-model semantic attempt exact file inventory');
    const semanticInventoryPaths = expectedFiles.filter((path) => path.startsWith(semanticRoot + '/') && path !== publicationPath);
    check(publication.semantic_output_inventory_sha256 === inventoryRoot(semanticInventoryPaths,'open-model semantic subtree output inventory') && publication.canonical_inventory_sha256 === inventoryRoot(expectedFiles.filter((path) => path !== publicationPath),'open-model complete attempt publication inventory'), 'open-model selection publication semantic/complete inventory root drift');
    check(publication.fsync_complete === true && publication.atomic_rename_complete === true, 'open-model selection publication is not fsync/atomic-rename complete');
    return publicationFile;
  }
  function validateTechnicalResourceBlock(run) {
    const technicalContract = protocol.technical_resource_block_contract;
    const technicalPath = attemptPath(technicalContract.path,run.run_id);
    const technicalFile = readBounded(root,technicalPath,'open-model technical-resource block receipt',1048576);
    const technical = parseJsonExact(technicalFile.text,'open-model technical-resource block receipt');
    check(technicalFile.text === canonicalJson(technical), 'open-model technical-resource block receipt is not canonical JSON');
    exactSet(Object.keys(technical),technicalContract.required_fields,'open-model technical-resource block receipt fields');
    check(technical.schema_version === 1 && technical.protocol_id === protocol.protocol_id && technical.attempt_run_id === run.run_id && technical.disposition === technicalContract.disposition, 'open-model technical-resource block identity/disposition drift');
    check(technicalContract.completed_phases.includes(technical.completed_phase_or_absent) && technicalContract.failure_kinds.includes(technical.failure_kind), 'open-model technical-resource block phase/failure kind invalid');
    check((typeof technical.frozen_limit === 'number' || typeof technical.frozen_limit === 'string') && (typeof technical.observed_value === 'number' || typeof technical.observed_value === 'string'), 'open-model technical-resource block limit/observed value invalid');
    check(technical.last_complete_request_identity_or_absent === 'absent' || (isRecord(technical.last_complete_request_identity_or_absent) && typeof technical.last_complete_request_identity_or_absent.request_url === 'string' && /^[0-9a-f]{64}$/.test(technical.last_complete_request_identity_or_absent.transport_receipt_sha256)), 'open-model technical-resource block last request identity invalid');
    for (const field of ['stable_external_content_inventory_sha256_or_absent','transport_inventory_sha256_or_absent','metadata_publication_receipt_sha256_or_absent']) check(technical[field] === 'absent' || /^[0-9a-f]{64}$/.test(technical[field]), 'open-model technical-resource block invalid ' + field);
    check(technical.no_candidate_gate_dispositions === true && technical.no_weight_payload === true && technical.semantic_subtree_absent === true && technical.selection_receipt_absent === true && typeof technical.retry_disposition === 'string' && technical.retry_disposition.length > 0 && technical.fsync_complete === true && technical.atomic_rename_complete === true, 'open-model technical-resource block improperly claims semantic/payload/selection authority or lacks terminal publication proof');
    const tree = listAttemptTree(run.run_id);
    check(tree.exists && tree.files.includes(technicalPath), 'open-model technical-resource block terminal marker missing from exact attempt tree');
    const semanticRoot = dirname(attemptPath(protocol.selection_decision_contract.path,run.run_id));
    check(!tree.directories.includes(semanticRoot) && !tree.files.some((path) => path.startsWith(semanticRoot + '/')), 'open-model technical-resource block contains a semantic subtree');
    const metadataManifestPath = attemptPath(protocol.candidate_manifest,run.run_id);
    const metadataPublicationPath = attemptPath(protocol.raw_response_publication_contract.publication_receipt,run.run_id);
    const judgmentPath = attemptPath(protocol.semantic_judgment_workflow.routing_publication.receipt,run.run_id);
    const metadataPresent = tree.files.includes(metadataManifestPath) || tree.files.includes(metadataPublicationPath);
    const judgmentPresent = tree.files.includes(judgmentPath);
    let expectedFiles = [technicalPath];
    let expectedDirectories = [];
    if (metadataPresent) {
      check(tree.files.includes(metadataManifestPath) && tree.files.includes(metadataPublicationPath), 'open-model technical block has a partial metadata commit');
      const metadataFile = readBounded(root,metadataManifestPath,'open-model technical-block metadata manifest',8388608);
      const validated = validateManifest(metadataFile,run.run_id,true);
      check(technical.metadata_publication_receipt_sha256_or_absent === validated.metadataPublicationFile.hash && technical.stable_external_content_inventory_sha256_or_absent === validated.manifest.stable_external_content_inventory_sha256 && technical.transport_inventory_sha256_or_absent === validated.manifest.raw_response_inventory_merkle_sha256, 'open-model technical block does not bind the exact immutable metadata commit');
      expectedFiles.push(...validated.rawInventoryPaths,metadataManifestPath,metadataPublicationPath);
      const rawRoot = attemptPath(protocol.raw_response_publication_contract.root,run.run_id);
      expectedDirectories = [dirname(rawRoot),rawRoot];
    } else check(technical.metadata_publication_receipt_sha256_or_absent === 'absent' && technical.stable_external_content_inventory_sha256_or_absent === 'absent' && technical.transport_inventory_sha256_or_absent === 'absent' && technical.retry_disposition === technicalContract.retry_dispositions.pre_or_mid_fetch, 'open-model pre/mid-fetch technical block claims unpublished metadata evidence or permits an unauthorized new-run retry');
    if (metadataPresent) check(technical.retry_disposition === technicalContract.retry_dispositions.metadata_or_judgment_complete, 'metadata-complete technical block lacks the changed-stable-external-content retry rule');
    if (judgmentPresent) {
      check(metadataPresent, 'open-model technical block publishes judgments without immutable metadata');
      const judgmentFile = readBounded(root,judgmentPath,'open-model technical-block judgment publication',1048576);
      const judgment = parseJsonExact(judgmentFile.text,'open-model technical-block judgment publication');
      check(judgmentFile.text === canonicalJson(judgment), 'open-model technical-block judgment publication is not canonical JSON');
      exactSet(Object.keys(judgment),protocol.semantic_judgment_workflow.routing_publication.required_fields,'open-model technical-block judgment publication fields');
      check(judgment.schema_version === 1 && judgment.protocol_id === protocol.protocol_id && /^[0-9a-f]{64}$/.test(judgment.cache_entry_sha256) && judgment.cache_entry_path === `.build/artifact-cache/functional-v1/sha256/${judgment.cache_entry_sha256}/payload` && /^[0-9a-f]{64}$/.test(judgment.canonical_inventory_sha256) && judgment.fsync_complete === true && judgment.atomic_rename_complete === true, 'open-model technical-block judgment publication identity/cache-path/atomicity drift');
      expectedFiles.push(judgmentPath);
    }
    exactSet(tree.files,expectedFiles,'open-model technical-resource block exact attempt file inventory');
    exactSet(tree.directories,expectedDirectories,'open-model technical-resource block exact attempt directory inventory');
    check(technical.canonical_attempt_inventory_sha256 === inventoryRoot(expectedFiles.filter((path) => path !== technicalPath),'open-model technical block prior committed attempt inventory'), 'open-model technical block canonical attempt inventory hash drift');
    const artifactByPath = new Map(run.artifacts.map((artifact) => [artifact.path,artifact.sha256]));
    for (const path of expectedFiles) check(artifactByPath.get(path) === hashRegularFile(resolve(root,path)).sha256, 'open-model technical block run does not hash-bind exact durable evidence ' + path);
    return {technicalFile,technical};
  }
  if (step.runs.length > 0) validateSelectionFingerprints(root, step, constants);
  const nonterminalAttemptsToClassify = ['pending','running'].includes(step.status) ? step.runs : step.runs.slice(0,-1);
  for (const run of nonterminalAttemptsToClassify) {
    const isCurrentRunning = step.status === 'running' && run === step.runs.at(-1);
    check(isCurrentRunning ? run.status === 'running' : ['failed','interrupted'].includes(run.status), 'nonterminal model-selection attempt must be the current running attempt or a stopped technical/no-admission attempt');
    const artifacts = new Map(run.artifacts.map((artifact) => [artifact.path,artifact.sha256]));
    const tree = listAttemptTree(run.run_id);
    const attemptPrefix = attemptRootFor(run.run_id) + '/';
    const attemptArtifacts = run.artifacts.filter((artifact) => artifact.path.startsWith(attemptPrefix));
    if (!tree.exists) {
      check(attemptArtifacts.length === 0, 'pre/mid-fetch model-selection failure records canonical attempt evidence without an atomically published attempt root');
      continue;
    }
    for (const artifact of attemptArtifacts) {
      check(tree.files.includes(artifact.path), 'model-selection run records an unrecognized/nonregular attempt artifact ' + artifact.path);
      check(hashRegularFile(resolve(root,artifact.path)).sha256 === artifact.sha256, 'model-selection stopped-attempt artifact hash drift ' + artifact.path);
    }
    const technicalPath = attemptPath(protocol.technical_resource_block_contract.path,run.run_id);
    if (tree.files.includes(technicalPath)) {
      check(!isCurrentRunning, 'running model-selection attempt exposes a terminal technical-resource block receipt');
      validateTechnicalResourceBlock(run);
      check(!(step.status === 'pending' && run === step.runs.at(-1)), 'terminal technical-resource block cannot leave model selection pending/eligible');
      continue;
    }
    const manifestPath = attemptPath(protocol.candidate_manifest,run.run_id);
    const metadataPublicationPath = attemptPath(protocol.raw_response_publication_contract.publication_receipt,run.run_id);
    const semanticPaths = [attemptPath(protocol.candidate_dispositions_contract.path,run.run_id),attemptPath(protocol.selection_decision_contract.path,run.run_id),attemptPath(protocol.selection_publication_contract.path,run.run_id)];
    const semanticPresence = semanticPaths.map((path) => artifacts.has(path));
    check(artifacts.has(manifestPath) && artifacts.has(metadataPublicationPath), 'published model-selection attempt root lacks the exact metadata manifest/publication artifact bindings');
    const manifestFile = readBounded(root, manifestPath, 'prior model-selection discovery manifest', 8388608);
    if (semanticPresence.every((present) => !present)) {
      const metadataAttempt = validateManifest(manifestFile,run.run_id,true);
      check(artifacts.get(manifestPath) === manifestFile.hash && artifacts.get(metadataPublicationPath) === metadataAttempt.metadataPublicationFile.hash, 'metadata-complete/semantic-failed model-selection run does not preserve exact immutable metadata evidence');
      const fingerprint = run.input_fingerprint.selection_external_state;
      check(fingerprint.raw_response_inventory_merkle_sha256 === metadataAttempt.manifest.raw_response_inventory_merkle_sha256 && fingerprint.candidate_discovery_manifest_sha256 === manifestFile.hash && fingerprint.admission_receipt_sha256_or_absent === 'absent', 'metadata-complete/semantic-failed model-selection fingerprint drift');
      continue;
    }
    check(!isCurrentRunning, 'running model-selection attempt published a semantic result without its atomic lifecycle transition');
    check(semanticPresence.every(Boolean), 'prior technical model-selection failure published a partial canonical semantic result');
    const validatedManifest = validateManifest(manifestFile,run.run_id);
    check(artifacts.get(manifestPath) === manifestFile.hash && artifacts.get(metadataPublicationPath) === validatedManifest.metadataPublicationFile.hash && artifacts.get(attemptPath(protocol.machine_prefilter_contract.path,run.run_id)) === validatedManifest.machineFile.hash && artifacts.get(attemptPath(protocol.semantic_assessments_contract.path,run.run_id)) === validatedManifest.semanticFile.hash && artifacts.get(attemptPath(protocol.candidate_dispositions_contract.path,run.run_id)) === validatedManifest.dispositionsFile.hash && artifacts.get(attemptPath(protocol.semantic_review_contract.path,run.run_id)) === validatedManifest.reviewFile.hash && artifacts.get(attemptPath(protocol.semantic_adjudication_contract.path,run.run_id)) === validatedManifest.adjudicationFile.hash && artifacts.get(attemptPath(protocol.selection_decision_contract.path,run.run_id)) === validatedManifest.decisionFile.hash, 'prior model-selection run does not preserve exact immutable attempt evidence');
    check(['blocked-no-admissible-candidate','blocked-multiple-admissible-candidates'].includes(validatedManifest.decision.disposition), 'a nonterminal prior model-selection attempt claims selection/admission');
    const publicationFile = validateSelectionPublication(validatedManifest,'absent','absent','absent',run.run_id);
    check(artifacts.get(attemptPath(protocol.selection_publication_contract.path,run.run_id)) === publicationFile.hash, 'prior model-selection run does not preserve its exact immutable final publication receipt');
    check(!(step.status === 'pending' && run === step.runs.at(-1)), 'terminal semantic blocked result cannot leave model selection pending/eligible');
  }
  if (step.status === 'completed') {
    const finalRun = step.runs.at(-1);
    check(receiptPresent, 'completed model-selection step requires its canonical admission receipt');
    const file = readBounded(root, receiptPath, 'open-model selection receipt', 2097152);
    const receipt = parseJsonExact(file.text, 'open-model selection receipt');
    check(file.text === canonicalJson(receipt), 'open-model selection receipt is not canonical JSON');
    exactSet(Object.keys(receipt),contract.required_top_level_fields,'open-model selection receipt fields');
    check(receipt.schema_version === contract.schema_version && receipt.protocol_id === protocol.protocol_id && receipt.selected === true && receipt.disposition === contract.disposition && receipt.selected_attempt_run_id === finalRun.run_id && receipt.payload_bytes_downloaded === 0, 'open-model provisional selection receipt identity/result/run/payload authority drift');
    check(receipt.seed_registry_sha256 === sha256(Buffer.from(JSON.stringify(constants.open_model_candidate_registry.candidates))) && receipt.admission_protocol_sha256 === sha256(Buffer.from(JSON.stringify(protocol))) && receipt.accepted_resource_contract_sha256 === constants.accepted_inputs.resource_contract_sha256 && receipt.query_inventory_sha256 === sha256(Buffer.from(JSON.stringify(protocol.discovery_queries))), 'open-model selection receipt immutable input binding drift');
    const manifestPath = attemptPath(protocol.candidate_manifest,finalRun.run_id);
    const manifestFile = readBounded(root, manifestPath, 'open-model candidate discovery manifest', 8388608);
    const validatedManifest = validateManifest(manifestFile,finalRun.run_id);
    const manifest = validatedManifest.manifest;
    const metadataPublication = parseJsonExact(validatedManifest.metadataPublicationFile.text,'open-model selected metadata publication receipt');
    const expectedMetadataPublicationPath = attemptPath(protocol.raw_response_publication_contract.publication_receipt,finalRun.run_id);
    check(receipt.candidate_discovery_manifest_sha256 === manifestFile.hash && receipt.raw_response_inventory_merkle_sha256 === manifest.raw_response_inventory_merkle_sha256 && receipt.stable_external_content_inventory_sha256 === manifest.stable_external_content_inventory_sha256 && receipt.metadata_publication_receipt_path === expectedMetadataPublicationPath && receipt.metadata_publication_receipt_sha256 === validatedManifest.metadataPublicationFile.hash && receipt.metadata_cache_entry_sha256 === metadataPublication.cache_entry_sha256 && receipt.cache_entry_sha256 === metadataPublication.cache_entry_sha256 && receipt.cache_entry_path === metadataPublication.cache_entry_path, 'open-model provisional selection response/manifest/stable-content/metadata-cache binding drift');
    const admittedCandidates = validatedManifest.dispositions.candidate_dispositions.filter((candidate) => candidate.disposition === 'admitted');
    check(validatedManifest.decision.disposition === 'provisionally-selected-for-acquisition' && receipt.disposition === contract.disposition && admittedCandidates.length === 1 && admittedCandidates[0].candidate_id === receipt.candidate.candidate_id && admittedCandidates[0].immutable_revision === receipt.candidate.immutable_model_revision, 'open-model provisional selection receipt does not match the sole admitted discovery candidate/N1 disposition');
    const evidenceContract = protocol.evidence_admission_contract;
    const evidencePath = attemptPath(evidenceContract.path,finalRun.run_id);
    const evidenceFile = readBounded(root, evidencePath, 'open-model candidate evidence admission', 2097152);
    check(receipt.evidence_admission_sha256 === evidenceFile.hash, 'open-model selected receipt does not bind the exact evidence-admission bytes');
    const evidenceAdmission = parseJsonExact(evidenceFile.text, 'open-model candidate evidence admission');
    check(evidenceFile.text === canonicalJson(evidenceAdmission), 'open-model candidate evidence admission is not canonical JSON');
    exactSet(Object.keys(evidenceAdmission), evidenceContract.required_top_level_keys, 'open-model candidate evidence admission fields');
    check(evidenceAdmission.schema_version === evidenceContract.schema_version && evidenceAdmission.protocol_id === protocol.protocol_id && evidenceAdmission.candidate_id === receipt.candidate.candidate_id && evidenceAdmission.immutable_revision === receipt.candidate.immutable_model_revision && evidenceAdmission.raw_response_inventory_merkle_sha256 === manifest.raw_response_inventory_merkle_sha256 && evidenceAdmission.verdict === 'admitted', 'open-model candidate evidence admission identity/verdict drift');
    check(evidenceAdmission.semantic_review_receipt_path === attemptPath(protocol.semantic_review_contract.path,finalRun.run_id) && evidenceAdmission.semantic_review_receipt_sha256 === validatedManifest.reviewFile.hash && evidenceAdmission.semantic_adjudication_receipt_path === attemptPath(protocol.semantic_adjudication_contract.path,finalRun.run_id) && evidenceAdmission.semantic_adjudication_receipt_sha256 === validatedManifest.adjudicationFile.hash, 'open-model candidate evidence admission does not bind exact independent review/adjudication bytes');
    check(Array.isArray(evidenceAdmission.semantic_gate_reviews), 'open-model semantic gate reviews missing');
    exactSet(evidenceAdmission.semantic_gate_reviews.map((record) => record.gate_id), evidenceContract.required_semantic_gates, 'open-model semantic evidence gate set');
    const semanticGateResults = new Map();
    const semanticGateSpanReceipts = new Map();
    for (const gate of evidenceAdmission.semantic_gate_reviews) {
      exactSet(Object.keys(gate), evidenceContract.gate_record_keys, 'open-model semantic gate record fields');
      const claim = protocol.semantic_claim_catalog[gate.gate_id];
      check(claim && gate.claim_proposition === claim.proposition && gate.method === claim.method && gate.result === true && Array.isArray(gate.evidence_spans) && gate.evidence_spans.length > 0, 'open-model semantic gate lacks its frozen supported exact-evidence judgment ' + gate.gate_id);
      const authoredCandidate = validatedManifest.semantic.candidate_assessments.find((candidate) => candidate.candidate_id === receipt.candidate.candidate_id && candidate.immutable_revision === receipt.candidate.immutable_model_revision);
      const authored = authoredCandidate?.gate_records.find((record) => record.gate_id === gate.gate_id);
      const reviewed = validatedManifest.review.assessments.find((assessment) => assessment.candidate_id === receipt.candidate.candidate_id && assessment.immutable_revision === receipt.candidate.immutable_model_revision && assessment.gate_id === gate.gate_id);
      const adjudicated = validatedManifest.adjudication.judgments.find((judgment) => judgment.candidate_id === receipt.candidate.candidate_id && judgment.immutable_revision === receipt.candidate.immutable_model_revision && judgment.gate_id === gate.gate_id);
      check(authored && reviewed && adjudicated && adjudicated.judgment === 'supported' && adjudicated.final_result === true && authored.claim_proposition === gate.claim_proposition && authored.method === gate.method, 'open-model semantic gate is not the exact author/reviewer/adjudicator result ' + gate.gate_id);
      deepEqual(gate.evidence_spans,reviewed.assessment_judgment === 'supported' ? authored.evidence_spans : reviewed.evidence_spans,'open-model semantic gate final reviewed evidence spans ' + gate.gate_id);
      for (const span of gate.evidence_spans) {
        exactSet(Object.keys(span), evidenceContract.span_record_keys, 'open-model semantic evidence span fields');
        const source = validatedManifest.responseByReceipt.get(span.transport_receipt_sha256);
        check(source && source.record.body_path === span.body_path && source.bodyFile.hash === span.body_sha256 && source.transportFile.hash === span.transport_receipt_sha256, 'open-model semantic evidence span source is not in the exact raw-response inventory');
        check(Number.isSafeInteger(span.start_byte) && Number.isSafeInteger(span.end_byte) && span.start_byte >= 0 && span.end_byte > span.start_byte && span.end_byte <= source.bodyFile.bytes.length && span.end_byte - span.start_byte <= 4096, 'open-model semantic evidence span bounds invalid');
        check(sha256(source.bodyFile.bytes.subarray(span.start_byte,span.end_byte)) === span.excerpt_sha256 && span.claim_id === `MODEL-GATE-${String(protocol.candidate_dispositions_contract.gate_ids.indexOf(gate.gate_id) + 1).padStart(2,'0')}`, 'open-model semantic evidence span hash/claim identity drift');
      }
      semanticGateResults.set(gate.gate_id, gate.result);
      semanticGateSpanReceipts.set(gate.gate_id, [...new Set(gate.evidence_spans.map((span) => span.transport_receipt_sha256))]);
    }
    const machineContract = protocol.machine_derivation_contract;
    const machinePath = attemptPath(machineContract.path,finalRun.run_id);
    check(evidenceAdmission.machine_derivation_receipt_path === machinePath, 'open-model machine derivation path drift');
    const machineFile = readBounded(root, machinePath, 'open-model machine gate derivation', 2097152);
    check(machineFile.hash === evidenceAdmission.machine_derivation_receipt_sha256, 'open-model machine derivation hash drift');
    const machineDerivation = parseJsonExact(machineFile.text, 'open-model machine gate derivation');
    check(machineFile.text === canonicalJson(machineDerivation), 'open-model machine derivation is not canonical JSON');
    exactSet(Object.keys(machineDerivation), machineContract.required_keys, 'open-model machine derivation fields');
    check(machineDerivation.schema_version === machineContract.schema_version && machineDerivation.derivation_version === machineContract.derivation_version && machineDerivation.protocol_id === protocol.protocol_id && machineDerivation.candidate_id === receipt.candidate.candidate_id && machineDerivation.immutable_revision === receipt.candidate.immutable_model_revision, 'open-model machine derivation identity drift');
    const configSource = validatedManifest.responseByReceipt.get(machineDerivation.config_transport_receipt_sha256);
    const tokenizerSource = validatedManifest.responseByReceipt.get(machineDerivation.tokenizer_transport_receipt_sha256);
    const tokenizerConfigSource = validatedManifest.responseByReceipt.get(machineDerivation.tokenizer_config_transport_receipt_sha256);
    const specialTokensSource = validatedManifest.responseByReceipt.get(machineDerivation.special_tokens_transport_receipt_sha256);
    check(configSource && configSource.record.body_path === machineDerivation.config_body_path && configSource.bodyFile.hash === machineDerivation.config_body_sha256 && configSource.transportFile.hash === machineDerivation.config_transport_receipt_sha256, 'open-model machine config source is not exact published evidence');
    check(tokenizerSource && tokenizerSource.record.body_path === machineDerivation.tokenizer_body_path && tokenizerSource.bodyFile.hash === machineDerivation.tokenizer_body_sha256 && tokenizerSource.transportFile.hash === machineDerivation.tokenizer_transport_receipt_sha256, 'open-model machine tokenizer source is not exact published evidence');
    check(tokenizerConfigSource && tokenizerConfigSource.record.body_path === machineDerivation.tokenizer_config_body_path && tokenizerConfigSource.bodyFile.hash === machineDerivation.tokenizer_config_body_sha256 && tokenizerConfigSource.transportFile.hash === machineDerivation.tokenizer_config_transport_receipt_sha256, 'open-model machine tokenizer-config source is not exact published evidence');
    check(specialTokensSource && specialTokensSource.record.body_path === machineDerivation.special_tokens_body_path && specialTokensSource.bodyFile.hash === machineDerivation.special_tokens_body_sha256 && specialTokensSource.transportFile.hash === machineDerivation.special_tokens_transport_receipt_sha256, 'open-model machine special-tokens source is not exact published evidence');
    const exactConfig = parseJsonExact(configSource.bodyFile.text, 'open-model exact selected config');
    const exactTokenizer = parseJsonExact(tokenizerSource.bodyFile.text, 'open-model exact selected tokenizer');
    const exactTokenizerConfig = parseJsonExact(tokenizerConfigSource.bodyFile.text, 'open-model exact selected tokenizer config');
    const exactSpecialTokens = parseJsonExact(specialTokensSource.bodyFile.text, 'open-model exact selected special-token map');
    exactSet(Object.keys(receipt.gate_results), contract.required_gate_results, 'open-model selection exact gate result set');
    for (const gate of contract.required_gate_results) {
      check(receipt.gate_results[gate] === true, 'open-model selection gate not passed: ' + gate);
      if (semanticGateResults.has(gate)) check(receipt.gate_results[gate] === semanticGateResults.get(gate), 'open-model selection semantic gate is not derived from evidence admission: ' + gate);
    }
    check(isRecord(receipt.candidate), 'open-model selection candidate record missing');
    for (const field of contract.candidate_required_fields) check(Object.hasOwn(receipt.candidate, field) && receipt.candidate[field] !== null && receipt.candidate[field] !== '', 'open-model selection candidate missing ' + field);
    check(/^[0-9a-f]{40}$/.test(receipt.candidate.immutable_model_revision), 'open-model selected revision must be immutable 40-hex');
    const evidenceSchema = contract.candidate_evidence_schema;
    const exactRecord = (record, keys, label) => { check(isRecord(record), label + ' must be a record'); exactSet(Object.keys(record), keys, label + ' keys'); };
    const responseFor = (receiptSha256, label) => {
      check(/^[0-9a-f]{64}$/.test(receiptSha256) && validatedManifest.responseByReceipt.has(receiptSha256), label + ' is not an exact published raw-response transport receipt');
      return validatedManifest.responseByReceipt.get(receiptSha256);
    };
    const selectedCandidateId = receipt.candidate.candidate_id;
    const selectedRevision = receipt.candidate.immutable_model_revision;
    const selectedApiUrl = `https://huggingface.co/api/models/${selectedCandidateId}/revision/${selectedRevision}?blobs=true`;
    const selectedHfFileUrl = (path, revision = selectedRevision) => `https://huggingface.co/${selectedCandidateId}/resolve/${revision}/${path}`;
    check(receipt.candidate.official_repository_url === 'https://huggingface.co/' + receipt.candidate.candidate_id, 'open-model selected official repository identity drift');
    check(configSource.record.request_url === selectedHfFileUrl('config.json') && tokenizerSource.record.request_url === selectedHfFileUrl('tokenizer.json') && tokenizerConfigSource.record.request_url === selectedHfFileUrl('tokenizer_config.json') && specialTokensSource.record.request_url === selectedHfFileUrl('special_tokens_map.json'), 'open-model machine config/tokenizer evidence belongs to another candidate or revision');
    check(Array.isArray(receipt.candidate.consumed_file_paths_sizes_sha256) && receipt.candidate.consumed_file_paths_sizes_sha256.length > 0, 'open-model selected consumed-file evidence missing');
    for (const record of receipt.candidate.consumed_file_paths_sizes_sha256) {
      exactRecord(record, evidenceSchema.consumed_file_record_keys, 'open-model selected consumed file');
      check(record.revision === selectedRevision && Number.isSafeInteger(record.bytes) && record.bytes >= 0 && /^[0-9a-f]{64}$/.test(record.sha256) && /^[0-9a-f]{64}$/.test(record.response_inventory_sha256), 'open-model selected consumed-file immutable identity invalid');
      check(protocol.hf_metadata_file_allowlist.includes(record.path), 'open-model selected consumed-file path is outside the exact metadata allowlist');
      check(record.requested_url === `https://huggingface.co/${receipt.candidate.candidate_id}/resolve/${record.revision}/${record.path}` && !record.path.includes('..') && !record.path.startsWith('/'), 'open-model selected consumed-file path/URL drift');
      const consumedSource = responseFor(record.response_inventory_sha256, 'open-model selected consumed-file evidence');
      check(consumedSource.record.request_url === record.requested_url && consumedSource.record.sha256 === record.sha256 && consumedSource.record.expanded_bytes === record.bytes, 'open-model selected consumed-file fields disagree with raw response bytes');
    }
    exactRecord(receipt.candidate.retained_license_text_path_sha256_and_scope, evidenceSchema.license_record_keys, 'open-model selected license evidence');
    const license = receipt.candidate.retained_license_text_path_sha256_and_scope;
    check(license.revision === selectedRevision && protocol.hf_metadata_file_allowlist.includes(license.path) && /^[0-9a-f]{64}$/.test(license.sha256) && Number.isSafeInteger(license.bytes) && license.bytes > 0 && typeof license.spdx === 'string' && license.spdx.length > 0 && license.redistribution_and_training_grant === true && typeof license.scope === 'string' && license.scope.length > 0, 'open-model selected license grant evidence invalid');
    const licenseSource = responseFor(license.evidence_transport_receipt_sha256, 'open-model selected license evidence');
    check(licenseSource.record.sha256 === license.sha256 && licenseSource.record.expanded_bytes === license.bytes && licenseSource.record.request_url === selectedHfFileUrl(license.path), 'open-model selected license fields disagree with exact retained candidate/revision bytes');
    exactRecord(receipt.candidate.architecture_config, evidenceSchema.architecture_record_keys, 'open-model selected architecture config');
    const architecture = receipt.candidate.architecture_config;
    check(architecture.model_family === 'causal-autoregressive-decoder-only-text' && architecture.causal === true && architecture.decoder_only === true && architecture.text_only === true && architecture.bias_free === true && architecture.linear_bias === false && architecture.norm_bias === false, 'open-model selected architecture is not the sole bias-free causal text decoder');
    for (const field of ['vocabulary','d_model','layers','query_heads','kv_heads','d_ff','context']) check(Number.isSafeInteger(architecture[field]) && architecture[field] > 0, 'open-model selected architecture invalid ' + field);
    check(architecture.d_model % architecture.query_heads === 0 && (architecture.d_model / architecture.query_heads) % 2 === 0 && architecture.query_heads % architecture.kv_heads === 0, 'open-model selected architecture head/GQA/RoPE divisibility incompatibility');
    check(architecture.activation === 'SwiGLU' && architecture.norm === 'RMSNorm' && typeof architecture.rms_norm_epsilon === 'number' && architecture.rms_norm_epsilon > 0 && architecture.position === 'RoPE' && typeof architecture.rope_theta === 'number' && architecture.rope_theta > 0 && architecture.causal_mask === 'strict-causal' && architecture.input_embedding_count === 1 && architecture.tied_embeddings === true && architecture.output_head_tied === true && ['float32','float16','bfloat16'].includes(architecture.weight_dtype), 'open-model selected architecture is outside exact course RMSNorm/RoPE/SwiGLU/tied-head schema');
    const expectedTensorSchema = {schema_version:1,family:'bias-free-pre-rmsnorm-rope-gqa-swiglu-tied-head',vocabulary:architecture.vocabulary,d_model:architecture.d_model,layers:architecture.layers,query_heads:architecture.query_heads,kv_heads:architecture.kv_heads,d_ff:architecture.d_ff,tensors:['model.embed_tokens.weight[V,D]','model.layers.{i}.input_layernorm.weight[D]','model.layers.{i}.self_attn.q_proj.weight[D,D]','model.layers.{i}.self_attn.k_proj.weight[D*Hkv/Hq,D]','model.layers.{i}.self_attn.v_proj.weight[D*Hkv/Hq,D]','model.layers.{i}.self_attn.o_proj.weight[D,D]','model.layers.{i}.post_attention_layernorm.weight[D]','model.layers.{i}.mlp.gate_proj.weight[F,D]','model.layers.{i}.mlp.up_proj.weight[F,D]','model.layers.{i}.mlp.down_proj.weight[D,F]','model.norm.weight[D]'],forbidden:['lm_head.weight-payload-duplicate','bias','encoder','cross_attention','modality']};
    const expectedImportMapping = {schema_version:1,source:'HuggingFace-LlamaForCausalLM-SafeTensors',target:'course-causal-decoder-v1',mapping:['model.embed_tokens.weight->token_embedding.weight','model.layers.{i}.input_layernorm.weight->layers.{i}.attention_norm.weight','model.layers.{i}.self_attn.q_proj.weight->layers.{i}.attention.wq','model.layers.{i}.self_attn.k_proj.weight->layers.{i}.attention.wk','model.layers.{i}.self_attn.v_proj.weight->layers.{i}.attention.wv','model.layers.{i}.self_attn.o_proj.weight->layers.{i}.attention.wo','model.layers.{i}.post_attention_layernorm.weight->layers.{i}.ffn_norm.weight','model.layers.{i}.mlp.gate_proj.weight->layers.{i}.feed_forward.w1','model.layers.{i}.mlp.down_proj.weight->layers.{i}.feed_forward.w2','model.layers.{i}.mlp.up_proj.weight->layers.{i}.feed_forward.w3','model.norm.weight->final_norm.weight'],tied_head:'token_embedding-transpose-no-separate-payload'};
    check(architecture.tensor_schema_sha256 === sha256(Buffer.from(canonicalJson(expectedTensorSchema))) && architecture.course_import_mapping_sha256 === sha256(Buffer.from(canonicalJson(expectedImportMapping))), 'open-model selected architecture tensor/import mapping identity is not the exact derived course schema');
    check(machineDerivation.config_body_path === architecture.config_body_path && machineDerivation.config_body_sha256 === architecture.config_body_sha256 && machineDerivation.config_transport_receipt_sha256 === architecture.config_transport_receipt_sha256, 'open-model selected architecture does not bind the machine-derived config evidence');
    check(exactConfig.model_type === 'llama' && Array.isArray(exactConfig.architectures) && exactConfig.architectures.length === 1 && exactConfig.architectures[0] === 'LlamaForCausalLM', 'open-model selected config is not the exact supported Llama causal decoder schema');
    const exactTorchDtype = ({float32:'float32',float16:'float16',bfloat16:'bfloat16'})[exactConfig.torch_dtype];
    const derivedArchitecture = {
      model_family:'causal-autoregressive-decoder-only-text',model_type:'llama',causal:true,decoder_only:true,text_only:true,bias_free:true,
      linear_bias:false,norm_bias:false,vocabulary:exactConfig.vocab_size,d_model:exactConfig.hidden_size,layers:exactConfig.num_hidden_layers,
      query_heads:exactConfig.num_attention_heads,kv_heads:exactConfig.num_key_value_heads,d_ff:exactConfig.intermediate_size,context:exactConfig.max_position_embeddings,
      activation:exactConfig.hidden_act === 'silu' ? 'SwiGLU' : exactConfig.hidden_act,norm:'RMSNorm',rms_norm_epsilon:exactConfig.rms_norm_eps,
      position:'RoPE',rope_theta:exactConfig.rope_theta,causal_mask:'strict-causal',input_embedding_count:1,tied_embeddings:exactConfig.tie_word_embeddings,
      output_head_tied:exactConfig.tie_word_embeddings,weight_dtype:exactTorchDtype
    };
    check(exactConfig.attention_bias === false && exactConfig.mlp_bias === false && exactTorchDtype && (exactConfig.head_dim === undefined || exactConfig.head_dim === exactConfig.hidden_size / exactConfig.num_attention_heads) && (exactConfig.rope_scaling === undefined || exactConfig.rope_scaling === null) && (exactConfig.sliding_window === undefined || exactConfig.sliding_window === null) && (exactConfig.use_sliding_window === undefined || exactConfig.use_sliding_window === false) && (exactConfig.attention_dropout === undefined || exactConfig.attention_dropout === 0) && (exactConfig.hidden_dropout === undefined || exactConfig.hidden_dropout === 0) && (exactConfig.add_cross_attention === undefined || exactConfig.add_cross_attention === false) && exactConfig.auto_map === undefined && exactConfig.vision_config === undefined && exactConfig.audio_config === undefined && exactConfig.encoder === undefined && exactConfig.cross_attention_hidden_size === undefined, 'open-model selected config contains incompatible bias/dtype/head/rope/sliding/dropout/cross-modal semantics');
    deepEqual(machineDerivation.derived_architecture, derivedArchitecture, 'open-model machine-derived architecture');
    for (const [field,value] of Object.entries(derivedArchitecture)) check(architecture[field] === value, 'open-model selected architecture disagrees with exact config field ' + field);
    exactRecord(receipt.candidate.exact_parameter_census_method_and_count, evidenceSchema.parameter_record_keys, 'open-model selected parameter census');
    const parameterCensus = receipt.candidate.exact_parameter_census_method_and_count;
    const count = parameterCensus.count;
    check(Number.isSafeInteger(count) && count >= 20000000 && count <= 50000000, 'open-model selected parameter census outside exact 20M..50M gate');
    const computedCount = architecture.vocabulary * architecture.d_model + architecture.layers * (2 * architecture.d_model * architecture.d_model + 2 * architecture.d_model * architecture.d_model * architecture.kv_heads / architecture.query_heads + 3 * architecture.d_model * architecture.d_ff + 2 * architecture.d_model) + architecture.d_model;
    check(Number.isSafeInteger(computedCount) && computedCount === count && machineDerivation.derived_parameter_count === computedCount, 'open-model selected parameter census disagrees with the accepted exact decoder formula');
    const parameterFormula = 'P=V*D+L*(2*D^2+2*D^2*Hkv/Hq+3*D*F+2*D)+D';
    check(parameterCensus.method === 'course-bias-free-tied-llama-formula-v1' && parameterCensus.formula_sha256 === sha256(Buffer.from(parameterFormula)), 'open-model selected parameter census method/formula identity drift');
    exactRecord(receipt.candidate.tokenizer_identity_and_training_provenance, evidenceSchema.tokenizer_record_keys, 'open-model selected tokenizer provenance');
    const tokenizer = receipt.candidate.tokenizer_identity_and_training_provenance;
    check(tokenizer.kind === 'no-normalization-bytelevel-bpe-v1' && tokenizer.artifact_path === 'tokenizer.json' && tokenizer.normalizer === 'none' && tokenizer.pretokenizer === 'ByteLevel(add_prefix_space=false,trim_offsets=true,use_regex=true)' && tokenizer.decoder === 'ByteLevel(add_prefix_space=true,trim_offsets=true,use_regex=true)' && tokenizer.postprocessor === 'none' && tokenizer.bos_token_id === exactConfig.bos_token_id && tokenizer.eos_token_id === exactConfig.eos_token_id && tokenizer.pad_token_id === null && tokenizer.chat_template === 'none' && tokenizer.remote_code_required === false && Number.isSafeInteger(tokenizer.vocabulary) && tokenizer.vocabulary === architecture.vocabulary && /^[0-9a-f]{64}$/.test(tokenizer.artifact_sha256) && tokenizer.source_revision === selectedRevision && Number.isSafeInteger(tokenizer.training_seed), 'open-model selected tokenizer provenance invalid');
    check(tokenizer.artifact_body_path === machineDerivation.tokenizer_body_path && tokenizer.artifact_sha256 === machineDerivation.tokenizer_body_sha256 && tokenizer.artifact_transport_receipt_sha256 === machineDerivation.tokenizer_transport_receipt_sha256, 'open-model selected tokenizer does not bind the machine-derived raw body');
    check(Number.isSafeInteger(exactConfig.bos_token_id) && Number.isSafeInteger(exactConfig.eos_token_id) && exactConfig.bos_token_id !== exactConfig.eos_token_id && (exactConfig.pad_token_id === null || exactConfig.pad_token_id === undefined), 'open-model selected tokenizer structural IDs/pad policy invalid');
    check(isRecord(exactTokenizer.model) && exactTokenizer.model.type === 'BPE' && isRecord(exactTokenizer.model.vocab) && Array.isArray(exactTokenizer.model.merges) && exactTokenizer.model.merges.length > 0 && Object.keys(exactTokenizer.model.vocab).length === architecture.vocabulary && exactTokenizer.model.dropout === null && (exactTokenizer.model.unk_token === null || exactTokenizer.model.unk_token === undefined) && (exactTokenizer.model.continuing_subword_prefix === null || exactTokenizer.model.continuing_subword_prefix === '') && (exactTokenizer.model.end_of_word_suffix === null || exactTokenizer.model.end_of_word_suffix === '') && exactTokenizer.model.fuse_unk === false && exactTokenizer.model.byte_fallback === false && (exactTokenizer.model.ignore_merges === false || exactTokenizer.model.ignore_merges === undefined) && (exactTokenizer.normalizer === null || exactTokenizer.normalizer === undefined), 'open-model selected BPE model contains unsupported dropout/fallback/affix/normalization semantics');
    deepEqual(exactTokenizer.pre_tokenizer,{type:'ByteLevel',add_prefix_space:false,trim_offsets:true,use_regex:true},'open-model selected exact ByteLevel pretokenizer');
    deepEqual(exactTokenizer.decoder,{type:'ByteLevel',add_prefix_space:true,trim_offsets:true,use_regex:true},'open-model selected exact ByteLevel decoder');
    check(exactTokenizer.post_processor === null || exactTokenizer.post_processor === undefined, 'open-model selected tokenizer postprocessor is unsupported');
    check(Array.isArray(exactTokenizer.added_tokens) && exactTokenizer.added_tokens.length === 2 && exactTokenizer.added_tokens.every((token) => isRecord(token) && Number.isSafeInteger(token.id) && typeof token.content === 'string' && token.content.length > 0 && token.special === true && token.single_word === false && token.lstrip === false && token.rstrip === false && token.normalized === false) && new Set(exactTokenizer.added_tokens.map((token) => token.id)).size === 2 && exactTokenizer.added_tokens.some((token) => token.id === exactConfig.bos_token_id) && exactTokenizer.added_tokens.some((token) => token.id === exactConfig.eos_token_id), 'open-model selected tokenizer special-token inventory is not the exact structural BOS/EOS mapping');
    const specialById = new Map(exactTokenizer.added_tokens.map((token) => [token.id,token.content]));
    check(exactTokenizerConfig.chat_template === undefined || exactTokenizerConfig.chat_template === null, 'open-model selected tokenizer config contains an unsupported chat template');
    check(exactTokenizerConfig.auto_map === undefined && exactTokenizerConfig.tokenizer_class !== undefined && ['LlamaTokenizerFast','PreTrainedTokenizerFast'].includes(exactTokenizerConfig.tokenizer_class), 'open-model selected tokenizer config requires unsupported/remote code');
    const tokenContent = (value) => typeof value === 'string' ? value : value?.content;
    check(tokenContent(exactTokenizerConfig.bos_token) === specialById.get(exactConfig.bos_token_id) && tokenContent(exactTokenizerConfig.eos_token) === specialById.get(exactConfig.eos_token_id) && (exactTokenizerConfig.pad_token === undefined || exactTokenizerConfig.pad_token === null) && tokenContent(exactSpecialTokens.bos_token) === specialById.get(exactConfig.bos_token_id) && tokenContent(exactSpecialTokens.eos_token) === specialById.get(exactConfig.eos_token_id) && (exactSpecialTokens.pad_token === undefined || exactSpecialTokens.pad_token === null), 'open-model selected tokenizer config/special-token map disagrees with structural BOS/EOS/pad identity');
    const derivedTokenizerIdentity = {kind:'no-normalization-bytelevel-bpe-v1',vocabulary:Object.keys(exactTokenizer.model.vocab).length,normalizer:'none',pretokenizer:'ByteLevel(add_prefix_space=false,trim_offsets=true,use_regex=true)',decoder:'ByteLevel(add_prefix_space=true,trim_offsets=true,use_regex=true)',postprocessor:'none',bos_token_id:exactConfig.bos_token_id,eos_token_id:exactConfig.eos_token_id,pad_token_id:null,chat_template:'none',artifact_sha256:machineDerivation.tokenizer_body_sha256,tokenizer_config_sha256:machineDerivation.tokenizer_config_body_sha256,special_tokens_sha256:machineDerivation.special_tokens_body_sha256,remote_code_required:false};
    deepEqual(machineDerivation.derived_tokenizer_identity, derivedTokenizerIdentity, 'open-model machine-derived tokenizer identity');
    check(machineDerivation.no_remote_code === true, 'open-model machine derivation permits remote code');
    const tokenizerTrainingSource = responseFor(tokenizer.training_evidence_transport_receipt_sha256, 'open-model selected tokenizer-training evidence');
    check(tokenizer.training_config_sha256 === tokenizerTrainingSource.bodyFile.hash, 'open-model tokenizer training-config hash is not derived from its cited exact bytes');
    exactRecord(receipt.candidate.training_source_repository_commit, evidenceSchema.training_source_record_keys, 'open-model selected training source');
    const trainingSource = receipt.candidate.training_source_repository_commit;
    check(/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(trainingSource.repository) && /^[0-9a-f]{40}$/.test(trainingSource.commit) && /^[0-9a-f]{64}$/.test(trainingSource.file_inventory_sha256) && /^[0-9a-f]{64}$/.test(trainingSource.license_text_sha256), 'open-model selected training-source binding invalid');
    const repositoryMatch = trainingSource.repository.match(/^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
    check(repositoryMatch, 'open-model selected training source repository URL grammar invalid');
    const [,sourceOwner,sourceRepository] = repositoryMatch;
    const trainingCommitSource = responseFor(trainingSource.commit_transport_receipt_sha256, 'open-model selected training-source commit evidence');
    check(trainingCommitSource.record.request_url === `https://api.github.com/repos/${sourceOwner}/${sourceRepository}/git/commits/${trainingSource.commit}`, 'open-model training-source commit evidence belongs to another repository or commit');
    const trainingCommitBody = parseJsonExact(trainingCommitSource.bodyFile.text, 'open-model selected training-source commit body');
    check(trainingCommitBody.sha === trainingSource.commit && isRecord(trainingCommitBody.tree) && /^[0-9a-f]{40}$/.test(trainingCommitBody.tree.sha), 'open-model training-source commit body identity invalid');
    const trainingTreeSource = responseFor(trainingSource.tree_transport_receipt_sha256, 'open-model selected training-source tree evidence');
    check(trainingTreeSource.record.request_url === `https://api.github.com/repos/${sourceOwner}/${sourceRepository}/git/trees/${trainingCommitBody.tree.sha}?recursive=1`, 'open-model training-source tree evidence belongs to another repository or commit tree');
    const trainingTreeBody = parseJsonExact(trainingTreeSource.bodyFile.text, 'open-model selected training-source tree body');
    check(trainingTreeBody.truncated === false && Array.isArray(trainingTreeBody.tree), 'open-model training-source tree body is missing or truncated');
    check(trainingSource.file_inventory_sha256 === sha256(Buffer.from(canonicalJson(trainingTreeBody.tree))), 'open-model training-source file inventory hash is not derived from the exact immutable tree');
    const trainingLicenseSource = responseFor(trainingSource.license_transport_receipt_sha256, 'open-model selected training-source license evidence');
    check(trainingLicenseSource.record.request_url.startsWith(`https://raw.githubusercontent.com/${sourceOwner}/${sourceRepository}/${trainingSource.commit}/`) && trainingLicenseSource.bodyFile.hash === trainingSource.license_text_sha256, 'open-model training-source license evidence belongs to another repository/commit or bytes');
    const selectedEvidenceSource = (source, label) => {
      const url = source.record.request_url;
      const selectedHf = url === selectedApiUrl || url.startsWith(`https://huggingface.co/${selectedCandidateId}/resolve/${selectedRevision}/`);
      const selectedSource = url === `https://api.github.com/repos/${sourceOwner}/${sourceRepository}/git/commits/${trainingSource.commit}` || url === `https://api.github.com/repos/${sourceOwner}/${sourceRepository}/git/trees/${trainingCommitBody.tree.sha}?recursive=1` || url.startsWith(`https://raw.githubusercontent.com/${sourceOwner}/${sourceRepository}/${trainingSource.commit}/`);
      check(selectedHf || selectedSource, label + ' belongs to another candidate/source identity');
    };
    selectedEvidenceSource(tokenizerTrainingSource, 'open-model tokenizer-training evidence');
    check(Array.isArray(receipt.candidate.dataset_revisions_and_partitions) && receipt.candidate.dataset_revisions_and_partitions.length > 0, 'open-model selected dataset provenance missing');
    const datasetEvidenceSources = [];
    for (const dataset of receipt.candidate.dataset_revisions_and_partitions) {
      exactRecord(dataset, evidenceSchema.dataset_record_keys, 'open-model selected dataset');
      check(typeof dataset.repository === 'string' && dataset.repository.length > 0 && /^[0-9a-f]{40,64}$/.test(dataset.revision) && typeof dataset.partition === 'string' && dataset.partition.length > 0, 'open-model selected dataset identity invalid');
      const licenseEvidence = responseFor(dataset.license_evidence_transport_receipt_sha256, 'open-model selected dataset license evidence');
      const manifestEvidence = responseFor(dataset.manifest_evidence_transport_receipt_sha256, 'open-model selected dataset manifest evidence');
      selectedEvidenceSource(licenseEvidence, 'open-model selected dataset license evidence');
      selectedEvidenceSource(manifestEvidence, 'open-model selected dataset manifest evidence');
      check(dataset.license_text_sha256 === licenseEvidence.bodyFile.hash && dataset.manifest_sha256 === manifestEvidence.bodyFile.hash, 'open-model dataset license/manifest hashes are not derived from their exact cited bytes');
      datasetEvidenceSources.push(licenseEvidence,manifestEvidence);
    }
    exactRecord(receipt.candidate.training_config_seed_environment_commit, evidenceSchema.training_record_keys, 'open-model selected training config/environment');
    const training = receipt.candidate.training_config_seed_environment_commit;
    check(Number.isSafeInteger(training.seed) && training.source_commit === trainingSource.commit, 'open-model selected training config/environment binding invalid');
    const trainingConfigEvidence = responseFor(training.config_evidence_transport_receipt_sha256, 'open-model selected training config evidence');
    const trainingEnvironmentEvidence = responseFor(training.environment_evidence_transport_receipt_sha256, 'open-model selected training environment evidence');
    const trainingBindingEvidence = responseFor(training.binding_evidence_transport_receipt_sha256, 'open-model selected training binding evidence');
    for (const source of [trainingConfigEvidence,trainingEnvironmentEvidence,trainingBindingEvidence]) selectedEvidenceSource(source, 'open-model selected training config/environment/binding evidence');
    check(training.config_sha256 === trainingConfigEvidence.bodyFile.hash && training.environment_lock_sha256 === trainingEnvironmentEvidence.bodyFile.hash && training.source_to_weight_binding_sha256 === trainingBindingEvidence.bodyFile.hash, 'open-model training config/environment/binding hashes are not derived from exact cited bytes');
    check(Array.isArray(receipt.candidate.weight_manifest_paths_sizes_sha256_without_payload_download) && receipt.candidate.weight_manifest_paths_sizes_sha256_without_payload_download.length > 0, 'open-model selected weight manifest missing');
    const selectedMetadataSource = responseFor(admittedCandidates[0].metadata_transport_receipt_sha256, 'open-model selected immutable API metadata');
    check(selectedMetadataSource.record.request_url === selectedApiUrl, 'open-model selected immutable API metadata belongs to another candidate/revision');
    const selectedMetadataBody = parseJsonExact(selectedMetadataSource.bodyFile.text, 'open-model selected immutable API metadata body');
    check((selectedMetadataBody.id === selectedCandidateId || selectedMetadataBody.modelId === selectedCandidateId) && selectedMetadataBody.sha === selectedRevision && Array.isArray(selectedMetadataBody.siblings), 'open-model selected API metadata body identity/siblings drift');
    const forbiddenWeightPaths = selectedMetadataBody.siblings.filter((sibling) => isRecord(sibling) && typeof sibling.rfilename === 'string' && /\.(?:bin|pt|pth|ckpt|onnx|gguf)$/i.test(sibling.rfilename));
    check(forbiddenWeightPaths.length === 0, 'open-model selected API metadata advertises a forbidden non-SafeTensors weight payload');
    const derivedWeights = selectedMetadataBody.siblings.filter((sibling) => isRecord(sibling) && typeof sibling.rfilename === 'string' && sibling.rfilename.endsWith('.safetensors')).map((sibling) => ({
      path:sibling.rfilename,
      bytes:sibling.lfs?.size ?? sibling.size,
      sha256:sibling.lfs?.sha256,
      lfs_oid_sha256:sibling.lfs?.sha256,
      payload_downloaded:false,
      metadata_transport_receipt_sha256:admittedCandidates[0].metadata_transport_receipt_sha256
    })).sort((a,b) => Buffer.from(a.path).compare(Buffer.from(b.path)));
    check(derivedWeights.length > 0 && derivedWeights.every((weight) => !weight.path.includes('..') && Number.isSafeInteger(weight.bytes) && weight.bytes > 0 && /^[0-9a-f]{64}$/.test(weight.sha256)), 'open-model selected API metadata lacks a complete safe immutable SafeTensors manifest');
    exactArray(receipt.candidate.weight_manifest_paths_sizes_sha256_without_payload_download,derivedWeights,'open-model selected weight manifest is not deterministically derived from exact API siblings/LFS metadata');
    const derivedWeightManifestSha256 = sha256(Buffer.from(canonicalJson(derivedWeights)));
    check(parameterCensus.weight_metadata_manifest_sha256 === derivedWeightManifestSha256, 'open-model parameter census does not bind the derived exact weight metadata manifest');
    const weightMetadataSources = [];
    for (const weight of receipt.candidate.weight_manifest_paths_sizes_sha256_without_payload_download) { exactRecord(weight, evidenceSchema.weight_manifest_record_keys, 'open-model selected weight manifest record'); check(Number.isSafeInteger(weight.bytes) && weight.bytes > 0 && /^[0-9a-f]{64}$/.test(weight.sha256) && weight.lfs_oid_sha256 === weight.sha256 && weight.payload_downloaded === false, 'open-model selected weight manifest payload/hash drift'); const source = responseFor(weight.metadata_transport_receipt_sha256, 'open-model selected weight-manifest metadata evidence'); check(source.record.request_url === selectedApiUrl, 'open-model selected weight metadata belongs to another candidate or revision'); weightMetadataSources.push(source); }
    exactRecord(receipt.candidate.source_to_weight_binding, evidenceSchema.source_binding_record_keys, 'open-model selected source-to-weight binding');
    const sourceBinding = receipt.candidate.source_to_weight_binding;
    const derivedDatasetManifestSha256 = sha256(Buffer.from(canonicalJson(receipt.candidate.dataset_revisions_and_partitions.map((dataset) => ({repository:dataset.repository,revision:dataset.revision,partition:dataset.partition,license_text_sha256:dataset.license_text_sha256,manifest_sha256:dataset.manifest_sha256})))));
    check(sourceBinding.training_source_commit === trainingSource.commit && sourceBinding.training_config_sha256 === training.config_sha256 && sourceBinding.tokenizer_sha256 === tokenizer.artifact_sha256 && sourceBinding.dataset_manifest_sha256 === derivedDatasetManifestSha256 && sourceBinding.weight_manifest_sha256 === derivedWeightManifestSha256 && typeof sourceBinding.binding_method === 'string' && sourceBinding.binding_method.length > 0, 'open-model selected source-to-weight binding invalid');
    const sourceBindingEvidence = responseFor(sourceBinding.evidence_transport_receipt_sha256, 'open-model selected source-to-weight binding evidence');
    selectedEvidenceSource(sourceBindingEvidence, 'open-model selected source-to-weight binding evidence');
    check(sourceBinding.binding_receipt_sha256 === sourceBindingEvidence.bodyFile.hash && training.source_to_weight_binding_sha256 === sourceBindingEvidence.bodyFile.hash, 'open-model source-to-weight binding hashes are not derived from the exact cited binding bytes');
    exactRecord(receipt.candidate.security_and_remote_code_disposition, evidenceSchema.security_record_keys, 'open-model selected security disposition');
    const security = receipt.candidate.security_and_remote_code_disposition;
    check(security.remote_code_required === false && Array.isArray(security.untrusted_executable_files) && security.untrusted_executable_files.length === 0 && security.safetensors_only === true && /^[0-9a-f]{64}$/.test(security.scan_receipt_sha256), 'open-model selected security/remote-code gate invalid');
    const securityEvidence = responseFor(security.evidence_transport_receipt_sha256, 'open-model selected security evidence');
    selectedEvidenceSource(securityEvidence, 'open-model selected security evidence');
    check(security.scan_receipt_sha256 === securityEvidence.bodyFile.hash, 'open-model selected security scan identity is not derived from its exact cited bytes');
    const gateReceiptSets = {
      license_text_and_scope:[license.evidence_transport_receipt_sha256],
      tokenizer_provenance_complete:[tokenizer.artifact_transport_receipt_sha256,machineDerivation.tokenizer_config_transport_receipt_sha256,machineDerivation.special_tokens_transport_receipt_sha256,tokenizer.training_evidence_transport_receipt_sha256],
      training_source_commit_bound:[trainingSource.commit_transport_receipt_sha256,trainingSource.tree_transport_receipt_sha256,trainingSource.license_transport_receipt_sha256],
      dataset_revisions_and_partitions_bound:receipt.candidate.dataset_revisions_and_partitions.flatMap((record) => [record.license_evidence_transport_receipt_sha256,record.manifest_evidence_transport_receipt_sha256]),
      training_config_seed_environment_bound:[training.config_evidence_transport_receipt_sha256,training.environment_evidence_transport_receipt_sha256,training.binding_evidence_transport_receipt_sha256],
      source_to_weight_binding_complete:[sourceBinding.evidence_transport_receipt_sha256,...receipt.candidate.weight_manifest_paths_sizes_sha256_without_payload_download.map((record) => record.metadata_transport_receipt_sha256)],
      no_remote_code:[security.evidence_transport_receipt_sha256]
    };
    for (const gateId of evidenceContract.required_semantic_gates) exactSet(semanticGateSpanReceipts.get(gateId), [...new Set(gateReceiptSets[gateId])], 'open-model semantic gate exact selected-candidate evidence receipts ' + gateId);
    exactRecord(receipt.candidate.independent_parity_plan, evidenceSchema.parity_plan_record_keys, 'open-model selected parity plan');
    const parity = receipt.candidate.independent_parity_plan;
    check(parity.prompts_min >= 100 && parity.compare_all_logits === true && typeof parity.atol === 'number' && parity.atol > 0 && typeof parity.rtol === 'number' && parity.rtol > 0, 'open-model selected independent parity plan invalid');
    const parityBindings = {
      course_importer_contract_sha256:'artifacts/functional-laptop/chapters/56-tensor-artifact-interchange/implementation-receipt.json',
      independent_runtime_identity_sha256:'artifacts/functional-laptop/chapters/56-tensor-artifact-interchange/independent-dense-fixture-integration-receipt.json',
      prompt_inventory_sha256:'configs/functional-data-pipeline/dense-bridge-prompt-inventory-v1.json',
      tokenizer_oracle_receipt_sha256:'artifacts/functional-laptop/data/tokenizer-and-tokenized-splits-v1/standalone-imported-tokenizer-oracle-receipt.json',
      quantizer_contract_receipt_sha256:'artifacts/functional-laptop/chapters/61-quantized-gguf-artifacts/implementation-receipt.json'
    };
    for (const [field,path] of Object.entries(parityBindings)) check(parity[field] === readBounded(root,path,'open-model parity prerequisite ' + field,4194304).hash, 'open-model parity prerequisite hash is not the exact already-published implementation/oracle byte ' + field);
    check(parity.evidence_admission_sha256 === evidenceFile.hash, 'open-model selected parity plan does not bind the exact evidence admission');
    check(receipt.candidate.gate_disposition === 'admitted', 'open-model candidate disposition is not admitted');
    check(!/(encoder-decoder|encoder-only|autoencoder|diffusion|multimodal|image|audio|video|cross-attention)/i.test(JSON.stringify(receipt.candidate)), 'open-model selection authorizes an alternate model/modality');
    const artifacts = new Map(finalRun.artifacts.map((artifact) => [artifact.path,artifact.sha256]));
    const selectionPublicationPath = attemptPath(protocol.selection_publication_contract.path,finalRun.run_id);
    const selectionPublicationFile = validateSelectionPublication(validatedManifest,machineFile.hash,evidenceFile.hash,file.hash,finalRun.run_id);
    check(receipt.selection_publication_receipt_sha256 === selectionPublicationFile.hash, 'open-model provisional selection receipt does not bind the exact immutable selection publication receipt');
    check(artifacts.get(receiptPath) === file.hash && artifacts.get(manifestPath) === manifestFile.hash && artifacts.get(attemptPath(protocol.raw_response_publication_contract.publication_receipt,finalRun.run_id)) === validatedManifest.metadataPublicationFile.hash && artifacts.get(attemptPath(protocol.candidate_dispositions_contract.path,finalRun.run_id)) === validatedManifest.dispositionsFile.hash && artifacts.get(attemptPath(protocol.selection_decision_contract.path,finalRun.run_id)) === validatedManifest.decisionFile.hash && artifacts.get(machinePath) === machineFile.hash && artifacts.get(evidencePath) === evidenceFile.hash && artifacts.get(selectionPublicationPath) === selectionPublicationFile.hash, 'open-model succeeded run does not bind every selected publication artifact byte');
    const fingerprint = finalRun.input_fingerprint.selection_external_state;
    check(fingerprint.raw_response_inventory_merkle_sha256 === receipt.raw_response_inventory_merkle_sha256 && fingerprint.candidate_discovery_manifest_sha256 === manifestFile.hash && fingerprint.admission_receipt_sha256_or_absent === file.hash, 'open-model selected run fingerprint/receipt mismatch');
  } else {
    check(!receiptPresent, 'canonical selected-model admission receipt exists before successful selection completion');
    if (step.runs.length > 0) {
      const latestRunId = step.runs.at(-1).run_id;
      check(!existsSync(resolve(root, attemptPath(protocol.machine_derivation_contract.path,latestRunId))) && !existsSync(resolve(root, attemptPath(protocol.evidence_admission_contract.path,latestRunId))), 'selected-only machine/evidence admission bytes exist before successful selection completion');
    }
    if (step.status === 'blocked') {
      const last = step.runs.at(-1);
      const artifacts = new Map(last.artifacts.map((artifact) => [artifact.path,artifact.sha256]));
      const technicalPath = attemptPath(protocol.technical_resource_block_contract.path,last.run_id);
      if (artifacts.has(technicalPath) || existsSync(resolve(root,technicalPath))) {
        const validatedTechnical = validateTechnicalResourceBlock(last);
        check(artifacts.get(technicalPath) === validatedTechnical.technicalFile.hash, 'blocked technical model selection run does not bind its terminal receipt');
        for (const alternatives of protocol.blocked_evidence_contract.required_note_token_sets_by_disposition['technical-resource-blocked']) check(alternatives.some((token) => last.notes.includes(token)), 'blocked technical model-selection reason missing one exact token from ' + alternatives.join(' OR '));
        check(last.input_fingerprint.selection_external_state.admission_receipt_sha256_or_absent === 'absent', 'technical-blocked model selection fingerprints a selected receipt');
        return;
      }
      for (const template of protocol.blocked_evidence_contract.semantic_required_run_artifacts) {
        const path = attemptPath(template,last.run_id);
        check(artifacts.has(path), 'blocked model selection lacks exact semantic publication evidence ' + path);
      }
      const manifestPath = attemptPath(protocol.candidate_manifest,last.run_id);
      const manifestFile = readBounded(root, manifestPath, 'blocked model-selection discovery manifest', 8388608);
      const validatedManifest = validateManifest(manifestFile,last.run_id);
      const manifest = validatedManifest.manifest;
      check(artifacts.get(manifestPath) === manifestFile.hash && last.input_fingerprint.selection_external_state.candidate_discovery_manifest_sha256 === manifestFile.hash && last.input_fingerprint.selection_external_state.raw_response_inventory_merkle_sha256 === manifest.raw_response_inventory_merkle_sha256, 'blocked model-selection manifest/run fingerprint drift');
      const admitted = validatedManifest.dispositions.candidate_dispositions.filter((candidate) => candidate.disposition === 'admitted');
      check((validatedManifest.decision.disposition === 'blocked-no-admissible-candidate' && admitted.length === 0) || (validatedManifest.decision.disposition === 'blocked-multiple-admissible-candidates' && admitted.length >= 2), 'blocked model selection disposition/admitted-candidate cardinality drift');
      const selectionPublicationFile = validateSelectionPublication(validatedManifest,'absent','absent','absent',last.run_id);
      check(artifacts.get(attemptPath(protocol.raw_response_publication_contract.publication_receipt,last.run_id)) === validatedManifest.metadataPublicationFile.hash && artifacts.get(attemptPath(protocol.candidate_dispositions_contract.path,last.run_id)) === validatedManifest.dispositionsFile.hash && artifacts.get(attemptPath(protocol.selection_decision_contract.path,last.run_id)) === validatedManifest.decisionFile.hash && artifacts.get(attemptPath(protocol.selection_publication_contract.path,last.run_id)) === selectionPublicationFile.hash, 'blocked model-selection run does not bind raw metadata, dispositions, decision and final publication receipts');
      for (const alternatives of protocol.blocked_evidence_contract.required_note_token_sets_by_disposition[validatedManifest.decision.disposition]) check(alternatives.some((token) => last.notes.includes(token)), 'blocked model-selection reason missing one exact token from ' + alternatives.join(' OR '));
      check(last.input_fingerprint.selection_external_state.admission_receipt_sha256_or_absent === 'absent', 'blocked model selection fingerprints a selected receipt');
    }
  }
}
function validateSelectedOpenModelN3State(root, constants, byId) {
  const step = byId.get('acquire-functional-open-model');
  check(step, 'selected-model N3 acquisition step missing');
  const artifactTargets = constants.execution_boundary_records.artifact_cache.target_registry.filter((record) => record.step_id === step.id);
  const acquisition = artifactTargets.find((record) => record.target_id === 'acquire-functional-open-model-v1');
  const admissionPublisher = artifactTargets.find((record) => record.target_id === 'acquire-functional-open-model-admission-v1');
  const oraclePublisher = artifactTargets.find((record) => record.target_id === 'acquire-functional-open-model-oracles-v1');
  const integration = artifactTargets.find((record) => record.target_id === 'acquire-functional-open-model-integration-v1');
  check(acquisition?.physical_tensor_admission && admissionPublisher && oraclePublisher && integration, 'selected-model N3 transport/admission/oracle/integration target set incomplete');
  const n3Phases = [
    [acquisition.output_receipt,acquisition.transport_contract.payload_output_manifest],
    admissionPublisher.output_receipts,
    oraclePublisher.output_receipts,
    integration.output_receipts
  ];
  let publishedPhaseCount = 0;
  let sawAbsentPhase = false;
  const latestRun = step.runs.at(-1);
  const latestArtifacts = new Map((latestRun?.artifacts || []).map((artifact) => [artifact.path,artifact.sha256]));
  for (let index = 0; index < n3Phases.length; index += 1) {
    const paths = n3Phases[index];
    check(Array.isArray(paths) && paths.length > 0, 'selected-model N3 phase ' + (index + 1) + ' canonical path inventory missing');
    unique(paths,'selected-model N3 phase ' + (index + 1) + ' canonical paths');
    const present = paths.filter((path) => existsSync(resolve(root,path)));
    check(present.length === 0 || present.length === paths.length, 'selected-model N3 phase ' + (index + 1) + ' is only partially published');
    if (present.length === 0) sawAbsentPhase = true;
    else {
      check(!sawAbsentPhase, 'selected-model N3 canonical outputs are not one contiguous published phase prefix');
      publishedPhaseCount += 1;
      check(latestRun && ['running','succeeded'].includes(latestRun.status), 'selected-model N3 published phase has no current running/succeeded run');
      for (const path of paths) check(latestArtifacts.get(path) === hashRegularFile(resolveInside(root,path,'selected-model N3 current phase output')).sha256, 'selected-model N3 current run does not hash-bind published phase output ' + path);
    }
  }
  if (step.status === 'completed') check(publishedPhaseCount === n3Phases.length && latestRun?.status === 'succeeded', 'completed selected-model N3 step lacks all four exact published phases');
  else {
    check(step.status === 'running' ? latestRun?.status === 'running' : publishedPhaseCount === 0, 'selected-model N3 canonical phase prefix exists outside its exact current running attempt');
    if (publishedPhaseCount === 0) return;
  }
  const readCanonicalReceipt = (path,label,max = 16777216) => {
    const file = readBounded(root,path,label,max);
    const receipt = parseJsonExact(file.text,label);
    check(file.text === canonicalJson(receipt), label + ' is not canonical JSON');
    return {file,receipt};
  };
  const payloadPath = acquisition.output_receipt;
  const definitivePath = acquisition.physical_tensor_admission.definitive_receipt;
  const {file:selectionFile,receipt:selection} = readCanonicalReceipt('artifacts/functional-laptop/model-selection/receipt.json','selected-model provisional N1 receipt',4194304);
  const {file:metadataPublicationFile,receipt:metadataPublication} = readCanonicalReceipt(selection.metadata_publication_receipt_path,'selected-model immutable metadata publication receipt',1048576);
  exactSet(Object.keys(metadataPublication),constants.execution_boundary_records.artifact_cache.target_registry.find((record) => record.step_id === 'select-functional-open-model')?.candidate_admission_protocol.raw_response_publication_contract.publication_receipt_fields || [],'selected-model immutable metadata publication fields');
  check(metadataPublicationFile.hash === selection.metadata_publication_receipt_sha256 && metadataPublication.cache_entry_sha256 === selection.cache_entry_sha256 && metadataPublication.cache_entry_path === selection.cache_entry_path, 'selected-model provisional receipt does not resolve the exact immutable metadata publication/cache entry');
  const {file:payloadFile,receipt:payload} = readCanonicalReceipt(payloadPath,'selected-model payload transport receipt');
  exactSet(Object.keys(payload),acquisition.transport_contract.payload_receipt_fields,'selected-model payload transport receipt fields');
  check(payload.schema_version === 1 && payload.provisional_selection_receipt_sha256 === selectionFile.hash && payload.selected_attempt_run_id === selection.selected_attempt_run_id && payload.metadata_publication_receipt_sha256 === metadataPublicationFile.hash && payload.metadata_cache_entry_sha256 === metadataPublication.cache_entry_sha256, 'selected-model payload transport does not bind the exact provisional selection/metadata entry');
  const selectedCandidateId = selection.candidate.candidate_id;
  const selectedRevision = selection.candidate.immutable_model_revision;
  const selectedWeights = selection.candidate.weight_manifest_paths_sizes_sha256_without_payload_download;
  check(typeof selectedCandidateId === 'string' && selectedCandidateId.length > 0 && /^[0-9a-f]{40}$/.test(selectedRevision) && Array.isArray(selectedWeights) && selectedWeights.length > 0, 'selected-model N1 provisional identity/weight manifest missing');
  const selectedWeightManifestSha256 = sha256(Buffer.from(canonicalJson(selectedWeights)));
  check(payload.selected_candidate_id === selectedCandidateId && payload.selected_immutable_revision === selectedRevision && payload.selected_weight_manifest_sha256 === selectedWeightManifestSha256, 'selected-model N3 payload does not bind the exact N1 candidate/revision/weight manifest');
  for (const field of ['metadata_payload_inventory_sha256','weight_transport_inventory_sha256','composed_payload_inventory_sha256','cache_entry_sha256']) check(/^[0-9a-f]{64}$/.test(payload[field]), 'selected-model payload transport invalid ' + field);
  check(Array.isArray(payload.weight_transport_records) && payload.weight_transport_records.length === selectedWeights.length, 'selected-model N3 weight transport record count differs from the exact N1 shard manifest');
  exactArray(payload.weight_transport_records.map((record) => record.path),selectedWeights.map((record) => record.path),'selected-model N1-to-N3 exhaustive weight shard order');
  const weightTransports = [];
  for (let index = 0; index < selectedWeights.length; index += 1) {
    const expected = selectedWeights[index];
    const record = payload.weight_transport_records[index];
    exactSet(Object.keys(record),acquisition.transport_contract.file_receipt_fields,'selected-model N3 weight transport record ' + expected.path);
    const encodedPath = expected.path.split('/').map((segment) => encodeURIComponent(segment)).join('/');
    const requestedUrl = `https://huggingface.co/${selectedCandidateId}/resolve/${selectedRevision}/${encodedPath}`;
    check(record.path === expected.path && record.expected_bytes === expected.bytes && record.expected_sha256 === expected.sha256 && record.expected_lfs_sha256 === expected.lfs_oid_sha256 && record.requested_url === requestedUrl, 'selected-model N3 weight request identity differs from exact N1 API/LFS metadata ' + expected.path);
    check(isRecord(record.resolved_endpoint), 'selected-model N3 weight resolved endpoint missing ' + expected.path);
    exactSet(Object.keys(record.resolved_endpoint),acquisition.transport_contract.canonical_endpoint_schema,'selected-model N3 canonical resolved endpoint ' + expected.path);
    check(record.resolved_endpoint.scheme === 'https' && acquisition.transport_contract.allowed_redirect_hosts.includes(record.resolved_endpoint.host) && typeof record.resolved_endpoint.path === 'string' && record.resolved_endpoint.path.startsWith('/') && Array.isArray(record.resolved_endpoint.query_keys) && record.resolved_endpoint.query_values_redacted === true && record.resolved_endpoint.transport_caps_passed === true && /^[0-9a-f]{64}$/.test(record.resolved_endpoint.query_key_inventory_sha256), 'selected-model N3 resolved endpoint host/path/redaction/caps drift ' + expected.path);
    check([200,206].includes(record.status) && acquisition.transport_contract.allowed_media_types.includes(record.media_type) && Number.isSafeInteger(record.attempt_count) && record.attempt_count >= 1 && record.attempt_count <= acquisition.transport_contract.attempts_per_file_max && Array.isArray(record.redirect_endpoints) && record.redirect_endpoints.length <= acquisition.transport_contract.redirects_per_file_max, 'selected-model N3 transport status/media/attempt/redirect caps drift ' + expected.path);
    for (const endpoint of record.redirect_endpoints) check(isRecord(endpoint) && endpoint.scheme === 'https' && acquisition.transport_contract.allowed_redirect_hosts.includes(endpoint.host) && typeof endpoint.path === 'string' && endpoint.path.startsWith('/') && endpoint.query_values_redacted === true, 'selected-model N3 redirect endpoint outside frozen host/path/redaction policy ' + expected.path);
    const expectedShardCacheDigest = sha256(Buffer.from(`${record.path}\t${record.observed_bytes}\t${record.observed_sha256}\n`));
    check(record.downloaded_bytes === expected.bytes && record.observed_bytes === expected.bytes && record.observed_sha256 === expected.sha256 && /^[0-9a-f]{64}$/.test(record.range_inventory_sha256) && /^[0-9a-f]{64}$/.test(record.retry_evidence_sha256) && record.cache_entry_sha256 === expectedShardCacheDigest && record.cache_entry_path === `.build/artifact-cache/functional-v1/sha256/${expectedShardCacheDigest}/payload`, 'selected-model N3 observed shard bytes/hash/content-addressed cache identity drift ' + expected.path);
    check(typeof record.transport_receipt_path === 'string' && record.transport_receipt_path.startsWith(acquisition.transport_contract.weight_transport_receipt_root) && /^[0-9a-f]{64}$/.test(record.transport_receipt_sha256), 'selected-model N3 transport receipt pointer invalid ' + expected.path);
    const transport = readCanonicalReceipt(record.transport_receipt_path,'selected-model N3 shard transport receipt ' + expected.path,4194304);
    check(transport.file.hash === record.transport_receipt_sha256, 'selected-model N3 shard transport receipt hash drift ' + expected.path);
    check(latestArtifacts.get(record.transport_receipt_path) === transport.file.hash, 'selected-model N3 current run does not hash-bind shard transport receipt ' + expected.path);
    exactSet(Object.keys(transport.receipt),acquisition.transport_contract.weight_transport_receipt_fields,'selected-model N3 shard transport receipt fields ' + expected.path);
    deepEqual(transport.receipt,Object.fromEntries(acquisition.transport_contract.weight_transport_receipt_fields.map((field) => [field,record[field]])),'selected-model N3 shard transport receipt/payload record identity ' + expected.path);
    weightTransports.push(record);
  }
  check(payload.weight_transport_inventory_sha256 === sha256(Buffer.from(canonicalJson(weightTransports))), 'selected-model N3 weight transport inventory hash drift');
  check(Array.isArray(payload.files) && payload.files.length > 0, 'selected-model composed payload inventory missing');
  unique(payload.files.map((record) => record.path),'selected-model composed payload paths');
  exactArray(payload.files.map((record) => record.path),payload.files.map((record) => record.path).sort((a,b) => Buffer.from(a).compare(Buffer.from(b))),'selected-model composed payload UTF-8 path order');
  let downloadedWeightBytes = 0;
  for (const record of payload.files) {
    exactSet(Object.keys(record),acquisition.transport_contract.payload_file_record_fields,'selected-model composed payload file fields');
    check(acquisition.allowed_payload_roles.includes(record.role) && typeof record.path === 'string' && !record.path.includes('..') && !record.path.startsWith('/') && Number.isSafeInteger(record.bytes) && record.bytes > 0 && /^[0-9a-f]{64}$/.test(record.sha256), 'selected-model composed payload file identity invalid');
    check(['selection-metadata-cache-unchanged','immutable-hf-lfs-download'].includes(record.source), 'selected-model composed payload file source invalid');
    if (record.source === 'immutable-hf-lfs-download') { check(record.role === 'dense-safetensors' && record.path.endsWith('.safetensors'), 'selected-model N3 request downloaded a non-SafeTensors/non-weight role'); downloadedWeightBytes += record.bytes; }
  }
  const metadataRoleByBasename = acquisition.transport_contract.metadata_payload_role_by_basename;
  const consumedMetadata = selection.candidate.consumed_file_paths_sizes_sha256;
  check(Array.isArray(consumedMetadata), 'selected-model provisional receipt lacks its exact consumed metadata inventory');
  const expectedMetadataFiles = consumedMetadata.flatMap((record) => {
    const basename = record.path.split('/').at(-1);
    const role = metadataRoleByBasename[basename];
    if (!role) return [];
    check(record.revision === selectedRevision && Number.isSafeInteger(record.bytes) && record.bytes > 0 && /^[0-9a-f]{64}$/.test(record.sha256), 'selected-model N1 consumed metadata identity invalid ' + record.path);
    return [{role,path:record.path,source:'selection-metadata-cache-unchanged',bytes:record.bytes,sha256:record.sha256,request_identity_or_metadata_body_sha256:record.sha256}];
  });
  unique(expectedMetadataFiles.map((record) => record.path),'selected-model expected metadata payload paths');
  exactSet(expectedMetadataFiles.map((record) => record.role),[...new Set(expectedMetadataFiles.map((record) => record.role))],'selected-model expected metadata role uniqueness');
  for (const role of acquisition.transport_contract.required_metadata_payload_roles) check(expectedMetadataFiles.some((record) => record.role === role), 'selected-model composed payload lacks required selection-bound metadata role ' + role);
  check(expectedMetadataFiles.some((record) => record.path === selection.candidate.architecture_config.config_body_path && record.sha256 === selection.candidate.architecture_config.config_body_sha256), 'selected-model composed metadata lacks the exact selected config bytes');
  check(expectedMetadataFiles.some((record) => record.path === selection.candidate.tokenizer_identity_and_training_provenance.artifact_path && record.sha256 === selection.candidate.tokenizer_identity_and_training_provenance.artifact_sha256), 'selected-model composed metadata lacks the exact selected tokenizer bytes');
  check(expectedMetadataFiles.some((record) => record.path === selection.candidate.retained_license_text_path_sha256_and_scope.path && record.sha256 === selection.candidate.retained_license_text_path_sha256_and_scope.sha256), 'selected-model composed metadata lacks the exact retained license bytes');
  const expectedWeightFiles = weightTransports.map((record) => ({role:'dense-safetensors',path:record.path,source:'immutable-hf-lfs-download',bytes:record.observed_bytes,sha256:record.observed_sha256,request_identity_or_metadata_body_sha256:sha256(Buffer.from(record.requested_url))}));
  const expectedComposedFiles = [...expectedMetadataFiles,...expectedWeightFiles].sort((left,right) => Buffer.from(left.path).compare(Buffer.from(right.path)));
  deepEqual(payload.files,expectedComposedFiles,'selected-model composed payload must exactly equal selection-bound metadata plus the N1-derived transport-verified shard manifest');
  const inventoryDigest = (records) => sha256(Buffer.from(records.map((record) => `${record.path}\t${record.bytes}\t${record.sha256}\n`).join('')));
  const expectedMetadataInventorySha256 = inventoryDigest([...expectedMetadataFiles].sort((left,right) => Buffer.from(left.path).compare(Buffer.from(right.path))));
  const expectedComposedInventorySha256 = inventoryDigest(expectedComposedFiles);
  check(payload.metadata_payload_inventory_sha256 === expectedMetadataInventorySha256 && payload.composed_payload_inventory_sha256 === expectedComposedInventorySha256 && payload.cache_entry_sha256 === expectedComposedInventorySha256 && payload.cache_entry_path === `.build/artifact-cache/functional-v1/sha256/${expectedComposedInventorySha256}/payload`, 'selected-model metadata/composed inventory or content-addressed cache digest/path drift');
  check(payload.output_manifest_path === acquisition.transport_contract.payload_output_manifest && /^[0-9a-f]{64}$/.test(payload.output_manifest_sha256), 'selected-model payload output-manifest identity missing');
  const outputManifest = readCanonicalReceipt(payload.output_manifest_path,'selected-model payload output manifest',16777216);
  check(outputManifest.file.hash === payload.output_manifest_sha256, 'selected-model payload output manifest hash drift');
  exactSet(Object.keys(outputManifest.receipt),acquisition.transport_contract.payload_output_manifest_fields,'selected-model payload output manifest fields');
  deepEqual(outputManifest.receipt,{schema_version:1,selected_candidate_id:payload.selected_candidate_id,selected_immutable_revision:payload.selected_immutable_revision,selected_weight_manifest_sha256:payload.selected_weight_manifest_sha256,metadata_payload_inventory_sha256:payload.metadata_payload_inventory_sha256,weight_transport_inventory_sha256:payload.weight_transport_inventory_sha256,composed_payload_inventory_sha256:payload.composed_payload_inventory_sha256,weight_transport_records:payload.weight_transport_records,files:payload.files,cache_entry_sha256:payload.cache_entry_sha256,cache_entry_path:payload.cache_entry_path},'selected-model payload output manifest/exact receipt identity');
  check(payload.weight_download_bytes === downloadedWeightBytes && downloadedWeightBytes <= acquisition.download_bytes_max && payload.metadata_refetch_requests === 0 && payload.fallback_requests === 0 && payload.upstream_bytes_unchanged === true && payload.tensor_allocation_absent === true && payload.fsync_complete === true && payload.atomic_rename_complete === true, 'selected-model transport phase violates exact bytes/no-refetch/no-allocation/atomic publication contract');
  const transportInventory = pathInventory(root,acquisition.transport_contract.weight_transport_receipt_root,'selected-model N3 weight transport receipt directory');
  exactArray(transportInventory.files.map((record) => record.path),weightTransports.map((record) => record.transport_receipt_path).sort((left,right) => Buffer.from(left).compare(Buffer.from(right))),'selected-model N3 exhaustive weight transport receipt directory');
  if (publishedPhaseCount === 1) return;
  const {file:definitiveFile,receipt:definitive} = readCanonicalReceipt(definitivePath,'selected-model definitive physical tensor admission',67108864);
  exactSet(Object.keys(definitive),acquisition.physical_tensor_admission.required_fields,'selected-model definitive physical tensor admission fields');
  check(definitive.schema_version === 1 && definitive.payload_acquisition_receipt_sha256 === payloadFile.hash && definitive.provisional_selection_receipt_sha256 === selectionFile.hash && definitive.metadata_publication_receipt_sha256 === selection.metadata_publication_receipt_sha256 && definitive.metadata_cache_entry_sha256 === selection.metadata_cache_entry_sha256 && definitive.selected_candidate_id === selectedCandidateId && definitive.selected_immutable_revision === selectedRevision && definitive.selected_weight_manifest_sha256 === selectedWeightManifestSha256 && definitive.verified_weight_transport_inventory_sha256 === payload.weight_transport_inventory_sha256 && definitive.composed_payload_inventory_sha256 === payload.composed_payload_inventory_sha256 && definitive.cache_entry_sha256 === payload.cache_entry_sha256 && definitive.cache_entry_path === payload.cache_entry_path, 'selected-model definitive admission N1 identity/verified shard transport/upstream/cache drift');
  const dtypeBytes = {F32:4,F16:2,BF16:2};
  exactSet(Object.keys(definitive.config_projection),acquisition.physical_tensor_admission.config_projection_fields,'selected-model definitive config projection fields');
  const config = definitive.config_projection;
  for (const field of ['vocabulary','d_model','layers','query_heads','kv_heads','d_ff']) check(Number.isSafeInteger(config[field]) && config[field] > 0, 'selected-model definitive config projection invalid ' + field);
  check(config.d_model % config.query_heads === 0 && config.query_heads % config.kv_heads === 0 && (config.d_model / config.query_heads) % 2 === 0 && config.tie_word_embeddings === true && config.attention_bias === false && config.mlp_bias === false && Object.hasOwn(dtypeBytes,config.weight_dtype), 'selected-model definitive config projection architecture/bias/tie/dtype drift');
  const selectedArchitecture = selection.candidate.architecture_config;
  const projectedDtype = {float32:'F32',float16:'F16',bfloat16:'BF16'}[selectedArchitecture.weight_dtype];
  deepEqual(config,{vocabulary:selectedArchitecture.vocabulary,d_model:selectedArchitecture.d_model,layers:selectedArchitecture.layers,query_heads:selectedArchitecture.query_heads,kv_heads:selectedArchitecture.kv_heads,d_ff:selectedArchitecture.d_ff,tie_word_embeddings:selectedArchitecture.tied_embeddings,attention_bias:selectedArchitecture.linear_bias,mlp_bias:selectedArchitecture.linear_bias,weight_dtype:projectedDtype},'selected-model definitive config projection is not the exact N1 immutable-config projection');
  const kvWidth = config.d_model * config.kv_heads / config.query_heads;
  const expectedSchema = [{name:'model.embed_tokens.weight',dtype:config.weight_dtype,shape:[config.vocabulary,config.d_model]}];
  for (let layer = 0; layer < config.layers; layer += 1) expectedSchema.push(
    {name:`model.layers.${layer}.self_attn.q_proj.weight`,dtype:config.weight_dtype,shape:[config.d_model,config.d_model]},
    {name:`model.layers.${layer}.self_attn.k_proj.weight`,dtype:config.weight_dtype,shape:[kvWidth,config.d_model]},
    {name:`model.layers.${layer}.self_attn.v_proj.weight`,dtype:config.weight_dtype,shape:[kvWidth,config.d_model]},
    {name:`model.layers.${layer}.self_attn.o_proj.weight`,dtype:config.weight_dtype,shape:[config.d_model,config.d_model]},
    {name:`model.layers.${layer}.mlp.gate_proj.weight`,dtype:config.weight_dtype,shape:[config.d_ff,config.d_model]},
    {name:`model.layers.${layer}.mlp.up_proj.weight`,dtype:config.weight_dtype,shape:[config.d_ff,config.d_model]},
    {name:`model.layers.${layer}.mlp.down_proj.weight`,dtype:config.weight_dtype,shape:[config.d_model,config.d_ff]},
    {name:`model.layers.${layer}.input_layernorm.weight`,dtype:config.weight_dtype,shape:[config.d_model]},
    {name:`model.layers.${layer}.post_attention_layernorm.weight`,dtype:config.weight_dtype,shape:[config.d_model]}
  );
  expectedSchema.push({name:'model.norm.weight',dtype:config.weight_dtype,shape:[config.d_model]});
  expectedSchema.sort((a,b) => Buffer.from(a.name).compare(Buffer.from(b.name)));
  check(definitive.config_expected_schema_sha256 === sha256(Buffer.from(canonicalJson(expectedSchema))), 'selected-model config-derived expected tensor schema hash drift');
  check(Array.isArray(definitive.shard_header_records) && definitive.shard_header_records.length > 0, 'selected-model retained SafeTensors header transcript inventory missing');
  unique(definitive.shard_header_records.map((record) => record.shard_path),'selected-model retained SafeTensors header shard paths');
  exactArray(definitive.shard_header_records.map((record) => record.shard_path),definitive.shard_header_records.map((record) => record.shard_path).sort((a,b) => Buffer.from(a).compare(Buffer.from(b))),'selected-model retained SafeTensors header shard order');
  const weightFiles = payload.files.filter((file) => file.role === 'dense-safetensors').sort((a,b) => Buffer.from(a.path).compare(Buffer.from(b.path)));
  exactArray(definitive.shard_header_records.map((record) => record.shard_path),weightFiles.map((file) => file.path),'selected-model retained header transcripts do not cover the exact acquired shard set');
  check(definitive.shard_inventory_sha256 === sha256(Buffer.from(canonicalJson(weightFiles.map((file) => ({path:file.path,bytes:file.bytes,sha256:file.sha256}))))), 'selected-model definitive shard inventory hash drift');
  const parsedTensorRecords = [];
  const payloadBytesByShard = new Map();
  for (const headerRecord of definitive.shard_header_records) {
    exactSet(Object.keys(headerRecord),acquisition.physical_tensor_admission.shard_header_record_fields,'selected-model retained shard header record fields');
    const weightFile = weightFiles.find((file) => file.path === headerRecord.shard_path);
    check(weightFile && headerRecord.file_bytes === weightFile.bytes && headerRecord.file_sha256 === weightFile.sha256 && Number.isSafeInteger(headerRecord.prefix_bytes) && headerRecord.prefix_bytes >= 10 && headerRecord.prefix_bytes <= 16777224 && typeof headerRecord.prefix_base64 === 'string' && /^[0-9a-f]{64}$/.test(headerRecord.header_sha256), 'selected-model retained shard header/file identity invalid');
    const prefix = Buffer.from(headerRecord.prefix_base64,'base64');
    check(prefix.toString('base64') === headerRecord.prefix_base64 && prefix.length === headerRecord.prefix_bytes && prefix.length >= 10, 'selected-model retained SafeTensors prefix base64/size drift');
    const headerLengthBig = prefix.readBigUInt64LE(0);
    check(headerLengthBig <= BigInt(Number.MAX_SAFE_INTEGER), 'selected-model SafeTensors header length exceeds safe integer');
    const headerLength = Number(headerLengthBig);
    check(headerLength === headerRecord.header_length && headerLength >= 2 && headerLength <= 16777216 && prefix.length === 8 + headerLength && prefix.length <= weightFile.bytes, 'selected-model SafeTensors first-u64/header/file bound drift');
    const headerBytes = prefix.subarray(8);
    check(sha256(headerBytes) === headerRecord.header_sha256, 'selected-model retained SafeTensors header hash drift');
    let headerText;
    try { headerText = new TextDecoder('utf-8',{fatal:true}).decode(headerBytes); } catch { fail('selected-model SafeTensors header is not fatal UTF-8'); }
    const header = parseJsonExact(headerText,'selected-model retained SafeTensors header');
    check(isRecord(header), 'selected-model SafeTensors header must be an object');
    const shardRecords = [];
    for (const [name,value] of Object.entries(header)) {
      if (name === '__metadata__') { check(isRecord(value), 'selected-model SafeTensors __metadata__ must be an object'); continue; }
      check(typeof name === 'string' && name.length > 0 && isRecord(value), 'selected-model SafeTensors tensor name/record invalid');
      exactSet(Object.keys(value),['dtype','shape','data_offsets'],'selected-model SafeTensors header tensor record fields');
      check(Object.hasOwn(dtypeBytes,value.dtype) && Array.isArray(value.shape) && value.shape.length > 0 && value.shape.every((dimension) => Number.isSafeInteger(dimension) && dimension > 0) && Array.isArray(value.data_offsets) && value.data_offsets.length === 2 && value.data_offsets.every((offset) => Number.isSafeInteger(offset) && offset >= 0) && value.data_offsets[1] > value.data_offsets[0], 'selected-model SafeTensors header dtype/shape/offset invalid');
      let elements = 1;
      for (const dimension of value.shape) { check(elements <= Number.MAX_SAFE_INTEGER / dimension, 'selected-model retained header tensor element-count overflow'); elements *= dimension; }
      check(elements <= Number.MAX_SAFE_INTEGER / dtypeBytes[value.dtype] && value.data_offsets[1] - value.data_offsets[0] === elements * dtypeBytes[value.dtype], 'selected-model retained header tensor byte-span arithmetic drift');
      shardRecords.push({name,shard_path:headerRecord.shard_path,dtype:value.dtype,shape:value.shape,data_offsets:value.data_offsets,element_count:elements,byte_count:elements * dtypeBytes[value.dtype]});
    }
    shardRecords.sort((left,right) => left.data_offsets[0] - right.data_offsets[0] || left.data_offsets[1] - right.data_offsets[1] || Buffer.from(left.name).compare(Buffer.from(right.name)));
    let priorEnd = 0;
    for (const record of shardRecords) { check(record.data_offsets[0] === priorEnd, 'selected-model retained SafeTensors offsets overlap/gap in ' + headerRecord.shard_path); priorEnd = record.data_offsets[1]; }
    check(priorEnd === weightFile.bytes - headerRecord.prefix_bytes, 'selected-model retained SafeTensors offsets leave trailing/unclaimed payload or exceed file length in ' + headerRecord.shard_path);
    payloadBytesByShard.set(headerRecord.shard_path,priorEnd);
    parsedTensorRecords.push(...shardRecords);
  }
  check(definitive.safetensors_header_inventory_sha256 === sha256(Buffer.from(canonicalJson(definitive.shard_header_records))), 'selected-model retained SafeTensors header inventory hash drift');
  parsedTensorRecords.sort((a,b) => Buffer.from(a.name).compare(Buffer.from(b.name)));
  check(Array.isArray(definitive.tensor_names_shapes_dtypes_offsets) && definitive.tensor_names_shapes_dtypes_offsets.length > 0, 'selected-model definitive tensor census missing');
  exactArray(definitive.tensor_names_shapes_dtypes_offsets.map((record) => record.name),definitive.tensor_names_shapes_dtypes_offsets.map((record) => record.name).sort((a,b) => Buffer.from(a).compare(Buffer.from(b))),'selected-model definitive tensor manifest name order');
  deepEqual(definitive.tensor_names_shapes_dtypes_offsets,parsedTensorRecords,'selected-model definitive tensor manifest does not equal reparsed retained header bytes');
  check(definitive.complete_tensor_manifest_sha256 === sha256(Buffer.from(canonicalJson(parsedTensorRecords))), 'selected-model definitive complete tensor manifest hash drift');
  unique(parsedTensorRecords.map((record) => record.name),'selected-model definitive tensor names');
  exactArray(parsedTensorRecords.map((record) => ({name:record.name,dtype:record.dtype,shape:record.shape})),expectedSchema,'selected-model physical header tensors do not exactly equal config-derived name/shape/dtype schema');
  let physicalElements = 0;
  let physicalBytes = 0;
  const byShard = new Map();
  for (const record of definitive.tensor_names_shapes_dtypes_offsets) {
    exactSet(Object.keys(record),acquisition.physical_tensor_admission.tensor_record_fields,'selected-model physical tensor record fields');
    check(typeof record.name === 'string' && record.name.length > 0 && !record.name.includes('..') && typeof record.shard_path === 'string' && payload.files.some((file) => file.path === record.shard_path && file.role === 'dense-safetensors') && Object.hasOwn(dtypeBytes,record.dtype) && Array.isArray(record.shape) && record.shape.length > 0 && record.shape.every((value) => Number.isSafeInteger(value) && value > 0) && Array.isArray(record.data_offsets) && record.data_offsets.length === 2 && record.data_offsets.every((value) => Number.isSafeInteger(value) && value >= 0) && record.data_offsets[1] > record.data_offsets[0], 'selected-model physical tensor name/shard/dtype/shape/offset invalid');
    let elements = 1;
    for (const dimension of record.shape) { check(elements <= Number.MAX_SAFE_INTEGER / dimension, 'selected-model tensor element-count overflow'); elements *= dimension; }
    check(record.element_count === elements && elements <= Number.MAX_SAFE_INTEGER / dtypeBytes[record.dtype] && record.byte_count === elements * dtypeBytes[record.dtype] && record.data_offsets[1] - record.data_offsets[0] === record.byte_count, 'selected-model physical tensor element/byte/offset arithmetic drift');
    check(!/(?:^|[._])bias(?:$|[._])/i.test(record.name) && !/(?:^|\.)lm_head(?:\.|$)|(?:^|\.)output\.weight$/i.test(record.name), 'selected-model physical tensor census contains a bias or separate tied output-head payload');
    physicalElements += elements;
    physicalBytes += record.byte_count;
    const records = byShard.get(record.shard_path) || [];
    records.push(record);
    byShard.set(record.shard_path,records);
  }
  for (const [shardPath,records] of byShard) {
    records.sort((left,right) => left.data_offsets[0] - right.data_offsets[0] || left.data_offsets[1] - right.data_offsets[1] || Buffer.from(left.name).compare(Buffer.from(right.name)));
    let priorEnd = 0;
    for (const record of records) { check(record.data_offsets[0] === priorEnd, 'selected-model SafeTensors physical offsets overlap/gap or depend on name/header order in ' + shardPath); priorEnd = record.data_offsets[1]; }
    check(priorEnd === payloadBytesByShard.get(shardPath), 'selected-model SafeTensors receipt/header payload length drift ' + shardPath);
  }
  const expectedParameterCount = config.vocabulary * config.d_model + config.layers * (2 * config.d_model * config.d_model + 2 * config.d_model * config.d_model * config.kv_heads / config.query_heads + 3 * config.d_model * config.d_ff + 2 * config.d_model) + config.d_model;
  check(definitive.physical_parameter_count === physicalElements && physicalElements === expectedParameterCount && physicalElements >= 20000000 && physicalElements <= 50000000 && definitive.physical_tensor_bytes === physicalBytes && definitive.no_bias_tensors === true && definitive.tied_head_no_separate_payload === true && definitive.all_checks_before_allocation === true && definitive.fsync_complete === true && definitive.atomic_rename_complete === true, 'selected-model definitive config/formula/physical count/bias/tie/preallocation/atomic gate drift');
  check(definitive.parser_execution_receipt_path === acquisition.physical_tensor_admission.parser_execution_receipt, 'selected-model parser execution receipt path drift');
  const {file:parserExecutionFile,receipt:parserExecution} = readCanonicalReceipt(definitive.parser_execution_receipt_path,'selected-model physical admission parser execution receipt',4194304);
  exactSet(Object.keys(parserExecution),acquisition.physical_tensor_admission.parser_execution_receipt_fields,'selected-model parser execution receipt fields');
  const physicalTarget = constants.execution_boundary_records.offline_workspace.target_registry.find((record) => record.step_id === step.id && record.target_id === 'acquire-functional-open-model-physical-admission-v1');
  const runtimeReceiptFile = readBounded(root,physicalTarget.runtime_image_selector.receipt,'selected-model physical admission runtime receipt',4194304);
  const parserSource = hashRegularFile(resolveInside(root,'scripts/check-functional-selected-open-model-admission.mjs','selected-model physical admission parser source'));
  const parserStarted = Date.parse(parserExecution.started_at), parserFinished = Date.parse(parserExecution.finished_at);
  check(definitive.parser_execution_receipt_sha256 === parserExecutionFile.hash && parserExecution.schema_version === 1 && parserExecution.step_id === step.id && parserExecution.target_id === physicalTarget.target_id && parserExecution.command_sha256 === sha256(Buffer.from(physicalTarget.commands[1])) && parserExecution.parser_source_path === 'scripts/check-functional-selected-open-model-admission.mjs' && parserExecution.parser_source_sha256 === parserSource.sha256 && parserExecution.runtime_selector_receipt_sha256 === runtimeReceiptFile.hash && parserExecution.payload_acquisition_receipt_sha256 === payloadFile.hash && parserExecution.config_projection_sha256 === sha256(Buffer.from(canonicalJson(config))) && parserExecution.shard_header_inventory_sha256 === definitive.safetensors_header_inventory_sha256 && parserExecution.complete_tensor_manifest_sha256 === definitive.complete_tensor_manifest_sha256 && Number.isSafeInteger(parserExecution.bytes_read_before_admission) && parserExecution.bytes_read_before_admission >= definitive.shard_header_records.reduce((sum,record) => sum + record.prefix_bytes,0) && parserExecution.tensor_payload_bytes_mapped_before_admission === 0 && parserExecution.tensor_allocations_before_admission === 0 && parserExecution.result === 'pass' && Number.isFinite(parserStarted) && Number.isFinite(parserFinished) && parserFinished >= parserStarted && parserExecution.wall_milliseconds === parserFinished - parserStarted && /^[0-9a-f]{64}$/.test(parserExecution.output_inventory_sha256) && parserExecution.fsync_complete === true && parserExecution.atomic_rename_complete === true, 'selected-model physical admission parser source/runtime/header/preallocation execution binding drift');
  if (publishedPhaseCount === 2) return;
  const toolchainPath = constants.execution_boundary_records.offline_workspace.supporting_dependency_refresh.validation_oracle_toolchains.admission.receipt;
  const toolchainFile = readBounded(root,toolchainPath,'selected-model validation-oracle toolchain receipt',4194304);
  const toolchainReceipt = parseJsonExact(toolchainFile.text,'selected-model validation-oracle toolchain receipt');
  check(toolchainFile.text === canonicalJson(toolchainReceipt), 'selected-model validation-oracle toolchain receipt is not canonical JSON');
  exactSet(Object.keys(toolchainReceipt),constants.execution_boundary_records.offline_workspace.supporting_dependency_refresh.validation_oracle_toolchains.admission.required_receipt_fields,'selected-model validation-oracle toolchain receipt fields');
  const oracleTargets = constants.execution_boundary_records.validation_oracles.target_registry.filter((record) => record.step_id === step.id);
  const tokenizerPath = oraclePublisher.tokenizer_source_receipt;
  const tokenizerLogPath = oraclePublisher.tokenizer_execution_log;
  const densePath = oraclePublisher.dense_source_receipt;
  const denseLogPath = oraclePublisher.dense_execution_log;
  const oraclePublicationPath = oraclePublisher.publication_receipt;
  const validateSourceOracle = (path,logPath,kind,specificFields) => {
    const targetId = kind === 'selected-tokenizer' ? 'selected-tokenizer-oracle-v1' : 'selected-dense-logit-oracle-v1';
    const target = oracleTargets.find((record) => record.target_id === targetId);
    check(target, 'selected-model source oracle target missing ' + targetId);
    const driverFile = hashRegularFile(resolveInside(root,target.driver,'selected-model source oracle driver'));
    const specFile = hashRegularFile(resolveInside(root,target.spec,'selected-model source oracle spec'));
    const closedCommand = step.validate.find((command) => command.startsWith('scripts/run-functional-validation-oracle.sh ' + targetId + ' '));
    check(closedCommand, 'selected-model source oracle closed host command missing ' + targetId);
    const {file,receipt} = readCanonicalReceipt(path,'selected-model ' + kind + ' source oracle receipt',16777216);
    exactSet(Object.keys(receipt),[...oraclePublisher.source_receipt_common_fields,...specificFields],'selected-model ' + kind + ' source oracle receipt fields');
    const runtimeImageId = toolchainReceipt[target.runtime_selector.image_id_field];
    const runtimeImageManifestDigest = toolchainReceipt[target.runtime_selector.image_manifest_digest_field];
    const expectedRuntimeIdentity = sha256(Buffer.from(canonicalJson({toolchain_receipt_sha256:toolchainFile.hash,target_id:targetId,driver_sha256:driverFile.sha256,spec_sha256:specFile.sha256,runtime_image_id:runtimeImageId,runtime_image_manifest_digest:runtimeImageManifestDigest})));
    const outputManifestPath = kind === 'selected-tokenizer' ? oraclePublisher.source_output_manifest_contract.tokenizer_path : oraclePublisher.source_output_manifest_contract.dense_path;
    check(receipt.schema_version === 1 && receipt.oracle_kind === kind && typeof receipt.source_run_id === 'string' && /^\d{8}T\d{6}Z-[a-z0-9-]+-\d{2}$/.test(receipt.source_run_id) && receipt.source_target_id === targetId && receipt.driver_path === target.driver && receipt.driver_sha256 === driverFile.sha256 && receipt.spec_path === target.spec && receipt.spec_sha256 === specFile.sha256 && receipt.closed_command_sha256 === sha256(Buffer.from(closedCommand)) && receipt.definitive_admission_receipt_sha256 === definitiveFile.hash && receipt.oracle_toolchain_receipt_sha256 === toolchainFile.hash && receipt.runtime_selector_receipt_sha256 === toolchainFile.hash && receipt.runtime_image_id === runtimeImageId && receipt.runtime_image_manifest_digest === runtimeImageManifestDigest && /^[0-9a-f]{64}$/.test(receipt.executor_context_identity_sha256) && receipt.payload_cache_entry_sha256 === definitive.cache_entry_sha256 && /^[0-9a-f]{64}$/.test(receipt.input_inventory_sha256) && Number.isSafeInteger(receipt.input_count) && receipt.input_count > 0 && receipt.source_runtime_identity_sha256 === expectedRuntimeIdentity && receipt.source_execution_log_path === logPath && /^[0-9a-f]{64}$/.test(receipt.source_execution_log_sha256) && receipt.output_manifest_path === outputManifestPath && /^[0-9a-f]{64}$/.test(receipt.output_manifest_sha256) && /^[0-9a-f]{64}$/.test(receipt.cache_entry_sha256) && receipt.cache_entry_path === `.build/artifact-cache/functional-v1/sha256/${receipt.cache_entry_sha256}/payload`, 'selected-model ' + kind + ' source oracle target/driver/spec/runtime/run/cache binding drift');
    const started = Date.parse(receipt.started_at), finished = Date.parse(receipt.finished_at);
    check(Number.isFinite(started) && Number.isFinite(finished) && finished >= started && receipt.wall_milliseconds === finished - started && Number.isSafeInteger(receipt.bytes_read) && receipt.bytes_read > 0 && Number.isSafeInteger(receipt.bytes_written) && receipt.bytes_written > 0 && receipt.network_requests === 0 && receipt.network_bytes === 0 && receipt.course_binary_absent === true && receipt.course_expected_output_absent === true && receipt.fsync_complete === true && receipt.atomic_rename_complete === true, 'selected-model ' + kind + ' source oracle chronology/resource/isolation drift');
    const {file:logFile,receipt:log} = readCanonicalReceipt(logPath,'selected-model ' + kind + ' source execution log',4194304);
    exactSet(Object.keys(log),oraclePublisher.source_execution_log_fields,'selected-model ' + kind + ' source execution log fields');
    check(receipt.source_execution_log_sha256 === logFile.hash && log.schema_version === 1 && log.source_run_id === receipt.source_run_id && log.source_target_id === targetId && log.closed_command_sha256 === receipt.closed_command_sha256 && log.runtime_image_id === runtimeImageId && log.executor_context_identity_sha256 === receipt.executor_context_identity_sha256 && log.started_at === receipt.started_at && log.finished_at === receipt.finished_at && log.wall_milliseconds === receipt.wall_milliseconds && log.network_requests === 0 && log.network_bytes === 0 && log.bytes_read === receipt.bytes_read && log.bytes_written === receipt.bytes_written && log.output_manifest_sha256 === receipt.output_manifest_sha256 && log.result === 'pass' && log.fsync_complete === true && log.atomic_rename_complete === true, 'selected-model ' + kind + ' retained execution log/run/output identity drift');
    const {file:manifestFile,receipt:manifest} = readCanonicalReceipt(outputManifestPath,'selected-model ' + kind + ' source output manifest',16777216);
    const manifestContract = oraclePublisher.source_output_manifest_contract;
    exactSet(Object.keys(manifest),manifestContract.required_fields,'selected-model ' + kind + ' source output manifest fields');
    check(manifestFile.hash === receipt.output_manifest_sha256 && manifest.schema_version === manifestContract.schema_version && manifest.oracle_kind === kind && manifest.source_run_id === receipt.source_run_id && manifest.source_target_id === targetId && manifest.definitive_admission_receipt_sha256 === definitiveFile.hash && manifest.input_inventory_sha256 === receipt.input_inventory_sha256, 'selected-model ' + kind + ' source output manifest receipt/run/input binding drift');
    const roleToReceiptField = manifestContract.role_to_receipt_field[kind];
    const roleToPath = manifestContract.role_to_relative_path[kind];
    const expectedRoles = Object.keys(roleToReceiptField);
    check(Array.isArray(manifest.files), 'selected-model ' + kind + ' source output manifest files missing');
    exactArray(manifest.files.map((record) => record.role),expectedRoles,'selected-model ' + kind + ' source output manifest role order');
    unique(manifest.files.map((record) => record.path),'selected-model ' + kind + ' source output manifest paths');
    for (const record of manifest.files) {
      exactSet(Object.keys(record),manifestContract.file_fields,'selected-model ' + kind + ' source output manifest file fields');
      check(record.path === roleToPath[record.role] && Number.isSafeInteger(record.bytes) && record.bytes > 0 && /^[0-9a-f]{64}$/.test(record.sha256) && record.sha256 === receipt[roleToReceiptField[record.role]], 'selected-model ' + kind + ' source output manifest role/path/bytes/hash drift ' + record.role);
    }
    const orderedFiles = [...manifest.files].sort((left,right) => Buffer.from(left.path).compare(Buffer.from(right.path)));
    const outputInventorySha256 = sha256(Buffer.from(orderedFiles.map((record) => `${record.path}\t${record.bytes}\t${record.sha256}\n`).join('')));
    check(manifest.output_inventory_sha256 === outputInventorySha256 && manifest.cache_entry_sha256 === outputInventorySha256 && manifest.cache_entry_path === `.build/artifact-cache/functional-v1/sha256/${outputInventorySha256}/payload` && receipt.cache_entry_sha256 === outputInventorySha256 && receipt.cache_entry_path === manifest.cache_entry_path, 'selected-model ' + kind + ' source output inventory/content-addressed cache identity drift');
    return {file,receipt,logFile,manifestFile,manifest,finished};
  };
  const tokenizerOracle = validateSourceOracle(tokenizerPath,tokenizerLogPath,'selected-tokenizer',oraclePublisher.tokenizer_source_receipt_fields);
  check(tokenizerOracle.receipt.strings_count === tokenizerOracle.receipt.input_count && tokenizerOracle.receipt.strings_count >= oraclePublisher.tokenizer_contract.strings_min && tokenizerOracle.receipt.all_exact === true && ['tokenizer_payload_sha256','exact_token_id_records_sha256','per_token_decoded_bytes_sha256','concatenated_round_trip_bytes_sha256','template_identity_sha256'].every((field) => /^[0-9a-f]{64}$/.test(tokenizerOracle.receipt[field])), 'selected tokenizer source oracle exact >=100 token/byte/template evidence drift');
  const denseOracle = validateSourceOracle(densePath,denseLogPath,'selected-dense',oraclePublisher.dense_source_receipt_fields);
  check(denseOracle.receipt.prompt_count === denseOracle.receipt.input_count && denseOracle.receipt.prompt_count >= 100 && Number.isSafeInteger(denseOracle.receipt.positions_total) && denseOracle.receipt.positions_total >= denseOracle.receipt.prompt_count && Number.isSafeInteger(denseOracle.receipt.vocabulary) && denseOracle.receipt.vocabulary > 0 && denseOracle.receipt.total_logits === denseOracle.receipt.positions_total * denseOracle.receipt.vocabulary && denseOracle.receipt.logit_bytes === denseOracle.receipt.total_logits * 4 && denseOracle.receipt.dtype === 'f32' && /^[0-9a-f]{64}$/.test(denseOracle.receipt.all_position_all_vocabulary_logits_sha256), 'selected dense source oracle is not complete all-position/all-vocabulary f32 evidence');
  const {file:oraclePublicationFile,receipt:oraclePublication} = readCanonicalReceipt(oraclePublicationPath,'selected-model oracle cache publication receipt',4194304);
  exactSet(Object.keys(oraclePublication),oraclePublisher.publication_receipt_fields,'selected-model oracle publication fields');
  const oracleInventoryFiles = [
    {path:tokenizerPath,bytes:tokenizerOracle.file.bytes.length,sha256:tokenizerOracle.file.hash},
    {path:tokenizerLogPath,bytes:tokenizerOracle.logFile.bytes.length,sha256:tokenizerOracle.logFile.hash},
    {path:tokenizerOracle.receipt.output_manifest_path,bytes:tokenizerOracle.manifestFile.bytes.length,sha256:tokenizerOracle.manifestFile.hash},
    {path:densePath,bytes:denseOracle.file.bytes.length,sha256:denseOracle.file.hash},
    {path:denseLogPath,bytes:denseOracle.logFile.bytes.length,sha256:denseOracle.logFile.hash},
    {path:denseOracle.receipt.output_manifest_path,bytes:denseOracle.manifestFile.bytes.length,sha256:denseOracle.manifestFile.hash}
  ].sort((left,right) => Buffer.from(left.path).compare(Buffer.from(right.path)));
  const expectedOracleInventorySha256 = sha256(Buffer.from(oracleInventoryFiles.map((record) => `${record.path}\t${record.bytes}\t${record.sha256}\n`).join('')));
  check(oraclePublication.schema_version === 1 && oraclePublication.definitive_admission_receipt_sha256 === definitiveFile.hash && oraclePublication.tokenizer_source_receipt_sha256 === tokenizerOracle.file.hash && oraclePublication.tokenizer_execution_log_sha256 === tokenizerOracle.logFile.hash && oraclePublication.tokenizer_output_manifest_sha256 === tokenizerOracle.manifestFile.hash && oraclePublication.tokenizer_source_run_id === tokenizerOracle.receipt.source_run_id && oraclePublication.tokenizer_executor_context_identity_sha256 === tokenizerOracle.receipt.executor_context_identity_sha256 && oraclePublication.tokenizer_cache_entry_sha256 === tokenizerOracle.receipt.cache_entry_sha256 && oraclePublication.tokenizer_cache_entry_path === tokenizerOracle.receipt.cache_entry_path && Date.parse(oraclePublication.tokenizer_finished_at) === tokenizerOracle.finished && oraclePublication.dense_source_receipt_sha256 === denseOracle.file.hash && oraclePublication.dense_execution_log_sha256 === denseOracle.logFile.hash && oraclePublication.dense_output_manifest_sha256 === denseOracle.manifestFile.hash && oraclePublication.dense_source_run_id === denseOracle.receipt.source_run_id && oraclePublication.dense_executor_context_identity_sha256 === denseOracle.receipt.executor_context_identity_sha256 && oraclePublication.dense_cache_entry_sha256 === denseOracle.receipt.cache_entry_sha256 && oraclePublication.dense_cache_entry_path === denseOracle.receipt.cache_entry_path && Date.parse(oraclePublication.dense_finished_at) === denseOracle.finished && tokenizerOracle.receipt.source_run_id !== denseOracle.receipt.source_run_id && tokenizerOracle.receipt.executor_context_identity_sha256 !== denseOracle.receipt.executor_context_identity_sha256 && oraclePublication.source_finished_before_course_import === true && oraclePublication.two_independent_source_runs === true && oraclePublication.distinct_source_run_ids === true && oraclePublication.distinct_executor_contexts === true && oraclePublication.canonical_inventory_sha256 === expectedOracleInventorySha256 && oraclePublication.fsync_complete === true && oraclePublication.atomic_rename_complete === true, 'selected-model two-source-oracle publication target/run/context/log/manifest/cache binding or independence drift');
  if (publishedPhaseCount === 3) return;
  const integrationPaths = integration.output_receipts;
  check(integrationPaths.length === 3, 'selected-model course integration receipt set drift');
  for (const [index,path] of integrationPaths.entries()) {
    const {receipt} = readCanonicalReceipt(path,'selected-model course integration receipt ' + index,16777216);
    const specific = index === 0 ? integration.tokenizer_receipt_fields : index === 1 ? integration.dense_receipt_fields : integration.quantized_receipt_fields;
    exactSet(Object.keys(receipt),[...integration.integration_receipt_common_fields,...specific],'selected-model course integration receipt fields ' + index);
    const source = index === 0 ? tokenizerOracle : denseOracle;
    check(receipt.schema_version === 1 && receipt.definitive_admission_receipt_sha256 === definitiveFile.hash && receipt.source_oracle_publication_receipt_sha256 === oraclePublicationFile.hash && receipt.source_oracle_receipt_sha256 === source.file.hash && Date.parse(receipt.source_runtime_finished_at) === source.finished && Date.parse(receipt.course_import_started_at) >= source.finished && Date.parse(receipt.course_import_finished_at) >= Date.parse(receipt.course_import_started_at) && receipt.source_finished_and_published_before_course_import === true && receipt.result === 'pass', 'selected-model course integration source-before-course chronology/upstream/result drift ' + index);
    const expectedInputCache = index === 0 ? tokenizerOracle.receipt.cache_entry_sha256 : index === 1 ? denseOracle.receipt.cache_entry_sha256 : definitive.cache_entry_sha256;
    const expectedInputCachePath = index === 0 ? tokenizerOracle.receipt.cache_entry_path : index === 1 ? denseOracle.receipt.cache_entry_path : definitive.cache_entry_path;
    const expectedSourceManifest = index === 0 ? tokenizerOracle.manifestFile.hash : denseOracle.manifestFile.hash;
    check(receipt.course_workspace_image_receipt_sha256 === runtimeReceiptFile.hash && receipt.input_cache_entry_sha256 === expectedInputCache && receipt.input_cache_entry_path === expectedInputCachePath && receipt.source_oracle_output_manifest_sha256 === expectedSourceManifest && /^[0-9a-f]{64}$/.test(receipt.output_inventory_sha256), 'selected-model course integration workspace/cache/source-manifest/output identity drift ' + index);
    if (index === 0) check(receipt.integration_kind === 'selected-tokenizer' && receipt.strings_count === tokenizerOracle.receipt.strings_count && receipt.strings_count >= 100 && receipt.exact_token_ids === true && receipt.per_token_and_concatenated_bytes_equal === true && receipt.round_trip_equal === true && receipt.template_identity_equal === true, 'selected-model course tokenizer exact parity receipt drift');
    if (index === 1) check(receipt.integration_kind === 'selected-dense' && receipt.prompt_count === denseOracle.receipt.prompt_count && receipt.positions_total === denseOracle.receipt.positions_total && receipt.vocabulary === denseOracle.receipt.vocabulary && receipt.all_position_all_vocabulary_logits_compared === true && receipt.atol === oraclePublisher.dense_contract.atol && receipt.rtol === oraclePublisher.dense_contract.rtol && Number.isFinite(receipt.max_abs_error) && receipt.max_abs_error <= receipt.atol && Number.isFinite(receipt.max_rel_error) && receipt.max_rel_error <= receipt.rtol, 'selected-model course dense all-position/all-vocabulary parity receipt drift');
    if (index === 2) check(receipt.integration_kind === 'selected-quantized' && /^[0-9a-f]{64}$/.test(receipt.source_dense_manifest_sha256) && /^[0-9a-f]{64}$/.test(receipt.course_derivative_manifest_sha256) && /^[0-9a-f]{64}$/.test(receipt.lineage_receipt_sha256) && receipt.preallocation_refusal_tests_passed === true, 'selected-model course quantized lineage/preallocation receipt drift');
  }
}
function validateCompletedGpuReceipts(root, constants, byId) {
  const gpu = constants.execution_boundary_records.gpu;
  const contract = gpu.completed_receipt_contract;
  check(contract?.schema_version === 2, 'completed GPU receipt contract missing');
  const completedTargets = [];
  for (const target of gpu.target_registry) {
    const step = byId.get(target.step_id);
    check(step, 'GPU target producer step missing ' + target.step_id);
    const canonicalPresent = existsSync(resolve(root,target.receipt_path));
    if (step.status === 'completed') completedTargets.push(target);
    else if (canonicalPresent && step.status === 'running' && step.runs.at(-1)?.status === 'running') completedTargets.push(target);
    else check(!canonicalPresent, 'GPU canonical receipt exists outside a completed target or exact current running aggregate phase prefix ' + target.receipt_path);
  }
  if (completedTargets.length === 0) return;
  const dependencyContract = constants.execution_boundary_records.offline_workspace.supporting_dependency_refresh;
  const dependencyFile = readBounded(root,dependencyContract.receipt,'GPU dependency-refresh runtime selector',4194304);
  const dependencyReceipt = parseJsonExact(dependencyFile.text,'GPU dependency-refresh runtime selector');
  check(dependencyFile.text === canonicalJson(dependencyReceipt), 'GPU dependency-refresh runtime selector is not canonical JSON');
  exactSet(Object.keys(dependencyReceipt),dependencyContract.required_receipt_fields,'GPU dependency-refresh runtime selector fields');
  const dockerfile = hashRegularFile(resolveInside(root,gpu.dockerfile,'GPU derived-image Dockerfile'));
  const phaseSpec = hashRegularFile(resolveInside(root,gpu.target_config,'GPU exact phase specification'));
  const imageProjection = {parent_dependency_refresh_receipt_sha256:dependencyFile.hash,parent_workspace_image_id:dependencyReceipt.derived_image_id,dockerfile_path:gpu.dockerfile,dockerfile_sha256:dockerfile.sha256,phase_spec_path:gpu.target_config,phase_spec_sha256:phaseSpec.sha256};
  const expectedGpuImageManifestDigest = sha256(Buffer.from(canonicalJson(imageProjection)));
  const expectedGpuImageId = 'sha256:' + expectedGpuImageManifestDigest;
  const owned = (step,path) => step.outputs.some((output) => path === output.replace(/\/$/,'') || (output.endsWith('/') && path.startsWith(output)));
  for (const target of completedTargets) {
    const step = byId.get(target.step_id);
    const canonicalPresent = existsSync(resolve(root,target.receipt_path));
    check(canonicalPresent, 'completed GPU target lacks canonical receipt ' + target.receipt_path);
    const file = readBounded(root,target.receipt_path,'completed GPU receipt ' + target.target_id,16777216);
    const receipt = parseJsonExact(file.text,'completed GPU receipt ' + target.target_id);
    check(file.text === canonicalJson(receipt), target.target_id + ' GPU receipt is not canonical JSON');
    exactSet(Object.keys(receipt),unique([...target.runner_publication.required_fields,...contract.additional_required_fields]),target.target_id + ' completed GPU receipt fields');
    const run = step.runs.at(-1);
    check(run && (run.status === 'succeeded' || (step.status === 'running' && run.status === 'running')), target.target_id + ' GPU producer is neither completed nor the exact current running phase');
    const runArtifacts = new Map(run.artifacts.map((artifact) => [artifact.path,artifact.sha256]));
    check(runArtifacts.get(target.receipt_path) === file.hash, target.target_id + ' succeeded run does not hash-bind the canonical GPU receipt');
    check(receipt.schema_version === contract.schema_version && receipt.step_id === target.step_id && receipt.target_id === target.target_id && receipt.phase_id === target.phase_id && receipt.phase_spec_sha256 === phaseSpec.sha256 && receipt.source_tree_sha256 === sha256(Buffer.from(run.input_fingerprint.source_tree_sha1)) && receipt.profile_id === target.profile_id, target.target_id + ' GPU receipt schema/producer/phase/spec/source/profile drift');
    deepEqual(receipt.seeds,target.seeds,target.target_id + ' GPU receipt seed registry');
    exactSet(Object.keys(receipt.backend_and_kernel_record),contract.backend_and_kernel_fields,target.target_id + ' GPU backend/kernel record fields');
    const backendContract = target.backend_and_kernel_contract;
    const backendSource = hashRegularFile(resolveInside(root,backendContract.source_path,target.target_id + ' GPU backend source'));
    const expectedBackendRecord = {source_path:backendContract.source_path,source_sha256:backendSource.sha256,backend_id:backendContract.backend_id,backend_sha256:sha256(Buffer.from(backendContract.backend_id)),kernel_id:backendContract.kernel_id,kernel_sha256:sha256(Buffer.from(canonicalJson({target_id:target.target_id,kernel_id:backendContract.kernel_id,source_sha256:backendSource.sha256})))};
    deepEqual(receipt.backend_and_kernel_record,expectedBackendRecord,target.target_id + ' GPU backend/kernel source and identity record');
    check(receipt.backend_and_kernel_sha256 === sha256(Buffer.from(canonicalJson(expectedBackendRecord))), target.target_id + ' GPU backend/kernel record hash drift');
    check(receipt.dependency_refresh_receipt_sha256 === dependencyFile.hash && receipt.parent_workspace_image_id === dependencyReceipt.derived_image_id && receipt.derived_gpu_image_manifest_digest === expectedGpuImageManifestDigest && receipt.derived_gpu_image_id === expectedGpuImageId, target.target_id + ' GPU parent/derived immutable image identity drift');
    check(receipt.admission_receipt_selector_sha256 === sha256(Buffer.from(canonicalJson(target.admission_receipt_selector))), target.target_id + ' GPU admission-selector contract hash drift');
    const admissionInput = target.admission_receipt_selector.input_receipt;
    if (admissionInput) {
      const admissionFile = readBounded(root,admissionInput,target.target_id + ' GPU admission input receipt',16777216);
      check(receipt.device_preflight_or_definitive_receipt_sha256 === admissionFile.hash, target.target_id + ' GPU admission input receipt hash drift');
    } else check(receipt.device_preflight_or_definitive_receipt_sha256 === 'absent', target.target_id + ' GPU receipt falsely claims an admission input while emitting preflight');
    check(Array.isArray(receipt.input_receipt_sha256_and_cache_entry_sha256), target.target_id + ' GPU input receipt/cache binding inventory missing');
    exactArray(receipt.input_receipt_sha256_and_cache_entry_sha256.map((record) => record.receipt),target.input_bindings.map((binding) => binding.receipt),target.target_id + ' GPU input receipt order');
    for (let index = 0; index < target.input_bindings.length; index += 1) {
      const binding = target.input_bindings[index];
      const record = receipt.input_receipt_sha256_and_cache_entry_sha256[index];
      exactSet(Object.keys(record),contract.input_record_fields,target.target_id + ' GPU input binding fields ' + index);
      const inputFile = readBounded(root,binding.receipt,target.target_id + ' GPU input receipt ' + index,16777216);
      const inputReceipt = parseJsonExact(inputFile.text,target.target_id + ' GPU input receipt ' + index);
      const cacheIdentity = findReceiptCacheIdentity(inputReceipt,target.target_id + ' GPU input cache identity ' + index);
      check(record.receipt === binding.receipt && record.kind === binding.kind && record.receipt_sha256 === inputFile.hash, target.target_id + ' GPU input receipt path/kind/hash drift ' + index);
      if (binding.kind === 'cache_backed_payload') check(record.cache_entry_sha256_or_absent === cacheIdentity.sha256_or_absent && record.cache_entry_path_or_absent === cacheIdentity.path_or_absent && cacheIdentity.sha256_or_absent !== 'absent' && cacheIdentity.path_or_absent !== 'absent', target.target_id + ' GPU cache-backed input lacks exact cache selector ' + index);
      else check(binding.kind === 'receipt_only' && record.cache_entry_sha256_or_absent === 'absent' && record.cache_entry_path_or_absent === 'absent', target.target_id + ' GPU receipt-only input was reinterpreted as a cache selector ' + index);
    }
    check(Array.isArray(receipt.bundle_files) && receipt.bundle_files.length > 0, target.target_id + ' GPU bundle file inventory missing');
    exactArray(receipt.bundle_files.map((record) => record.path),receipt.bundle_files.map((record) => record.path).sort((a,b) => Buffer.from(a).compare(Buffer.from(b))),target.target_id + ' GPU bundle file UTF-8 order');
    unique(receipt.bundle_files.map((record) => record.path),target.target_id + ' GPU bundle file paths');
    for (const record of receipt.bundle_files) {
      exactSet(Object.keys(record),contract.bundle_file_fields,target.target_id + ' GPU bundle file fields');
      check(safeOutput(record.path,target.target_id + ' GPU bundle path') === record.path && owned(step,record.path) && Number.isSafeInteger(record.bytes) && record.bytes > 0 && /^[0-9a-f]{64}$/.test(record.sha256), target.target_id + ' GPU bundle file identity/ownership invalid ' + record.path);
      const observed = hashRegularFile(resolveInside(root,record.path,target.target_id + ' GPU bundle file'));
      check(observed.bytes === record.bytes && observed.sha256 === record.sha256 && runArtifacts.get(record.path) === record.sha256, target.target_id + ' GPU bundle file bytes/run binding drift ' + record.path);
    }
    const bundleInventorySha256 = sha256(Buffer.from(receipt.bundle_files.map((record) => `${record.path}\t${record.bytes}\t${record.sha256}\n`).join('')));
    check(receipt.bundle_inventory_sha256 === bundleInventorySha256, target.target_id + ' GPU bundle inventory hash drift');
    exactSet(Object.keys(receipt.wall_host_device_disk_peaks),contract.peak_fields,target.target_id + ' GPU peak fields');
    const peaks = receipt.wall_host_device_disk_peaks;
    check(Number.isFinite(peaks.wall_seconds) && peaks.wall_seconds >= 0 && peaks.wall_seconds <= target.ceilings.wall_seconds_max && Number.isSafeInteger(peaks.host_bytes) && peaks.host_bytes >= 0 && peaks.host_bytes <= target.ceilings.host_bytes_max && Number.isSafeInteger(peaks.device_bytes) && peaks.device_bytes >= 0 && peaks.device_bytes <= target.ceilings.device_bytes_max && Number.isSafeInteger(peaks.disk_bytes) && peaks.disk_bytes >= 0 && peaks.disk_bytes <= target.ceilings.disk_bytes_max, target.target_id + ' GPU wall/host/device/disk ceiling violation');
    const started = Date.parse(receipt.started_at), finished = Date.parse(receipt.finished_at);
    check(Number.isFinite(started) && Number.isFinite(finished) && finished >= started && Math.ceil((finished - started) / 1000) === Math.ceil(peaks.wall_seconds), target.target_id + ' GPU wall/timestamp chronology drift');
    exactSet(Object.keys(receipt.network_zero),contract.network_fields,target.target_id + ' GPU network fields');
    check(receipt.network_zero.requests === 0 && receipt.network_zero.bytes === 0 && receipt.no_fallback === true, target.target_id + ' GPU network or CPU/f32 fallback detected');
    if (target.calibration) {
      const calibration = receipt.calibration_record_or_absent;
      exactSet(Object.keys(calibration),contract.calibration_fields,target.target_id + ' GPU calibration fields');
      check(calibration.synchronized === true && calibration.seconds >= target.calibration.seconds_min && calibration.seconds <= target.calibration.seconds_max && calibration.source_sha256 === backendSource.sha256 && calibration.backend_sha256 === expectedBackendRecord.backend_sha256 && calibration.kernel_sha256 === expectedBackendRecord.kernel_sha256 && Number.isSafeInteger(calibration.parameter_count) && calibration.parameter_count > 0 && Number.isSafeInteger(calibration.token_count) && calibration.token_count > 0 && Number.isFinite(calibration.observed_rate) && calibration.observed_rate > 0 && calibration.refuse_on_drift === true, target.target_id + ' GPU synchronized calibration identity/count/rate/refusal drift');
    } else check(receipt.calibration_record_or_absent === 'absent', target.target_id + ' GPU receipt invents calibration outside the target contract');
    if (target.workload_receipt_projection) {
      check(receipt.workload_contract_sha256 === sha256(Buffer.from(canonicalJson(target.workload_contract))), target.target_id + ' GPU workload-contract hash drift');
      deepEqual(receipt[target.workload_receipt_field],target.workload_receipt_projection,target.target_id + ' exact valid-token/prompt/example/update/checkpoint workload');
      check(receipt.all_attempts_no_replacement === true && receipt.workload_truncation_refused === true, target.target_id + ' GPU workload truncation/replacement refusal drift');
    }
    if (target.adapter_workload_contract) {
      check(receipt.adapter_workload_contract_sha256 === sha256(Buffer.from(canonicalJson(target.adapter_workload_contract))) && receipt.response_token_inventory_sha256 === sha256(Buffer.from(canonicalJson(target.workload_receipt_projection))), target.target_id + ' adapter workload/response-token inventory hash drift');
      deepEqual(receipt[target.workload_receipt_field],target.workload_receipt_projection,target.target_id + ' exact adapter example/pair/token/update workload');
      deepEqual(receipt.workload_projection_and_refusal,target.workload_projection_and_refusal_expected,target.target_id + ' adapter projection/refusal arithmetic');
      check(receipt.all_attempts_no_replacement === true && receipt.workload_truncation_refused === true, target.target_id + ' adapter workload truncation/replacement refusal drift');
    }
    check(receipt.result === contract.result && receipt.fsync_complete === true && receipt.atomic_rename_complete === true, target.target_id + ' GPU result/publication drift');
  }
}
function validateClosureAggregateReceipts(root, constants, byId) {
  const boundaries = constants.execution_boundary_records;
  const contract = boundaries.offline_workspace.closure_aggregate_receipt_contract;
  check(contract?.schema_version === 1, 'preclosure/closure aggregate receipt contract missing');
  const phases = [
    {stepId:'audit-functional-successor-preclosure',offlineTarget:'audit-functional-successor-preclosure-v1',gpuReceipt:'artifacts/functional-laptop/preclosure/gpu-smoke-receipt.json',aggregateReceipt:'artifacts/functional-laptop/preclosure/receipt.json'},
    {stepId:constants.closure_step_id,offlineTarget:'functional-closure-v1',gpuReceipt:'artifacts/functional-laptop/closure/gpu-smoke-receipt.json',aggregateReceipt:'artifacts/functional-laptop/closure/receipt.json'}
  ];
  for (const phase of phases) {
    const step = byId.get(phase.stepId);
    check(step, 'aggregate checkpoint step missing ' + phase.stepId);
    const present = existsSync(resolve(root,phase.aggregateReceipt));
    if (step.status !== 'completed') {
      check(!present, phase.stepId + ' final aggregate receipt exists before the offline aggregate completes');
      continue;
    }
    check(present, phase.stepId + ' completed without its final aggregate receipt');
    const gpuFile = readBounded(root,phase.gpuReceipt,phase.stepId + ' published GPU phase receipt',16777216);
    const dependencyFile = readBounded(root,boundaries.offline_workspace.supporting_dependency_refresh.receipt,phase.stepId + ' dependency-refresh receipt',4194304);
    const file = readBounded(root,phase.aggregateReceipt,phase.stepId + ' final aggregate receipt',4194304);
    const receipt = parseJsonExact(file.text,phase.stepId + ' final aggregate receipt');
    check(file.text === canonicalJson(receipt), phase.stepId + ' aggregate receipt is not canonical JSON');
    exactSet(Object.keys(receipt),contract.required_fields,phase.stepId + ' aggregate receipt fields');
    const offlineTarget = boundaries.offline_workspace.target_registry.find((record) => record.step_id === phase.stepId && record.target_id === phase.offlineTarget);
    check(offlineTarget && offlineTarget.commands.at(-1).includes('--input-gpu-receipt /receipts/gpu.json') && offlineTarget.commands.at(-1).includes('--output ' + offlineTarget.aggregate_receipt_path), phase.stepId + ' aggregate terminal writer command drift');
    const run = step.runs.at(-1);
    check(run?.status === 'succeeded', phase.stepId + ' completed aggregate does not end in a succeeded run');
    const artifacts = [...run.artifacts].filter((artifact) => artifact.path !== phase.aggregateReceipt && !['BUILD_STATE.yaml','DECISIONS.md'].includes(artifact.path)).map((artifact) => ({path:artifact.path,sha256:artifact.sha256})).sort((left,right) => Buffer.from(left.path).compare(Buffer.from(right.path)));
    check(receipt.schema_version === contract.schema_version && receipt.step_id === phase.stepId && receipt.target_id === phase.offlineTarget && receipt.gpu_receipt_path === phase.gpuReceipt && receipt.gpu_receipt_sha256 === gpuFile.hash && receipt.dependency_refresh_receipt_sha256 === dependencyFile.hash && receipt.audit_command_inventory_sha256 === sha256(Buffer.from(canonicalJson(offlineTarget.commands.slice(0,-1)))) && receipt.result === contract.result && receipt.output_inventory_sha256 === sha256(Buffer.from(canonicalJson(artifacts))) && receipt.fsync_complete === true && receipt.atomic_rename_complete === true, phase.stepId + ' aggregate GPU/dependency/audit/output/result binding drift');
    const runArtifact = run.artifacts.find((artifact) => artifact.path === phase.aggregateReceipt);
    check(runArtifact?.sha256 === file.hash, phase.stepId + ' succeeded run does not hash-bind final aggregate receipt bytes');
  }
}
function validateCapabilityReceiptLifecycle(root, constants, byId) {
  const protocol = constants.capability_receipt_protocol;
  check(protocol?.schema_version === 1 && Array.isArray(protocol.implementation_contracts) && Array.isArray(protocol.integration_contracts), 'capability receipt protocol missing');
  exactArray(protocol.implementation_receipt_fields, ['schema_version','contract_sha256','producer_step','capability_ids','implementation_status','source_inventory_sha256','focused_validation_receipt_sha256'], 'implementation receipt schema');
  exactArray(protocol.integration_receipt_fields, ['schema_version','contract_sha256','producer_step','typed_receipt_path','typed_receipt_sha256','capability_ids','role_ids','implementation_receipt_sha256s','prerequisite_receipt_sha256s','gate_results','result','artifact_inventory_sha256'], 'capability integration envelope schema');
  unique(protocol.implementation_contracts.map((contract) => contract.path), 'implementation receipt contract paths');
  unique(protocol.integration_contracts.map((contract) => contract.path), 'integration receipt contract paths');
  const verified = new Map();
  function producerArtifact(step, path, expectedHash, label) {
    const run = step.runs.at(-1);
    check(run?.status === 'succeeded', label + ' producer must end in a succeeded run');
    const artifact = run.artifacts.find((entry) => entry.path === path);
    check(artifact?.sha256 === expectedHash, label + ' producer run does not bind canonical receipt bytes');
  }
  function readReceipt(path, label) {
    const file = readBounded(root, path, label, 4194304);
    const receipt = parseJsonExact(file.text, label);
    check(file.text === canonicalJson(receipt), label + ' must use canonical JSON');
    return {file,receipt};
  }
  for (const contract of protocol.implementation_contracts) {
    const step = byId.get(contract.producer_step);
    check(step, 'implementation receipt producer missing ' + contract.producer_step);
    const present = existsSync(resolve(root, contract.path));
    if (step.status !== 'completed') {
      check(!present, 'implementation receipt published before producer completion ' + contract.path);
      continue;
    }
    check(present, 'completed implementation producer lacks receipt ' + contract.path);
    const {file,receipt} = readReceipt(contract.path, 'capability implementation receipt');
    exactSet(Object.keys(receipt), protocol.implementation_receipt_fields, 'capability implementation receipt fields');
    check(receipt.schema_version === protocol.schema_version && receipt.contract_sha256 === sha256(Buffer.from(JSON.stringify(contract))) && receipt.producer_step === contract.producer_step && receipt.implementation_status === 'implemented-and-focused-validation-passed', 'capability implementation receipt identity/result drift');
    exactArray(receipt.capability_ids, contract.capability_ids, 'capability implementation receipt capability IDs');
    for (const field of ['source_inventory_sha256','focused_validation_receipt_sha256']) check(/^[0-9a-f]{64}$/.test(receipt[field]), 'capability implementation receipt invalid ' + field);
    producerArtifact(step,contract.path,file.hash,'capability implementation receipt');
    verified.set(contract.path,file.hash);
  }
  const pendingIntegration = [...protocol.integration_contracts];
  while (pendingIntegration.length > 0) {
    const readyAt = pendingIntegration.findIndex((contract) => {
      const step = byId.get(contract.producer_step);
      return step?.status !== 'completed' || contract.prerequisite_receipts.every((path) => verified.has(path));
    });
    check(readyAt >= 0, 'capability integration receipt contract prerequisite cycle or missing implementation contract');
    const contract = pendingIntegration.splice(readyAt,1)[0];
    const step = byId.get(contract.producer_step);
    check(step, 'integration receipt producer missing ' + contract.producer_step);
    const present = existsSync(resolve(root, contract.path));
    if (step.status !== 'completed') {
      check(!present, 'integration receipt published before producer completion ' + contract.path);
      continue;
    }
    check(present, 'completed integration producer lacks receipt ' + contract.path);
    check(contract.path !== contract.typed_receipt, 'capability envelope reuses the typed operational receipt path ' + contract.path);
    const {file,receipt} = readReceipt(contract.path, 'capability integration envelope');
    exactSet(Object.keys(receipt), protocol.integration_receipt_fields, 'capability integration envelope fields');
    const typedFile = readBounded(root,contract.typed_receipt,'typed operational receipt for capability envelope',16777216);
    const typedJson = parseJsonExact(typedFile.text,'typed operational receipt for capability envelope');
    check(typedFile.text === canonicalJson(typedJson), 'typed operational receipt for capability envelope is not canonical JSON');
    check(receipt.schema_version === protocol.schema_version && receipt.contract_sha256 === sha256(Buffer.from(JSON.stringify(contract))) && receipt.producer_step === contract.producer_step && receipt.typed_receipt_path === contract.typed_receipt && receipt.typed_receipt_sha256 === typedFile.hash && receipt.result === 'passed' && /^[0-9a-f]{64}$/.test(receipt.artifact_inventory_sha256), 'capability integration envelope identity/typed-receipt/result drift');
    exactArray(receipt.capability_ids, contract.capability_ids, 'capability integration receipt capability IDs');
    exactArray(receipt.role_ids, contract.role_ids, 'capability integration receipt roles');
    exactSet(Object.keys(receipt.implementation_receipt_sha256s), contract.implementation_receipts, 'capability integration implementation receipt bindings');
    exactSet(Object.keys(receipt.prerequisite_receipt_sha256s), contract.prerequisite_receipts, 'capability integration prerequisite receipt bindings');
    for (const path of contract.implementation_receipts) check(verified.has(path) && receipt.implementation_receipt_sha256s[path] === verified.get(path), 'capability integration receipt has missing/drifted implementation binding ' + path);
    for (const path of contract.prerequisite_receipts) check(verified.has(path) && receipt.prerequisite_receipt_sha256s[path] === verified.get(path), 'capability integration receipt has missing/drifted ordered prerequisite ' + path);
    exactSet(Object.keys(receipt.gate_results), contract.required_gates, 'capability integration gate result set');
    for (const gate of contract.required_gates) check(receipt.gate_results[gate] === true, 'capability integration gate not passed ' + gate);
    producerArtifact(step,contract.typed_receipt,typedFile.hash,'typed operational capability receipt');
    producerArtifact(step,contract.path,file.hash,'capability integration envelope');
    verified.set(contract.path,file.hash);
  }
  for (const contract of protocol.integration_contracts) for (const boundary of contract.required_before) {
    const [consumerId,phase] = boundary.split(':');
    const consumer = byId.get(consumerId);
    check(consumer, 'capability receipt consumer missing ' + boundary);
    const mustExist = phase ? consumer.status === 'completed' : ['running','completed'].includes(consumer.status);
    if (mustExist) check(verified.has(contract.path), 'capability consumer crossed missing/invalid integration receipt ' + contract.path + ' before ' + boundary);
  }
}
function validateChapterHistoryEvidenceReceipt(root, step, chapter, constants, publishedPlanSha256) {
  const boundary = constants.execution_boundary_records.history_source_evidence;
  const contract = boundary.chapter_receipt_contract;
  const path = contract.path_template.replace('<chapter-id>',chapter);
  const file = readBounded(root,path,'completed chapter history evidence receipt ' + chapter,8388608);
  const receipt = parseJsonExact(file.text,'completed chapter history evidence receipt ' + chapter);
  check(file.text === canonicalJson(receipt), chapter + ' history evidence receipt must use canonical JSON bytes');
  exactSet(Object.keys(receipt),contract.required_fields,chapter + ' history evidence receipt fields');
  const run = step.runs.at(-1);
  check(receipt.schema_version === 1 && receipt.chapter_id === chapter && receipt.plan_sha256 === publishedPlanSha256 && receipt.chapter_run_id === run.run_id, chapter + ' history evidence chapter/plan/run identity drift');
  const extractor = constants.execution_boundary_records.offline_workspace.history_source_extractor_toolchain;
  check(receipt.history_extractor_toolchain_receipt_path === extractor.receipt, chapter + ' history extractor receipt path drift');
  const extractorFile = readBounded(root,extractor.receipt,chapter + ' history extractor toolchain receipt',4194304);
  check(receipt.history_extractor_toolchain_receipt_sha256 === extractorFile.hash, chapter + ' history extractor toolchain receipt hash drift');
  const expectedHistory = constants.history_by_chapter[chapter].historical_sources;
  check(expectedHistory.length === 2, chapter + ' history source role inventory must contain exactly two records');
  exactArray(receipt.exact_source_ids,expectedHistory.map((record) => record.source_id),chapter + ' exact ordered history source IDs');
  check(Array.isArray(receipt.source_evidence_records) && receipt.source_evidence_records.length === 2, chapter + ' history source evidence record count drift');
  const sourceById = new Map(boundary.source_records.map((record) => [record.source_id,record]));
  const acceptedById = new Map(constants.accepted_source_register.map((record) => [record.source_id,record]));
  const sourceProjection = expectedHistory.map((history) => {
    const source = sourceById.get(history.source_id);
    return {source_id:history.source_id,historical_role:history.role,year:history.year,role_and_claim_limit_sha256:source.role_and_claim_limit_sha256,request_url:source.request_url};
  });
  const sourceProjectionSha256 = sha256(Buffer.from(canonicalJson(sourceProjection)));
  check(receipt.source_record_projection_sha256 === sourceProjectionSha256, chapter + ' history source-record projection hash drift');
  let totalEncoded = 0, totalExpanded = 0, totalWall = 0;
  const supportCommitments = [];
  for (let index = 0; index < expectedHistory.length; index += 1) {
    const expectedHistoryRecord = expectedHistory[index];
    const source = sourceById.get(expectedHistoryRecord.source_id);
    const accepted = acceptedById.get(expectedHistoryRecord.source_id);
    const evidence = receipt.source_evidence_records[index];
    exactSet(Object.keys(evidence),contract.source_evidence_record_fields,chapter + ' history source evidence fields ' + source.source_id);
    check(evidence.source_id === source.source_id && evidence.historical_role === expectedHistoryRecord.role && evidence.canonical_citation_locator === source.canonical_citation_locator && evidence.exact_request_url === source.request_url, chapter + ' history source identity/role/locator drift ' + source.source_id);
    check(/^[0-9a-f]{64}$/.test(evidence.body_sha256) && Number.isSafeInteger(evidence.body_bytes) && evidence.body_bytes > 0 && evidence.body_bytes <= source.expanded_bytes_max && source.accepted_media_types.includes(evidence.media_type) && source.accepted_content_encodings.includes(evidence.content_encoding), chapter + ' history body/media/encoding identity or bound drift ' + source.source_id);
    check(evidence.extractor_id === source.extraction.method_by_media[evidence.media_type] && evidence.extractor_version === source.extraction.method_version && evidence.extractor_toolchain_receipt_sha256 === extractorFile.hash && evidence.claim_limit_sha256 === source.role_and_claim_limit_sha256, chapter + ' history extractor/claim-limit identity drift ' + source.source_id);
    const supportCommitment = sha256(Buffer.from(canonicalJson(accepted.supports)));
    check(evidence.support_commitment_sha256 === supportCommitment, chapter + ' history accepted support commitment drift ' + source.source_id);
    supportCommitments.push(supportCommitment);
    const transport = evidence.transport_receipt;
    exactSet(Object.keys(transport),contract.transport_subrecord_fields,chapter + ' embedded history transport fields ' + source.source_id);
    check(transport.method === source.method, chapter + ' history request method drift ' + source.source_id);
    deepEqual(transport.normalized_request_headers,boundary.request_headers,chapter + ' history normalized request headers ' + source.source_id);
    check(transport.authorization_absent === true && transport.cookie_absent === true && Array.isArray(transport.attempts) && transport.attempts.length >= 1 && transport.attempts.length <= source.retry.max_attempts, chapter + ' history authentication/retry-attempt boundary drift ' + source.source_id);
    let attemptFinishedAt = -Infinity;
    let attemptedEncodedBytes = 0;
    for (let attemptIndex = 0; attemptIndex < transport.attempts.length; attemptIndex += 1) {
      const attempt = transport.attempts[attemptIndex];
      exactSet(Object.keys(attempt),contract.attempt_fields,chapter + ' history attempt fields ' + source.source_id);
      const started = Date.parse(attempt.started_at), finished = Date.parse(attempt.finished_at);
      check(attempt.attempt === attemptIndex + 1 && Number.isFinite(started) && Number.isFinite(finished) && started >= attemptFinishedAt && finished >= started && ['transient-failure','success'].includes(attempt.outcome) && Number.isSafeInteger(attempt.encoded_bytes) && attempt.encoded_bytes >= 0 && (attempt.response_header_sha256_or_absent === 'absent' || /^[0-9a-f]{64}$/.test(attempt.response_header_sha256_or_absent)) && (attempt.status_or_absent === 'absent' || Number.isSafeInteger(attempt.status_or_absent)) && (attempt.body_sha256_or_absent === 'absent' || /^[0-9a-f]{64}$/.test(attempt.body_sha256_or_absent)), chapter + ' history attempt chronology/evidence drift ' + source.source_id);
      check(attemptIndex === transport.attempts.length - 1 ? attempt.outcome === 'success' : attempt.outcome === 'transient-failure', chapter + ' history retry outcome sequence drift ' + source.source_id);
      if (attempt.outcome === 'success') check(attempt.status_or_absent === transport.status && attempt.body_sha256_or_absent === evidence.body_sha256 && attempt.response_header_sha256_or_absent === transport.response_header_sha256 && attempt.encoded_bytes === transport.encoded_bytes, chapter + ' history final successful attempt does not bind the exact final status/body/header/encoded bytes ' + source.source_id);
      else check(attempt.body_sha256_or_absent === 'absent', chapter + ' history failed attempt claims a final body identity ' + source.source_id);
      attemptedEncodedBytes += attempt.encoded_bytes;
      attemptFinishedAt = finished;
    }
    exactSet(Object.keys(transport.resolved_endpoint),contract.resolved_endpoint_fields,chapter + ' history resolved endpoint fields ' + source.source_id);
    check(transport.resolved_endpoint.scheme === 'https' && transport.resolved_endpoint.host === source.request_host && transport.resolved_endpoint.path_and_query === source.request_path_and_query && Array.isArray(transport.redirect_edges) && transport.redirect_edges.length === 0 && transport.status === 200, chapter + ' history final endpoint/redirect/status drift ' + source.source_id);
    const expectedCacheKey = sha256(Buffer.from(canonicalJson({request_url:source.request_url,method:source.method,normalized_request_headers:boundary.request_headers,body_sha256:evidence.body_sha256})));
    const expectedCachePath = source.cache_path.replace('<cache-key>',expectedCacheKey);
    check(source.cache_key === 'sha256(exact request URL + method + normalized request-header inventory + observed body SHA-256)' && Number.isSafeInteger(transport.encoded_bytes) && transport.encoded_bytes > 0 && attemptedEncodedBytes >= transport.encoded_bytes && attemptedEncodedBytes <= source.request_bytes_max && Number.isSafeInteger(transport.expanded_bytes) && transport.expanded_bytes === evidence.body_bytes && transport.expanded_bytes <= source.expanded_bytes_max && /^[0-9a-f]{64}$/.test(transport.response_header_sha256) && transport.cache_key === expectedCacheKey && transport.private_cache_body_path === expectedCachePath && /^[0-9a-f]{64}$/.test(transport.private_transport_receipt_sha256), chapter + ' history transport attempt bytes/header/content-addressed cache evidence drift ' + source.source_id);
    check(Array.isArray(evidence.spans) && evidence.spans.length > 0, chapter + ' history extraction spans missing ' + source.source_id);
    let wordCount = 0;
    let priorSpanEnd = 0;
    const rangeInventory = [];
    for (const span of evidence.spans) {
      exactSet(Object.keys(span),contract.span_subrecord_fields,chapter + ' history extraction span fields ' + source.source_id);
      const excerptBytes = Buffer.from(span.copyright_safe_excerpt_utf8,'utf8');
      const bodyRangeBytes = Buffer.from(span.body_range_utf8,'utf8');
      const derivedWords = span.copyright_safe_excerpt_utf8.trim().length === 0 ? 0 : span.copyright_safe_excerpt_utf8.trim().split(/\s+/u).length;
      const expectedRole = expectedHistoryRecord.role + '-source-support';
      const locator = span.page_or_json_pointer_or_absent;
      if (evidence.media_type === 'application/pdf') check(isRecord(locator) && Object.keys(locator).length === 2 && locator.kind === contract.locator_contract.pdf.kind && Number.isSafeInteger(locator.page) && locator.page >= contract.locator_contract.pdf.page_min, chapter + ' history PDF span locator invalid ' + source.source_id);
      else if (evidence.media_type === 'application/json') check(isRecord(locator) && Object.keys(locator).length === 2 && locator.kind === contract.locator_contract.json.kind && typeof locator.pointer === 'string' && (locator.pointer === '' || locator.pointer.startsWith('/')), chapter + ' history JSON span locator invalid ' + source.source_id);
      else check(locator === contract.locator_contract.other, chapter + ' history non-PDF/JSON span must use absent locator ' + source.source_id);
      check(span.role === expectedRole && contract.allowed_span_roles.includes(span.role) && Number.isSafeInteger(span.start_byte) && Number.isSafeInteger(span.end_byte) && span.start_byte >= priorSpanEnd && span.end_byte > span.start_byte && span.end_byte <= evidence.body_bytes && span.end_byte - span.start_byte === bodyRangeBytes.length && bodyRangeBytes.equals(excerptBytes) && excerptBytes.length <= source.extraction.excerpt_bytes_max && sha256(excerptBytes) === span.excerpt_sha256 && span.excerpt_words === derivedWords && /^[0-9a-f]{64}$/.test(span.paraphrase_sha256) && span.support_commitment_sha256 === supportCommitment, chapter + ' history ordered body-range/excerpt/derived-word/paraphrase/support drift ' + source.source_id);
      wordCount += derivedWords;
      priorSpanEnd = span.end_byte;
      rangeInventory.push({role:span.role,start_byte:span.start_byte,end_byte:span.end_byte,page_or_json_pointer_or_absent:locator,body_range_sha256:span.excerpt_sha256});
    }
    check(wordCount === evidence.copyright_word_count && wordCount <= source.extraction.verbatim_words_max, chapter + ' history copyright word cap drift ' + source.source_id);
    const transcript = evidence.extraction_transcript;
    exactSet(Object.keys(transcript),contract.extraction_transcript_fields,chapter + ' history extraction transcript fields ' + source.source_id);
    const transcriptProjection = {schema_version:1,body_sha256:evidence.body_sha256,body_bytes:evidence.body_bytes,extractor_id:evidence.extractor_id,extractor_version:evidence.extractor_version,extractor_toolchain_receipt_sha256:extractorFile.hash,body_range_inventory_sha256:sha256(Buffer.from(canonicalJson(rangeInventory)))};
    deepEqual(Object.fromEntries(Object.entries(transcript).filter(([field]) => field !== 'transcript_sha256')),transcriptProjection,chapter + ' history extraction transcript/body/range binding ' + source.source_id);
    check(transcript.transcript_sha256 === sha256(Buffer.from(canonicalJson(transcriptProjection))), chapter + ' history extraction transcript hash drift ' + source.source_id);
    check(evidence.paraphrase_commitment_sha256 === sha256(Buffer.from(canonicalJson(evidence.spans.map((span) => span.paraphrase_sha256)))), chapter + ' history paraphrase commitment drift ' + source.source_id);
    totalEncoded += attemptedEncodedBytes;
    totalExpanded += transport.expanded_bytes;
    totalWall += transport.attempts.reduce((sum,attempt) => sum + Date.parse(attempt.finished_at) - Date.parse(attempt.started_at),0);
  }
  const historicalClaimCommitment = sha256(Buffer.from(canonicalJson({chapter_id:chapter,historical_contrast:constants.history_by_chapter[chapter].historical_contrast,source_record_projection_sha256:sourceProjectionSha256,support_commitments:supportCommitments})));
  check(receipt.historical_claim_commitment_sha256 === historicalClaimCommitment && receipt.total_encoded_bytes === totalEncoded && receipt.total_expanded_bytes === totalExpanded && receipt.wall_milliseconds === totalWall && totalEncoded <= boundary.per_chapter_download_bytes_max && totalExpanded <= boundary.per_chapter_expanded_bytes_max && totalWall <= boundary.wall_seconds_per_chapter_max * 1000 && receipt.zero_artifact_payload_bytes === 0, chapter + ' history aggregate/claim/zero-payload boundary drift');
  const inventoryProjection = Object.fromEntries(Object.entries(receipt).filter(([key]) => !['canonical_inventory_sha256','fsync_complete','atomic_rename_complete'].includes(key)));
  check(receipt.canonical_inventory_sha256 === sha256(Buffer.from(canonicalJson(inventoryProjection))) && receipt.fsync_complete === true && receipt.atomic_rename_complete === true, chapter + ' history canonical inventory/publication drift');
  const artifact = run.artifacts.find((record) => record.path === path);
  check(artifact?.sha256 === file.hash, chapter + ' completed run does not bind the exact canonical history evidence receipt');
}

function validateState(state, queue, constants, options = {}) {
  assertEmbeddedQueue(queue, 'state validation');
  assertEmbeddedConstants(constants, 'state validation');
  const fixedPlanSha256 = PUBLISHED_EXTENSION_PLAN_SHA256 ?? options.publishedPlanSha256;
  check(typeof fixedPlanSha256 === 'string' && /^[0-9a-f]{64}$/.test(fixedPlanSha256), 'state validation lacks exact published plan SHA-256');
  const document = parseStateYaml(state, options.root);
  const executionCompatibility = readExecutionCompatibility(options.root);
  check(!options.initialPublication, 'execution compatibility cannot relabel current state as initial publication');
  const compatibilityState = validateExecutionCompatibilityState(document, executionCompatibility);
  const lifecycle = constants.state_lifecycle_contract;
  check(isRecord(lifecycle) && lifecycle.schema_version === 1, 'state lifecycle contract missing/drifted');
  exactSet(Object.keys(document), lifecycle.root_fields, 'BUILD_STATE root fields');
  check(document.schema_version === lifecycle.state_schema_version, 'BUILD_STATE schema_version drift');
  check(typeof document.updated_at === 'string' && /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\dZ$/.test(document.updated_at) && !Number.isNaN(Date.parse(document.updated_at)), 'BUILD_STATE updated_at must be an exact UTC second');
  check(sha256(Buffer.from(JSON.stringify(document.environment))) === lifecycle.environment_sha256, 'BUILD_STATE environment projection drift');
  const builds = document.builds;
  unique(builds.map((build) => {
    check(isRecord(build) && typeof build.build_id === 'string', 'BUILD_STATE build record invalid');
    check(Array.isArray(build.steps), build.build_id + ' steps missing');
    return build.build_id;
  }), 'BUILD_STATE build IDs');
  const allSteps = builds.flatMap((build) => build.steps.map((step) => {
    check(isRecord(step) && typeof step.id === 'string', build.build_id + ' step record invalid');
    return step;
  }));
  unique(allSteps.map((step) => step.id), 'BUILD_STATE global step IDs');
  const globalRunIds = new Set();
  for (const step of allSteps) validateRunHistory(step, step.id, globalRunIds);
  const globalById = new Map(allSteps.map((step) => [step.id, step]));
  const functionalBuildIndex = builds.findIndex((build) => build.build_id === lifecycle.functional_build_id);
  check(functionalBuildIndex === lifecycle.historical_build_count, 'functional build position/historical build count drift');
  check(sha256(Buffer.from(JSON.stringify(builds.slice(0,functionalBuildIndex).map((build) => build.build_id)))) === lifecycle.historical_build_ids_sha256, 'historical BUILD_STATE build identity/order drift');
  const historicalProjection = structuredClone(builds.slice(0,functionalBuildIndex));
  for (const reconciliation of executionCompatibility.historical_budget_reconciliation) {
    const current = historicalProjection.find((build) => build.build_id === reconciliation.build_id);
    check(current && current.budget.spent === reconciliation.current_spent, 'historical budget compatibility drift ' + reconciliation.build_id);
    current.budget.spent = reconciliation.frozen_spent;
  }
  check(sha256(Buffer.from(JSON.stringify(historicalProjection))) === lifecycle.historical_builds_sha256, 'historical BUILD_STATE build bytes/projection drift');
  const functionalBuild = builds[functionalBuildIndex];
  exactSet(Object.keys(functionalBuild), lifecycle.functional_build_fields, 'functional BUILD_STATE build fields');
  check(functionalBuild.objective === lifecycle.functional_objective, 'functional BUILD_STATE objective drift');
  check(isRecord(functionalBuild.budget) && Number.isSafeInteger(functionalBuild.budget.spent) && functionalBuild.budget.spent >= lifecycle.budget_initial_spent, 'functional BUILD_STATE budget spent drift');
  if (options.initialPublication) check(functionalBuild.budget.spent === lifecycle.budget_initial_spent, 'initial functional BUILD_STATE budget spent drift');
  check(sha256(Buffer.from(JSON.stringify(Object.fromEntries(Object.entries(functionalBuild.budget).filter(([field]) => field !== 'spent'))))) === lifecycle.budget_static_sha256, 'functional BUILD_STATE budget authority drift');
  check(sha256(Buffer.from(JSON.stringify(functionalBuild.completion_criteria))) === lifecycle.completion_criteria_sha256, 'functional BUILD_STATE completion criteria drift');
  const decisionsPath = resolveInside(options.root,lifecycle.decisions_prefix.path,'DECISIONS append-only ledger');
  const decisionsPrefix = hashRegularFilePrefix(decisionsPath,lifecycle.decisions_prefix.bytes);
  check(decisionsPrefix.bytes === lifecycle.decisions_prefix.bytes && decisionsPrefix.sha256 === lifecycle.decisions_prefix.sha256, 'DECISIONS accepted prefix byte drift/truncation');
  const activeBuilds = builds.filter((build) => build.status === 'active');
  const checkerHash = sha256(readFileSync(fileURLToPath(import.meta.url)));
  const entries = functionalBuild.steps;
  check(entries.length >= lifecycle.prefix_steps.length + 1, 'functional BUILD_STATE step inventory truncated');
  const immutableFields = ['id','objective','depends_on','inputs','outputs','acceptance','validate','cost'];
  for (let index = 0; index < lifecycle.prefix_steps.length; index += 1) {
    const contract = lifecycle.prefix_steps[index];
    const actual = entries[index];
    check(actual?.id === contract.id, 'functional BUILD_STATE exact prefix identity/order drift at ' + index);
    const immutable = Object.fromEntries(immutableFields.map((field) => [field,actual[field]]));
    check(sha256(Buffer.from(JSON.stringify(immutable))) === contract.immutable_spec_sha256, 'functional BUILD_STATE immutable prefix step drift ' + contract.id);
    if (contract.required_status) check(actual.status === contract.required_status, 'functional BUILD_STATE prefix status drift ' + contract.id);
  }
  const byId = new Map(entries.map((step) => [step.id, step]));
  const design = byId.get(queue.insert_after);
  check(design, 'BUILD_STATE design step missing');
  const designLifecycle = lifecycle.prefix_steps.find((entry) => entry.id === design.id);
  check(design.status === (options.initialPublication ? designLifecycle.required_status_before_successors : designLifecycle.required_status_after_publication), 'BUILD_STATE design lifecycle drift for publication mode');
  validateRunHistory(design, design.id, null, false);
  if (design.status === 'completed') {
    const finalDesignRun = design.runs.at(-1);
    check(finalDesignRun?.status === 'succeeded', 'completed design step must end in a succeeded publication run');
    const bindings = new Map((finalDesignRun.artifacts || []).map((artifact) => [artifact.path,artifact.sha256]));
    check(finalDesignRun.run_id === executionCompatibility.historical_design.run_id, 'execution compatibility historical design run drift');
    check(bindings.get('curriculum/functional-laptop-llm-extension-plan.md') === executionCompatibility.historical_design.plan_sha256, 'historical design plan binding drift');
    check(bindings.get('scripts/check-functional-laptop-llm-plan.mjs') === executionCompatibility.historical_design.checker_sha256, 'historical design checker binding drift');
    if (compatibilityState.ready) {
      const currentBindings = new Map(compatibilityState.compatibilityStep.runs.at(-1).artifacts.map((artifact) => [artifact.path,artifact.sha256]));
      check(currentBindings.get('scripts/check-functional-laptop-llm-plan.mjs') === executionCompatibility.compatibility_build.checker_sha256, 'completed compatibility checker publication binding drift');
      check(currentBindings.get(executionCompatibility.compatibility_build.compatibility_path) === executionCompatibility.compatibility_build.compatibility_sha256, 'completed compatibility policy publication binding drift');
    }
    for (const [path, hash] of [['curriculum/functional-laptop-llm-extension-plan.md',fixedPlanSha256],['scripts/check-functional-laptop-llm-plan.mjs',checkerHash]]) {
      const absolute = resolve(options.root, path);
      check(existsSync(absolute) && lstatSync(absolute).isFile() && !lstatSync(absolute).isSymbolicLink(), 'completed design publication missing regular file ' + path);
      check(sha256(readFileSync(absolute)) === hash, 'completed design publication byte drift ' + path);
    }
  }
  const chapter85 = globalById.get('implement-ch85-persistence-scale-decision');
  check(chapter85, 'BUILD_STATE Chapter 85 step missing');
  const receiptContract = constants.postgresql_measurement_receipt_contract;
  const receiptAbsolute = resolve(options.root, receiptContract.path);
  const receiptPresent = existsSync(receiptAbsolute);
  const pgPhasePaths = [receiptContract.preflight_receipt_path,receiptContract.file_snapshot_writer_trace_contract.path,receiptContract.file_snapshot_state_transcript_contract.path,receiptContract.file_snapshot_output_inventory_path,receiptContract.file_snapshot_limit_evidence_path,receiptContract.path];
  const pgPresentPaths = pgPhasePaths.filter((path) => existsSync(resolve(options.root,path)));
  check(pgPresentPaths.length === 0 || pgPresentPaths.length === pgPhasePaths.length, 'Chapter 85 canonical measurement phase is only partially published');
  let measurement = null;
  if (chapter85.status === 'completed') {
    check(pgPresentPaths.length === pgPhasePaths.length, 'completed Chapter 85 requires its exact preflight/trace/transcript/inventory/evidence/decision publication');
    measurement = validatePostgresqlMeasurementReceipt(options.root, constants, chapter85);
    const finalRun = chapter85.runs.at(-1);
    check(finalRun?.status === 'succeeded', 'completed Chapter 85 must end in a succeeded run');
    const binding = finalRun.artifacts.find((artifact) => artifact.path === receiptContract.path);
    check(binding && binding.sha256 === measurement.hash, 'Chapter 85 succeeded run must hash-bind the exact persistence decision receipt');
  } else {
    if (chapter85.status === 'running' && pgPresentPaths.length === pgPhasePaths.length) validatePostgresqlMeasurementReceipt(options.root, constants, chapter85);
    else check(pgPresentPaths.length === 0, 'persistence measurement canonical outputs exist outside the exact current running or completed phase');
  }
  const selectedMode = measurement?.receipt.selected === true;
  const selectedIds = queue.conditional_postgresql.selected_step_ids;
  const selectedRowsPresent = selectedIds.filter((id) => byId.has(id));
  check(selectedRowsPresent.length === (selectedMode ? 4 : 0), 'conditional PostgreSQL state-record presence disagrees with the recomputed Chapter 85 decision');
  if (selectedMode) exactArray(selectedRowsPresent, selectedIds, 'selected PostgreSQL state-record identities');
  const originalQueue = selectedMode ? [...queue.steps.slice(0,-1),...queue.conditional_postgresql.selected_steps,queue.conditional_postgresql.selected_preclosure] : queue.steps;
  const expectedQueue = originalQueue.map((step, index) => index === 0 ? {...structuredClone(executionCompatibility.setup_amendment.step_spec),status:step.status,runs:structuredClone(step.runs)} : structuredClone(step));
  expectedQueue.splice(1,0,{...executionCompatibility.replacement_setup.step_spec,replaces:[...executionCompatibility.replacement_setup.replaces],status:'pending',runs:[]});
  for (const override of executionCompatibility.replacement_setup.successor_dependency_overrides) {
    const successor = expectedQueue.find((step) => step.id === override.step_id);
    check(successor, 'replacement successor step missing: ' + override.step_id);
    exactArray(successor.depends_on, [override.from], override.step_id + ' frozen dependency before replacement');
    successor.depends_on = [override.to];
  }
  for (const override of executionCompatibility.replacement_setup.successor_input_overrides) {
    const successor = expectedQueue.find((step) => step.id === override.step_id);
    check(successor && Array.isArray(successor.inputs) && successor.inputs[override.index] === override.from, 'replacement successor input not the exact frozen input: ' + override.step_id);
    successor.inputs[override.index] = override.to;
  }
  const firefoxStep = expectedQueue.find((step) => step.id === executionCompatibility.firefox_setup_amendment.step_id);
  check(firefoxStep, 'Firefox setup amendment target missing from frozen queue');
  const firefoxLifecycle = {status:firefoxStep.status,runs:structuredClone(firefoxStep.runs)};
  Object.assign(firefoxStep,structuredClone(executionCompatibility.firefox_setup_amendment.step_spec),firefoxLifecycle);
  const historyOverride = executionCompatibility.replacement_setup.chapter40_history_policy_override;
  const historyStep = expectedQueue.find((step) => step.id === historyOverride.step_id);
  check(historyStep, 'Chapter 40 history-policy override step missing');
  for (const input of historyOverride.remove_inputs) {
    const index = historyStep.inputs.indexOf(input);
    check(index >= 0, 'Chapter 40 retired history input missing from frozen step');
    historyStep.inputs.splice(index,1);
  }
  for (const output of historyOverride.remove_outputs) {
    const index = historyStep.outputs.indexOf(output);
    check(index >= 0, 'Chapter 40 retired history output missing from frozen step');
    historyStep.outputs.splice(index,1);
  }
  for (const acceptance of historyOverride.remove_acceptance) {
    const index = historyStep.acceptance.indexOf(acceptance);
    check(index >= 0, 'Chapter 40 retired history acceptance missing from frozen step');
    historyStep.acceptance.splice(index,1);
  }
  historyStep.acceptance.push(historyOverride.append_acceptance);
  for (const command of historyOverride.remove_validate) {
    const index = historyStep.validate.indexOf(command);
    check(index >= 0, 'Chapter 40 retired history validation missing from frozen step');
    historyStep.validate.splice(index,1);
  }
  historyStep.validate.unshift(historyOverride.prepend_validate);
  const effectiveTransitions = {...queue.conditional_output_transitions,...executionCompatibility.setup_amendment.output_transitions};
  const effectiveStateConstants = effectiveExecutionConstants(constants, executionCompatibility);
  const maintenanceId = 'repair-ch06-symbol-table-and-ch08-ch10-learning-surfaces';
  const maintenance = byId.get(maintenanceId);
  check(maintenance, 'BUILD_STATE required post-plan maintenance step missing');
  exactSet(Object.keys(maintenance), [...immutableFields,'status','runs'], 'BUILD_STATE maintenance fields');
  const maintenanceSpec = Object.fromEntries(immutableFields.map((field) => [field,maintenance[field]]));
  check(sha256(Buffer.from(JSON.stringify(maintenanceSpec))) === executionCompatibility.held_maintenance.immutable_spec_sha256, 'BUILD_STATE immutable maintenance step drift');
  check(['pending','running','completed','blocked'].includes(maintenance.status), 'BUILD_STATE maintenance lifecycle status invalid');
  check(Array.isArray(maintenance.runs), 'BUILD_STATE maintenance run history must be an array');
  const maintenanceLatestRun = maintenance.runs.at(-1);
  if (maintenance.status === 'running') check(maintenanceLatestRun?.status === 'running', 'running maintenance requires a running latest run');
  if (maintenance.status === 'completed') check(maintenanceLatestRun?.status === 'succeeded', 'completed maintenance requires a succeeded latest run');
  if (maintenance.status === 'blocked') check(['failed','interrupted'].includes(maintenanceLatestRun?.status) && typeof maintenanceLatestRun.notes === 'string' && maintenanceLatestRun.notes.trim().length > 0, 'blocked maintenance requires a failed/interrupted latest run with notes');
  if (maintenance.status === 'pending' && maintenanceLatestRun) check(['failed','interrupted'].includes(maintenanceLatestRun.status), 'pending maintenance may retain only a failed/interrupted latest run');
  const stateQueue = expectedQueue.filter((step) => !executionCompatibility.replacement_setup.replaces.includes(step.id));
  const courseQueueIds = new Set(expectedQueue.map((step) => step.id));
  if (compatibilityState.preparing) {
    for (const expected of expectedQueue) {
      const actual = byId.get(expected.id);
      check(actual?.status === 'pending' && Array.isArray(actual.runs) && actual.runs.length === 0, 'course extension must wait for execution compatibility completion: ' + expected.id);
    }
  }
  for (const expected of expectedQueue) {
    const actual = byId.get(expected.id);
    check(actual, 'BUILD_STATE missing ' + expected.id);
    exactSet(Object.keys(actual), Object.keys(expected), 'BUILD_STATE fields ' + expected.id);
    if (expected.replaces) deepEqual(actual.replaces, expected.replaces, 'BUILD_STATE corrective replacement links ' + expected.id);
    for (const field of ['id','objective','depends_on','inputs','outputs','acceptance','validate','cost']) {
      deepEqual(actual[field], expected[field], 'BUILD_STATE immutable ' + expected.id + '.' + field);
    }
    check(['pending','running','completed','blocked','invalidated'].includes(actual.status), expected.id + ' lifecycle status invalid');
    const supersededEnvironment = expected.id === executionCompatibility.superseded_environment_history.step_id;
    if (supersededEnvironment) {
      check(actual.status === 'invalidated', 'superseded environment step must remain explicitly invalidated');
      const history = executionCompatibility.superseded_environment_history;
      deepEqual(actual.runs.map((run) => ({run_id:run.run_id,status:run.status})), history.runs, 'superseded environment run IDs/statuses');
      check(sha256(Buffer.from(JSON.stringify(actual.runs))) === history.runs_sha256, 'superseded environment historical run projection drift');
      const failedRun = actual.runs.find((run) => run.run_id === '20261004T100750Z-establish-functional-offline-workspace-execution-boundary-05');
      check(failedRun?.status === 'failed' && failedRun.input_fingerprint.checker_sha256 === history.failed_run05_checker_input, 'failed superseded environment diagnostic was altered or promoted');
    } else {
      validateRunHistory(actual, expected.id, null, true, expected, fixedPlanSha256, checkerHash, options.root, {byId,conditional:effectiveTransitions,constants:effectiveStateConstants,queue,compatibility:executionCompatibility});
    }
    if (/^implement-ch(?:4[0-9]|5[0-9]|6[0-9]|7[0-9]|8[0-5])-/.test(actual.id)) {
      const chapter = actual.id.slice('implement-ch'.length);
      const historyPath = constants.execution_boundary_records.history_source_evidence.chapter_receipt_contract.path_template.replace('<chapter-id>',chapter);
      const historyPresent = existsSync(resolve(options.root,historyPath));
      if (actual.status === 'completed' || (actual.status === 'running' && actual.runs.at(-1)?.status === 'running' && historyPresent)) validateChapterHistoryEvidenceReceipt(options.root,actual,chapter,constants,fixedPlanSha256);
      else check(!historyPresent, chapter + ' canonical history receipt exists outside the exact current running/completed history phase');
    }
    if (options.initialPublication) {
      check(actual.status === 'pending', expected.id + ' must initially be pending');
      check(actual.runs.length === 0, expected.id + ' must initially have empty runs');
    }
  }
  validateOpenModelSelectionState(options.root, constants, byId.get('select-functional-open-model'));
  validateSelectedOpenModelN3State(options.root, constants, byId);
  validateCompletedGpuReceipts(options.root, constants, byId);
  validateClosureAggregateReceipts(options.root, constants, byId);
  validateCapabilityReceiptLifecycle(options.root, constants, byId);
  const positions = expectedQueue.map((step) => entries.findIndex((candidate) => candidate.id === step.id));
  check(positions.every((position, index) => index === 0 || position === positions[index - 1] + 1), 'BUILD_STATE inserted queue must be one contiguous exact block');
  const designPosition = entries.findIndex((step) => step.id === queue.insert_after);
  check(entries[designPosition + 1]?.id === maintenanceId, 'BUILD_STATE maintenance insertion boundary drift');
  check(positions[0] === designPosition + 2, 'BUILD_STATE insertion boundary drift');
  const closure = byId.get(constants.closure_step_id);
  check(closure && entries.findIndex((step) => step.id === closure.id) === positions.at(-1) + 1, 'closure must immediately follow inserted queue');
  exactArray(entries.map((step) => step.id), [...lifecycle.prefix_steps.map((step) => step.id),maintenanceId,...expectedQueue.map((step) => step.id),closure.id], 'functional BUILD_STATE exact step inventory/order');
  exactSet(Object.keys(closure), [...Object.keys(queue.closure_contract),'status','runs'], 'BUILD_STATE closure fields');
  for (const field of ['id','objective','depends_on','inputs','outputs','acceptance','validate','cost']) deepEqual(closure[field], queue.closure_contract[field], 'BUILD_STATE immutable closure.' + field);
  check(['pending','running','completed','blocked'].includes(closure.status), 'closure lifecycle status invalid');
  validateRunHistory(closure, closure.id, null, true, queue.closure_contract, fixedPlanSha256, checkerHash, options.root, {byId,conditional:queue.conditional_output_transitions,constants,queue});

  if (closure.status === 'completed') {
    const laterBuilds = builds.slice(functionalBuildIndex + 1);
    check(functionalBuild.status === lifecycle.terminal_mode.functional_build_status && activeBuilds.length <= lifecycle.terminal_mode.active_build_count_max && !activeBuilds.includes(functionalBuild), 'terminal BUILD_STATE target-build lifecycle drift');
    if (activeBuilds.length === 0) check(document.active_build === null, 'terminal BUILD_STATE with no later active build must clear active_build');
    else check(laterBuilds.includes(activeBuilds[0]) && document.active_build === activeBuilds[0].build_id, 'terminal BUILD_STATE active_build must identify the sole append-only later active build');
  } else {
    if (compatibilityState.preparing) {
      check(functionalBuild.status === 'pending' && document.active_build === compatibilityState.compatibilityBuild.build_id && activeBuilds.length === 1 && activeBuilds[0] === compatibilityState.compatibilityBuild, 'preparation BUILD_STATE build/active_build lifecycle drift');
    } else if (byId.get(executionCompatibility.release_terminal_step).status === 'completed') {
      check(functionalBuild.status === 'pending' && document.active_build === null && activeBuilds.length === 0, 'Chapter 40 completion must hold unreleased successor work');
    } else {
      check(functionalBuild.status === lifecycle.active_mode.functional_build_status && document.active_build === lifecycle.active_mode.active_build && activeBuilds.length === lifecycle.active_mode.active_build_count && activeBuilds[0] === functionalBuild, 'active BUILD_STATE build/active_build lifecycle drift');
    }
  }
  const functionalRunning = entries.filter((step) => step.status === 'running');
  const globalRunningRuns = allSteps.flatMap((step) => step.runs.filter((run) => run.status === 'running').map((run) => ({step,run})));
  check(functionalRunning.length <= 1, 'functional lifecycle has multiple running frontiers');
  if (closure.status !== 'completed') {
    if (compatibilityState.preparing) check(globalRunningRuns.length === 1 && globalRunningRuns[0].step === compatibilityState.compatibilityStep && functionalRunning.length === 0, 'global running inventory disagrees with compatibility preparation');
    else check(globalRunningRuns.length === functionalRunning.length && (functionalRunning.length === 0 || globalRunningRuns[0].step === functionalRunning[0]), 'global running-run inventory disagrees with the sole functional lifecycle frontier');
  } else if (activeBuilds.length === 0) {
    check(globalRunningRuns.length === 0, 'terminal BUILD_STATE without an active later build retains a running run');
  } else {
    check(globalRunningRuns.length <= 1 && globalRunningRuns.every(({step}) => activeBuilds[0].steps.includes(step)), 'terminal BUILD_STATE running run is outside the sole later active build');
  }

  if (options.initialPublication) {
    check(!selectedMode && !receiptPresent, 'initial publication must be premeasurement with the 66-step base queue');
    check(design.status === 'running', 'initial publication requires the design step running');
    check(maintenance.status === 'pending' && Array.isArray(maintenance.runs) && maintenance.runs.length === 0, 'initial maintenance must be pending with empty runs');
    check(closure.status === 'pending' && Array.isArray(closure.runs) && closure.runs.length === 0, 'initial closure must be pending with empty runs');
  } else {
    check(design.status === 'completed', 'normal lifecycle validation requires completed design step');
    let cursor = 0;
    while (cursor < stateQueue.length && byId.get(stateQueue[cursor].id).status === 'completed') cursor += 1;
    const completedPrefix = cursor;
    const frontier = cursor < stateQueue.length ? byId.get(stateQueue[cursor].id) : closure;
    if (cursor < stateQueue.length && ['running','blocked'].includes(frontier.status)) cursor += 1;
    for (; cursor < stateQueue.length; cursor += 1) check(byId.get(stateQueue[cursor].id).status === 'pending', stateQueue[cursor].id + ' bypasses the contiguous lifecycle prefix');
    if (completedPrefix < stateQueue.length) {
      check(closure.status === 'pending' && Array.isArray(closure.runs) && closure.runs.length === 0, 'closure cannot start before preclosure completes');
    } else {
      check(['pending','running','completed','blocked'].includes(closure.status), 'closure lifecycle status invalid');
    }
    const blocked = [...stateQueue.map((expected) => byId.get(expected.id)),closure].filter((step) => step.status === 'blocked');
    check(blocked.length <= 1, 'lifecycle may have at most one blocked frontier');
    if (blocked.length === 1) {
      check(![...stateQueue.map((expected) => byId.get(expected.id)),closure].some((step) => step.status === 'running'), 'blocked frontier cannot coexist with running work');
      const sequence = [...stateQueue.map((expected) => byId.get(expected.id)),closure];
      const blockedAt = sequence.indexOf(blocked[0]);
      check(sequence.slice(0, blockedAt).every((step) => step.status === 'completed'), 'blocked frontier must follow the completed prefix');
      check(sequence.slice(blockedAt + 1).every((step) => step.status === 'pending'), 'no successor may bypass a blocked frontier');
    }
  }

  const eligible = entries.filter((step) => compatibilityState.ready && executionCompatibility.released_steps.includes(step.id) && step.status === 'pending' && Array.isArray(step.depends_on) && step.depends_on.every((dependency) => {
    const prior = globalById.get(dependency);
    return prior && (prior.status === 'completed' || prior.status === 'skipped');
  }));
  if (options.initialPublication) {
    check(eligible.length === 0, 'initial running design must leave no successor eligible');
  } else {
    const runningQueue = stateQueue.find((expected) => byId.get(expected.id).status === 'running');
    const blockedQueue = stateQueue.find((expected) => byId.get(expected.id).status === 'blocked');
    if (compatibilityState.preparing || byId.get(executionCompatibility.release_terminal_step).status === 'completed' || runningQueue || blockedQueue || ['running','completed','blocked'].includes(closure.status)) check(eligible.length === 0, 'running/blocked/completed terminal work must leave no pending step eligible');
    else {
      const next = stateQueue.find((expected) => byId.get(expected.id).status === 'pending') || closure;
      check(eligible.length === 1 && eligible[0].id === next.id, 'scheduler must expose exactly the next lifecycle step ' + next.id);
    }
  }
  const visiting = new Set(), visited = new Set();
  function visit(id) {
    if (visited.has(id)) return;
    check(!visiting.has(id), 'BUILD_STATE dependency cycle at ' + id);
    visiting.add(id);
    const step = globalById.get(id);
    check(Array.isArray(step.depends_on), id + ' depends_on must be an array');
    for (const dependency of step.depends_on) {
      check(globalById.has(dependency), id + ' unknown dependency ' + dependency);
      visit(dependency);
    }
    visiting.delete(id); visited.add(id);
  }
  for (const id of globalById.keys()) visit(id);

  const priorOutputs = [];
  for (let index = 0; index < positions[0]; index += 1) for (const raw of entries[index].outputs) if (!queue.shared_output_exceptions.includes(raw)) priorOutputs.push([safeOutput(raw, entries[index].id + '.output'),entries[index].id]);
  for (const step of expectedQueue) for (const raw of step.outputs) if (!queue.shared_output_exceptions.includes(raw)) {
    const path = safeOutput(raw, step.id + '.output');
    if (!executionCompatibility.replacement_setup.replaces.includes(step.id)) for (const [priorPath, priorOwner] of priorOutputs) if (path === priorPath || path.startsWith(priorPath + '/') || priorPath.startsWith(path + '/')) {
      if (priorOwner === step.id) continue;
      const transition = executionCompatibility.setup_amendment.output_transitions[path] || queue.predecessor_output_transitions[path];
      const successor = queue.conditional_output_transitions[path];
      const direct = transition && transition.from_step === priorOwner && transition.to_step === step.id;
      const checkerHandoff = executionCompatibility.replacement_setup.checker_output_handoff;
      const directCheckerHandoff = path === checkerHandoff.path && priorOwner === checkerHandoff.from_step && step.id === checkerHandoff.to_step;
      const firefoxCheckerHandoff = executionCompatibility.firefox_setup_amendment.output_handoffs.find((handoff) => handoff.path === path && handoff.from_step === checkerHandoff.to_step && handoff.to_step === step.id);
      const checkerHandoffChain = path === checkerHandoff.path && priorOwner === checkerHandoff.from_step && checkerHandoff.to_step === firefoxCheckerHandoff?.from_step && firefoxCheckerHandoff.to_step === step.id;
      const directConditional = selectedMode && successor && successor.from_step === priorOwner && successor.to_step === step.id && successor.requires_measurement_mode === 'measured-selected' && successor.requires_selected_receipt === true && typeof successor.requires_incoming_inventory === 'string';
      const selectedChain = selectedMode && transition && successor && transition.from_step === priorOwner && transition.to_step === successor.from_step && successor.to_step === step.id && successor.requires_measurement_mode === 'measured-selected' && successor.requires_selected_receipt === true;
      check(path === priorPath && (direct || directCheckerHandoff || checkerHandoffChain || directConditional || selectedChain), 'BUILD_STATE predecessor/queue output overlap ' + priorOwner + ':' + priorPath + ' / ' + step.id + ':' + path);
    }
    if (!executionCompatibility.replacement_setup.replaces.includes(step.id)) priorOutputs.push([path,step.id]);
  }
  for (const raw of closure.outputs) if (!queue.shared_output_exceptions.includes(raw)) {
    const path = safeOutput(raw, closure.id + '.output');
    for (const [priorPath, priorOwner] of priorOutputs) check(!(path === priorPath || path.startsWith(priorPath + '/') || priorPath.startsWith(path + '/')), 'BUILD_STATE closure output overlaps ' + priorOwner + ':' + priorPath + ' / ' + closure.id + ':' + path);
  }
}

function validateAccepted(root, constants, args = {}) {
  assertEmbeddedConstants(constants, 'accepted-input validation');
  const overrideFlags = {
    coverage_sha256: '--coverage',
    requirements_sha256: '--requirements',
    coverage_validator_sha256: '--coverage-validator',
    resource_contract_sha256: '--resource-contract',
    resource_validator_sha256: '--resource-validator'
  };
  const loaded = {};
  for (const [field, defaultPath] of Object.entries(ACCEPTED_PATHS)) {
    const path = args[overrideFlags[field]] || defaultPath;
    const file = readBounded(root, path, field, 5242880);
    check(file.hash === constants.accepted_inputs[field], field + ' hash drift: ' + file.hash);
    loaded[field] = file;
  }
  return loaded;
}
function validateCoverage(coverage, requirements, constants) {
  assertEmbeddedConstants(constants, 'coverage validation');
  const capabilityMatches = [...requirements.matchAll(new RegExp('^## (CAP-[A-Z0-9-]+) — [^\\n]+\\n([\\s\\S]+?)(?=^## CAP-|(?![\\s\\S]))', 'gm'))];
  check(capabilityMatches.length === 79, 'accepted complete capability block count drift: ' + capabilityMatches.length);
  const classes = new Map();
  for (const match of capabilityMatches) {
    const classMatch = match[2].match(new RegExp('^- Classification: ([a-z-]+)$', 'm'));
    check(classMatch, match[1] + ' missing classification');
    check(!classes.has(match[1]), 'duplicate capability ' + match[1]);
    classes.set(match[1], classMatch[1]);
  }
  const frozenCaps = constants.chapters.flatMap((chapter) => constants.capability_by_chapter[chapter]);
  exactSet([...classes.keys()], frozenCaps, 'accepted capability IDs');
  const counts = {};
  for (const value of classes.values()) counts[value] = (counts[value] || 0) + 1;
  check(counts['mandatory-laptop-implementation'] === 55, 'mandatory capability count drift');
  check(counts['laptop-feasible-advanced-exercise'] === 12, 'advanced capability count drift');
  check(counts['bounded-scale-extension'] === 5, 'bounded capability count drift');
  check(counts['reference-core-proven'] === 7, 'reference-proven capability count drift');

  const ownerIndex = new Map();
  for (let index = 0; index < constants.chapters.length; index += 1) for (const capability of constants.capability_by_chapter[constants.chapters[index]]) {
    check(!ownerIndex.has(capability), capability + ' has multiple chapter owners');
    ownerIndex.set(capability, index);
  }
  const dependencyEdges = [];
  for (const match of capabilityMatches) {
    const dependencies = match[2].match(/^- Dependencies: (.+)$/m);
    check(dependencies, match[1] + ' missing complete Dependencies record');
    const prerequisiteIds = [...dependencies[1].matchAll(/CAP-[A-Z0-9-]+/g)].map((item) => item[0]);
    unique(prerequisiteIds, match[1] + ' capability dependencies');
    for (const prerequisite of prerequisiteIds) {
      check(classes.has(prerequisite), match[1] + ' has unknown capability dependency ' + prerequisite);
      check(ownerIndex.get(prerequisite) <= ownerIndex.get(match[1]), match[1] + ' prerequisite owner occurs later: ' + prerequisite);
      dependencyEdges.push([prerequisite,match[1]]);
    }
  }
  check(dependencyEdges.length === 245, 'accepted capability dependency edge count drift: ' + dependencyEdges.length);
  const adjacency = new Map([...classes.keys()].map((id) => [id,[]]));
  for (const [prerequisite, consumer] of dependencyEdges) if (prerequisite !== consumer) adjacency.get(prerequisite).push(consumer);
  const visitingCaps = new Set(), visitedCaps = new Set();
  function visitCapability(id) {
    if (visitedCaps.has(id)) return;
    check(!visitingCaps.has(id), 'accepted capability dependency cycle at ' + id);
    visitingCaps.add(id);
    for (const consumer of adjacency.get(id)) visitCapability(consumer);
    visitingCaps.delete(id); visitedCaps.add(id);
  }
  for (const id of adjacency.keys()) visitCapability(id);

  const findingMatches = [...coverage.matchAll(new RegExp('^### ([FP][0-9]{2}) — [^\\n]+\\n([\\s\\S]+?)(?=^### [FP][0-9]{2} —|^## 3\\.)', 'gm'))];
  exactArray(findingMatches.map((match) => match[1]), constants.finding_ids, 'finding IDs');
  const findingLinks = {};
  for (const match of findingMatches) {
    const linkLine = match[2].match(new RegExp('^- Requirement links: (.+)$', 'm'));
    check(linkLine, match[1] + ' lacks Requirement links');
    const ids = [...linkLine[1].matchAll(new RegExp('CAP-[A-Z0-9-]+', 'g'))].map((item) => item[0]);
    check(ids.length > 0, match[1] + ' has no capability link');
    unique(ids, match[1] + ' links');
    for (const id of ids) check(classes.has(id), match[1] + ' has unknown link ' + id);
    findingLinks[match[1]] = ids;
  }
  const claimMatches = [...coverage.matchAll(/^### (CLAIM-[0-9]{2}) — [^\n]+\n([\s\S]+?)(?=^### CLAIM-[0-9]{2} —|^## 6\.)/gm)];
  exactArray(claimMatches.map((match) => match[1]), constants.claim_ids, 'claim IDs');
  const claimRecords = claimMatches.map((match) => {
    const field = (name) => {
      const found = match[2].match(new RegExp('^- ' + name + ': (.+)$', 'm'));
      check(found, match[1] + ' missing accepted claim field ' + name);
      return found[1];
    };
    return {claim_id:match[1],classification:field('Classification'),claim:field('Claim'),evidence:field('Evidence'),boundary:field('Boundary')};
  });
  deepEqual(claimRecords, constants.accepted_claim_records, 'accepted exact claim records');
  const overIds = [...coverage.matchAll(new RegExp('^\\| \x60(OVER-[A-Z0-9-]+)\x60 \\|', 'gm'))].map((match) => match[1]);
  exactArray(overIds, Object.keys(constants.overbroad_dispositions), 'overbroad IDs');
  return { classes, findingLinks, dependencyEdges, claimRecords };
}
function parseAcceptedSourceRegister(requirements) {
  const records = [...requirements.matchAll(/^### (SRC-[A-Z0-9-]+) — ([^\n]+)\n- Kind: ([^\n]+)\n- URL: (https:\/\/[^\n]+)\n- Supports: ([^\n]+)\n- Claim limit: ([^\n]+)$/gm)].map((match) => ({
    source_id: match[1], title: match[2], kind: match[3], url: match[4], supports: match[5], claim_limit: match[6]
  }));
  check(records.length === 104, 'accepted history source register count drift');
  unique(records.map((record) => record.source_id), 'accepted history source register IDs');
  for (const record of records) {
    check(record.url.startsWith('https://'), record.source_id + ' non-HTTPS URL');
    for (const field of ['title', 'kind', 'supports', 'claim_limit']) check(record[field].trim(), record.source_id + ' blank ' + field);
  }
  return records;
}
function validateResource(resource, constants) {
  assertEmbeddedConstants(constants, 'resource validation');
  function literalFields(literal) {
    const open = literal.indexOf('(');
    check(open > 0 && literal.endsWith(')'), 'invalid resource literal ' + literal);
    const parts = literal.slice(open + 1, -1).split(';');
    const result = {};
    if (!parts[0].includes('=')) result.identity = parts.shift();
    for (const part of parts) {
      const separator = part.indexOf('=');
      check(separator > 0, 'invalid resource literal field ' + part);
      const key = part.slice(0, separator);
      check(!Object.hasOwn(result, key), 'duplicate resource literal field ' + key);
      result[key] = part.slice(separator + 1);
    }
    return result;
  }
  const derivedFormulas = [
    /Parameter elements: `([^`]+)`/,
    /KV bytes: `([^`]+)`/,
    /Linear plus nonmasked-causal matmul MACs: `([^`]+)`/,
    /Current materialized-dense-attention matmul MACs: `([^`]+)`/,
    /Persistent state bytes: `([^`]+)`/,
    /Peak activation bytes: `([^`]+)`/,
    /Communication bytes: `([^`]+)`/
  ].map((pattern) => {
    const match = resource.match(pattern);
    check(match, 'resource formula source line missing ' + pattern.source);
    return match[1];
  });
  exactArray(derivedFormulas, constants.formula_literals, 'exact resource formula projection');
  check(resource.includes(constants.prepared_input_record), 'prepared-input seam drift');
  const scaleMatches = [...resource.matchAll(new RegExp('^\x60scale\\(([^;]+);V=(\\d+);D=(\\d+);L=(\\d+);Hq=(\\d+);Hkv=(\\d+);F=(\\d+);C=(\\d+);B=(\\d+);N=(\\d+);P=(\\d+)\\)\x60$', 'gm'))];
  exactArray(scaleMatches.map((match) => match[1]), constants.scale_ids, 'scale IDs');
  const derivedScales = [];
  for (let index = 0; index < scaleMatches.length; index += 1) {
    const values = scaleMatches[index].slice(2).map(BigInt);
    const [V, D, L, Hq, Hkv, F, , , , P] = values;
    check(D % Hq === 0n && Hq % Hkv === 0n, 'head divisibility drift for ' + scaleMatches[index][1]);
    const computed = V * D + L * (2n * D * D + 2n * D * D * Hkv / Hq + 3n * D * F + 2n * D) + D;
    check(computed === P && String(P) === constants.scale_parameter_counts[index], 'parameter formula drift for ' + scaleMatches[index][1]);
    const literal = scaleMatches[index][0].slice(1,-1);
    const parsed = literalFields(literal);
    const previous = index === 0 ? null : derivedScales[index - 1].fields;
    const changed = previous ? Object.keys(parsed).filter((key) => key !== 'identity' && parsed[key] !== previous[key]) : [];
    derivedScales.push({scale_id:scaleMatches[index][1],literal,fields:parsed,changed_settings:changed});
  }
  deepEqual(derivedScales, constants.scale_records, 'accepted scale record projection');
  const profileMatches = [...resource.matchAll(/^`(profile\(([^;]+);[^`\n]+\))`$/gm)];
  exactArray(profileMatches.map((match) => match[2]), constants.profile_ids, 'profile IDs');
  const derivedProfiles = profileMatches.map((match) => ({profile_id:match[2],literal:match[1],fields:literalFields(match[1])}));
  deepEqual(derivedProfiles, constants.profile_records, 'accepted profile record projection');

  const witnessNames = ['planner_arithmetic','evaluation_scale','mac_causal','mac_dense','kv_bf16_full_context','dense_parameter_state_lower_bound','communication_fixture','device_admission','core_partition','calibration_policy','prepared_input'];
  const derivedWitnesses = witnessNames.map((name) => {
    const match = resource.match(new RegExp('^`(' + name + '\\([^`\\n]+\\))`$', 'm'));
    check(match, 'resource accounting witness missing ' + name);
    return match[1];
  });
  exactArray(derivedWitnesses, constants.accounting_witnesses, 'accepted accounting witnesses');
  const witness = Object.fromEntries(derivedWitnesses.map((literal) => [literal.slice(0,literal.indexOf('(')),literalFields(literal)]));
  const causal = (record) => {
    const f = record.fields; const B=BigInt(f.B),C=BigInt(f.C),L=BigInt(f.L),D=BigInt(f.D),Hq=BigInt(f.Hq),Hkv=BigInt(f.Hkv),F=BigInt(f.F),V=BigInt(f.V);
    return B*C*(L*(2n*D*D + 2n*D*D*Hkv/Hq + 3n*D*F) + D*V) + B*L*D*C*(C+1n);
  };
  const dense = (record) => {
    const f = record.fields; const B=BigInt(f.B),C=BigInt(f.C),L=BigInt(f.L),D=BigInt(f.D),Hq=BigInt(f.Hq),Hkv=BigInt(f.Hkv),F=BigInt(f.F),V=BigInt(f.V);
    return B*C*(L*(2n*D*D + 2n*D*D*Hkv/Hq + 3n*D*F) + D*V) + 2n*B*L*D*C*C;
  };
  const kv = (record) => { const f=record.fields; return 2n*BigInt(f.B)*BigInt(f.L)*BigInt(f.C)*BigInt(f.Hkv)*(BigInt(f.D)/BigInt(f.Hq))*2n; };
  for (const record of derivedScales) {
    check(BigInt(witness.mac_causal[record.scale_id]) === causal(record), record.scale_id + ' causal MAC witness drift');
    check(BigInt(witness.mac_dense[record.scale_id]) === dense(record), record.scale_id + ' dense MAC witness drift');
    check(BigInt(witness.kv_bf16_full_context[record.scale_id]) === kv(record), record.scale_id + ' KV witness drift');
    const P=BigInt(record.fields.P), prefix=record.scale_id === 'production-plan' ? 'production' : record.scale_id;
    const state = witness.dense_parameter_state_lower_bound;
    check(BigInt(state[prefix + '_fp16'] || state[prefix + '_bf16']) === P*2n, record.scale_id + ' 2-byte state witness drift');
    check(BigInt(state[prefix + '_fp32']) === P*4n, record.scale_id + ' FP32 state witness drift');
    check(BigInt(state[prefix + '_mixed_adamw']) === P*18n, record.scale_id + ' AdamW state witness drift');
  }
  const evalFields = witness.evaluation_scale;
  const evalRecord = {fields:evalFields};
  const evalP = BigInt(evalFields.V)*BigInt(evalFields.D) + BigInt(evalFields.L)*(2n*BigInt(evalFields.D)**2n + 2n*BigInt(evalFields.D)**2n*BigInt(evalFields.Hkv)/BigInt(evalFields.Hq) + 3n*BigInt(evalFields.D)*BigInt(evalFields.F) + 2n*BigInt(evalFields.D)) + BigInt(evalFields.D);
  check(evalP === BigInt(evalFields.P) && kv(evalRecord) === BigInt(evalFields.KV_bf16) && causal(evalRecord) === BigInt(evalFields.MAC_causal) && dense(evalRecord) === BigInt(evalFields.MAC_dense), 'evaluation-scale accounting witness drift');
  const comm=witness.communication_fixture;
  const bytesPerEvent=BigInt(comm.messages_per_rank_event)*BigInt(comm.payload_elements_per_message)*BigInt(comm.dtype_bytes);
  check(bytesPerEvent===BigInt(comm.bytes_per_rank_event) && bytesPerEvent*BigInt(comm.events)===BigInt(comm.bytes_per_rank) && BigInt(comm.bytes_per_rank)*BigInt(comm.world_size)===BigInt(comm.bytes_all_ranks), 'communication witness arithmetic drift');
  const partition=witness.core_partition;
  const partitionTotal=['state','activations','workspace','kv','batch_metadata','slack'].reduce((sum,key)=>sum+BigInt(partition[key]),0n);
  check(partitionTotal===BigInt(partition.total), 'core partition sum drift');
  check(resource.includes('CDLA-Sharing-1.0'), 'TinyStories license record drift');
  for (const [name, record] of Object.entries(constants.resource_contract_records)) {
    const match = resource.match(new RegExp('^`(' + name + '\\([^`\\n]+\\))`$', 'm'));
    check(match && match[1] === record, 'exact resource contract projection drift: ' + name);
  }
}
function validateSchema(schema, constants) {
  if (EMBEDDED_SCHEMA !== null) deepEqual(schema, EMBEDDED_SCHEMA, 'immutable embedded schema');
  if (PUBLISHED_SCHEMA_SHA256 !== null) check(sha256(publishedJsonBytes(schema)) === PUBLISHED_SCHEMA_SHA256, 'immutable schema canonical-byte SHA-256 drift');
  assertEmbeddedConstants(constants, 'schema validation');
  check(schema.properties.plan_id.const === constants.plan.plan_id, 'schema plan ID drift');
  check(schema.properties.input_predecessor_revision.const === 77, 'schema input predecessor drift');
  check(schema.properties.published_predecessor_revision.const === 78, 'schema published predecessor drift');
  check(schema.properties.chapter_count.const === 46, 'schema chapter count drift');
  check(schema.properties.last_chapter.const === constants.plan.last_chapter, 'schema terminal chapter drift');
  check(schema.properties.published_predecessor_sha256.const === PUBLISHED_PREDECESSOR_SHA256, 'schema predecessor SHA drift');
  check(schema.properties.implementation_steps.minItems === 66 && schema.properties.implementation_steps.maxItems === 66, 'schema immutable base queue count drift');
  check(schema.properties.capability_map.minItems === 79, 'schema capability count drift');
  check(schema.properties.finding_map.minItems === 17, 'schema finding count drift');
  check(schema.properties.reference_claim_map.minItems === 40, 'schema claim count drift');
  check(schema.properties.overbroad_surface_map.minItems === 21, 'schema overbroad count drift');
  check(schema.properties.teaching_formula_map.minItems === 46 && schema.properties.history_source_register.minItems === 104, 'schema formula/history counts drift');
  for (const field of ['teaching_formula_id', 'historical_sources', 'resource_profiles', 'lifecycle_cost', 'implementation_cost', 'cost_authority_steps']) check(schema.$defs.chapter.required.includes(field), 'schema chapter missing ' + field);
  exactSet(schema.$defs.resourceProjection.required, ['scales','profiles','derived_subprofiles','formula_literals','accounting_witnesses','prepared_input','prepared_input_architecture','contract_records','execution_profile_owners','execution_boundaries','open_model_candidate_registry','rust_infrastructure_owners','rust_module_registry_contract','capability_closure_projection','capability_receipt_protocol','canonical_output_inventory_contract','state_lifecycle_contract'], 'schema resource projection keys');
  exactArray(schema.properties.scale_ids.prefixItems.map((item) => item.const), constants.scale_ids, 'schema scales');
  exactArray(schema.properties.profile_ids.prefixItems.map((item) => item.const), constants.profile_ids, 'schema profiles');
  exactArray(schema.properties.formula_ids.prefixItems.map((item) => item.const), constants.formula_ids, 'schema formulas');
}
function validateChapterRecords(records, constants) {
  if (EMBEDDED_CHAPTER_RECORDS !== null) deepEqual(records, EMBEDDED_CHAPTER_RECORDS, 'immutable embedded chapter records');
  if (PUBLISHED_CHAPTER_RECORDS_SHA256 !== null) check(sha256(publishedJsonBytes(records)) === PUBLISHED_CHAPTER_RECORDS_SHA256, 'immutable chapter-record canonical-byte SHA-256 drift');
  assertEmbeddedConstants(constants, 'chapter-record validation');
  check(records && Array.isArray(records.chapters) && records.chapters.length === 46, 'chapter records must contain exactly 46 chapters');
  exactArray(records.chapters.map((record) => record.identity?.chapterId), constants.chapters, 'chapter-record chapter identities');
  for (const record of records.chapters) {
    const chapter = record.identity.chapterId;
    deepEqual(record.capabilityIds, constants.capability_by_chapter[chapter], chapter + ' chapter-record capability projection');
    deepEqual(record.rustContribution?.modules, constants.rust_owners[chapter], chapter + ' chapter-record Rust ownership projection');
    check(record.formula?.notation === constants.teaching_formula_by_chapter[chapter].notation && record.formula?.meaning === constants.teaching_formula_by_chapter[chapter].meaning, chapter + ' chapter-record teaching formula projection drift');
    check(record.history?.historicalContrast === constants.history_by_chapter[chapter].historical_contrast, chapter + ' chapter-record historical contrast drift');
    deepEqual(record.history?.sources, constants.history_by_chapter[chapter].historical_sources.map((item) => ({role:item.role,sourceId:item.source_id,year:item.year})), chapter + ' chapter-record history-source projection drift');
  }
}
function validateJsonSchema(value, schema) {
  function resolveRef(ref) {
    check(ref.startsWith('#/'), 'schema external reference forbidden');
    let current = schema;
    for (const token of ref.slice(2).split('/')) {
      const key = token.replaceAll('~1', '/').replaceAll('~0', '~');
      check(current && Object.hasOwn(current, key), 'schema reference missing ' + ref);
      current = current[key];
    }
    return current;
  }
  function errorsFor(node, rule, path) {
    const errors = [];
    const add = (message) => errors.push(path + ': ' + message);
    if (!rule || typeof rule !== 'object') return errors;
    if (rule.$ref) errors.push(...errorsFor(node, resolveRef(rule.$ref), path));
    if (Object.hasOwn(rule, 'const') && JSON.stringify(node) !== JSON.stringify(rule.const)) add('const drift');
    if (rule.enum && !rule.enum.some((item) => JSON.stringify(item) === JSON.stringify(node))) add('enum drift');
    if (rule.type) {
      const ok = rule.type === 'array' ? Array.isArray(node) : rule.type === 'object' ? node !== null && typeof node === 'object' && !Array.isArray(node) : rule.type === 'integer' ? Number.isSafeInteger(node) : rule.type === 'number' ? typeof node === 'number' && Number.isFinite(node) && Number.isSafeInteger(node) : rule.type === 'null' ? node === null : typeof node === rule.type;
      if (!ok) { add('type must be ' + rule.type); return errors; }
    }
    if (typeof node === 'string') {
      if (rule.pattern && !new RegExp(rule.pattern, 'u').test(node)) add('pattern mismatch');
      if (rule.minLength !== undefined && node.length < rule.minLength) add('minLength');
      if (rule.maxLength !== undefined && node.length > rule.maxLength) add('maxLength');
    }
    if (typeof node === 'number') {
      if (rule.minimum !== undefined && node < rule.minimum) add('minimum');
      if (rule.maximum !== undefined && node > rule.maximum) add('maximum');
    }
    if (Array.isArray(node)) {
      if (rule.minItems !== undefined && node.length < rule.minItems) add('minItems');
      if (rule.maxItems !== undefined && node.length > rule.maxItems) add('maxItems');
      if (rule.uniqueItems && new Set(node.map((item) => JSON.stringify(item))).size !== node.length) add('uniqueItems');
      const prefix = rule.prefixItems || [];
      for (let index = 0; index < Math.min(node.length, prefix.length); index += 1) errors.push(...errorsFor(node[index], prefix[index], path + '[' + index + ']'));
      if (rule.items === false && node.length > prefix.length) add('additional array items forbidden');
      else if (rule.items && typeof rule.items === 'object') for (let index = prefix.length; index < node.length; index += 1) errors.push(...errorsFor(node[index], rule.items, path + '[' + index + ']'));
    }
    if (node !== null && typeof node === 'object' && !Array.isArray(node)) {
      for (const key of rule.required || []) if (!Object.hasOwn(node, key)) add('missing required ' + key);
      for (const [key, child] of Object.entries(rule.properties || {})) if (Object.hasOwn(node, key)) errors.push(...errorsFor(node[key], child, path + '.' + key));
      if (rule.additionalProperties === false) for (const key of Object.keys(node)) if (!Object.hasOwn(rule.properties || {}, key)) add('additional property ' + key);
    }
    for (const child of rule.allOf || []) errors.push(...errorsFor(node, child, path));
    if (rule.oneOf) {
      const matches = rule.oneOf.filter((child) => errorsFor(node, child, path).length === 0);
      if (matches.length !== 1) add('oneOf matched ' + matches.length + ' branches');
    }
    if (rule.if) {
      const branch = errorsFor(node, rule.if, path).length === 0 ? rule.then : rule.else;
      if (branch) errors.push(...errorsFor(node, branch, path));
    }
    return errors;
  }
  const errors = errorsFor(value, schema, '$');
  check(errors.length === 0, 'plan schema validation failed: ' + errors.slice(0, 8).join('; '));
}
function parseCostNotes(notes, label) {
  check(typeof notes === 'string' && notes.length > 0, label + ' cost notes missing');
  const record = {};
  for (const segment of notes.split(';')) {
    check(/^[a-z][a-z0-9_]*=[^;]+$/.test(segment), label + ' malformed cost segment ' + segment);
    const at = segment.indexOf('=');
    const key = segment.slice(0, at);
    check(!Object.hasOwn(record, key), label + ' duplicate cost key ' + key);
    record[key] = segment.slice(at + 1);
  }
  for (const [key, pattern] of Object.entries({ cpu: /^C[0-3]$/, gpu: /^G[0-3]$/, network: /^N[0-3]$/, paid: /^none$/ })) {
    check(pattern.test(record[key] || ''), label + ' invalid or missing ' + key);
  }
  return record;
}

function validateQueue(queue, constants, root = DEFAULT_ROOT) {
  assertEmbeddedQueue(queue, 'queue validation');
  assertEmbeddedConstants(constants, 'queue validation');
  const executionCompatibility = readExecutionCompatibility(root);
  check(queue.schema_version === 1 && queue.build_id === 'extend-course-to-functional-laptop-llm-20260810', 'queue identity drift');
  check(queue.base_step_count === 66 && queue.chapter_step_count === 46 && queue.crosscut_step_count === 20, 'queue counts drift');
  deepEqual(constants.queue_counts, { base: 66, chapters: 46, crosscuts: 20, selected: 70 }, 'constant queue counts');
  exactArray(queue.steps.map((step) => step.id), constants.queue_ids, 'queue IDs');
  check(queue.steps.length === 66, 'queue raw count drift');
  deepEqual(queue.closure_contract, constants.closure_contract, 'frozen closure contract');
  exactSet(Object.keys(queue.closure_contract), ['id','objective','depends_on','inputs','outputs','acceptance','validate','cost'], 'closure contract fields');
  check(queue.closure_contract.id === constants.closure_step_id, 'closure identity drift');
  exactArray(queue.closure_contract.depends_on, [constants.closure_depends_on], 'closure dependency');
  unique(queue.closure_contract.outputs, 'closure outputs');
  unique(queue.closure_contract.validate, 'closure validate');
  parseCostNotes(queue.closure_contract.cost.notes, 'closure');
  const outputInventoryContract = constants.canonical_output_inventory_contract;
  check(outputInventoryContract?.schema_version === 1 && outputInventoryContract.path_template === 'artifacts/functional-laptop/step-output-inventories/<step-id>.json', 'canonical output inventory protocol identity drift');
  exactArray(outputInventoryContract.required_fields, ['schema_version','step_id','declared_outputs_sha256','files','inventory_root_sha256'], 'canonical output inventory fields');
  exactArray(outputInventoryContract.file_fields, ['path','bytes','sha256'], 'canonical output inventory file fields');
  for (const step of [...queue.steps,...queue.conditional_postgresql.selected_steps,queue.closure_contract]) {
    const inventoryPath = `artifacts/functional-laptop/step-output-inventories/${step.id}.json`;
    check(step.outputs.filter((path) => path === inventoryPath).length === 1, step.id + ' must own exactly one canonical output inventory');
  }

  const boundaries = constants.execution_boundary_records;
  check(boundaries?.version === 1, 'execution boundary projection missing');
  deepEqual(boundaries.queue_counts, { base: 66, selected: 70, chapters: 46, crosscuts: 20 }, 'execution boundary counts');
  const registryContract = constants.rust_module_registry_contract;
  check(registryContract?.contract_id === 'ownership-map-v1' && registryContract.encoding === 'ASCII subset of UTF-8' && registryContract.line_ending === 'LF' && registryContract.record_line_count === 3, 'Rust ownership fragment grammar identity drift');
  exactArray(registryContract.record_lines_exact, ['version=1','module=functional::<one-or-more-rust-identifiers-separated-by-double-colons>','source=src/<exact-allowlisted-regular-file>.rs'], 'Rust ownership fragment exact three lines');
  check(registryContract.record_separator === 'exactly one empty LF-terminated line' && registryContract.final_record_termination === 'source line ends LF; no extra blank line after final record', 'Rust ownership fragment separator/EOF drift');
  check(registryContract.fragment_filename_pattern === '^ch[4-8][0-9]-[a-z0-9]+(?:-[a-z0-9]+)*\\.module$' && registryContract.source_pattern === '^src/(?:[a-z_][a-z0-9_]*/)*[a-z_][a-z0-9_]*\\.rs$', 'Rust ownership fragment filename/source grammar drift');
  exactArray(registryContract.registry_subset.exclude_declared_edits, ['src/models/decoder.rs','src/generation/kv_cache.rs','src/training/adamw.rs','src/training/trainer.rs','src/checkpoint.rs'], 'Rust ownership fragment declared-edit exclusions');
  exactArray(registryContract.registry_subset.exclude_auto_discovered_binary, ['src/bin/llm-local-server.rs'], 'Rust ownership fragment auto-binary exclusions');
  for (const rejection of ['symlink-fragment','non-regular-fragment','non-ASCII-or-invalid-UTF8','path-traversal','backslash','absolute-path','duplicate-module','duplicate-source','module-prefix-collision','missing-final-LF','extra-final-blank-line']) check(registryContract.parser_rejections.includes(rejection), 'Rust ownership fragment missing rejection ' + rejection);
  check(registryContract.generation.includes('include!(concat!') && registryContract.exhaustive_reachability.includes('exactly once'), 'Rust ownership fragment generation/reachability drift');
  exactArray(boundaries.order, [
    'establish-functional-offline-workspace-execution-boundary',
    'establish-functional-firefox-execution-boundary',
    'establish-functional-artifact-cache-execution-boundary',
    'execute-functional-corpus-filtering',
    'execute-functional-corpus-dedup-split',
    'execute-functional-tokenizer-and-tokenized-splits',
    'establish-functional-gpu-execution-boundary'
  ], 'execution boundary owner order');
  exactArray(boundaries.gpu.accepted_profile_ids, ['8gb-gpu-smoke','8gb-gpu-advanced-smoke-v1','8gb-seed-sensitivity','8gb-gpu-core','8gb-adapter'], 'GPU runner accepted profile IDs');
  const bootstrap = boundaries.offline_workspace.clean_host_bootstrap;
  check(bootstrap?.authority === 'N2-acquire-verify-lock-derive' && bootstrap.base_images.length >= 1, 'offline clean-host bootstrap contract missing');
  deepEqual(bootstrap.base_images[0], { reference:'node:22.12.0-bookworm@sha256:0e910f435308c36ea60b4cfd7b80208044d77a074d16b768a81901ce938a62dc', digest:'sha256:0e910f435308c36ea60b4cfd7b80208044d77a074d16b768a81901ce938a62dc', platform:'linux/amd64' }, 'offline digest-pinned Node base');
  check(bootstrap.rustup.sha256 === '4acc9acc76d5079515b46346a485974457b5a79893cfb01112423c89aeb5aa10' && bootstrap.rust_toolchain.version === '1.93.1' && bootstrap.rust_toolchain.channel_manifest_sha256 === '4812a3c610bacc74eed12c89c312e540722dccccd867bd55096402da13b3a516', 'offline Rust bootstrap identity drift');
  check(bootstrap.debian_snapshot.url === 'https://snapshot.debian.org/archive/debian/20260731T202417Z/' && bootstrap.successor_build.network === 'none' && bootstrap.successor_build.pull === false, 'offline snapshot/source-build boundary drift');
  const tokenizerOracleRuntime = boundaries.offline_workspace.validation_only_oracle_runtime;
  check(tokenizerOracleRuntime?.base_image === bootstrap.base_images[0].reference && tokenizerOracleRuntime.python_version === '3.11.2' && tokenizerOracleRuntime.regex?.debian_version === '0.1.20221031-1+b1' && tokenizerOracleRuntime.regex?.unicode_version === '15.0.0', 'GPT-2 validation-only Python/regex runtime drift');
  check(tokenizerOracleRuntime.regex.copyright_sha256 === '4fc7abc12c0e721ad05781e540fed895a6b9670840133d1bdb6148508f3bf96e' && tokenizerOracleRuntime.regex.installed_license_path === '/usr/share/doc/python3-regex/copyright', 'GPT-2 oracle regex license clearance drift');
  exactArray(tokenizerOracleRuntime.direct_packages.map((record) => record.sha256), ['33f6dafbd1a6902d9063172ec7dbd4b2225e12009e0d7ec5c933a72c2f5f3b74','30f9618670e686d781afbfc713eb0830c29d2819e9cb2a0488800dad6bb99faa','4e58891d5c951a1e360ed9eaa814413cb5e84deadce3f08e801ac680434c786e','cd7b10c24281416a6acb22cd23ed7391c7dddd4a3d4d4a63d37faa786639b5de','4aba533f7cc5e7b93b7ff24482840e96813f5bcde9cce028395b65a0d799ccee','f3beaa03994ffedacf73c43a0843d53b062d347115d8af65bee2034552a4e6f9','890b3540dad8a1ccc0deeca025db735bcc82629a76adacbe3b50fcc06ed528ca','64f823f4a5fffa69ab6fb21bf7240d162ddc78d6c97f4d03c081fc764952e999'], 'GPT-2 oracle Debian direct-package identities');
  check(!/python:3\.6|3\.6\.15|2017\.04\.05|d811874e/.test(JSON.stringify(boundaries)), 'obsolete/unlicensed Python 3.6 or regex-2017 oracle authority remains');
  const vulkan = boundaries.offline_workspace.supporting_dependency_refresh?.additional_direct_packages?.find((record) => record.name === 'libvulkan1');
  check(vulkan?.version === '1.3.239.0-1' && vulkan.bytes_sha256 === '622f5e51a9f2ea70f16a937968183b068108389811041308019f869c80ec8637', 'pinned Vulkan loader refresh drift');
  check(boundaries.offline_workspace.bootstrap_base_image_id === 'sha256:aa971e0f72bc0c6aed4a8ddb65020f8a583b4633b13955a47d41f786952adde3' && boundaries.offline_workspace.bootstrap_pull === 'never' && boundaries.offline_workspace.successor_source_build_network === 'none', 'offline reusable image/network drift');
  check(boundaries.firefox.project === 'firefox' && boundaries.firefox.playwright_version === '1.61.1' && boundaries.firefox.runtime_network === 'none', 'Firefox boundary drift');
  check(boundaries.firefox.image === 'mcr.microsoft.com/playwright:v1.61.1-noble@sha256:5b8f294aff9041b7191c34a4bab3ac270157a28774d4b0660e9743297b697e48' && boundaries.firefox.image_digest === 'sha256:5b8f294aff9041b7191c34a4bab3ac270157a28774d4b0660e9743297b697e48' && boundaries.firefox.firefox_revision === 1532 && boundaries.firefox.executable_contract === 'playwright-1.61.1-firefox-1532-immutable-image-executable-sha256-receipt', 'Firefox immutable image/revision/executable receipt drift');
  check(boundaries.artifact_cache.cache_root === '.build/artifact-cache/functional-v1/sha256/<digest>/payload', 'artifact cache root drift');
  const gpt2Target = boundaries.artifact_cache.target_registry.find((record) => record.step_id === 'execute-functional-tokenizer-and-tokenized-splits' && record.target_id === 'standalone-gpt2-tokenizer-source-v1');
  check(gpt2Target?.download_bytes_exact === 1503924 && gpt2Target.download_bytes_max === 2097152 && gpt2Target.no_model_weights === true, 'standalone GPT-2 tokenizer acquisition boundary drift');
  deepEqual(gpt2Target.accepted_sources.map(({role,url,bytes,sha256}) => ({role,url,bytes,sha256})), [
    {role:'official-reference-source',url:'https://raw.githubusercontent.com/openai/gpt-2/e5c5054474f583d6d9499624649353995d63c70a/src/encoder.py',bytes:4242,sha256:'84caddd892377b74de8b61f1fdf2437de9dc025c2f3bc73a981edcb0605e4f9a'},
    {role:'encoder-vocabulary',url:'https://openaipublic.blob.core.windows.net/gpt-2/encodings/main/encoder.json',bytes:1042301,sha256:'196139668be63f3b5d6574427317ae82f612a97c5d1cdaf36ed2256dbf636783'},
    {role:'merge-ranks',url:'https://openaipublic.blob.core.windows.net/gpt-2/encodings/main/vocab.bpe',bytes:456318,sha256:'1ce1664773c50f3e0cc8842619a93edc4624525b728b188a9e0be33b7726adc5'},
    {role:'license-text',url:'https://raw.githubusercontent.com/openai/gpt-2/e5c5054474f583d6d9499624649353995d63c70a/LICENSE',bytes:1063,sha256:'4682c2fef4e38ad3eaafd0ce6a2058f80892e308caa453923acc5283b559278a'}
  ], 'standalone GPT-2 tokenizer exact official sources');
  const standaloneTokenizer = boundaries.data_pipeline.standalone_tokenizer_oracle;
  check(standaloneTokenizer?.frozen_strings_min === 100 && standaloneTokenizer.regex_engine?.debian_version === '0.1.20221031-1+b1' && standaloneTokenizer.regex_engine?.unicode_version === '15.0.0' && standaloneTokenizer.output_receipt === 'artifacts/functional-laptop/data/tokenizer-and-tokenized-splits-v1/standalone-imported-tokenizer-oracle-receipt.json', 'standalone tokenizer oracle identity/receipt drift');
  check(standaloneTokenizer.comparison === 'exact token IDs and reconstructed bytes for every frozen string; individual token fragments need not be valid UTF-8 and replacement-character decoding is forbidden' && standaloneTokenizer.frozen_string_coverage.includes('Unicode-category-boundaries'), 'standalone tokenizer oracle coverage underbound');
  deepEqual(standaloneTokenizer.semantic_policy, {
    normalization:'none-before-UTF-8',
    byte_mapping:'exact admitted encoder.py bytes_to_unicode bijection',
    bpe_rank_order:'exact vocab.bpe line order after the one header line',
    pretokenization_regex:"'s|'t|'re|'ve|'m|'ll|'d| ?\\p{L}+| ?\\p{N}+| ?[^\\s\\p{L}\\p{N}]+|\\s+(?!\\S)|\\s+",
    vocabulary_size:50257,
    endoftext_id:50256,
    structural_policy:'ordinary text equal to <|endoftext|> is encoded as ordinary bytes and cannot forge structural ID 50256; only the typed course structural-token API may insert it',
    receipt_evidence:['original_utf8_bytes_hex','token_ids','per_token_decoded_bytes_hex','concatenated_decoded_bytes_hex','byte_equality','utf8_text_only_when_valid']
  }, 'standalone tokenizer exact semantic policy');
  const oracleToolchains = boundaries.offline_workspace.supporting_dependency_refresh.validation_oracle_toolchains;
  check(oracleToolchains?.transformers?.source_commit === '8cb5963cc22174954e7dca2c0a3320b7dc2f4edc' && oracleToolchains.transformers.wheel.sha256 === 'b10d05da8fa67dc41644dbbf9bc45a44cb86ae33da6f9295f5fbf5b7890bd267', 'Transformers validation-oracle root drift');
  check(oracleToolchains.torch.version === '2.8.0+cpu' && oracleToolchains.torch.wheel_sha256 === 'cb06175284673a581dd91fb1965662ae4ecaba6e5c357aa0ea7bb8b84b6b7eeb' && oracleToolchains.llama2_c.source_commit === '350e04fe35433e6d2941dce5a1f53308f87058eb', 'Torch/llama2.c validation-oracle roots drift');
  check(oracleToolchains.admission.download_bytes_max === 2147483648 && oracleToolchains.admission.full_graph_rule.includes('every transitive wheel'), 'validation-oracle full graph admission underbound');
  const denseFixtures = boundaries.independent_dense_fixtures;
  deepEqual(denseFixtures.bridge_config, {schema:'autoregressive-decoder-bridge-v1',vocabulary:266,d_model:16,layers:2,query_heads:2,kv_heads:2,head_dim:8,d_ff:20,context:16,tied_embeddings:true,attention_bias:false,mlp_bias:false,attention_dropout:0,hidden_dropout:0,norm:'pre-RMSNorm',rms_norm_epsilon:0.00001,activation:'SwiGLU',hidden_act:'silu',position:'RoPE',rope_theta:10000,rope_scaling:null,causal_mask:'strict-lower-triangular-plus-diagonal-with-padding-excluded',parameter_count:8304,parameter_family:'course-autoregressive-decoder-v1',dtype:'f32',weight_bytes:33216,chat_template:{path:'configs/functional-data-pipeline/raw-token-sequence-template-v1.json',canonical_bytes:'{"id":"raw-token-sequence-v1","template":"none"}\n',sha256:'67e2739043a79fbd71491d8bbc86e4036bc6948d46952a578219071fc6d71321'}}, 'independent dense bridge semantic config');
  deepEqual(denseFixtures.tokenizer, {kind:'course-reference-byte-merge-v1',lineage_receipt:'artifacts/functional-laptop/data/tokenizer-and-tokenized-splits-v1/course-reference-tokenizer-lineage-receipt.json',bos_id:0,eos_id:1,pad_id:null,byte_id_range:[2,257],merge_id_range:[258,265],merge_count_exact:8,ordered_merge_pairs_and_ranks:'exact receipt field',normalization:'none',pretokenizer:'raw-bytes-only',vocabulary:266}, 'independent dense bridge tokenizer');
  check(denseFixtures.prompts.count === 100 && denseFixtures.prompts.positions_exact === 826 && denseFixtures.prompts.logits_per_position_exact === 266 && denseFixtures.prompts.values_exact === 219716 && denseFixtures.prompts.full_logits_bytes_per_fixture === 878864 && denseFixtures.prompts.frozen_before_execution === true, 'dense fixture all-position full-logit oracle dimensions drift');
  check(denseFixtures.prompts.lengths.length === 100 && denseFixtures.prompts.lengths.reduce((sum,value) => sum + value,0) === 826, 'dense fixture prompt length inventory drift');
  exactArray(denseFixtures.producers.map((record) => record.id), ['transformers-4.57.1-fixture-a','llama2c-350e04fe-fixture-b'], 'dense fixture independent producer identities');
  exactArray(denseFixtures.producers.map((record) => record.driver), ['scripts/validation-oracles/generate-transformers-bridge-fixture.py','scripts/validation-oracles/generate-llama2c-bridge-fixture.py'], 'dense fixture independent producer drivers');
  deepEqual(denseFixtures.numeric_comparison, {dtype:'f32',atol:0.00001,rtol:0.0001,prompts_exact:100,positions_total_exact:826,logits_per_position_exact:266,total_values_exact:219716,total_bytes_per_producer_exact:878864,compare_all_positions_and_vocabulary_logits:true}, 'dense fixture tolerance/all-position coverage');
  deepEqual(denseFixtures.producer_ceilings, {host_bytes_max_each:2147483648,disk_bytes_max_each:2147483648,wall_seconds_max_each:600,network:'none'}, 'dense fixture source producer ceilings');
  check(denseFixtures.tiny_ci?.target_id === 'ch56-two-dense-fixtures-tiny-ci-v1' && denseFixtures.tiny_ci.host_bytes_max === 268435456 && denseFixtures.tiny_ci.wall_seconds_max === 120 && denseFixtures.tiny_ci.per_fixture_bytes_max === 104857600 && denseFixtures.tiny_ci.network === 'none' && denseFixtures.tiny_ci.preallocation_refusal === true, 'dense fixture course-only tiny-CI boundary drift');
  check(denseFixtures.source_receipt_fields.includes('source_runtime_execution_log_sha256') && denseFixtures.source_receipt_fields.includes('prng_and_initializer_state_sha256') && denseFixtures.source_publication_fields.includes('cache_entry_sha256') && denseFixtures.combined_receipt_fields.includes('two_dth_receipt_sha256') && denseFixtures.combined_receipt_fields.includes('two_final_cache_publication_receipt_sha256'), 'dense fixture receipt/cache chronology underbound');
  check(denseFixtures.generated_fixture_license.spdx === 'MIT' && denseFixtures.generated_fixture_license.retained_text_sha256 === 'da54132e598591fcdd69970106860f96ddf9080142aebc37278808b4f7ef1146', 'generated fixture redistribution license drift');
  check(denseFixtures.producers[1].native_checkpoint.header_bytes === 28 && denseFixtures.producers[1].native_checkpoint.signed_vocab_size === -266 && denseFixtures.producers[1].native_checkpoint.parameter_state_bytes === 33216 && denseFixtures.producers[1].native_checkpoint.derived_nonparameter_rope_table_bytes === 512 && denseFixtures.producers[1].native_checkpoint.total_file_bytes === 33756 && denseFixtures.producers[1].native_checkpoint.extra_classifier_head_bytes === 0, 'llama2.c native checkpoint parameter/nonparameter accounting drift');
  check(boundaries.history_source_evidence.cache_root === '.build/history-source-cache/v1/sha256/<digest>', 'history cache root drift');
  check(boundaries.history_source_evidence.distinct_source_count === boundaries.history_source_evidence.source_ids.length, 'history distinct-source count drift');
  unique(boundaries.history_source_evidence.source_ids, 'history source IDs');
  const acceptedSourceIds = new Set(constants.accepted_source_register.map((record) => record.source_id));
  const chapterHistoryIds = constants.chapters.flatMap((chapter) => constants.history_by_chapter[chapter].historical_sources.map((record) => record.source_id));
  check(chapterHistoryIds.length === 92, 'chapter history source reference count drift');
  check(chapterHistoryIds.every((sourceId) => acceptedSourceIds.has(sourceId)), 'chapter history source is outside the accepted 104-source register');
  exactSet(boundaries.history_source_evidence.source_ids, [...new Set(chapterHistoryIds)], 'history evidence exact used-source union');
  check(boundaries.history_source_evidence.source_ids.length === 67, 'history evidence distinct used-source count must be 67');
  for (const [chapter, earlierId, earlierYear, laterId, laterYear] of [
    ['50-dependency-error-contract','SRC-ISA-046',2015,'SRC-ISA-047',2019],
    ['62-laptop-hardware-admission','SRC-DTH-HW-01',2023,'SRC-DTH-HW-03',2025],
    ['67-stop-strings-unicode-streaming','SRC-ISA-005',2009,'SRC-ISA-004',2014],
    ['85-persistence-scale-decision','SRC-ISA-023',2020,'SRC-ISA-036',2025]
  ]) deepEqual(constants.history_by_chapter[chapter].historical_sources, [{source_id:earlierId,role:'earlier',year:earlierYear},{source_id:laterId,role:'later',year:laterYear}], chapter + ' exact corrected historical pair');
  for (const [field, expected] of Object.entries({ per_source_download_bytes_max: 67108864, per_source_expanded_bytes_max: 268435456, per_chapter_download_bytes_max: 134217728, per_chapter_expanded_bytes_max: 536870912, redirects_per_request_max: 3, requests_per_source_max: 1, wall_seconds_per_chapter_max: 900 })) check(boundaries.history_source_evidence[field] === expected, 'history evidence ceiling drift ' + field);
  const historyBoundary = boundaries.history_source_evidence;
  check(historyBoundary.contract_id === 'functional-history-source-evidence-v1' && historyBoundary.request_method === 'GET', 'history source closed transport contract identity drift');
  check(historyBoundary.source_records.length === 67, 'history exact source record count drift');
  exactArray(historyBoundary.source_records.map((record) => record.source_id),historyBoundary.source_ids,'history exact source-record order');
  const acceptedHistoryById = new Map(constants.accepted_source_register.map((record) => [record.source_id,record]));
  const directHistoryRequests = new Map([
    ['SRC-DTH-SCALE-02','https://arxiv.org/abs/1910.02054v3'],
    ['SRC-ISA-024','https://arxiv.org/abs/2210.03629v3'],
    ['SRC-ISA-034','https://arxiv.org/abs/1810.03993v2'],
    ['SRC-ISA-035','https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf']
  ]);
  for (const record of historyBoundary.source_records) {
    exactSet(Object.keys(record),['source_id','title','kind','role_and_claim_limit_sha256','canonical_citation_locator','request_url','request_host','request_path_and_query','method','allowed_final_hosts','allowed_redirect_edges','redirects_max','accepted_status','accepted_media_types','accepted_content_encodings','request_bytes_max','expanded_bytes_max','retry','cache_key','cache_path','extraction','payload_authority'],'history source record fields ' + record.source_id);
    const accepted = acceptedHistoryById.get(record.source_id);
    check(accepted && record.title === accepted.title && record.kind === accepted.kind && record.canonical_citation_locator === accepted.url, 'history accepted source/citation join drift ' + record.source_id);
    check(record.role_and_claim_limit_sha256 === sha256(Buffer.from(JSON.stringify({title:accepted.title,kind:accepted.kind,supports:accepted.supports,claim_limit:accepted.claim_limit}))), 'history claim-limit identity drift ' + record.source_id);
    const expectedRequest = directHistoryRequests.get(record.source_id) || accepted.url;
    const endpoint = new URL(expectedRequest);
    check(record.request_url === expectedRequest && record.request_host === endpoint.hostname && record.request_path_and_query === endpoint.pathname + endpoint.search && record.method === 'GET', 'history exact direct request drift ' + record.source_id);
    exactArray(record.allowed_final_hosts,[endpoint.hostname],'history final host ' + record.source_id);
    exactArray(record.allowed_redirect_edges,[],'history redirect edges ' + record.source_id);
    check(record.redirects_max === 0 && record.request_bytes_max === 67108864 && record.expanded_bytes_max === 268435456, 'history per-source caps/redirect drift ' + record.source_id);
    exactArray(record.accepted_status,[200],'history response status ' + record.source_id);
    exactArray(record.accepted_media_types,historyBoundary.accepted_media_types,'history response media types ' + record.source_id);
    exactArray(record.accepted_content_encodings,historyBoundary.response_content_encodings,'history response encodings ' + record.source_id);
    deepEqual(record.retry,{runner:'scripts/retry-transient-network.sh',operation:'history-source-' + record.source_id.toLowerCase(),max_attempts:3,request_identity_unchanged:true},'history retry identity ' + record.source_id);
    check(record.extraction.method_by_media['text/html'] === 'standards-parser-visible-main-text-v1' && record.extraction.method_by_media['application/pdf'] === 'pinned-pdf-text-and-page-map-v1' && record.extraction.verbatim_words_max === 25 && record.extraction.excerpt_bytes_max === 4096, 'history extractor/copyright boundary drift ' + record.source_id);
  }
  const extractor = boundaries.offline_workspace.history_source_extractor_toolchain;
  check(extractor?.owner_step === 'establish-functional-offline-workspace-execution-boundary' && extractor.html.parser === 'parse5' && extractor.html.version === '7.3.0', 'history HTML extractor identity drift');
  deepEqual({version:extractor.pdf.version,url:extractor.pdf.snapshot_url,bytes:extractor.pdf.bytes,sha256:extractor.pdf.sha256},{version:'22.12.0-2+deb12u2',url:'https://snapshot.debian.org/archive/debian-security/20260731T202417Z/pool/updates/main/p/poppler/poppler-utils_22.12.0-2+deb12u2_amd64.deb',bytes:191800,sha256:'237d8ae3012bb0b275b681bb7fbd00ee591215e9dc276231d7e4f7bb64efacea'},'history PDF extractor exact package');
  const popplerBootstrap = boundaries.offline_workspace.clean_host_bootstrap.debian_snapshot.direct_packages.filter((record) => record.name === 'poppler-utils');
  check(popplerBootstrap.length === 1, 'history PDF extractor must have one exact Debian bootstrap acquisition root');
  deepEqual(popplerBootstrap[0],{name:'poppler-utils',version:extractor.pdf.version,snapshot_archive:'debian-security',path:'pool/updates/main/p/poppler/poppler-utils_22.12.0-2+deb12u2_amd64.deb',bytes:extractor.pdf.bytes,sha256:extractor.pdf.sha256,role:'validation-only deterministic PDF text/page-map extraction plumbing'},'history PDF extractor/bootstrap acquisition identity join');
  const popplerSnapshotRoot = boundaries.offline_workspace.clean_host_bootstrap.debian_snapshot.url.replace('/archive/debian/','/archive/' + popplerBootstrap[0].snapshot_archive + '/');
  check(extractor.pdf.snapshot_url === popplerSnapshotRoot + popplerBootstrap[0].path, 'history PDF extractor URL is not derived from the exact admitted Debian snapshot package root');
  exactArray(extractor.pdf.argv,['pdftotext','-enc','UTF-8','-eol','unix','-nopgbrk','<input.pdf>','<output.txt>'],'history PDF extractor argv');
  check(extractor.required_fields.includes('poppler_complete_package_graph_sha256') && extractor.required_fields.includes('linked_library_hashes') && extractor.required_fields.includes('license_inventory_sha256') && extractor.required_fields.includes('derived_image_id'), 'history extractor full graph/receipt underbound');
  const historyOwner = queue.steps.find((step) => step.id === extractor.owner_step);
  for (const path of ['configs/functional-history-source-allowlist.json','scripts/run-functional-history-source-evidence.sh','scripts/extract-functional-history-source.mjs','scripts/check-functional-history-source-evidence.mjs','scripts/tests/check-functional-history-source-evidence.test.mjs',extractor.receipt]) check(historyOwner.outputs.includes(path), 'history extractor owner output missing ' + path);
  const historyExtractorTarget = boundaries.offline_workspace.target_registry.find((record) => record.step_id === historyOwner.id && record.target_id === 'history-source-extractors-v1');
  check(historyExtractorTarget?.runtime_image_selector?.receipt === 'artifacts/functional-laptop/execution-boundaries/offline-workspace/receipt.json' && historyExtractorTarget.output_mount === '/output:rw-run-scoped' && historyExtractorTarget.commands.includes('node --test scripts/tests/check-functional-history-source-evidence.test.mjs'), 'history extractor executable offline target drift');
  const historyRunner = historyBoundary.closed_runner_contract;
  check(historyRunner.runtime_selector.receipt === extractor.receipt && historyRunner.runtime_selector.pull === 'never' && historyRunner.mounts.repo === '/workspace:ro' && historyRunner.mounts.extractor_receipt.endsWith(':ro') && historyRunner.mounts.run_output === '/output:rw-run-scoped' && historyRunner.network.extract === 'none' && historyRunner.network.verify === 'none' && historyRunner.docker_socket === 'forbidden inside derived image', 'history runner runtime/mount/network boundary drift');
  exactSet(historyBoundary.chapter_receipt_contract.required_fields,['schema_version','chapter_id','plan_sha256','chapter_run_id','history_extractor_toolchain_receipt_path','history_extractor_toolchain_receipt_sha256','exact_source_ids','source_record_projection_sha256','source_evidence_records','historical_claim_commitment_sha256','total_encoded_bytes','total_expanded_bytes','wall_milliseconds','zero_artifact_payload_bytes','canonical_inventory_sha256','fsync_complete','atomic_rename_complete'],'history chapter receipt fields');
  check(historyBoundary.chapter_receipt_contract.durability.includes('fresh clone') && historyBoundary.chapter_receipt_contract.source_evidence_record_fields.includes('transport_receipt') && historyBoundary.chapter_receipt_contract.source_evidence_record_fields.includes('extraction_transcript') && historyBoundary.chapter_receipt_contract.span_subrecord_fields.includes('copyright_safe_excerpt_utf8') && historyBoundary.chapter_receipt_contract.span_subrecord_fields.includes('body_range_utf8'), 'history canonical embedded evidence durability drift');
  exactArray(historyBoundary.chapter_receipt_contract.allowed_span_roles,['earlier-source-support','later-source-support'],'history exact embedded evidence span roles');
  check(historyBoundary.chapter_receipt_contract.word_count_rule.includes('derived count must equal excerpt_words') && historyBoundary.chapter_receipt_contract.body_range_rule.includes('must equal copyright_safe_excerpt_utf8 byte-for-byte') && historyBoundary.chapter_receipt_contract.attempt_byte_accounting.includes('sum encoded_bytes for every failed and successful attempt') && historyBoundary.chapter_receipt_contract.cache_identity_rule.includes('SHA256(canonical JSON'), 'history derived word/range/retry/cache receipt rules drift');
  for (const chapter of constants.chapters) {
    const step = queue.steps.find((record) => record.id === 'implement-ch' + chapter);
    const command = `scripts/run-functional-history-source-evidence.sh --step ${step.id} --chapter ${chapter} --runtime-receipt ${extractor.receipt}`;
    check(step.inputs.includes(extractor.receipt) && step.outputs.includes(`artifacts/functional-laptop/chapters/${chapter}/history-source-evidence-receipt.json`) && step.validate.filter((entry) => entry.startsWith('scripts/run-functional-history-source-evidence.sh ')).length === 1 && step.validate.includes(command), 'chapter history source runner/input/output drift ' + chapter);
  }
  const generation = boundaries.content_generation;
  deepEqual(generation.successful_context_roles,['canonical-English-author','English-technical-pedagogical-reviewer','English-isolated-surface-reviewer','English-technical-adjudicator','English-isolated-surface-adjudicator','Russian-localizer','Russian-bilingual-reviewer','Russian-target-only-reviewer'],'content generation exact role inventory');
  check(generation.successful_contexts_exact === 8 && generation.aggregate_attempt_limits.contexts_max === 16 && generation.model_policy === 'user-selected-model' && generation.deterministic_packaging_model_policy === 'user-selected-model', 'content generation contexts/model policy drift');
  deepEqual(generation.per_context_limits,{input_bytes_max:2097152,input_tokens_max:200000,output_bytes_max:1048576,output_tokens_max:40000,wall_seconds_max:1800},'content generation per-context limits');
  deepEqual(generation.aggregate_attempt_limits,{contexts_max:16,input_bytes_max:33554432,input_tokens_max:3200000,output_bytes_max:16777216,output_tokens_max:640000,wall_seconds_max:28800},'content generation aggregate limits');
  validateVisualDiagnosticsPolicy(generation);
  const learnerContentSteps = [...constants.chapters.map((chapter) => queue.steps.find((step) => step.id === 'implement-ch' + chapter)),queue.steps.find((step) => step.id === 'reframe-functional-reference-core-surfaces'),queue.conditional_postgresql.selected_steps.find((step) => step.id === 'publish-functional-postgresql-pgvector-advanced-lab')];
  for (const step of learnerContentSteps) {
    const cost = parseCostNotes(step.cost.notes,step.id);
    for (const [field,value] of Object.entries({learner_content_contexts_successful_exact:'8',learner_content_context_attempts_max:'16',learner_content_model_policy:'user-selected-model',learner_content_input_bytes_per_context_max:'2097152',learner_content_input_tokens_per_context_max:'200000',learner_content_output_bytes_per_context_max:'1048576',learner_content_output_tokens_per_context_max:'40000',learner_content_input_bytes_aggregate_max:'33554432',learner_content_output_bytes_aggregate_max:'16777216',learner_content_wall_seconds_aggregate_max:'28800',routine_image_review:'excluded',visual_diagnostics_trigger:'human-report',visual_diagnostics_contexts_max:'1',visual_diagnostics_model_policy:'user-selected-model',visual_diagnostics_input_bytes_max:'16777216',visual_diagnostics_output_bytes_max:'262144',visual_diagnostics_wall_seconds_max:'900'})) check(cost[field] === value, step.id + ' learner-content generation cost drift ' + field);
  }

  const offlineTargets = new Map(boundaries.offline_workspace.target_registry.map((record) => [record.step_id + '\0' + record.target_id, record]));
  const firefoxTargets = new Map(boundaries.firefox.target_registry.map((record) => [record.step_id + '\0' + record.target_id, record]));
  const gpuTargets = new Map(boundaries.gpu.target_registry.map((record) => [record.step_id + '\0' + record.target_id, record]));
  const artifactTargets = new Map(boundaries.artifact_cache.target_registry.map((record) => [record.step_id + '\0' + record.target_id, record]));
  const validationOracleTargets = new Map(boundaries.validation_oracles.target_registry.map((record) => [record.step_id + '\0' + record.target_id, record]));
  for (const [label, map, raw] of [['offline',offlineTargets,boundaries.offline_workspace.target_registry],['Firefox',firefoxTargets,boundaries.firefox.target_registry],['GPU',gpuTargets,boundaries.gpu.target_registry],['artifact',artifactTargets,boundaries.artifact_cache.target_registry],['validation-oracle',validationOracleTargets,boundaries.validation_oracles.target_registry]]) check(map.size === raw.length, label + ' target registry duplicates');

  // These phase-local checks remain explicit even though the composed checker
  // also binds the complete queue/constants bytes. They make the source ->
  // staged run -> publication chronology independently auditable and keep the
  // runtime receipt verifier from relying on an opaque whole-file commitment.
  const tokenizerStep = queue.steps.find((record) => record.id === 'execute-functional-tokenizer-and-tokenized-splits');
  const tokenizerParity = offlineTargets.get('execute-functional-tokenizer-and-tokenized-splits\0gpt2-tokenizer-parity-v1');
  exactArray(tokenizerParity.commands,[
    'python3 scripts/run-functional-gpt2-tokenizer-oracle.py --spec configs/functional-data-pipeline/gpt2-tokenizer-oracle-v1.json --oracle-source /artifacts/gpt2/src/encoder.py --encoder-json /artifacts/gpt2/encodings/main/encoder.json --vocab-bpe /artifacts/gpt2/encodings/main/vocab.bpe --license /artifacts/gpt2/LICENSE --course-bin /artifacts/course-bin/llm-functional-tokenizer-splits --course-binary-manifest /receipts/course-transform.json --output-receipt /output/standalone-imported-tokenizer-oracle-receipt.json',
    'node --test scripts/tests/run-functional-gpt2-tokenizer-oracle.test.mjs',
    'node scripts/check-functional-artifact-cache-receipt.mjs --step execute-functional-tokenizer-and-tokenized-splits --receipt /output/standalone-imported-tokenizer-oracle-receipt.json'
  ],'GPT-2 parity exact Python-oracle command sequence (Cargo forbidden)');
  check(!tokenizerParity.commands.some((command) => /(?:^|\s)cargo(?:\s|$)/.test(command)), 'GPT-2 parity Python/regex image must not invoke Cargo');
  const tokenizerPrerequisitePublisher = artifactTargets.get('execute-functional-tokenizer-and-tokenized-splits\0tokenizer-transform-prerequisite-v1');
  check(tokenizerPrerequisitePublisher.source_runs?.length === 1 && tokenizerPrerequisitePublisher.source_runs[0].run_receipt === '/output/transform-output-inventory-receipt.json', 'tokenizer prerequisite publisher must consume the final after-packaging run/output inventory receipt');
  exactArray(tokenizerStep.validate,[
    'scripts/run-functional-artifact-cache.sh acquire --step execute-functional-tokenizer-and-tokenized-splits --target standalone-gpt2-tokenizer-source-v1',
    'scripts/run-functional-artifact-cache.sh publish --step execute-functional-tokenizer-and-tokenized-splits --target standalone-gpt2-tokenizer-source-v1',
    'scripts/run-functional-artifact-cache.sh verify --step execute-functional-tokenizer-and-tokenized-splits --target standalone-gpt2-tokenizer-source-v1',
    'scripts/run-functional-offline.sh --step execute-functional-tokenizer-and-tokenized-splits --target execute-functional-tokenizer-and-tokenized-splits-v1',
    'scripts/run-functional-artifact-cache.sh publish-generated --step execute-functional-tokenizer-and-tokenized-splits --target tokenizer-transform-prerequisite-v1',
    'scripts/run-functional-artifact-cache.sh verify --step execute-functional-tokenizer-and-tokenized-splits --target tokenizer-transform-prerequisite-v1',
    'scripts/run-functional-offline.sh --step execute-functional-tokenizer-and-tokenized-splits --target gpt2-tokenizer-parity-v1',
    'scripts/run-functional-artifact-cache.sh publish-generated --step execute-functional-tokenizer-and-tokenized-splits --target tokenizer-and-tokenized-splits-v1',
    'scripts/run-functional-artifact-cache.sh verify --step execute-functional-tokenizer-and-tokenized-splits --target tokenizer-and-tokenized-splits-v1',
    'scripts/check-functional-artifact-cache-receipt.mjs --step execute-functional-tokenizer-and-tokenized-splits --receipt artifacts/functional-laptop/data/tokenizer-and-tokenized-splits-v1/standalone-imported-tokenizer-oracle-receipt.json',
    'git diff --check',
    './course audit-host'
  ],'tokenizer transform/package/publish/parity/final-publication chronology');

  const ch56Course = offlineTargets.get('implement-ch56-tensor-artifact-interchange\0ch56-course-interchange-v1');
  deepEqual(ch56Course.input_receipt_mounts,{
    '/receipts/source-a.json:ro':'artifacts/functional-laptop/chapters/56-tensor-artifact-interchange/transformers-source-cache-publication-receipt.json',
    '/receipts/source-b.json:ro':'artifacts/functional-laptop/chapters/56-tensor-artifact-interchange/llama2c-source-cache-publication-receipt.json',
    '/receipts/tokenizer.json:ro':'artifacts/functional-laptop/data/tokenizer-and-tokenized-splits-v1/course-reference-tokenizer-lineage-receipt.json'
  },'Ch56 course importer exact promoted receipt mounts');
  deepEqual(ch56Course.input_cache_mounts,{
    '/artifacts/source-a:ro':'receipt-selected-transformers-source-entry',
    '/artifacts/source-b:ro':'receipt-selected-llama2c-source-entry'
  },'Ch56 course importer exact receipt-selected cache mounts');
  const ch56Publisher = artifactTargets.get('implement-ch56-tensor-artifact-interchange\0ch56-course-fixtures-v1');
  exactArray(ch56Publisher.required_publication_fields,['source_run_receipt_sha256','dth_receipt_sha256','payload_inventory_sha256','cache_entry_sha256','cache_entry_path','canonical_receipt_sha256','fsync_and_atomic_rename'],'Ch56 final fixture publication schema');
  const ch56Tiny = offlineTargets.get('implement-ch56-tensor-artifact-interchange\0ch56-two-dense-fixtures-tiny-ci-v1');
  deepEqual(ch56Tiny.input_receipt_mounts,{
    '/receipts/fixture-a.json:ro':'artifacts/functional-laptop/chapters/56-tensor-artifact-interchange/transformers-final-cache-publication-receipt.json',
    '/receipts/fixture-b.json:ro':'artifacts/functional-laptop/chapters/56-tensor-artifact-interchange/llama2c-final-cache-publication-receipt.json'
  },'Ch56 tiny-CI exact final-publication receipt mounts');
  exactArray(ch56Tiny.runtime_forbidden,['validation-oracle-toolchain','PyTorch','Transformers','llama2.c','Docker-socket'],'Ch56 tiny-CI forbidden runtime inventory');
  const ch56IsaPublisher = artifactTargets.get('implement-ch56-tensor-artifact-interchange\0ch56-independent-dense-fixture-admission-v1');
  exactArray(ch56IsaPublisher.required_publication_fields,['source_run_receipt_sha256','isa_candidate_receipt_sha256','canonical_path','canonical_receipt_sha256','fsync_and_atomic_rename','final_sha256'],'Ch56 final ISA publication schema');

  const baseWorkspaceReceipt = 'artifacts/functional-laptop/execution-boundaries/offline-workspace/receipt.json';
  const dependencyWorkspaceReceipt = boundaries.offline_workspace.supporting_dependency_refresh.receipt;
  const pgWorkspaceReceipt = boundaries.postgresql.workspace_refresh.receipt;
  const dependencyStepPosition = queue.steps.findIndex((step) => step.id === boundaries.offline_workspace.supporting_dependency_refresh.owner_step);
  const baseReceiptFields = ['schema_version','image_id','image_manifest_digest','source_snapshot_sha256','cargo_lock_sha256','site_package_lock_sha256'];
  for (const target of boundaries.offline_workspace.target_registry) {
    if (target.step_id === 'establish-functional-offline-workspace-execution-boundary') {
      check(typeof target.bootstrap_runtime_identity === 'string' && target.bootstrap_runtime_identity.length > 0, target.target_id + ' clean-host/bootstrap runtime identity is implicit');
      continue;
    }
    if (target.target_id === 'gpt2-tokenizer-parity-v1') {
      check(target.runtime_image_selector?.receipt === boundaries.offline_workspace.validation_only_oracle_runtime.receipt, 'GPT-2 parity target must select the exact admitted Python/regex oracle image');
      continue;
    }
    const ordinaryPosition = queue.steps.findIndex((step) => step.id === target.step_id);
    const expectedReceipt = target.step_id === 'admit-functional-postgresql-pgvector-stack'
      ? dependencyWorkspaceReceipt
      : ['implement-functional-postgresql-pgvector-conformance','validate-functional-postgresql-pgvector-recovery'].includes(target.step_id)
        ? pgWorkspaceReceipt
        : ordinaryPosition > dependencyStepPosition || target.step_id === constants.closure_step_id
          ? dependencyWorkspaceReceipt
          : baseWorkspaceReceipt;
    check(target.runtime_image_selector?.receipt === expectedReceipt && Array.isArray(target.input_receipts) && target.input_receipts.includes(expectedReceipt), target.step_id + '/' + target.target_id + ' offline runtime selector/input receipt drift');
    const expectedFields = expectedReceipt === pgWorkspaceReceipt ? boundaries.postgresql.workspace_refresh.required_fields : expectedReceipt === dependencyWorkspaceReceipt ? boundaries.offline_workspace.supporting_dependency_refresh.required_receipt_fields : baseReceiptFields;
    exactArray(target.runtime_selector_required_fields,expectedFields,target.step_id + '/' + target.target_id + ' runtime selector receipt schema');
  }

  const available = new Set([
    'course', 'scripts/check-functional-laptop-llm-plan.mjs', 'scripts/check-course-plan.mjs',
    'scripts/check-rust-dependencies.sh', 'scripts/check-rust-demos.sh',
    '.agents/skills/author-llm-course-english/scripts/english-review.mjs',
    '.agents/skills/localize-llm-course/scripts/localization-review.mjs'
  ]);
  function repoCommandTarget(command) {
    if (command === 'git diff --check' || command === './course audit-host') return null;
    const direct = command.match(/^((?:scripts|audits|\.agents)\/[A-Za-z0-9_.\/-]+(?:\.mjs|\.sh|\.py))\b/);
    return direct?.[1] || null;
  }
  const invoked = { offline: new Set(), firefox: new Set(), gpu: new Set(), artifact: new Set(), postgresql: new Set(), validationOracle: new Set() };
  function expectedFirefoxSelection(record) {
    if (record.phase === 'acquire') return {suite:undefined,selector:undefined,specs:undefined};
    if (record.step_id === 'establish-functional-firefox-execution-boundary') return {suite:'grep',selector:'@chapter:39-end-to-end-llm',specs:['site/tests/e2e/ch39-end-to-end-llm.spec.ts']};
    if (record.step_id === 'reframe-functional-reference-core-surfaces') return {suite:'grep',selector:'@functional-reference-core',specs:['site/tests/e2e/ch00-llm-parts.spec.ts','site/tests/e2e/ch38-cached-generation.spec.ts','site/tests/e2e/ch39-end-to-end-llm.spec.ts']};
    if (record.step_id === 'establish-functional-successor-static-integration') return {suite:'grep',selector:'@functional-shell',specs:['site/tests/e2e/functional-course-shell.spec.ts']};
    if (/^implement-ch\d\d-/.test(record.step_id)) {
      const chapter = record.step_id.replace(/^implement-ch/, '');
      return {suite:'grep',selector:'@chapter:' + chapter,specs:['site/tests/e2e/ch' + chapter + '.spec.ts']};
    }
    if (record.step_id === 'publish-functional-postgresql-pgvector-advanced-lab') return {suite:'grep',selector:'@functional-postgresql-ch85-measured',specs:['site/tests/e2e/ch85-persistence-scale-decision.spec.ts']};
    return {suite:'full',selector:null,specs:['site/tests/e2e/**/*.spec.ts']};
  }
  function assertCommand(step, command, availableNow, selectedBranch = false) {
    check(!/^\.\/course\s+(?:run|check)(?:\s|$)/.test(command), step.id + ' uses network-capable ordinary course execution');
    check(command === 'git diff --check' || command === './course audit-host' || /^(?:scripts|audits)\/[A-Za-z0-9_.\/-]+(?:\.mjs|\.sh)\b/.test(command), step.id + ' invalid host command boundary: ' + command);
    check(!/(<[^>]+>|\bTBD\b|\bmanual\b|review later|\bNN\b)/i.test(command), step.id + ' placeholder command');
    const target = repoCommandTarget(command);
    if (target) check(availableNow.has(target), step.id + ' validation target unavailable at execution order: ' + target);
    let match = command.match(/^scripts\/run-functional-offline\.sh(?: (refresh-lock-cache|bootstrap|bootstrap-oracle|refresh-validation-oracle-cache))? --step ([^ ]+) --target ([^ ]+)$/);
    if (match) {
      check(match[2] === step.id, step.id + ' offline runner step identity drift');
      const key = match[2] + '\0' + match[3];
      const targetRecord = offlineTargets.get(key);
      check(targetRecord, step.id + ' unregistered offline target ' + match[3]);
      if (targetRecord.phase) check(targetRecord.phase === (match[1] || 'run'), step.id + ' offline target phase drift');
      invoked.offline.add(key);
    }
    match = command.match(/^scripts\/run-functional-firefox\.sh (?:acquire|test) --step ([^ ]+) --target ([^ ]+)$/);
    if (match) {
      check(match[1] === step.id, step.id + ' Firefox runner step identity drift');
      const key = match[1] + '\0' + match[2];
      const targetRecord = firefoxTargets.get(key);
      const phase = command.includes(' acquire ') ? 'acquire' : 'test';
      check(targetRecord?.project === 'firefox' && targetRecord.phase === phase, step.id + ' unregistered/phase-drifted or alternate-browser target ' + match[2]);
      if (phase === 'test') {
        const expectedSelection = expectedFirefoxSelection(targetRecord);
        check(targetRecord.suite === expectedSelection.suite && targetRecord.selector === expectedSelection.selector, step.id + ' Firefox target selector/suite drift');
        exactArray(targetRecord.specs, expectedSelection.specs, step.id + ' Firefox target exact spec mapping');
        check(targetRecord.project === 'firefox' && targetRecord.browser_revision === 1532 && targetRecord.runtime_network === 'none', step.id + ' Firefox-only runtime identity drift');
        if (targetRecord.suite === 'full') check(targetRecord.specs[0] === 'site/tests/e2e/**/*.spec.ts', step.id + ' full-suite glob drift');
        else for (const spec of targetRecord.specs) check(availableNow.has(spec) || existsSync(resolve(root, spec)), step.id + ' Firefox spec unavailable by owner order: ' + spec);
      }
      invoked.firefox.add(key + '\0' + phase);
    }
    match = command.match(/^scripts\/run-functional-gpu-profile\.sh (?:run|preflight) --step ([^ ]+) --target ([^ ]+) --profile ([^ ]+)(?: --seeds ([0-9,]+))?$/);
    if (match) {
      check(match[1] === step.id, step.id + ' GPU runner step identity drift');
      const targetRecord = gpuTargets.get(match[1] + '\0' + match[2]);
      check(targetRecord && targetRecord.profile_id === match[3], step.id + ' unregistered GPU target/profile');
      exactArray(match[4] ? match[4].split(',').map(Number) : [], targetRecord.seeds, step.id + ' GPU seeds');
      invoked.gpu.add(match[1] + '\0' + match[2]);
    }
    match = command.match(/^scripts\/run-functional-artifact-cache\.sh ([a-z-]+) --step ([^ ]+) --target ([^ ]+)$/);
    if (match) {
      check(match[2] === step.id, step.id + ' artifact runner step identity drift');
      const key = match[2] + '\0' + match[3];
      const targetRecord = artifactTargets.get(key);
      check(targetRecord?.modes.includes(match[1]), step.id + ' unregistered artifact target/mode');
      invoked.artifact.add(key + '\0' + match[1]);
    }
    match = command.match(/^scripts\/run-functional-validation-oracle\.sh ([A-Za-z0-9_.-]+) --step ([^ ]+) --driver ((?:scripts|audits)\/[A-Za-z0-9_.\/-]+\.py) --spec ((?:configs|audits)\/[A-Za-z0-9_.\/-]+\.json) --output (\/output\/[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)$/);
    if (match) {
      check(match[2] === step.id, step.id + ' validation-oracle runner step identity drift');
      const key = match[2] + '\0' + match[1];
      const targetRecord = validationOracleTargets.get(key);
      check(targetRecord && targetRecord.driver === match[3] && targetRecord.spec === match[4] && targetRecord.output === match[5], step.id + ' unregistered or drifted validation-oracle target');
      check(availableNow.has(match[3]) && availableNow.has(match[4]), step.id + ' validation-oracle driver/spec unavailable at execution order');
      check(targetRecord.runtime_selector?.receipt === boundaries.offline_workspace.supporting_dependency_refresh.validation_oracle_toolchains.admission.receipt && targetRecord.network === 'none' && targetRecord.pull === 'never' && targetRecord.repo_mount === 'none; exact driver/spec/source inputs only' && targetRecord.docker_socket === 'absent' && targetRecord.course_expected_output_access === 'forbidden', step.id + ' validation-oracle runtime/toolchain boundary drift');
      check(targetRecord.driver_mount === `/oracle-driver/${targetRecord.driver.split('/').at(-1)}:ro` && targetRecord.spec_mount === `/oracle-spec/${targetRecord.spec.split('/').at(-1)}:ro` && targetRecord.output_mount === targetRecord.output + ':rw-run-scoped', step.id + ' validation-oracle exact mounts drift');
      check(Array.isArray(targetRecord.input_receipts) && isRecord(targetRecord.input_receipt_mounts) && isRecord(targetRecord.input_cache_mounts), step.id + ' validation-oracle receipt/cache mount contract missing');
      exactSet(Object.values(targetRecord.input_receipt_mounts),targetRecord.input_receipts,step.id + ' validation-oracle exact input receipt mounts');
      check(new Set(Object.values(targetRecord.input_receipt_mounts)).size === targetRecord.input_receipts.length, step.id + ' validation-oracle input receipt mount aliases or omissions');
      for (const [mount,entry] of Object.entries(targetRecord.input_cache_mounts)) check(/^\/artifacts\/[a-z0-9-]+:ro$/.test(mount) && /^entry-selected-by-artifacts\/.+\.json$/.test(entry) && targetRecord.input_receipts.includes(entry.slice('entry-selected-by-'.length)), step.id + ' validation-oracle cache mount lacks an exact input-receipt selector');
      invoked.validationOracle.add(key);
    }
    match = command.match(/^scripts\/run-functional-postgresql-lab\.sh ([a-z-]+) --step ([^ ]+) --target ([^ ]+)$/);
    if (match) {
      check(selectedBranch && constants.conditional_postgresql.selected_steps.includes(step.id) && match[2] === step.id, step.id + ' unauthorized PostgreSQL runner');
      const targetRecord = boundaries.postgresql.target_registry.find((record) => record.step_id === step.id && record.target_id === match[3]);
      check(targetRecord?.phase === match[1], step.id + ' unregistered PostgreSQL phase/target ' + match[1] + '/' + match[3]);
      invoked.postgresql.add(step.id + '\0' + match[3] + '\0' + match[1]);
    }
  }

  const byId = new Map();
  const outputOwners = [];
  const costs = new Map();
  const availableByStep = new Map();
  for (let index = 0; index < queue.steps.length; index += 1) {
    const current = queue.steps[index];
    check(!byId.has(current.id), 'duplicate queue ID ' + current.id);
    exactArray(current.depends_on, [index === 0 ? queue.insert_after : queue.steps[index - 1].id], current.id + '.depends_on');
    check(current.status === 'pending' && Array.isArray(current.runs) && current.runs.length === 0, current.id + ' initial lifecycle drift');
    for (const field of ['objective','inputs','outputs','acceptance','validate']) check(Array.isArray(current[field]) ? current[field].length > 0 : Boolean(current[field]), current.id + ' empty ' + field);
    check(current.cost.class === 'large', current.id + ' queue cost class must be large');
    const tokens = parseCostNotes(current.cost.notes, current.id);
    costs.set(current.id, tokens);
    unique(current.outputs, current.id + '.outputs');
    unique(current.validate, current.id + '.validate');
    const currentAvailable = new Set([...available, ...current.outputs.filter((path) => !path.endsWith('/'))]);
    availableByStep.set(current.id, currentAvailable);
    for (const command of current.validate) assertCommand(current, command, currentAvailable);
    for (const raw of current.outputs) {
      if (!queue.shared_output_exceptions.includes(raw) && !executionCompatibility.replacement_setup.replaces.includes(current.id)) outputOwners.push([safeOutput(raw, current.id + '.output'), current.id]);
      if (!raw.endsWith('/')) available.add(raw);
    }
    const networkAllowed = {
      N3: ['establish-functional-firefox-execution-boundary','acquire-functional-tinystories-raw-pair','execute-functional-tokenizer-and-tokenized-splits','acquire-functional-open-model'],
      N2: ['establish-functional-offline-workspace-execution-boundary','admit-functional-supporting-dependency-graph'],
      N1: ['select-functional-open-model']
    };
    if (tokens.network === 'N3') check(networkAllowed.N3.includes(current.id), current.id + ' unauthorized N3');
    if (tokens.network === 'N2') check(networkAllowed.N2.includes(current.id), current.id + ' unauthorized N2');
    if (tokens.network === 'N1') check(/^implement-ch\d\d-/.test(current.id) || networkAllowed.N1.includes(current.id), current.id + ' unauthorized N1');
    if (tokens.network === 'N0' && /inherited_profile_download_ceiling_bytes=[1-9]/.test(current.cost.notes)) check(tokens.new_artifact_download_authority_bytes === '0', current.id + ' inherits nonzero profile download ceiling without explicit zero new-artifact authority');
    if (tokens.gpu !== 'G0' && current.id !== 'establish-functional-gpu-execution-boundary') check(current.validate.some((command) => command.startsWith('scripts/run-functional-gpu-profile.sh run ')), current.id + ' GPU authority lacks exact closed runner');
    byId.set(current.id, current);
  }

  for (const target of boundaries.gpu.target_registry) {
    const step = byId.get(target.step_id) || (target.step_id === queue.closure_contract.id ? queue.closure_contract : null);
    check(step, 'GPU target owner step missing ' + target.step_id);
    const runOutputRoot = '/run-output/' + target.step_id;
    const seedArgs = target.seeds.length > 0 ? ' --seeds ' + target.seeds.join(',') : '';
    check(Array.isArray(target.input_bindings), target.step_id + ' GPU typed input bindings missing');
    const cacheBindings = [];
    const inputArgs = target.input_bindings.map((binding,index) => {
      exactSet(Object.keys(binding),['receipt','kind'],target.step_id + ' GPU input binding fields');
      check(['receipt_only','cache_backed_payload'].includes(binding.kind), target.step_id + ' GPU input binding kind invalid');
      if (binding.kind === 'cache_backed_payload') cacheBindings.push({...binding,input_index:index});
      return ' --input-receipt /receipts/input-' + index + '.json' + (binding.kind === 'cache_backed_payload' ? ' --input /artifacts/input-' + index : '');
    }).join('');
    let expectedCommand = 'cargo run --release --locked -p llm-from-scratch --bin llm-functional-profile -- --phase-spec /workspace/configs/functional-gpu-execution-targets.json --target ' + target.target_id + ' --profile ' + target.profile_id + seedArgs + inputArgs + ' --output ' + runOutputRoot + '/bundle --receipt ' + runOutputRoot + '/gpu-execution-receipt.json';
    if (target.step_id === 'execute-functional-sft-adaptation' || target.step_id === 'execute-functional-direct-preference-update') expectedCommand += ' --adapter-phase ' + (target.step_id === 'execute-functional-sft-adaptation' ? 'sft' : 'dpo') + ' --workload-contract-sha256-from-phase-spec';
    check(target.closed_command === expectedCommand, target.step_id + ' GPU closed container argv drift');
    check(target.phase_spec === 'configs/functional-gpu-execution-targets.json' && target.phase_spec_owner === 'establish-functional-gpu-execution-boundary' && target.phase_id === target.target_id, target.step_id + ' GPU phase-spec identity drift');
    check(target.candidate_receipt_path === runOutputRoot + '/gpu-execution-receipt.json' && target.candidate_bundle_path === runOutputRoot + '/bundle' && target.output_mount === runOutputRoot + ':rw', target.step_id + ' GPU run-output mapping drift');
    check(target.repo_mount === '/workspace:ro' && target.runtime.network === 'none' && target.runtime.pull === 'never' && target.runtime.read_only === true && target.runtime.cap_drop === 'ALL' && target.runtime.no_new_privileges === true && target.runtime.no_cpu_or_f32_fallback === true, target.step_id + ' GPU runtime boundary drift');
    exactArray(target.input_cache_receipts,cacheBindings.map((binding) => binding.receipt),target.step_id + ' GPU cache-backed receipt inventory');
    exactSet(Object.keys(target.input_receipt_mounts), target.input_bindings.map((_,index) => '/receipts/input-' + index + '.json:ro'), target.step_id + ' GPU receipt mounts');
    exactSet(Object.keys(target.cache_mounts), cacheBindings.map((binding) => '/artifacts/input-' + binding.input_index + ':ro'), target.step_id + ' GPU cache mounts');
    for (let index = 0; index < target.input_bindings.length; index += 1) check(target.input_receipt_mounts['/receipts/input-' + index + '.json:ro'] === target.input_bindings[index].receipt, target.step_id + ' GPU receipt mount mapping drift ' + index);
    for (const binding of cacheBindings) check(target.cache_mounts['/artifacts/input-' + binding.input_index + ':ro'] === 'entry-selected-by-' + binding.receipt, target.step_id + ' GPU receipt-to-cache mount mapping drift ' + binding.input_index);
    check(step.outputs.includes(target.receipt_path), target.step_id + ' GPU canonical receipt is not owned by target step');
    check(target.runner_publication?.source_candidate_receipt === target.candidate_receipt_path && target.runner_publication.source_bundle === target.candidate_bundle_path && target.runner_publication.canonical_receipt === target.receipt_path && target.runner_publication.validator === 'scripts/check-functional-gpu-execution-receipt.mjs' && target.runner_publication.order.includes('atomic rename'), target.step_id + ' GPU candidate validation/atomic publication drift');
    const targetAvailable = availableByStep.get(target.step_id) || (target.step_id === queue.closure_contract.id ? available : null);
    check(targetAvailable?.has(target.runner_publication.validator) && targetAvailable.has(target.phase_spec), target.step_id + ' GPU receipt validator/phase spec unavailable before execution');
    for (const field of ['wall_seconds_max','host_bytes_max','device_bytes_max','disk_bytes_max']) check(Number.isSafeInteger(target.ceilings[field]) && target.ceilings[field] > 0, target.step_id + ' GPU ceiling invalid ' + field);
  }

  for (let left = 0; left < outputOwners.length; left += 1) for (let right = left + 1; right < outputOwners.length; right += 1) {
    const [a, ownerA] = outputOwners[left], [b, ownerB] = outputOwners[right];
    if (ownerA !== ownerB) check(a !== b && !a.startsWith(b + '/') && !b.startsWith(a + '/'), 'base output overlap ' + ownerA + ':' + a + ' / ' + ownerB + ':' + b);
  }

  const position = (id) => queue.steps.findIndex((step) => step.id === id);
  check(position('establish-functional-offline-workspace-execution-boundary') === 0, 'offline boundary must be first');
  check(position('establish-functional-firefox-execution-boundary') === 1, 'Firefox boundary must be second');
  check(position('reframe-functional-reference-core-surfaces') === 2 && position('establish-functional-successor-static-integration') === 3, 'reframe/static boundary placement drift');
  check(position('establish-functional-artifact-cache-execution-boundary') === position('implement-ch41-governed-corpus-acquisition') + 1, 'artifact-cache placement drift');
  check(position('execute-functional-corpus-filtering') === position('implement-ch42-deterministic-corpus-filtering') + 1, 'filter execution placement drift');
  check(position('execute-functional-corpus-dedup-split') === position('implement-ch43-deduplication-decontamination') + 1, 'dedup execution placement drift');
  check(position('execute-functional-tokenizer-and-tokenized-splits') === position('implement-ch44-scalable-bpe-tokenizer') + 1, 'tokenizer execution placement drift');
  check(position('establish-functional-gpu-execution-boundary') === position('implement-ch51-serving-config-admission') + 1, 'GPU boundary placement drift');
  check(position('select-functional-open-model') === position('implement-ch80-from-scratch-laptop-capstone') + 1, 'model selection must follow the independently complete Chapter 80 path');
  check(position('acquire-functional-open-model') === position('select-functional-open-model') + 1, 'selected payload acquisition/admission placement drift');
  check(position('freeze-functional-from-scratch-experiment') === position('implement-ch62-laptop-hardware-admission') + 1, 'from-scratch freeze placement drift');
  check(position('execute-functional-seed-sensitivity-profile') === position('implement-ch64-online-tiled-attention') + 1, 'seed execution placement drift');
  check(position('freeze-functional-adaptation-experiment') === position('acquire-functional-open-model') + 1, 'adaptation freeze must follow exact selected-model integration');
  check(position('execute-functional-sft-adaptation') === position('freeze-functional-adaptation-experiment') + 1 && position('execute-functional-direct-preference-update') === position('execute-functional-sft-adaptation') + 1, 'adaptation execution order drift');
  check(position('implement-ch81-import-adapt-serve-capstone') === position('execute-functional-direct-preference-update') + 1, 'Chapter 81 must follow selected SFT/DPO realization');

  const cpuRank = { C0: 0, C1: 1, C2: 2, C3: 3 }, gpuRank = { G0: 0, G1: 1, G2: 2, G3: 3 }, networkRank = { N0: 0, N1: 1, N2: 2, N3: 3 };
  for (const chapter of constants.chapters) {
    const chapterStep = byId.get('implement-ch' + chapter);
    check(chapterStep, 'missing chapter step ' + chapter);
    const number = chapter.slice(0, 2);
    const exampleSlug = chapter.slice(3).replaceAll('-', '_');
    const componentName = chapter.slice(3).split('-').map((word) => word[0].toUpperCase() + word.slice(1)).join('');
    exactArray(chapterStep.depends_on, constants.chapter_step_dependencies[chapter], chapter + ' dependency projection');
    exactArray(chapterStep.outputs.filter((path) => constants.rust_owners[chapter].includes(path)), constants.rust_owners[chapter], chapter + ' Rust ownership');
    check(chapterStep.inputs.includes('capabilities=' + constants.capability_by_chapter[chapter].join(',')), chapter + ' capability ownership input drift');
    for (const path of [
      'curriculum/chapters/' + chapter + '.md',
      'rust/crates/llm-from-scratch/examples/ch' + number + '_' + exampleSlug + '.rs',
      'rust/crates/llm-from-scratch/examples/expected/ch' + number + '_' + exampleSlug + '.txt',
      'site/src/content/chapters/en/' + chapter + '.mdx', 'site/src/content/chapters/ru/' + chapter + '.mdx',
      'site/src/i18n/functional-catalogs/en/' + chapter + '.json', 'site/src/i18n/functional-catalogs/ru/' + chapter + '.json',
      'site/src/content/cheat-sheets/en/' + chapter + '.json', 'site/src/content/cheat-sheets/ru/' + chapter + '.json',
      'site/tests/e2e/ch' + chapter + '.spec.ts', 'audits/functional-laptop/reviews/' + chapter + '/', 'artifacts/functional-laptop/chapters/' + chapter + '/'
    ]) check(chapterStep.outputs.includes(path), chapter + ' missing vertical output ' + path);
    if (['41-governed-corpus-acquisition','50-dependency-error-contract','56-tensor-artifact-interchange'].includes(chapter)) {
      check(!chapterStep.outputs.includes('site/src/components/chapters/' + componentName + 'Diagram.astro'), chapter + ' not-useful visualization owns a component');
    } else {
      check(chapterStep.outputs.includes('site/src/components/chapters/' + componentName + 'Diagram.astro'), chapter + ' useful visualization component missing');
      check(chapterStep.outputs.includes('site/tests/' + chapter + '-diagram.test.ts'), chapter + ' useful visualization test missing');
    }
    const sourceCommand = 'scripts/run-functional-history-source-evidence.sh --step ' + chapterStep.id + ' --chapter ' + chapter + ' --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json';
    check(chapterStep.validate.includes(sourceCommand), chapter + ' missing exact N1 history evidence invocation');
    const offlineCommand = 'scripts/run-functional-offline.sh --step ' + chapterStep.id + ' --target ' + chapterStep.id + '-v1';
    check(chapterStep.validate.includes(offlineCommand), chapter + ' missing exact offline lifecycle target');
    const browserTarget = 'chapter-' + chapter + '-v1';
    check(chapterStep.validate.includes('scripts/run-functional-firefox.sh test --step ' + chapterStep.id + ' --target ' + browserTarget), chapter + ' missing exact Firefox target');
    const offlineRecord = offlineTargets.get(chapterStep.id + '\0' + chapterStep.id + '-v1');
    check(offlineRecord, chapter + ' missing frozen offline command registry');
    const reviewRoot = 'audits/functional-laptop/reviews/' + chapter;
    for (const required of [
      'node scripts/check-functional-rust-ownership.mjs --chapter ' + chapter,
      'node scripts/check-functional-rust-examples.mjs --chapter ' + chapter,
      'scripts/check-rust-demos.sh',
      'npm --prefix site run check:chapter -- --locale en --chapter ' + chapter,
      'npm --prefix site run check:chapter -- --locale ru --chapter ' + chapter
    ]) check(offlineRecord.commands.includes(required), chapter + ' offline target missing ' + required);
    check(offlineRecord.commands.some((command) => command.startsWith('node .agents/skills/author-llm-course-english/scripts/english-review.mjs verify --spec ' + reviewRoot)), chapter + ' offline target missing exact English verifier');
    check(offlineRecord.commands.some((command) => command.startsWith('node .agents/skills/localize-llm-course/scripts/localization-review.mjs verify --spec ' + reviewRoot)), chapter + ' offline target missing exact localization verifier');
    const own = parseCostNotes(chapterStep.cost.notes, chapterStep.id);
    check(own.cpu === 'C3' && own.network === 'N1', chapter + ' implementation must be C3/N1');
    check(own.source_evidence_download_bytes_max === '134217728' && own.new_artifact_download_authority_bytes === '0' && own.artifact_payload_download_authority_bytes === undefined && own.download_bytes_max === undefined, chapter + ' must separate the bounded source-evidence cap from zero new-artifact authority and any inherited profile ceiling');
    if (own.inherited_profile_download_ceiling_bytes !== undefined) check(/^[1-9][0-9]*$/.test(own.inherited_profile_download_ceiling_bytes), chapter + ' invalid inherited non-authority profile download ceiling');
    const expectedImplementation = { class: 'large', cpu: own.cpu, gpu: own.gpu, network: own.network, paid: own.paid, notes: chapterStep.cost.notes };
    deepEqual(constants.chapter_costs[chapter].implementation_cost, expectedImplementation, chapter + ' implementation cost projection');
    const authority = constants.chapter_costs[chapter].authority_steps;
    check(authority.includes(chapterStep.id), chapter + ' lifecycle omits its chapter step');
    const componentMax = { cpu: 'C0', gpu: 'G0', network: 'N0', paid: 'none' };
    for (const authorityId of authority) {
      const tokens = costs.get(authorityId);
      check(tokens, chapter + ' unknown cost authority ' + authorityId);
      if (cpuRank[tokens.cpu] > cpuRank[componentMax.cpu]) componentMax.cpu = tokens.cpu;
      if (gpuRank[tokens.gpu] > gpuRank[componentMax.gpu]) componentMax.gpu = tokens.gpu;
      if (networkRank[tokens.network] > networkRank[componentMax.network]) componentMax.network = tokens.network;
    }
    deepEqual(constants.chapter_costs[chapter].lifecycle_cost, componentMax, chapter + ' lifecycle componentwise maximum');
  }

  for (const [id, expectedSeeds, profile] of [
    ['execute-functional-seed-sensitivity-profile',[104729,130363,15485863],'8gb-seed-sensitivity'],
    ['execute-functional-from-scratch-pretraining',[39],'8gb-gpu-core'],
    ['execute-functional-sft-adaptation',[41,43,47],'8gb-adapter'],
    ['execute-functional-direct-preference-update',[53,59,61],'8gb-adapter'],
    ['implement-ch81-import-adapt-serve-capstone',[101,103,107,109,127],'8gb-adapter']
  ]) {
    const target = boundaries.gpu.target_registry.find((record) => record.step_id === id);
    check(target?.profile_id === profile, id + ' exact execution profile drift');
    exactArray(target.seeds, expectedSeeds, id + ' seed registry');
    const acceptance = byId.get(id).acceptance.join('\n');
    check(/no [^.\n]{0,80}replacement|no seed may be replaced/.test(acceptance), id + ' lacks no-replacement policy');
    check(acceptance.includes('terminal-selection policy'), id + ' lacks predeclared terminal selection');
  }
  exactArray(boundaries.gpu.accepted_profile_ids,['8gb-gpu-smoke','8gb-gpu-advanced-smoke-v1','8gb-seed-sensitivity','8gb-gpu-core','8gb-adapter'],'GPU boundary exact five profile IDs');
  check(byId.get('establish-functional-gpu-execution-boundary').acceptance.some((line) => line.includes('five exact accepted profile IDs')), 'GPU boundary acceptance still misstates the exact five-profile registry');
  const gpuPreflightReceipt = boundaries.gpu.admission_lifecycle.provisional_receipt;
  const gpuDefinitiveReceipt = boundaries.gpu.admission_lifecycle.definitive_receipt;
  const ch62Position = queue.steps.findIndex((step) => step.id === 'implement-ch62-laptop-hardware-admission');
  const dependencyRefreshReceipt = boundaries.offline_workspace.supporting_dependency_refresh.receipt;
  for (const target of boundaries.gpu.target_registry) {
    const targetPosition = queue.steps.findIndex((step) => step.id === target.step_id);
    const expectedSelector = target.step_id === 'establish-functional-gpu-execution-boundary'
      ? {mode:'emit-provisional',output_receipt:gpuPreflightReceipt}
      : target.step_id === 'implement-ch62-laptop-hardware-admission'
        ? {mode:'consume-provisional-emit-definitive',input_receipt:gpuPreflightReceipt,output_receipt:gpuDefinitiveReceipt}
        : targetPosition > ch62Position || target.step_id === constants.closure_step_id
          ? {mode:'consume-definitive',input_receipt:gpuDefinitiveReceipt}
          : {mode:'consume-provisional',input_receipt:gpuPreflightReceipt};
    deepEqual(target.admission_receipt_selector,expectedSelector,target.step_id + ' GPU provisional/definitive lifecycle selector');
    deepEqual(target.runtime_image_selector,{parent_receipt:dependencyRefreshReceipt,required_parent_sha256_field:'dependency_refresh_receipt_sha256',required_image_fields:['derived_gpu_image_id','derived_gpu_image_manifest_digest','parent_workspace_image_id']},target.step_id + ' GPU immutable derived-image selector');
    for (const field of ['dependency_refresh_receipt_sha256','derived_gpu_image_id','derived_gpu_image_manifest_digest','parent_workspace_image_id','admission_receipt_selector_sha256']) check(target.runner_publication.required_fields.includes(field), target.step_id + ' GPU publication omits exact image/admission binding ' + field);
  }
  const ch61Target = boundaries.gpu.target_registry.find((record) => record.step_id === 'implement-ch61-quantized-gguf-artifacts');
  check(ch61Target?.profile_id === '8gb-gpu-smoke' && ch61Target.admission_receipt_selector.mode === 'consume-provisional' && ch61Target.admission_receipt_selector.input_receipt === gpuPreflightReceipt, 'Chapter 61 must use only provisional 8gb-gpu-smoke');
  const seedWorkload = boundaries.gpu.target_registry.find((record) => record.step_id === 'execute-functional-seed-sensitivity-profile').workload_contract;
  deepEqual({seeds:seedWorkload.seeds,valid_train_tokens_per_seed_exact:seedWorkload.valid_train_tokens_per_seed_exact,valid_train_tokens_aggregate_exact:seedWorkload.valid_train_tokens_aggregate_exact,valid_tokens_per_optimizer_update_exact:seedWorkload.valid_tokens_per_optimizer_update_exact,optimizer_updates_per_seed_exact:seedWorkload.optimizer_updates_per_seed_exact,optimizer_updates_aggregate_exact:seedWorkload.optimizer_updates_aggregate_exact},{seeds:[104729,130363,15485863],valid_train_tokens_per_seed_exact:1000000,valid_train_tokens_aggregate_exact:3000000,valid_tokens_per_optimizer_update_exact:8000,optimizer_updates_per_seed_exact:125,optimizer_updates_aggregate_exact:375},'seed-sensitivity exact divisible workload');
  check(seedWorkload.updates.includes('125 full optimizer updates') && seedWorkload.checkpoints.includes('every 25') && seedWorkload.refusal.includes('partial update'), 'seed-sensitivity optimizer/checkpoint/refusal contract drift');
  const coreWorkload = boundaries.gpu.target_registry.find((record) => record.step_id === 'execute-functional-from-scratch-pretraining').workload_contract;
  deepEqual({seeds:coreWorkload.seeds,valid_train_tokens_exact:coreWorkload.valid_train_tokens_exact,valid_tokens_per_optimizer_update_exact:coreWorkload.valid_tokens_per_optimizer_update_exact,optimizer_updates_exact:coreWorkload.optimizer_updates_exact},{seeds:[39],valid_train_tokens_exact:20000000,valid_tokens_per_optimizer_update_exact:32000,optimizer_updates_exact:625},'core-pretraining exact divisible workload');
  check(coreWorkload.updates.includes('625 full optimizer updates') && coreWorkload.checkpoints.includes('every 25') && coreWorkload.refusal.includes('partial-update'), 'core-pretraining optimizer/checkpoint/refusal contract drift');
  const ch81Workload = boundaries.gpu.target_registry.find((record) => record.step_id === 'implement-ch81-import-adapt-serve-capstone').workload_contract;
  deepEqual({seeds:ch81Workload.seeds,examples_per_seed_min:ch81Workload.examples_per_seed_min,prompts_per_seed_min:ch81Workload.prompts_per_seed_min,input_tokens_per_seed_min:ch81Workload.input_tokens_per_seed_min,generated_tokens_per_seed_min:ch81Workload.generated_tokens_per_seed_min},{seeds:[101,103,107,109,127],examples_per_seed_min:32,prompts_per_seed_min:32,input_tokens_per_seed_min:512,generated_tokens_per_seed_min:256},'Chapter 81 exact nonzero evaluation/serving workload matrix');
  check(ch81Workload.total_attempts_exact.includes('every declared prompt for every seed exactly once') && ch81Workload.replacement.startsWith('none'), 'Chapter 81 all-attempt/no-replacement workload drift');
  const adapterWorkload = boundaries.gpu.adapter_workload_contract;
  deepEqual(adapterWorkload,{
    schema_version:1,
    profile_id:'8gb-adapter',
    N_max:1048576,
    N_max_scope:'combined-selected-adaptation-response-tokens-across-all-seeds-and-both-phases',
    combined_response_tokens_aggregate_exact:983040,
    frozen_spec_receipt:'artifacts/functional-laptop/experiments/adaptation/receipt.json',
    sft:{phase:'sft',seeds:[41,43,47],examples_per_seed_exact:2048,response_tokens_per_example_exact:128,response_tokens_per_seed_exact:262144,response_tokens_aggregate_exact:786432,accumulation_exact:32,optimizer_updates_per_seed_exact:64,optimizer_updates_aggregate_exact:192,minimum_nontrivial_response_tokens_per_seed:262144,throughput_response_tokens_per_second_min:100,calibration_seconds_max:900,projected_execution_seconds_max:7865,projected_total_seconds_max:8765,phase_wall_seconds_max:21600},
    dpo:{phase:'dpo',seeds:[53,59,61],pairs_per_seed_exact:512,chosen_response_tokens_per_pair_exact:64,rejected_response_tokens_per_pair_exact:64,chosen_plus_rejected_response_tokens_per_seed_exact:65536,response_tokens_aggregate_exact:196608,pair_forward_equivalent_response_tokens_aggregate_exact:196608,accumulation_exact:32,optimizer_updates_per_seed_exact:16,optimizer_updates_aggregate_exact:48,minimum_nontrivial_pairs_per_seed:512,throughput_response_tokens_per_second_min:25,calibration_seconds_max:900,projected_execution_seconds_max:7865,projected_total_seconds_max:8765,phase_wall_seconds_max:10800},
    arithmetic:['3*2048*128=786432-sft-response-tokens','3*512*(64+64)=196608-dpo-response-tokens','786432+196608=983040<=1048576','ceil(786432/100)=7865;7865+900=8765<=21600','ceil(196608/25)=7865;7865+900=8765<=10800'],
    refusal:'reject before allocation on inventory/example/pair/token/update/seed/spec/calibration/profile drift; no zero-update, truncated-token, best-seed or phase-budget substitution'
  },'8gb-adapter exact workload and feasibility contract');
  check(adapterWorkload.sft.response_tokens_aggregate_exact + adapterWorkload.dpo.response_tokens_aggregate_exact === adapterWorkload.combined_response_tokens_aggregate_exact && adapterWorkload.combined_response_tokens_aggregate_exact <= adapterWorkload.N_max, '8gb-adapter aggregate response-token arithmetic drift');
  check(adapterWorkload.dpo.response_tokens_aggregate_exact === adapterWorkload.dpo.pair_forward_equivalent_response_tokens_aggregate_exact, 'DPO pair-forward-equivalent response-token identity drift');
  const adapterProfile = constants.profile_records.find((record) => record.profile_id === '8gb-adapter');
  check(adapterProfile?.fields?.N_max === '1048576', '8gb-adapter accepted profile N_max drift');
  const adaptationFreezeStep = byId.get('freeze-functional-adaptation-experiment');
  const adaptationFreezeCost = parseCostNotes(adaptationFreezeStep.cost.notes,adaptationFreezeStep.id);
  deepEqual({sft_response_tokens_aggregate_exact:adaptationFreezeCost.sft_response_tokens_aggregate_exact,dpo_pair_forward_equivalent_tokens_aggregate_exact:adaptationFreezeCost.dpo_pair_forward_equivalent_tokens_aggregate_exact,combined_response_tokens_aggregate_exact:adaptationFreezeCost.combined_response_tokens_aggregate_exact,adapter_n_max:adaptationFreezeCost.adapter_n_max},{sft_response_tokens_aggregate_exact:'786432',dpo_pair_forward_equivalent_tokens_aggregate_exact:'196608',combined_response_tokens_aggregate_exact:'983040',adapter_n_max:'1048576'},'adaptation freeze exact workload cost projection');
  check(adaptationFreezeStep.acceptance.some((line) => line.includes('786,432 aggregate') && line.includes('196,608 aggregate') && line.includes('983,040 response tokens') && line.includes('N_max=1,048,576') && line.includes('pair-forward-equivalent')), 'adaptation freeze exact workload acceptance projection');
  for (const [stepId,phase] of [['execute-functional-sft-adaptation','sft'],['execute-functional-direct-preference-update','dpo']]) {
    const target = boundaries.gpu.target_registry.find((record) => record.step_id === stepId);
    deepEqual(target.adapter_workload_contract,adapterWorkload[phase],stepId + ' exact phase workload contract');
    check(target.adapter_workload_contract_sha256_rule === 'sha256(canonical JSON of execution_boundary_records.gpu.adapter_workload_contract.' + phase + ')', stepId + ' workload hash rule drift');
    for (const field of ['adapter_workload_contract_sha256','response_token_inventory_sha256','per_seed_and_aggregate_example_or_pair_token_update_counts','workload_projection_and_refusal']) check(target.runner_publication.required_fields.includes(field), stepId + ' receipt omits workload binding ' + field);
    const cost = parseCostNotes(byId.get(stepId).cost.notes,stepId);
    const expectedAggregate = phase === 'sft' ? '786432' : '196608';
    const expectedPerSeed = phase === 'sft' ? '262144' : '65536';
    const expectedCount = phase === 'sft' ? '2048' : '512';
    const expectedUpdates = phase === 'sft' ? '64' : '16';
    check(cost.response_tokens_aggregate_exact === expectedAggregate && cost.response_tokens_per_seed_exact === expectedPerSeed && cost.example_or_pair_count_per_seed_exact === expectedCount && cost.optimizer_updates_per_seed_exact === expectedUpdates, stepId + ' cost/workload contract drift');
  }
  check(constants.chapter_resource_profiles['61-quantized-gguf-artifacts'].some((record) => record.profile_id === '8gb-adapter' && record.mode === 'plans-phase-budget-only'), 'Chapter 61 adapter profile must be plan-only');

  let adapterTotal = 0;
  for (const [id, seconds] of Object.entries(constants.adapter_phase_seconds)) if (id !== 'total') {
    const notes = byId.get(id).cost.notes;
    if (id === 'implement-ch61-quantized-gguf-artifacts') check(notes.includes('fixture_quantization_wall_seconds_max=' + seconds), id + ' fixture quantization phase seconds drift');
    else check(notes.includes('adapter_phase_wall_seconds_max=' + seconds), id + ' adapter phase seconds drift');
    if (id !== 'implement-ch61-quantized-gguf-artifacts') for (const token of ['host_bytes_max=12884901888','device_bytes_max=6710886400','disk_bytes_max=21474836480']) check(notes.includes(token), id + ' adapter ceiling drift ' + token);
    adapterTotal += seconds;
  }
  check(adapterTotal === 43200 && adapterTotal === constants.adapter_phase_seconds.total, 'adapter lifecycle must total exactly 43200 seconds');
  check(byId.get('acquire-functional-tinystories-raw-pair').inputs.some((input) => input.includes('CDLA-Sharing-1.0')), 'TinyStories license drift');
  const tinyStoriesStepCost = parseCostNotes(byId.get('acquire-functional-tinystories-raw-pair').cost.notes, 'TinyStories acquisition');
  check(tinyStoriesStepCost.download_bytes_exact === '1943728838' && tinyStoriesStepCost.download_bytes_max === '2000000000' && tinyStoriesStepCost.host_bytes_max === '4294967296' && tinyStoriesStepCost.disk_bytes_max === '8000000000' && tinyStoriesStepCost.wall_seconds_max === '14400', 'TinyStories raw pair machine resource/size authority drift');
  const tinyStoriesTarget = boundaries.artifact_cache.target_registry.find((record) => record.step_id === 'acquire-functional-tinystories-raw-pair');
  check(tinyStoriesTarget.accepted_sources.reduce((sum,source) => sum + source.bytes,0) === 1943728838 && tinyStoriesTarget.transport_contract.request_count_exact === 2 && tinyStoriesTarget.transport_contract.attempts_per_file_max === 3 && tinyStoriesTarget.transport_contract.redirects_per_file_max === 5, 'TinyStories exact sources/transport contract drift');
  const tinyStoriesStep = byId.get('acquire-functional-tinystories-raw-pair');
  const tinyStoriesOrder = [
    'scripts/run-functional-artifact-cache.sh acquire --step acquire-functional-tinystories-raw-pair --target acquire-functional-tinystories-raw-pair-v1',
    'scripts/run-functional-artifact-cache.sh publish --step acquire-functional-tinystories-raw-pair --target acquire-functional-tinystories-raw-pair-v1',
    'scripts/run-functional-artifact-cache.sh verify --step acquire-functional-tinystories-raw-pair --target acquire-functional-tinystories-raw-pair-v1',
    'scripts/run-functional-offline.sh --step acquire-functional-tinystories-raw-pair --target acquire-functional-tinystories-raw-pair-v1'
  ];
  exactArray(tinyStoriesStep.validate.slice(0,tinyStoriesOrder.length),tinyStoriesOrder,'TinyStories acquire/publish/verify/offline-replay chronology');
  check(!tinyStoriesStep.outputs.includes('artifacts/functional-laptop/acquisition/tinystories/offline-replay.json'), 'TinyStories retains an orphan canonical offline-replay output');
  const tinyStoriesOffline = boundaries.offline_workspace.target_registry.find((record) => record.step_id === tinyStoriesStep.id && record.target_id === tinyStoriesTarget.target_id);
  const tinyStoriesReceipt = 'artifacts/functional-laptop/acquisition/tinystories/receipt.json';
  exactArray(tinyStoriesOffline.input_receipts,[tinyStoriesOffline.runtime_image_selector.receipt,tinyStoriesReceipt],'TinyStories offline replay exact runtime/payload receipts');
  deepEqual(tinyStoriesOffline.input_receipt_mounts,{'/receipts/runtime.json:ro':tinyStoriesOffline.runtime_image_selector.receipt,'/receipts/tinystories.json:ro':tinyStoriesReceipt},'TinyStories offline replay exact receipt mounts');
  deepEqual(tinyStoriesOffline.input_cache_mounts,{'/artifacts/tinystories:ro':'entry-selected-by-' + tinyStoriesReceipt},'TinyStories offline replay exact receipt-selected cache mount');
  check(tinyStoriesOffline.network === 'none' && tinyStoriesOffline.commands.includes('node scripts/check-functional-acquisition.mjs --dataset tinystories --receipt /receipts/tinystories.json --payload /artifacts/tinystories') && tinyStoriesOffline.commands.includes('scripts/check-functional-artifact-cache.sh tinystories --receipt /receipts/tinystories.json --payload /artifacts/tinystories') && tinyStoriesOffline.commands.includes('scripts/check-functional-offline-replay.sh tinystories --receipt /receipts/tinystories.json --payload /artifacts/tinystories'), 'TinyStories offline replay cache/receipt argv or network closure drift');

  const modelRegistry = constants.open_model_candidate_registry;
  check(modelRegistry.acquisition_authority === 'zero-until-selection-gates-pass' && modelRegistry.authority === 'embedded-exact-seed-identities-and-exact-consumed-metadata-where-present; every disposition is provisional and runtime-derived evidence is mandatory', 'open-model registry provisional seed/evidence authority drift');
  check(modelRegistry.candidates.length === 13, 'open-model seed registry cardinality drift');
  unique(modelRegistry.candidates.map((record) => record.candidate_id + '\0' + record.immutable_revision),'open-model seed identities');
  for (const record of modelRegistry.candidates) {
    check(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(record.candidate_id) && /^[0-9a-f]{40}$/.test(record.immutable_revision) && record.seed_role === 'discovery-seed-only' && record.runtime_evidence_required === true && record.preauthored_disposition_authority === 'none' && record.selected === false && record.weight_download_authority_bytes === 0, 'open-model seed row silently claims selection/evidence/payload authority ' + record.candidate_id);
    check(Array.isArray(record.consumed_metadata), 'open-model seed consumed-metadata inventory missing ' + record.candidate_id);
    if (record.consumed_metadata.length === 0) check(record.evidence_status === 'provisional-identity-only; no evidence-backed disposition' && record.disposition === 'provisional-unverified-runtime-evidence-required' && !Object.hasOwn(record,'missing_gates') && !Object.hasOwn(record,'parameter_count') && !Object.hasOwn(record,'architecture'), 'identity-only seed retains a preauthored rejection/admission claim ' + record.candidate_id);
    else {
      check(record.evidence_status === 'embedded-partial-exact-metadata-identities; runtime refresh mandatory', 'partially embedded seed overstates evidence authority ' + record.candidate_id);
      for (const item of record.consumed_metadata) {
        check(typeof item.path === 'string' && /^[A-Za-z0-9._/-]+$/.test(item.path) && !item.path.includes('..') && /^[0-9a-f]{64}$/.test(item.sha256), 'open-model seed metadata identity invalid ' + record.candidate_id);
        const complete = Object.hasOwn(item,'revision') || Object.hasOwn(item,'bytes');
        exactSet(Object.keys(item),complete ? ['path','revision','bytes','sha256'] : ['path','sha256'],'open-model seed metadata record shape ' + record.candidate_id + '/' + item.path);
        if (complete) check(/^[0-9a-f]{40}$/.test(item.revision) && Number.isSafeInteger(item.bytes) && item.bytes >= 0, 'open-model seed complete metadata identity invalid ' + record.candidate_id + '/' + item.path);
      }
    }
  }
  const selectionArtifactTarget = boundaries.artifact_cache.target_registry.find((record) => record.step_id === 'select-functional-open-model');
  check(selectionArtifactTarget?.weight_payload_download_authority_bytes === 0 && selectionArtifactTarget.total_download_bytes_max === 201326592 && selectionArtifactTarget.total_expanded_bytes_max === 402653184, 'model metadata target cap/zero-payload authority drift');
  const admissionProtocol = selectionArtifactTarget.candidate_admission_protocol;
  check(admissionProtocol?.protocol_id === 'bounded-official-causal-model-metadata-admission-v1' && admissionProtocol.weight_payload_download_authority_bytes === 0 && admissionProtocol.request_limits.requests_max === 500 && admissionProtocol.request_limits.response_bytes_max === 4194304 && admissionProtocol.request_limits.total_download_bytes_max === 201326592 && admissionProtocol.request_limits.total_expanded_bytes_max === 402653184 && admissionProtocol.request_limits.wall_seconds_max === 3600, 'bounded phased new-candidate admission protocol drift');
  exactArray(admissionProtocol.allowed_hosts, ['huggingface.co','api.github.com','raw.githubusercontent.com'], 'model admission official hosts');
  check(admissionProtocol.discovery_queries.length === 5 && admissionProtocol.discovery_queries.every((url) => url.startsWith('https://huggingface.co/api/models?') && url.includes('pipeline_tag=text-generation') && url.includes('library=transformers')), 'model admission query boundary drift');
  const githubPolicy = admissionProtocol.github_source_policy;
  exactArray(githubPolicy.api_templates, ['https://api.github.com/repos/<owner>/<repo>/git/commits/<commit>','https://api.github.com/repos/<owner>/<repo>/git/trees/<tree_sha>?recursive=1'], 'model admission exact GitHub API templates');
  check(githubPolicy.raw_template === 'https://raw.githubusercontent.com/<owner>/<repo>/<commit>/<allowlisted_path>' && githubPolicy.identity_derivation.includes('accepts no caller URL') && githubPolicy.path_policy.includes('no traversal, symlink, submodule, archive, release asset or executable fetch'), 'model admission GitHub identity/path derivation underbound');
  check(githubPolicy.files_per_candidate_max === 32 && githubPolicy.bytes_per_file_max === 2097152 && githubPolicy.authorization.startsWith('unauthenticated public metadata only'), 'model admission GitHub file/auth caps drift');
  check(admissionProtocol.selection_receipt_contract?.path === admissionProtocol.admission_receipt && admissionProtocol.selection_receipt_contract.payload_bytes_downloaded === 0 && admissionProtocol.selection_receipt_contract.disposition === 'provisionally-selected-for-acquisition' && admissionProtocol.selection_receipt_contract.n1_boundary.includes('must not claim observed tensor'), 'model provisional N1 selection receipt contract drift');
  check(admissionProtocol.attempt_root === 'artifacts/functional-laptop/model-selection/attempts' && admissionProtocol.raw_response_publication_contract.root === 'artifacts/functional-laptop/model-selection/attempts/<run-id>/metadata/raw-responses' && admissionProtocol.raw_response_publication_contract.publication_receipt === 'artifacts/functional-laptop/model-selection/attempts/<run-id>/metadata/metadata-publication-receipt.json' && admissionProtocol.evidence_admission_contract.required_semantic_gates.length === 7 && admissionProtocol.machine_derivation_contract.derivation_version === 'hf-llama-config-tokenizer-machine-gates-v1' && admissionProtocol.selection_publication_contract.path === 'artifacts/functional-laptop/model-selection/attempts/<run-id>/semantic/selection-publication-receipt.json' && admissionProtocol.technical_resource_block_contract.path === 'artifacts/functional-laptop/model-selection/attempts/<run-id>/technical-resource-block-receipt.json', 'model admission immutable metadata/semantic/technical publication contracts underbound');
  deepEqual(admissionProtocol.fetch_phase_contract.phases.map((phase) => ({id:phase.id,candidate_input_max:phase.candidate_input_max,requests_max:phase.requests_max,download_bytes_max:phase.download_bytes_max})),[{id:'discovery-api-config',candidate_input_max:45,requests_max:140,download_bytes_max:50331648},{id:'tokenizer-machine',candidate_input_max:8,requests_max:40,download_bytes_max:50331648},{id:'semantic-primary-evidence',candidate_input_max:4,requests_max:320,download_bytes_max:100663296}],'model selection exact phased candidate/request/byte ceilings');
  deepEqual(admissionProtocol.fetch_phase_contract.aggregate,{requests_max:500,download_bytes_max:201326592,expanded_bytes_max:402653184,wall_seconds_max:3600},'model selection phased aggregate caps');
  exactArray(admissionProtocol.technical_resource_block_contract.failure_kinds,['transport-failure','truncated-git-tree','ambiguous-source-locator','phase-survivor-overflow','request-cap-exhausted','download-byte-cap-exhausted','expanded-byte-cap-exhausted','wall-cap-exhausted','incomplete-required-evidence'],'model selection technical resource-block kinds');
  exactArray(admissionProtocol.selection_decision_contract.dispositions,['technical-resource-blocked','blocked-no-admissible-candidate','blocked-multiple-admissible-candidates','provisionally-selected-for-acquisition'],'model selection total decision dispositions');
  exactArray(admissionProtocol.hf_metadata_file_allowlist, ['README.md','LICENSE','LICENSE.md','LICENSE.txt','NOTICE','NOTICE.md','config.json','tokenizer.json','tokenizer_config.json','special_tokens_map.json','generation_config.json','meta.json','checkpoints/best/meta.json'], 'model admission exact Hugging Face metadata path allowlist');
  exactArray(admissionProtocol.run_fingerprint_contract.required_keys, ['seed_registry_sha256','admission_protocol_sha256','query_inventory_sha256','allowlist_sha256','accepted_resource_contract_sha256','stable_external_content_inventory_sha256','raw_response_inventory_merkle_sha256','candidate_discovery_manifest_sha256','admission_receipt_sha256_or_absent'], 'model admission stable external-content run fingerprint contract');
  exactArray(selectionArtifactTarget.allowed_media_types, ['application/json','application/vnd.github+json','text/plain','text/markdown','application/octet-stream'], 'model selection media-type union');
  exactSet(selectionArtifactTarget.endpoint_allowlist, [...selectionArtifactTarget.static_seed_endpoints,...admissionProtocol.discovery_queries], 'model selection exact static/discovery endpoint authority');
  exactArray(admissionProtocol.static_seed_endpoints, selectionArtifactTarget.static_seed_endpoints, 'model selection admission protocol seed endpoints');
  deepEqual(admissionProtocol.network_phase_contract, selectionArtifactTarget.network_phase_contract, 'model selection admission protocol phase contract projection');
  exactArray(selectionArtifactTarget.modes, ['metadata','route-judgments','publish-generated','verify'], 'model selection metadata/judgment/semantic publication phases');
  deepEqual(selectionArtifactTarget.network_by_mode, {metadata:'declared-N1-exact-phased-official-metadata-only','route-judgments':'exact-three-context-model-routing-only-no-web-or-payload-authority','publish-generated':'none',verify:'none'}, 'model selection phase network/model-routing authority');
  deepEqual(selectionArtifactTarget.network_phase_contract.common, {redirects_per_request_max:3,response_bytes_max:4194304,total_download_bytes_max:201326592,total_expanded_bytes_max:402653184,wall_seconds_max:3600,weight_payload_download_authority_bytes:0}, 'model selection shared network caps');
  exactArray(selectionArtifactTarget.network_phase_contract.candidate_github.hosts, ['api.github.com','raw.githubusercontent.com'], 'model selection derived GitHub hosts');
  check(admissionProtocol.required_candidate_fields.length >= 15 && admissionProtocol.required_candidate_fields.includes('retained_license_text_path_sha256_and_scope') && admissionProtocol.required_candidate_fields.includes('source_to_weight_binding'), 'model admission receipt schema underbound');
  check(selectionArtifactTarget.judgment_phase.runner === 'scripts/run-functional-model-selection-judgments.mjs' && selectionArtifactTarget.judgment_phase.contexts_exact === 3 && selectionArtifactTarget.judgment_phase.calls_exact === 3 && selectionArtifactTarget.judgment_phase.web_network === 'none' && selectionArtifactTarget.judgment_phase.payload_network === 'none', 'model selection exact external three-context judgment routing boundary drift');
  exactArray(byId.get('select-functional-open-model').validate, ['scripts/run-functional-artifact-cache.sh metadata --step select-functional-open-model --target select-functional-open-model-v1','scripts/run-functional-artifact-cache.sh route-judgments --step select-functional-open-model --target select-functional-open-model-v1','scripts/run-functional-offline.sh --step select-functional-open-model --target select-functional-open-model-v1','scripts/run-functional-artifact-cache.sh publish-generated --step select-functional-open-model --target select-functional-open-model-v1','scripts/run-functional-artifact-cache.sh verify --step select-functional-open-model --target select-functional-open-model-v1','git diff --check','./course audit-host'], 'model selection metadata-before-judgments-before-semantic-before-publication order');
  const selectCost = parseCostNotes(byId.get('select-functional-open-model').cost.notes, 'select-functional-open-model');
  check(selectCost.metadata_download_bytes_max === '201326592' && selectCost.metadata_expanded_bytes_max === '402653184' && selectCost.metadata_requests_max === '500' && selectCost.semantic_judgment_contexts_exact === '3' && selectCost.semantic_judgment_calls_exact === '3' && selectCost.semantic_judgment_input_bytes_per_call_max === '2097152' && selectCost.semantic_judgment_output_bytes_per_call_max === '1048576' && selectCost.weight_payload_download_authority_bytes === '0', 'model selection phased N1/judgment/zero-weight authority drift');

  const closureProjection = constants.capability_closure_projection;
  exactSet(Object.keys(closureProjection), ['CAP-DTH-TOK-02','CAP-DTH-ART-01','CAP-ISA-ART-002','CAP-ISA-ART-003','CAP-ISA-PT-001','CAP-ISA-PT-002','CAP-ISA-PT-003','CAP-ISA-SRV-009','CAP-ISA-ATT-005','CAP-DTH-EVAL-02','CAP-ISA-ENDPOINT-001'], 'typed implementation/integration capability closure projection');
  const queuePosition = new Map(queue.steps.map((step, index) => [step.id,index]));
  const outputContains = (step, receipt) => step.outputs.some((output) => receipt === output.replace(/\/$/, '') || receipt.startsWith(output.replace(/\/$/, '') + '/'));
  for (const [capabilityId, projection] of Object.entries(closureProjection)) {
    check(constants.capability_by_chapter[projection.primary_chapter]?.includes(capabilityId), capabilityId + ' primary chapter does not own the capability');
    const primary = byId.get('implement-ch' + projection.primary_chapter);
    check(primary && outputContains(primary, projection.implementation_receipt), capabilityId + ' primary checkpoint lacks its typed implementation receipt');
    check(Array.isArray(projection.integration_receipts) && projection.integration_receipts.length > 0, capabilityId + ' has no ordered integration receipt');
    exactArray(projection.integration_receipts.map((record) => record.order), projection.integration_receipts.map((_, index) => index + 1), capabilityId + ' integration receipt order');
    for (const record of projection.integration_receipts) {
      check(isRecord(record) && typeof record.role === 'string' && record.role.trim() && typeof record.receipt === 'string' && typeof record.capability_envelope === 'string' && record.capability_envelope === record.receipt.replace(/\.json$/, '-capability-integration-envelope.json') && record.capability_envelope !== record.receipt && typeof record.producer_step === 'string' && typeof record.required_before === 'string', capabilityId + ' malformed typed receipt/capability envelope');
      const producer = byId.get(record.producer_step);
      check(producer && outputContains(producer, record.receipt) && outputContains(producer,record.capability_envelope), capabilityId + ' typed receipt/envelope is not owned by its producer ' + record.producer_step);
      const requiredStep = record.required_before.split(':')[0];
      check(queuePosition.has(requiredStep), capabilityId + ' unknown integration consumer ' + record.required_before);
      check(queuePosition.get(record.producer_step) <= queuePosition.get(requiredStep), capabilityId + ' integration receipt is produced after its required consumer');
    }
  }
  const expectedImplementationContracts = new Map();
  const expectedIntegrationContracts = new Map();
  const addOnce = (array,value) => { if (!array.includes(value)) array.push(value); };
  for (const [capabilityId, projection] of Object.entries(closureProjection)) {
    const implementation = expectedImplementationContracts.get(projection.implementation_receipt) || {path:projection.implementation_receipt,producer_step:'implement-ch' + projection.primary_chapter,capability_ids:[]};
    addOnce(implementation.capability_ids,capabilityId);
    expectedImplementationContracts.set(implementation.path,implementation);
    let previous = projection.implementation_receipt;
    for (const receipt of projection.integration_receipts) {
      const integration = expectedIntegrationContracts.get(receipt.capability_envelope) || {path:receipt.capability_envelope,typed_receipt:receipt.receipt,producer_step:receipt.producer_step,capability_ids:[],role_ids:[],implementation_receipts:[],prerequisite_receipts:[],required_gates:[],required_before:[]};
      addOnce(integration.capability_ids,capabilityId); addOnce(integration.role_ids,receipt.role); addOnce(integration.implementation_receipts,projection.implementation_receipt); addOnce(integration.prerequisite_receipts,previous);
      for (const gate of receipt.required_gates || []) addOnce(integration.required_gates,gate);
      addOnce(integration.required_gates,'receipt-role-realized'); addOnce(integration.required_before,receipt.required_before);
      expectedIntegrationContracts.set(integration.path,integration); previous = receipt.capability_envelope;
    }
  }
  deepEqual(constants.capability_receipt_protocol.implementation_contracts,[...expectedImplementationContracts.values()],'derived capability implementation receipt contracts');
  deepEqual(constants.capability_receipt_protocol.integration_contracts,[...expectedIntegrationContracts.values()],'derived capability integration receipt contracts');
  exactArray(closureProjection['CAP-ISA-PT-002'].integration_receipts[0].required_gates, ['schema-base-config-tokenizer-targets-rank-alpha-dtype-hashes','wrong-identity-refused-before-mutation','fp32-merged-vs-unmerged-max-abs-le-1e-6','unmerge-restores-exact-base-bits','quantized-merge-refused','mixed-request-adapter-isolation'], 'selected SFT adapter realization gates');
  const acquireTarget = boundaries.artifact_cache.target_registry.find((record) => record.step_id === 'acquire-functional-open-model' && record.target_id === 'acquire-functional-open-model-v1');
  exactArray(acquireTarget.integration_capabilities, ['CAP-DTH-TOK-02','CAP-DTH-ART-01','CAP-ISA-ART-002','CAP-ISA-ART-003'], 'selected payload integration capability identities');
  exactArray(acquireTarget.input_receipts,['artifacts/functional-laptop/model-selection/receipt.json'],'selected N3 provisional-selection input');
  deepEqual(acquireTarget.input_bindings,[{receipt:'artifacts/functional-laptop/model-selection/receipt.json',kind:'cache_backed_payload',payload_role:'immutable-selected-metadata'}],'selected N3 typed immutable-metadata input binding');
  deepEqual(acquireTarget.input_cache_mounts,{'/artifacts/selected-metadata:ro':'entry-selected-by-artifacts/functional-laptop/model-selection/receipt.json'},'selected N3 immutable metadata cache mount');
  check(acquireTarget.output_receipt === 'artifacts/functional-laptop/acquisition/open-model/payload-acquisition-receipt.json' && acquireTarget.output_manifest === acquireTarget.transport_contract.payload_output_manifest && acquireTarget.output_manifest === 'artifacts/functional-laptop/acquisition/open-model/payload-output-manifest.json' && acquireTarget.physical_tensor_admission.header_length.includes('first 8 bytes') && acquireTarget.physical_tensor_admission.offsets.includes('sort tensor records by (data_offset_start,data_offset_end,normalized_name)') && acquireTarget.physical_tensor_admission.refusal.includes('before tensor allocation') && acquireTarget.physical_tensor_admission.required_fields.includes('tensor_names_shapes_dtypes_offsets') && acquireTarget.transport_contract.publish_rule.includes('No repository scan, re-fetch, fallback, conversion or tensor allocation'), 'selected N3 transport/output-manifest/preallocation SafeTensors admission contract underbound');
  const acquireStepRecord = byId.get('acquire-functional-open-model');
  check(acquireStepRecord.outputs.includes(acquireTarget.output_manifest) && !acquireStepRecord.outputs.includes('artifacts/functional-laptop/acquisition/open-model/manifest.json') && !acquireStepRecord.outputs.includes('artifacts/functional-laptop/acquisition/open-model/offline-import-preflight.json'), 'selected N3 step owns a stale or unvalidated manifest/preflight output');
  const physicalTarget = boundaries.offline_workspace.target_registry.find((record) => record.step_id === 'acquire-functional-open-model' && record.target_id === 'acquire-functional-open-model-physical-admission-v1');
  check(physicalTarget?.network === 'none' && physicalTarget.output_mount === '/output:rw-run-scoped' && physicalTarget.output_run_receipt === '/output/definitive-admission-receipt.json' && physicalTarget.commands[1].includes('--payload /artifacts/selected-payload --output /output --receipt /output/definitive-admission-receipt.json'), 'selected N3 physical admission closed target/mount/output drift');
  deepEqual(physicalTarget.input_receipt_mounts,{'/receipts/payload-transport.json:ro':'artifacts/functional-laptop/acquisition/open-model/payload-acquisition-receipt.json','/receipts/selection.json:ro':'artifacts/functional-laptop/model-selection/receipt.json','/receipts/runtime.json:ro':boundaries.offline_workspace.supporting_dependency_refresh.receipt},'selected N3 physical admission exact receipt mounts');
  deepEqual(physicalTarget.input_cache_mounts,{'/artifacts/selected-payload:ro':'entry-selected-by-artifacts/functional-laptop/acquisition/open-model/payload-acquisition-receipt.json'},'selected N3 physical admission exact payload mount');
  const admissionTarget = boundaries.artifact_cache.target_registry.find((record) => record.step_id === 'acquire-functional-open-model' && record.target_id === 'acquire-functional-open-model-admission-v1');
  check(admissionTarget?.source_run?.target_id === physicalTarget.target_id && admissionTarget.source_run.receipt === physicalTarget.output_run_receipt && admissionTarget.source_run.output_directory === '/output', 'selected definitive admission publisher does not consume the exact physical-admission run');
  exactArray(admissionTarget.output_receipts,['artifacts/functional-laptop/acquisition/open-model/physical-admission-parser-execution-receipt.json','artifacts/functional-laptop/acquisition/open-model/receipt.json'],'selected definitive admission parser/transcript receipt publication');
  const selectedOracleTargets = boundaries.validation_oracles.target_registry.filter((record) => record.step_id === 'acquire-functional-open-model');
  exactArray(selectedOracleTargets.map((record) => record.target_id),['selected-tokenizer-oracle-v1','selected-dense-logit-oracle-v1'],'selected independent validation-oracle target order');
  for (const target of selectedOracleTargets) check(target.network === 'none' && target.pull === 'never' && target.course_expected_output_access === 'forbidden' && target.runtime_selector.receipt === boundaries.offline_workspace.supporting_dependency_refresh.validation_oracle_toolchains.admission.receipt && target.runtime_selector.image_id_field === 'transformers_torch_image_id' && target.runtime_selector.image_manifest_digest_field === 'transformers_torch_image_manifest_digest' && target.input_receipts.includes('artifacts/functional-laptop/acquisition/open-model/receipt.json') && target.input_cache_mounts['/artifacts/selected-payload:ro'] === 'entry-selected-by-artifacts/functional-laptop/acquisition/open-model/receipt.json', 'selected independent source-oracle isolation/runtime/admission/cache contract drift ' + target.target_id);
  const oraclePublishTarget = boundaries.artifact_cache.target_registry.find((record) => record.step_id === 'acquire-functional-open-model' && record.target_id === 'acquire-functional-open-model-oracles-v1');
  exactArray(oraclePublishTarget.source_runs.map((record) => record.target_id),selectedOracleTargets.map((record) => record.target_id),'selected source-oracle run/publication order');
  exactArray(oraclePublishTarget.output_receipts,['artifacts/functional-laptop/acquisition/open-model/selected-tokenizer-source-oracle-receipt.json','artifacts/functional-laptop/acquisition/open-model/selected-tokenizer-source-execution-log.json','artifacts/functional-laptop/acquisition/open-model/selected-tokenizer-source-output-manifest.json','artifacts/functional-laptop/acquisition/open-model/selected-dense-source-logits-receipt.json','artifacts/functional-laptop/acquisition/open-model/selected-dense-source-execution-log.json','artifacts/functional-laptop/acquisition/open-model/selected-dense-source-output-manifest.json','artifacts/functional-laptop/acquisition/open-model/selected-oracles-cache-publication-receipt.json'],'selected source-oracle exact typed receipts/log/manifests/publication outputs');
  check(oraclePublishTarget.source_receipt_common_fields.includes('source_target_id') && oraclePublishTarget.source_receipt_common_fields.includes('driver_sha256') && oraclePublishTarget.source_receipt_common_fields.includes('runtime_image_manifest_digest') && oraclePublishTarget.source_receipt_common_fields.includes('source_execution_log_path') && oraclePublishTarget.publication_receipt_fields.includes('distinct_source_run_ids') && oraclePublishTarget.publication_receipt_fields.includes('distinct_executor_contexts'), 'selected source-oracle target/run/runtime/log independence schema underbound');
  check(oraclePublishTarget.tokenizer_contract.strings_min === 100 && oraclePublishTarget.tokenizer_contract.no_course_expected_output === true && oraclePublishTarget.dense_contract.all_positions === true && oraclePublishTarget.dense_contract.all_vocabulary_logits === true && oraclePublishTarget.dense_contract.dtype === 'f32' && oraclePublishTarget.dense_contract.no_course_expected_output === true, 'selected tokenizer/dense source-oracle semantics drift');
  const integrationTarget = boundaries.artifact_cache.target_registry.find((record) => record.step_id === 'acquire-functional-open-model' && record.target_id === 'acquire-functional-open-model-integration-v1');
  const exactIntegrationInputs = ['artifacts/functional-laptop/acquisition/open-model/receipt.json','artifacts/functional-laptop/acquisition/open-model/selected-tokenizer-source-oracle-receipt.json','artifacts/functional-laptop/acquisition/open-model/selected-dense-source-logits-receipt.json','artifacts/functional-laptop/acquisition/open-model/selected-oracles-cache-publication-receipt.json','artifacts/functional-laptop/data/tokenizer-and-tokenized-splits-v1/standalone-imported-tokenizer-oracle-receipt.json','artifacts/functional-laptop/chapters/56-tensor-artifact-interchange/independent-dense-fixture-integration-receipt.json','artifacts/functional-laptop/chapters/61-quantized-gguf-artifacts/implementation-receipt.json'];
  exactArray(integrationTarget.input_receipts,exactIntegrationInputs,'selected course integration exact seven receipt inputs');
  exactArray(integrationTarget.input_cache_mounts,['/artifacts/selected-payload:ro=entry-selected-by-artifacts/functional-laptop/acquisition/open-model/receipt.json','/artifacts/selected-tokenizer-oracle:ro=entry-selected-by-artifacts/functional-laptop/acquisition/open-model/selected-tokenizer-source-oracle-receipt.json','/artifacts/selected-dense-oracle:ro=entry-selected-by-artifacts/functional-laptop/acquisition/open-model/selected-dense-source-logits-receipt.json'],'selected course integration exact three RO cache mounts');
  check(integrationTarget?.offline_transform_target === 'acquire-functional-open-model-integration-v1' && integrationTarget.offline_transform_command.includes('--admission-receipt /receipts/admission.json') && integrationTarget.offline_transform_command.includes('--selected-tokenizer-oracle-receipt /receipts/tokenizer-oracle.json') && integrationTarget.offline_transform_command.includes('--selected-dense-oracle-receipt /receipts/dense-oracle.json') && integrationTarget.offline_transform_command.includes('--oracle-publication-receipt /receipts/oracle-publication.json') && integrationTarget.output_receipts.length === 3, 'selected payload closed tokenizer/dense/quantized integration target underbound');
  const integrationOfflineTarget = boundaries.offline_workspace.target_registry.find((record) => record.step_id === 'acquire-functional-open-model' && record.target_id === 'acquire-functional-open-model-integration-v1');
  exactSet(Object.values(integrationOfflineTarget.input_receipt_mounts),[...exactIntegrationInputs,boundaries.offline_workspace.supporting_dependency_refresh.receipt],'selected course integration exact mounted receipt set');
  deepEqual(integrationOfflineTarget.input_cache_mounts,{'/artifacts/selected-payload:ro':'entry-selected-by-artifacts/functional-laptop/acquisition/open-model/receipt.json','/artifacts/selected-tokenizer-oracle:ro':'entry-selected-by-artifacts/functional-laptop/acquisition/open-model/selected-tokenizer-source-oracle-receipt.json','/artifacts/selected-dense-oracle:ro':'entry-selected-by-artifacts/functional-laptop/acquisition/open-model/selected-dense-source-logits-receipt.json'},'selected course integration exact receipt-selected caches');
  for (const command of ['scripts/run-functional-offline.sh --step acquire-functional-open-model --target acquire-functional-open-model-integration-v1','scripts/run-functional-artifact-cache.sh publish-generated --step acquire-functional-open-model --target acquire-functional-open-model-integration-v1','scripts/run-functional-artifact-cache.sh verify --step acquire-functional-open-model --target acquire-functional-open-model-integration-v1']) check(byId.get('acquire-functional-open-model').validate.includes(command), 'acquisition missing integration phase ' + command);
  const acquireValidation = byId.get('acquire-functional-open-model').validate;
  const orderedN3Commands = ['scripts/run-functional-artifact-cache.sh acquire --step acquire-functional-open-model --target acquire-functional-open-model-v1','scripts/run-functional-artifact-cache.sh publish --step acquire-functional-open-model --target acquire-functional-open-model-v1','scripts/run-functional-artifact-cache.sh verify --step acquire-functional-open-model --target acquire-functional-open-model-v1','scripts/run-functional-offline.sh --step acquire-functional-open-model --target acquire-functional-open-model-physical-admission-v1','scripts/run-functional-artifact-cache.sh publish-generated --step acquire-functional-open-model --target acquire-functional-open-model-admission-v1','scripts/run-functional-artifact-cache.sh verify --step acquire-functional-open-model --target acquire-functional-open-model-admission-v1','scripts/run-functional-validation-oracle.sh selected-tokenizer-oracle-v1 --step acquire-functional-open-model --driver scripts/validation-oracles/run-selected-tokenizer-oracle.py --spec configs/functional-selected-open-model-oracles-v1.json --output /output/selected-tokenizer-oracle','scripts/run-functional-validation-oracle.sh selected-dense-logit-oracle-v1 --step acquire-functional-open-model --driver scripts/validation-oracles/run-selected-dense-logit-oracle.py --spec configs/functional-selected-open-model-oracles-v1.json --output /output/selected-dense-logit-oracle','scripts/run-functional-artifact-cache.sh publish-generated --step acquire-functional-open-model --target acquire-functional-open-model-oracles-v1','scripts/run-functional-artifact-cache.sh verify --step acquire-functional-open-model --target acquire-functional-open-model-oracles-v1','scripts/run-functional-offline.sh --step acquire-functional-open-model --target acquire-functional-open-model-v1','scripts/run-functional-offline.sh --step acquire-functional-open-model --target acquire-functional-open-model-integration-v1','scripts/run-functional-artifact-cache.sh publish-generated --step acquire-functional-open-model --target acquire-functional-open-model-integration-v1','scripts/run-functional-artifact-cache.sh verify --step acquire-functional-open-model --target acquire-functional-open-model-integration-v1'];
  exactArray(acquireValidation.slice(0,orderedN3Commands.length),orderedN3Commands,'selected N3 transport→physical admission→source oracles→course integration chronology');
  check(byId.get('implement-ch80-from-scratch-laptop-capstone').inputs.includes(closureProjection['CAP-DTH-TOK-02'].integration_receipts[0].receipt) && byId.get('implement-ch80-from-scratch-laptop-capstone').inputs.includes(closureProjection['CAP-DTH-ART-01'].integration_receipts[0].receipt), 'Chapter 80 does not bind the standalone tokenizer/dense fixture receipts');
  check(queuePosition.get('implement-ch80-from-scratch-laptop-capstone') < queuePosition.get('select-functional-open-model'), 'Chapter 80 must remain independent of selected external model receipts');
  unique(constants.rust_infrastructure_owners.map((record) => record.path), 'Rust infrastructure source ownership');
  unique(constants.rust_infrastructure_owners.map((record) => record.cargo_target), 'Rust infrastructure Cargo targets');
  for (const owner of constants.rust_infrastructure_owners) {
    const step = byId.get(owner.step_id);
    check(step && step.outputs.includes(owner.path), owner.cargo_target + ' infrastructure source is not owned at its execution step');
    check(owner.discovery === 'allowlisted-cargo-autobin' && owner.reachable_count === 1 && owner.path === 'rust/crates/llm-from-scratch/src/bin/' + owner.cargo_target + '.rs', owner.cargo_target + ' infrastructure reachability contract drift');
  }

  const ch85 = byId.get('implement-ch85-persistence-scale-decision');
  const receipt = constants.postgresql_measurement_receipt_contract;
  check(ch85.outputs.includes(receipt.path), 'Chapter 85 does not own the exact measurement receipt');
  for (const token of ['records=100000','dimension=384','queries=1000','k=10','selectivities_percent=[100,10,1]','concurrency=[1,4,8,16]','repetitions=3','affinity_policy=frozen','power_policy=frozen','warmup_policy=frozen','cache_policy=frozen','process_inventory=frozen']) check(ch85.cost.notes.includes(token), 'Chapter 85 fixed workload/cost drift ' + token);
  check(ch85.validate.includes('scripts/run-functional-offline.sh --step implement-ch85-persistence-scale-decision --target persistence-scale-oracle-v1'), 'Chapter 85 benchmark target missing');
  deepEqual(receipt.workload, { records: 100000, dimension: 384, queries: 1000, k: 10, selectivities_percent: [100,10,1], concurrency: [1,4,8,16], repetitions: 3 }, 'Chapter 85 receipt workload');
  deepEqual(receipt.declared_need_contract,{
    required_fields:['kind','metric','threshold','unit','declared_at','run_id','spec_sha256'],
    exactly_one_kind:true,
    kinds:{single_p95:{metric:'single_client_warm_p95_ms',threshold:100,unit:'milliseconds'},concurrency16_p95:{metric:'concurrency_16_p95_ms',threshold:250,unit:'milliseconds'},peak_rss:{metric:'peak_rss_bytes',threshold:536870912,unit:'bytes'},recovery_seconds:{metric:'restart_recovery_seconds',threshold:30,unit:'seconds'},atomic_vector_authorization_writers:{metric:'concurrent_writers',threshold:4,unit:'writers'}},
    chronology:'declared_at and the immutable preflight receipt precede measurement_started_at; the declared record is byte-bound by the preflight SHA-256 and cannot be replaced after any result is observed'
  },'Chapter 85 exact premeasurement declared-need contract');
  check(ch85.acceptance.some((line) => line.includes('undeclared metric crossings never select')), 'Chapter 85 acceptance must reject undeclared threshold crossings');

  const integration = byId.get('establish-functional-successor-static-integration');
  const integrationOutputs = ['site/src/i18n/functional-chapter-locales.json','scripts/check-site-content.mjs','scripts/check-static-links.mjs','site/package.json','site/src/pages/[locale]/course/[...slug].astro','site/src/pages/[locale]/course/index.astro','site/src/pages/sitemap.xml.ts','site/src/lib/functional-chapter-catalogs.ts','site/src/lib/functional-course-publication.mjs','site/src/lib/functional-course-routes.ts','site/tests/functional-course-routes.test.ts','site/tests/chapter-locales.test.ts','site/tests/cheat-sheets.test.ts','site/tests/diagram-style-system.test.ts','site/tests/diagram-full-view.test.ts','site/tests/e2e/theme.spec.ts','site/tests/e2e/ch00-llm-parts.spec.ts','site/tests/e2e/ch37-incremental-attention.spec.ts','site/tests/e2e/ch38-cached-generation.spec.ts','site/tests/e2e/ch39-end-to-end-llm.spec.ts','site/tests/e2e/chapter-locales.spec.ts','site/tests/e2e/diagram-style-system.spec.ts','site/tests/e2e/cheat-sheets.spec.ts','site/tests/e2e/helpers/publishable-chapter-navigation.ts','site/tests/e2e/functional-course-shell.spec.ts','site/tests/e2e/functional-formula-mathml.spec.ts','scripts/check-functional-chapter-contract.mjs','scripts/check-functional-site-content.mjs','scripts/check-functional-rust-examples.mjs','scripts/check-functional-rust-ownership.mjs','scripts/check-functional-step-receipt.mjs','scripts/tests/check-functional-chapter-contract.test.mjs','scripts/tests/check-functional-site-content.test.mjs','scripts/tests/check-functional-rust-examples.test.mjs','scripts/tests/check-functional-rust-ownership.test.mjs','scripts/tests/check-functional-step-receipt.test.mjs','rust/crates/llm-from-scratch/build.rs','rust/crates/llm-from-scratch/src/lib.rs','scripts/functional-chapter-locale-config.mjs','site/src/lib/functional-chapter-locales.ts','site/src/content.config.ts','artifacts/functional-laptop/step-output-inventories/establish-functional-successor-static-integration.json','BUILD_STATE.yaml','DECISIONS.md'];
  exactArray(integration.outputs, integrationOutputs, 'static integration exact outputs');
  for (const immutableBaseReader of ['site/src/i18n/chapter-locales.json','scripts/chapter-locale-config.mjs','site/src/lib/chapter-locales.ts']) check(!integration.outputs.includes(immutableBaseReader), 'static integration reowns immutable base reader ' + immutableBaseReader);

  exactArray(queue.conditional_postgresql.selected_step_ids, constants.conditional_postgresql.selected_steps, 'conditional step IDs');
  deepEqual(queue.conditional_postgresql.selected_steps, constants.conditional_postgresql.selected_step_records, 'conditional exact step records');
  check(!Object.hasOwn(queue.conditional_postgresql,'revision_2_order') && !Object.hasOwn(queue.conditional_postgresql,'revision_2_preclosure'), 'conditional lifecycle retains a mutable revision-2 queue/preclosure model');
  deepEqual(queue.predecessor_output_transitions,{},'immutable plan/checker must have no ownership transition after design publication');
  for (const path of ['curriculum/functional-laptop-llm-extension-plan.md','scripts/check-functional-laptop-llm-plan.mjs']) {
    check(ch85.inputs.includes(path) && !ch85.outputs.includes(path), 'Chapter 85 must consume but never reown immutable design artifact ' + path);
  }
  check(ch85.acceptance.includes('Both measured-local and measured-selected modes retain the exact immutable canonical plan/checker bytes. A selected receipt activates the already-frozen four independently committable records before preclosure and rewires only BUILD_STATE lifecycle rows; Chapter 85 never republishes or rewrites either design artifact.'), 'Chapter 85 immutable plan/checker activation acceptance drift');
  check(!queue.conditional_postgresql.selected_steps.some((step) => step.outputs.includes('curriculum/functional-laptop-llm-extension-plan.md') || step.outputs.includes('scripts/check-functional-laptop-llm-plan.mjs')), 'selected branch must not reown immutable plan/checker bytes');
  const contentTemplates = constants.conditional_postgresql.chapter85_content_templates;
  check(contentTemplates?.base?.content_revision === 'memory-file-default-v1' && contentTemplates?.selected?.content_revision === 'measured-postgresql-v1', 'Chapter 85 immutable content-template revisions missing');
  exactArray(contentTemplates.selected.paths, contentTemplates.base.paths, 'Chapter 85 base/selected surface identity');
  check(contentTemplates.base.inventory_receipt === 'artifacts/functional-laptop/chapters/85-persistence-scale-decision/base-content-inventory.json' && contentTemplates.selected.required_incoming_inventory === contentTemplates.base.inventory_receipt && contentTemplates.selected.required_decision_receipt === constants.postgresql_measurement_receipt_contract.path, 'Chapter 85 selected content transition binding drift');
  const dependencyAdmissionOutputInventory = 'artifacts/functional-laptop/step-output-inventories/admit-functional-supporting-dependency-graph.json';
  const selectedOrder = [...constants.queue_ids.slice(0, -1), ...constants.conditional_postgresql.selected_steps, constants.queue_ids.at(-1)];
  exactArray(queue.conditional_postgresql.selected_order, selectedOrder, 'measured-selected queue order');
  deepEqual(queue.conditional_postgresql.selected_preclosure, { ...queue.steps.at(-1), depends_on: [constants.conditional_postgresql.selected_steps.at(-1)] }, 'measured-selected preclosure rewire');
  const conditionalOwners = [];
  const conditionalAvailable = new Set(available);
  for (let index = 0; index < queue.conditional_postgresql.selected_steps.length; index += 1) {
    const current = queue.conditional_postgresql.selected_steps[index];
    exactArray(current.depends_on, [index === 0 ? 'implement-ch85-persistence-scale-decision' : queue.conditional_postgresql.selected_steps[index - 1].id], current.id + ' conditional dependency');
    check(current.status === 'pending' && current.runs.length === 0 && current.cost.class === 'large', current.id + ' conditional initial record drift');
    unique(current.outputs, current.id + '.outputs'); unique(current.validate, current.id + '.validate');
    const tokens = parseCostNotes(current.cost.notes, current.id);
    check(tokens.cpu === 'C3' && tokens.gpu === 'G0', current.id + ' conditional CPU/GPU drift');
    check(tokens.network === ['N2','N3','N0','N0'][index], current.id + ' conditional network authority drift');
    if (index >= 2) check(tokens.new_download_authority_bytes === '0', current.id + ' conditional offline step lacks zero download authority');
    const now = new Set([...conditionalAvailable, ...current.outputs.filter((path) => !path.endsWith('/'))]);
    availableByStep.set(current.id, now);
    for (const command of current.validate) assertCommand(current, command, now, true);
    for (const output of current.outputs) {
      if (!queue.conditional_shared_output_exceptions.includes(output)) conditionalOwners.push([safeOutput(output, current.id + '.output'), current.id]);
      if (!output.endsWith('/')) conditionalAvailable.add(output);
    }
  }
  for (const [path, owner] of conditionalOwners) for (const [basePath, baseOwner] of outputOwners) {
    if (path === basePath && queue.conditional_output_transitions[path]) {
      const transition = queue.conditional_output_transitions[path];
      check(transition.from_step === baseOwner && transition.to_step === owner && transition.requires_measurement_mode === 'measured-selected' && transition.requires_selected_receipt === true && !Object.hasOwn(transition, 'requires_plan_revision'), 'conditional measured-selected transition drift ' + path);
      const expectedIncomingInventory = baseOwner === 'implement-ch85-persistence-scale-decision' ? contentTemplates.base.inventory_receipt : baseOwner === 'admit-functional-supporting-dependency-graph' ? dependencyAdmissionOutputInventory : null;
      if (expectedIncomingInventory) check(transition.requires_incoming_inventory === expectedIncomingInventory && transition.requires_incoming_path_hash === path, 'conditional transition lacks exact predecessor path/hash inventory binding ' + path);
    } else check(path !== basePath && !path.startsWith(basePath + '/') && !basePath.startsWith(path + '/'), 'conditional/base output overlap ' + owner + ':' + path + ' / ' + baseOwner + ':' + basePath);
  }
  for (let left = 0; left < conditionalOwners.length; left += 1) for (let right = left + 1; right < conditionalOwners.length; right += 1) {
    const [a, ownerA] = conditionalOwners[left], [b, ownerB] = conditionalOwners[right];
    if (ownerA === ownerB) continue;
    if (a === b && queue.conditional_output_transitions[a]) {
      const transition = queue.conditional_output_transitions[a];
      check(transition.from_step === ownerA && transition.to_step === ownerB, 'conditional internal transition drift ' + a);
    } else check(a !== b && !a.startsWith(b + '/') && !b.startsWith(a + '/'), 'conditional output overlap ' + ownerA + ':' + a + ' / ' + ownerB + ':' + b);
  }
  const admission = queue.conditional_postgresql.selected_steps[0];
  check(admission.inputs.includes(dependencyAdmissionOutputInventory), 'PostgreSQL admission does not declare the supporting-dependency output inventory as a transition input');
  check(queue.conditional_postgresql.selected_steps[3].inputs.includes(contentTemplates.base.inventory_receipt), 'PostgreSQL Chapter 85 publication does not declare the base-content inventory as a transition input');
  for (const path of ['curriculum/functional-laptop-llm-extension-plan.md','scripts/check-functional-laptop-llm-plan.mjs']) check(queue.conditional_postgresql.selected_steps[3].inputs.includes(path), 'PostgreSQL Chapter 85 publication does not consume the immutable design artifact ' + path);
  const conditionalLifecycleText = JSON.stringify({chapter85_acceptance:ch85.acceptance,conditional:queue.conditional_postgresql,predecessor_transitions:queue.predecessor_output_transitions});
  check(!/revision[_ -]?2|revision[_ -]?1 plan\/checker|publishes revision/i.test(conditionalLifecycleText), 'conditional lifecycle retains mutable plan/checker revision semantics');
  for (const path of ['Cargo.toml','Cargo.lock','rust/crates/llm-vector-postgres/Cargo.toml','rust/crates/llm-vector-postgres/src/lib.rs','scripts/run-functional-postgresql-lab.sh','configs/functional-postgresql-lab-targets.json']) check(admission.outputs.includes(path), 'PostgreSQL admission missing ' + path);
  check(!queue.conditional_postgresql.selected_steps[1].outputs.includes('Cargo.lock'), 'PostgreSQL conformance must not edit lock');
  check(queue.conditional_postgresql.selected_steps[1].validate.some((command) => command.includes(' acquire ')) && queue.conditional_postgresql.selected_steps[1].validate.some((command) => command.includes(' conformance ')), 'PostgreSQL conformance lacks exact acquire/conformance targets');
  const pgImageReceipt = 'artifacts/functional-laptop/postgresql/acquisition/image-acquisition-receipt.json';
  check(queue.conditional_postgresql.selected_steps[1].outputs.includes(pgImageReceipt), 'PostgreSQL N3 image acquisition lacks its own immutable receipt');
  const pgImageTarget = boundaries.postgresql.target_registry.find((record) => record.target_id === 'postgresql-image-v1');
  const pgConformanceTarget = boundaries.postgresql.target_registry.find((record) => record.target_id === 'vector-store-conformance-v1');
  check(pgImageTarget?.output_receipt === pgImageReceipt && pgConformanceTarget?.input_receipts.includes(pgImageReceipt) && pgConformanceTarget.output_receipt === 'artifacts/functional-laptop/postgresql/conformance/receipt.json', 'PostgreSQL acquisition/conformance checkpoint separation drift');
  const pgAdmissionInventory = 'artifacts/functional-laptop/postgresql/admission/canonical-output-inventory.json';
  check(pgConformanceTarget.input_receipts.includes(pgAdmissionInventory) && pgConformanceTarget.incoming_transition?.inventory_receipt === pgAdmissionInventory && pgConformanceTarget.incoming_transition.path === 'rust/crates/llm-vector-postgres/src/lib.rs' && pgConformanceTarget.incoming_transition.order.includes('before applying the successor patch'), 'PostgreSQL conformance does not hash-bind the admission lib.rs inventory before mutation');
  for (const field of ['admission_canonical_output_inventory_sha256','incoming_lib_rs_sha256','successor_lib_rs_sha256','transition_patch_sha256']) check(pgConformanceTarget.receipt_fields.includes(field), 'PostgreSQL conformance receipt lacks transition field ' + field);
  const pgLibTransition = queue.conditional_output_transitions['rust/crates/llm-vector-postgres/src/lib.rs'];
  check(pgLibTransition?.requires_incoming_inventory === pgAdmissionInventory && pgLibTransition.requires_incoming_path_hash === 'rust/crates/llm-vector-postgres/src/lib.rs', 'PostgreSQL lib.rs conditional transition inventory binding drift');
  check(queue.conditional_postgresql.selected_steps[2].validate.some((command) => command.includes(' recovery ')), 'PostgreSQL recovery target missing');
  check(queue.conditional_postgresql.selected_steps[3].validate.some((command) => command.startsWith('scripts/run-functional-firefox.sh test ')), 'PostgreSQL publication lacks Firefox target');

  const closurePaths = queue.closure_contract.outputs.filter((path) => !queue.shared_output_exceptions.includes(path)).map((path) => safeOutput(path, 'closure.output'));
  for (const closurePath of closurePaths) for (const [path, owner] of [...outputOwners, ...conditionalOwners]) check(closurePath !== path && !closurePath.startsWith(path + '/') && !path.startsWith(closurePath + '/'), 'closure output overlap ' + closurePath + ' / ' + owner + ':' + path);
  const closureAvailable = new Set([...available,...conditionalAvailable,...queue.closure_contract.outputs.filter((path) => !path.endsWith('/'))]);
  availableByStep.set(queue.closure_contract.id, closureAvailable);
  for (const command of queue.closure_contract.validate) assertCommand(queue.closure_contract, command, closureAvailable);
  check(queue.closure_contract.validate.some((command) => command.includes('run-functional-offline.sh')) && queue.closure_contract.validate.some((command) => command.includes('run-functional-gpu-profile.sh')) && queue.closure_contract.validate.some((command) => command.includes('run-functional-firefox.sh')), 'closure lacks exact offline/GPU/Firefox boundaries');
  for (const phase of [
    {step:byId.get('audit-functional-successor-preclosure'),stepId:'audit-functional-successor-preclosure',gpuTarget:'audit-functional-successor-preclosure-v1',offlineTarget:'audit-functional-successor-preclosure-v1',artifactTarget:'audit-functional-successor-preclosure-receipt-v1',gpuReceipt:'artifacts/functional-laptop/preclosure/gpu-smoke-receipt.json',aggregateReceipt:'artifacts/functional-laptop/preclosure/receipt.json',runReceipt:'/output/preclosure-aggregate-receipt.json'},
    {step:queue.closure_contract,stepId:queue.closure_contract.id,gpuTarget:'functional-closure-gpu-smoke-v1',offlineTarget:'functional-closure-v1',artifactTarget:'functional-closure-receipt-v1',gpuReceipt:'artifacts/functional-laptop/closure/gpu-smoke-receipt.json',aggregateReceipt:'artifacts/functional-laptop/closure/receipt.json',runReceipt:'/output/closure-aggregate-receipt.json'}
  ]) {
    exactArray(phase.step.validate.slice(0,4),[
      `scripts/run-functional-gpu-profile.sh run --step ${phase.stepId} --target ${phase.gpuTarget} --profile 8gb-gpu-smoke`,
      `scripts/run-functional-offline.sh --step ${phase.stepId} --target ${phase.offlineTarget}`,
      `scripts/run-functional-artifact-cache.sh publish-generated --step ${phase.stepId} --target ${phase.artifactTarget}`,
      `scripts/run-functional-artifact-cache.sh verify --step ${phase.stepId} --target ${phase.artifactTarget}`
    ],phase.stepId + ' GPU-before-offline aggregate publication chronology');
    check(phase.step.outputs.includes(phase.gpuReceipt) && phase.step.outputs.includes(phase.aggregateReceipt) && phase.gpuReceipt !== phase.aggregateReceipt, phase.stepId + ' distinct GPU/final aggregate output ownership drift');
    const gpuTarget = gpuTargets.get(phase.stepId + '\0' + phase.gpuTarget);
    const offlineTarget = offlineTargets.get(phase.stepId + '\0' + phase.offlineTarget);
    const artifactTarget = artifactTargets.get(phase.stepId + '\0' + phase.artifactTarget);
    check(gpuTarget?.receipt_path === phase.gpuReceipt && gpuTarget.admission_receipt_selector.mode === 'consume-definitive' && gpuTarget.admission_receipt_selector.input_receipt === gpuDefinitiveReceipt, phase.stepId + ' aggregate GPU phase receipt/definitive selector drift');
    check(offlineTarget?.runtime_image_selector?.receipt === dependencyWorkspaceReceipt && offlineTarget.input_receipt_mounts['/receipts/gpu.json:ro'] === phase.gpuReceipt && offlineTarget.input_receipt_mounts['/receipts/dependency-refresh.json:ro'] === dependencyWorkspaceReceipt && offlineTarget.output_mount === '/output:rw-run-scoped' && offlineTarget.aggregate_receipt_path === phase.runReceipt, phase.stepId + ' offline aggregate GPU/dependency/output mount drift');
    check(artifactTarget?.modes?.join(',') === 'publish-generated,verify' && artifactTarget.source_run_receipts.length === 1 && artifactTarget.source_run_receipts[0] === phase.runReceipt && artifactTarget.output_receipts.length === 1 && artifactTarget.output_receipts[0] === phase.aggregateReceipt, phase.stepId + ' aggregate publication source/canonical mapping drift');
  }

  const expectedInvocations = {
    offline: boundaries.offline_workspace.target_registry.map((record) => record.step_id + '\0' + record.target_id),
    firefox: boundaries.firefox.target_registry.map((record) => record.step_id + '\0' + record.target_id + '\0' + record.phase),
    gpu: boundaries.gpu.target_registry.map((record) => record.step_id + '\0' + record.target_id),
    artifact: boundaries.artifact_cache.target_registry.flatMap((record) => record.modes.map((mode) => record.step_id + '\0' + record.target_id + '\0' + mode)),
    postgresql: boundaries.postgresql.target_registry.map((record) => record.step_id + '\0' + record.target_id + '\0' + record.phase),
    validationOracle: boundaries.validation_oracles.target_registry.map((record) => record.step_id + '\0' + record.target_id)
  };
  for (const kind of Object.keys(expectedInvocations)) exactSet([...invoked[kind]], expectedInvocations[kind], kind + ' closed-runner registry invocation set');

  function requireInternalPath(path, availableAt, label) {
    check(!isAbsolute(path) && !path.includes('..') && !path.includes('\\'), label + ' unsafe internal path ' + path);
    check(availableAt.has(path) || existsSync(resolve(root, path)), label + ' internal command target unavailable at owner step: ' + path);
  }
  function validateInternalCommands(record, label) {
    check(Array.isArray(record.commands) && record.commands.length > 0, label + ' commands missing');
    const availableAt = availableByStep.get(record.step_id);
    check(availableAt, label + ' owner step missing from execution order');
    const mountKeys = (value) => Array.isArray(value) ? value : isRecord(value) ? Object.keys(value) : [];
    const receiptMounts = mountKeys(record.input_receipt_mounts).map((entry) => entry.split(':')[0]);
    const artifactMounts = mountKeys(record.input_cache_mounts).map((entry) => entry.split(':')[0]);
    const outputRoot = typeof record.output_mount === 'string' ? record.output_mount.split(':')[0] : null;
    const under = (path, roots) => roots.some((rootPath) => path === rootPath || path.startsWith(rootPath + '/'));
    for (const command of record.commands) {
      check(typeof command === 'string' && command.trim() === command && command.length > 0, label + ' internal command invalid');
      check(!/^\.\/course\s+(?:run|check)(?:\s|$)/.test(command), label + ' inner command uses ordinary course workflow');
      check(!/(exact owned|resolve and acquire|inventory bytes|TBD|<[^>]+>|\bmanual\b)/i.test(command), label + ' prose/placeholder inner command: ' + command);
      check(!/[;&|`]/.test(command), label + ' inner command uses shell control syntax');
      check(/^(?:node(?:\s|$)|python3(?:\s|$)|npm(?:\s|$)|cargo(?:\s|$)|rustup-init(?:\s|$)|(?:scripts|audits|\.agents)\/[A-Za-z0-9_.\/-]+(?:\.mjs|\.sh|\.py)(?:\s|$))/.test(command), label + ' inner command has no closed executable: ' + command);
      const tokens = command.split(/\s+/);
      for (const token of tokens) {
        const path = token.replace(/[),]$/, '');
        if (path === '/receipts' || path.startsWith('/receipts/')) check(under(path, receiptMounts), label + ' undeclared read-only receipt mount for ' + path);
        if (path === '/artifacts' || path.startsWith('/artifacts/')) check(under(path, artifactMounts), label + ' undeclared read-only artifact mount for ' + path);
        if (path === '/output' || path.startsWith('/output/')) check(outputRoot && (path === outputRoot || path.startsWith(outputRoot + '/')), label + ' undeclared run-scoped output mount for ' + path);
      }
      if (tokens[0] === 'node') {
        const candidates = tokens[1] === '--test' ? tokens.slice(2).filter((token) => /^(?:scripts|audits|\.agents)\/.+\.(?:mjs|js)$/.test(token)) : /^(?:scripts|audits|\.agents)\/.+\.(?:mjs|js)$/.test(tokens[1] || '') ? [tokens[1]] : [];
        check(candidates.length > 0, label + ' node command lacks an exact repo-local target: ' + command);
        for (const path of candidates) requireInternalPath(path, availableAt, label);
      } else if (tokens[0] === 'python3') {
        check(/^(?:scripts|audits)\/.+\.py$/.test(tokens[1] || ''), label + ' python command lacks an exact repo-local driver: ' + command);
        requireInternalPath(tokens[1], availableAt, label);
      } else if (/^(?:scripts|audits|\.agents)\//.test(tokens[0])) requireInternalPath(tokens[0], availableAt, label);
      if (tokens[0] === 'cargo') {
        const binAt = tokens.indexOf('--bin');
        if (binAt >= 0) {
          const target = tokens[binAt + 1];
          const owner = constants.rust_infrastructure_owners.find((entry) => entry.cargo_target === target);
          check(owner && availableAt.has(owner.path), label + ' Cargo bin is not owned/currently reachable: ' + target);
        }
        const testAt = tokens.indexOf('--test');
        if (testAt >= 0) {
          const testName = tokens[testAt + 1];
          const packageAt = tokens.indexOf('-p');
          check(packageAt >= 0 && ['llm-from-scratch','llm-vector-postgres'].includes(tokens[packageAt + 1]), label + ' Cargo test package is not in the exact internal registry');
          const path = 'rust/crates/' + tokens[packageAt + 1] + '/tests/' + testName + '.rs';
          requireInternalPath(path, availableAt, label);
        }
      }
    }
  }
  for (const record of boundaries.offline_workspace.target_registry) validateInternalCommands(record, 'offline target ' + record.step_id + '/' + record.target_id);

  const forbiddenOutput = /(multimodal|mmproj|audio|video|diffusion|encoder-only|encoder-decoder|cross-attention|projector|resampler|modality)/i;
  const pgOutput = /(postgres|pgvector|docker-compose|compose\.ya?ml|migration[^/]*\.sql)/i;
  for (const current of queue.steps) for (const output of current.outputs) {
    check(!forbiddenOutput.test(output), current.id + ' out-of-scope output ' + output);
    check(!pgOutput.test(output), current.id + ' leaks conditional database output ' + output);
  }
  for (const current of [...queue.steps, ...queue.conditional_postgresql.selected_steps]) assertNoPositiveModelAuthorization({objective:current.objective,inputs:current.inputs,outputs:current.outputs,acceptance:current.acceptance},current.id);
  const ch82Step = byId.get('implement-ch82-advanced-decoding-serving');
  for (const output of ['configs/functional-speculative-proposal-trace-v1.json','rust/crates/llm-from-scratch/tests/functional_speculative_single_decoder.rs']) check(ch82Step.outputs.includes(output), 'Chapter 82 single-decoder proposal-trace proof output missing ' + output);
  const ch82Acceptance = ch82Step.acceptance.join('\n');
  for (const token of ['deterministic proposal-token/probability trace fixture','must not add/load draft weights','run a draft forward pass','second decoder/core/head/model','sole target causal autoregressive decoder']) check(ch82Acceptance.includes(token), 'Chapter 82 user-scope acceptance drift ' + token);
  check(!ch82Step.outputs.some((output) => /(?:draft[-_]?model|draft[-_]?weights|second[-_](?:decoder|head|model)|encoder[-_]?decoder|autoencoder)/i.test(output)), 'Chapter 82 owns a forbidden alternate model/decoder artifact');
  return byId;
}

function validatePlan(plan, planBody, schema, constants, accepted, coverageData, coursePlanFile, readmeFile, executionRoot = DEFAULT_ROOT) {
  if (EMBEDDED_PLAN_DATA !== null) deepEqual(plan, EMBEDDED_PLAN_DATA, 'immutable embedded plan frontmatter');
  if (EMBEDDED_PLAN_BODY !== null) check(planBody === EMBEDDED_PLAN_BODY, 'immutable embedded plan body drift');
  if (EMBEDDED_SCHEMA !== null) deepEqual(schema, EMBEDDED_SCHEMA, 'plan validation immutable embedded schema');
  assertEmbeddedConstants(constants, 'plan validation');
  if ([PUBLISHED_CONSTANTS_SHA256,PUBLISHED_SCHEMA_SHA256,PUBLISHED_QUEUE_SHA256,PUBLISHED_CHAPTER_RECORDS_SHA256].every((value) => typeof value === 'string')) deepEqual(plan.design_input_identities, {
    constants_sha256:PUBLISHED_CONSTANTS_SHA256,
    schema_sha256:PUBLISHED_SCHEMA_SHA256,
    queue_sha256:PUBLISHED_QUEUE_SHA256,
    chapter_records_sha256:PUBLISHED_CHAPTER_RECORDS_SHA256,
    chapter_projection_sha256:sha256(publishedJsonBytes(plan.chapters))
  }, 'plan composed immutable design identities');
  validateJsonSchema(plan, schema);
  exactArray(Object.keys(plan).sort(), [...schema.required].sort(), 'plan top-level keys');
  for (const [field, value] of Object.entries(constants.plan)) {
    if (Array.isArray(value)) exactArray(plan[field], value, 'plan.' + field);
    else check(plan[field] === value, 'plan.' + field + ' drift');
  }
  check(plan.plan_revision === 1, 'published extension plan revision must remain immutable at 1 across all measured state modes');
  check(plan.published_predecessor_sha256 === PUBLISHED_PREDECESSOR_SHA256, 'published predecessor immutable SHA drift');
  check(constants.published_predecessor_sha256 === PUBLISHED_PREDECESSOR_SHA256, 'embedded predecessor immutable SHA drift');
  let predecessorChapters = null;
  if (coursePlanFile) {
    const compatibility = readExecutionCompatibility(executionRoot);
    check(coursePlanFile.hash === compatibility.approved_predecessor.sha256, 'extension approved predecessor compatibility binding drift');
    const predecessor = parseFrontmatter(coursePlanFile.text, 'course plan').data;
    check(predecessor.plan_revision === 78 && predecessor.chapter_count === 40, 'published predecessor revision/count drift');
    check(JSON.stringify(predecessor.successor_extension) === JSON.stringify({plan:'curriculum/functional-laptop-llm-extension-plan.md',first_chapter:'40-reference-core-handoff',last_chapter:'85-persistence-scale-decision',model_family:'causal-decoder-only-autoregressive-text-token',active_locales:['en','ru']}), 'course-plan successor projection drift or cyclic extension hash');
    predecessorChapters = predecessor.chapters.map((chapter) => chapter.chapter_id);
    check(predecessorChapters.length === 40, 'predecessor chapter list drift');
  }
  if (readmeFile) {
    const boundary = readmeFile.text.indexOf('\n## One chapter is one delivery step');
    check(boundary >= 0 && readmeFile.text.slice(0, boundary) === constants.readme_successor_workflow_section, 'curriculum README exact successor workflow section drift');
    const normalizedReadme = readmeFile.text.replace(/\s+/g, ' ');
    for (const literal of ['[Chapters 0–39 plan](course-plan.md)','[functional-laptop extension plan](functional-laptop-llm-extension-plan.md)','Chapters 40–85','causal decoder-only text/token implementation','crate-private checked prepared-embedding seam','no other encoder or decoder, public modality API, non-text producer, or multimodal placeholder']) check(normalizedReadme.includes(literal), 'curriculum README projection missing ' + literal);
  }
  for (const [field, file] of Object.entries(accepted)) check(plan.accepted_inputs[field] === file.hash, 'accepted input drift ' + field);
  exactArray(plan.chapters.map((chapter) => chapter.chapter_id), constants.chapters, 'plan chapters');
  exactArray(plan.scale_ids, constants.scale_ids, 'plan scales');
  exactArray(plan.profile_ids, constants.profile_ids, 'plan profiles');
  exactArray(plan.formula_ids, constants.formula_ids, 'plan formulas');
  check(JSON.stringify(plan.resource_projection) === JSON.stringify({scales:constants.scale_records,profiles:constants.profile_records,derived_subprofiles:constants.derived_subprofiles,formula_literals:constants.formula_literals,accounting_witnesses:constants.accounting_witnesses,prepared_input:constants.prepared_input_record,prepared_input_architecture:constants.prepared_input_architecture,contract_records:constants.resource_contract_records,execution_profile_owners:constants.execution_profile_owners,execution_boundaries:constants.execution_boundary_records,open_model_candidate_registry:constants.open_model_candidate_registry,rust_infrastructure_owners:constants.rust_infrastructure_owners,rust_module_registry_contract:constants.rust_module_registry_contract,capability_closure_projection:constants.capability_closure_projection,capability_receipt_protocol:constants.capability_receipt_protocol,canonical_output_inventory_contract:constants.canonical_output_inventory_contract,state_lifecycle_contract:constants.state_lifecycle_contract}), 'plan exact resource projection drift');
  check(JSON.stringify(plan.cost_token_definitions) === JSON.stringify(constants.cost_token_definitions), 'plan cost token definitions drift');
  check(JSON.stringify(plan.history_source_register) === JSON.stringify(constants.accepted_source_register), 'plan accepted source register drift');
  const expectedFormulaMap = constants.chapters.map((chapter_id) => ({chapter_id,...constants.teaching_formula_by_chapter[chapter_id]}));
  check(JSON.stringify(plan.teaching_formula_map) === JSON.stringify(expectedFormulaMap), 'plan teaching formula map drift');
  check(new Set(expectedFormulaMap.map((record) => record.formula_id)).size === 46 && new Set(expectedFormulaMap.map((record) => record.notation)).size === 46 && new Set(expectedFormulaMap.map((record) => record.notation + '\0' + record.meaning)).size === 46, 'every chapter must own a distinct teaching formula ID, notation and notation/meaning pair');
  deepEqual(constants.teaching_formula_by_chapter['57-immutable-artifact-persistence'], {formula_id:'teaching-formula-ch57-immutable-artifact-persistence',notation:'published(final) = fsync(temp) ∧ atomic_rename(temp, final)',meaning:'A successor artifact becomes visible only after its staged bytes are durably synchronized and atomically renamed to the final path; partial successor state is never published.'}, 'Chapter 57 durable atomic-publication teaching formula');
  deepEqual(constants.teaching_formula_by_chapter['82-advanced-decoding-serving'],{formula_id:'teaching-formula-ch82-advanced-decoding-serving',notation:'accepted_speculative_prefix = longest prefix verified by target_policy',meaning:'A deterministic trace proposes token IDs and proposal probabilities; the one target decoder supplies target probabilities, and course-owned acceptance/correction math keeps only the longest verified prefix. The trace never performs a neural forward pass.'},'Chapter 82 deterministic proposal-trace teaching formula');
  const speculativeTrace = constants.execution_boundary_records.ch82_speculative_trace;
  check(speculativeTrace.owner_step === 'implement-ch82-advanced-decoding-serving' && speculativeTrace.capability === 'CAP-ISA-DEC-007' && speculativeTrace.proposal_fixture === 'configs/functional-speculative-proposal-trace-v1.json' && speculativeTrace.fixture_schema.neural_source === 'none; deterministic typed values only' && speculativeTrace.course_operation.includes('sole target causal autoregressive decoder'), 'Chapter 82 deterministic proposal-trace/sole-decoder boundary drift');
  exactArray(speculativeTrace.fixture_schema.required,['schema_version','target_prefix_token_ids','proposal_token_ids','proposal_probabilities','target_probabilities','uniform_draws','expected_accept_reject_correction_trace'],'Chapter 82 proposal trace schema');
  exactArray(speculativeTrace.forbidden,['draft-model-weights','draft-forward-pass','second-decoder','second-output-head','alternate-model-core','remote-model','model-encoder','encoder-decoder','seq2seq','autoencoder'],'Chapter 82 forbidden alternate-model surfaces');
  for (let index = 0; index < plan.chapters.length; index += 1) {
    const chapter = plan.chapters[index];
    const id = constants.chapters[index];
    check(chapter.order === index + 40 && chapter.implementation_step === 'implement-ch' + id, id + ' order/step drift');
    exactArray(chapter.depends_on, constants.chapter_step_dependencies[id], id + ' plan dependency');
    exactArray(chapter.active_locales, ['en', 'ru'], id + ' locales');
    exactArray(chapter.capability_ids, constants.capability_by_chapter[id], id + ' capabilities');
    exactArray(chapter.rust_owner_ids, ['owner-ch' + String(index + 40)], id + ' Rust owner IDs');
    for (const field of ['outcome', 'scope_boundary', 'historical_contrast', 'rust_contribution', 'practice', 'integration_evidence', 'handoff']) check(typeof chapter[field] === 'string' && chapter[field].trim(), id + ' missing ' + field);
    for (const field of ['prerequisites', 'special_gates', 'cost_authority_steps']) check(Array.isArray(chapter[field]) && chapter[field].length > 0, id + ' missing ' + field);
    check(chapter.teaching_formula_id === constants.teaching_formula_by_chapter[id].formula_id, id + ' teaching formula owner drift');
    check(chapter.historical_contrast === constants.history_by_chapter[id].historical_contrast && JSON.stringify(chapter.historical_sources) === JSON.stringify(constants.history_by_chapter[id].historical_sources), id + ' historical source mapping drift');
    const expectedRoles = ['earlier','later'];
    check(chapter.historical_sources[0].role === expectedRoles[0] && chapter.historical_sources[1].role === expectedRoles[1] && chapter.historical_sources[0].source_id !== chapter.historical_sources[1].source_id, id + ' historical source role/distinctness drift');
    check(chapter.historical_sources[0].year < chapter.historical_sources[1].year, id + ' historical source chronology drift');
    const correctedHistory = {
      '50-dependency-error-contract': ['SRC-ISA-046',2015,'SRC-ISA-047',2019],
      '62-laptop-hardware-admission': ['SRC-DTH-HW-01',2023,'SRC-DTH-HW-03',2025],
      '67-stop-strings-unicode-streaming': ['SRC-ISA-005',2009,'SRC-ISA-004',2014],
      '85-persistence-scale-decision': ['SRC-ISA-023',2020,'SRC-ISA-036',2025]
    }[id];
    if (correctedHistory) check(chapter.historical_sources[0].source_id === correctedHistory[0] && chapter.historical_sources[0].year === correctedHistory[1] && chapter.historical_sources[1].source_id === correctedHistory[2] && chapter.historical_sources[1].year === correctedHistory[3], id + ' exact corrected historical progression drift');
    check(JSON.stringify(chapter.resource_profiles) === JSON.stringify(constants.chapter_resource_profiles[id]), id + ' resource profile relevance drift');
    check(JSON.stringify(chapter.lifecycle_cost) === JSON.stringify(constants.chapter_costs[id].lifecycle_cost) && JSON.stringify(chapter.implementation_cost) === JSON.stringify(constants.chapter_costs[id].implementation_cost) && JSON.stringify(chapter.cost_authority_steps) === JSON.stringify(constants.chapter_costs[id].authority_steps), id + ' lifecycle/implementation cost decomposition drift');
    check(chapter.lifecycle_cost.cpu === 'C3', id + ' full bilingual/Rust/static/Firefox lifecycle must be C3');
    check(chapter.visualization && ['useful', 'not-useful'].includes(chapter.visualization.decision) && typeof chapter.visualization.evidence === 'string' && chapter.visualization.evidence.trim(), id + ' visualization record invalid');
    if (id === '82-advanced-decoding-serving') {
      check(chapter.outcome.includes('single causal autoregressive decoder') && chapter.integration_evidence.includes('deterministic typed trace') && chapter.integration_evidence.includes('exactly one model constructor, one output head, and one decoder forward path') && chapter.rust_contribution.includes('no draft weights, draft forward pass, second decoder/core/head/model') && chapter.practice.includes('single target-decoder call'), 'Chapter 82 learner/executable single-decoder proposal-trace record drift');
      for (const token of ['deterministic proposal token/probability trace','no draft-model weights','draft forward pass','second decoder','second output head','alternate model core','encoder-decoder','seq2seq','autoencoder','remote model','public alternate-model abstraction']) check(chapter.scope_boundary.toLowerCase().includes(token), 'Chapter 82 scope boundary omits ' + token);
      exactArray(constants.rust_owners[id].filter((path) => path.endsWith('functional_speculative_single_decoder.rs')),['rust/crates/llm-from-scratch/tests/functional_speculative_single_decoder.rs'],'Chapter 82 single-decoder callgraph test ownership');
    }
    const expectedLinks = constants.chapter_audit_links[id];
    exactArray(chapter.finding_ids, expectedLinks.finding_ids, id + ' chapter finding links');
    exactArray(chapter.claim_ids, expectedLinks.claim_ids, id + ' chapter claim links');
    exactArray(chapter.overbroad_surface_ids, expectedLinks.overbroad_surface_ids, id + ' chapter OVER links');
    exactArray(chapter.special_gates, ['english-two-review-two-adjudication','direct-russian-bilingual-target-only','static-firefox-only'], id + ' special gates');
    exactArray(chapter.english_outputs, ['site/src/content/chapters/en/' + id + '.mdx','site/src/i18n/functional-catalogs/en/' + id + '.json','site/src/content/cheat-sheets/en/' + id + '.json'], id + ' English outputs');
    check(chapter.english_outputs.length === chapter.russian_outputs.length && chapter.english_outputs.length > 0, id + ' locale output length drift');
    for (let output = 0; output < chapter.english_outputs.length; output += 1) {
      check(chapter.english_outputs[output].replace('/en/', '/ru/') === chapter.russian_outputs[output], id + ' locale path projection drift');
    }
  }
  check(plan.rust_owners.length === 46, 'Rust owner record count drift');
  const ownerRecords = new Map(plan.rust_owners.map((record) => [record.chapter_id, record]));
  check(ownerRecords.size === 46, 'Rust owner duplicate drift');
  for (let index = 0; index < constants.chapters.length; index += 1) {
    const id = constants.chapters[index];
    const owner = ownerRecords.get(id);
    check(owner && owner.owner_id === 'owner-ch' + String(index + 40), id + ' Rust owner identity drift');
    exactArray(owner.paths, constants.rust_owners[id], id + ' Rust owner paths');
  }
  check(plan.capability_map.length === 79, 'capability map raw count drift');
  const capRecords = new Map(plan.capability_map.map((record) => [record.capability_id, record]));
  const capOwners = new Map(plan.capability_map.map((record) => [record.capability_id, record.chapter_id]));
  check(capOwners.size === 79, 'capability map count/duplicate drift');
  for (const chapter of constants.chapters) for (const cap of constants.capability_by_chapter[chapter]) {
    const record = capRecords.get(cap);
    check(record && record.chapter_id === chapter && record.implementation_step === 'implement-ch' + chapter && record.classification === coverageData.classes.get(cap) && record.receipt === 'artifacts/functional-laptop/chapters/' + chapter + '/capabilities/' + cap + '.json', cap + ' exact capability record drift');
  }
  check(plan.finding_map.length === 17, 'finding map raw count drift');
  exactSet(plan.finding_map.map((record) => record.finding_id), constants.finding_ids, 'plan findings');
  for (const record of plan.finding_map) {
    exactArray(record.requirement_ids, coverageData.findingLinks[record.finding_id], record.finding_id + ' accepted links');
    exactArray(record.chapter_ids, constants.chapters.filter((chapter) => constants.capability_by_chapter[chapter].some((cap) => record.requirement_ids.includes(cap))), record.finding_id + ' chapter links');
    check(record.receipt === 'artifacts/functional-laptop/audit-map/findings/' + record.finding_id + '.json', record.finding_id + ' receipt drift');
  }
  check(plan.reference_claim_map.length === 40, 'claim map raw count drift');
  exactSet(plan.reference_claim_map.map((record) => record.claim_id), constants.claim_ids, 'plan claims');
  for (let index = 0; index < plan.reference_claim_map.length; index += 1) {
    const record = plan.reference_claim_map[index];
    const acceptedClaim = coverageData.claimRecords[index];
    check(record.claim_id === acceptedClaim.claim_id && record.classification === acceptedClaim.classification && record.claim === acceptedClaim.claim && record.evidence === acceptedClaim.evidence && record.boundary === acceptedClaim.boundary, record.claim_id + ' exact accepted claim semantics drift');
    check(record.disposition === 'reference-core-proven' && record.handoff_chapter === '40-reference-core-handoff', record.claim_id + ' claim disposition drift');
    if (predecessorChapters) check(record.reference_chapter === predecessorChapters[index], record.claim_id + ' predecessor chapter drift');
    check(record.preservation_receipt === 'artifacts/functional-laptop/audit-map/claims/' + record.claim_id + '.json', record.claim_id + ' receipt drift');
  }
  check(plan.overbroad_surface_map.length === 21, 'OVER map raw count drift');
  exactSet(plan.overbroad_surface_map.map((record) => record.surface_id), Object.keys(constants.overbroad_dispositions), 'plan overbroad');
  for (let index = 0; index < plan.overbroad_surface_map.length; index += 1) {
    const record = plan.overbroad_surface_map[index];
    const expected = constants.overbroad_records[index];
    check(record.surface_id === expected.surface_id && record.disposition === expected.disposition && record.owner_step === expected.owner_step && JSON.stringify(record.locators) === JSON.stringify(expected.locators), record.surface_id + ' exact locator/disposition/owner drift');
    check(record.evidence_receipt === 'artifacts/functional-laptop/reframes/reference-core/surfaces/' + record.surface_id + '.json' && record.review_receipts.length === 4, record.surface_id + ' receipt drift');
  }
  check(plan.capstones.length === 2 && plan.capstones[0].chapter_id === constants.capstones[0].chapter_id && plan.capstones[1].chapter_id === constants.capstones[1].chapter_id, 'capstone drift');
  for (const capstone of plan.capstones) for (const field of ['execution_step','profile_id','config_identity','threshold_registry','honest_limit']) check(typeof capstone[field] === 'string' && capstone[field].trim(), capstone.chapter_id + ' capstone missing ' + field);
  exactArray(plan.implementation_steps, constants.queue_ids, 'immutable 66-step base queue');
  deepEqual(plan.conditional_postgresql, {
    protocol_status: 'measurement-gated-immutable-protocol',
    measurement_chapter: '85-persistence-scale-decision',
    default_backend: 'bounded-in-memory-filesystem-exact-top-k',
    mandatory_dependency: false,
    measurement_receipt_path: constants.postgresql_measurement_receipt_contract.path,
    measurement_receipt_schema_version: constants.postgresql_measurement_receipt_contract.schema_version,
    selection_rule: constants.postgresql_measurement_receipt_contract.selection_rule,
    initial_step_count: 66,
    selected_step_count: 70,
    lifecycle_modes: constants.conditional_postgresql.lifecycle_modes,
    measurement_receipt_contract: constants.conditional_postgresql.measurement_receipt_contract,
    selected_steps: constants.conditional_postgresql.selected_steps,
    selected_step_records: constants.conditional_postgresql.selected_step_records,
    selected_order: constants.conditional_postgresql.selected_order,
    selected_preclosure: constants.conditional_postgresql.selected_preclosure,
    chapter85_content_templates: constants.conditional_postgresql.chapter85_content_templates
  }, 'immutable PostgreSQL measurement/selected-state protocol');
  check(plan.closure_step_id === constants.closure_step_id && plan.closure_depends_on === constants.closure_depends_on, 'plan closure drift');
  const bodyHeadings = ['## 1. Reference-core handoff','## 2. Fixed autoregressive model scope','## 3. Scale ladder and resource formulas','## 4. Rust architecture and private prepared-input seam','## 5. Learner modules 40–85','## 6. Two capstones','## 7. Review, adjudication, localization, and Firefox publication','## 8. Conditional PostgreSQL and pgvector decision','## 9. Exact implementation queue and closure dependency','## 10. Exact coverage and ownership maps','## 11. Production-scale boundary and explicit exclusions'];
  let bodyPosition = -1;
  for (const heading of bodyHeadings) { const next = planBody.indexOf(heading); check(next > bodyPosition, 'plan body heading missing/order drift ' + heading); bodyPosition = next; }
  for (const token of ['1,188, 8,304, 32,514,560, and 69,500,936,192','Only text-token-ids and cached-text-token may produce PreparedDecoderInput','two independent reviews','direct Russian localization','audit-functional-successor-preclosure','no general-purpose, production-scale or state-of-the-art claim','66-step linear base queue','External model selection occurs only after Chapter 80','closed selection step may perform only the bounded official-metadata candidate-admission protocol']) check(planBody.includes(token), 'plan body semantic projection missing ' + token);
  assertNoPositiveModelAuthorization(planBody,'plan body');
  assertNoPositiveModelAuthorization(plan.chapters.map((chapter) => ({chapter_id:chapter.chapter_id,outcome:chapter.outcome,scope_boundary:chapter.scope_boundary,rust_contribution:chapter.rust_contribution,practice:chapter.practice,integration_evidence:chapter.integration_evidence,handoff:chapter.handoff})),'structured chapter records');
  const pgAuthorization = /(?:PostgreSQL|pgvector)[^.\n]{0,100}\b(?:mandatory|required|default|always used|every chapter)/ig;
  for (const match of planBody.matchAll(pgAuthorization)) {
    const clauseStart = Math.max(planBody.lastIndexOf('.', match.index) + 1, planBody.lastIndexOf(';', match.index) + 1);
    const clause = planBody.slice(clauseStart, match.index + match[0].length);
    check(/\b(no|not|never|without|optional|conditional|unselected|only if|after measurement|cannot|does not|do not)\b/i.test(clause), 'plan body makes PostgreSQL/pgvector mandatory/default: ' + match[0]);
  }
}

function validatePostgresqlMeasurementReceipt(root, constants, chapter85Step = null) {
  assertEmbeddedConstants(constants, 'PostgreSQL measurement validation');
  const contract = constants.postgresql_measurement_receipt_contract;
  const specFile = readBounded(root, contract.spec_path, 'persistence measurement spec', 1048576);
  const spec = parseJsonExact(specFile.text, 'persistence measurement spec');
  deepEqual(spec, contract.measurement_spec, 'persistence measurement immutable spec');
  const preflightFile = readBounded(root, contract.preflight_receipt_path, 'persistence measurement preflight receipt', 1048576);
  const preflight = parseJsonExact(preflightFile.text, 'persistence measurement preflight receipt');
  exactSet(Object.keys(preflight), contract.preflight_required_fields, 'persistence measurement preflight fields');
  check(preflight.schema_version === 2 && preflight.spec_sha256 === specFile.hash, 'persistence preflight spec binding drift');
  check(typeof preflight.run_id === 'string' && /^[0-9]{8}T[0-9]{6}Z-[a-z0-9-]+-[0-9]{2}$/.test(preflight.run_id), 'persistence preflight run identity invalid');
  const declaredNeed = preflight.declared_need;
  check(isRecord(declaredNeed), 'persistence preflight declared_need missing');
  exactSet(Object.keys(declaredNeed),contract.declared_need_contract.required_fields,'persistence preflight declared_need fields');
  const declaredKind = contract.declared_need_contract.kinds[declaredNeed.kind];
  check(declaredKind && contract.declared_need_contract.exactly_one_kind === true, 'persistence preflight must declare exactly one accepted need kind');
  deepEqual({metric:declaredNeed.metric,threshold:declaredNeed.threshold,unit:declaredNeed.unit},declaredKind,'persistence preflight declared threshold/unit');
  check(declaredNeed.run_id === preflight.run_id && declaredNeed.spec_sha256 === specFile.hash, 'persistence declared need run/spec identity drift');
  const declaredAt = Date.parse(declaredNeed.declared_at);
  const preflightAt = Date.parse(preflight.recorded_at);
  check(Number.isFinite(declaredAt) && Number.isFinite(preflightAt) && declaredAt <= preflightAt, 'persistence declared need must precede the immutable preflight receipt');
  for (const field of ['affinity','power','warmup','cache','process_inventory']) deepEqual(preflight[field], contract.measurement_spec[field + '_policy'], 'persistence resolved preflight ' + field);
  const file = readBounded(root, contract.path, 'persistence decision receipt', 1048576);
  const receipt = parseJsonExact(file.text, 'PostgreSQL measurement receipt');
  exactSet(Object.keys(receipt), contract.required_fields, 'PostgreSQL measurement receipt fields');
  check(receipt.schema_version === contract.schema_version && receipt.chapter_id === contract.chapter_id && receipt.producer_step === contract.producer_step, 'PostgreSQL receipt producer identity drift');
  check(receipt.spec_sha256 === specFile.hash && receipt.preflight_receipt_sha256 === preflightFile.hash, 'PostgreSQL receipt spec/preflight byte binding drift');
  deepEqual(receipt.workload, contract.workload, 'PostgreSQL receipt workload');
  const measurementStartedAt = Date.parse(receipt.measurement_started_at);
  check(Number.isFinite(measurementStartedAt) && measurementStartedAt >= preflightAt && measurementStartedAt >= declaredAt, 'persistence measurement must start only after the immutable declared-need preflight');
  check(isRecord(receipt.environment), 'PostgreSQL receipt environment missing');
  exactSet(Object.keys(receipt.environment), contract.frozen_environment_fields, 'PostgreSQL receipt frozen environment fields');
  deepEqual(receipt.environment, Object.fromEntries(contract.frozen_environment_fields.map((field) => [field,preflight[field]])), 'PostgreSQL receipt exact resolved preflight environment');
  check(Array.isArray(receipt.repetitions) && receipt.repetitions.length === 3, 'PostgreSQL receipt must contain exactly three repetitions');
  const metricNames = ['single_client_warm_p95_ms','concurrency_16_p95_ms','peak_rss_bytes','restart_recovery_seconds'];
  const crossingCounts = Object.fromEntries(metricNames.map((name) => [name, 0]));
  for (let index = 0; index < receipt.repetitions.length; index += 1) {
    const repetition = receipt.repetitions[index];
    exactSet(Object.keys(repetition), ['repetition','metrics','crossed_thresholds'], 'PostgreSQL repetition ' + (index + 1) + ' fields');
    check(repetition.repetition === index + 1, 'PostgreSQL repetition order drift');
    check(isRecord(repetition.metrics), 'PostgreSQL repetition metrics missing');
    exactSet(Object.keys(repetition.metrics), metricNames, 'PostgreSQL repetition metric names');
    const computed = [];
    for (const name of metricNames) {
      const value = repetition.metrics[name];
      check(typeof value === 'number' && Number.isFinite(value) && value >= 0, 'PostgreSQL repetition invalid metric ' + name);
      if (value > contract.thresholds[name]) {
        computed.push(name);
        crossingCounts[name] += 1;
      }
    }
    exactArray(repetition.crossed_thresholds, computed, 'PostgreSQL repetition crossed thresholds');
  }
  check(Number.isSafeInteger(receipt.actual_concurrent_writers) && receipt.actual_concurrent_writers >= 0, 'PostgreSQL receipt concurrent-writer count invalid');
  check(typeof receipt.file_snapshot_atomic_requirement_unsatisfied === 'boolean' && receipt.file_snapshot_limit_evidence_path === contract.file_snapshot_limit_evidence_path && typeof receipt.file_snapshot_limit_evidence_sha256 === 'string' && /^[0-9a-f]{64}$/.test(receipt.file_snapshot_limit_evidence_sha256), 'PostgreSQL file-snapshot atomic-requirement evidence identity invalid');
  const evidenceContract = contract.file_snapshot_limit_evidence_contract;
  const inventoryContract = contract.file_snapshot_output_inventory_contract;
  const inventoryFile = readBounded(root,contract.file_snapshot_output_inventory_path,'PostgreSQL file-snapshot output inventory',4194304);
  const inventory = parseJsonExact(inventoryFile.text,'PostgreSQL file-snapshot output inventory');
  check(inventoryFile.text === canonicalJson(inventory), 'PostgreSQL file-snapshot output inventory is not canonical JSON');
  exactSet(Object.keys(inventory),inventoryContract.required_fields,'PostgreSQL file-snapshot output inventory fields');
  check(inventory.schema_version === inventoryContract.schema_version && inventory.chapter_id === contract.chapter_id && inventory.producer_step === contract.producer_step && inventory.run_id === preflight.run_id && inventory.runner_target === contract.runner_target && inventory.workload_sha256 === sha256(Buffer.from(canonicalJson(contract.workload))) && inventory.executed_concurrency_point === evidenceContract.executed_concurrency_point && Array.isArray(inventory.files), 'PostgreSQL file-snapshot output inventory producer/run/workload/concurrency identity drift');
  const inventoryRoles = Object.keys(inventoryContract.role_to_path);
  exactArray(inventory.files.map((record) => record.role),inventoryRoles,'PostgreSQL file-snapshot output inventory role order');
  unique(inventory.files.map((record) => record.path),'PostgreSQL file-snapshot output inventory paths');
  for (const record of inventory.files) {
    exactSet(Object.keys(record),inventoryContract.file_fields,'PostgreSQL file-snapshot output inventory file fields');
    check(record.path === inventoryContract.role_to_path[record.role] && Number.isSafeInteger(record.bytes) && record.bytes > 0 && /^[0-9a-f]{64}$/.test(record.sha256), 'PostgreSQL file-snapshot output inventory file identity invalid ' + record.role);
  }
  const computedSnapshotInventorySha256 = sha256(Buffer.from(inventory.files.map((record) => `${record.path}\t${record.bytes}\t${record.sha256}\n`).join('')));
  check(inventory.inventory_sha256 === computedSnapshotInventorySha256 && inventory.fsync_complete === true && inventory.atomic_rename_complete === true, 'PostgreSQL file-snapshot output inventory hash/publication drift');
  const traceContract = contract.file_snapshot_writer_trace_contract;
  const transcriptContract = contract.file_snapshot_state_transcript_contract;
  const traceFile = readBounded(root,traceContract.path,'PostgreSQL writer-operation trace',inventoryContract.max_file_bytes);
  const transcriptFile = readBounded(root,transcriptContract.path,'PostgreSQL snapshot-state transcript',inventoryContract.max_file_bytes);
  const inventoryByRole = new Map(inventory.files.map((record) => [record.role,record]));
  for (const [role,canonicalPath,observed] of [
    ['writer-operation-trace',traceContract.path,traceFile],
    ['snapshot-state-transcript',transcriptContract.path,transcriptFile]
  ]) {
    const record = inventoryByRole.get(role);
    check(record && record.path === canonicalPath && record.bytes === observed.bytes.length && record.sha256 === observed.hash, 'PostgreSQL file-snapshot output inventory does not bind exact ' + role + ' bytes');
  }
  const trace = parseJsonExact(traceFile.text,'PostgreSQL writer-operation trace');
  check(traceFile.text === canonicalJson(trace), 'PostgreSQL writer-operation trace is not canonical JSON');
  exactSet(Object.keys(trace),traceContract.required_fields,'PostgreSQL writer-operation trace fields');
  check(trace.schema_version === traceContract.schema_version && trace.chapter_id === contract.chapter_id && trace.producer_step === contract.producer_step && trace.run_id === preflight.run_id && trace.runner_target === contract.runner_target && trace.workload_sha256 === sha256(Buffer.from(canonicalJson(contract.workload))) && trace.declared_need_sha256 === sha256(Buffer.from(canonicalJson(declaredNeed))) && trace.executed_concurrency_point === evidenceContract.executed_concurrency_point && trace.actual_concurrent_writers === evidenceContract.executed_concurrency_point && trace.schedule_id === traceContract.schedule_id && trace.target_transaction_id === traceContract.target_transaction_id && trace.fsync_complete === true && trace.atomic_rename_complete === true, 'PostgreSQL writer-operation trace producer/run/workload/schedule identity drift');
  check(Array.isArray(trace.writers) && trace.writers.length === traceContract.exact_writer_ids.length, 'PostgreSQL writer-operation trace writer inventory drift');
  exactArray(trace.writers.map((writer) => writer.writer_id),traceContract.exact_writer_ids,'PostgreSQL writer-operation trace writer order');
  unique(trace.writers.map((writer) => writer.writer_id),'PostgreSQL writer-operation trace writer IDs');
  for (const writer of trace.writers) {
    exactSet(Object.keys(writer),traceContract.writer_fields,'PostgreSQL writer-operation trace writer fields');
    check(Number.isSafeInteger(writer.start_sequence) && writer.start_sequence >= 1, 'PostgreSQL writer-operation trace writer start sequence invalid');
  }
  check(Array.isArray(trace.events) && trace.events.length >= trace.writers.length + 2 && trace.events.length <= 1024, 'PostgreSQL writer-operation trace event count invalid');
  for (let index = 0; index < trace.events.length; index += 1) {
    const event = trace.events[index];
    exactSet(Object.keys(event),traceContract.event_fields,'PostgreSQL writer-operation trace event fields');
    check(event.sequence === index + 1 && traceContract.event_kinds.includes(event.kind) && typeof event.durable === 'boolean', 'PostgreSQL writer-operation trace event sequence/kind/durability invalid');
    check(traceContract.exact_writer_ids.includes(event.writer_id) || (event.kind === traceContract.terminal_event_kind && event.writer_id === 'system'), 'PostgreSQL writer-operation trace event writer invalid');
    for (const field of ['vector_generation_or_absent','authorization_generation_or_absent']) check(event[field] === 'absent' || (Number.isSafeInteger(event[field]) && event[field] >= 0), 'PostgreSQL writer-operation trace generation invalid');
  }
  for (const writer of trace.writers) {
    const starts = trace.events.filter((event) => event.kind === 'writer-start' && event.writer_id === writer.writer_id);
    check(starts.length === 1 && starts[0].sequence === writer.start_sequence && starts[0].transaction_id === 'absent' && starts[0].vector_generation_or_absent === 'absent' && starts[0].authorization_generation_or_absent === 'absent', 'PostgreSQL writer-operation trace writer-start identity drift');
  }
  const crashes = trace.events.filter((event) => event.kind === traceContract.terminal_event_kind);
  check(crashes.length === 1 && crashes[0] === trace.events.at(-1) && crashes[0].writer_id === 'system' && crashes[0].transaction_id === 'absent' && crashes[0].vector_generation_or_absent === 'absent' && crashes[0].authorization_generation_or_absent === 'absent', 'PostgreSQL writer-operation trace terminal crash event drift');
  const targetVectorCommits = trace.events.filter((event) => event.kind === 'vector-snapshot-commit' && event.transaction_id === traceContract.target_transaction_id && event.sequence < crashes[0].sequence && event.durable === true);
  const targetAuthorizationCommits = trace.events.filter((event) => event.kind === 'authorization-snapshot-commit' && event.transaction_id === traceContract.target_transaction_id && event.sequence < crashes[0].sequence && event.durable === true);
  check(targetVectorCommits.length === 1 && Number.isSafeInteger(targetVectorCommits[0].vector_generation_or_absent) && targetVectorCommits[0].authorization_generation_or_absent === 'absent' && targetAuthorizationCommits.length === 0, 'PostgreSQL writer-operation trace does not prove the frozen vector-before-authorization crash schedule');
  const transcript = parseJsonExact(transcriptFile.text,'PostgreSQL snapshot-state transcript');
  check(transcriptFile.text === canonicalJson(transcript), 'PostgreSQL snapshot-state transcript is not canonical JSON');
  exactSet(Object.keys(transcript),transcriptContract.required_fields,'PostgreSQL snapshot-state transcript fields');
  check(transcript.schema_version === transcriptContract.schema_version && transcript.chapter_id === contract.chapter_id && transcript.producer_step === contract.producer_step && transcript.run_id === preflight.run_id && transcript.runner_target === contract.runner_target && transcript.schedule_id === traceContract.schedule_id && transcript.writer_operation_trace_path === traceContract.path && transcript.writer_operation_trace_sha256 === traceFile.hash && transcript.crash_after_sequence === crashes[0].sequence && transcript.recovery_completed === true && transcript.snapshot_fsync_complete === true && transcript.recovered_vector_transaction_id === traceContract.target_transaction_id && transcript.recovered_authorization_transaction_id_or_absent === transcriptContract.absent_value && transcript.recovered_vector_generation === targetVectorCommits[0].vector_generation_or_absent && transcript.recovered_authorization_generation_or_absent === transcriptContract.absent_value && transcript.vector_and_authorization_same_transaction === false && transcript.relational_constraint_satisfied === false && transcript.bounded_limits_respected === true && transcript.fsync_complete === true && transcript.atomic_rename_complete === true, 'PostgreSQL snapshot-state transcript does not prove the exact recovered mismatch under the frozen bounded crash schedule');
  const derivedMechanicalChecks = {
    atomic_vector_write:false,
    authorization_same_transaction:transcript.vector_and_authorization_same_transaction,
    relational_constraint:transcript.relational_constraint_satisfied,
    crash_consistent_snapshot:transcript.recovery_completed && transcript.snapshot_fsync_complete,
    bounded_limits_respected:transcript.bounded_limits_respected
  };
  const evidenceFile = readBounded(root,evidenceContract.path,'PostgreSQL file-snapshot limitation evidence',4194304);
  const evidence = parseJsonExact(evidenceFile.text,'PostgreSQL file-snapshot limitation evidence');
  check(evidenceFile.text === canonicalJson(evidence) && evidenceFile.hash === receipt.file_snapshot_limit_evidence_sha256, 'PostgreSQL decision does not bind exact canonical file-snapshot limitation evidence bytes');
  exactSet(Object.keys(evidence),evidenceContract.required_fields,'PostgreSQL file-snapshot limitation evidence fields');
  const sourceFile = hashRegularFile(resolveInside(root,evidenceContract.source_path,'PostgreSQL file-snapshot oracle source'));
  check(evidence.schema_version === evidenceContract.schema_version && evidence.chapter_id === contract.chapter_id && evidence.producer_step === contract.producer_step && evidence.run_id === preflight.run_id && evidence.runner_target === contract.runner_target && evidence.spec_sha256 === specFile.hash && evidence.preflight_receipt_sha256 === preflightFile.hash && evidence.declared_need_sha256 === sha256(Buffer.from(canonicalJson(declaredNeed))) && evidence.file_snapshot_source_path === evidenceContract.source_path && evidence.file_snapshot_source_sha256 === sourceFile.sha256 && evidence.file_snapshot_output_inventory_path === inventoryContract.path && evidence.file_snapshot_output_inventory_sha256 === inventoryFile.hash && evidence.writer_operation_trace_path === traceContract.path && evidence.writer_operation_trace_sha256 === traceFile.hash && evidence.snapshot_state_transcript_path === transcriptContract.path && evidence.snapshot_state_transcript_sha256 === transcriptFile.hash, 'PostgreSQL file-snapshot limitation evidence spec/preflight/declaration/source/output/trace/transcript/run identity drift');
  deepEqual(evidence.workload,contract.workload,'PostgreSQL file-snapshot limitation evidence workload');
  check(evidence.executed_concurrency_point === evidenceContract.executed_concurrency_point && evidence.actual_concurrent_writers === receipt.actual_concurrent_writers && evidence.requirement_id === evidenceContract.requirement_id, 'PostgreSQL file-snapshot limitation evidence writer point/count/requirement drift');
  exactSet(Object.keys(evidence.mechanical_checks),evidenceContract.mechanical_check_fields,'PostgreSQL file-snapshot limitation mechanical check fields');
  deepEqual(derivedMechanicalChecks,evidenceContract.mechanical_checks_expected,'PostgreSQL mechanically derived file-snapshot limitation checks');
  deepEqual(evidence.mechanical_checks,derivedMechanicalChecks,'PostgreSQL file-snapshot limitation evidence mechanical checks are not derived from the retained trace/transcript bytes');
  check(evidence.requirement_unsatisfied === true && evidence.result === evidenceContract.result && evidence.fsync_complete === true && evidence.atomic_rename_complete === true && receipt.file_snapshot_atomic_requirement_unsatisfied === evidence.requirement_unsatisfied, 'PostgreSQL file-snapshot limitation result/publication/decision drift');
  if (chapter85Step) {
    const finalRun = chapter85Step.runs.at(-1);
    check(finalRun && (finalRun.status === 'succeeded' || (chapter85Step.status === 'running' && finalRun.status === 'running')) && finalRun.run_id === preflight.run_id, 'PostgreSQL file-snapshot limitation evidence does not belong to the exact current running/succeeded Ch85 run');
    const artifacts = new Map(finalRun.artifacts.map((artifact) => [artifact.path,artifact.sha256]));
    check(artifacts.get(contract.preflight_receipt_path) === preflightFile.hash && artifacts.get(traceContract.path) === traceFile.hash && artifacts.get(transcriptContract.path) === transcriptFile.hash && artifacts.get(inventoryContract.path) === inventoryFile.hash && artifacts.get(evidenceContract.path) === evidenceFile.hash && artifacts.get(contract.path) === file.hash, 'PostgreSQL current Ch85 run does not hash-bind the exact preflight/trace/transcript/output-inventory/limitation-evidence/decision phase bytes');
  }
  const qualifyingMetrics = metricNames.filter((name) => crossingCounts[name] >= 2);
  const declaredNumericMetric = declaredNeed.kind === 'atomic_vector_authorization_writers' ? null : declaredNeed.metric;
  const declaredNumericSelected = declaredNumericMetric !== null && crossingCounts[declaredNumericMetric] >= 2;
  const writerNeed = declaredNeed.kind === 'atomic_vector_authorization_writers' && receipt.actual_concurrent_writers >= contract.thresholds.concurrent_writers && evidence.actual_concurrent_writers >= contract.thresholds.concurrent_writers && evidence.requirement_unsatisfied === true && receipt.file_snapshot_atomic_requirement_unsatisfied === true;
  const computedSelected = declaredNumericSelected || writerNeed;
  check(receipt.selected === computedSelected, 'persistence decision selected flag does not match the one predeclared trigger');
  if (!computedSelected) {
    check(receipt.trigger_kind === 'none' && receipt.crossed_threshold === null, 'measured-local receipt must carry trigger_kind=none and crossed_threshold=null');
  } else if (receipt.trigger_kind === 'two-of-three-threshold-crossing') {
    check(declaredNumericSelected && receipt.crossed_threshold === declaredNumericMetric, 'PostgreSQL numeric trigger must be the one predeclared metric');
    check(crossingCounts[declaredNumericMetric] >= 2, 'PostgreSQL predeclared numeric trigger does not cross its own threshold in at least two of three repetitions');
  } else if (receipt.trigger_kind === 'four-writer-atomic-vector-authorization-need') {
    check(receipt.crossed_threshold === 'concurrent_writers', 'PostgreSQL writer trigger identity drift');
    check(writerNeed, 'PostgreSQL writer trigger lacks the predeclared at-least-four-writer need plus file-snapshot inability evidence');
  } else fail('PostgreSQL receipt trigger kind invalid');
  return { receipt, hash: file.hash, crossingCounts, qualifyingMetrics, declaredNeed, declaredNumericSelected, writerNeed };
}

const authoritativeValidateState = (...args) => { assertPublishedDesignBundle('exported validateState'); return validateState(...args); };
const authoritativeValidateAccepted = (...args) => { assertPublishedDesignBundle('exported validateAccepted'); return validateAccepted(...args); };
const authoritativeValidateChapterRecords = (...args) => { assertPublishedDesignBundle('exported validateChapterRecords'); return validateChapterRecords(...args); };
const authoritativeValidateCoverage = (...args) => { assertPublishedDesignBundle('exported validateCoverage'); return validateCoverage(...args); };
const authoritativeValidatePlan = (...args) => { assertPublishedDesignBundle('exported validatePlan'); return validatePlan(...args); };
const authoritativeValidatePostgresqlMeasurementReceipt = (...args) => { assertPublishedDesignBundle('exported validatePostgresqlMeasurementReceipt'); return validatePostgresqlMeasurementReceipt(...args); };
const authoritativeValidateQueue = (...args) => { assertPublishedDesignBundle('exported validateQueue'); return validateQueue(...args); };
const authoritativeValidateResource = (...args) => { assertPublishedDesignBundle('exported validateResource'); return validateResource(...args); };
const authoritativeValidateSchema = (...args) => { assertPublishedDesignBundle('exported validateSchema'); return validateSchema(...args); };

export {
  buildBootstrapInputFingerprint,
  effectiveExecutionConstants,
  inputReceiptPaths,
  inputCacheReceiptPaths,
  closedCommandRepoPaths,
  repoPathTokens,
  pathInventory,
  canonicalJson,
  findReceiptCacheIdentity,
  assertSelectedModelBinding,
  validateVisualDiagnosticsPolicy,
  validateExecutionCompatibilityState,
  parseFrontmatter,
  parseJsonExact,
  readBounded,
  authoritativeValidateState as validateState,
  authoritativeValidateAccepted as validateAccepted,
  authoritativeValidateChapterRecords as validateChapterRecords,
  authoritativeValidateCoverage as validateCoverage,
  authoritativeValidatePlan as validatePlan,
  authoritativeValidatePostgresqlMeasurementReceipt as validatePostgresqlMeasurementReceipt,
  authoritativeValidateQueue as validateQueue,
  authoritativeValidateResource as validateResource,
  authoritativeValidateSchema as validateSchema
};

function validateCurrentCorpusMigration(root,args) {
  const file=readBounded(root,args['--plan']||DEFAULTS.plan,'extension plan',8388608);
  const parsed=parseFrontmatter(file.text,'extension plan');
  if(parsed.data.plan_revision!==2)return false;
  check(!args['--constants']&&!args['--schema']&&!args['--queue']&&!args['--records'],'revision2 uses its closed current amendment, not alternative design inputs');
  const compatibility=parseJsonExact(readBounded(root,'configs/functional-execution-compatibility-v6.json','corpus compatibility',1048576).text,'corpus compatibility');
  check(compatibility.schema_version===1&&compatibility.compatibility_id==='functional-corpus-preparation-compatibility-v6','current corpus compatibility identity drift');
  check(compatibility.historical_compatibility_path==='configs/functional-execution-compatibility-v5.json','historical compatibility location drift');
  check(hashRegularFile(resolve(root,compatibility.historical_compatibility_path)).sha256===compatibility.historical_compatibility_sha256,'v5 historical compatibility byte drift');
  check(compatibility.origin_plan_sha256===PUBLISHED_EXTENSION_PLAN_SHA256&&jsonDigest(EMBEDDED_PLAN_DATA)===compatibility.origin_plan_projection_sha256,'historical plan binding drift');
  check(jsonDigest(compatibility.delta)==='83acab726c0d03f9818cd397d3ca5e6800470167dd564de1291b3cd1f6f8d0cd','frozen root-owned corpus semantic delta drift');
  validateCurrentCorpusPlan(parsed.data,EMBEDDED_PLAN_DATA,compatibility.delta);
  check(jsonDigest(parsed.data)===compatibility.current_plan_projection_sha256,'current plan projection binding drift');
  // The original external audit/source/resource inputs retain their frozen bytes.
  const accepted=validateAccepted(root,EMBEDDED_CONSTANTS,args);
  validateCoverage(accepted.coverage_sha256.text,accepted.requirements_sha256.text,EMBEDDED_CONSTANTS);
  validateResource(accepted.resource_contract_sha256.text,EMBEDDED_CONSTANTS);
  const document=parseStateYaml(readBounded(root,args['--state']||DEFAULTS.state,'BUILD_STATE',67108864).text,root);
  const historical=document.builds.find(build=>build.build_id===compatibility.origin_build_id);
  check(historical,'historical extension build missing');
  const projection=historical.steps.map(({id,depends_on,status})=>({id,depends_on,status}));
  deepEqual(projection,compatibility.historical_queue_projection,'historical queue/status projection must not be relabeled');
  const current=document.builds.flatMap(build=>build.steps.map(step=>({build,step}))).filter(record=>record.step.id===CORPUS_MIGRATION_STEP);
  check(current.length===1&&['running','completed','pending'].includes(current[0].step.status),'actual current migration record missing/ambiguous');
  validateCurrentCorpusQueue(document,parsed.data);
  const held=document.builds.flatMap(build=>build.steps).filter(step=>step.id==='repair-ch06-symbol-table-and-ch08-ch10-learning-surfaces');
  check(held.length===1&&held[0].status==='pending','held existing-chapter repairs changed');
  const manifest=parseJsonExact(readBounded(root,'site/src/i18n/functional-chapter-locales.json','current locale manifest',1048576).text,'current locale manifest');
  check(manifest.planRevision===2&&manifest.chapters.length===44,'current locale revision/count drift');
  deepEqual(manifest.chapters,parsed.data.chapters.map((chapter,index)=>({chapterId:chapter.chapter_id,order:chapter.order,activeLocales:['en']})),'current English-first locale projection');
  const inventory=parseJsonExact(readBounded(root,'curriculum/future-chapter-plans/index.json','current packet inventory',1048576).text,'current packet inventory');
  check(inventory.chapters.length===44&&inventory.current_plan_revision===2,'current packet revision/count drift');
  for(let index=0;index<44;index++){
    const packet=inventory.chapters[index],chapter=parsed.data.chapters[index];
    check(packet.id===chapter.chapter_id&&packet.number===chapter.order&&packet.status==='planning-ready','current packet ID/order/status drift');
    check(packet.planned_packet===chapter.chapter_id+'.md','current packet path drift');
    readBounded(root,'curriculum/future-chapter-plans/'+packet.planned_packet,'current packet',262144);
  }
  console.log('Functional current plan valid:44chapters(40–83),79capabilities; explicit NeMo/reader revision2 delta; original v1–v5 audit/resource/history preserved.');
  console.error('Limit: structural identity checks do not prove teaching/review quality, GPU correctness or full-corpus rights/privacy/overlap release. Bulk preparation remains separately pending.');
  return true;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = realpathSync(resolve(args['--root'] || DEFAULT_ROOT));
  if(validateCurrentCorpusMigration(root,args))return;
  const externalNames = [['--constants','constants',8388608],['--schema','schema',2097152],['--queue','queue',8388608],['--records','chapter records',4194304]];
  const externalFlags = externalNames.filter(([flag]) => args[flag]);
  check(externalFlags.length === 0 || externalFlags.length === externalNames.length, 'staged constants/schema/queue/records flags must be supplied together');
  const expectedNames = [['--expected-constants-sha256','constants'],['--expected-schema-sha256','schema'],['--expected-queue-sha256','queue'],['--expected-records-sha256','chapter records'],['--expected-plan-sha256','extension plan']];
  const expectedFlags = expectedNames.filter(([flag]) => args[flag]);
  check(expectedFlags.length === 0 || expectedFlags.length === expectedNames.length, 'all five explicit expected SHA-256 flags must be supplied together');
  const isComposed = PUBLISHED_EXTENSION_PLAN_SHA256 !== null;
  if (!isComposed) check(externalFlags.length === externalNames.length && expectedFlags.length === expectedNames.length, 'prepublication checker requires all staged design artifacts and their independently computed expected SHA-256 values');
  const externalFiles = new Map(externalFlags.map(([flag,label,limit]) => [label,readBounded(root,args[flag],label,limit)]));
  const constants = externalFiles.size ? parseJsonExact(externalFiles.get('constants').text, 'constants') : EMBEDDED_CONSTANTS;
  const schema = externalFiles.size ? parseJsonExact(externalFiles.get('schema').text, 'schema') : EMBEDDED_SCHEMA;
  const queue = externalFiles.size ? parseJsonExact(externalFiles.get('queue').text, 'queue') : EMBEDDED_QUEUE;
  const chapterRecords = externalFiles.size ? parseJsonExact(externalFiles.get('chapter records').text, 'chapter records') : EMBEDDED_CHAPTER_RECORDS;
  check(constants && schema && queue && chapterRecords, 'checker was not published with embedded frozen constants/schema/queue/chapter records');
  const publishedSourceHashes = {
    constants: PUBLISHED_CONSTANTS_SHA256 ?? args['--expected-constants-sha256'],
    schema: PUBLISHED_SCHEMA_SHA256 ?? args['--expected-schema-sha256'],
    queue: PUBLISHED_QUEUE_SHA256 ?? args['--expected-queue-sha256'],
    'chapter records': PUBLISHED_CHAPTER_RECORDS_SHA256 ?? args['--expected-records-sha256']
  };
  for (const [label,value] of Object.entries(publishedSourceHashes)) {
    check(typeof value === 'string' && /^[0-9a-f]{64}$/.test(value), label + ' immutable SHA-256 binding missing');
    const actual = externalFiles.size ? externalFiles.get(label).hash : sha256(publishedJsonBytes(label === 'constants' ? constants : label === 'schema' ? schema : label === 'queue' ? queue : chapterRecords));
    check(actual === value, label + ' exact-byte SHA-256 drift: ' + actual);
  }
  if (isComposed && expectedFlags.length) for (const [flag,label] of expectedNames.slice(0,4)) check(args[flag] === publishedSourceHashes[label], flag + ' disagrees with the composed immutable identity');
  validateChapterRecords(chapterRecords, constants);
  const accepted = validateAccepted(root, constants, args);
  const coverageData = validateCoverage(accepted.coverage_sha256.text, accepted.requirements_sha256.text, constants);
  check(JSON.stringify(parseAcceptedSourceRegister(accepted.requirements_sha256.text)) === JSON.stringify(constants.accepted_source_register), 'accepted 104-source register projection drift');
  validateResource(accepted.resource_contract_sha256.text, constants);
  validateSchema(schema, constants);
  validateQueue(queue, constants, root);
  const planFile = readBounded(root, args['--plan'] || DEFAULTS.plan, 'extension plan', 8388608);
  const publishedPlanSha256 = PUBLISHED_EXTENSION_PLAN_SHA256 ?? args['--expected-plan-sha256'];
  check(typeof publishedPlanSha256 === 'string' && /^[0-9a-f]{64}$/.test(publishedPlanSha256), 'checker lacks the one-way published extension-plan SHA-256 binding');
  if (isComposed && args['--expected-plan-sha256']) check(args['--expected-plan-sha256'] === publishedPlanSha256, '--expected-plan-sha256 disagrees with the composed immutable identity');
  check(planFile.hash === publishedPlanSha256, 'published extension plan exact-byte SHA-256 drift: ' + planFile.hash);
  const parsedPlan = parseFrontmatter(planFile.text, 'extension plan');
  const expectedDesignIdentities = {
    constants_sha256: publishedSourceHashes.constants,
    schema_sha256: publishedSourceHashes.schema,
    queue_sha256: publishedSourceHashes.queue,
    chapter_records_sha256: publishedSourceHashes['chapter records'],
    chapter_projection_sha256: sha256(publishedJsonBytes(parsedPlan.data.chapters))
  };
  deepEqual(parsedPlan.data.design_input_identities, expectedDesignIdentities, 'plan immutable design-input identity closure');
  const coursePlanFile = readBounded(root, args['--course-plan'] || DEFAULTS.coursePlan, 'course plan', 4194304);
  const readmeFile = readBounded(root, args['--readme'] || DEFAULTS.readme, 'curriculum README', 1048576);
  validatePlan(parsedPlan.data, parsedPlan.body, schema, constants, accepted, coverageData, coursePlanFile, readmeFile, root);
  const state = readBounded(root, args['--state'] || DEFAULTS.state, 'BUILD_STATE', 67108864).text;
  validateState(state, queue, constants, { root, initialPublication: args['--initial-publication'] === true, publishedPlanSha256 });
  console.log('Functional laptop plan valid: 46 chapters (40-85), 79 capabilities, immutable 66-step base / 70-step measured-selected protocol, 2 capstones.');
  console.error('Limit: deterministic checks do not prove technical/pedagogical correctness, review substance, language quality, GPU correctness, generalization, safety, or production readiness.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error('Functional laptop candidate invalid: ' + error.message);
    process.exitCode = 1;
  }
}
