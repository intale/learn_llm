import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { dispatchVerifiers, verifierInvocations } from '../check-functional-chapter-reviews.mjs';

const repositoryRoot = resolve(process.cwd());
const englishVerifier = resolve(repositoryRoot, '.agents/skills/author-llm-course-english/scripts/english-review.mjs');
const russianVerifier = resolve(repositoryRoot, '.agents/skills/localize-llm-course/scripts/localization-review.mjs');

function expected(root, reviewRoot, corrective = false) {
  const english = `${reviewRoot}/${corrective ? 'english-candidate-01' : 'english'}`;
  const russian = `${reviewRoot}/${corrective ? 'ru-candidate-01' : 'ru'}`;
  return [
    {
      executable: process.execPath,
      args: [englishVerifier, 'verify', '--spec', `${english}/spec.json`, '--bundle', `${english}/bundle`, '--review-routing', `${english}/${corrective ? 'review-routing.json' : 'review-routing.json'}`, '--review-seals', `${english}/review-seals`, '--adjudication-bundle', `${english}/adjudication-bundle`, '--adjudication-routing', `${english}/adjudication-routing.json`, '--adjudication-seals', `${english}/adjudication-seals`, '--root', root],
    },
    {
      executable: process.execPath,
      args: [russianVerifier, 'verify', '--spec', `${russian}/spec.json`, '--bundle', `${russian}/bundle`, '--bilingual-record', `${russian}/bilingual.raw.json`, '--target-only-record', `${russian}/target-only.raw.json`, '--root', root],
    },
  ];
}

test('reference-core dispatch uses only the fixed canonical verifier roots and complete seal inputs', () => {
  assert.deepEqual(verifierInvocations('reference-core', repositoryRoot), expected(repositoryRoot, 'audits/functional-laptop/reviews/reference-core-reframe', true));
});

test('measured PostgreSQL dispatch uses its separate frozen verifier root', () => {
  assert.deepEqual(verifierInvocations('measured-postgresql-v1', repositoryRoot), expected(repositoryRoot, 'audits/functional-laptop/reviews/85-persistence-scale-decision-measured-postgresql-v1'));
});

test('unknown roots are rejected instead of accepting caller-supplied review paths', () => {
  for (const scope of ['another-root', '__proto__', 'constructor', 'toString']) {
    assert.throws(() => verifierInvocations(scope, repositoryRoot), /scope must be/);
  }
});

test('the real English verifier rejects a missing review specification', () => {
  const invocation = verifierInvocations('reference-core', repositoryRoot)[0];
  const result = spawnSync(invocation.executable, invocation.args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    timeout: 30_000,
  });
  assert.equal(result.error, undefined, result.error?.message);
  assert.notEqual(result.status, 0);
  assert.match(`${result.stderr}${result.stdout}`, /spec|ENOENT|not found|does not exist/i);
});

test('a missing or invalid English seal rejection is propagated and prevents a later verifier call', () => {
  for (const verifierExit of [2, 3]) {
    const calls = [];
    const status = dispatchVerifiers('reference-core', {
      root: repositoryRoot,
      run(executable, args, options) {
        calls.push({ executable, args, options });
        return { status: verifierExit };
      },
    });
    assert.equal(status, verifierExit);
    assert.equal(calls.length, 1);
    assert.ok(calls[0].args.includes('--review-seals'));
    assert.ok(calls[0].args.includes('--adjudication-seals'));
  }
});

test('a Russian verifier rejection is propagated without rewriting its raw review records', () => {
  const calls = [];
  const status = dispatchVerifiers('measured-postgresql-v1', {
    root: repositoryRoot,
    run(executable, args, options) {
      calls.push({ executable, args, options });
      return { status: calls.length === 1 ? 0 : 7 };
    },
  });
  assert.equal(status, 7);
  assert.equal(calls.length, 2);
  assert.ok(calls[1].args.includes('--bilingual-record'));
  assert.ok(calls[1].args.includes('--target-only-record'));
  assert.ok(calls.every((call) => call.options.shell === false && call.options.stdio === 'inherit'));
  assert.ok(calls.every((call) => !call.args.includes('--boolean') && !call.args.includes('--response')));
});

test('successful dispatch runs English then Russian and returns no semantic surrogate', () => {
  const calls = [];
  const status = dispatchVerifiers('reference-core', {
    root: repositoryRoot,
    run(executable, args) {
      calls.push([executable, args]);
      return { status: 0, stdout: '{"status":"pass"}' };
    },
  });
  assert.equal(status, 0);
  assert.equal(calls.length, 2);
  assert.equal(calls[0][1][1], 'verify');
  assert.equal(calls[1][1][1], 'verify');
});

test('Chapter41 dispatch uses current publication evidence and its baseline-chain or command-only gate',()=>{
  const prefix='audits/functional-laptop/reviews/41-corpus-preparation/english-candidate-02';
  const invocations=verifierInvocations('ch41-corpus-preparation',repositoryRoot);
  assert.deepEqual(invocations,[{
    executable:process.execPath,
    args:[resolve(repositoryRoot,'scripts/check-functional-step-receipt.mjs'),'41-corpus-preparation'],
  }]);
  assert.ok(!invocations[0].args.some(a=>a.includes('/ru/')));
});
test('Chapter41 propagates real verifier refusal without another locale dispatch',()=>{
  const calls=[];
  assert.equal(dispatchVerifiers('ch41-corpus-preparation',{root:repositoryRoot,
    run(executable,args,options){calls.push({executable,args,options});return {status:3};}}),3);
  assert.equal(calls.length,1);
  assert.deepEqual(calls[0].args,[resolve(repositoryRoot,'scripts/check-functional-step-receipt.mjs'),'41-corpus-preparation']);
  assert.equal(calls[0].options.shell,false);
});
