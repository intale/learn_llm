import {
  activeLocalesForChapter,
  chapterLocaleConfiguration,
} from './chapter-locales';

export interface PublicationChapterData {
  chapter_id: string;
  locale: string;
  content_revision: number;
  order: number;
  concept_id: string;
  formula: {
    latex: string;
    symbols: readonly { symbol: string }[];
  };
  history: { rust_source: string };
  rust_sources: readonly { path: string; region?: string }[];
  visualization: { decision: string; id: string | null };
}

export interface PublicationChapterEntry {
  data: PublicationChapterData;
}

export interface PublishableChapterSet<T extends PublicationChapterEntry> {
  chapterId: string;
  revision: number;
  activeLocales: readonly string[];
  reference: T;
  byLocale: Readonly<Partial<Record<string, T>>>;
}

export type ChapterLocaleRequirements =
  | readonly string[]
  | ((chapterId: string) => readonly string[]);

function validatePublicationLocales(
  requiredLocales: readonly string[],
  referenceLocale: string,
  context = 'Publication locales',
): void {
  if (
    !Array.isArray(requiredLocales) ||
    requiredLocales.length === 0 ||
    requiredLocales.some(
      (locale) => typeof locale !== 'string' || locale.length === 0,
    ) ||
    new Set(requiredLocales).size !== requiredLocales.length ||
    !requiredLocales.includes(referenceLocale)
  ) {
    throw new Error(
      `${context} must be non-empty, unique, and include the reference locale.`,
    );
  }
}

export function sharedChapterSignature(entry: PublicationChapterEntry): string {
  return JSON.stringify({
    chapter_id: entry.data.chapter_id,
    order: entry.data.order,
    concept_id: entry.data.concept_id,
    formula: {
      latex: entry.data.formula.latex,
      symbols: entry.data.formula.symbols.map((symbol) => symbol.symbol),
    },
    history_rust_source: entry.data.history.rust_source,
    rust_sources: entry.data.rust_sources.map((source) => ({
      path: source.path,
      region: source.region ?? null,
    })),
    visualization: {
      decision: entry.data.visualization.decision,
      id: entry.data.visualization.id,
    },
  });
}

export function findPublishableChapterSets<T extends PublicationChapterEntry>(
  entries: readonly T[],
  localeRequirements: ChapterLocaleRequirements = activeLocalesForChapter,
  referenceLocale: string = chapterLocaleConfiguration.referenceLocale,
): PublishableChapterSet<T>[] {
  if (typeof localeRequirements !== 'function') {
    validatePublicationLocales(localeRequirements, referenceLocale);
  }

  const groups = new Map<string, T[]>();
  for (const entry of entries) {
    const group = groups.get(entry.data.chapter_id) ?? [];
    group.push(entry);
    groups.set(entry.data.chapter_id, group);
  }

  const sets: PublishableChapterSet<T>[] = [];
  for (const [chapterId, group] of groups) {
    const requiredLocales =
      typeof localeRequirements === 'function'
        ? localeRequirements(chapterId)
        : localeRequirements;
    validatePublicationLocales(
      requiredLocales,
      referenceLocale,
      `Publication locales for ${chapterId}`,
    );
    if (group.length !== requiredLocales.length) continue;
    const byLocale: Record<string, T> = {};
    let complete = true;
    for (const locale of requiredLocales) {
      const localized = group.filter((entry) => entry.data.locale === locale);
      if (localized.length !== 1) {
        complete = false;
        break;
      }
      byLocale[locale] = localized[0];
    }
    if (!complete) continue;

    const reference = byLocale[referenceLocale];
    if (!reference) continue;
    const signature = sharedChapterSignature(reference);
    if (
      requiredLocales.some(
        (locale) => {
          const localized = byLocale[locale];
          return (
            !localized ||
            localized.data.content_revision !== reference.data.content_revision ||
            sharedChapterSignature(localized) !== signature
          );
        },
      )
    ) {
      continue;
    }

    sets.push({
      chapterId,
      revision: reference.data.content_revision,
      activeLocales: Object.freeze([...requiredLocales]),
      reference,
      byLocale: Object.freeze(byLocale),
    });
  }

  return sets.sort(
    (left, right) =>
      left.reference.data.order - right.reference.data.order ||
      left.chapterId.localeCompare(right.chapterId),
  );
}
