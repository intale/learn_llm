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
  readOrderedCourseChapters,
  type ChapterLocale,
  type CourseChapterLink,
} from './chapter-helpers';

declare const process: { cwd(): string };

type InitializationKind = 'zero' | 'oversized' | 'xavier';

interface LocalizedCopy {
  revisionLabel: string;
  title: string;
  description: string;
  headings: readonly string[];
  historyHeading: string;
  historyFragments: readonly string[];
  diagramTitle: string;
  diagramDescription: string;
  diagramSections: readonly string[];
  summaryLabels: readonly string[];
  diagramTerms: readonly string[];
  strategies: Record<InitializationKind, string>;
  noSeed: string;
  sameStream: string;
  sameSeedEqual: string;
  alternateSeedDifferent: string;
  histogramTable: string;
  histogramRows: Record<InitializationKind, string>;
  representativeBinName: string;
  propagationTable: string;
}

const chapterId = '17-parameter-initialization';
const contentRevision = 3;
const formulaLatex =
  '\\operatorname{Var}(W_{ij})=\\frac{2}{\\operatorname{fan}_{in}+\\operatorname{fan}_{out}}';
const repositoryRoot = resolve(process.cwd(), '..');
const historySources = [
  'https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf',
  'https://proceedings.mlr.press/v9/glorot10a/glorot10a.pdf',
  'https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf',
] as const;

const copy: Record<ChapterLocale, LocalizedCopy> = {
  en: {
    revisionLabel: 'Content revision',
    title: 'Initialize trainable weights reproducibly',
    description:
      'Initialize model weight matrices reproducibly, compare zero, oversized, and Xavier scales, and track expected variance through stacked linear layers.',
    headings: [
      'Predict one seed, scale, and symmetry failure',
      'Target a distribution, not one exact finite sample',
      'Name the weight and both widths',
      'From neural word features to width-aware decoder parameters',
      'Generate and name parameters transactionally',
      'Compare fixed-seed distributions and expected variance',
      'Predict before running Rust',
      'Give initialization meaning as a token table',
    ],
    historyHeading: 'From neural word features to width-aware decoder parameters',
    historyFragments: [
      'does not specify a dimension-aware scale, exact distribution, seed, generator, stable names, or validation order',
      'Those assumptions motivate the scale; they do not exactly describe a SiLU, RMSNorm, and residual decoder',
      'the paper does not prescribe a parameter initializer',
      'attention-score and embedding scaling are forward computations',
      'zero optional biases, unit RMSNorm gains, and a shape-based token-table convention',
    ],
    diagramTitle: 'Compare zero weights with two paired scales',
    diagramDescription:
      'Compare measured finite-sample histograms for zero, oversized, and Xavier-style weights, then follow theoretical variance through four independent linear layers under the stated assumptions.',
    diagramSections: [
      'Compare fixed-seed weight distributions',
      'Follow expected linear variance through depth',
      'Check what the seed does and does not fix',
    ],
    summaryLabels: [
      'Shared seed',
      'Matrix shape',
      'Weight samples',
      'Fan-in',
      'Fan-out',
      'Input variance',
      'Generator and mapping',
      'Statistic',
    ],
    diagramTerms: [
      'Population variance from a two-pass calculation',
      'Starting rule',
      'Seed',
      'Uniform limit',
      'Observed minimum',
      'Observed maximum',
      'Observed mean',
      'Observed population variance',
      'Layer depth',
      'Oversized/Xavier bound ratio',
      'Controlled comparison',
    ],
    strategies: {
      zero: 'All-zero weights',
      oversized: 'Double-width uniform weights',
      xavier: 'Xavier-style uniform weights',
    },
    noSeed: 'No draws',
    sameStream: 'The two uniform samples use the same base draws.',
    sameSeedEqual: 'Same seed and request reproduce exactly',
    alternateSeedDifferent: 'The selected alternate seed differs',
    histogramTable: 'Measured finite-sample histograms for all three starting rules',
    histogramRows: {
      zero: 'Histogram row for all-zero weights',
      oversized: 'Histogram row for weights with a doubled uniform bound',
      xavier: 'Histogram row for Xavier-style uniform weights',
    },
    representativeBinName:
      'Range [-0.15,-0.05); count 962; share 23.486328125000%',
    propagationTable: 'Theoretical expected variance by linear-layer depth',
  },
  ru: {
    revisionLabel: 'Версия материала',
    title: 'Воспроизводимо инициализируйте обучаемые веса',
    description:
      'Воспроизводимо инициализируйте матрицы весов с учётом ширины, сравните нулевую инициализацию, равномерную выборку с удвоенной границей и масштаб по схеме Ксавье, а затем проследите ожидаемую дисперсию по глубине.',
    headings: [
      'Предскажите масштаб при заданном начальном значении и проявление симметрии',
      'Задайте целевое распределение, а не точную статистику одной выборки',
      'Обозначьте вес и обе ширины',
      'От признаков слов в нейросетевой модели к параметрам декодера с учётом ширины',
      'Создавайте и именуйте параметры без частичного изменения состояния',
      'Сопоставьте распределения при общем начальном значении и ожидаемую дисперсию',
      'Предскажите результат до запуска Rust',
      'Придайте инициализированной матрице смысл таблицы токенов',
    ],
    historyHeading:
      'От признаков слов в нейросетевой модели к параметрам декодера с учётом ширины',
    historyFragments: [
      'не задаёт масштаб с учётом размерностей, точное распределение, начальное значение генератора',
      'Эти допущения обосновывают выбор масштаба, но не описывают точно декодер',
      'не предписывает инициализатор параметров',
      'Масштабирование оценок внимания и эмбеддингов относится к прямому вычислению',
      'необязательные смещения — нулями, коэффициенты RMSNorm — единицами',
    ],
    diagramTitle: 'Сопоставьте нулевые веса с двумя связанными масштабами',
    diagramDescription:
      'Сравните конечные выборки нулевой инициализации, равномерной инициализации с удвоенной границей и схемы Ксавье; затем проследите теоретическую дисперсию через четыре независимых линейных слоя.',
    diagramSections: [
      'Сопоставьте распределения весов',
      'Проследите ожидаемую дисперсию по глубине',
      'Проверьте границы воспроизводимости',
    ],
    summaryLabels: [
      'Общее начальное значение',
      'Форма матрицы',
      'Число весов',
      'Входная ширина',
      'Выходная ширина',
      'Дисперсия входа',
      'Генератор и отображение',
      'Статистика',
    ],
    diagramTerms: [
      'Дисперсия совокупности, рассчитанная в два прохода',
      'Правило',
      'Начальное значение',
      'Граница распределения',
      'Минимум выборки',
      'Максимум выборки',
      'Среднее выборки',
      'Дисперсия совокупности',
      'Глубина',
      'Отношение границ',
      'Сравнение на общей выборке',
    ],
    strategies: {
      zero: 'Нулевые веса',
      oversized: 'Равномерные веса с удвоенной границей',
      xavier: 'Равномерные веса по схеме Ксавье',
    },
    noSeed: 'Без выборки',
    sameStream: 'Общие исходные значения.',
    sameSeedEqual: 'Тот же запрос при том же начальном значении даёт точное совпадение',
    alternateSeedDifferent: 'Другое выбранное начальное значение даёт иной результат',
    histogramTable:
      'Измеренные гистограммы конечных выборок для трёх правил начальных значений',
    histogramRows: {
      zero: 'Строка гистограммы для нулевых весов',
      oversized:
        'Строка гистограммы для весов с удвоенной границей равномерного распределения',
      xavier:
        'Строка гистограммы для равномерно инициализированных по схеме Ксавье весов',
    },
    representativeBinName:
      'Интервал [-0.15,-0.05); количество 962; доля 23.486328125000%',
    propagationTable: 'Теоретическая ожидаемая дисперсия по глубине линейных слоёв',
  },
};

const expectedRustRegions = [
  ['rust/demos/ch17-parameter-initialization/src/lib.rs', 'zero-symmetry-probe'],
  ['rust/crates/llm-from-scratch/src/nn/init.rs', 'parameter-init-errors'],
  ['rust/crates/llm-from-scratch/src/nn/init.rs', 'deterministic-prng'],
  ['rust/crates/llm-from-scratch/src/nn/init.rs', 'xavier-initialization'],
  ['rust/crates/llm-from-scratch/src/nn/init.rs', 'named-parameters'],
  ['rust/demos/ch17-parameter-initialization/src/lib.rs', 'fixed-seed-parameter'],
  [
    'rust/demos/ch17-parameter-initialization/src/lib.rs',
    'named-parameter-enumeration',
  ],
  [
    'rust/demos/ch17-parameter-initialization/src/lib.rs',
    'initialization-errors-example',
  ],
  [
    'rust/demos/ch17-parameter-initialization/src/main.rs',
    'learner-parameter-initialization-output',
  ],
  [
    'rust/demos/ch17-parameter-initialization/src/diagram_trace.rs',
    'parameter-initialization-trace',
  ],
] as const;

function readRustRegion(path: string, region: string): string {
  const lines = readFileSync(resolve(repositoryRoot, path), 'utf8').split(/\r?\n/);
  const start = lines.findIndex(
    (line: string) => line.trim() === '// region:' + region,
  );
  const end = lines.findIndex(
    (line: string) => line.trim() === '// endregion:' + region,
  );
  if (start === -1 || end <= start) {
    throw new Error('Missing ordered Rust region ' + region + ' in ' + path);
  }
  return lines.slice(start + 1, end).join('\n');
}

const expectedRustSources = expectedRustRegions.map(([path, region]) =>
  readRustRegion(path, region),
);

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
    order: 17,
    revision: contentRevision,
    revisionLabel: localized.revisionLabel,
    title: localized.title,
    equivalentLocales: ['en', 'ru'],
  });
  await expect(page.locator('.lesson-description')).toHaveText(localized.description);
  await expectSeoDescription(page, localized.description);
  await expect(page.locator('.lesson-body h2')).toHaveText(localized.headings);

  const historyNodes = page
    .getByRole('heading', {
      level: 2,
      name: localized.historyHeading,
      exact: true,
    })
    .locator(
      'xpath=following-sibling::*[not(self::h2) and preceding-sibling::h2[1][normalize-space()="' +
        localized.historyHeading +
        '"]]',
    );
  const historyText = (await historyNodes.allInnerTexts())
    .join(' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  for (const expected of localized.historyFragments) {
    expect(historyText).toContain(expected);
  }
  expect(historyText).not.toMatch(
    /programming-language history|Rust history|Python history|framework history/i,
  );
  const historyLinks = historyNodes.locator('a');
  await expect(historyLinks).toHaveCount(historySources.length);
  expect(
    await historyLinks.evaluateAll((links) =>
      links.map((link) => link.getAttribute('href')),
    ),
  ).toEqual(historySources);

  const formulae = page.locator('.katex-display');
  expect(await formulae.count()).toBeGreaterThan(0);
  expect(
    await formulae.evaluateAll((nodes) =>
      nodes.map((node) => window.getComputedStyle(node).direction),
    ),
  ).not.toContain('rtl');
  expect(
    await formulae
      .locator('annotation[encoding="application/x-tex"]')
      .allTextContents(),
  ).toContain(formulaLatex);

  const rustSources = page.locator('figure.rust-source');
  await expect(rustSources).toHaveCount(expectedRustRegions.length);
  const highlighted = rustSources.locator(
    'pre.rust-source-code.astro-code.github-dark-high-contrast[data-language="rust"]',
  );
  await expect(highlighted).toHaveCount(expectedRustRegions.length);
  expect(
    await highlighted
      .locator('code')
      .evaluateAll((blocks) => blocks.map((block) => block.textContent)),
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
        Array.from(
          block.querySelectorAll<HTMLElement>('code span[style*="color"]'),
        )
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

  await expectVisualizationDecision(page, {
    decision: 'useful',
    id: 'parameter-initialization',
  });
  const diagram = page.locator(
    'figure[data-visualization-id="parameter-initialization"]',
  );
  await expect(diagram).toHaveAccessibleName(localized.diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(localized.diagramDescription);
  await expect(diagram).toHaveClass(/\bcourse-diagram\b/);
  await expect(diagram).toHaveAttribute('data-diagram-style', 'course-v1');
  await expect(diagram).toHaveCSS('overflow-x', 'visible');
  await expect(diagram.locator(':scope > figcaption')).toHaveClass(
    /\bcourse-diagram__caption\b/,
  );
  await expect(diagram.locator(':scope > section')).toHaveCount(3);
  for (const heading of localized.diagramSections) {
    await expect(
      diagram.getByRole('heading', { name: heading, exact: true }),
    ).toBeVisible();
  }

  const summary = diagram.locator('.summary-grid');
  await expect(summary).toHaveAttribute('data-seed', '17');
  await expect(summary).toHaveAttribute('data-shape', '64x64');
  await expect(summary).toHaveAttribute('data-samples', '4096');
  await expect(summary).toHaveAttribute('data-fan-in', '64');
  await expect(summary).toHaveAttribute('data-fan-out', '64');
  await expect(summary).toHaveAttribute('data-input-variance', '1.000000000000');
  await expect(summary).toHaveAttribute('data-generator', 'splitmix64');
  await expect(summary.locator('dt')).toHaveText(localized.summaryLabels);
  for (const term of localized.diagramTerms) {
    await expect(diagram.getByText(term, { exact: true }).first()).toBeVisible();
  }

  const distributions = diagram.locator('[data-initialization-kind]');
  await expect(distributions).toHaveCount(3);
  expect(
    await distributions.evaluateAll((cards) =>
      cards.map((card) => ({
        kind: card.getAttribute('data-initialization-kind'),
        seed: card.getAttribute('data-seed'),
        limit: card.getAttribute('data-limit'),
        mean: card.getAttribute('data-mean'),
        variance: card.getAttribute('data-variance'),
        counts: card.getAttribute('data-counts'),
        bars: card.getAttribute('data-bar-percent'),
      })),
    ),
  ).toEqual([
    {
      kind: 'zero',
      seed: 'none',
      limit: '0.000000000000',
      mean: '0.000000000000',
      variance: '0.000000000000',
      counts: '0,0,0,0,4096,0,0,0,0',
      bars:
        '0.000000000000,0.000000000000,0.000000000000,0.000000000000,100.000000000000,0.000000000000,0.000000000000,0.000000000000,0.000000000000',
    },
    {
      kind: 'oversized',
      seed: '17',
      limit: '0.433012701892',
      mean: '-0.006738057131',
      variance: '0.063205643939',
      counts: '409,498,482,472,469,445,476,443,402',
      bars:
        '9.985351562500,12.158203125000,11.767578125000,11.523437500000,11.450195312500,10.864257812500,11.621093750000,10.815429687500,9.814453125000',
    },
    {
      kind: 'xavier',
      seed: '17',
      limit: '0.216506350946',
      mean: '-0.003369028566',
      variance: '0.015801410985',
      counts: '0,0,674,962,919,930,611,0,0',
      bars:
        '0.000000000000,0.000000000000,16.455078125000,23.486328125000,22.436523437500,22.705078125000,14.916992187500,0.000000000000,0.000000000000',
    },
  ]);
  for (const kind of ['zero', 'oversized', 'xavier'] as const) {
    const card = diagram.locator('[data-initialization-kind="' + kind + '"]');
    await expect(card).toHaveAttribute('data-diagram-card', '');
    await expect(card).toHaveAttribute('data-diagram-box', '');
    await expect(card.getByText(localized.strategies[kind], { exact: true })).toBeVisible();
  }
  await expect(
    diagram.locator('.distribution-zero .distribution-statistics dd').first(),
  ).toHaveText(localized.noSeed);

  await expect(diagram.locator('[data-diagram-card]')).toHaveCount(6);
  await expect(diagram.locator('[data-diagram-box]')).toHaveCount(17);
  await expect(diagram.locator('[data-diagram-table]')).toHaveCount(2);
  const scrollers = diagram.locator('[data-diagram-scroll]');
  await expect(scrollers).toHaveCount(2);
  for (const scroller of await scrollers.all()) {
    await expect(scroller).toHaveAttribute('role', 'region');
    await expect(scroller).toHaveAttribute('tabindex', '0');
    await expect(scroller).toHaveAttribute('aria-label', /.+/);
    await scroller.focus();
    await expect(scroller).toBeFocused();
  }

  const histogramScroller = diagram.locator('.histogram-scroll');
  await expect(histogramScroller).toHaveAccessibleName(localized.histogramTable);
  const histogramTable = histogramScroller.locator('.histogram-table');
  await expect(histogramTable).toHaveAttribute('data-diagram-table', '');
  expect(
    await histogramTable
      .locator('thead annotation[encoding="application/x-tex"]')
      .allTextContents(),
  ).toEqual([
    '[-0.45,', '-0.35)',
    '[-0.35,', '-0.25)',
    '[-0.25,', '-0.15)',
    '[-0.15,', '-0.05)',
    '[-0.05,', '0.05)',
    '[0.05,', '0.15)',
    '[0.15,', '0.25)',
    '[0.25,', '0.35)',
    '[0.35,', '0.45]',
  ]);
  const histogramRows = histogramTable.locator('tbody tr');
  await expect(histogramRows).toHaveCount(3);
  for (const [index, kind] of (
    ['zero', 'oversized', 'xavier'] as const
  ).entries()) {
    await expect(histogramRows.nth(index)).toHaveAccessibleName(
      localized.histogramRows[kind],
    );
    await expect(histogramRows.nth(index).locator('[data-bin-index]')).toHaveCount(9);
  }
  const representativeBin = histogramRows
    .nth(2)
    .locator('td[data-bin-index="3"]');
  await expect(representativeBin).toHaveAttribute('data-lower', '-0.150000000000');
  await expect(representativeBin).toHaveAttribute('data-upper', '-0.050000000000');
  await expect(representativeBin).toHaveAttribute('data-count', '962');
  await expect(representativeBin).toHaveAttribute(
    'data-bar-percent',
    '23.486328125000',
  );
  await expect(representativeBin).toHaveAccessibleName(
    localized.representativeBinName,
  );
  await expect(representativeBin.locator('bdi')).toHaveText([
    '962',
    '23.5%',
  ]);
  const renderedBar = await representativeBin.evaluate((node) => {
    const track = node.querySelector<HTMLElement>('.bin-bar');
    const fill = node.querySelector<HTMLElement>('.bin-bar-fill');
    if (!track || !fill || track.clientWidth === 0) {
      throw new Error(
        'Representative histogram bar must be rendered with a nonzero track.',
      );
    }
    const trackStyle = window.getComputedStyle(track);
    const contentWidth =
      track.clientWidth -
      Number.parseFloat(trackStyle.paddingLeft) -
      Number.parseFloat(trackStyle.paddingRight);
    if (contentWidth <= 0) {
      throw new Error('Representative histogram bar must have a positive content box.');
    }
    return {
      authoredPercent: fill.style.getPropertyValue('--bar-percent').trim(),
      renderedPercent: (fill.getBoundingClientRect().width / contentWidth) * 100,
      contentWidth,
    };
  });
  expect(renderedBar.authoredPercent).toBe('23.486328125000%');
  expect(Math.abs(renderedBar.renderedPercent - 23.486328125)).toBeLessThanOrEqual(
    100 / renderedBar.contentWidth,
  );

  const pairing = diagram.locator('.pairing-note');
  await expect(pairing).toHaveAttribute('data-base-draws-equal', 'yes');
  await expect(pairing).toHaveAttribute('data-limit-ratio', '2.000000000000');
  await expect(pairing.getByText(localized.sameStream, { exact: true })).toBeVisible();

  const propagationScroller = diagram.locator(
    '.propagation-section [data-diagram-scroll]',
  );
  await expect(propagationScroller).toHaveAccessibleName(localized.propagationTable);
  const propagationRows = diagram.locator('.propagation-section tbody tr');
  expect(
    await propagationRows.evaluateAll((rows) =>
      rows.map((row) => ({
        layer: row.getAttribute('data-layer'),
        variances: Array.from(
          row.querySelectorAll<HTMLElement>('td[data-variance]'),
          (cell) => cell.getAttribute('data-variance'),
        ),
        formulae: Array.from(
          row.querySelectorAll<HTMLElement>(
            'td annotation[encoding="application/x-tex"]',
          ),
          (annotation) => annotation.textContent,
        ),
      })),
    ),
  ).toEqual([
    {
      layer: '0',
      variances: ['1.000000000000', '1.000000000000', '1.000000000000'],
      formulae: ['1', '1', '1'],
    },
    {
      layer: '1',
      variances: ['0.000000000000', '4.000000000000', '1.000000000000'],
      formulae: ['0', '4', '1'],
    },
    {
      layer: '2',
      variances: ['0.000000000000', '16.000000000000', '1.000000000000'],
      formulae: ['0', '16', '1'],
    },
    {
      layer: '3',
      variances: ['0.000000000000', '64.000000000000', '1.000000000000'],
      formulae: ['0', '64', '1'],
    },
    {
      layer: '4',
      variances: ['0.000000000000', '256.000000000000', '1.000000000000'],
      formulae: ['0', '256', '1'],
    },
  ]);
  await expect(
    diagram.locator('.propagation-section tbody [data-variance]'),
  ).toHaveCount(15);
  await expect(
    diagram.locator('[data-reproducibility="same-seed"]'),
  ).toHaveAttribute('data-result', 'yes');
  await expect(
    diagram.locator('[data-reproducibility="alternate-seed"]'),
  ).toHaveAttribute('data-result', 'yes');
  await expect(
    diagram.getByText(localized.sameSeedEqual, { exact: true }),
  ).toBeVisible();
  await expect(
    diagram.getByText(localized.alternateSeedDifferent, { exact: true }),
  ).toBeVisible();

  const containment = await diagram.evaluate((node) => ({
    figure: {
      inline: node.scrollWidth - node.clientWidth,
      block: node.scrollHeight - node.clientHeight,
    },
    boxes: Array.from(
      node.querySelectorAll<HTMLElement>('[data-diagram-box]'),
    ).map((box) => ({
      inline: box.scrollWidth - box.clientWidth,
      block: box.scrollHeight - box.clientHeight,
      overflowX: window.getComputedStyle(box).overflowX,
      overflowY: window.getComputedStyle(box).overflowY,
    })),
  }));
  expect(containment.figure.inline).toBeLessThanOrEqual(2);
  expect(
    containment.boxes.every(
      ({ inline, block }) => inline <= 2 && block <= 2,
    ),
  ).toBe(true);
  expect(
    containment.boxes.every(
      ({ overflowX, overflowY }) =>
        !['hidden', 'clip'].includes(overflowX) &&
        !['hidden', 'clip'].includes(overflowY),
    ),
  ).toBe(true);

  if (narrow) {
    for (const scroller of await scrollers.all()) {
      const widths = await scroller.evaluate((node) => ({
        client: node.clientWidth,
        scroll: node.scrollWidth,
      }));
      expect(widths.scroll).toBeGreaterThan(widths.client);
    }
    const positions = await distributions.evaluateAll((cards) =>
      cards.map((card) => {
        const rectangle = card.getBoundingClientRect();
        return {
          left: rectangle.left,
          top: rectangle.top,
          bottom: rectangle.bottom,
        };
      }),
    );
    expect(positions).toHaveLength(3);
    expect(Math.abs(positions[0]!.left - positions[1]!.left)).toBeLessThan(1);
    expect(Math.abs(positions[1]!.left - positions[2]!.left)).toBeLessThan(1);
    expect(positions[1]!.top).toBeGreaterThan(positions[0]!.bottom);
    expect(positions[2]!.top).toBeGreaterThan(positions[1]!.bottom);
  }

  expect(
    await diagram.locator('code, bdi, .katex').evaluateAll((nodes) =>
      nodes.every((node) => window.getComputedStyle(node).direction === 'ltr'),
    ),
  ).toBe(true);
  const exerciseDetails = page.locator('.lesson-body details');
  await expect(exerciseDetails).toHaveCount(1);
  await exerciseDetails.locator('summary').click();
  await expect(exerciseDetails).toHaveAttribute('open', '');
  await expect(exerciseDetails.locator('ol > li')).toHaveCount(10);

  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 17 localized parameter-initialization vertical slice', {
  tag: chapterTag(chapterId),
}, () => {
  test('chapter 17 is seventeenth on both indexes with direct equivalent locale routes', async ({
    page,
  }) => {
    for (const locale of chapterLocales) {
      const localized = copy[locale];
      const chapters = await readOrderedCourseChapters(page, locale);
      expect(chapters.length).toBeGreaterThanOrEqual(17);
      expect(chapters[16]).toEqual(
        expect.objectContaining({
          chapterId,
          order: 17,
          title: localized.title,
        }),
      );
      await page.getByRole('link', { name: localized.title, exact: true }).click();
      await expectLocalizedChapterRoute(page, {
        chapterId,
        locale,
        order: 17,
        revision: contentRevision,
        revisionLabel: localized.revisionLabel,
        title: localized.title,
        equivalentLocales: ['en', 'ru'],
      });
      await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
      await expectNoOverflowOrClientScripts(page);
    }

    for (const source of chapterLocaleDefinitions) {
      for (const target of chapterLocaleDefinitions.filter(
        ({ code }) => code !== source.code,
      )) {
        await page.goto(chapterPath(source.code, chapterId));
        const switchLink = page.locator(
          '.locale-switch a[data-locale="' + target.code + '"]',
        );
        await expect(switchLink).not.toHaveAttribute(
          'data-locale-fallback',
          'course-index',
        );
        await switchLink.click();
        await expect(page).toHaveURL(
          new RegExp(chapterPath(target.code, chapterId) + '$'),
        );
        await expect(page.locator('html')).toHaveAttribute(
          'lang',
          target.languageTag,
        );
        await expect(
          page.getByRole('heading', {
            level: 1,
            name: copy[target.code].title,
            exact: true,
          }),
        ).toBeVisible();
      }
    }
  });

  for (const locale of chapterLocales) {
    test(
      'the complete ' +
        locale +
        ' Rust-backed lesson renders at desktop and narrow widths',
      async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 1000 });
        const chapters = await readOrderedCourseChapters(page, locale);
        await page.goto(chapterPath(locale, chapterId));
        await expectChapterContent(page, locale, chapters, false);

        await page.setViewportSize({ width: 390, height: 844 });
        await page.reload();
        await expectChapterContent(page, locale, chapters, true);
      },
    );
  }

  test('chapter 17 full view fits both locales without substantial travel', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    for (const locale of chapterLocales) {
      await page.goto(chapterPath(locale, chapterId));
      await settle(page);
      const diagram = page.locator(
        'figure[data-visualization-id="parameter-initialization"]',
      );
      const toggle = diagram.locator('[data-diagram-full-view-toggle]');
      await expect(toggle).toBeVisible();
      await toggle.click();
      await page.waitForFunction(
        () =>
          document.fullscreenElement?.getAttribute('data-visualization-id') ===
          'parameter-initialization',
      );
      await settle(page);
      const geometry = await diagram.evaluate((node) => ({
        blockDebt: node.scrollHeight - node.clientHeight,
        blockBudget: Math.ceil(node.clientHeight * 0.25),
        inlineDebt: node.scrollWidth - node.clientWidth,
        rowGap: window.getComputedStyle(node).rowGap,
        parts: Array.from(node.children).map((part) => ({
          name: (part as HTMLElement).className,
          height: Math.round((part as HTMLElement).getBoundingClientRect().height),
        })),
        distributionParts: Array.from(
          node.querySelector<HTMLElement>('.distribution-section')?.children ?? [],
        ).map((part) => ({
          name: (part as HTMLElement).className,
          height: Math.round((part as HTMLElement).getBoundingClientRect().height),
        })),
        histogramRows: Array.from(
          node.querySelectorAll<HTMLElement>('.histogram-table tr'),
        ).map((row) => ({
          text: row.textContent?.trim().slice(0, 24) ?? '',
          height: Math.round(row.getBoundingClientRect().height),
        })),
        regionInlineDebts: Array.from(
          node.querySelectorAll<HTMLElement>('[data-diagram-scroll]'),
        ).map((region) => ({
          name: region.className,
          debt: region.scrollWidth - region.clientWidth,
          clientWidth: region.clientWidth,
          scrollWidth: region.scrollWidth,
          table: (() => {
            const table = region.querySelector<HTMLElement>('table');
            return table === null
              ? null
              : {
                  clientWidth: table.clientWidth,
                  scrollWidth: table.scrollWidth,
                  minInlineSize: window.getComputedStyle(table).minInlineSize,
                  overflowingCells: Array.from(
                    table.querySelectorAll<HTMLElement>('th, td'),
                  )
                    .map((cell) => ({
                      text: cell.textContent?.trim() ?? '',
                      debt: cell.scrollWidth - cell.clientWidth,
                      clientWidth: cell.clientWidth,
                      scrollWidth: cell.scrollWidth,
                    }))
                    .filter(({ debt }) => debt > 2),
                };
          })(),
        })),
        boxDebts: Array.from(
          node.querySelectorAll<HTMLElement>('[data-diagram-box]'),
        ).map((box) => ({
          inline: box.scrollWidth - box.clientWidth,
          block: box.scrollHeight - box.clientHeight,
        })),
      }));
      const geometryLabel = locale + '/parameter-initialization';
      expect(
        geometry.blockDebt,
        geometryLabel +
          ' full-view block debt: ' +
          JSON.stringify({
            parts: geometry.parts,
            distributionParts: geometry.distributionParts,
            histogramRows: geometry.histogramRows,
            rowGap: geometry.rowGap,
          }),
      ).toBeLessThanOrEqual(geometry.blockBudget);
      expect(
        geometry.inlineDebt,
        geometryLabel + ' full-view inline debt',
      ).toBeLessThanOrEqual(2);
      expect(
        geometry.regionInlineDebts.every(({ debt }) => debt <= 2),
        geometryLabel +
          ' named-region inline containment: ' +
          JSON.stringify(geometry.regionInlineDebts),
      ).toBe(true);
      expect(
        geometry.boxDebts.every(
          ({ inline, block }) => inline <= 2 && block <= 2,
        ),
        geometryLabel + ' bounded-box containment',
      ).toBe(true);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.fullscreenElement === null);
      await expect(toggle).toBeFocused();
    }
  });

  test('zero, oversized, and Xavier states survive forced colors in both locales', async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    for (const locale of chapterLocales) {
      await page.goto(chapterPath(locale, chapterId));
      const diagram = page.locator(
        'figure[data-visualization-id="parameter-initialization"]',
      );
      const zero = diagram.locator('.distribution-zero');
      const oversized = diagram.locator('.distribution-oversized');
      const xavier = diagram.locator('.distribution-xavier');
      await expect(zero.locator('.state-symbol')).toHaveText('0');
      await expect(oversized.locator('.state-symbol')).toHaveText('2×');
      await expect(xavier.locator('.state-symbol')).toHaveText('X');
      expect(
        await zero.evaluate(
          (node) => window.getComputedStyle(node).borderTopStyle,
        ),
      ).toBe('dotted');
      expect(
        await oversized.evaluate(
          (node) => window.getComputedStyle(node).borderTopStyle,
        ),
      ).toBe('dashed');
      expect(
        await xavier.evaluate(
          (node) => window.getComputedStyle(node).borderTopStyle,
        ),
      ).toBe('double');
      await expectNoOverflowOrClientScripts(page);
    }
  });

  test('localized diagram prose follows direction while technical evidence remains left-to-right', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const locale of chapterLocales) {
      await page.goto(chapterPath(locale, chapterId));
      const diagram = page.locator(
        'figure[data-visualization-id="parameter-initialization"]',
      );
      await diagram.evaluate((node) => node.setAttribute('dir', 'rtl'));

      await expect(diagram.locator('.course-diagram__description')).toHaveCSS(
        'direction',
        'rtl',
      );
      const noDraws = diagram
        .locator('.distribution-zero .distribution-statistics dd')
        .first();
      await expect(noDraws).toHaveText(copy[locale].noSeed);
      await expect(noDraws).toHaveCSS('direction', 'rtl');
      expect(
        await diagram.locator('[dir="ltr"]').evaluateAll((nodes) =>
          nodes.every(
            (node) => window.getComputedStyle(node).direction === 'ltr',
          ),
        ),
      ).toBe(true);
      const cards = await diagram
        .locator('[data-initialization-kind]')
        .evaluateAll((nodes) =>
          nodes.map((node) => {
            const rectangle = node.getBoundingClientRect();
            return {
              right: rectangle.right,
              top: rectangle.top,
              bottom: rectangle.bottom,
            };
          }),
        );
      expect(cards).toHaveLength(3);
      expect(Math.abs(cards[0]!.right - cards[1]!.right)).toBeLessThan(1);
      expect(Math.abs(cards[1]!.right - cards[2]!.right)).toBeLessThan(1);
      expect(cards[1]!.top).toBeGreaterThan(cards[0]!.bottom);
      expect(cards[2]!.top).toBeGreaterThan(cards[1]!.bottom);
      await expectNoOverflowOrClientScripts(page);
    }
  });

  test('both complete localized lessons and the Rust-derived trace render without JavaScript', async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      baseURL: String(testInfo.project.use.baseURL),
    });
    const page = await context.newPage();
    for (const locale of chapterLocales) {
      await page.goto(chapterPath(locale, chapterId));
      await expect(
        page.getByRole('heading', {
          level: 1,
          name: copy[locale].title,
          exact: true,
        }),
      ).toBeVisible();
      await expect(page.locator('[data-initialization-kind]')).toHaveCount(3);
      await expect(
        page.locator('.histogram-table [data-bin-index]'),
      ).toHaveCount(27);
      await expect(page.locator('[data-layer]')).toHaveCount(5);
      await expect(page.locator('[data-reproducibility]')).toHaveCount(2);
      await expect(page.locator('[data-diagram-scroll]')).toHaveCount(2);
      await expect(
        page.locator('[data-diagram-full-view-toggle]'),
      ).toHaveCount(0);
      await expectNoOverflowOrClientScripts(page);
    }
    await context.close();
  });
});
