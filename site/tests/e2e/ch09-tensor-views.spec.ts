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

const chapterId = '09-tensor-views';
const contentRevision = 5;
const formulaLatex = String.raw`\prod_k n_k=\prod_j n'_j, \qquad n'_k=n_{\pi(k)}, \quad s'_k=s_{\pi(k)}`;
const repositoryRoot = resolve(process.cwd(), '..');
const historySources = [
  'https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf',
  'https://papers.neurips.cc/paper/7181-attention-is-all-you-need.pdf',
  'https://github.com/openai/gpt-2/blob/master/src/model.py',
] as const;

const copy = {
  en: {
    revisionLabel: 'Content revision',
    chapterTitle: 'Shared views and explicit tensor copies',
    chapterDescription:
      'Follow fixed-context word features into Q/K/V tensors and split attention heads, then compare shared tensor views with explicit copies in the course implementation.',
    headings: [
      'Predict two [3, 2] tensors before reading their values',
      'Separate reshape compatibility from axis permutation',
      'Account for every extent, axis, and stride',
      'From fixed context to split and merged attention heads',
      'Borrow the owner, transform metadata, copy only on command',
      'See shared storage and copied storage as different states',
      'Predict metadata and ownership before running Rust',
      'Carry explicit axes into broadcasting and reductions',
    ],
    historyHeading: 'From fixed context to split and merged attention heads',
    historyLimitation:
      "In Bengio et al.'s feed-forward configuration, learned feature vectors for a fixed number of preceding words are concatenated into one vector x and used to predict the next-word distribution. Its layout is fixed by the selected context width rather than exposing sequence and head axes for a growing causal prefix.",
    bengioClaim:
      "In Bengio et al.'s feed-forward configuration, learned feature vectors for a fixed number of preceding words are concatenated into one vector x and used to predict the next-word distribution.",
    vaswaniClaim:
      'Vaswani et al. define attention on query, key, and value matrices, compute scaled products with transposed keys, and run learned projections in parallel heads whose outputs are concatenated.',
    gpt2Claim:
      "OpenAI's GPT-2 model.py projects one tensor with batch, sequence, and feature axes into packed query, key, and value groups, splits and transposes them to a head axis, multiplies by the key tensor with its last two axes transposed, then transposes and merges heads.",
    modernLlmRole:
      "Reshape, axis permutation, and transpose let this course express the logical split-head, key-transpose, and merge-head layouts used by decoder attention. Whether a merge can reshape without copying depends on the resulting view's contiguity. Borrowed TensorView and explicit materialization are local implementation policies, not storage behavior claimed by the papers or GPT-2's TensorFlow code.",
    diagramTitle: 'One owner, four shared views, one explicit copy',
    diagramDescription: 'Compare shared tensor views, one explicit copy, and three rejected requests.',
    diagramSections: [
      'Compare five tensor interpretations',
      'Follow values into new storage',
      'Inspect three rejected requests',
    ],
    sharedState: 'Shared base storage',
    copiedState: 'New materialized storage',
    rejectedState: 'Rejected operation',
    yes: 'Yes',
    no: 'No',
    countReason: 'The requested shape has a different element count.',
    contiguityReason: 'The transpose is not row-major contiguous; materialize before reshaping.',
    boundsReason: 'The half-open slice end exceeds the selected axis size.',
    exerciseSummary: 'Check the seven shape, stride, order, and ownership predictions',
  },
  ru: {
    revisionLabel: 'Версия материала',
    chapterTitle: 'Представления общего хранилища и явное копирование тензоров',
    chapterDescription:
      'Проследите путь от признаков слов в фиксированном контексте к тензорам Q/K/V и разделению внимания на головы, а затем сравните представления общего хранилища с явным копированием в реализации курса.',
    headings: [
      'Сначала предскажите два тензора формы [3, 2]',
      'Разделите совместимость формы и перестановку осей',
      'Учтите каждый размер, индекс оси и шаг',
      'От фиксированного контекста к разделению и объединению голов внимания',
      'Заимствуйте данные владельца, преобразуйте метаданные и копируйте только явно',
      'Отличайте общее хранилище от скопированного',
      'Сначала предскажите метаданные и владельца, затем запустите Rust',
      'Перенесите явные оси в правила расширения и редукции',
    ],
    historyHeading: 'От фиксированного контекста к разделению и объединению голов внимания',
    historyLimitation:
      'В конфигурации сети прямого распространения Бенжио и соавторов обучаемые векторы признаков фиксированного числа предыдущих слов объединяются в один вектор x, по которому предсказывается распределение следующего слова. Такое расположение данных определяется выбранной шириной контекста и не выделяет оси последовательности и голов внимания для растущего авторегрессионного префикса.',
    bengioClaim:
      'В конфигурации сети прямого распространения Бенжио и соавторов обучаемые векторы признаков фиксированного числа предыдущих слов объединяются в один вектор x, по которому предсказывается распределение следующего слова.',
    vaswaniClaim:
      'Васвани и соавторы задают внимание через матрицы запросов, ключей и значений, вычисляют масштабированные произведения с транспонированными ключами и параллельно применяют обучаемые проекции нескольких голов, выходы которых затем конкатенируются.',
    gpt2Claim:
      'В официальном файле model.py модели GPT-2 один тензор с осями пакета, последовательности и признаков проецируется в упакованные группы запросов, ключей и значений. Затем группы разделяются и транспонируются с выделением оси голов, выполняется умножение на тензор ключей с переставленными двумя последними осями, после чего головы транспонируются обратно и объединяются.',
    modernLlmRole:
      'Изменение формы, перестановка осей и транспонирование позволяют выразить логические преобразования разделения на головы, транспонирования ключей и обратного объединения голов, используемые во внимании декодера. Можно ли при объединении изменить форму без копирования, зависит от непрерывности полученного представления. Заимствованный TensorView и явная материализация — решения этой реализации; статьи и код GPT-2 на TensorFlow не предписывают такое устройство хранилища.',
    diagramTitle: 'Один владелец: четыре представления и одна явная копия',
    diagramDescription: 'Сравните представления общего хранилища, одну явную копию и три отклонённых запроса.',
    diagramSections: [
      'Пять интерпретаций тензора',
      'Копирование в новое хранилище',
      'Три отклонённых запроса',
    ],
    sharedState: 'То же исходное хранилище',
    copiedState: 'Новое хранилище после материализации',
    rejectedState: 'Операция отклонена',
    yes: 'Да',
    no: 'Нет',
    countReason: 'В запрошенной форме другое число элементов.',
    contiguityReason:
      'Транспонированное представление не непрерывно при построчном обходе. Перед изменением формы нужна материализация.',
    boundsReason: 'Конец полуоткрытого среза выходит за размер выбранной оси.',
    exerciseSummary: 'Проверить семь ответов о форме, шагах, порядке и владении',
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
  ['rust/demos/ch09-tensor-views/src/lib.rs', 'eager-copying-transpose'],
  ['rust/crates/llm-from-scratch/src/tensor/view.rs', 'borrowed-tensor-view'],
  ['rust/crates/llm-from-scratch/src/tensor/view.rs', 'view-axis-transforms'],
  ['rust/crates/llm-from-scratch/src/tensor/view.rs', 'view-slice-materialize'],
  ['rust/demos/ch09-tensor-views/src/main.rs', 'learner-view-output'],
] as const;
const expectedRustSources = expectedRustRegions.map(([path, region]) => readRustRegion(path, region));

async function expectViewRow(
  page: Page,
  id: string,
  expected: Readonly<{
    storage: string;
    contiguous: 'yes' | 'no';
    shape: string;
    strides: string;
    offsets: string;
    values: string;
  }>,
) {
  const row = page.locator(`[data-view-id="${id}"]`);
  await expect(row).toHaveCount(1);
  await expect(row).toHaveAttribute('data-storage-id', expected.storage);
  await expect(row).toHaveAttribute('data-contiguous', expected.contiguous);
  await expect(row).toContainText(expected.shape);
  await expect(row).toContainText(expected.strides);
  await expect(row).toContainText(expected.offsets);
  await expect(row).toContainText(expected.values);
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
    order: 9,
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
  expect(historyText).not.toMatch(/Iliffe|Genie|NumPy|array internals|TypeScript/i);
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
  await expect(rustSources).toHaveCount(5);
  const highlighted = rustSources.locator(
    'pre.rust-source-code.astro-code.github-dark-high-contrast[data-language="rust"]',
  );
  await expect(highlighted).toHaveCount(5);
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

  await expectVisualizationDecision(page, { decision: 'useful', id: 'tensor-views' });
  const diagram = page.locator('figure[data-visualization-id="tensor-views"]');
  await expect(diagram).toHaveAccessibleName(localized.diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(localized.diagramDescription);
  for (const heading of localized.diagramSections) {
    await expect(diagram.getByRole('heading', { name: heading })).toBeVisible();
  }
  await expect(diagram.locator('table[data-diagram-table]')).toHaveCount(3);
  await expect(diagram.locator('[data-diagram-box]')).toHaveCount(3);

  await expectViewRow(page, 'base', {
    storage: 'base', contiguous: 'yes', shape: '[2,3]', strides: '[3,1]',
    offsets: '[0,1,2,3,4,5]', values: '[10.0,11.0,12.0,20.0,21.0,22.0]',
  });
  await expectViewRow(page, 'reshape', {
    storage: 'base', contiguous: 'yes', shape: '[3,2]', strides: '[2,1]',
    offsets: '[0,1,2,3,4,5]', values: '[10.0,11.0,12.0,20.0,21.0,22.0]',
  });
  await expectViewRow(page, 'transpose', {
    storage: 'base', contiguous: 'no', shape: '[3,2]', strides: '[1,3]',
    offsets: '[0,3,1,4,2,5]', values: '[10.0,20.0,11.0,21.0,12.0,22.0]',
  });
  await expect(diagram.locator('[data-view-id="transpose"]')).toContainText('[0,1]');
  await expectViewRow(page, 'slice', {
    storage: 'base', contiguous: 'no', shape: '[2,2]', strides: '[3,1]',
    offsets: '[1,2,4,5]', values: '[11.0,12.0,21.0,22.0]',
  });
  await expect(diagram.locator('[data-view-id="slice"]')).toContainText('1: 1..3');
  await expectViewRow(page, 'materialized', {
    storage: 'materialized', contiguous: 'yes', shape: '[2,2]', strides: '[2,1]',
    offsets: '[0,1,2,3]', values: '[11.0,12.0,21.0,22.0]',
  });
  await expect(diagram.locator('[data-storage-id="base"] .state-symbol')).toHaveText(['◇', '◇', '◇', '◇']);
  await expect(diagram.locator('[data-storage-id="materialized"] .state-symbol')).toHaveText('◆');
  await expect(diagram.locator('[data-contiguous="yes"]')).toContainText([
    localized.yes,
    localized.yes,
    localized.yes,
  ]);
  await expect(diagram.locator('[data-contiguous="no"]')).toContainText([
    localized.no,
    localized.no,
  ]);
  await expect(diagram.locator('[data-storage-id="base"]').first()).toContainText(localized.sharedState);
  await expect(diagram.locator('[data-storage-id="materialized"]')).toContainText(localized.copiedState);

  expect(
    await diagram.locator('[data-source-offset]').evaluateAll((rows) =>
      rows.map((row) => ({
        source: row.getAttribute('data-source-offset'),
        copied: row.getAttribute('data-copied-offset'),
        cells: Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent?.trim()),
      })),
    ),
  ).toEqual([
    { source: '1', copied: '0', cells: ['1', '11.0', '0'] },
    { source: '2', copied: '1', cells: ['2', '12.0', '1'] },
    { source: '4', copied: '2', cells: ['4', '21.0', '2'] },
    { source: '5', copied: '3', cells: ['5', '22.0', '3'] },
  ]);

  const errors = diagram.locator('[data-error-kind]');
  await expect(errors).toHaveCount(3);
  expect(
    await errors.evaluateAll((rows) => rows.map((row) => row.getAttribute('data-error-kind'))),
  ).toEqual(['element-count-mismatch', 'non-row-major-contiguous', 'out-of-bounds']);
  await expect(errors.nth(0)).toContainText('[4,2]');
  await expect(errors.nth(0)).toContainText('6');
  await expect(errors.nth(0)).toContainText('8');
  await expect(errors.nth(0)).toContainText(localized.countReason);
  await expect(errors.nth(1)).toContainText('[2,3]');
  await expect(errors.nth(1)).toContainText(localized.contiguityReason);
  await expect(errors.nth(2)).toContainText('1: 1..4');
  await expect(errors.nth(2)).toContainText('3');
  await expect(errors.nth(2)).toContainText(localized.boundsReason);
  await expect(errors.first()).toContainText(localized.rejectedState);

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

test.describe('chapter 9 localized tensor-views vertical slice', { tag: chapterTag(chapterId) }, () => {
  test('chapter 9 is ninth on every course index with direct equivalent locale routes', async ({ page }) => {
    for (const locale of chapterLocales) {
      const localized = copy[locale];
      const localeDefinition = chapterLocaleDefinitions.find(({ code }) => code === locale);
      expect(localeDefinition).toBeDefined();
      const chapters = await readOrderedCourseChapters(page, locale);
      expect(chapters.length).toBeGreaterThanOrEqual(9);
      expect(chapters[8]).toEqual(
        expect.objectContaining({ chapterId, order: 9, title: localized.chapterTitle }),
      );
      await expect(page.locator('html')).toHaveAttribute('lang', localeDefinition?.languageTag ?? '');
      await page.getByRole('link', { name: localized.chapterTitle }).click();
      await expectLocalizedChapterRoute(page, {
        chapterId, locale, order: 9, revision: contentRevision,
        revisionLabel: localized.revisionLabel, title: localized.chapterTitle,
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
    test(`chapter 9 ${locale} renders exact content at desktop and narrow widths`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      const chapters = await readOrderedCourseChapters(page, locale);
      await page.goto(chapterPath(locale, chapterId));
      await expectChapterContent(page, locale, chapters, false);

      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      await expectChapterContent(page, locale, chapters, true);
    });
  }

  test('chapter 9 full view fits both localized comparisons without substantial travel', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    for (const locale of chapterLocales) {
      await page.goto(chapterPath(locale, chapterId));
      const diagram = page.locator('figure[data-visualization-id="tensor-views"]');
      const toggle = diagram.locator('[data-diagram-full-view-toggle]');
      await expect(toggle).toBeVisible();
      await toggle.click();
      await page.waitForFunction(
        () => document.fullscreenElement?.getAttribute('data-visualization-id') === 'tensor-views',
      );
      const geometry = await diagram.evaluate((node) => ({
        blockDebt: node.scrollHeight - node.clientHeight,
        blockBudget: Math.ceil(node.clientHeight * 0.2),
        inlineDebt: node.scrollWidth - node.clientWidth,
        regionInlineDebts: Array.from(node.querySelectorAll<HTMLElement>('[data-diagram-scroll]'))
          .map((region) => region.scrollWidth - region.clientWidth),
      }));
      expect(geometry.blockDebt).toBeLessThanOrEqual(geometry.blockBudget);
      expect(geometry.inlineDebt).toBeLessThanOrEqual(2);
      expect(geometry.regionInlineDebts.every((debt) => debt <= 2)).toBe(true);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.fullscreenElement === null);
    }
  });

  for (const locale of chapterLocales) {
    test(`chapter 9 ${locale} retains ownership and rejection cues in forced colors`, async ({ page }) => {
      await page.emulateMedia({ forcedColors: 'active' });
      await page.goto(chapterPath(locale, chapterId));
      const diagram = page.locator('figure[data-visualization-id="tensor-views"]');
      await expect(diagram.locator('[data-storage-id="base"] .state-symbol').first()).toHaveText('◇');
      await expect(diagram.locator('[data-storage-id="materialized"] .state-symbol')).toHaveText('◆');
      await expect(diagram.locator('[data-error-kind] th[scope="row"] span[aria-hidden="true"]')).toHaveText([
        '× ', '× ', '× ',
      ]);
      expect(
        await diagram.locator('table[data-diagram-table] th, table[data-diagram-table] td')
          .evaluateAll((cells) => cells.every((cell) => window.getComputedStyle(cell).borderTopStyle === 'solid')),
      ).toBe(true);
      await expectNoOverflowOrClientScripts(page);
    });
  }
});
