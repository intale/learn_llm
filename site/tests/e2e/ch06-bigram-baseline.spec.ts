// @ts-ignore Node APIs are available in the Playwright test runner.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Playwright test runner.
import { resolve } from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';

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

const chapterId = '06-bigram-baseline';
const contentRevision = 5;
const formulaLatex = String.raw`C_{ij}=\sum_{d\in\mathcal{D}_{tr}}\sum_{t=0}^{|d|-2}\mathbf{1}[z_t^{(d)}=i\land z_{t+1}^{(d)}=j],\quad N_i=\sum_{k\in V}C_{ik},\quad \widehat P_{\mathrm{MLE}}(j\mid i)=\frac{C_{ij}}{N_i}\;(N_i>0),\quad \widehat P_{\alpha}(j\mid i)=\frac{C_{ij}+\alpha}{N_i+\alpha|V|}\;(\alpha>0)`;
const repositoryRoot = resolve(process.cwd(), '..');
const diagramSelector = 'figure[data-visualization-id="bigram-baseline"]';
const diagramInstanceId = 'bigram-baseline-diagram';
const desktop = { width: 1440, height: 1000 } as const;
const standardFullView = { width: 1280, height: 900 } as const;
const minimumFullView = { width: 1024, height: 576 } as const;
const narrow = { width: 390, height: 844 } as const;

function readRustRegion(path: string, region: string): string {
  const lines = readFileSync(resolve(repositoryRoot, path), 'utf8').split(/\r?\n/);
  const start = lines.findIndex((line: string) => line.trim() === `// region:${region}`);
  const end = lines.findIndex((line: string) => line.trim() === `// endregion:${region}`);
  if (start === -1 || end <= start) throw new Error(`Missing ordered Rust region ${region} in ${path}`);
  return lines.slice(start + 1, end).join('\n');
}

const expectedRustSources = [
  readRustRegion('rust/demos/ch06-bigram-baseline/src/lib.rs', 'wrapped-training-fixture'),
  readRustRegion('rust/crates/llm-from-scratch/src/bigram.rs', 'fit-training-documents'),
  readRustRegion('rust/crates/llm-from-scratch/src/bigram.rs', 'probability-rows'),
  readRustRegion('rust/demos/ch06-bigram-baseline/src/main.rs', 'learner-output'),
];

const copy = {
  en: {
    indexTitle: 'From text to a tiny language model',
    chapterTitle: 'From transition counts to a bigram model',
    revisionLabel: 'Content revision',
    headings: {
      worked: 'Turn seven arrows into one prediction row',
      formula: 'Describe document-local counting and row normalization',
      glossary: 'Account for every symbol',
      history: 'Use a transparent classical baseline without mistaking it for a strong one',
      rust: 'Make the evidence come from one checked Rust table',
      visualization: 'Compare every cell without losing the document evidence',
      exercises: 'Predict the result, then expose the arithmetic',
      decoder: 'Freeze the first complete next-token model for scoring',
    },
    rustCaptions: [
      'Use the same two boundary-wrapped training documents as the calculation',
      'Count adjacent pairs separately inside each training document',
      'Represent a zero probability and an undefined row differently',
      'Print the exact count, MLE, add-one, and boundary evidence',
    ],
    diagramTitle: 'Follow two count rows all the way to probabilities',
    diagramDescription:
      'The same Rust fixture supplies the separated training documents and both tables. Compare a known context with one missing successor against a context with no outgoing observations at all.',
    summaryFacts: [
      ['Vocabulary size', '5'],
      ['Smoothing amount', '1.000'],
      ['Training documents', '2'],
      ['Transitions counted', '7'],
    ],
    documentSection: 'Evidence counted inside document boundaries',
    tokenLegend: 'Vocabulary tokens and their roles',
    knownSection: 'Known context: one successor is missing',
    unseenSection: 'Context with no outgoing observations',
    boundarySection: 'Transition that must not be counted',
    documentField: 'Training document',
    contextField: 'Current token',
    rowFactLabels: ['Observed row total', 'Smoothed denominator'],
    tableHeaders: [
      'Next token',
      'Observed count',
      'Added pseudocount',
      'Count plus pseudocount',
      'MLE probability',
      'Smoothed probability',
    ],
    undefinedMle: 'undefined (row total is zero)',
    boundaryName: 'EOS 1 must not transition to BOS 0',
    roleLabels: [
      'document-boundary token',
      'document-boundary token',
      'observed content token',
      'observed content token',
      'absent from these training documents',
    ],
    notes: [
      'Every arrow within a document contributes once. No arrow connects the end of one line to the beginning of the next.',
      'The transition from A to C has count zero inside a row whose total is three. Its MLE probability is therefore a defined zero; add-one smoothing assigns one eighth.',
      'No transition leaves C, so its row total is zero and an MLE row cannot be normalized. Add-one smoothing imposes a uniform fallback; it does not reveal evidence about C.',
      'Flattening the two documents would insert EOS→BOS between them. Fitting documents separately prevents that fabricated observation.',
    ],
    exerciseSummary: 'Check each prediction and calculation',
    exerciseAnswer: 'Flattening inserts EOS(1)→BOS(0)',
  },
  ru: {
    indexTitle: 'От текста к небольшой языковой модели',
    chapterTitle: 'От подсчёта переходов к биграммной модели',
    revisionLabel: 'Версия материала',
    headings: {
      worked: 'Подсчитайте семь переходов и постройте прогноз для A',
      formula: 'Запишите подсчёт внутри документов и нормировку строк',
      glossary: 'Разберите каждое обозначение',
      history: 'Оцените возможности и ограничения классического подхода',
      rust: 'Сверьте ручной расчёт с реализацией на Rust',
      visualization: 'Сопоставьте исходные документы с двумя строками таблицы',
      exercises: 'Сначала решите задачи, затем проверьте расчёты',
      decoder: 'Зафиксируйте первую модель, которая возвращает полное распределение вероятностей',
    },
    rustCaptions: [
      'Два документа обучающей выборки с маркерами BOS и EOS',
      'Подсчёт соседних пар отдельно внутри каждого документа обучающей выборки',
      'Разные представления для нулевой вероятности и неопределённой строки MLE',
      'Счётчики, оценки MLE, сглаженные вероятности и проверка границы документов',
    ],
    diagramTitle: 'Проследите, как две строки счётчиков превращаются в вероятности',
    diagramDescription:
      'Один и тот же пример на Rust задаёт два отдельных документа обучающей выборки и строки таблицы для токенов A и C. Сопоставьте строку A, где токен C ни разу не был продолжением, и строку C, для которой вообще не наблюдались продолжения.',
    summaryFacts: [
      ['Размер словаря', '5'],
      ['Параметр сглаживания', '1.000'],
      ['Документов в обучающей выборке', '2'],
      ['Подсчитано переходов', '7'],
    ],
    documentSection: 'Переходы, учтённые внутри каждого документа',
    tokenLegend: 'Токены словаря и их роли',
    knownSection: 'Контекст A: продолжение C не встретилось',
    unseenSection: 'Контекст C: после C нет ни одного наблюдения',
    boundarySection: 'Проверка границы между документами',
    documentField: 'Документ обучающей выборки',
    contextField: 'Текущий токен',
    rowFactLabels: [
      'Общее число наблюдений в строке',
      'Знаменатель сглаженного распределения',
    ],
    tableHeaders: [
      'Следующий токен',
      'Число наблюдений',
      'Добавленная псевдочастота',
      'Счётчик плюс псевдочастота',
      'Оценка MLE',
      'Сглаженная вероятность',
    ],
    undefinedMle: 'не определена: сумма строки равна нулю',
    boundaryName: 'EOS 1 не соединяется с BOS 0',
    roleLabels: [
      'служебный маркер начала или конца документа',
      'служебный маркер начала или конца документа',
      'токен содержимого, встречающийся в обучающей выборке',
      'токен содержимого, встречающийся в обучающей выборке',
      'есть в словаре, но не встречается в этих документах',
    ],
    notes: [
      'Каждый переход между соседними токенами внутри документа учитывается ровно один раз. Конец одного документа не соединяется с началом следующего.',
      'Продолжение C после A не встретилось, но сумма строки A равна трём. Поэтому его оценка MLE определена и равна нулю; после сглаживания с единичной псевдочастотой это продолжение получает вероятность, равную одной восьмой.',
      'В обучающих документах ни один переход не начинается с C, поэтому сумма строки равна нулю и получить распределение MLE нельзя. Равномерное распределение задаёт правило сглаживания; из данных не следует, что продолжения после C действительно равновероятны.',
      'Если склеить документы, между ними появится искусственный переход EOS→BOS. При обработке документов по отдельности он не попадает в таблицу.',
    ],
    exerciseSummary: 'Проверьте ответы и ход вычислений',
    exerciseAnswer: 'Между документами появится EOS(1)→BOS(0)',
  },
} as const satisfies Record<ChapterLocale, unknown>;

async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolveFrame) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame())),
    );
  });
}

async function readBigramGeometry(diagram: Locator) {
  return diagram.evaluate((root) => {
    const figure = root as HTMLElement;
    const tolerance = 2;
    const problems: string[] = [];
    const allElements = [figure, ...figure.querySelectorAll<HTMLElement>('*')];
    const visible = (element: HTMLElement) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        rect.width > 0 &&
        rect.height > 0
      );
    };
    const describe = (element: HTMLElement) => {
      const classes = [...element.classList].slice(0, 2).join('.');
      return `${element.tagName.toLowerCase()}${classes ? `.${classes}` : ''}`;
    };
    const border = (element: HTMLElement) => {
      const style = getComputedStyle(element);
      return {
        colors: [
          style.borderTopColor,
          style.borderRightColor,
          style.borderBottomColor,
          style.borderLeftColor,
        ],
        styles: [
          style.borderTopStyle,
          style.borderRightStyle,
          style.borderBottomStyle,
          style.borderLeftStyle,
        ],
        widths: [
          Number.parseFloat(style.borderTopWidth),
          Number.parseFloat(style.borderRightWidth),
          Number.parseFloat(style.borderBottomWidth),
          Number.parseFloat(style.borderLeftWidth),
        ],
      };
    };
    const transparent = (value: string) => {
      const normalized = value.toLowerCase().replaceAll(' ', '');
      return (
        normalized === 'transparent' ||
        /^rgba\([^)]*,0(?:\.0+)?\)$/.test(normalized) ||
        /\/0(?:\.0+)?\)$/.test(normalized)
      );
    };
    const completeBorder = (element: HTMLElement) => {
      const evidence = border(element);
      return (
        evidence.widths.every((width) => Number.isFinite(width) && width > 0) &&
        evidence.styles.every((style) => !['none', 'hidden'].includes(style)) &&
        evidence.colors.every((color) => !transparent(color))
      );
    };
    const clipped = (element: HTMLElement) => {
      const style = getComputedStyle(element);
      const zoom = Number.parseFloat(style.getPropertyValue('zoom') || '1');
      const lineClamp = style.getPropertyValue('-webkit-line-clamp');
      const textIndent = Number.parseFloat(style.textIndent || '0');
      return (
        [style.overflowX, style.overflowY].some((value) =>
          ['hidden', 'clip'].includes(value),
        ) ||
        /(?:paint|strict|content)/.test(style.contain) ||
        style.clipPath !== 'none' ||
        style.maskImage !== 'none' ||
        style.filter !== 'none' ||
        Number.parseFloat(style.opacity) <= 0 ||
        style.transform !== 'none' ||
        (Number.isFinite(zoom) && Math.abs(zoom - 1) > 0.001) ||
        style.contentVisibility === 'hidden' ||
        style.textOverflow === 'ellipsis' ||
        (lineClamp !== '' && lineClamp !== 'none') ||
        (Number.isFinite(textIndent) && textIndent < -tolerance)
      );
    };
    const innerRect = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      const widths = border(element).widths;
      return {
        left: rect.left + widths[3]!,
        right: rect.right - widths[1]!,
        top: rect.top + widths[0]!,
        bottom: rect.bottom - widths[2]!,
      };
    };
    const within = (
      child: { left: number; right: number; top: number; bottom: number },
      owner: { left: number; right: number; top: number; bottom: number },
      checkInline = true,
      checkBlock = true,
    ) =>
      (!checkInline ||
        (child.left >= owner.left - tolerance &&
          child.right <= owner.right + tolerance)) &&
      (!checkBlock ||
        (child.top >= owner.top - tolerance &&
          child.bottom <= owner.bottom + tolerance));

    const visibleElements = allElements.filter(visible);
    const markedBoxes = visibleElements.filter((element) =>
      element.hasAttribute('data-diagram-box'),
    );
    const borderedOwners = visibleElements.filter(
      (element) =>
        !element.closest('[data-diagram-full-view-controls]') &&
        completeBorder(element),
    );
    const boundedOwners = new Set<HTMLElement>([
      ...markedBoxes,
      ...borderedOwners,
    ]);
    const nearestOwner = (element: HTMLElement | null) => {
      let current = element;
      while (current && figure.contains(current)) {
        if (boundedOwners.has(current)) return current;
        if (current === figure) break;
        current = current.parentElement;
      }
      return null;
    };

    for (const [index, owner] of [...boundedOwners].entries()) {
      if (!completeBorder(owner)) {
        problems.push(`owner-${index} ${describe(owner)} lacks four visible borders`);
      }
      if (clipped(owner)) {
        problems.push(`owner-${index} ${describe(owner)} clips or paint-contains`);
      }
      if (owner.getBoundingClientRect().width <= 0 || owner.getBoundingClientRect().height <= 0) {
        problems.push(`owner-${index} ${describe(owner)} has no painted area`);
      }
      const inlineDebt = Math.max(0, owner.scrollWidth - owner.clientWidth);
      const blockDebt = Math.max(0, owner.scrollHeight - owner.clientHeight);
      if (owner !== figure && blockDebt > tolerance) {
        problems.push(`owner-${index} has block debt ${blockDebt}`);
      }
      if (
        owner !== figure &&
        !owner.matches('[data-diagram-scroll]') &&
        inlineDebt > tolerance
      ) {
        problems.push(`owner-${index} has inline debt ${inlineDebt}`);
      }

      const ancestor = nearestOwner(owner.parentElement);
      if (!ancestor) continue;
      const interveningScroller = owner.parentElement?.closest<HTMLElement>(
        '[data-diagram-scroll]',
      );
      const checkInline =
        !interveningScroller || !ancestor.contains(interveningScroller);
      if (
        !within(
          owner.getBoundingClientRect(),
          innerRect(ancestor),
          checkInline,
          ancestor !== figure,
        )
      ) {
        problems.push(`owner-${index} escapes its nearest bounded ancestor`);
      }
    }

    const scrollers = Array.from(
      figure.querySelectorAll<HTMLElement>('[data-diagram-scroll]'),
    );
    for (const [index, scroller] of scrollers.entries()) {
      const labelledBy = scroller.getAttribute('aria-labelledby')?.trim() ?? '';
      const directLabel = scroller.getAttribute('aria-label')?.trim() ?? '';
      const ids = labelledBy.split(/\s+/).filter(Boolean);
      const resolved = ids.length > 0 && ids.every((id) => document.getElementById(id));
      if (
        scroller.getAttribute('role') !== 'region' ||
        scroller.getAttribute('tabindex') !== '0' ||
        !scroller.classList.contains('course-diagram__scroll') ||
        (!directLabel && !resolved)
      ) {
        problems.push(`scroller-${index} lacks its shared accessible region contract`);
      }
      if (scroller.hasAttribute('data-diagram-box')) {
        problems.push(`scroller-${index} also claims box ownership`);
      }
      if (clipped(scroller)) problems.push(`scroller-${index} clips overflow`);
      if (scroller.scrollHeight - scroller.clientHeight > tolerance) {
        problems.push(`scroller-${index} has vertical travel`);
      }
    }

    const idrefElements = [
      figure,
      ...figure.querySelectorAll<HTMLElement>('[aria-labelledby], [aria-describedby]'),
    ].filter(
      (element) =>
        element.hasAttribute('aria-labelledby') || element.hasAttribute('aria-describedby'),
    );
    for (const [index, element] of idrefElements.entries()) {
      for (const attribute of ['aria-labelledby', 'aria-describedby'] as const) {
        if (!element.hasAttribute(attribute)) continue;
        const ids = (element.getAttribute(attribute) ?? '').split(/\s+/).filter(Boolean);
        if (ids.length === 0) {
          problems.push(`idref-${index} has an empty ${attribute}`);
          continue;
        }
        for (const id of ids) {
          const matches = document.querySelectorAll<HTMLElement>(`#${CSS.escape(id)}`);
          if (
            matches.length !== 1 ||
            !matches[0]?.textContent?.trim() ||
            !figure.contains(matches[0])
          ) {
            problems.push(`idref-${index} ${attribute} does not resolve ${id} exactly once`);
          }
        }
      }
    }

    const walker = document.createTreeWalker(figure, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const textNode = walker.currentNode as Text;
      if (!textNode.textContent?.trim()) continue;
      const parent = textNode.parentElement;
      if (
        !parent ||
        parent.closest(
          '.visually-hidden, .katex-mathml, [data-diagram-full-view-controls]',
        ) ||
        !visible(parent)
      ) {
        continue;
      }
      const owner = nearestOwner(parent);
      if (!owner) continue;
      const scroller = parent.closest<HTMLElement>('[data-diagram-scroll]');
      const checkInline = !scroller || scroller.contains(owner);
      const range = document.createRange();
      range.selectNodeContents(textNode);
      const paints = Array.from(range.getClientRects()).filter(
        (paint) => paint.width > 0 && paint.height > 0,
      );
      if (paints.length === 0) {
        problems.push(`${describe(parent)} has nonblank text without paint`);
        continue;
      }
      if (transparent(getComputedStyle(parent).color)) {
        problems.push(`${describe(parent)} has transparent text`);
      }
      for (const paint of paints) {
        if (
          !within(paint, innerRect(owner), checkInline, true)
        ) {
          problems.push(`${describe(parent)} paints outside ${describe(owner)}`);
          break;
        }
      }
    }

    for (const [index, table] of Array.from(
      figure.querySelectorAll<HTMLTableElement>('table[data-diagram-table]'),
    ).entries()) {
      if (getComputedStyle(table).display !== 'table') {
        problems.push(`table-${index} is not a native table`);
      }
      if (!table.tHead || getComputedStyle(table.tHead).display !== 'table-header-group') {
        problems.push(`table-${index} lost its native header group`);
      }
      for (const body of Array.from(table.tBodies)) {
        if (getComputedStyle(body).display !== 'table-row-group') {
          problems.push(`table-${index} lost its native body group`);
        }
      }
      for (const [rowIndex, row] of Array.from(table.rows).entries()) {
        const rowRect = row.getBoundingClientRect();
        if (getComputedStyle(row).display !== 'table-row') {
          problems.push(`table-${index} row-${rowIndex} is not a native row`);
        }
        for (const [cellIndex, cell] of Array.from(row.cells).entries()) {
          const cellRect = cell.getBoundingClientRect();
          if (getComputedStyle(cell).display !== 'table-cell') {
            problems.push(`table-${index} row-${rowIndex} cell-${cellIndex} is not a table cell`);
          }
          if (!completeBorder(cell)) {
            problems.push(`table-${index} row-${rowIndex} cell-${cellIndex} lacks four borders`);
          }
          if (
            Math.abs(cellRect.top - rowRect.top) > 1 ||
            Math.abs(cellRect.bottom - rowRect.bottom) > 1
          ) {
            problems.push(`table-${index} row-${rowIndex} cell-${cellIndex} does not fill its row`);
          }
        }
      }
    }

    for (const [index, element] of visibleElements.entries()) {
      if (
        element.closest('.visually-hidden, .katex-mathml, [data-diagram-full-view-controls]')
      ) {
        continue;
      }
      if (clipped(element)) {
        problems.push(`element-${index} ${describe(element)} conceals overflow`);
      }
      const blockDebt =
        element.clientHeight > 0
          ? Math.max(0, element.scrollHeight - element.clientHeight)
          : 0;
      if (element !== figure && blockDebt > tolerance) {
        problems.push(`element-${index} ${describe(element)} has local vertical debt ${blockDebt}`);
      }
      const inlineDebt =
        element.clientWidth > 0
          ? Math.max(0, element.scrollWidth - element.clientWidth)
          : 0;
      if (
        element !== figure &&
        inlineDebt > tolerance &&
        ['auto', 'scroll'].includes(getComputedStyle(element).overflowX) &&
        !element.hasAttribute('data-diagram-scroll')
      ) {
        problems.push(`element-${index} ${describe(element)} is an undeclared horizontal owner`);
      }
    }

    for (const [index, element] of allElements.entries()) {
      if (
        element.closest('.visually-hidden, .katex-mathml, [data-diagram-full-view-controls]')
      ) {
        continue;
      }
      const hasDirectText = [...element.childNodes].some(
        (child) => child.nodeType === Node.TEXT_NODE && Boolean(child.textContent?.trim()),
      );
      if (hasDirectText && !visible(element)) {
        problems.push(`element-${index} ${describe(element)} hides authored text`);
      }
    }

    const localVerticalOwnerCount = visibleElements.filter((element) => {
      if (element === figure || element.closest('[data-diagram-full-view-controls]')) {
        return false;
      }
      const style = getComputedStyle(element);
      const debt = Math.max(0, element.scrollHeight - element.clientHeight);
      return style.overflowY === 'scroll' || (style.overflowY === 'auto' && debt > tolerance);
    }).length;

    const fontSizes = allElements.flatMap((element, index) => {
      if (
        element.closest('.visually-hidden, .katex-mathml, [data-diagram-full-view-controls]') ||
        !visible(element)
      ) {
        return [];
      }
      const directText = [...element.childNodes].some(
        (child) => child.nodeType === Node.TEXT_NODE && Boolean(child.textContent?.trim()),
      );
      return directText
        ? [{ index, pixels: Number.parseFloat(getComputedStyle(element).fontSize) }]
        : [];
    });
    return {
      blockDebt: Math.max(0, figure.scrollHeight - figure.clientHeight),
      borderedOwnerCount: borderedOwners.length,
      boxCount: markedBoxes.length,
      candidateRowCount: figure.querySelectorAll('tbody tr').length,
      cellCount: figure.querySelectorAll('th, td').length,
      directOrder: Array.from(figure.children)
        .filter((element) => !element.hasAttribute('data-diagram-full-view-controls'))
        .map((element) => `${element.tagName}.${element.className}`),
      documentCount: figure.querySelectorAll('[data-document]').length,
      fontSizes,
      inlineDebt: Math.max(0, figure.scrollWidth - figure.clientWidth),
      legendItemCount: figure.querySelectorAll('.token-legend > li').length,
      localVerticalOwnerCount,
      problems: [...new Set(problems)],
      rowCount: figure.querySelectorAll('table tr').length,
      scrollerCount: scrollers.length,
      tableCount: figure.querySelectorAll('table').length,
      transitionArrowCount: figure.querySelectorAll('.transition-arrow').length,
      unseenSuccessorCount: figure.querySelectorAll('[data-unseen-successor="true"]').length,
      viewportHeight: figure.clientHeight,
    };
  });
}

function expectCompleteBigramGeometry(
  geometry: Awaited<ReturnType<typeof readBigramGeometry>>,
) {
  expect(geometry.directOrder).toEqual([
    'FIGCAPTION.course-diagram__caption',
    'SECTION.training-evidence',
    'DIV.row-grid',
    'SECTION.boundary-guard',
  ]);
  expect(geometry.documentCount).toBe(2);
  expect(geometry.transitionArrowCount).toBe(7);
  expect(geometry.legendItemCount).toBe(5);
  expect(geometry.localVerticalOwnerCount).toBe(0);
  expect(geometry.tableCount).toBe(2);
  expect(geometry.rowCount).toBe(12);
  expect(geometry.cellCount).toBe(72);
  expect(geometry.candidateRowCount).toBe(10);
  expect(geometry.unseenSuccessorCount).toBe(1);
  expect(geometry.boxCount).toBe(4);
  expect(geometry.borderedOwnerCount).toBe(77);
  expect(geometry.scrollerCount).toBe(4);
  expect(geometry.inlineDebt).toBeLessThanOrEqual(2);
  expect(geometry.problems).toEqual([]);
}

function expectFontsNotShrunk(
  inline: Awaited<ReturnType<typeof readBigramGeometry>>,
  full: Awaited<ReturnType<typeof readBigramGeometry>>,
) {
  const before = new Map(inline.fontSizes.map(({ index, pixels }) => [index, pixels]));
  for (const sample of full.fontSizes) {
    const inlinePixels = before.get(sample.index);
    if (inlinePixels === undefined) continue;
    expect(sample.pixels + 0.01).toBeGreaterThanOrEqual(inlinePixels);
  }
}

async function readBigramEvidence(diagram: Locator) {
  return diagram.evaluate((root) => ({
    contexts: Array.from(root.querySelectorAll<HTMLElement>('[data-context-id]')).map(
      (row) => ({ id: row.dataset.contextId, kind: row.dataset.contextKind }),
    ),
    documents: Array.from(root.querySelectorAll<HTMLElement>('[data-document]')).map(
      (document) => ({
        id: document.dataset.document,
        tokens: Array.from(document.querySelectorAll<HTMLElement>('[data-token-id]')).map(
          (token) => token.dataset.tokenId,
        ),
      }),
    ),
    tableRows: Array.from(root.querySelectorAll<HTMLTableRowElement>('tbody tr')).map(
      (row) => ({
        candidate: row.dataset.candidateId,
        values: Array.from(row.querySelectorAll<HTMLElement>('[data-value]')).map(
          (value) => value.textContent?.trim(),
        ),
      }),
    ),
  }));
}

async function readReadableFlow(diagram: Locator) {
  return diagram.evaluate((root) => {
    const figure = root as HTMLElement;
    const rect = (selector: string) => {
      const element = figure.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      const box = element.getBoundingClientRect();
      return {
        bottom: box.bottom,
        height: box.height,
        left: box.left,
        right: box.right,
        top: box.top,
        width: box.width,
      };
    };
    const contentSpan = (element: HTMLElement) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        left:
          box.left +
          Number.parseFloat(style.borderLeftWidth) +
          Number.parseFloat(style.paddingLeft),
        right:
          box.right -
          Number.parseFloat(style.borderRightWidth) -
          Number.parseFloat(style.paddingRight),
      };
    };
    const columnCount = (element: HTMLElement) => {
      const columns = getComputedStyle(element).gridTemplateColumns;
      return columns === 'none' ? 0 : columns.split(/\s+/).filter(Boolean).length;
    };
    const occupiedBandCount = (elements: HTMLElement[]) => {
      const bands: Array<{ top: number; count: number }> = [];
      for (const element of elements) {
        const top = element.getBoundingClientRect().top;
        const band = bands.find((candidate) => Math.abs(candidate.top - top) <= 2);
        if (band) band.count += 1;
        else bands.push({ top, count: 1 });
      }
      return Math.max(0, ...bands.map(({ count }) => count));
    };
    const widthSelectors = [
      '.course-diagram__caption',
      '.course-diagram__caption > h3',
      '.course-diagram__description',
      '.summary-facts',
      '.summary-facts > div',
      '.summary-facts dt',
      '.summary-facts dd',
      '.training-evidence',
      '.training-evidence > h4',
      '.document-list',
      '.document-list > li',
      '.document-list > li > strong',
      '.token-sequence',
      '.token-sequence > code',
      '.transition-arrow',
      '.token-legend',
      '.token-legend > li',
      '.token-legend > li > code',
      '.token-legend > li > span',
      '.evidence-note',
      '.row-grid',
      '.probability-row',
      '.probability-row > header',
      '.probability-row > header > h4',
      '.context-label',
      '.context-label > code',
      '.row-facts',
      '.row-facts > div',
      '.row-facts dt',
      '.row-facts dd',
      '.table-scroll',
      'table[data-diagram-table]',
      'th',
      'td',
      '.row-note',
      '.boundary-guard',
      '.boundary-guard > h4',
      '.forbidden-transition',
      '.forbidden-transition > code',
      '.forbidden-transition > span',
      '.boundary-guard > p:last-child',
    ];
    const widthSamples = widthSelectors.flatMap((selector) =>
      Array.from(figure.querySelectorAll<HTMLElement>(selector)).map((element, index) => {
        const box = element.getBoundingClientRect();
        return {
          key: `${selector}:${index}`,
          width: box.width,
          height: box.height,
        };
      }),
    );
    const scrollers = Array.from(
      figure.querySelectorAll<HTMLElement>('[data-diagram-scroll]'),
    ).map((scroller, index) => ({
      key: `${scroller.classList.contains('table-scroll') ? 'table' : 'tokens'}:${index}`,
      client: scroller.clientWidth,
      debt: Math.max(0, scroller.scrollWidth - scroller.clientWidth),
      blockDebt: Math.max(0, scroller.scrollHeight - scroller.clientHeight),
    }));
    const tableSpans = Array.from(
      figure.querySelectorAll<HTMLElement>('.probability-row'),
    ).map((panel) => {
      const panelSpan = contentSpan(panel);
      const scroller = panel.querySelector<HTMLElement>('.table-scroll');
      if (!scroller) throw new Error('Missing probability table scroller');
      const scrollerBox = scroller.getBoundingClientRect();
      return {
        panelLeft: panelSpan.left,
        panelRight: panelSpan.right,
        scrollerLeft: scrollerBox.left,
        scrollerRight: scrollerBox.right,
      };
    });
    const documentList = figure.querySelector<HTMLElement>('.document-list');
    const legend = figure.querySelector<HTMLElement>('.token-legend');
    const rowGrid = figure.querySelector<HTMLElement>('.row-grid');
    if (!documentList || !legend || !rowGrid) {
      throw new Error('Missing Chapter 6 readable-flow grid');
    }
    const figureBox = figure.getBoundingClientRect();
    const figureStyle = getComputedStyle(figure);
    const figureBorderLeft = Number.parseFloat(figureStyle.borderLeftWidth);
    const figureBorderRight = Number.parseFloat(figureStyle.borderRightWidth);
    const reservedGutter = Math.max(
      0,
      figureBox.width - figureBorderLeft - figureBorderRight - figure.clientWidth,
    );
    const rootSpan = {
      left:
        figureBox.left +
        figureBorderLeft +
        reservedGutter / 2 +
        Number.parseFloat(figureStyle.paddingLeft),
      right:
        figureBox.right -
        figureBorderRight -
        reservedGutter / 2 -
        Number.parseFloat(figureStyle.paddingRight),
    };
    const regionSpans = [
      ['training', figure.querySelector<HTMLElement>('.training-evidence')],
      ['row-grid', rowGrid],
      ['boundary', figure.querySelector<HTMLElement>('.boundary-guard')],
    ].map(([key, element]) => {
      if (!(element instanceof HTMLElement)) throw new Error(`Missing ${key}`);
      const box = element.getBoundingClientRect();
      return { key: String(key), left: box.left, right: box.right };
    });
    const rowGridSpan = contentSpan(rowGrid);
    const panelSpans = Array.from(
      rowGrid.querySelectorAll<HTMLElement>(':scope > .probability-row'),
    ).map((panel) => {
      const box = panel.getBoundingClientRect();
      return { left: box.left, right: box.right };
    });
    const legendItems = Array.from(
      legend.querySelectorAll<HTMLElement>(':scope > li'),
    );
    const firstLegend = legendItems[0]?.getBoundingClientRect();
    const secondLegend = legendItems[1]?.getBoundingClientRect();
    if (!firstLegend || !secondLegend) throw new Error('Missing legend order witness');
    return {
      columns: columnCount(figure),
      direction: getComputedStyle(figure).direction,
      rowGridColumns: columnCount(rowGrid),
      rowGridDisplay: getComputedStyle(rowGrid).display,
      occupiedPeers: {
        documents: occupiedBandCount(
          Array.from(documentList.querySelectorAll<HTMLElement>(':scope > li')),
        ),
        legend: occupiedBandCount(legendItems),
        rows: occupiedBandCount(
          Array.from(rowGrid.querySelectorAll<HTMLElement>(':scope > .probability-row')),
        ),
      },
      actionPosition: getComputedStyle(
        figure.querySelector<HTMLElement>(':scope > [data-diagram-full-view-controls]')!,
      ).position,
      rootBlockDebt: Math.max(0, figure.scrollHeight - figure.clientHeight),
      rootOverflowY: getComputedStyle(figure).overflowY,
      rootSpan,
      regionSpans,
      rowGridSpan,
      panelSpans,
      scrollers,
      tableSpans,
      widthSamples,
      legendWitness: {
        firstLeft: firstLegend.left,
        secondLeft: secondLegend.left,
        topDelta: Math.abs(firstLegend.top - secondLegend.top),
      },
      caption: rect('figcaption'),
      actions: rect(':scope > [data-diagram-full-view-controls]'),
      training: rect('.training-evidence'),
      known: rect('[data-context-kind="known"]'),
      unseen: rect('[data-context-kind="unseen"]'),
      boundary: rect('.boundary-guard'),
    };
  });
}

async function rememberAuthoredNodes(diagram: Locator, slot: string) {
  return diagram.evaluate((root, storageKey) => {
    const authored = [
      root,
      ...Array.from(root.querySelectorAll<HTMLElement>('*')),
    ].filter((element) => !element.closest('[data-diagram-full-view-controls]'));
    (window as unknown as Record<string, unknown>)[storageKey] = authored;
    return authored.length;
  }, slot);
}

async function authoredNodesAreUnchanged(diagram: Locator, slot: string) {
  return diagram.evaluate((root, storageKey) => {
    const before = (window as unknown as Record<string, unknown>)[storageKey];
    if (!Array.isArray(before)) return false;
    const authored = [
      root,
      ...Array.from(root.querySelectorAll<HTMLElement>('*')),
    ].filter((element) => !element.closest('[data-diagram-full-view-controls]'));
    return (
      authored.length === before.length &&
      authored.every((element, index) => element === before[index])
    );
  }, slot);
}

async function readScrolledChromeRelation(diagram: Locator) {
  return diagram.evaluate((root) => {
    const figure = root as HTMLElement;
    const action = figure.querySelector<HTMLElement>(
      ':scope > [data-diagram-full-view-controls]',
    );
    const evidence = figure.querySelector<HTMLElement>('[data-context-kind="known"]');
    if (!action || !evidence) throw new Error('Missing scroll-overlap evidence');
    const previous = figure.scrollTop;
    evidence.scrollIntoView({ block: 'start', inline: 'nearest' });
    const actionBox = action.getBoundingClientRect();
    const evidenceBox = evidence.getBoundingClientRect();
    const overlaps = !(
      actionBox.bottom <= evidenceBox.top + 2 ||
      actionBox.top >= evidenceBox.bottom - 2 ||
      actionBox.right <= evidenceBox.left + 2 ||
      actionBox.left >= evidenceBox.right - 2
    );
    const result = {
      actionPosition: getComputedStyle(action).position,
      evidenceAtScrollport: evidenceBox.top <= figure.getBoundingClientRect().top + 3,
      overlaps,
      scrollTop: figure.scrollTop,
    };
    figure.scrollTop = previous;
    return result;
  });
}

function expectLogicalLegendOrder(
  flow: Awaited<ReturnType<typeof readReadableFlow>>,
) {
  expect(flow.legendWitness.topDelta).toBeLessThanOrEqual(2);
  if (flow.direction === 'rtl') {
    expect(flow.legendWitness.firstLeft).toBeGreaterThan(flow.legendWitness.secondLeft);
  } else {
    expect(flow.direction).toBe('ltr');
    expect(flow.legendWitness.firstLeft).toBeLessThan(flow.legendWitness.secondLeft);
  }
}

function expectReadableFullView(
  inline: Awaited<ReturnType<typeof readReadableFlow>>,
  full: Awaited<ReturnType<typeof readReadableFlow>>,
) {
  expect(full.columns).toBe(1);
  expect(full.rowGridDisplay).toBe('grid');
  expect(full.rowGridColumns).toBe(1);
  expect(full.actionPosition).toBe('static');
  expectLogicalLegendOrder(full);
  const regions = [
    full.caption,
    full.actions,
    full.training,
    full.known,
    full.unseen,
    full.boundary,
  ];
  for (const region of regions) {
    expect(region.width).toBeGreaterThan(0);
    expect(region.height).toBeGreaterThan(0);
  }
  for (let index = 1; index < regions.length; index += 1) {
    expect(regions[index]!.top).toBeGreaterThanOrEqual(regions[index - 1]!.bottom - 2);
  }
  expect(full.widthSamples.map(({ key }) => key)).toEqual(
    inline.widthSamples.map(({ key }) => key),
  );
  const inlineWidths = new Map(
    inline.widthSamples.map(({ key, width }) => [key, width]),
  );
  for (const sample of full.widthSamples) {
    expect(sample.height).toBeGreaterThan(0);
    expect(sample.width + 1).toBeGreaterThanOrEqual(inlineWidths.get(sample.key) ?? Infinity);
  }
  expect(full.occupiedPeers.documents).toBeLessThanOrEqual(
    inline.occupiedPeers.documents,
  );
  expect(full.occupiedPeers.legend).toBeLessThanOrEqual(inline.occupiedPeers.legend);
  expect(full.occupiedPeers.rows).toBeLessThanOrEqual(inline.occupiedPeers.rows);
  for (const span of full.regionSpans) {
    expect(Math.abs(span.left - full.rootSpan.left)).toBeLessThanOrEqual(2);
    expect(Math.abs(span.right - full.rootSpan.right)).toBeLessThanOrEqual(2);
  }
  for (const span of full.panelSpans) {
    expect(Math.abs(span.left - full.rowGridSpan.left)).toBeLessThanOrEqual(2);
    expect(Math.abs(span.right - full.rowGridSpan.right)).toBeLessThanOrEqual(2);
  }
  expect(full.scrollers.map(({ key }) => key)).toEqual(
    inline.scrollers.map(({ key }) => key),
  );
  for (let index = 0; index < full.scrollers.length; index += 1) {
    const before = inline.scrollers[index]!;
    const after = full.scrollers[index]!;
    expect(after.client + 1).toBeGreaterThanOrEqual(before.client);
    expect(after.debt).toBeLessThanOrEqual(before.debt + 2);
    expect(after.blockDebt).toBeLessThanOrEqual(2);
    if (after.key.startsWith('tokens:')) expect(after.debt).toBeLessThanOrEqual(2);
  }
  for (const span of full.tableSpans) {
    expect(Math.abs(span.scrollerLeft - span.panelLeft)).toBeLessThanOrEqual(2);
    expect(Math.abs(span.scrollerRight - span.panelRight)).toBeLessThanOrEqual(2);
  }
  if (full.rootBlockDebt > 2) {
    expect(['auto', 'scroll']).toContain(full.rootOverflowY);
  }
}

async function expectFormulaGeometry(page: Page) {
  const evidence = await page.locator('.katex-display').evaluateAll((formulas) =>
    formulas.map((formula) => {
      const outer = formula as HTMLElement;
      const visible = outer.querySelector<HTMLElement>('.katex-html');
      const outerRect = outer.getBoundingClientRect();
      const visibleRect = visible?.getBoundingClientRect();
      return {
        blockDebt: Math.max(0, outer.scrollHeight - outer.clientHeight),
        visibleInsideBlock:
          !visibleRect ||
          (visibleRect.top >= outerRect.top - 2 && visibleRect.bottom <= outerRect.bottom + 2),
      };
    }),
  );
  expect(evidence).toHaveLength(3);
  expect(evidence.every(({ blockDebt, visibleInsideBlock }) => blockDebt <= 2 && visibleInsideBlock)).toBe(true);
}

async function expectChapterContent(
  page: Page,
  locale: ChapterLocale,
  expectedRowColumns: number,
  expectTableOverflow: boolean,
  chapters: readonly CourseChapterLink[],
) {
  const localized = copy[locale];
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale,
    order: 6,
    revision: contentRevision,
    revisionLabel: localized.revisionLabel,
    title: localized.chapterTitle,
  });

  for (const heading of Object.values(localized.headings)) {
    await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible();
  }
  const displayedFormula = page.locator('.katex-display');
  await expect(displayedFormula).toHaveCount(3);
  await expect(displayedFormula.first()).toHaveCSS('direction', 'ltr');
  await expect(displayedFormula.last().locator('annotation[encoding="application/x-tex"]')).toHaveText(formulaLatex);
  await expectFormulaGeometry(page);

  const rustSources = page.locator('figure.rust-source');
  await expect(rustSources).toHaveCount(4);
  const highlightedRust = rustSources.locator(
    'pre.rust-source-code.astro-code.github-dark-high-contrast[data-language="rust"]',
  );
  await expect(highlightedRust).toHaveCount(4);
  expect(
    await highlightedRust.locator('code').evaluateAll((blocks) => blocks.map((block) => block.textContent)),
  ).toEqual(expectedRustSources);
  await expect(rustSources.locator('figcaption span')).toHaveText([...localized.rustCaptions]);
  expect(
    await rustSources.evaluateAll((sources) => sources.map((source) => source.getAttribute('data-source-region'))),
  ).toEqual(['wrapped-training-fixture', 'fit-training-documents', 'probability-rows', 'learner-output']);
  const highlightingEvidence = await highlightedRust.evaluateAll((blocks) =>
    blocks.map((block) => ({
      lines: block.querySelectorAll('code > span.line').length,
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
    expect(evidence.lines).toBeGreaterThan(0);
    expect(evidence.colors).toBeGreaterThan(1);
    expect(evidence.tabIndex).toBe('0');
    expect(evidence.label).toBeTruthy();
    expect(evidence.direction).toBe('ltr');
  }

  await expectVisualizationDecision(page, { decision: 'useful', id: 'bigram-baseline' });
  const diagram = page.locator(diagramSelector);
  await expect(diagram.getByRole('heading', { level: 3, name: localized.diagramTitle })).toBeVisible();
  await expect(diagram.locator(`#${diagramInstanceId}-description`)).toHaveText(
    localized.diagramDescription,
  );
  await expect(diagram.locator('.summary-facts > div')).toHaveCount(4);
  expect(
    await diagram.locator('.summary-facts > div').evaluateAll((facts) =>
      facts.map((fact) => [
        fact.querySelector('dt')?.textContent?.trim(),
        fact.querySelector('dd')?.textContent?.trim(),
      ]),
    ),
  ).toEqual(localized.summaryFacts.map((fact) => [...fact]));
  for (const sectionTitle of [
    localized.documentSection,
    localized.knownSection,
    localized.unseenSection,
    localized.boundarySection,
  ]) {
    await expect(diagram.getByRole('heading', { level: 4, name: sectionTitle })).toBeVisible();
  }
  await expect(diagram.getByRole('list', { name: localized.tokenLegend })).toBeVisible();
  await expect(diagram.locator('.summary-facts dd')).toHaveText(['5', '1.000', '2', '7']);
  await expect(diagram.locator('.token-legend > li > span')).toHaveText([
    ...localized.roleLabels,
  ]);
  await expect(diagram.locator('.evidence-note')).toHaveText(localized.notes[0]);
  await expect(diagram.locator('[data-context-kind="known"] .row-note')).toHaveText(
    localized.notes[1],
  );
  await expect(diagram.locator('[data-context-kind="unseen"] .row-note')).toHaveText(
    localized.notes[2],
  );
  await expect(diagram.locator('.boundary-guard > p:last-child')).toHaveText(
    localized.notes[3],
  );

  const documents = diagram.locator('[data-document]');
  await expect(documents).toHaveCount(2);
  await expect(documents.locator(':scope > strong')).toContainText([
    localized.documentField,
    localized.documentField,
  ]);
  expect(
    await documents.evaluateAll((nodes) => nodes.map((node) => ({
      id: node.getAttribute('data-document'),
      tokens: Array.from(node.querySelectorAll('[data-token-id]')).map((token) => token.getAttribute('data-token-id')),
    }))),
  ).toEqual([
    { id: 'd1', tokens: ['0', '2', '2', '3', '1'] },
    { id: 'd2', tokens: ['0', '2', '3', '1'] },
  ]);

  const knownRow = diagram.locator('[data-context-kind="known"]');
  const unseenRow = diagram.locator('[data-context-kind="unseen"]');
  await expect(knownRow).toHaveAttribute('data-context-id', '2');
  await expect(unseenRow).toHaveAttribute('data-context-id', '4');
  await expect(knownRow.getByRole('table', { name: localized.knownSection })).toBeVisible();
  await expect(unseenRow.getByRole('table', { name: localized.unseenSection })).toBeVisible();
  await expect(knownRow.getByRole('columnheader')).toHaveText([...localized.tableHeaders]);
  await expect(unseenRow.getByRole('columnheader')).toHaveText([...localized.tableHeaders]);
  await expect(diagram.locator('.context-label')).toContainText([
    localized.contextField,
    localized.contextField,
  ]);
  await expect(diagram.locator('.row-facts dt')).toHaveText([
    ...localized.rowFactLabels,
    ...localized.rowFactLabels,
  ]);
  await expect(knownRow.locator('.row-facts dd')).toHaveText(['3', '8']);
  await expect(unseenRow.locator('.row-facts dd')).toHaveText(['0', '5']);

  const knownCandidates = await knownRow.locator('tbody tr').evaluateAll((rows) =>
    rows.map((row) => ({
      candidate: row.getAttribute('data-candidate-id'),
      count: row.querySelector('[data-value="count"]')?.textContent?.trim(),
      pseudocount: row.querySelector('[data-value="pseudocount"]')?.textContent?.trim(),
      numerator: row.querySelector('[data-value="numerator"]')?.textContent?.trim(),
      mle: row.querySelector('[data-value="mle"]')?.textContent?.trim(),
      smoothed: row.querySelector('[data-value="smoothed"]')?.textContent?.trim(),
      unseenSuccessor: row.getAttribute('data-unseen-successor'),
    })),
  );
  expect(knownCandidates).toEqual([
    { candidate: '0', count: '0', pseudocount: '+1.000', numerator: '1.000', mle: '0.000', smoothed: '0.125', unseenSuccessor: null },
    { candidate: '1', count: '0', pseudocount: '+1.000', numerator: '1.000', mle: '0.000', smoothed: '0.125', unseenSuccessor: null },
    { candidate: '2', count: '1', pseudocount: '+1.000', numerator: '2.000', mle: '0.333', smoothed: '0.250', unseenSuccessor: null },
    { candidate: '3', count: '2', pseudocount: '+1.000', numerator: '3.000', mle: '0.667', smoothed: '0.375', unseenSuccessor: null },
    { candidate: '4', count: '0', pseudocount: '+1.000', numerator: '1.000', mle: '0.000', smoothed: '0.125', unseenSuccessor: 'true' },
  ]);
  await expect(unseenRow.locator('[data-value="count"]')).toHaveText(['0', '0', '0', '0', '0']);
  await expect(unseenRow.locator('[data-value="mle"]')).toHaveText(Array(5).fill(localized.undefinedMle));
  await expect(unseenRow.locator('[data-value="smoothed"]')).toHaveText(Array(5).fill('0.200'));

  await expect(diagram.locator('.forbidden-transition')).toHaveAccessibleName(localized.boundaryName);
  expect(
    await diagram.locator('code, bdi').evaluateAll((nodes) =>
      nodes.every((node) => window.getComputedStyle(node).direction === 'ltr'),
    ),
  ).toBe(true);
  await diagram.focus();
  await expect(diagram).toBeFocused();
  const firstSequence = diagram.locator('.token-sequence').first();
  await firstSequence.focus();
  await expect(firstSequence).toBeFocused();
  const firstTableScroll = diagram.locator('.table-scroll').first();
  await firstTableScroll.focus();
  await expect(firstTableScroll).toBeFocused();
  const rowColumnCount = await diagram.locator('.row-grid').evaluate((node) =>
    window.getComputedStyle(node).gridTemplateColumns.split(/\s+/).filter(Boolean).length,
  );
  expect(rowColumnCount).toBe(expectedRowColumns);
  const tableWidths = await diagram.locator('.table-scroll').evaluateAll((nodes) =>
    nodes.map((node) => ({ client: node.clientWidth, scroll: node.scrollWidth })),
  );
  for (const widths of tableWidths) {
    if (expectTableOverflow) expect(widths.scroll).toBeGreaterThan(widths.client);
    else expect(widths.scroll).toBeLessThanOrEqual(widths.client);
  }
  expectCompleteBigramGeometry(await readBigramGeometry(diagram));

  const exerciseDetails = page.locator('.lesson-body details');
  await expect(exerciseDetails).toHaveCount(1);
  await expect(exerciseDetails.locator('summary')).toHaveText(localized.exerciseSummary);
  await exerciseDetails.locator('summary').click();
  await expect(exerciseDetails).toHaveAttribute('open', '');
  await expect(exerciseDetails).toContainText(localized.exerciseAnswer);

  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

async function expectStructuralListsUseAvailableWidth(page: Page) {
  const geometry = await page
    .locator('figure[data-visualization-id="bigram-baseline"]')
    .evaluate((figure) => {
      const documentList = figure.querySelector<HTMLElement>('.document-list');
      const documents = [...figure.querySelectorAll<HTMLElement>('.document-list > li')];
      const legendItems = [...figure.querySelectorAll<HTMLElement>('.token-legend > li')];
      if (!documentList || documents.length === 0 || legendItems.length === 0) {
        throw new Error('Chapter 6 figure is missing structural list evidence.');
      }
      return {
        documentListWidth: documentList.getBoundingClientRect().width,
        documents: documents.map((document) => ({
          width: document.getBoundingClientRect().width,
          maxInlineSize: getComputedStyle(document).maxInlineSize,
        })),
        legendMaxInlineSizes: legendItems.map((item) => getComputedStyle(item).maxInlineSize),
      };
    });
  for (const document of geometry.documents) {
    expect(document.maxInlineSize).toBe('none');
    expect(Math.abs(geometry.documentListWidth - document.width)).toBeLessThanOrEqual(1);
  }
  expect(geometry.legendMaxInlineSizes.every((value) => value === 'none')).toBe(true);
}

test.describe('chapter 6 localized vertical slice', { tag: chapterTag(chapterId) }, () => {
  test.describe.configure({ mode: 'serial' });

  test('chapter 6 is sixth on every course index and preserves locale switching', async ({ page }) => {
    for (const locale of chapterLocales) {
      const localized = copy[locale];
      const localeDefinition = chapterLocaleDefinitions.find(({ code }) => code === locale);
      expect(localeDefinition).toBeDefined();
      const chapters = await readOrderedCourseChapters(page, locale);
      expect(chapters.length).toBeGreaterThanOrEqual(6);
      expect(chapters[5]).toEqual(
        expect.objectContaining({ chapterId, order: 6, title: localized.chapterTitle }),
      );
      await expect(page.locator('html')).toHaveAttribute('lang', localeDefinition?.languageTag ?? '');
      await expect(page.getByRole('heading', { level: 1, name: localized.indexTitle })).toBeVisible();
      await page.getByRole('link', { name: localized.chapterTitle }).click();
      await expectLocalizedChapterRoute(page, {
        chapterId,
        locale,
        order: 6,
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
    test(`chapter 6 ${locale} renders every learning element at desktop and narrow widths`, async ({ page }) => {
      await page.setViewportSize(desktop);
      const chapters = await readOrderedCourseChapters(page, locale);
      await page.goto(chapterPath(locale, chapterId));
      await expectChapterContent(page, locale, 1, false, chapters);
      await expectStructuralListsUseAvailableWidth(page);
      await page.waitForFunction(
        () => document.documentElement.dataset.diagramFullViewReady === 'true',
      );
      await expect(page.locator(diagramSelector).locator('[data-diagram-full-view-toggle]')).toHaveCount(1);

      await page.setViewportSize(narrow);
      await page.reload();
      await expectChapterContent(page, locale, 1, true, chapters);
      await expectStructuralListsUseAvailableWidth(page);
      await expect(page.locator('[data-diagram-full-view-toggle]')).toHaveCount(0);
    });
  }

  test('both localized figures reuse one semantic tree in a readable native-table full view', async ({
    page,
  }) => {
    await page.setViewportSize(standardFullView);
    for (const locale of chapterLocales) {
      await page.goto(chapterPath(locale, chapterId));
      await page.waitForFunction(
        () => document.documentElement.dataset.diagramFullViewReady === 'true',
      );
      const diagram = page.locator(diagramSelector);
      const toggle = diagram.locator('[data-diagram-full-view-toggle]');
      await expect(toggle).toHaveCount(1);
      await expect(toggle).toBeVisible();
      await settle(page);

      const inlineGeometry = await readBigramGeometry(diagram);
      expectCompleteBigramGeometry(inlineGeometry);
      const inlineFlow = await readReadableFlow(diagram);
      expectLogicalLegendOrder(inlineFlow);
      const inlineEvidence = await readBigramEvidence(diagram);
      const authoredNodeCount = await rememberAuthoredNodes(
        diagram,
        '__chapter06AuthoredNodes',
      );
      expect(authoredNodeCount).toBeGreaterThan(0);
      const staticMarkup = await diagram.evaluate((node) => {
        const clone = node.cloneNode(true) as HTMLElement;
        clone
          .querySelectorAll('[data-diagram-full-view-controls]')
          .forEach((control) => control.remove());
        return clone.innerHTML;
      });
      await diagram.evaluate((node) => {
        (window as unknown as { __chapter06Figure?: Element }).__chapter06Figure = node;
      });

      await toggle.click();
      await page.waitForFunction(
        () => document.fullscreenElement?.getAttribute('data-visualization-id') === 'bigram-baseline',
      );
      await settle(page);

      expect(
        await diagram.evaluate(
          (node) =>
            (window as unknown as { __chapter06Figure?: Element }).__chapter06Figure === node,
        ),
      ).toBe(true);
      expect(
        await authoredNodesAreUnchanged(diagram, '__chapter06AuthoredNodes'),
      ).toBe(true);
      expect(
        await diagram.evaluate((node) => {
          const clone = node.cloneNode(true) as HTMLElement;
          clone
            .querySelectorAll('[data-diagram-full-view-controls]')
            .forEach((control) => control.remove());
          return clone.innerHTML;
        }),
      ).toBe(staticMarkup);
      expect(await readBigramEvidence(diagram)).toEqual(inlineEvidence);
      expectReadableFullView(inlineFlow, await readReadableFlow(diagram));
      expect(await readScrolledChromeRelation(diagram)).toEqual(
        expect.objectContaining({
          actionPosition: 'static',
          evidenceAtScrollport: true,
          overlaps: false,
        }),
      );

      const fullGeometry = await readBigramGeometry(diagram);
      expectCompleteBigramGeometry(fullGeometry);
      expectFontsNotShrunk(inlineGeometry, fullGeometry);

      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.fullscreenElement === null);
      await expect(toggle).toBeFocused();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(
        await diagram.evaluate(
          (node) =>
            (window as unknown as { __chapter06Figure?: Element }).__chapter06Figure === node,
        ),
      ).toBe(true);
      expect(
        await authoredNodesAreUnchanged(diagram, '__chapter06AuthoredNodes'),
      ).toBe(true);
      expect(await readBigramEvidence(diagram)).toEqual(inlineEvidence);
      await expectNoOverflowOrClientScripts(page);
    }
  });

  test('both localized figures keep full-width evidence at the minimum eligible request', async ({
    page,
  }) => {
    await page.setViewportSize(minimumFullView);
    for (const locale of chapterLocales) {
      await page.goto(chapterPath(locale, chapterId));
      await page.waitForFunction(
        () => document.documentElement.dataset.diagramFullViewReady === 'true',
      );
      const diagram = page.locator(diagramSelector);
      const toggle = diagram.locator('[data-diagram-full-view-toggle]');
      await expect(toggle).toHaveCount(1);
      await expect(toggle).toBeVisible();
      await settle(page);

      const inlineGeometry = await readBigramGeometry(diagram);
      const inlineFlow = await readReadableFlow(diagram);
      expectLogicalLegendOrder(inlineFlow);
      const inlineEvidence = await readBigramEvidence(diagram);
      const authoredNodeCount = await rememberAuthoredNodes(
        diagram,
        '__chapter06MinimumAuthoredNodes',
      );
      expect(authoredNodeCount).toBeGreaterThan(0);
      expectCompleteBigramGeometry(inlineGeometry);
      const staticMarkup = await diagram.evaluate((node) => {
        const clone = node.cloneNode(true) as HTMLElement;
        clone
          .querySelectorAll('[data-diagram-full-view-controls]')
          .forEach((control) => control.remove());
        return clone.innerHTML;
      });
      await diagram.evaluate((node) => {
        (window as unknown as { __chapter06MinimumFigure?: Element }).__chapter06MinimumFigure = node;
      });

      await toggle.click();
      await page.waitForFunction(
        () => document.fullscreenElement?.getAttribute('data-visualization-id') === 'bigram-baseline',
      );
      await settle(page);
      expect(
        await diagram.evaluate(
          (node) =>
            (window as unknown as { __chapter06MinimumFigure?: Element })
              .__chapter06MinimumFigure === node,
        ),
      ).toBe(true);
      expect(
        await authoredNodesAreUnchanged(
          diagram,
          '__chapter06MinimumAuthoredNodes',
        ),
      ).toBe(true);
      expect(
        await diagram.evaluate((node) => {
          const clone = node.cloneNode(true) as HTMLElement;
          clone
            .querySelectorAll('[data-diagram-full-view-controls]')
            .forEach((control) => control.remove());
          return clone.innerHTML;
        }),
      ).toBe(staticMarkup);
      expect(await readBigramEvidence(diagram)).toEqual(inlineEvidence);
      expectReadableFullView(inlineFlow, await readReadableFlow(diagram));
      expect(await readScrolledChromeRelation(diagram)).toEqual(
        expect.objectContaining({
          actionPosition: 'static',
          evidenceAtScrollport: true,
          overlaps: false,
        }),
      );
      const fullGeometry = await readBigramGeometry(diagram);
      expectCompleteBigramGeometry(fullGeometry);
      expectFontsNotShrunk(inlineGeometry, fullGeometry);

      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.fullscreenElement === null);
      await expect(toggle).toBeFocused();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(
        await authoredNodesAreUnchanged(
          diagram,
          '__chapter06MinimumAuthoredNodes',
        ),
      ).toBe(true);
    }
  });

  test('Russian evidence keeps redundant borders and technical direction in forced colors and RTL', async ({
    page,
  }) => {
    await page.setViewportSize(standardFullView);
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(chapterPath('ru', chapterId));
    await page.waitForFunction(
      () => document.documentElement.dataset.diagramFullViewReady === 'true',
    );
    expect(
      await page.evaluate(() => matchMedia('(forced-colors: active)').matches),
    ).toBe(true);
    const diagram = page.locator(diagramSelector);
    await settle(page);
    expectLogicalLegendOrder(await readReadableFlow(diagram));
    await diagram.evaluate((node) => node.setAttribute('dir', 'rtl'));
    await settle(page);
    expectCompleteBigramGeometry(await readBigramGeometry(diagram));
    expect(
      await diagram.locator('code, bdi, .token-sequence, .forbidden-transition').evaluateAll(
        (nodes) => nodes.every((node) => getComputedStyle(node).direction === 'ltr'),
      ),
    ).toBe(true);
    await expect(diagram.locator('[data-unseen-successor="true"]')).toHaveCSS(
      'border-inline-start-style',
      'double',
    );
    await expect(diagram.locator('.boundary-guard')).toHaveCSS('border-top-style', 'dashed');
    const inlineGeometry = await readBigramGeometry(diagram);
    const inlineFlow = await readReadableFlow(diagram);
    expectLogicalLegendOrder(inlineFlow);

    const toggle = diagram.locator('[data-diagram-full-view-toggle]');
    await toggle.click();
    await page.waitForFunction(
      () => document.fullscreenElement?.getAttribute('data-visualization-id') === 'bigram-baseline',
    );
    await settle(page);
    expectReadableFullView(inlineFlow, await readReadableFlow(diagram));
    expect(await readScrolledChromeRelation(diagram)).toEqual(
      expect.objectContaining({
        actionPosition: 'static',
        evidenceAtScrollport: true,
        overlaps: false,
      }),
    );
    const fullGeometry = await readBigramGeometry(diagram);
    expectCompleteBigramGeometry(fullGeometry);
    expectFontsNotShrunk(inlineGeometry, fullGeometry);
    expect(
      await diagram.locator('code, bdi, .token-sequence, .forbidden-transition').evaluateAll(
        (nodes) => nodes.every((node) => getComputedStyle(node).direction === 'ltr'),
      ),
    ).toBe(true);
    await expect(diagram.locator('[data-unseen-successor="true"]')).toHaveCSS(
      'border-inline-start-style',
      'double',
    );
    await expect(diagram.locator('.boundary-guard')).toHaveCSS('border-top-style', 'dashed');

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.fullscreenElement === null);
    await expect(toggle).toBeFocused();
    await expectNoOverflowOrClientScripts(page);
  });

});
