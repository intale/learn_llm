import manifest from '../i18n/functional-chapter-locales.json';
import {chapterLocaleConfiguration as base, type ChapterLocaleConfiguration} from './chapter-locales';
import type {Locale} from '../i18n';
// @ts-ignore Shared filesystem-neutral JavaScript projection.
import {composeChapterConfigurations} from './functional-course-publication.mjs';

export const chapterLocaleConfiguration = composeChapterConfigurations(base, manifest) as ChapterLocaleConfiguration<Locale> & {
  functional: ChapterLocaleConfiguration<Locale>;
};
export const chapterLocaleEntries = chapterLocaleConfiguration.chapters;
export function activeLocalesForChapter(chapterId: string): readonly Locale[] {
  const chapter = chapterLocaleConfiguration.byChapter[chapterId];
  if (!chapter) throw new Error('Composed manifest has no chapter "' + chapterId + '".');
  return chapter.activeLocales;
}
export function isChapterLocaleActive(chapterId: string, locale: string): locale is Locale {
  return activeLocalesForChapter(chapterId).includes(locale as Locale);
}
