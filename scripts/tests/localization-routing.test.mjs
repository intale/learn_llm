import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { prepareRouting, verifyRouting, runCli } from '../localization-routing.mjs';
const repository = resolve(process.cwd());
const toolPath = '.agents/skills/localize-llm-course/scripts/localization-review.mjs';
const schemaPath = '.agents/skills/localize-llm-course/references/review-record.schema.json';
const { canonicalJson, prepareEvidence } = await import(pathToFileURL(resolve(repository, toolPath)).href);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function fixture() {
  const root = mkdtempSync(resolve(tmpdir(), 'locale-route-regression-'));
  const put = (path, value) => { mkdirSync(dirname(resolve(root, path)), { recursive: true }); writeFileSync(resolve(root, path), Buffer.isBuffer(value) || typeof value === 'string' ? value : JSON.stringify(value) + '\n'); };
  const read = path => readFileSync(resolve(root, path));
  // Synthetic plumbing fixture; no taught content or actual semantic receipt.
  const author = { contextId: 'fixture.author', model: 'fixture.user-selection', reasoning: 'fixture.configuration' };
  put('author.json', author);
  put(toolPath, readFileSync(resolve(repository, toolPath)));
  put(schemaPath, readFileSync(resolve(repository, schemaPath)));
  put('bilingual-prompt.txt', 'Synthetic fixture prompt bytes, not a language judgment.\n');
  put('target-only-prompt.txt', 'Synthetic fixture prompt bytes, not a language judgment.\n');
  const bindings = { authorContext: { id: author.contextId, sha256: hash(read('author.json')) }, candidateId: 'fixture', scopeId: 'fixture', bindingSha256: 'a'.repeat(64), inventorySha256: 'b'.repeat(64), bundles: {} };
  for (const role of ['bilingual', 'target-only']) {
    put(`candidate/bundle/${role}/review-bundle.json`, { role, targetLocale: 'ru', candidateId: 'fixture', scopeId: 'fixture', bindingSha256: bindings.bindingSha256, inventorySha256: bindings.inventorySha256, requiredReviewer: { model: author.model, reasoning: author.reasoning }, surfaces: [] });
    bindings.bundles[role === 'target-only' ? 'targetOnly' : 'bilingual'] = { path: `${role}/review-bundle.json`, sha256: hash(read(`candidate/bundle/${role}/review-bundle.json`)) };
  }
  put('candidate/bundle/bindings.json', bindings);
  const options = { root, bundle: 'candidate/bundle', authorContext: 'author.json', bilingualContextId: 'fixture.bilingual', targetOnlyContextId: 'fixture.target-only', bilingualPrompt: 'bilingual-prompt.txt', targetOnlyPrompt: 'target-only-prompt.txt', out: 'candidate/routes', createdAt: '2026-10-05T00:00:00Z' };
  const capture = () => {
    const routing = JSON.parse(read('candidate/routes/routing.json'));
    for (const role of ['bilingual', 'target-only']) {
      const route = routing.roles[role];
      put(route.responsePath, canonicalJson({ role, verdict: 'pass', findings: [], coveredSurfaceIds: ['fixture.001', 'fixture.002'], bundleSha256: hash(read(route.bundlePath)), reviewer: { contextId: route.contextId, contextSha256: hash(read(route.contextPath)), promptSha256: hash(read(route.promptPath)), model: author.model, reasoning: author.reasoning, freshContext: true } }));
    }
    return routing;
  };
  const verify = () => verifyRouting({ root, routingPath: 'candidate/routes/routing.json', authorContext: 'author.json', bilingualRecord: 'candidate/routes/raw/bilingual.json', targetOnlyRecord: 'candidate/routes/raw/target-only.json', out: 'candidate/report.json' });
  return { root, options, put, read, capture, verify, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}
async function withFixture(action) { const value = fixture(); try { await action(value); } finally { value.cleanup(); } }
test('prepare preserves exact supplied prompt bytes and freezes four artifacts, no semantic certification', () => withFixture(async f => {
  const result = prepareRouting(f.options);
  assert.equal(result.routingSha256, hash(f.read(result.routingPath)));
  assert.deepEqual(f.read('candidate/routes/prompts/bilingual.txt'), f.read('bilingual-prompt.txt'));
  assert.deepEqual(f.read('candidate/routes/prompts/target-only.txt'), f.read('target-only-prompt.txt'));
  const routing = f.capture(), raw = f.read(routing.roles.bilingual.responsePath);
  const report = await f.verify();
  assert.equal(report.status, 'exact-route-verified');
  assert.match(report.limitations, /maintained localization verifier remains required/);
  assert.deepEqual(f.read(routing.roles.bilingual.responsePath), raw);
  await assert.rejects(f.verify(), /output already exists/);
  assert.throws(() => prepareRouting(f.options), /output already exists/);
}));
test('read-only route verification repeats the same checks without creating or changing any report/record', () => withFixture(async f => {
  prepareRouting(f.options); f.capture();
  const options = { root: f.root, routingPath: 'candidate/routes/routing.json', authorContext: 'author.json', bilingualRecord: 'candidate/routes/raw/bilingual.json', targetOnlyRecord: 'candidate/routes/raw/target-only.json' };
  const before = f.read(options.bilingualRecord);
  const first = await verifyRouting(options), second = await verifyRouting(options);
  assert.deepEqual(first, second); assert.deepEqual(f.read(options.bilingualRecord), before);
  assert.throws(() => f.read('candidate/report.json'), /ENOENT/);
}));
test('rejects exact prompt byte drift', () => withFixture(async f => { prepareRouting(f.options); f.capture(); f.put('candidate/routes/prompts/bilingual.txt', 'drift\n'); await assert.rejects(f.verify(), /input drift/); }));
test('rejects raw-record hash drift without rewriting raw bytes', () => withFixture(async f => {
  prepareRouting(f.options); const routing = f.capture(), path = routing.roles.bilingual.responsePath;
  const record = JSON.parse(f.read(path)); record.reviewer.promptSha256 = '0'.repeat(64); f.put(path, canonicalJson(record));
  const raw = f.read(path); await assert.rejects(f.verify(), /not bound/); assert.deepEqual(f.read(path), raw);
}));
test('rejects reused author/reviewer identities before outputs', () => withFixture(async f => {
  assert.throws(() => prepareRouting({ ...f.options, bilingualContextId: 'fixture.author' }), /distinct/);
  assert.throws(() => prepareRouting({ ...f.options, targetOnlyContextId: f.options.bilingualContextId }), /distinct/);
}));
test('rejects model or reasoning substitution', () => withFixture(async f => {
  prepareRouting(f.options); const routing = f.capture(), path = routing.roles.bilingual.responsePath;
  for (const field of ['model', 'reasoning']) { const original = f.read(path); const value = JSON.parse(original); value.reviewer[field] = 'substitution'; f.put(path, canonicalJson(value)); await assert.rejects(f.verify(), /configuration/); f.put(path, original); }
}));
test('rejects nonpassing verdict, noncompact or noncanonical response and invalid LF; preserves all failures', () => withFixture(async f => {
  prepareRouting(f.options); const routing = f.capture(), path = routing.roles.bilingual.responsePath, original = f.read(path), value = JSON.parse(original);
  for (const bytes of [canonicalJson({ ...value, verdict: 'fail' }), JSON.stringify(value, null, 2) + '\n', JSON.stringify({ ...value, z: true, a: true }) + '\n', original.subarray(0, original.length - 1), Buffer.concat([original, Buffer.from('\n')])]) {
    f.put(path, bytes); const raw = f.read(path); await assert.rejects(f.verify(), /verdict|byte contract/); assert.deepEqual(f.read(path), raw);
  }
}));
test('rejects root-author/bundle binding drift before output generation', () => withFixture(async f => {
  f.put('author.json', { contextId: 'other', model: 'fixture.user-selection', reasoning: 'fixture.configuration' });
  assert.throws(() => prepareRouting(f.options), /author binding/);
}));
test('rejects frozen author manifest byte drift after routing even with identical IDs/settings', () => withFixture(async f => {
  prepareRouting(f.options); f.capture();
  const author = JSON.parse(f.read('author.json')); f.put('author.json', { ...author, purpose: 'changed' });
  await assert.rejects(f.verify(), /author binding/);
}));
test('rejects prepared role-bundle hash drift before outputs', () => withFixture(async f => {
  f.put('candidate/bundle/target-only/review-bundle.json', '{}\n'); assert.throws(() => prepareRouting(f.options), /role|hash/);
}));
test('rejects unsafe path and symlink inputs/outputs', () => withFixture(async f => {
  assert.throws(() => prepareRouting({ ...f.options, out: 'candidate/bundle/routes' }), /overlaps/);
  for (const path of ['../outside', '/absolute', 'candidate//routes', 'candidate/./routes', 'candidate\\routes']) assert.throws(() => prepareRouting({ ...f.options, out: path }), /unsafe/);
  symlinkSync('bilingual-prompt.txt', resolve(f.root, 'prompt-link'));
  assert.throws(() => prepareRouting({ ...f.options, bilingualPrompt: 'prompt-link' }), /unsafe|nonregular/);
  symlinkSync('candidate', resolve(f.root, 'output-link'));
  assert.throws(() => prepareRouting({ ...f.options, out: 'output-link/routes' }), /unsafe|nonregular/);
}));
test('rejects extra/missing role and four-artifact membership drift', () => withFixture(async f => {
  prepareRouting(f.options); f.capture(); const path = 'candidate/routes/routing.json', original = f.read(path);
  const extra = JSON.parse(original); extra.roles.other = extra.roles.bilingual; f.put(path, extra); await assert.rejects(f.verify(), /closed keys/);
  const fewer = JSON.parse(original); delete fewer.roles['target-only']; f.put(path, fewer); await assert.rejects(f.verify(), /closed keys/);
  const fifth = JSON.parse(original); fifth.roles.bilingual.artifacts['author.json'] = { bytes: f.read('author.json').length, sha256: hash(f.read('author.json')) }; f.put(path, fifth); await assert.rejects(f.verify(), /four routed artifacts/);
}));
test('rejects actual context access-boundary drift even if routing hash is updated', () => withFixture(async f => {
  prepareRouting(f.options); const routing = f.capture(), route = routing.roles.bilingual;
  const context = JSON.parse(f.read(route.contextPath)); context.accessBoundary.push('author.json'); f.put(route.contextPath, context);
  route.artifacts[route.contextPath] = { bytes: f.read(route.contextPath).length, sha256: hash(f.read(route.contextPath)) }; f.put('candidate/routes/routing.json', routing);
  await assert.rejects(f.verify(), /access boundary/);
}));
test('raw ID arrays and finding order obey the root-authored prompt byte rules', () => withFixture(async f => {
  prepareRouting(f.options); const routing = f.capture(), path = routing.roles.bilingual.responsePath, original = f.read(path);
  const value = JSON.parse(original); value.coveredSurfaceIds.reverse(); f.put(path, canonicalJson(value)); await assert.rejects(f.verify(), /ID-array order/);
  value.coveredSurfaceIds.reverse(); value.findings = [{ id: 'z', surfaceIds: ['fixture.001'] }, { id: 'a', surfaceIds: ['fixture.002'] }]; f.put(path, canonicalJson(value)); await assert.rejects(f.verify(), /ID-array order/);
}));
test('CLI rejects unknown commands, extra flags and missing required arguments', async () => {
  await assert.rejects(runCli(['other']), /command/);
  await assert.rejects(runCli(['prepare', '--policy', 'skip']), /Unknown option/);
  await assert.rejects(runCli(['verify']), /missing required/);
  await assert.rejects(runCli(['verify', '--root', 'one', '--root', 'two']), /duplicate/);
});

test('real maintained locale preparation retains targetOnly binding key through routing and read-only verification', () => withFixture(async f => {
  const author = JSON.parse(f.read('author.json'));
  f.put('literal.txt', 'Synthetic literal fixture.\n');
  f.put('rubric.txt', 'Synthetic operational regression, not a semantic verdict.\n');
  const descriptor = path => ({ path, sha256: hash(f.read(path)) });
  const model = { model: author.model, reasoning: author.reasoning };
  const surface = { id: 'fixture.001', kind: 'literal-fixture', order: 1, localization: 'copy', source: descriptor('literal.txt'), target: descriptor('literal.txt') };
  const spec = { schemaVersion: 1, candidateId: 'fixture', scopeId: 'fixture', referenceLocale: 'en', targetLocale: 'ru', authorContext: { id: author.contextId, sha256: hash(f.read('author.json')) }, requiredReviewers: { bilingual: model, targetOnly: model }, requiredSurfaceIds: [surface.id], rubrics: { bilingual: descriptor('rubric.txt'), targetOnly: descriptor('rubric.txt') }, surfaces: [surface] };
  f.put('real/spec.json', canonicalJson(spec));
  const bindings = prepareEvidence({ specPath: resolve(f.root, 'real/spec.json'), outDir: resolve(f.root, 'real/bundle'), root: f.root });
  assert.equal(bindings.bundles.targetOnly.path, 'target-only/review-bundle.json');
  assert.equal(bindings.bundles['target-only'], undefined);
  prepareRouting({ ...f.options, bundle: 'real/bundle', out: 'real/routes' });
  const routing = JSON.parse(f.read('real/routes/routing.json'));
  for (const role of ['bilingual', 'target-only']) {
    const route = routing.roles[role];
    f.put(route.responsePath, canonicalJson({ role, verdict: 'pass', findings: [], coveredSurfaceIds: ['fixture.001'], bundleSha256: hash(f.read(route.bundlePath)), reviewer: { contextId: route.contextId, contextSha256: hash(f.read(route.contextPath)), promptSha256: hash(f.read(route.promptPath)), model: author.model, reasoning: author.reasoning, freshContext: true } }));
  }
  const before = f.read(routing.roles['target-only'].responsePath);
  const report = await verifyRouting({ root: f.root, routingPath: 'real/routes/routing.json', authorContext: 'author.json', bilingualRecord: routing.roles.bilingual.responsePath, targetOnlyRecord: routing.roles['target-only'].responsePath });
  assert.equal(report.status, 'exact-route-verified');
  assert.deepEqual(f.read(routing.roles['target-only'].responsePath), before);
}));
