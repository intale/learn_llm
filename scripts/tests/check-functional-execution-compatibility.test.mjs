import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { validateState, validateExecutionCompatibilityState } from '../check-functional-laptop-llm-plan.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../site/package.json', import.meta.url));
const { parse, stringify } = require('yaml');
const read = (path) => readFileSync(new URL('../../' + path, import.meta.url));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const state = parse(read('BUILD_STATE.yaml').toString());
const contract = JSON.parse(read('configs/functional-execution-compatibility-v2.json'));
const checker = read('scripts/check-functional-laptop-llm-plan.mjs').toString();
const embedded = (name) => JSON.parse(checker.match(new RegExp(`^const ${name} = /\\*[^\\n]*?\\*/ (.*);$`, 'm'))[1]);
const constants = embedded('EMBEDDED_CONSTANTS');
const queue = embedded('EMBEDDED_QUEUE');
const functional = (doc) => doc.builds.find((build) => build.build_id === constants.state_lifecycle_contract.functional_build_id);
const checkState = (doc) => validateState(stringify(doc), queue, constants, { root });

function ready() {
  const doc = structuredClone(state);
  const build = doc.builds.find((entry) => entry.build_id === contract.compatibility_build.build_id);
  build.status = 'completed'; build.budget.spent = 1;
  const step = build.steps[0]; step.status = 'completed';
  const run = step.runs.at(-1);
  run.status = 'succeeded'; run.finished_at = '2026-10-03T15:00:00Z';
  run.commands = [...step.validate];
  run.validation = step.validate.map((command) => ({ command, status: 'passed' }));
  run.artifacts = ['scripts/check-functional-laptop-llm-plan.mjs','configs/functional-execution-compatibility-v2.json'].map((path) => ({ path, sha256: sha(read(path)) }));
  const terminal = functional(doc).steps.find(s => s.id === contract.release_terminal_step).status === 'completed';
  functional(doc).status = terminal ? 'pending' : 'active';
  doc.active_build = terminal ? null : functional(doc).build_id;
  return doc;
}

test('actual live state passes the entire validator without a planning bypass', () => {
  assert.doesNotThrow(() => checkState(state));
});
test('completed compatibility permits setup with the original repairs held', () => {
  const doc = ready(); assert.doesNotThrow(() => checkState(doc));
  assert.equal(functional(doc).steps[3].status, 'pending');
  assert.deepEqual(functional(doc).steps[3].runs, []);
});
test('preparation cannot advance any functional step', () => {
  const doc = structuredClone(state);
  const build = doc.builds.at(-1); build.status = 'active'; build.steps[0].status = 'running'; build.steps[0].runs.at(-1).status = 'running';
  functional(doc).steps[4].status = 'running';
  assert.throws(() => checkState(doc), /unreleased step advanced/);
});
test('only lifecycle, predecessor reconciliation and main routing changed', () => {
  const matches = [...checker.matchAll(/^(?:function ([A-Za-z0-9_]+)\(|const authoritative|export \{)/gm)];
  const allowed = ['validateState','validatePlan','main','readExecutionCompatibility','validateExecutionCompatibilityState'];
  const unchanged = matches.filter(m => m[1] && !allowed.includes(m[1])).map(m => [m[1],checker.slice(m.index,matches.find(n => n.index > m.index)?.index || checker.length).trim()]);
  assert.equal(unchanged.length, 50);
  assert.equal(sha(JSON.stringify(unchanged)), '553fcbe6e0831a2b227163052a29643c3d87eee9441e342fd9cdcd4c375aad96');
});
test('historical budget comparison permits only the two exact existing counters', () => {
  const doc = ready(); doc.builds.find(b => b.build_id === 'foundation-and-chapter-01').budget.spent += 1;
  assert.throws(() => checkState(doc), /historical budget compatibility drift/);
});
test('Chapter 41 and later execution remain unreleased', () => {
  const doc = ready(); functional(doc).steps.find((step) => step.id === 'implement-ch41-governed-corpus-acquisition').status = 'running';
  assert.throws(() => checkState(doc), /unreleased step advanced.*ch41/);
});
test('repair status, history and specification cannot change', () => {
  for (const change of [s => { s.status = 'completed'; }, s => { s.runs.push({ run_id: 'unrequested-repair' }); }, s => { s.objective += ' changed'; }]) {
    const doc = ready(); change(functional(doc).steps[3]);
    assert.throws(() => validateExecutionCompatibilityState(doc, contract), /repairs must remain held and unchanged/);
  }
});
test('completed intervening builds cannot be changed or discarded', () => {
  for (const change of [d => { d.builds.at(-2).objective += ' changed'; }, d => { d.builds.splice(-2,1); }, d => { d.builds.at(-2).status = 'active'; }]) {
    const doc = ready(); change(doc);
    assert.throws(() => validateExecutionCompatibilityState(doc, contract), /intervening build/);
  }
});
test('historical design run binds its original artifact, not the successor', () => {
  const doc = ready(); const step = functional(doc).steps.find(s => s.id === 'design-functional-laptop-llm-curriculum-extension');
  step.runs.at(-1).artifacts.find(a => a.path === 'curriculum/functional-laptop-llm-extension-plan.md').sha256 = contract.approved_policy_binding.plan_sha256;
  assert.throws(() => checkState(doc), /historical design plan binding drift/);
});
test('compatibility publication cannot bind a substituted checker', () => {
  const doc = ready(); doc.builds.at(-1).steps[0].runs.at(-1).artifacts[0].sha256 = '0'.repeat(64);
  assert.throws(() => checkState(doc), /compatibility checker publication binding drift/);
});
test('future ownership, prerequisites, acceptance and resource costs remain exact', () => {
  for (const change of [s => { s.depends_on = []; }, s => { s.outputs.push('undeclared-output'); }, s => { s.acceptance = []; }, s => { s.cost.notes += ';unbounded=true'; }]) {
    const doc = ready(); change(functional(doc).steps.find(s => s.id === 'implement-ch40-reference-core-handoff'));
    assert.throws(() => checkState(doc), /BUILD_STATE immutable implement-ch40/);
  }
});
test('current execution cannot relabel initial publication or omit setup', () => {
  assert.throws(() => validateState(stringify(state), queue, constants, { root, initialPublication: true }), /cannot relabel/);
  const doc = ready(); functional(doc).steps.splice(4,1);
  assert.throws(() => checkState(doc), /BUILD_STATE missing establish-functional-offline/);
});

test('hashing amendment preserves every original requirement and all other step specifications', () => {
  const original = queue.steps[0], amended = contract.setup_amendment.step_spec;
  for (const field of ['id','objective','depends_on','cost']) assert.deepEqual(amended[field], original[field]);
  for (const field of ['inputs','outputs','acceptance']) assert.deepEqual(amended[field].slice(0,original[field].length), original[field]);
  assert.deepEqual(amended.validate.filter(command => !command.includes('artifact-identity-self-test-v1')), original.validate);
  assert.equal(amended.outputs.length, original.outputs.length + 8);
  for (const originalStep of queue.steps.slice(1)) {
    const actual = functional(state).steps.find(s => s.id === originalStep.id);
    for (const field of ['id','objective','depends_on','inputs','outputs','acceptance','validate','cost']) assert.deepEqual(actual[field], originalStep[field]);
  }
});
test('hashing ownership cannot be omitted, moved into Chapter40 or silently expanded', () => {
  for (const change of [s => {s.outputs.pop();},s => {s.outputs.push('undeclared-hashing-module.rs');},s => {s.acceptance.pop();},s => {s.validate.pop();}]) {
    const doc=ready();change(functional(doc).steps[4]);
    assert.throws(() => checkState(doc), /BUILD_STATE immutable establish-functional-offline/);
  }
  assert.equal(contract.setup_amendment.rust_infrastructure_source,'rust/crates/llm-from-scratch/src/artifact_identity.rs');
  assert.ok(contract.setup_amendment.step_spec.acceptance.some(s => s.includes('never handwrite the hashing algorithm')));
  assert.ok(contract.setup_amendment.step_spec.inputs.some(s => s.includes('sha2 =0.10.9, default-features=false, features=[]')));
});
test('upstream compatibility is frozen historical evidence, not relabeled current publication', () => {
  const old = JSON.parse(read('configs/functional-execution-compatibility-v1.json'));
  assert.equal(sha(read(contract.upstream_compatibility.path)),contract.upstream_compatibility.sha256);
  const doc=ready();const upstream=doc.builds.find(b=>b.build_id===old.compatibility_build.build_id);
  assert.equal(upstream.steps[0].runs.at(-1).artifacts.find(a=>a.path==='scripts/check-functional-laptop-llm-plan.mjs').sha256,contract.upstream_compatibility.checker_sha256);
  upstream.steps[0].runs.at(-1).status='failed';
  assert.throws(() => checkState(doc),/intervening build drift/);
});
