import test from 'node:test';
import assert from 'node:assert/strict';
import {examplePaths,demoPaths,validateExampleOutput} from '../check-functional-rust-examples.mjs';
test('functional examples use only the cumulative crate named target and golden',()=>{
  assert.deepEqual(examplePaths('41-governed-corpus-acquisition'),{
    example:'ch41_governed_corpus_acquisition',
    source:'rust/crates/llm-from-scratch/examples/ch41_governed_corpus_acquisition.rs',
    expected:'rust/crates/llm-from-scratch/examples/expected/ch41_governed_corpus_acquisition.txt',
    fragment:'rust/crates/llm-from-scratch/module-registry/functional-v1/ch41-governed-corpus-acquisition.module'});
});
test('only Chapter40 uses the exact demo target without a cumulative fragment',()=>{
  assert.deepEqual(demoPaths('40-reference-core-handoff'),{
    package:'ch40-reference-core-handoff',source:'rust/demos/ch40-reference-core-handoff/src/main.rs',
    library:'rust/demos/ch40-reference-core-handoff/src/lib.rs',manifest:'rust/demos/ch40-reference-core-handoff/Cargo.toml',
    expected:'rust/demos/ch40-reference-core-handoff/expected.txt'});
  assert.throws(()=>examplePaths('40-reference-core-handoff'));
  for(const id of ['41-governed-corpus-acquisition','40-unapproved-demo','../40-ref'])assert.throws(()=>demoPaths(id));
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
