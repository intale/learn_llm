// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { tmpdir } from 'node:os';
// @ts-ignore Node APIs are supplied by the test runtime; the site has no Node runtime.
import { join, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

// @ts-ignore Repository checks are intentionally dependency-free plain ESM modules.
import {
  validateChapterContractIntegration,
  validateChapterContractText,
  validateContractLesson,
  validateExpectedOutput,
} from '../../scripts/check-chapter-contract.mjs';
// @ts-ignore Repository checks are intentionally dependency-free plain ESM modules.
import {
  deriveScheduledStepIds,
  validateCoursePlanText,
  validateImplementedContracts,
  validateLedgerText,
} from '../../scripts/check-course-plan.mjs';
// @ts-ignore Repository checks are intentionally dependency-free plain ESM modules.
import {
  findPublishableChapterSets,
  validateCatalogParity,
  validateChapterDocument,
  validateChapterLocaleSet,
  validatePublishedContractSequence,
  validatePublishedChapterSequence,
} from '../../scripts/check-site-content.mjs';
// @ts-ignore Repository checks are intentionally dependency-free plain ESM modules.
import { auditStaticSite } from '../../scripts/check-static-links.mjs';
// @ts-ignore Repository checks are intentionally dependency-free plain ESM modules.
import { validateLocaleConfiguration } from '../../scripts/locale-config.mjs';
import {
  findChapterNeighbors,
  orderChapterTargets,
} from '../src/lib/chapter-navigation';

declare const process: { cwd(): string };

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

function replaceOnce(source: string, search: string, replacement: string) {
  expect(source.split(search)).toHaveLength(2);
  return source.replace(search, replacement);
}

function repositoryRoot() {
  return resolve(process.cwd(), '..');
}

function canonicalContract() {
  const root = repositoryRoot();
  const path = join(root, 'curriculum/chapters/01-text-units.md');
  return validateChapterContractText(readFileSync(path, 'utf8'), {
    sourceName: 'curriculum/chapters/01-text-units.md',
  });
}

function canonicalLesson(locale: 'en' | 'ru') {
  const path = join(
    repositoryRoot(),
    'site/src/content/chapters',
    locale,
    '01-text-units.mdx',
  );
  return validateChapterDocument(readFileSync(path, 'utf8'), {
    sourceName: `${locale}/01-text-units.mdx`,
    checkSourceFiles: false,
  });
}

function chapterMetadata(locale: string = 'en') {
  const english = locale === 'en';
  const russian = locale === 'ru';
  const localized = (englishText: string, russianText: string) =>
    english ? englishText : russian ? russianText : `[${locale}] ${englishText}`;
  return {
    chapter_id: '01-text-units',
    locale,
    content_revision: 1,
    order: 1,
    concept_id: 'text-units',
    title: localized('Text units', 'Единицы текста'),
    description: localized(
      'Map text to stable IDs.',
      'Преобразуйте текст в устойчивые ID.',
    ),
    objective: localized(
      'Implement an observable mapping.',
      'Реализуйте наблюдаемое отображение.',
    ),
    worked_inputs: localized(
      'Use one tiny fixed input and predict its IDs.',
      'Используйте один небольшой фиксированный вход и предскажите его ID.',
    ),
    formula: {
      latex: 'i = V(t)',
      symbols: [
        {
          symbol: 't',
          meaning: localized('text unit', 'единица текста'),
        },
        {
          symbol: 'i',
          meaning: localized('vocabulary ID', 'ID словаря'),
        },
      ],
    },
    history: {
      approach: localized('Whitespace splitting', 'Разбиение по пробелам'),
      summary: localized('Words came first.', 'Сначала использовали слова.'),
      rust_source: 'rust/demos/ch01-text-units/src/main.rs',
    },
    rust_sources: [
      {
        path: 'rust/demos/ch01-text-units/src/main.rs',
        purpose: localized('Runnable contrast', 'Исполняемое сравнение'),
      },
    ],
    visualization: {
      decision: 'useful' as const,
      id: 'text-units',
      rationale: localized('Shows each mapping.', 'Показывает каждое отображение.'),
    },
    decoder_connection: localized(
      'The resulting IDs become the discrete input to the decoder.',
      'Полученные ID становятся дискретным входом декодера.',
    ),
  };
}

function chapterBody(formula = 'i = V(t)') {
  return [
    '{/* chapter-section:worked-example */}',
    '## Worked example',
    'Predict the stable IDs for one tiny input, then compare every intermediate representation.',
    '{/* chapter-section:formula */}',
    '## Formula',
    '$$',
    formula,
    '$$',
    'Apply one deterministic vocabulary lookup at each sequence position and inspect the result.',
    '{/* chapter-section:symbol-glossary */}',
    '## Symbols',
    '| Symbol | Meaning |',
    '| :--- | :--- |',
    '| $t$ | the input text unit used at this position |',
    '| $i$ | the resulting stable vocabulary identifier |',
    '{/* chapter-section:history */}',
    '## History',
    'Contrast whitespace splitting with smaller units and explain the earlier method’s limitation.',
    '{/* chapter-section:rust-implementation */}',
    '## Rust',
    'Run the dependency-free implementation and inspect the exact deterministic output before editing it.',
    '<RustSource path="rust/demos/ch01-text-units/src/main.rs" caption="Runnable source" label="Rust source code" />',
    '{/* chapter-section:visualization */}',
    '## Visualization',
    'Trace the same position through every representation using labels in addition to color.',
    '<FixtureDiagram />',
    '{/* chapter-section:exercises */}',
    '## Exercises',
    '1. Predict the output before running the example.',
    '2. Explain which common boundary mistake changes the result.',
    '<details><summary>Check the predictions</summary>',
    '1. The fixed example preserves every known unit.',
    '2. The mistaken boundary changes the observable sequence.',
    '</details>',
    '{/* chapter-section:decoder-connection */}',
    '## Decoder connection',
    'The verified integer sequence becomes the explicit boundary consumed by the cumulative decoder.',
    '',
  ].join('\n');
}

function chapterSource(
  data = chapterMetadata(),
  body = chapterBody(data.formula.latex),
) {
  return ['---', JSON.stringify(data, null, 2), '---', '', body].join('\n');
}

function parsedChapter(
  locale: string,
  supportedLocales: readonly string[] = ['en', 'ru'],
) {
  return validateChapterDocument(chapterSource(chapterMetadata(locale)), {
    sourceName: locale + ' fixture',
    checkSourceFiles: false,
    supportedLocales,
  });
}

describe('localized chapter documents', () => {
  it('accepts the complete ordered contract and declared Rust source reference', () => {
    const result = parsedChapter('en');

    expect(result.data.chapter_id).toBe('01-text-units');
    expect(result.references).toEqual([
      expect.objectContaining({
        path: 'rust/demos/ch01-text-units/src/main.rs',
        region: undefined,
      }),
    ]);
  });

  it('rejects missing sections and Rust paths outside the allowlist', () => {
    const missingSection = chapterBody().replace(
      '{/* chapter-section:exercises */}',
      '',
    );
    expect(() =>
      validateChapterDocument(
        chapterSource(chapterMetadata(), missingSection),
        {
          checkSourceFiles: false,
        },
      ),
    ).toThrow(/section markers/);

    const unsafe = chapterMetadata();
    unsafe.history.rust_source = '../secret.rs';
    unsafe.rust_sources[0].path = '../secret.rs';
    expect(() =>
      validateChapterDocument(chapterSource(unsafe), {
        checkSourceFiles: false,
      }),
    ).toThrow(/repository Rust path|repository-relative/);

    const misleadingAriaLabel = chapterBody().replace(
      'label="Rust source code"',
      'aria-label="Wrong component prop"',
    );
    expect(() =>
      validateChapterDocument(
        chapterSource(chapterMetadata(), misleadingAriaLabel),
        { checkSourceFiles: false },
      ),
    ).toThrow(/RustSource> label must be localized literal text/);

    const misleadingDataPath = chapterBody().replace(
      'path="rust/demos/ch01-text-units/src/main.rs"',
      'data-path="rust/demos/ch01-text-units/src/main.rs"',
    );
    expect(() =>
      validateChapterDocument(chapterSource(chapterMetadata(), misleadingDataPath), {
        checkSourceFiles: false,
      }),
    ).toThrow(/RustSource> path must be a string literal/);
  });

  it('rejects empty teaching shells and misplaced section evidence', () => {
    const emptyWorkedExample = replaceOnce(
      chapterBody(),
      'Predict the stable IDs for one tiny input, then compare every intermediate representation.',
      '',
    );
    expect(() =>
      validateChapterDocument(chapterSource(chapterMetadata(), emptyWorkedExample), {
        checkSourceFiles: false,
      }),
    ).toThrow(/worked-example section lacks meaningful teaching evidence/);

    const formulaDrift = replaceOnce(chapterBody(), 'i = V(t)', 'i = V(x)');
    expect(() =>
      validateChapterDocument(chapterSource(chapterMetadata(), formulaDrift), {
        checkSourceFiles: false,
      }),
    ).toThrow(/must display formula\.latex exactly once/);

    const formulaBlock = ['$$', 'i = V(t)', '$$'].join('\n');
    for (const hiddenFormula of [
      ['~~~text', '$$', 'i = V(t)', '$$', '~~~~'].join('\n'),
      ['    $$', '    i = V(t)', '    $$'].join('\n'),
      '{/* $$ i = V(t) $$ */}',
    ]) {
      const hiddenFormulaBody = replaceOnce(
        chapterBody(),
        formulaBlock,
        hiddenFormula,
      );
      expect(() =>
        validateChapterDocument(
          chapterSource(chapterMetadata(), hiddenFormulaBody),
          { checkSourceFiles: false },
        ),
      ).toThrow(/must display formula\.latex exactly once/);
    }

    const rustTag =
      '<RustSource path="rust/demos/ch01-text-units/src/main.rs" caption="Runnable source" label="Rust source code" />';
    const misplacedRust = rustTag + '\n' + replaceOnce(chapterBody(), rustTag, '');
    expect(() =>
      validateChapterDocument(chapterSource(chapterMetadata(), misplacedRust), {
        checkSourceFiles: false,
      }),
    ).toThrow(/rust-implementation section must contain/);

    for (const hiddenRust of [
      ['~~~mdx', rustTag, '~~~~'].join('\n'),
      '{/* ' + rustTag + ' */}',
    ]) {
      const hiddenRustBody = replaceOnce(chapterBody(), rustTag, hiddenRust);
      expect(() =>
        validateChapterDocument(
          chapterSource(chapterMetadata(), hiddenRustBody),
          { checkSourceFiles: false },
        ),
      ).toThrow(/rust-implementation section must contain|not rendered/);
    }

    const uncheckedExercises = chapterBody().replace(
      /<details>[\s\S]*?<\/details>/,
      '',
    );
    expect(() =>
      validateChapterDocument(chapterSource(chapterMetadata(), uncheckedExercises), {
        checkSourceFiles: false,
      }),
    ).toThrow(/checked answers/);

    const answersOnlyNumbering = replaceOnce(
      chapterBody(),
      '1. Predict the output before running the example.',
      'Predict the output before running the example.',
    );
    expect(() =>
      validateChapterDocument(
        chapterSource(chapterMetadata(), answersOnlyNumbering),
        { checkSourceFiles: false },
      ),
    ).toThrow(/predict-first ordered list/);

    const emptyAnswers = chapterBody().replace(
      /<details>[\s\S]*?<\/details>/,
      '<details><summary>Check the predictions</summary></details>',
    );
    expect(() =>
      validateChapterDocument(chapterSource(chapterMetadata(), emptyAnswers), {
        checkSourceFiles: false,
      }),
    ).toThrow(/substantive ordered answer/);
  });

  it('publishes only complete, same-revision configured locale sets', () => {
    const english = parsedChapter('en');
    const russian = parsedChapter('ru');

    expect(findPublishableChapterSets([english], ['en', 'ru'], 'en')).toEqual([]);
    expect(
      findPublishableChapterSets([english, russian], ['en', 'ru'], 'en'),
    ).toHaveLength(1);

    const staleData = chapterMetadata('ru');
    staleData.content_revision = 2;
    const staleRussian = validateChapterDocument(chapterSource(staleData), {
      checkSourceFiles: false,
    });
    expect(
      findPublishableChapterSets([english, staleRussian], ['en', 'ru'], 'en'),
    ).toEqual([]);
  });

  it('requires exactly one translation for every locale in a synthetic three-locale set', () => {
    const configured = ['en', 'ru', 'es'];
    const documents = configured.map((locale) =>
      parsedChapter(locale, configured),
    );

    const complete = validateChapterLocaleSet(documents, configured, 'en');
    expect(Object.keys(complete.byLocale).sort()).toEqual([...configured].sort());
    expect(
      findPublishableChapterSets(documents, configured, 'en'),
    ).toHaveLength(1);
    expect(() =>
      validateChapterLocaleSet(documents.slice(0, 2), configured, 'en'),
    ).toThrow(/exactly one es source/);
    expect(() =>
      validateChapterLocaleSet([...documents, documents[2]], configured, 'en'),
    ).toThrow(/exactly one es source/);

    const stale = structuredClone(documents[2]);
    stale.data.content_revision = 2;
    expect(() =>
      validateChapterLocaleSet([documents[0], documents[1], stale], configured, 'en'),
    ).toThrow(/revision/);

    const drifted = structuredClone(documents[2]);
    drifted.data.formula.latex = 'i = W(t)';
    expect(() =>
      validateChapterLocaleSet(
        [documents[0], documents[1], drifted],
        configured,
        'en',
      ),
    ).toThrow(/locale-neutral/);
  });

  it('allows intentionally shared technical titles and worked inputs', () => {
    const english = parsedChapter('en');
    const russianData = chapterMetadata('ru');
    russianData.title = english.data.title;
    const russian = validateChapterDocument(chapterSource(russianData), {
      checkSourceFiles: false,
    });
    expect(() =>
      validateChapterLocaleSet([english, russian], ['en', 'ru'], 'en'),
    ).not.toThrow();

    const contract = canonicalContract();
    const sharedInputContract = structuredClone(contract.data);
    sharedInputContract.worked_inputs.ru = sharedInputContract.worked_inputs.en;
    const source = [
      '---',
      JSON.stringify(sharedInputContract, null, 2),
      '---',
      contract.body,
    ].join('\n');
    expect(() =>
      validateChapterContractText(source, { sourceName: 'shared-input contract' }),
    ).not.toThrow();
  });

  it('detects drift in locale-neutral formula metadata', () => {
    const english = parsedChapter('en');
    const russianData = chapterMetadata('ru');
    russianData.formula.latex = 'different';
    const russian = validateChapterDocument(chapterSource(russianData), {
      checkSourceFiles: false,
    });

    expect(() =>
      validateChapterLocaleSet([english, russian], ['en', 'ru'], 'en'),
    ).toThrow(/locale-neutral/);
  });
});

describe('curriculum and catalog contracts', () => {
  it('keeps the checked-in chapter template structurally valid', () => {
    const template = readFileSync(
      resolve(process.cwd(), '../curriculum/chapter-template.md'),
      'utf8',
    );
    const result = validateChapterContractText(template, {
      sourceName: 'chapter-template.md',
    });

    expect(result.data.visualization.decision).toBe('useful');
  });

  it('requires every localized contract field for a synthetic third locale', () => {
    const canonical = canonicalContract();
    const contract = structuredClone(canonical.data);
    contract.objective.es = 'Objetivo localizado';
    contract.worked_inputs.es = 'Entradas localizadas';
    for (const symbol of contract.formula.symbols) {
      symbol.es = `Significado de ${symbol.symbol}`;
    }
    contract.history.approach.es = 'Enfoque histórico';
    contract.history.summary.es = 'Resumen histórico';
    contract.visualization.rationale.es = 'Justificación visual';
    contract.decoder_connection.es = 'Conexión con el decodificador';
    for (const term of contract.terminology) {
      term.es = `Término ${term.concept_id}`;
    }
    const source = [
      '---',
      JSON.stringify(contract, null, 2),
      '---',
      canonical.body,
    ].join('\n');

    expect(() =>
      validateChapterContractText(source, {
        sourceName: 'three-locale contract',
        supportedLocales: ['en', 'ru', 'es'],
      }),
    ).not.toThrow();

    delete contract.decoder_connection.es;
    expect(() =>
      validateChapterContractText(
        ['---', JSON.stringify(contract, null, 2), '---', canonical.body].join(
          '\n',
        ),
        {
          sourceName: 'incomplete three-locale contract',
          supportedLocales: ['en', 'ru', 'es'],
        },
      ),
    ).toThrow(/decoder_connection locale keys must be exactly en, es, ru/);
  });

  it('keeps every configured message catalog in exact key parity', () => {
    expect(validateCatalogParity(resolve(process.cwd(), '..'))).toBeGreaterThan(
      0,
    );
  });

  it('fails closed when a newly configured locale lacks a complete catalog', () => {
    const root = mkdtempSync(join(tmpdir(), 'learn-llm-catalogs-'));
    temporaryDirectories.push(root);
    const directory = join(root, 'site/src/i18n');
    const catalogDirectory = join(directory, 'catalogs');
    mkdirSync(catalogDirectory, { recursive: true });
    writeFileSync(
      join(directory, 'locales.json'),
      JSON.stringify({
        defaultLocale: 'en',
        locales: {
          en: { languageTag: 'en', nativeName: 'English', direction: 'ltr' },
          es: { languageTag: 'es', nativeName: 'Español', direction: 'ltr' },
        },
      }),
    );
    writeFileSync(
      join(directory, 'messages.ts'),
      "export const messageKeys = [\n  'title',\n  'subtitle',\n] as const;\n",
    );
    writeFileSync(
      join(catalogDirectory, 'en.json'),
      JSON.stringify({ title: 'Title', subtitle: 'Subtitle' }),
    );

    expect(() => validateCatalogParity(root)).toThrow(/missing catalog.*es\.json/);
    writeFileSync(
      join(catalogDirectory, 'es.json'),
      JSON.stringify({ title: 'Título', extra: 'No' }),
    );
    expect(() => validateCatalogParity(root)).toThrow(/catalog keys differ/);

    writeFileSync(
      join(catalogDirectory, 'es.json'),
      JSON.stringify({ title: 'Título', subtitle: '   ' }),
    );
    expect(() => validateCatalogParity(root)).toThrow(
      /subtitle must be a non-empty string/,
    );

    writeFileSync(
      join(catalogDirectory, 'es.json'),
      '{"title":"Uno","title":"Dos","subtitle":"Subtítulo"}',
    );
    expect(() => validateCatalogParity(root)).toThrow(/contains duplicate keys/);
  });

  it('rejects plan-body, ledger, and implemented-prefix drift', () => {
    const root = repositoryRoot();
    const planPath = join(root, 'curriculum/course-plan.md');
    const statePath = join(root, 'BUILD_STATE.yaml');
    const planSource = readFileSync(planPath, 'utf8');
    const stateSource = readFileSync(statePath, 'utf8');
    const metadata = validateCoursePlanText(planSource, planPath);

    expect(() =>
      validateLedgerText(stateSource, metadata, statePath),
    ).not.toThrow();
    expect(() =>
      validateImplementedContracts(metadata, [
        { path: '01-text-units.md', data: canonicalContract().data },
      ]),
    ).not.toThrow();

    const staleAudit = replaceOnce(
      planSource,
      'The revision-2 repair replaced',
      'One defect remains; a later step replaces',
    );
    expect(() => validateCoursePlanText(staleAudit)).toThrow(
      /must describe the completed revision-2 repair/,
    );

    const highlightingPrerequisiteDrift = replaceOnce(
      planSource,
      '"add-static-rust-syntax-highlighting"',
      '"missing-rust-highlighting"',
    );
    expect(() => validateCoursePlanText(highlightingPrerequisiteDrift)).toThrow(
      /cross-cutting prerequisites/,
    );

    const finalPlacement = replaceOnce(
      planSource,
      [
        '      {',
        '        "step_id": "generalize-localization-infrastructure",',
        '        "before_chapter": "02-corpus-partitions"',
        '      }',
      ].join('\n'),
      [
        '      {',
        '        "step_id": "generalize-localization-infrastructure",',
        '        "before_chapter": "02-corpus-partitions"',
        '      },',
        '      {',
        '        "step_id": "activate-locale-ar-eg",',
        '        "after_chapter": "39-end-to-end-llm"',
        '      }',
      ].join('\n'),
    );
    const finalPlacementMetadata = validateCoursePlanText(
      finalPlacement,
      'post-course locale activation plan',
    );
    expect(deriveScheduledStepIds(finalPlacementMetadata).at(-1)).toBe(
      'activate-locale-ar-eg',
    );

    const ambiguousPlacement = replaceOnce(
      planSource,
      [
        '      {',
        '        "step_id": "generalize-localization-infrastructure",',
        '        "before_chapter": "02-corpus-partitions"',
        '      }',
      ].join('\n'),
      [
        '      {',
        '        "step_id": "generalize-localization-infrastructure",',
        '        "before_chapter": "02-corpus-partitions",',
        '        "after_chapter": "01-text-units"',
        '      }',
      ].join('\n'),
    );
    expect(() => validateCoursePlanText(ambiguousPlacement)).toThrow(
      /exactly one of before_chapter or after_chapter/,
    );

    const dependencyDrift = replaceOnce(
      planSource,
      '- **Depends on:** `01-text-units`.',
      '- **Depends on:** `39-end-to-end-llm`.',
    );
    expect(() => validateCoursePlanText(dependencyDrift)).toThrow(
      /body dependency mismatch/,
    );

    const visualizationDrift = replaceOnce(
      planSource,
      '- **Visualization:** Not useful —',
      '- **Visualization:** Useful —',
    );
    expect(() => validateCoursePlanText(visualizationDrift)).toThrow(
      /body visualization decision mismatch/,
    );

    const objectiveDrift = replaceOnce(
      stateSource,
      'objective: "Partition an original bilingual corpus into disjoint train, validation, and test documents before learning any tokenizer or model statistic."',
      'objective: "Drifted Chapter 2 objective."',
    );
    expect(() => validateLedgerText(objectiveDrift, metadata)).toThrow(
      /objective does not match/,
    );

    const tagDrift = replaceOnce(
      stateSource,
      `          - "npm --prefix site run test:e2e -- --grep '@chapter:02-corpus-partitions'"`,
      `          - "npm --prefix site run test:e2e -- --grep '@chapter:wrong'"`,
    );
    expect(() => validateLedgerText(tagDrift, metadata)).toThrow(
      /missing validation/,
    );
  });

  it('keeps registry expansion deferred until chapter policy activation', () => {
    const root = repositoryRoot();
    const planSource = readFileSync(
      join(root, 'curriculum/course-plan.md'),
      'utf8',
    );
    const stateSource = readFileSync(join(root, 'BUILD_STATE.yaml'), 'utf8');
    const localeConfiguration = validateLocaleConfiguration({
      defaultLocale: 'en',
      locales: {
        en: { languageTag: 'en', nativeName: 'English', direction: 'ltr' },
        ru: { languageTag: 'ru', nativeName: 'Русский', direction: 'ltr' },
        es: { languageTag: 'es', nativeName: 'Español', direction: 'ltr' },
      },
    });
    const deferredPlanSource = replaceOnce(
      planSource,
      [
        '    "deferred_locales": [',
        '      "ru"',
        '    ],',
      ].join('\n'),
      [
        '    "deferred_locales": [',
        '      "ru",',
        '      "es"',
        '    ],',
      ].join('\n'),
    );
    const metadata = validateCoursePlanText(
      deferredPlanSource,
      'synthetic three-locale plan',
      localeConfiguration,
    );

    expect(() =>
      validateLedgerText(
        stateSource,
        metadata,
        'synthetic three-locale ledger',
        localeConfiguration,
      ),
    ).not.toThrow();

    const missingActiveLocale = stateSource.replace(
      `          - "site/src/content/chapters/en/08-tensor-storage.mdx"\n`,
      '',
    );
    expect(() =>
      validateLedgerText(
        missingActiveLocale,
        metadata,
        'missing active Chapter 8 locale ledger',
        localeConfiguration,
      ),
    ).toThrow(/must own exactly one lesson output per declared locale/);

    const extraDeferredLocale = stateSource
      .replace(
        `          - "site/src/content/chapters/en/08-tensor-storage.mdx"\n`,
        [
          `          - "site/src/content/chapters/en/08-tensor-storage.mdx"`,
          `          - "site/src/content/chapters/es/08-tensor-storage.mdx"`,
          '',
        ].join('\n'),
      )
      .replace(
        `          - "npm --prefix site run check:chapter -- --locale en --chapter 08-tensor-storage"\n`,
        [
          `          - "npm --prefix site run check:chapter -- --locale en --chapter 08-tensor-storage"`,
          `          - "npm --prefix site run check:chapter -- --locale es --chapter 08-tensor-storage"`,
          '',
        ].join('\n'),
      );
    expect(() =>
      validateLedgerText(
        extraDeferredLocale,
        metadata,
        'extra deferred Chapter 8 locale ledger',
        localeConfiguration,
      ),
    ).toThrow(/lesson outputs must match chapter-active locales en/);

    const uncoveredChapter = replaceOnce(
      deferredPlanSource,
      '        "through_chapter": "07-language-model-metrics",',
      '        "through_chapter": "06-bigram-baseline",',
    );
    expect(() =>
      validateCoursePlanText(
        uncoveredChapter,
        'gapped synthetic chapter-locale plan',
        localeConfiguration,
      ),
    ).toThrow(/must continue the exact chapter sequence/);

    expect(() =>
      validateCoursePlanText(
        planSource,
        'unacknowledged synthetic registry expansion',
        localeConfiguration,
      ),
    ).toThrow(
      /deferred_locales must be the registered locales outside the final active range/,
    );
  });

  it('keeps repeated localized terminology mappings stable across contracts', () => {
    const plan = validateCoursePlanText(
      readFileSync(join(repositoryRoot(), 'curriculum/course-plan.md'), 'utf8'),
    );
    const contracts = plan.chapters.slice(0, 2).map(
      (
        chapter: {
          chapter_id: string;
          formula: string;
          order: number;
          primary_module: string | null;
          visualization: 'useful' | 'not-useful';
        },
        index: number,
      ) => ({
        path: `${chapter.chapter_id}.md`,
        data: {
          chapter_id: chapter.chapter_id,
          order: chapter.order,
          concept_id: `fixture-concept-${index + 1}`,
          formula: { latex: chapter.formula },
          rust: {
            sources: chapter.primary_module
              ? [
                  'rust/crates/llm-from-scratch/src/' +
                    chapter.primary_module,
                ]
              : [],
          },
          visualization: { decision: chapter.visualization },
          terminology: [
            {
              concept_id: 'shared-term',
              en: index === 0 ? 'stable term' : 'drifted term',
              ru: 'устойчивый термин',
            },
          ],
        },
      }),
    );

    expect(() => validateImplementedContracts(plan, contracts)).toThrow(
      /terminology concept_id.*conflicts/,
    );
  });

  it('ties each contract to every lesson, its useful diagram, and exact stdout', () => {
    const contract = canonicalContract();
    const integration = validateChapterContractIntegration(contract, {
      repositoryRoot: repositoryRoot(),
      sourceName: '01-text-units contract',
    });
    expect(integration.visualizationComponent).toBe(
      'site/src/components/chapters/TextUnitsDiagram.astro',
    );

    const english = canonicalLesson('en');
    expect(() =>
      validateContractLesson(
        contract.data,
        english,
        'en',
        'site/src/content/chapters/en/01-text-units.mdx',
      ),
    ).not.toThrow();

    const driftedData = structuredClone(english.data);
    driftedData.objective = 'A different objective.';
    const driftedLesson = validateChapterDocument(
      chapterSource(driftedData, english.body),
      { sourceName: 'drifted English lesson', checkSourceFiles: false },
    );
    expect(() =>
      validateContractLesson(contract.data, driftedLesson, 'en'),
    ).toThrow(/differs from the contract/);

    const historyDrift = structuredClone(english.data);
    historyDrift.history.approach = 'An unrelated historical approach';
    const driftedHistoryLesson = validateChapterDocument(
      chapterSource(historyDrift, english.body),
      { sourceName: 'drifted-history lesson', checkSourceFiles: false },
    );
    expect(() =>
      validateContractLesson(contract.data, driftedHistoryLesson, 'en'),
    ).toThrow(/history.*differs from the contract/);

    const wrongDiagram = validateChapterDocument(
      chapterSource(
        english.data,
        replaceOnce(
          english.body,
          '../../../components/chapters/TextUnitsDiagram.astro',
          '../../../components/chapters/CorpusPartitionsDiagram.astro',
        ),
      ),
      { sourceName: 'wrong-diagram lesson', checkSourceFiles: false },
    );
    expect(() =>
      validateContractLesson(
        contract.data,
        wrongDiagram,
        'en',
        'site/src/content/chapters/en/01-text-units.mdx',
      ),
    ).toThrow(/chapter-specific component/);

    const diagramInvocation = '<TextUnitsDiagram labels={diagramLabels} />';
    for (const hiddenDiagram of [
      ['~~~mdx', diagramInvocation, '~~~~'].join('\n'),
      '{/* ' + diagramInvocation + ' */}',
    ]) {
      const hiddenDiagramLesson = {
        ...english,
        body: replaceOnce(english.body, diagramInvocation, hiddenDiagram),
      };
      expect(() =>
        validateContractLesson(
          contract.data,
          hiddenDiagramLesson,
          'en',
          'site/src/content/chapters/en/01-text-units.mdx',
        ),
      ).toThrow(/must import and invoke exactly one/);
    }

    expect(() =>
      validateChapterDocument(
        chapterSource(
          english.data,
          replaceOnce(
            english.body,
            '<TextUnitsDiagram labels={diagramLabels} />',
            '',
          ),
        ),
        { sourceName: 'missing-diagram lesson', checkSourceFiles: false },
      ),
    ).toThrow(/useful visualization must be invoked inside its section/);

    const expected = readFileSync(
      join(repositoryRoot(), 'rust/demos/ch01-text-units/expected.txt'),
      'utf8',
    );
    expect(validateExpectedOutput(contract.data, expected)).toBe(true);
    expect(() => validateExpectedOutput(contract.data, expected + 'x')).toThrow(
      /byte-for-byte/,
    );
    expect(() =>
      validateExpectedOutput(contract.data, expected.slice(0, -1)),
    ).toThrow(/byte-for-byte/);
  });
});

describe('published order and chapter navigation', () => {
  const targets = [
    { chapterId: '03-third', order: 3, title: 'Third' },
    { chapterId: '01-first', order: 1, title: 'First' },
    { chapterId: '02-second', order: 2, title: 'Second' },
  ];

  it('orders shuffled chapters and returns first, middle, and last neighbors', () => {
    expect(
      orderChapterTargets(targets).map((target) => target.chapterId),
    ).toEqual(['01-first', '02-second', '03-third']);
    expect(findChapterNeighbors(targets, '01-first')).toEqual(
      expect.objectContaining({ previous: null, next: targets[2] }),
    );
    expect(findChapterNeighbors(targets, '02-second')).toEqual(
      expect.objectContaining({ previous: targets[1], next: targets[0] }),
    );
    expect(findChapterNeighbors(targets, '03-third')).toEqual(
      expect.objectContaining({ previous: targets[2], next: null }),
    );
  });

  it('rejects ambiguous navigation and noncontiguous publication data', () => {
    expect(() =>
      orderChapterTargets([...targets, { ...targets[0], title: 'Duplicate' }]),
    ).toThrow(/duplicate chapter navigation ID/);
    expect(() =>
      orderChapterTargets([
        ...targets,
        { chapterId: '04-fourth', order: 3, title: 'Fourth' },
      ]),
    ).toThrow(/duplicate chapter navigation order/);
    expect(() => findChapterNeighbors(targets, '04-missing')).toThrow(
      /absent from published navigation/,
    );

    const localeSet = (chapterId: string, order: number, conceptId: string) => ({
      chapterId,
      reference: {
        data: {
          chapter_id: chapterId,
          content_revision: 1,
          order,
          concept_id: conceptId,
        },
      },
      byLocale: {},
    });
    expect(() =>
      validatePublishedChapterSequence([
        localeSet('01-first', 1, 'first'),
        localeSet('03-third', 3, 'third'),
      ]),
    ).toThrow(/contiguous ordered prefix/);
    expect(() =>
      validatePublishedChapterSequence([
        localeSet('01-first', 1, 'shared'),
        localeSet('02-second', 2, 'shared'),
      ]),
    ).toThrow(/duplicate published concept_id/);

    expect(() =>
      validatePublishedContractSequence(
        [
          localeSet('01-first', 1, 'first'),
          localeSet('02-unplanned', 2, 'second'),
        ],
        [
          {
            data: {
              chapter_id: '01-first',
              content_revision: 1,
              order: 1,
              concept_id: 'first',
            },
          },
        ],
      ),
    ).toThrow(/lesson-set count 2 differs from implemented contract count 1/);

    expect(() =>
      validatePublishedContractSequence(
        [localeSet('01-first', 1, 'drifted-concept')],
        [
          {
            data: {
              chapter_id: '01-first',
              content_revision: 1,
              order: 1,
              concept_id: 'first',
            },
          },
        ],
      ),
    ).toThrow(/published lesson identity.*differs/);
  });
});

describe('static link and locale audit', () => {
  it('audits a complete synthetic three-locale route and alternate matrix', () => {
    const root = mkdtempSync(join(tmpdir(), 'learn-llm-three-locales-'));
    temporaryDirectories.push(root);
    const configuration = validateLocaleConfiguration({
      defaultLocale: 'en',
      locales: {
        en: { languageTag: 'en', nativeName: 'English', direction: 'ltr' },
        'pt-br': {
          languageTag: 'pt-BR',
          nativeName: 'Português (Brasil)',
          direction: 'ltr',
        },
        'ar-eg': {
          languageTag: 'ar-EG',
          nativeName: 'العربية (مصر)',
          direction: 'rtl',
        },
      },
    });
    const definitions = configuration.definitions;
    const alternateMarkup = (suffix: string) =>
      definitions
        .map(
          ({ code, languageTag }: { code: string; languageTag: string }) =>
            `<link rel="alternate" hreflang="${languageTag}" href="/${code}${suffix}">`,
        )
        .join('') + '<link rel="alternate" hreflang="x-default" href="/">';
    const localeLinks = (current: string, suffix: string) =>
      definitions
        .filter(({ code }: { code: string }) => code !== current)
        .map(
          ({ code, nativeName }: { code: string; nativeName: string }) =>
            `<a href="/${code}${suffix}">${nativeName}</a>`,
        )
        .join('');

    writeFileSync(
      join(root, 'index.html'),
      '<html lang="mul" dir="ltr"><head>' +
        alternateMarkup('/') +
        '</head><body>' +
        definitions
          .map(
            ({ code, nativeName }: { code: string; nativeName: string }) =>
              `<a href="/${code}/">${nativeName}</a>`,
          )
          .join('') +
        '</body></html>',
    );
    for (const definition of definitions) {
      mkdirSync(join(root, definition.code, 'course'), { recursive: true });
      writeFileSync(
        join(root, definition.code, 'index.html'),
        `<html lang="${definition.languageTag}" dir="${definition.direction}"><head>` +
          alternateMarkup('/') +
          '</head><body>' +
          localeLinks(definition.code, '/') +
          `<a href="/${definition.code}/course/">Course</a>` +
          '</body></html>',
      );
      writeFileSync(
        join(root, definition.code, 'course/index.html'),
        `<html lang="${definition.languageTag}" dir="${definition.direction}"><head>` +
          alternateMarkup('/course/') +
          '</head><body>' +
          localeLinks(definition.code, '/course/') +
          '</body></html>',
      );
    }

    expect(auditStaticSite(root, configuration)).toEqual(
      expect.objectContaining({ htmlCount: 7 }),
    );

    const arabicHome = join(root, 'ar-eg/index.html');
    const validArabicHome = readFileSync(arabicHome, 'utf8');
    writeFileSync(
      arabicHome,
      validArabicHome.replace('dir="rtl"', 'dir="ltr"'),
    );
    expect(() => auditStaticSite(root, configuration)).toThrow(
      /does not match locale direction rtl/,
    );
    writeFileSync(arabicHome, validArabicHome);

    const arabicCourse = join(root, 'ar-eg/course/index.html');
    writeFileSync(
      arabicCourse,
      readFileSync(arabicCourse, 'utf8').replace(
        '<a href="/pt-br/course/">Português (Brasil)</a>',
        '',
      ),
    );
    expect(() => auditStaticSite(root, configuration)).toThrow(
      /locale switch must include an ordinary link to \/pt-br\/course\//,
    );

    writeFileSync(
      arabicCourse,
      readFileSync(arabicCourse, 'utf8').replace(
        '</body>',
        '<a href="/pt-br/course/">Português (Brasil)</a></body>',
      ),
    );
    const rootIndex = join(root, 'index.html');
    const validRoot = readFileSync(rootIndex, 'utf8');
    writeFileSync(
      rootIndex,
      validRoot.replace('<a href="/pt-br/">Português (Brasil)</a>', ''),
    );
    expect(() => auditStaticSite(root, configuration)).toThrow(
      /root language chooser must link to \/pt-br\//,
    );

    writeFileSync(rootIndex, validRoot);
    const englishHome = join(root, 'en/index.html');
    const validEnglishHome = readFileSync(englishHome, 'utf8');
    writeFileSync(
      englishHome,
      validEnglishHome.replace(
        '<link rel="alternate" hreflang="pt-BR" href="/pt-br/">',
        '',
      ),
    );
    expect(() => auditStaticSite(root, configuration)).toThrow(
      /expected hreflang pt-BR to point to \/pt-br\//,
    );

    writeFileSync(
      englishHome,
      validEnglishHome.replace(
        '</head>',
        '<link rel="alternate" hreflang="pt-BR" href="/pt-br/"></head>',
      ),
    );
    expect(() => auditStaticSite(root, configuration)).toThrow(
      /expected exactly one hreflang pt-BR; found 2/,
    );
  });

  it('requires localized course entry links and rejects a missing local asset', () => {
    const root = mkdtempSync(join(tmpdir(), 'learn-llm-links-'));
    temporaryDirectories.push(root);
    mkdirSync(join(root, 'en/course'), { recursive: true });
    mkdirSync(join(root, 'ru/course'), { recursive: true });

    const alternates = [
      '<link rel="alternate" hreflang="en" href="/en/">',
      '<link rel="alternate" hreflang="ru" href="/ru/">',
      '<link rel="alternate" hreflang="x-default" href="/">',
    ].join('');
    const courseAlternates = [
      '<link rel="alternate" hreflang="en" href="/en/course/">',
      '<link rel="alternate" hreflang="ru" href="/ru/course/">',
      '<link rel="alternate" hreflang="x-default" href="/">',
    ].join('');
    writeFileSync(
      join(root, 'index.html'),
      '<html lang="mul" dir="ltr"><head>' +
        alternates +
        '<link rel="stylesheet" href="/style.css"></head>' +
        '<body><a href="/en/">English</a><a href="/ru/">Русский</a></body></html>',
    );
    writeFileSync(
      join(root, 'en/index.html'),
      '<html lang="en" dir="ltr"><head>' +
        alternates +
        '</head><body><a href="/ru/">Русский</a>' +
        '<a href="/en/course/">Course</a></body></html>',
    );
    writeFileSync(
      join(root, 'ru/index.html'),
      '<html lang="ru" dir="ltr"><head>' +
        alternates +
        '</head><body><a href="/en/">English</a>' +
        '<a href="/ru/course/">Курс</a></body></html>',
    );
    writeFileSync(
      join(root, 'en/course/index.html'),
      '<html lang="en" dir="ltr"><head>' +
        courseAlternates +
        '</head><body><a href="/ru/course/">Русский</a></body></html>',
    );
    writeFileSync(
      join(root, 'ru/course/index.html'),
      '<html lang="ru" dir="ltr"><head>' +
        courseAlternates +
        '</head><body><a href="/en/course/">English</a></body></html>',
    );
    writeFileSync(root + '/style.css', '@font-face{src:url("/font.woff2")}');
    writeFileSync(root + '/font.woff2', '');

    expect(auditStaticSite(root)).toEqual(
      expect.objectContaining({ htmlCount: 5 }),
    );

    writeFileSync(
      join(root, 'en/index.html'),
      '<html lang="en" dir="ltr"><head>' +
        alternates +
        '</head><body><a href="/ru/">Русский</a></body></html>',
    );
    expect(() => auditStaticSite(root)).toThrow(
      /localized home must include an ordinary link to \/en\/course\//,
    );

    writeFileSync(
      join(root, 'en/index.html'),
      '<html lang="en" dir="ltr"><head>' +
        alternates +
        '</head><body><a href="/ru/">Русский</a>' +
        '<a href="/en/course/">Course</a></body></html>',
    );
    writeFileSync(
      join(root, 'ru/index.html'),
      '<html lang="ru" dir="ltr"><head>' +
        alternates +
        '</head><body><a href="/en/">English</a></body></html>',
    );
    expect(() => auditStaticSite(root)).toThrow(
      /localized home must include an ordinary link to \/ru\/course\//,
    );

    writeFileSync(
      join(root, 'ru/index.html'),
      '<html lang="ru" dir="ltr"><head>' +
        alternates +
        '</head><body><a href="/en/">English</a>' +
        '<a href="/ru/course/">Курс</a></body></html>',
    );
    writeFileSync(
      join(root, 'en/index.html'),
      '<html lang="en" dir="ltr"><head>' +
        alternates +
        '</head><body><a href="/ru/">Русский</a>' +
        '<a href="/en/course/">Course</a>' +
        '<img src="/missing.svg"></body></html>',
    );
    expect(() => auditStaticSite(root)).toThrow(/missing\.svg/);
  });
});
