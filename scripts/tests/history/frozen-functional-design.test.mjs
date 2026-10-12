import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';
import {FROZEN_ASSIGNMENTS,ORIGINAL_FUNCTIONAL_CHECKER,loadFrozenFunctionalDesign} from '../../lib/frozen-functional-design.mjs';
const historyRoot=process.env.COURSE_HISTORY_ROOT;
if(!historyRoot)throw new Error('COURSE_HISTORY_ROOT must select an exact MCP-exported checkpoint');
test('all six exact historical values equal the original source literals without executing retrieved code',()=>{
  const original=readFileSync(resolve(historyRoot,ORIGINAL_FUNCTIONAL_CHECKER),'utf8');
  const maintained=loadFrozenFunctionalDesign(historyRoot);
  for(const name of Object.keys(FROZEN_ASSIGNMENTS)) {
    const line=original.split('\n').find(line=>line.startsWith('const '+name+' = '));
    const raw=line.slice(line.indexOf('*/')+3,-1);
    assert.deepEqual(maintained[name],JSON.parse(raw));
  }
});
