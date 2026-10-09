// Build-time adapter only; selectors/receipts are kept in their maintained path.
// @ts-ignore Node build-time path import.
import { resolve } from 'node:path';
import { findPublishableChapterSets, type PublicationChapterEntry } from './chapter-publication';
import { practicalCourse } from './course-configuration';
// @ts-ignore Cwd is consulted only during the Node/Astro build.
const root = process.cwd().endsWith('/site') ? resolve(process.cwd(),'..') : process.cwd();
const { practicalPublicationChapterIds } = await import(
  /* @vite-ignore */ 'file://' + resolve(root,'scripts/check-course-boundaries.mjs')
);
export function findPublishablePracticalChapterSets<T extends PublicationChapterEntry>(entries: readonly T[]) {
  const admitted = new Set(practicalPublicationChapterIds(root));
  return findPublishableChapterSets(entries.filter(entry=>admitted.has(entry.data.chapter_id)),practicalCourse.activeLocales,practicalCourse.referenceLocale);
}
