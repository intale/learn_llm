import test from 'node:test';
import assert from 'node:assert/strict';
import {examplePaths,validateExampleOutput} from '../check-functional-rust-examples.mjs';
test('functional examples use only the cumulative crate named target and golden',()=>{
  assert.deepEqual(examplePaths('40-reference-core-handoff'),{
    example:'ch40_reference_core_handoff',
    source:'rust/crates/llm-from-scratch/examples/ch40_reference_core_handoff.rs',
    expected:'rust/crates/llm-from-scratch/examples/expected/ch40_reference_core_handoff.txt',
    fragment:'rust/crates/llm-from-scratch/module-registry/functional-v1/ch40-reference-core-handoff.module'});
});
test('unsafe and out-of-range example IDs refuse',()=>{
  for(const id of ['../40-ref','39-old','86-extra','40_bad','40-x/../../'])
    assert.throws(()=>examplePaths(id));
});
test('stdout is compared as exact bytes, not trimmed or projected',()=>{
  validateExampleOutput(Buffer.from('ok\n'),Buffer.from('ok\n'));
  for(const bytes of ['ok','ok\n\n','different\n',' ok\n'])
    assert.throws(()=>validateExampleOutput(Buffer.from(bytes),Buffer.from('ok\n')));
});
