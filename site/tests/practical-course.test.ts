import {describe,it,expect} from 'vitest';
// @ts-ignore Node APIs are supplied by Vitest, not the static site.
import {readFileSync,existsSync} from 'node:fs';
// @ts-ignore Reuse the maintained frontmatter parser used by content checks.
import {parseJsonFrontmatter} from '../../scripts/check-site-content.mjs';
import {getMessages,validateMessageCatalog} from '../src/i18n';
import {COURSE_HOME_MESSAGE_KEYS,COURSE_INDEX_MESSAGE_KEYS,courseMessageKeys,hasCourseHomeMessages,hasCourseIndexMessages,hasCourseMessages} from '../src/i18n/messages';
import {practicalCourse} from '../src/lib/course-configuration';

const ids=['00-course-structure','01-reference-core-handoff','02-corpus-preparation','03-scalable-bpe-tokenizer','04-padded-variable-batches','05-packed-sequence-masks','06-depth-stable-decoder','07-configurable-decoder-core','08-dropout-semantics','09-dependency-error-contract','10-input-encoding-boundary','11-accelerated-tensor-execution','12-mixed-precision-training','13-gradient-accumulation-recomputation','14-optimizer-schedules-clipping','15-save-load-resume-model','16-language-model-evaluation','17-weight-quantization','18-grouped-query-attention-context','19-online-tiled-attention'] as const;
const read=(path:string)=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');
const documents=ids.map(id=>({id,
  lesson:parseJsonFrontmatter(read('site/src/content/practical-chapters/en/'+id+'.mdx'),id),
  contract:parseJsonFrontmatter(read('curriculum/practical/chapters/'+id+'.md'),id).data,
  catalog:id===ids[0]?null:JSON.parse(read('site/src/i18n/practical-catalogs/en/'+id+'.json'))}));

describe('independent optional course message groups',()=>{
  it('shares a single exact union of nine home keys and two index keys',()=>{
    expect(COURSE_HOME_MESSAGE_KEYS).toHaveLength(9);
    expect(COURSE_INDEX_MESSAGE_KEYS).toHaveLength(2);
    expect(new Set(courseMessageKeys).size).toBe(11);
    expect(hasCourseMessages(getMessages('en'))).toBe(true);
  });
  it('home can activate without introducing an inactive practical index translation',()=>{
    const home={...getMessages('en')};
    for(const key of COURSE_INDEX_MESSAGE_KEYS)delete home[key];
    expect(()=>validateMessageCatalog(home)).not.toThrow();
    expect(hasCourseHomeMessages(home)).toBe(true);
    expect(hasCourseIndexMessages(home)).toBe(false);
    expect(hasCourseMessages(home)).toBe(false);
  });
  it('each optional group rejects partial, blank and unknown values independently',()=>{
    for(const keys of [COURSE_HOME_MESSAGE_KEYS,COURSE_INDEX_MESSAGE_KEYS]){
      const partial={...getMessages('en')};delete partial[keys[0]];
      expect(()=>validateMessageCatalog(partial)).toThrow(/complete course/);
      expect(()=>validateMessageCatalog({...getMessages('en'),[keys[0]]:' '})).toThrow(/non-empty/);
    }
    expect(()=>validateMessageCatalog({...getMessages('en'),privateExtra:'extra'})).toThrow(/keys must be exactly/);
  });
});

describe('current practical Chapters 0–19 source bindings',()=>{
  it('retains the English-only course and the current published revisions in its ordered profile',()=>{
    expect(practicalCourse.activeLocales).toEqual(['en']);
    expect(documents.map(({lesson})=>lesson.data.order)).toEqual([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19]);
    expect(documents.map(({lesson})=>lesson.data.content_revision)).toEqual([14,1,1,2,2,1,4,4,3,5,3,3,2,1,1,3,1,1,2,1]);
    for(const {id,lesson,contract,catalog} of documents){
      expect(lesson.data.chapter_id).toBe(id);expect(lesson.data.locale).toBe('en');
      expect(contract.chapter_id).toBe(id);expect(contract.content_revision).toBe(lesson.data.content_revision);
      expect(contract.concept_id).toBe(lesson.data.concept_id);expect(contract.order).toBe(lesson.data.order);
      if(catalog){
        expect(catalog.chapterId).toBe(id);expect(catalog.locale).toBe('en');expect(catalog.contentRevision).toBe(lesson.data.content_revision);
        for(const key of ['title','description','objective'])expect(catalog[key]).toBe(lesson.data[key]);
      }
      for(const key of ['objective','worked_inputs','decoder_connection'])expect(contract[key].en).toBe(lesson.data[key]);
      for(const directory of ['site/src/content/practical-chapters','site/src/content/practical-cheat-sheets','site/src/i18n/practical-catalogs']){
        const extension=directory.endsWith('practical-chapters')?'.mdx':'.json';
        expect(existsSync(new URL('../../'+directory+'/ru/'+id+extension,import.meta.url))).toBe(false);
      }
    }
  });
  it('registers one practical overview map without adding lesson-only surfaces',()=>{
    const {lesson,contract}=documents[0];
    expect(lesson.data.chapter_kind).toBe('orientation');expect(lesson.data.formula).toBeNull();
    expect(lesson.data.history.rust_source).toBeNull();expect(lesson.data.rust_sources).toEqual([]);
    expect(lesson.data.visualization).toMatchObject({decision:'useful',id:'practical-llm-system-map',component:'PracticalLlmSystemDiagram'});
    expect(lesson.data.visualization.supplementary??[]).toEqual([]);
    expect(contract.visualization).toMatchObject({decision:'useful',id:'practical-llm-system-map',component:'PracticalLlmSystemDiagram'});
    expect(contract.rust).toBeNull();expect(contract.terminology).toEqual([]);
    expect(existsSync(new URL('../src/content/practical-cheat-sheets/en/'+ids[0]+'.json',import.meta.url))).toBe(false);
  });
  it('binds the new concept formula, registered figure and glossary to their existing contract fields',()=>{
    const {id,lesson,contract}=documents[3];
    expect(lesson.data.concept_id).toBe('scalable-bpe-tokenizer');
    expect(contract.formula.latex).toBe(lesson.data.formula.latex);
    expect(contract.formula.symbols.map((symbol:{symbol:string;en:string})=>({symbol:symbol.symbol,meaning:symbol.en}))).toEqual(lesson.data.formula.symbols);
    expect(lesson.data.visualization).toMatchObject({decision:'useful',id:'scalable-bpe-tokenizer'});
    expect(contract.visualization.id).toBe(lesson.data.visualization.id);
    const sheet=JSON.parse(read('site/src/content/practical-cheat-sheets/en/'+id+'.json'));
    expect(sheet.chapter_id).toBe(id);expect(sheet.locale).toBe('en');expect(sheet.terms).toHaveLength(7);
    expect(sheet.terms.map((term:{term:string})=>term.term)).toEqual(contract.terminology.map((term:{en:string})=>term.en));
  });
  it('uses each declared new Rust excerpt exactly once from an existing source region',()=>{
    const {lesson,contract}=documents[3];
    expect(lesson.data.rust_sources).toHaveLength(9);
    for(const entry of lesson.data.rust_sources){
      expect(contract.rust.sources).toContain(entry.path);
      const source=read(entry.path);
      expect(source.split('// region:'+entry.region)).toHaveLength(2);
      expect(source.split('// endregion:'+entry.region)).toHaveLength(2);
      expect(lesson.body.split('region="'+entry.region+'"')).toHaveLength(2);
    }
  });
  it('names both exact learner test selectors with local commands and observable nonzero results',()=>{
    const body=documents[3].lesson.body;
    expect(body).toContain('From the repository root, with Docker running');
    expect(body).toContain('./course run cargo test --offline --locked');
    expect(body).toContain('-p llm-from-scratch-practical --test practical_ch03_tokenizer');
    expect(body).toContain('leftmost_overlap -- --exact');
    expect(body).toContain('-p practical-ch03-scalable-bpe-tokenizer --lib');
    expect(body).toContain('tests::optional_third_rank_is_the_checked_course_exercise -- --exact');
    expect(body.split('Expect `running 1 test` and `1 passed; 0 failed`')).toHaveLength(3);
    expect(read('rust/crates/llm-from-scratch-practical/tests/practical_ch03_tokenizer.rs')).toContain('fn leftmost_overlap(');
    expect(read('rust/demos/practical-ch03-scalable-bpe-tokenizer/src/lib.rs')).toContain('fn optional_third_rank_is_the_checked_course_exercise(');
  });
  for(const index of [4,5,6,7,8]) it('binds '+ids[index]+' formula, exact executed stdout and source regions',()=>{
    const {id,lesson,contract}=documents[index];
    const concept=id.slice(3);
    expect(lesson.data.concept_id).toBe(concept);
    expect(contract.formula.latex).toBe(lesson.data.formula.latex);
    expect(contract.formula.symbols.map((symbol:{symbol:string;en:string})=>({symbol:symbol.symbol,meaning:symbol.en}))).toEqual(lesson.data.formula.symbols);
    expect(lesson.data.visualization).toMatchObject({decision:'useful',id:concept});
    const expected=read('rust/demos/practical-ch'+id+'/expected.txt');
    const traceBytes=read('site/src/data/course/'+concept+'-trace.json');
    if(index===7){
      const report=JSON.parse(expected),trace=JSON.parse(traceBytes);
      expect(report.output_view).toBe('summary');
      expect(trace.output_view).toBeUndefined();
      expect(trace.execution).toEqual(report.execution);
      expect(trace.scales.map((scale:{census:{total:number}})=>scale.census.total)).toEqual(report.scales.map((scale:{census:{total:number}})=>scale.census.total));
      expect(trace.scales.every((scale:{census:{tensors:unknown[]}})=>scale.census.tensors.length>0)).toBe(true);
    }else expect(traceBytes).toBe(expected);
    expect(contract.rust.expected_output).toBe(expected);
    expect(lesson.data.rust_sources.length).toBeGreaterThan(0);
    for(const entry of lesson.data.rust_sources){
      expect(contract.rust.sources).toContain(entry.path);
      const source=read(entry.path);
      expect(source.split('// region:'+entry.region)).toHaveLength(2);
      expect(source.split('// endregion:'+entry.region)).toHaveLength(2);
      expect(lesson.body.split('region="'+entry.region+'"')).toHaveLength(2);
    }
    const sheet=JSON.parse(read('site/src/content/practical-cheat-sheets/en/'+id+'.json'));
    expect(sheet.chapter_id).toBe(id);expect(sheet.locale).toBe('en');
    expect(sheet.terms.map((term:{term:string})=>term.term)).toEqual(contract.terminology.map((term:{en:string})=>term.en));
    const historyUrls=index===4?['https://arxiv.org/abs/2107.02027v1','https://www.usenix.org/conference/osdi22/presentation/yu']:index===5?['https://arxiv.org/abs/2107.02027v1','https://arxiv.org/abs/2205.14135v2']:index===6?['https://proceedings.mlr.press/v9/glorot10a.html','https://arxiv.org/abs/2203.00555']:index===7?['https://arxiv.org/abs/1909.08053v4','https://arxiv.org/abs/2203.15556v1']:lesson.data.history.llm_evolution.sources.map((source:{source_url:string})=>source.source_url);
    for(const url of historyUrls)expect(lesson.body).toContain(']('+url+')');
  });
  it('binds Chapter 9 exact executed records, source excerpts and glossary with its declared table evidence',()=>{
    const {id,lesson,contract}=documents[9];
    expect(lesson.data.concept_id).toBe('dependency-error-contract');
    expect(lesson.data.formula.latex).toBe(contract.formula.latex);
    expect(lesson.data.formula.symbols).toEqual(contract.formula.symbols.map((symbol:{symbol:string;en:string})=>({symbol:symbol.symbol,meaning:symbol.en})));
    expect(lesson.data.visualization).toMatchObject({decision:'not-useful',id:null});
    expect(contract.visualization.decision).toBe('not-useful');
    const expected=read('rust/demos/practical-ch'+id+'/expected.txt');
    expect(contract.rust.expected_output).toBe(expected);
    expect(lesson.data.rust_sources.length).toBeGreaterThan(0);
    for(const entry of lesson.data.rust_sources){
      expect(contract.rust.sources).toContain(entry.path);
      const source=read(entry.path);
      if(entry.region){
        expect(source.split('// region:'+entry.region)).toHaveLength(2);
        expect(source.split('// endregion:'+entry.region)).toHaveLength(2);
        expect(lesson.body.split('region="'+entry.region+'"')).toHaveLength(2);
      }else{
        expect(source.length).toBeGreaterThan(0);
        expect(lesson.body.split('<RustSource path="'+entry.path+'"')).toHaveLength(2);
      }
    }
    const sheet=JSON.parse(read('site/src/content/practical-cheat-sheets/en/'+id+'.json'));
    expect(sheet.chapter_id).toBe(id);expect(sheet.locale).toBe('en');
    expect(sheet.terms.map((term:{term:string})=>term.term)).toEqual(contract.terminology.map((term:{en:string})=>term.en));
    for(const source of lesson.data.history.llm_evolution.sources)expect(lesson.body).toContain(']('+source.source_url+')');
  });
  it('binds Chapter 10 formula, executed text report, displayed sources and glossary',()=>{
    const {id,lesson,contract}=documents[10];
    expect(lesson.data.concept_id).toBe('input-encoding-boundary');
    expect(lesson.data.formula.latex).toBe(contract.formula.latex);
    expect(lesson.data.formula.symbols).toEqual(contract.formula.symbols.map((symbol:{symbol:string;en:string})=>({symbol:symbol.symbol,meaning:symbol.en})));
    expect(lesson.data.visualization).toMatchObject({decision:'useful',id:'input-encoding-boundary'});
    const expected=read('rust/demos/practical-ch'+id+'/expected.txt');
    expect(contract.rust.expected_output).toBe(expected);
    const observed=JSON.parse(expected);
    expect(observed.shapes).toEqual({embedding:[1,3,4],hidden:[1,3,4],logits:[1,3,258],table:[258,4]});
    expect(observed.parameters.lookup_and_head_same_node).toBe(true);
    expect(observed.gradients.within_tolerance).toBe(true);
    expect(lesson.data.rust_sources.length).toBeGreaterThan(0);
    for(const entry of lesson.data.rust_sources){
      expect(contract.rust.sources).toContain(entry.path);
      const source=read(entry.path);
      if(entry.region){
        expect(source.split('// region:'+entry.region)).toHaveLength(2);
        expect(source.split('// endregion:'+entry.region)).toHaveLength(2);
        expect(lesson.body.split('region="'+entry.region+'"')).toHaveLength(2);
      }else expect(lesson.body.split('<RustSource path="'+entry.path+'"')).toHaveLength(2);
    }
    const sheet=JSON.parse(read('site/src/content/practical-cheat-sheets/en/'+id+'.json'));
    expect(sheet.chapter_id).toBe(id);expect(sheet.locale).toBe('en');
    expect(sheet.terms.map((term:{term:string})=>term.term)).toEqual(contract.terminology.map((term:{en:string})=>term.en));
    for(const source of lesson.data.history.llm_evolution.sources)expect(lesson.body).toContain(']('+source.source_url+')');
  });

  it('binds Chapter 11 shared formula, actual CPU fixture, declared excerpts and glossary',()=>{
    const {id,lesson,contract}=documents[11];
    expect(lesson.data.concept_id).toBe('accelerated-tensor-execution');
    expect(lesson.data.formula.latex).toBe(contract.formula.latex);
    expect(lesson.data.formula.symbols).toEqual(contract.formula.symbols.map((symbol:{symbol:string;en:string})=>({symbol:symbol.symbol,meaning:symbol.en})));
    expect(lesson.data.visualization).toMatchObject({decision:'useful',id:'accelerated-tensor-execution'});
    const expected=read('rust/demos/practical-ch'+id+'/expected.txt');
    expect(contract.rust.expected_output).toBe(expected);
    const observed=JSON.parse(expected);
    expect(observed.device).toEqual({kind:'cpu'});
    expect(observed.completed_native_work).toEqual({device_to_host_bytes:0,gemm_requests:0,host_to_device_bytes:0});
    expect(observed.matrix).toEqual({shape:[2,2],values:[58,64,139,154]});
    expect(observed.sum_axis_1).toEqual([6,15]);expect(observed.mean_axis_1).toEqual([2,5]);
    expect(observed.text_model.logit_shape).toEqual([1,3,258]);
    expect(observed.text_model.lookup_and_head_same_node).toBe(true);
    expect(observed.text_model.gradient_tensors).toBe(20);expect(observed.text_model.gradient_values).toBe(1372);
    expect(lesson.data.rust_sources).toHaveLength(4);
    expect(lesson.data.rust_sources.filter((entry:{region?:string})=>entry.region).map((entry:{region:string})=>entry.region).sort()).toEqual(['cpu-matmul-contraction','explicit-tensor-execution','shared-model-explicit-execution']);
    expect(lesson.data.rust_sources.filter((entry:{region?:string})=>!entry.region).map((entry:{path:string})=>entry.path)).toEqual(['rust/demos/practical-ch11-accelerated-tensor-execution/src/main.rs']);
    for(const entry of lesson.data.rust_sources){
      expect(contract.rust.sources).toContain(entry.path);
      const source=read(entry.path);
      if(entry.region){
        expect(source.split('// region:'+entry.region)).toHaveLength(2);
        expect(source.split('// endregion:'+entry.region)).toHaveLength(2);
        expect(lesson.body.split('region="'+entry.region+'"')).toHaveLength(2);
      }else expect(lesson.body.split('<RustSource path="'+entry.path+'"')).toHaveLength(2);
    }
    const sheet=JSON.parse(read('site/src/content/practical-cheat-sheets/en/'+id+'.json'));
    expect(sheet.chapter_id).toBe(id);expect(sheet.locale).toBe('en');expect(sheet.terms).toHaveLength(7);
    expect(sheet.terms.map((term:{term:string})=>term.term)).toEqual(contract.terminology.map((term:{en:string})=>term.en));
    for(const source of lesson.data.history.llm_evolution.sources)expect(lesson.body).toContain(']('+source.source_url+')');
  });

  it('binds Chapter 12 represented dtypes, overflow state, exact fixture and authored surfaces',()=>{
    const {id,lesson,contract}=documents[12];
    expect(lesson.data.concept_id).toBe('mixed-precision-training');
    expect(lesson.data.formula.latex).toBe(contract.formula.latex);
    expect(lesson.data.formula.symbols).toEqual(contract.formula.symbols.map((symbol:{symbol:string;en:string})=>({symbol:symbol.symbol,meaning:symbol.en})));
    expect(lesson.data.visualization).toMatchObject({decision:'useful',id:'mixed-precision-training',component:'MixedPrecisionTrainingDiagram'});
    const expected=read('rust/demos/practical-ch'+id+'/expected.txt');
    expect(contract.rust.expected_output).toBe(expected);
    const observed=JSON.parse(expected);
    expect(observed.execution).toBe('cpu-numerical-reference');
    expect(observed.precision).toBe('fp16-fp32');
    expect(observed.dtypes).toEqual({host_tensors:'f64',master_weights:'f64',matmul_products_and_accumulator:'f32',matmul_transient_operands_and_result:'fp16',optimizer_moments:'f64',protected_operations:'f64'});
    expect(observed.overflow_probe.precision).toBe('fp16-fp32');
    expect(observed.overflow_probe.first_skip).toMatchObject({loss_scale:16777216,next_loss_scale:8388608,optimizer_step_before:1,optimizer_step_after:1,weights_moments_powers_gradients_revisions_preserved:true});
    expect(observed.overflow_probe.retry).toMatchObject({optimizer_step:2,scheduled_step:2,cleared_gradients:true});
    expect(observed.finite_updates.map((update:{next_loss_scale:number})=>update.next_loss_scale)).toEqual([128,256]);
    expect(observed.text_reference).toMatchObject({gradient_tensors:20,logit_shape:[1,3,258],parameter_scalars:1372,tied_table:true});
    expect(lesson.data.rust_sources).toHaveLength(5);
    expect(lesson.data.rust_sources.filter((entry:{region?:string})=>!entry.region).map((entry:{path:string})=>entry.path)).toEqual(['rust/demos/practical-ch12-mixed-precision-training/src/main.rs']);
    for(const entry of lesson.data.rust_sources){
      expect(contract.rust.sources).toContain(entry.path);
      const source=read(entry.path);
      if(entry.region){
        expect(source.split('// region:'+entry.region)).toHaveLength(2);
        expect(source.split('// endregion:'+entry.region)).toHaveLength(2);
        expect(lesson.body.split('region="'+entry.region+'"')).toHaveLength(2);
      }else expect(lesson.body.split('<RustSource path="'+entry.path+'"')).toHaveLength(2);
    }
    const sheet=JSON.parse(read('site/src/content/practical-cheat-sheets/en/'+id+'.json'));
    expect(sheet.chapter_id).toBe(id);expect(sheet.locale).toBe('en');expect(sheet.terms).toHaveLength(6);
    expect(sheet.terms.map((term:{term:string})=>term.term)).toEqual(contract.terminology.map((term:{en:string})=>term.en));
    for(const source of lesson.data.history.llm_evolution.sources)expect(lesson.body).toContain(']('+source.source_url+')');
  });

  it('binds Chapter 13 formula, actual stdout, declared source units, sources and terms',()=>{
    const {id,lesson,contract}=documents[13];
    expect(lesson.data.concept_id).toBe('gradient-accumulation-recomputation');
    expect(lesson.data.formula.latex).toBe(contract.formula.latex);
    expect(lesson.data.formula.symbols).toEqual(contract.formula.symbols.map((symbol:{symbol:string;en:string})=>({symbol:symbol.symbol,meaning:symbol.en})));
    expect(lesson.data.visualization).toMatchObject({decision:'useful',id:'gradient-accumulation-recomputation',component:'TrainingMemoryDiagram'});
    const expected=read('rust/demos/practical-ch'+id+'/expected.txt');
    expect(contract.rust.expected_output).toBe(expected);
    expect(JSON.parse(expected).chapter).toBe(id);
    expect(lesson.data.rust_sources).toHaveLength(7);
    for(const entry of lesson.data.rust_sources){
      expect(contract.rust.sources).toContain(entry.path);
      const source=read(entry.path);
      if(entry.region){
        expect(source.split('// region:'+entry.region)).toHaveLength(2);
        expect(source.split('// endregion:'+entry.region)).toHaveLength(2);
        expect(lesson.body.split('region="'+entry.region+'"')).toHaveLength(2);
      }else expect(lesson.body.split('<RustSource path="'+entry.path+'"')).toHaveLength(2);
    }
    const sheet=JSON.parse(read('site/src/content/practical-cheat-sheets/en/'+id+'.json'));
    expect(sheet.chapter_id).toBe(id);expect(sheet.locale).toBe('en');expect(sheet.terms.length).toBeGreaterThanOrEqual(5);
    expect(sheet.terms.map((term:{term:string})=>term.term)).toEqual(contract.terminology.map((term:{en:string})=>term.en));
    const urls=['https://arxiv.org/abs/1604.06174v2','https://arxiv.org/abs/2205.05198v1'];
    expect(lesson.data.history.llm_evolution.sources.map((entry:{source_url:string})=>entry.source_url)).toEqual(urls);
    for(const url of urls)expect(lesson.body).toContain(']('+url+')');
    expect(read('site/src/components/chapters/TrainingMemoryDiagram.astro')).toContain("practical-ch13-gradient-accumulation-recomputation/expected.txt?raw");
  });

});
