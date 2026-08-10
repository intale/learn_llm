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
  implementationFragments: readonly string[];
  diagramTitle: string;
  diagramDescription: string;
  summaryLabels: readonly string[];
  stageLabels: readonly string[];
  originLabel: string;
  windowLabel: string;
  tableLabels: readonly string[];
  proofLabels: readonly string[];
  unused: string;
  equal: string;
  same: string;
  changed: string;
  batchRowsCaption: string;
  batchRowsScroller: string;
}

const chapterId = "21-mini-batches";
const contentRevision = 3;
const repositoryRoot = resolve(process.cwd(), "..");
const normalizeMath = (value: string) => value.replace(/\s+/g, "");
const historySources = [
  "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
  "https://papers.nips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf",
  "https://arxiv.org/pdf/2005.14165",
] as const;

const copy: Record<ChapterLocale, LocalizedCopy> = {
  en: {
    revisionLabel: "Content revision",
    title: "Count only the tokens that are really in the batch",
    description:
      "Shuffle complete causal windows into mini-batches of fixed-length rows, keep the smaller final batch, and average loss and gradients over its actual target tokens.",
    headings: [
      "Predict the smaller final batch",
      "Divide by actual target tokens",
      "Keep batch and sequence axes distinct",
      "From one word update to token-sized LLM batches",
      "Shuffle windows, then merge raw sums",
      "Trace every shuffled window and denominator",
      "Predict before checking the exact epoch",
      "Hand token-mean gradients to AdamW",
    ],
    historyHeading: "From one word update to token-sized LLM batches",
    historyFragments: [
      "token volume an explicit unit of work",
      "road from stochastic neural-language-model examples to modern LLM token batches",
      "not a programming-language history",
    ],
    implementationFragments: [
      "records each complete window as a WindowDescriptor",
      "copies the selected input and target occurrences directly from the borrowed document",
      "first check the prospective token count, loss sum, and every gradient coordinate",
      "update the existing gradient-sum vector in place",
    ],
    diagramTitle:
      "Follow five complete windows into two token-normalized batches",
    diagramDescription:
      "Read the worked shuffle order, row-major input and target IDs, per-token losses, actual denominators, mean gradients, and coverage proofs for one reproducible epoch.",
    summaryLabels: [
      "Context length",
      "Requested capacity",
      "Shuffle seed",
      "Complete windows",
      "Batches emitted",
    ],
    stageLabels: [
      "Shuffle complete window identities",
      "Stack actual rows and count target tokens",
      "Exclude unused capacity from the final mean",
      "Check coverage, boundaries, replay, and accumulation",
    ],
    originLabel: "Window origin",
    windowLabel: "Window",
    tableLabels: [
      "Input IDs",
      "Target IDs",
      "One loss per target position",
      "Stacked shape",
      "Target tokens",
      "Loss sum",
      "Actual denominator",
      "Mean loss",
      "Mean gradient",
      "Raw accumulation",
    ],
    proofLabels: [
      "Complete windows",
      "Duplicate windows",
      "Padding IDs",
      "Cross-partition windows",
      "Same-seed replay",
      "Different-seed order",
      "Raw accumulation",
    ],
    unused: "Not created — contributes nothing",
    equal: "Equal",
    same: "Same",
    changed: "Changed",
    batchRowsCaption: "Shuffled windows and their exact token contributions",
    batchRowsScroller: "Scrollable mini-batch token evidence for batch",
  },
  ru: {
    revisionLabel: "Версия материала",
    title: "Считайте только токены, действительно вошедшие в мини-пакет",
    description:
      "Перемешайте полные каузальные окна и объедините их в мини-пакеты из строк фиксированной длины. Сохраните неполный последний мини-пакет и усредните функцию потерь и градиенты по фактически вошедшим в него целевым токенам.",
    headings: [
      "Предскажите форму меньшего последнего мини-пакета",
      "Делите на фактическое число целевых токенов",
      "Не смешивайте оси пакета и последовательности",
      "От обновления по одному слову к пакетам LLM, измеряемым в токенах",
      "Перемешайте дескрипторы окон, затем объедините суммы до деления",
      "Проследите каждое перемешанное окно и каждый знаменатель",
      "Сначала предскажите точную эпоху",
      "Передайте усреднённые по токенам градиенты в AdamW",
    ],
    historyHeading:
      "От обновления по одному слову к пакетам LLM, измеряемым в токенах",
    historyFragments: [
      "Число токенов стало явной мерой объёма мини-пакета",
      "к пакетам современных LLM, размер которых измеряется в",
      "Это не история языков программирования",
    ],
    implementationFragments: [
      "Дескриптор содержит только индекс исходного документа и начальную позицию окна",
      "копирует вхождения входных и целевых токенов непосредственно",
      "проверяют новое число целевых вхождений, новую сумму потерь и результат сложения каждой координаты градиента",
      "обновляют уже выделенный вектор сумм градиента на месте",
    ],
    diagramTitle:
      "Проследите, как пять полных окон образуют два мини-пакета",
    diagramDescription:
      "Сверьте порядок окон после перемешивания, построчные ID входных и целевых токенов, потери по целевым токенам, фактические знаменатели, средние градиенты и проверки одной воспроизводимой эпохи.",
    summaryLabels: [
      "Длина контекста",
      "Максимальная ширина",
      "Начальное значение генератора",
      "Полные окна",
      "Число мини-пакетов",
    ],
    stageLabels: [
      "Перемешайте пары «документ, начало окна»",
      "Соберите строки и посчитайте целевые токены",
      "Не учитывайте отсутствующую строку в среднем",
      "Покрытие окон, границы документов и частей корпуса, повтор запуска, накопление сумм",
    ],
    originLabel: "Документ и начало окна",
    windowLabel: "Окно",
    tableLabels: [
      "Входные ID",
      "Целевые ID",
      "Потери по целевым позициям",
      "Форма мини-пакета",
      "Целевые токены",
      "Сумма потерь",
      "Фактический знаменатель",
      "Среднее значение потерь",
      "Средний градиент",
      "Суммы до деления",
    ],
    proofLabels: [
      "Полные окна",
      "Повторяющиеся окна",
      "ID токенов дополнения",
      "Окна из другой части корпуса",
      "Повтор: то же начальное значение",
      "Порядок: другое начальное значение",
      "Суммы до деления",
    ],
    unused: "Строка не создана — вклада нет",
    equal: "Совпадает",
    same: "Совпадает",
    changed: "Изменён",
    batchRowsCaption: "Окна после перемешивания и точные вклады целевых токенов",
    batchRowsScroller: "Таблица токенов и вкладов для мини-пакета",
  },
};

const displayFormulae = [
  "\\mathcal{L}_B=\\frac{1}{|B|T}\\sum_{b\\in B}\\sum_{t=1}^{T}\\mathcal{L}_{b,t}",
  "\\nabla_{\\theta}\\mathcal{L}_B=\\frac{1}{|B|T}\\sum_{b\\in B}\\sum_{t=1}^{T}\\nabla_{\\theta}\\mathcal{L}_{b,t}",
  "\\mathcal{L}_{B_1}=\\frac{1.75}{2\\cdot2}=0.4375",
  "\\bar g=\\frac{\\sum_j S_j}{\\sum_j N_j},\\qquad S_j=\\sum_{i=1}^{N_j}g_{j,i}.",
  "\\theta\\leftarrow\\theta+\\varepsilon\\frac{\\partial\\log\\widehat P(w_t\\mid w_{t-1},\\ldots,w_{t-n+1})}{\\partial\\theta}.",
] as const;

const expectedRustRegions = [
  ["rust/demos/ch21-mini-batches/src/lib.rs", "chapter-fixture"],
  ["rust/demos/ch21-mini-batches/src/lib.rs", "historical-update-grouping"],
  [
    "rust/crates/llm-from-scratch/src/training/batch.rs",
    "batch-configuration",
  ],
  ["rust/crates/llm-from-scratch/src/training/batch.rs", "mini-batch-epoch"],
  [
    "rust/crates/llm-from-scratch/src/training/batch.rs",
    "token-gradient-averaging",
  ],
  ["rust/demos/ch21-mini-batches/src/lib.rs", "token-contributions"],
  ["rust/demos/ch21-mini-batches/src/main.rs", "learner-mini-batch-output"],
  [
    "rust/demos/ch21-mini-batches/src/diagram_trace.rs",
    "mini-batches-trace",
  ],
] as const;

function readRustRegion(path: string, region: string): string {
  const lines = readFileSync(resolve(repositoryRoot, path), "utf8").split(
    /\r?\n/,
  );
  const start = lines.findIndex(
    (line: string) => line.trim() === "// region:" + region,
  );
  const end = lines.findIndex(
    (line: string) => line.trim() === "// endregion:" + region,
  );
  if (start === -1 || end <= start) {
    throw new Error("Missing ordered Rust region " + region + " in " + path);
  }
  return lines.slice(start + 1, end).join("\n");
}

const expectedRustSources = expectedRustRegions.map(([path, region]) =>
  readRustRegion(path, region),
);

const batchEvidence = [
  {
    index: "0",
    origins: ["train-b@1", "train-a@1", "train-b@0"],
    slots: ["0", "1", "2"],
    inputs: ["[20, 21]", "[10, 11]", "[0, 20]"],
    targets: ["[21, 1]", "[11, 12]", "[20, 21]"],
    losses: [
      ["1.375000", "1.500000"],
      ["0.375000", "0.500000"],
      ["1.125000", "1.250000"],
    ],
    shape: ["3", "2"],
    tokens: "6",
    lossSum: "6.125000",
    meanLoss: "1.020833",
    meanGradient: ["2.041667", "0.979167"],
  },
  {
    index: "1",
    origins: ["train-a@0", "train-a@2"],
    slots: ["3", "4"],
    inputs: ["[0, 10]", "[11, 12]"],
    targets: ["[10, 11]", "[12, 1]"],
    losses: [
      ["0.125000", "0.250000"],
      ["0.625000", "0.750000"],
    ],
    shape: ["2", "2"],
    tokens: "4",
    lossSum: "1.750000",
    meanLoss: "0.437500",
    meanGradient: ["0.875000", "1.562500"],
  },
] as const;

async function settle(page: Page) {
  await page.evaluate(() => {
    document.documentElement.getBoundingClientRect();
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
          math.replaceWith(document.createTextNode(" " + source + " "));
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
            ?.textContent ?? "formula " + index;
        const issues: string[] = [];
        if (
          rect.left < -1 ||
          rect.right > document.documentElement.clientWidth + 1
        ) {
          issues.push(source + " escapes the viewport");
        }
        if (rect.width <= 0 || rect.height <= 0) {
          issues.push(source + " has no visible box");
        }
        const mathml = element.querySelector<HTMLElement>(".katex-mathml");
        if (!mathml) {
          issues.push(source + " has no accessible MathML projection");
        } else {
          const style = getComputedStyle(mathml);
          if (style.display !== "block" || style.overflowX !== "clip") {
            issues.push(source + " does not contain its MathML projection");
          }
        }
        const { direction, overflowY } = getComputedStyle(element);
        if (direction !== "ltr") issues.push(source + " is not left-to-right");
        if (
          ["auto", "clip", "hidden", "scroll"].includes(overflowY) &&
          element.scrollHeight > element.clientHeight + 2
        ) {
          issues.push(source + " clips vertically");
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
            issues.push(source + " overlaps the following block");
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
    'figure[data-visualization-id="mini-batches"]',
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
          ? "." + table.className.trim().split(/\s+/).join(".")
          : "";
        const rowIndex =
          node.parentElement instanceof HTMLTableRowElement
            ? node.parentElement.rowIndex
            : -1;
        return (
          node.tagName.toLowerCase() +
          tableClass +
          "[r" +
          rowIndex +
          "c" +
          node.cellIndex +
          "]"
        );
      }
      if (node.classList.contains("katex")) {
        const latex = node.querySelector(
          'annotation[encoding="application/x-tex"]',
        )?.textContent;
        return "span.katex" + (latex ? "(" + latex + ")" : "");
      }
      const classes =
        typeof node.className === "string"
          ? node.className.trim().split(/\s+/).slice(0, 2).join(".")
          : "";
      return node.tagName.toLowerCase() + (classes ? "." + classes : "");
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
      const scrollOwner = element.closest<HTMLElement>(
        "[data-diagram-scroll]",
      );
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
        describe(witness) +
          " paints " +
          kind +
          " outside " +
          describe(box) +
          " by " +
          debt.toFixed(1) +
          "px",
      );
    };

    const markedBoxes = all.filter((element) =>
      element.hasAttribute("data-diagram-box"),
    );
    for (const [index, box] of markedBoxes.entries()) {
      if (!hasCompleteBorder(box)) {
        problems.push("marked box " + index + " lacks a four-sided border");
      }
    }
    for (const box of boxes) {
      const style = getComputedStyle(box);
      if (
        [style.overflowX, style.overflowY].some((overflow) =>
          ["hidden", "clip"].includes(overflow),
        )
      ) {
        problems.push(describe(box) + " hides or clips overflow");
      }
      if (
        box.scrollWidth > box.clientWidth + allowedError ||
        box.scrollHeight > box.clientHeight + allowedError
      ) {
        problems.push(describe(box) + " does not contain its content");
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
        problems.push(
          "scroll region " + index + " lacks its keyboard name or role",
        );
      }
      if (!["auto", "scroll"].includes(style.overflowX)) {
        problems.push(
          "scroll region " + index + " does not own horizontal overflow",
        );
      }
      if (
        ownerRect &&
        (rect.left < ownerRect.left - allowedError ||
          rect.right > ownerRect.right + allowedError)
      ) {
        problems.push("scroll region " + index + " escapes its bounded stage");
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
  expect(result.markedBoxCount).toBe(14);
  expect(result.scrollerCount).toBe(2);
  expect(result.problems, locale + " diagram containment").toEqual([]);
}

function expectedBatchMetricRows(locale: ChapterLocale) {
  const labels = copy[locale];
  const compactDecimal = (value: string) =>
    value.includes(".") ? value.replace(/0+$/, "").replace(/\.$/, "") : value;
  return [
    [
      labels.tableLabels[3],
      ...batchEvidence.map(
        (batch) =>
          "\\operatorname{shape}(B_{" +
          batch.index +
          "})=\\left[" +
          batch.shape.join(",") +
          "\\right]",
      ),
    ],
    [
      labels.tableLabels[4],
      ...batchEvidence.map(
        (batch) => "N_{B_{" + batch.index + "}}=" + batch.tokens,
      ),
    ],
    [
      labels.tableLabels[5],
      ...batchEvidence.map(
        (batch) =>
          "B_{" + batch.index + "}:\\;" + compactDecimal(batch.lossSum),
      ),
    ],
    [
      labels.tableLabels[6],
      ...batchEvidence.map(
        (batch) => "|B_{" + batch.index + "}|T=" + batch.tokens,
      ),
    ],
    [
      labels.tableLabels[7],
      ...batchEvidence.map(
        (batch) =>
          "\\mathcal{L}_{B_{" +
          batch.index +
          "}}=\\frac{" +
          compactDecimal(batch.lossSum) +
          "}{" +
          batch.tokens +
          "}=" +
          compactDecimal(batch.meanLoss),
      ),
    ],
    [
      labels.tableLabels[8],
      ...batchEvidence.map(
        (batch) =>
          "\\bar g_{B_{" +
          batch.index +
          "}}=\\left[" +
          batch.meanGradient.join(",") +
          "\\right]",
      ),
    ],
    [
      labels.tableLabels[9],
      ...batchEvidence.map(
        (batch) => "B_{" + batch.index + "}:\\;= " + labels.equal,
      ),
    ],
  ];
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
    order: 21,
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
      'xpath=following-sibling::*[not(self::h2) and preceding-sibling::h2[1][normalize-space()="' +
        localized.historyHeading +
        '"]]',
    );
  const historyText = (await historyNodes.allInnerTexts())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  for (const fragment of localized.historyFragments) {
    expect(historyText).toContain(fragment);
  }
  expect(historyText).not.toMatch(
    /Rust history|Python history|TypeScript history|истори[яи] Rust|истори[яи] Python|истори[яи] TypeScript/i,
  );
  const historyLinks = historyNodes.locator("a");
  await expect(historyLinks).toHaveCount(historySources.length);
  expect(
    await historyLinks.evaluateAll((links) =>
      links.map((link) => link.getAttribute("href")),
    ),
  ).toEqual(historySources);

  const renderedDisplays = page.locator(".lesson-body > .katex-display");
  await expect(renderedDisplays).toHaveCount(displayFormulae.length);
  expect(
    (
      await renderedDisplays
        .locator('annotation[encoding="application/x-tex"]')
        .allTextContents()
    ).map(normalizeMath),
  ).toEqual(displayFormulae.map(normalizeMath));
  expect(
    await renderedDisplays.evaluateAll((nodes) =>
      nodes.map((node) => window.getComputedStyle(node).direction),
    ),
  ).toEqual(Array.from({ length: displayFormulae.length }, () => "ltr"));
  const annotations = (
    await page
      .locator('annotation[encoding="application/x-tex"]')
      .allTextContents()
  ).map(normalizeMath);
  for (const expected of [
    "|B|_{\\mathrm{max}}=3",
    "3\\cdot2=6",
    "2\\cdot2=4",
    "\\bar g_{B_{1}}=\\left[0.875000,1.562500\\right]",
    "4/6",
  ]) {
    expect(
      annotations.some((formula) => formula.includes(normalizeMath(expected))),
      "expected a rendered formula containing " + expected,
    ).toBe(true);
  }
  const renderedCode = await page
    .locator(".lesson-body :not(pre) > code")
    .allTextContents();
  for (const codeShapedMath of ["|B|T", "3*2", "2*2", "1.75/4", "4/6"]) {
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

  const normalizedLessonText = (await page.locator(".lesson-body").innerText())
    .replace(/\s+/g, " ")
    .trim();
  for (const fragment of localized.implementationFragments) {
    expect(normalizedLessonText).toContain(fragment);
  }

  await expectVisualizationDecision(page, {
    decision: "useful",
    id: "mini-batches",
  });
  const diagram = page.locator(
    'figure[data-visualization-id="mini-batches"]',
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
    [localized.summaryLabels[0], "T=2"],
    [localized.summaryLabels[1], "|B|_{\\mathrm{max}}=3"],
    [localized.summaryLabels[2], "7"],
    [localized.summaryLabels[3], "5"],
    [localized.summaryLabels[4], "2"],
  ]);

  const stageHeadings = diagram.locator(
    ".shuffle-stage > h4, .batches-stage > h4, .final-stage > h4, .proof-stage > h4",
  );
  await expect(stageHeadings).toHaveCount(4);
  await expect(stageHeadings.locator(".state-symbol")).toHaveText([
    "1",
    "2",
    "3",
    "4",
  ]);
  for (const [index, label] of localized.stageLabels.entries()) {
    await expect(stageHeadings.nth(index)).toContainText(label);
  }

  const shuffleItems = diagram.locator(".shuffle-list > li");
  await expect(shuffleItems).toHaveCount(5);
  expect(
    await shuffleItems.evaluateAll((items) =>
      items.map((item) => ({
        slot: item.getAttribute("data-slot"),
        batch: item.getAttribute("data-batch"),
      })),
    ),
  ).toEqual([
    { slot: "0", batch: "0" },
    { slot: "1", batch: "0" },
    { slot: "2", batch: "0" },
    { slot: "3", batch: "1" },
    { slot: "4", batch: "1" },
  ]);
  await expect(shuffleItems.locator("strong")).toHaveText([
    "train-b@1",
    "train-a@1",
    "train-b@0",
    "train-a@0",
    "train-a@2",
  ]);

  const batchCards = diagram.locator(".batch-card");
  await expect(batchCards).toHaveCount(2);
  for (const batch of batchEvidence) {
    const card = diagram.locator('.batch-card[data-batch="' + batch.index + '"]');
    const table = card.locator(
      'table[data-batch-table="' + batch.index + '"]',
    );
    await expect(table).toHaveCount(1);
    await expect(table.locator("caption")).toContainText(
      localized.batchRowsCaption,
    );
    await expect(table.locator("thead th")).toHaveText([
      localized.originLabel,
      ...localized.tableLabels.slice(0, 3),
    ]);
    await expect(table.locator("tbody tr")).toHaveCount(batch.slots.length);
    expect(
      await table
        .locator("tbody tr")
        .evaluateAll((rows) =>
          rows.map((row) => row.getAttribute("data-slot")),
        ),
    ).toEqual(batch.slots);
    await expect(table.locator("tbody th span")).toHaveText(
      batch.slots.map((slot) => localized.windowLabel + " " + slot),
    );
    await expect(table.locator("tbody th code")).toHaveText(batch.origins);
    await expect(
      table.locator('[data-evidence-cell="input"] code'),
    ).toHaveText(batch.inputs);
    await expect(
      table.locator('[data-evidence-cell="target"] code'),
    ).toHaveText(batch.targets);
    expect(
      (
        await table
          .locator(
            '[data-evidence-cell="losses"] annotation[encoding="application/x-tex"]',
          )
          .allTextContents()
      ).map(normalizeMath),
    ).toEqual(
      batch.losses
        .flatMap((losses, windowIndex) =>
          losses.map(
            (loss, tokenIndex) =>
              "\\mathcal{L}_{" +
              batch.slots[windowIndex] +
              "," +
              (tokenIndex + 1) +
              "}=" +
              loss,
          ),
        )
        .map(normalizeMath),
    );
  }

  const comparison = diagram.locator(".batch-comparison");
  await expect(comparison.locator("dt")).toHaveText(
    localized.tableLabels.slice(3),
  );
  expect(await readMathAwareRows(comparison.locator("> div"))).toEqual(
    expectedBatchMetricRows(locale),
  );

  const unused = diagram.locator(".unused-slot");
  await expect(unused).toHaveCount(1);
  await expect(unused).toContainText(localized.unused);
  expect(
    (
      await diagram
        .locator(".denominator-contrast")
        .locator('annotation[encoding="application/x-tex"]')
        .allTextContents()
    ).map(normalizeMath),
  ).toEqual(["3\\times2=6", "2\\times2=4"].map(normalizeMath));

  await expect(diagram.locator(".proof-grid dt")).toHaveText(
    localized.proofLabels,
  );
  expect(
    await readMathAwareRows(diagram.locator(".proof-grid > div")),
  ).toEqual([
    [localized.proofLabels[0], "5/5"],
    [localized.proofLabels[1], "0"],
    [localized.proofLabels[2], "0"],
    [localized.proofLabels[3], "0"],
    [localized.proofLabels[4], localized.same],
    [localized.proofLabels[5], localized.changed],
    [localized.proofLabels[6], localized.equal],
  ]);

  const scrollers = diagram.locator("[data-diagram-scroll]");
  await expect(scrollers).toHaveCount(2);
  for (const batch of batchEvidence) {
    const scroller = diagram
      .locator('.batch-card[data-batch="' + batch.index + '"]')
      .locator(".batch-scroll");
    await expect(scroller).toHaveAttribute("role", "region");
    await expect(scroller).toHaveAttribute("tabindex", "0");
    await expect(scroller).toHaveAccessibleName(
      localized.batchRowsScroller + " " + batch.index,
    );
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
        nodes.every((node) => window.getComputedStyle(node).direction === "ltr"),
      ),
  ).toBe(true);
  await expectDiagramContainment(page, locale);

  if (narrow) {
    const batchTops = await batchCards.evaluateAll((nodes) =>
      nodes.map((node) => node.getBoundingClientRect().top),
    );
    expect(batchTops[1]).toBeGreaterThan(batchTops[0]);
    const denominatorTops = await diagram
      .locator(".denominator-contrast article")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getBoundingClientRect().top),
      );
    expect(denominatorTops[1]).toBeGreaterThan(denominatorTops[0]);
  }

  const exerciseDetails = page.locator(".lesson-body details");
  await expect(exerciseDetails).toHaveCount(1);
  await exerciseDetails.locator("summary").click();
  await expect(exerciseDetails).toHaveAttribute("open", "");
  await expect(exerciseDetails.locator("ol > li")).toHaveCount(8);
  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe(
  "chapter 21 localized mini-batches vertical slice",
  {
    tag: chapterTag(chapterId),
  },
  () => {
    test("chapter 21 is twenty-first on both indexes with direct equivalent locale routes", async ({
      page,
    }) => {
      for (const locale of chapterLocales) {
        const localized = copy[locale];
        const chapters = await readOrderedCourseChapters(page, locale);
        expect(chapters.length).toBeGreaterThanOrEqual(21);
        expect(chapters[20]).toEqual(
          expect.objectContaining({
            chapterId,
            order: 21,
            title: localized.title,
          }),
        );
        await page
          .getByRole("link", { name: localized.title, exact: true })
          .click();
        await expectLocalizedChapterRoute(page, {
          chapterId,
          locale,
          order: 21,
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
            '.locale-switch a[data-locale="' + target.code + '"]',
          );
          await expect(switchLink).not.toHaveAttribute(
            "data-locale-fallback",
            "course-index",
          );
          await switchLink.click();
          await expect(page).toHaveURL(
            new RegExp(chapterPath(target.code, chapterId) + "$"),
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
      test(
        "the complete " +
          locale +
          " Rust-backed lesson renders at desktop and narrow widths",
        async ({ page }) => {
          await page.setViewportSize({ width: 1440, height: 1000 });
          const chapters = await readOrderedCourseChapters(page, locale);
          await page.goto(chapterPath(locale, chapterId));
          await expectChapterContent(page, locale, chapters, false);

          await page.setViewportSize({ width: 720, height: 900 });
          await page.reload();
          await settle(page);
          await expectDiagramContainment(page, locale);
          await expectNoOverflowOrClientScripts(page);

          await page.setViewportSize({ width: 390, height: 844 });
          await page.reload();
          await expectChapterContent(page, locale, chapters, true);
        },
      );
    }

    test("chapter 21 full view fits both locales and restores focus", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      for (const locale of chapterLocales) {
        await page.goto(chapterPath(locale, chapterId));
        await settle(page);
        const diagram = page.locator(
          'figure[data-visualization-id="mini-batches"]',
        );
        const toggle = diagram.locator("[data-diagram-full-view-toggle]");
        await expect(toggle).toHaveCount(1);
        await expect(toggle).toBeVisible();
        await toggle.click();
        await page.waitForFunction(
          () =>
            document.fullscreenElement?.getAttribute(
              "data-visualization-id",
            ) === "mini-batches",
        );
        await settle(page);
        await expectDiagramContainment(page, locale);
        const geometry = await diagram.evaluate((node) => {
          const stage = (selector: string) => {
            const rect = node
              .querySelector<HTMLElement>(selector)!
              .getBoundingClientRect();
            return {
              bottom: rect.bottom,
              left: rect.left,
              right: rect.right,
              top: rect.top,
            };
          };
          return {
            blockDebt: node.scrollHeight - node.clientHeight,
            blockBudget: Math.ceil(node.clientHeight * 0.25) + 2,
            inlineDebt: node.scrollWidth - node.clientWidth,
            parts: Array.from(node.children).map((part) => ({
              name:
                typeof (part as HTMLElement).className === "string"
                  ? (part as HTMLElement).className
                  : part.tagName,
              height: Math.round(
                (part as HTMLElement).getBoundingClientRect().height,
              ),
            })),
            batchParts: Array.from(
              node.querySelector<HTMLElement>(".batches-stage")!.children,
            ).map((part) => ({
              name:
                typeof (part as HTMLElement).className === "string"
                  ? (part as HTMLElement).className || part.tagName
                  : part.tagName,
              height: Math.round(
                (part as HTMLElement).getBoundingClientRect().height,
              ),
              width: Math.round(
                (part as HTMLElement).getBoundingClientRect().width,
              ),
            })),
            proofParts: Array.from(
              node.querySelector<HTMLElement>(".proof-stage")!.children,
            ).map((part) => ({
              name:
                typeof (part as HTMLElement).className === "string"
                  ? (part as HTMLElement).className || part.tagName
                  : part.tagName,
              height: Math.round(
                (part as HTMLElement).getBoundingClientRect().height,
              ),
            })),
            lowerParts: [".shuffle-stage", ".final-stage"].map((selector) => ({
              selector,
              children: Array.from(
                node.querySelector<HTMLElement>(selector)!.children,
              ).map((part) => ({
                name:
                  typeof (part as HTMLElement).className === "string"
                    ? (part as HTMLElement).className || part.tagName
                    : part.tagName,
                height: Math.round(
                  (part as HTMLElement).getBoundingClientRect().height,
                ),
              })),
            })),
            regionDebts: Array.from(
              node.querySelectorAll<HTMLElement>("[data-diagram-scroll]"),
            ).map((region) => ({
              name: region.getAttribute("aria-label"),
              inline: region.scrollWidth - region.clientWidth,
              block: region.scrollHeight - region.clientHeight,
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
            batchCardTops: Array.from(
              node.querySelectorAll<HTMLElement>(".batch-card"),
            ).map((card) => card.getBoundingClientRect().top),
            shuffle: stage(".shuffle-stage"),
            batches: stage(".batches-stage"),
            final: stage(".final-stage"),
            proof: stage(".proof-stage"),
          };
        });
        const geometryLabel = locale + "/mini-batches";
        expect(
          geometry.blockDebt,
            geometryLabel +
            " full-view block debt: " +
            JSON.stringify({
              parts: geometry.parts,
              batchParts: geometry.batchParts,
              proofParts: geometry.proofParts,
              lowerParts: geometry.lowerParts,
            }),
        ).toBeLessThanOrEqual(geometry.blockBudget);
        expect(
          geometry.inlineDebt,
          geometryLabel + " full-view inline debt",
        ).toBeLessThanOrEqual(2);
        expect(
          geometry.regionDebts.every(
            ({ inline, block }) => inline <= 2 && block <= 2,
          ),
          geometryLabel +
            " named-region containment: " +
            JSON.stringify(geometry.regionDebts),
        ).toBe(true);
        expect(
          geometry.boxDebts.every(
            ({ inline, block }) => inline <= 2 && block <= 2,
          ),
          geometryLabel + " bounded-box containment",
        ).toBe(true);
        expect(new Set(geometry.summaryCardTops.map(Math.round)).size).toBe(1);
        expect(new Set(geometry.batchCardTops.map(Math.round)).size).toBe(1);
        expect(geometry.shuffle.top).toBeGreaterThan(geometry.batches.bottom);
        expect(Math.abs(geometry.final.top - geometry.shuffle.top)).toBeLessThan(1);
        expect(Math.abs(geometry.proof.top - geometry.shuffle.top)).toBeLessThan(1);
        expect(geometry.batches.left).toBeLessThanOrEqual(geometry.shuffle.left);
        expect(geometry.batches.right).toBeGreaterThanOrEqual(geometry.proof.right);
        await page.keyboard.press("Escape");
        await page.waitForFunction(() => document.fullscreenElement === null);
        await expect(toggle).toBeFocused();
      }
    });

    test("full, final, unused, and denominator states survive forced colors", async ({
      page,
    }) => {
      await page.emulateMedia({ forcedColors: "active" });
      for (const locale of chapterLocales) {
        await page.goto(chapterPath(locale, chapterId));
        const diagram = page.locator(
          'figure[data-visualization-id="mini-batches"]',
        );
        await expect(
          diagram.locator('.batch-card[data-batch="0"]'),
        ).toHaveCSS("border-top-style", "solid");
        await expect(diagram.locator(".batch-card.final-card")).toHaveCSS(
          "border-top-style",
          "double",
        );
        await expect(diagram.locator(".unused-slot")).toHaveCSS(
          "border-top-style",
          "dashed",
        );
        await expect(diagram.locator(".capacity-denominator")).toHaveCSS(
          "border-top-style",
          "dashed",
        );
        await expect(diagram.locator(".actual-denominator")).toHaveCSS(
          "border-top-style",
          "double",
        );
        await expect(diagram.locator(".unused-slot")).toContainText(
          copy[locale].unused,
        );
        await expectDiagramContainment(page, locale);
        await expectNoOverflowOrClientScripts(page);
      }
    });

    test("localized prose follows RTL while technical batch evidence stays left-to-right", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      for (const locale of chapterLocales) {
        await page.goto(chapterPath(locale, chapterId));
        const diagram = page.locator(
          'figure[data-visualization-id="mini-batches"]',
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
            .locator('bdi[dir="ltr"], code, .katex')
            .evaluateAll(
              (nodes) =>
                nodes.length > 0 &&
                nodes.every(
                  (node) => window.getComputedStyle(node).direction === "ltr",
                ),
            ),
        ).toBe(true);
        const slotRows = await diagram
          .locator(
            '.batch-card[data-batch="0"] tbody tr[data-slot]',
          )
          .evaluateAll((nodes) =>
            nodes.map((node) => {
              const rect = node.getBoundingClientRect();
              return { left: rect.left, top: rect.top };
            }),
          );
        expect(slotRows).toHaveLength(3);
        expect(
          Math.max(...slotRows.map(({ left }) => left)) -
            Math.min(...slotRows.map(({ left }) => left)),
        ).toBeLessThan(1);
        expect(slotRows[0]!.top).toBeLessThan(slotRows[1]!.top);
        expect(slotRows[1]!.top).toBeLessThan(slotRows[2]!.top);
        await expectDiagramContainment(page, locale);
        await expectNoOverflowOrClientScripts(page);
      }
    });

  },
);
