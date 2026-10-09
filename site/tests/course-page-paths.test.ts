import {describe,it,expect} from 'vitest';
import {buildCourseChapterPaths} from '../src/lib/course-page-paths';
import {firstCourse,practicalCourse} from '../src/lib/course-configuration';
import {findPublishableChapterSets} from '../src/lib/chapter-publication';
import type {CheatSheetData} from '../src/lib/cheat-sheets';
import type {Locale} from '../src/i18n';

function chapter(id:string,locale:Locale='en'){
  return {data:{chapter_id:id,locale,order:Number(id.slice(0,2)),title:'Fixture '+id,content_revision:1,
    chapter_kind:id.startsWith('00-')?'orientation' as const:'lesson' as const,concept_id:'fixture',
    formula:null,history:{rust_source:null},rust_sources:[],visualization:{decision:'not-useful',id:null}}};
}
function sheet(id:string):{data:CheatSheetData}{return {data:{chapter_id:id,locale:'en',title:'Fixture',description:'Fixture',terms:[{term:'Term',definition:'Definition'}]}};}

describe('shared course page path assembler',()=>{
  it('default keeps first routes bilingual and ends after chapter39',()=>{
    const entries=['38-cached-generation','39-end-to-end-llm'].flatMap(id=>[chapter(id),chapter(id,'ru')]);
    const paths=buildCourseChapterPaths(entries,[],findPublishableChapterSets(entries));
    expect(paths).toHaveLength(4);
    for(const path of paths){
      expect(path.props.course).toBe(firstCourse);
      expect(path.props.equivalentLocales).toEqual(['en','ru']);
      if(path.params.slug.startsWith('39-'))expect(path.props.next).toBeNull();
    }
  });
  it('practical orientation and sheets reuse the assembler without first-course neighbors',()=>{
    const ids=['00-course-structure','01-reference-core-handoff','02-corpus-preparation'];
    const entries=ids.map(id=>chapter(id));
    const sets=findPublishableChapterSets(entries,['en'],'en');
    const paths=buildCourseChapterPaths(entries,[sheet(ids[1]),sheet(ids[2])],sets,practicalCourse);
    expect(paths.map(path=>path.params)).toEqual(ids.map(slug=>({locale:'en',slug})));
    expect(paths[0].props.previous).toBeNull();
    expect(paths[0].props.cheatSheet).toBeNull();
    expect(paths[0].props.next?.chapterId).toBe(ids[1]);
    expect(paths[2].props.next).toBeNull();
    expect(paths[1].props.cheatSheet?.data.chapter_id).toBe(ids[1]);
    expect(paths.every(path=>path.props.course===practicalCourse&&path.props.equivalentLocales.join()==='en')).toBe(true);
  });
  it('only supplied admitted sets produce routes, even if source has a future draft',()=>{
    const entries=[chapter('00-course-structure'),chapter('01-reference-core-handoff'),chapter('03-scalable-bpe-tokenizer')];
    const admitted=findPublishableChapterSets(entries.slice(0,2),['en'],'en');
    expect(buildCourseChapterPaths(entries,[],admitted,practicalCourse).map(path=>path.params.slug)).toEqual(['00-course-structure','01-reference-core-handoff']);
  });
});
