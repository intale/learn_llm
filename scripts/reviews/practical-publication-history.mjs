#!/usr/bin/env node
// Full original proof verification on explicitly materialized MCP history.
// Product locks do not replace or relabel these independent judgments.
import {lstatSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {readRegularFile,jsonFile,closed,hash,canonicalJson} from '../lib/bound-files.mjs';
import {readLocaleConfiguration} from '../locale-config.mjs';
import {validateCourseBoundaries,courseById,PRACTICAL_COURSE_ID,validateCourseChapterIdentity} from '../lib/course-boundaries.mjs';
import {validatePracticalChapterSource,FOUNDATION_CHAPTER_IDS,CURRENT_CHAPTER_IDS} from '../check-course-boundaries.mjs';
import {verifyPracticalLinkAmendment} from '../lib/practical-link-amendment.mjs';
import {verifyEvidence,verifyAdjudication} from './english/scripts/english-review.mjs';
export {FOUNDATION_CHAPTER_IDS,CURRENT_CHAPTER_IDS};
function readCourseConfiguration(root) {
  return validateCourseBoundaries(jsonFile(root,'configs/course-boundaries-v1.json',32768),readLocaleConfiguration(root).locales,{historical:true});
}
export const PRACTICAL_PUBLICATION_RECEIPT = 'artifacts/practical-llm-in-rust/foundation/publication-receipt.json';
export const PRACTICAL_ENGLISH_AUDIT_ROOT = 'audits/practical-llm-in-rust/foundation/20261009T051600Z-04/english';
export const PRACTICAL_CURRENT_PUBLICATION_RECEIPT = 'artifacts/practical-llm-in-rust/chapters/03-scalable-bpe-tokenizer/publication-receipt.json';
export const PRACTICAL_CURRENT_ENGLISH_AUDIT_ROOT = 'audits/practical-llm-in-rust/chapters/03-scalable-bpe-tokenizer/20261009T105211Z-02/english';
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


if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const [command,...args]=process.argv.slice(2);
    const {values,tokens}=parseArgs({args,options:{root:{type:'string'},'parser-root':{type:'string'}},strict:true,allowPositionals:false,tokens:true});
    if(command!=='verify' || !values.root || !values['parser-root'] || new Set(tokens.map(t=>t.name)).size!==tokens.length) throw new Error('usage: verify --root EXPORTED_HISTORY --parser-root CURRENT_REPOSITORY');
    const receipt=readPracticalPublication(resolve(values.root),{parserRoot:resolve(values['parser-root'])});
    if(!receipt) throw new Error('explicit historical publication head missing');
    process.stdout.write(canonicalJson({schemaVersion:1,chapters:receipt.chapters,limitation:'Exact original review chain and original mechanical amendment; judgments remain bound to their original candidates.'}));
  }catch(error){console.error(error.message);process.exitCode=1;}
}
