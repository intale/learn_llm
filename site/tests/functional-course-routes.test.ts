// @ts-ignore Node test-only filesystem access.
import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import baseManifest from '../src/i18n/chapter-locales.json';
import functionalManifest from '../src/i18n/functional-chapter-locales.json';
import {chapterLocaleConfiguration as base} from '../src/lib/chapter-locales';
// @ts-ignore Shared pure Node/Astro publication core.
import {composeChapterConfigurations,selectProductionChapterSets,selectPrivateReviewChapterSets,validatePrivateReviewScope,functionalChapterSignature} from '../src/lib/functional-course-publication.mjs';
// @ts-ignore Shared plain Node locale projection.
import {readFunctionalChapterLocaleConfiguration} from '../../scripts/functional-chapter-locale-config.mjs';
// @ts-ignore Test-only maintained hashing plumbing.
import {hash} from '../../scripts/check-functional-step-receipt.mjs';

const configuration=composeChapterConfigurations(base,functionalManifest);
function entry(order:number,locale='en') {
  const chapter=configuration.chapters[order];
  return {data:{chapter_id:chapter.chapterId,order,locale,content_revision:1,concept_id:'fixture',
    title:'Fixture',description:'Fixture description',objective:'Fixture objective',
    formula:{latex:'L',symbols:[{symbol:'L'}]},history:{rust_source:'rust/source.rs'},
    rust_sources:[{path:'rust/source.rs'}],visualization:{decision:'not-useful',id:null}}};
}
const baseSets=baseManifest.chapters.map(c=>({chapterId:c.chapterId,reference:entry(c.order),revision:1,
  activeLocales:c.activeLocales,byLocale:{en:entry(c.order),ru:entry(c.order,'ru')}}));
const english=entry(40),russian=entry(40,'ru');
function evidence(e=english) {return {[e.data.chapter_id]:{verified:true,chapterId:e.data.chapter_id,
  revision:1,signature:functionalChapterSignature(e.data),activeLocales:configuration.byChapter[e.data.chapter_id].activeLocales,
  sheets:['en','ru'],catalogs:{en:e.data,ru:e.data}}};}
const scope={schemaVersion:1,chapterId:english.data.chapter_id,scopeId:'fixture.en',sourceHashes:{en:'a'.repeat(64)}};
describe('functional static publication boundary',()=>{
  it('keeps allthree actual revision78base inputs byte-identical',()=>{
    for(const[path,expected]of Object.entries({
      'site/src/i18n/chapter-locales.json':'565880ee28fefc47178e8c9da788cca6150cfbaa06b22603df1453bb4b7dfd93',
      'scripts/chapter-locale-config.mjs':'e8899c8f31653d7f49070895517de8d25285aa625c91a07eed9bbb969397031f',
      'site/src/lib/chapter-locales.ts':'c0358d0e3fb0876ad79072c22d2edc5e0340f84e343d31fffaec2b742c9a7ab8'
    }))expect(hash(readFileSync('../'+path))).toBe(expected);
  });
  it('composes exact86 metadata entries while base0..39 stays frozen',()=>{
    expect(configuration.chapters).toHaveLength(86);
    expect(configuration.chapters.slice(0,40)).toEqual(base.chapters);
    expect(configuration.chapters[40].activeLocales).toEqual(['en','ru']);
    expect(configuration.chapters[41].activeLocales).toEqual(['en']);
    expect(readFunctionalChapterLocaleConfiguration('..').chapters).toEqual(configuration.chapters);
  });
  it('refuses gaps, IDs, locale policy and plan drift',()=>{
    for(const change of [
      (v:any)=>v.chapters.pop(),(v:any)=>v.chapters[1].activeLocales.push('ru'),
      (v:any)=>v.chapters[0].chapterId='40-other',(v:any)=>v.planRevision=2,
    ]){const value=structuredClone(functionalManifest);change(value);expect(()=>composeChapterConfigurations(base,value)).toThrow();}
  });
  it('empty successor prefix preserves all40published reference sets',()=>{
    expect(selectProductionChapterSets({baseSets,entries:[],configuration,evidence:{}})).toEqual(baseSets);
    expect(()=>selectProductionChapterSets({baseSets:baseSets.slice(1),entries:[],configuration,evidence:{}})).toThrow();
  });
  it('production requires actual pair and validated receipt/metadata/signature evidence',()=>{
    expect(selectProductionChapterSets({baseSets,entries:[english,russian],configuration,evidence:{}})).toHaveLength(40);
    expect(selectProductionChapterSets({baseSets,entries:[english],configuration,evidence:evidence()})).toHaveLength(40);
    expect(selectProductionChapterSets({baseSets,entries:[english,russian],configuration,evidence:evidence()})).toHaveLength(41);
    const stale=structuredClone(russian);stale.data.content_revision=2;
    expect(selectProductionChapterSets({baseSets,entries:[english,stale],configuration,evidence:evidence()})).toHaveLength(40);
    const wrong=structuredClone(russian);wrong.data.formula.latex='other';
    expect(selectProductionChapterSets({baseSets,entries:[english,wrong],configuration,evidence:evidence()})).toHaveLength(40);
  });
  it('private English candidate keeps declared bilingualnav but invents noRUentry',()=>{
    const sets=selectPrivateReviewChapterSets({productionSets:baseSets,entries:[english],configuration,scope,buildRole:'private-review'});
    expect(sets.at(-1).activeLocales).toEqual(['en','ru']);
    expect(Object.keys(sets.at(-1).byLocale)).toEqual(['en']);
    expect(()=>selectPrivateReviewChapterSets({productionSets:baseSets,entries:[english],configuration,scope,buildRole:'production'})).toThrow();
  });
  it('private translation candidate includes actual matchingRU and rejects drift',()=>{
    const bilingualScope={...scope,sourceHashes:{...scope.sourceHashes,ru:'b'.repeat(64)}};
    const sets=selectPrivateReviewChapterSets({productionSets:baseSets,entries:[english,russian],configuration,scope:bilingualScope,buildRole:'private-review'});
    expect(Object.keys(sets.at(-1).byLocale)).toEqual(['en','ru']);
    const wrong=structuredClone(russian);wrong.data.content_revision=2;
    expect(()=>selectPrivateReviewChapterSets({productionSets:baseSets,entries:[english,wrong],configuration,scope:bilingualScope,buildRole:'private-review'})).toThrow();
    expect(()=>validatePrivateReviewScope({...bilingualScope,chapterId:configuration.chapters[41].chapterId})).toThrow();
  });
});
