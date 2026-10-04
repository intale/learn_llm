import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { validateState, validateExecutionCompatibilityState, effectiveExecutionConstants, inputReceiptPaths, buildBootstrapInputFingerprint } from '../check-functional-laptop-llm-plan.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../site/package.json', import.meta.url));
const { parse, stringify } = require('yaml');
const read = (path) => readFileSync(new URL('../../' + path, import.meta.url));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const state = parse(read('BUILD_STATE.yaml').toString());
const contract = JSON.parse(read('configs/functional-execution-compatibility-v4.json'));
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
  run.artifacts = [
    { path: 'scripts/check-functional-laptop-llm-plan.mjs', sha256: contract.compatibility_build.checker_sha256 },
    { path: 'configs/functional-execution-compatibility-v3.json', sha256: sha(read('configs/functional-execution-compatibility-v3.json')) }
  ];
  const terminal = functional(doc).steps.find(s => s.id === contract.release_terminal_step).status === 'completed';
  functional(doc).status = terminal ? 'pending' : 'active';
  doc.active_build = terminal ? null : functional(doc).build_id;
  return doc;
}

test('actual live state passes the entire validator without a planning bypass', () => {
  assert.doesNotThrow(() => checkState(state));
});
test('state validation leaves the frozen queue unchanged across repeated calls', () => {
  const before = JSON.stringify(queue);
  assert.doesNotThrow(() => checkState(state));
  assert.doesNotThrow(() => checkState(state));
  assert.equal(JSON.stringify(queue), before);
});
test('completed compatibility permits setup with the original repairs held', () => {
  const doc = ready(); assert.doesNotThrow(() => checkState(doc));
  assert.equal(functional(doc).steps[3].status, 'pending');
  assert.deepEqual(functional(doc).steps[3].runs, []);
});
test('preparation cannot advance any functional step', () => {
  const doc = structuredClone(state);
  const build = doc.builds.find(entry => entry.build_id === contract.compatibility_build.build_id); build.status = 'active'; build.steps[0].status = 'running'; build.steps[0].runs.at(-1).status = 'running';
  functional(doc).steps.find(step => step.id === 'implement-ch40-reference-core-handoff').status = 'running';
  assert.throws(() => checkState(doc), /unreleased step advanced/);
});
test('only lifecycle, predecessor reconciliation and main routing changed', () => {
  const matches = [...checker.matchAll(/^(?:function ([A-Za-z0-9_]+)\(|const authoritative|export \{)/gm)];
  const allowed = ['validateState','validatePlan','main','readExecutionCompatibility','validateExecutionCompatibilityState','effectiveExecutionConstants','buildBootstrapInputFingerprint','validateQueue','validateRunHistory'];
  const unchanged = matches.filter(m => m[1] && !allowed.includes(m[1])).map(m => [m[1],checker.slice(m.index,matches.find(n => n.index > m.index)?.index || checker.length).trim()]);
  assert.equal(unchanged.length, 48);
  assert.equal(sha(JSON.stringify(unchanged)), 'e27122fa901d6959f650c81f4d9c7f1cb0776c62d5388ed1883b5abb29cbf563');
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
  const targetId = contract.intervening_builds[0].build_id;
  for (const change of [d => { d.builds.find(build => build.build_id === targetId).objective += ' changed'; }, d => { d.builds.splice(d.builds.findIndex(build => build.build_id === targetId),1); }, d => { d.builds.find(build => build.build_id === targetId).status = 'active'; }]) {
    const doc = ready(); change(doc);
    assert.throws(() => validateExecutionCompatibilityState(doc, contract), /intervening build/);
  }
});
test('preserved interrupted setup preflights are bound to exact run projections', () => {
  const doc = structuredClone(state);
  const step = functional(doc).steps.find(item => item.id === contract.replacement_setup.step_spec.id);
  const run = step.runs.find(item => item.run_id === contract.replacement_setup.preserved_preflight_runs[0].run_id);
  run.notes += ' tampered';
  assert.throws(() => checkState(doc), /preserved replacement preflight projection drift/);
});
test('unrelated failed or interrupted strict runs still require full fingerprints', () => {
  const doc = ready();
  const step = functional(doc).steps.find(item => item.id === contract.replacement_setup.step_spec.id);
  step.status = 'pending';
  const prior = step.runs.at(-1);
  prior.status = 'interrupted'; prior.finished_at = '2026-10-04T19:04:00Z';
  const run = structuredClone(step.runs.at(-1));
  run.run_id = '20261004T190500Z-establish-ch40-course-toolchain-v2-07';
  run.started_at = '2026-10-04T19:05:00Z'; run.finished_at = '2026-10-04T19:06:00Z'; run.status = 'interrupted';
  run.input_fingerprint = { commit: '184c77446e0d' };
  run.staging_dir = '.build/runs/' + run.run_id + '/';
  step.runs.push(run);
  assert.throws(() => checkState(doc), /input_fingerprint fields/);
});
test('checker drift is rejected for a non-owner interrupted strict run', () => {
  const doc = ready();
  const v2 = functional(doc).steps.find(item => item.id === contract.replacement_setup.step_spec.id);
  const step = functional(doc).steps.find(item => item.id === 'establish-functional-firefox-execution-boundary');
  const run = structuredClone(v2.runs.at(-1));
  run.run_id = '20261004T190500Z-establish-functional-firefox-execution-boundary-02';
  run.started_at = '2026-10-04T19:05:00Z'; run.finished_at = '2026-10-04T19:06:00Z'; run.status = 'interrupted';
  run.staging_dir = '.build/runs/' + run.run_id + '/';
  run.input_fingerprint.checker_sha256 = '78c8b59d24e0d57ca1afd5a59aea362623fc52024bea165b232225e179e58aca';
  step.runs.push(run);
  assert.throws(() => checkState(doc), /run checker hash drift outside the step-owned checker output/);
});
test('succeeded checker-owning run must bind final output even when input hash matches', () => {
  const doc = ready();
  const step = functional(doc).steps.find(item => item.id === contract.replacement_setup.step_spec.id);
  step.status = 'completed';
  const run = step.runs.at(-1);
  run.status = 'succeeded'; run.finished_at = '2026-10-04T19:06:00Z';
  run.input_fingerprint.checker_sha256 = sha(read('scripts/check-functional-laptop-llm-plan.mjs'));
  run.artifacts = [];
  assert.throws(() => checkState(doc), /succeeded owner run lacks the final checker SHA-256/);
});
test('historical design run binds its original artifact, not the successor', () => {
  const doc = ready(); const step = functional(doc).steps.find(s => s.id === 'design-functional-laptop-llm-curriculum-extension');
  step.runs.at(-1).artifacts.find(a => a.path === 'curriculum/functional-laptop-llm-extension-plan.md').sha256 = contract.approved_policy_binding.plan_sha256;
  assert.throws(() => checkState(doc), /historical design plan binding drift/);
});
test('compatibility publication cannot bind a substituted checker', () => {
  const doc = ready(); doc.builds.find(build => build.build_id === contract.compatibility_build.build_id).steps[0].runs.at(-1).artifacts[0].sha256 = '0'.repeat(64);
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
    const expected = structuredClone(originalStep);
    for (const override of contract.replacement_setup.successor_dependency_overrides.filter(item => item.step_id === expected.id)) expected.depends_on = [override.to];
    for (const override of contract.replacement_setup.successor_input_overrides.filter(item => item.step_id === expected.id)) expected.inputs[override.index] = override.to;
    const history = contract.replacement_setup.chapter40_history_policy_override;
    if (expected.id === history.step_id) {
      expected.inputs = expected.inputs.filter(item => !history.remove_inputs.includes(item));
      expected.outputs = expected.outputs.filter(item => !history.remove_outputs.includes(item));
      expected.acceptance = expected.acceptance.filter(item => !history.remove_acceptance.includes(item));
      expected.acceptance.push(history.append_acceptance);
      expected.validate = expected.validate.filter(item => !history.remove_validate.includes(item));
      expected.validate.unshift(history.prepend_validate);
    }
    for (const field of ['id','objective','depends_on','inputs','outputs','acceptance','validate','cost']) assert.deepEqual(actual[field], expected[field]);
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
  const old = JSON.parse(read('configs/functional-execution-compatibility-v2.json'));
  assert.equal(sha(read(contract.upstream_compatibility.path)),contract.upstream_compatibility.sha256);
  const doc=ready();const upstream=doc.builds.find(b=>b.build_id===old.compatibility_build.build_id);
  assert.equal(upstream.steps[0].runs.at(-1).artifacts.find(a=>a.path==='scripts/check-functional-laptop-llm-plan.mjs').sha256,contract.upstream_compatibility.checker_sha256);
  upstream.steps[0].runs.at(-1).status='failed';
  assert.throws(() => checkState(doc),/intervening build drift/);
});

test('cold bootstrap excludes only its exact owner-produced receipt from preflight inputs', () => {
  const effective=effectiveExecutionConstants(constants,contract);
  const registry=effective.execution_boundary_records.offline_workspace.target_registry;
  const first=registry.filter(t=>t.step_id===contract.setup_amendment.step_spec.id);
  assert.deepEqual(inputReceiptPaths(first),[]);
  const target=first.find(t=>t.target_id==='history-source-extractors-v1');
  assert.equal(target.runtime_image_selector,undefined);
  assert.equal(target.owner_produced_runtime_image_selector.receipt,contract.bootstrap_owned_runtime_selector.expected_input_selector.receipt);
  assert.ok(target.owner_produced_runtime_image_selector.requirement.includes('Before dispatch, validate'));
  const original=constants.execution_boundary_records.offline_workspace.target_registry.find(t=>t.target_id==='history-source-extractors-v1');
  assert.ok(original.runtime_image_selector);
  assert.equal(original.owner_produced_runtime_image_selector,undefined);
  for(const before of constants.execution_boundary_records.offline_workspace.target_registry.filter(t=>t.step_id!==target.step_id)) {
    assert.deepEqual(registry.find(t=>t.step_id===before.step_id&&t.target_id===before.target_id&&t.phase===before.phase),before);
  }
});
test('output classification rejects cross-owner, changed-selector and undeclared-output substitutions', () => {
  for(const change of [
    c=>{c.bootstrap_owned_runtime_selector.step_id='implement-ch40-reference-core-handoff';},
    c=>{c.bootstrap_owned_runtime_selector.target_id='implement-ch40-reference-core-handoff-v1';},
    c=>{c.bootstrap_owned_runtime_selector.expected_input_selector.receipt='invented-receipt.json';},
    c=>{c.setup_amendment.step_spec.outputs=c.setup_amendment.step_spec.outputs.filter(p=>p!==c.bootstrap_owned_runtime_selector.expected_input_selector.receipt);},
  ]) {
    const candidate=structuredClone(contract);change(candidate);
    assert.throws(()=>effectiveExecutionConstants(constants,candidate),/bootstrap/);
  }
  const successor=effectiveExecutionConstants(constants,contract).execution_boundary_records.offline_workspace.target_registry.filter(t=>t.step_id==='establish-functional-successor-static-integration');
  assert.ok(inputReceiptPaths(successor).includes('artifacts/functional-laptop/execution-boundaries/offline-workspace/receipt.json'));
});
test('a real cold foundation claim satisfies the entire strict fingerprint validator', () => {
  const doc=ready(),step=functional(doc).steps.find(item => item.id === contract.replacement_setup.step_spec.id);
  assert.doesNotThrow(()=>checkState(doc));
  step.runs.at(-1).input_fingerprint.runner_identity.target_registry_sha256='0'.repeat(64);
  assert.throws(()=>checkState(doc),/closed target-registry fingerprint drift/);
});

test('the fixed Chapter 40 replacement setup receives the same complete strict run fingerprint', () => {
  const fingerprint = buildBootstrapInputFingerprint(root, 'establish-ch40-course-toolchain-v2');
  assert.deepEqual(Object.keys(fingerprint), [
    'source_commit_sha1','source_tree_sha1','plan_sha256','checker_sha256','step_spec_sha256',
    'input_hashes','lock_hashes','runner_identity','cache_receipts'
  ]);
  assert.equal(fingerprint.step_spec_sha256, sha(Buffer.from(JSON.stringify(
    Object.fromEntries(['id','objective','depends_on','inputs','outputs','acceptance','validate','cost'].map((field) => [field,contract.replacement_setup.step_spec[field]]))
  ))));
  assert.equal(fingerprint.input_hashes.declared_inputs_sha256, sha(Buffer.from(JSON.stringify(contract.replacement_setup.step_spec.inputs))));
});
