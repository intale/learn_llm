import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {deriveCurrentCorpusPlan,validateCurrentCorpusPlan,validateCurrentCorpusQueue,mapCurrentReferences,currentChapterNumber,CURRENT_CORPUS_BUILD,CORPUS_MIGRATION_STEP} from '../lib/functional-corpus-migration-v2.mjs';
const require=createRequire(new URL('../../site/package.json',import.meta.url));
const state=require('yaml').parse(readFileSync(new URL('../../BUILD_STATE.yaml',import.meta.url),'utf8'));
const legacy=readFileSync(new URL('../check-functional-laptop-llm-plan.mjs',import.meta.url),'utf8');
const line=legacy.split('\n').find(line=>line.startsWith('const EMBEDDED_PLAN_DATA = '));
const baseline=JSON.parse(line.slice(line.indexOf('*/')+2).trim().replace(/;$/,''));
const compat=JSON.parse(readFileSync(new URL('../../configs/functional-execution-compatibility-v6.json',import.meta.url)));
test('closed migration maps exact44entry order and79unique capability ownership',()=>{
 const plan=deriveCurrentCorpusPlan(baseline,compat.delta);
 assert.equal(plan.chapters.length,44);assert.deepEqual(plan.chapters.map(c=>c.order),Array.from({length:44},(_,i)=>i+40));
 assert.equal(new Set(plan.capability_map.map(c=>c.capability_id)).size,79);
 assert.equal(plan.chapters[2].chapter_id,'42-scalable-bpe-tokenizer');
 assert.deepEqual(plan.chapters[2].depends_on,['execute-functional-nemo-corpus-preparation']);
 assert.equal(validateCurrentCorpusPlan(plan,baseline,compat.delta),true);
});
test('one pass prevents42current identity from being mapped again',()=>{
 assert.equal(mapCurrentReferences('44-scalable-bpe-tokenizer owner-ch44 implement-ch44-scalable-bpe-tokenizer Chapter44'),'42-scalable-bpe-tokenizer owner-ch42 implement-ch42-scalable-bpe-tokenizer Chapter44');
 assert.equal(currentChapterNumber(85),83);assert.throws(()=>currentChapterNumber(86));
});
test('unrelated bytes numbers URLs run paths and hashes do not become chapter identities',()=>{
 assert.equal(mapCurrentReferences('64-bit 85-byte 44 bytes 64 microsteps'),'64-bit 85-byte 44 bytes 64 microsteps');
 const url='https://example.invalid/44-scalable-bpe-tokenizer';assert.equal(mapCurrentReferences(url),url);
 const run='.build/runs/20260814T152619Z-old/44-scalable-bpe-tokenizer';assert.equal(mapCurrentReferences(run),run);
 const sha='a'.repeat(64);assert.equal(mapCurrentReferences(sha),sha);
});
test('decoder prepared-input and standalone GPT2 oracle remain identical',()=>{
 const plan=deriveCurrentCorpusPlan(baseline,compat.delta);
 for(const key of ['prepared_input','prepared_input_architecture'])assert.deepEqual(plan.resource_projection[key],baseline.resource_projection[key]);
 assert.deepEqual(plan.resource_projection.execution_boundaries.data_pipeline.standalone_tokenizer_oracle,baseline.resource_projection.execution_boundaries.data_pipeline.standalone_tokenizer_oracle);
 assert.deepEqual(plan.resource_projection.profiles,baseline.resource_projection.profiles);
});
test('corpus ownership removes customRust operations without changing later algorithms',()=>{
 const plan=deriveCurrentCorpusPlan(baseline,compat.delta);
 const owner=plan.rust_owners.find(o=>o.chapter_id==='41-corpus-preparation');
 assert.deepEqual(owner.paths.filter(p=>p.includes('/src/data/')),['rust/crates/llm-from-scratch/src/data/prepared_corpus.rs']);
 assert(!plan.resource_projection.rust_infrastructure_owners.some(o=>/corpus-(filter|dedup-split)/.test(o.path)));
 const pipeline=plan.resource_projection.execution_boundaries.data_pipeline;
 assert.equal(pipeline.steps.length,2);assert.equal(pipeline.steps[0].status,'pending-bulk-configuration-and-resource-preflight');
 assert.equal(pipeline.steps[1].input_receipt,'artifacts/functional-laptop/data/prepared-corpus-v1/receipt.json');
 assert.equal(plan.chapters[2].rust_contribution,mapCurrentReferences(baseline.chapters[4].rust_contribution));
});
test('only explicit currentChapter40handoff and user locale seam are allowed',()=>{
 const plan=deriveCurrentCorpusPlan(baseline,compat.delta);
 assert.deepEqual(plan.chapters[0].active_locales,['en']);assert.deepEqual(plan.chapters[0].russian_outputs,[]);
 assert(!plan.chapters[0].special_gates.includes('direct-russian-bilingual-target-only'));
 assert.deepEqual({...plan.chapters[0],handoff:baseline.chapters[0].handoff,active_locales:baseline.chapters[0].active_locales,russian_outputs:baseline.chapters[0].russian_outputs,special_gates:baseline.chapters[0].special_gates},baseline.chapters[0]);
 const wrong=structuredClone(compat.delta);wrong.localization_policy.first_english_only_chapter=39;
 assert.throws(()=>deriveCurrentCorpusPlan(baseline,wrong),/localization delta/);
 plan.chapters[0].outcome+=' expanded';assert.throws(()=>validateCurrentCorpusPlan(plan,baseline,compat.delta),/approved closed projection/);
});
test('mutated budgets currentorders and unapproveddelta identities fail closed',()=>{
 const wrong=structuredClone(compat.delta);wrong.owner_step='other';assert.throws(()=>deriveCurrentCorpusPlan(baseline,wrong));
 const plan=deriveCurrentCorpusPlan(baseline,compat.delta);plan.resource_projection.profiles[0].host_ram_peak_bytes=1;
 assert.throws(()=>validateCurrentCorpusPlan(plan,baseline,compat.delta),/approved closed projection/);
 const next=deriveCurrentCorpusPlan(baseline,compat.delta);next.chapters[3].order=99;
 assert.throws(()=>validateCurrentCorpusPlan(next,baseline,compat.delta),/approved closed projection/);
});
test('qualified current queue coexists with unchanged same-name historical lifecycle records',()=>{
 const plan=deriveCurrentCorpusPlan(baseline,compat.delta),document=structuredClone(state);
 assert.equal(validateCurrentCorpusQueue(document,plan),true);
 const historical=document.builds.find(build=>build.build_id==='extend-course-to-functional-laptop-llm-20260810');
 assert(historical.steps.some(step=>step.id==='execute-functional-tokenizer-and-tokenized-splits'));
 historical.steps.find(step=>step.id==='execute-functional-tokenizer-and-tokenized-splits').status='completed';
 assert.equal(validateCurrentCorpusQueue(document,plan),true);
});
test('current queue identities and order cannot be replaced by a global first match',()=>{
 const plan=deriveCurrentCorpusPlan(baseline,compat.delta),document=structuredClone(state);
 document.builds.push(structuredClone(document.builds.find(build=>build.build_id===CURRENT_CORPUS_BUILD)));
 assert.throws(()=>validateCurrentCorpusQueue(document,plan),/ambiguous/);
 const reordered=structuredClone(state),queue=reordered.builds.find(build=>build.build_id===CURRENT_CORPUS_BUILD);
 [queue.steps[2],queue.steps[3]]=[queue.steps[3],queue.steps[2]];
 assert.throws(()=>validateCurrentCorpusQueue(reordered,plan),/order or identity/);
});
test('historical scheduling and early current activation refuse',()=>{
 const plan=deriveCurrentCorpusPlan(baseline,compat.delta),document=structuredClone(state);
 document.active_build='extend-course-to-functional-laptop-llm-20260810';
 assert.throws(()=>validateCurrentCorpusQueue(document,plan),/historical scheduler/);
 document.active_build=CURRENT_CORPUS_BUILD;
 document.builds.find(build=>build.build_id===CORPUS_MIGRATION_STEP).steps[0].status='running';
 assert.throws(()=>validateCurrentCorpusQueue(document,plan),/before migration completion/);
});
test('prepared role, English-only and demo boundaries are current gates',()=>{
 const plan=deriveCurrentCorpusPlan(baseline,compat.delta);
 for(const kind of ['prepared','ru','example','alias']){
  const document=structuredClone(state),queue=document.builds.find(build=>build.build_id===CURRENT_CORPUS_BUILD);
  const chapter=queue.steps.find(step=>step.id==='implement-ch42-scalable-bpe-tokenizer');
  if(kind==='prepared')chapter.inputs=chapter.inputs.filter(input=>input!=='prepared-corpus-v1 receipt and frozen train-only split identity');
  if(kind==='ru')chapter.outputs.push('site/src/content/chapters/ru/42-scalable-bpe-tokenizer.mdx');
  if(kind==='example')chapter.outputs.push('rust/crates/llm-from-scratch/examples/ch42_scalable_bpe_tokenizer.rs');
  if(kind==='alias')chapter.status='completed';
  assert.throws(()=>validateCurrentCorpusQueue(document,plan));
 }
});
