import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {contractDispatch,validateDemoContractBinding,checkFunctionalContract} from '../check-functional-chapter-contract.mjs';
import {demoPaths} from '../check-functional-rust-examples.mjs';
import {parseRegistryFragment,readFunctionalPlan} from '../check-functional-rust-ownership.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const plan=readFunctionalPlan(root);
const contract=chapter=>({chapter_id:chapter.chapter_id,order:chapter.order,
  rust:{package:'ch'+chapter.chapter_id,sources:[demoPaths(chapter.chapter_id).source,demoPaths(chapter.chapter_id).library]}});

test('legacy dispatch stays unchanged; all44 exact successors use demos',()=>{
  assert.equal(contractDispatch('00-llm-parts'),'legacy-demo');
  assert.equal(contractDispatch('39-end-to-end-llm'),'legacy-demo');
  for(const chapter of plan.chapters) {
    assert.equal(contractDispatch(chapter.chapter_id),'successor-demo');
    assert.equal(validateDemoContractBinding(contract(chapter),plan).demo.package,'ch'+chapter.chapter_id);
  }
});

test('malformed or out-of-range contract IDs never choose a branch',()=>{
  for(const id of ['40','../40-ref','ab-ref','40_foo','40-x/../','86-extra'])
    assert.throws(()=>contractDispatch(id));
});

test('exact plan membership is required, not a syntactically valid slug or order',()=>{
  const base=contract(plan.chapters[2]);
  for(const id of ['40-unapproved-demo','41-unapproved-demo','42-unapproved-demo','85-unapproved-demo'])
    assert.throws(()=>validateDemoContractBinding({...base,chapter_id:id},plan),/exact functional plan/);
  assert.throws(()=>validateDemoContractBinding({...base,order:43},plan),/exact functional plan/);
});

test('unknown contract refuses before any Rust source/manifest/registry access',t=>{
  const fixture=mkdtempSync(join(tmpdir(),'functional-contract-selection-'));
  t.after(()=>rmSync(fixture,{recursive:true,force:true}));
  for(const path of ['site/src/i18n/locales.json','site/src/i18n/chapter-locales.json',
    'site/src/i18n/functional-chapter-locales.json']) {
    mkdirSync(join(fixture,path,'..'),{recursive:true});
    writeFileSync(join(fixture,path),readFileSync(join(root,path)));
  }
  writeFileSync(join(fixture,'unknown.md'),'---\n'+JSON.stringify({chapter_id:'42-unapproved-demo',order:42})+'\n---\n');
  assert.throws(()=>checkFunctionalContract(fixture,'unknown.md'),/exact functional plan/);
});

test('demo contract rejects cumulative targets and another demo source',()=>{
  const base=contract(plan.chapters[2]);
  assert.throws(()=>validateDemoContractBinding({...base,rust:{...base.rust,package:'llm-from-scratch'}},plan),/exact approved demo/);
  assert.throws(()=>validateDemoContractBinding({...base,rust:{...base.rust,sources:[...base.rust.sources,'rust/demos/ch41-corpus-preparation/src/lib.rs']}},plan),/exact approved demo/);
  for(const source of base.rust.sources)
    assert.throws(()=>validateDemoContractBinding({...base,rust:{...base.rust,sources:base.rust.sources.filter(p=>p!==source)}},plan),/exact approved demo/);
});

test('Chapter40 has no cumulative fragment; every actual shared owner uses its exact fragment',()=>{
  assert.equal(validateDemoContractBinding(contract(plan.chapters[0]),plan).fragment,null);
  const binding=validateDemoContractBinding(contract(plan.chapters[1]),plan);
  assert.equal(binding.fragment,'rust/crates/llm-from-scratch/module-registry/functional-v1/ch41-corpus-preparation.module');
  assert.equal(binding.expected.length,1);
  const good=Buffer.from('version=1\nmodule=functional::data::prepared_corpus\nsource=src/data/prepared_corpus.rs\n');
  assert.deepEqual(parseRegistryFragment('ch41-corpus-preparation.module',good,binding.owners),
    [{module:'functional::data::prepared_corpus',source:'src/data/prepared_corpus.rs'}]);
  assert.throws(()=>parseRegistryFragment('ch42-scalable-bpe-tokenizer.module',good,binding.owners),/owner drift/);
  const base=contract(plan.chapters[1]);
  assert.throws(()=>validateDemoContractBinding({...base,rust:{...base.rust,sources:[...base.rust.sources,
    'rust/crates/llm-from-scratch/src/tokenizer/policy.rs']}},plan),/another chapter owner/);
});
