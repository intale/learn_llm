import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {validateFixtureReport,checkFunctionalAcquisition} from '../check-functional-acquisition.mjs';
import {runAcquisitionCommand} from '../acquire-functional-llm-artifacts.mjs';

const report=JSON.parse(readFileSync(new URL('../../rust/demos/ch41-governed-corpus-acquisition/expected.txt',import.meta.url)));
test('actual offline report has the supplementary current structure',()=>{
  assert.deepEqual(validateFixtureReport(report),{scope:'synthetic-offline-fixture',fixtureFiles:4});
});
test('report drift refuses without a Rust-policy surrogate',()=>{
  for (const change of [r=>r.scope='production',r=>r.privacy_quality_or_redistribution_approval=true,r=>r.raw_bytes=46,
    r=>r.budget_case.dispatch_permitted=true,r=>r.resume.attempts=[1,1],r=>r.files.pop(),
    r=>r.files[0].path='../outside',r=>r.files[0].sha256='G'.repeat(64),r=>r.extra=true]) {
    const altered=structuredClone(report);change(altered);assert.throws(()=>validateFixtureReport(altered));
  }
});
test('all live acquisition commands refuse without exposing supplied arguments',()=>{
  for (const args of [[],['--url','https://secret.invalid/?token=private'],['--chapter','41-governed-corpus-acquisition'],['--policy','production-source-policy']]) {
    let diagnostic='';assert.equal(runAcquisitionCommand(args,{write:s=>diagnostic+=s}),2);
    assert.match(diagnostic,/refused/);assert.ok(!diagnostic.includes('private'));
  }
  assert.equal(runAcquisitionCommand(['--help'],{write:()=>{}}),0);
});
test('unknown chapters and missing roots reject',()=>{
  assert.throws(()=>checkFunctionalAcquisition('/missing','42-deterministic-corpus-filtering'),/only the Chapter41/);
  assert.throws(()=>checkFunctionalAcquisition('/missing'));
});
test('cache wrapper refuses future execution, replay wrapper retains chapter-only dispatch',()=>{
  for (const [file,args] of [['check-functional-artifact-cache.sh',[]],['check-functional-offline-replay.sh',['--chapter','42-deterministic-corpus-filtering']]]) {
    const result=spawnSync('bash',[new URL('../'+file,import.meta.url).pathname,...args],{encoding:'utf8'});
    assert.equal(result.status,2);assert.equal(result.error,undefined);
    assert.match(result.stderr,/refused|usage/);
  }
});
