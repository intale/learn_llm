// @ts-ignore Node APIs are available in the Playwright test runner.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Playwright test runner.
import { resolve } from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import {
  chapterLocales,
  chapterLocaleDefinitions,
  chapterPath,
  chapterTag,
  expectLocalizedChapterRoute,
  expectNoOverflowOrClientScripts,
  expectOrderedChapterNavigation,
  expectVisualizationDecision,
  readOrderedCourseChapters,
  type ChapterLocale,
  type CourseChapterLink,
} from './chapter-helpers';

declare const process: { cwd(): string };

const chapterId = '03-learn-bpe-merges';
const contentRevision = 7;
const formulaLatex = String.raw`(a^{*},b^{*})=\arg\max_{(a,b)}\bigl(C(a,b),-a,-b\bigr),\quad m^{*}=a^{*}\Vert b^{*}`;
const repositoryRoot = resolve(process.cwd(), '..');

function readRustRegion(path: string, region: string): string {
  const lines = readFileSync(resolve(repositoryRoot, path), 'utf8').split(/\r?\n/);
  const start = lines.findIndex(
    (line: string) => line.trim() === `// region:${region}`,
  );
  const end = lines.findIndex(
    (line: string) => line.trim() === `// endregion:${region}`,
  );
  if (start === -1 || end <= start) {
    throw new Error(`Missing ordered Rust region ${region} in ${path}`);
  }
  return lines.slice(start + 1, end).join('\n');
}

const expectedRustSources = [
  readRustRegion(
    'rust/demos/ch03-learn-bpe-merges/src/lib.rs',
    'whole-word-unknown',
  ),
  readRustRegion(
    'rust/crates/llm-from-scratch/src/tokenizer/bpe_trainer.rs',
    'overlapping-pair-counting',
  ),
  readRustRegion(
    'rust/crates/llm-from-scratch/src/tokenizer/bpe_trainer.rs',
    'non-overlapping-replacement',
  ),
  readRustRegion(
    'rust/crates/llm-from-scratch/src/tokenizer/bpe_trainer.rs',
    'deterministic-training',
  ),
  readRustRegion(
    'rust/demos/ch03-learn-bpe-merges/src/main.rs',
    'chapter-output',
  ),
];

const copy = {
  en: {
    indexTitle: 'From text to a tiny language model',
    chapterTitle: 'Learning deterministic BPE merges',
    revisionLabel: 'Content revision',
    headings: {
      worked: 'Predict two rounds before running them',
      formula: 'Select one reproducible rule',
      glossary: 'Symbol glossary',
      history: 'From closed word tables to repeated pair merging',
      rust: 'Implement the trainer without a tokenizer library',
      visualization: 'Inspect the same trace as a static figure',
      exercises: 'Predict, then check',
      decoder: 'Freeze ranks before applying them',
    },
    rustCaptions: [
      'A deterministic whole-word table with one unknown bucket',
      'Count overlapping candidates and resolve ties numerically',
      'Replace left to right without consuming an input token twice',
      'Build initial token sequences from the training view only',
      'Learn from the frozen corpus and emit an inspectable trace',
    ],
    rustLabels: [
      'Rust functions that fit whole-word IDs and map every unseen word to ID zero',
      'Rust pair counter and deterministic most-frequent-pair selector',
      'Rust implementation of one non-overlapping pair-replacement pass',
      'Rust BPE trainer entry point that accepts validated corpus partitions',
      'Rust main function that prints exact corpus ranks and two worked merge rounds',
    ],
    diagramTitle: 'Two deterministic BPE merge rounds',
    diagramDescription:
      'Follow two separate documents through the exact Rust trace. Candidate counts include overlaps, while each replacement pass does not.',
    source: 'Training documents only',
    stagesLabel: 'Token stages',
    roundsLabel: 'Merge rounds',
    fields: {
      stage: 'Stage',
      document: 'Document',
      tokens: 'Token IDs',
      candidates: 'Adjacent-pair candidates',
      pair: 'Pair',
      count: 'Overlapping count',
      selected: 'Selected',
      rank: 'Merge rank',
      newToken: 'New token ID',
      bytesHex: 'Byte expansion (hex)',
      replacements: 'Non-overlapping replacements',
    },
    winner: 'Selected pair',
    notWinner: 'Not selected',
    boundary: 'Document boundary: pairs stop here',
    invariantsLabel: 'What the trace proves',
    invariants: [
      'Candidate counting includes overlapping positions.',
      'Replacement scans left to right without overlap.',
      'Equal counts use the numerically smallest pair.',
      'No pair crosses a document boundary.',
    ],
    exerciseSummary: 'Check your predictions',
    exerciseAnswers: [
      'C(97,97)=3',
      'Lexicographic maximization selects',
      'neither has an adjacent position',
      '256+9=265',
      'validation and test remain held out',
      '61 61 61',
      'without its continuation byte',
    ],
    handoff: 'an earlier merge can create an operand for a later one',
  },
  ru: {
    indexTitle: 'От текста к небольшой языковой модели',
    chapterTitle: 'Детерминированное построение таблицы слияний BPE',
    revisionLabel: 'Версия материала',
    headings: {
      worked: 'Сначала рассчитайте два раунда вручную',
      formula: 'Как однозначно выбрать следующее правило',
      glossary: 'Обозначения в формуле',
      history: 'Почему словаря целых слов оказалось недостаточно',
      rust: 'Реализуйте обучение BPE без готового токенизатора',
      visualization: 'Сверьте ручной расчёт со схемой',
      exercises: 'Сначала решите задачи, затем сверьте ответы',
      decoder: 'Зафиксируйте правила перед кодированием',
    },
    rustCaptions: [
      'Фиксированный словарь целых слов и единый ID для незнакомых слов',
      'Подсчёт с перекрытиями и выбор пары по числовым ID',
      'Один проход замены слева направо без повторного использования токенов',
      'Начальные последовательности только из обучающих документов',
      'Первые восемь правил из таблицы, построенной по корпусу, и проверяемая трассировка двух раундов',
    ],
    rustLabels: [
      'Функции на Rust, которые строят словарь целых слов и сопоставляют каждому незнакомому слову ID 0',
      'Код на Rust, который считает все вхождения соседних пар с учётом перекрытий и при равной частоте выбирает лексикографически наименьшую пару числовых ID',
      'Код на Rust, который заменяет выбранную пару слева направо и использует каждый входной токен не более одного раза',
      'Метод BpeTrainer на Rust, который получает проверенное разбиение и строит начальные последовательности только из обучающих документов',
      'Функция main на Rust, которая печатает первые восемь правил, полученных при обучении на зафиксированной выборке, в порядке их рангов, а затем трассировку двух учебных раундов',
    ],
    diagramTitle: 'Два детерминированных раунда слияния BPE',
    diagramDescription:
      'На схеме показана точная трассировка из программы на Rust: два отдельных документа проходят два раунда, в каждом из которых сначала считаются все вхождения пар-кандидатов с учётом перекрытий, а затем выбранная пара заменяется без перекрытий.',
    source: 'Источник статистики: только обучающие документы',
    stagesLabel: 'Последовательности токенов по этапам',
    roundsLabel: 'Подсчёт и замена по раундам',
    fields: {
      stage: 'Этап',
      document: 'Документ',
      tokens: 'ID токенов',
      candidates: 'Пары-кандидаты в текущем раунде',
      pair: 'Пара',
      count: 'Число вхождений с учётом перекрытий',
      selected: 'Результат выбора',
      rank: 'Ранг слияния',
      newToken: 'ID нового токена',
      bytesHex: 'Байты токена в шестнадцатеричной записи',
      replacements: 'Число замен без перекрытий',
    },
    winner: 'Пара выбрана',
    notWinner: 'Пара не выбрана',
    boundary: 'Граница документа: токены по разные стороны не образуют пару',
    invariantsLabel: 'Что подтверждает трассировка',
    invariants: [
      'При выборе правила учитываются все вхождения пары, включая перекрывающиеся.',
      'При замене каждый входной токен используется не более одного раза.',
      'При равной частоте выигрывает лексикографически наименьшая пара числовых ID.',
      'Токены из разных документов никогда не образуют пару-кандидат.',
    ],
    exerciseSummary: 'Сверьте свои ответы',
    exerciseAnswers: [
      'C(97,97)=3',
      'Лексикографически наибольшая тройка принадлежит паре',
      'окна длины 2 нет',
      '256+9=265',
      'содержимое валидационной и тестовой выборок не влияет на правила',
      '61 61 61',
      'за ним нет байта продолжения',
    ],
    handoff: 'правило с меньшим рангом может создать токен, который понадобится правилу с большим рангом',
  },
} as const satisfies Record<ChapterLocale, unknown>;

async function expectChapterContent(
  page: Page,
  locale: ChapterLocale,
  expectedTimelineColumns: readonly number[],
  chapters: readonly CourseChapterLink[],
) {
  const localized = copy[locale];

  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale,
    order: 3,
    revision: contentRevision,
    revisionLabel: localized.revisionLabel,
    title: localized.chapterTitle,
  });

  for (const heading of Object.values(localized.headings)) {
    await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible();
  }

  const displayedFormula = page.locator('.katex-display');
  await expect(displayedFormula).toHaveCount(1);
  await expect(displayedFormula).toHaveCSS('direction', 'ltr');
  await expect(
    displayedFormula.locator('annotation[encoding="application/x-tex"]'),
  ).toHaveText(formulaLatex);

  const rustSources = page.locator('figure.rust-source');
  await expect(rustSources).toHaveCount(5);
  const highlightedRust = rustSources.locator(
    'pre.rust-source-code.astro-code.github-dark-high-contrast[data-language="rust"]',
  );
  await expect(highlightedRust).toHaveCount(5);
  const highlightingEvidence = await highlightedRust.evaluateAll((blocks) =>
    blocks.map((block) => ({
      lineCount: block.querySelectorAll('code > span.line').length,
      tokenColors: [
        ...new Set(
          Array.from(block.querySelectorAll<HTMLElement>('code span[style*="color"]'))
            .map((token) => token.style.color)
            .filter(Boolean),
        ),
      ],
      tabIndex: block.getAttribute('tabindex'),
      label: block.getAttribute('aria-label'),
      direction: block.getAttribute('dir'),
    })),
  );
  for (const evidence of highlightingEvidence) {
    expect(evidence.lineCount).toBeGreaterThan(0);
    expect(evidence.tokenColors.length).toBeGreaterThan(1);
    expect(evidence.tabIndex).toBe('0');
    expect(evidence.label).toBeTruthy();
    expect(evidence.direction).toBe('ltr');
  }
  expect(highlightingEvidence.map(({ label }) => label)).toEqual([
    ...localized.rustLabels,
  ]);
  expect(
    await highlightedRust.locator('code').evaluateAll((blocks) =>
      blocks.map((block) => block.textContent),
    ),
  ).toEqual(expectedRustSources);
  await expect(rustSources.locator('figcaption span')).toHaveText([
    ...localized.rustCaptions,
  ]);
  expect(
    await rustSources.evaluateAll((sources) =>
      sources.map((source) => source.getAttribute('data-source-region')),
    ),
  ).toEqual([
    'whole-word-unknown',
    'overlapping-pair-counting',
    'non-overlapping-replacement',
    'deterministic-training',
    'chapter-output',
  ]);
  await highlightedRust.first().focus();
  await expect(highlightedRust.first()).toBeFocused();

  await expectVisualizationDecision(page, {
    decision: 'useful',
    id: 'learn-bpe-merges',
  });
  const diagram = page.locator(
    'figure[data-visualization-id="learn-bpe-merges"]',
  );
  await expect(
    diagram.getByRole('heading', { level: 3, name: localized.diagramTitle }),
  ).toBeVisible();
  await expect(diagram.locator('.course-diagram__description')).toHaveText(
    localized.diagramDescription,
  );
  await expect(diagram.locator('.bpe-training-source')).toContainText(
    localized.source,
  );
  await expect(
    diagram.getByRole('heading', { level: 4, name: localized.stagesLabel }),
  ).toHaveCount(1);
  await expect(diagram.locator('.bpe-round > p.visually-hidden')).toHaveText([
    localized.roundsLabel,
    localized.roundsLabel,
  ]);

  const stages = diagram.locator('[data-stage]');
  await expect(stages).toHaveCount(3);
  await expect(stages.locator('.bpe-stage > h5')).toContainText([
    localized.fields.stage,
    localized.fields.stage,
    localized.fields.stage,
  ]);
  await expect(stages.locator('.bpe-documents > li')).toHaveCount(6);
  await expect(stages.locator('.bpe-documents dt').filter({ hasText: localized.fields.document })).toHaveCount(6);
  await expect(stages.locator('.bpe-documents dt').filter({ hasText: localized.fields.tokens })).toHaveCount(6);
  expect(
    await stages.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('data-stage')),
    ),
  ).toEqual(['0', '1', '2']);
  await expect(diagram.locator('.bpe-boundary')).toHaveCount(3);
  await expect(diagram.locator('.bpe-boundary')).toContainText([
    localized.boundary,
    localized.boundary,
    localized.boundary,
  ]);
  expect(
    await diagram
      .locator('.bpe-boundary')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label'))),
  ).toEqual([localized.boundary, localized.boundary, localized.boundary]);

  const tokenStages = await stages.evaluateAll((nodes) =>
    nodes.map((node) =>
      Array.from(node.querySelectorAll('[data-document]')).map((document) => ({
        id: document.getAttribute('data-document'),
        tokens: Array.from(document.querySelectorAll('[data-token-id]')).map(
          (token) => token.getAttribute('data-token-id'),
        ),
      })),
    ),
  );
  expect(tokenStages).toEqual([
    [
      { id: 'train-aaa', tokens: ['97', '97', '97'] },
      { id: 'train-aba', tokens: ['97', '98', '97'] },
    ],
    [
      { id: 'train-aaa', tokens: ['256', '97'] },
      { id: 'train-aba', tokens: ['97', '98', '97'] },
    ],
    [
      { id: 'train-aaa', tokens: ['256', '97'] },
      { id: 'train-aba', tokens: ['257', '97'] },
    ],
  ]);

  const rounds = diagram.locator('[data-round]');
  await expect(rounds).toHaveCount(2);
  await expect(rounds.locator('h5')).toContainText([
    localized.fields.rank,
    localized.fields.rank,
  ]);
  await expect(rounds.locator('table caption')).toHaveText([
    localized.fields.candidates,
    localized.fields.candidates,
  ]);
  expect(
    await rounds
      .locator('.candidate-scroll')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label'))),
  ).toEqual([localized.fields.candidates, localized.fields.candidates]);
  await expect(rounds.locator('thead tr').first().locator('th')).toHaveText([
    localized.fields.pair,
    localized.fields.count,
    localized.fields.selected,
  ]);
  await expect(rounds.nth(0).locator('tbody tr')).toHaveCount(3);
  await expect(rounds.nth(1).locator('tbody tr')).toHaveCount(3);
  await expect(rounds.locator('tr[data-winner="true"]')).toHaveCount(2);
  await expect(rounds.nth(0).locator('tr[data-winner="true"]')).toContainText(
    '(97,97)',
  );
  await expect(rounds.nth(1).locator('tr[data-winner="true"]')).toContainText(
    '(97,98)',
  );
  await expect(rounds.locator('tr[data-winner="true"]')).toContainText([
    localized.winner,
    localized.winner,
  ]);
  await expect(rounds.locator('tr[data-winner="false"] td:last-child')).toContainText([
    localized.notWinner,
    localized.notWinner,
    localized.notWinner,
    localized.notWinner,
  ]);
  await expect(rounds.nth(0).locator('.merge-facts')).toContainText(
    localized.fields.count,
  );
  await expect(rounds.nth(0).locator('.merge-facts')).toContainText(
    localized.fields.replacements,
  );
  await expect(rounds.nth(0).locator('.merge-facts')).toContainText('256');
  await expect(rounds.nth(0).locator('.merge-facts code')).toHaveText('61 61');
  await expect(rounds.nth(1).locator('.merge-facts')).toContainText('257');
  await expect(rounds.nth(1).locator('.merge-facts code')).toHaveText('61 62');
  for (const field of [
    localized.fields.newToken,
    localized.fields.bytesHex,
    localized.fields.count,
    localized.fields.replacements,
  ]) {
    await expect(rounds.locator('.merge-facts dt').filter({ hasText: field })).toHaveCount(2);
  }

  await expect(
    diagram.getByRole('heading', { level: 4, name: localized.invariantsLabel }),
  ).toBeVisible();
  await expect(diagram.locator('.bpe-invariants li')).toContainText([
    ...localized.invariants,
  ]);
  expect(
    await diagram.locator('code, bdi.numeric, .numeric').evaluateAll((nodes) =>
      nodes.every((node) => window.getComputedStyle(node).direction === 'ltr'),
    ),
  ).toBe(true);
  await diagram.focus();
  await expect(diagram).toBeFocused();
  await diagram.locator('.candidate-scroll').first().focus();
  await expect(diagram.locator('.candidate-scroll').first()).toBeFocused();

  const timelineColumns = await diagram
    .locator('.bpe-timeline-step')
    .evaluateAll((steps) =>
      steps.map(
        (step) =>
          window
            .getComputedStyle(step)
            .gridTemplateColumns.split(/\s+/)
            .filter(Boolean).length,
      ),
    );
  expect(timelineColumns).toEqual(expectedTimelineColumns);

  const exerciseDetails = page.locator('.lesson-body details');
  await expect(exerciseDetails).toHaveCount(1);
  await expect(exerciseDetails.locator('summary')).toHaveText(
    localized.exerciseSummary,
  );
  await exerciseDetails.locator('summary').click();
  await expect(exerciseDetails).toHaveAttribute('open', '');
  for (const answer of localized.exerciseAnswers) {
    await expect(exerciseDetails).toContainText(answer);
  }
  await expect(page.locator('.lesson-body')).toContainText(localized.handoff);

  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe(
  'chapter 3 localized vertical slice',
  { tag: chapterTag(chapterId) },
  () => {
    test('chapter 3 is third on every course index and preserves locale switching', async ({
      page,
    }) => {
      for (const locale of chapterLocales) {
        const localized = copy[locale];
        const localeDefinition = chapterLocaleDefinitions.find(
          ({ code }) => code === locale,
        );
        expect(localeDefinition).toBeDefined();
        const chapters = await readOrderedCourseChapters(page, locale);
        expect(chapters.length).toBeGreaterThanOrEqual(3);
        expect(chapters[2]).toEqual(
          expect.objectContaining({
            chapterId,
            order: 3,
            title: localized.chapterTitle,
          }),
        );
        await expect(page.locator('html')).toHaveAttribute(
          'lang',
          localeDefinition?.languageTag ?? '',
        );
        await expect(
          page.getByRole('heading', { level: 1, name: localized.indexTitle }),
        ).toBeVisible();

        await page.getByRole('link', { name: localized.chapterTitle }).click();
        await expectLocalizedChapterRoute(page, {
          chapterId,
          locale,
          order: 3,
          revision: contentRevision,
          revisionLabel: localized.revisionLabel,
          title: localized.chapterTitle,
        });
        await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
        await expectNoOverflowOrClientScripts(page);
      }

      for (const source of chapterLocaleDefinitions) {
        for (const target of chapterLocaleDefinitions.filter(
          ({ code }) => code !== source.code,
        )) {
          await page.goto(chapterPath(source.code, chapterId));
          await page
            .locator(`.locale-switch a[data-locale="${target.code}"]`)
            .click();
          await expect(page).toHaveURL(
            new RegExp(`${chapterPath(target.code, chapterId)}$`),
          );
          await expect(page.locator('html')).toHaveAttribute(
            'lang',
            target.languageTag,
          );
          await expect(
            page.getByRole('heading', {
              level: 1,
              name: copy[target.code].chapterTitle,
            }),
          ).toBeVisible();
        }
      }
    });

    for (const locale of chapterLocales) {
      test(`chapter 3 ${locale} lesson renders every learning element at desktop and narrow widths`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: 1440, height: 1000 });
        const chapters = await readOrderedCourseChapters(page, locale);
        await page.goto(chapterPath(locale, chapterId));
        await expectChapterContent(page, locale, [2, 2, 1], chapters);

        await page.setViewportSize({ width: 390, height: 844 });
        await page.reload();
        await expectChapterContent(page, locale, [1, 1, 1], chapters);
      });
    }

    test('the complete Russian figure expands in place and restores focus', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(chapterPath('ru', chapterId));
      const diagram = page.locator(
        'figure[data-visualization-id="learn-bpe-merges"]',
      );
      const toggle = diagram.locator('[data-diagram-full-view-toggle]');
      await expect(toggle).toHaveCount(1);
      expect((await toggle.getAttribute('aria-label'))?.trim()).toBeTruthy();
      await toggle.click();
      await page.waitForFunction(
        () =>
          document.fullscreenElement?.getAttribute('data-visualization-id') ===
          'learn-bpe-merges',
      );
      await expect(
        diagram.getByRole('heading', {
          level: 3,
          name: copy.ru.diagramTitle,
        }),
      ).toBeVisible();
      await expect(diagram.locator('[data-stage]')).toHaveCount(3);
      await expect(diagram.locator('[data-round]')).toHaveCount(2);
      await expect(diagram.locator('.bpe-invariants li')).toContainText([
        ...copy.ru.invariants,
      ]);
      await expectNoOverflowOrClientScripts(page);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.fullscreenElement === null);
      await expect(toggle).toBeFocused();
    });

    test('Russian evidence remains explicit in forced colors and keeps technical values left-to-right', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.emulateMedia({ forcedColors: 'active' });
      await page.goto(chapterPath('ru', chapterId));
      const diagram = page.locator(
        'figure[data-visualization-id="learn-bpe-merges"]',
      );
      await diagram.evaluate((node) => node.setAttribute('dir', 'rtl'));
      await expect(diagram.locator('tr[data-winner="true"]').first()).toHaveCSS(
        'border-top-style',
        'double',
      );
      await expect(diagram.locator('tr[data-winner="true"]')).toContainText([
        copy.ru.winner,
        copy.ru.winner,
      ]);
      expect(
        await diagram
          .locator('code, bdi.numeric, .numeric')
          .evaluateAll((nodes) =>
            nodes.every((node) => getComputedStyle(node).direction === 'ltr'),
          ),
      ).toBe(true);
      await expect(diagram.locator('.bpe-invariants li')).toContainText([
        ...copy.ru.invariants,
      ]);
      await expectNoOverflowOrClientScripts(page);
    });

    test('the complete Russian lesson remains available without JavaScript at desktop and narrow widths', async ({
      browser,
    }, testInfo) => {
      const context = await browser.newContext({
        javaScriptEnabled: false,
        baseURL: String(testInfo.project.use.baseURL),
      });
      const page = await context.newPage();
      for (const viewport of [
        { width: 1440, height: 1000 },
        { width: 390, height: 844 },
      ]) {
        await page.setViewportSize(viewport);
        await page.goto(chapterPath('ru', chapterId));
        await expect(
          page.getByRole('heading', {
            level: 1,
            name: copy.ru.chapterTitle,
          }),
        ).toBeVisible();
        await expect(page.locator('.katex-display')).toHaveCount(1);
        await expect(page.locator('[data-stage]')).toHaveCount(3);
        await expect(page.locator('[data-round]')).toHaveCount(2);
        await expect(page.locator('.lesson-body details')).toHaveCount(1);
        await expect(page.locator('[data-diagram-full-view-toggle]')).toHaveCount(
          0,
        );
        await expectNoOverflowOrClientScripts(page);
      }
      await context.close();
    });
  },
);
