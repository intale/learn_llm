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

const chapterId = '16-model-autodiff-ops';
const contentRevision = 7;
const diagramSelector = 'figure[data-visualization-id="model-autodiff-ops"]';
const desktop = { width: 1440, height: 1000 } as const;
const standardFullView = { width: 1280, height: 900 } as const;
const minimumFullView = { width: 1024, height: 576 } as const;
const narrowViewport = { width: 390, height: 844 } as const;
const formulaLatex = String.raw`\frac{\partial L}{\partial E_{i,:}}=\sum_{(b,t):z_{b,t}=i}\frac{\partial L}{\partial X_{b,t,:}}`;
const indexedMeanNllLatex = String.raw`\bar Z_{g,c}=\frac{\bar L}{G}\left(P_{g,c}-\mathbf{1}[c=y_g]\right).`;
const repositoryRoot = resolve(process.cwd(), '..');
const historySources = [
  'https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf',
  'https://www.usenix.org/system/files/conference/osdi16/osdi16-abadi.pdf',
  'https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf',
  'https://arxiv.org/pdf/2002.05202',
] as const;

interface LocalizedCopy {
  revisionLabel: string;
  title: string;
  description: string;
  headings: readonly string[];
  historyHeading: string;
  historyFragments: readonly string[];
  gatherBoundaryFragments: readonly string[];
  gatherPlanCaption: string;
  gatherPlanLabel: string;
  gatherOperationCaption: string;
  probabilityEvidenceFragments: readonly string[];
  logSoftmaxForwardCaption: string;
  logSoftmaxForwardLabel: string;
  indexedNllForwardCaption: string;
  indexedNllForwardLabel: string;
  diagramTitle: string;
  diagramDescription: string;
  diagramSections: readonly string[];
  diagramFork: string;
  diagramTargetRule: string;
  diagramScatterRule: string;
  targetTableCaption: string;
  diagramTerms: readonly string[];
  selectedTargetAccessibleName: RegExp;
}

const copy: Record<ChapterLocale, LocalizedCopy> = {
  en: {
    revisionLabel: 'Content revision',
    title: 'Reverse the operations that turn token IDs into loss',
    description:
      'Implement VJPs for matrix products, repeated embedding lookups, SiLU, log-softmax, and mean token loss, then compare each new local rule with sampled central differences.',
    headings: [
      'Predict one repeated-token path',
      'Add every occurrence to its shared embedding row',
      'Name the loss, table, selectors, and adjoints',
      'From one neural next-word backward pass to reusable decoder VJPs',
      'Save the forward data each local VJP needs',
      'Follow four occurrence gradients into three parameter rows',
      'Predict before running Rust',
      'Initialize the values these gradients will train',
    ],
    historyHeading: 'From one neural next-word backward pass to reusable decoder VJPs',
    historyFragments: [
      'model-specific backward/update equations',
      'learned embeddings and the output projection at model boundaries',
      'the same function as SiLU',
      'ordinary inference uses only the forward paths',
      'a new Rust example, not code copied from or attributed to the paper',
    ],
    gatherBoundaryFragments: [
      'TensorValue::gather_rows is the checked public entry for row selection.',
      'The flat-order scan reports the first invalid selector.',
      'It does not mean that public input may be unchecked.',
    ],
    gatherPlanCaption:
      'Validate a raw row-gather request once and seal its selectors and shapes in an owned plan',
    gatherPlanLabel: 'Rust source implementing the Chapter 16 validated row-gather plan',
    gatherOperationCaption:
      'Create the checked plan after operand validation, copy its rows, and retain its facts for reversal',
    probabilityEvidenceFragments: [
      '“One forward call” does not mean one read of each logit',
      'The saved tensor contains the same emitted f64 values, bit for bit.',
      'backward does not call softmax or normalize the logits again',
      'The lesson’s two branches are separate operations with separate calls and saved tensors; they share only the input logits.',
    ],
    logSoftmaxForwardCaption:
      'Return log-probabilities and retain probabilities from one checked forward call',
    logSoftmaxForwardLabel:
      'Rust source making one Chapter 16 log-softmax forward call for its value and VJP evidence',
    indexedNllForwardCaption:
      'Return mean NLL and retain probabilities from one checked forward call',
    indexedNllForwardLabel:
      'Rust source making one Chapter 16 indexed mean NLL forward call for its value and VJP evidence',
    diagramTitle: 'Follow a repeated token ID from lookup to loss and back',
    diagramDescription:
      'Inspect the compact forward chain, signed target gradients with zero class sums, both matrix VJPs, and four occurrence contributions grouped inside three destination embedding rows.',
    diagramSections: [
      'Trace the compact operation chain forward',
      'Reverse target selection and the projection',
      'Add each occurrence to its destination row',
    ],
    diagramFork:
      'After SiLU, the graph forks into two separate operation calls over the same logits. Log-softmax returns log-probabilities; combined mean NLL computes and returns one scalar mean NLL from the logits and target classes. The calls do not share one forward result. This exercise is not the final decoder layout.',
    diagramTargetRule:
      'For every flat position in this equal-logit example, begin with the two saved class probabilities, each equal to one half. Subtract one from the target-class component, leave the competing component unchanged, then divide both components by the four positions in the mean.',
    diagramScatterRule:
      'Every gathered output row owns its values. In reverse, each occurrence keeps its own adjoint and the gather VJP adds it to the parent-table row named by that token ID.',
    targetTableCaption: 'Loss gradients for the four flat token positions',
    diagramTerms: [
      'Differentiable tensor shape',
      'Parent-gradient shape',
      'Class sum',
      'row with repeated contributions',
      'row with one contribution',
      'unused row',
    ],
    selectedTargetAccessibleName: /negative.*selected target/i,
  },
  ru: {
    revisionLabel: 'Версия материала',
    title:
      'Выполните обратный проход по операциям, преобразующим ID токенов в значение функции потерь',
    description:
      'Реализуйте VJP для матричных произведений, выбора строк эмбеддингов по повторяющимся ID, SiLU, log-softmax и средней функции потерь по токенам. Затем сравните каждое новое локальное правило с производными, оценёнными методом центральных разностей в выбранных координатах.',
    headings: [
      'Предскажите путь повторяющегося токена',
      'Суммируйте вклады всех вхождений в общей строке таблицы эмбеддингов',
      'Обозначьте функцию потерь, таблицу, ID токенов и сопряжённые величины',
      'От обратного прохода в нейросетевой модели следующего слова к переиспользуемым VJP декодера',
      'Сохраняйте данные прямого прохода, необходимые каждому локальному VJP',
      'Проследите четыре градиентных вклада до трёх строк параметра',
      'Предскажите результат до запуска Rust',
      'Задайте начальные значения параметров, которые будут обновляться по этим градиентам',
    ],
    historyHeading:
      'От обратного прохода в нейросетевой модели следующего слова к переиспользуемым VJP декодера',
    historyFragments: [
      'формулы обратного прохода и обновления параметров именно для этой архитектуры',
      'обучаемые эмбеддинги находятся на входе, а выходная проекция — на выходе модели',
      'получается функция SiLU',
      'При обычном инференсе выполняется только прямой проход',
      'Это новый пример на Rust, а не код, взятый из статьи или приписанный ей',
    ],
    gatherBoundaryFragments: [
      'TensorValue::gather_rows — публичная точка входа, которая проверяет аргументы выбора строк.',
      'Если встречается ID вне диапазона строк, метод сообщает его первую плоскую позицию.',
      'Публичный API по-прежнему не принимает непроверенные ID.',
      'После успешной проверки закрытый тип RowGatherPlan, доступный только внутри крейта, владеет копиями ID и их логической формы, а также хранит форму исходной таблицы, вычисленную форму выхода и число элементов выхода.',
      'Сам факт существования плана означает, что размеры и ID уже проверены; однако выделение памяти под выходной буфер всё ещё может завершиться ошибкой.',
      'Для целевого класса из сохранённой вероятности в скобках вычитается единица.',
      'Затем все компоненты умножаются на общий множитель',
    ],
    gatherPlanCaption:
      'Один раз проверить запрос на выбор строк и создать план, хранящий проверенные ID и вычисленные формы',
    gatherPlanLabel: 'Исходный код на Rust с проверенным планом выбора строк из главы 16',
    gatherOperationCaption:
      'Создать проверенный план после проверки доступности операнда, скопировать строки и сохранить данные плана для обратного прохода',
    probabilityEvidenceFragments: [
      '«Один вызов прямого прохода» не означает, что каждый логит читается один раз',
      'Сохранённый тензор содержит побитово те же значения f64, которые были сформированы при прямом проходе.',
      'при обратном проходе softmax повторно не вызывается и логиты заново не нормализуются',
      'Две ветви — отдельные операции с отдельными вызовами и сохранёнными тензорами; общими остаются только входные логиты.',
    ],
    logSoftmaxForwardCaption:
      'Вернуть логарифмы вероятностей и сохранить вероятности из одного вызова прямого прохода с проверкой входных данных',
    logSoftmaxForwardLabel:
      'Исходный код на Rust с одним вызовом прямого прохода log-softmax для результата и данных VJP из главы 16',
    indexedNllForwardCaption:
      'Вернуть среднее NLL и сохранить вероятности из одного вызова прямого прохода с проверкой входных данных',
    indexedNllForwardLabel:
      'Исходный код на Rust с одним вызовом прямого прохода среднего NLL по индексам для результата и данных VJP из главы 16',
    diagramTitle: 'Проследите путь повторяющегося ID токена до функции потерь и обратно',
    diagramDescription:
      'Проследите компактную цепочку прямого прохода, знаки градиентов по логитам, нулевую сумму компонент каждой строки градиентов по классам и VJP для обоих операндов матричного умножения. Затем рассмотрите четыре вклада вхождений, сгруппированные внутри трёх строк таблицы эмбеддингов.',
    diagramSections: [
      'Проследите прямой проход по компактной цепочке операций',
      'Проведите обратный проход через выбор целевого класса и проекцию',
      'Добавьте вклад каждого вхождения в строку назначения',
    ],
    diagramFork:
      'После SiLU граф разветвляется на два отдельных вызова над одними и теми же логитами. Log-softmax возвращает логарифмы вероятностей, а совмещённая операция вычисляет по логитам и целевым классам скалярное среднее NLL. Вызовы не используют общий результат прямого прохода. Эта схема предназначена для изучения операций, а не устройства итогового декодера.',
    diagramTargetRule:
      'Для каждой плоской позиции в этом примере с равными логитами начните с двух сохранённых вероятностей классов: каждая равна одной второй. Вычтите единицу из компоненты целевого класса, оставьте компоненту другого класса без изменения, затем разделите обе компоненты на число усредняемых позиций — четыре.',
    diagramScatterRule:
      'У каждой выбранной выходной строки есть собственная копия значений. При обратном проходе для каждого вхождения сохраняется отдельная сопряжённая величина, а VJP выбора строк добавляет её в строку родительской таблицы, номер которой равен ID токена.',
    targetTableCaption: 'Градиенты функции потерь по логитам в четырёх плоских позициях',
    diagramTerms: [
      'Форма дифференцируемого тензора',
      'Форма градиента по родительскому тензору',
      'Сумма по классам',
      'строка с суммой вкладов',
      'строка с одним вкладом',
      'неиспользованная строка',
    ],
    selectedTargetAccessibleName: /отрицательный.*выбранный целевой класс/i,
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
  ['rust/demos/ch16-model-autodiff-ops/src/lib.rs', 'handwritten-model-backward'],
  ['rust/crates/llm-from-scratch/src/autograd/model_ops.rs', 'model-row-gather-plan'],
  ['rust/crates/llm-from-scratch/src/autograd/model_ops.rs', 'model-row-gather-operation'],
  ['rust/crates/llm-from-scratch/src/autograd/model_ops.rs', 'model-row-gather-vjp'],
  ['rust/crates/llm-from-scratch/src/autograd/model_ops.rs', 'model-log-softmax-saved-forward'],
  ['rust/crates/llm-from-scratch/src/autograd/model_ops.rs', 'model-indexed-nll-saved-forward'],
  ['rust/demos/ch16-model-autodiff-ops/src/lib.rs', 'shared-model-vjp-fixture'],
  ['rust/demos/ch16-model-autodiff-ops/src/lib.rs', 'model-vjp-gradchecks'],
  ['rust/demos/ch16-model-autodiff-ops/src/lib.rs', 'model-op-errors-example'],
  ['rust/demos/ch16-model-autodiff-ops/src/main.rs', 'learner-model-vjp-output'],
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

async function rememberAuthoredNodes(diagram: Locator, slot: string) {
  return diagram.evaluate((root, storageKey) => {
    const authored = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))].filter(
      (element) => !element.closest('[data-diagram-full-view-controls]'),
    );
    (window as unknown as Record<string, unknown>)[storageKey] = authored;
    return authored.length;
  }, slot);
}

async function authoredNodesAreUnchanged(diagram: Locator, slot: string) {
  return diagram.evaluate((root, storageKey) => {
    const before = (window as unknown as Record<string, unknown>)[storageKey];
    if (!Array.isArray(before)) return false;
    const authored = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))].filter(
      (element) => !element.closest('[data-diagram-full-view-controls]'),
    );
    return (
      authored.length === before.length &&
      authored.every((element, index) => element === before[index])
    );
  }, slot);
}

async function readModelAutodiffEvidence(diagram: Locator) {
  return diagram.evaluate((root) => ({
    summary: Array.from(root.querySelectorAll<HTMLElement>('.summary-grid > div')).map(
      (record) => record.textContent?.replace(/\s+/g, ' ').trim(),
    ),
    forward: Array.from(root.querySelectorAll<HTMLElement>('[data-forward-step]')).map(
      (record) => ({
        step: record.dataset.forwardStep,
        operation: record.dataset.operation,
        sources: record.dataset.sources,
        input: record.dataset.inputShapes,
        output: record.dataset.outputShape,
        values: record.dataset.values,
        text: record.textContent?.replace(/\s+/g, ' ').trim(),
      }),
    ),
    targets: Array.from(root.querySelectorAll<HTMLElement>('[data-target-position]')).map(
      (record) => ({
        position: record.dataset.targetPosition,
        token: record.dataset.tokenId,
        target: record.dataset.targetClass,
        gradient: record.dataset.targetGradient,
        correct: record.dataset.correctSign,
        competitor: record.dataset.competitorSign,
        sum: record.dataset.rowSum,
        text: record.textContent?.replace(/\s+/g, ' ').trim(),
      }),
    ),
    pullbacks: Array.from(
      root.querySelectorAll<HTMLElement>('[data-pullback-operation]'),
    ).map((record) => ({
      operation: record.dataset.pullbackOperation,
      parent: record.dataset.parent,
      operand: record.dataset.operand,
      shape: record.dataset.shape,
      gradient: record.dataset.gradient,
      text: record.textContent?.replace(/\s+/g, ' ').trim(),
    })),
    embeddings: Array.from(root.querySelectorAll<HTMLElement>('[data-embedding-row]')).map(
      (record) => ({
        row: record.dataset.embeddingRow,
        positions: record.dataset.positions,
        occurrences: record.dataset.occurrences,
        gradient: record.dataset.gradient,
        text: record.textContent?.replace(/\s+/g, ' ').trim(),
      }),
    ),
    occurrences: Array.from(
      root.querySelectorAll<HTMLElement>('[data-occurrence-position]'),
    ).map((record) => ({
      position: record.dataset.occurrencePosition,
      token: record.dataset.tokenId,
      destination: record.dataset.destinationRow,
      contribution: record.dataset.contribution,
      repeated: record.dataset.repeated,
      text: record.textContent?.replace(/\s+/g, ' ').trim(),
    })),
  }));
}

async function readModelAutodiffGeometry(diagram: Locator) {
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
    const inertMobileInlineMathFallback = (
      element: HTMLElement,
      style = getComputedStyle(element),
    ) =>
      element.matches('.katex') &&
      !element.parentElement?.matches('.katex-display') &&
      style.overflowX === 'auto' &&
      style.overflowY === 'hidden' &&
      Math.max(0, element.scrollWidth - element.clientWidth) <= tolerance &&
      Math.max(0, element.scrollHeight - element.clientHeight) <= tolerance;
    const concealed = (element: HTMLElement) => {
      const style = getComputedStyle(element);
      const zoom = style.getPropertyValue('zoom');
      const scale = style.getPropertyValue('scale');
      const lineClamp = style.getPropertyValue('-webkit-line-clamp');
      const textIndent = Number.parseFloat(style.textIndent || '0');
      const inertInlineMath = inertMobileInlineMathFallback(element, style);
      return (
        (!inertInlineMath &&
          [style.overflowX, style.overflowY].some((value) =>
            ['hidden', 'clip'].includes(value),
          )) ||
        /(?:paint|strict|content)/.test(style.contain) ||
        style.clipPath !== 'none' ||
        style.maskImage !== 'none' ||
        style.filter !== 'none' ||
        Number.parseFloat(style.opacity) <= 0 ||
        style.contentVisibility === 'hidden' ||
        style.textOverflow === 'ellipsis' ||
        (lineClamp !== '' && lineClamp !== 'none') ||
        (Number.isFinite(textIndent) && textIndent < -tolerance) ||
        !['', '1', 'normal'].includes(zoom) ||
        !['', '1', 'none'].includes(scale)
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
        style.display === 'contents' ||
        ['hidden', 'collapse'].includes(style.visibility) ||
        style.contentVisibility === 'hidden' ||
        Number.parseFloat(style.opacity) <= 0
      ) {
        problems.push(`element-${index} ${describe(element)} is concealed or boxless`);
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
      const fontSize = Number.parseFloat(style.fontSize);
      const lineHeight = Number.parseFloat(style.lineHeight);
      if (directText && (!Number.isFinite(fontSize) || fontSize <= 0)) {
        problems.push(`element-${index} ${describe(element)} has no readable font size`);
      }
      if (
        directText &&
        Number.isFinite(lineHeight) &&
        Number.isFinite(fontSize) &&
        lineHeight + 0.01 < fontSize * 0.9
      ) {
        problems.push(`element-${index} ${describe(element)} compresses its line height`);
      }
      if (style.transform !== 'none') {
        const stateCard = element.closest<HTMLElement>('.card-state')?.parentElement;
        const mirrorEligible =
          element.classList.contains('state-symbol') &&
          Boolean(
            stateCard?.matches(
              '.forward-card, .pullback-card, .embedding-single, .occurrence-no',
            ),
          );
        if (!mirrorEligible) {
          problems.push(`element-${index} ${describe(element)} is transformed`);
        } else {
          const matrix = new DOMMatrix(style.transform);
          if (
            !matrix.is2D ||
            Math.abs(matrix.a + 1) > 0.01 ||
            Math.abs(matrix.b) > 0.01 ||
            Math.abs(matrix.c) > 0.01 ||
            Math.abs(matrix.d - 1) > 0.01 ||
            Math.abs(matrix.e) > 0.01 ||
            Math.abs(matrix.f) > 0.01
          ) {
            problems.push(`element-${index} ${describe(element)} is not an exact glyph mirror`);
          }
        }
      }
      if (
        element !== figure &&
        visible(element) &&
        element.clientWidth > 0 &&
        element.clientHeight > 0
      ) {
        const inlineDebt = Math.max(0, element.scrollWidth - element.clientWidth);
        const blockDebt = Math.max(0, element.scrollHeight - element.clientHeight);
        if (
          ['auto', 'scroll'].includes(style.overflowX) &&
          !element.hasAttribute('data-diagram-scroll') &&
          !inertMobileInlineMathFallback(element, style)
        ) {
          undeclaredHorizontalOwnerCount += 1;
          problems.push(
            `element-${index} ${describe(element)} is an undeclared horizontal owner/debt ${inlineDebt}`,
          );
        }
        if (style.overflowY === 'scroll' || blockDebt > tolerance) {
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
    const borderedOwners = visibleElements.filter(
      (element) =>
        !element.closest('[data-diagram-full-view-controls]') && completeBorder(element),
    );
    const boundedOwners = new Set<HTMLElement>([figure, ...markedBoxes, ...borderedOwners]);
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
      if (concealed(owner)) {
        problems.push(`owner-${index} ${describe(owner)} conceals overflow or paint`);
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
      if (owner !== figure && !owner.matches('[data-diagram-scroll]') && inlineDebt > tolerance) {
        problems.push(`owner-${index} ${describe(owner)} has inline debt ${inlineDebt}`);
      }

      const ancestor = nearestOwner(owner.parentElement);
      if (!ancestor) continue;
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
        problems.push(`owner-${index} ${describe(owner)} escapes its nearest bounded ancestor`);
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
        const inlineOverlap = Math.min(ar.right, br.right) - Math.max(ar.left, br.left);
        const blockOverlap = Math.min(ar.bottom, br.bottom) - Math.max(ar.top, br.top);
        if (inlineOverlap > tolerance && blockOverlap > tolerance) {
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
        problems.push(`scroller-${index} lacks its shared accessible region contract`);
      }
      if (
        scroller.hasAttribute('data-diagram-box') ||
        scroller.hasAttribute('data-diagram-card')
      ) {
        problems.push(`scroller-${index} also claims bounded ownership`);
      }
      if (concealed(scroller)) problems.push(`scroller-${index} conceals overflow or paint`);
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
    const referencedIds = new Set<string>();
    const idrefTokens: string[] = [];
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
          idrefTokens.push(id);
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

    const textWalker = document.createTreeWalker(figure, NodeFilter.SHOW_TEXT);
    while (textWalker.nextNode()) {
      const textNode = textWalker.currentNode as Text;
      if (!textNode.textContent?.trim()) continue;
      const parent = textNode.parentElement;
      if (!parent || ignored(parent) || !visible(parent)) continue;
      const owner = nearestOwner(parent);
      if (!owner) {
        problems.push(`${describe(parent)} has no nearest bounded owner`);
        continue;
      }
      const scroller = parent.closest<HTMLElement>('[data-diagram-scroll]');
      const checkInline = !scroller || scroller.contains(owner);
      const range = document.createRange();
      range.selectNodeContents(textNode);
      const paints = Array.from(range.getClientRects()).filter(
        (paint) => paint.width > 0 && paint.height > 0,
      );
      if (paints.length === 0) {
        problems.push(`${describe(parent)} has nonblank text without positive paint`);
        continue;
      }
      if (transparent(getComputedStyle(parent).color)) {
        problems.push(`${describe(parent)} paints transparent text`);
      }
      for (const paint of paints) {
        if (!within(paint, innerRect(owner), checkInline, owner !== figure)) {
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
      if (
        owner &&
        !within(
          replaced.getBoundingClientRect(),
          innerRect(owner),
          true,
          owner !== figure,
        )
      ) {
        problems.push(`replaced-${index} ${describe(replaced)} paints outside its owner`);
      }
    }

    let headerWordCount = 0;
    let tableTokenCount = 0;
    const tableTokenFragments: Array<{ key: string; fragments: number }> = [];
    for (const [index, table] of Array.from(
      figure.querySelectorAll<HTMLTableElement>('table[data-diagram-table]'),
    ).entries()) {
      if (getComputedStyle(table).display !== 'table') {
        problems.push(`table-${index} is not a native table`);
      }
      if (!table.caption || getComputedStyle(table.caption).display !== 'table-caption') {
        problems.push(`table-${index} lost its native caption`);
      }
      if (!table.tHead || getComputedStyle(table.tHead).display !== 'table-header-group') {
        problems.push(`table-${index} lost its native header group`);
      }
      for (const body of Array.from(table.tBodies)) {
        if (getComputedStyle(body).display !== 'table-row-group') {
          problems.push(`table-${index} lost its native body group`);
        }
      }
      const tableWalker = document.createTreeWalker(table, NodeFilter.SHOW_TEXT);
      while (tableWalker.nextNode()) {
        const textNode = tableWalker.currentNode as Text;
        for (const match of textNode.data.matchAll(/\S+/gu)) {
          const start = match.index ?? -1;
          if (start < 0) continue;
          const range = document.createRange();
          range.setStart(textNode, start);
          range.setEnd(textNode, start + match[0].length);
          const paints = Array.from(range.getClientRects()).filter(
            (paint) => paint.width > 0 && paint.height > 0,
          );
          tableTokenFragments.push({
            key: `${index}:${tableTokenCount}:${match[0]}`,
            fragments: paints.length,
          });
          tableTokenCount += 1;
        }
      }
      for (const header of Array.from(
        table.querySelectorAll<HTMLTableCellElement>('thead th'),
      )) {
        const walker = document.createTreeWalker(header, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const textNode = walker.currentNode as Text;
          for (const match of textNode.data.matchAll(/\S+/gu)) {
            if ((match.index ?? -1) < 0) continue;
            headerWordCount += 1;
          }
        }
      }
      for (const [rowIndex, row] of Array.from(table.rows).entries()) {
        const rowRect = row.getBoundingClientRect();
        if (getComputedStyle(row).display !== 'table-row') {
          problems.push(`table-${index} row-${rowIndex} is not a native row`);
        }
        if (row.cells.length !== 7) {
          problems.push(
            `table-${index} row-${rowIndex} has ${row.cells.length} cells instead of 7`,
          );
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

    const technicalElements = Array.from(
      figure.querySelectorAll<HTMLElement>('code, bdi'),
    );
    const technicalTokenFragments: Array<{ key: string; fragments: number }> = [];
    for (const [elementIndex, technical] of technicalElements.entries()) {
      const walker = document.createTreeWalker(technical, NodeFilter.SHOW_TEXT);
      let tokenIndex = 0;
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
          technicalTokenFragments.push({
            key: `${elementIndex}:${tokenIndex}:${match[0]}`,
            fragments: paints.length,
          });
          tokenIndex += 1;
        }
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
    const widthSamples = visibleElements
      .filter((element) => !element.closest('table') || element.tagName === 'TABLE')
      .map((element, index) => {
      const display = getComputedStyle(element).display;
      const kind = display === 'inline' ? 'paint' : 'allocation';
      const range = document.createRange();
      range.selectNodeContents(element);
      const paints = Array.from(range.getClientRects()).filter(
        (paint) => paint.width > 0 && paint.height > 0,
      );
      const rect = element.getBoundingClientRect();
      return {
        key: `${index}:${describe(element)}`,
        kind,
        fragments: kind === 'paint' ? paints.length : 0,
        height: rect.height,
        width:
          kind === 'paint'
            ? Math.max(0, ...paints.map((paint) => paint.width))
            : rect.width,
        };
      });
    const directOrder = (element: Element | null) =>
      element
        ? Array.from(element.children)
            .filter((child) => !child.hasAttribute('data-diagram-full-view-controls'))
            .map((child) => `${child.tagName}.${child.className}`)
        : [];

    return {
      blockDebt: Math.max(0, figure.scrollHeight - figure.clientHeight),
      borderedOwnerCount: borderedOwners.length,
      boxCount: markedBoxes.length,
      cardCount: cards.length,
      cellCount: figure.querySelectorAll('th, td').length,
      codeBdiCount: technicalElements.length,
      columnHeaderCount: figure.querySelectorAll('th[scope="col"]').length,
      contributionItemCount: figure.querySelectorAll('.contribution-list > li').length,
      contributionListCount: figure.querySelectorAll('.contribution-list').length,
      descriptionListCount: figure.querySelectorAll('dl').length,
      descriptionRecordCount: figure.querySelectorAll('dl > div').length,
      directOrder: directOrder(figure),
      forwardDirectOrder: directOrder(figure.querySelector('.forward-section')),
      reverseDirectOrder: directOrder(figure.querySelector('.reverse-section')),
      accumulationDirectOrder: directOrder(figure.querySelector('.accumulation-section')),
      forwardOrder: Array.from(figure.querySelectorAll<HTMLElement>('[data-forward-step]')).map(
        (record) => record.dataset.forwardStep,
      ),
      targetOrder: Array.from(figure.querySelectorAll<HTMLElement>('[data-target-position]')).map(
        (record) => record.dataset.targetPosition,
      ),
      pullbackOrder: Array.from(
        figure.querySelectorAll<HTMLElement>('[data-pullback-operation]'),
      ).map((record) => `${record.dataset.pullbackOperation}:${record.dataset.operand}`),
      embeddingOrder: Array.from(
        figure.querySelectorAll<HTMLElement>('[data-embedding-row]'),
      ).map((record) => record.dataset.embeddingRow),
      occurrenceOrder: Array.from(
        figure.querySelectorAll<HTMLElement>('[data-occurrence-position]'),
      ).map((record) => record.dataset.occurrencePosition),
      fontSizes,
      formulaCount: figure.querySelectorAll('.katex').length,
      fullscreen: document.fullscreenElement === figure,
      headerWordCount,
      idrefElementCount: idrefElements.length,
      idrefTargetCount: referencedIds.size,
      idrefTokenCount,
      idrefTokens,
      authoredIds: Array.from(figure.querySelectorAll<HTMLElement>('[id]'))
        .map((element) => element.id)
        .sort(),
      inlineDebt: Math.max(0, figure.scrollWidth - figure.clientWidth),
      inertMobileInlineMathFallbackCount: visibleElements.filter((element) =>
        inertMobileInlineMathFallback(element),
      ).length,
      language: document.documentElement.lang,
      mobileInlineMathMediaActive: matchMedia('(max-width: 44rem)').matches,
      localVerticalOwnerCount,
      namedRegionCount: figure.querySelectorAll('[role="region"]').length,
      orderedListCount: figure.querySelectorAll('ol').length,
      orderedListItemCount: figure.querySelectorAll('ol > li').length,
      problems: [...new Set(problems)],
      rootOverflowY: getComputedStyle(figure).overflowY,
      rowCount: figure.querySelectorAll('table tr').length,
      rowHeaderCount: figure.querySelectorAll('th[scope="row"]').length,
      scrollerCount: scrollers.length,
      scrollerTravel: scrollers.map((scroller, index) => ({
        key: `target:${index}`,
        client: scroller.clientWidth,
        debt: Math.max(0, scroller.scrollWidth - scroller.clientWidth),
        blockDebt: Math.max(0, scroller.scrollHeight - scroller.clientHeight),
      })),
      sectionCount: figure.querySelectorAll(':scope > section').length,
      signCueCount: figure.querySelectorAll('.sign-cue').length,
      stateSymbolCount: figure.querySelectorAll('.state-symbol').length,
      summaryItemCount: figure.querySelectorAll('.summary-grid > div').length,
      tableCount: figure.querySelectorAll('table[data-diagram-table]').length,
      tableTokenCount,
      tableTokenFragments,
      technicalTokenFragments,
      technicalTokenCount: technicalTokenFragments.length,
      undeclaredHorizontalOwnerCount,
      viewportHeight: figure.clientHeight,
      viewportWidth: figure.clientWidth,
      widthSamples,
    };
  });
}

function expectCompleteModelAutodiffGeometry(
  geometry: Awaited<ReturnType<typeof readModelAutodiffGeometry>>,
) {
  expect(geometry.directOrder).toEqual([
    'FIGCAPTION.course-diagram__caption',
    'DL.summary-grid',
    'SECTION.diagram-section forward-section',
    'SECTION.diagram-section reverse-section',
    'SECTION.diagram-section accumulation-section',
  ]);
  expect(geometry.forwardDirectOrder).toEqual([
    'H4.',
    'P.forward-fork-note',
    'OL.forward-rail course-diagram__grid',
  ]);
  expect(geometry.reverseDirectOrder).toEqual([
    'H4.',
    'P.',
    'DIV.target-scroll course-diagram__scroll',
    'P.',
    'DIV.pullback-grid course-diagram__grid',
  ]);
  expect(geometry.accumulationDirectOrder).toEqual([
    'H4.',
    'P.',
    'DIV.embedding-grid course-diagram__grid',
  ]);
  expect(geometry.forwardOrder).toEqual(['0', '1', '2', '3', '4']);
  expect(geometry.targetOrder).toEqual(['0', '1', '2', '3']);
  expect(geometry.pullbackOrder).toEqual([
    'silu:unary',
    'matmul:left',
    'matmul:right',
  ]);
  expect(geometry.embeddingOrder).toEqual(['0', '1', '2']);
  expect(geometry.occurrenceOrder).toEqual(['0', '1', '2', '3']);
  expect(geometry.sectionCount).toBe(3);
  expect(geometry.summaryItemCount).toBe(4);
  expect(geometry.boxCount).toBe(22);
  expect(geometry.cardCount).toBe(15);
  expect(geometry.borderedOwnerCount).toBe(73);
  expect(geometry.stateSymbolCount).toBe(15);
  expect(geometry.signCueCount).toBe(8);
  expect(geometry.tableCount).toBe(1);
  expect(geometry.rowCount).toBe(5);
  expect(geometry.cellCount).toBe(35);
  expect(geometry.columnHeaderCount).toBe(7);
  expect(geometry.rowHeaderCount).toBe(4);
  expect(geometry.descriptionListCount).toBe(16);
  expect(geometry.descriptionRecordCount).toBe(61);
  expect(geometry.orderedListCount).toBe(3);
  expect(geometry.orderedListItemCount).toBe(9);
  expect(geometry.contributionListCount).toBe(2);
  expect(geometry.contributionItemCount).toBe(4);
  expect(geometry.scrollerCount).toBe(1);
  expect(geometry.namedRegionCount).toBe(1);
  expect(geometry.idrefElementCount).toBe(5);
  expect(geometry.idrefTokenCount).toBe(6);
  expect(geometry.idrefTargetCount).toBe(6);
  expect(geometry.idrefTokens).toEqual([
    'model-autodiff-ops-lesson-title',
    'model-autodiff-ops-lesson-description',
    'model-autodiff-ops-lesson-title-forward',
    'model-autodiff-ops-lesson-title-reverse',
    'model-autodiff-ops-lesson-title-target-table',
    'model-autodiff-ops-lesson-title-accumulation',
  ]);
  expect(geometry.authoredIds).toEqual([
    'model-autodiff-ops-lesson-description',
    'model-autodiff-ops-lesson-title',
    'model-autodiff-ops-lesson-title-accumulation',
    'model-autodiff-ops-lesson-title-forward',
    'model-autodiff-ops-lesson-title-reverse',
    'model-autodiff-ops-lesson-title-target-table',
  ]);
  expect(geometry.codeBdiCount).toBe(55);
  expect(geometry.technicalTokenCount).toBe(119);
  expect(geometry.formulaCount).toBe(15);
  expect(geometry.inertMobileInlineMathFallbackCount).toBe(
    geometry.mobileInlineMathMediaActive ? 15 : 0,
  );
  expect(geometry.language).toMatch(/^(?:en|ru)$/);
  expect(geometry.headerWordCount).toBe(geometry.language === 'ru' ? 20 : 13);
  expect(geometry.tableTokenCount).toBe(geometry.language === 'ru' ? 85 : 73);
  expect(geometry.inlineDebt).toBeLessThanOrEqual(2);
  expect(geometry.localVerticalOwnerCount).toBe(0);
  expect(geometry.undeclaredHorizontalOwnerCount).toBe(0);
  expect(geometry.scrollerTravel).toHaveLength(1);
  expect(geometry.scrollerTravel[0]?.client ?? 0).toBeGreaterThan(0);
  expect(geometry.scrollerTravel[0]?.blockDebt ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(2);
  expect(geometry.technicalTokenFragments).toHaveLength(119);
  expect(
    geometry.technicalTokenFragments.every(({ fragments }) => fragments > 0),
  ).toBe(true);
  expect(geometry.tableTokenFragments).toHaveLength(
    geometry.language === 'ru' ? 85 : 73,
  );
  expect(geometry.tableTokenFragments.every(({ fragments }) => fragments > 0)).toBe(
    true,
  );
  expect(geometry.widthSamples.length).toBeGreaterThan(73);
  expect(
    geometry.widthSamples.every(({ height, width }) => height > 0 && width > 0),
  ).toBe(true);
  expect(geometry.problems).toEqual([]);
}

function expectFontsNotShrunk(
  inline: Awaited<ReturnType<typeof readModelAutodiffGeometry>>,
  full: Awaited<ReturnType<typeof readModelAutodiffGeometry>>,
) {
  expect(full.fontSizes.map(({ index }) => index)).toEqual(
    inline.fontSizes.map(({ index }) => index),
  );
  const before = new Map(inline.fontSizes.map(({ index, pixels }) => [index, pixels]));
  for (const sample of full.fontSizes) {
    const inlinePixels = before.get(sample.index);
    expect(inlinePixels).toBeDefined();
    expect(sample.pixels + 0.01).toBeGreaterThanOrEqual(
      inlinePixels ?? Number.POSITIVE_INFINITY,
    );
  }
}

function expectRootOwnsVerticalContinuation(
  geometry: Awaited<ReturnType<typeof readModelAutodiffGeometry>>,
) {
  expect(geometry.fullscreen).toBe(true);
  if (geometry.blockDebt > 2) {
    expect(geometry.rootOverflowY).toMatch(/^(?:auto|scroll)$/);
  }
}

async function readModelAutodiffReadableFlow(diagram: Locator) {
  return diagram.evaluate((root) => {
    const figure = root as HTMLElement;
    const elementRect = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      return {
        bottom: rect.bottom,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        width: rect.width,
      };
    };
    const required = (selector: string, owner: ParentNode = figure) => {
      const element = owner.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing Chapter 16 readable-flow owner ${selector}`);
      return element;
    };
    const contentSpan = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        left:
          rect.left +
          Number.parseFloat(style.borderLeftWidth) +
          Number.parseFloat(style.paddingLeft),
        right:
          rect.right -
          Number.parseFloat(style.borderRightWidth) -
          Number.parseFloat(style.paddingRight),
      };
    };
    const columnCount = (element: HTMLElement) => {
      const columns = getComputedStyle(element).gridTemplateColumns;
      return columns === 'none' ? 0 : columns.split(/\s+/).filter(Boolean).length;
    };
    const spanRecord = (
      key: string,
      element: HTMLElement,
      ownerSpan: { left: number; right: number },
    ) => {
      const rect = element.getBoundingClientRect();
      return {
        key,
        left: rect.left,
        ownerLeft: ownerSpan.left,
        ownerRight: ownerSpan.right,
        right: rect.right,
      };
    };

    const summary = required('.summary-grid');
    const forward = required('.forward-section');
    const reverse = required('.reverse-section');
    const accumulation = required('.accumulation-section');
    const forwardRail = required('.forward-rail');
    const pullbackGrid = required('.pullback-grid');
    const embeddingGrid = required('.embedding-grid');
    const scroller = required('.target-scroll');
    const contributionLists = Array.from(
      figure.querySelectorAll<HTMLElement>('.contribution-list'),
    );
    const figureRect = figure.getBoundingClientRect();
    const figureStyle = getComputedStyle(figure);
    const figureBorderLeft = Number.parseFloat(figureStyle.borderLeftWidth);
    const figureBorderRight = Number.parseFloat(figureStyle.borderRightWidth);
    const reservedGutter = Math.max(
      0,
      figureRect.width - figureBorderLeft - figureBorderRight - figure.clientWidth,
    );
    const rootSpan = {
      left:
        figureRect.left +
        figureBorderLeft +
        reservedGutter / 2 +
        Number.parseFloat(figureStyle.paddingLeft),
      right:
        figureRect.right -
        figureBorderRight -
        reservedGutter / 2 -
        Number.parseFloat(figureStyle.paddingRight),
    };
    const summarySpan = contentSpan(summary);
    const forwardSpan = contentSpan(forward);
    const reverseSpan = contentSpan(reverse);
    const accumulationSpan = contentSpan(accumulation);
    const forwardRailSpan = contentSpan(forwardRail);
    const pullbackSpan = contentSpan(pullbackGrid);
    const embeddingSpan = contentSpan(embeddingGrid);

    const outerSelectors = [
      ':scope > figcaption',
      ':scope > [data-diagram-full-view-controls]',
      ':scope > .summary-grid',
      ':scope > .forward-section',
      ':scope > .reverse-section',
      ':scope > .accumulation-section',
    ] as const;
    const layoutOwnerSpans = [
      spanRecord('forward-rail', forwardRail, forwardSpan),
      spanRecord('target-scroll', scroller, reverseSpan),
      spanRecord('pullback-grid', pullbackGrid, reverseSpan),
      spanRecord('embedding-grid', embeddingGrid, accumulationSpan),
      ...contributionLists.map((list, index) => {
        const parent = list.closest<HTMLElement>('[data-embedding-row]');
        if (!parent) throw new Error(`Missing contribution span parent ${index}`);
        return spanRecord(`contribution-list:${index}`, list, contentSpan(parent));
      }),
    ];
    const cardSpans = [
      ...Array.from(summary.querySelectorAll<HTMLElement>(':scope > div')).map(
        (element, index) => spanRecord(`summary:${index}`, element, summarySpan),
      ),
      ...Array.from(forwardRail.querySelectorAll<HTMLElement>(':scope > li')).map(
        (element, index) => spanRecord(`forward-card:${index}`, element, forwardRailSpan),
      ),
      ...Array.from(pullbackGrid.querySelectorAll<HTMLElement>(':scope > article')).map(
        (element, index) => spanRecord(`pullback-card:${index}`, element, pullbackSpan),
      ),
      ...Array.from(embeddingGrid.querySelectorAll<HTMLElement>(':scope > article')).map(
        (element, index) => spanRecord(`embedding-card:${index}`, element, embeddingSpan),
      ),
      ...contributionLists.flatMap((list, listIndex) => {
        const span = contentSpan(list);
        return Array.from(list.querySelectorAll<HTMLElement>(':scope > li')).map(
          (element, index) =>
            spanRecord(`contribution-${listIndex}:${index}`, element, span),
        );
      }),
    ];
    const rootFlow = outerSelectors.map((selector) => elementRect(required(selector)));
    const forwardFlow = [
      required(':scope > h4', forward),
      required(':scope > .forward-fork-note', forward),
      ...Array.from(forwardRail.querySelectorAll<HTMLElement>(':scope > li')),
    ].map(elementRect);
    const reverseFlow = [
      required(':scope > h4', reverse),
      required(':scope > p:first-of-type', reverse),
      scroller,
      required(':scope > p:last-of-type', reverse),
      ...Array.from(pullbackGrid.querySelectorAll<HTMLElement>(':scope > article')),
    ].map(elementRect);
    const accumulationFlow = [
      required(':scope > h4', accumulation),
      required(':scope > p', accumulation),
      ...Array.from(embeddingGrid.querySelectorAll<HTMLElement>(':scope > article')),
    ].map(elementRect);
    const summaryFlow = Array.from(
      summary.querySelectorAll<HTMLElement>(':scope > div'),
    ).map(elementRect);
    const contributionFlows = contributionLists.map((list) =>
      Array.from(list.querySelectorAll<HTMLElement>(':scope > li')).map(elementRect),
    );
    const nestedContributionBounds = contributionLists.map((list, index) => {
      const parent = list.closest<HTMLElement>('[data-embedding-row]');
      if (!parent) throw new Error(`Missing contribution parent ${index}`);
      return {
        list: elementRect(list),
        parent: elementRect(parent),
      };
    });
    const scrollerRect = scroller.getBoundingClientRect();

    return {
      actionPosition: getComputedStyle(
        required(':scope > [data-diagram-full-view-controls]'),
      ).position,
      accumulationColumns: columnCount(embeddingGrid),
      accumulationFlow,
      cardSpans,
      columns: columnCount(figure),
      contributionColumns: contributionLists.map(columnCount),
      contributionFlows,
      direction: getComputedStyle(figure).direction,
      forwardColumns: columnCount(forwardRail),
      forwardFlow,
      nestedContributionBounds,
      outerSpans: outerSelectors.map((selector, index) =>
        spanRecord(`root:${index}`, required(selector), rootSpan),
      ),
      pullbackColumns: columnCount(pullbackGrid),
      reverseFlow,
      rootBlockDebt: Math.max(0, figure.scrollHeight - figure.clientHeight),
      rootFlow,
      rootOverflowY: getComputedStyle(figure).overflowY,
      scroller: {
        blockDebt: Math.max(0, scroller.scrollHeight - scroller.clientHeight),
        client: scroller.clientWidth,
        debt: Math.max(0, scroller.scrollWidth - scroller.clientWidth),
        left: scrollerRect.left,
        ownerLeft: reverseSpan.left,
        ownerRight: reverseSpan.right,
        right: scrollerRect.right,
      },
      layoutOwnerSpans,
      summaryColumns: columnCount(summary),
      summaryFlow,
    };
  });
}

function expectDirectionAwareSourceFlow(
  flow: readonly {
    bottom: number;
    height: number;
    left: number;
    right: number;
    top: number;
    width: number;
  }[],
  direction: string,
) {
  for (const record of flow) {
    expect(record.width).toBeGreaterThan(0);
    expect(record.height).toBeGreaterThan(0);
  }
  for (let index = 1; index < flow.length; index += 1) {
    const previous = flow[index - 1]!;
    const current = flow[index]!;
    const sameBand = Math.abs(current.top - previous.top) <= 2;
    if (sameBand) {
      if (direction === 'rtl') {
        expect(current.right, `RTL record ${index} physical source order`).toBeLessThanOrEqual(
          previous.left + 2,
        );
      } else {
        expect(current.left, `LTR record ${index} physical source order`).toBeGreaterThanOrEqual(
          previous.right - 2,
        );
      }
    } else {
      expect(current.top, `record ${index} vertical source order`).toBeGreaterThanOrEqual(
        previous.bottom - 2,
      );
    }
  }
}

function expectReadableModelAutodiffFullView(
  inlineGeometry: Awaited<ReturnType<typeof readModelAutodiffGeometry>>,
  fullGeometry: Awaited<ReturnType<typeof readModelAutodiffGeometry>>,
  inlineFlow: Awaited<ReturnType<typeof readModelAutodiffReadableFlow>>,
  fullFlow: Awaited<ReturnType<typeof readModelAutodiffReadableFlow>>,
) {
  expect(fullFlow.columns).toBe(1);
  expect(fullFlow.summaryColumns).toBe(1);
  expect(fullFlow.forwardColumns).toBe(1);
  expect(fullFlow.pullbackColumns).toBe(1);
  expect(fullFlow.accumulationColumns).toBe(1);
  expect(fullFlow.contributionColumns).toEqual([1, 1]);
  expect(fullFlow.actionPosition).toBe('static');
  for (const flow of [
    fullFlow.rootFlow,
    fullFlow.summaryFlow,
    fullFlow.forwardFlow,
    fullFlow.reverseFlow,
    fullFlow.accumulationFlow,
    ...fullFlow.contributionFlows,
  ]) {
    expectDirectionAwareSourceFlow(flow, fullFlow.direction);
  }
  for (const bounds of fullFlow.nestedContributionBounds) {
    expect(bounds.list.left).toBeGreaterThanOrEqual(bounds.parent.left - 2);
    expect(bounds.list.right).toBeLessThanOrEqual(bounds.parent.right + 2);
    expect(bounds.list.top).toBeGreaterThanOrEqual(bounds.parent.top - 2);
    expect(bounds.list.bottom).toBeLessThanOrEqual(bounds.parent.bottom + 2);
  }
  for (const span of [
    ...fullFlow.outerSpans,
    ...fullFlow.layoutOwnerSpans,
    ...fullFlow.cardSpans,
  ]) {
    expect(Math.abs(span.left - span.ownerLeft), `${span.key} start edge`).toBeLessThanOrEqual(2);
    expect(Math.abs(span.right - span.ownerRight), `${span.key} end edge`).toBeLessThanOrEqual(2);
  }

  expect(fullGeometry.widthSamples.map(({ key }) => key)).toEqual(
    inlineGeometry.widthSamples.map(({ key }) => key),
  );
  const inlineWidths = new Map(
    inlineGeometry.widthSamples.map(({ key, ...sample }) => [key, sample]),
  );
  for (const sample of fullGeometry.widthSamples) {
    const before = inlineWidths.get(sample.key);
    expect(before, `${sample.key} inline witness`).toBeDefined();
    expect(sample.kind, `${sample.key} measurement kind`).toBe(before?.kind);
    expect(sample.height, `${sample.key} full-view height`).toBeGreaterThan(0);
    expect(
      sample.width + 2,
      `${sample.key} width (${sample.width} full versus ${before?.width} inline)`,
    ).toBeGreaterThanOrEqual(before?.width ?? Number.POSITIVE_INFINITY);
    if (sample.kind === 'paint') {
      expect(sample.fragments, `${sample.key} paint fragments`).toBeLessThanOrEqual(
        before?.fragments ?? 0,
      );
    }
  }
  expect(fullGeometry.technicalTokenFragments.map(({ key }) => key)).toEqual(
    inlineGeometry.technicalTokenFragments.map(({ key }) => key),
  );
  for (let index = 0; index < fullGeometry.technicalTokenFragments.length; index += 1) {
    const before = inlineGeometry.technicalTokenFragments[index]!;
    const after = fullGeometry.technicalTokenFragments[index]!;
    expect(after.fragments, `${after.key} fullscreen token fragments`).toBe(1);
    expect(after.fragments, `${after.key} full token fragments`).toBeLessThanOrEqual(
      before.fragments,
    );
  }
  expect(fullGeometry.tableTokenFragments.map(({ key }) => key)).toEqual(
    inlineGeometry.tableTokenFragments.map(({ key }) => key),
  );
  for (let index = 0; index < fullGeometry.tableTokenFragments.length; index += 1) {
    const before = inlineGeometry.tableTokenFragments[index]!;
    const after = fullGeometry.tableTokenFragments[index]!;
    expect(after.fragments, `${after.key} fullscreen table-token fragments`).toBe(1);
    expect(after.fragments, `${after.key} table-token fragment non-regression`).toBeLessThanOrEqual(
      before.fragments,
    );
  }
  expect(Math.abs(fullFlow.scroller.left - fullFlow.scroller.ownerLeft)).toBeLessThanOrEqual(2);
  expect(Math.abs(fullFlow.scroller.right - fullFlow.scroller.ownerRight)).toBeLessThanOrEqual(2);
  expect(fullFlow.scroller.client + 2).toBeGreaterThanOrEqual(inlineFlow.scroller.client);
  expect(fullFlow.scroller.debt).toBeLessThanOrEqual(inlineFlow.scroller.debt + 2);
  expect(fullFlow.scroller.debt).toBeLessThan(fullFlow.scroller.client);
  expect(fullFlow.scroller.blockDebt).toBeLessThanOrEqual(2);
  if (fullFlow.rootBlockDebt > 2) {
    expect(fullFlow.rootOverflowY).toMatch(/^(?:auto|scroll)$/);
  }
}

async function readScrolledChromeRelation(diagram: Locator) {
  return diagram.evaluate((root) => {
    const figure = root as HTMLElement;
    const action = figure.querySelector<HTMLElement>(
      ':scope > [data-diagram-full-view-controls]',
    );
    const evidence = figure.querySelector<HTMLElement>('.accumulation-section');
    if (!action || !evidence) throw new Error('Missing Chapter 16 scroll-overlap evidence');
    const previous = figure.scrollTop;
    evidence.scrollIntoView({ block: 'start', inline: 'nearest' });
    const actionBox = action.getBoundingClientRect();
    const evidenceBox = evidence.getBoundingClientRect();
    const figureBox = figure.getBoundingClientRect();
    const figureStyle = getComputedStyle(figure);
    const scrollportStart =
      figureBox.top +
      Number.parseFloat(figureStyle.borderTopWidth) +
      Number.parseFloat(figureStyle.paddingTop);
    const overlaps = !(
      actionBox.bottom <= evidenceBox.top + 2 ||
      actionBox.top >= evidenceBox.bottom - 2 ||
      actionBox.right <= evidenceBox.left + 2 ||
      actionBox.left >= evidenceBox.right - 2
    );
    const result = {
      actionPosition: getComputedStyle(action).position,
      evidenceAtScrollport: evidenceBox.top <= scrollportStart + 3,
      overlaps,
      scrollTop: figure.scrollTop,
    };
    figure.scrollTop = previous;
    return result;
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
    order: 16,
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

  for (const fragment of localized.gatherBoundaryFragments) {
    await expect(page.locator('.lesson-body')).toContainText(fragment);
  }
  for (const fragment of localized.probabilityEvidenceFragments) {
    await expect(page.locator('.lesson-body')).toContainText(fragment);
  }

  const formulae = page.locator('.katex-display');
  expect(await formulae.count()).toBeGreaterThan(0);
  expect(
    await formulae.evaluateAll((nodes) =>
      nodes.map((node) => window.getComputedStyle(node).direction),
    ),
  ).not.toContain('rtl');
  expect(
    await formulae.locator('annotation[encoding="application/x-tex"]').allTextContents(),
  ).toEqual(expect.arrayContaining([formulaLatex, indexedMeanNllLatex]));

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
  const gatherPlanSource = page.locator(
    'figure.rust-source[data-source-region="model-row-gather-plan"]',
  );
  await expect(gatherPlanSource.locator('figcaption > span')).toHaveText(
    localized.gatherPlanCaption,
  );
  await expect(gatherPlanSource.locator('figcaption > code')).toHaveText(
    'rust/crates/llm-from-scratch/src/autograd/model_ops.rs#model-row-gather-plan',
  );
  await expect(gatherPlanSource.locator('pre')).toHaveAttribute(
    'aria-label',
    localized.gatherPlanLabel,
  );
  const gatherOperationSource = page.locator(
    'figure.rust-source[data-source-region="model-row-gather-operation"]',
  );
  await expect(gatherOperationSource.locator('figcaption > span')).toHaveText(
    localized.gatherOperationCaption,
  );
  await expect(gatherOperationSource.locator('figcaption > code')).toHaveText(
    'rust/crates/llm-from-scratch/src/autograd/model_ops.rs#model-row-gather-operation',
  );
  const logSoftmaxForwardSource = page.locator(
    'figure.rust-source[data-source-region="model-log-softmax-saved-forward"]',
  );
  await expect(logSoftmaxForwardSource.locator('figcaption > span')).toHaveText(
    localized.logSoftmaxForwardCaption,
  );
  await expect(logSoftmaxForwardSource.locator('pre')).toHaveAttribute(
    'aria-label',
    localized.logSoftmaxForwardLabel,
  );
  const indexedNllForwardSource = page.locator(
    'figure.rust-source[data-source-region="model-indexed-nll-saved-forward"]',
  );
  await expect(indexedNllForwardSource.locator('figcaption > span')).toHaveText(
    localized.indexedNllForwardCaption,
  );
  await expect(indexedNllForwardSource.locator('pre')).toHaveAttribute(
    'aria-label',
    localized.indexedNllForwardLabel,
  );
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
    id: 'model-autodiff-ops',
  });
  const diagram = page.locator(diagramSelector);
  await expect(diagram).toHaveAccessibleName(localized.diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(localized.diagramDescription);
  await expect(diagram.locator(':scope > section')).toHaveCount(3);
  for (const heading of localized.diagramSections) {
    await expect(diagram.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
  await expect(diagram.locator('.forward-fork-note')).toHaveText(localized.diagramFork);
  await expect(diagram.getByText(localized.diagramTargetRule, { exact: true })).toBeVisible();
  await expect(diagram.getByText(localized.diagramScatterRule, { exact: true })).toBeVisible();
  await expect(diagram.getByRole('table', { name: localized.targetTableCaption })).toBeVisible();
  for (const term of localized.diagramTerms) {
    await expect(diagram.getByText(term, { exact: true }).first()).toBeVisible();
  }

  expect(
    await diagram.locator('[data-forward-step]').evaluateAll((cards) =>
      cards.map((card) => ({
        step: card.getAttribute('data-forward-step'),
        operation: card.getAttribute('data-operation'),
        sources: card.getAttribute('data-sources'),
        input: card.getAttribute('data-input-shapes'),
        output: card.getAttribute('data-output-shape'),
      })),
    ),
  ).toEqual([
    { step: '0', operation: 'gather_rows', sources: 'embeddings,token_ids', input: '3x2', output: '4x2' },
    { step: '1', operation: 'matmul', sources: 'gather_rows,weights', input: '4x2,2x2', output: '4x2' },
    { step: '2', operation: 'silu', sources: 'matmul', input: '4x2', output: '4x2' },
    { step: '3', operation: 'log_softmax', sources: 'silu', input: '4x2', output: '4x2' },
    { step: '4', operation: 'indexed_mean_nll', sources: 'silu,targets', input: '4x2', output: 'scalar' },
  ]);

  expect(
    await diagram.locator('[data-target-position]').evaluateAll((rows) =>
      rows.map((row) => ({
        position: row.getAttribute('data-target-position'),
        token: row.getAttribute('data-token-id'),
        target: row.getAttribute('data-target-class'),
        gradient: row.getAttribute('data-target-gradient'),
        correct: row.getAttribute('data-correct-sign'),
        competitor: row.getAttribute('data-competitor-sign'),
        sum: row.getAttribute('data-row-sum'),
      })),
    ),
  ).toEqual([
    { position: '0', token: '1', target: '0', gradient: '-0.125000000000,0.125000000000', correct: 'negative', competitor: 'positive', sum: '0.000000000000' },
    { position: '1', token: '1', target: '0', gradient: '-0.125000000000,0.125000000000', correct: 'negative', competitor: 'positive', sum: '0.000000000000' },
    { position: '2', token: '1', target: '0', gradient: '-0.125000000000,0.125000000000', correct: 'negative', competitor: 'positive', sum: '0.000000000000' },
    { position: '3', token: '2', target: '1', gradient: '0.125000000000,-0.125000000000', correct: 'negative', competitor: 'positive', sum: '0.000000000000' },
  ]);
  const firstTargetCells = diagram.locator('[data-target-position="0"] td');
  await expect(firstTargetCells.nth(3)).toHaveAccessibleName(
    localized.selectedTargetAccessibleName,
  );
  await expect(firstTargetCells.nth(4)).toHaveAccessibleName(
    locale === 'en' ? 'positive' : 'положительный',
  );
  await expect(firstTargetCells.nth(5)).toHaveText('0.000000000000');

  expect(
    await diagram.locator('[data-pullback-operation]').evaluateAll((cards) =>
      cards.map((card) => ({
        operation: card.getAttribute('data-pullback-operation'),
        parent: card.getAttribute('data-parent'),
        operand: card.getAttribute('data-operand'),
        shape: card.getAttribute('data-shape'),
      })),
    ),
  ).toEqual([
    { operation: 'silu', parent: 'matmul', operand: 'unary', shape: '4x2' },
    { operation: 'matmul', parent: 'gathered', operand: 'left', shape: '4x2' },
    { operation: 'matmul', parent: 'weights', operand: 'right', shape: '2x2' },
  ]);

  const embeddingRows = diagram.locator('[data-embedding-row]');
  await expect(embeddingRows).toHaveCount(3);
  expect(
    await embeddingRows.evaluateAll((cards) =>
      cards.map((card) => ({
        row: card.getAttribute('data-embedding-row'),
        positions: card.getAttribute('data-positions'),
        occurrences: card.getAttribute('data-occurrences'),
        gradient: card.getAttribute('data-gradient'),
      })),
    ),
  ).toEqual([
    { row: '0', positions: 'none', occurrences: '0', gradient: '0.000000000000,0.000000000000' },
    { row: '1', positions: '0,1,2', occurrences: '3', gradient: '-0.375000000000,-0.375000000000' },
    { row: '2', positions: '3', occurrences: '1', gradient: '0.125000000000,0.125000000000' },
  ]);
  await expect(diagram.locator('[data-embedding-row="0"] [data-occurrence-position]')).toHaveCount(0);
  await expect(diagram.locator('[data-embedding-row="1"] [data-occurrence-position]')).toHaveCount(3);
  await expect(diagram.locator('[data-embedding-row="2"] [data-occurrence-position]')).toHaveCount(1);
  expect(
    await diagram.locator('[data-occurrence-position]').evaluateAll((cards) =>
      cards.map((card) => ({
        position: card.getAttribute('data-occurrence-position'),
        token: card.getAttribute('data-token-id'),
        destination: card.getAttribute('data-destination-row'),
        contribution: card.getAttribute('data-contribution'),
        repeated: card.getAttribute('data-repeated'),
      })),
    ),
  ).toEqual([
    { position: '0', token: '1', destination: '1', contribution: '-0.125000000000,-0.125000000000', repeated: 'yes' },
    { position: '1', token: '1', destination: '1', contribution: '-0.125000000000,-0.125000000000', repeated: 'yes' },
    { position: '2', token: '1', destination: '1', contribution: '-0.125000000000,-0.125000000000', repeated: 'yes' },
    { position: '3', token: '2', destination: '2', contribution: '0.125000000000,0.125000000000', repeated: 'no' },
  ]);

  await expect(diagram.locator('[data-check-operation], [data-gradcheck-operation], [data-error-kind]')).toHaveCount(0);
  await expect(diagram.locator('[data-diagram-scroll]')).toHaveCount(1);
  const scroller = diagram.locator('[data-diagram-scroll]');
  await scroller.focus();
  await expect(scroller).toBeFocused();

  const diagramLatex = await diagram
    .locator('annotation[encoding="application/x-tex"]')
    .allTextContents();
  for (const expected of [String.raw`i=1,\;n=3`, '[3,2]', '[4,2]', '[2,2]', '[]']) {
    expect(diagramLatex).toContain(expected);
  }
  expect(
    await diagram.locator('code, bdi').evaluateAll((nodes) =>
      nodes.every((node) => window.getComputedStyle(node).direction === 'ltr'),
    ),
  ).toBe(true);

  if (narrow) {
    const widths = await scroller.evaluate((node) => ({
      client: node.clientWidth,
      scroll: node.scrollWidth,
    }));
    expect(widths.scroll).toBeGreaterThan(widths.client);
    for (const selector of ['.forward-card', '.pullback-card', '.embedding-card']) {
      const positions = await diagram.locator(selector).evaluateAll((cards) =>
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

  await page.waitForFunction(
    () => document.documentElement.dataset.diagramFullViewReady === 'true',
  );
  const fullViewToggle = diagram.locator('[data-diagram-full-view-toggle]');
  if (narrow) {
    await expect(diagram.locator('[data-diagram-full-view-controls]')).toHaveCount(0);
    await expect(fullViewToggle).toHaveCount(0);
  } else {
    await expect(diagram.locator('[data-diagram-full-view-controls]')).toHaveCount(1);
    await expect(fullViewToggle).toHaveCount(1);
    await expect(fullViewToggle).toBeVisible();
  }
  await settle(page);
  expectCompleteModelAutodiffGeometry(await readModelAutodiffGeometry(diagram));

  const exerciseDetails = page.locator('.lesson-body details');
  await expect(exerciseDetails).toHaveCount(1);
  await exerciseDetails.locator('summary').click();
  await expect(exerciseDetails).toHaveAttribute('open', '');
  await expect(exerciseDetails.locator('ol > li')).toHaveCount(10);

  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe('chapter 16 localized model-autodiff-ops vertical slice', {
  tag: chapterTag(chapterId),
}, () => {
  test.describe.configure({ mode: 'serial' });

  test('chapter 16 is sixteenth on both indexes with direct equivalent locale routes', async ({
    page,
  }) => {
    for (const locale of chapterLocales) {
      const localized = copy[locale];
      const chapters = await readOrderedCourseChapters(page, locale);
      expect(chapters.length).toBeGreaterThanOrEqual(16);
      expect(chapters[15]).toEqual(
        expect.objectContaining({ chapterId, order: 16, title: localized.title }),
      );
      await page.getByRole('link', { name: localized.title, exact: true }).click();
      await expectLocalizedChapterRoute(page, {
        chapterId,
        locale,
        order: 16,
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

  test('both locales reuse every authored node in a full-width vertical full view', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(standardFullView);

    for (const locale of chapterLocales) {
      await page.goto(chapterPath(locale, chapterId));
      await page.waitForFunction(
        () => document.documentElement.dataset.diagramFullViewReady === 'true',
      );
      await settle(page);

      const diagram = page.locator(diagramSelector);
      const toggle = diagram.locator('[data-diagram-full-view-toggle]');
      await expect(toggle).toHaveCount(1);
      await expect(toggle).toBeVisible();
      const beforeMarkup = await staticDiagramMarkup(diagram);
      const inlineEvidence = await readModelAutodiffEvidence(diagram);
      const inlineGeometry = await readModelAutodiffGeometry(diagram);
      const inlineFlow = await readModelAutodiffReadableFlow(diagram);
      expectCompleteModelAutodiffGeometry(inlineGeometry);
      const authoredCount = await rememberAuthoredNodes(
        diagram,
        '__chapter16AuthoredNodes',
      );
      expect(authoredCount).toBe(715);

      await toggle.click();
      await page.waitForFunction(
        () =>
          document.fullscreenElement?.getAttribute('data-visualization-id') ===
          'model-autodiff-ops',
      );
      await settle(page);

      expect(await staticDiagramMarkup(diagram)).toBe(beforeMarkup);
      expect(await authoredNodesAreUnchanged(diagram, '__chapter16AuthoredNodes')).toBe(
        true,
      );
      expect(await readModelAutodiffEvidence(diagram)).toEqual(inlineEvidence);
      const fullGeometry = await readModelAutodiffGeometry(diagram);
      const fullFlow = await readModelAutodiffReadableFlow(diagram);
      expectCompleteModelAutodiffGeometry(fullGeometry);
      expectReadableModelAutodiffFullView(
        inlineGeometry,
        fullGeometry,
        inlineFlow,
        fullFlow,
      );
      expectFontsNotShrunk(inlineGeometry, fullGeometry);
      expectRootOwnsVerticalContinuation(fullGeometry);
      expect(await readScrolledChromeRelation(diagram)).toEqual(
        expect.objectContaining({
          actionPosition: 'static',
          evidenceAtScrollport: true,
          overlaps: false,
        }),
      );

      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.fullscreenElement === null);
      await expect(toggle).toBeFocused();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(await authoredNodesAreUnchanged(diagram, '__chapter16AuthoredNodes')).toBe(
        true,
      );
      expect(await staticDiagramMarkup(diagram)).toBe(beforeMarkup);
      expect(await readModelAutodiffEvidence(diagram)).toEqual(inlineEvidence);
      await expectNoOverflowOrClientScripts(page);
    }
  });

  test('the minimum eligible surface keeps every record full width without shrinking', async ({
    browser,
    browserName,
  }, testInfo) => {
    test.setTimeout(120_000);
    const baseURL = testInfo.project.use.baseURL;
    if (typeof baseURL !== 'string') throw new Error('Playwright baseURL is required');
    const context = await browser.newContext({
      baseURL,
      screen: minimumFullView,
      viewport: minimumFullView,
    });
    const page = await context.newPage();

    try {
      for (const locale of chapterLocales) {
        await page.goto(chapterPath(locale, chapterId));
        await page.waitForFunction(
          () => document.documentElement.dataset.diagramFullViewReady === 'true',
        );
        await settle(page);
        const diagram = page.locator(diagramSelector);
        const toggle = diagram.locator('[data-diagram-full-view-toggle]');
        await expect(toggle).toHaveCount(1);
        await expect(toggle).toBeVisible();
        const beforeMarkup = await staticDiagramMarkup(diagram);
        const inlineEvidence = await readModelAutodiffEvidence(diagram);
        const inlineGeometry = await readModelAutodiffGeometry(diagram);
        const inlineFlow = await readModelAutodiffReadableFlow(diagram);
        expectCompleteModelAutodiffGeometry(inlineGeometry);
        const authoredCount = await rememberAuthoredNodes(
          diagram,
          '__chapter16MinimumAuthoredNodes',
        );
        expect(authoredCount).toBe(715);

        await toggle.click();
        await page.waitForFunction(
          () =>
            document.fullscreenElement?.getAttribute('data-visualization-id') ===
            'model-autodiff-ops',
        );
        await settle(page);
        expect(await staticDiagramMarkup(diagram)).toBe(beforeMarkup);
        expect(
          await authoredNodesAreUnchanged(diagram, '__chapter16MinimumAuthoredNodes'),
        ).toBe(true);
        expect(await readModelAutodiffEvidence(diagram)).toEqual(inlineEvidence);
        const fullGeometry = await readModelAutodiffGeometry(diagram);
        const fullFlow = await readModelAutodiffReadableFlow(diagram);
        expectCompleteModelAutodiffGeometry(fullGeometry);
        expectReadableModelAutodiffFullView(
          inlineGeometry,
          fullGeometry,
          inlineFlow,
          fullFlow,
        );
        expectFontsNotShrunk(inlineGeometry, fullGeometry);
        expectRootOwnsVerticalContinuation(fullGeometry);
        expect(await readScrolledChromeRelation(diagram)).toEqual(
          expect.objectContaining({
            actionPosition: 'static',
            evidenceAtScrollport: true,
            overlaps: false,
          }),
        );

        const surface = await page.evaluate(() => ({
          innerHeight,
          innerWidth,
          screenHeight: screen.height,
          screenWidth: screen.width,
        }));
        expect(surface.screenWidth).toBe(1024);
        expect(surface.screenHeight).toBe(576);
        if (browserName === 'chromium') {
          expect(surface.innerWidth).toBe(1024);
          expect(surface.innerHeight).toBe(576);
          expect(fullGeometry.viewportHeight).toBe(574);
        } else if (browserName === 'firefox') {
          expect(surface.innerWidth).toBeGreaterThanOrEqual(1280);
          expect(surface.innerHeight).toBeGreaterThanOrEqual(768);
        } else {
          throw new Error(`Unsupported Chapter 16 full-view engine ${browserName}`);
        }

        await page.keyboard.press('Escape');
        await page.waitForFunction(() => document.fullscreenElement === null);
        await expect(toggle).toBeFocused();
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        expect(
          await authoredNodesAreUnchanged(diagram, '__chapter16MinimumAuthoredNodes'),
        ).toBe(true);
        expect(await readModelAutodiffEvidence(diagram)).toEqual(inlineEvidence);
      }
    } finally {
      await context.close();
    }
  });

  test('Russian keeps exact redundant cues, technical direction, and source order in forced colors and RTL', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.emulateMedia({ forcedColors: 'active' });
    await page.setViewportSize(standardFullView);
    await page.goto(chapterPath('ru', chapterId));
    await page.waitForFunction(
      () => document.documentElement.dataset.diagramFullViewReady === 'true',
    );
    expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(
      true,
    );

    const diagram = page.locator(diagramSelector);
    await diagram.evaluate((node) => node.setAttribute('dir', 'rtl'));
    await settle(page);
    const readDirectionAndCues = () =>
      diagram.evaluate((root) => {
        const style = (selector: string) =>
          getComputedStyle(root.querySelector<HTMLElement>(selector)!);
        const mirrored = Array.from(
          root.querySelectorAll<HTMLElement>(
            '.forward-card > .card-state .state-symbol, .pullback-card > .card-state .state-symbol, .embedding-single > .card-state .state-symbol, .occurrence-no > .card-state .state-symbol',
          ),
        );
        const fixed = Array.from(root.querySelectorAll<HTMLElement>('.state-symbol')).filter(
          (symbol) => !mirrored.includes(symbol),
        );
        return {
          forcedColors: matchMedia('(forced-colors: active)').matches,
          repeatedBorder: style('[data-embedding-row="1"]').borderTopStyle,
          singleBorder: style('[data-embedding-row="2"]').borderTopStyle,
          unusedBorder: style('[data-embedding-row="0"]').borderTopStyle,
          repeatedOccurrenceBorders: Array.from(
            root.querySelectorAll<HTMLElement>('.occurrence-yes'),
          ).map((record) => getComputedStyle(record).borderTopStyle),
          singleOccurrenceBorder: style('.occurrence-no').borderTopStyle,
          pullbackBorders: Array.from(
            root.querySelectorAll<HTMLElement>('.pullback-card'),
          ).map((record) => getComputedStyle(record).borderTopStyle),
          stateSymbols: Array.from(root.querySelectorAll<HTMLElement>('.state-symbol')).map(
            (symbol) => symbol.textContent?.trim(),
          ),
          signCues: Array.from(root.querySelectorAll<HTMLElement>('.sign-cue')).map(
            (symbol) => symbol.textContent?.trim(),
          ),
          mirroredTransforms: mirrored.map((symbol) => getComputedStyle(symbol).transform),
          fixedTransforms: fixed.map((symbol) => getComputedStyle(symbol).transform),
          proseDirections: Array.from(
            root.querySelectorAll<HTMLElement>('h3, h4, p, dt, th'),
          ).map((element) => getComputedStyle(element).direction),
          technicalDirections: Array.from(
            root.querySelectorAll<HTMLElement>('code, bdi'),
          ).map((element) => getComputedStyle(element).direction),
          formulaDirections: Array.from(root.querySelectorAll<HTMLElement>('.katex')).map(
            (element) => getComputedStyle(element).direction,
          ),
        };
      });
    const expectDirectionAndCues = (
      evidence: Awaited<ReturnType<typeof readDirectionAndCues>>,
    ) => {
      expect(evidence.forcedColors).toBe(true);
      expect(evidence.repeatedBorder).toBe('double');
      expect(evidence.singleBorder).toBe('dashed');
      expect(evidence.unusedBorder).toBe('dotted');
      expect(evidence.repeatedOccurrenceBorders).toEqual(['double', 'double', 'double']);
      expect(evidence.singleOccurrenceBorder).toBe('dashed');
      expect(evidence.pullbackBorders).toEqual(['dashed', 'dashed', 'dashed']);
      expect(evidence.stateSymbols).toEqual([
        '→',
        '→',
        '→',
        '→',
        '→',
        '←',
        '←',
        '←',
        '∅',
        'Σ',
        'Σ',
        'Σ',
        'Σ',
        '↦',
        '↦',
      ]);
      expect(evidence.signCues).toEqual(['−', '+', '−', '+', '−', '+', '−', '+']);
      expect(evidence.mirroredTransforms).toHaveLength(10);
      expect(
        evidence.mirroredTransforms.every((transform) =>
          /^matrix\(-1(?:\.0+)?, 0(?:\.0+)?, 0(?:\.0+)?, 1(?:\.0+)?, 0(?:\.0+)?, 0(?:\.0+)?\)$/.test(
            transform,
          ),
        ),
      ).toBe(true);
      expect(evidence.fixedTransforms).toEqual(['none', 'none', 'none', 'none', 'none']);
      expect(evidence.proseDirections.every((direction) => direction === 'rtl')).toBe(true);
      expect(evidence.technicalDirections).toHaveLength(55);
      expect(evidence.technicalDirections.every((direction) => direction === 'ltr')).toBe(
        true,
      );
      expect(evidence.formulaDirections).toHaveLength(15);
      expect(evidence.formulaDirections.every((direction) => direction === 'ltr')).toBe(true);
    };

    const inlineCues = await readDirectionAndCues();
    expectDirectionAndCues(inlineCues);
    const inlineGeometry = await readModelAutodiffGeometry(diagram);
    const inlineFlow = await readModelAutodiffReadableFlow(diagram);
    const inlineEvidence = await readModelAutodiffEvidence(diagram);
    expectCompleteModelAutodiffGeometry(inlineGeometry);
    for (const flow of [
      inlineFlow.summaryFlow,
      inlineFlow.forwardFlow,
      inlineFlow.reverseFlow,
      inlineFlow.accumulationFlow,
      ...inlineFlow.contributionFlows,
    ]) {
      expectDirectionAwareSourceFlow(flow, 'rtl');
    }
    const authoredCount = await rememberAuthoredNodes(diagram, '__chapter16RtlNodes');
    expect(authoredCount).toBe(715);

    const toggle = diagram.locator('[data-diagram-full-view-toggle]');
    await toggle.click();
    await page.waitForFunction(
      () =>
        document.fullscreenElement?.getAttribute('data-visualization-id') ===
        'model-autodiff-ops',
    );
    await settle(page);
    expectDirectionAndCues(await readDirectionAndCues());
    expect(await authoredNodesAreUnchanged(diagram, '__chapter16RtlNodes')).toBe(true);
    expect(await readModelAutodiffEvidence(diagram)).toEqual(inlineEvidence);
    const fullGeometry = await readModelAutodiffGeometry(diagram);
    const fullFlow = await readModelAutodiffReadableFlow(diagram);
    expectCompleteModelAutodiffGeometry(fullGeometry);
    expectReadableModelAutodiffFullView(
      inlineGeometry,
      fullGeometry,
      inlineFlow,
      fullFlow,
    );
    expectFontsNotShrunk(inlineGeometry, fullGeometry);
    expectRootOwnsVerticalContinuation(fullGeometry);
    expect(await readScrolledChromeRelation(diagram)).toEqual(
      expect.objectContaining({
        actionPosition: 'static',
        evidenceAtScrollport: true,
        overlaps: false,
      }),
    );

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.fullscreenElement === null);
    await expect(toggle).toBeFocused();
    expect(await authoredNodesAreUnchanged(diagram, '__chapter16RtlNodes')).toBe(true);
    await expectNoOverflowOrClientScripts(page);
  });

  test('both localized figures remain complete without JavaScript or the Fullscreen API', async ({
    browser,
  }, testInfo) => {
    test.setTimeout(120_000);
    const baseURL = testInfo.project.use.baseURL;
    if (typeof baseURL !== 'string') throw new Error('Playwright baseURL is required');

    for (const locale of chapterLocales) {
      for (const viewport of [desktop, narrowViewport]) {
        const context = await browser.newContext({
          baseURL,
          javaScriptEnabled: false,
          viewport,
        });
        const page = await context.newPage();
        try {
          await page.goto(chapterPath(locale, chapterId));
          await page.waitForLoadState('networkidle');
          await expect(
            page.getByRole('heading', { level: 1, name: copy[locale].title }),
          ).toBeVisible();
          const diagram = page.locator(diagramSelector);
          await expect(diagram).toBeVisible();
          await expect(diagram.locator('[data-diagram-full-view-controls]')).toHaveCount(0);
          await expect(diagram.locator('[data-diagram-full-view-toggle]')).toHaveCount(0);
          await expect(diagram.locator('[data-forward-step]')).toHaveCount(5);
          await expect(diagram.locator('[data-target-position]')).toHaveCount(4);
          await expect(diagram.locator('[data-pullback-operation]')).toHaveCount(3);
          await expect(diagram.locator('[data-embedding-row]')).toHaveCount(3);
          await expect(diagram.locator('[data-occurrence-position]')).toHaveCount(4);
          await expect(diagram.locator(':scope > section')).toHaveCount(3);
          await expect(diagram.locator('[data-diagram-scroll]')).toHaveCount(1);
          await expect(
            diagram.locator(
              '[data-check-operation], [data-gradcheck-operation], [data-error-kind]',
            ),
          ).toHaveCount(0);
          const diagramRect = await diagram.boundingBox();
          expect(diagramRect?.width ?? 0).toBeGreaterThan(0);
          expect(diagramRect?.height ?? 0).toBeGreaterThan(0);
          expectCompleteModelAutodiffGeometry(await readModelAutodiffGeometry(diagram));
          const evidence = await readModelAutodiffEvidence(diagram);
          expect(evidence.forward).toHaveLength(5);
          expect(evidence.targets).toHaveLength(4);
          expect(evidence.pullbacks).toHaveLength(3);
          expect(evidence.embeddings).toHaveLength(3);
          expect(evidence.occurrences).toHaveLength(4);
          if (viewport.width === narrowViewport.width) {
            const travel = await diagram.locator('[data-diagram-scroll]').evaluate((node) => ({
              client: node.clientWidth,
              scroll: node.scrollWidth,
            }));
            expect(travel.scroll).toBeGreaterThan(travel.client);
          }
          await expectNoOverflowOrClientScripts(page);
        } finally {
          await context.close();
        }
      }
    }

    const unsupportedContext = await browser.newContext({ baseURL, viewport: desktop });
    await unsupportedContext.addInitScript(() => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        configurable: true,
        value: false,
      });
    });
    const unsupportedPage = await unsupportedContext.newPage();
    try {
      await unsupportedPage.goto(chapterPath('en', chapterId));
      await unsupportedPage.waitForFunction(
        () => document.documentElement.dataset.diagramFullViewReady === 'true',
      );
      const diagram = unsupportedPage.locator(diagramSelector);
      await expect(diagram).toBeVisible();
      await expect(diagram.locator('[data-diagram-full-view-controls]')).toHaveCount(0);
      await expect(diagram.locator('[data-diagram-full-view-toggle]')).toHaveCount(0);
      await settle(unsupportedPage);
      expectCompleteModelAutodiffGeometry(await readModelAutodiffGeometry(diagram));
      expect((await readModelAutodiffEvidence(diagram)).occurrences).toHaveLength(4);
      await expectNoOverflowOrClientScripts(unsupportedPage);
    } finally {
      await unsupportedContext.close();
    }
  });
});
