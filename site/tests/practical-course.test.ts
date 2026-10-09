import {describe,it,expect} from 'vitest';
// @ts-ignore Node APIs are supplied by Vitest, not the static site.
import {readFileSync,existsSync} from 'node:fs';
// @ts-ignore Reuse the maintained frontmatter parser used by content checks.
import {parseJsonFrontmatter} from '../../scripts/check-site-content.mjs';
import {getMessages,validateMessageCatalog} from '../src/i18n';
import {COURSE_HOME_MESSAGE_KEYS,COURSE_INDEX_MESSAGE_KEYS,courseMessageKeys,hasCourseHomeMessages,hasCourseIndexMessages,hasCourseMessages} from '../src/i18n/messages';
import {practicalCourse} from '../src/lib/course-configuration';

const ids=['00-course-structure','01-reference-core-handoff','02-corpus-preparation','03-scalable-bpe-tokenizer'] as const;
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

describe('current practical Chapters 0–3 source bindings',()=>{
  it('retains the English-only course and the orientation revision2 in its ordered profile',()=>{
    expect(practicalCourse.activeLocales).toEqual(['en']);
    expect(documents.map(({lesson})=>lesson.data.order)).toEqual([0,1,2,3]);
    expect(documents.map(({lesson})=>lesson.data.content_revision)).toEqual([2,1,1,1]);
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
  it('links all three available lessons from the orientation without adding lesson-only surfaces',()=>{
    const {lesson,contract}=documents[0];
    expect(lesson.data.chapter_kind).toBe('orientation');expect(lesson.data.formula).toBeNull();
    expect(lesson.data.rust_sources).toEqual([]);expect(lesson.data.visualization).toMatchObject({decision:'not-useful',id:null});
    expect(contract.terminology).toEqual([]);
    expect(existsSync(new URL('../src/content/practical-cheat-sheets/en/'+ids[0]+'.json',import.meta.url))).toBe(false);
    expect([...new Set([...lesson.body.matchAll(/\[Chapter [123](?::[^\]]+)?\]\(\.\.\/([^/]+)\/\)/g)].map(match=>match[1]))]).toEqual(ids.slice(1));
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
});
