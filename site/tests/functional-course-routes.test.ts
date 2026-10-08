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
  sheets:['en'],catalogs:{en:e.data}}};}
const scope={schemaVersion:1,chapterId:english.data.chapter_id,scopeId:'fixture.en',sourceHashes:{en:'a'.repeat(64)}};
describe('functional static publication boundary',()=>{
  it('keeps allthree actual revision78base inputs byte-identical',()=>{
    for(const[path,expected]of Object.entries({
      'site/src/i18n/chapter-locales.json':'565880ee28fefc47178e8c9da788cca6150cfbaa06b22603df1453bb4b7dfd93',
      'scripts/chapter-locale-config.mjs':'e8899c8f31653d7f49070895517de8d25285aa625c91a07eed9bbb969397031f',
      'site/src/lib/chapter-locales.ts':'c0358d0e3fb0876ad79072c22d2edc5e0340f84e343d31fffaec2b742c9a7ab8'
    }))expect(hash(readFileSync('../'+path))).toBe(expected);
  });
  it('composes exact84 metadata entries while base0..39 stays frozen',()=>{
    expect(configuration.chapters).toHaveLength(84);
    expect(configuration.chapters.slice(0,40)).toEqual(base.chapters);
    expect(configuration.chapters[40].activeLocales).toEqual(['en']);
    expect(configuration.chapters[41].activeLocales).toEqual(['en']);
    expect(readFunctionalChapterLocaleConfiguration('..').chapters).toEqual(configuration.chapters);
  });
  it('refuses gaps, IDs, locale policy and plan drift',()=>{
    for(const change of [
      (v:any)=>v.chapters.pop(),(v:any)=>v.chapters[1].activeLocales.push('ru'),
      (v:any)=>v.chapters[0].chapterId='40-other',(v:any)=>v.planRevision=1,
    ]){const value=structuredClone(functionalManifest);change(value);expect(()=>composeChapterConfigurations(base,value)).toThrow();}
  });
  it('empty successor prefix preserves all40published reference sets',()=>{
    expect(selectProductionChapterSets({baseSets,entries:[],configuration,evidence:{}})).toEqual(baseSets);
    expect(()=>selectProductionChapterSets({baseSets:baseSets.slice(1),entries:[],configuration,evidence:{}})).toThrow();
  });
  it('production requires current English and validated receipt/metadata/signature evidence',()=>{
    expect(selectProductionChapterSets({baseSets,entries:[english,russian],configuration,evidence:{}})).toHaveLength(40);
    expect(selectProductionChapterSets({baseSets,entries:[english],configuration,evidence:evidence()})).toHaveLength(41);
    expect(selectProductionChapterSets({baseSets,entries:[english,russian],configuration,evidence:evidence()})).toHaveLength(40);
    const stale=structuredClone(english);stale.data.content_revision=2;
    expect(selectProductionChapterSets({baseSets,entries:[stale],configuration,evidence:evidence()})).toHaveLength(40);
    const wrong=structuredClone(english);wrong.data.formula.latex='other';
    expect(selectProductionChapterSets({baseSets,entries:[wrong],configuration,evidence:evidence()})).toHaveLength(40);
  });
  it('private English candidate uses current English-only navigation',()=>{
    const sets=selectPrivateReviewChapterSets({productionSets:baseSets,entries:[english],configuration,scope,buildRole:'private-review'});
    expect(sets.at(-1).activeLocales).toEqual(['en']);
    expect(Object.keys(sets.at(-1).byLocale)).toEqual(['en']);
    expect(()=>selectPrivateReviewChapterSets({productionSets:baseSets,entries:[english],configuration,scope,buildRole:'production'})).toThrow();
  });
  it('historical private translation shape remains valid but current inactiveRU refuses',()=>{
    const bilingualScope={...scope,sourceHashes:{...scope.sourceHashes,ru:'b'.repeat(64)}};
    expect(validatePrivateReviewScope(bilingualScope)).toEqual(bilingualScope);
    expect(()=>selectPrivateReviewChapterSets({productionSets:baseSets,entries:[english,russian],configuration,scope:bilingualScope,buildRole:'private-review'})).toThrow();
    const wrong=structuredClone(russian);wrong.data.content_revision=2;
    expect(()=>selectPrivateReviewChapterSets({productionSets:baseSets,entries:[english,wrong],configuration,scope:bilingualScope,buildRole:'private-review'})).toThrow();
    expect(()=>validatePrivateReviewScope({...bilingualScope,chapterId:configuration.chapters[41].chapterId})).toThrow();
  });
  it('privatev2 renders exactly current40rev2 then41EN without inventingRU',()=>{
    const changed40=structuredClone(english);changed40.data.content_revision=2;
    const new41=entry(41);
    const pair={schemaVersion:2,scopeId:'fixture.current-pair',candidates:[
      {chapterId:changed40.data.chapter_id,contentRevision:2,sourceHashes:{en:'a'.repeat(64)}},
      {chapterId:new41.data.chapter_id,contentRevision:1,sourceHashes:{en:'b'.repeat(64)}}]};
    const sets=selectPrivateReviewChapterSets({productionSets:baseSets,entries:[changed40,new41],configuration,scope:pair,buildRole:'private-review'});
    expect(sets).toHaveLength(42);expect(sets.slice(-2).map((s:any)=>s.reference.data.order)).toEqual([40,41]);
    expect(sets.at(-2).activeLocales).toEqual(['en']);
    expect(sets.slice(-2).map((s:any)=>Object.keys(s.byLocale))).toEqual([['en'],['en']]);
  });
  it('privatev2 rejects gaps/order/duplicates/extra/unowned members andtargetlocale',()=>{
    const pair={schemaVersion:2,scopeId:'fixture.current-pair',candidates:[
      {chapterId:configuration.chapters[40].chapterId,contentRevision:2,sourceHashes:{en:'a'.repeat(64)}},
      {chapterId:configuration.chapters[41].chapterId,contentRevision:1,sourceHashes:{en:'b'.repeat(64)}}]};
    for(const mutate of [
      (p:any)=>p.candidates.reverse(),(p:any)=>p.candidates[1].chapterId=p.candidates[0].chapterId,
      (p:any)=>p.candidates[1].chapterId=configuration.chapters[42].chapterId,
      (p:any)=>p.candidates[1].chapterId='41-history-alias',
      (p:any)=>p.candidates.push(p.candidates[1]),(p:any)=>p.candidates.pop(),
      (p:any)=>p.candidates[0].contentRevision=1,(p:any)=>p.candidates[1].contentRevision=0,
      (p:any)=>p.candidates[0].sourceHashes.ru='c'.repeat(64),
      (p:any)=>p.candidates[0].sourceHashes.en='bad',(p:any)=>p.extra=true
    ]){const changed=structuredClone(pair);mutate(changed);expect(()=>validatePrivateReviewScope(changed)).toThrow();}
  });
  it('privatev2 actualrevisions and verifiedprefix remain mandatory',()=>{
    const changed40=structuredClone(english);changed40.data.content_revision=2;
    const pair={schemaVersion:2,scopeId:'fixture.current-pair',candidates:[
      {chapterId:changed40.data.chapter_id,contentRevision:2,sourceHashes:{en:'a'.repeat(64)}},
      {chapterId:configuration.chapters[41].chapterId,contentRevision:1,sourceHashes:{en:'b'.repeat(64)}}]};
    for(const entries of [[english,entry(41)],[changed40,entry(42)],[changed40]])
      expect(()=>selectPrivateReviewChapterSets({productionSets:baseSets,entries,configuration,scope:pair,buildRole:'private-review'})).toThrow();
    expect(()=>selectPrivateReviewChapterSets({productionSets:baseSets,entries:[changed40,entry(41)],configuration,
      scope:{schemaVersion:1,chapterId:configuration.chapters[41].chapterId,scopeId:'fixture.single41',sourceHashes:{en:'a'.repeat(64)}},buildRole:'private-review'})).toThrow('private candidate must be the next contiguous chapter');
    expect(()=>selectPrivateReviewChapterSets({productionSets:baseSets.slice(0,39),entries:[changed40,entry(41)],configuration,scope:pair,buildRole:'private-review'})).toThrow();
  });
  it('privatev2 never activates production or reuses stale40publication',()=>{
    const changed40=structuredClone(english);changed40.data.content_revision=2;
    const pair={schemaVersion:2,scopeId:'fixture.current-pair',candidates:[
      {chapterId:changed40.data.chapter_id,contentRevision:2,sourceHashes:{en:'a'.repeat(64)}},
      {chapterId:configuration.chapters[41].chapterId,contentRevision:1,sourceHashes:{en:'b'.repeat(64)}}]};
    expect(()=>selectPrivateReviewChapterSets({productionSets:baseSets,entries:[changed40,entry(41)],configuration,scope:pair,buildRole:'production'})).toThrow();
    expect(selectProductionChapterSets({baseSets,entries:[changed40,russian,entry(41)],configuration,evidence:evidence()})).toHaveLength(40);
  });
});
