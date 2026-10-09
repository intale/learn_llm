import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,cpSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {validateCourseBoundaries,courseById,courseRouteSuffix,validateCourseChapterIdentity} from '../lib/course-boundaries.mjs';
import {readPracticalBuildScope,readPracticalPublication,checkFirstCoreBaseline,checkPracticalAuxiliarySurfaces,FOUNDATION_CHAPTER_IDS,PRACTICAL_ENGLISH_AUDIT_ROOT} from '../check-course-boundaries.mjs';
import {canonicalJson} from '../../.agents/skills/author-llm-course-english/scripts/english-review.mjs';

const project=resolve(import.meta.dirname,'../..');
const manifest=JSON.parse(readFileSync(resolve(project,'configs/course-boundaries-v1.json')));
const config=validateCourseBoundaries(manifest);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const write=(root,path,bytes)=>{mkdirSync(dirname(resolve(root,path)),{recursive:true});writeFileSync(resolve(root,path),bytes);};
function fixture(t){
  const root=mkdtempSync(resolve(tmpdir(),'course-boundary-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  for(const path of ['configs/course-boundaries-v1.json','site/src/i18n/locales.json'])write(root,path,readFileSync(resolve(project,path)));
  const candidates=FOUNDATION_CHAPTER_IDS.map((chapterId,index)=>{
    const path='site/src/content/practical-chapters/en/'+chapterId+'.mdx';
    const source='---\n'+JSON.stringify({chapter_id:chapterId,locale:'en',order:index,chapter_kind:index===0?'orientation':'lesson',content_revision:1})+'\n---\nFixture.\n';
    write(root,path,source);
    return {chapterId,contentRevision:1,sourceHashes:{en:sha(source)}};
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
test('private scope requires explicit build role and exact actual three-lesson hashes',t=>{
  const {root,scope,save}=fixture(t);
  assert.throws(()=>readPracticalBuildScope(root,{buildRole:'production'}),/production/);
  assert.deepEqual(readPracticalBuildScope(root,{buildRole:'private-review'}),scope);
  write(root,'site/src/content/practical-chapters/en/02-corpus-preparation.mdx','changed\n');
  assert.throws(()=>readPracticalBuildScope(root,{buildRole:'private-review'}),/source drift/);
  scope.candidates[2].sourceHashes.en=sha('changed\n');save();
  assert.throws(()=>readPracticalBuildScope(root,{buildRole:'private-review'}),/frontmatter/);
});
test('private revision, future chapter and Russian metadata cannot become admission',t=>{
  const {root,scope,save}=fixture(t);
  scope.candidates[1].contentRevision=2;save();
  assert.throws(()=>readPracticalBuildScope(root,{buildRole:'private-review'}),/metadata drift/);
  scope.candidates[1].contentRevision=1;scope.candidates.push({chapterId:'03-scalable-bpe-tokenizer',contentRevision:1,sourceHashes:{en:'a'.repeat(64)}});save();
  assert.throws(()=>readPracticalBuildScope(root,{buildRole:'private-review'}),/invalid practical scope/);
});
test('renamed historical reviews and an unbound status cannot publish the new course',t=>{
  const {root}=fixture(t);
  assert.equal(readPracticalPublication(root),null);
  write(root,'artifacts/practical-llm-in-rust/foundation/publication-receipt.json',canonicalJson({schemaVersion:1,status:'complete'}));
  assert.throws(()=>readPracticalPublication(root));
});
test('foundation admission selects only the actually provisioned closed audit namespace',t=>{
  const {root,scope}=fixture(t);
  const fields=['specPath','bundleDir','reviewRoutingPath','reviewSealsDir','adjudicationBundleDir','adjudicationRoutingPath','adjudicationSealsDir'];
  const chapters=scope.candidates.map(({chapterId,contentRevision})=>({chapterId,contentRevision}));
  const sourceHashes=Object.fromEntries(scope.candidates.map(candidate=>['site/src/content/practical-chapters/en/'+candidate.chapterId+'.mdx',candidate.sourceHashes.en]));
  const receiptPath='artifacts/practical-llm-in-rust/foundation/publication-receipt.json';
  for(const prefix of ['audits/practical-llm-in-rust/foundation/english','audits/functional-laptop/chapters/41-corpus-preparation/english',"audits/practical-llm-in-rust/foundation/20261008T105206Z-01/english","audits/practical-llm-in-rust/foundation/20261008T152502Z-02/english","audits/practical-llm-in-rust/foundation/20261008T172459Z-03/english",PRACTICAL_ENGLISH_AUDIT_ROOT]){
    const english=Object.fromEntries(fields.map(field=>[field,prefix+'/'+(field==='specPath'?'spec.json':field)]));
    write(root,receiptPath,canonicalJson({schemaVersion:1,courseId:'practical-llm-in-rust',chapters,sourceHashes,english}));
    if(prefix===PRACTICAL_ENGLISH_AUDIT_ROOT)
      assert.throws(()=>readPracticalPublication(root),/ENOENT/,'current prefix reaches the required actual spec read, never fabricates its review chain');
    else assert.throws(()=>readPracticalPublication(root),/original historical reviews/);
  }
});
test('exact original crate remains protected independently of practical mutations',t=>{
  const {root}=fixture(t);
  const inventory='artifacts/practical-llm-in-rust/foundation/first-core-inventory.json';
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
