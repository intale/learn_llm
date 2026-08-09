// @ts-ignore Node APIs are available in the Playwright test runner.
import { readFileSync } from 'node:fs';
// @ts-ignore Node APIs are available in the Playwright test runner.
import { resolve } from 'node:path';

import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';

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

const chapterId = '15-tensor-autodiff-core';
const contentRevision = 9;
const visualizationIds = [
  'tensor-autodiff-core',
  'tensor-autodiff-reverse',
  'tensor-autodiff-outcomes',
] as const;
type VisualizationId = (typeof visualizationIds)[number];
const formulaLatex = String.raw`\bar{p(e)}\mathrel{+}=J_e^\top\bar{c(e)},\qquad e\in E`;
const repositoryRoot = resolve(process.cwd(), '..');
const normalizeProse = (value: string) =>
  value
    .normalize('NFC')
    .replace(/\u00a0/g, ' ')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
const historySources = [
  'https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf',
  'https://www.usenix.org/system/files/conference/osdi16/osdi16-abadi.pdf',
  'https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf',
  'https://cdn.openai.com/better-language-models/language-models.pdf',
] as const;

interface LocalizedCopy {
  revisionLabel: string;
  title: string;
  description: string;
  headings: readonly string[];
  historyHeading: string;
  historyFragments: readonly string[];
  revisionInvariantFragments: readonly string[];
  figures: Readonly<Record<VisualizationId, Readonly<{
    title: string;
    description: string;
    sections: readonly string[];
    terms: readonly string[];
  }>>>;
}

const copy: Record<ChapterLocale, LocalizedCopy> = {
  en: {
    revisionLabel: 'Content revision',
    title: 'Reverse tensor operations with edge-local VJPs',
    description:
      'Build a Rust tensor autodiff tape, reverse shape transformations, broadcasts, and reductions with edge-local VJPs, and verify gradients for LLM training.',
    headings: [
      'Predict one shape-changing tensor graph',
      'Apply one edge-local VJP instead of building a Jacobian',
      'Name the tensors, map, and adjoints',
      'From explicit next-word updates to reusable tensor pullbacks',
      'Own tensor primals and save only local context',
      'Follow shape restoration in three focused views',
      'Predict before running Rust',
      'Prepare model-critical tensor gradients',
    ],
    historyHeading: 'From explicit next-word updates to reusable tensor pullbacks',
    historyFragments: [
      'gradient flow from a next-word loss back to the model parameters',
      'deep models with many repeated blocks that change tensor shapes',
      'finds every backward path from a loss to parameters',
      'one local vector-Jacobian product for each operand use',
      "their symbolic graph does not prescribe this implementation's owned eager tape",
    ],
    revisionInvariantFragments: [
      'Primal revisions are runtime tape-validity metadata',
      'are not serialized in model checkpoints',
      "that edge captures the parent's current primal revision",
      'the old edge still reaches the same node, but the retained context belongs to the earlier value',
      'Backward first verifies that the selected output still has graph context',
      'the seed has exactly the output shape and contains only finite values',
      'This revision scan finishes before backward applies any VJP',
      'The caller must run a new forward pass',
      'The projection maps every axis of one logical traversal shape to an effective stride',
      'Effective source strides [1,0] retain the upstream row stride',
      'source offsets [0,0,0,1,1,1]',
      'destination offsets [0,1,2,0,1,2]',
      'An empty traversal emits no offset and performs no read',
    ],
    figures: {
      'tensor-autodiff-core': {
        title: 'Build the tensor graph without losing an operand use',
        description:
          'Inspect eight forward nodes in topological order, with every operation, shape, value, pass-local adjoint, and all eight ordered operand edges.',
        sections: ['Build one shape-changing tensor graph'],
        terms: ['Pass-local adjoint'],
      },
      'tensor-autodiff-reverse': {
        title: 'Reverse the non-scalar seed through all eight edges',
        description:
          'Follow seed [3, 6] from reverse order 0 through 7, pairing every edge with its upstream adjoint, local VJP, reduced axes, saved context, exact parent shape, and parent contribution.',
        sections: ['Pull the non-scalar seed through every edge'],
        terms: ['Other operand'],
      },
      'tensor-autodiff-outcomes': {
        title: 'Separate stored gradients, graph lifecycle, checks, and rejections',
        description:
          'Compare retained accumulation, zeroing, release, detach, sampled checks, and four rejected requests without mixing pass-local adjoints with stored parameter gradients.',
        sections: [
          'Restore exact parameter shapes',
          'Retain, accumulate, zero, release',
          'Check sum, detach, and every VJP',
          'Reject unsafe requests without mutation',
        ],
        terms: [
          'Stored gradient',
          'Sampled flat coordinates',
          'detached branch gradient path cut',
          'releasing pass recomputed and committed one-pass gradients',
        ],
      },
    },
  },
  ru: {
    revisionLabel: 'Версия материала',
    title: 'Обратный проход по тензорному графу с локальными VJP',
    description:
      'Постройте на Rust ленту автоматического дифференцирования тензоров. Реализуйте для каждого ребра локальное произведение вектора на якобиан (VJP), корректно проводите обратный проход через преобразования формы, согласование форм и редукции и проверяйте градиенты, необходимые для обучения LLM.',
    headings: [
      'Предскажите граф тензоров с изменениями формы',
      'Применяйте VJP для каждого ребра вместо построения якобиана',
      'Назовите тензоры, отображение и сопряжённые величины',
      'От явных уравнений для модели следующего слова к переиспользуемым тензорным VJP',
      'Храните значения тензоров из прямого прохода и сохраняйте локальный контекст',
      'Проследите восстановление формы на трёх отдельных схемах',
      'Сначала предскажите, затем запускайте Rust',
      'Подготовьте градиенты ключевых операций модели',
    ],
    historyHeading:
      'От явных уравнений для модели следующего слова к переиспользуемым тензорным VJP',
    historyFragments: [
      'распространение градиента от функции потерь для следующего слова назад к параметрам модели',
      'множества повторяющихся блоков, внутри которых меняется форма тензоров',
      'находит все обратные пути от функции потерь к параметрам',
      'каждому использованию тензора на входе операции сопоставляется локальное произведение вектора на якобиан',
      'ленту с немедленным выполнением, в которой каждый узел владеет своим тензором',
    ],
    revisionInvariantFragments: [
      'Номера версий — служебные данные времени выполнения',
      'не записываются в контрольные точки модели',
      'лента записывает текущий номер версии тензора прямого прохода родителя',
      'Старое ребро по-прежнему будет вести к этому узлу',
      'Сначала обратный проход проверяет, что контекст выбранного выхода ещё существует',
      'форма начальной сопряжённой величины точно совпадает с формой выхода',
      'Вся проверка версий завершается до вычисления любого VJP',
      'необходимо выполнить новый прямой проход',
      'Проекция сопоставляет каждой оси формы логического обхода эффективный шаг',
      'Эффективные шаги источника равны [1,0]: шаг 1 выбирает следующий элемент величины [3,6]',
      'смещения источника [0,0,0,1,1,1]',
      'смещения назначения [0,1,2,0,1,2]',
      'Пустой обход не выдаёт ни одного смещения и ничего не читает',
    ],
    figures: {
      'tensor-autodiff-core': {
        title: 'Постройте тензорный граф, не потеряв ни одного использования операнда',
        description:
          'Проследите восемь узлов прямого прохода в топологическом порядке: для каждого указаны операция, форма, значения и сопряжённая величина текущего прохода, а также сохранены все восемь упорядоченных рёбер использования операндов.',
        sections: ['Постройте один граф с изменениями формы'],
        terms: ['Сопряжённая величина текущего прохода'],
      },
      'tensor-autodiff-reverse': {
        title: 'Распространите нескалярную начальную сопряжённую величину назад по всем восьми рёбрам',
        description:
          'Проследите начальную сопряжённую величину [3, 6] в порядке обратного прохода от 0 до 7: для каждого ребра сопоставьте входящую сопряжённую величину, локальный VJP, оси редукции, сохранённый контекст, точную форму родителя и вклад в родителя.',
        sections: ['Распространите начальную сопряжённую величину назад по каждому ребру'],
        terms: ['Другой операнд'],
      },
      'tensor-autodiff-outcomes': {
        title: 'Сопоставьте накопленные градиенты, состояния графа, проверки и отклонённые запросы',
        description:
          'Сравните первый и второй проходы с сохранением графа, обнуление, освобождающий проход, detach, выборочные проверки градиентов и четыре отклонённых запроса, не смешивая сопряжённые величины текущего прохода с накопленными градиентами параметров.',
        sections: [
          'Восстановите точные формы параметров',
          'Сохраняйте, накапливайте, обнуляйте, освобождайте',
          'Проверьте сумму, detach и каждый VJP',
          'Отклоняйте недопустимые запросы без изменения состояния',
        ],
        terms: [
          'Накопленный градиент',
          'Выбранные плоские координаты',
          'путь градиента отсоединённой ветви прерван',
          'освобождающий проход заново вычислил и записал градиенты одного прохода',
        ],
      },
    },
  },
};

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
  ['rust/demos/ch15-tensor-autodiff-core/src/lib.rs', 'shared-tensor-vjp-fixture'],
  ['rust/crates/llm-from-scratch/src/autograd/tensor_core.rs', 'tensor-tape-values'],
  ['rust/crates/llm-from-scratch/src/autograd/tensor_core.rs', 'tensor-forward-operations'],
  ['rust/crates/llm-from-scratch/src/autograd/tensor_core.rs', 'tensor-structural-vjps'],
  ['rust/crates/llm-from-scratch/src/autograd/tensor_core.rs', 'tensor-reverse-pass'],
  ['rust/demos/ch15-tensor-autodiff-core/src/lib.rs', 'tensor-autodiff-lifecycle-gradcheck'],
  ['rust/crates/llm-from-scratch/src/autograd/tensor_core.rs', 'tensor-autodiff-errors'],
  ['rust/demos/ch15-tensor-autodiff-core/src/main.rs', 'learner-tensor-autodiff-output'],
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

async function readDiagramAudit(diagram: Locator) {
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
        Number.parseFloat(style.opacity) > 0 &&
        rect.width > 0 &&
        rect.height > 0
      );
    };
    const describe = (element: HTMLElement) => {
      const identifier =
        element.dataset.edgeReverse ??
        element.dataset.nodeLabel ??
        element.dataset.lifecycleState ??
        element.dataset.evidence ??
        element.dataset.errorKind ??
        '';
      const classes = [...element.classList].slice(0, 2).join('.');
      return `${element.tagName.toLowerCase()}${classes ? `.${classes}` : ''}${
        identifier ? `[${identifier}]` : ''
      }`;
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
    const concealed = (element: HTMLElement) => {
      const style = getComputedStyle(element);
      const webkitLineClamp = style.getPropertyValue('-webkit-line-clamp');
      const clipPath = style.getPropertyValue('clip-path');
      const maskImage = style.getPropertyValue('mask-image');
      const filter = style.getPropertyValue('filter');
      return (
        [style.overflowX, style.overflowY].some((value) =>
          ['hidden', 'clip'].includes(value),
        ) ||
        /(?:paint|strict|content)/.test(style.contain) ||
        style.contentVisibility === 'hidden' ||
        style.textOverflow === 'ellipsis' ||
        (webkitLineClamp !== '' && webkitLineClamp !== 'none') ||
        Boolean(clipPath && clipPath !== 'none') ||
        Boolean(maskImage && maskImage !== 'none') ||
        Boolean(filter && filter !== 'none')
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
        (child.left >= owner.left - tolerance && child.right <= owner.right + tolerance)) &&
      (!checkBlock ||
        (child.top >= owner.top - tolerance && child.bottom <= owner.bottom + tolerance));

    const visibleElements = allElements.filter(
      (element) => !ignored(element) && visible(element),
    );
    let localVerticalOwnerCount = 0;
    let undeclaredHorizontalOwnerCount = 0;
    for (const [index, element] of allElements.entries()) {
      if (ignored(element)) continue;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const directText = [...element.childNodes].some(
        (child) => child.nodeType === Node.TEXT_NODE && Boolean(child.textContent?.trim()),
      );
      if (
        style.display === 'none' ||
        ['hidden', 'collapse'].includes(style.visibility) ||
        Number.parseFloat(style.opacity) <= 0
      ) {
        problems.push(`element-${index} ${describe(element)} is concealed`);
      }
      if (directText && (rect.width <= 0 || rect.height <= 0)) {
        problems.push(`element-${index} ${describe(element)} has no painted area`);
      }
      if (concealed(element)) {
        problems.push(`element-${index} ${describe(element)} conceals overflow or paint`);
      }
      if (directText && transparent(style.color)) {
        problems.push(`element-${index} ${describe(element)} paints transparent text`);
      }
      if (
        style.transform !== 'none' ||
        !['', '1', 'normal'].includes(style.getPropertyValue('zoom'))
      ) {
        problems.push(`element-${index} ${describe(element)} is scaled or transformed`);
      }
      if (Number.parseFloat(style.textIndent) < -tolerance) {
        problems.push(`element-${index} ${describe(element)} hides text off canvas`);
      }
      if (
        element !== figure &&
        visible(element) &&
        element.clientWidth > 0 &&
        element.clientHeight > 0
      ) {
        const inlineDebt = Math.max(0, element.scrollWidth - element.clientWidth);
        const blockDebt = Math.max(0, element.scrollHeight - element.clientHeight);
        const horizontalOwner = ['auto', 'scroll'].includes(style.overflowX);
        const verticalOwnerWithTravel =
          style.overflowY === 'scroll' || blockDebt > tolerance;
        if (
          (horizontalOwner || inlineDebt > tolerance) &&
          !element.hasAttribute('data-diagram-scroll')
        ) {
          undeclaredHorizontalOwnerCount += 1;
          problems.push(
            `element-${index} ${describe(element)} is an undeclared horizontal owner/debt ${inlineDebt}`,
          );
        }
        if (verticalOwnerWithTravel) {
          localVerticalOwnerCount += 1;
          problems.push(
            `element-${index} ${describe(element)} has private vertical owner/debt ${blockDebt}`,
          );
        }
      }
    }

    const markedBoxes = visibleElements.filter((element) =>
      element.hasAttribute('data-diagram-box'),
    );
    const borderedOwners = visibleElements.filter((element) => completeBorder(element));
    const boundedOwners = new Set<HTMLElement>([...markedBoxes, ...borderedOwners]);
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
      const rect = owner.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        problems.push(`owner-${index} ${describe(owner)} has no painted area`);
      }
      const inlineDebt = Math.max(0, owner.scrollWidth - owner.clientWidth);
      const blockDebt = Math.max(0, owner.scrollHeight - owner.clientHeight);
      if (owner !== figure && blockDebt > tolerance) {
        problems.push(`owner-${index} ${describe(owner)} has block debt ${blockDebt}`);
      }
      if (
        owner !== figure &&
        !owner.matches('[data-diagram-scroll]') &&
        inlineDebt > tolerance
      ) {
        problems.push(`owner-${index} ${describe(owner)} has inline debt ${inlineDebt}`);
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
        problems.push(`owner-${index} ${describe(owner)} escapes its nearest owner`);
      }
    }

    const cards = Array.from(
      figure.querySelectorAll<HTMLElement>('[data-diagram-card]'),
    ).filter(visible);
    for (let first = 0; first < cards.length; first += 1) {
      for (let second = first + 1; second < cards.length; second += 1) {
        const a = cards[first]!;
        const b = cards[second]!;
        if (a.contains(b) || b.contains(a)) continue;
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        const overlapInline = Math.min(ar.right, br.right) - Math.max(ar.left, br.left);
        const overlapBlock = Math.min(ar.bottom, br.bottom) - Math.max(ar.top, br.top);
        if (overlapInline > tolerance && overlapBlock > tolerance) {
          problems.push(`${describe(a)} overlaps ${describe(b)}`);
        }
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
        problems.push(`scroller-${index} lacks its named keyboard region contract`);
      }
      if (
        scroller.hasAttribute('data-diagram-box') ||
        scroller.hasAttribute('data-diagram-card')
      ) {
        problems.push(`scroller-${index} also claims bounded ownership`);
      }
      if (scroller.scrollHeight - scroller.clientHeight > tolerance) {
        problems.push(`scroller-${index} has private vertical travel`);
      }
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
        if (ids.length === 0) {
          problems.push(`idref-${index} has an empty ${attribute}`);
          continue;
        }
        for (const id of ids) {
          referencedIds.add(id);
          idrefTokenCount += 1;
          const matches = document.querySelectorAll<HTMLElement>(`#${CSS.escape(id)}`);
          if (
            matches.length !== 1 ||
            !matches[0]?.textContent?.trim() ||
            !figure.contains(matches[0])
          ) {
            problems.push(`idref-${index} ${attribute} does not resolve ${id} once`);
          }
        }
      }
    }

    const walker = document.createTreeWalker(figure, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const textNode = walker.currentNode as Text;
      if (!textNode.textContent?.trim()) continue;
      const parent = textNode.parentElement;
      if (!parent || ignored(parent) || !visible(parent)) continue;
      const owner = nearestOwner(parent);
      if (!owner) continue;
      const scroller = parent.closest<HTMLElement>('[data-diagram-scroll]');
      const checkInline = !scroller || scroller.contains(owner);
      const range = document.createRange();
      range.selectNodeContents(textNode);
      const positivePaints = Array.from(range.getClientRects()).filter(
        (paint) => paint.width > 0 && paint.height > 0,
      );
      if (positivePaints.length === 0) {
        problems.push(`${describe(parent)} has nonblank text with no positive paint rect`);
        continue;
      }
      for (const paint of positivePaints) {
        if (
          !within(paint, innerRect(owner), checkInline, owner !== figure)
        ) {
          problems.push(`${describe(parent)} paints outside ${describe(owner)}`);
          break;
        }
      }
    }

    for (const [index, replaced] of Array.from(
      figure.querySelectorAll<HTMLElement>('img, svg, math, .katex'),
    ).entries()) {
      if (!visible(replaced) || ignored(replaced)) continue;
      const owner = nearestOwner(replaced.parentElement);
      if (owner && !within(replaced.getBoundingClientRect(), innerRect(owner), true, owner !== figure)) {
        problems.push(`replaced-${index} ${describe(replaced)} paints outside its owner`);
      }
    }

    for (const [tableIndex, table] of Array.from(
      figure.querySelectorAll<HTMLTableElement>('table[data-diagram-table]'),
    ).entries()) {
      if (getComputedStyle(table).display !== 'table') {
        problems.push(`table-${tableIndex} is not a native table`);
      }
      if (!table.tHead || getComputedStyle(table.tHead).display !== 'table-header-group') {
        problems.push(`table-${tableIndex} lost its native header group`);
      }
      for (const body of Array.from(table.tBodies)) {
        if (getComputedStyle(body).display !== 'table-row-group') {
          problems.push(`table-${tableIndex} lost its native body group`);
        }
      }
      for (const [headerIndex, header] of Array.from(
        table.querySelectorAll<HTMLTableCellElement>('thead th'),
      ).entries()) {
        const walker = document.createTreeWalker(header, NodeFilter.SHOW_TEXT);
        let wordIndex = 0;
        while (walker.nextNode()) {
          const textNode = walker.currentNode as Text;
          for (const match of textNode.data.matchAll(/\S+/gu)) {
            const start = match.index ?? -1;
            if (start < 0) continue;
            const range = document.createRange();
            range.setStart(textNode, start);
            range.setEnd(textNode, start + match[0].length);
            const paints = Array.from(range.getClientRects()).filter(
              (paint) => paint.width > 0 && paint.height > 0,
            );
            if (paints.length !== 1) {
              problems.push(
                `table-${tableIndex} header-${headerIndex} word-${wordIndex} fragments into ${paints.length} paint rects`,
              );
            }
            wordIndex += 1;
          }
        }
      }
      for (const [rowIndex, row] of Array.from(table.rows).entries()) {
        const rowRect = row.getBoundingClientRect();
        if (getComputedStyle(row).display !== 'table-row') {
          problems.push(`table-${tableIndex} row-${rowIndex} is not a native row`);
        }
        if (row.cells.length !== 9) {
          problems.push(`table-${tableIndex} row-${rowIndex} does not have nine cells`);
        }
        for (const [cellIndex, cell] of Array.from(row.cells).entries()) {
          const cellRect = cell.getBoundingClientRect();
          if (getComputedStyle(cell).display !== 'table-cell') {
            problems.push(`table-${tableIndex} row-${rowIndex} cell-${cellIndex} is not table-cell`);
          }
          if (!completeBorder(cell)) {
            problems.push(`table-${tableIndex} row-${rowIndex} cell-${cellIndex} lacks four borders`);
          }
          if (
            Math.abs(cellRect.top - rowRect.top) > 1 ||
            Math.abs(cellRect.bottom - rowRect.bottom) > 1
          ) {
            problems.push(`table-${tableIndex} row-${rowIndex} cell-${cellIndex} does not fill row`);
          }
        }
      }
    }

    const ruleCells = Array.from(
      figure.querySelectorAll<HTMLTableCellElement>('tbody td[aria-describedby]'),
    );
    for (const [index, cell] of ruleCells.entries()) {
      const id = cell.getAttribute('aria-describedby') ?? '';
      const target = id ? document.getElementById(id) : null;
      if (!target || !figure.contains(target) || !target.textContent?.trim() || !visible(target)) {
        problems.push(`rule-cell-${index} lacks its visible rule-key association`);
      }
    }

    const fontSizes = allElements.flatMap((element, index) => {
      if (ignored(element) || !visible(element)) return [];
      const directText = [...element.childNodes].some(
        (child) => child.nodeType === Node.TEXT_NODE && Boolean(child.textContent?.trim()),
      );
      return directText
        ? [{ index, pixels: Number.parseFloat(getComputedStyle(element).fontSize) }]
        : [];
    });
    const directOrder = Array.from(figure.children)
      .filter((element) => !element.hasAttribute('data-diagram-full-view-controls'))
      .map((element) => `${element.tagName}.${element.className}`);
    const scrollerTravel = scrollers.map((scroller) => ({
      client: scroller.clientWidth,
      debt: Math.max(0, scroller.scrollWidth - scroller.clientWidth),
    }));

    return {
      blockDebt: Math.max(0, figure.scrollHeight - figure.clientHeight),
      borderedOwnerCount: borderedOwners.length,
      boxCount: markedBoxes.length,
      cardCount: figure.querySelectorAll('[data-diagram-card]').length,
      cellCount: figure.querySelectorAll('th, td').length,
      columnHeaderCount: figure.querySelectorAll('th[scope="col"]').length,
      cueCount: figure.querySelectorAll('.state-symbol').length,
      directOrder,
      errorCount: figure.querySelectorAll('[data-error-kind]').length,
      evidenceCount: figure.querySelectorAll('[data-evidence]').length,
      fontSizes,
      fullscreen: document.fullscreenElement === figure,
      gradientCount: figure.querySelectorAll(
        '[data-parameter-gradient][data-backward-pass]',
      ).length,
      idrefElementCount: idrefElements.length,
      idrefTargetCount: referencedIds.size,
      idrefTokenCount,
      inlineDebt: Math.max(0, figure.scrollWidth - figure.clientWidth),
      lifecycleCount: figure.querySelectorAll('[data-lifecycle-state]').length,
      listCount: figure.querySelectorAll('ol, ul').length,
      listItemCount: figure.querySelectorAll('li').length,
      localVerticalOwnerCount,
      nodeCount: figure.querySelectorAll('[data-node-id]').length,
      operandCount: figure.querySelectorAll('.operand-list > li').length,
      problems: [...new Set(problems)],
      reverseRowCount: figure.querySelectorAll('tr[data-edge-reverse]').length,
      rootOverflowY: getComputedStyle(figure).overflowY,
      rowCount: figure.querySelectorAll('table tr').length,
      rowHeaderCount: figure.querySelectorAll('th[scope="row"]').length,
      ruleAssociationCount: ruleCells.length,
      ruleKeyCount: figure.querySelectorAll('.rule-key > div').length,
      scrollerCount: scrollers.length,
      scrollerTravel,
      summaryCount: figure.querySelectorAll('.summary-grid > div').length,
      tableCount: figure.querySelectorAll('table[data-diagram-table]').length,
      undeclaredHorizontalOwnerCount,
      viewportHeight: figure.clientHeight,
      viewportWidth: figure.clientWidth,
    };
  });
}

async function readReadableFlow(diagram: Locator, id: VisualizationId) {
  return diagram.evaluate((root, visualizationId) => {
    const figure = root as HTMLElement;
    const tolerance = 2;
    const definitions: Record<VisualizationId, readonly [string, string][]> = {
      'tensor-autodiff-core': [
        ['caption', ':scope > figcaption'],
        ['caption-field', ':scope > figcaption > h3, :scope > figcaption > p'],
        ['summary', ':scope > .summary-grid > div'],
        ['graph-panel', ':scope > .graph-section'],
        ['node', '.node-grid > [data-node-id]'],
        ['node-fact', '.node-card > dl > div'],
        ['operand', '.operand-list > li'],
      ],
      'tensor-autodiff-reverse': [
        ['caption', ':scope > figcaption'],
        ['caption-field', ':scope > figcaption > h3, :scope > figcaption > p'],
        ['reverse-panel', ':scope > .reverse-section'],
        ['rule', '.rule-key > div'],
        ['reverse-table', '.vjp-table'],
        ['edge', 'tr[data-edge-reverse]'],
        ['edge-field', '.vjp-table th, .vjp-table td'],
      ],
      'tensor-autodiff-outcomes': [
        ['caption', ':scope > figcaption'],
        ['caption-field', ':scope > figcaption > h3, :scope > figcaption > p'],
        [
          'outcome-panel',
          ':scope > .gradients-section, :scope > .lifecycle-section, :scope > .checks-section, :scope > .errors-section',
        ],
        ['outcome-record', '[data-diagram-card]'],
        ['outcome-field', '[data-diagram-card] dl > div, .error-card > code'],
      ],
    };
    const siblingIndex = (element: Element) =>
      element.parentElement ? Array.from(element.parentElement.children).indexOf(element) : -1;
    const semanticIdentity = (element: HTMLElement) => {
      const direct =
        element.dataset.nodeId ??
        element.dataset.edgeReverse ??
        (element.dataset.parameterGradient && element.dataset.backwardPass
          ? `${element.dataset.parameterGradient}-${element.dataset.backwardPass}`
          : undefined) ??
        element.dataset.lifecycleState ??
        element.dataset.evidence ??
        element.dataset.errorKind;
      if (direct) return direct;
      const node = element.closest<HTMLElement>('[data-node-id]');
      if (node) return `node-${node.dataset.nodeId}-part-${siblingIndex(element)}`;
      const edge = element.closest<HTMLElement>('tr[data-edge-reverse]');
      if (edge) return `edge-${edge.dataset.edgeReverse}-field-${siblingIndex(element)}`;
      const outcome = element.closest<HTMLElement>(
        '[data-backward-pass], [data-lifecycle-state], [data-evidence], [data-error-kind]',
      );
      if (outcome) {
        const outcomeId =
          (outcome.dataset.parameterGradient && outcome.dataset.backwardPass
            ? `${outcome.dataset.parameterGradient}-${outcome.dataset.backwardPass}`
            : undefined) ??
          outcome.dataset.lifecycleState ??
          outcome.dataset.evidence ??
          outcome.dataset.errorKind;
        return `outcome-${outcomeId}-part-${siblingIndex(element)}`;
      }
      return null;
    };
    const entities = definitions[visualizationId].flatMap(([kind, selector]) =>
      Array.from(figure.querySelectorAll<HTMLElement>(selector)).map((element, index) => {
        const rect = element.getBoundingClientRect();
        return {
          key: `${kind}:${semanticIdentity(element) ?? index}`,
          width: rect.width,
        };
      }),
    );
    const peerSelectors: Record<VisualizationId, readonly [string, string][]> = {
      'tensor-autodiff-core': [
        ['summary', ':scope > .summary-grid'],
        ['nodes', '.node-grid'],
        ['node-facts', '.node-card > dl'],
        ['operands', '.operand-list'],
      ],
      'tensor-autodiff-reverse': [['rules', '.rule-key']],
      'tensor-autodiff-outcomes': [
        ['gradients', '.gradient-grid'],
        ['lifecycle', '.lifecycle-grid'],
        ['checks', '.check-grid'],
        ['errors', '.error-grid'],
      ],
    };
    const peerColumns = peerSelectors[visualizationId].flatMap(([kind, selector]) =>
      Array.from(figure.querySelectorAll<HTMLElement>(selector)).map((owner, index) => {
        const children = Array.from(owner.children).map((child) =>
          child.getBoundingClientRect(),
        );
        const columns = children.reduce(
          (maximum, candidate) =>
            Math.max(
              maximum,
              children.filter((peer) => Math.abs(peer.top - candidate.top) <= tolerance)
                .length,
            ),
          0,
        );
        const semanticOwner = owner.closest<HTMLElement>(
          '[data-node-id], [data-backward-pass], [data-lifecycle-state], [data-evidence], [data-error-kind]',
        );
        return {
          columns,
          key: `${kind}:${semanticOwner ? semanticIdentity(semanticOwner) : index}`,
        };
      }),
    );
    const explicit = (...selectors: string[]) =>
      selectors.map((selector) => figure.querySelector<HTMLElement>(selector)).filter(
        (element): element is HTMLElement => Boolean(element),
      );
    const flowGroups: readonly [string, readonly HTMLElement[]][] =
      visualizationId === 'tensor-autodiff-core'
        ? [
            [
              'root-evidence',
              explicit(':scope > .summary-grid', ':scope > .graph-section'),
            ],
          ]
        : visualizationId === 'tensor-autodiff-reverse'
          ? [
              [
                'reverse-evidence',
                explicit(
                  '.reverse-section > h3',
                  '.reverse-section > p',
                  '.reverse-section > .rule-key-heading',
                  '.reverse-section > .rule-key',
                  '.reverse-section > .trace-scroll',
                ),
              ],
              [
                'native-table-rows',
                Array.from(figure.querySelectorAll<HTMLElement>('.vjp-table tr')),
              ],
            ]
          : [
              [
                'outcome-panels',
                explicit(
                  ':scope > .gradients-section',
                  ':scope > .lifecycle-section',
                  ':scope > .checks-section',
                  ':scope > .errors-section',
                ),
              ],
            ];
    const flowProblems: string[] = [];
    for (const [name, elements] of flowGroups) {
      for (let index = 1; index < elements.length; index += 1) {
        const previous = elements[index - 1]!.getBoundingClientRect();
        const current = elements[index]!.getBoundingClientRect();
        if (current.top < previous.bottom - tolerance) {
          flowProblems.push(
            `${name}-${index} starts at ${current.top} before the prior item ends at ${previous.bottom}`,
          );
        }
      }
    }
    for (const [kind, selector] of peerSelectors[visualizationId]) {
      for (const [ownerIndex, owner] of Array.from(
        figure.querySelectorAll<HTMLElement>(selector),
      ).entries()) {
        const direction = getComputedStyle(owner).direction;
        const records = Array.from(owner.children).map((child) =>
          child.getBoundingClientRect(),
        );
        for (let index = 1; index < records.length; index += 1) {
          const previous = records[index - 1]!;
          const current = records[index]!;
          const blockOverlap =
            Math.min(previous.bottom, current.bottom) -
            Math.max(previous.top, current.top);
          if (blockOverlap > tolerance) {
            const advancesInline =
              direction === 'rtl'
                ? current.right <= previous.left + tolerance
                : current.left >= previous.right - tolerance;
            if (!advancesInline) {
              flowProblems.push(
                `${kind}-${ownerIndex}-${index} overlaps or reverses its ${direction} source order`,
              );
            }
          } else if (current.top < previous.bottom - tolerance) {
            flowProblems.push(
              `${kind}-${ownerIndex}-${index} reverses its later source-order band`,
            );
          }
        }
      }
    }

    const section = figure.querySelector<HTMLElement>('.reverse-section');
    const scroller = figure.querySelector<HTMLElement>('.trace-scroll');
    let reverseScroller = null as null | {
      available: number;
      client: number;
      debt: number;
      endDelta: number;
      startDelta: number;
      width: number;
    };
    if (section && scroller) {
      const sectionRect = section.getBoundingClientRect();
      const scrollerRect = scroller.getBoundingClientRect();
      const style = getComputedStyle(section);
      const availableStart =
        sectionRect.left +
        Number.parseFloat(style.borderLeftWidth) +
        Number.parseFloat(style.paddingLeft);
      const availableEnd =
        sectionRect.right -
        Number.parseFloat(style.borderRightWidth) -
        Number.parseFloat(style.paddingRight);
      reverseScroller = {
        available: availableEnd - availableStart,
        client: scroller.clientWidth,
        debt: Math.max(0, scroller.scrollWidth - scroller.clientWidth),
        endDelta: Math.abs(availableEnd - scrollerRect.right),
        startDelta: Math.abs(scrollerRect.left - availableStart),
        width: scrollerRect.width,
      };
    }

    return { entities, flowProblems, peerColumns, reverseScroller };
  }, id);
}

const exactFigureCounts = {
  'tensor-autodiff-core': {
    borderedOwnerCount: 30,
    boxCount: 21,
    cardCount: 16,
    cellCount: 0,
    columnHeaderCount: 0,
    cueCount: 8,
    directOrder: [
      'FIGCAPTION.course-diagram__caption',
      'DL.summary-grid',
      'SECTION.diagram-section graph-section',
    ],
    errorCount: 0,
    evidenceCount: 0,
    gradientCount: 0,
    idrefElementCount: 2,
    idrefTargetCount: 3,
    idrefTokenCount: 3,
    lifecycleCount: 0,
    listCount: 7,
    listItemCount: 16,
    nodeCount: 8,
    operandCount: 8,
    reverseRowCount: 0,
    rowCount: 0,
    rowHeaderCount: 0,
    ruleAssociationCount: 0,
    ruleKeyCount: 0,
    scrollerCount: 0,
    summaryCount: 4,
    tableCount: 0,
  },
  'tensor-autodiff-reverse': {
    borderedOwnerCount: 83,
    boxCount: 1,
    cardCount: 0,
    cellCount: 81,
    columnHeaderCount: 9,
    cueCount: 0,
    directOrder: [
      'FIGCAPTION.course-diagram__caption',
      'SECTION.diagram-section reverse-section',
    ],
    errorCount: 0,
    evidenceCount: 0,
    gradientCount: 0,
    idrefElementCount: 12,
    idrefTargetCount: 10,
    idrefTokenCount: 13,
    lifecycleCount: 0,
    listCount: 0,
    listItemCount: 0,
    nodeCount: 0,
    operandCount: 0,
    reverseRowCount: 8,
    rowCount: 9,
    rowHeaderCount: 8,
    ruleAssociationCount: 8,
    ruleKeyCount: 6,
    scrollerCount: 1,
    summaryCount: 0,
    tableCount: 1,
  },
  'tensor-autodiff-outcomes': {
    borderedOwnerCount: 29,
    boxCount: 16,
    cardCount: 12,
    cellCount: 0,
    columnHeaderCount: 0,
    cueCount: 12,
    directOrder: [
      'FIGCAPTION.course-diagram__caption',
      'SECTION.diagram-section gradients-section',
      'SECTION.diagram-section lifecycle-section',
      'SECTION.diagram-section checks-section',
      'SECTION.diagram-section errors-section',
    ],
    errorCount: 4,
    evidenceCount: 2,
    gradientCount: 2,
    idrefElementCount: 5,
    idrefTargetCount: 6,
    idrefTokenCount: 6,
    lifecycleCount: 4,
    listCount: 0,
    listItemCount: 0,
    nodeCount: 0,
    operandCount: 0,
    reverseRowCount: 0,
    rowCount: 0,
    rowHeaderCount: 0,
    ruleAssociationCount: 0,
    ruleKeyCount: 0,
    scrollerCount: 0,
    summaryCount: 0,
    tableCount: 0,
  },
} as const;

function expectCompleteFigureAudit(
  id: VisualizationId,
  audit: Awaited<ReturnType<typeof readDiagramAudit>>,
) {
  const exact = exactFigureCounts[id];
  for (const [key, expected] of Object.entries(exact)) {
    expect(audit[key as keyof typeof audit], `${id} ${key}`).toEqual(expected);
  }
  expect(audit.inlineDebt, `${id} root inline debt`).toBeLessThanOrEqual(2);
  expect(
    audit.undeclaredHorizontalOwnerCount,
    `${id} undeclared horizontal owner/debt count`,
  ).toBe(0);
  expect(
    audit.localVerticalOwnerCount,
    `${id} local vertical owner/debt count`,
  ).toBe(0);
  expect(audit.problems, `${id} containment/concealment audit`).toEqual([]);
  for (const travel of audit.scrollerTravel) {
    expect(travel.client, `${id} scroller client width`).toBeGreaterThan(0);
  }
}

function expectReadableFlow(
  id: VisualizationId,
  inline: Awaited<ReturnType<typeof readReadableFlow>>,
  full: Awaited<ReturnType<typeof readReadableFlow>>,
) {
  expect(full.flowProblems, `${id} fullscreen source-order vertical flow`).toEqual([]);
  expect(
    full.entities.map(({ key }) => key),
    `${id} evidence entity identity`,
  ).toEqual(inline.entities.map(({ key }) => key));
  const inlineWidths = new Map(inline.entities.map(({ key, width }) => [key, width]));
  for (const entity of full.entities) {
    expect(
      entity.width + 2,
      `${id} ${entity.key} usable inline width (${entity.width} full versus ${inlineWidths.get(entity.key)} inline)`,
    ).toBeGreaterThanOrEqual(inlineWidths.get(entity.key) ?? Number.POSITIVE_INFINITY);
  }
  expect(
    full.peerColumns.map(({ key }) => key),
    `${id} peer-layout identity`,
  ).toEqual(inline.peerColumns.map(({ key }) => key));
  const inlineColumns = new Map(
    inline.peerColumns.map(({ key, columns }) => [key, columns]),
  );
  for (const peer of full.peerColumns) {
    expect(
      peer.columns,
      `${id} ${peer.key} fullscreen peer columns`,
    ).toBeLessThanOrEqual(inlineColumns.get(peer.key) ?? -1);
  }

  if (id === 'tensor-autodiff-reverse') {
    expect(inline.reverseScroller, `${id} inline scroller geometry`).not.toBeNull();
    expect(full.reverseScroller, `${id} fullscreen scroller geometry`).not.toBeNull();
    const before = inline.reverseScroller!;
    const after = full.reverseScroller!;
    expect(after.startDelta, `${id} scroller logical-start span`).toBeLessThanOrEqual(2);
    expect(after.endDelta, `${id} scroller logical-end span`).toBeLessThanOrEqual(2);
    expect(after.width + 2, `${id} scroller available evidence width`).toBeGreaterThanOrEqual(
      after.available,
    );
    expect(after.client + 2, `${id} fullscreen scroller client width`).toBeGreaterThanOrEqual(
      before.client,
    );
    expect(after.debt, `${id} fullscreen scroller travel`).toBeLessThanOrEqual(
      before.debt + 2,
    );
  } else {
    expect(inline.reverseScroller, `${id} inline private scroller`).toBeNull();
    expect(full.reverseScroller, `${id} fullscreen private scroller`).toBeNull();
  }
}

function expectRootOwnsVerticalContinuation(
  id: VisualizationId,
  audit: Awaited<ReturnType<typeof readDiagramAudit>>,
) {
  expect(audit.fullscreen, `${id} is the active fullscreen root`).toBe(true);
  if (audit.blockDebt > 2) {
    expect(
      audit.rootOverflowY,
      `${id} root must own its ${audit.blockDebt}px vertical continuation`,
    ).toMatch(/^(?:auto|scroll)$/);
  }
}

async function attachReadableFlowMetrics(
  testInfo: TestInfo,
  name: string,
  requestedSurface: { width: number; height: number },
  page: Page,
  inlineAudit: Awaited<ReturnType<typeof readDiagramAudit>>,
  fullAudit: Awaited<ReturnType<typeof readDiagramAudit>>,
  inlineFlow: Awaited<ReturnType<typeof readReadableFlow>>,
  fullFlow: Awaited<ReturnType<typeof readReadableFlow>>,
) {
  const actualSurface = await page.evaluate(() => ({
    innerHeight,
    innerWidth,
    screenHeight: screen.height,
    screenWidth: screen.width,
  }));
  await testInfo.attach(name, {
    body: JSON.stringify(
      {
        actualSurface,
        evidenceWidths: {
          full: fullFlow.entities,
          inline: inlineFlow.entities,
        },
        peerColumns: {
          full: fullFlow.peerColumns,
          inline: inlineFlow.peerColumns,
        },
        requestedSurface,
        reverseScroller: {
          full: fullFlow.reverseScroller,
          inline: inlineFlow.reverseScroller,
        },
        root: {
          full: {
            blockDebt: fullAudit.blockDebt,
            clientHeight: fullAudit.viewportHeight,
            clientWidth: fullAudit.viewportWidth,
            inlineDebt: fullAudit.inlineDebt,
            overflowY: fullAudit.rootOverflowY,
          },
          inline: {
            blockDebt: inlineAudit.blockDebt,
            clientHeight: inlineAudit.viewportHeight,
            clientWidth: inlineAudit.viewportWidth,
            inlineDebt: inlineAudit.inlineDebt,
          },
        },
      },
      null,
      2,
    ),
    contentType: 'application/json',
  });
}

function expectFontsNotShrunk(
  id: VisualizationId,
  inline: Awaited<ReturnType<typeof readDiagramAudit>>,
  full: Awaited<ReturnType<typeof readDiagramAudit>>,
) {
  expect(full.fontSizes.map(({ index }) => index), `${id} font sample identity`).toEqual(
    inline.fontSizes.map(({ index }) => index),
  );
  const inlinePixels = new Map(inline.fontSizes.map(({ index, pixels }) => [index, pixels]));
  for (const sample of full.fontSizes) {
    expect(
      sample.pixels + 0.01,
      `${id} font sample ${sample.index} must not shrink`,
    ).toBeGreaterThanOrEqual(inlinePixels.get(sample.index) ?? Number.POSITIVE_INFINITY);
  }
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
    order: 15,
    revision: contentRevision,
    revisionLabel: localized.revisionLabel,
    title: localized.title,
    equivalentLocales: ['en', 'ru'],
    fallbackRouteSuffix: '/course/',
  });
  await expect(page.locator('.lesson-description')).toHaveText(localized.description);
  await expectSeoDescription(page, localized.description);

  await expect(page.locator('.lesson-body h2')).toHaveText(localized.headings);

  const historyNodes = page
    .getByRole('heading', { level: 2, name: localized.historyHeading, exact: true })
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
    await historyLinks.evaluateAll((links) => links.map((link) => link.getAttribute('href'))),
  ).toEqual(historySources);

  const formulae = page.locator('.katex-display');
  expect(await formulae.count()).toBeGreaterThan(0);
  expect(
    await formulae.evaluateAll((nodes) =>
      nodes.map((node) => window.getComputedStyle(node).direction),
    ),
  ).not.toContain('rtl');
  expect(
    await formulae.locator('annotation[encoding="application/x-tex"]').allTextContents(),
  ).toContain(formulaLatex);

  const lessonText = normalizeProse(await page.locator('.lesson-body').innerText());
  for (const expected of localized.revisionInvariantFragments) {
    expect(lessonText).toContain(expected);
  }

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
    id: 'tensor-autodiff-core',
    supplementary: [
      { id: 'tensor-autodiff-reverse' },
      { id: 'tensor-autodiff-outcomes' },
    ],
  });
  const renderedIds = await page
    .locator('figure[data-visualization-id]')
    .evaluateAll((figures) => figures.map((figure) => figure.getAttribute('data-visualization-id')));
  expect(renderedIds).toEqual(visualizationIds);
  const figures = Object.fromEntries(
    visualizationIds.map((id) => [
      id,
      page.locator(`figure[data-visualization-id="${id}"]`),
    ]),
  ) as Record<VisualizationId, Locator>;
  for (const id of visualizationIds) {
    const localizedFigure = localized.figures[id];
    await expect(figures[id]).toHaveAccessibleName(localizedFigure.title);
    await expect(figures[id]).toHaveAccessibleDescription(localizedFigure.description);
    for (const heading of localizedFigure.sections) {
      await expect(
        figures[id].getByRole('heading', { name: heading, exact: true }),
      ).toBeVisible();
    }
    for (const term of localizedFigure.terms) {
      await expect(figures[id].getByText(term, { exact: false }).first()).toBeVisible();
    }
  }
  const core = figures['tensor-autodiff-core'];
  const reverse = figures['tensor-autodiff-reverse'];
  const outcomes = figures['tensor-autodiff-outcomes'];

  expect(
    await core.locator('[data-node-id]').evaluateAll((nodes) =>
      nodes.map((node) => ({
        id: node.getAttribute('data-node-id'),
        label: node.getAttribute('data-node-label'),
        topology: node.getAttribute('data-topology-order'),
        operation: node.getAttribute('data-operation'),
        shape: node.getAttribute('data-shape'),
        values: node.getAttribute('data-values'),
        adjoint: node.getAttribute('data-adjoint'),
      })),
    ),
  ).toEqual([
    { id: '0', label: 'x', topology: '0', operation: 'parameter', shape: '2x3', values: '1.000000000000,2.000000000000,3.000000000000,4.000000000000,5.000000000000,6.000000000000', adjoint: '4.000000000000,12.000000000000,4.000000000000,12.000000000000,10.000000000000,24.000000000000' },
    { id: '1', label: 'r', topology: '1', operation: 'reshape', shape: '3x2', values: '1.000000000000,2.000000000000,3.000000000000,4.000000000000,5.000000000000,6.000000000000', adjoint: '4.000000000000,12.000000000000,4.000000000000,12.000000000000,10.000000000000,24.000000000000' },
    { id: '2', label: 't', topology: '2', operation: 'transpose', shape: '2x3', values: '1.000000000000,3.000000000000,5.000000000000,2.000000000000,4.000000000000,6.000000000000', adjoint: '4.000000000000,4.000000000000,10.000000000000,12.000000000000,12.000000000000,24.000000000000' },
    { id: '3', label: 'bias', topology: '3', operation: 'parameter', shape: '3', values: '1.000000000000,-1.000000000000,0.000000000000', adjoint: '16.000000000000,16.000000000000,34.000000000000' },
    { id: '4', label: 'bb', topology: '4', operation: 'broadcast', shape: '2x3', values: '1.000000000000,-1.000000000000,0.000000000000,1.000000000000,-1.000000000000,0.000000000000', adjoint: '4.000000000000,4.000000000000,10.000000000000,12.000000000000,12.000000000000,24.000000000000' },
    { id: '5', label: 'z', topology: '5', operation: 'add', shape: '2x3', values: '2.000000000000,2.000000000000,5.000000000000,3.000000000000,3.000000000000,6.000000000000', adjoint: '4.000000000000,4.000000000000,10.000000000000,12.000000000000,12.000000000000,24.000000000000' },
    { id: '6', label: 'q', topology: '6', operation: 'mul', shape: '2x3', values: '4.000000000000,4.000000000000,25.000000000000,9.000000000000,9.000000000000,36.000000000000', adjoint: '1.000000000000,1.000000000000,1.000000000000,2.000000000000,2.000000000000,2.000000000000' },
    { id: '7', label: 'y', topology: '7', operation: 'mean', shape: '2', values: '11.000000000000,18.000000000000', adjoint: '3.000000000000,6.000000000000' },
  ]);
  expect(
    await core.locator('.operand-list > li').evaluateAll((records) =>
      records.map((record) => ({
        child: record.closest<HTMLElement>('[data-node-label]')?.dataset.nodeLabel ?? null,
        operand: record.querySelector('bdi')?.textContent?.trim() ?? null,
        parent: record.querySelector('strong code')?.textContent?.trim() ?? null,
      })),
    ),
  ).toEqual([
    { child: 'r', operand: '0', parent: 'x' },
    { child: 't', operand: '0', parent: 'r' },
    { child: 'bb', operand: '0', parent: 'bias' },
    { child: 'z', operand: '0', parent: 't' },
    { child: 'z', operand: '1', parent: 'bb' },
    { child: 'q', operand: '0', parent: 'z' },
    { child: 'q', operand: '1', parent: 'z' },
    { child: 'y', operand: '0', parent: 'q' },
  ]);
  expect(
    await reverse.locator('tr[data-edge-reverse]').evaluateAll((rows) =>
      rows.map((row) => ({
        reverse: row.getAttribute('data-edge-reverse'),
        child: row.getAttribute('data-child'),
        operand: row.getAttribute('data-operand'),
        parent: row.getAttribute('data-parent'),
        rule: row.getAttribute('data-rule'),
        source: row.getAttribute('data-source-shape'),
        target: row.getAttribute('data-target-shape'),
        axes: row.getAttribute('data-reduced-axes'),
        context: row.getAttribute('data-saved-context'),
        upstream: row.getAttribute('data-upstream-adjoint'),
        contribution: row.getAttribute('data-contribution'),
      })),
    ),
  ).toEqual([
    { reverse: '0', child: 'y', operand: '0', parent: 'q', rule: 'mean', source: '2', target: '2x3', axes: '1', context: 'axis=1; keep-dim=no; divisor=3', upstream: '3.000000000000,6.000000000000', contribution: '1.000000000000,1.000000000000,1.000000000000,2.000000000000,2.000000000000,2.000000000000' },
    { reverse: '1', child: 'q', operand: '0', parent: 'z', rule: 'multiply', source: '2x3', target: '2x3', axes: 'none', context: 'other-shape=2x3; other-values=2.000000000000,2.000000000000,5.000000000000,3.000000000000,3.000000000000,6.000000000000; input=2x3; output=2x3', upstream: '1.000000000000,1.000000000000,1.000000000000,2.000000000000,2.000000000000,2.000000000000', contribution: '2.000000000000,2.000000000000,5.000000000000,6.000000000000,6.000000000000,12.000000000000' },
    { reverse: '2', child: 'q', operand: '1', parent: 'z', rule: 'multiply', source: '2x3', target: '2x3', axes: 'none', context: 'other-shape=2x3; other-values=2.000000000000,2.000000000000,5.000000000000,3.000000000000,3.000000000000,6.000000000000; input=2x3; output=2x3', upstream: '1.000000000000,1.000000000000,1.000000000000,2.000000000000,2.000000000000,2.000000000000', contribution: '2.000000000000,2.000000000000,5.000000000000,6.000000000000,6.000000000000,12.000000000000' },
    { reverse: '3', child: 'z', operand: '0', parent: 't', rule: 'add', source: '2x3', target: '2x3', axes: 'none', context: 'none', upstream: '4.000000000000,4.000000000000,10.000000000000,12.000000000000,12.000000000000,24.000000000000', contribution: '4.000000000000,4.000000000000,10.000000000000,12.000000000000,12.000000000000,24.000000000000' },
    { reverse: '4', child: 'z', operand: '1', parent: 'bb', rule: 'add', source: '2x3', target: '2x3', axes: 'none', context: 'none', upstream: '4.000000000000,4.000000000000,10.000000000000,12.000000000000,12.000000000000,24.000000000000', contribution: '4.000000000000,4.000000000000,10.000000000000,12.000000000000,12.000000000000,24.000000000000' },
    { reverse: '5', child: 'bb', operand: '0', parent: 'bias', rule: 'broadcast', source: '2x3', target: '3', axes: '0', context: 'none', upstream: '4.000000000000,4.000000000000,10.000000000000,12.000000000000,12.000000000000,24.000000000000', contribution: '16.000000000000,16.000000000000,34.000000000000' },
    { reverse: '6', child: 't', operand: '0', parent: 'r', rule: 'transpose', source: '2x3', target: '3x2', axes: 'none', context: 'axes=0,1', upstream: '4.000000000000,4.000000000000,10.000000000000,12.000000000000,12.000000000000,24.000000000000', contribution: '4.000000000000,12.000000000000,4.000000000000,12.000000000000,10.000000000000,24.000000000000' },
    { reverse: '7', child: 'r', operand: '0', parent: 'x', rule: 'reshape', source: '3x2', target: '2x3', axes: 'none', context: 'input=2x3; output=3x2', upstream: '4.000000000000,12.000000000000,4.000000000000,12.000000000000,10.000000000000,24.000000000000', contribution: '4.000000000000,12.000000000000,4.000000000000,12.000000000000,10.000000000000,24.000000000000' },
  ]);

  expect(
    await outcomes.locator('[data-parameter-gradient]').evaluateAll((cards) =>
      cards
        .filter((card) => card.hasAttribute('data-backward-pass'))
        .map((card) => ({
          parameter: card.getAttribute('data-parameter-gradient'),
          pass: card.getAttribute('data-backward-pass'),
          shape: card.getAttribute('data-gradient-shape'),
          gradient: card.getAttribute('data-gradient-values'),
        })),
    ),
  ).toEqual([
    { parameter: 'x', pass: '1', shape: '2x3', gradient: '4.000000000000,12.000000000000,4.000000000000,12.000000000000,10.000000000000,24.000000000000' },
    { parameter: 'bias', pass: '1', shape: '3', gradient: '16.000000000000,16.000000000000,34.000000000000' },
  ]);
  expect(
    await outcomes.locator('[data-lifecycle-state]').evaluateAll((cards) =>
      cards.map((card) => ({
        state: card.getAttribute('data-lifecycle-state'),
        x: card.getAttribute('data-x-gradient'),
        bias: card.getAttribute('data-bias-gradient'),
        operation: card.getAttribute('data-operation'),
        released: card.getAttribute('data-released'),
        unchanged: card.getAttribute('data-gradients-unchanged'),
      })),
    ),
  ).toEqual([
    { state: 'second-pass', x: '8.000000000000,24.000000000000,8.000000000000,24.000000000000,20.000000000000,48.000000000000', bias: '32.000000000000,32.000000000000,68.000000000000', operation: null, released: null, unchanged: null },
    { state: 'zeroed', x: '0.000000000000,0.000000000000,0.000000000000,0.000000000000,0.000000000000,0.000000000000', bias: '0.000000000000,0.000000000000,0.000000000000', operation: null, released: null, unchanged: null },
    { state: 'after-zero-release', x: '4.000000000000,12.000000000000,4.000000000000,12.000000000000,10.000000000000,24.000000000000', bias: '16.000000000000,16.000000000000,34.000000000000', operation: null, released: null, unchanged: null },
    { state: 'released', x: null, bias: null, operation: 'mean', released: 'yes', unchanged: 'yes' },
  ]);
  expect(
    await outcomes.locator('[data-evidence]').evaluateAll((cards) =>
      cards.map((card) => ({
        kind: card.getAttribute('data-evidence'),
        expression: card.getAttribute('data-expression'),
        value: card.getAttribute('data-value'),
        gradient: card.getAttribute('data-parameter-gradient'),
        detached: card.getAttribute('data-detached-gradient'),
        operations: card.getAttribute('data-operations'),
        xSamples: card.getAttribute('data-x-samples'),
        biasSamples: card.getAttribute('data-bias-samples'),
        status: card.getAttribute('data-status'),
      })),
    ),
  ).toEqual([
    { kind: 'detach', expression: 'sum(p*p+detach(p)*ten)', value: '63.000000000000', gradient: '4.000000000000,6.000000000000', detached: 'none', operations: null, xSamples: null, biasSamples: null, status: null },
    { kind: 'gradcheck', expression: null, value: null, gradient: null, detached: null, operations: 'add,multiply,reshape,transpose,broadcast,sum,mean', xSamples: '0,1,3,5', biasSamples: '0,1,2', status: 'pass' },
  ]);
  expect(
    await outcomes.locator('[data-error-kind]').evaluateAll((cards) =>
      cards.map((card) => ({
        kind: card.getAttribute('data-error-kind'),
        gradients: card.getAttribute('data-gradients-unchanged'),
        graph: card.getAttribute('data-graph-unchanged'),
      })),
    ),
  ).toEqual([
    { kind: 'seed-shape', gradients: 'yes', graph: 'yes' },
    { kind: 'non-finite-seed', gradients: 'yes', graph: 'yes' },
    { kind: 'graph-released', gradients: 'yes', graph: 'yes' },
    { kind: 'non-finite-accumulated-gradient', gradients: 'yes', graph: 'yes' },
  ]);

  for (const id of visualizationIds) {
    expect(
      await figures[id].locator('code, bdi').evaluateAll((nodes) =>
        nodes.every((node) => window.getComputedStyle(node).direction === 'ltr'),
      ),
    ).toBe(true);
  }
  await expect(core.locator('[data-diagram-scroll]')).toHaveCount(0);
  await expect(reverse.locator('[data-diagram-scroll]')).toHaveCount(1);
  await expect(outcomes.locator('[data-diagram-scroll]')).toHaveCount(0);
  await expect(page.locator('figure.course-diagram [data-diagram-scroll]')).toHaveCount(1);
  await settle(page);
  for (const id of visualizationIds) {
    expectCompleteFigureAudit(id, await readDiagramAudit(figures[id]));
  }
  const scroller = reverse.locator('.trace-scroll');
  await scroller.focus();
  await expect(scroller).toBeFocused();
  if (narrow) {
    const widths = await scroller.evaluate((node) => ({
      client: node.clientWidth,
      scroll: node.scrollWidth,
    }));
    expect(widths.scroll).toBeGreaterThan(widths.client);
    for (const [owner, selector] of [
      [core, '.node-card'],
      [outcomes, '.gradient-card'],
      [outcomes, '.lifecycle-card'],
      [outcomes, '.check-card'],
      [outcomes, '.error-card'],
    ] as const) {
      const positions = await owner.locator(selector).evaluateAll((cards) =>
        cards.slice(0, 2).map((card) => {
          const rectangle = card.getBoundingClientRect();
          return { left: rectangle.left, top: rectangle.top, bottom: rectangle.bottom };
        }),
      );
      expect(positions).toHaveLength(2);
      expect(Math.abs(positions[0]!.left - positions[1]!.left)).toBeLessThan(1);
      expect(positions[1]!.top).toBeGreaterThan(positions[0]!.bottom);
    }
  }

  const exerciseDetails = page.locator('.lesson-body details');
  await expect(exerciseDetails).toHaveCount(1);
  await exerciseDetails.locator('summary').click();
  await expect(exerciseDetails).toHaveAttribute('open', '');
  await expect(exerciseDetails.locator('ol > li')).toHaveCount(8);

  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 15 localized tensor-autodiff-core vertical slice', {
  tag: chapterTag(chapterId),
}, () => {
  test.describe.configure({ mode: 'serial' });

  test('chapter 15 is fifteenth on both indexes with direct equivalent locale routes', async ({
    page,
  }) => {
    for (const locale of chapterLocales) {
      const localized = copy[locale];
      const chapters = await readOrderedCourseChapters(page, locale);
      expect(chapters.length).toBeGreaterThanOrEqual(15);
      expect(chapters[14]).toEqual(
        expect.objectContaining({ chapterId, order: 15, title: localized.title }),
      );
      await page.getByRole('link', { name: localized.title, exact: true }).click();
      await expectLocalizedChapterRoute(page, {
        chapterId,
        locale,
        order: 15,
        revision: contentRevision,
        revisionLabel: localized.revisionLabel,
        title: localized.title,
        equivalentLocales: ['en', 'ru'],
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
          page.getByRole('heading', { level: 1, name: copy[target.code].title, exact: true }),
        ).toBeVisible();
      }
    }
  });

  for (const locale of chapterLocales) {
    test(`the complete ${locale} Rust-backed lesson renders at desktop and narrow widths`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      const chapters = await readOrderedCourseChapters(page, locale);
      await page.goto(chapterPath(locale, chapterId));
      await expectChapterContent(page, locale, chapters, false);

      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      await expectChapterContent(page, locale, chapters, true);
    });
  }

  test('each localized figure independently reuses its DOM in readable standard full view', async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1280, height: 900 });
    for (const locale of chapterLocales) {
      await page.goto(chapterPath(locale, chapterId));
      await settle(page);
      await expect(page.locator('[data-diagram-full-view-toggle]')).toHaveCount(3);
      for (const id of visualizationIds) {
        const diagram = page.locator(`figure[data-visualization-id="${id}"]`);
        const toggle = diagram.locator('[data-diagram-full-view-toggle]');
        const inlineMarkup = await staticDiagramMarkup(diagram);
        const inlineAudit = await readDiagramAudit(diagram);
        const inlineFlow = await readReadableFlow(diagram, id);
        expectCompleteFigureAudit(id, inlineAudit);
        await diagram.evaluate((root, visualizationId) => {
          const semantic = Array.from(
            root.querySelectorAll(
              '[data-node-id], .operand-list > li, tr[data-edge-reverse], [data-parameter-gradient][data-backward-pass], [data-lifecycle-state], [data-evidence], [data-error-kind]',
            ),
          );
          const state = window as unknown as {
            __ch15FigureIdentity?: Record<string, { root: Element; semantic: Element[] }>;
          };
          state.__ch15FigureIdentity ??= {};
          state.__ch15FigureIdentity[visualizationId] = { root, semantic };
        }, id);

        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await toggle.click();
        await page.waitForFunction(
          (visualizationId) =>
            document.fullscreenElement?.getAttribute('data-visualization-id') ===
            visualizationId,
          id,
        );
        await settle(page);
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        for (const otherId of visualizationIds.filter((candidate) => candidate !== id)) {
          await expect(
            page.locator(
              `figure[data-visualization-id="${otherId}"] [data-diagram-full-view-toggle]`,
            ),
          ).toHaveAttribute('aria-expanded', 'false');
        }
        expect(await staticDiagramMarkup(diagram), `${locale}/${id} full markup`).toBe(
          inlineMarkup,
        );
        expect(
          await diagram.evaluate((root, visualizationId) => {
            const state = window as unknown as {
              __ch15FigureIdentity?: Record<string, { root: Element; semantic: Element[] }>;
            };
            const before = state.__ch15FigureIdentity?.[visualizationId];
            const semantic = Array.from(
              root.querySelectorAll(
                '[data-node-id], .operand-list > li, tr[data-edge-reverse], [data-parameter-gradient][data-backward-pass], [data-lifecycle-state], [data-evidence], [data-error-kind]',
              ),
            );
            return Boolean(
              before &&
                before.root === root &&
                before.semantic.length === semantic.length &&
                semantic.every((node, index) => before.semantic[index] === node),
            );
          }, id),
          `${locale}/${id} semantic DOM identity`,
        ).toBe(true);
        const fullAudit = await readDiagramAudit(diagram);
        const fullFlow = await readReadableFlow(diagram, id);
        await attachReadableFlowMetrics(
          testInfo,
          `standard-${locale}-${id}.json`,
          { width: 1280, height: 900 },
          page,
          inlineAudit,
          fullAudit,
          inlineFlow,
          fullFlow,
        );
        expectCompleteFigureAudit(id, fullAudit);
        expectRootOwnsVerticalContinuation(id, fullAudit);
        expectReadableFlow(id, inlineFlow, fullFlow);
        expectFontsNotShrunk(id, inlineAudit, fullAudit);

        await page.keyboard.press('Escape');
        await page.waitForFunction(() => document.fullscreenElement === null);
        await expect(toggle).toBeFocused();
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        expect(await staticDiagramMarkup(diagram), `${locale}/${id} exit markup`).toBe(
          inlineMarkup,
        );
        expect(
          await diagram.evaluate((root, visualizationId) => {
            const state = window as unknown as {
              __ch15FigureIdentity?: Record<string, { root: Element; semantic: Element[] }>;
            };
            const before = state.__ch15FigureIdentity?.[visualizationId];
            const semantic = Array.from(
              root.querySelectorAll(
                '[data-node-id], .operand-list > li, tr[data-edge-reverse], [data-parameter-gradient][data-backward-pass], [data-lifecycle-state], [data-evidence], [data-error-kind]',
              ),
            );
            return Boolean(
              before &&
                before.root === root &&
                before.semantic.length === semantic.length &&
                semantic.every((node, index) => before.semantic[index] === node),
            );
          }, id),
          `${locale}/${id} post-Escape semantic DOM identity`,
        ).toBe(true);
      }
      await expectNoOverflowOrClientScripts(page);
    }
  });

  test('the 1024x576 eligibility boundary keeps the same readable-width flow contract', async ({
    browser,
    browserName,
  }, testInfo) => {
    test.setTimeout(120_000);
    const baseURL = testInfo.project.use.baseURL;
    if (typeof baseURL !== 'string') throw new Error('Playwright baseURL is required');
    const context = await browser.newContext({
      baseURL,
      screen: { width: 1024, height: 576 },
      viewport: { width: 1024, height: 576 },
    });
    const page = await context.newPage();
    try {
      for (const locale of chapterLocales) {
        await page.goto(chapterPath(locale, chapterId));
        await settle(page);
        const inlineSurface = await page.evaluate(() => ({
          innerHeight,
          innerWidth,
          screenHeight: screen.height,
          screenWidth: screen.width,
        }));
        expect(inlineSurface.innerHeight).toBe(576);
        expect(inlineSurface.innerWidth).toBe(1024);
        if (browserName === 'chromium') {
          expect(inlineSurface.screenHeight).toBe(576);
          expect(inlineSurface.screenWidth).toBe(1024);
        } else {
          expect(inlineSurface.screenHeight).toBeGreaterThan(0);
          expect(inlineSurface.screenWidth).toBeGreaterThan(0);
        }
        await expect(page.locator('[data-diagram-full-view-toggle]')).toHaveCount(3);
        for (const id of visualizationIds) {
          const diagram = page.locator(`figure[data-visualization-id="${id}"]`);
          const toggle = diagram.locator('[data-diagram-full-view-toggle]');
          const inlineMarkup = await staticDiagramMarkup(diagram);
          const inlineAudit = await readDiagramAudit(diagram);
          const inlineFlow = await readReadableFlow(diagram, id);
          expectCompleteFigureAudit(id, inlineAudit);
          await toggle.click();
          await page.waitForFunction(
            (visualizationId) =>
              document.fullscreenElement?.getAttribute('data-visualization-id') ===
              visualizationId,
            id,
          );
          await settle(page);
          const audit = await readDiagramAudit(diagram);
          const fullFlow = await readReadableFlow(diagram, id);
          await attachReadableFlowMetrics(
            testInfo,
            `boundary-${browserName}-${locale}-${id}.json`,
            { width: 1024, height: 576 },
            page,
            inlineAudit,
            audit,
            inlineFlow,
            fullFlow,
          );
          expectCompleteFigureAudit(id, audit);
          expectRootOwnsVerticalContinuation(id, audit);
          expect(await staticDiagramMarkup(diagram), `${locale}/${id} boundary markup`).toBe(
            inlineMarkup,
          );
          expectReadableFlow(id, inlineFlow, fullFlow);
          expectFontsNotShrunk(id, inlineAudit, audit);
          await page.keyboard.press('Escape');
          await page.waitForFunction(() => document.fullscreenElement === null);
          await expect(toggle).toBeFocused();
          await expect(toggle).toHaveAttribute('aria-expanded', 'false');
          expect(
            await staticDiagramMarkup(diagram),
            `${locale}/${id} boundary exit markup`,
          ).toBe(inlineMarkup);
        }
      }
    } finally {
      await context.close();
    }
  });

  test('all graph and outcome cues plus every reverse cell survive forced colors', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.emulateMedia({ forcedColors: 'active' });
    for (const locale of chapterLocales) {
      await page.goto(chapterPath(locale, chapterId));
      await settle(page);
      expect(
        await page.evaluate(() => matchMedia('(forced-colors: active)').matches),
      ).toBe(true);
      const core = page.locator('figure[data-visualization-id="tensor-autodiff-core"]');
      const outcomes = page.locator(
        'figure[data-visualization-id="tensor-autodiff-outcomes"]',
      );
      expect(
        await core.locator('.node-card').evaluateAll((cards) =>
          cards.map((card) => ({
            symbol: card.querySelector('.state-symbol')?.textContent,
            border: getComputedStyle(card).borderTopStyle,
          })),
        ),
      ).toEqual([
        { symbol: 'P', border: 'solid' },
        { symbol: 'S', border: 'dotted' },
        { symbol: 'S', border: 'dotted' },
        { symbol: 'P', border: 'solid' },
        { symbol: 'B', border: 'dashed' },
        { symbol: 'E', border: 'double' },
        { symbol: 'E', border: 'double' },
        { symbol: 'Σ', border: 'ridge' },
      ]);
      expect(
        await outcomes.locator('[data-diagram-card]').evaluateAll((cards) =>
          cards.map((card) => ({
            symbol: card.querySelector('.state-symbol')?.textContent,
            border: getComputedStyle(card).borderTopStyle,
          })),
        ),
      ).toEqual([
        { symbol: '1', border: 'solid' },
        { symbol: '1', border: 'solid' },
        { symbol: '2', border: 'double' },
        { symbol: '0', border: 'dotted' },
        { symbol: 'R', border: 'double' },
        { symbol: 'X', border: 'dashed' },
        { symbol: 'D', border: 'dashed' },
        { symbol: 'OK', border: 'double' },
        { symbol: '!', border: 'dashed' },
        { symbol: '!', border: 'dashed' },
        { symbol: '!', border: 'dashed' },
        { symbol: '!', border: 'dashed' },
      ]);
      for (const id of visualizationIds) {
        const diagram = page.locator(`figure[data-visualization-id="${id}"]`);
        const inlineAudit = await readDiagramAudit(diagram);
        const inlineFlow = await readReadableFlow(diagram, id);
        expectCompleteFigureAudit(id, inlineAudit);
        const toggle = diagram.locator('[data-diagram-full-view-toggle]');
        await toggle.click();
        await page.waitForFunction(
          (visualizationId) =>
            document.fullscreenElement?.getAttribute('data-visualization-id') ===
            visualizationId,
          id,
        );
        await settle(page);
        expect(
          await page.evaluate(() => matchMedia('(forced-colors: active)').matches),
        ).toBe(true);
        const fullAudit = await readDiagramAudit(diagram);
        const fullFlow = await readReadableFlow(diagram, id);
        await attachReadableFlowMetrics(
          testInfo,
          `forced-colors-${locale}-${id}.json`,
          { width: 1280, height: 900 },
          page,
          inlineAudit,
          fullAudit,
          inlineFlow,
          fullFlow,
        );
        expectCompleteFigureAudit(id, fullAudit);
        expectRootOwnsVerticalContinuation(id, fullAudit);
        expectReadableFlow(id, inlineFlow, fullFlow);
        expectFontsNotShrunk(id, inlineAudit, fullAudit);
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => document.fullscreenElement === null);
        await expect(toggle).toBeFocused();
      }
      await expectNoOverflowOrClientScripts(page);
    }
  });

  test('synthetic RTL mirrors logical geometry without changing semantic order', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(chapterPath('en', chapterId));
    await settle(page);
    const readWitnesses = () =>
      page.evaluate(() => {
        const witness = (figureId: string, ownerSelector: string, itemSelector: string) => {
          const figure = document.querySelector<HTMLElement>(
            `figure[data-visualization-id="${figureId}"]`,
          );
          const owner = figure?.querySelector<HTMLElement>(ownerSelector);
          const item = figure?.querySelector<HTMLElement>(itemSelector);
          if (!figure || !owner || !item) throw new Error(`Missing RTL witness ${figureId}`);
          const ownerRect = owner.getBoundingClientRect();
          const itemRect = item.getBoundingClientRect();
          return {
            direction: getComputedStyle(figure).direction,
            fromLeft: itemRect.left - ownerRect.left,
            fromRight: ownerRect.right - itemRect.right,
          };
        };
        return {
          core: witness('tensor-autodiff-core', '.node-grid', '.node-card'),
          reverse: witness('tensor-autodiff-reverse', '.vjp-table', 'thead th'),
          outcomes: witness(
            'tensor-autodiff-outcomes',
            '.gradient-grid',
            '.gradient-card',
          ),
        };
      });
    const ltr = await readWitnesses();
    await page.locator('html').evaluate((root) => root.setAttribute('dir', 'rtl'));
    await settle(page);
    const rtl = await readWitnesses();
    for (const key of ['core', 'reverse', 'outcomes'] as const) {
      expect(ltr[key].direction).toBe('ltr');
      expect(rtl[key].direction).toBe('rtl');
      expect(
        Math.abs(ltr[key].fromLeft - rtl[key].fromRight),
        `${key} logical mirror`,
      ).toBeLessThanOrEqual(2);
    }
    expect(
      await page.locator('[data-node-id]').evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('data-topology-order')),
      ),
    ).toEqual(['0', '1', '2', '3', '4', '5', '6', '7']);
    expect(
      await page.locator('tr[data-edge-reverse]').evaluateAll((rows) =>
        rows.map((row) => row.getAttribute('data-edge-reverse')),
      ),
    ).toEqual(['0', '1', '2', '3', '4', '5', '6', '7']);
    expect(
      await page.locator('[data-lifecycle-state]').evaluateAll((records) =>
        records.map((record) => record.getAttribute('data-lifecycle-state')),
      ),
    ).toEqual(['second-pass', 'zeroed', 'after-zero-release', 'released']);
    for (const id of visualizationIds) {
      const diagram = page.locator(`figure[data-visualization-id="${id}"]`);
      const inlineAudit = await readDiagramAudit(diagram);
      const inlineFlow = await readReadableFlow(diagram, id);
      expectCompleteFigureAudit(id, inlineAudit);
      expect(
        await diagram.locator('code, bdi').evaluateAll((nodes) =>
          nodes.every((node) => getComputedStyle(node).direction === 'ltr'),
        ),
      ).toBe(true);
      const toggle = diagram.locator('[data-diagram-full-view-toggle]');
      await toggle.click();
      await page.waitForFunction(
        (visualizationId) =>
          document.fullscreenElement?.getAttribute('data-visualization-id') ===
          visualizationId,
        id,
      );
      await settle(page);
      const readExpandedWitness = () =>
        diagram.evaluate((root, visualizationId) => {
          const selectors: Record<VisualizationId, [string, string]> = {
            'tensor-autodiff-core': ['.node-grid', '.node-card'],
            'tensor-autodiff-reverse': ['.vjp-table', 'thead th'],
            'tensor-autodiff-outcomes': ['.gradient-grid', '.gradient-card'],
          };
          const [ownerSelector, itemSelector] = selectors[visualizationId];
          const owner = root.querySelector<HTMLElement>(ownerSelector);
          const item = root.querySelector<HTMLElement>(itemSelector);
          if (!owner || !item) {
            throw new Error(`Missing expanded RTL witness ${visualizationId}`);
          }
          const ownerRect = owner.getBoundingClientRect();
          const itemRect = item.getBoundingClientRect();
          return {
            direction: getComputedStyle(root).direction,
            fromLeft: itemRect.left - ownerRect.left,
            fromRight: ownerRect.right - itemRect.right,
          };
        }, id);
      await page.locator('html').evaluate((root) => root.setAttribute('dir', 'ltr'));
      await settle(page);
      const ltrFullWitness = await readExpandedWitness();
      await page.locator('html').evaluate((root) => root.setAttribute('dir', 'rtl'));
      await settle(page);
      const rtlFullWitness = await readExpandedWitness();
      expect(ltrFullWitness.direction).toBe('ltr');
      expect(rtlFullWitness.direction).toBe('rtl');
      expect(
        Math.abs(ltrFullWitness.fromLeft - rtlFullWitness.fromRight),
        `${id} expanded logical mirror`,
      ).toBeLessThanOrEqual(2);
      const fullAudit = await readDiagramAudit(diagram);
      const fullFlow = await readReadableFlow(diagram, id);
      await attachReadableFlowMetrics(
        testInfo,
        `rtl-${id}.json`,
        { width: 1280, height: 900 },
        page,
        inlineAudit,
        fullAudit,
        inlineFlow,
        fullFlow,
      );
      expectCompleteFigureAudit(id, fullAudit);
      expectRootOwnsVerticalContinuation(id, fullAudit);
      expectReadableFlow(id, inlineFlow, fullFlow);
      expectFontsNotShrunk(id, inlineAudit, fullAudit);
      expect(await diagram.evaluate((root) => getComputedStyle(root).direction)).toBe('rtl');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.fullscreenElement === null);
      await expect(toggle).toBeFocused();
    }
    await expectNoOverflowOrClientScripts(page);
  });

  test('desktop and narrow EN/RU remain complete without JavaScript', async ({
    browser,
  }, testInfo) => {
    test.setTimeout(120_000);
    const baseURL = testInfo.project.use.baseURL;
    if (typeof baseURL !== 'string') throw new Error('Playwright baseURL is required');
    for (const locale of chapterLocales) {
      for (const viewport of [
        { width: 1440, height: 1000 },
        { width: 390, height: 844 },
      ]) {
        const context = await browser.newContext({
          baseURL,
          javaScriptEnabled: false,
          viewport,
        });
        const page = await context.newPage();
        try {
          await page.goto(chapterPath(locale, chapterId));
          await expect(
            page.getByRole('heading', { level: 1, name: copy[locale].title }),
          ).toBeVisible();
          await expect(page.locator('[data-diagram-full-view-controls]')).toHaveCount(0);
          await expect(page.locator('[data-diagram-full-view-toggle]')).toHaveCount(0);
          for (const id of visualizationIds) {
            const diagram = page.locator(`figure[data-visualization-id="${id}"]`);
            await expect(diagram).toHaveAccessibleName(copy[locale].figures[id].title);
            await expect(diagram).toHaveAccessibleDescription(
              copy[locale].figures[id].description,
            );
            expectCompleteFigureAudit(id, await readDiagramAudit(diagram));
          }
          await expect(page.locator('[data-node-id]')).toHaveCount(8);
          await expect(page.locator('tr[data-edge-reverse]')).toHaveCount(8);
          await expect(page.locator('[data-lifecycle-state]')).toHaveCount(4);
          await expect(page.locator('[data-evidence]')).toHaveCount(2);
          await expect(page.locator('[data-error-kind]')).toHaveCount(4);
          await expect(page.locator('[data-diagram-scroll]')).toHaveCount(1);
          if (viewport.width === 390) {
            const widths = await page.locator('[data-diagram-scroll]').evaluate((node) => ({
              client: node.clientWidth,
              scroll: node.scrollWidth,
            }));
            expect(widths.scroll).toBeGreaterThan(widths.client);
          }
          await expectNoOverflowOrClientScripts(page);
        } finally {
          await context.close();
        }
      }
    }
  });

  test('mobile and unsupported Fullscreen API expose no unusable control', async ({
    browser,
  }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    if (typeof baseURL !== 'string') throw new Error('Playwright baseURL is required');
    for (const locale of chapterLocales) {
      const mobile = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } });
      const mobilePage = await mobile.newPage();
      try {
        await mobilePage.goto(chapterPath(locale, chapterId));
        await expect(mobilePage.locator('[data-diagram-full-view-toggle]')).toHaveCount(0);
        for (const id of visualizationIds) {
          expectCompleteFigureAudit(
            id,
            await readDiagramAudit(
              mobilePage.locator(`figure[data-visualization-id="${id}"]`),
            ),
          );
        }
      } finally {
        await mobile.close();
      }

      const unsupported = await browser.newContext({
        baseURL,
        viewport: { width: 1440, height: 1000 },
      });
      await unsupported.addInitScript(() => {
        Object.defineProperty(document, 'fullscreenEnabled', {
          configurable: true,
          value: false,
        });
      });
      const unsupportedPage = await unsupported.newPage();
      try {
        await unsupportedPage.goto(chapterPath(locale, chapterId));
        await expect(unsupportedPage.locator('[data-diagram-full-view-toggle]')).toHaveCount(0);
        for (const id of visualizationIds) {
          expectCompleteFigureAudit(
            id,
            await readDiagramAudit(
              unsupportedPage.locator(`figure[data-visualization-id="${id}"]`),
            ),
          );
        }
      } finally {
        await unsupported.close();
      }
    }
  });
});
