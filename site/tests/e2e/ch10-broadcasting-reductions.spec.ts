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
  expectSeoDescription,
  expectVisualizationDecision,
  readMathAwareText,
  readOrderedCourseChapters,
  type ChapterLocale,
  type CourseChapterLink,
} from './chapter-helpers';

declare const process: { cwd(): string };

const chapterId = '10-broadcasting-reductions';
const contentRevision = 4;
const formulaLatex = String.raw`y_{\mathbf{i}}=f(a_{\beta_a(\mathbf{i})},b_{\beta_b(\mathbf{i})}), \qquad \mu_k(\mathbf{i}_{-k})=\frac{1}{n_k}\sum_{i_k=0}^{n_k-1}x_{\mathbf{i}}`;
const repositoryRoot = resolve(process.cwd(), '..');
const historySources = [
  'https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf',
  'https://papers.neurips.cc/paper/7181-attention-is-all-you-need.pdf',
  'https://github.com/openai/gpt-2/blob/master/src/model.py',
] as const;

const copy = {
  en: {
    revisionLabel: 'Content revision',
    chapterTitle: 'Align compatible shapes, reduce a named axis',
    chapterDescription:
      'Align feature-wise values across token states, then compute checked sum, mean, and maximum reductions over explicit tensor axes.',
    headings: [
      'Predict one feature offset across two token rows',
      'Map broadcast coordinates and reduce one axis',
      'Account for every coordinate, extent, and mapping',
      'From fixed context to tensor-wide decoder math',
      'Plan shapes before evaluating values',
      'See reused features and reductions along named axes',
      'Predict valid shapes and reduction results',
      'Prepare the primitives behind normalization and softmax',
    ],
    historyHeading: 'From fixed context to tensor-wide decoder math',
    historyLimitation:
      "Bengio et al. describe n-gram models as conditional-probability tables for a fixed number of preceding words; their neural language model concatenates learned context-word features, uses a hyperbolic-tangent hidden layer, and produces next-word probabilities with softmax. Its prediction is still organized around one selected fixed window rather than every position's available causal prefix and the explicit batch, sequence, and head axes used by later decoder Transformers.",
    bengioClaim:
      'Bengio et al. describe n-gram models as conditional-probability tables for a fixed number of preceding words; their neural language model concatenates learned context-word features, uses a hyperbolic-tangent hidden layer, and produces next-word probabilities with softmax.',
    vaswaniClaim:
      'Vaswani et al. define masked decoder self-attention over query, key, and value matrices, apply softmax to scaled query-key scores, wrap each sublayer with a residual connection followed by layer normalization, and apply the same feed-forward network separately and identically at every position.',
    gpt2Claim:
      'The official GPT-2 implementation labels batch, sequence, feature, head, destination, and source axes. Its softmax subtracts a maximum computed over the last axis, exponentiates the shifted values, and divides by their sum over that axis; both reductions retain the axis. Its normalization takes last-axis means before applying feature-sized scale and bias vectors.',
    modernLlmRole:
      'Broadcasting and explicit-axis reductions let this course apply scalars or feature-sized parameters across decoder tensors and compute the per-axis statistics needed by attention softmax and feature normalization. The exact trailing-axis rule, shape errors, empty-axis behavior, keep-dimension option, and allocation policy belong to this implementation; the model sources specify the computations, while the NumPy guide documents the supporting shape-alignment rule.',
    diagramTitle: 'Reuse one feature vector, then reduce along named axes',
    diagramDescription:
      'Align a three-feature bias with two token rows, trace six coordinate mappings, and compare sum, mean, max, and three rejected requests.',
    diagramSections: [
      'Align shapes and map output coordinates to inputs',
      'Reduce along one named axis at a time',
    ],
    incompatibleReason: 'Aligned extents 3 and 2 differ, and neither is one.',
    emptyMeanReason: 'An empty selected axis has no mean value.',
    emptyMaxReason: 'An empty selected axis has no maximum value.',
    rejected: 'Rejected operation',
    notApplicable: 'Not applicable',
    exerciseSummary: 'Check the seven broadcast and reduction predictions',
  },
  ru: {
    revisionLabel: 'Версия материала',
    chapterTitle: 'Согласуйте совместимые формы и агрегируйте значения по заданной оси',
    chapterDescription:
      'Согласуйте вектор смещения с тензором признаков токенов, затем вычислите сумму, среднее и максимум по явно заданным осям с проверкой их допустимости.',
    headings: [
      'Предскажите, как один вектор смещения применяется к двум строкам токенов',
      'Сопоставьте координаты при согласовании форм и редуцируйте одну ось',
      'Учтите каждую координату, размер оси и отображение',
      'От фиксированного контекста к вычислениям над всем тензором декодера',
      'Сначала определите формы, затем вычисляйте значения',
      'Проследите повторное использование признаков и редукции по осям',
      'Предскажите допустимые формы и результаты редукции',
      'Подготовьте примитивы для нормализации и softmax',
    ],
    historyHeading: 'От фиксированного контекста к вычислениям над всем тензором декодера',
    historyLimitation:
      'Бенжио и соавторы описывают n-граммные модели как таблицы условных вероятностей для фиксированного числа предыдущих слов; в их нейронной языковой модели обучаемые векторы признаков слов контекста конкатенируются, скрытый слой использует гиперболический тангенс, а вероятности следующего слова вычисляются с помощью softmax. Однако предсказание по-прежнему строится для одного выбранного окна фиксированной длины. В более поздних декодерах Transformer вычисления, напротив, охватывают доступный каждой позиции авторегрессионный префикс и организованы в тензоры с явными осями пакета, последовательности и голов внимания.',
    bengioClaim:
      'Бенжио и соавторы описывают n-граммные модели как таблицы условных вероятностей для фиксированного числа предыдущих слов; в их нейронной языковой модели обучаемые векторы признаков слов контекста конкатенируются, скрытый слой использует гиперболический тангенс, а вероятности следующего слова вычисляются с помощью softmax.',
    vaswaniClaim:
      'Васвани и соавторы задают маскированное самовнимание декодера через матрицы запросов, ключей и значений, применяют softmax к масштабированным оценкам «запрос — ключ», используют для каждого подслоя остаточное соединение с последующей нормализацией слоя и отдельно, но одинаково применяют одну и ту же сеть прямого распространения к каждой позиции.',
    gpt2Claim:
      'В официальной реализации GPT-2 явно обозначены оси пакета, последовательности, признаков, голов внимания, позиций назначения и позиций источника. В softmax из значений вычитается максимум по последней оси, затем вычисляются экспоненты сдвинутых значений, и каждая из них делится на их сумму по той же оси; обе редукции сохраняют ось. Нормализация сначала вычисляет средние по последней оси, а затем применяет векторы масштаба и смещения, размер которых совпадает с размером оси признаков.',
    modernLlmRole:
      'Согласование форм и редукции по явно указанным осям позволяют в этом курсе применять ко всему тензору декодера скаляры и параметры, размер которых совпадает с размером оси признаков, а также вычислять статистики по нужным осям для softmax в механизме внимания и нормализации признаков. Точное правило согласования начиная с последних осей, ошибки формы, поведение пустых осей, возможность сохранить редуцируемую ось и правила выделения памяти относятся к этой реализации. Источники по моделям задают сами вычисления, а руководство NumPy описывает вспомогательное правило согласования форм.',
    diagramTitle: 'Один вектор смещения для двух строк и редукция по осям',
    diagramDescription:
      'Согласуйте вектор смещения из трёх признаков с двумя строками токенов, проследите шесть отображений координат и сравните сумму, среднее, максимум и три отклонённых запроса.',
    diagramSections: [
      'Согласуйте формы и сопоставьте координаты результата координатам входов',
      'Выполняйте редукцию по одной заданной оси',
    ],
    incompatibleReason: 'Согласованные размеры осей 3 и 2 различаются, и ни один из них не равен 1.',
    emptyMeanReason: 'Для выбранной пустой оси среднее не определено.',
    emptyMaxReason: 'Для выбранной пустой оси максимум не определён.',
    rejected: 'Операция отклонена',
    notApplicable: 'Не применяется',
    exerciseSummary: 'Проверить семь ответов о согласовании форм и редукции',
  },
} as const satisfies Record<ChapterLocale, unknown>;

function readRustRegion(path: string, region: string): string {
  const lines = readFileSync(resolve(repositoryRoot, path), 'utf8').split(/\r?\n/);
  const start = lines.findIndex((line: string) => line.trim() === `// region:${region}`);
  const end = lines.findIndex((line: string) => line.trim() === `// endregion:${region}`);
  if (start === -1 || end <= start) throw new Error(`Missing ordered Rust region ${region} in ${path}`);
  return lines.slice(start + 1, end).join('\n');
}

const expectedRustRegions = [
  ['rust/demos/ch10-broadcasting-reductions/src/lib.rs', 'tiny-token-feature-example'],
  ['rust/crates/llm-from-scratch/src/tensor/ops.rs', 'broadcast-planning'],
  ['rust/crates/llm-from-scratch/src/tensor/ops.rs', 'elementwise-maps'],
  ['rust/crates/llm-from-scratch/src/tensor/ops.rs', 'axis-reductions'],
  ['rust/demos/ch10-broadcasting-reductions/src/main.rs', 'learner-broadcasting-output'],
] as const;
const expectedRustSources = expectedRustRegions.map(([path, region]) => readRustRegion(path, region));

async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolveFrame) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame())),
    );
  });
}

async function expectChapterContent(
  page: Page,
  locale: ChapterLocale,
  chapters: readonly CourseChapterLink[],
  narrow: boolean,
) {
  const localized = copy[locale];
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale,
    order: 10,
    revision: contentRevision,
    revisionLabel: localized.revisionLabel,
    title: localized.chapterTitle,
  });
  await expect(page.locator('.lesson-description')).toHaveText(localized.chapterDescription);
  await expectSeoDescription(page, localized.chapterDescription);
  await expect(page.locator('.lesson-body h2')).toHaveText([...localized.headings]);

  const historyNodes = page
    .getByRole('heading', { level: 2, name: localized.historyHeading, exact: true })
    .locator(
      `xpath=following-sibling::*[not(self::h2) and preceding-sibling::h2[1][normalize-space()="${localized.historyHeading}"]]`,
    );
  const historyText = await readMathAwareText(historyNodes);
  expect(historyText).toContain(localized.historyLimitation);
  expect(historyText).toContain(localized.bengioClaim);
  expect(historyText).toContain(localized.vaswaniClaim);
  expect(historyText).toContain(localized.gpt2Claim);
  expect(historyText).toContain(localized.modernLlmRole);
  expect(historyText).not.toMatch(/Iliffe|Genie|FORTRAN|TypeScript|build instructions|инструкц(?:ии|ия) сборки/i);
  const historyLinks = historyNodes.locator('a');
  await expect(historyLinks).toHaveCount(historySources.length);
  expect(await historyLinks.evaluateAll((links) => links.map((link) => link.getAttribute('href')))).toEqual(
    historySources,
  );

  const formula = page
    .locator('.katex-display')
    .filter({ has: page.locator('annotation[encoding="application/x-tex"]', { hasText: formulaLatex }) });
  await expect(formula).toHaveCount(1);
  await expect(formula).toHaveCSS('direction', 'ltr');
  await expect(formula.locator('annotation[encoding="application/x-tex"]')).toHaveText(formulaLatex);

  const rustSources = page.locator('figure.rust-source');
  await expect(rustSources).toHaveCount(expectedRustRegions.length);
  const highlighted = rustSources.locator(
    'pre.rust-source-code.astro-code.github-dark-high-contrast[data-language="rust"]',
  );
  await expect(highlighted).toHaveCount(expectedRustRegions.length);
  expect(
    await highlighted.locator('code').evaluateAll((blocks) => blocks.map((block) => block.textContent)),
  ).toEqual(expectedRustSources);
  expect(
    await rustSources.evaluateAll((sources) =>
      sources.map((source) => source.getAttribute('data-source-region')),
    ),
  ).toEqual(expectedRustRegions.map(([, region]) => region));
  for (const evidence of await highlighted.evaluateAll((blocks) =>
    blocks.map((block) => ({
      tabIndex: block.getAttribute('tabindex'),
      label: block.getAttribute('aria-label'),
      direction: block.getAttribute('dir'),
      colors: new Set(
        Array.from(block.querySelectorAll<HTMLElement>('code span[style*="color"]'))
          .map((token) => token.style.color)
          .filter(Boolean),
      ).size,
    })),
  )) {
    expect(evidence.tabIndex).toBe('0');
    expect(evidence.label).toBeTruthy();
    expect(evidence.direction).toBe('ltr');
    expect(evidence.colors).toBeGreaterThan(1);
  }

  await expectVisualizationDecision(page, { decision: 'useful', id: 'broadcasting-reductions' });
  const diagram = page.locator('figure[data-visualization-id="broadcasting-reductions"]');
  await expect(diagram).toHaveAccessibleName(localized.diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(localized.diagramDescription);
  for (const heading of localized.diagramSections) {
    await expect(diagram.getByRole('heading', { name: heading })).toBeVisible();
  }
  await expect(diagram.locator(':scope > section[data-diagram-box]')).toHaveCount(2);
  await expect(diagram.locator('table[data-diagram-table]')).toHaveCount(2);
  await expect(diagram.locator('[data-alignment-id]')).toHaveCount(3);
  await expect(diagram.locator('[data-alignment-id="tokens"]')).toContainText('[2,3]');
  await expect(diagram.locator('[data-alignment-id="bias"]')).toContainText('[3]');
  await expect(diagram.locator('[data-alignment-id="bias"]')).toContainText('[1,3]');
  await expect(diagram.locator('[data-alignment-id="output"]')).toContainText('[2,3]');

  const maps = diagram.locator('[data-output-coordinate]');
  await expect(maps).toHaveCount(6);
  expect(
    await maps.evaluateAll((rows) =>
      rows.map((row) => ({
        output: row.getAttribute('data-output-coordinate'),
        left: row.getAttribute('data-left-coordinate'),
        right: row.getAttribute('data-right-coordinate'),
        value: row.getAttribute('data-result-value'),
      }))),
  ).toEqual([
    { output: '0,0', left: '0,0', right: '0', value: '11.0' },
    { output: '0,1', left: '0,1', right: '1', value: '22.0' },
    { output: '0,2', left: '0,2', right: '2', value: '33.0' },
    { output: '1,0', left: '1,0', right: '0', value: '14.0' },
    { output: '1,1', left: '1,1', right: '1', value: '25.0' },
    { output: '1,2', left: '1,2', right: '2', value: '36.0' },
  ]);

  const reductions = diagram.locator('[data-reduction-operation]');
  await expect(reductions).toHaveCount(3);
  expect(
    await reductions.evaluateAll((rows) =>
      rows.map((row) => ({
        operation: row.getAttribute('data-reduction-operation'),
        axis: row.getAttribute('data-reduction-axis'),
        keepDim: row.getAttribute('data-keep-dim'),
        shape: row.getAttribute('data-output-shape'),
        values: row.getAttribute('data-reduction-values'),
        groups: Array.from(row.querySelectorAll('[data-group-indices]')).map((group) =>
          group.getAttribute('data-group-indices'),
        ),
      }))),
  ).toEqual([
    { operation: 'sum', axis: '0', keepDim: 'no', shape: '3', values: '25.0,47.0,69.0', groups: ['0,3', '1,4', '2,5'] },
    { operation: 'mean', axis: '1', keepDim: 'yes', shape: '2,1', values: '22.0,25.0', groups: ['0,1,2', '3,4,5'] },
    { operation: 'max', axis: '1', keepDim: 'no', shape: '2', values: '33.0,36.0', groups: ['0,1,2', '3,4,5'] },
  ]);

  const errors = diagram.locator('[data-error-kind]');
  await expect(errors).toHaveCount(3);
  expect(await errors.evaluateAll((rows) => rows.map((row) => row.getAttribute('data-error-kind')))).toEqual([
    'incompatible-broadcast',
    'empty-mean-axis',
    'empty-max-axis',
  ]);
  await expect(errors.nth(0)).toContainText(localized.incompatibleReason);
  await expect(errors.nth(1)).toContainText(localized.emptyMeanReason);
  await expect(errors.nth(2)).toContainText(localized.emptyMaxReason);
  await expect(errors).toContainText([localized.rejected, localized.rejected, localized.rejected]);
  await expect(errors.nth(1)).toContainText(localized.notApplicable);
  await expect(errors.nth(2)).toContainText(localized.notApplicable);
  await expect(
    diagram.locator(
      '[data-error-kind="incompatible-broadcast"] annotation[encoding="application/x-tex"]',
    ),
  ).toHaveText(String.raw`3\ne2`);

  expect(
    await diagram.locator('code, bdi').evaluateAll((nodes) =>
      nodes.every((node) => window.getComputedStyle(node).direction === 'ltr'),
    ),
  ).toBe(true);
  const regions = diagram.locator('[data-diagram-scroll]');
  await expect(regions).toHaveCount(2);
  for (const region of await regions.all()) {
    await region.focus();
    await expect(region).toBeFocused();
    if (narrow) {
      const widths = await region.evaluate((node) => ({ client: node.clientWidth, scroll: node.scrollWidth }));
      expect(widths.scroll).toBeGreaterThan(widths.client);
    }
  }
  expect(
    await diagram.locator('[data-diagram-box]').evaluateAll((boxes) =>
      boxes
        .map((box) => ({
          label: (box as HTMLElement).className,
          inlineDebt: (box as HTMLElement).scrollWidth - (box as HTMLElement).clientWidth,
          blockDebt: (box as HTMLElement).scrollHeight - (box as HTMLElement).clientHeight,
        }))
        .filter(({ inlineDebt, blockDebt }) => inlineDebt > 2 || blockDebt > 2),
    ),
  ).toEqual([]);

  const exerciseDetails = page.locator('.lesson-body details');
  await expect(exerciseDetails).toHaveCount(1);
  await expect(exerciseDetails.locator('summary')).toHaveText(localized.exerciseSummary);
  await exerciseDetails.locator('summary').click();
  await expect(exerciseDetails).toHaveAttribute('open', '');
  await expect(exerciseDetails.locator('ol > li')).toHaveCount(7);

  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 10 localized broadcasting-reductions vertical slice', {
  tag: chapterTag(chapterId),
}, () => {
  test('chapter 10 is tenth on every course index with direct equivalent locale routes', async ({ page }) => {
    for (const locale of chapterLocales) {
      const localized = copy[locale];
      const localeDefinition = chapterLocaleDefinitions.find(({ code }) => code === locale);
      expect(localeDefinition).toBeDefined();
      const chapters = await readOrderedCourseChapters(page, locale);
      expect(chapters.length).toBeGreaterThanOrEqual(10);
      expect(chapters[9]).toEqual(
        expect.objectContaining({ chapterId, order: 10, title: localized.chapterTitle }),
      );
      await expect(page.locator('html')).toHaveAttribute('lang', localeDefinition?.languageTag ?? '');
      await page.getByRole('link', { name: localized.chapterTitle }).click();
      await expectLocalizedChapterRoute(page, {
        chapterId,
        locale,
        order: 10,
        revision: contentRevision,
        revisionLabel: localized.revisionLabel,
        title: localized.chapterTitle,
      });
      await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
      await expectNoOverflowOrClientScripts(page);
    }

    for (const source of chapterLocaleDefinitions) {
      for (const target of chapterLocaleDefinitions.filter(({ code }) => code !== source.code)) {
        await page.goto(chapterPath(source.code, chapterId));
        const switchLink = page.locator(`.locale-switch a[data-locale="${target.code}"]`);
        await expect(switchLink).not.toHaveAttribute('data-locale-fallback', 'course-index');
        await switchLink.click();
        await expect(page).toHaveURL(new RegExp(`${chapterPath(target.code, chapterId)}$`));
        await expect(page.locator('html')).toHaveAttribute('lang', target.languageTag);
        await expect(page.getByRole('heading', { level: 1, name: copy[target.code].chapterTitle })).toBeVisible();
      }
    }
  });

  for (const locale of chapterLocales) {
    test(`chapter 10 ${locale} renders exact content at desktop and narrow widths`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      const chapters = await readOrderedCourseChapters(page, locale);
      await page.goto(chapterPath(locale, chapterId));
      await expectChapterContent(page, locale, chapters, false);

      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      await expectChapterContent(page, locale, chapters, true);
    });
  }

  test('chapter 10 full view fits both localized panels without substantial travel', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    for (const locale of chapterLocales) {
      await page.goto(chapterPath(locale, chapterId));
      await settle(page);
      const diagram = page.locator('figure[data-visualization-id="broadcasting-reductions"]');
      const toggle = diagram.locator('[data-diagram-full-view-toggle]');
      await expect(toggle).toBeVisible();
      await toggle.click();
      await page.waitForFunction(
        () => document.fullscreenElement?.getAttribute('data-visualization-id') === 'broadcasting-reductions',
      );
      await settle(page);
      const geometry = await diagram.evaluate((node) => ({
        blockDebt: node.scrollHeight - node.clientHeight,
        blockBudget: Math.ceil(node.clientHeight * 0.2),
        inlineDebt: node.scrollWidth - node.clientWidth,
        regionInlineDebts: Array.from(node.querySelectorAll<HTMLElement>('[data-diagram-scroll]'))
          .map((region) => region.scrollWidth - region.clientWidth),
        boxDebts: Array.from(node.querySelectorAll<HTMLElement>('[data-diagram-box]'))
          .map((box) => ({ inline: box.scrollWidth - box.clientWidth, block: box.scrollHeight - box.clientHeight })),
      }));
      expect(geometry.blockDebt).toBeLessThanOrEqual(geometry.blockBudget);
      expect(geometry.inlineDebt).toBeLessThanOrEqual(2);
      expect(geometry.regionInlineDebts.every((debt) => debt <= 2)).toBe(true);
      expect(geometry.boxDebts.every(({ inline, block }) => inline <= 2 && block <= 2)).toBe(true);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.fullscreenElement === null);
    }
  });

  for (const locale of chapterLocales) {
    test(`chapter 10 ${locale} retains reuse, reduction, and rejection cues in forced colors`, async ({ page }) => {
      const localized = copy[locale];
      await page.emulateMedia({ forcedColors: 'active' });
      await page.goto(chapterPath(locale, chapterId));
      const diagram = page.locator('figure[data-visualization-id="broadcasting-reductions"]');
      await expect(diagram.locator('[data-alignment-id="bias"] > .state-symbol')).toHaveText('↻');
      await expect(diagram.locator('[data-reduction-operation] .state-symbol')).toHaveText(['↓', '↓', '↓']);
      await expect(diagram.locator('[data-error-kind] .state-symbol')).toHaveText(['×', '×', '×']);
      await expect(diagram.locator('[data-error-kind]')).toContainText([
        localized.incompatibleReason,
        localized.emptyMeanReason,
        localized.emptyMaxReason,
      ]);
      await expectNoOverflowOrClientScripts(page);
    });
  }

  test('both localized diagrams remain complete without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();
    try {
      for (const locale of chapterLocales) {
        await page.goto(chapterPath(locale, chapterId));
        const diagram = page.locator('figure[data-visualization-id="broadcasting-reductions"]');
        await expect(diagram).toHaveCount(1);
        await expect(diagram.locator('table[data-diagram-table]')).toHaveCount(2);
        await expect(diagram.locator('[data-output-coordinate]')).toHaveCount(6);
        await expect(diagram.locator('[data-reduction-operation]')).toHaveCount(3);
        await expect(diagram.locator('[data-error-kind]')).toHaveCount(3);
        await expect(diagram.locator('[data-diagram-full-view-controls]')).toHaveCount(0);
        await expectNoOverflowOrClientScripts(page);
      }
    } finally {
      await context.close();
    }
  });
});
