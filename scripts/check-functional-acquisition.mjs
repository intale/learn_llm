#!/usr/bin/env node
// Supplementary deterministic wiring/report checks, not a Rust-policy verifier.
import {resolve, dirname} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {closed, readRegularFile} from './check-functional-step-receipt.mjs';
import {checkFunctionalRustOwnership, ownedSources, parseRegistryFragment, readFunctionalPlan} from './check-functional-rust-ownership.mjs';
import {demoPaths} from './check-functional-rust-examples.mjs';

const CHAPTER = '41-governed-corpus-acquisition';
export function validateFixtureReport(report) {
  closed(report, ['artifact_id','artifact_manifest_bytes','attribution_variant_artifact_id','budget_case','checks','files','inventoried_files','logical_sources','privacy_quality_or_redistribution_approval','raw_bytes','resume','schema_version','scope','total_payload_bytes'], 'fixture report');
  if (report.schema_version !== 1 || report.scope !== 'synthetic-offline-fixture' ||
      report.privacy_quality_or_redistribution_approval !== false ||
      report.logical_sources !== 2 || report.inventoried_files !== 4 ||
      report.raw_bytes !== 9 || report.total_payload_bytes !== 46 || report.artifact_manifest_bytes !== 3084 ||
      !/^[0-9a-f]{64}$/.test(report.artifact_id) || !/^[0-9a-f]{64}$/.test(report.attribution_variant_artifact_id) ||
      report.artifact_id === report.attribution_variant_artifact_id)
    throw new Error('offline fixture identity/count/scope drift');
  closed(report.budget_case, ['acknowledged_body_bytes','attempts_after_refusal','ceiling_bytes','dispatch_permitted','projected_required_bytes','refusal','remaining_raw_bytes'], 'budget case');
  if (report.budget_case.dispatch_permitted !== false || report.budget_case.refusal !== 'TransferBudget' ||
      report.budget_case.acknowledged_body_bytes !== 2 || report.budget_case.remaining_raw_bytes !== 9 ||
      report.budget_case.projected_required_bytes !== 11 || report.budget_case.ceiling_bytes !== 10 ||
      report.budget_case.attempts_after_refusal !== 1) throw new Error('fixture refusal report drift');
  closed(report.resume, ['acknowledged_body_bytes','attempts','complete_pair','uncertain_body_bytes'], 'resume report');
  if (report.resume.complete_pair !== true || report.resume.acknowledged_body_bytes !== 9 ||
      report.resume.uncertain_body_bytes !== 0 || JSON.stringify(report.resume.attempts) !== '[2,1]')
    throw new Error('fixture resume report drift');
  closed(report.checks, ['attribution_change_changes_bundle_identity','attribution_change_preserves_raw_digests','complete_bundle_replay_identity','same_size_wrong_bytes_refusal','size_only_contrast_accepts_abd'], 'fixture checks');
  if (Object.entries(report.checks).some(([key,value]) => value !== (key === 'same_size_wrong_bytes_refusal' ? 'Hash' : true)))
    throw new Error('fixture observation report drift');
  const expected = [['provenance/ATTRIBUTION.txt',24],['provenance/LICENSE.txt',13],['raw/train.txt',3],['raw/valid.txt',6]];
  if (!Array.isArray(report.files) || report.files.length !== expected.length) throw new Error('fixture file inventory drift');
  for (const [i,file] of report.files.entries()) {
    closed(file, ['bytes','path','sha256'], 'fixture file');
    if (file.path !== expected[i][0] || file.bytes !== expected[i][1] || !/^[0-9a-f]{64}$/.test(file.sha256))
      throw new Error('fixture file report drift');
  }
  return {scope: report.scope, fixtureFiles: report.files.length};
}

export function checkFunctionalAcquisition(root, chapterId = CHAPTER) {
  if (chapterId !== CHAPTER) throw new Error('only the Chapter41 offline protocol boundary is implemented');
  checkFunctionalRustOwnership(root);
  const demo = demoPaths(CHAPTER);
  for (const path of [demo.source,demo.library,demo.manifest,'rust/demos/ch41-governed-corpus-acquisition/src/bin/artifact-policy-worker.rs','rust/demos/ch41-governed-corpus-acquisition/tests/governed_acquisition.rs','scripts/lib/governed-acquisition-transport.mjs','scripts/lib/governed-acquisition-worker-client.mjs','scripts/tests/fixtures/governed-transport-round-trip.mjs'])
    readRegularFile(root,path);
  const fragment = 'ch41-governed-corpus-acquisition.module';
  const records = parseRegistryFragment(fragment, readRegularFile(root,'rust/crates/llm-from-scratch/module-registry/functional-v1/'+fragment,65536),ownedSources(readFunctionalPlan(root)));
  if (records.length !== 4) throw new Error('Chapter41 requires its four owned artifact modules');
  const report = JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(readRegularFile(root,demo.expected,1048576)));
  return {...validateFixtureReport(report), registeredSources:records.length,
    evidenceBoundary:'Supplementary wiring/report checks only; actual Rust tests and worker roundtrip are separately required. Real cache execution and corpus acquisition are not executed.'};
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? '')).href) {
  try {
    const args=process.argv.slice(2);
    if(args.length!==2||args[0]!=='--chapter')throw new Error('usage: check-functional-acquisition.mjs --chapter 41-governed-corpus-acquisition');
    console.log(JSON.stringify(checkFunctionalAcquisition(resolve(dirname(fileURLToPath(import.meta.url)),'..'),args[1])));
  } catch(error) { console.error(error.message); process.exitCode=1; }
}
