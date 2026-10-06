#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const SHA=/^[0-9a-f]{64}$/;
const CHECKS=['actual_publication','actual_readonly_replay','consumer_write_refused','generated_fixture_handoff','symlink_refused','wrong_mode_refused','wrong_uid_refused','private_url_redacted','unapproved_endpoint_refused'];
export function validateCacheReceipt(record,{step='establish-functional-artifact-cache-execution-boundary'}={}){
 if(record?.schema_version!==1||record.step_id!==step||record.target_id!=='artifact-cache-v1'||record.evidence_kind!=='synthetic-offline-fixture'||record.network!=='none'||!SHA.test(record.artifact_id)||!/^sha256:[0-9a-f]{64}$/.test(record.image_id)||!SHA.test(record.tool_build_receipt_sha256)||!SHA.test(record.producer_receipt_sha256))throw new Error('invalid cache receipt');
 if(Object.keys(record.checks??{}).sort().join()!==[...CHECKS].sort().join()||CHECKS.some(k=>record.checks[k]!==true))throw new Error('incomplete cache evidence');
 if(record.verified_bundle?.artifact_id!==record.artifact_id||record.verified_bundle?.evidence_kind!=='synthetic-offline-fixture')throw new Error('bundle identity mismatch');
 return true;
}
if(import.meta.url===pathToFileURL(resolve(process.argv[1]??'')).href){
 try{const args=process.argv.slice(2);if(args.length!==4||args[0]!=='--step'||args[2]!=='--receipt')throw new Error('closed CLI');validateCacheReceipt(JSON.parse(readFileSync(args[3],'utf8')),{step:args[1]});console.log('Artifact cache receipt structure and declared operational checks pass; no content judgment.');}catch{console.error('Artifact cache receipt rejected');process.exitCode=2;}
}
