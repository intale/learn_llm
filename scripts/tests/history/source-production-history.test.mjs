import assert from 'node:assert/strict';
import {cpSync,mkdtempSync,mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,resolve} from 'node:path';
import test from 'node:test';
import {verifySourceProductionHistory,SOURCE_METADATA_MANIFEST,SOURCE_ASSET_CONFIG,ORIGINAL_METADATA_INVENTORY} from '../../lib/source-metadata-inputs.mjs';
const root=resolve(import.meta.dirname,'../../..');
const historyRoot=process.env.COURSE_HISTORY_ROOT;
if(!historyRoot)throw new Error('COURSE_HISTORY_ROOT must select an exact MCP-exported checkpoint');
const options={stepId:'acquire-functional-tinystories-raw-pair',targetId:'acquire-functional-tinystories-raw-pair-v2'};
test('actual exported original source history validates all fourteen metadata and sixteen producer inputs',()=>{
  const {accepted}=verifySourceProductionHistory(root,historyRoot,options);
  assert.equal(accepted.producer_inputs.length,16);
});
test('an omitted or changed producer snapshot cannot be rescued by the minimal local inputs',t=>{
  const copy=mkdtempSync(resolve(tmpdir(),'source-proof-history-'));t.after(()=>rmSync(copy,{recursive:true,force:true}));
  const bindingPath='artifacts/functional-laptop/acquisition/tinystories/content-v2-production-binding.json';
  const inventory=JSON.parse(readFileSync(resolve(historyRoot,ORIGINAL_METADATA_INVENTORY))),binding=JSON.parse(readFileSync(resolve(historyRoot,bindingPath)));
  for(const path of new Set([SOURCE_ASSET_CONFIG,ORIGINAL_METADATA_INVENTORY,bindingPath,...inventory.files.map(f=>f.path),...binding.producer_inputs.map(f=>f.path)])){
    mkdirSync(dirname(resolve(copy,path)),{recursive:true});cpSync(resolve(historyRoot,path),resolve(copy,path));
  }
  verifySourceProductionHistory(root,copy,options);
  const receipt=inventory.files.find(f=>f.path.endsWith('tinystories-card.receipt.json')).path;
  writeFileSync(resolve(copy,receipt),'changed\n');assert.throws(()=>verifySourceProductionHistory(root,copy,options),/producer input drift/);
  rmSync(resolve(copy,receipt));assert.throws(()=>verifySourceProductionHistory(root,copy,options));
});
