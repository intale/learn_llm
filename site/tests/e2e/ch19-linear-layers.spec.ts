// @ts-ignore Node APIs are available in the Playwright test runner.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Playwright test runner.
import { resolve } from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  chapterLocaleDefinitions,
  chapterLocales,
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
  notes: readonly string[];
  scrollers: readonly string[];
  biasLabel: string;
  parameterLabel: string;
  biasEnabled: string;
  affineSymbol: string;
  biasFreeSymbol: string;
  affinePolicy: string;
  biasFreePolicy: string;
  positionGradientCaption: string;
  parameterGradientCaption: string;
}

const chapterId = '19-linear-layers';
const contentRevision = 5;
const repositoryRoot = resolve(process.cwd(), '..');
const workedFormulaLatex = String.raw`W=
\begin{bmatrix}
1 & 0 & -1 \\
2 & 0.5 & 1
\end{bmatrix},
\qquad
b=\begin{bmatrix}0.5 & -0.5 & 1\end{bmatrix}.`;
const formulaLatex = String.raw`Y=XW+b`;
const reverseFormulaLatex = String.raw`\begin{aligned}
dX_p &= G_pW^\top, \\
dW &= \sum_p X_p^\top G_p, \\
db &= \sum_p G_p.
\end{aligned}`;
const gradientFixtureLatex = String.raw`\begin{aligned}
G &=
\left[
\begin{bmatrix}
1 & 0 & -1 \\
0.5 & 2 & 1
\end{bmatrix}
\right], \\
dX &=
\left[
\begin{bmatrix}
2 & 1 \\
-0.5 & 3
\end{bmatrix}
\right], \\
dW &=
\begin{bmatrix}
0.5 & -2 & -2 \\
3.5 & 6 & 1
\end{bmatrix}, \\
db &= \begin{bmatrix}1.5 & 2 & 0\end{bmatrix}.
\end{aligned}`;

const copy: Record<ChapterLocale, LocalizedCopy> = {
  en: {
    revisionLabel: 'Content revision',
    title: "Mix each token's features with one learned projection",
    description:
      'Build a trainable linear layer in Rust, preserve leading token axes, compare affine and bias-free projections, and verify exact reverse gradients.',
    headings: [
      'Predict two outputs from one shared matrix',
      'Project the final feature axis',
      'Keep leading axes separate from feature axes',
      'From adaptive responses to projections throughout a Transformer',
      'Wrap existing differentiable operations in one named layer',
      'Trace positions, products, policy, and gradients',
      'Predict before checking the executable evidence',
      'Hand reusable projections to the first gated block',
    ],
    historyHeading: 'From adaptive responses to projections throughout a Transformer',
    historyFragments: [
      'One scalar weighted response is local arithmetic inside an adaptive system, but a language model needs vectors of hidden activations and vocabulary-wide scores at every context position; treating every output as a separate scalar unit hides the shared matrix computation.',
      'Bengio et al. express hidden and output computation in a neural language model with trainable matrices and additive biases. The Transformer then reuses learned projections for queries, keys, values, attention outputs, position-wise feed-forward transformations, and next-token scoring.',
      'A decoder applies the same learned feature projection independently at every batch and sequence position. This course keeps bias available for the historical affine form, while its target attention, SwiGLU, and vocabulary projections deliberately use the bias-free form.',
      "Rosenblatt describes an adaptive response architecture in which summed excitatory and inhibitory signals and reinforcement influence the selected response. This supports the early adaptive-response context, not this course's affine formula or API.",
      'Vaswani et al. learn separate linear projections for queries, keys, and values, project concatenated heads again, apply two linear transformations identically at each feed-forward position, and use a learned pre-softmax projection.',
    ],
    diagramTitle: 'Follow one shared projection across two token positions',
    diagramDescription:
      'Read exact Rust-authored shapes, shared weights, per-output contributions, affine and bias-free results, and gradients accumulated across both positions.',
    summaryLabels: [
      'Named parameter',
      'Input width',
      'Output width',
      'Bias',
      'Parameter scalars',
      'Input shape',
      'Output shape',
      'Upstream shape',
    ],
    stages: [
      'Preserve positions; change feature width',
      'Share one weight matrix and bias',
      'Project each position independently',
      'Expand one output coordinate',
      'Compare affine and bias-free policies',
      'Accumulate gradients for shared parameters',
    ],
    notes: [
      'The leading batch and sequence coordinates are unchanged. Only the final feature axis grows from two coordinates to three.',
      'This first output coordinate uses both input features. Their products form the weighted sum, then the matching bias produces the result.',
      'The affine path adds one shared bias coordinate per output feature. The target decoder chooses the bias-free path for attention, SwiGLU, and vocabulary projections.',
      'Each input position receives its own gradient. The shared weight and bias collect contributions from both positions.',
    ],
    scrollers: [
      'Scrollable linear-layer weight and bias evidence',
      'Scrollable position-by-position projection evidence',
      'Scrollable linear-layer gradient evidence',
    ],
    biasLabel: 'Bias',
    parameterLabel: 'Parameter',
    biasEnabled: 'Enabled',
    affineSymbol: 'Add bias',
    biasFreeSymbol: 'No bias',
    affinePolicy: 'Affine projection',
    biasFreePolicy: 'Bias-free projection',
    positionGradientCaption: 'Per-position gradients',
    parameterGradientCaption: 'Shared-parameter gradients',
  },
  ru: {
    revisionLabel: 'Версия материала',
    title: 'Смешайте признаки каждого токена с помощью одной обучаемой проекции',
    description:
      'Постройте на Rust обучаемый линейный слой, сохраните ведущие оси токенов, сравните аффинную проекцию с проекцией без смещения и проверьте точные градиенты обратного прохода.',
    headings: [
      'Предскажите два выхода одной общей матрицы',
      'Спроецируйте последнюю ось признаков',
      'Не смешивайте ведущие оси с осью признаков',
      'От адаптивных откликов к проекциям во всём Transformer',
      'Объедините существующие дифференцируемые операции в именованный слой',
      'Проследите позиции, произведения, политику смещения и градиенты',
      'Сначала предскажите, затем сверьтесь с вычислениями',
      'Передайте переиспользуемые проекции первому блоку с вентилем',
    ],
    historyHeading: 'От адаптивных откликов к проекциям во всём Transformer',
    historyFragments: [
      'Один скалярный взвешенный отклик — лишь локальная арифметика внутри адаптивной системы. Языковой модели нужны векторы скрытых активаций и оценки для всего словаря в каждой позиции контекста; если представлять каждый выход отдельным скалярным элементом, общий матричный расчёт остаётся неявным.',
      'Бенжио и соавторы выражают вычисления скрытого слоя и выхода нейросетевой языковой модели через обучаемые матрицы и аддитивные смещения. Затем Transformer многократно использует обучаемые проекции для запросов, ключей, значений, выходов внимания, преобразований сети прямого распространения, одинаковых для каждой позиции, и оценок следующего токена.',
      'Декодер независимо применяет одну и ту же обучаемую проекцию признаков в каждой позиции пакета и последовательности. В курсе смещение доступно для исторической аффинной формы, но в целевой архитектуре проекции внимания, SwiGLU и словаря намеренно не используют смещение.',
      'Розенблатт описывает архитектуру адаптивного отклика, в которой суммируются возбуждающие и тормозящие сигналы, а подкрепление влияет на выбранный отклик. Эта работа подтверждает лишь описание ранних адаптивных откликов; аффинную формулу и API курса она не задаёт.',
      'Васвани и соавторы обучают отдельные линейные проекции запросов, ключей и значений, ещё раз проецируют объединённые головы, одинаково применяют к каждой позиции два линейных преобразования сети прямого распространения и используют обучаемую проекцию перед softmax.',
    ],
    diagramTitle: 'Проследите одну общую проекцию для двух позиций токенов',
    diagramDescription:
      'Сопоставьте точные формы, общие веса, вклады в каждый выход, аффинный вариант и вариант без смещения, а затем градиенты, накопленные по обеим позициям.',
    summaryLabels: [
      'Именованный параметр',
      'Входных признаков',
      'Выходных признаков',
      'Смещение',
      'Скалярных параметров',
      'Форма входа',
      'Форма выхода',
      'Форма входящего градиента',
    ],
    stages: [
      'Сохраните позиции, измените ширину признаков',
      'Используйте одну матрицу весов и смещение',
      'Спроецируйте каждую позицию независимо',
      'Рассчитайте одну координату выхода',
      'Сравните вариант со смещением и без него',
      'Накопите градиенты общих параметров',
    ],
    notes: [
      'Ведущие координаты пакета и последовательности не меняются. Только последняя ось признаков расширяется с двух координат до трёх.',
      'Первая координата выхода зависит от обоих входных признаков: их произведения дают взвешенную сумму, к которой добавляется смещение.',
      'Аффинный вариант добавляет по одной общей координате смещения к каждому выходному признаку. В целевом декодере проекции внимания, SwiGLU и словаря смещение не используют.',
      'Каждая входная позиция получает собственный градиент. Общие веса и смещение накапливают вклады обеих позиций.',
    ],
    scrollers: [
      'Прокручиваемые данные о весах и смещении линейного слоя',
      'Прокручиваемые данные о проекции каждой позиции',
      'Прокручиваемые данные о градиентах линейного слоя',
    ],
    biasLabel: 'Смещение',
    parameterLabel: 'Параметр',
    biasEnabled: 'Включено',
    affineSymbol: 'Добавить смещение',
    biasFreeSymbol: 'Без смещения',
    affinePolicy: 'Аффинная проекция',
    biasFreePolicy: 'Проекция без смещения',
    positionGradientCaption: 'Градиенты отдельных позиций',
    parameterGradientCaption: 'Градиенты общих параметров',
  },
};

const historySources = [
  'https://doi.org/10.1037/h0042519',
  'https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf',
  'https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf',
] as const;

const expectedRustRegions = [
  ['rust/demos/ch19-linear-layers/src/lib.rs', 'scalar-weighted-unit'],
  ['rust/demos/ch19-linear-layers/src/lib.rs', 'known-linear-layer'],
  ['rust/crates/llm-from-scratch/src/nn/linear.rs', 'linear-errors'],
  ['rust/crates/llm-from-scratch/src/nn/linear.rs', 'linear-layer'],
  ['rust/demos/ch19-linear-layers/src/lib.rs', 'linear-gradients'],
  ['rust/demos/ch19-linear-layers/src/lib.rs', 'initialized-linear-layer'],
  ['rust/demos/ch19-linear-layers/src/main.rs', 'learner-linear-layers-output'],
  ['rust/demos/ch19-linear-layers/src/diagram_trace.rs', 'linear-layers-trace'],
] as const;

function readRustRegion(path: string, region: string): string {
  const lines = readFileSync(resolve(repositoryRoot, path), 'utf8').split(/\r?\n/);
  const start = lines.findIndex((line: string) => line.trim() === `// region:${region}`);
  const end = lines.findIndex((line: string) => line.trim() === `// endregion:${region}`);
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
        if (rect.left < -1 || rect.right > document.documentElement.clientWidth + 1) {
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
            owner.getBoundingClientRect().bottom > next.getBoundingClientRect().top + 1
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
  const diagram = page.locator('figure[data-visualization-id="linear-layers"]');
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
      if (node instanceof HTMLTableCellElement) {
        const table = node.closest('table');
        const tableClass = table?.className ? `.${table.className.trim().split(/\s+/).join('.')}` : '';
        const rowIndex = node.parentElement instanceof HTMLTableRowElement
          ? node.parentElement.rowIndex
          : -1;
        return `${node.tagName.toLowerCase()}${tableClass}[r${rowIndex}c${node.cellIndex}]`;
      }
      if (node.classList.contains('katex')) {
        const latex = node.querySelector('annotation[encoding="application/x-tex"]')?.textContent;
        return `span.katex${latex ? `(${latex})` : ''}`;
      }
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
    const nearestBoundedBox = (element: HTMLElement | null): HTMLElement | null => {
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

    const markedBoxes = all.filter((element) => element.hasAttribute('data-diagram-box'));
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
      const owner = region.parentElement?.closest<HTMLElement>('[data-diagram-box]');
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
    if (
      rootRect.left < -allowedError ||
      rootRect.right > document.documentElement.clientWidth + allowedError ||
      root.scrollWidth > root.clientWidth + allowedError
    ) {
      problems.push('figure escapes its inline or fullscreen boundary');
    }
    return {
      markedBoxCount: markedBoxes.length,
      scrollerCount: scrollers.length,
      problems,
    };
  }, 2);
  expect(result.markedBoxCount).toBe(18);
  expect(result.scrollerCount).toBe(3);
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
    order: 19,
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
  for (const fragment of localized.historyFragments) {
    expect(historyText).toContain(fragment);
  }
  expect(historyText).not.toMatch(/Rust history|Python history|TypeScript history/i);
  const historyLinks = historyNodes.locator('a');
  await expect(historyLinks).toHaveCount(historySources.length);
  expect(
    await historyLinks.evaluateAll((links) => links.map((link) => link.getAttribute('href'))),
  ).toEqual(historySources);

  const normalizeMath = (value: string) => value.replace(/\s+/g, '');
  const displayFormulae = page.locator('.lesson-body > .katex-display');
  await expect(displayFormulae).toHaveCount(4);
  expect(
    await displayFormulae.evaluateAll((nodes) =>
      nodes.map((node) => window.getComputedStyle(node).direction),
    ),
  ).toEqual(['ltr', 'ltr', 'ltr', 'ltr']);
  expect(
    (
      await displayFormulae
        .locator('annotation[encoding="application/x-tex"]')
        .allTextContents()
    ).map(normalizeMath),
  ).toEqual(
    [workedFormulaLatex, formulaLatex, reverseFormulaLatex, gradientFixtureLatex].map(
      normalizeMath,
    ),
  );
  const mathAnnotations = (
    await page.locator('annotation[encoding="application/x-tex"]').allTextContents()
  ).map(normalizeMath);
  for (const expected of [
    String.raw`G=\partial L/\partial Y`,
    String.raw`y=b+Wx+U\tanh(d+Hx)`,
    String.raw`(XW_1)W_2=X(W_1W_2)`,
  ]) {
    expect(mathAnnotations).toContain(normalizeMath(expected));
  }
  const renderedCode = await page.locator('.lesson-body code').allTextContents();
  for (const codeShapedMath of [
    'dX_p=G_p W^T',
    'dW=sum_p X_p^T G_p',
    'db=sum_p G_p',
    '(XW_1)W_2=X(W_1W_2)',
  ]) {
    expect(renderedCode).not.toContain(codeShapedMath);
  }
  await expectFormulaGeometry(page);

  const rustSources = page.locator('figure.rust-source');
  await expect(rustSources).toHaveCount(expectedRustRegions.length);
  const highlighted = rustSources.locator(
    'pre.rust-source-code.astro-code.github-dark-high-contrast[data-language="rust"]',
  );
  await expect(highlighted).toHaveCount(expectedRustRegions.length);
  expect(
    await highlighted.locator('code').evaluateAll((blocks) =>
      blocks.map((block) => block.textContent),
    ),
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
    })),
  )) {
    expect(evidence.tabIndex).toBe('0');
    expect(evidence.label).toBeTruthy();
    expect(evidence.direction).toBe('ltr');
  }

  await expectVisualizationDecision(page, { decision: 'useful', id: 'linear-layers' });
  const diagram = page.locator('figure[data-visualization-id="linear-layers"]');
  await expect(diagram).toHaveAccessibleName(localized.diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(localized.diagramDescription);
  await expect(diagram).toHaveAttribute('data-diagram-style', 'course-v1');
  await expect(diagram.locator('.shape-summary dt')).toHaveText(localized.summaryLabels);
  expect(await readMathAwareRows(diagram.locator('.shape-summary > div'))).toEqual([
    [localized.summaryLabels[0], 'token_projection.weight'],
    [localized.summaryLabels[1], '2'],
    [localized.summaryLabels[2], '3'],
    [localized.summaryLabels[3], localized.biasEnabled],
    [localized.summaryLabels[4], '9'],
    [localized.summaryLabels[5], String.raw`\left[1,2,2\right]`],
    [localized.summaryLabels[6], String.raw`\left[1,2,3\right]`],
    [localized.summaryLabels[7], String.raw`\left[1,2,3\right]`],
  ]);
  const stageHeadings = diagram.locator('.diagram-stage h4');
  await expect(stageHeadings).toHaveCount(localized.stages.length);
  await expect(stageHeadings.locator('.state-symbol')).toHaveText(['1', '2', '3', '4', '5', '6']);
  for (const [index, stage] of localized.stages.entries()) {
    await expect(stageHeadings.nth(index)).toContainText(stage);
  }
  for (const note of localized.notes) {
    await expect(diagram.getByText(note, { exact: true })).toBeVisible();
  }

  await expect(diagram.locator('.weights-stage thead th').first()).toHaveText(
    localized.parameterLabel,
  );
  expect(await readMathAwareRows(diagram.locator('.weights-stage tbody tr'))).toEqual([
    ['W', String.raw`\begin{bmatrix}1&0&-1\\2&0.5&1\end{bmatrix}`],
    [localized.biasLabel, String.raw`\left[0.5,-0.5,1\right]`],
  ]);
  expect(await readMathAwareRows(diagram.locator('.positions-stage tbody tr'))).toEqual([
    ['0', String.raw`\left(0,0\right)`, String.raw`\left[1,2\right]`, String.raw`\left[5.5,0.5,2\right]`],
    ['1', String.raw`\left(0,1\right)`, String.raw`\left[-1,3\right]`, String.raw`\left[5.5,1,5\right]`],
  ]);
  expect(
    await diagram
      .locator('.contribution-grid annotation[encoding="application/x-tex"]')
      .allTextContents(),
  ).toEqual([
    String.raw`\left(0,0\right),\;y_{0}`,
    String.raw`\begin{aligned}y_{0}&=1\cdot1+2\cdot2+0.5\\&=5+0.5=5.5\end{aligned}`,
  ]);
  const affineHeading = diagram.locator('.policy-path.affine-policy').first();
  await expect(affineHeading).toContainText(localized.affineSymbol);
  await expect(affineHeading).toContainText(localized.affinePolicy);
  const biasFreeHeading = diagram.locator('.policy-path.bias-free-policy').first();
  await expect(biasFreeHeading).toContainText(localized.biasFreeSymbol);
  await expect(biasFreeHeading).toContainText(localized.biasFreePolicy);
  expect(
    await diagram
      .locator('.policy-comparison annotation[encoding="application/x-tex"]')
      .allTextContents(),
  ).toEqual([
    String.raw`\left(0,0\right)`,
    '9', String.raw`\left[5.5,0.5,2\right]`,
    '6', String.raw`\left[5,1,1\right]`,
    String.raw`\left(0,1\right)`,
    '9', String.raw`\left[5.5,1,5\right]`,
    '6', String.raw`\left[5,1.5,4\right]`,
  ]);
  await expect(diagram.locator('.position-gradient-table')).toHaveAccessibleName(
    localized.positionGradientCaption,
  );
  await expect(diagram.locator('.parameter-gradient-table')).toHaveAccessibleName(
    localized.parameterGradientCaption,
  );
  await expect(diagram.locator('.parameter-gradient-table thead th').first()).toHaveAccessibleName(
    localized.parameterLabel,
  );
  expect(
    await readMathAwareRows(diagram.locator('.position-gradient-table tbody tr')),
  ).toEqual([
    [String.raw`dX_{0}`, String.raw`\left(0,0\right)`, String.raw`\left[1,0,-1\right]`, String.raw`\left[2,1\right]`],
    [String.raw`dX_{1}`, String.raw`\left(0,1\right)`, String.raw`\left[0.5,2,1\right]`, String.raw`\left[-0.5,3\right]`],
  ]);

  const scrollers = diagram.locator('[data-diagram-scroll]');
  await expect(scrollers).toHaveCount(localized.scrollers.length);
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
    const axisPositions = await diagram.locator('.axis-flow > *').evaluateAll((nodes) =>
      nodes.map((node) => node.getBoundingClientRect().top),
    );
    expect(axisPositions[1]).toBeGreaterThan(axisPositions[0]);
    expect(axisPositions[2]).toBeGreaterThan(axisPositions[1]);
  }
  expect(
    await diagram.locator('code, bdi, .katex').evaluateAll((nodes) =>
      nodes.every((node) => window.getComputedStyle(node).direction === 'ltr'),
    ),
  ).toBe(true);
  await expectDiagramContainment(page, locale);

  const exerciseDetails = page.locator('.lesson-body details');
  await expect(exerciseDetails).toHaveCount(1);
  await exerciseDetails.locator('summary').click();
  await expect(exerciseDetails).toHaveAttribute('open', '');
  await expect(exerciseDetails.locator('ol > li')).toHaveCount(8);

  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 19 localized linear-layers vertical slice', {
  tag: chapterTag(chapterId),
}, () => {
  test('chapter 19 is nineteenth on both indexes with direct equivalent locale routes', async ({
    page,
  }) => {
    for (const locale of chapterLocales) {
      const localized = copy[locale];
      const chapters = await readOrderedCourseChapters(page, locale);
      expect(chapters.length).toBeGreaterThanOrEqual(19);
      expect(chapters[18]).toEqual(
        expect.objectContaining({ chapterId, order: 19, title: localized.title }),
      );
      await page.getByRole('link', { name: localized.title, exact: true }).click();
      await expectLocalizedChapterRoute(page, {
        chapterId,
        locale,
        order: 19,
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
        const switchLink = page.locator(`.locale-switch a[data-locale="${target.code}"]`);
        await expect(switchLink).not.toHaveAttribute('data-locale-fallback', 'course-index');
        await switchLink.click();
        await expect(page).toHaveURL(new RegExp(`${chapterPath(target.code, chapterId)}$`));
        await expect(page.locator('html')).toHaveAttribute('lang', target.languageTag);
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

  test('chapter 19 full view fits both locales without substantial travel', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    for (const locale of chapterLocales) {
      await page.goto(chapterPath(locale, chapterId));
      await settle(page);
      const diagram = page.locator('figure[data-visualization-id="linear-layers"]');
      const toggle = diagram.locator('[data-diagram-full-view-toggle]');
      await expect(toggle).toBeVisible();
      await toggle.click();
      await page.waitForFunction(
        () =>
          document.fullscreenElement?.getAttribute('data-visualization-id') ===
          'linear-layers',
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
        regionDebts: Array.from(
          node.querySelectorAll<HTMLElement>('[data-diagram-scroll]'),
        ).map((region) => ({
          name: region.getAttribute('aria-label'),
          inline: region.scrollWidth - region.clientWidth,
          clientWidth: region.clientWidth,
          scrollWidth: region.scrollWidth,
          children: Array.from(region.children).map((child) => ({
            name: (child as HTMLElement).className,
            clientWidth: (child as HTMLElement).clientWidth,
            scrollWidth: (child as HTMLElement).scrollWidth,
            width: Math.round((child as HTMLElement).getBoundingClientRect().width),
          })),
        })),
        boxDebts: Array.from(node.querySelectorAll<HTMLElement>('[data-diagram-box]')).map(
          (box) => ({
            inline: box.scrollWidth - box.clientWidth,
            block: box.scrollHeight - box.clientHeight,
          }),
        ),
        topStages: Array.from(
          node.querySelectorAll<HTMLElement>('.stage-grid .diagram-stage'),
        ).map((stage) => {
          const rectangle = stage.getBoundingClientRect();
          return { left: rectangle.left, top: rectangle.top };
        }),
      }));
      const geometryLabel = `${locale}/linear-layers`;
      expect(
        geometry.blockDebt,
        `${geometryLabel} full-view block debt: ${JSON.stringify({ parts: geometry.parts, stages: geometry.stageParts })}`,
      ).toBeLessThanOrEqual(geometry.blockBudget);
      expect(geometry.inlineDebt, `${geometryLabel} full-view inline debt`).toBeLessThanOrEqual(2);
      expect(
        geometry.regionDebts.every(({ inline }) => inline <= 2),
        `${geometryLabel} named-region inline containment: ${JSON.stringify(geometry.regionDebts)}`,
      ).toBe(true);
      expect(
        geometry.boxDebts.every(({ inline, block }) => inline <= 2 && block <= 2),
        `${geometryLabel} bounded-box containment`,
      ).toBe(true);
      expect(geometry.topStages).toHaveLength(2);
      expect(Math.abs(geometry.topStages[0]!.top - geometry.topStages[1]!.top)).toBeLessThan(1);
      expect(Math.abs(geometry.topStages[0]!.left - geometry.topStages[1]!.left)).toBeGreaterThan(1);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.fullscreenElement === null);
      await expect(toggle).toBeFocused();
    }
  });

  test('affine and bias-free policies remain distinct in forced colors in both locales', async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    for (const locale of chapterLocales) {
      await page.goto(chapterPath(locale, chapterId));
      const diagram = page.locator('figure[data-visualization-id="linear-layers"]');
      await expect(diagram.locator('.policy-path.affine-policy').first()).toContainText(copy[locale].affineSymbol);
      await expect(diagram.locator('.policy-path.bias-free-policy').first()).toContainText(
        copy[locale].biasFreeSymbol,
      );
      expect(
        await diagram
          .locator('.policy-path.affine-policy')
          .first()
          .evaluate((node) => window.getComputedStyle(node).borderLeftStyle),
      ).toBe('solid');
      expect(
        await diagram
          .locator('.policy-path.bias-free-policy')
          .first()
          .evaluate((node) => window.getComputedStyle(node).borderLeftStyle),
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
      const diagram = page.locator('figure[data-visualization-id="linear-layers"]');
      await diagram.evaluate((node) => node.setAttribute('dir', 'rtl'));
      await expect(diagram.locator('.course-diagram__description')).toHaveCSS(
        'direction',
        'rtl',
      );
      await expect(diagram.locator('.bias-row th')).toHaveText(copy[locale].biasLabel);
      await expect(diagram.locator('.bias-row th')).toHaveCSS('direction', 'rtl');
      expect(
        await diagram.locator('[dir="ltr"]').evaluateAll((nodes) =>
          nodes.length > 0 &&
          nodes.every((node) => window.getComputedStyle(node).direction === 'ltr'),
        ),
      ).toBe(true);
      const stages = await diagram.locator('.stage-grid .diagram-stage').evaluateAll((nodes) =>
        nodes.map((node) => {
          const rectangle = node.getBoundingClientRect();
          return { right: rectangle.right, top: rectangle.top, bottom: rectangle.bottom };
        }),
      );
      expect(stages).toHaveLength(2);
      expect(Math.abs(stages[0]!.right - stages[1]!.right)).toBeLessThan(1);
      expect(stages[1]!.top).toBeGreaterThan(stages[0]!.bottom);
      await expectDiagramContainment(page, locale);
      await expectNoOverflowOrClientScripts(page);
    }
  });

});
