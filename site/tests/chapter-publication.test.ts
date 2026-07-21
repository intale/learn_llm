import { describe, expect, it } from 'vitest';

import {
  findPublishableChapterSets,
  type PublicationChapterEntry,
} from '../src/lib/chapter-publication';

const configuredLocales = ['en', 'ru', 'es'] as const;
const selectiveLocales = (chapterId: string): readonly string[] => {
  if (chapterId === '07-language-model-metrics') return ['en', 'ru'];
  if (chapterId === '08-tensor-storage') return ['en'];
  throw new Error(`No locale fixture for ${chapterId}.`);
};

function lesson(
  locale: string,
  {
    chapterId = '01-text-units',
    order = 1,
    revision = 2,
  }: { chapterId?: string; order?: number; revision?: number } = {},
): PublicationChapterEntry {
  return {
    data: {
      chapter_id: chapterId,
      locale,
      content_revision: revision,
      order,
      concept_id: 'text-units',
      formula: {
        latex: 'i = V(t)',
        symbols: [{ symbol: 'i' }, { symbol: 'V' }, { symbol: 't' }],
      },
      history: { rust_source: 'rust/demos/ch01-text-units/src/main.rs' },
      rust_sources: [
        { path: 'rust/demos/ch01-text-units/src/main.rs', region: 'byte-units' },
      ],
      visualization: { decision: 'useful', id: 'text-units' },
    },
  };
}

describe('manifest-driven chapter publication', () => {
  it('publishes and indexes every member of a complete three-locale set', () => {
    const entries = configuredLocales.map((locale) => lesson(locale));
    const [published] = findPublishableChapterSets(
      entries,
      configuredLocales,
      'en',
    );

    expect(published.chapterId).toBe('01-text-units');
    expect(published.revision).toBe(2);
    expect(published.reference).toBe(entries[0]);
    expect(Object.keys(published.byLocale).sort()).toEqual(
      [...configuredLocales].sort(),
    );
  });

  it.each([
    ['missing', () => configuredLocales.slice(0, 2).map((locale) => lesson(locale))],
    [
      'duplicate',
      () => [
        ...configuredLocales.map((locale) => lesson(locale)),
        lesson('es'),
      ],
    ],
    [
      'stale revision',
      () => [lesson('en'), lesson('ru'), lesson('es', { revision: 3 })],
    ],
    [
      'shared metadata drift',
      () => {
        const spanish = lesson('es');
        spanish.data.formula.latex = 'i = W(t)';
        return [lesson('en'), lesson('ru'), spanish];
      },
    ],
  ])('keeps a %s translation set unpublished', (_label, entries) => {
    expect(
      findPublishableChapterSets(entries(), configuredLocales, 'en'),
    ).toEqual([]);
  });

  it('orders complete sets by the reference locale chapter order', () => {
    const second = configuredLocales.map((locale) =>
      lesson(locale, { chapterId: '02-second', order: 2 }),
    );
    const first = configuredLocales.map((locale) => lesson(locale));

    expect(
      findPublishableChapterSets(
        [...second, ...first],
        configuredLocales,
        'en',
      ).map((set) => set.chapterId),
    ).toEqual(['01-text-units', '02-second']);
  });

  it('publishes a bilingual chapter beside a reference-only chapter', () => {
    const entries = [
      lesson('en', {
        chapterId: '08-tensor-storage',
        order: 8,
      }),
      lesson('ru', {
        chapterId: '07-language-model-metrics',
        order: 7,
      }),
      lesson('en', {
        chapterId: '07-language-model-metrics',
        order: 7,
      }),
    ];

    const published = findPublishableChapterSets(
      entries,
      selectiveLocales,
      'en',
    );

    expect(
      published.map((set) => ({
        chapterId: set.chapterId,
        activeLocales: set.activeLocales,
        localizedEntries: Object.keys(set.byLocale),
      })),
    ).toEqual([
      {
        chapterId: '07-language-model-metrics',
        activeLocales: ['en', 'ru'],
        localizedEntries: ['en', 'ru'],
      },
      {
        chapterId: '08-tensor-storage',
        activeLocales: ['en'],
        localizedEntries: ['en'],
      },
    ]);
  });

  it('rejects an extra deferred-locale placeholder', () => {
    const entries = [
      lesson('en', {
        chapterId: '07-language-model-metrics',
        order: 7,
      }),
      lesson('ru', {
        chapterId: '07-language-model-metrics',
        order: 7,
      }),
      lesson('en', {
        chapterId: '08-tensor-storage',
        order: 8,
      }),
      lesson('ru', {
        chapterId: '08-tensor-storage',
        order: 8,
      }),
    ];

    expect(
      findPublishableChapterSets(entries, selectiveLocales, 'en').map(
        (set) => set.chapterId,
      ),
    ).toEqual(['07-language-model-metrics']);
  });

  it.each([
    [
      'missing',
      () => [
        lesson('en', {
          chapterId: '07-language-model-metrics',
          order: 7,
        }),
      ],
    ],
    [
      'duplicate',
      () => [
        lesson('en', {
          chapterId: '08-tensor-storage',
          order: 8,
        }),
        lesson('en', {
          chapterId: '08-tensor-storage',
          order: 8,
        }),
      ],
    ],
  ])('keeps a chapter with a %s active lesson unpublished', (_label, entries) => {
    expect(findPublishableChapterSets(entries(), selectiveLocales, 'en')).toEqual(
      [],
    );
  });

  it('rejects an invalid locale registry before calculating publication', () => {
    expect(() =>
      findPublishableChapterSets([], ['en', 'en'], 'en'),
    ).toThrow(/unique/);
    expect(() =>
      findPublishableChapterSets([], ['ru'], 'en'),
    ).toThrow(/reference locale/);
  });
});
