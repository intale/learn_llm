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

export const CHEAT_SHEET_PAGE_SIZE = 10;

export interface CheatSheetPageStatus {
  readonly currentPage: number;
  readonly endTerm: number;
  readonly pageCount: number;
  readonly startTerm: number;
  readonly totalTerms: number;
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
  readonly nextLabel: string;
  readonly openLabel: string;
  readonly pageStatus: (status: CheatSheetPageStatus) => string;
  readonly paginationLabel: string;
  readonly previousLabel: string;
}

const copyByLocale: Partial<Record<Locale, CheatSheetCopy>> = {
  en: {
    closeLabel: 'Close cheat sheet',
    eyebrow: 'Quick reference',
    fallbackSummary: 'Cheat sheet',
    nextLabel: 'Next terms',
    openLabel: 'Open cheat sheet',
    pageStatus: ({
      currentPage,
      endTerm,
      pageCount,
      startTerm,
      totalTerms,
    }) =>
      `Terms ${startTerm}\u2013${endTerm} of ${totalTerms}; page ${currentPage} of ${pageCount}`,
    paginationLabel: 'Cheat sheet term pages',
    previousLabel: 'Previous terms',
  },
  ru: {
    closeLabel: 'Закрыть справочник терминов',
    eyebrow: 'Краткий справочник',
    fallbackSummary: 'Справочник терминов',
    nextLabel: 'Следующие термины',
    openLabel: 'Открыть справочник терминов',
    pageStatus: ({
      currentPage,
      endTerm,
      pageCount,
      startTerm,
      totalTerms,
    }) =>
      `Термины: ${startTerm}\u2013${endTerm} из ${totalTerms}; ` +
      `страница ${currentPage} из ${pageCount}`,
    paginationLabel: 'Страницы справочника терминов',
    previousLabel: 'Предыдущие термины',
  },
};

export function sortCheatSheetTerms(
  terms: readonly CheatSheetTerm[],
  locale: Locale,
): CheatSheetTerm[] {
  const collator = new Intl.Collator(locale, {
    numeric: false,
    sensitivity: 'base',
    usage: 'sort',
  });

  return [...terms].sort((left, right) => {
    const localizedOrder = collator.compare(left.term, right.term);
    if (localizedOrder !== 0) return localizedOrder;
    if (left.term === right.term) return 0;
    return left.term < right.term ? -1 : 1;
  });
}

export function paginateCheatSheetTerms(
  terms: readonly CheatSheetTerm[],
): CheatSheetTerm[][] {
  const pages: CheatSheetTerm[][] = [];
  for (let start = 0; start < terms.length; start += CHEAT_SHEET_PAGE_SIZE) {
    pages.push(terms.slice(start, start + CHEAT_SHEET_PAGE_SIZE));
  }
  return pages;
}

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
