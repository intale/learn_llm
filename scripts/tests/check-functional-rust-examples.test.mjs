import test from 'node:test';
import assert from 'node:assert/strict';
import {examplePaths,demoPaths,validateExampleOutput} from '../check-functional-rust-examples.mjs';
test('functional examples use only the cumulative crate named target and golden',()=>{
  assert.deepEqual(examplePaths('42-deterministic-corpus-filtering'),{
    example:'ch42_deterministic_corpus_filtering',
    source:'rust/crates/llm-from-scratch/examples/ch42_deterministic_corpus_filtering.rs',
    expected:'rust/crates/llm-from-scratch/examples/expected/ch42_deterministic_corpus_filtering.txt',
    fragment:'rust/crates/llm-from-scratch/module-registry/functional-v1/ch42-deterministic-corpus-filtering.module'});
});
test('only exact Chapters40/41 use approved demo targets',()=>{
  assert.deepEqual(demoPaths('40-reference-core-handoff'),{
    package:'ch40-reference-core-handoff',source:'rust/demos/ch40-reference-core-handoff/src/main.rs',
    library:'rust/demos/ch40-reference-core-handoff/src/lib.rs',manifest:'rust/demos/ch40-reference-core-handoff/Cargo.toml',
    expected:'rust/demos/ch40-reference-core-handoff/expected.txt'});
  assert.throws(()=>examplePaths('40-reference-core-handoff'));
  for(const id of ['42-deterministic-corpus-filtering','41-unapproved-demo','40-unapproved-demo','../40-ref'])assert.throws(()=>demoPaths(id));
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

test('Chapter41 demo target retains separate shared library registry ownership',()=>{
  assert.deepEqual(demoPaths('41-governed-corpus-acquisition'),{
    package:'ch41-governed-corpus-acquisition',source:'rust/demos/ch41-governed-corpus-acquisition/src/main.rs',
    library:'rust/demos/ch41-governed-corpus-acquisition/src/lib.rs',manifest:'rust/demos/ch41-governed-corpus-acquisition/Cargo.toml',
    expected:'rust/demos/ch41-governed-corpus-acquisition/expected.txt'});
  assert.throws(()=>examplePaths('41-governed-corpus-acquisition'));
});
