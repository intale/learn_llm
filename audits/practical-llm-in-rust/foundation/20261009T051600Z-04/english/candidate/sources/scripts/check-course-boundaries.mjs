#!/usr/bin/env node
// Current-course path/hash/receipt orchestration. No semantic approval is inferred.
import {existsSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {readRegularFile,jsonFile,closed,hash} from './check-functional-step-receipt.mjs';
import {parseJsonFrontmatter} from './check-site-content.mjs';
import {readLocaleConfiguration} from './locale-config.mjs';
import {validateCourseBoundaries,courseById,PRACTICAL_COURSE_ID,validateCourseChapterIdentity} from './lib/course-boundaries.mjs';
import {canonicalJson,verifyEvidence,verifyAdjudication} from '../.agents/skills/author-llm-course-english/scripts/english-review.mjs';

export function readCourseConfiguration(root) {
  return validateCourseBoundaries(jsonFile(root,'configs/course-boundaries-v1.json',32768),readLocaleConfiguration(root).locales);
}
export const PRACTICAL_PRIVATE_SCOPE = 'site/src/i18n/practical-catalogs/private-review.json';
export const PRACTICAL_PUBLICATION_RECEIPT = 'artifacts/practical-llm-in-rust/foundation/publication-receipt.json';
export const PRACTICAL_ENGLISH_AUDIT_ROOT = 'audits/practical-llm-in-rust/foundation/20261009T051600Z-04/english';
export const FOUNDATION_CHAPTER_IDS = Object.freeze(['00-course-structure','01-reference-core-handoff','02-corpus-preparation']);

export function readPracticalBuildScope(root,{buildRole=process.env.COURSE_BUILD_ROLE}={}) {
  if (!existsSync(resolve(root,PRACTICAL_PRIVATE_SCOPE))) return null;
  if (buildRole !== 'private-review') throw new Error('production forbids practical private-review scope');
  const scope=jsonFile(root,PRACTICAL_PRIVATE_SCOPE,32768,true);
  closed(scope,['schemaVersion','courseId','scopeId','candidates'],'practical scope');
  if (scope.schemaVersion!==1 || scope.courseId!==PRACTICAL_COURSE_ID ||
      typeof scope.scopeId!=='string' || !/^[a-z][a-z0-9._-]{0,127}$/.test(scope.scopeId) ||
      !Array.isArray(scope.candidates) || scope.candidates.length!==FOUNDATION_CHAPTER_IDS.length)
    throw new Error('invalid practical scope');
  const course=courseById(readCourseConfiguration(root),PRACTICAL_COURSE_ID);
  for (const [index,candidate] of scope.candidates.entries()) {
    closed(candidate,['chapterId','contentRevision','sourceHashes'],'practical candidate');
    closed(candidate.sourceHashes,['en'],'practical source hashes');
    if (candidate.chapterId!==FOUNDATION_CHAPTER_IDS[index] || !Number.isSafeInteger(candidate.contentRevision) || candidate.contentRevision<1 ||
        !/^[0-9a-f]{64}$/.test(candidate.sourceHashes.en)) throw new Error('practical candidate revision/hash');
    validateCourseChapterIdentity(course,{chapter_id:candidate.chapterId,order:index,locale:'en',chapter_kind:index===0?'orientation':'lesson'});
    const path=course.contentDirectory+'/en/'+candidate.chapterId+'.mdx';
    const bytes=readRegularFile(root,path);
    if (hash(bytes)!==candidate.sourceHashes.en) throw new Error('private practical source drift');
    const actual=parseJsonFrontmatter(bytes.toString('utf8'),path).data;
    validateCourseChapterIdentity(course,actual);
    if (actual.chapter_id!==candidate.chapterId || actual.content_revision!==candidate.contentRevision) throw new Error('private practical metadata drift');
  }
  return scope;
}

export function readPracticalPublication(root) {
  if (!existsSync(resolve(root,PRACTICAL_PUBLICATION_RECEIPT))) return null;
  const receipt=jsonFile(root,PRACTICAL_PUBLICATION_RECEIPT,65536,true);
  closed(receipt,['schemaVersion','courseId','chapters','sourceHashes','english'],'practical publication');
  if (receipt.schemaVersion!==1 || receipt.courseId!==PRACTICAL_COURSE_ID ||
      !Array.isArray(receipt.chapters) || receipt.chapters.length!==FOUNDATION_CHAPTER_IDS.length)
    throw new Error('invalid practical publication');
  const course=courseById(readCourseConfiguration(root),PRACTICAL_COURSE_ID);
  for (const [index,chapter] of receipt.chapters.entries()) {
    closed(chapter,['chapterId','contentRevision'],'practical published chapter');
    if (chapter.chapterId!==FOUNDATION_CHAPTER_IDS[index] || !Number.isSafeInteger(chapter.contentRevision) || chapter.contentRevision<1) throw new Error('published revision');
    validateCourseChapterIdentity(course,{chapter_id:chapter.chapterId,order:index,locale:'en',chapter_kind:index===0?'orientation':'lesson'});
  }
  if (!receipt.sourceHashes || typeof receipt.sourceHashes!=='object' || Array.isArray(receipt.sourceHashes) ||
      Object.keys(receipt.sourceHashes).length<receipt.chapters.length || Object.keys(receipt.sourceHashes).length>256)
    throw new Error('publication source hash inventory');
  for (const [path,digest] of Object.entries(receipt.sourceHashes)) {
    if (!/^[0-9a-f]{64}$/.test(digest) || hash(readRegularFile(root,path))!==digest) throw new Error('publication source drift');
  }
  for (const chapter of receipt.chapters) {
    const path=course.contentDirectory+'/en/'+chapter.chapterId+'.mdx';
    if (!Object.hasOwn(receipt.sourceHashes,path)) throw new Error('published lesson missing source binding');
  }
  closed(receipt.english,['specPath','bundleDir','reviewRoutingPath','reviewSealsDir','adjudicationBundleDir','adjudicationRoutingPath','adjudicationSealsDir'],'practical English chain');
  if (receipt.english.specPath!==PRACTICAL_ENGLISH_AUDIT_ROOT+'/spec.json' ||
      Object.values(receipt.english).some(path=>typeof path!=='string'||!path.startsWith(PRACTICAL_ENGLISH_AUDIT_ROOT+'/')))
    throw new Error('original historical reviews cannot admit this practical foundation');
  const spec=jsonFile(root,receipt.english.specPath);
  for (const chapter of receipt.chapters) {
    const path=course.contentDirectory+'/en/'+chapter.chapterId+'.mdx';
    const actual=parseJsonFrontmatter(readRegularFile(root,path).toString('utf8'),path).data;
    validateCourseChapterIdentity(course,actual);
    if (actual.content_revision!==chapter.contentRevision || !spec.sourceDocuments?.some(document=>document.publicationPath===path && document.file?.sha256===receipt.sourceHashes[path]))
      throw new Error('published practical lesson absent from matching English source binding');
  }
  // Full maintained exact-byte verification is mandatory. A receipt status field
  // or a renamed old review cannot admit this current course.
  const options={...receipt.english,root,parserRoot:root};
  verifyEvidence(options);
  verifyAdjudication(options);
  return receipt;
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
  return {schemaVersion:1,baseline,practicalChapterIds,auxiliary,limitation:'Paths, bytes and maintained review-chain integrity only; no semantic, algorithm or resource verdict.'};
}
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const {values}=parseArgs({options:{root:{type:'string',default:resolve(fileURLToPath(new URL('..',import.meta.url)))}},strict:true,allowPositionals:false});
    console.log(canonicalJson(runCourseBoundaryCheck(resolve(values.root))).trimEnd());
  } catch(error) { console.error(error.message);process.exitCode=1; }
}
