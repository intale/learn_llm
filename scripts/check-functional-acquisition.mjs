#!/usr/bin/env node
// Supplementary wiring/report checks, not a substitute for Rust verification.
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {closed,readRegularFile} from './check-functional-step-receipt.mjs';
import {checkFunctionalRustOwnership,ownedSources,parseRegistryFragment,readFunctionalPlan} from './check-functional-rust-ownership.mjs';
import {demoPaths} from './check-functional-rust-examples.mjs';
const CHAPTER='41-governed-corpus-acquisition';
export function validateFixtureReport(report){
 closed(report,['artifact_id','artifact_manifest_bytes','attribution_variant_artifact_id','checks','inventoried_payloads','logical_sources','payloads','privacy_quality_or_redistribution_approval','raw_bytes','schema_version','scope','total_payload_bytes'],'fixture report');
 if(report.schema_version!==2||report.scope!=='synthetic-offline-fixture'||report.privacy_quality_or_redistribution_approval!==false||report.logical_sources!==2||report.inventoried_payloads!==4||report.raw_bytes!==9||report.total_payload_bytes!==46||report.artifact_manifest_bytes!==1756||!(/^[0-9a-f]{64}$/.test(report.artifact_id))||!(/^[0-9a-f]{64}$/.test(report.attribution_variant_artifact_id))||report.artifact_id===report.attribution_variant_artifact_id)throw Error('offline fixture identity/count/scope drift');
 closed(report.checks,['attribution_change_changes_bundle_identity','attribution_change_preserves_raw_digests','complete_bundle_replay_identity','failure_preserves_prior_bundle','same_size_wrong_bytes_refusal','size_only_contrast_accepts_abd'],'fixture checks');
 if(Object.entries(report.checks).some(([key,value])=>value!==(key==='same_size_wrong_bytes_refusal'?'Hash':true)))throw Error('fixture observation drift');
 const expected=[['attribution',24],['license',13],['train',3],['validation',6]];
 if(!Array.isArray(report.payloads)||report.payloads.length!==expected.length)throw Error('fixture inventory drift');
 for(const [i,p]of report.payloads.entries()){closed(p,['bytes','id','sha256'],'fixture payload');if(p.id!==expected[i][0]||p.bytes!==expected[i][1]||!(/^[0-9a-f]{64}$/.test(p.sha256)))throw Error('fixture payload drift');}
 return {scope:report.scope,fixturePayloads:report.payloads.length};
}
export function checkFunctionalAcquisition(root,chapterId=CHAPTER){
 if(chapterId!==CHAPTER)throw Error('only the Chapter41 content boundary is implemented');checkFunctionalRustOwnership(root);const demo=demoPaths(CHAPTER);
 for(const path of [demo.source,demo.library,demo.manifest,'rust/demos/ch41-governed-corpus-acquisition/tests/governed_acquisition.rs','rust/tools/functional-artifact-cache/src/filesystem.rs'])readRegularFile(root,path);
 const fragment='ch41-governed-corpus-acquisition.module',records=parseRegistryFragment(fragment,readRegularFile(root,'rust/crates/llm-from-scratch/module-registry/functional-v1/'+fragment,65536),ownedSources(readFunctionalPlan(root)));if(records.length!==4)throw Error('Chapter41 requires four content modules');
 const report=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(readRegularFile(root,demo.expected,1048576)));
 return {...validateFixtureReport(report),registeredSources:records.length,evidenceBoundary:'Supplementary wiring/report checks only. Actual content tests and configured external storage checks are separate; no corpus download is executed.'};
}
if(import.meta.url===pathToFileURL(resolve(process.argv[1]??'')).href){try{const args=process.argv.slice(2);if(args.length!==2||args[0]!=='--chapter')throw Error('closed chapter CLI');console.log(JSON.stringify(checkFunctionalAcquisition(resolve(dirname(fileURLToPath(import.meta.url)),'..'),args[1])));}catch(error){console.error(error.message);process.exitCode=1;}}
