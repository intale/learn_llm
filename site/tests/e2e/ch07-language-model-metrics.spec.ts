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

const chapterId = '07-language-model-metrics';
const contentRevision = 2;
const formulaLatex = String.raw`\mathcal{L}=-\frac{1}{N}\sum_{t=1}^{N}\log p_t(z_t), \quad \operatorname{PPL}=\exp(\mathcal{L})`;
const repositoryRoot = resolve(process.cwd(), '..');

function readRustRegion(path: string, region: string): string {
  const lines = readFileSync(resolve(repositoryRoot, path), 'utf8').split(/\r?\n/);
  const start = lines.findIndex((line: string) => line.trim() === `// region:${region}`);
  const end = lines.findIndex((line: string) => line.trim() === `// endregion:${region}`);
  if (start === -1 || end <= start) throw new Error(`Missing ordered Rust region ${region} in ${path}`);
  return lines.slice(start + 1, end).join('\n');
}

const expectedRustSources = [
  readRustRegion('rust/crates/llm-from-scratch/src/metrics.rs', 'assigned-probability-metrics'),
  readRustRegion('rust/crates/llm-from-scratch/src/metrics.rs', 'train-validation-scoring'),
  readRustRegion('rust/demos/ch07-language-model-metrics/src/lib.rs', 'frozen-metric-fixture'),
  readRustRegion('rust/demos/ch07-language-model-metrics/src/main.rs', 'learner-output'),
  readRustRegion(
    'rust/demos/ch07-language-model-metrics/src/diagram_trace.rs',
    'language-model-metrics-trace',
  ),
];

const copy = {
  en: {
    indexTitle: 'From text to a tiny language model',
    chapterTitle: 'From assigned probability to perplexity',
    revisionLabel: 'Content revision',
    headings: [
      'Start with the probabilities of what actually happened',
      'Sum surprise, divide by targets, then exponentiate',
      'Locate every symbol in the worked example',
      'Add logarithms instead of multiplying probabilities directly',
      'Implement the metric once and reuse it for the frozen bigram',
      'Trace each displayed value back to its Rust calculation',
      'Predict each result before checking the reasoning',
      'Keep one measurement while the model becomes more capable',
    ],
    rustCaptions: [
      'Validate, accumulate, divide by target count, and exponentiate',
      'Permit train or validation, then score adjacent targets in each document',
      'Load and split the corpus, train the tokenizer, encode documents, and fit the bigram on training only',
      'Compute the teaching examples and training and validation metrics for one unchanged model',
      'Compute the tiny example and unchanged-model metrics with the same functions, and inspect document boundaries separately',
    ],
    rustLabels: [
      'Rust source showing complete probability validation, zero handling, surprise accumulation, target-count division, and perplexity exponentiation',
      'Rust source showing the Train and Validation partition enum and the loop that scores adjacent token pairs in each document with the same fitted model',
      'Rust source showing corpus loading, document splitting, BPE-tokenizer training, encoding of every partition, and bigram fitting from training documents only',
      'Rust source computing the two-probability example, scale anchors, zero and empty cases, weighting error, shared-maximum comparison, product underflow, and training and validation metrics',
      "Rust source computing the two-target example and training and validation metrics, then checking that BOS is not a target, EOS is each document's final target, and no EOS-to-BOS pair was introduced; later code writes these values to the Chapter 7 trace",
    ],
    diagramTitle: 'From target probabilities to mean NLL and perplexity',
    diagramCaption:
      'The Rust-generated trace shows each metric stage for two observed targets, then reports training and validation metrics for the same unchanged fitted model.',
    accessibleName:
      'Mean-NLL and perplexity calculation with training and validation metrics for one unchanged model',
    accessibleDescription:
      'A five-stage calculation turns two assigned target probabilities into surprise, divides their total surprise by two targets, and obtains mean negative log-likelihood and perplexity. A second panel shows how one model was fitted on training documents, reports its separate training and validation scores, explains the document-boundary rules, and shows that the bigram scorer cannot select test data.',
    diagramSections: [
      'Two observed targets, one calculation chain',
      'One fitted model, separate training and validation scores',
      'How the data and model were prepared',
      'Which targets and data splits are scored',
    ],
    stageLabels: [
      'Assigned probability',
      'Surprise from the Rust metric',
      'Total surprise and target count',
      'Mean negative log-likelihood',
      'Perplexity',
    ],
    targetHeaders: [
      'Zero-based target index in Rust',
      'Probability assigned to the observed target',
      'Negative-log surprise',
    ],
    aggregateLabels: ['Sum across both targets', 'Denominator: target tokens'],
    provenanceLabels: [
      'Corpus checksum',
      'Document split strategy',
      'Tokenizer layout version',
      'Requested BPE merges',
      'Learned BPE merges',
      'Vocabulary size',
      'Bigram smoothing',
      'Data split used to fit the model',
      'Documents used to fit',
      'Transitions used to fit',
    ],
    scoreHeaders: [
      'Data split being scored',
      'Document count',
      'Target-token count',
      'Total surprise',
      'Mean NLL',
      'Perplexity',
    ],
    partitionLabels: ['Training score', 'Validation score'],
    boundaries: [
      'BOS supplies context and is never a scored target.',
      'EOS is the final scored target in each document.',
      'Documents remain separate; no EOS→BOS transition is introduced.',
      'The Chapter 7 bigram scorer cannot score test data.',
    ],
    scrollInstruction:
      'Use horizontal scrolling to follow every stage; keyboard users can focus this region and scroll it.',
    frozenModelNote:
      'Fit the model once on training documents, then use the same unchanged model to score training and validation separately.',
    exerciseSummary: 'Check the nine calculations and explanations',
    answerEvidence: 'positive infinity, not an input error',
  },
  ru: {
    indexTitle: 'От текста к небольшой языковой модели',
    chapterTitle: 'Как измерять качество вероятностного прогноза: NLL и перплексия',
    revisionLabel: 'Версия материала',
    headings: [
      'Начните с вероятностей продолжений, которые действительно встретились',
      'Сложите меры неожиданности, разделите сумму на число токенов и возьмите экспоненту',
      'Свяжите каждое обозначение с вычислением',
      'Складывайте логарифмы вместо прямого перемножения вероятностей',
      'Реализуйте метрику один раз и примените её к уже построенной модели',
      'Проследите, откуда взялось каждое значение на диаграмме',
      'Сначала предскажите результат, затем проверьте рассуждение',
      'Используйте одну и ту же метрику по мере усложнения модели',
    ],
    rustCaptions: [
      'Проверить вероятности, сложить меры неожиданности и вычислить среднее NLL и перплексию',
      'Выбрать обучающую или валидационную выборку и рассчитать метрику по переходам внутри документов',
      'Загрузить корпус и разбиение, обучить BPE, закодировать документы и построить биграммную модель',
      'Вычислить учебные примеры и метрики неизменной модели на двух выборках',
      'Вычислить учебный пример и метрики неизменной модели теми же функциями, а границы документов проверить отдельно',
    ],
    rustLabels: [
      'Код на Rust: проверка всех входных вероятностей, обработка нуля, суммирование мер неожиданности, деление на число целевых токенов и вычисление перплексии',
      'Код на Rust: варианты Train и Validation, перебор соседних пар токенов внутри каждого документа и расчёт метрики с помощью уже построенной биграммной модели',
      'Код на Rust: загрузка корпуса и схемы разбиения, обучение BPE-токенизатора, кодирование документов всех выборок и построение биграммной модели только по обучающим документам',
      'Код на Rust: расчёт метрик для небольшого примера и граничных случаев, демонстрация ошибок усреднения, ограничений проверки только максимального токена и прямого перемножения вероятностей, а также оценка модели на обучающей и валидационной выборках',
      'Код на Rust: расчёт метрик для двух целевых токенов и двух выборок, затем проверка того, что BOS не становится целью, EOS занимает последнюю целевую позицию каждого документа, а пара EOS→BOS не добавлена; последующий код записывает эти значения в трассировку главы 7',
    ],
    diagramTitle: 'Как из вероятностей токенов получить среднее NLL и перплексию',
    diagramCaption:
      'Сначала показан полный расчёт для двух наблюдаемых токенов, а затем — NLL и перплексия одной и той же неизменной модели на обучающей и валидационной выборках. Все числа вычислены программой на Rust.',
    accessibleName:
      'Расчёт NLL и перплексии для двух токенов; метрики одной неизменной модели на двух выборках',
    accessibleDescription:
      'В первой части показано, как вероятность каждого из двух наблюдаемых целевых токенов превращается в меру неожиданности, как сумма этих мер делится на два целевых токена и как из среднего NLL получается перплексия. Во второй части приведены отдельные результаты одной и той же неизменной модели на обучающей и валидационной выборках. Также показаны правила учёта границ документов и указано, что интерфейс оценки биграммной модели не позволяет выбрать тестовую выборку.',
    diagramSections: [
      'Расчёт для двух наблюдаемых токенов',
      'Метрики одной неизменной модели на двух выборках',
      'Как подготовлены данные и модель',
      'Какие токены и выборки входят в расчёт',
    ],
    stageLabels: [
      'Вероятность наблюдаемого токена',
      'Отрицательная логарифмическая мера неожиданности',
      'Сумма мер неожиданности и знаменатель',
      'Среднее значение NLL',
      'Перплексия',
    ],
    targetHeaders: [
      'Индекс целевого токена в Rust (с нуля)',
      'Вероятность наблюдаемого токена',
      'Отрицательная логарифмическая мера неожиданности',
    ],
    aggregateLabels: [
      'Сумма мер неожиданности для двух токенов',
      'Число токенов, на которое делим сумму',
    ],
    provenanceLabels: [
      'Контрольная сумма корпуса',
      'Способ разбиения документов',
      'Версия схемы идентификаторов токенов',
      'Заданное число правил слияния BPE',
      'Число правил слияния BPE после обучения',
      'Размер словаря',
      'Коэффициент сглаживания',
      'Выборка, по которой построена модель',
      'Число документов для построения модели',
      'Число переходов для построения модели',
    ],
    scoreHeaders: [
      'Выборка, на которой вычислена метрика',
      'Число документов',
      'Число целевых токенов',
      'Сумма мер неожиданности',
      'Среднее значение NLL',
      'Перплексия',
    ],
    partitionLabels: ['Обучающая выборка', 'Валидационная выборка'],
    boundaries: [
      'BOS задаёт контекст и сам не учитывается как целевой токен.',
      'EOS учитывается как последний целевой токен каждого документа.',
      'Документы обрабатываются отдельно; переход EOS→BOS не добавляется.',
      'В интерфейсе оценки биграммной модели нельзя выбрать тестовую выборку.',
    ],
    scrollInstruction:
      'Чтобы увидеть все этапы, прокрутите эту область по горизонтали. Если вы пользуетесь клавиатурой, сначала переместите фокус в эту область, а затем прокручивайте её клавишами.',
    frozenModelNote:
      'Модель один раз строится по обучающим документам. Затем её параметры не меняются: на обучающей и валидационной выборках вычисляются отдельные значения метрик.',
    exerciseSummary: 'Проверить ответы и ход вычислений',
    answerEvidence: 'нулевая вероятность не считается ошибкой входных данных',
  },
} as const satisfies Record<ChapterLocale, unknown>;

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
    order: 7,
    revision: contentRevision,
    revisionLabel: localized.revisionLabel,
    title: localized.chapterTitle,
  });

  for (const heading of localized.headings) {
    await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible();
  }

  const displayedFormulae = page.locator('.katex-display');
  await expect(displayedFormulae).toHaveCount(5);
  await expect(displayedFormulae.first()).toHaveCSS('direction', 'ltr');
  const formulaAnnotation = page
    .locator('annotation[encoding="application/x-tex"]')
    .filter({ hasText: formulaLatex });
  await expect(formulaAnnotation).toHaveCount(1);
  await expect(formulaAnnotation).toHaveText(formulaLatex);

  const rustSources = page.locator('figure.rust-source');
  await expect(rustSources).toHaveCount(5);
  const highlightedRust = rustSources.locator(
    'pre.rust-source-code.astro-code.github-dark-high-contrast[data-language="rust"]',
  );
  await expect(highlightedRust).toHaveCount(5);
  expect(
    await highlightedRust.locator('code').evaluateAll((blocks) => blocks.map((block) => block.textContent)),
  ).toEqual(expectedRustSources);
  await expect(rustSources.locator('figcaption span')).toHaveText([...localized.rustCaptions]);
  expect(
    await rustSources.evaluateAll((sources) => sources.map((source) => source.getAttribute('data-source-region'))),
  ).toEqual([
    'assigned-probability-metrics',
    'train-validation-scoring',
    'frozen-metric-fixture',
    'learner-output',
    'language-model-metrics-trace',
  ]);
  expect(
    await highlightedRust.locator('code').evaluateAll((blocks) =>
      blocks.map((block) => block.querySelectorAll(':scope > span.line').length),
    ),
  ).toEqual([56, 46, 24, 42, 18]);
  const highlightingEvidence = await highlightedRust.evaluateAll((blocks) =>
    blocks.map((block) => ({
      colors: new Set(
        Array.from(block.querySelectorAll<HTMLElement>('code span[style*="color"]'))
          .map((token) => token.style.color)
          .filter(Boolean),
      ).size,
      tabIndex: block.getAttribute('tabindex'),
      label: block.getAttribute('aria-label'),
      direction: block.getAttribute('dir'),
    })),
  );
  for (const evidence of highlightingEvidence) {
    expect(evidence.colors).toBeGreaterThan(1);
    expect(evidence.tabIndex).toBe('0');
    expect(evidence.label).toBeTruthy();
    expect(evidence.direction).toBe('ltr');
  }
  expect(
    await highlightedRust.evaluateAll((blocks) =>
      blocks.map((block) => block.getAttribute('aria-label')),
    ),
  ).toEqual([...localized.rustLabels]);

  await expectVisualizationDecision(page, { decision: 'useful', id: 'language-model-metrics' });
  const diagram = page.locator('figure[data-visualization-id="language-model-metrics"]');
  await expect(diagram).toHaveAccessibleName(localized.accessibleName);
  await expect(diagram).toHaveAccessibleDescription(localized.accessibleDescription);
  await expect(diagram.locator('figcaption > p:not(.visually-hidden)')).toHaveText(
    localized.diagramCaption,
  );
  await expect(diagram.getByRole('heading', { level: 3, name: localized.diagramTitle })).toBeVisible();
  for (const sectionTitle of localized.diagramSections) {
    await expect(diagram.getByRole('heading', { name: sectionTitle })).toBeVisible();
  }
  await expect(diagram.locator('.stage-number')).toHaveText(['1', '2', '3', '4', '5']);
  await expect(
    diagram.locator(
      '[data-stage="probability-surprise"] caption > span:not(.stage-number):not(.inline-arrow)',
    ),
  ).toHaveText(localized.stageLabels.slice(0, 2));
  await expect(diagram.locator('[data-stage="aggregate"] h5')).toHaveAccessibleName(
    localized.stageLabels[2],
  );
  await expect(diagram.locator('[data-stage="mean-nll"] h5')).toHaveAccessibleName(
    localized.stageLabels[3],
  );
  await expect(diagram.locator('[data-stage="perplexity"] h5')).toHaveAccessibleName(
    localized.stageLabels[4],
  );
  await expect(diagram.locator('[data-stage="probability-surprise"] th[scope="col"]')).toHaveText(
    [...localized.targetHeaders],
  );

  expect(
    await diagram.locator('[data-target-index]').evaluateAll((rows) =>
      rows.map((row) => ({
        index: row.getAttribute('data-target-index'),
        probability: row.querySelector('[data-evidence="probability"]')?.textContent?.trim(),
        surprise: row.querySelector('[data-evidence="surprise"]')?.textContent?.trim(),
      })),
    ),
  ).toEqual([
    { index: '0', probability: '0.500000000000', surprise: '0.693147180560' },
    { index: '1', probability: '0.250000000000', surprise: '1.386294361120' },
  ]);
  await expect(diagram.locator('[data-stage="aggregate"] dt')).toHaveText([
    ...localized.aggregateLabels,
  ]);
  await expect(diagram.locator('[data-stage="aggregate"] dd')).toHaveText(['2.079441541680', '2']);
  await expect(diagram.locator('[data-stage="mean-nll"] strong')).toHaveText('1.039720770840');
  await expect(diagram.locator('[data-stage="perplexity"] strong')).toHaveText('2.828427124746');

  await expect(diagram.locator('.provenance-facts dt')).toHaveText([
    ...localized.provenanceLabels,
  ]);
  await expect(diagram.locator('.provenance-facts dd')).toHaveText([
    'fnv1a64:04786e7303f1dfd6',
    'fixed-paired-document-holdout-v1',
    '1',
    '8',
    '8',
    '266',
    '1.000000000000',
    'train',
    '8',
    '1844',
  ]);

  const scoreTable = diagram.locator('.score-table-scroll table');
  await expect(scoreTable.getByRole('columnheader')).toHaveText([...localized.scoreHeaders]);
  await expect(scoreTable.locator('tbody th[scope="row"] > span')).toHaveText([
    ...localized.partitionLabels,
  ]);
  expect(
    await scoreTable.locator('tbody tr').evaluateAll((rows) =>
      rows.map((row) => ({
        partition: row.getAttribute('data-scored-partition'),
        cells: Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent?.trim()),
      })),
    ),
  ).toEqual([
    {
      partition: 'train',
      cells: ['8', '1844', '7067.943541648752', '3.832941183107', '46.198216022322'],
    },
    {
      partition: 'validation',
      cells: ['2', '469', '1867.529710185699', '3.981939680567', '53.620940919077'],
    },
  ]);

  await expect(diagram.locator('.boundary-panel li > span')).toHaveText([...localized.boundaries]);
  await expect(diagram.locator('.boundary-panel li > code')).toHaveText([
    'bos_target=no',
    'eos_target=yes',
    'cross_document=no',
    'test_selectable=no',
  ]);
  expect(
    await diagram.locator('code, bdi').evaluateAll((nodes) =>
      nodes.every((node) => window.getComputedStyle(node).direction === 'ltr'),
    ),
  ).toBe(true);

  await diagram.focus();
  await expect(diagram).toBeFocused();
  const chainScroll = diagram.locator('.chain-scroll');
  const scoreScroll = diagram.locator('.score-table-scroll');
  await expect(chainScroll).toHaveAccessibleName(localized.diagramSections[0]);
  await expect(chainScroll).toHaveAccessibleDescription(localized.scrollInstruction);
  await expect(scoreScroll).toHaveAccessibleName(localized.diagramSections[1]);
  await expect(scoreScroll).toHaveAccessibleDescription(localized.frozenModelNote);
  await chainScroll.focus();
  await expect(chainScroll).toBeFocused();
  await scoreScroll.focus();
  await expect(scoreScroll).toBeFocused();
  if (narrow) {
    for (const region of [chainScroll, scoreScroll]) {
      const widths = await region.evaluate((node) => ({ client: node.clientWidth, scroll: node.scrollWidth }));
      expect(widths.scroll).toBeGreaterThan(widths.client);
    }
  }

  const exerciseDetails = page.locator('.lesson-body details');
  await expect(exerciseDetails).toHaveCount(1);
  await expect(exerciseDetails.locator('summary')).toHaveText(localized.exerciseSummary);
  await exerciseDetails.locator('summary').click();
  await expect(exerciseDetails).toHaveAttribute('open', '');
  await expect(exerciseDetails).toContainText(localized.answerEvidence);

  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 7 localized vertical slice', { tag: chapterTag(chapterId) }, () => {
  test('chapter 7 is seventh on every course index and preserves locale switching', async ({ page }) => {
    for (const locale of chapterLocales) {
      const localized = copy[locale];
      const localeDefinition = chapterLocaleDefinitions.find(({ code }) => code === locale);
      expect(localeDefinition).toBeDefined();
      const chapters = await readOrderedCourseChapters(page, locale);
      expect(chapters.length).toBeGreaterThanOrEqual(7);
      expect(chapters[6]).toEqual(
        expect.objectContaining({ chapterId, order: 7, title: localized.chapterTitle }),
      );
      await expect(page.locator('html')).toHaveAttribute('lang', localeDefinition?.languageTag ?? '');
      await expect(page.getByRole('heading', { level: 1, name: localized.indexTitle })).toBeVisible();
      await page.getByRole('link', { name: localized.chapterTitle }).click();
      await expectLocalizedChapterRoute(page, {
        chapterId,
        locale,
        order: 7,
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
        await page.locator(`.locale-switch a[data-locale="${target.code}"]`).click();
        await expect(page).toHaveURL(new RegExp(`${chapterPath(target.code, chapterId)}$`));
        await expect(page.locator('html')).toHaveAttribute('lang', target.languageTag);
        await expect(page.getByRole('heading', { level: 1, name: copy[target.code].chapterTitle })).toBeVisible();
      }
    }
  });

  for (const locale of chapterLocales) {
    test(`chapter 7 ${locale} renders every learning element at desktop and narrow widths`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      const chapters = await readOrderedCourseChapters(page, locale);
      await page.goto(chapterPath(locale, chapterId));
      await expectChapterContent(page, locale, chapters, false);

      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      await expectChapterContent(page, locale, chapters, true);
    });
  }

  test('the causal chain follows inherited direction and mirrors its arrows in RTL', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(chapterPath('en', chapterId));
    const diagram = page.locator('figure[data-visualization-id="language-model-metrics"]');
    const target = diagram.locator('[data-stage="probability-surprise"]');
    const aggregate = diagram.locator('[data-stage="aggregate"]');

    const ltr = await diagram.evaluate((node) => {
      const arrows = Array.from(node.querySelectorAll<HTMLElement>('.causal-arrow'));
      return {
        direction: window.getComputedStyle(node).direction,
        transforms: arrows.map((arrow) => window.getComputedStyle(arrow).transform),
      };
    });
    expect(ltr.direction).toBe('ltr');
    expect(ltr.transforms).toEqual(Array(4).fill('none'));
    expect((await target.boundingBox())?.x ?? Number.POSITIVE_INFINITY).toBeLessThan(
      (await aggregate.boundingBox())?.x ?? Number.NEGATIVE_INFINITY,
    );

    await diagram.evaluate((node) => node.setAttribute('dir', 'rtl'));
    const rtl = await diagram.evaluate((node) => {
      const arrows = Array.from(node.querySelectorAll<HTMLElement>('.causal-arrow'));
      return {
        direction: window.getComputedStyle(node).direction,
        transforms: arrows.map((arrow) => window.getComputedStyle(arrow).transform),
        proseDirections: Array.from(node.querySelectorAll<HTMLElement>('h3, h4, h5, p, th, dt')).map(
          (element) => window.getComputedStyle(element).direction,
        ),
        technicalDirections: Array.from(node.querySelectorAll<HTMLElement>('code, bdi')).map(
          (element) => window.getComputedStyle(element).direction,
        ),
      };
    });
    expect(rtl.direction).toBe('rtl');
    expect(rtl.transforms.every((transform) => transform.startsWith('matrix(-1'))).toBe(true);
    expect(rtl.proseDirections.every((direction) => direction === 'rtl')).toBe(true);
    expect(rtl.technicalDirections.every((direction) => direction === 'ltr')).toBe(true);
    expect((await target.boundingBox())?.x ?? Number.NEGATIVE_INFINITY).toBeGreaterThan(
      (await aggregate.boundingBox())?.x ?? Number.POSITIVE_INFINITY,
    );
    await expectNoOverflowOrClientScripts(page);
  });
});
