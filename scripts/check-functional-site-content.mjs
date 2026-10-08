#!/usr/bin/env node
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readRegularFile,jsonFile,hash,readPublicationEvidence} from './check-functional-step-receipt.mjs';
import {readChapterDocuments,findPublishableChapterSets as legacySets,repositoryRootFromCwd,parseJsonFrontmatter} from './check-site-content.mjs';
import {readFunctionalChapterLocaleConfiguration,activeLocalesForChapter} from './functional-chapter-locale-config.mjs';
import {selectProductionChapterSets,selectPrivateReviewChapterSets,validatePrivateReviewScope,privateReviewCandidates,privateReviewCandidateForChapter,productionEvidenceConfiguration} from '../site/src/lib/functional-course-publication.mjs';

export {privateReviewCandidateForChapter};

export function readPrivateBuildScope(root) {
  const path='site/src/i18n/functional-catalogs/private-review.json';
  if(!existsSync(resolve(root,path)))return null;
  if(process.env.COURSE_BUILD_ROLE!=='private-review')throw new Error('Production refuses private scope');
  const scope=validatePrivateReviewScope(jsonFile(root,path,16384,true));
  for(const candidate of privateReviewCandidates(scope))for(const[locale,expected]of Object.entries(candidate.sourceHashes)){
    const bytes=readRegularFile(root,'site/src/content/chapters/'+locale+'/'+candidate.chapterId+'.mdx');
    if(hash(bytes)!==expected)
      throw new Error('Private source byte drift');
    if(candidate.contentRevision!==undefined && parseJsonFrontmatter(bytes.toString()).data.content_revision!==candidate.contentRevision)
      throw new Error('Private source revision drift');
  }
  return scope;
}
export function selectFunctionalBuildSets(root,documents,configuration=readFunctionalChapterLocaleConfiguration(root)) {
  const baseSets=legacySets(documents.filter(d=>d.data.order<40),
    id=>activeLocalesForChapter(configuration,id),configuration.referenceLocale);
  const scope=readPrivateBuildScope(root);
  const production=selectProductionChapterSets({baseSets,entries:documents,configuration,
    evidence:readPublicationEvidence(root,productionEvidenceConfiguration(configuration,scope))});
  return scope?selectPrivateReviewChapterSets({productionSets:production,entries:documents,configuration,
    scope,buildRole:'private-review'}):production;
}
export function checkFunctionalSiteContent(root) {
  const configuration=readFunctionalChapterLocaleConfiguration(root);
  const documents=readChapterDocuments(root);
  const sets=selectFunctionalBuildSets(root,documents,configuration);
  for(const document of documents) {
    const c=configuration.byChapter[document.data.chapter_id];
    if(!c||!c.activeLocales.includes(document.data.locale))throw new Error('orphan/inactive functional locale');
  }
  return {chapters:sets.length,locales:sets.reduce((n,s)=>n+Object.keys(s.byLocale).length,0)};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{console.log(checkFunctionalSiteContent(repositoryRootFromCwd()));}
  catch(error){console.error(error.message);process.exitCode=1;}
}
