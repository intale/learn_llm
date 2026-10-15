// Product byte/identity admission only. Independent judgments live in the MCP
// development context; capturing hashes never supplies a semantic verdict.
import {lstatSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {canonicalJson,closed,hash,jsonFile,readRegularFile} from './bound-files.mjs';
import {parseJsonFrontmatter} from './chapter-frontmatter.mjs';
import {readLocaleConfiguration} from '../locale-config.mjs';
import {validateCourseBoundaries,validateCourseChapterIdentity} from './course-boundaries.mjs';

export const PRODUCT_LOCK_PATH = 'configs/course-publication-v1.json';
export const PRODUCT_DIRECTORIES = Object.freeze([
  'site/src', 'curriculum/chapters', 'curriculum/practical/chapters',
  'rust/demos', 'rust/crates/llm-from-scratch', 'rust/crates/llm-from-scratch-practical',
]);
export const PRODUCT_FILES = Object.freeze([
  'Cargo.toml', 'Cargo.lock', 'configs/course-boundaries-v1.json',
  'configs/first-course-core-v1.json', 'configs/practical-reference-source-v1.json',
  'configs/functional-reference-source-v1.json', 'site/package.json', 'site/package-lock.json',
  'site/astro.config.mjs','site/sitemap.config.mjs','site/tsconfig.json',
]);
export const PRACTICAL_CHAPTER_IDS = Object.freeze([
  '00-course-structure','01-reference-core-handoff','02-corpus-preparation','03-scalable-bpe-tokenizer','04-padded-variable-batches','05-packed-sequence-masks','06-depth-stable-decoder','07-configurable-decoder-core','08-dropout-semantics','09-dependency-error-contract',
]);
const FIRST_REVISIONS = Object.freeze([5,6,9,7,9,8,5,7,5,6,5,5,8,6,6,9,7,5,8,5,3,3,8,5,3,5,2,2,2,3,2,2,4,12,7,5,6,6,6,9]);
const PRACTICAL_REVISIONS = Object.freeze([4,1,1,2,1,1,1,1,2,4]);
const compare = (a,b) => Buffer.compare(Buffer.from(a),Buffer.from(b));

function regularFiles(root,path) {
  const stat=lstatSync(resolve(root,path));
  if(stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('symlink/nonregular product directory: '+path);
  const out=[];
  for(const entry of readdirSync(resolve(root,path),{withFileTypes:true})) {
    const child=path+'/'+entry.name;
    if(entry.isSymbolicLink()) throw new Error('symlink in product inventory: '+child);
    if(entry.isDirectory()) out.push(...regularFiles(root,child));
    else if(entry.isFile()) { readRegularFile(root,child);out.push(child); }
    else throw new Error('nonregular product input: '+child);
  }
  return out.sort(compare);
}
export function productInputPaths(root) {
  const paths=[...PRODUCT_FILES,...PRODUCT_DIRECTORIES.flatMap(path=>regularFiles(root,path))].sort(compare);
  if(paths.length>4096 || new Set(paths).size!==paths.length) throw new Error('product inventory size/overlap');
  for(const path of PRODUCT_FILES) readRegularFile(root,path);
  return paths;
}
function courseRecords(root) {
  const configuration=validateCourseBoundaries(jsonFile(root,'configs/course-boundaries-v1.json',32768),readLocaleConfiguration(root).locales);
  const firstProjection=jsonFile(root,'site/src/i18n/chapter-locales.json',32768);
  if(firstProjection.chapters?.length!==40) throw new Error('first course requires exactly forty chapters');
  return configuration.courses.map((course,courseIndex)=>{
    const ids=courseIndex===0?firstProjection.chapters.map(c=>c.chapterId):PRACTICAL_CHAPTER_IDS;
    const revisions=courseIndex===0?FIRST_REVISIONS:PRACTICAL_REVISIONS;
    const expectedLocales=courseIndex===0?['en','ru']:['en'];
    if(canonicalJson(course.activeLocales)!==canonicalJson(expectedLocales)) throw new Error('product course locales');
    const chapters=ids.map((chapterId,order)=>{
      for(const locale of expectedLocales) {
        const path=course.contentDirectory+'/'+locale+'/'+chapterId+'.mdx';
        const data=parseJsonFrontmatter(readRegularFile(root,path).toString('utf8'),path).data;
        validateCourseChapterIdentity(course,data);
        if(data.chapter_id!==chapterId || data.locale!==locale || data.order!==order || data.content_revision!==revisions[order] ||
            (order===0?data.chapter_kind!=='orientation':data.chapter_kind!==undefined && data.chapter_kind!=='lesson'))
          throw new Error('product chapter identity/revision drift: '+path);
      }
      return {chapterId,order,contentRevision:revisions[order]};
    });
    for(const locale of expectedLocales) {
      const expected=ids.map(id=>course.contentDirectory+'/'+locale+'/'+id+'.mdx').sort(compare);
      if(canonicalJson(regularFiles(root,course.contentDirectory+'/'+locale))!==canonicalJson(expected))
        throw new Error('course lesson inventory coverage drift');
    }
    return {courseId:course.id,referenceLocale:'en',activeLocales:expectedLocales,chapters};
  });
}
export function captureProductLock(root) {
  const courses=courseRecords(root);
  const files=productInputPaths(root).map(path=>{
    const bytes=readRegularFile(root,path);
    return {path,bytes:bytes.length,sha256:hash(bytes)};
  });
  if(files.reduce((n,file)=>n+file.bytes,0)>64*1024*1024) throw new Error('product inventory total size');
  return {schemaVersion:1,courses,files};
}
export function verifyProductLock(root) {
  // The required head is authoritative. Missing or invalid files cannot select
  // an older profile, omit chapters, or trigger a new capture.
  const lock=jsonFile(root,PRODUCT_LOCK_PATH,1024*1024,true);
  closed(lock,['schemaVersion','courses','files'],'product lock');
  if(lock.schemaVersion!==1 || !Array.isArray(lock.courses) || lock.courses.length!==2 ||
      !Array.isArray(lock.files) || lock.files.length===0 || lock.files.length>4096)
    throw new Error('product lock identity/inventory');
  for(const course of lock.courses) {
    closed(course,['courseId','referenceLocale','activeLocales','chapters'],'product course');
    if(!Array.isArray(course.chapters)) throw new Error('product chapter inventory');
    for(const chapter of course.chapters) closed(chapter,['chapterId','order','contentRevision'],'product chapter');
  }
  if(canonicalJson(lock.courses)!==canonicalJson(courseRecords(root))) throw new Error('product course metadata drift');
  const expected=productInputPaths(root),actual=[];
  let total=0;
  for(const file of lock.files) {
    closed(file,['path','bytes','sha256'],'product file');
    const bytes=readRegularFile(root,file.path);
    total+=bytes.length;
    if(!Number.isSafeInteger(file.bytes) || file.bytes<0 || bytes.length!==file.bytes ||
        !/^[0-9a-f]{64}$/.test(file.sha256) || hash(bytes)!==file.sha256)
      throw new Error('product byte/hash drift: '+file.path);
    actual.push(file.path);
  }
  if(total>64*1024*1024 || canonicalJson(actual)!==canonicalJson(expected)) throw new Error('product exact inventory coverage drift');
  return lock;
}
