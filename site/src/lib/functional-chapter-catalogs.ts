// Build-time data adapter only; catalog metadata never approves semantic content.
// @ts-ignore Build-time filesystem import.
import {existsSync} from 'node:fs';
// @ts-ignore Build-time path import.
import {resolve} from 'node:path';
// @ts-ignore Filesystem-neutral descriptor validation.
import {validatePrivateReviewScope} from './functional-course-publication.mjs';
import {chapterLocaleConfiguration} from './functional-chapter-locales';

// @ts-ignore Cwd is inspected only during the existing Node/Astro build.
const root = process.cwd().endsWith('/site') ? resolve(process.cwd(), '..') : process.cwd();
// Keep the maintained filesystem verifier in its actual repository location:
// bundling it into .prerender would relocate its existing schema/config paths.
const {readPublicationEvidence, jsonFile, readRegularFile, hash} = await import(
  /* @vite-ignore */ 'file://' + resolve(root, 'scripts/check-functional-step-receipt.mjs')
);
export function functionalPublicationEvidence() {
  return readPublicationEvidence(root, chapterLocaleConfiguration);
}
export function functionalPrivateReviewScope() {
  const path = 'site/src/i18n/functional-catalogs/private-review.json';
  if (!existsSync(resolve(root, path))) return null;
  // @ts-ignore Environment is inspected only in the explicit build-time adapter.
  if (process.env.COURSE_BUILD_ROLE !== 'private-review') throw new Error('Production forbids a private scope');
  const scope = validatePrivateReviewScope(jsonFile(root, path, 16384, true));
  for (const [locale, expected] of Object.entries(scope.sourceHashes)) {
    const lesson = 'site/src/content/chapters/' + locale + '/' + scope.chapterId + '.mdx';
    if (hash(readRegularFile(root, lesson)) !== expected) throw new Error('Private source hash drift');
  }
  return scope;
}
