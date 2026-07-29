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
  expectSeoDescription,
  expectVisualizationDecision,
  readOrderedCourseChapters,
  type ChapterLocale,
  type CourseChapterLink,
} from './chapter-helpers';

declare const process: { cwd(): string };

interface LocalizedCopy {
  revisionLabel: string;
  title: string;
  description: string;
  headings: readonly string[];
  historyHeading: string;
  historyFragments: readonly string[];
  diagramTitle: string;
  diagramDescription: string;
  summaryLabels: readonly string[];
  stages: readonly string[];
  tableHeaders: {
    ids: readonly string[];
    table: readonly string[];
    lookup: readonly string[];
    gradients: readonly string[];
  };
  states: {
    unused: string;
    selectedOnce: string;
    selectedRepeated: string;
    singleRow: string;
    repeatedRow: string;
    unusedZero: string;
    singleCopy: string;
    repeatedSum: string;
    none: string;
  };
  notes: readonly string[];
  scrollers: readonly string[];
}

const chapterId = '18-token-embeddings';
const contentRevision = 5;
const formulaLatex = String.raw`X_{b,t,:}=E_{z_{b,t},:},\quad \bar{E}_{i,:}=\sum_{(b,t):z_{b,t}=i}\bar{X}_{b,t,:}`;
const upstreamAdjointLatex = String.raw`\bar{X}_{b,t,:}=\partial L/\partial X_{b,t,:}`;
const tableAdjointLatex = String.raw`\bar{E}_{i,:}=\partial L/\partial E_{i,:}`;
const repositoryRoot = resolve(process.cwd(), '..');
const historySources = [
  'https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf',
  'https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf',
] as const;

const copy: Record<ChapterLocale, LocalizedCopy> = {
  en: {
    revisionLabel: 'Content revision',
    title: 'Give token IDs trainable vectors',
    description:
      'Build trainable token embeddings in Rust, gather table rows for token IDs, preserve batch and sequence shape, and scatter-add repeated-token gradients.',
    headings: [
      'Predict three selected rows and one shared gradient',
      'Select forward, accumulate backward',
      'Keep vocabulary axes separate from feature axes',
      'From sparse identity to the vector entrance of a Transformer',
      'Wrap one named table around the existing gather rule',
      'Follow every selection back to its shared row',
      'Predict before checking the executable evidence',
      'Hand the final feature axis to a learned projection',
    ],
    historyHeading: 'From sparse identity to the vector entrance of a Transformer',
    historyFragments: [
      'A sparse one-hot word representation assigns one coordinate to each vocabulary item but expresses no graded similarity between words; explicitly carrying that vocabulary-wide vector also wastes work when only one row is needed.',
      'Bengio et al. learn a shared dense word-feature table jointly with a neural next-word model. The Transformer retains learned token embeddings for subword tokens, then adds positional information before its stacked attention and feed-forward computations.',
      "The decoder's token IDs enter the numeric model by selecting rows from one trainable vocabulary-by-feature table. Repeated IDs share the same parameter row, so their reverse contributions add; positional information, embedding forward scaling, attention, and output-weight tying remain later concerns.",
      'Bengio et al. represent the mapping from a vocabulary word index to distributed features as a trainable matrix with one row per vocabulary item and one column per learned feature, share it across context positions, and learn it jointly with next-word prediction.',
      'Vaswani et al. use learned embeddings whose width matches the model width for BPE or word-piece tokens and add positional encodings before the Transformer stack; their embedding forward scaling is separate from parameter initialization.',
    ],
    diagramTitle: 'Follow repeated token IDs through one shared table',
    diagramDescription:
      'Read the exact Rust-authored token IDs, table rows, one-hot lookup equivalence, output vectors, and reverse contributions that accumulate into the shared embedding table.',
    summaryLabels: [
      'Named parameter',
      'Vocabulary rows',
      'Embedding width',
      'Table shape',
      'Token-ID shape',
      'Output shape',
      'Table-gradient shape',
    ],
    stages: [
      'Start with integer token IDs',
      'Keep one shared trainable table',
      'Select rows without storing the zeros',
      'Return contributions to their shared rows',
    ],
    tableHeaders: {
      ids: ['Position', 'Token ID', 'Row status'],
      table: ['Table row', 'Trainable vector', 'Selections', 'Row status'],
      lookup: [
        'Position',
        'Token ID',
        'One-hot indicator',
        'Equivalent product',
        'Selected row',
        'Output vector',
        'Upstream gradient',
      ],
      gradients: [
        'Table row',
        'Contributing flat positions',
        'Feature-wise contributions',
        'Reverse rule',
        'Stored row gradient',
      ],
    },
    states: {
      unused: 'Unused row',
      selectedOnce: 'Selected once',
      selectedRepeated: 'Shared by the repeated token ID',
      singleRow: 'Selects one singly used row',
      repeatedRow: 'Shares one row with another position',
      unusedZero: 'No selection; keep zero',
      singleCopy: 'One selection; copy its contribution',
      repeatedSum: 'Repeated selections; add both contributions',
      none: 'None',
    },
    notes: [
      'IDs name rows and stay outside the differentiation tape. Repeating an ID reuses one parameter row.',
      'The indicator exposes the algebra: one active coordinate selects one table row. The implementation performs direct lookup.',
      'Reverse mode returns each upstream feature vector to its selected row. Only the repeated row receives two vectors and sums them.',
    ],
    scrollers: [
      'Scrollable token-ID positions',
      'Scrollable embedding table',
      'Scrollable one-hot and lookup evidence',
      'Scrollable table-gradient accumulation evidence',
    ],
  },
  ru: {
    revisionLabel: 'Версия материала',
    title: 'Сопоставьте ID токенов с обучаемыми векторами',
    description:
      'Реализуйте на Rust обучаемые эмбеддинги токенов: выбирайте строки таблицы по ID, сохраняйте форму пакета и последовательности и складывайте градиенты повторных обращений к одной строке.',
    headings: [
      'Предскажите три выбранные строки и один общий градиент',
      'Выбирайте строки в прямом проходе и накапливайте вклады в обратном',
      'Не смешивайте оси словаря и признаков',
      'От разреженного кода принадлежности к векторному входу Transformer',
      'Оберните существующее правило выбора строк одной именованной таблицей',
      'Проследите каждый выбор обратно до общей строки',
      'Сначала предскажите, затем сверьтесь с исполняемым примером',
      'Передайте последнюю ось признаков обучаемой проекции',
    ],
    historyHeading:
      'От разреженного кода принадлежности к векторному входу Transformer',
    historyFragments: [
      'Разреженное one-hot-представление слова отводит одну координату каждому элементу словаря, но не выражает степень сходства между словами. Кроме того, явно переносить такой вектор размером со словарь расточительно, когда нужна только одна строка.',
      'Bengio и соавторы обучают общую плотную таблицу признаков слов вместе с нейросетевой моделью следующего слова. В Transformer используются обучаемые эмбеддинги подсловных токенов, к которым перед стеком слоёв с механизмами внимания и сетями прямого распространения добавляется позиционная информация.',
      'ID токенов поступают в численную часть декодера, выбирая строки одной обучаемой таблицы «словарь на признаки». Повторяющиеся ID используют одну строку параметров, поэтому их вклады при обратном проходе складываются; позиционная информация, масштабирование эмбеддингов в прямом проходе, внимание и совместное использование весов с выходной проекцией рассматриваются позже.',
      'Bengio и соавторы задают обучаемое отображение индекса слова из словаря в распределённые признаки в виде матрицы с одной строкой на элемент словаря и одним столбцом на обучаемый признак, используют эту матрицу во всех позициях контекста и обучают её вместе с предсказанием следующего слова.',
      'Vaswani и соавторы используют обучаемые эмбеддинги ширины модели для токенов BPE или word-piece и добавляют позиционное кодирование перед стеком Transformer; масштабирование эмбеддингов в прямом проходе не относится к инициализации параметров.',
    ],
    diagramTitle: 'Проследите повторяющиеся ID в общей таблице',
    diagramDescription:
      'Проследите точные ID токенов, строки таблицы, равносильность one-hot-умножению, выходные векторы и обратные вклады из примера на Rust, которые накапливаются в общей таблице эмбеддингов.',
    summaryLabels: [
      'Именованный параметр',
      'Строки словаря',
      'Ширина эмбеддинга',
      'Форма таблицы',
      'Форма ID токенов',
      'Форма выхода',
      'Форма градиента таблицы',
    ],
    stages: [
      'Целочисленные ID токенов',
      'Общая обучаемая таблица',
      'Выбор строк без нулей',
      'Накопление в общих строках',
    ],
    tableHeaders: {
      ids: ['Позиция', 'ID токена', 'Статус'],
      table: [
        'Строка таблицы',
        'Обучаемый вектор',
        'Выборов',
        'Статус',
      ],
      lookup: [
        'Позиция',
        'ID токена',
        'One-hot-индикатор',
        'Произведение',
        'Выбранная строка',
        'Выходной вектор',
        'Входящий градиент',
      ],
      gradients: [
        'Строка таблицы',
        'Плоские позиции',
        'Вклады по признакам',
        'Обратное правило',
        'Итоговый градиент',
      ],
    },
    states: {
      unused: 'Строка не выбрана',
      selectedOnce: 'Выбрана один раз',
      selectedRepeated: 'Общая для повторов',
      singleRow: 'Строка без повторов',
      repeatedRow: 'Общая с другой позицией',
      unusedZero: 'Нет выборов — ноль',
      singleCopy: 'Один выбор — скопировать',
      repeatedSum: 'Повторы — сложить вклады',
      none: 'Нет',
    },
    notes: [
      'ID задают строки вне ленты. Повторный ID обращается к той же строке параметров.',
      'One-hot-индикатор показывает алгебру: одна активная координата выбирает строку. Реализация обращается к ней напрямую.',
      'При обратном проходе каждый градиент возвращается в выбранную строку. Для повторной строки два вклада складываются.',
    ],
    scrollers: [
      'Прокручиваемые позиции ID токенов',
      'Прокручиваемая таблица эмбеддингов',
      'Прокручиваемое доказательство равносильности выбора строк и one-hot-умножения',
      'Прокручиваемое доказательство накопления градиентов строк',
    ],
  },
};

const expectedRustRegions = [
  ['rust/demos/ch18-token-embeddings/src/lib.rs', 'one-hot-baseline'],
  ['rust/demos/ch18-token-embeddings/src/lib.rs', 'known-token-lookup'],
  ['rust/crates/llm-from-scratch/src/nn/embedding.rs', 'embedding-errors'],
  ['rust/crates/llm-from-scratch/src/nn/embedding.rs', 'embedding-layer'],
  ['rust/demos/ch18-token-embeddings/src/lib.rs', 'repeated-token-gradient'],
  ['rust/demos/ch18-token-embeddings/src/lib.rs', 'initialized-token-embedding'],
  ['rust/demos/ch18-token-embeddings/src/lib.rs', 'embedding-edge-cases'],
  ['rust/demos/ch18-token-embeddings/src/main.rs', 'learner-token-embeddings-output'],
  ['rust/demos/ch18-token-embeddings/src/diagram_trace.rs', 'token-embeddings-trace'],
] as const;

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

async function readMathAwareRows(rows: Locator) {
  return rows.evaluateAll((rowNodes) =>
    rowNodes.map((row) =>
      Array.from(row.children, (cell) => {
        const clone = cell.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('.katex').forEach((math) => {
          const source =
            math.querySelector('annotation[encoding="application/x-tex"]')
              ?.textContent ?? '';
          math.replaceWith(document.createTextNode(` ${source} `));
        });
        return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
      }),
    ),
  );
}

async function expectFormulaGeometry(page: Page) {
  await settle(page);
  const problems = await page
    .locator(
      '.lesson-body .katex-display, .lesson-body .katex:not(.katex-display .katex)',
    )
    .evaluateAll((nodes) =>
      nodes.flatMap((node, index) => {
        const element = node as HTMLElement;
        if (element.closest('figure.course-diagram')) return [];
        const rect = element.getBoundingClientRect();
        const source =
          element.querySelector('annotation[encoding="application/x-tex"]')
            ?.textContent ?? `formula ${index}`;
        const issues: string[] = [];
        if (
          rect.left < -1 ||
          rect.right > document.documentElement.clientWidth + 1
        ) {
          issues.push(`${source} escapes the viewport`);
        }
        if (rect.width <= 0 || rect.height <= 0) {
          issues.push(`${source} has no visible box`);
        }
        const mathml = element.querySelector<HTMLElement>('.katex-mathml');
        if (!mathml) {
          issues.push(`${source} has no accessible MathML projection`);
        } else {
          const style = getComputedStyle(mathml);
          if (style.display !== 'block' || style.overflowX !== 'clip') {
            issues.push(`${source} does not contain its MathML projection`);
          }
        }
        const { direction, overflowY } = getComputedStyle(element);
        if (direction !== 'ltr') issues.push(`${source} is not left-to-right`);
        if (
          ['auto', 'clip', 'hidden', 'scroll'].includes(overflowY) &&
          element.scrollHeight > element.clientHeight + 2
        ) {
          issues.push(`${source} clips vertically`);
        }
        if (element.classList.contains('katex-display')) {
          const owner = element.parentElement;
          const next = owner?.nextElementSibling as HTMLElement | null;
          if (
            owner &&
            next &&
            owner.getBoundingClientRect().bottom >
              next.getBoundingClientRect().top + 1
          ) {
            issues.push(`${source} overlaps the following block`);
          }
        }
        return issues;
      }),
    );
  expect(problems).toEqual([]);
}

async function expectDiagramContainment(page: Page, locale: ChapterLocale) {
  await settle(page);
  const diagram = page.locator(
    'figure[data-visualization-id="token-embeddings"]',
  );
  const result = await diagram.evaluate((figure, allowedError) => {
    const root = figure as HTMLElement;
    const rootRect = root.getBoundingClientRect();
    const fullscreenRoot = document.fullscreenElement === root;
    const problems: string[] = [];
    const visible = (element: Element) => {
      const style = getComputedStyle(element as HTMLElement);
      return (
        element.getClientRects().length > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden'
      );
    };
    const describe = (element: Element) => {
      const node = element as HTMLElement;
      const classes =
        typeof node.className === 'string'
          ? node.className.trim().split(/\s+/).slice(0, 2).join('.')
          : '';
      return `${node.tagName.toLowerCase()}${classes ? `.${classes}` : ''}`;
    };
    const hasCompleteBorder = (element: HTMLElement) => {
      const style = getComputedStyle(element);
      const widths = [
        style.borderTopWidth,
        style.borderRightWidth,
        style.borderBottomWidth,
        style.borderLeftWidth,
      ].map(Number.parseFloat);
      const styles = [
        style.borderTopStyle,
        style.borderRightStyle,
        style.borderBottomStyle,
        style.borderLeftStyle,
      ];
      return (
        widths.every((width) => Number.isFinite(width) && width > 0) &&
        styles.every((styleName) => !['none', 'hidden'].includes(styleName))
      );
    };
    const all = [root, ...root.querySelectorAll<HTMLElement>('*')].filter(
      (element) => visible(element) && !element.closest('.visually-hidden'),
    );
    const isBoundedBox = (element: HTMLElement) => {
      if (element === root && fullscreenRoot) return false;
      const display = getComputedStyle(element).display;
      if (
        element.hasAttribute('data-diagram-scroll') ||
        element.closest(
          '.katex, .katex-mathml, .visually-hidden, [aria-hidden="true"]',
        ) ||
        display === 'inline' ||
        display === 'contents' ||
        display.startsWith('table-row')
      ) {
        return false;
      }
      return (
        element === root ||
        element.hasAttribute('data-diagram-box') ||
        ['TH', 'TD'].includes(element.tagName) ||
        hasCompleteBorder(element)
      );
    };
    const boxes = all.filter(isBoundedBox);
    const boxSet = new Set(boxes);
    const nearestBoundedBox = (
      element: HTMLElement | null,
    ): HTMLElement | null => {
      if (!element) return null;
      const scrollOwner = element.closest<HTMLElement>('[data-diagram-scroll]');
      let candidate: HTMLElement | null = element;
      while (candidate && root.contains(candidate)) {
        if (boxSet.has(candidate)) {
          if (scrollOwner && !scrollOwner.contains(candidate)) return null;
          return candidate;
        }
        if (candidate === root) break;
        candidate = candidate.parentElement;
      }
      return null;
    };
    const innerEdges = (box: HTMLElement) => {
      const rect = box.getBoundingClientRect();
      const style = getComputedStyle(box);
      return {
        bottom: rect.bottom - Number.parseFloat(style.borderBottomWidth || '0'),
        left: rect.left + Number.parseFloat(style.borderLeftWidth || '0'),
        right: rect.right - Number.parseFloat(style.borderRightWidth || '0'),
        top: rect.top + Number.parseFloat(style.borderTopWidth || '0'),
      };
    };
    const auditPaintRect = (
      rect: DOMRect,
      box: HTMLElement,
      witness: HTMLElement,
      kind: string,
    ) => {
      if (rect.width <= 0 || rect.height <= 0) return;
      const edges = innerEdges(box);
      const escapes =
        rect.left < edges.left - allowedError ||
        rect.right > edges.right + allowedError ||
        rect.top < edges.top - allowedError ||
        rect.bottom > edges.bottom + allowedError;
      if (!escapes) return;
      const debt = Math.max(
        edges.left - rect.left,
        rect.right - edges.right,
        edges.top - rect.top,
        rect.bottom - edges.bottom,
      );
      problems.push(
        `${describe(witness)} paints ${kind} outside ${describe(box)} by ${debt.toFixed(1)}px`,
      );
    };

    const markedBoxes = all.filter((element) =>
      element.hasAttribute('data-diagram-box'),
    );
    for (const [index, box] of markedBoxes.entries()) {
      if (!hasCompleteBorder(box)) {
        problems.push(`marked box ${index} lacks a four-sided border`);
      }
    }
    for (const box of boxes) {
      const style = getComputedStyle(box);
      if (
        [style.overflowX, style.overflowY].some((overflow) =>
          ['hidden', 'clip'].includes(overflow),
        )
      ) {
        problems.push(`${describe(box)} hides or clips overflow`);
      }
      if (
        box.scrollWidth > box.clientWidth + allowedError ||
        box.scrollHeight > box.clientHeight + allowedError
      ) {
        problems.push(`${describe(box)} does not contain its content`);
      }
      const parentBox = nearestBoundedBox(box.parentElement);
      if (parentBox && parentBox !== box) {
        auditPaintRect(box.getBoundingClientRect(), parentBox, box, 'a nested box');
      }
    }

    const scrollers = Array.from(
      root.querySelectorAll<HTMLElement>('[data-diagram-scroll]'),
    );
    for (const [index, region] of scrollers.entries()) {
      const style = getComputedStyle(region);
      const rect = region.getBoundingClientRect();
      const owner = region.parentElement?.closest<HTMLElement>(
        '[data-diagram-box]',
      );
      const ownerRect = owner?.getBoundingClientRect();
      if (
        region.getAttribute('role') !== 'region' ||
        region.getAttribute('tabindex') !== '0' ||
        !(region.getAttribute('aria-label') ?? '').trim()
      ) {
        problems.push(`scroll region ${index} lacks its keyboard name or role`);
      }
      if (!['auto', 'scroll'].includes(style.overflowX)) {
        problems.push(`scroll region ${index} does not own horizontal overflow`);
      }
      if (
        ownerRect &&
        (rect.left < ownerRect.left - allowedError ||
          rect.right > ownerRect.right + allowedError)
      ) {
        problems.push(`scroll region ${index} escapes its bounded stage`);
      }
    }

    const excludedFromPaintAudit = (element: Element) =>
      element.closest('.katex-mathml, .visually-hidden') !== null ||
      element.closest('[aria-hidden="true"]') !== null;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let textNode = walker.nextNode();
    while (textNode) {
      const parent = textNode.parentElement;
      const text = textNode.textContent?.trim() ?? '';
      if (
        parent &&
        text &&
        visible(parent) &&
        !parent.closest('.katex') &&
        !excludedFromPaintAudit(parent)
      ) {
        const box = nearestBoundedBox(parent);
        if (box) {
          const range = document.createRange();
          range.selectNodeContents(textNode);
          for (const rect of Array.from(range.getClientRects())) {
            auditPaintRect(rect, box, parent, 'text');
          }
        }
      }
      textNode = walker.nextNode();
    }

    for (const formula of root.querySelectorAll<HTMLElement>('.katex')) {
      if (
        !visible(formula) ||
        formula.parentElement?.closest('.katex') ||
        formula.closest('.katex-mathml, .visually-hidden')
      ) {
        continue;
      }
      const box = nearestBoundedBox(formula.parentElement);
      if (box) {
        auditPaintRect(formula.getBoundingClientRect(), box, formula, 'formula');
      }
    }

    for (const [index, symbol] of Array.from(
      root.querySelectorAll<HTMLElement>('.state-symbol'),
    ).entries()) {
      if (
        symbol.scrollWidth > symbol.clientWidth + allowedError ||
        symbol.scrollHeight > symbol.clientHeight + allowedError
      ) {
        problems.push(`state symbol ${index} cannot contain its complete cue`);
      }
    }
    if (
      rootRect.left < -allowedError ||
      rootRect.right > document.documentElement.clientWidth + allowedError ||
      root.scrollWidth > root.clientWidth + allowedError
    ) {
      problems.push('figure escapes its inline or fullscreen boundary');
    }
    return {
      fullscreen: fullscreenRoot,
      markedBoxCount: markedBoxes.length,
      scrollerCount: scrollers.length,
      problems,
    };
  }, 2);
  expect(result.markedBoxCount).toBe(11);
  expect(result.scrollerCount).toBe(4);
  expect(result.problems, `${locale} diagram containment`).toEqual([]);
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
    order: 18,
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
      `xpath=following-sibling::*[not(self::h2) and preceding-sibling::h2[1][normalize-space()="${localized.historyHeading}"]]`,
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

  const displayAnnotations = await page
    .locator('.lesson-body .katex-display annotation[encoding="application/x-tex"]')
    .allTextContents();
  expect(displayAnnotations).toContain(formulaLatex);
  const inlineAnnotationText = await page
    .locator(
      '.lesson-body .katex:not(.katex-display .katex) annotation[encoding="application/x-tex"]',
    )
    .allTextContents();
  expect(inlineAnnotationText.filter((text) => text === upstreamAdjointLatex)).toHaveLength(2);
  expect(inlineAnnotationText.filter((text) => text === tableAdjointLatex)).toHaveLength(2);
  await expect(page.locator('.lesson-body code').filter({ hasText: /^bar [XE]$/ })).toHaveCount(0);
  await expectFormulaGeometry(page);

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

  await expectVisualizationDecision(page, {
    decision: 'useful',
    id: 'token-embeddings',
  });
  const diagram = page.locator(
    'figure[data-visualization-id="token-embeddings"]',
  );
  await expect(diagram).toHaveAccessibleName(localized.diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(localized.diagramDescription);
  await expect(diagram).toHaveClass(/\bcourse-diagram\b/);
  await expect(diagram).toHaveAttribute('data-diagram-style', 'course-v1');
  await expect(diagram).toHaveCSS('overflow-x', 'visible');
  await expect(diagram.locator(':scope > figcaption')).toHaveClass(
    /\bcourse-diagram__caption\b/,
  );
  await expect(diagram.locator('.shape-summary dt')).toHaveText(
    localized.summaryLabels,
  );
  expect(
    await readMathAwareRows(diagram.locator('.shape-summary > div')),
  ).toEqual([
    [localized.summaryLabels[0], 'token_embedding.weight'],
    [localized.summaryLabels[1], '4'],
    [localized.summaryLabels[2], '2'],
    [localized.summaryLabels[3], String.raw`\left[4,2\right]`],
    [localized.summaryLabels[4], String.raw`\left[1,3\right]`],
    [localized.summaryLabels[5], String.raw`\left[1,3,2\right]`],
    [localized.summaryLabels[6], String.raw`\left[4,2\right]`],
  ]);
  const stageHeadings = diagram.locator('.diagram-stage h4');
  await expect(stageHeadings).toHaveCount(localized.stages.length);
  await expect(stageHeadings.locator('.state-symbol')).toHaveText(['1', '2', '3', '4']);
  for (const [index, stage] of localized.stages.entries()) {
    await expect(stageHeadings.nth(index)).toContainText(stage);
  }
  for (const note of localized.notes) {
    await expect(diagram.getByText(note, { exact: true })).toBeVisible();
  }
  await expect(diagram.locator('.ids-stage thead th')).toHaveText(
    localized.tableHeaders.ids,
  );
  await expect(diagram.locator('.table-stage thead th')).toHaveText(
    localized.tableHeaders.table,
  );
  await expect(diagram.locator('.lookup-stage thead th')).toHaveText(
    localized.tableHeaders.lookup,
  );
  await expect(diagram.locator('.gradient-stage thead th')).toHaveText(
    localized.tableHeaders.gradients,
  );

  expect(await readMathAwareRows(diagram.locator('.ids-stage tbody tr'))).toEqual([
    [String.raw`\left(0,0\right)`, '2', localized.states.repeatedRow],
    [String.raw`\left(0,1\right)`, '1', localized.states.singleRow],
    [String.raw`\left(0,2\right)`, '2', localized.states.repeatedRow],
  ]);
  expect(await readMathAwareRows(diagram.locator('.table-stage tbody tr'))).toEqual([
    [
      String.raw`E_{0,:}`,
      String.raw`\left[10.000000000000,11.000000000000\right]`,
      '0',
      `○ ${localized.states.unused}`,
    ],
    [
      String.raw`E_{1,:}`,
      String.raw`\left[20.000000000000,21.000000000000\right]`,
      '1',
      `● ${localized.states.selectedOnce}`,
    ],
    [
      String.raw`E_{2,:}`,
      String.raw`\left[30.000000000000,31.000000000000\right]`,
      '2',
      `◆ ${localized.states.selectedRepeated}`,
    ],
    [
      String.raw`E_{3,:}`,
      String.raw`\left[40.000000000000,41.000000000000\right]`,
      '0',
      `○ ${localized.states.unused}`,
    ],
  ]);
  expect(await readMathAwareRows(diagram.locator('.lookup-stage tbody tr'))).toEqual([
    [
      String.raw`\left(0,0\right)`,
      '2',
      String.raw`\left[0,0,1,0\right]`,
      String.raw`e_{2}E`,
      String.raw`E_{2,:}`,
      String.raw`\left[30.000000000000,31.000000000000\right]`,
      String.raw`\left[1.000000000000,0.000000000000\right]`,
    ],
    [
      String.raw`\left(0,1\right)`,
      '1',
      String.raw`\left[0,1,0,0\right]`,
      String.raw`e_{1}E`,
      String.raw`E_{1,:}`,
      String.raw`\left[20.000000000000,21.000000000000\right]`,
      String.raw`\left[0.000000000000,2.000000000000\right]`,
    ],
    [
      String.raw`\left(0,2\right)`,
      '2',
      String.raw`\left[0,0,1,0\right]`,
      String.raw`e_{2}E`,
      String.raw`E_{2,:}`,
      String.raw`\left[30.000000000000,31.000000000000\right]`,
      String.raw`\left[3.000000000000,4.000000000000\right]`,
    ],
  ]);
  expect(await readMathAwareRows(diagram.locator('.gradient-stage tbody tr'))).toEqual([
    [
      String.raw`\bar E_{0,:}`,
      localized.states.none,
      localized.states.none,
      localized.states.unusedZero,
      String.raw`\left[0.000000000000,0.000000000000\right]`,
    ],
    [
      String.raw`\bar E_{1,:}`,
      '1',
      String.raw`\left[0.000000000000,2.000000000000\right]`,
      localized.states.singleCopy,
      String.raw`\left[0.000000000000,2.000000000000\right]`,
    ],
    [
      String.raw`\bar E_{2,:}`,
      '0,2',
      String.raw`\left[1.000000000000,0.000000000000\right] + \left[3.000000000000,4.000000000000\right]`,
      localized.states.repeatedSum,
      String.raw`\left[4.000000000000,4.000000000000\right]`,
    ],
    [
      String.raw`\bar E_{3,:}`,
      localized.states.none,
      localized.states.none,
      localized.states.unusedZero,
      String.raw`\left[0.000000000000,0.000000000000\right]`,
    ],
  ]);

  await expect(diagram.locator('[data-diagram-card]')).toHaveCount(2);
  await expect(diagram.locator('[data-diagram-box]')).toHaveCount(11);
  await expect(diagram.locator('[data-diagram-table]')).toHaveCount(4);
  const scrollers = diagram.locator('[data-diagram-scroll]');
  await expect(scrollers).toHaveCount(4);
  for (const [index, scroller] of (await scrollers.all()).entries()) {
    await expect(scroller).toHaveAttribute('role', 'region');
    await expect(scroller).toHaveAttribute('tabindex', '0');
    await expect(scroller).toHaveAccessibleName(localized.scrollers[index]!);
    await scroller.focus();
    await expect(scroller).toBeFocused();
  }
  if (narrow) {
    for (const scroller of await scrollers.all()) {
      const widths = await scroller.evaluate((node) => ({
        client: node.clientWidth,
        scroll: node.scrollWidth,
      }));
      expect(widths.scroll).toBeGreaterThan(widths.client);
    }
  }
  const stagePositions = await diagram
    .locator('.stage-grid .diagram-stage')
    .evaluateAll((stages) =>
      stages.map((stage) => {
        const rectangle = stage.getBoundingClientRect();
        return {
          left: rectangle.left,
          top: rectangle.top,
          bottom: rectangle.bottom,
        };
      }),
    );
  expect(stagePositions).toHaveLength(2);
  expect(Math.abs(stagePositions[0]!.left - stagePositions[1]!.left)).toBeLessThan(1);
  expect(stagePositions[1]!.top).toBeGreaterThan(stagePositions[0]!.bottom);
  await expectDiagramContainment(page, locale);

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

test.describe('chapter 18 localized token-embeddings vertical slice', {
  tag: chapterTag(chapterId),
}, () => {
  test('chapter 18 is eighteenth on both indexes with direct equivalent locale routes', async ({
    page,
  }) => {
    for (const locale of chapterLocales) {
      const localized = copy[locale];
      const chapters = await readOrderedCourseChapters(page, locale);
      expect(chapters.length).toBeGreaterThanOrEqual(18);
      expect(chapters[17]).toEqual(
        expect.objectContaining({
          chapterId,
          order: 18,
          title: localized.title,
        }),
      );
      await page.getByRole('link', { name: localized.title, exact: true }).click();
      await expectLocalizedChapterRoute(page, {
        chapterId,
        locale,
        order: 18,
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
          `.locale-switch a[data-locale="${target.code}"]`,
        );
        await expect(switchLink).not.toHaveAttribute(
          'data-locale-fallback',
          'course-index',
        );
        await switchLink.click();
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
            name: copy[target.code].title,
            exact: true,
          }),
        ).toBeVisible();
      }
    }
  });

  for (const locale of chapterLocales) {
    test(
      `the complete ${locale} Rust-backed lesson renders at desktop and narrow widths`,
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

  test('chapter 18 full view fits both locales without substantial travel', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    for (const locale of chapterLocales) {
      await page.goto(chapterPath(locale, chapterId));
      await settle(page);
      const diagram = page.locator(
        'figure[data-visualization-id="token-embeddings"]',
      );
      const toggle = diagram.locator('[data-diagram-full-view-toggle]');
      await expect(toggle).toBeVisible();
      await toggle.click();
      await page.waitForFunction(
        () =>
          document.fullscreenElement?.getAttribute('data-visualization-id') ===
          'token-embeddings',
      );
      await settle(page);
      await expectDiagramContainment(page, locale);
      const geometry = await diagram.evaluate((node) => ({
        blockDebt: node.scrollHeight - node.clientHeight,
        blockBudget: Math.ceil(node.clientHeight * 0.25),
        inlineDebt: node.scrollWidth - node.clientWidth,
        parts: Array.from(node.children).map((part) => ({
          name: (part as HTMLElement).className,
          height: Math.round((part as HTMLElement).getBoundingClientRect().height),
        })),
        stageParts: Array.from(
          node.querySelectorAll<HTMLElement>('.diagram-stage'),
        ).map((part) => ({
          name: part.className,
          height: Math.round(part.getBoundingClientRect().height),
        })),
        regionInlineDebts: Array.from(
          node.querySelectorAll<HTMLElement>('[data-diagram-scroll]'),
        ).map((region) => ({
          name: region.className,
          debt: region.scrollWidth - region.clientWidth,
          clientWidth: region.clientWidth,
          scrollWidth: region.scrollWidth,
        })),
        boxDebts: Array.from(
          node.querySelectorAll<HTMLElement>('[data-diagram-box]'),
        ).map((box) => ({
          inline: box.scrollWidth - box.clientWidth,
          block: box.scrollHeight - box.clientHeight,
        })),
        topStages: Array.from(
          node.querySelectorAll<HTMLElement>('.stage-grid .diagram-stage'),
        ).map((stage) => {
          const rectangle = stage.getBoundingClientRect();
          return { left: rectangle.left, top: rectangle.top };
        }),
      }));
      const geometryLabel = `${locale}/token-embeddings`;
      expect(
        geometry.blockDebt,
        `${geometryLabel} full-view block debt: ${JSON.stringify({ parts: geometry.parts, stages: geometry.stageParts })}`,
      ).toBeLessThanOrEqual(geometry.blockBudget);
      expect(
        geometry.inlineDebt,
        `${geometryLabel} full-view inline debt`,
      ).toBeLessThanOrEqual(2);
      expect(
        geometry.regionInlineDebts.every(({ debt }) => debt <= 2),
        `${geometryLabel} named-region inline containment: ${JSON.stringify(geometry.regionInlineDebts)}`,
      ).toBe(true);
      expect(
        geometry.boxDebts.every(({ inline, block }) => inline <= 2 && block <= 2),
        `${geometryLabel} bounded-box containment`,
      ).toBe(true);
      expect(geometry.topStages).toHaveLength(2);
      expect(
        Math.abs(geometry.topStages[0]!.top - geometry.topStages[1]!.top),
      ).toBeLessThan(1);
      expect(
        Math.abs(geometry.topStages[0]!.left - geometry.topStages[1]!.left),
      ).toBeGreaterThan(1);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.fullscreenElement === null);
      await expect(toggle).toBeFocused();
    }
  });

  test('repeated, single-use, and unused states survive forced colors in both locales', async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    for (const locale of chapterLocales) {
      await page.goto(chapterPath(locale, chapterId));
      const diagram = page.locator(
        'figure[data-visualization-id="token-embeddings"]',
      );
      await expect(diagram.locator('.state-unused .state-symbol').first()).toHaveText('○');
      await expect(diagram.locator('.state-selected-once .state-symbol')).toHaveText('●');
      await expect(diagram.locator('.state-selected-repeated .state-symbol')).toHaveText('◆');
      expect(
        await diagram
          .locator('.state-unused td')
          .first()
          .evaluate((node) => window.getComputedStyle(node).borderBottomStyle),
      ).toBe('dotted');
      expect(
        await diagram
          .locator('.state-selected-once td')
          .first()
          .evaluate((node) => window.getComputedStyle(node).borderBottomStyle),
      ).toBe('solid');
      expect(
        await diagram
          .locator('.state-selected-repeated td')
          .first()
          .evaluate((node) => window.getComputedStyle(node).borderBottomStyle),
      ).toBe('double');
      expect(
        await diagram
          .locator('.rule-repeated-sum td')
          .first()
          .evaluate((node) => window.getComputedStyle(node).borderBottomStyle),
      ).toBe('double');
      await expectDiagramContainment(page, locale);
      await expectNoOverflowOrClientScripts(page);
    }
  });

  test('localized prose follows direction while technical evidence remains left-to-right', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const locale of chapterLocales) {
      await page.goto(chapterPath(locale, chapterId));
      const diagram = page.locator(
        'figure[data-visualization-id="token-embeddings"]',
      );
      await diagram.evaluate((node) => node.setAttribute('dir', 'rtl'));

      await expect(diagram.locator('.course-diagram__description')).toHaveCSS(
        'direction',
        'rtl',
      );
      const rowState = diagram.locator('.ids-stage tbody td').last();
      await expect(rowState).toHaveText(copy[locale].states.repeatedRow);
      await expect(rowState).toHaveCSS('direction', 'rtl');
      expect(
        await diagram.locator('[dir="ltr"]').evaluateAll((nodes) =>
          nodes.length > 0 &&
          nodes.every((node) => window.getComputedStyle(node).direction === 'ltr'),
        ),
      ).toBe(true);
      const stages = await diagram
        .locator('.stage-grid .diagram-stage')
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
      expect(stages).toHaveLength(2);
      expect(Math.abs(stages[0]!.right - stages[1]!.right)).toBeLessThan(1);
      expect(stages[1]!.top).toBeGreaterThan(stages[0]!.bottom);
      await expectDiagramContainment(page, locale);
      await expectNoOverflowOrClientScripts(page);
    }
  });

  test('both complete localized lessons and trace tables render without JavaScript', async ({
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
      await expect(page.locator('.ids-stage tbody tr')).toHaveCount(3);
      await expect(page.locator('.table-stage tbody tr')).toHaveCount(4);
      await expect(page.locator('.lookup-stage tbody tr')).toHaveCount(3);
      await expect(page.locator('.gradient-stage tbody tr')).toHaveCount(4);
      await expect(page.locator('[data-diagram-scroll]')).toHaveCount(4);
      await expect(page.locator('[data-diagram-full-view-toggle]')).toHaveCount(0);
      expect(
        await page
          .locator('.rule-repeated-sum')
          .last()
          .locator('annotation[encoding="application/x-tex"]')
          .allTextContents(),
      ).toContain(String.raw`\left[4.000000000000,4.000000000000\right]`);
      await expectNoOverflowOrClientScripts(page);
    }
    await context.close();
  });
});
