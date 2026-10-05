#!/usr/bin/env node
// Operational promotion of the accepted Ch17 run04 locale route mechanism.
// Semantic records are never rewritten; maintained localization verify remains
// mandatory for schema, source/target coverage and publication identity.
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROLES = ['bilingual', 'target-only'];
const SCHEMA = '.agents/skills/localize-llm-course/references/review-record.schema.json';
const TOOL = '.agents/skills/localize-llm-course/scripts/localization-review.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = message => { throw new Error(message); };
function closed(value, fields, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).sort().join('\0') !== [...fields].sort().join('\0')) fail(`${label}: closed keys required`);
}
function relative(path) {
  if (typeof path !== 'string' || !path || path.includes('\\') || path.split('/').some(part => !part || part === '.' || part === '..')) fail('unsafe repository-relative path');
  return path;
}
function inspect(root, path, type, allowMissing = false) {
  let full = resolve(root);
  const parts = relative(path).split('/');
  for (const [index, part] of parts.entries()) {
    full = resolve(full, part);
    let stat;
    try { stat = lstatSync(full); } catch (error) {
      if (error.code === 'ENOENT' && allowMissing) return resolve(root, path);
      throw error;
    }
    if (stat.isSymbolicLink() || (index === parts.length - 1 ? type === 'file' ? !stat.isFile() : !stat.isDirectory() : !stat.isDirectory())) fail('unsafe or nonregular path');
  }
  return full;
}
function read(root, path) { return readFileSync(inspect(root, path, 'file')); }
function json(root, path) { return JSON.parse(read(root, path)); }
function descriptor(root, path) { const bytes = read(root, path); return { bytes: bytes.length, sha256: hash(bytes) }; }
function fresh(root, path, type) {
  const absolute = inspect(root, path, type, true);
  if (existsSync(absolute)) fail('immutable output already exists');
  return absolute;
}
function put(root, path, bytes) {
  const absolute = fresh(root, path, 'file');
  mkdirSync(dirname(absolute), { recursive: true, mode: 0o700 });
  writeFileSync(absolute, bytes, { flag: 'wx', mode: 0o600 });
}
function putJson(root, path, value) { put(root, path, JSON.stringify(value, null, 2) + '\n'); }
function id(value) { if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)) fail('invalid context ID'); }
function sortedIds(values) {
  if (!Array.isArray(values) || values.some(value => typeof value !== 'string') || new Set(values).size !== values.length ||
      JSON.stringify(values) !== JSON.stringify([...values].sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b))))) fail('raw ID-array order differs');
}
function authorFacts(root, authorContext) {
  const author = json(root, authorContext);
  id(author.contextId);
  if (typeof author.model !== 'string' || !author.model || typeof author.reasoning !== 'string' || !author.reasoning) fail('author configuration missing');
  return author;
}

export function prepareRouting({ root = DEFAULT_ROOT, bundle, authorContext, bilingualContextId, targetOnlyContextId, bilingualPrompt, targetOnlyPrompt, out, createdAt = new Date().toISOString() }) {
  relative(bundle); relative(out);
  if (out.startsWith(`${bundle}/`)) fail('output overlaps immutable prepared bundle');
  const author = authorFacts(root, authorContext);
  const ids = { bilingual: bilingualContextId, 'target-only': targetOnlyContextId };
  Object.values(ids).forEach(id);
  if (new Set([author.contextId, ...Object.values(ids)]).size !== 3) fail('author/reviewer contexts must be distinct');
  if (!Number.isFinite(Date.parse(createdAt))) fail('invalid context timestamp');
  fresh(root, out, 'directory');
  const schemaBytes = read(root, SCHEMA);
  const bindings = json(root, `${bundle}/bindings.json`);
  if (bindings.authorContext?.id !== author.contextId || bindings.authorContext?.sha256 !== hash(read(root, authorContext))) fail('frozen author binding differs');
  const prompts = { bilingual: bilingualPrompt, 'target-only': targetOnlyPrompt };
  const inputs = {};
  for (const role of ROLES) {
    const bundlePath = `${bundle}/${role}/review-bundle.json`;
    const bytes = read(root, bundlePath), value = JSON.parse(bytes);
    if (value.role !== role || value.targetLocale !== 'ru' || value.requiredReviewer?.model !== author.model || value.requiredReviewer?.reasoning !== author.reasoning) fail('role/locale/selected configuration differs');
    const bindingRole = role === 'target-only' ? 'targetOnly' : 'bilingual';
    if (bindings.bundles?.[bindingRole]?.path !== `${role}/review-bundle.json` || bindings.bundles[bindingRole].sha256 !== hash(bytes)) fail('prepared bundle hash differs');
    if (value.bindingSha256 !== bindings.bindingSha256 || value.inventorySha256 !== bindings.inventorySha256 || value.candidateId !== bindings.candidateId || value.scopeId !== bindings.scopeId) fail('prepared bundle identity differs');
    const prompt = read(root, prompts[role]);
    if (!prompt.length) fail('empty root-authored prompt');
    inputs[role] = { bundlePath, prompt };
  }
  // Every input is checked before any output. New private outputs preserve exact
  // prompt bytes; no machinery-authored role instruction or policy selector.
  mkdirSync(resolve(root, out), { mode: 0o700, recursive: true });
  const routing = { schemaVersion: 1, candidate: dirname(bundle).replaceAll('\\', '/'), roles: {} };
  for (const role of ROLES) {
    const contextPath = `${out}/contexts/${role}.json`, promptPath = `${out}/prompts/${role}.txt`;
    const schemaPath = `${out}/schemas/review-record.schema.json`;
    if (!existsSync(resolve(root, schemaPath))) put(root, schemaPath, schemaBytes);
    const context = { schemaVersion: 1, contextId: ids[role], role, freshContext: true, model: author.model, reasoning: author.reasoning, createdAt, accessBoundary: [contextPath, promptPath, inputs[role].bundlePath, schemaPath] };
    putJson(root, contextPath, context); put(root, promptPath, inputs[role].prompt);
    const artifacts = Object.fromEntries(context.accessBoundary.map(path => [path, descriptor(root, path)]));
    routing.roles[role] = { contextId: ids[role], contextPath, promptPath, bundlePath: inputs[role].bundlePath, schemaPath, responsePath: `${out}/raw/${role}.json`, artifacts };
  }
  putJson(root, `${out}/routing.json`, routing);
  return { routingPath: `${out}/routing.json`, routingSha256: hash(read(root, `${out}/routing.json`)) };
}

export async function verifyRouting({ root = DEFAULT_ROOT, routingPath, authorContext, bilingualRecord, targetOnlyRecord, out }) {
  const routing = json(root, routingPath), author = authorFacts(root, authorContext);
  closed(routing, ['schemaVersion', 'candidate', 'roles'], 'routing');
  if (routing.schemaVersion !== 1) fail('routing version differs');
  relative(routing.candidate);
  closed(routing.roles, ROLES, 'roles');
  // Reuse the maintained canonical serializer only as a comparison validator.
  // Never write its output over the untouched model-authored response bytes.
  inspect(root, TOOL, 'file');
  const { canonicalJson } = await import(pathToFileURL(resolve(root, TOOL)).href);
  const records = { bilingual: bilingualRecord, 'target-only': targetOnlyRecord };
  const identities = new Set([author.contextId]), roles = {};
  for (const role of ROLES) {
    const route = routing.roles[role];
    id(route.contextId);
    closed(route, ['contextId', 'contextPath', 'promptPath', 'bundlePath', 'schemaPath', 'responsePath', 'artifacts'], 'role route');
    const paths = [route.contextPath, route.promptPath, route.bundlePath, route.schemaPath];
    closed(route.artifacts, paths, 'four routed artifacts');
    for (const path of paths) {
      closed(route.artifacts[path], ['bytes', 'sha256'], 'artifact');
      const actual = descriptor(root, path);
      if (actual.bytes !== route.artifacts[path].bytes || actual.sha256 !== route.artifacts[path].sha256) fail('routed input drift');
    }
    const context = json(root, route.contextPath), bundle = json(root, route.bundlePath);
    const bundleDirectory = dirname(route.bundlePath).replaceAll('\\', '/');
    const bundleRoot = dirname(bundleDirectory).replaceAll('\\', '/');
    if (dirname(bundleRoot).replaceAll('\\', '/') !== routing.candidate) fail('candidate route identity differs');
    const bindings = json(root, `${bundleRoot}/bindings.json`);
    if (bindings.authorContext?.id !== author.contextId || bindings.authorContext?.sha256 !== hash(read(root, authorContext))) fail('frozen author binding differs');
    if (!read(root, route.schemaPath).equals(read(root, SCHEMA))) fail('fixed maintained schema differs');
    closed(context, ['schemaVersion', 'contextId', 'role', 'freshContext', 'model', 'reasoning', 'createdAt', 'accessBoundary'], 'context');
    if (context.role !== role || context.contextId !== route.contextId || context.freshContext !== true || JSON.stringify(context.accessBoundary) !== JSON.stringify(paths)) fail('actual context/access boundary differs');
    if (identities.has(route.contextId)) fail('context reused');
    identities.add(route.contextId);
    const bytes = read(root, records[role]);
    const record = JSON.parse(bytes);
    if (!bytes.equals(Buffer.from(canonicalJson(record)))) fail('raw response byte contract differs');
    sortedIds(record.coveredSurfaceIds);
    if (!Array.isArray(record.findings)) fail('raw findings array missing');
    sortedIds(record.findings.map(finding => finding.id));
    record.findings.forEach(finding => sortedIds(finding.surfaceIds));
    if (record.role !== role || record.reviewer?.contextId !== route.contextId) fail('record role/context differs');
    if (record.reviewer.contextSha256 !== hash(read(root, route.contextPath)) || record.reviewer.promptSha256 !== hash(read(root, route.promptPath)) || record.bundleSha256 !== hash(read(root, route.bundlePath))) fail('raw record not bound to routed inputs');
    if (record.reviewer.model !== context.model || record.reviewer.reasoning !== context.reasoning || context.model !== author.model || context.reasoning !== author.reasoning || record.reviewer.freshContext !== true || bundle.requiredReviewer?.model !== author.model || bundle.requiredReviewer?.reasoning !== author.reasoning) fail('selected configuration/freshness differs');
    if (record.verdict !== 'pass') fail('language verdict not passing');
    roles[role] = { contextId: route.contextId, recordSha256: hash(bytes), recordBytes: bytes.length, contextSha256: hash(read(root, route.contextPath)), promptSha256: hash(read(root, route.promptPath)), bundleSha256: hash(read(root, route.bundlePath)) };
  }
  const report = { schemaVersion: 1, status: 'exact-route-verified', roles, limitations: 'Operational byte/routing/configuration checks only. The unchanged maintained localization verifier remains required for schema, coverage, source/target binding, blockers and publication identity; language substance comes from independent model judgments.' };
  if (out !== undefined) putJson(root, out, report);
  return report;
}

export async function runCli(argv) {
  const command = argv[0];
  const required = command === 'prepare' ? ['bundle', 'author-context', 'bilingual-context-id', 'target-only-context-id', 'bilingual-prompt', 'target-only-prompt', 'out'] : command === 'verify' ? ['routing', 'author-context', 'bilingual-record', 'target-only-record'] : fail('command must be prepare or verify');
  const { values, positionals, tokens } = parseArgs({ args: argv.slice(1), options: Object.fromEntries([...new Set(['root', 'out', ...required])].map(key => [key, { type: 'string' }])), strict: true, allowPositionals: false, tokens: true });
  const supplied = tokens.filter(token => token.kind === 'option').map(token => token.name);
  if (new Set(supplied).size !== supplied.length) fail('duplicate argument');
  if (positionals.length || required.some(key => !values[key])) fail('missing required argument');
  const common = { root: resolve(values.root ?? DEFAULT_ROOT), authorContext: values['author-context'], out: values.out };
  const result = command === 'prepare' ? prepareRouting({ ...common, bundle: values.bundle, bilingualContextId: values['bilingual-context-id'], targetOnlyContextId: values['target-only-context-id'], bilingualPrompt: values['bilingual-prompt'], targetOnlyPrompt: values['target-only-prompt'] }) : await verifyRouting({ ...common, routingPath: values.routing, bilingualRecord: values['bilingual-record'], targetOnlyRecord: values['target-only-record'] });
  process.stdout.write(JSON.stringify(result) + '\n');
  return 0;
}
if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? '')).href) {
  try { process.exitCode = await runCli(process.argv.slice(2)); }
  catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
