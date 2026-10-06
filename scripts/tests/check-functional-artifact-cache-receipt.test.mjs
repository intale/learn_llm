import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCacheReceipt} from '../check-functional-artifact-cache-receipt.mjs';
// Structural unit fixture, not an actual executed operational receipt.
const receipt={schema_version:2,step_id:'refactor-ch41-content-only-boundary',target_id:'artifact-cache-v2',evidence_kind:'synthetic-offline-fixture',network:'none',artifact_id:'a'.repeat(64),image_id:'sha256:'+'b'.repeat(64),tool_build_receipt_sha256:'c'.repeat(64),producer_receipt_sha256:'d'.repeat(64),verified_bundle:{artifact_id:'a'.repeat(64),evidence_kind:'synthetic-offline-fixture'},checks:{actual_publication:true,actual_readonly_replay:true,consumer_write_refused:true,generated_fixture_handoff:true,corrupt_payload_refused:true,symlink_refused:true,wrong_mode_refused:true,wrong_uid_refused:true}};
test('current receipt structural fixture passes',()=>assert.equal(validateCacheReceipt(receipt),true));
test('missing false or extra checks refuse',()=>{for(const change of [r=>delete r.checks.corrupt_payload_refused,r=>r.checks.actual_publication=false,r=>r.checks.unexecuted=true]){const r=structuredClone(receipt);change(r);assert.throws(()=>validateCacheReceipt(r));}});
test('network identity schema and policy substitution refuse',()=>{for(const [key,value]of [['network','bridge'],['evidence_kind','production-source-policy'],['artifact_id','../escape'],['image_id','latest'],['schema_version',1]])assert.throws(()=>validateCacheReceipt({...receipt,[key]:value}));});
