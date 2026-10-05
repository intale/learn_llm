import test from 'node:test';
import assert from 'node:assert/strict';
import {contractDispatch} from '../check-functional-chapter-contract.mjs';
test('legacy and successor contract dispatch retain the boundary',()=>{
  assert.equal(contractDispatch('00-llm-parts'),'legacy-demo');
  assert.equal(contractDispatch('39-end-to-end-llm'),'legacy-demo');
  assert.equal(contractDispatch('40-reference-core-handoff'),'successor-demo');
  assert.equal(contractDispatch('41-governed-corpus-acquisition'),'successor-demo');
  assert.equal(contractDispatch('40-unapproved-demo'),'functional-example');
  assert.equal(contractDispatch('41-unapproved-demo'),'functional-example');
  assert.equal(contractDispatch('42-deterministic-corpus-filtering'),'functional-example');
  assert.equal(contractDispatch('85-persistence-scale-decision'),'functional-example');
});
test('malformed contract IDs never choose a branch',()=>{
  for(const id of ['40','../40-ref','ab-ref','40_foo','40-x/../'])assert.throws(()=>contractDispatch(id));
});
