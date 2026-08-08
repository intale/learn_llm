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
  expectStackedDiagramText,
  expectVisualizationDecision,
  readMathAwareText,
  readOrderedCourseChapters,
  type ChapterLocale,
  type CourseChapterLink,
} from './chapter-helpers';

declare const process: { cwd(): string };

const chapterId = '11-matrix-multiplication';
const contentRevision = 5;
const formulaLatex = String.raw`C_{ij}=\sum_{k=0}^{K-1} A_{ik}B_{kj}`;
const repositoryRoot = resolve(process.cwd(), '..');
const historySources = [
  'https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf',
  'https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf',
  'https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf',
] as const;

const copy = {
  en: {
    revisionLabel: 'Content revision',
    chapterTitle: 'Multiply rows by columns, then reuse batches',
    chapterDescription:
      'Multiply checked 2-D and batched tensors with scalar Rust loops, including inner-dimension checks, batch broadcasting, and transpose flags.',
    headings: [
      'Predict one row-by-column product',
      'Contract one shared inner dimension',
      'Name every matrix index and extent',
      'From one fixed context vector to matrices of positions',
      'Check shapes before the scalar loops',
      'Trace one output cell, then add a batch axis',
      'Predict products before running Rust',
      'Prepare learned projections and attention',
    ],
    historyHeading: 'From one fixed context vector to matrices of positions',
    historyLimitation:
      "Bengio et al.'s feed-forward neural language model looks up learned vectors for a fixed number of context words, concatenates them into one fixed-length context vector, and computes next-word scores with learned matrix-vector transforms. It shares features beyond count tables, but each prediction still uses that bounded context instead of masked self-attention across a sequence of positions.",
    bengioClaim:
      'Bengio et al. store learned word features in a matrix, concatenate the fixed context-word vectors, and compute next-word scores with successive learned matrix-vector transformations and a nonlinear hidden layer.',
    vaswaniClaim:
      'Vaswani et al. pack queries, keys, and values into matrices, define attention through scaled query-key products followed by softmax and value weighting, and use learned query, key, value, and output projections plus two linear transforms in each position-wise feed-forward network.',
    gpt2Claim:
      'The GPT-2 report uses a Transformer-based architecture for autoregressive language models and scales its four model sizes from 12 to 48 layers, model widths 768 to 1600, and a 1024-token context.',
    modernLlmRole:
      "Checked matrix multiplication is the reusable contraction behind learned projections, attention scores, and attention-weighted values on the road to a modern decoder. This course's batched broadcasting, transpose flags, strided traversal, storage policy, zero-size rules, and explicit errors are local correctness decisions, not designs attributed to the papers.",
    diagramTitle: 'Follow one row-by-column contraction, then reuse one weight batch',
    diagramDescription:
      'Compare three matrices, accumulate one selected output cell in contracted-index order, and inspect logical transposition, batch reuse, and rejected shapes.',
    diagramSections: [
      'Select one left row and one right column',
      'Accumulate three products in contracted-index order',
      'Reuse logical weights without copying values',
      'Reject mismatched inner and batch dimensions',
    ],
    innerMismatchReason: 'The two inner dimensions must be equal.',
    batchMismatchReason: 'Leading batch dimensions must be equal or one of them must be singleton.',
    exerciseSummary: 'Check the eight matrix-multiplication predictions',
    strideEvidence: 'offset pairs (3,0), (4,2), and (5,4)',
    emptyEvidence: 'without constructing an offset cursor or reading either input',
  },
  ru: {
    revisionLabel: 'Версия материала',
    chapterTitle:
      'Умножьте строки на столбцы и используйте одну матрицу весов в нескольких пакетах',
    chapterDescription:
      'Выполните матричное умножение двумерных и пакетных тензоров скалярными циклами на Rust с проверкой внутренних размеров, согласованием форм по осям пакета и флагами транспонирования.',
    headings: [
      'Предскажите произведение одной строки и одного столбца',
      'Просуммируйте произведения по одной общей внутренней оси',
      'Назовите каждый индекс и размер матриц',
      'От одного вектора фиксированного контекста к матрицам всех позиций',
      'Проверьте формы до начала скалярных циклов',
      'Проследите одну ячейку результата, затем добавьте ось пакета',
      'Предскажите произведения до запуска Rust',
      'Подготовьте обучаемые проекции и внимание',
    ],
    historyHeading: 'От одного вектора фиксированного контекста к матрицам всех позиций',
    historyLimitation:
      'Нейронная языковая модель прямого распространения Бенжио и соавторов выбирает обучаемые векторы для фиксированного числа слов контекста, объединяет их в один вектор фиксированной длины и вычисляет оценки следующего слова с помощью обучаемых матрично-векторных преобразований. Общие признаки позволяют модели переносить сведения между похожими словами, но каждое предсказание всё ещё опирается на ограниченный контекст, а не на маскированное самовнимание по последовательности позиций.',
    bengioClaim:
      'Бенжио и соавторы хранят обучаемые признаки слов в матрице, объединяют векторы слов из контекста фиксированной длины и вычисляют оценки следующего слова последовательными обучаемыми матрично-векторными преобразованиями и нелинейным скрытым слоем.',
    vaswaniClaim:
      'Васвани и соавторы собирают запросы, ключи и значения в матрицы. Для вычисления внимания они получают масштабированные оценки «запрос — ключ», применяют к ним softmax и используют полученные веса для взвешивания значений; кроме того, они используют обучаемые проекции запросов, ключей и значений, выходную проекцию, а также два линейных преобразования в сети прямого распространения, одинаковой для каждой позиции.',
    gpt2Claim:
      'В отчёте о GPT-2 описана архитектура авторегрессионной языковой модели на основе Transformer: четыре варианта имеют от 12 до 48 слоёв, ширину от 768 до 1600 и контекст длиной 1024 токена.',
    modernLlmRole:
      'Матричное умножение с проверкой форм суммирует произведения по общей оси. В современном декодере оно многократно используется в обучаемых проекциях, при вычислении оценок внимания и сумм значений с весами внимания. Согласование форм по осям пакета, флаги транспонирования, обход с учётом шагов, правила хранения, обработка нулевых размеров и явные ошибки — частные правила этой реализации, обеспечивающие корректность; они не заимствованы из статей.',
    diagramTitle: 'Проследите сумму произведений строки и столбца и повторное использование весов',
    diagramDescription:
      'Сравните три матрицы, вычислите выбранную ячейку по внутреннему индексу и разберите транспонирование, повторное использование весов и ошибки форм.',
    diagramSections: [
      'Выберите одну строку левой матрицы и один столбец правой',
      'Накопите три произведения по внутреннему индексу',
      'Транспонируйте логически и повторно используйте веса без копирования',
      'Отклоните несовпадающие внутренние и пакетные размеры',
    ],
    innerMismatchReason: 'Размеры двух внутренних осей должны совпадать.',
    batchMismatchReason:
      'Пакетные размеры должны совпадать либо один из них должен быть единичным.',
    exerciseSummary: 'Проверьте восемь предсказаний о матричном умножении',
    strideEvidence: 'пары смещений (3,0), (4,2) и (5,4)',
    emptyEvidence: 'не создавая курсор смещений и не читая ни один вход',
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
  ['rust/demos/ch11-matrix-multiplication/src/lib.rs', 'fixed-width-projection'],
  ['rust/crates/llm-from-scratch/src/tensor/matmul.rs', 'matmul-errors'],
  ['rust/crates/llm-from-scratch/src/tensor/matmul.rs', 'checked-matmul'],
  ['rust/demos/ch11-matrix-multiplication/src/lib.rs', 'tiny-matmul-example'],
  ['rust/demos/ch11-matrix-multiplication/src/main.rs', 'learner-matrix-multiplication-output'],
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
    order: 11,
    revision: contentRevision,
    revisionLabel: localized.revisionLabel,
    title: localized.chapterTitle,
  });
  await expect(page.locator('.lesson-description')).toHaveText(localized.chapterDescription);
  await expectSeoDescription(page, localized.chapterDescription);
  await expect(page.locator('.lesson-body h2')).toHaveText([...localized.headings]);
  const lessonText = await readMathAwareText(page.locator('.lesson-body'));
  expect(lessonText).toContain(localized.strideEvidence);
  expect(lessonText).toContain(localized.emptyEvidence);

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
  expect(historyText).not.toMatch(
    /FORTRAN|Genie|Iliffe|TypeScript|programming-language history|build instructions|инструкц(?:ии|ия) сборки/i,
  );
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

  await expectVisualizationDecision(page, { decision: 'useful', id: 'matrix-multiplication' });
  const diagram = page.locator('figure[data-visualization-id="matrix-multiplication"]');
  await expect(diagram).toHaveAccessibleName(localized.diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(localized.diagramDescription);
  for (const heading of localized.diagramSections) {
    await expect(diagram.getByRole('heading', { name: heading })).toBeVisible();
  }
  await expect(diagram.locator(':scope > section[data-diagram-box]')).toHaveCount(4);
  await expect(diagram.locator('table[data-diagram-table]')).toHaveCount(3);
  await expect(diagram.locator('table[data-matrix-id="left"]')).toContainText('1.0');
  await expect(diagram.locator('table[data-matrix-id="right"]')).toContainText('2.0');
  await expect(diagram.locator('table[data-matrix-id="output"]')).toContainText('16.0');

  const terms = diagram.locator('[data-contracted-index]');
  await expect(terms).toHaveCount(3);
  expect(
    await terms.evaluateAll((cards) =>
      cards.map((card) => ({
        output: card.getAttribute('data-output-coordinate'),
        inner: card.getAttribute('data-contracted-index'),
        left: card.getAttribute('data-left-coordinate'),
        right: card.getAttribute('data-right-coordinate'),
        product: card.getAttribute('data-product'),
        total: card.getAttribute('data-running-total'),
      })),
    ),
  ).toEqual([
    { output: '1,0', inner: '0', left: '1,0', right: '0,0', product: '4.0', total: '4.0' },
    { output: '1,0', inner: '1', left: '1,1', right: '1,0', product: '0.0', total: '4.0' },
    { output: '1,0', inner: '2', left: '1,2', right: '2,0', product: '12.0', total: '16.0' },
  ]);

  const transpose = diagram.locator('[data-transpose-operand="right"]');
  await expect(transpose).toContainText('[2, 3]');
  await expect(transpose).toContainText('[3, 2]');
  await expect(transpose).toContainText('[7.0, 4.0, 16.0, 13.0]');
  expect(
    await diagram.locator('[data-output-batch]').evaluateAll((cards) =>
      cards.map((card) => ({
        output: card.getAttribute('data-output-batch'),
        left: card.getAttribute('data-left-batch'),
        right: card.getAttribute('data-right-batch'),
      })),
    ),
  ).toEqual([
    { output: '0', left: '0', right: '0' },
    { output: '1', left: '1', right: '0' },
  ]);

  const errors = diagram.locator('[data-error-kind]');
  await expect(errors).toHaveCount(2);
  expect(await errors.evaluateAll((cards) => cards.map((card) => card.getAttribute('data-error-kind')))).toEqual([
    'inner-dimension-mismatch',
    'incompatible-batch',
  ]);
  await expect(errors.nth(0)).toContainText(localized.innerMismatchReason);
  await expect(errors.nth(1)).toContainText(localized.batchMismatchReason);
  await expect(
    errors.nth(0).locator('annotation[encoding="application/x-tex"]'),
  ).toHaveText(String.raw`3\ne4`);
  await expect(
    errors.nth(1).locator('annotation[encoding="application/x-tex"]'),
  ).toHaveText(String.raw`2\ne3`);

  expect(
    await diagram.locator('code, bdi').evaluateAll((nodes) =>
      nodes.every((node) => window.getComputedStyle(node).direction === 'ltr'),
    ),
  ).toBe(true);
  const scroller = diagram.locator('[data-diagram-scroll]');
  await expect(scroller).toHaveCount(1);
  await expect(scroller).toHaveAttribute('role', 'region');
  await expect(scroller).toHaveAttribute('tabindex', '0');
  await scroller.focus();
  await expect(scroller).toBeFocused();
  if (narrow) {
    const widths = await scroller.evaluate((node) => ({ client: node.clientWidth, scroll: node.scrollWidth }));
    expect(widths.scroll).toBeGreaterThan(widths.client);
  }
  expect(
    await diagram.locator('[data-diagram-box]').evaluateAll((boxes) =>
      boxes
        .map((box) => ({
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
  await expect(exerciseDetails.locator('ol > li')).toHaveCount(8);

  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 11 localized matrix-multiplication vertical slice', {
  tag: chapterTag(chapterId),
}, () => {
  test('chapter 11 is eleventh on every course index with direct equivalent locale routes', async ({ page }) => {
    for (const locale of chapterLocales) {
      const localized = copy[locale];
      const localeDefinition = chapterLocaleDefinitions.find(({ code }) => code === locale);
      expect(localeDefinition).toBeDefined();
      const chapters = await readOrderedCourseChapters(page, locale);
      expect(chapters.length).toBeGreaterThanOrEqual(11);
      expect(chapters[10]).toEqual(
        expect.objectContaining({ chapterId, order: 11, title: localized.chapterTitle }),
      );
      await expect(page.locator('html')).toHaveAttribute('lang', localeDefinition?.languageTag ?? '');
      await page.getByRole('link', { name: localized.chapterTitle }).click();
      await expectLocalizedChapterRoute(page, {
        chapterId,
        locale,
        order: 11,
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
        await expect(
          page.getByRole('heading', { level: 1, name: copy[target.code].chapterTitle }),
        ).toBeVisible();
      }
    }
  });

  for (const locale of chapterLocales) {
    test(`chapter 11 ${locale} renders exact content at desktop and narrow widths`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      const chapters = await readOrderedCourseChapters(page, locale);
      await page.goto(chapterPath(locale, chapterId));
      await expectChapterContent(page, locale, chapters, false);

      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      await expectChapterContent(page, locale, chapters, true);
    });
  }

  test('chapter 11 full view fits both localized diagrams without substantial travel', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    for (const locale of chapterLocales) {
      await page.goto(chapterPath(locale, chapterId));
      await settle(page);
      const diagram = page.locator('figure[data-visualization-id="matrix-multiplication"]');
      const toggle = diagram.locator('[data-diagram-full-view-toggle]');
      await expect(toggle).toBeVisible();
      await toggle.click();
      await page.waitForFunction(
        () => document.fullscreenElement?.getAttribute('data-visualization-id') === 'matrix-multiplication',
      );
      await settle(page);
      await expectStackedDiagramText(
        diagram,
        ':scope > figcaption > h3',
        ':scope > figcaption > .course-diagram__description',
      );
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
    test(`chapter 11 ${locale} retains row, column, contraction, reuse, and rejection cues in forced colors`, async ({ page }) => {
      const localized = copy[locale];
      await page.emulateMedia({ forcedColors: 'active' });
      await page.goto(chapterPath(locale, chapterId));
      const diagram = page.locator('figure[data-visualization-id="matrix-multiplication"]');
      const selectedRow = diagram.locator('.selected-row');
      const selectedColumn = diagram.locator('th.selected-column').first();
      const focusedOutput = diagram.locator('.focused-output');
      const contracted = diagram.locator('.term-card').first();
      const reused = diagram.locator('.batch-card').first();
      const rejected = diagram.locator('.error-card').first();
      await expect(selectedRow.locator('.state-symbol')).toHaveText('→');
      await expect(selectedColumn.locator('.state-symbol')).toHaveText('↓');
      await expect(contracted.locator('.state-symbol')).toHaveText('↓');
      await expect(reused.locator('.state-symbol')).toHaveText('↻');
      await expect(rejected.locator('.state-symbol')).toHaveText('×');
      await expect(diagram.locator('[data-error-kind]')).toContainText([
        localized.innerMismatchReason,
        localized.batchMismatchReason,
      ]);
      expect(await selectedRow.evaluate((node) => window.getComputedStyle(node).borderLeftStyle)).toBe('solid');
      expect(await selectedColumn.evaluate((node) => window.getComputedStyle(node).borderBottomStyle)).toBe('dotted');
      expect(await focusedOutput.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('double');
      expect(await contracted.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('double');
      expect(await reused.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('solid');
      expect(await rejected.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe('dashed');
      await expectNoOverflowOrClientScripts(page);
    });
  }

  test('both localized diagrams remain complete without JavaScript', async ({ browser }, testInfo) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      baseURL: String(testInfo.project.use.baseURL),
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();
    try {
      for (const locale of chapterLocales) {
        await page.goto(chapterPath(locale, chapterId));
        const diagram = page.locator('figure[data-visualization-id="matrix-multiplication"]');
        await expect(diagram).toHaveCount(1);
        await expect(diagram.locator('table[data-diagram-table]')).toHaveCount(3);
        await expect(diagram.locator('[data-contracted-index]')).toHaveCount(3);
        await expect(diagram.locator('[data-output-batch]')).toHaveCount(2);
        await expect(diagram.locator('[data-error-kind]')).toHaveCount(2);
        await expect(diagram.locator('[data-diagram-full-view-controls]')).toHaveCount(0);
        await expectNoOverflowOrClientScripts(page);
      }
    } finally {
      await context.close();
    }
  });
});
