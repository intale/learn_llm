import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,rmSync,symlinkSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import test from 'node:test';
import {FROZEN_ASSIGNMENTS,ORIGINAL_FUNCTIONAL_CHECKER,loadFrozenFunctionalDesign,parseFrozenFunctionalAssignments} from '../lib/frozen-functional-design.mjs';
const assignments=()=>Object.entries(FROZEN_ASSIGNMENTS).map(([name,marker])=>'const '+name+' = /* '+marker+' */ '+JSON.stringify(name==='EMBEDDED_PLAN_BODY'?'bounded fixture body':{fixture:name})+';').join('\n')+'\n';
test('fixed marked JSON assignments use JSON syntax and preserve all six values',()=>{
  const result=parseFrozenFunctionalAssignments(Buffer.from(assignments()));
  assert.deepEqual(Object.keys(result),Object.keys(FROZEN_ASSIGNMENTS));
  assert.equal(result.EMBEDDED_PLAN_BODY,'bounded fixture body');
  assert.deepEqual(result.EMBEDDED_CONSTANTS,{fixture:'EMBEDDED_CONSTANTS'});
});
test('missing duplicated incorrect-marker incomplete and wrong-shape assignments refuse',()=>{
  const original=assignments(),first=original.split('\n')[0];
  for(const source of [original.replace(first+'\n',''),original+first+'\n',original.replace('embedded frozen constants','other marker'),original.replace(first,first.slice(0,-1)),original.replace('"bounded fixture body"','{}'),original.replace('{"fixture":"EMBEDDED_QUEUE"}','[]'),original.replace('{"fixture":"EMBEDDED_SCHEMA"}','null')])
    assert.throws(()=>parseFrozenFunctionalAssignments(Buffer.from(source)));
  assert.throws(()=>parseFrozenFunctionalAssignments(Buffer.from([0xff])),/encoded data/);
  assert.throws(()=>parseFrozenFunctionalAssignments(Buffer.alloc(8*1024*1024+1)),/bounded/);
});
test('retrieved source cannot execute code or substitute a new historical dataset',t=>{
  const root=mkdtempSync(resolve(tmpdir(),'functional-frozen-source-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
  assert.throws(()=>loadFrozenFunctionalDesign(undefined),/explicit/);
  assert.throws(()=>loadFrozenFunctionalDesign(root),/ENOENT/);
  mkdirSync(resolve(root,'scripts'));writeFileSync(resolve(root,ORIGINAL_FUNCTIONAL_CHECKER),assignments());
  assert.throws(()=>loadFrozenFunctionalDesign(root),/identity drift/);
  const hostile=assignments().replace('{"fixture":"EMBEDDED_CONSTANTS"}',"(()=>{globalThis.frozenFixtureExecuted=true;return {}})()");
  assert.throws(()=>parseFrozenFunctionalAssignments(Buffer.from(hostile)));
  assert.equal(globalThis.frozenFixtureExecuted,undefined);
  rmSync(resolve(root,ORIGINAL_FUNCTIONAL_CHECKER));symlinkSync('/missing',resolve(root,ORIGINAL_FUNCTIONAL_CHECKER));
  assert.throws(()=>loadFrozenFunctionalDesign(root),/symlink/);
});
