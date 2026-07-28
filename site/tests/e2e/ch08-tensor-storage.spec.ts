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

const chapterId = '08-tensor-storage';
const contentRevision = 5;
const formulaLatex = String.raw`\operatorname{offset}(i_0,\ldots,i_{d-1})=\sum_{k=0}^{d-1} i_k s_k`;
const repositoryRoot = resolve(process.cwd(), '..');
const historySources = [
  'https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf',
  'https://papers.neurips.cc/paper/7181-attention-is-all-you-need.pdf',
] as const;

const copy = {
  en: {
    revisionLabel: 'Content revision',
    chapterTitle: 'From tensor coordinates to one flat buffer',
    chapterDescription:
      'Map language-model matrices and attention tensors onto one flat Rust vector with checked row-major strides and deterministic offsets.',
    headings: [
      'Predict one address before flattening the picture',
      'Turn each axis movement into one stride term',
      'Locate every symbol in the tensor',
      'From bigram counts to learned matrices and attention tensors',
      'Make shape validity and indexing one checked responsibility',
      'Follow the coordinate through slices, arithmetic, and storage',
      'Predict each layout result before checking it',
      'Reuse one checked numeric container throughout the model',
    ],
    historyHeading: 'From bigram counts to learned matrices and attention tensors',
    historyLimitation:
      'The Chapter 6 bigram gives each current-token and next-token pair its own count and uses only one token of context, so it cannot share evidence through learned word similarity.',
    bengioClaim:
      'Bengio et al. describe n-gram models as short-context conditional-probability tables that do not use word similarity, then define a neural language model with a vocabulary-size-by-feature-width matrix C of learned word features and neural parameter matrices for next-word prediction.',
    vaswaniClaim:
      'Vaswani et al. later pack simultaneous queries, keys, and values into matrices Q, K, and V and use learned projections to run multiple attention heads in parallel before concatenating their outputs.',
    modernLlmRole:
      'Explicit tensor shapes let this course represent embeddings, learned weights, activations, and attention intermediates in the cumulative decoder; the single contiguous row-major buffer is a local implementation policy, not a requirement of either paper.',
    rustCaptions: [
      'Derive checked row-major strides and require an exact flat data length',
      'Check rank and bounds before reusing one coordinate-to-offset rule',
      'Represent Bengio parameter matrices and Transformer attention shapes with one Tensor type',
      'Construct the one [2,2,3] tensor used throughout Chapter 8',
      'Build the model-history shapes, then compute valid access, edge shapes, and deterministic errors',
      'Record the frozen tensor, three stride terms, checked lookup, and rejected coordinate',
    ],
    rustLabels: [
      'Rust source defining Tensor storage, TensorError, checked shape and stride construction, scalar and zero-extent semantics, and exact data-length validation',
      'Rust source mapping valid coordinates to row-major offsets and using that result for checked immutable and mutable value access',
      'Rust source constructing tiny Bengio parameter tensors, one-head Transformer query, key, and value tensors, and one local stacked-head query tensor with explicit shapes',
      'Rust source constructing the frozen tensor with twelve values from 10.0 through 42.0 in row-major order',
      'Rust source constructing the LLM shape fixture and computing the frozen tensor lookup and mutation, scalar and empty tensors, rank and bounds errors, and checked overflow',
      'Rust source using the shared Tensor fixture to record the Chapter 8 shape, strides, slices, buffer, coordinate terms, lookup, and bounds evidence',
    ],
    diagramTitle: 'One coordinate, one row-major offset',
    diagramDescription:
      'Two slices with two rows and three columns, plus one flat buffer, come from the same Rust fixture. Follow [1, 0, 2] through its three stride contributions, then compare the checked out-of-bounds coordinate.',
    diagramSections: [
      'Two slices from one rank-3 tensor',
      'Turn [1, 0, 2] into offset 8',
      'Find offset 8 in the flat buffer',
      'Reject an invalid coordinate before access',
    ],
    summaryLabels: ['Shape', 'Row-major strides', 'Stored values'],
    lookupLabels: ['Offset', 'Value'],
    boundsLabels: ['Coordinate', 'Axis', 'Index', 'Axis size'],
    boundsNote: 'Axis 1 has size 2, so index 2 is rejected before any buffer access.',
    exerciseSummary: 'Check the seven stride, access, and invariant results',
  },
  ru: {
    revisionLabel: 'Версия материала',
    chapterTitle: 'От координат тензора к одному плоскому буферу',
    chapterDescription:
      'Разместите матрицы языковой модели и тензоры внимания в одном плоском векторе на Rust, вычисляя построчные шаги с проверкой переполнения и однозначно сопоставляя координатам смещения.',
    headings: [
      'Сначала предскажите смещение, затем перейдите к плоскому буферу',
      'Представьте движение по каждой оси отдельным слагаемым',
      'Свяжите каждый символ с устройством тензора',
      'От биграммных счётчиков к обучаемым матрицам и тензорам внимания',
      'Объедините проверку формы и координат в одной реализации',
      'Проследите путь координаты через срезы, арифметику и хранилище',
      'Предскажите каждый результат работы с формой',
      'Используйте один проверяемый числовой контейнер во всей модели',
    ],
    historyHeading: 'От биграммных счётчиков к обучаемым матрицам и тензорам внимания',
    historyLimitation:
      'Биграммная модель из главы 6 хранит отдельный счётчик для каждой пары текущего и следующего токенов и учитывает только один токен контекста, поэтому она не умеет обобщать статистические закономерности между словами благодаря сходству, выученному моделью.',
    bengioClaim:
      'Бенжио и соавторы описывают n-граммные модели как таблицы условных вероятностей с коротким контекстом, которые не используют сходство слов, а затем вводят нейронную языковую модель с матрицей C размера «словарь × ширина признакового представления», содержащей обучаемые признаки слов, и матрицами параметров для предсказания следующего слова.',
    vaswaniClaim:
      'Позднее Васвани и соавторы объединяют одновременно обрабатываемые запросы, ключи и значения в матрицы Q, K и V и с помощью обучаемых проекций параллельно вычисляют несколько голов внимания, после чего конкатенируют их выходы.',
    modernLlmRole:
      'Явно заданные формы тензоров позволяют представить эмбеддинги, обучаемые веса, активации и промежуточные результаты внимания в постепенно расширяемой реализации декодера. Один непрерывный буфер с построчным хранением — локальное решение этого курса, а не требование какой-либо из двух статей.',
    rustCaptions: [
      'Выведите построчные шаги с проверкой и потребуйте точную длину плоского буфера',
      'Проверьте ранг и границы, затем используйте единое преобразование координаты в смещение',
      'Представьте матрицы параметров Бенжио и формы тензоров внимания Transformer одним типом Tensor',
      'Создайте тензор формы [2,2,3], используемый во всей главе 8',
      'Создайте формы из истории моделей, затем вычислите допустимый доступ, крайние формы и воспроизводимые ошибки',
      'Запишите тензор, три слагаемых смещения, проверенное чтение и отклонённую координату',
    ],
    rustLabels: [
      'Исходный код на Rust: хранение Tensor, ошибки TensorError, построение формы и шагов с проверкой, семантика скаляра и нулевого размера оси, а также проверка точной длины данных',
      'Исходный код на Rust: допустимые координаты преобразуются в построчные смещения, после чего результат используется для проверяемого доступа к значению на чтение и изменение',
      'Исходный код на Rust: небольшие тензоры параметров модели Бенжио, тензоры запросов, ключей и значений одной головы Transformer и локальный стек тензоров запросов по оси голов с явными формами',
      'Исходный код на Rust: зафиксированный тензор из двенадцати значений от 10.0 до 42.0 в построчном порядке',
      'Исходный код на Rust: формы тензоров языковых моделей, доступ и изменение зафиксированного тензора, скалярный и пустой тензоры, ошибки ранга и границ и переполнение при расчёте формы',
      'Исходный код на Rust: общий пример Tensor используется для записи формы, шагов, срезов, буфера, слагаемых координаты, чтения и проверки границ в главе 8',
    ],
    diagramTitle: 'Одна координата — одно смещение при построчном хранении',
    diagramDescription:
      'Два среза — в каждом две строки по три столбца — и один плоский буфер получены из одного примера на Rust. Проследите три вклада координаты [1, 0, 2] в смещение, затем сравните с проверкой координаты, выходящей за границы.',
    diagramSections: [
      'Два среза одного тензора ранга 3',
      'Как [1, 0, 2] даёт смещение 8',
      'Найдите смещение 8 в плоском буфере',
      'Проверка недопустимой координаты до чтения буфера',
    ],
    summaryLabels: ['Форма', 'Построчные шаги', 'Число значений'],
    lookupLabels: ['Смещение', 'Значение'],
    boundsLabels: ['Координата', 'Ось', 'Индекс', 'Размер оси'],
    boundsNote: 'Размер оси 1 равен 2, поэтому индекс 2 отклоняется до обращения к буферу.',
    exerciseSummary: 'Проверить семь результатов для шагов, доступа и инвариантов',
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
  ['rust/crates/llm-from-scratch/src/tensor/storage.rs', 'tensor-storage-invariants'],
  ['rust/crates/llm-from-scratch/src/tensor/storage.rs', 'row-major-indexing'],
  ['rust/demos/ch08-tensor-storage/src/lib.rs', 'llm-shape-history'],
  ['rust/demos/ch08-tensor-storage/src/lib.rs', 'frozen-tensor-fixture'],
  ['rust/demos/ch08-tensor-storage/src/main.rs', 'learner-output'],
  ['rust/demos/ch08-tensor-storage/src/diagram_trace.rs', 'tensor-storage-trace'],
] as const;
const expectedRustSources = expectedRustRegions.map(([path, region]) => readRustRegion(path, region));

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
    order: 8,
    revision: contentRevision,
    revisionLabel: localized.revisionLabel,
    title: localized.chapterTitle,
  });
  await expect(page.locator('.lesson-description')).toHaveText(localized.chapterDescription);
  await expectSeoDescription(page, localized.chapterDescription);

  const sectionHeadings = page.locator('.lesson-body h2');
  await expect(sectionHeadings).toHaveText([...localized.headings]);

  const historyNodes = page
    .getByRole('heading', { level: 2, name: localized.historyHeading, exact: true })
    .locator(
      `xpath=following-sibling::*[not(self::h2) and preceding-sibling::h2[1][normalize-space()="${localized.historyHeading}"]]`,
    );
  const historyText = await readMathAwareText(historyNodes);
  expect(historyText).toContain(localized.historyLimitation);
  expect(historyText).toContain(`${localized.bengioClaim} ${localized.vaswaniClaim}`);
  expect(historyText).toContain(localized.bengioClaim);
  expect(historyText).toContain(localized.vaswaniClaim);
  expect(historyText).toContain(localized.modernLlmRole);
  expect(historyText).not.toMatch(/FORTRAN|Iliffe|Genie|NumPy/);
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
  await expect(rustSources).toHaveCount(6);
  const highlighted = rustSources.locator(
    'pre.rust-source-code.astro-code.github-dark-high-contrast[data-language="rust"]',
  );
  await expect(highlighted).toHaveCount(6);
  expect(
    await highlighted.locator('code').evaluateAll((blocks) => blocks.map((block) => block.textContent)),
  ).toEqual(expectedRustSources);
  expect(
    await rustSources.evaluateAll((sources) =>
      sources.map((source) => source.getAttribute('data-source-region')),
    ),
  ).toEqual(expectedRustRegions.map(([, region]) => region));
  await expect(rustSources.locator('figcaption span')).toHaveText([...localized.rustCaptions]);
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
  expect(
    await highlighted.evaluateAll((blocks) =>
      blocks.map((block) => block.getAttribute('aria-label')),
    ),
  ).toEqual([...localized.rustLabels]);

  await expectVisualizationDecision(page, { decision: 'useful', id: 'tensor-storage' });
  const diagram = page.locator('figure[data-visualization-id="tensor-storage"]');
  await expect(diagram).toHaveAccessibleName(localized.diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(localized.diagramDescription);
  for (const heading of localized.diagramSections) {
    await expect(diagram.getByRole('heading', { name: heading })).toBeVisible();
  }
  await expect(diagram.locator('.summary-facts dt')).toHaveText([...localized.summaryLabels]);
  await expect(diagram.locator('.summary-facts dd')).toHaveText(['[2, 2, 3]', '[6, 3, 1]', '12']);

  expect(
    await diagram.locator('[data-slice-axis0]').evaluateAll((slices) =>
      slices.map((slice) => ({
        axis0: slice.getAttribute('data-slice-axis0'),
        rows: Array.from(slice.querySelectorAll('tbody tr')).map((row) =>
          Array.from(row.querySelectorAll('td')).map((cell) => ({
            value: cell.querySelector('bdi')?.textContent?.trim(),
            selected: cell.getAttribute('data-selected'),
          })),
        ),
      })),
    ),
  ).toEqual([
    {
      axis0: '0',
      rows: [
        [{ value: '10.0', selected: null }, { value: '11.0', selected: null }, { value: '12.0', selected: null }],
        [{ value: '20.0', selected: null }, { value: '21.0', selected: null }, { value: '22.0', selected: null }],
      ],
    },
    {
      axis0: '1',
      rows: [
        [{ value: '30.0', selected: null }, { value: '31.0', selected: null }, { value: '32.0', selected: 'true' }],
        [{ value: '40.0', selected: null }, { value: '41.0', selected: null }, { value: '42.0', selected: null }],
      ],
    },
  ]);

  expect(
    await diagram.locator('[data-term-axis]').evaluateAll((terms) =>
      terms.map((term) => ({
        axis: term.getAttribute('data-term-axis'),
        contribution: term.querySelector('[data-contribution]')?.getAttribute('data-contribution'),
      })),
    ),
  ).toEqual([
    { axis: '0', contribution: '6' },
    { axis: '1', contribution: '0' },
    { axis: '2', contribution: '2' },
  ]);
  await expect(diagram.locator('[data-lookup-offset="8"] dt')).toHaveText([
    ...localized.lookupLabels,
  ]);
  await expect(diagram.locator('[data-lookup-offset="8"] dd')).toHaveText(['8', '32.0']);

  const buffer = diagram.locator('[data-buffer-offset]');
  await expect(buffer).toHaveCount(12);
  expect(
    await buffer.evaluateAll((cells) =>
      cells.map((cell) => ({
        offset: cell.getAttribute('data-buffer-offset'),
        value: cell.querySelector('[data-buffer-value]')?.getAttribute('data-buffer-value'),
        selected: cell.getAttribute('data-selected'),
      })),
    ),
  ).toEqual([
    ['10.0', '11.0', '12.0', '20.0', '21.0', '22.0', '30.0', '31.0', '32.0', '40.0', '41.0', '42.0']
      .map((value, offset) => ({ offset: String(offset), value, selected: offset === 8 ? 'true' : null })),
  ].flat());
  expect(
    await diagram.locator('.flat-buffer .offset-label').evaluateAll((labels) =>
      labels.every((label) => {
        const textNode = Array.from(label.childNodes).find(
          (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
        );
        if (!textNode?.textContent) return false;
        const labelLength = textNode.textContent.trimEnd().length;
        const range = document.createRange();
        range.setStart(textNode, 0);
        range.setEnd(textNode, labelLength);
        return Array.from(range.getClientRects()).filter(
          ({ width, height }) => width > 0 && height > 0,
        ).length === 1;
      }),
    ),
  ).toBe(true);
  await expect(diagram.locator('[data-selected="true"]')).toHaveCount(2);
  await expect(diagram.locator('.selection-marker')).toHaveText(['◆', '◆']);

  const bounds = diagram.locator('[data-status="out-of-bounds"]');
  await expect(bounds.locator('.bounds-facts dt')).toHaveText([...localized.boundsLabels]);
  await expect(bounds.locator('.bounds-facts dd')).toHaveText(['[1, 2, 0]', '1', '2', '2']);
  await expect(bounds.locator('[data-bounds-axis]')).toHaveAttribute('data-bounds-axis', '1');
  await expect(bounds.locator('[data-bounds-index]')).toHaveAttribute('data-bounds-index', '2');
  await expect(bounds.locator('[data-bounds-size]')).toHaveAttribute('data-bounds-size', '2');

  expect(
    await diagram.locator('code, bdi').evaluateAll((nodes) =>
      nodes.every((node) => window.getComputedStyle(node).direction === 'ltr'),
    ),
  ).toBe(true);
  for (const region of [diagram.locator('.table-scroll').first(), diagram.locator('.buffer-scroll')]) {
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
        .map((box) => {
          const element = box as HTMLElement;
          return {
            label:
              element.getAttribute('data-term-axis') ??
              element.getAttribute('data-buffer-offset') ??
              element.className,
            inlineDebt: element.scrollWidth - element.clientWidth,
            blockDebt: element.scrollHeight - element.clientHeight,
          };
        })
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

test.describe('chapter 8 localized tensor-storage vertical slice', { tag: chapterTag(chapterId) }, () => {
  test('chapter 8 is eighth on every course index with direct equivalent locale routes', async ({ page }) => {
    for (const locale of chapterLocales) {
      const localized = copy[locale];
      const localeDefinition = chapterLocaleDefinitions.find(({ code }) => code === locale);
      expect(localeDefinition).toBeDefined();
      const chapters = await readOrderedCourseChapters(page, locale);
      expect(chapters.length).toBeGreaterThanOrEqual(8);
      expect(chapters[7]).toEqual(
        expect.objectContaining({ chapterId, order: 8, title: localized.chapterTitle }),
      );
      await expect(page.locator('html')).toHaveAttribute(
        'lang',
        localeDefinition?.languageTag ?? '',
      );
      await page.getByRole('link', { name: localized.chapterTitle }).click();
      await expectLocalizedChapterRoute(page, {
        chapterId,
        locale,
        order: 8,
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
    test(`chapter 8 ${locale} renders exact content at desktop and narrow widths`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      const chapters = await readOrderedCourseChapters(page, locale);
      await page.goto(chapterPath(locale, chapterId));
      await expectChapterContent(page, locale, chapters, false);

      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      await expectChapterContent(page, locale, chapters, true);
    });
  }

  test('chapter 8 full view removes horizontal travel and avoids substantial vertical travel', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    for (const locale of chapterLocales) {
      await page.goto(chapterPath(locale, chapterId));
      const diagram = page.locator('figure[data-visualization-id="tensor-storage"]');
      const toggle = diagram.locator('[data-diagram-full-view-toggle]');
      await expect(toggle).toBeVisible();
      await toggle.click();
      await page.waitForFunction(
        () => document.fullscreenElement?.getAttribute('data-visualization-id') === 'tensor-storage',
      );
      const geometry = await diagram.evaluate((node) => ({
        blockDebt: node.scrollHeight - node.clientHeight,
        blockBudget: Math.ceil(node.clientHeight * 0.2),
        inlineDebt: node.scrollWidth - node.clientWidth,
        bufferInlineDebt:
          (node.querySelector<HTMLElement>('.buffer-scroll')?.scrollWidth ?? 0) -
          (node.querySelector<HTMLElement>('.buffer-scroll')?.clientWidth ?? 0),
      }));
      expect(geometry.blockDebt).toBeLessThanOrEqual(geometry.blockBudget);
      expect(geometry.inlineDebt).toBeLessThanOrEqual(2);
      expect(geometry.bufferInlineDebt).toBeLessThanOrEqual(2);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.fullscreenElement === null);
    }
  });

  for (const locale of chapterLocales) {
    test(`chapter 8 ${locale} keeps selected and invalid states distinct in forced colors`, async ({ page }) => {
      await page.emulateMedia({ forcedColors: 'active' });
      await page.goto(chapterPath(locale, chapterId));
      const diagram = page.locator('figure[data-visualization-id="tensor-storage"]');
      const selected = diagram.locator('[data-selected="true"]').first();
      const bounds = diagram.locator('[data-status="out-of-bounds"]');
      await expect(selected.locator('.selection-marker')).toHaveText('◆');
      expect(await selected.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe(
        'double',
      );
      expect(await bounds.evaluate((node) => window.getComputedStyle(node).borderTopStyle)).toBe(
        'dashed',
      );
      await expect(bounds).toContainText(copy[locale].boundsNote);
      await expectNoOverflowOrClientScripts(page);
    });
  }
});
