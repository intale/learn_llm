// Closed current-plan amendment. This does not alter or relabel historical runs.
import {createHash} from 'node:crypto';
export const CORPUS_MIGRATION_STEP='merge-ch41-nemo-corpus-preparation-20261007';
export const CORPUS_BULK_STEP='execute-functional-nemo-corpus-preparation';
export const CURRENT_CORPUS_BUILD='extend-course-functional-nemo-revision2-20261007';
const retainedPrelude=new Set(['establish-functional-offline-workspace-execution-boundary','establish-functional-firefox-execution-boundary','reframe-functional-reference-core-surfaces','establish-functional-successor-static-integration','implement-ch40-reference-core-handoff',CORPUS_MIGRATION_STEP,'establish-functional-artifact-cache-execution-boundary','acquire-functional-tinystories-raw-pair']);
const obsoleteSteps=new Set(['implement-ch41-governed-corpus-acquisition','implement-ch42-deterministic-corpus-filtering','implement-ch43-deduplication-decontamination','execute-functional-corpus-filtering','execute-functional-corpus-dedup-split']);
const dataIds=new Set(['CAP-DTH-DATA-01','CAP-DTH-DATA-02','CAP-DTH-DATA-03','CAP-DTH-DATA-04']);
const futureIds=["44-scalable-bpe-tokenizer","45-padded-variable-batches","46-packed-sequence-masks","47-depth-stable-decoder","48-configurable-decoder-core","49-dropout-semantics","50-dependency-error-contract","51-serving-config-admission","52-accelerator-tensor-parity","53-mixed-precision-training","54-memory-bounded-training","55-optimizer-schedules-clipping","56-tensor-artifact-interchange","57-immutable-artifact-persistence","58-exact-job-resume","59-resource-observability","60-multi-seed-evaluation","61-quantized-gguf-artifacts","62-laptop-hardware-admission","63-gqa-context-policy","64-online-tiled-attention","65-kv-block-pool","66-nucleus-penalties-logprobs","67-stop-strings-unicode-streaming","68-continuous-batch-scheduling","69-cancellation-backpressure-budgets","70-loopback-serving-metrics","71-lora-sft-adapters","72-direct-preference-optimization","73-qlora-boundary","74-prefix-cache-reuse","75-rope-context-scaling","76-retrieval-provenance","77-constrained-json-decoding","78-authorized-tools","79-safety-privacy-model-card","80-from-scratch-laptop-capstone","81-import-adapt-serve-capstone","82-advanced-decoding-serving","83-distributed-schedule-simulation","84-moe-routing-simulation","85-persistence-scale-decision"];
const oldIds=['41-governed-corpus-acquisition','42-deterministic-corpus-filtering','43-deduplication-decontamination'];
const formerStepReferences=new Map([...oldIds.map(id=>['implement-ch'+id,CORPUS_MIGRATION_STEP]),['execute-functional-corpus-filtering',CORPUS_BULK_STEP],['execute-functional-corpus-dedup-split',CORPUS_BULK_STEP]]);
const referencePattern=new RegExp([...oldIds,...futureIds].join('|')+'|(?<=\\bch)(?:4[4-9]|[5-7]\\d|8[0-5])(?=[_-])|(?<=\\bowner-ch)(?:4[4-9]|[5-7]\\d|8[0-5])\\b|(?<=\\bChapter )(?:4[4-9]|[5-7]\\d|8[0-5])\\b|(?<=\\bChapters )(?:4[4-9]|[5-7]\\d|8[0-5])\\b','g');
export const jsonDigest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function currentChapterNumber(number){
  if(!Number.isSafeInteger(number)||number<40||number>85)throw Error('chapter outside closed40..85 migration');
  return number>=44?number-2:number>=41?41:40;
}
export function mapCurrentReferences(text){
  if(typeof text!=='string')throw Error('migration expects a string');
  // URLs, immutable run paths and hexadecimal identities retain their origin bytes.
  if(text.includes('.build/runs/')||/^https?:\/\//.test(text)||/^[a-f0-9]{64}$/.test(text))return text;
  const pattern=new RegExp([...formerStepReferences.keys()].join('|')+'|'+referencePattern.source,'g');
  return text.replace(pattern,match=>formerStepReferences.has(match)?formerStepReferences.get(match):oldIds.includes(match)?'41-corpus-preparation':futureIds.includes(match)?String(Number(match.slice(0,2))-2)+match.slice(2):String(Number(match)-2));
}
export function mapCurrentValue(value){
  if(typeof value==='string')return mapCurrentReferences(value);
  if(Array.isArray(value))return value.map(mapCurrentValue);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,mapCurrentValue(item)]));
  return value;
}
export function deriveCurrentCorpusPlan(baseline,delta){
  if(baseline.plan_revision!==1||baseline.chapters.length!==46||baseline.chapters[0].order!==40||baseline.chapters.at(-1).order!==85)throw Error('expected exact historical revision-one range');
  if(delta.schema_version!==1||delta.owner_step!==CORPUS_MIGRATION_STEP||delta.chapter.chapter_id!=='41-corpus-preparation'||delta.pipeline.owner_step!==CORPUS_MIGRATION_STEP)throw Error('wrong explicit corpus delta');
  if(JSON.stringify(delta.localization_policy)!==JSON.stringify({first_english_only_chapter:40,last_bilingual_chapter:39,authority:'User explicitly deferred Russian40 on2026-10-07; preserve historical localization evidence.'}))throw Error('wrong explicit current localization delta');
  const plan=mapCurrentValue(baseline);
  const spec=structuredClone(delta.chapter);
  const old40=structuredClone(baseline.chapters[0]);
  old40.handoff='Chapter41 prepares supplied text externally and loads tool-neutral prepared JSONL';
  old40.active_locales=['en'];old40.russian_outputs=[];
  old40.special_gates=old40.special_gates.filter(gate=>gate!=='direct-russian-bilingual-target-only');
  // Chapter40 current ownership is its already accepted demo-only v5 exception.
  plan.chapters=[old40,spec,...baseline.chapters.slice(4).map(chapter=>{
    const current=mapCurrentValue(chapter);
    current.order=chapter.order-2;
    current.active_locales=['en'];current.russian_outputs=[];
    current.special_gates=current.special_gates.filter(gate=>gate!=='direct-russian-bilingual-target-only');
    current.current_amendment={owner_step:CORPUS_MIGRATION_STEP,origin_chapter_id:chapter.chapter_id,origin_implementation_step:chapter.implementation_step,localization:'Russian40+ deferred by user; English gates unchanged',agent_elapsed_stop:'none; workload/profile/test limits unchanged'};
    return current;
  })];
  plan.plan_revision=2;plan.chapter_count=44;plan.last_chapter=83;
  plan.teaching_formula_map=[structuredClone(baseline.teaching_formula_map[0]),{chapter_id:spec.chapter_id,formula_id:spec.teaching_formula_id,notation:spec.formula.notation,meaning:spec.formula.meaning},...baseline.teaching_formula_map.slice(4).map(mapCurrentValue)];
  plan.formula_ids=plan.teaching_formula_map.map(row=>row.formula_id);
  plan.rust_owners=[structuredClone(baseline.rust_owners[0]),{owner_id:'owner-ch41',chapter_id:spec.chapter_id,paths:[...spec.rust_owner_paths,'rust/crates/llm-from-scratch/module-registry/functional-v1/ch41-corpus-preparation.module','rust/demos/ch41-corpus-preparation/Cargo.toml','rust/demos/ch41-corpus-preparation/src/lib.rs','rust/demos/ch41-corpus-preparation/src/main.rs','rust/demos/ch41-corpus-preparation/expected.txt']},...baseline.rust_owners.slice(4).map(mapCurrentValue)];
  for(const row of plan.capability_map)if(dataIds.has(row.capability_id)){row.chapter_id=spec.chapter_id;row.implementation_step=CORPUS_MIGRATION_STEP;row.receipt=delta.pipeline.data_capability_mapping.receipt_parent+row.capability_id+'.json';row.evidence_scope=delta.pipeline.data_capability_mapping.evidence_scope;}
  for(const row of plan.finding_map)row.chapter_ids=[...new Set(row.chapter_ids)];
  const resource=plan.resource_projection;
  // The private decoder modality seam is not the corpus reader.
  resource.prepared_input=structuredClone(baseline.resource_projection.prepared_input);
  resource.prepared_input_architecture=structuredClone(baseline.resource_projection.prepared_input_architecture);
  const originalPipeline=baseline.resource_projection.execution_boundaries.data_pipeline;
  const pipeline=resource.execution_boundaries.data_pipeline;
  pipeline.steps=[...structuredClone(delta.pipeline.replacement_first_steps),...originalPipeline.steps.slice(2).map(mapCurrentValue)];
  const tokenizer=pipeline.steps.find(step=>step.step_id==='execute-functional-tokenizer-and-tokenized-splits');
  if(!tokenizer)throw Error('missing preserved tokenizer lifecycle');
  tokenizer.input_receipt=delta.pipeline.preserve_tokenizer_step_except.input_receipt;
  pipeline.standalone_tokenizer_oracle=structuredClone(originalPipeline.standalone_tokenizer_oracle);
  pipeline.bundle_chain=structuredClone(delta.pipeline.bundle_chain);
  const cache=resource.execution_boundaries.artifact_cache;
  cache.target_registry=cache.target_registry.filter(target=>target.step_id!==CORPUS_BULK_STEP&&!obsoleteSteps.has(target.step_id));
  cache.target_registry.push({...structuredClone(delta.pipeline.current_artifact_cache_target_replacement.add),status:'pending-bulk-configuration-and-resource-preflight',input_receipts:[pipeline.steps[0].input_receipt],output_roles:structuredClone(pipeline.steps[0].output_roles),network_by_mode:{'publish-generated':'none',verify:'none'},cache_mount_by_mode:{'publish-generated':'exact-cache-root-rw',verify:'exact-digest-entry-ro'},output_mount:'/output:rw-run-scoped'});
  resource.rust_infrastructure_owners=resource.rust_infrastructure_owners.filter(owner=>owner.step_id!==CORPUS_BULK_STEP&&!obsoleteSteps.has(owner.step_id));
  const registry=resource.rust_module_registry_contract;
  // Remove only the old operational preparation auto-binaries, wherever the
  // registry stores them; all other discovery and reachability rules survive.
  for(const [key,value]of Object.entries(registry))if(Array.isArray(value))registry[key]=value.filter(item=>!(typeof item==='string'&&/llm-functional-corpus-(filter|dedup-split)/.test(item)));
  const steps=baseline.implementation_steps.filter(step=>!obsoleteSteps.has(step)).map(mapCurrentReferences);
  const after40=steps.indexOf('implement-ch40-reference-core-handoff')+1;
  steps.splice(after40,0,CORPUS_MIGRATION_STEP);
  const bpe=steps.indexOf('implement-ch42-scalable-bpe-tokenizer');
  steps.splice(bpe,0,CORPUS_BULK_STEP);plan.implementation_steps=steps;
  plan.chapters[2].depends_on=[CORPUS_BULK_STEP];
  plan.current_amendment={schema_version:1,owner_step:CORPUS_MIGRATION_STEP,origin_plan_revision:1,origin_plan_sha256:delta.origin_plan_sha256,compatibility_path:'configs/functional-execution-compatibility-v6.json',history:'Original queue/run/review/cache records remain historical and are not current completed aliases.',external_preparation:'Replaceable pinned NeMo Python/shell in separate NVIDIA image; Rust loads prepared JSONL only.',bulk_status:'pending',delta_sha256:jsonDigest(delta)};
  return plan;
}
export function validateCurrentCorpusPlan(plan,baseline,delta){
  const expected=deriveCurrentCorpusPlan(baseline,delta);
  if(JSON.stringify(plan)!==JSON.stringify(expected))throw Error('current corpus plan differs from exact approved closed projection');
  if(new Set(plan.chapters.map(chapter=>chapter.chapter_id)).size!==44||plan.capability_map.length!==79)throw Error('current coverage count drift');
  for(let index=0;index<44;index++)if(plan.chapters[index].order!==index+40)throw Error('noncontiguous current chapters');
  for(const key of ['scales','profiles','derived_subprofiles','formula_literals','accounting_witnesses','contract_records','prepared_input','prepared_input_architecture']){
    const expectedValue=['prepared_input','prepared_input_architecture'].includes(key)?baseline.resource_projection[key]:mapCurrentValue(baseline.resource_projection[key]);
    if(JSON.stringify(plan.resource_projection[key])!==JSON.stringify(expectedValue))throw Error('unrelated resource contract drift:'+key);
  }
  return true;
}
export function validateCurrentCorpusQueue(document,plan){
  const builds=document.builds.filter(build=>build.build_id===CURRENT_CORPUS_BUILD);
  if(builds.length!==1)throw Error('current revision2 build missing or ambiguous');
  const build=builds[0],expected=[...plan.implementation_steps.filter(id=>!retainedPrelude.has(id)),'close-functional-laptop-llm-curriculum-extension'];
  if(expected.length!==56||JSON.stringify(build.steps.map(step=>step.id))!==JSON.stringify(expected))throw Error('current56-step order or identity drift');
  const ids=new Set(expected),historical=document.builds.find(item=>item.build_id==='extend-course-to-functional-laptop-llm-20260810');
  const migration=document.builds.find(item=>item.build_id===CORPUS_MIGRATION_STEP)?.steps.find(step=>step.id===CORPUS_MIGRATION_STEP);
  if(!historical||!migration||!historical.steps.some(step=>step.id==='acquire-functional-tinystories-raw-pair'&&step.status==='completed'))throw Error('qualified retained prerequisite missing');
  if(![CORPUS_MIGRATION_STEP,CURRENT_CORPUS_BUILD].includes(document.active_build))throw Error('historical scheduler must not select current work');
  if(document.active_build===CURRENT_CORPUS_BUILD&&migration.status!=='completed')throw Error('current queue activated before migration completion');
  for(const step of build.steps){
    if(!['pending','running','completed','blocked','invalidated','skipped'].includes(step.status)||!Array.isArray(step.runs))throw Error('current step lifecycle malformed');
    if(step.status==='completed'&&!step.runs.some(run=>run.status==='succeeded'))throw Error('completed current alias without a succeeded run');
    if(step.depends_on.some(id=>!ids.has(id)&&![CORPUS_MIGRATION_STEP,'acquire-functional-tinystories-raw-pair'].includes(id)))throw Error('unqualified current dependency outside approved seam');
    const chapter=plan.chapters.find(item=>item.implementation_step===step.id);
    if(chapter){
      if(JSON.stringify(step.current_amendment?.active_locales)!=='["en"]'||step.outputs.some(path=>/\/(?:chapters|functional-catalogs|cheat-sheets)\/ru\//.test(path)))throw Error('current future chapter must remain English-only');
      if(!step.outputs.includes('rust/demos/ch'+chapter.chapter_id+'/')||step.outputs.some(path=>path.startsWith('rust/crates/llm-from-scratch/examples/')))throw Error('current chapter demo output drift');
    }
  }
  if(JSON.stringify(build.steps[0].depends_on)!==JSON.stringify([CORPUS_MIGRATION_STEP,'acquire-functional-tinystories-raw-pair']))throw Error('bulk prerequisite seam drift');
  const tokenizer=build.steps.find(step=>step.id==='implement-ch42-scalable-bpe-tokenizer');
  if(JSON.stringify(tokenizer.depends_on)!==JSON.stringify([CORPUS_BULK_STEP])||!tokenizer.inputs.includes('prepared-corpus-v1 receipt and frozen train-only split identity'))throw Error('tokenizer prepared training-role gate drift');
  return true;
}
