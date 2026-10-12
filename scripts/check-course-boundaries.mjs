#!/usr/bin/env node
// Current-course path/hash/receipt orchestration. No semantic approval is inferred.
import {existsSync,lstatSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {readRegularFile,jsonFile,closed,hash,canonicalJson} from './lib/bound-files.mjs';
import {verifyProductLock,PRACTICAL_CHAPTER_IDS} from './lib/course-publication-lock.mjs';
import {parseJsonFrontmatter} from './lib/chapter-frontmatter.mjs';
import {readLocaleConfiguration} from './locale-config.mjs';
import {validateCourseBoundaries,courseById,PRACTICAL_COURSE_ID,validateCourseChapterIdentity} from './lib/course-boundaries.mjs';

export function readCourseConfiguration(root) {
  return validateCourseBoundaries(jsonFile(root,'configs/course-boundaries-v1.json',32768),readLocaleConfiguration(root).locales);
}
export const PRACTICAL_PRIVATE_SCOPE = 'site/src/i18n/practical-catalogs/private-review.json';
export const CURRENT_CHAPTER_IDS = PRACTICAL_CHAPTER_IDS;
export const FOUNDATION_CHAPTER_IDS = Object.freeze(CURRENT_CHAPTER_IDS.slice(0,3));
const PRACTICAL_PROFILES=Object.freeze([FOUNDATION_CHAPTER_IDS,CURRENT_CHAPTER_IDS].map(chapterIds=>({chapterIds})));

function hasRepositoryEntry(root,path) {
  try { lstatSync(resolve(root,path));return true; }
  catch(error) { if (error.code==='ENOENT') return false;throw error; }
}
function matchingProfile(chapters) {
  return Array.isArray(chapters) && PRACTICAL_PROFILES.find(profile=>
    chapters.length===profile.chapterIds.length && chapters.every((chapter,index)=>chapter?.chapterId===profile.chapterIds[index]));
}
export function validatePracticalChapterSource(root,course,chapter,index,digest,label) {
  const path=course.contentDirectory+'/en/'+chapter.chapterId+'.mdx';
  const bytes=readRegularFile(root,path);
  if (hash(bytes)!==digest) throw new Error(label+' source drift');
  const actual=parseJsonFrontmatter(bytes.toString('utf8'),path).data;
  validateCourseChapterIdentity(course,actual);
  if (actual.chapter_id!==chapter.chapterId || actual.content_revision!==chapter.contentRevision ||
      actual.order!==index || actual.locale!=='en' ||
      (index===0?actual.chapter_kind!=='orientation':actual.chapter_kind!==undefined && actual.chapter_kind!=='lesson'))
    throw new Error(label+' metadata drift');
  return path;
}

export function readPracticalBuildScope(root,{buildRole=process.env.COURSE_BUILD_ROLE}={}) {
  if (!hasRepositoryEntry(root,PRACTICAL_PRIVATE_SCOPE)) return null;
  if (buildRole !== 'private-review') throw new Error('production forbids practical private-review scope');
  const scope=jsonFile(root,PRACTICAL_PRIVATE_SCOPE,32768,true);
  closed(scope,['schemaVersion','courseId','scopeId','candidates'],'practical scope');
  if (scope.schemaVersion!==1 || scope.courseId!==PRACTICAL_COURSE_ID ||
      typeof scope.scopeId!=='string' || !/^[a-z][a-z0-9._-]{0,127}$/.test(scope.scopeId) ||
      !matchingProfile(scope.candidates))
    throw new Error('invalid practical scope');
  const course=courseById(readCourseConfiguration(root),PRACTICAL_COURSE_ID);
  for (const [index,candidate] of scope.candidates.entries()) {
    closed(candidate,['chapterId','contentRevision','sourceHashes'],'practical candidate');
    closed(candidate.sourceHashes,['en'],'practical source hashes');
    if (!Number.isSafeInteger(candidate.contentRevision) || candidate.contentRevision<1 ||
        !/^[0-9a-f]{64}$/.test(candidate.sourceHashes.en)) throw new Error('practical candidate revision/hash');
    validateCourseChapterIdentity(course,{chapter_id:candidate.chapterId,order:index,locale:'en',chapter_kind:index===0?'orientation':'lesson'});
    validatePracticalChapterSource(root,course,candidate,index,candidate.sourceHashes.en,'private practical');
  }
  return scope;
}

export function readPracticalPublication(root) {
  const lock=verifyProductLock(root);
  return {courseId:PRACTICAL_COURSE_ID,chapters:lock.courses[1].chapters.map(({chapterId,contentRevision})=>({chapterId,contentRevision}))};
}

export function practicalPublicationChapterIds(root,options={}) {
  const scope=readPracticalBuildScope(root,options);
  return (scope?.candidates ?? readPracticalPublication(root)?.chapters ?? []).map(chapter=>chapter.chapterId);
}

// Reuse the maintained catalog/source identity checks at the current course
// boundary. Term wording is judged by the independent language workflow.
export function checkPracticalAuxiliarySurfaces(root,chapterIds=FOUNDATION_CHAPTER_IDS) {
  const course=courseById(readCourseConfiguration(root),PRACTICAL_COURSE_ID);
  let catalogCount=0,sheetCount=0;
  for (const chapterId of chapterIds) {
    for (const locale of course.activeLocales) {
      const path=course.contentDirectory+'/'+locale+'/'+chapterId+'.mdx';
      const data=parseJsonFrontmatter(readRegularFile(root,path).toString('utf8'),path).data;
      validateCourseChapterIdentity(course,data);
      const sheetPath=course.sheetDirectory+'/'+locale+'/'+chapterId+'.json';
      if (chapterId===course.orientationChapterId) {
        if (existsSync(resolve(root,sheetPath))) throw new Error('orientation must not have a cheat sheet');
        continue;
      }
      const catalog=jsonFile(root,'site/src/i18n/practical-catalogs/'+locale+'/'+chapterId+'.json');
      closed(catalog,['schemaVersion','chapterId','locale','contentRevision','title','description','objective'],'practical catalog');
      if (catalog.schemaVersion!==1 || catalog.chapterId!==chapterId || catalog.locale!==locale ||
          catalog.contentRevision!==data.content_revision ||
          ['title','description','objective'].some(key=>catalog[key]!==data[key]))
        throw new Error('practical catalog metadata drift');
      const sheet=jsonFile(root,sheetPath);
      if (sheet.chapter_id!==chapterId || sheet.locale!==locale || !Array.isArray(sheet.terms) || sheet.terms.length<5)
        throw new Error('practical sheet identity/terms drift');
      catalogCount++;sheetCount++;
    }
  }
  return {catalogCount,sheetCount};
}

function regularFiles(root,path) {
  const out=[];
  for (const entry of readdirSync(resolve(root,path),{withFileTypes:true})) {
    const child=path+'/'+entry.name;
    if (entry.isSymbolicLink()) throw new Error('symlink in course baseline');
    if (entry.isDirectory()) out.push(...regularFiles(root,child));
    else if (entry.isFile()) out.push(child);
    else throw new Error('nonregular course baseline input');
  }
  return out.sort();
}
export function checkFirstCoreBaseline(root,configuration=readCourseConfiguration(root)) {
  if (hash(readRegularFile(root,configuration.firstCrateBaseline.inventory,65536))!==configuration.firstCrateBaseline.sha256)
    throw new Error('accepted first core inventory drift');
  const inventory=jsonFile(root,configuration.firstCrateBaseline.inventory,65536,true);
  closed(inventory,['schemaVersion','revision','fileCount','rustSourceCount','files'],'first core inventory');
  if (inventory.schemaVersion!==1 || inventory.revision!==configuration.firstCrateBaseline.revision ||
      inventory.fileCount!==41 || inventory.rustSourceCount!==40 || !Array.isArray(inventory.files) || inventory.files.length!==41)
    throw new Error('first core inventory shape');
  const expected=[];
  for (const file of inventory.files) {
    closed(file,['path','sha256','bytes'],'first core file');
    if (!file.path.startsWith('rust/crates/llm-from-scratch/') || !/^[0-9a-f]{64}$/.test(file.sha256)) throw new Error('first core path/hash');
    const bytes=readRegularFile(root,file.path);
    if (bytes.length!==file.bytes || hash(bytes)!==file.sha256) throw new Error('first core baseline bytes changed');
    expected.push(file.path);
  }
  if (expected.filter(path=>path.endsWith('.rs')).length!==40 || new Set(expected).size!==41)
    throw new Error('first core source count/unique coverage');
  if (JSON.stringify(expected.sort())!==JSON.stringify(regularFiles(root,'rust/crates/llm-from-scratch')))
    throw new Error('first core baseline coverage changed');
  return {fileCount:41,rustSourceCount:40,revision:inventory.revision};
}

export function runCourseBoundaryCheck(root) {
  const configuration=readCourseConfiguration(root);
  const baseline=checkFirstCoreBaseline(root,configuration);
  const practicalChapterIds=practicalPublicationChapterIds(root);
  const auxiliary=checkPracticalAuxiliarySurfaces(root,practicalChapterIds);
  return {schemaVersion:1,baseline,practicalChapterIds,auxiliary,limitation:'Exact product paths, bytes and identity only; no semantic, algorithm or resource verdict. Development judgments are held in concurrentDevelopmentMCP.'};
}
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const {values}=parseArgs({options:{root:{type:'string',default:resolve(fileURLToPath(new URL('..',import.meta.url)))}},strict:true,allowPositionals:false});
    console.log(canonicalJson(runCourseBoundaryCheck(resolve(values.root))).trimEnd());
  } catch(error) { console.error(error.message);process.exitCode=1; }
}
