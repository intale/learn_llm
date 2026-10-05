import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { CLOSURE_PATH, checkClosure, controlBytes, loadFrozenRegistry, loadInventories, readBound, readSafe, sha256, validateControls, validateMappings } from '../check-functional-overbroad-surfaces.mjs';
import { dispatchVerifiers, verifierInvocations } from '../check-functional-chapter-reviews.mjs';

const root = resolve(process.cwd());
const plan = readFileSync(resolve(root, 'curriculum/functional-laptop-llm-extension-plan.md'), 'utf8');
const registry = JSON.parse(plan.split('---\n')[1]).overbroad_surface_map;
function fixture() {
  const dispositions = [...registry].sort((a, b) => Buffer.compare(Buffer.from(a.surface_id), Buffer.from(b.surface_id))).map(row => ({
    surfaceId: row.surface_id, disposition: row.disposition, ownerStep: row.owner_step,
    locators: row.locators.map(locator => ({
      canonicalPath: locator.path, role: locator.role,
      source: { path: locator.path, sha256: '0'.repeat(64) },
      mode: row.owner_step === 'design-functional-laptop-llm-curriculum-extension' ? 'prior-plan' : row.disposition === 'preserve' ? 'control' : 'publication',
      inventoryLinks: row.owner_step === 'design-functional-laptop-llm-curriculum-extension' ? [] : [{ locale: 'english', surfaceIds: ['fixture.surface'] }],
    })),
  }));
  return { dispositions, inventories: { english: { schemaVersion: 1, surfaces: [{ id: 'fixture.surface' }] }, russian: { schemaVersion: 1, surfaces: [{ id: 'fixture.ru' }] } } };
}
function validate(value) { validateMappings(value.dispositions, registry, value.inventories, descriptor => { assert.match(descriptor.sha256, /^[a-f0-9]{64}$/); }); }
test('synthetic mapping fixture covers all 21 frozen IDs, owners and dispositions; not a semantic receipt', () => validate(fixture()));
test('actual exact frozen coverage table and accepted plan bind the same21 records', () => {
  assert.deepEqual(loadFrozenRegistry(root), registry);
});
for (const [name, mutate, pattern] of [
  ['missing ID', value => value.dispositions.pop(), /21/],
  ['extra ID', value => value.dispositions.push(value.dispositions[0]), /21/],
  ['duplicate ID', value => { value.dispositions[1].surfaceId = value.dispositions[0].surfaceId; }, /duplicate/],
  ['order drift', value => value.dispositions.reverse(), /order/],
  ['owner drift', value => { value.dispositions[0].ownerStep = 'other'; }, /owner/],
  ['disposition drift', value => { value.dispositions[0].disposition = 'preserve'; }, /disposition/],
  ['role drift', value => { value.dispositions[0].locators[0].role = 'other'; }, /canonicalPath\/role/],
  ['missing locator', value => value.dispositions[0].locators.pop(), /locator coverage/],
  ['missing surface', value => { value.dispositions[0].locators[0].inventoryLinks[0].surfaceIds = ['absent']; }, /missing inventory surface/],
  ['duplicate link', value => { value.dispositions[0].locators[0].inventoryLinks[0].surfaceIds.push('fixture.surface'); }, /duplicate/],
  ['missing publication link', value => { value.dispositions[0].locators[0].inventoryLinks = []; }, /publication inventory/],
  ['unknown locale', value => { value.dispositions[0].locators[0].inventoryLinks[0].locale = '__proto__'; }, /invalid inventory link/],
  ['unknown object field', value => { value.dispositions[0].approved = true; }, /closed object/],
  ['prior-plan falsely reviewed', value => { value.dispositions.find(row => row.surfaceId === 'OVER-PLAN-01').locators[0].inventoryLinks = [{ locale: 'english', surfaceIds: ['fixture.surface'] }]; }, /prior internal plans/],
]) test(`rejects ${name}`, () => { const value = fixture(); mutate(value); assert.throws(() => validate(value), pattern); });
test('bound descriptor failures propagate; hash checks cannot be replaced with mapping success', () => {
  const value = fixture();
  assert.throws(() => validateMappings(value.dispositions, registry, value.inventories, () => { throw Error('hash drift'); }), /hash drift/);
});
test('fixed control selectors retain exact bytes and reject ambiguous/missing boundaries', () => {
  assert.equal(controlBytes('rust/demos/ch39-end-to-end-llm/expected.txt', Buffer.from('0\n1\n2\n3\n4\n5\n6\n7\n8\n9\n')).toString(), '1\n2\n3\n4\n5\n6\n7\n8\n');
  const path = 'curriculum/chapters/38-cached-generation.md';
  const sentence = 'It does not introduce batching,\nx production memory allocator.';
  assert.equal(controlBytes(path, Buffer.from(`before\n${sentence}\nafter`)).toString(), sentence);
  assert.throws(() => controlBytes(path, Buffer.from(sentence + sentence)), /unique/);
  assert.throws(() => controlBytes(path, Buffer.from('missing')), /unique/);
  const scope = 'curriculum/chapters/39-end-to-end-llm.md';
  assert.equal(controlBytes(scope, Buffer.from('prefix\n## Scope\n\nexact\n\n<!-- contract-section:worked-inputs -->suffix')).toString(), '\nexact\n\n');
});
test('actual current preserved controls match fixed baseline365f70d hashes', () => validateControls(root));
test('unsafe paths, symlink files and symlink parents are rejected', () => {
  const temp = mkdtempSync(resolve(tmpdir(), 'over-closure-test-'));
  try {
    mkdirSync(resolve(temp, 'files'));
    writeFileSync(resolve(temp, 'files/value'), 'exact');
    symlinkSync('files/value', resolve(temp, 'link'));
    symlinkSync('files', resolve(temp, 'directory-link'));
    assert.equal(readSafe(temp, 'files/value').toString(), 'exact');
    for (const path of ['../value', '/value', 'files/../value', 'files//value', 'files\\value', 'link', 'directory-link/value']) assert.throws(() => readSafe(temp, path), /unsafe|regular/);
  } finally { rmSync(temp, { recursive: true, force: true }); }
});
test('no final closure inputs means failure, never an implicit publication pass', async () => {
  const temp = mkdtempSync(resolve(tmpdir(), 'over-closure-missing-'));
  try { await assert.rejects(checkClosure({ root: temp, run: () => { throw Error('must not dispatch'); } }), /ENOENT/); }
  finally { rmSync(temp, { recursive: true, force: true }); }
  assert.equal(CLOSURE_PATH, 'audits/functional-laptop/reviews/reference-core-reframe/closure.json');
});
test('same maintained final receipt dispatch is closed and preserves nonzero results', () => {
  const calls = [];
  const result = dispatchVerifiers('reference-core', { root, run(executable, args, options) { calls.push({ executable, args, options }); return { status: calls.length === 1 ? 0 : 7 }; } });
  assert.equal(result, 7);
  assert.deepEqual(calls.map(({ executable, args }) => ({ executable, args })), verifierInvocations('reference-core', root));
  assert.ok(calls.every(call => call.options.shell === false));
});
test('file bytes, digest and descriptor keys are hash-bound', () => {
  const temp = mkdtempSync(resolve(tmpdir(), 'over-closure-hash-'));
  try {
    writeFileSync(resolve(temp, 'value'), 'exact');
    const descriptor = { path: 'value', sha256: sha256('exact') };
    assert.equal(readBound(temp, descriptor).toString(), 'exact');
    writeFileSync(resolve(temp, 'value'), 'drift');
    assert.throws(() => readBound(temp, descriptor), /hash drift/);
    assert.throws(() => readBound(temp, { ...descriptor, approved: true }), /closed object/);
    assert.throws(() => readBound(temp, { path: 'value', sha256: 'not-a-digest' }), /invalid sha256/);
  } finally { rmSync(temp, { recursive: true, force: true }); }
});
test('both final inventories must equal their maintained binding hashes and identities', () => {
  const temp = mkdtempSync(resolve(tmpdir(), 'over-closure-inventory-'));
  const base = 'audits/functional-laptop/reviews/reference-core-reframe';
  const write = (path, value) => { mkdirSync(dirname(resolve(temp, path)), { recursive: true }); writeFileSync(resolve(temp, path), JSON.stringify(value) + '\n'); };
  try {
    const descriptors = {};
    for (const locale of ['english', 'russian']) {
      const path = `${base}/${locale === 'english' ? 'english-candidate-01/bundle/inventory.json' : 'closure-evidence/ru-inventory.json'}`;
      const inventory = { candidateId: 'fixture', schemaVersion: 1, scopeId: 'fixture', surfaces: [{ id: 'fixture' }] };
      write(path, inventory);
      descriptors[locale] = { path, sha256: sha256(readFileSync(resolve(temp, path))) };
      write(`${base}/${locale === 'english' ? 'english-candidate-01' : 'ru-candidate-01'}/bundle/bindings.json`, { candidateId: 'fixture', scopeId: 'fixture', inventorySha256: descriptors[locale].sha256 });
    }
    assert.equal(loadInventories(temp, descriptors).russian.candidateId, 'fixture');
    for (const locale of ['english', 'russian']) {
      const bindingPath = `${base}/${locale === 'english' ? 'english-candidate-01' : 'ru-candidate-01'}/bundle/bindings.json`;
      const binding = JSON.parse(readFileSync(resolve(temp, bindingPath)));
      for (const key of ['candidateId', 'scopeId', 'inventorySha256']) {
        write(bindingPath, { ...binding, [key]: 'drift' });
        assert.throws(() => loadInventories(temp, descriptors), /inventory binding drift/);
        write(bindingPath, binding);
      }
    }
    descriptors.russian.path = '../escape';
    assert.throws(() => loadInventories(temp, descriptors), /final inventory path/);
  } finally { rmSync(temp, { recursive: true, force: true }); }
});
test('tampering each preserved control fails, without claiming whole Chapter38/39 unchanged', () => {
  const temp = mkdtempSync(resolve(tmpdir(), 'over-closure-controls-'));
  const paths = ['curriculum/chapters/34-final-evaluation.md', 'site/src/content/chapters/en/34-final-evaluation.mdx', 'rust/demos/ch39-end-to-end-llm/expected.txt', 'curriculum/chapters/38-cached-generation.md', 'curriculum/chapters/39-end-to-end-llm.md'];
  try {
    for (const path of paths) { mkdirSync(dirname(resolve(temp, path)), { recursive: true }); writeFileSync(resolve(temp, path), readFileSync(resolve(root, path))); }
    validateControls(temp);
    for (const path of paths) {
      const original = readFileSync(resolve(temp, path));
      const control = controlBytes(path, original).toString();
      const replacement = control.replace(/\S/, 'X');
      writeFileSync(resolve(temp, path), original.toString().replace(control, replacement));
      assert.throws(() => validateControls(temp), /control|unique/);
      writeFileSync(resolve(temp, path), original);
    }
  } finally { rmSync(temp, { recursive: true, force: true }); }
});
