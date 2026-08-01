import type { Locale } from '../i18n';

export interface CheatSheetTerm {
  readonly term: string;
  readonly definition: string;
}

export interface CheatSheetData {
  readonly chapter_id: string;
  readonly locale: Locale;
  readonly title: string;
  readonly description: string;
  readonly terms: readonly CheatSheetTerm[];
}

interface ChapterReference {
  readonly data: {
    readonly chapter_id: string;
    readonly chapter_kind?: 'lesson' | 'orientation';
    readonly locale: Locale;
  };
}

interface CheatSheetReference {
  readonly data: CheatSheetData;
}

export interface CheatSheetCopy {
  readonly closeLabel: string;
  readonly eyebrow: string;
  readonly fallbackSummary: string;
  readonly openLabel: string;
}

const copyByLocale: Partial<Record<Locale, CheatSheetCopy>> = {
  en: {
    closeLabel: 'Close cheat sheet',
    eyebrow: 'Quick reference',
    fallbackSummary: 'Cheat sheet',
    openLabel: 'Open cheat sheet',
  },
};

export function cheatSheetRouteKey(locale: Locale, chapterId: string) {
  return `${locale}:${chapterId}`;
}

export function getCheatSheetCopy(locale: Locale): CheatSheetCopy | null {
  return copyByLocale[locale] ?? null;
}

export function indexCheatSheets<Sheet extends CheatSheetReference>(
  chapters: readonly ChapterReference[],
  sheets: readonly Sheet[],
): ReadonlyMap<string, Sheet> {
  const chaptersByRoute = new Map(
    chapters.map((chapter) => [
      cheatSheetRouteKey(chapter.data.locale, chapter.data.chapter_id),
      chapter,
    ]),
  );
  const sheetsByRoute = new Map<string, Sheet>();

  for (const sheet of sheets) {
    const key = cheatSheetRouteKey(sheet.data.locale, sheet.data.chapter_id);
    const chapter = chaptersByRoute.get(key);
    if (!chapter) {
      throw new Error(`Cheat sheet ${key} does not match a localized chapter.`);
    }
    if (chapter.data.chapter_kind === 'orientation') {
      throw new Error(`Orientation chapter ${key} cannot have a cheat sheet.`);
    }
    if (sheetsByRoute.has(key)) {
      throw new Error(`Cheat sheet ${key} is duplicated.`);
    }
    if (!getCheatSheetCopy(sheet.data.locale)) {
      throw new Error(`Cheat sheet ${key} has no localized interface copy.`);
    }
    sheetsByRoute.set(key, sheet);
  }

  return sheetsByRoute;
}
