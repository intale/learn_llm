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
  validateCoursePlanText,
  validateImplementedContracts,
  validateLedgerText,
} from '../../scripts/check-course-plan.mjs';
// @ts-ignore Repository checks are intentionally dependency-free plain ESM modules.
import {
  findPublishablePairs,
  validateCatalogParity,
  validateChapterDocument,
  validateChapterPair,
  validatePublishedContractSequence,
  validatePublishedChapterSequence,
} from '../../scripts/check-site-content.mjs';
// @ts-ignore Repository checks are intentionally dependency-free plain ESM modules.
import { auditStaticSite } from '../../scripts/check-static-links.mjs';
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

function chapterMetadata(locale: 'en' | 'ru' = 'en') {
  const english = locale === 'en';
  return {
    chapter_id: '01-text-units',
    locale,
    content_revision: 1,
    order: 1,
    concept_id: 'text-units',
    title: english ? 'Text units' : 'Единицы текста',
    description: english
      ? 'Map text to stable IDs.'
      : 'Преобразуйте текст в устойчивые ID.',
    objective: english
      ? 'Implement an observable mapping.'
      : 'Реализуйте наблюдаемое отображение.',
    worked_inputs: english
      ? 'Use one tiny fixed input and predict its IDs.'
      : 'Используйте один небольшой фиксированный вход и предскажите его ID.',
    formula: {
      latex: 'i = V(t)',
      symbols: [
        {
          symbol: 't',
          meaning: english ? 'text unit' : 'единица текста',
        },
        {
          symbol: 'i',
          meaning: english ? 'vocabulary ID' : 'ID словаря',
        },
      ],
    },
    history: {
      approach: english ? 'Whitespace splitting' : 'Разбиение по пробелам',
      summary: english ? 'Words came first.' : 'Сначала использовали слова.',
      rust_source: 'rust/demos/ch01-text-units/src/main.rs',
    },
    rust_sources: [
      {
        path: 'rust/demos/ch01-text-units/src/main.rs',
        purpose: english ? 'Runnable contrast' : 'Исполняемое сравнение',
      },
    ],
    visualization: {
      decision: 'useful' as const,
      id: 'text-units',
      rationale: english
        ? 'Shows each mapping.'
        : 'Показывает каждое отображение.',
    },
    decoder_connection: english
      ? 'The resulting IDs become the discrete input to the decoder.'
      : 'Полученные ID становятся дискретным входом декодера.',
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
    '<RustSource path="rust/demos/ch01-text-units/src/main.rs" />',
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

function parsedChapter(locale: 'en' | 'ru') {
  return validateChapterDocument(chapterSource(chapterMetadata(locale)), {
    sourceName: locale + ' fixture',
    checkSourceFiles: false,
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

    const rustTag = '<RustSource path="rust/demos/ch01-text-units/src/main.rs" />';
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

  it('publishes only one complete, same-revision bilingual pair', () => {
    const english = parsedChapter('en');
    const russian = parsedChapter('ru');

    expect(findPublishablePairs([english])).toEqual([]);
    expect(findPublishablePairs([english, russian])).toHaveLength(1);

    const staleData = chapterMetadata('ru');
    staleData.content_revision = 2;
    const staleRussian = validateChapterDocument(chapterSource(staleData), {
      checkSourceFiles: false,
    });
    expect(findPublishablePairs([english, staleRussian])).toEqual([]);
  });

  it('allows intentionally shared technical titles and worked inputs', () => {
    const english = parsedChapter('en');
    const russianData = chapterMetadata('ru');
    russianData.title = english.data.title;
    const russian = validateChapterDocument(chapterSource(russianData), {
      checkSourceFiles: false,
    });
    expect(() => validateChapterPair(english, russian)).not.toThrow();

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

    expect(() => validateChapterPair(english, russian)).toThrow(
      /locale-neutral/,
    );
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

  it('keeps English and Russian message catalog keys in parity', () => {
    expect(validateCatalogParity(resolve(process.cwd(), '..'))).toBeGreaterThan(
      0,
    );
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
      /pre-Chapter-2 prerequisites/,
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
      "npm --prefix site run test:e2e -- --grep '@chapter:02-corpus-partitions'",
      "npm --prefix site run test:e2e -- --grep '@chapter:wrong'",
    );
    expect(() => validateLedgerText(tagDrift, metadata)).toThrow(
      /missing validation/,
    );
  });

  it('keeps repeated bilingual terminology mappings stable across contracts', () => {
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

  it('ties each contract to both lessons, its useful diagram, and exact stdout', () => {
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

    const pair = (chapterId: string, order: number, conceptId: string) => ({
      chapterId,
      en: {
        data: {
          chapter_id: chapterId,
          content_revision: 1,
          order,
          concept_id: conceptId,
        },
      },
      ru: {
        data: {
          chapter_id: chapterId,
          content_revision: 1,
          order,
          concept_id: conceptId,
        },
      },
    });
    expect(() =>
      validatePublishedChapterSequence([
        pair('01-first', 1, 'first'),
        pair('03-third', 3, 'third'),
      ]),
    ).toThrow(/contiguous ordered prefix/);
    expect(() =>
      validatePublishedChapterSequence([
        pair('01-first', 1, 'shared'),
        pair('02-second', 2, 'shared'),
      ]),
    ).toThrow(/duplicate published concept_id/);

    expect(() =>
      validatePublishedContractSequence(
        [pair('01-first', 1, 'first'), pair('02-unplanned', 2, 'second')],
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
    ).toThrow(/lesson count 2 differs from implemented contract count 1/);

    expect(() =>
      validatePublishedContractSequence(
        [pair('01-first', 1, 'drifted-concept')],
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
      '<html lang="mul"><head>' +
        alternates +
        '<link rel="stylesheet" href="/style.css"></head>' +
        '<body><a href="/en/">English</a><a href="/ru/">Русский</a></body></html>',
    );
    writeFileSync(
      join(root, 'en/index.html'),
      '<html lang="en"><head>' +
        alternates +
        '</head><body><a href="/ru/">Русский</a>' +
        '<a href="/en/course/">Course</a></body></html>',
    );
    writeFileSync(
      join(root, 'ru/index.html'),
      '<html lang="ru"><head>' +
        alternates +
        '</head><body><a href="/en/">English</a>' +
        '<a href="/ru/course/">Курс</a></body></html>',
    );
    writeFileSync(
      join(root, 'en/course/index.html'),
      '<html lang="en"><head>' +
        courseAlternates +
        '</head><body></body></html>',
    );
    writeFileSync(
      join(root, 'ru/course/index.html'),
      '<html lang="ru"><head>' +
        courseAlternates +
        '</head><body></body></html>',
    );
    writeFileSync(root + '/style.css', '@font-face{src:url("/font.woff2")}');
    writeFileSync(root + '/font.woff2', '');

    expect(auditStaticSite(root)).toEqual(
      expect.objectContaining({ htmlCount: 5 }),
    );

    writeFileSync(
      join(root, 'en/index.html'),
      '<html lang="en"><head>' +
        alternates +
        '</head><body><a href="/ru/">Русский</a></body></html>',
    );
    expect(() => auditStaticSite(root)).toThrow(
      /localized home must include an ordinary link to \/en\/course\//,
    );

    writeFileSync(
      join(root, 'en/index.html'),
      '<html lang="en"><head>' +
        alternates +
        '</head><body><a href="/en/course/">Course</a></body></html>',
    );
    writeFileSync(
      join(root, 'ru/index.html'),
      '<html lang="ru"><head>' +
        alternates +
        '</head><body><a href="/en/">English</a></body></html>',
    );
    expect(() => auditStaticSite(root)).toThrow(
      /localized home must include an ordinary link to \/ru\/course\//,
    );

    writeFileSync(
      join(root, 'ru/index.html'),
      '<html lang="ru"><head>' +
        alternates +
        '</head><body><a href="/ru/course/">Курс</a></body></html>',
    );
    writeFileSync(
      join(root, 'en/index.html'),
      '<html lang="en"><head>' +
        alternates +
        '</head><body><a href="/en/course/">Course</a>' +
        '<img src="/missing.svg"></body></html>',
    );
    expect(() => auditStaticSite(root)).toThrow(/missing\.svg/);
  });
});
