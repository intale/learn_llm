import chapterLocaleManifest from '../i18n/chapter-locales.json';
import { defaultLocale, locales, type Locale } from '../i18n';

const chapterIdPattern = /^\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const identifierPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const rootKeys = [
  'chapters',
  'planId',
  'planRevision',
  'policyId',
  'referenceLocale',
  'schemaVersion',
] as const;
const chapterKeys = ['activeLocales', 'chapterId', 'order'] as const;

interface RawChapterLocaleEntry {
  chapterId: string;
  order: number;
  activeLocales: string[];
}

interface RawChapterLocaleManifest {
  schemaVersion: number;
  planId: string;
  planRevision: number;
  policyId: string;
  referenceLocale: string;
  chapters: RawChapterLocaleEntry[];
}

export interface ChapterLocaleEntry<LocaleCode extends string = Locale> {
  chapterId: string;
  order: number;
  activeLocales: readonly LocaleCode[];
}

export interface ChapterLocaleConfiguration<LocaleCode extends string = Locale> {
  schemaVersion: 1;
  planId: string;
  planRevision: number;
  policyId: string;
  referenceLocale: LocaleCode;
  chapters: readonly ChapterLocaleEntry<LocaleCode>[];
  byChapter: Readonly<
    Partial<Record<string, ChapterLocaleEntry<LocaleCode>>>
  >;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  return (
    JSON.stringify(Object.keys(value).sort()) ===
    JSON.stringify([...expected].sort())
  );
}

export function validateChapterLocaleManifest(
  value: unknown,
): ChapterLocaleConfiguration<Locale>;
export function validateChapterLocaleManifest<const LocaleCode extends string>(
  value: unknown,
  registeredLocales: readonly LocaleCode[],
  referenceLocale: LocaleCode,
): ChapterLocaleConfiguration<LocaleCode>;
export function validateChapterLocaleManifest(
  value: unknown,
  registeredLocales: readonly string[] = locales,
  referenceLocale: string = defaultLocale,
): ChapterLocaleConfiguration<string> {
  if (!isObject(value)) {
    throw new Error('Chapter-locale manifest must be an object.');
  }
  const manifest = value as unknown as Partial<RawChapterLocaleManifest>;
  if (!hasExactKeys(value, rootKeys)) {
    throw new Error(`Chapter-locale manifest keys must be exactly ${rootKeys.join(', ')}.`);
  }
  if (
    manifest.schemaVersion !== 1 ||
    typeof manifest.planId !== 'string' ||
    !identifierPattern.test(manifest.planId) ||
    !Number.isInteger(manifest.planRevision) ||
    Number(manifest.planRevision) < 1 ||
    typeof manifest.policyId !== 'string' ||
    !identifierPattern.test(manifest.policyId) ||
    manifest.referenceLocale !== referenceLocale ||
    !Array.isArray(manifest.chapters) ||
    manifest.chapters.length === 0
  ) {
    throw new Error('Chapter-locale manifest metadata is invalid.');
  }
  if (
    registeredLocales.length === 0 ||
    new Set(registeredLocales).size !== registeredLocales.length ||
    !registeredLocales.includes(referenceLocale)
  ) {
    throw new Error('Registered locales must be unique and include the reference locale.');
  }

  const registered = new Set(registeredLocales);
  const chapterIds = new Set<string>();
  const chapters = manifest.chapters.map((chapter, index) => {
    if (!isObject(chapter) || !hasExactKeys(chapter, chapterKeys)) {
      throw new Error(`Chapter-locale entry ${index + 1} has unexpected fields.`);
    }
    const raw = chapter as unknown as RawChapterLocaleEntry;
    const expectedOrder = index + 1;
    const expectedPrefix = String(expectedOrder).padStart(2, '0') + '-';
    if (
      !chapterIdPattern.test(raw.chapterId) ||
      chapterIds.has(raw.chapterId) ||
      raw.order !== expectedOrder ||
      !raw.chapterId.startsWith(expectedPrefix)
    ) {
      throw new Error(`Chapter-locale entry ${index + 1} has invalid ID or order.`);
    }
    chapterIds.add(raw.chapterId);
    if (
      !Array.isArray(raw.activeLocales) ||
      raw.activeLocales.length === 0 ||
      new Set(raw.activeLocales).size !== raw.activeLocales.length ||
      raw.activeLocales.some((locale) => !registered.has(locale)) ||
      !raw.activeLocales.includes(referenceLocale)
    ) {
      throw new Error(`Chapter "${raw.chapterId}" has invalid active locales.`);
    }
    const registryOrder = registeredLocales.filter((locale) =>
      raw.activeLocales.includes(locale),
    );
    if (JSON.stringify(raw.activeLocales) !== JSON.stringify(registryOrder)) {
      throw new Error(`Chapter "${raw.chapterId}" locales must follow registry order.`);
    }
    return Object.freeze({
      chapterId: raw.chapterId,
      order: raw.order,
      activeLocales: Object.freeze([...raw.activeLocales]),
    });
  });
  const frozenChapters = Object.freeze(chapters);

  return Object.freeze({
    schemaVersion: 1 as const,
    planId: manifest.planId,
    planRevision: manifest.planRevision as number,
    policyId: manifest.policyId,
    referenceLocale: manifest.referenceLocale as string,
    chapters: frozenChapters,
    byChapter: Object.freeze(
      Object.fromEntries(frozenChapters.map((chapter) => [chapter.chapterId, chapter])),
    ),
  });
}

export const chapterLocaleConfiguration = validateChapterLocaleManifest(
  chapterLocaleManifest,
);
export const chapterLocaleEntries = chapterLocaleConfiguration.chapters;

export function activeLocalesForChapter(chapterId: string): readonly Locale[] {
  const chapter = chapterLocaleConfiguration.byChapter[chapterId];
  if (!chapter) {
    throw new Error(`Chapter-locale manifest has no chapter "${chapterId}".`);
  }
  return chapter.activeLocales;
}

export function isChapterLocaleActive(
  chapterId: string,
  locale: string,
): locale is Locale {
  return activeLocalesForChapter(chapterId).includes(locale as Locale);
}
