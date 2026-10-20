import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,cpSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {validateCourseBoundaries,courseById,courseRouteSuffix,validateCourseChapterIdentity} from '../lib/course-boundaries.mjs';
import {readPracticalBuildScope,practicalPublicationChapterIds,checkFirstCoreBaseline,checkPracticalAuxiliarySurfaces,FOUNDATION_CHAPTER_IDS,CURRENT_CHAPTER_IDS,PRACTICAL_PRIVATE_SCOPE} from '../check-course-boundaries.mjs';
import {canonicalJson} from '../../scripts/reviews/english/scripts/english-review.mjs';

const project=resolve(import.meta.dirname,'../..');
const manifest=JSON.parse(readFileSync(resolve(project,'configs/course-boundaries-v1.json')));
const config=validateCourseBoundaries(manifest);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const write=(root,path,bytes)=>{mkdirSync(dirname(resolve(root,path)),{recursive:true});writeFileSync(resolve(root,path),bytes);};
function fixture(t,chapterIds=FOUNDATION_CHAPTER_IDS){
  const root=mkdtempSync(resolve(tmpdir(),'course-boundary-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  for(const path of ['configs/course-boundaries-v1.json','site/src/i18n/locales.json'])write(root,path,readFileSync(resolve(project,path)));
  const candidates=chapterIds.map((chapterId,index)=>{
    const path='site/src/content/practical-chapters/en/'+chapterId+'.mdx';
    const contentRevision=chapterIds===CURRENT_CHAPTER_IDS && index===0?2:1;
    const source='---\n'+JSON.stringify({chapter_id:chapterId,locale:'en',order:index,chapter_kind:index===0?'orientation':'lesson',content_revision:contentRevision})+'\n---\nFixture.\n';
    write(root,path,source);
    return {chapterId,contentRevision,sourceHashes:{en:sha(source)}};
  });
  const scope={schemaVersion:1,courseId:'practical-llm-in-rust',scopeId:'fixture.foundation',candidates};
  write(root,'site/src/i18n/practical-catalogs/private-review.json',canonicalJson(scope));
  return {root,scope,save:()=>write(root,'site/src/i18n/practical-catalogs/private-review.json',canonicalJson(scope))};
}
test('first and practical course identity keep independent order-zero routes',()=>{
  const first=courseById(config),practical=courseById(config,'practical-llm-in-rust');
  assert.equal(courseRouteSuffix(first,'00-llm-parts'),'/course/00-llm-parts/');
  assert.equal(courseRouteSuffix(practical,'00-course-structure'),'/practical-llm-in-rust/00-course-structure/');
  assert.throws(()=>courseById(config,'unknown'));
  assert.throws(()=>courseRouteSuffix(first,'40-reference-core-handoff'));
  assert.throws(()=>courseRouteSuffix(practical,'45-unowned'));
  assert.throws(()=>courseRouteSuffix(practical,'../03-unowned'));
});
test('orientation and locale scope cannot leak between collections',()=>{
  const practical=courseById(config,'practical-llm-in-rust');
  validateCourseChapterIdentity(practical,{chapter_id:'00-course-structure',locale:'en',order:0,chapter_kind:'orientation'});
  for(const chapter of [
    {chapter_id:'00-llm-parts',locale:'en',order:0,chapter_kind:'orientation'},
    {chapter_id:'00-course-structure',locale:'en',order:0,chapter_kind:'lesson'},
    {chapter_id:'01-reference-core-handoff',locale:'ru',order:1,chapter_kind:'lesson'},
    {chapter_id:'02-corpus-preparation',locale:'en',order:1,chapter_kind:'lesson'},
  ])assert.throws(()=>validateCourseChapterIdentity(practical,chapter));
});
test('closed course directories, copied crate and active locale policy reject drift',()=>{
  for(const change of [v=>v.courses.reverse(),v=>v.courses[1].collection='chapters',
    v=>v.courses[1].crateDirectory='rust/crates/llm-from-scratch',
    v=>v.courses[1].activeLocales.push('ru'),v=>v.firstCrateBaseline.revision='0'.repeat(40)]){
    const changed=structuredClone(manifest);change(changed);assert.throws(()=>validateCourseBoundaries(changed));
  }
  const future=structuredClone(manifest);future.courses[0].activeLocales.push('es');
  assert.deepEqual(validateCourseBoundaries(future,['en','ru','es']).courses[0].activeLocales,['en','ru','es']);
  assert.deepEqual(validateCourseBoundaries(future,['en','ru','es']).courses[1].activeLocales,['en']);
});
test('private scope admits only complete foundation or current profiles with actual hashes',t=>{
  for(const chapterIds of [FOUNDATION_CHAPTER_IDS,CURRENT_CHAPTER_IDS]){
    const {root,scope,save}=fixture(t,chapterIds);
    assert.throws(()=>readPracticalBuildScope(root,{buildRole:'production'}),/production/);
    assert.deepEqual(readPracticalBuildScope(root,{buildRole:'private-review'}),scope);
    assert.deepEqual(practicalPublicationChapterIds(root,{buildRole:'private-review'}),chapterIds);
    write(root,'site/src/content/practical-chapters/en/02-corpus-preparation.mdx','changed\n');
    assert.throws(()=>readPracticalBuildScope(root,{buildRole:'private-review'}),/source drift/);
    scope.candidates[2].sourceHashes.en=sha('changed\n');save();
    assert.throws(()=>readPracticalBuildScope(root,{buildRole:'private-review'}),/frontmatter/);
  }
});
test('private revision, future chapter and Russian metadata cannot become admission',t=>{
  const {root,scope,save}=fixture(t);
  scope.candidates[1].contentRevision=2;save();
  assert.throws(()=>readPracticalBuildScope(root,{buildRole:'private-review'}),/metadata drift/);
  scope.candidates[1].contentRevision=1;scope.candidates.push({chapterId:'04-unowned',contentRevision:1,sourceHashes:{en:'a'.repeat(64)}});save();
  assert.throws(()=>readPracticalBuildScope(root,{buildRole:'private-review'}),/invalid practical scope/);
  scope.candidates.pop();
  const path='site/src/content/practical-chapters/en/01-reference-core-handoff.mdx';
  const bytes=readFileSync(resolve(root,path)).toString().replace('"locale":"en"','"locale":"ru"');
  write(root,path,bytes);scope.candidates[1].sourceHashes.en=sha(bytes);save();
  assert.throws(()=>readPracticalBuildScope(root,{buildRole:'private-review'}),/identity\/locale drift/);
});
test('private missing reordered duplicate and mixed chapter IDs refuse both profiles',t=>{
  for(const chapterIds of [FOUNDATION_CHAPTER_IDS,CURRENT_CHAPTER_IDS]){
    const {root,scope,save}=fixture(t,chapterIds),original=structuredClone(scope.candidates);
    for(const change of [items=>items.splice(1,1),items=>items.reverse(),
      items=>items[1]=structuredClone(items[0]),items=>items[2].chapterId='02-bpe-merges',
      items=>items.push({chapterId:'04-unowned',contentRevision:1,sourceHashes:{en:'a'.repeat(64)}})]){
      scope.candidates=structuredClone(original);change(scope.candidates);save();
      assert.throws(()=>readPracticalBuildScope(root,{buildRole:'private-review'}),/invalid practical scope/);
    }
  }
});
test('private schemas remain closed and actual metadata cannot drift behind a matching hash',t=>{
  const {root,scope,save}=fixture(t,CURRENT_CHAPTER_IDS),original=structuredClone(scope);
  for(const change of [value=>value.extra='unknown',value=>value.candidates[3].extra='unknown',
    value=>value.candidates[3].sourceHashes.ru='a'.repeat(64),value=>value.candidates[3].contentRevision=0,
    value=>value.candidates[3].sourceHashes.en='A'.repeat(64)]){
    const value=structuredClone(original);change(value);write(root,PRACTICAL_PRIVATE_SCOPE,canonicalJson(value));
    assert.throws(()=>readPracticalBuildScope(root,{buildRole:'private-review'}));
  }
  for(const change of [value=>value.chapter_id='03-other',value=>value.content_revision=2,
    value=>value.order=2,value=>value.chapter_kind='orientation']){
    const path='site/src/content/practical-chapters/en/03-scalable-bpe-tokenizer.mdx';
    const metadata={chapter_id:'03-scalable-bpe-tokenizer',locale:'en',order:3,chapter_kind:'lesson',content_revision:1};
    change(metadata);const bytes='---\n'+JSON.stringify(metadata)+'\n---\nFixture.\n';
    write(root,path,bytes);scope.candidates[3].sourceHashes.en=sha(bytes);save();
    assert.throws(()=>readPracticalBuildScope(root,{buildRole:'private-review'}),/metadata drift|identity\/locale drift/);
  }
});
test('omitted practical lesson kind retains the existing default while orientation stays explicit',t=>{
  for(const chapterIds of [FOUNDATION_CHAPTER_IDS,CURRENT_CHAPTER_IDS]){
    const {root,scope,save}=fixture(t,chapterIds);
    for(const [index,candidate] of scope.candidates.entries()){
      if(index===0)continue;
      const path='site/src/content/practical-chapters/en/'+candidate.chapterId+'.mdx';
      const metadata={chapter_id:candidate.chapterId,locale:'en',order:index,content_revision:candidate.contentRevision};
      const bytes='---\n'+JSON.stringify(metadata)+'\n---\nFixture.\n';
      write(root,path,bytes);candidate.sourceHashes.en=sha(bytes);
    }
    save();assert.deepEqual(readPracticalBuildScope(root,{buildRole:'private-review'}),scope);
    const candidate=scope.candidates[1],path='site/src/content/practical-chapters/en/'+candidate.chapterId+'.mdx';
    const metadata={chapter_id:candidate.chapterId,locale:'en',order:1,content_revision:candidate.contentRevision,chapter_kind:'unknown'};
    const bytes='---\n'+JSON.stringify(metadata)+'\n---\nFixture.\n';
    write(root,path,bytes);candidate.sourceHashes.en=sha(bytes);save();
    assert.throws(()=>readPracticalBuildScope(root,{buildRole:'private-review'}),/metadata drift/);
  }
});












test('exact original crate remains protected independently of practical mutations',t=>{
  const {root}=fixture(t);
  const inventory='configs/first-course-core-v1.json';
  write(root,inventory,readFileSync(resolve(project,inventory)));
  cpSync(resolve(project,'rust/crates/llm-from-scratch'),resolve(root,'rust/crates/llm-from-scratch'),{recursive:true});
  assert.deepEqual(checkFirstCoreBaseline(root),{fileCount:41,rustSourceCount:40,revision:manifest.firstCrateBaseline.revision});
  write(root,'rust/crates/llm-from-scratch-practical/src/tokenizer/bpe.rs','independent practical draft');
  assert.equal(checkFirstCoreBaseline(root).fileCount,41);
  write(root,'rust/crates/llm-from-scratch/src/lib.rs','changed original');
  assert.throws(()=>checkFirstCoreBaseline(root),/baseline bytes changed/);
});

test('current practical catalogs bind actual lesson revision and metadata',t=>{
  const {root}=fixture(t);
  for (const chapterId of FOUNDATION_CHAPTER_IDS) {
    const paths=['site/src/content/practical-chapters/en/'+chapterId+'.mdx'];
    if (chapterId!==FOUNDATION_CHAPTER_IDS[0]) paths.push(
      'site/src/i18n/practical-catalogs/en/'+chapterId+'.json',
      'site/src/content/practical-cheat-sheets/en/'+chapterId+'.json');
    for (const path of paths) write(root,path,readFileSync(resolve(project,path)));
  }
  assert.deepEqual(checkPracticalAuxiliarySurfaces(root),{catalogCount:2,sheetCount:2});
  const path='site/src/i18n/practical-catalogs/en/01-reference-core-handoff.json';
  const original=JSON.parse(readFileSync(resolve(root,path)));
  for (const change of [value=>value.contentRevision++,value=>value.title+=' changed',
    value=>value.chapterId='02-corpus-preparation',value=>value.locale='ru',value=>value.extra='unknown']) {
    const value=structuredClone(original);change(value);write(root,path,JSON.stringify(value));
    assert.throws(()=>checkPracticalAuxiliarySurfaces(root),/catalog/);
  }
});

test('sheet identity cannot cross course lessons and orientation has no sheet',t=>{
  const {root}=fixture(t);
  for (const chapterId of FOUNDATION_CHAPTER_IDS) {
    const paths=['site/src/content/practical-chapters/en/'+chapterId+'.mdx'];
    if (chapterId!==FOUNDATION_CHAPTER_IDS[0]) paths.push(
      'site/src/i18n/practical-catalogs/en/'+chapterId+'.json',
      'site/src/content/practical-cheat-sheets/en/'+chapterId+'.json');
    for (const path of paths) write(root,path,readFileSync(resolve(project,path)));
  }
  const path='site/src/content/practical-cheat-sheets/en/02-corpus-preparation.json';
  const sheet=JSON.parse(readFileSync(resolve(root,path)));
  write(root,path,JSON.stringify({...sheet,chapter_id:'01-reference-core-handoff'}));
  assert.throws(()=>checkPracticalAuxiliarySurfaces(root),/sheet identity/);
  write(root,path,JSON.stringify(sheet));
  write(root,'site/src/content/practical-cheat-sheets/en/00-course-structure.json',JSON.stringify(sheet));
  assert.throws(()=>checkPracticalAuxiliarySurfaces(root),/orientation/);
});

test('current twenty-chapter auxiliary surfaces reuse the maintained catalog and sheet checks',t=>{
  const {root}=fixture(t,CURRENT_CHAPTER_IDS);
  for(const chapterId of CURRENT_CHAPTER_IDS){
    const paths=['site/src/content/practical-chapters/en/'+chapterId+'.mdx'];
    if(chapterId!==CURRENT_CHAPTER_IDS[0])paths.push('site/src/i18n/practical-catalogs/en/'+chapterId+'.json','site/src/content/practical-cheat-sheets/en/'+chapterId+'.json');
    for(const path of paths)write(root,path,readFileSync(resolve(project,path)));
  }
  assert.deepEqual(checkPracticalAuxiliarySurfaces(root,CURRENT_CHAPTER_IDS),{catalogCount:20,sheetCount:20});
  const path='site/src/i18n/practical-catalogs/en/04-padded-variable-batches.json',bytes=readFileSync(resolve(root,path)),catalog=JSON.parse(bytes);
  write(root,path,JSON.stringify({...catalog,contentRevision:catalog.contentRevision+1}));
  assert.throws(()=>checkPracticalAuxiliarySurfaces(root,CURRENT_CHAPTER_IDS),/catalog metadata drift/);
  write(root,path,bytes);
  const sheetPath='site/src/content/practical-cheat-sheets/en/04-padded-variable-batches.json',sheet=JSON.parse(readFileSync(resolve(root,sheetPath)));
  write(root,sheetPath,JSON.stringify({...sheet,locale:'ru'}));
  assert.throws(()=>checkPracticalAuxiliarySurfaces(root,CURRENT_CHAPTER_IDS),/sheet identity/);
});
