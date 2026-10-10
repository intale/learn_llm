#!/usr/bin/env node
// Current-course path/hash/receipt orchestration. No semantic approval is inferred.
import {existsSync,lstatSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {readRegularFile,jsonFile,closed,hash} from './check-functional-step-receipt.mjs';
import {parseJsonFrontmatter} from './check-site-content.mjs';
import {readLocaleConfiguration} from './locale-config.mjs';
import {validateCourseBoundaries,courseById,PRACTICAL_COURSE_ID,validateCourseChapterIdentity} from './lib/course-boundaries.mjs';
import {verifyPracticalLinkAmendment} from './lib/practical-link-amendment.mjs';
import {canonicalJson,verifyEvidence,verifyAdjudication} from '../.agents/skills/author-llm-course-english/scripts/english-review.mjs';

export function readCourseConfiguration(root) {
  return validateCourseBoundaries(jsonFile(root,'configs/course-boundaries-v1.json',32768),readLocaleConfiguration(root).locales);
}
export const PRACTICAL_PRIVATE_SCOPE = 'site/src/i18n/practical-catalogs/private-review.json';
export const PRACTICAL_PUBLICATION_RECEIPT = 'artifacts/practical-llm-in-rust/foundation/publication-receipt.json';
export const PRACTICAL_ENGLISH_AUDIT_ROOT = 'audits/practical-llm-in-rust/foundation/20261009T051600Z-04/english';
export const FOUNDATION_CHAPTER_IDS = Object.freeze(['00-course-structure','01-reference-core-handoff','02-corpus-preparation']);
export const PRACTICAL_CURRENT_PUBLICATION_RECEIPT = 'artifacts/practical-llm-in-rust/chapters/03-scalable-bpe-tokenizer/publication-receipt.json';
export const PRACTICAL_CURRENT_ENGLISH_AUDIT_ROOT = 'audits/practical-llm-in-rust/chapters/03-scalable-bpe-tokenizer/20261009T105211Z-02/english';
export const CURRENT_CHAPTER_IDS = Object.freeze([...FOUNDATION_CHAPTER_IDS,'03-scalable-bpe-tokenizer']);
const FOUNDATION_PROFILE=Object.freeze({chapterIds:FOUNDATION_CHAPTER_IDS,receiptPath:PRACTICAL_PUBLICATION_RECEIPT,auditRoot:PRACTICAL_ENGLISH_AUDIT_ROOT});
const CURRENT_PROFILE=Object.freeze({chapterIds:CURRENT_CHAPTER_IDS,receiptPath:PRACTICAL_CURRENT_PUBLICATION_RECEIPT,auditRoot:PRACTICAL_CURRENT_ENGLISH_AUDIT_ROOT});
const PRACTICAL_PROFILES=Object.freeze([FOUNDATION_PROFILE,CURRENT_PROFILE]);

function hasRepositoryEntry(root,path) {
  try { lstatSync(resolve(root,path));return true; }
  catch(error) { if (error.code==='ENOENT') return false;throw error; }
}
function matchingProfile(chapters) {
  return Array.isArray(chapters) && PRACTICAL_PROFILES.find(profile=>
    chapters.length===profile.chapterIds.length && chapters.every((chapter,index)=>chapter?.chapterId===profile.chapterIds[index]));
}
function validatePracticalChapterSource(root,course,chapter,index,digest,label) {
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

export function readPracticalPublication(root,{parserRoot=root}={}) {
  // A present current head is authoritative, including malformed/nonregular
  // entries. An invalid current candidate never falls back to historical proof.
  const profile=hasRepositoryEntry(root,PRACTICAL_CURRENT_PUBLICATION_RECEIPT)?CURRENT_PROFILE:
    hasRepositoryEntry(root,PRACTICAL_PUBLICATION_RECEIPT)?FOUNDATION_PROFILE:null;
  if (!profile) return null;
  const receipt=jsonFile(root,profile.receiptPath,65536,true);
  const mechanical=receipt.schemaVersion===2;
  closed(receipt,['schemaVersion','courseId','chapters','sourceHashes','english',...(mechanical?['mechanicalAmendment']:[])],'practical publication');
  if ((receipt.schemaVersion!==1 && !(mechanical && profile===CURRENT_PROFILE)) || receipt.courseId!==PRACTICAL_COURSE_ID ||
      matchingProfile(receipt.chapters)!==profile)
    throw new Error('invalid practical publication');
  const course=courseById(readCourseConfiguration(root),PRACTICAL_COURSE_ID);
  for (const [index,chapter] of receipt.chapters.entries()) {
    closed(chapter,['chapterId','contentRevision'],'practical published chapter');
    if (!Number.isSafeInteger(chapter.contentRevision) || chapter.contentRevision<1) throw new Error('published revision');
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
  if (receipt.english.specPath!==profile.auditRoot+'/spec.json' ||
      Object.values(receipt.english).some(path=>typeof path!=='string'||!path.startsWith(profile.auditRoot+'/')))
    throw new Error('historical or foreign audit namespace cannot admit this practical profile');
  if (mechanical) {
    // Original judgments verify only their original exact-byte candidate. The
    // current publication is admitted through a separately closed mechanical delta.
    verifyPracticalLinkAmendment(root,receipt,{verifyBaseline:readPracticalPublication,parserRoot});
    for (const [index,chapter] of receipt.chapters.entries())
      validatePracticalChapterSource(root,course,chapter,index,receipt.sourceHashes[course.contentDirectory+'/en/'+chapter.chapterId+'.mdx'],'published practical');
    return receipt;
  }
  const spec=jsonFile(root,receipt.english.specPath);
  for (const [index,chapter] of receipt.chapters.entries()) {
    const path=validatePracticalChapterSource(root,course,chapter,index,receipt.sourceHashes[course.contentDirectory+'/en/'+chapter.chapterId+'.mdx'],'published practical');
    if (!Array.isArray(spec.sourceDocuments) || !spec.sourceDocuments.some(document=>document?.publicationPath===path && document.file?.sha256===receipt.sourceHashes[path]))
      throw new Error('published practical lesson absent from matching English source binding');
  }
  if (profile===CURRENT_PROFILE) {
    if (spec.candidateId!=='practical.ch03.en.20261009.02' || spec.scopeId!=='practical.ch03.en')
      throw new Error('current practical English candidate/scope drift');
    const routes=['/en/','/en/practical-llm-in-rust/',...profile.chapterIds.map(id=>'/en/practical-llm-in-rust/'+id+'/')];
    for (const route of routes) {
      const documents=Array.isArray(spec.builtDocuments)?spec.builtDocuments.filter(document=>document?.route===route):[];
      if (documents.length!==1 || !Object.hasOwn(receipt.sourceHashes,documents[0].publicationPath) ||
          documents[0].file?.sha256!==receipt.sourceHashes[documents[0].publicationPath])
        throw new Error('current practical route absent from matching English built binding: '+route);
    }
  }
  // Full maintained exact-byte verification is mandatory. A receipt status field
  // or a renamed old review cannot admit this current course.
  const options={...receipt.english,root,parserRoot};
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
