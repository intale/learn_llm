import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCacheReceipt} from '../check-functional-artifact-cache-receipt.mjs';
const checks=Object.fromEntries(['actual_publication','actual_readonly_replay','consumer_write_refused','generated_fixture_handoff','symlink_refused','wrong_mode_refused','wrong_uid_refused','private_url_redacted','unapproved_endpoint_refused'].map(k=>[k,true]));
const receipt={schema_version:1,step_id:'establish-functional-artifact-cache-execution-boundary',target_id:'artifact-cache-v1',evidence_kind:'synthetic-offline-fixture',network:'none',artifact_id:'a'.repeat(64),image_id:'sha256:'+'b'.repeat(64),tool_build_receipt_sha256:'c'.repeat(64),producer_receipt_sha256:'d'.repeat(64),checks,verified_bundle:{artifact_id:'a'.repeat(64),evidence_kind:'synthetic-offline-fixture'}};
test('complete synthetic evidence is structurally valid',()=>assert.equal(validateCacheReceipt(receipt),true));
test('missing false or additional checks refuse',()=>{for(const change of [r=>delete r.checks.actual_publication,r=>r.checks.consumer_write_refused=false,r=>r.checks.fabricated=true]){const r=structuredClone(receipt);change(r);assert.throws(()=>validateCacheReceipt(r));}});
test('network identity and policy substitutions refuse',()=>{for(const [key,value] of [['network','bridge'],['evidence_kind','production-source-policy'],['artifact_id','../escape'],['image_id','latest']]){const r=structuredClone(receipt);r[key]=value;assert.throws(()=>validateCacheReceipt(r));}});
test('selected bundle mismatch refuses',()=>{const r=structuredClone(receipt);r.verified_bundle.artifact_id='f'.repeat(64);assert.throws(()=>validateCacheReceipt(r));});
