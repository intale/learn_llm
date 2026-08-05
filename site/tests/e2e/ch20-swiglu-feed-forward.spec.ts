// @ts-ignore Node APIs are available in the Playwright test runner.
import { readFileSync } from "node:fs";
// @ts-ignore Node APIs are available in the Playwright test runner.
import { resolve } from "node:path";

import { expect, test, type Locator, type Page } from "@playwright/test";

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
} from "./chapter-helpers";

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
  stages: {
    positions: string;
    gate: string;
    up: string;
    merge: string;
    down: string;
    independence: string;
    gradients: string;
  };
  notes: readonly string[];
  independenceLabels: readonly string[];
  positionGradientLabels: readonly string[];
  parameterLabels: readonly string[];
  biasFree: string;
  unchanged: string;
  positionGradientCaption: string;
  parameterGradientCaption: string;
  computation: string;
  forwardScroller: string;
  scroller: string;
}

const chapterId = "20-swiglu-feed-forward";
const contentRevision = 3;
const repositoryRoot = resolve(process.cwd(), "..");
const normalizeMath = (value: string) => value.replace(/\s+/g, "");

const fixtureFormulaLatex = String.raw`\begin{aligned}
X &= \begin{bmatrix}1&0\\0&1\end{bmatrix}, \\
W_g &= \begin{bmatrix}-1&0&1\\0&1&-1\end{bmatrix}, \\
W_u &= \begin{bmatrix}1&2&3\\3&2&1\end{bmatrix}, \\
W_2 &= \begin{bmatrix}1&0\\0&1\\1&-1\end{bmatrix}.
\end{aligned}`;
const workedStagesFormulaLatex = String.raw`\begin{aligned}
XW_g &=
\begin{bmatrix}-1&0&1\\0&1&-1\end{bmatrix}, \\
\operatorname{SiLU}(XW_g) &\approx
\begin{bmatrix}-0.268941&0&0.731059\\0&0.731059&-0.268941\end{bmatrix}, \\
XW_u &=
\begin{bmatrix}1&2&3\\3&2&1\end{bmatrix}, \\
\operatorname{SiLU}(XW_g)\odot(XW_u) &\approx
\begin{bmatrix}-0.268941&0&2.193176\\0&1.462117&-0.268941\end{bmatrix}, \\
Y &\approx
\begin{bmatrix}1.924234&-2.193176\\-0.268941&1.731059\end{bmatrix}.
\end{aligned}`;
const forwardFormulaLatex = String.raw`\operatorname{FFN}(X)=\left(\operatorname{SiLU}(XW_g)\odot(XW_u)\right)W_2`;
const activationFormulaLatex = String.raw`\sigma(z)=\frac{1}{1+e^{-z}},
\qquad
\operatorname{SiLU}(z)=z\sigma(z).`;
const intermediateFormulaLatex = String.raw`A=XW_g,\qquad
S=\operatorname{SiLU}(A),\qquad
U=XW_u,\qquad
H=S\odot U,\qquad
Y=HW_2.`;
const reverseFormulaLatex = String.raw`\begin{aligned}
dH &= GW_2^\top, \\
dS &= dH\odot U, \\
dU &= dH\odot S, \\
dA &= dS\odot\operatorname{SiLU}'(A), \\
dX_p &= dA_pW_g^\top+dU_pW_u^\top, \\
dW_g &= \sum_p X_p^\top dA_p, \\
dW_u &= \sum_p X_p^\top dU_p, \\
dW_2 &= \sum_p H_p^\top G_p.
\end{aligned}`;
const bengioFormulaLatex = String.raw`y=b+Wx+U\tanh(d+Hx).`;
const transformerFormulaLatex = String.raw`\operatorname{FFN}(x)=\max(0,xW_1+b_1)W_2+b_2.`;

const copy: Record<ChapterLocale, LocalizedCopy> = {
  en: {
    revisionLabel: "Content revision",
    title: "Let one learned branch gate another",
    description:
      "Build a position-wise SwiGLU feed-forward layer, follow its activated gate and linear up branches, and verify exact outputs and gradients.",
    headings: [
      "Predict the two branch products",
      "Activate one branch, then multiply",
      "Expand features without mixing positions",
      "From nonlinear neural language models to SwiGLU",
      "Compose the cumulative differentiable operations",
      "Trace the gate, merge, and reverse split",
      "Predict before checking the executable evidence",
      "Hand the nonlinear token transform to batching",
    ],
    historyHeading: "From nonlinear neural language models to SwiGLU",
    historyFragments: [
      "An early feed-forward neural language model used one elementwise tanh hidden transformation over a fixed context.",
      "The original Transformer made the feed-forward computation position-wise and wider, but its single activated branch still lacked an input-dependent multiplicative interaction between two learned projections.",
      "Shazeer then tests GLU-family replacements whose two projected branches meet through elementwise multiplication; the SwiGLU variant activates one branch with Swish at beta one before the product.",
      "A modern decoder can use a bias-free SwiGLU sublayer to expand each token representation, modulate one learned branch with another, and contract to the width needed by the next residual path, while attention remains responsible for mixing positions.",
      "those experiments do not by themselves establish why SwiGLU works",
      "The papers establish the architecture, not the exact dimensions, bias policy, parameter names, seed, or error behavior used by this implementation.",
    ],
    diagramTitle:
      "Follow two projected branches through one position-wise SwiGLU layer",
    diagramDescription:
      "Follow Rust-authored forward values, branch gradients, shared-parameter sums, and a position-independence probe for one two-position fixture.",
    summaryLabels: [
      "Input width",
      "Branch width",
      "Output width",
      "Projection policy",
      "Parameter scalars",
      "Input shape",
      "Branch shape",
      "Output shape",
    ],
    stages: {
      positions: "Transform each position independently",
      gate: "Gate branch: project, then activate",
      up: "Up branch: project without activation",
      merge: "Multiply equal coordinates",
      down: "Contract the gated features",
      independence: "Change one position; observe the other",
      gradients: "Split local gradients; accumulate shared weights",
    },
    notes: [
      "The same three weight matrices serve both rows; positions never connect.",
      "SiLU can be negative, zero, or positive; it is not a probability mask.",
      "Each input receives a local gradient. The three shared weights collect contributions from both positions.",
      "Rust replaces position zero with an all-zero input and recomputes the layer. Position one is byte-for-byte unchanged.",
      "The diagram rounds to six decimals; the report keeps twelve.",
    ],
    independenceLabels: [
      "Changed position",
      "Replacement input",
      "Observed position",
      "Output before",
      "Output after",
      "Result",
    ],
    positionGradientLabels: [
      "Upstream gradient",
      "Gradient at gated features",
      "Gradient before SiLU",
      "Gradient at up branch",
      "Returned input gradient",
    ],
    parameterLabels: [
      "Shared parameter",
      "Sum across positions",
      "Shape",
      "Accumulated gradient",
    ],
    biasFree: "Bias-free",
    unchanged: "Unchanged",
    positionGradientCaption:
      "Gradients returned through the two branches at each position",
    parameterGradientCaption:
      "Gradients accumulated into the three shared weights",
    computation: "Computation",
    forwardScroller: "Scrollable per-position forward computation table",
    scroller: "Scrollable shared-parameter gradient table",
  },
  ru: {
    revisionLabel: "Версия материала",
    title: "Управляйте ветвью расширения с помощью обучаемого вентиля",
    description:
      "Соберите применяемый отдельно к каждой позиции слой прямого распространения SwiGLU, проследите его вентильную ветвь с активацией и ветвь расширения и проверьте точные выходы и градиенты.",
    headings: [
      "Предскажите произведения двух ветвей",
      "Активируйте одну ветвь, затем перемножьте",
      "Расширяйте признаки, не смешивая позиции",
      "От нелинейных нейросетевых моделей языка к SwiGLU",
      "Скомпонуйте уже реализованные дифференцируемые операции",
      "Проследите вентиль, слияние и разветвление обратного прохода",
      "Сначала предскажите, затем сверьтесь с исполняемым примером",
      "Перейдите от нелинейного преобразования токенов к пакетной обработке",
    ],
    historyHeading: "От нелинейных нейросетевых моделей языка к SwiGLU",
    historyFragments: [
      "В ранней нейросетевой модели языка с прямым распространением использовалось одно поэлементное преобразование скрытого слоя tanh над контекстом фиксированной длины.",
      "В исходной архитектуре Transformer сеть прямого распространения стала применяться отдельно к каждой позиции и получила более широкое внутреннее представление, однако единственная ветвь с активацией всё ещё не создавала зависящего от входа мультипликативного взаимодействия между двумя обучаемыми проекциями.",
      "Затем Shazeer исследует замены из семейства GLU, в которых две спроецированные ветви соединяются поэлементным умножением; в варианте SwiGLU одна ветвь перед произведением активируется функцией Swish при",
      "Современный декодер может использовать подслой SwiGLU без смещений: расширять представление каждого токена, модулировать одну обучаемую ветвь другой, а затем возвращать результат к ширине модели, необходимой для остаточного пути.",
      "сами по себе эти эксперименты не объясняют, почему SwiGLU работает",
      "Источники определяют архитектуру, но не размеры, вариант со смещениями или без них, имена параметров, начальное состояние генератора и обработку ошибок в этой реализации.",
    ],
    diagramTitle:
      "Проследите две ветви проекций в слое SwiGLU, применяемом к каждой позиции",
    diagramDescription:
      "На примере из двух позиций показаны вычисленные в Rust значения прямого прохода, градиенты ветвей, суммы для общих параметров и проверка независимости позиций.",
    summaryLabels: [
      "Ширина входа",
      "Ширина ветвей",
      "Ширина выхода",
      "Вариант проекций",
      "Скалярных параметров",
      "Форма входа",
      "Форма ветвей",
      "Форма выхода",
    ],
    stages: {
      positions: "Обработайте каждую позицию отдельно",
      gate: "Вентильная ветвь: проекция и активация",
      up: "Ветвь расширения: проекция без активации",
      merge: "Перемножьте соответствующие координаты",
      down: "Сожмите признаки после вентиля",
      independence: "Измените одну позицию; проверьте другую",
      gradients: "Разделите локальные градиенты и сложите вклады в общие веса",
    },
    notes: [
      "Обе строки используют три общие матрицы весов; позиции не связаны.",
      "SiLU даёт число любого знака или ноль; это не вероятностная маска.",
      "Каждый вход получает локальный градиент. В трёх общих матрицах весов складываются вклады обеих позиций.",
      "Rust заменяет вход позиции 0 нулями и пересчитывает слой; выход позиции 1 побайтно не меняется.",
      "Схема округляет до шести знаков; отчёт сохраняет двенадцать.",
    ],
    independenceLabels: [
      "Меняемая позиция",
      "Новый вход",
      "Наблюдаемая позиция",
      "Выход до замены",
      "Выход после замены",
      "Результат",
    ],
    positionGradientLabels: [
      "Входящий градиент",
      "Градиент по признакам после вентиля",
      "Градиент до SiLU",
      "Градиент по выходу ветви расширения",
      "Градиент входа",
    ],
    parameterLabels: [
      "Общий параметр",
      "Сумма по позициям",
      "Форма",
      "Накопленный градиент",
    ],
    biasFree: "Без смещений",
    unchanged: "Без изменений",
    positionGradientCaption:
      "Градиенты, возвращаемые через две ветви в каждой позиции",
    parameterGradientCaption:
      "Градиенты, накопленные в трёх общих матрицах весов",
    computation: "Вычисление",
    forwardScroller: "Прокручиваемая таблица прямого прохода по позициям",
    scroller: "Прокручиваемая таблица градиентов общих параметров",
  },
};

const historySources = [
  "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
  "https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf",
  "https://arxiv.org/pdf/2002.05202",
] as const;

const expectedRustRegions = [
  ["rust/demos/ch20-swiglu-feed-forward/src/lib.rs", "known-swiglu-forward"],
  [
    "rust/demos/ch20-swiglu-feed-forward/src/lib.rs",
    "historical-activation-contrast",
  ],
  ["rust/crates/llm-from-scratch/src/nn/swiglu.rs", "swiglu-errors"],
  ["rust/crates/llm-from-scratch/src/nn/swiglu.rs", "swiglu-layer"],
  ["rust/demos/ch20-swiglu-feed-forward/src/lib.rs", "swiglu-gradients"],
  ["rust/demos/ch20-swiglu-feed-forward/src/lib.rs", "initialized-swiglu"],
  ["rust/demos/ch20-swiglu-feed-forward/src/lib.rs", "position-independence"],
  ["rust/demos/ch20-swiglu-feed-forward/src/main.rs", "learner-swiglu-output"],
  [
    "rust/demos/ch20-swiglu-feed-forward/src/diagram_trace.rs",
    "swiglu-feed-forward-trace",
  ],
] as const;

function readRustRegion(path: string, region: string): string {
  const lines = readFileSync(resolve(repositoryRoot, path), "utf8").split(
    /\r?\n/,
  );
  const start = lines.findIndex(
    (line: string) => line.trim() === `// region:${region}`,
  );
  const end = lines.findIndex(
    (line: string) => line.trim() === `// endregion:${region}`,
  );
  if (start === -1 || end <= start) {
    throw new Error(`Missing ordered Rust region ${region} in ${path}`);
  }
  return lines.slice(start + 1, end).join("\n");
}

const expectedRustSources = expectedRustRegions.map(([path, region]) =>
  readRustRegion(path, region),
);

const expectedPositionFormulae = {
  0: [
    "0",
    String.raw`X_{0}=\left[1,0\right]`,
    String.raw`g_{0}=X_{0}W_g`,
    String.raw`g_{0}=\left[-1,0,1\right]`,
    String.raw`s_{0}=\left[-0.268941,0,0.731059\right]`,
    String.raw`u_{0}=X_{0}W_u`,
    String.raw`u_{0}=\left[1,2,3\right]`,
    String.raw`h_{0}=\left[-0.268941,0,2.193176\right]`,
    String.raw`Y_{0}=\left[1.924234,-2.193176\right]`,
  ],
  1: [
    "1",
    String.raw`X_{1}=\left[0,1\right]`,
    String.raw`g_{1}=X_{1}W_g`,
    String.raw`g_{1}=\left[0,1,-1\right]`,
    String.raw`s_{1}=\left[0,0.731059,-0.268941\right]`,
    String.raw`u_{1}=X_{1}W_u`,
    String.raw`u_{1}=\left[3,2,1\right]`,
    String.raw`h_{1}=\left[0,1.462117,-0.268941\right]`,
    String.raw`Y_{1}=\left[-0.268941,1.731059\right]`,
  ],
} as const;

const expectedPositionGradientFormulae = {
  0: [
    "0",
    String.raw`G_{0}`,
    String.raw`\left[1,0\right]`,
    String.raw`dH_{0}`,
    String.raw`\left[1,0,1\right]`,
    String.raw`dA_{0}`,
    String.raw`\left[0.072329,0,2.783012\right]`,
    String.raw`dU_{0}`,
    String.raw`\left[-0.268941,0,0.731059\right]`,
    String.raw`dX_{0}`,
    String.raw`\left[4.634916,-2.858777\right]`,
  ],
  1: [
    "1",
    String.raw`G_{1}`,
    String.raw`\left[0,1\right]`,
    String.raw`dH_{1}`,
    String.raw`\left[0,1,-1\right]`,
    String.raw`dA_{1}`,
    String.raw`\left[0,1.855341,-0.072329\right]`,
    String.raw`dU_{1}`,
    String.raw`\left[0,0.731059,0.268941\right]`,
    String.raw`dX_{1}`,
    String.raw`\left[2.196612,3.658729\right]`,
  ],
} as const;

const expectedParameterRows = [
  [
    String.raw`W_g ffn.gate.weight`,
    String.raw`\sum_p X_p^\top dA_p`,
    String.raw`\left[2,3\right]`,
    String.raw`\begin{bmatrix}0.072329&0&2.783012\\0&1.855341&-0.072329\end{bmatrix}`,
  ],
  [
    String.raw`W_u ffn.up.weight`,
    String.raw`\sum_p X_p^\top dU_p`,
    String.raw`\left[2,3\right]`,
    String.raw`\begin{bmatrix}-0.268941&0&0.731059\\0&0.731059&0.268941\end{bmatrix}`,
  ],
  [
    String.raw`W_2 ffn.down.weight`,
    String.raw`\sum_p H_p^\top G_p`,
    String.raw`\left[3,2\right]`,
    String.raw`\begin{bmatrix}-0.268941&0\\0&1.462117\\2.193176&-0.268941\end{bmatrix}`,
  ],
] as const;

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
        clone.querySelectorAll(".katex").forEach((math) => {
          const source =
            math.querySelector('annotation[encoding="application/x-tex"]')
              ?.textContent ?? "";
          math.replaceWith(document.createTextNode(` ${source} `));
        });
        return (clone.textContent ?? "").replace(/\s+/g, " ").trim();
      }),
    ),
  );
}

async function expectFormulaGeometry(page: Page) {
  await settle(page);
  const problems = await page
    .locator(
      ".lesson-body .katex-display, .lesson-body .katex:not(.katex-display .katex)",
    )
    .evaluateAll((nodes) =>
      nodes.flatMap((node, index) => {
        const element = node as HTMLElement;
        if (element.closest("figure.course-diagram")) return [];
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
        const mathml = element.querySelector<HTMLElement>(".katex-mathml");
        if (!mathml) {
          issues.push(`${source} has no accessible MathML projection`);
        } else {
          const style = getComputedStyle(mathml);
          if (style.display !== "block" || style.overflowX !== "clip") {
            issues.push(`${source} does not contain its MathML projection`);
          }
        }
        const { direction, overflowY } = getComputedStyle(element);
        if (direction !== "ltr") issues.push(`${source} is not left-to-right`);
        if (
          ["auto", "clip", "hidden", "scroll"].includes(overflowY) &&
          element.scrollHeight > element.clientHeight + 2
        ) {
          issues.push(`${source} clips vertically`);
        }
        if (element.classList.contains("katex-display")) {
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
    'figure[data-visualization-id="swiglu-feed-forward"]',
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
        style.display !== "none" &&
        style.visibility !== "hidden"
      );
    };
    const describe = (element: Element) => {
      const node = element as HTMLElement;
      if (node instanceof HTMLTableCellElement) {
        const table = node.closest("table");
        const tableClass = table?.className
          ? `.${table.className.trim().split(/\s+/).join(".")}`
          : "";
        const rowIndex =
          node.parentElement instanceof HTMLTableRowElement
            ? node.parentElement.rowIndex
            : -1;
        return `${node.tagName.toLowerCase()}${tableClass}[r${rowIndex}c${node.cellIndex}]`;
      }
      if (node.classList.contains("katex")) {
        const latex = node.querySelector(
          'annotation[encoding="application/x-tex"]',
        )?.textContent;
        return `span.katex${latex ? `(${latex})` : ""}`;
      }
      const classes =
        typeof node.className === "string"
          ? node.className.trim().split(/\s+/).slice(0, 2).join(".")
          : "";
      return `${node.tagName.toLowerCase()}${classes ? `.${classes}` : ""}`;
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
        styles.every((styleName) => !["none", "hidden"].includes(styleName))
      );
    };
    const all = [root, ...root.querySelectorAll<HTMLElement>("*")].filter(
      (element) => visible(element) && !element.closest(".visually-hidden"),
    );
    const isBoundedBox = (element: HTMLElement) => {
      if (element === root && fullscreenRoot) return false;
      const display = getComputedStyle(element).display;
      if (
        element.hasAttribute("data-diagram-scroll") ||
        element.closest(
          '.katex, .katex-mathml, .visually-hidden, [aria-hidden="true"]',
        ) ||
        display === "inline" ||
        display === "contents" ||
        display.startsWith("table-row")
      ) {
        return false;
      }
      return (
        element === root ||
        element.hasAttribute("data-diagram-box") ||
        ["TH", "TD"].includes(element.tagName) ||
        hasCompleteBorder(element)
      );
    };
    const boxes = all.filter(isBoundedBox);
    const boxSet = new Set(boxes);
    const nearestBoundedBox = (
      element: HTMLElement | null,
    ): HTMLElement | null => {
      if (!element) return null;
      const scrollOwner = element.closest<HTMLElement>("[data-diagram-scroll]");
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
        bottom: rect.bottom - Number.parseFloat(style.borderBottomWidth || "0"),
        left: rect.left + Number.parseFloat(style.borderLeftWidth || "0"),
        right: rect.right - Number.parseFloat(style.borderRightWidth || "0"),
        top: rect.top + Number.parseFloat(style.borderTopWidth || "0"),
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
      element.hasAttribute("data-diagram-box"),
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
          ["hidden", "clip"].includes(overflow),
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
        auditPaintRect(
          box.getBoundingClientRect(),
          parentBox,
          box,
          "a nested box",
        );
      }
    }

    const scrollers = Array.from(
      root.querySelectorAll<HTMLElement>("[data-diagram-scroll]"),
    );
    for (const [index, region] of scrollers.entries()) {
      const style = getComputedStyle(region);
      const rect = region.getBoundingClientRect();
      const owner =
        region.parentElement?.closest<HTMLElement>("[data-diagram-box]");
      const ownerRect = owner?.getBoundingClientRect();
      if (
        region.getAttribute("role") !== "region" ||
        region.getAttribute("tabindex") !== "0" ||
        !(region.getAttribute("aria-label") ?? "").trim()
      ) {
        problems.push(`scroll region ${index} lacks its keyboard name or role`);
      }
      if (!["auto", "scroll"].includes(style.overflowX)) {
        problems.push(
          `scroll region ${index} does not own horizontal overflow`,
        );
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
      element.closest(".katex-mathml, .visually-hidden") !== null ||
      element.closest('[aria-hidden="true"]') !== null;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let textNode = walker.nextNode();
    while (textNode) {
      const parent = textNode.parentElement;
      const text = textNode.textContent?.trim() ?? "";
      if (
        parent &&
        text &&
        visible(parent) &&
        !parent.closest(".katex") &&
        !excludedFromPaintAudit(parent)
      ) {
        const box = nearestBoundedBox(parent);
        if (box) {
          const range = document.createRange();
          range.selectNodeContents(textNode);
          for (const rect of Array.from(range.getClientRects())) {
            auditPaintRect(rect, box, parent, "text");
          }
        }
      }
      textNode = walker.nextNode();
    }

    for (const formula of root.querySelectorAll<HTMLElement>(".katex")) {
      if (
        !visible(formula) ||
        formula.parentElement?.closest(".katex") ||
        formula.closest(".katex-mathml, .visually-hidden")
      ) {
        continue;
      }
      const box = nearestBoundedBox(formula.parentElement);
      if (box) {
        auditPaintRect(
          formula.getBoundingClientRect(),
          box,
          formula,
          "formula",
        );
      }
    }
    if (
      rootRect.left < -allowedError ||
      rootRect.right > document.documentElement.clientWidth + allowedError ||
      root.scrollWidth > root.clientWidth + allowedError
    ) {
      problems.push("figure escapes its inline or fullscreen boundary");
    }
    return {
      markedBoxCount: markedBoxes.length,
      scrollerCount: scrollers.length,
      problems,
    };
  }, 2);
  expect(result.markedBoxCount).toBe(17);
  expect(result.scrollerCount).toBe(2);
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
    order: 20,
    revision: contentRevision,
    revisionLabel: localized.revisionLabel,
    title: localized.title,
    equivalentLocales: ["en", "ru"],
  });
  await expect(page.locator(".lesson-description")).toHaveText(
    localized.description,
  );
  await expectSeoDescription(page, localized.description);
  await expect(page.locator(".lesson-body h2")).toHaveText(localized.headings);

  const historyNodes = page
    .getByRole("heading", {
      level: 2,
      name: localized.historyHeading,
      exact: true,
    })
    .locator(
      `xpath=following-sibling::*[not(self::h2) and preceding-sibling::h2[1][normalize-space()="${localized.historyHeading}"]]`,
    );
  const historyText = (await historyNodes.allInnerTexts())
    .join(" ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  for (const fragment of localized.historyFragments) {
    expect(historyText).toContain(fragment);
  }
  expect(historyText).not.toMatch(
    /Rust history|Python history|TypeScript history/i,
  );
  const historyLinks = historyNodes.locator("a");
  await expect(historyLinks).toHaveCount(historySources.length);
  expect(
    await historyLinks.evaluateAll((links) =>
      links.map((link) => link.getAttribute("href")),
    ),
  ).toEqual(historySources);

  const displayFormulae = page.locator(".lesson-body > .katex-display");
  await expect(displayFormulae).toHaveCount(8);
  expect(
    await displayFormulae.evaluateAll((nodes) =>
      nodes.map((node) => window.getComputedStyle(node).direction),
    ),
  ).toEqual(Array.from({ length: 8 }, () => "ltr"));
  expect(
    (
      await displayFormulae
        .locator('annotation[encoding="application/x-tex"]')
        .allTextContents()
    ).map(normalizeMath),
  ).toEqual(
    [
      fixtureFormulaLatex,
      workedStagesFormulaLatex,
      forwardFormulaLatex,
      activationFormulaLatex,
      intermediateFormulaLatex,
      reverseFormulaLatex,
      bengioFormulaLatex,
      transformerFormulaLatex,
    ].map(normalizeMath),
  );
  const mathAnnotations = (
    await page
      .locator('annotation[encoding="application/x-tex"]')
      .allTextContents()
  ).map(normalizeMath);
  for (const expected of [
    String.raw`G=\partial L/\partial Y`,
    String.raw`\operatorname{SiLU}'(a)=\sigma(a)+a\sigma(a)(1-\sigma(a))`,
    String.raw`\operatorname{Swish}_1(z)=z\sigma(z)`,
    String.raw`3\times10^{-6}`,
  ]) {
    expect(mathAnnotations).toContain(normalizeMath(expected));
  }
  const renderedCode = await page
    .locator(".lesson-body :not(pre) > code")
    .allTextContents();
  for (const codeShapedMath of [
    "XW_g",
    "XW_u",
    "dX_p",
    "dW_g",
    "dW_u",
    "dW_2",
  ]) {
    expect(renderedCode).not.toContain(codeShapedMath);
  }
  await expect(page.locator(".lesson-body .katex-error")).toHaveCount(0);
  await expectFormulaGeometry(page);

  const rustSources = page.locator("figure.rust-source");
  await expect(rustSources).toHaveCount(expectedRustRegions.length);
  const highlighted = rustSources.locator(
    'pre.rust-source-code.astro-code.github-dark-high-contrast[data-language="rust"]',
  );
  await expect(highlighted).toHaveCount(expectedRustRegions.length);
  expect(
    await highlighted
      .locator("code")
      .evaluateAll((blocks) => blocks.map((block) => block.textContent)),
  ).toEqual(expectedRustSources);
  expect(
    await rustSources.evaluateAll((sources) =>
      sources.map((source) => source.getAttribute("data-source-region")),
    ),
  ).toEqual(expectedRustRegions.map(([, region]) => region));
  for (const evidence of await highlighted.evaluateAll((blocks) =>
    blocks.map((block) => ({
      tabIndex: block.getAttribute("tabindex"),
      label: block.getAttribute("aria-label"),
      direction: block.getAttribute("dir"),
    })),
  )) {
    expect(evidence.tabIndex).toBe("0");
    expect(evidence.label).toBeTruthy();
    expect(evidence.direction).toBe("ltr");
  }

  await expectVisualizationDecision(page, {
    decision: "useful",
    id: "swiglu-feed-forward",
  });
  const diagram = page.locator(
    'figure[data-visualization-id="swiglu-feed-forward"]',
  );
  await expect(diagram).toHaveAccessibleName(localized.diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(
    localized.diagramDescription,
  );
  await expect(diagram).toHaveAttribute("data-diagram-style", "course-v1");
  await expect(diagram.locator(".shape-summary dt")).toHaveText(
    localized.summaryLabels,
  );
  expect(
    await readMathAwareRows(diagram.locator(".shape-summary > div")),
  ).toEqual([
    [localized.summaryLabels[0], "2"],
    [localized.summaryLabels[1], "3"],
    [localized.summaryLabels[2], "2"],
    [localized.summaryLabels[3], localized.biasFree],
    [localized.summaryLabels[4], "18"],
    [localized.summaryLabels[5], String.raw`\left[2,2\right]`],
    [localized.summaryLabels[6], String.raw`\left[2,3\right]`],
    [localized.summaryLabels[7], String.raw`\left[2,2\right]`],
  ]);

  const stageHeadings = diagram.locator(".diagram-stage > h4");
  await expect(stageHeadings).toHaveCount(3);
  await expect(stageHeadings.locator(".state-symbol")).toHaveText([
    "1",
    "2",
    "3",
  ]);
  for (const [index, stage] of [
    localized.stages.positions,
    localized.stages.independence,
    localized.stages.gradients,
  ].entries()) {
    await expect(stageHeadings.nth(index)).toContainText(stage);
  }
  for (const note of localized.notes) {
    await expect(diagram.getByText(note, { exact: true })).toBeVisible();
  }
  await expect(diagram.locator(".gate-branch")).toHaveCount(1);
  for (const branch of await diagram.locator(".gate-branch").all()) {
    await expect(branch).toHaveAccessibleName(localized.stages.gate);
  }
  await expect(diagram.locator(".up-branch")).toHaveCount(1);
  for (const branch of await diagram.locator(".up-branch").all()) {
    await expect(branch).toHaveAccessibleName(localized.stages.up);
  }
  await expect(diagram.locator(".merge-stage")).toHaveCount(1);
  for (const cell of await diagram.locator(".merge-stage").all()) {
    await expect(cell).toHaveAccessibleName(localized.stages.merge);
  }
  await expect(diagram.locator(".down-stage")).toHaveCount(1);
  for (const cell of await diagram.locator(".down-stage").all()) {
    await expect(cell).toHaveAccessibleName(localized.stages.down);
  }

  await expect(diagram.locator(".forward-table")).toHaveAccessibleName(
    localized.stages.positions,
  );
  await expect(diagram.locator(".forward-table thead th").first()).toHaveText(
    localized.computation,
  );
  const forwardRows = diagram.locator("[data-forward-stage]");
  await expect(forwardRows).toHaveCount(8);
  expect(
    await forwardRows.evaluateAll((rows) =>
      rows.map((row) => ({
        stage: row.getAttribute("data-forward-stage"),
        formulaCount: row.querySelectorAll(
          'annotation[encoding="application/x-tex"]',
        ).length,
      })),
    ),
  ).toEqual(
    [
      ["input", 3],
      ["gate-projection", 3],
      ["gate-pre-activation", 3],
      ["gate-activation", 3],
      ["up-projection", 3],
      ["up-values", 3],
      ["merge", 3],
      ["down", 3],
    ].map(([stage, formulaCount]) => ({ stage, formulaCount })),
  );
  for (const position of [0, 1] as const) {
    const evidence = diagram.locator(`[data-forward-position="${position}"]`);
    expect(
      (
        await evidence
          .locator('annotation[encoding="application/x-tex"]')
          .allTextContents()
      ).map(normalizeMath),
    ).toEqual(expectedPositionFormulae[position].map(normalizeMath));
  }

  await expect(diagram.locator(".independence-proof dt")).toHaveText(
    localized.independenceLabels,
  );
  expect(
    await readMathAwareRows(diagram.locator(".independence-proof > div")),
  ).toEqual([
    [localized.independenceLabels[0], "0"],
    [localized.independenceLabels[1], String.raw`\left[0,0\right]`],
    [localized.independenceLabels[2], "1"],
    [
      localized.independenceLabels[3],
      String.raw`\left[-0.268941,1.731059\right]`,
    ],
    [
      localized.independenceLabels[4],
      String.raw`\left[-0.268941,1.731059\right]`,
    ],
    [localized.independenceLabels[5], localized.unchanged],
  ]);

  const positionGradientTables = diagram.locator(".position-gradient-table");
  await expect(positionGradientTables).toHaveCount(2);
  for (const position of [0, 1] as const) {
    const table = diagram.locator(
      `.position-gradient-table[data-gradient-position="${position}"]`,
    );
    await expect(table).toHaveAccessibleName(
      `${localized.positionGradientCaption}: ${
        locale === "en" ? "Position" : "Позиция"
      } ${position}`,
    );
    await expect(table.locator("tbody th")).toHaveCount(
      localized.positionGradientLabels.length,
    );
    for (const [index, header] of (
      await table.locator("tbody th").all()
    ).entries()) {
      await expect(header).toHaveAccessibleName(
        localized.positionGradientLabels[index]!,
      );
    }
    expect(
      (
        await table
          .locator('annotation[encoding="application/x-tex"]')
          .allTextContents()
      ).map(normalizeMath),
    ).toEqual(expectedPositionGradientFormulae[position].map(normalizeMath));
  }

  const parameterTable = diagram.locator(".parameter-gradient-table");
  await expect(parameterTable).toHaveAccessibleName(
    localized.parameterGradientCaption,
  );
  await expect(parameterTable.locator("thead th")).toHaveCount(
    localized.parameterLabels.length,
  );
  for (const [index, header] of (
    await parameterTable.locator("thead th").all()
  ).entries()) {
    await expect(header).toHaveAccessibleName(
      localized.parameterLabels[index]!,
    );
  }
  expect(await readMathAwareRows(parameterTable.locator("tbody tr"))).toEqual(
    expectedParameterRows,
  );
  for (const [index, parameter] of [
    "ffn.gate.weight",
    "ffn.up.weight",
    "ffn.down.weight",
  ].entries()) {
    await expect(parameterTable.locator("tbody tr").nth(index)).toHaveAttribute(
      "data-parameter-gradient",
      parameter,
    );
  }

  const scrollers = diagram.locator("[data-diagram-scroll]");
  await expect(scrollers).toHaveCount(2);
  const forwardScroller = diagram.locator(".forward-scroll");
  const parameterScroller = diagram.locator(".parameter-scroll");
  await expect(forwardScroller).toHaveAccessibleName(localized.forwardScroller);
  await expect(parameterScroller).toHaveAccessibleName(localized.scroller);
  for (const scroller of [forwardScroller, parameterScroller]) {
    await expect(scroller).toHaveAttribute("role", "region");
    await expect(scroller).toHaveAttribute("tabindex", "0");
    await scroller.focus();
    await expect(scroller).toBeFocused();
    if (narrow) {
      const widths = await scroller.evaluate((node) => ({
        client: node.clientWidth,
        scroll: node.scrollWidth,
      }));
      expect(widths.scroll).toBeGreaterThan(widths.client);
    }
  }
  expect(
    await diagram
      .locator("code, bdi, .katex")
      .evaluateAll((nodes) =>
        nodes.every(
          (node) => window.getComputedStyle(node).direction === "ltr",
        ),
      ),
  ).toBe(true);
  await expectDiagramContainment(page, locale);

  const exerciseDetails = page.locator(".lesson-body details");
  await expect(exerciseDetails).toHaveCount(1);
  await exerciseDetails.locator("summary").click();
  await expect(exerciseDetails).toHaveAttribute("open", "");
  await expect(exerciseDetails.locator("ol > li")).toHaveCount(8);

  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe(
  "chapter 20 localized SwiGLU feed-forward vertical slice",
  {
    tag: chapterTag(chapterId),
  },
  () => {
    test("chapter 20 is twentieth on both indexes with direct equivalent locale routes", async ({
      page,
    }) => {
      for (const locale of chapterLocales) {
        const localized = copy[locale];
        const chapters = await readOrderedCourseChapters(page, locale);
        expect(chapters.length).toBeGreaterThanOrEqual(20);
        expect(chapters[19]).toEqual(
          expect.objectContaining({
            chapterId,
            order: 20,
            title: localized.title,
          }),
        );
        await page
          .getByRole("link", { name: localized.title, exact: true })
          .click();
        await expectLocalizedChapterRoute(page, {
          chapterId,
          locale,
          order: 20,
          revision: contentRevision,
          revisionLabel: localized.revisionLabel,
          title: localized.title,
          equivalentLocales: ["en", "ru"],
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
            "data-locale-fallback",
            "course-index",
          );
          await switchLink.click();
          await expect(page).toHaveURL(
            new RegExp(`${chapterPath(target.code, chapterId)}$`),
          );
          await expect(page.locator("html")).toHaveAttribute(
            "lang",
            target.languageTag,
          );
          await expect(
            page.getByRole("heading", {
              level: 1,
              name: copy[target.code].title,
              exact: true,
            }),
          ).toBeVisible();
        }
      }
    });

    for (const locale of chapterLocales) {
      test(`the complete ${locale} Rust-backed lesson renders at desktop and narrow widths`, async ({
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

    test("chapter 20 full view fits both locales without substantial travel", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      for (const locale of chapterLocales) {
        await page.goto(chapterPath(locale, chapterId));
        await settle(page);
        const diagram = page.locator(
          'figure[data-visualization-id="swiglu-feed-forward"]',
        );
        const toggle = diagram.locator("[data-diagram-full-view-toggle]");
        await expect(toggle).toHaveCount(1);
        await expect(toggle).toBeVisible();
        await toggle.click();
        await page.waitForFunction(
          () =>
            document.fullscreenElement?.getAttribute(
              "data-visualization-id",
            ) === "swiglu-feed-forward",
        );
        await settle(page);
        await expectDiagramContainment(page, locale);
        const geometry = await diagram.evaluate((node) => {
          const stage = (selector: string) => {
            const rect = node
              .querySelector<HTMLElement>(selector)!
              .getBoundingClientRect();
            return { bottom: rect.bottom, left: rect.left, top: rect.top };
          };
          return {
            blockDebt: node.scrollHeight - node.clientHeight,
            blockBudget: Math.ceil(node.clientHeight / 3) + 2,
            inlineDebt: node.scrollWidth - node.clientWidth,
            parts: Array.from(node.children).map((part) => ({
              name: (part as HTMLElement).className,
              height: Math.round(
                (part as HTMLElement).getBoundingClientRect().height,
              ),
            })),
            regionDebts: Array.from(
              node.querySelectorAll<HTMLElement>("[data-diagram-scroll]"),
            ).map((region) => ({
              name: region.getAttribute("aria-label"),
              inline: region.scrollWidth - region.clientWidth,
            })),
            boxDebts: Array.from(
              node.querySelectorAll<HTMLElement>("[data-diagram-box]"),
            ).map((box) => ({
              inline: box.scrollWidth - box.clientWidth,
              block: box.scrollHeight - box.clientHeight,
            })),
            summary: stage(".shape-summary"),
            summaryCardTops: Array.from(
              node.querySelectorAll<HTMLElement>(".shape-summary > div"),
            ).map((card) => card.getBoundingClientRect().top),
            positions: stage(".positions-stage"),
            independence: stage(".independence-stage"),
            gradients: stage(".gradients-stage"),
          };
        });
        const geometryLabel = `${locale}/swiglu-feed-forward`;
        expect(
          geometry.blockDebt,
          `${geometryLabel} full-view block debt: ${JSON.stringify(geometry.parts)}`,
        ).toBeLessThanOrEqual(geometry.blockBudget);
        expect(
          geometry.inlineDebt,
          `${geometryLabel} full-view inline debt`,
        ).toBeLessThanOrEqual(2);
        expect(
          geometry.regionDebts.every(({ inline }) => inline <= 2),
          `${geometryLabel} named-region inline containment: ${JSON.stringify(
            geometry.regionDebts,
          )}`,
        ).toBe(true);
        expect(
          geometry.boxDebts.every(
            ({ inline, block }) => inline <= 2 && block <= 2,
          ),
          `${geometryLabel} bounded-box containment`,
        ).toBe(true);
        expect(new Set(geometry.summaryCardTops.map(Math.round)).size).toBe(1);
        expect(
          Math.abs(geometry.positions.top - geometry.gradients.top),
        ).toBeLessThan(1);
        expect(
          Math.abs(geometry.positions.left - geometry.gradients.left),
        ).toBeGreaterThan(1);
        expect(geometry.positions.top).toBeGreaterThan(geometry.summary.bottom);
        expect(geometry.independence.top).toBeGreaterThan(
          geometry.positions.bottom,
        );
        expect(
          Math.abs(geometry.independence.left - geometry.positions.left),
        ).toBeLessThan(1);
        await page.keyboard.press("Escape");
        await page.waitForFunction(() => document.fullscreenElement === null);
        await expect(toggle).toBeFocused();
      }
    });

    test("gate, up, merge, down, and trusted evidence retain redundant borders in forced colors", async ({
      page,
    }) => {
      await page.emulateMedia({ forcedColors: "active" });
      for (const locale of chapterLocales) {
        await page.goto(chapterPath(locale, chapterId));
        const diagram = page.locator(
          'figure[data-visualization-id="swiglu-feed-forward"]',
        );
        await expect(diagram.locator(".gate-branch").first()).toHaveCSS(
          "border-left-style",
          "solid",
        );
        await expect(diagram.locator(".up-branch").first()).toHaveCSS(
          "border-left-style",
          "double",
        );
        await expect(diagram.locator(".merge-stage").first()).toHaveCSS(
          "border-left-style",
          "dashed",
        );
        await expect(diagram.locator(".down-stage").first()).toHaveCSS(
          "border-left-style",
          "double",
        );
        await expect(diagram.locator(".proof-result")).toContainText(
          copy[locale].unchanged,
        );
        await expect(diagram.locator(".proof-result")).toHaveCSS(
          "border-left-style",
          "double",
        );
        await expectDiagramContainment(page, locale);
        await expectNoOverflowOrClientScripts(page);
      }
    });

    test("localized prose follows direction while technical evidence remains left-to-right", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      for (const locale of chapterLocales) {
        await page.goto(chapterPath(locale, chapterId));
        const diagram = page.locator(
          'figure[data-visualization-id="swiglu-feed-forward"]',
        );
        await diagram.evaluate((node) => node.setAttribute("dir", "rtl"));
        await expect(diagram.locator(".course-diagram__description")).toHaveCSS(
          "direction",
          "rtl",
        );
        await expect(diagram.locator(".shape-summary dt").first()).toHaveText(
          copy[locale].summaryLabels[0]!,
        );
        await expect(diagram.locator(".shape-summary dt").first()).toHaveCSS(
          "direction",
          "rtl",
        );
        expect(
          await diagram
            .locator('bdi[dir="ltr"], .katex')
            .evaluateAll(
              (nodes) =>
                nodes.length > 0 &&
                nodes.every(
                  (node) => window.getComputedStyle(node).direction === "ltr",
                ),
            ),
        ).toBe(true);
        const positionHeaders = await diagram
          .locator(".forward-table thead [data-forward-position]")
          .evaluateAll((nodes) =>
            nodes.map((node) => {
              const rect = node.getBoundingClientRect();
              return { left: rect.left, top: rect.top };
            }),
          );
        expect(positionHeaders).toHaveLength(2);
        expect(
          Math.abs(positionHeaders[0]!.top - positionHeaders[1]!.top),
        ).toBeLessThan(1);
        expect(positionHeaders[0]!.left).toBeGreaterThan(
          positionHeaders[1]!.left,
        );
        await expectDiagramContainment(page, locale);
        await expectNoOverflowOrClientScripts(page);
      }
    });

    test("both complete localized lessons and exact trace render without JavaScript", async ({
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
          page.getByRole("heading", {
            level: 1,
            name: copy[locale].title,
            exact: true,
          }),
        ).toBeVisible();
        await expect(page.locator(".forward-table")).toHaveCount(1);
        await expect(page.locator("[data-forward-stage]")).toHaveCount(8);
        await expect(page.locator(".position-gradient-table")).toHaveCount(2);
        await expect(page.locator("[data-gradient-kind]")).toHaveCount(10);
        await expect(page.locator("[data-parameter-gradient]")).toHaveCount(3);
        await expect(page.locator("[data-diagram-scroll]")).toHaveCount(2);
        await expect(
          page.locator("[data-diagram-full-view-toggle]"),
        ).toHaveCount(0);
        await expect(page.locator(".independence-proof")).toContainText(
          copy[locale].unchanged,
        );
        expect(
          await page
            .locator(
              '[data-forward-position="0"] annotation[encoding="application/x-tex"]',
            )
            .allTextContents(),
        ).toContain(String.raw`Y_{0}=\left[1.924234,-2.193176\right]`);
        expect(
          await readMathAwareRows(
            page.locator(".parameter-gradient-table tbody tr"),
          ),
        ).toEqual(expectedParameterRows);
        await expectNoOverflowOrClientScripts(page);
      }
      await context.close();
    });
  },
);
