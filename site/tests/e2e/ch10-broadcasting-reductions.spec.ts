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
  readMathAwareText,
  readOrderedCourseChapters,
  type ChapterLocale,
  type CourseChapterLink,
} from './chapter-helpers';

declare const process: { cwd(): string };

const chapterId = '10-broadcasting-reductions';
const contentRevision = 5;
const formulaLatex = String.raw`y_{\mathbf{i}}=f(a_{\beta_a(\mathbf{i})},b_{\beta_b(\mathbf{i})}), \qquad \mu_k(\mathbf{i}_{-k})=\frac{1}{n_k}\sum_{i_k=0}^{n_k-1}x_{\mathbf{i}}`;
const repositoryRoot = resolve(process.cwd(), '..');
const historySources = [
  'https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf',
  'https://papers.neurips.cc/paper/7181-attention-is-all-you-need.pdf',
  'https://github.com/openai/gpt-2/blob/master/src/model.py',
] as const;

// Standard values reflect the final zero-local-travel probe with the 2 px test tolerance.
const GEOMETRY_LIMITS = {
  standardBlockDebtRatio: 0.2,
  standardScrollerTravelPx: 2,
  standardScrollerTravelRatio: 0.01,
  minimumSurfaceWidth: 1024,
  minimumSurfaceHeight: 576,
} as const;

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
    rejectionLabels: ['Request:', 'Checked evidence:', 'Rejected because:'],
    traversalEvidence: [
      'token strides [3,1] yield source offsets [0,1,2,3,4,5], while bias effective strides [0,1] yield source offsets [0,1,2,0,1,2].',
      'axis 0 uses bases [0,1,2] and stride 3, producing source-offset groups [0,3], [1,4], and [2,5].',
      'TensorView::get remains the public path for one coordinate supplied by a caller.',
    ],
    exerciseSummary: 'Check the eight broadcast and reduction predictions',
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
    diagramTitle: 'Один вектор смещения для двух строк, затем редукция по заданным осям',
    diagramDescription:
      'Согласуйте вектор смещения из трёх признаков с двумя строками токенов, проследите шесть отображений координат и сравните сумму, среднее, максимум и три отклонённых запроса.',
    diagramSections: [
      'Согласуйте формы и сопоставьте координаты результата координатам входов',
      'Выполняйте редукцию по одной заданной оси',
    ],
    incompatibleReason:
      'Согласованные размеры осей 3 и 2 различаются, и ни один из них не равен 1.',
    emptyMeanReason: 'Для выбранной пустой оси среднее не определено.',
    emptyMaxReason: 'Для выбранной пустой оси максимум не определён.',
    rejected: 'Операция отклонена',
    notApplicable: 'Не применяется',
    rejectionLabels: ['Запрос:', 'Данные проверки:', 'Причина отклонения:'],
    traversalEvidence: [
      'шаги тензора токенов [3,1] задают смещения в исходном хранилище [0,1,2,3,4,5], а эффективные шаги вектора смещения [0,1] задают [0,1,2,0,1,2].',
      'редукция по оси 0 использует базовые смещения [0,1,2] и шаг 3, поэтому получает группы смещений [0,3], [1,4] и [2,5].',
      'TensorView::get остаётся общедоступным способом прочитать одно значение по координате, переданной вызывающим кодом.',
    ],
    exerciseSummary: 'Проверить восемь ответов о согласовании форм и редукции',
  },
} as const satisfies Record<ChapterLocale, unknown>;

function readRustRegion(path: string, region: string): string {
  const lines = readFileSync(resolve(repositoryRoot, path), 'utf8').split(/\r?\n/);
  const start = lines.findIndex((line: string) => line.trim() === `// region:${region}`);
  const end = lines.findIndex((line: string) => line.trim() === `// endregion:${region}`);
  if (start === -1 || end <= start) {
    throw new Error(`Missing ordered Rust region ${region} in ${path}`);
  }
  return lines.slice(start + 1, end).join('\n');
}

const expectedRustRegions = [
  ['rust/demos/ch10-broadcasting-reductions/src/lib.rs', 'tiny-token-feature-example'],
  ['rust/crates/llm-from-scratch/src/tensor/ops.rs', 'broadcast-planning'],
  ['rust/crates/llm-from-scratch/src/tensor/ops.rs', 'elementwise-maps'],
  ['rust/crates/llm-from-scratch/src/tensor/ops.rs', 'axis-reductions'],
  ['rust/demos/ch10-broadcasting-reductions/src/main.rs', 'learner-broadcasting-output'],
] as const;
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

async function staticDiagramMarkup(diagram: Locator) {
  return diagram.evaluate((root) => {
    const clone = root.cloneNode(true) as HTMLElement;
    clone.querySelector('[data-diagram-full-view-controls]')?.remove();
    return clone.innerHTML;
  });
}

async function expectRejectionFieldRows(
  diagram: Locator,
  expectedLabels: readonly string[],
  context: string,
) {
  const summary = diagram.locator(
    '[data-error-kind="incompatible-broadcast"] > .rejection-summary',
  );
  const fields = summary.locator(':scope > [data-rejection-field]');
  await expect(summary, `${context}: rejection summary`).toHaveCount(1);
  await expect(fields, `${context}: rejection fields`).toHaveCount(3);
  expect(
    await fields.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('data-rejection-field')),
    ),
  ).toEqual(['request', 'evidence', 'reason']);
  await expect(fields.locator(':scope > dt[data-rejection-label]')).toHaveText([
    ...expectedLabels,
  ]);

  const diagnostics = await fields.evaluateAll((nodes) =>
    nodes.map((node) => {
      const label = node.querySelector(':scope > dt[data-rejection-label]');
      const value = node.querySelector(':scope > dd[data-rejection-value]');
      if (!(label instanceof HTMLElement) || !(value instanceof HTMLElement)) {
        throw new Error('Missing direct DT/DD rejection pair');
      }
      const rangeRect = (element: HTMLElement) => {
        const rects: DOMRect[] = [];
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const text = walker.currentNode as Text;
          const parent = text.parentElement;
          if (
            !text.textContent?.trim() ||
            !parent ||
            parent.closest('.visually-hidden, .katex-mathml')
          ) {
            continue;
          }
          const style = getComputedStyle(parent);
          if (style.display === 'none' || style.visibility === 'hidden') continue;
          const range = document.createRange();
          range.selectNodeContents(text);
          rects.push(
            ...Array.from(range.getClientRects()).filter(
              ({ width, height }) => width > 0 && height > 0,
            ),
          );
        }
        if (rects.length === 0) throw new Error('Rejection field has no painted text');
        return {
          bottom: Math.max(...rects.map(({ bottom }) => bottom)),
          top: Math.min(...rects.map(({ top }) => top)),
        };
      };
      const labelPaint = rangeRect(label);
      const valuePaint = rangeRect(value);
      return {
        display: getComputedStyle(node).display,
        field: node.getAttribute('data-rejection-field'),
        labelBeforeValue: Boolean(
          label.compareDocumentPosition(value) & Node.DOCUMENT_POSITION_FOLLOWING,
        ),
        labelTag: label.tagName,
        separation: valuePaint.top - labelPaint.bottom,
        valueTag: value.tagName,
      };
    }),
  );
  expect(
    diagnostics.map(({ display, field, labelBeforeValue, labelTag, valueTag }) => ({
      display,
      field,
      labelBeforeValue,
      labelTag,
      valueTag,
    })),
    context,
  ).toEqual([
    { display: 'grid', field: 'request', labelBeforeValue: true, labelTag: 'DT', valueTag: 'DD' },
    { display: 'grid', field: 'evidence', labelBeforeValue: true, labelTag: 'DT', valueTag: 'DD' },
    { display: 'grid', field: 'reason', labelBeforeValue: true, labelTag: 'DT', valueTag: 'DD' },
  ]);
  for (const diagnostic of diagnostics) {
    expect(diagnostic.separation, `${context}: ${diagnostic.field} separation`).toBeGreaterThanOrEqual(1);
  }
}

async function readDiagramGeometry(diagram: Locator) {
  return diagram.evaluate((root) => {
    const figure = root as HTMLElement;
    const tolerance = 2;
    const problems: string[] = [];
    const allElements = [figure, ...figure.querySelectorAll<HTMLElement>('*')];
    const ignored = (element: HTMLElement) =>
      Boolean(
        element.closest(
          '.visually-hidden, .katex-mathml, [data-diagram-full-view-controls]',
        ),
      );
    const visible = (element: HTMLElement) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== 'none' &&
        !['hidden', 'collapse'].includes(style.visibility) &&
        style.contentVisibility !== 'hidden' &&
        Number.parseFloat(style.opacity) > 0 &&
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
      const sharedInlineMathFallback =
        element.matches('.katex') &&
        style.overflowX === 'auto' &&
        style.overflowY === 'hidden';
      return (
        (!sharedInlineMathFallback &&
          [style.overflowX, style.overflowY].some((value) =>
            ['hidden', 'clip'].includes(value),
          )) ||
        /(?:paint|strict|content)/.test(style.contain) ||
        style.getPropertyValue('clip') !== 'auto' ||
        style.clipPath !== 'none' ||
        style.maskImage !== 'none' ||
        /(?:opacity\(0(?:\.0+)?\)|brightness\(0(?:\.0+)?\))/.test(style.filter)
      );
    };
    const innerRect = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      const widths = border(element).widths;
      return {
        bottom: rect.bottom - widths[2]!,
        left: rect.left + widths[3]!,
        right: rect.right - widths[1]!,
        top: rect.top + widths[0]!,
      };
    };
    const within = (
      child: { bottom: number; left: number; right: number; top: number },
      owner: { bottom: number; left: number; right: number; top: number },
      checkInline = true,
      checkBlock = true,
    ) =>
      (!checkInline ||
        (child.left >= owner.left - tolerance && child.right <= owner.right + tolerance)) &&
      (!checkBlock ||
        (child.top >= owner.top - tolerance && child.bottom <= owner.bottom + tolerance));

    for (const [index, element] of allElements.entries()) {
      if (ignored(element)) continue;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const ownsDirectText = [...element.childNodes].some(
        (child) => child.nodeType === Node.TEXT_NODE && Boolean(child.textContent?.trim()),
      );
      if ((ownsDirectText || element.matches('.katex')) && transparent(style.color)) {
        problems.push(`element-${index} ${describe(element)} has transparent text`);
      }
      if (
        style.display === 'none' ||
        ['hidden', 'collapse'].includes(style.visibility) ||
        style.contentVisibility === 'hidden' ||
        Number.parseFloat(style.opacity) <= 0
      ) {
        problems.push(`element-${index} ${describe(element)} is concealed`);
      }
      if (
        element.textContent?.trim() &&
        !element.closest('.katex-html') &&
        (rect.width <= 0 || rect.height <= 0)
      ) {
        problems.push(`element-${index} ${describe(element)} has no painted area`);
      }
      if (visible(element) && clipped(element)) {
        problems.push(`element-${index} ${describe(element)} conceals overflow`);
      }
    }

    const visibleElements = allElements.filter(visible);
    const markedBoxes = Array.from(
      figure.querySelectorAll<HTMLElement>('[data-diagram-box]'),
    );
    const cells = Array.from(figure.querySelectorAll<HTMLTableCellElement>('th, td'));
    const stateSymbols = Array.from(
      figure.querySelectorAll<HTMLElement>('.state-symbol'),
    );
    const mandatoryOwners = new Set<HTMLElement>([figure, ...markedBoxes, ...cells]);
    const borderedOwners = visibleElements.filter(
      (element) =>
        !element.closest('[data-diagram-full-view-controls]') && completeBorder(element),
    );
    const boundedOwners = new Set<HTMLElement>([...mandatoryOwners, ...borderedOwners]);
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
      const rect = owner.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        problems.push(`owner-${index} ${describe(owner)} has no painted area`);
      }
      const inlineDebt = Math.max(0, owner.scrollWidth - owner.clientWidth);
      const blockDebt = Math.max(0, owner.scrollHeight - owner.clientHeight);
      if (owner !== figure && inlineDebt > tolerance) {
        problems.push(`owner-${index} ${describe(owner)} has inline debt ${inlineDebt}`);
      }
      if (owner !== figure && blockDebt > tolerance) {
        problems.push(`owner-${index} ${describe(owner)} has block debt ${blockDebt}`);
      }

      if (owner === figure) continue;
      const ancestor = nearestOwner(owner.parentElement);
      if (!ancestor) {
        problems.push(`owner-${index} ${describe(owner)} has no bounded ancestor`);
        continue;
      }
      const interveningScroller = owner.parentElement?.closest<HTMLElement>(
        '[data-diagram-scroll]',
      );
      const checkInline = !interveningScroller || !ancestor.contains(interveningScroller);
      if (
        !within(
          owner.getBoundingClientRect(),
          innerRect(ancestor),
          checkInline,
          ancestor !== figure,
        )
      ) {
        problems.push(`owner-${index} ${describe(owner)} escapes nearest bounded ancestor`);
      }
    }

    for (const [index, cue] of stateSymbols.entries()) {
      if (!visible(cue)) problems.push(`cue-${index} is not visible`);
      if (!completeBorder(cue)) problems.push(`cue-${index} lacks four visible borders`);
      if (clipped(cue)) problems.push(`cue-${index} clips or paint-contains`);
      if (cue.scrollWidth - cue.clientWidth > tolerance) {
        problems.push(`cue-${index} has inline debt`);
      }
      if (cue.scrollHeight - cue.clientHeight > tolerance) {
        problems.push(`cue-${index} has block debt`);
      }
      const ancestor = nearestOwner(cue.parentElement);
      if (
        !ancestor ||
        !within(cue.getBoundingClientRect(), innerRect(ancestor), true, ancestor !== figure)
      ) {
        problems.push(`cue-${index} escapes nearest bounded ancestor`);
      }
    }

    const scrollers = Array.from(
      figure.querySelectorAll<HTMLElement>('[data-diagram-scroll]'),
    );
    for (const [index, scroller] of scrollers.entries()) {
      const labelledBy = scroller.getAttribute('aria-labelledby')?.trim() ?? '';
      const directLabel = scroller.getAttribute('aria-label')?.trim() ?? '';
      const ids = labelledBy.split(/\s+/).filter(Boolean);
      const resolved =
        ids.length > 0 &&
        ids.every((id) => {
          const matches = document.querySelectorAll<HTMLElement>(`#${CSS.escape(id)}`);
          return matches.length === 1 && figure.contains(matches[0]!);
        });
      if (
        scroller.getAttribute('role') !== 'region' ||
        scroller.getAttribute('tabindex') !== '0' ||
        !scroller.classList.contains('course-diagram__scroll') ||
        (!directLabel && !resolved)
      ) {
        problems.push(`scroller-${index} lacks its shared named-region contract`);
      }
      if (
        scroller.hasAttribute('data-diagram-box') ||
        scroller.hasAttribute('data-diagram-card')
      ) {
        problems.push(`scroller-${index} also claims bounded ownership`);
      }
      if (clipped(scroller)) problems.push(`scroller-${index} clips overflow`);
      if (scroller.scrollHeight - scroller.clientHeight > tolerance) {
        problems.push(`scroller-${index} has vertical travel`);
      }
      if (scroller.querySelector('[data-diagram-scroll]')) {
        problems.push(`scroller-${index} nests another declared scroller`);
      }
    }

    const actualHorizontalScrollOwners = allElements.filter((element) => {
      if (!visible(element) || element === figure) return false;
      const style = getComputedStyle(element);
      return (
        element.scrollWidth - element.clientWidth > tolerance &&
        ['auto', 'scroll'].includes(style.overflowX)
      );
    });
    for (const [index, owner] of actualHorizontalScrollOwners.entries()) {
      if (!owner.hasAttribute('data-diagram-scroll') || !scrollers.includes(owner)) {
        problems.push(`actual-scroll-owner-${index} ${describe(owner)} is undeclared`);
      }
    }
    const actualVerticalScrollOwners = allElements.filter((element) => {
      if (ignored(element) || !visible(element) || element === figure) return false;
      const style = getComputedStyle(element);
      return (
        element.scrollHeight - element.clientHeight > tolerance &&
        ['auto', 'scroll'].includes(style.overflowY)
      );
    });
    for (const [index, owner] of actualVerticalScrollOwners.entries()) {
      problems.push(`actual-vertical-scroll-owner-${index} ${describe(owner)} is forbidden`);
    }

    const idrefElements = [
      figure,
      ...figure.querySelectorAll<HTMLElement>('[aria-labelledby], [aria-describedby]'),
    ].filter(
      (element) =>
        element.hasAttribute('aria-labelledby') || element.hasAttribute('aria-describedby'),
    );
    const referencedIds = new Set<string>();
    let idrefTokenCount = 0;
    for (const [index, element] of idrefElements.entries()) {
      for (const attribute of ['aria-labelledby', 'aria-describedby'] as const) {
        if (!element.hasAttribute(attribute)) continue;
        const ids = (element.getAttribute(attribute) ?? '').split(/\s+/).filter(Boolean);
        if (ids.length === 0) problems.push(`idref-${index} has empty ${attribute}`);
        for (const id of ids) {
          referencedIds.add(id);
          idrefTokenCount += 1;
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

    const checkPaint = (
      paint: { bottom: number; left: number; right: number; top: number },
      parent: HTMLElement,
      label: string,
    ) => {
      const owner = nearestOwner(parent);
      if (!owner) return;
      const scroller = parent.closest<HTMLElement>('[data-diagram-scroll]');
      const checkInline = !scroller || scroller.contains(owner);
      if (!within(paint, innerRect(owner), checkInline, owner !== figure)) {
        problems.push(`${label} paints outside ${describe(owner)}`);
      }
    };

    const walker = document.createTreeWalker(figure, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const textNode = walker.currentNode as Text;
      const parent = textNode.parentElement;
      if (!textNode.textContent?.trim() || !parent || ignored(parent) || !visible(parent)) {
        continue;
      }
      const range = document.createRange();
      range.selectNodeContents(textNode);
      const paints = Array.from(range.getClientRects()).filter(
        ({ width, height }) => width > 0 && height > 0,
      );
      if (paints.length === 0 && !parent.closest('.katex-html')) {
        problems.push(`${describe(parent)} has no painted text`);
      }
      for (const paint of paints) {
        checkPaint(paint, parent, describe(parent));
      }
    }
    for (const [index, katex] of Array.from(
      figure.querySelectorAll<HTMLElement>('.katex'),
    ).entries()) {
      if (katex.closest('.katex-mathml') || !visible(katex)) continue;
      if (transparent(getComputedStyle(katex).color)) {
        problems.push(`katex-${index} has transparent text`);
      }
      checkPaint(katex.getBoundingClientRect(), katex, `katex-${index}`);
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
            problems.push(`table-${index} row-${rowIndex} cell-${cellIndex} is not table-cell`);
          }
          if (!completeBorder(cell)) {
            problems.push(`table-${index} row-${rowIndex} cell-${cellIndex} lacks four borders`);
          }
          if (
            Math.abs(cellRect.top - rowRect.top) > 1 ||
            Math.abs(cellRect.bottom - rowRect.bottom) > 1
          ) {
            problems.push(`table-${index} row-${rowIndex} cell-${cellIndex} does not fill row`);
          }
        }
      }
    }

    const rejectionFields = Array.from(
      figure.querySelectorAll<HTMLElement>(
        '.rejection-summary > [data-rejection-field]',
      ),
    );
    for (const [index, field] of rejectionFields.entries()) {
      const direct = Array.from(field.children);
      if (
        direct.length !== 2 ||
        direct[0]?.tagName !== 'DT' ||
        direct[1]?.tagName !== 'DD' ||
        !direct[0].hasAttribute('data-rejection-label') ||
        !direct[1].hasAttribute('data-rejection-value')
      ) {
        problems.push(`rejection-field-${index} is not one direct ordered DT/DD pair`);
      }
    }

    const fontSizes = allElements.flatMap((element, index) => {
      if (ignored(element) || !visible(element)) return [];
      const directText = [...element.childNodes].some(
        (child) => child.nodeType === Node.TEXT_NODE && Boolean(child.textContent?.trim()),
      );
      const isOuterKatex = element.matches('.katex') && !element.closest('.katex-mathml');
      return directText || isOuterKatex
        ? [{ key: `${index}:${isOuterKatex ? 'katex' : 'text'}`, pixels: Number.parseFloat(getComputedStyle(element).fontSize) }]
        : [];
    });
    const scrollerTravel = scrollers.map((scroller) => {
      const client = scroller.clientWidth;
      const debt = Math.max(0, scroller.scrollWidth - client);
      return {
        client,
        debt,
        ratio: client > 0 ? debt / client : Number.POSITIVE_INFINITY,
      };
    });

    return {
      actualHorizontalScrollOwnerCount: actualHorizontalScrollOwners.length,
      actualVerticalScrollOwnerCount: actualVerticalScrollOwners.length,
      blockBudget: Math.ceil(figure.clientHeight * 0.2),
      blockDebt: Math.max(0, figure.scrollHeight - figure.clientHeight),
      borderedOwnerCount: borderedOwners.length,
      boxCount: markedBoxes.length,
      cardCount: figure.querySelectorAll('[data-diagram-card]').length,
      cellCount: cells.length,
      columnHeaderCount: figure.querySelectorAll('th[scope="col"]').length,
      cueCount: stateSymbols.length,
      cueTexts: stateSymbols.map((cue) => cue.textContent?.trim() ?? ''),
      directOrder: Array.from(figure.children)
        .filter((element) => !element.hasAttribute('data-diagram-full-view-controls'))
        .map((element) => `${element.tagName}.${element.className}`),
      errorOrder: Array.from(figure.querySelectorAll<HTMLElement>('[data-error-kind]')).map(
        (element) => element.dataset.errorKind,
      ),
      fontSizes,
      groupCount: figure.querySelectorAll('[data-group-indices]').length,
      idrefElementCount: idrefElements.length,
      idrefTargetCount: referencedIds.size,
      idrefTokenCount,
      inlineDebt: Math.max(0, figure.scrollWidth - figure.clientWidth),
      mandatoryOwnerCount: mandatoryOwners.size,
      mappingCount: figure.querySelectorAll('[data-output-coordinate]').length,
      mappingOrder: Array.from(
        figure.querySelectorAll<HTMLElement>('[data-output-coordinate]'),
      ).map((element) => element.dataset.outputCoordinate),
      maxScrollerTravel: Math.max(0, ...scrollerTravel.map(({ debt }) => debt)),
      maxScrollerTravelRatio: Math.max(0, ...scrollerTravel.map(({ ratio }) => ratio)),
      problems: [...new Set(problems)],
      reductionCount: figure.querySelectorAll('[data-reduction-operation]').length,
      reductionOrder: Array.from(
        figure.querySelectorAll<HTMLElement>('[data-reduction-operation]'),
      ).map((element) => element.dataset.reductionOperation),
      rejectionFieldCount: rejectionFields.length,
      rowCount: figure.querySelectorAll('table tr').length,
      rowHeaderCount: figure.querySelectorAll('th[scope="row"]').length,
      scrollerCount: scrollers.length,
      scrollerTravel,
      tableCount: figure.querySelectorAll('table[data-diagram-table]').length,
      tbodyCount: figure.querySelectorAll('table tbody').length,
      tdCount: figure.querySelectorAll('td').length,
      theadCount: figure.querySelectorAll('table thead').length,
      viewportHeight: figure.clientHeight,
    };
  });
}

function expectCompleteDiagramGeometry(
  geometry: Awaited<ReturnType<typeof readDiagramGeometry>>,
) {
  expect(geometry.directOrder).toEqual([
    'FIGCAPTION.course-diagram__caption',
    'SECTION.broadcast-panel',
    'SECTION.reductions-panel',
  ]);
  expect(geometry.tableCount).toBe(2);
  expect(geometry.theadCount).toBe(2);
  expect(geometry.tbodyCount).toBe(2);
  expect(geometry.rowCount).toBe(13);
  expect(geometry.cellCount).toBe(58);
  expect(geometry.columnHeaderCount).toBe(9);
  expect(geometry.rowHeaderCount).toBe(11);
  expect(geometry.tdCount).toBe(38);
  expect(geometry.boxCount).toBe(3);
  expect(geometry.cardCount).toBe(1);
  expect(geometry.mandatoryOwnerCount).toBe(62);
  expect(geometry.borderedOwnerCount).toBe(75);
  expect(geometry.scrollerCount).toBe(2);
  expect(geometry.cueCount).toBe(13);
  expect(geometry.cueTexts).toEqual([
    '↻',
    '↻',
    '↻',
    '↻',
    '↻',
    '↻',
    '↻',
    '×',
    '↓',
    '↓',
    '↓',
    '×',
    '×',
  ]);
  expect(geometry.mappingCount).toBe(6);
  expect(geometry.mappingOrder).toEqual(['0,0', '0,1', '0,2', '1,0', '1,1', '1,2']);
  expect(geometry.reductionCount).toBe(3);
  expect(geometry.reductionOrder).toEqual(['sum', 'mean', 'max']);
  expect(geometry.groupCount).toBe(7);
  expect(geometry.errorOrder).toEqual([
    'incompatible-broadcast',
    'empty-mean-axis',
    'empty-max-axis',
  ]);
  expect(geometry.rejectionFieldCount).toBe(3);
  expect(geometry.idrefElementCount).toBe(3);
  expect(geometry.idrefTargetCount).toBe(4);
  expect(geometry.idrefTokenCount).toBe(4);
  expect(geometry.inlineDebt).toBeLessThanOrEqual(2);
  expect(geometry.actualVerticalScrollOwnerCount).toBe(0);
  expect(geometry.problems).toEqual([]);
}

function expectFontsNotShrunk(
  inline: Awaited<ReturnType<typeof readDiagramGeometry>>,
  full: Awaited<ReturnType<typeof readDiagramGeometry>>,
) {
  expect(full.fontSizes.map(({ key }) => key)).toEqual(
    inline.fontSizes.map(({ key }) => key),
  );
  const inlinePixels = new Map(inline.fontSizes.map(({ key, pixels }) => [key, pixels]));
  for (const sample of full.fontSizes) {
    expect(sample.pixels + 0.01, sample.key).toBeGreaterThanOrEqual(
      inlinePixels.get(sample.key) ?? Number.POSITIVE_INFINITY,
    );
  }
}

type FullViewBranch = 'standard' | 'boundary';

async function readFullViewComposition(diagram: Locator) {
  return diagram.evaluate((root) => {
    const figure = root as HTMLElement;
    const rect = (selector: string) => {
      const element = figure.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing full-view composition node ${selector}`);
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
    return {
      actions: rect(':scope > [data-diagram-full-view-controls]'),
      broadcast: rect(':scope > .broadcast-panel'),
      broadcastError: rect(':scope > .broadcast-panel > .broadcast-error'),
      broadcastFacts: rect(':scope > .broadcast-panel > .alignment-facts'),
      broadcastHeading: rect(':scope > .broadcast-panel > h4'),
      broadcastMapping: rect(':scope > .broadcast-panel > .mapping-scroll'),
      broadcastNote: rect(':scope > .broadcast-panel > p'),
      caption: rect(':scope > figcaption'),
      columns: getComputedStyle(figure).gridTemplateColumns.split(/\s+/).filter(Boolean)
        .length,
      direction: getComputedStyle(figure).direction,
      reductions: rect(':scope > .reductions-panel'),
      reductionsHeading: rect(':scope > .reductions-panel > h4'),
      reductionsNote: rect(':scope > .reductions-panel > p'),
      reductionsTable: rect(':scope > .reductions-panel > .reductions-scroll'),
      rows: getComputedStyle(figure).gridTemplateRows.split(/\s+/).filter(Boolean).length,
    };
  });
}

function expectCoherentFullView(
  composition: Awaited<ReturnType<typeof readFullViewComposition>>,
  branch: FullViewBranch,
) {
  type Rect = { bottom: number; height: number; left: number; right: number; top: number; width: number };
  const inlineBefore = (first: Rect, second: Rect) => {
    if (composition.direction === 'rtl') {
      expect(first.left + 1).toBeGreaterThanOrEqual(second.right);
    } else {
      expect(first.right).toBeLessThanOrEqual(second.left + 1);
    }
  };
  const verticallyOverlaps = (first: Rect, second: Rect) =>
    Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top);

  expect(composition.columns).toBe(3);
  expect(composition.rows).toBe(branch === 'standard' ? 2 : 3);
  for (const [name, region] of Object.entries(composition).filter(
    ([name]) => !['columns', 'direction', 'rows'].includes(name),
  ) as Array<[string, Rect]>) {
    expect(region.width, `${name} width`).toBeGreaterThan(0);
    expect(region.height, `${name} height`).toBeGreaterThan(0);
  }

  inlineBefore(composition.caption, composition.actions);
  expect(verticallyOverlaps(composition.caption, composition.actions)).toBeGreaterThan(0);
  expect(
    Math.min(composition.broadcast.top, composition.reductions.top),
  ).toBeGreaterThanOrEqual(
    Math.max(composition.caption.bottom, composition.actions.bottom) - 1,
  );

  if (branch === 'standard') {
    inlineBefore(composition.broadcast, composition.reductions);
    expect(Math.abs(composition.broadcast.top - composition.reductions.top)).toBeLessThanOrEqual(2);
    expect(composition.reductions.width).toBeGreaterThan(composition.broadcast.width);
  } else {
    expect(composition.broadcast.bottom).toBeLessThanOrEqual(composition.reductions.top + 1);
    expect(Math.abs(composition.broadcast.left - composition.reductions.left)).toBeLessThanOrEqual(2);
    expect(Math.abs(composition.broadcast.right - composition.reductions.right)).toBeLessThanOrEqual(2);
    expect(Math.abs(composition.broadcast.width - composition.reductions.width)).toBeLessThanOrEqual(2);
  }

  for (const leading of [
    composition.broadcastHeading,
    composition.broadcastNote,
    composition.broadcastFacts,
  ]) {
    inlineBefore(leading, composition.broadcastMapping);
  }
  expect(
    Math.abs(composition.broadcastHeading.top - composition.broadcastMapping.top),
  ).toBeLessThanOrEqual(2);
  expect(composition.broadcastHeading.bottom).toBeLessThanOrEqual(
    composition.broadcastNote.top + 1,
  );
  expect(composition.broadcastNote.bottom).toBeLessThanOrEqual(
    composition.broadcastFacts.top + 1,
  );
  expect(composition.broadcastError.top).toBeGreaterThanOrEqual(
    Math.max(composition.broadcastFacts.bottom, composition.broadcastMapping.bottom) - 1,
  );

  expect(composition.reductionsHeading.bottom).toBeLessThanOrEqual(
    composition.reductionsNote.top + 1,
  );
  if (branch === 'standard') {
    expect(composition.reductionsNote.bottom).toBeLessThanOrEqual(
      composition.reductionsTable.top + 1,
    );
  } else {
    inlineBefore(composition.reductionsHeading, composition.reductionsTable);
    inlineBefore(composition.reductionsNote, composition.reductionsTable);
    expect(
      Math.abs(composition.reductionsHeading.top - composition.reductionsTable.top),
    ).toBeLessThanOrEqual(2);
  }
}

function expectStandardTravel(
  geometry: Awaited<ReturnType<typeof readDiagramGeometry>>,
) {
  expect(geometry.blockDebt).toBeLessThanOrEqual(
    Math.ceil(geometry.viewportHeight * GEOMETRY_LIMITS.standardBlockDebtRatio),
  );
  expect(geometry.maxScrollerTravel).toBeLessThanOrEqual(
    GEOMETRY_LIMITS.standardScrollerTravelPx,
  );
  expect(geometry.maxScrollerTravelRatio).toBeLessThanOrEqual(
    GEOMETRY_LIMITS.standardScrollerTravelRatio,
  );
}

async function expectDiagramRecords(diagram: Locator, locale: ChapterLocale) {
  const localized = copy[locale];
  await expect(diagram.getByRole('table')).toHaveCount(2);
  await expect(diagram.getByRole('columnheader')).toHaveCount(9);
  await expect(diagram.getByRole('rowheader')).toHaveCount(11);
  await expect(diagram.getByRole('cell')).toHaveCount(38);
  await expect(diagram.locator(':scope > section[data-diagram-box]')).toHaveCount(2);
  await expect(diagram.locator('[data-diagram-box]')).toHaveCount(3);
  await expect(diagram.locator('[data-diagram-card]')).toHaveCount(1);
  await expect(diagram.locator('[data-diagram-scroll]')).toHaveCount(2);

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
        left: row.getAttribute('data-left-coordinate'),
        output: row.getAttribute('data-output-coordinate'),
        right: row.getAttribute('data-right-coordinate'),
        value: row.getAttribute('data-result-value'),
      }))),
  ).toEqual([
    { left: '0,0', output: '0,0', right: '0', value: '11.0' },
    { left: '0,1', output: '0,1', right: '1', value: '22.0' },
    { left: '0,2', output: '0,2', right: '2', value: '33.0' },
    { left: '1,0', output: '1,0', right: '0', value: '14.0' },
    { left: '1,1', output: '1,1', right: '1', value: '25.0' },
    { left: '1,2', output: '1,2', right: '2', value: '36.0' },
  ]);

  const reductions = diagram.locator('[data-reduction-operation]');
  await expect(reductions).toHaveCount(3);
  expect(
    await reductions.evaluateAll((rows) =>
      rows.map((row) => ({
        axis: row.getAttribute('data-reduction-axis'),
        groups: Array.from(row.querySelectorAll('[data-group-indices]')).map((group) =>
          group.getAttribute('data-group-indices'),
        ),
        keepDim: row.getAttribute('data-keep-dim'),
        operation: row.getAttribute('data-reduction-operation'),
        shape: row.getAttribute('data-output-shape'),
        values: row.getAttribute('data-reduction-values'),
      }))),
  ).toEqual([
    {
      axis: '0',
      groups: ['0,3', '1,4', '2,5'],
      keepDim: 'no',
      operation: 'sum',
      shape: '3',
      values: '25.0,47.0,69.0',
    },
    {
      axis: '1',
      groups: ['0,1,2', '3,4,5'],
      keepDim: 'yes',
      operation: 'mean',
      shape: '2,1',
      values: '22.0,25.0',
    },
    {
      axis: '1',
      groups: ['0,1,2', '3,4,5'],
      keepDim: 'no',
      operation: 'max',
      shape: '2',
      values: '33.0,36.0',
    },
  ]);

  const errors = diagram.locator('[data-error-kind]');
  await expect(errors).toHaveCount(3);
  expect(
    await errors.evaluateAll((rows) =>
      rows.map((row) => row.getAttribute('data-error-kind')),
    ),
  ).toEqual(['incompatible-broadcast', 'empty-mean-axis', 'empty-max-axis']);
  await expect(errors.nth(0)).toContainText(localized.incompatibleReason);
  await expect(errors.nth(1)).toContainText(localized.emptyMeanReason);
  await expect(errors.nth(2)).toContainText(localized.emptyMaxReason);
  await expect(errors).toContainText([
    localized.rejected,
    localized.rejected,
    localized.rejected,
  ]);
  await expect(errors.nth(1)).toContainText(localized.notApplicable);
  await expect(errors.nth(2)).toContainText(localized.notApplicable);
  await expect(
    diagram.locator(
      '[data-error-kind="incompatible-broadcast"] annotation[encoding="application/x-tex"]',
    ),
  ).toHaveText(String.raw`3\ne2`);
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
  expect(historyText).not.toMatch(
    /Iliffe|Genie|FORTRAN|TypeScript|build instructions|инструкц(?:ии|ия) сборки/i,
  );
  const historyLinks = historyNodes.locator('a');
  await expect(historyLinks).toHaveCount(historySources.length);
  expect(
    await historyLinks.evaluateAll((links) =>
      links.map((link) => link.getAttribute('href')),
    ),
  ).toEqual(historySources);

  const lessonText = await readMathAwareText(page.locator('.lesson-body'));
  for (const evidence of localized.traversalEvidence) expect(lessonText).toContain(evidence);

  const formula = page
    .locator('.katex-display')
    .filter({
      has: page.locator('annotation[encoding="application/x-tex"]', {
        hasText: formulaLatex,
      }),
    });
  await expect(formula).toHaveCount(1);
  await expect(formula).toHaveCSS('direction', 'ltr');
  await expect(formula.locator('annotation[encoding="application/x-tex"]')).toHaveText(
    formulaLatex,
  );

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
      colors: new Set(
        Array.from(block.querySelectorAll<HTMLElement>('code span[style*="color"]'))
          .map((token) => token.style.color)
          .filter(Boolean),
      ).size,
      direction: block.getAttribute('dir'),
      label: block.getAttribute('aria-label'),
      tabIndex: block.getAttribute('tabindex'),
    })),
  )) {
    expect(evidence.tabIndex).toBe('0');
    expect(evidence.label).toBeTruthy();
    expect(evidence.direction).toBe('ltr');
    expect(evidence.colors).toBeGreaterThan(1);
  }

  await expectVisualizationDecision(page, {
    decision: 'useful',
    id: 'broadcasting-reductions',
  });
  const diagram = page.locator(
    'figure[data-visualization-id="broadcasting-reductions"]',
  );
  await expect(diagram).toHaveAccessibleName(localized.diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(localized.diagramDescription);
  for (const heading of localized.diagramSections) {
    await expect(diagram.getByRole('heading', { name: heading })).toBeVisible();
  }
  await expectDiagramRecords(diagram, locale);
  await settle(page);
  await expectRejectionFieldRows(
    diagram,
    localized.rejectionLabels,
    `${locale} ${narrow ? 'narrow' : 'desktop'}`,
  );
  expectCompleteDiagramGeometry(await readDiagramGeometry(diagram));

  expect(
    await diagram.locator('code, bdi').evaluateAll((nodes) =>
      nodes.every((node) => getComputedStyle(node).direction === 'ltr'),
    ),
  ).toBe(true);
  const regions = diagram.locator('[data-diagram-scroll]');
  for (const region of await regions.all()) {
    await region.focus();
    await expect(region).toBeFocused();
    if (narrow) {
      const widths = await region.evaluate((node) => ({
        client: node.clientWidth,
        scroll: node.scrollWidth,
      }));
      expect(widths.scroll).toBeGreaterThan(widths.client);
    }
  }

  const exerciseDetails = page.locator('.lesson-body details');
  await expect(exerciseDetails).toHaveCount(1);
  await expect(exerciseDetails.locator('summary')).toHaveText(localized.exerciseSummary);
  await exerciseDetails.locator('summary').click();
  await expect(exerciseDetails).toHaveAttribute('open', '');
  await expect(exerciseDetails.locator('ol > li')).toHaveCount(8);

  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

async function enterFullViewAndProveReuse(
  page: Page,
  diagram: Locator,
  locale: ChapterLocale,
) {
  await page.waitForFunction(
    () => document.documentElement.dataset.diagramFullViewReady === 'true',
  );
  await settle(page);
  const toggle = diagram.locator('[data-diagram-full-view-toggle]');
  await expect(toggle).toHaveCount(1);
  await expect(toggle).toBeVisible();
  const markup = await staticDiagramMarkup(diagram);
  const inline = await readDiagramGeometry(diagram);
  expectCompleteDiagramGeometry(inline);
  await diagram.evaluate((root) => {
    (window as typeof window & { __chapterTenFigure?: Element }).__chapterTenFigure = root;
  });

  await toggle.click();
  await page.waitForFunction(
    () =>
      document.fullscreenElement?.getAttribute('data-visualization-id') ===
      'broadcasting-reductions',
  );
  await settle(page);
  expect(
    await diagram.evaluate(
      (root) =>
        root === (window as typeof window & { __chapterTenFigure?: Element }).__chapterTenFigure &&
        document.fullscreenElement === root,
    ),
  ).toBe(true);
  expect(await staticDiagramMarkup(diagram)).toBe(markup);
  await expectDiagramRecords(diagram, locale);
  await expectRejectionFieldRows(diagram, copy[locale].rejectionLabels, `${locale} full view`);
  const full = await readDiagramGeometry(diagram);
  expectCompleteDiagramGeometry(full);
  expectFontsNotShrunk(inline, full);
  return { full, inline, toggle };
}

async function exitFullView(page: Page, toggle: Locator) {
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.fullscreenElement === null);
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
}

test.describe(
  'chapter 10 localized broadcasting-reductions vertical slice',
  { tag: chapterTag(chapterId) },
  () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(({ browserName }) => {
      if (browserName !== 'firefox') {
        throw new Error(
          `Chapter 10 browser validation requires Firefox; received ${browserName}.`,
        );
      }
    });

    test('chapter 10 is tenth on every course index with direct equivalent locale routes', async ({
      page,
    }) => {
      for (const locale of chapterLocales) {
        const localized = copy[locale];
        const localeDefinition = chapterLocaleDefinitions.find(({ code }) => code === locale);
        expect(localeDefinition).toBeDefined();
        const chapters = await readOrderedCourseChapters(page, locale);
        expect(chapters.length).toBeGreaterThanOrEqual(10);
        expect(chapters[9]).toEqual(
          expect.objectContaining({ chapterId, order: 10, title: localized.chapterTitle }),
        );
        await expect(page.locator('html')).toHaveAttribute(
          'lang',
          localeDefinition?.languageTag ?? '',
        );
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
        for (const target of chapterLocaleDefinitions.filter(
          ({ code }) => code !== source.code,
        )) {
          await page.goto(chapterPath(source.code, chapterId));
          const switchLink = page.locator(`.locale-switch a[data-locale="${target.code}"]`);
          await expect(switchLink).not.toHaveAttribute(
            'data-locale-fallback',
            'course-index',
          );
          await switchLink.click();
          await expect(page).toHaveURL(
            new RegExp(`${chapterPath(target.code, chapterId)}$`),
          );
          await expect(page.locator('html')).toHaveAttribute('lang', target.languageTag);
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
      test(`chapter 10 ${locale} renders exact content and geometry at desktop and narrow widths`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: 1440, height: 1000 });
        const chapters = await readOrderedCourseChapters(page, locale);
        await page.goto(chapterPath(locale, chapterId));
        await expectChapterContent(page, locale, chapters, false);

        await page.setViewportSize({ width: 390, height: 844 });
        await page.reload();
        await expectChapterContent(page, locale, chapters, true);
      });
    }

    test('both locales reuse the semantic figure in the standard bounded full view', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1366, height: 768 });
      for (const locale of chapterLocales) {
        await page.goto(chapterPath(locale, chapterId));
        const diagram = page.locator(
          'figure[data-visualization-id="broadcasting-reductions"]',
        );
        const { full, toggle } = await enterFullViewAndProveReuse(page, diagram, locale);
        expectCoherentFullView(await readFullViewComposition(diagram), 'standard');
        expectStandardTravel(full);
        await exitFullView(page, toggle);
        await expectNoOverflowOrClientScripts(page);
      }
    });

    test('the exact minimum eligible surface uses the coherent Firefox composition', async ({
      browser,
    }, testInfo) => {
      const baseURL = testInfo.project.use.baseURL;
      if (typeof baseURL !== 'string') throw new Error('Playwright baseURL is required');
      const context = await browser.newContext({
        baseURL,
        screen: {
          width: GEOMETRY_LIMITS.minimumSurfaceWidth,
          height: GEOMETRY_LIMITS.minimumSurfaceHeight,
        },
        viewport: {
          width: GEOMETRY_LIMITS.minimumSurfaceWidth,
          height: GEOMETRY_LIMITS.minimumSurfaceHeight,
        },
      });
      const page = await context.newPage();

      try {
        for (const locale of chapterLocales) {
          await page.goto(chapterPath(locale, chapterId));
          const diagram = page.locator(
            'figure[data-visualization-id="broadcasting-reductions"]',
          );
          const { full, toggle } = await enterFullViewAndProveReuse(page, diagram, locale);
          const surface = await page.evaluate(() => ({
            innerHeight,
            innerWidth,
            screenHeight: screen.height,
            screenWidth: screen.width,
          }));
          expect(surface.screenWidth).toBe(GEOMETRY_LIMITS.minimumSurfaceWidth);
          expect(surface.screenHeight).toBe(GEOMETRY_LIMITS.minimumSurfaceHeight);
          expect(surface.innerWidth).toBeGreaterThanOrEqual(1366);
          expect(surface.innerHeight).toBeGreaterThanOrEqual(768);
          expectCoherentFullView(await readFullViewComposition(diagram), 'standard');
          expectStandardTravel(full);
          await exitFullView(page, toggle);
        }
      } finally {
        await context.close();
      }
    });

    test('Russian preserves every cue, technical direction, and composition in forced colors and RTL', async ({
      page,
    }) => {
      await page.emulateMedia({ forcedColors: 'active' });
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.goto(chapterPath('ru', chapterId));
      await page.waitForFunction(
        () => document.documentElement.dataset.diagramFullViewReady === 'true',
      );
      const diagram = page.locator(
        'figure[data-visualization-id="broadcasting-reductions"]',
      );
      await diagram.evaluate((node) => node.setAttribute('dir', 'rtl'));
      await settle(page);

      const readDirectionAndCues = () =>
        diagram.evaluate((root) => {
          const completeBorder = (element: HTMLElement) => {
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
              styles.every((value) => !['none', 'hidden'].includes(value))
            );
          };
          const cues = Array.from(root.querySelectorAll<HTMLElement>('.state-symbol'));
          return {
            cueBorders: cues.map(completeBorder),
            cueTexts: cues.map((cue) => cue.textContent?.trim()),
            direction: getComputedStyle(root).direction,
            forcedColors: matchMedia('(forced-colors: active)').matches,
            proseDirections: Array.from(
              root.querySelectorAll<HTMLElement>('h3, h4, h5, p, li, th, td, dt, dd'),
            ).map((element) => getComputedStyle(element).direction),
            technicalDirections: Array.from(
              root.querySelectorAll<HTMLElement>('code, bdi'),
            ).map((element) => getComputedStyle(element).direction),
          };
        });

      const inline = await readDirectionAndCues();
      expect(inline.forcedColors).toBe(true);
      expect(inline.direction).toBe('rtl');
      expect(inline.cueTexts).toHaveLength(13);
      expect(inline.cueBorders.every(Boolean)).toBe(true);
      expect(inline.proseDirections.every((direction) => direction === 'rtl')).toBe(true);
      expect(inline.technicalDirections.every((direction) => direction === 'ltr')).toBe(true);
      await expectDiagramRecords(diagram, 'ru');
      expectCompleteDiagramGeometry(await readDiagramGeometry(diagram));

      const { full, toggle } = await enterFullViewAndProveReuse(page, diagram, 'ru');
      expectCoherentFullView(await readFullViewComposition(diagram), 'standard');
      expectStandardTravel(full);
      const expanded = await readDirectionAndCues();
      expect(expanded.forcedColors).toBe(true);
      expect(expanded.direction).toBe('rtl');
      expect(expanded.cueTexts).toHaveLength(13);
      expect(expanded.cueBorders.every(Boolean)).toBe(true);
      expect(expanded.proseDirections.every((direction) => direction === 'rtl')).toBe(true);
      expect(expanded.technicalDirections.every((direction) => direction === 'ltr')).toBe(true);
      await exitFullView(page, toggle);
      await expectNoOverflowOrClientScripts(page);
    });

  },
);
