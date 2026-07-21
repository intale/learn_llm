import { describe, expect, it } from 'vitest';

// @ts-ignore Repository checks are intentionally dependency-free plain ESM modules.
import {
  validateChapterLocaleConfiguration,
  validateChapterLocaleProjectionAgainstPlan,
} from '../../scripts/chapter-locale-config.mjs';
// @ts-ignore Repository checks are intentionally dependency-free plain ESM modules.
import { validateLocaleConfiguration } from '../../scripts/locale-config.mjs';
import {
  activeLocalesForChapter,
  chapterLocaleConfiguration,
  isChapterLocaleActive,
  validateChapterLocaleManifest,
} from '../src/lib/chapter-locales';

interface FixtureChapter {
  chapterId: string;
  order: number;
  activeLocales: string[];
}

interface FixtureManifest {
  schemaVersion: number;
  planId: string;
  planRevision: number;
  policyId: string;
  referenceLocale: string;
  chapters: FixtureChapter[];
}

function fixtureChapter(
  chapterId = '01-example',
  order = 1,
  activeLocales: string[] = ['en', 'ru'],
): FixtureChapter {
  return { chapterId, order, activeLocales };
}

function fixtureManifest(
  overrides: Partial<FixtureManifest> = {},
): FixtureManifest {
  return {
    schemaVersion: 1,
    planId: 'fixture-plan',
    planRevision: 1,
    policyId: 'fixture-policy',
    referenceLocale: 'en',
    chapters: [fixtureChapter()],
    ...overrides,
  };
}

describe('chapter-locale manifest', () => {
  it('projects the canonical 39-chapter policy at both activation boundaries', () => {
    expect(chapterLocaleConfiguration.chapters).toHaveLength(39);
    expect(chapterLocaleConfiguration.referenceLocale).toBe('en');
    expect(chapterLocaleConfiguration.chapters[0]).toMatchObject({
      chapterId: '01-text-units',
      order: 1,
      activeLocales: ['en', 'ru'],
    });
    expect(chapterLocaleConfiguration.chapters[6]).toMatchObject({
      chapterId: '07-language-model-metrics',
      order: 7,
      activeLocales: ['en', 'ru'],
    });
    expect(chapterLocaleConfiguration.chapters[7]).toMatchObject({
      chapterId: '08-tensor-storage',
      order: 8,
      activeLocales: ['en'],
    });
    expect(chapterLocaleConfiguration.chapters[38]).toMatchObject({
      chapterId: '39-end-to-end-llm',
      order: 39,
      activeLocales: ['en'],
    });
    expect(
      chapterLocaleConfiguration.chapters
        .slice(0, 7)
        .every(
          (chapter) =>
            chapter.activeLocales.length === 2 &&
            chapter.activeLocales[0] === 'en' &&
            chapter.activeLocales[1] === 'ru',
        ),
    ).toBe(true);
    expect(
      chapterLocaleConfiguration.chapters
        .slice(7)
        .every(
          (chapter) =>
            chapter.activeLocales.length === 1 &&
            chapter.activeLocales[0] === 'en',
        ),
    ).toBe(true);

    expect(activeLocalesForChapter('07-language-model-metrics')).toEqual([
      'en',
      'ru',
    ]);
    expect(activeLocalesForChapter('08-tensor-storage')).toEqual(['en']);
    expect(isChapterLocaleActive('08-tensor-storage', 'en')).toBe(true);
    expect(isChapterLocaleActive('08-tensor-storage', 'ru')).toBe(false);
    expect(() => activeLocalesForChapter('40-unknown')).toThrow(/no chapter/);
  });

  it.each([
    ['null', null],
    ['an array', []],
    ['an unsupported schema', fixtureManifest({ schemaVersion: 2 })],
    ['a malformed plan identifier', fixtureManifest({ planId: 'Fixture plan' })],
    [
      'a malformed policy identifier',
      fixtureManifest({ policyId: 'fixture_policy' }),
    ],
    ['a zero plan revision', fixtureManifest({ planRevision: 0 })],
  ])('rejects malformed metadata represented by %s', (_label, value) => {
    expect(() => validateChapterLocaleManifest(value)).toThrow();
  });

  it('rejects extra root and chapter fields', () => {
    expect(() =>
      validateChapterLocaleManifest({
        ...fixtureManifest(),
        undocumented: true,
      }),
    ).toThrow(/keys must be exactly/);

    const chapterWithExtraField = {
      ...fixtureChapter(),
      deferredReason: 'not part of the schema',
    };
    expect(() =>
      validateChapterLocaleManifest(
        fixtureManifest({ chapters: [chapterWithExtraField] }),
      ),
    ).toThrow(/unexpected fields/);
  });

  it('rejects missing, reordered, and duplicate chapter positions', () => {
    expect(() =>
      validateChapterLocaleManifest(fixtureManifest({ chapters: [] })),
    ).toThrow(/metadata is invalid/);

    expect(() =>
      validateChapterLocaleManifest(
        fixtureManifest({
          chapters: [
            fixtureChapter('02-second', 2),
            fixtureChapter('01-first', 1),
          ],
        }),
      ),
    ).toThrow(/invalid ID or order/);

    expect(() =>
      validateChapterLocaleManifest(
        fixtureManifest({
          chapters: [
            fixtureChapter('01-example', 1),
            fixtureChapter('01-example', 2),
          ],
        }),
      ),
    ).toThrow(/invalid ID or order/);

    expect(() =>
      validateChapterLocaleManifest(
        fixtureManifest({
          chapters: [fixtureChapter('chapter-one', 1)],
        }),
      ),
    ).toThrow(/invalid ID or order/);
  });

  it.each([
    ['an empty active set', [], ['en', 'ru'], 'en'],
    ['an unregistered locale', ['en', 'uk'], ['en', 'ru'], 'en'],
    ['a missing reference locale', ['ru'], ['en', 'ru'], 'en'],
    ['a duplicate locale', ['en', 'ru', 'ru'], ['en', 'ru'], 'en'],
  ])(
    'rejects %s',
    (_label, activeLocales, registeredLocales, referenceLocale) => {
      expect(() =>
        validateChapterLocaleManifest(
          fixtureManifest({
            referenceLocale,
            chapters: [fixtureChapter('01-example', 1, activeLocales)],
          }),
          registeredLocales,
          referenceLocale,
        ),
      ).toThrow(/invalid active locales/);
    },
  );

  it('rejects active locales that do not follow registry order', () => {
    expect(() =>
      validateChapterLocaleManifest(
        fixtureManifest({
          chapters: [
            fixtureChapter('01-example', 1, ['en', 'ar', 'ru']),
          ],
        }),
        ['en', 'ru', 'ar'],
        'en',
      ),
    ).toThrow(/registry order/);
  });

  it.each([
    [[], 'en'],
    [['en', 'en'], 'en'],
    [['ru'], 'en'],
  ])(
    'rejects an invalid registered locale list %#',
    (registeredLocales, referenceLocale) => {
      expect(() =>
        validateChapterLocaleManifest(
          fixtureManifest(),
          registeredLocales,
          referenceLocale,
        ),
      ).toThrow(/Registered locales/);
    },
  );

  it('supports non-English registries and an RTL locale without special cases', () => {
    const configuration = validateChapterLocaleManifest(
      fixtureManifest({
        referenceLocale: 'pt-BR',
        chapters: [
          fixtureChapter('01-example', 1, ['pt-BR', 'ar']),
          fixtureChapter('02-second', 2, ['pt-BR']),
        ],
      }),
      ['pt-BR', 'ar'],
      'pt-BR',
    );

    const typedReferenceLocale: 'pt-BR' | 'ar' = configuration.referenceLocale;
    expect(typedReferenceLocale).toBe('pt-BR');
    expect(configuration.byChapter['01-example']?.activeLocales).toEqual([
      'pt-BR',
      'ar',
    ]);
    expect(configuration.byChapter['02-second']?.activeLocales).toEqual([
      'pt-BR',
    ]);
  });

  it('rejects a missing, extra, stale, or locale-drifting course-plan projection', () => {
    const localeConfiguration = validateLocaleConfiguration({
      defaultLocale: 'en',
      locales: {
        en: { languageTag: 'en', nativeName: 'English', direction: 'ltr' },
        ru: { languageTag: 'ru', nativeName: 'Русский', direction: 'ltr' },
      },
    });
    const projection = validateChapterLocaleConfiguration(
      {
        schemaVersion: 1,
        planId: 'fixture-plan',
        planRevision: 3,
        policyId: 'fixture-policy',
        referenceLocale: 'en',
        chapters: [
          { chapterId: '01-first', order: 1, activeLocales: ['en', 'ru'] },
          { chapterId: '02-second', order: 2, activeLocales: ['en'] },
        ],
      },
      localeConfiguration,
      'fixture projection',
    );
    const plan = {
      plan_id: 'fixture-plan',
      plan_revision: 3,
      chapter_locale_policy: {
        policy_id: 'fixture-policy',
        reference_locale: 'en',
      },
      chapters: [
        {
          chapter_id: '01-first',
          order: 1,
          active_locales: ['en', 'ru'],
        },
        { chapter_id: '02-second', order: 2, active_locales: ['en'] },
      ],
    };

    expect(
      validateChapterLocaleProjectionAgainstPlan(projection, plan),
    ).toBe(projection);
    expect(() =>
      validateChapterLocaleProjectionAgainstPlan(projection, {
        ...plan,
        chapters: plan.chapters.slice(0, 1),
      }),
    ).toThrow(/chapter count differs/);
    expect(() =>
      validateChapterLocaleProjectionAgainstPlan(projection, {
        ...plan,
        chapters: [
          ...plan.chapters,
          { chapter_id: '03-extra', order: 3, active_locales: ['en'] },
        ],
      }),
    ).toThrow(/chapter count differs|missing projection/);
    expect(() =>
      validateChapterLocaleProjectionAgainstPlan(projection, {
        ...plan,
        chapters: [
          { ...plan.chapters[0], chapter_id: '01-stale' },
          plan.chapters[1],
        ],
      }),
    ).toThrow(/differs from planned chapter/);
    expect(() =>
      validateChapterLocaleProjectionAgainstPlan(projection, {
        ...plan,
        chapters: [
          plan.chapters[0],
          { ...plan.chapters[1], active_locales: ['en', 'ru'] },
        ],
      }),
    ).toThrow(/activeLocales differ/);
    expect(() =>
      validateChapterLocaleProjectionAgainstPlan(projection, {
        ...plan,
        plan_revision: 4,
      }),
    ).toThrow(/planRevision 3 differs/);
  });
});
