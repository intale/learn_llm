import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateFixtureReport} from '../check-functional-acquisition.mjs';
const report=JSON.parse(readFileSync(new URL('../../rust/demos/ch41-governed-corpus-acquisition/expected.txt',import.meta.url),'utf8'));
test('actual generated content-only fixture report has no retrieval/path assumptions',()=>{assert.deepEqual(validateFixtureReport(report),{scope:'synthetic-offline-fixture',fixturePayloads:4});});
test('legacy protocol fields and falsely broadened approval refuse',()=>{for(const changed of [{...report,resume:{}},{...report,budget_case:{}},{...report,privacy_quality_or_redistribution_approval:true},{...report,schema_version:1}])assert.throws(()=>validateFixtureReport(changed));});
test('changed counts identity evidence or private-stage assertion refuse',()=>{for(const key of ['raw_bytes','total_payload_bytes','inventoried_payloads','logical_sources','artifact_manifest_bytes'])assert.throws(()=>validateFixtureReport({...report,[key]:report[key]+1}));const changed=structuredClone(report);changed.checks.failure_preserves_prior_bundle=false;assert.throws(()=>validateFixtureReport(changed));});
