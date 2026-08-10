// @ts-ignore Node APIs are available in the Playwright test runner.
import { readFileSync } from "node:fs";
// @ts-ignore Node APIs are available in the Playwright test runner.
import { resolve } from "node:path";

import { expect, test, type Locator, type Page } from "@playwright/test";

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
} from "./chapter-helpers";

declare const process: { cwd(): string };

const chapterId = "07-language-model-metrics";
const contentRevision = 7;
const formulaLatex = String.raw`\mathcal{L}=-\frac{1}{N}\sum_{t=1}^{N}\log p_t(z_t), \quad \operatorname{PPL}=\exp(\mathcal{L})`;
const repositoryRoot = resolve(process.cwd(), "..");
const diagramSelector =
  'figure[data-visualization-id="language-model-metrics"]';
const desktop = { width: 1440, height: 1000 } as const;
const standardFullView = { width: 1280, height: 900 } as const;
const minimumFullView = { width: 1024, height: 576 } as const;

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
  if (start === -1 || end <= start)
    throw new Error(`Missing ordered Rust region ${region} in ${path}`);
  return lines.slice(start + 1, end).join("\n");
}

const expectedRustSources = [
  readRustRegion(
    "rust/crates/llm-from-scratch/src/metrics.rs",
    "assigned-probability-metrics",
  ),
  readRustRegion(
    "rust/crates/llm-from-scratch/src/metrics.rs",
    "train-validation-scoring",
  ),
  readRustRegion(
    "rust/demos/ch07-language-model-metrics/src/lib.rs",
    "frozen-metric-fixture",
  ),
  readRustRegion(
    "rust/demos/ch07-language-model-metrics/src/main.rs",
    "learner-output",
  ),
  readRustRegion(
    "rust/demos/ch07-language-model-metrics/src/diagram_trace.rs",
    "language-model-metrics-trace",
  ),
];

const copy = {
  en: {
    indexTitle: "From text to a tiny language model",
    chapterTitle: "From assigned probability to perplexity",
    revisionLabel: "Content revision",
    headings: [
      "Start with the probabilities of what actually happened",
      "Sum surprise, divide by targets, then exponentiate",
      "Locate every symbol in the worked example",
      "Add logarithms instead of multiplying probabilities directly",
      "Implement the metric once and reuse it for the frozen bigram",
      "Trace each displayed value back to its Rust calculation",
      "Predict each result before checking the reasoning",
      "Keep one measurement while the model becomes more capable",
    ],
    rustCaptions: [
      "Validate, accumulate, divide by target count, and exponentiate",
      "Permit train or validation, then score adjacent targets in each document",
      "Load and split the corpus, train the tokenizer, encode documents, and fit the bigram on training only",
      "Compute the teaching examples and training and validation metrics for one unchanged model",
      "Compute the tiny example and unchanged-model metrics with the same functions, and inspect document boundaries separately",
    ],
    rustLabels: [
      "Rust source showing complete probability validation, zero handling, surprise accumulation, target-count division, and perplexity exponentiation",
      "Rust source showing the Train and Validation partition enum and the loop that scores adjacent token pairs in each document with the same fitted model",
      "Rust source showing corpus loading, document splitting, BPE-tokenizer training, encoding of every partition, and bigram fitting from training documents only",
      "Rust source computing the two-probability example, scale anchors, zero and empty cases, weighting error, shared-maximum comparison, product underflow, and training and validation metrics",
      "Rust source computing the two-target example and training and validation metrics, then checking that BOS is not a target, EOS is each document's final target, and no EOS-to-BOS pair was introduced; later code writes these values to the Chapter 7 trace",
    ],
    diagramTitle: "From target probabilities to mean NLL and perplexity",
    diagramCaption:
      "The Rust-generated trace shows each metric stage for two observed targets, then reports training and validation metrics for the same unchanged fitted model.",
    accessibleName:
      "Mean-NLL and perplexity calculation with training and validation metrics for one unchanged model",
    accessibleDescription:
      "A five-stage calculation turns two assigned target probabilities into surprise, divides their total surprise by two targets, and obtains mean negative log-likelihood and perplexity. A second panel shows how one model was fitted on training documents, reports its separate training and validation scores, explains the document-boundary rules, and shows that the bigram scorer cannot select test data.",
    diagramSections: [
      "Two observed targets, one calculation chain",
      "One fitted model, separate training and validation scores",
      "How the data and model were prepared",
      "Which targets and data splits are scored",
    ],
    stageLabels: [
      "Assigned probability",
      "Surprise from the Rust metric",
      "Total surprise and target count",
      "Mean negative log-likelihood",
      "Perplexity",
    ],
    targetHeaders: [
      "Zero-based target index in Rust",
      "Probability assigned to the observed target",
      "Negative-log surprise",
    ],
    aggregateLabels: ["Sum across both targets", "Denominator: target tokens"],
    provenanceLabels: [
      "Corpus checksum",
      "Document split strategy",
      "Tokenizer layout version",
      "Requested BPE merges",
      "Learned BPE merges",
      "Vocabulary size",
      "Bigram smoothing",
      "Data split used to fit the model",
      "Documents used to fit",
      "Transitions used to fit",
    ],
    scoreHeaders: [
      "Data split being scored",
      "Document count",
      "Target-token count",
      "Total surprise",
      "Mean NLL",
      "Perplexity",
    ],
    partitionLabels: ["Training score", "Validation score"],
    boundaries: [
      "BOS supplies context and is never a scored target.",
      "EOS is the final scored target in each document.",
      "Documents remain separate; no EOS→BOS transition is introduced.",
      "The Chapter 7 bigram scorer cannot score test data.",
    ],
    scrollInstruction:
      "Use horizontal scrolling to follow every stage; keyboard users can focus this region and scroll it.",
    frozenModelNote:
      "Fit the model once on training documents, then use the same unchanged model to score training and validation separately.",
    exerciseSummary: "Check the nine calculations and explanations",
    answerEvidence: "positive infinity, not an input error",
    holdoutHandoff: [
      "Chapter 34 will freeze that state and demonstrate one local post-selection evaluation on a fixed teaching fixture",
      "That describes the order inside the demonstrated execution; it makes no claim about how often the fixed result has been used during repository development",
    ],
  },
  ru: {
    indexTitle: "От текста к небольшой языковой модели",
    chapterTitle:
      "Как измерять качество вероятностного прогноза: NLL и перплексия",
    revisionLabel: "Версия материала",
    headings: [
      "Начните с вероятностей продолжений, которые действительно встретились",
      "Сложите меры неожиданности, разделите сумму на число токенов и возьмите экспоненту",
      "Свяжите каждое обозначение с вычислением",
      "Складывайте логарифмы вместо прямого перемножения вероятностей",
      "Реализуйте метрику один раз и примените её к уже построенной модели",
      "Проследите, откуда взялось каждое значение на диаграмме",
      "Сначала предскажите результат, затем проверьте рассуждение",
      "Используйте одну и ту же метрику по мере усложнения модели",
    ],
    rustCaptions: [
      "Проверить вероятности, сложить меры неожиданности и вычислить среднее NLL и перплексию",
      "Выбрать обучающую или валидационную выборку и рассчитать метрику по переходам внутри документов",
      "Загрузить корпус и разбиение, обучить BPE, закодировать документы и построить биграммную модель",
      "Вычислить учебные примеры и метрики неизменной модели на двух выборках",
      "Вычислить учебный пример и метрики неизменной модели теми же функциями, а границы документов проверить отдельно",
    ],
    rustLabels: [
      "Код на Rust: проверка всех входных вероятностей, обработка нуля, суммирование мер неожиданности, деление на число целевых токенов и вычисление перплексии",
      "Код на Rust: варианты Train и Validation, перебор соседних пар токенов внутри каждого документа и расчёт метрики с помощью уже построенной биграммной модели",
      "Код на Rust: загрузка корпуса и схемы разбиения, обучение BPE-токенизатора, кодирование документов всех выборок и построение биграммной модели только по обучающим документам",
      "Код на Rust: расчёт метрик для небольшого примера и граничных случаев, демонстрация ошибок усреднения, ограничений проверки только максимального токена и прямого перемножения вероятностей, а также оценка модели на обучающей и валидационной выборках",
      "Код на Rust: расчёт метрик для двух целевых токенов и двух выборок, затем проверка того, что BOS не становится целью, EOS занимает последнюю целевую позицию каждого документа, а пара EOS→BOS не добавлена; последующий код записывает эти значения в трассировку главы 7",
    ],
    diagramTitle:
      "Как из вероятностей токенов получить среднее NLL и перплексию",
    diagramCaption:
      "Сначала показан полный расчёт для двух наблюдаемых токенов, а затем — NLL и перплексия одной и той же неизменной модели на обучающей и валидационной выборках. Все числа вычислены программой на Rust.",
    accessibleName:
      "Расчёт среднего NLL и перплексии для двух токенов; метрики одной неизменной модели на двух выборках",
    accessibleDescription:
      "В первой части показано, как вероятность каждого из двух наблюдаемых целевых токенов превращается в меру неожиданности, как сумма этих мер делится на два целевых токена и как из среднего NLL получается перплексия. Во второй части приведены отдельные результаты одной и той же неизменной модели на обучающей и валидационной выборках. Также показаны правила учёта границ документов и указано, что интерфейс оценки биграммной модели не позволяет выбрать тестовую выборку.",
    diagramSections: [
      "Расчёт для двух наблюдаемых токенов",
      "Метрики одной неизменной модели на двух выборках",
      "Как подготовлены данные и модель",
      "Какие токены и выборки входят в расчёт",
    ],
    stageLabels: [
      "Вероятность наблюдаемого токена",
      "Мера неожиданности",
      "Сумма мер неожиданности и знаменатель",
      "Среднее значение NLL",
      "Перплексия",
    ],
    targetHeaders: [
      "Индекс целевого токена в Rust (с нуля)",
      "Вероятность наблюдаемого токена",
      "Мера неожиданности",
    ],
    aggregateLabels: [
      "Сумма мер неожиданности для двух токенов",
      "Число токенов, на которое делим сумму",
    ],
    provenanceLabels: [
      "Контрольная сумма корпуса",
      "Способ разбиения документов",
      "Версия схемы идентификаторов токенов",
      "Заданное число правил слияния BPE",
      "Число правил слияния BPE после обучения",
      "Размер словаря",
      "Коэффициент сглаживания",
      "Выборка, по которой построена модель",
      "Число документов для построения модели",
      "Число переходов для построения модели",
    ],
    scoreHeaders: [
      "Выборка, на которой вычислена метрика",
      "Число документов",
      "Число целевых токенов",
      "Сумма мер неожиданности",
      "Среднее значение NLL",
      "Перплексия",
    ],
    partitionLabels: ["Обучающая выборка", "Валидационная выборка"],
    boundaries: [
      "BOS задаёт контекст и сам не учитывается как целевой токен.",
      "EOS учитывается как последний целевой токен каждого документа.",
      "Документы обрабатываются отдельно; переход EOS→BOS не добавляется.",
      "В интерфейсе оценки биграммной модели нельзя выбрать тестовую выборку.",
    ],
    scrollInstruction:
      "Чтобы увидеть все этапы, прокрутите эту область по горизонтали. Если вы пользуетесь клавиатурой, сначала переместите фокус в эту область, а затем прокручивайте её клавишами.",
    frozenModelNote:
      "Модель один раз строится по обучающим документам. Затем её параметры не меняются: на обучающей и валидационной выборках вычисляются отдельные значения метрик.",
    exerciseSummary: "Проверьте ответы и ход вычислений",
    answerEvidence: "нулевая вероятность не считается ошибкой входных данных",
    holdoutHandoff: [
      "В главе 34 мы зафиксируем выбранное состояние и покажем одну локальную оценку фиксированного учебного примера после завершения выбора модели",
      "Это порядок действий внутри одного запуска, а не утверждение о том, как часто фиксированный результат использовался при разработке репозитория",
    ],
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

async function staticDiagramMarkup(diagram: Locator) {
  return diagram.evaluate((root) => {
    const clone = root.cloneNode(true) as HTMLElement;
    clone.querySelector("[data-diagram-full-view-controls]")?.remove();
    return clone.innerHTML;
  });
}

async function readMetricsGeometry(diagram: Locator) {
  return diagram.evaluate((root) => {
    const figure = root as HTMLElement;
    const tolerance = 2;
    const problems: string[] = [];
    const allElements = [figure, ...figure.querySelectorAll<HTMLElement>("*")];
    const ignored = (element: HTMLElement) =>
      Boolean(
        element.closest(
          ".visually-hidden, .katex-mathml, [data-diagram-full-view-controls]",
        ),
      );
    const visible = (element: HTMLElement) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== "none" &&
        !["hidden", "collapse"].includes(style.visibility) &&
        Number.parseFloat(style.opacity) > 0 &&
        rect.width > 0 &&
        rect.height > 0
      );
    };
    const describe = (element: HTMLElement) => {
      const classes = [...element.classList].slice(0, 2).join(".");
      return `${element.tagName.toLowerCase()}${classes ? `.${classes}` : ""}`;
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
      const normalized = value.toLowerCase().replaceAll(" ", "");
      return (
        normalized === "transparent" ||
        /^rgba\([^)]*,0(?:\.0+)?\)$/.test(normalized) ||
        /\/0(?:\.0+)?\)$/.test(normalized)
      );
    };
    const completeBorder = (element: HTMLElement) => {
      const evidence = border(element);
      return (
        evidence.widths.every((width) => Number.isFinite(width) && width > 0) &&
        evidence.styles.every((style) => !["none", "hidden"].includes(style)) &&
        evidence.colors.every((color) => !transparent(color))
      );
    };
    const concealed = (element: HTMLElement) => {
      const style = getComputedStyle(element);
      const zoom = style.getPropertyValue("zoom");
      const lineClamp = style.getPropertyValue("-webkit-line-clamp");
      const textIndent = Number.parseFloat(style.textIndent || "0");
      return (
        [style.overflowX, style.overflowY].some((value) =>
          ["hidden", "clip"].includes(value),
        ) ||
        /(?:paint|strict|content)/.test(style.contain) ||
        style.clipPath !== "none" ||
        style.maskImage !== "none" ||
        style.filter !== "none" ||
        Number.parseFloat(style.opacity) <= 0 ||
        style.contentVisibility === "hidden" ||
        style.textOverflow === "ellipsis" ||
        (lineClamp !== "" && lineClamp !== "none") ||
        (Number.isFinite(textIndent) && textIndent < -tolerance) ||
        !["", "1", "normal"].includes(zoom)
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
        (child) =>
          child.nodeType === Node.TEXT_NODE &&
          Boolean(child.textContent?.trim()),
      );
      if (
        style.display === "none" ||
        ["hidden", "collapse"].includes(style.visibility) ||
        style.contentVisibility === "hidden" ||
        Number.parseFloat(style.opacity) <= 0
      ) {
        problems.push(`element-${index} ${describe(element)} is concealed`);
      }
      if (directText && (rect.width <= 0 || rect.height <= 0)) {
        problems.push(
          `element-${index} ${describe(element)} has no painted area`,
        );
      }
      if (concealed(element)) {
        problems.push(
          `element-${index} ${describe(element)} conceals overflow or paint`,
        );
      }
      if (directText && transparent(style.color)) {
        problems.push(
          `element-${index} ${describe(element)} paints transparent text`,
        );
      }
      if (
        style.transform !== "none" &&
        !element.classList.contains("causal-arrow")
      ) {
        problems.push(`element-${index} ${describe(element)} is transformed`);
      }
      if (
        element !== figure &&
        visible(element) &&
        element.clientWidth > 0 &&
        element.clientHeight > 0
      ) {
        const inlineDebt = Math.max(
          0,
          element.scrollWidth - element.clientWidth,
        );
        const blockDebt = Math.max(
          0,
          element.scrollHeight - element.clientHeight,
        );
        if (
          (["auto", "scroll"].includes(style.overflowX) ||
            inlineDebt > tolerance) &&
          !element.hasAttribute("data-diagram-scroll")
        ) {
          undeclaredHorizontalOwnerCount += 1;
          problems.push(
            `element-${index} ${describe(element)} is an undeclared horizontal owner/debt ${inlineDebt}`,
          );
        }
        if (style.overflowY === "scroll" || blockDebt > tolerance) {
          localVerticalOwnerCount += 1;
          problems.push(
            `element-${index} ${describe(element)} has private vertical owner/debt ${blockDebt}`,
          );
        }
      }
    }
    const markedBoxes = visibleElements.filter((element) =>
      element.hasAttribute("data-diagram-box"),
    );
    const borderedOwners = visibleElements.filter(
      (element) =>
        !element.closest("[data-diagram-full-view-controls]") &&
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
        problems.push(
          `owner-${index} ${describe(owner)} lacks four visible borders`,
        );
      }
      if (concealed(owner)) {
        problems.push(
          `owner-${index} ${describe(owner)} conceals overflow or paint`,
        );
      }
      const rect = owner.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        problems.push(`owner-${index} ${describe(owner)} has no painted area`);
      }
      const inlineDebt = Math.max(0, owner.scrollWidth - owner.clientWidth);
      const blockDebt = Math.max(0, owner.scrollHeight - owner.clientHeight);
      if (owner !== figure && blockDebt > tolerance) {
        problems.push(`owner-${index} has block debt ${blockDebt}`);
      }
      if (
        owner !== figure &&
        !owner.matches("[data-diagram-scroll]") &&
        inlineDebt > tolerance
      ) {
        problems.push(`owner-${index} has inline debt ${inlineDebt}`);
      }

      const ancestor = nearestOwner(owner.parentElement);
      if (!ancestor) continue;
      const interveningScroller = owner.parentElement?.closest<HTMLElement>(
        "[data-diagram-scroll]",
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

    const cards = Array.from(
      figure.querySelectorAll<HTMLElement>("[data-diagram-card]"),
    ).filter(visible);
    for (let first = 0; first < cards.length; first += 1) {
      for (let second = first + 1; second < cards.length; second += 1) {
        const a = cards[first]!;
        const b = cards[second]!;
        if (a.contains(b) || b.contains(a)) continue;
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        const inlineOverlap =
          Math.min(ar.right, br.right) - Math.max(ar.left, br.left);
        const blockOverlap =
          Math.min(ar.bottom, br.bottom) - Math.max(ar.top, br.top);
        if (inlineOverlap > tolerance && blockOverlap > tolerance) {
          problems.push(`${describe(a)} overlaps ${describe(b)}`);
        }
      }
    }

    const scrollers = Array.from(
      figure.querySelectorAll<HTMLElement>("[data-diagram-scroll]"),
    );
    for (const [index, scroller] of scrollers.entries()) {
      const labelledBy = scroller.getAttribute("aria-labelledby")?.trim() ?? "";
      const directLabel = scroller.getAttribute("aria-label")?.trim() ?? "";
      const ids = labelledBy.split(/\s+/).filter(Boolean);
      const resolved =
        ids.length > 0 && ids.every((id) => document.getElementById(id));
      if (
        scroller.getAttribute("role") !== "region" ||
        scroller.getAttribute("tabindex") !== "0" ||
        !scroller.classList.contains("course-diagram__scroll") ||
        (!directLabel && !resolved)
      ) {
        problems.push(
          `scroller-${index} lacks its shared accessible region contract`,
        );
      }
      if (
        scroller.hasAttribute("data-diagram-box") ||
        scroller.hasAttribute("data-diagram-card")
      ) {
        problems.push(`scroller-${index} also claims bounded ownership`);
      }
      if (concealed(scroller))
        problems.push(`scroller-${index} conceals overflow or paint`);
      if (scroller.scrollHeight - scroller.clientHeight > tolerance) {
        problems.push(`scroller-${index} has vertical travel`);
      }
    }

    const idrefElements = [
      figure,
      ...figure.querySelectorAll<HTMLElement>(
        "[aria-labelledby], [aria-describedby]",
      ),
    ].filter(
      (element) =>
        element.hasAttribute("aria-labelledby") ||
        element.hasAttribute("aria-describedby"),
    );
    const referencedIds = new Set<string>();
    let idrefTokenCount = 0;
    for (const [index, element] of idrefElements.entries()) {
      for (const attribute of [
        "aria-labelledby",
        "aria-describedby",
      ] as const) {
        if (!element.hasAttribute(attribute)) continue;
        const ids = (element.getAttribute(attribute) ?? "")
          .split(/\s+/)
          .filter(Boolean);
        if (ids.length === 0) {
          problems.push(`idref-${index} has an empty ${attribute}`);
          continue;
        }
        for (const id of ids) {
          referencedIds.add(id);
          idrefTokenCount += 1;
          const matches = document.querySelectorAll<HTMLElement>(
            `#${CSS.escape(id)}`,
          );
          if (
            matches.length !== 1 ||
            !matches[0]?.textContent?.trim() ||
            !figure.contains(matches[0])
          ) {
            problems.push(
              `idref-${index} ${attribute} does not resolve ${id} exactly once`,
            );
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
          ".visually-hidden, .katex-mathml, [data-diagram-full-view-controls]",
        ) ||
        !visible(parent)
      ) {
        continue;
      }
      const owner = nearestOwner(parent);
      if (!owner) continue;
      const scroller = parent.closest<HTMLElement>("[data-diagram-scroll]");
      const checkInline = !scroller || scroller.contains(owner);
      const range = document.createRange();
      range.selectNodeContents(textNode);
      const paints = Array.from(range.getClientRects()).filter(
        (paint) => paint.width > 0 && paint.height > 0,
      );
      if (paints.length === 0) {
        problems.push(
          `${describe(parent)} has nonblank text without positive paint`,
        );
        continue;
      }
      if (transparent(getComputedStyle(parent).color)) {
        problems.push(`${describe(parent)} paints transparent text`);
      }
      for (const paint of paints) {
        if (!within(paint, innerRect(owner), checkInline, owner !== figure)) {
          problems.push(
            `${describe(parent)} paints outside ${describe(owner)}`,
          );
          break;
        }
      }
    }

    for (const [index, replaced] of Array.from(
      figure.querySelectorAll<HTMLElement>("img, svg, math, .katex"),
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
        problems.push(
          `replaced-${index} ${describe(replaced)} paints outside its owner`,
        );
      }
    }

    for (const [index, table] of Array.from(
      figure.querySelectorAll<HTMLTableElement>("table[data-diagram-table]"),
    ).entries()) {
      if (getComputedStyle(table).display !== "table") {
        problems.push(`table-${index} is not a native table`);
      }
      if (
        !table.caption ||
        getComputedStyle(table.caption).display !== "table-caption"
      ) {
        problems.push(`table-${index} lost its native caption`);
      }
      if (
        !table.tHead ||
        getComputedStyle(table.tHead).display !== "table-header-group"
      ) {
        problems.push(`table-${index} lost its native header group`);
      }
      for (const body of Array.from(table.tBodies)) {
        if (getComputedStyle(body).display !== "table-row-group") {
          problems.push(`table-${index} lost its native body group`);
        }
      }
      for (const [headerIndex, header] of Array.from(
        table.querySelectorAll<HTMLTableCellElement>("thead th"),
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
                `table-${index} header-${headerIndex} word-${wordIndex} fragments into ${paints.length} paint rects`,
              );
            }
            wordIndex += 1;
          }
        }
      }
      for (const [rowIndex, row] of Array.from(table.rows).entries()) {
        const rowRect = row.getBoundingClientRect();
        if (getComputedStyle(row).display !== "table-row") {
          problems.push(`table-${index} row-${rowIndex} is not a native row`);
        }
        const expectedCells = index === 0 ? 3 : 6;
        if (row.cells.length !== expectedCells) {
          problems.push(
            `table-${index} row-${rowIndex} has ${row.cells.length} cells instead of ${expectedCells}`,
          );
        }
        for (const [cellIndex, cell] of Array.from(row.cells).entries()) {
          const cellRect = cell.getBoundingClientRect();
          if (getComputedStyle(cell).display !== "table-cell") {
            problems.push(
              `table-${index} row-${rowIndex} cell-${cellIndex} is not table-cell`,
            );
          }
          if (!completeBorder(cell)) {
            problems.push(
              `table-${index} row-${rowIndex} cell-${cellIndex} lacks four borders`,
            );
          }
          if (
            Math.abs(cellRect.top - rowRect.top) > 1 ||
            Math.abs(cellRect.bottom - rowRect.bottom) > 1
          ) {
            problems.push(
              `table-${index} row-${rowIndex} cell-${cellIndex} does not fill row`,
            );
          }
        }
      }
    }

    for (const [index, heading] of Array.from(
      figure.querySelectorAll<HTMLElement>(".score-row-heading"),
    ).entries()) {
      const cell = heading.parentElement;
      if (!cell?.matches('th[scope="row"]')) {
        problems.push(
          `score-row-heading-${index} is not a direct child of its row header`,
        );
        continue;
      }
      if (getComputedStyle(heading).display !== "grid") {
        problems.push(
          `score-row-heading-${index} is not the intended grid wrapper`,
        );
      }
      if (
        !within(heading.getBoundingClientRect(), innerRect(cell), true, true)
      ) {
        problems.push(
          `score-row-heading-${index} escapes its native row header`,
        );
      }
    }

    const scoreTechnical = Array.from(
      figure.querySelectorAll<HTMLElement>(
        ".score-table-scroll tbody :is(code, bdi)",
      ),
    );
    for (const [index, technical] of scoreTechnical.entries()) {
      const range = document.createRange();
      range.selectNodeContents(technical);
      const paints = Array.from(range.getClientRects()).filter(
        (paint) => paint.width > 0 && paint.height > 0,
      );
      if (paints.length !== 1) {
        problems.push(
          `score-technical-${index} ${describe(technical)} fragments into ${paints.length} paint rects`,
        );
      }
    }

    for (const [index, element] of visibleElements.entries()) {
      if (
        element.closest(
          ".visually-hidden, .katex-mathml, [data-diagram-full-view-controls]",
        )
      ) {
        continue;
      }
      if (concealed(element)) {
        problems.push(
          `element-${index} ${describe(element)} conceals overflow`,
        );
      }
    }

    const fontSizes = allElements.flatMap((element, index) => {
      if (
        element.closest(
          ".visually-hidden, .katex-mathml, [data-diagram-full-view-controls]",
        ) ||
        !visible(element)
      ) {
        return [];
      }
      const directText = [...element.childNodes].some(
        (child) =>
          child.nodeType === Node.TEXT_NODE &&
          Boolean(child.textContent?.trim()),
      );
      return directText
        ? [
            {
              index,
              pixels: Number.parseFloat(getComputedStyle(element).fontSize),
            },
          ]
        : [];
    });
    const scrollerTravel = scrollers.map((scroller, index) => ({
      key: `${scroller.classList.contains("chain-scroll") ? "chain" : "score"}:${index}`,
      client: scroller.clientWidth,
      debt: Math.max(0, scroller.scrollWidth - scroller.clientWidth),
      blockDebt: Math.max(0, scroller.scrollHeight - scroller.clientHeight),
    }));

    const causalOrder = Array.from(
      figure.querySelectorAll<HTMLElement>(
        ".calculation-chain > :is(.stage, .stage-connector)",
      ),
    ).map((element) =>
      element.matches(".stage")
        ? `stage:${element.dataset.stage}`
        : `connector:${element.dataset.connectorTo}`,
    );
    const frozenOrder = Array.from(
      figure.querySelectorAll<HTMLElement>(
        ".frozen-model-panel > :is(.provenance-panel, .score-table-scroll, .boundary-panel)",
      ),
    ).map((element) => {
      if (element.matches(".provenance-panel")) return "provenance";
      if (element.matches(".score-table-scroll")) return "score";
      return "boundary";
    });

    return {
      blockDebt: Math.max(0, figure.scrollHeight - figure.clientHeight),
      borderedOwnerCount: borderedOwners.length,
      boxCount: markedBoxes.length,
      cardCount: figure.querySelectorAll("[data-diagram-card]").length,
      causalOrder,
      cellCount: figure.querySelectorAll("th, td").length,
      columnHeaderCount: figure.querySelectorAll('th[scope="col"]').length,
      directOrder: Array.from(figure.children)
        .filter(
          (element) => !element.hasAttribute("data-diagram-full-view-controls"),
        )
        .map((element) => `${element.tagName}.${element.className}`),
      fontSizes,
      frozenOrder,
      idrefElementCount: idrefElements.length,
      idrefTargetCount: referencedIds.size,
      idrefTokenCount,
      inlineDebt: Math.max(0, figure.scrollWidth - figure.clientWidth),
      localVerticalOwnerCount,
      problems: [...new Set(problems)],
      provenanceFactCount: figure.querySelectorAll(".provenance-facts > div")
        .length,
      rowCount: figure.querySelectorAll("table tr").length,
      rowHeaderCount: figure.querySelectorAll('th[scope="row"]').length,
      scoreRowHeadingCount:
        figure.querySelectorAll(".score-row-heading").length,
      scrollerCount: scrollers.length,
      scrollerTravel,
      stageCount: figure.querySelectorAll("[data-stage]").length,
      stageNumberCount: figure.querySelectorAll(".stage-number").length,
      connectorCount: figure.querySelectorAll(".stage-connector").length,
      arrowCount: figure.querySelectorAll(".causal-arrow").length,
      tableCount: figure.querySelectorAll("table[data-diagram-table]").length,
      targetRowCount: figure.querySelectorAll("[data-target-index]").length,
      scoredRowCount: figure.querySelectorAll("[data-scored-partition]").length,
      scoreTechnicalCount: scoreTechnical.length,
      boundaryFactCount: figure.querySelectorAll(".boundary-panel li").length,
      fullscreen: document.fullscreenElement === figure,
      rootOverflowY: getComputedStyle(figure).overflowY,
      undeclaredHorizontalOwnerCount,
      viewportHeight: figure.clientHeight,
      viewportWidth: figure.clientWidth,
    };
  });
}

function expectCompleteMetricsGeometry(
  geometry: Awaited<ReturnType<typeof readMetricsGeometry>>,
) {
  expect(geometry.directOrder).toEqual([
    "FIGCAPTION.course-diagram__caption",
    "SECTION.calculation-panel",
    "SECTION.frozen-model-panel",
  ]);
  expect(geometry.causalOrder).toEqual([
    "stage:probability-surprise",
    "connector:aggregate",
    "stage:aggregate",
    "connector:mean",
    "stage:mean-nll",
    "connector:perplexity",
    "stage:perplexity",
  ]);
  expect(geometry.frozenOrder).toEqual(["provenance", "score", "boundary"]);
  expect(geometry.tableCount).toBe(2);
  expect(geometry.rowCount).toBe(6);
  expect(geometry.cellCount).toBe(27);
  expect(geometry.columnHeaderCount).toBe(9);
  expect(geometry.rowHeaderCount).toBe(4);
  expect(geometry.scoreRowHeadingCount).toBe(2);
  expect(geometry.boxCount).toBe(13);
  expect(geometry.cardCount).toBe(6);
  expect(geometry.borderedOwnerCount).toBe(41);
  expect(geometry.scrollerCount).toBe(2);
  expect(geometry.stageCount).toBe(4);
  expect(geometry.stageNumberCount).toBe(5);
  expect(geometry.connectorCount).toBe(3);
  expect(geometry.arrowCount).toBe(4);
  expect(geometry.provenanceFactCount).toBe(10);
  expect(geometry.targetRowCount).toBe(2);
  expect(geometry.scoredRowCount).toBe(2);
  expect(geometry.scoreTechnicalCount).toBe(12);
  expect(geometry.boundaryFactCount).toBe(4);
  expect(geometry.idrefElementCount).toBe(8);
  expect(geometry.idrefTargetCount).toBe(9);
  expect(geometry.idrefTokenCount).toBe(11);
  expect(geometry.inlineDebt).toBeLessThanOrEqual(2);
  expect(geometry.localVerticalOwnerCount).toBe(0);
  expect(geometry.undeclaredHorizontalOwnerCount).toBe(0);
  expect(geometry.scrollerTravel).toHaveLength(2);
  for (const travel of geometry.scrollerTravel) {
    expect(travel.client).toBeGreaterThan(0);
    expect(travel.blockDebt).toBeLessThanOrEqual(2);
  }
  expect(geometry.problems).toEqual([]);
}

function expectFontsNotShrunk(
  inline: Awaited<ReturnType<typeof readMetricsGeometry>>,
  full: Awaited<ReturnType<typeof readMetricsGeometry>>,
) {
  expect(full.fontSizes.map(({ index }) => index)).toEqual(
    inline.fontSizes.map(({ index }) => index),
  );
  const before = new Map(
    inline.fontSizes.map(({ index, pixels }) => [index, pixels]),
  );
  for (const sample of full.fontSizes) {
    const inlinePixels = before.get(sample.index);
    if (inlinePixels === undefined) continue;
    expect(sample.pixels + 0.01).toBeGreaterThanOrEqual(inlinePixels);
  }
}

async function readReadableFlow(diagram: Locator) {
  return diagram.evaluate((root) => {
    const figure = root as HTMLElement;
    const tolerance = 2;
    const rect = (selector: string) => {
      const element = figure.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      return elementRect(element);
    };
    const elementRect = (element: HTMLElement) => {
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
      return columns === "none"
        ? 0
        : columns.split(/\s+/).filter(Boolean).length;
    };
    const occupiedBandCount = (elements: readonly HTMLElement[]) => {
      const bands: Array<{ top: number; count: number }> = [];
      for (const element of elements) {
        const top = element.getBoundingClientRect().top;
        const band = bands.find(
          (candidate) => Math.abs(candidate.top - top) <= tolerance,
        );
        if (band) band.count += 1;
        else bands.push({ top, count: 1 });
      }
      return Math.max(0, ...bands.map(({ count }) => count));
    };
    const widthSelectors = [
      ".course-diagram__caption",
      ".course-diagram__caption > h3",
      ".course-diagram__description",
      ".calculation-panel",
      ".calculation-panel > h4",
      ".scroll-instruction",
      ".chain-scroll",
      ".target-stage",
      ".target-stage table",
      ".target-stage caption",
      ".target-stage caption > span",
      ".target-stage th",
      ".target-stage td",
      ".target-stage code",
      ".target-stage bdi",
      ".stage-connector",
      ".stage-connector > span",
      ".stage-number",
      ".aggregate-stage",
      ".aggregate-stage > h5",
      ".aggregate-stage > dl",
      ".aggregate-stage > dl > div",
      ".aggregate-stage dt",
      ".aggregate-stage dd",
      ".aggregate-stage bdi",
      ".mean-stage",
      ".mean-stage > h5",
      ".mean-stage > p",
      ".mean-stage > p > span",
      ".mean-stage > p > strong",
      ".mean-stage bdi",
      ".perplexity-stage",
      ".perplexity-stage > h5",
      ".perplexity-stage > p",
      ".perplexity-stage > p > span",
      ".perplexity-stage > p > strong",
      ".perplexity-stage bdi",
      ".frozen-model-panel",
      ".frozen-model-panel > h4",
      ".frozen-model-note",
      ".provenance-panel",
      ".provenance-panel > h5",
      ".provenance-facts",
      ".provenance-facts > div",
      ".provenance-facts dt",
      ".provenance-facts dd",
      ".provenance-facts code",
      ".provenance-facts bdi",
      ".score-table-scroll",
      ".score-table-scroll table",
      ".score-table-scroll caption",
      ".score-table-scroll th",
      ".score-table-scroll td",
      ".score-table-scroll bdi",
      ".score-row-heading",
      ".score-row-heading > span",
      ".score-row-heading > code",
      ".boundary-panel",
      ".boundary-panel > h5",
      ".boundary-panel > ul",
      ".boundary-panel li",
      ".boundary-panel li > span",
      ".boundary-panel li > code",
    ] as const;
    const widthSamples = widthSelectors.flatMap((selector) =>
      Array.from(figure.querySelectorAll<HTMLElement>(selector)).map(
        (element, index) => {
          const box = element.getBoundingClientRect();
          const kind =
            getComputedStyle(element).display === "inline"
              ? "paint"
              : "allocation";
          const range = document.createRange();
          range.selectNodeContents(element);
          const paints = Array.from(range.getClientRects()).filter(
            (paint) => paint.width > 0 && paint.height > 0,
          );
          return {
            key: `${selector}:${index}`,
            kind,
            fragments: kind === "paint" ? paints.length : 0,
            height: box.height,
            width:
              kind === "paint"
                ? Math.max(0, ...paints.map((paint) => paint.width))
                : box.width,
          };
        },
      ),
    );
    const calculation = figure.querySelector<HTMLElement>(".calculation-panel");
    const chain = figure.querySelector<HTMLElement>(".calculation-chain");
    const frozen = figure.querySelector<HTMLElement>(".frozen-model-panel");
    const provenanceFacts =
      figure.querySelector<HTMLElement>(".provenance-facts");
    const boundaryList = figure.querySelector<HTMLElement>(
      ".boundary-panel > ul",
    );
    if (
      !calculation ||
      !chain ||
      !frozen ||
      !provenanceFacts ||
      !boundaryList
    ) {
      throw new Error("Missing Chapter 7 readable-flow owner");
    }
    const figureBox = figure.getBoundingClientRect();
    const figureStyle = getComputedStyle(figure);
    const figureBorderLeft = Number.parseFloat(figureStyle.borderLeftWidth);
    const figureBorderRight = Number.parseFloat(figureStyle.borderRightWidth);
    const reservedGutter = Math.max(
      0,
      figureBox.width -
        figureBorderLeft -
        figureBorderRight -
        figure.clientWidth,
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
    const calculationSpan = contentSpan(calculation);
    const chainSpan = contentSpan(chain);
    const frozenSpan = contentSpan(frozen);
    const provenanceSpan = contentSpan(provenanceFacts);
    const regionSpans = [
      ["calculation", calculation],
      ["frozen", frozen],
    ].map(([key, element]) => {
      const box = (element as HTMLElement).getBoundingClientRect();
      return { key: String(key), left: box.left, right: box.right };
    });
    const chainStageSpans = Array.from(
      chain.querySelectorAll<HTMLElement>(":scope > .stage"),
    ).map((element, index) => {
      const box = element.getBoundingClientRect();
      return { key: index, left: box.left, right: box.right };
    });
    const frozenRecordSpans = [
      frozen.querySelector<HTMLElement>(":scope > .provenance-panel"),
      frozen.querySelector<HTMLElement>(":scope > .score-table-scroll"),
      frozen.querySelector<HTMLElement>(":scope > .boundary-panel"),
    ].map((element, index) => {
      if (!element) throw new Error(`Missing frozen evidence ${index}`);
      const box = element.getBoundingClientRect();
      return { key: index, left: box.left, right: box.right };
    });
    const provenanceFactSpans = Array.from(
      provenanceFacts.querySelectorAll<HTMLElement>(":scope > div"),
    ).map((element, index) => {
      const box = element.getBoundingClientRect();
      return { key: index, left: box.left, right: box.right };
    });
    const scrollers = Array.from(
      figure.querySelectorAll<HTMLElement>("[data-diagram-scroll]"),
    ).map((scroller, index) => {
      const box = scroller.getBoundingClientRect();
      const isChain = scroller.classList.contains("chain-scroll");
      const ownerSpan = isChain ? calculationSpan : frozenSpan;
      return {
        key: `${isChain ? "chain" : "score"}:${index}`,
        blockDebt: Math.max(0, scroller.scrollHeight - scroller.clientHeight),
        client: scroller.clientWidth,
        debt: Math.max(0, scroller.scrollWidth - scroller.clientWidth),
        left: box.left,
        ownerLeft: ownerSpan.left,
        ownerRight: ownerSpan.right,
        right: box.right,
      };
    });
    const stageElements = Array.from(
      chain.querySelectorAll<HTMLElement>(
        ":scope > :is(.stage, .stage-connector)",
      ),
    );
    const provenanceFactsElements = Array.from(
      provenanceFacts.querySelectorAll<HTMLElement>(":scope > div"),
    );
    const boundaryFacts = Array.from(
      boundaryList.querySelectorAll<HTMLElement>(":scope > li"),
    );
    return {
      actionPosition: getComputedStyle(
        figure.querySelector<HTMLElement>(
          ":scope > [data-diagram-full-view-controls]",
        )!,
      ).position,
      boundaryColumns: columnCount(boundaryList),
      calculationColumns: columnCount(chain),
      chainSpan,
      columns: columnCount(figure),
      frozenColumns: columnCount(frozen),
      frozenSpan,
      occupiedPeers: {
        calculation: occupiedBandCount(stageElements),
        provenance: occupiedBandCount(provenanceFactsElements),
        boundaries: occupiedBandCount(boundaryFacts),
      },
      provenanceColumns: columnCount(provenanceFacts),
      rootBlockDebt: Math.max(0, figure.scrollHeight - figure.clientHeight),
      rootOverflowY: getComputedStyle(figure).overflowY,
      rootSpan,
      calculationSpan,
      provenanceSpan,
      regionSpans,
      chainStageSpans,
      frozenRecordSpans,
      provenanceFactSpans,
      scrollers,
      widthSamples,
      rootFlow: [
        rect(":scope > figcaption"),
        rect(":scope > [data-diagram-full-view-controls]"),
        rect(":scope > .calculation-panel"),
        rect(":scope > .frozen-model-panel"),
      ],
      calculationFlow: [
        rect(".target-stage"),
        rect('[data-connector-to="aggregate"]'),
        rect(".aggregate-stage"),
        rect('[data-connector-to="mean"]'),
        rect(".mean-stage"),
        rect('[data-connector-to="perplexity"]'),
        rect(".perplexity-stage"),
      ],
      frozenFlow: [
        rect(":scope > .frozen-model-panel > h4"),
        rect(":scope > .frozen-model-panel > .frozen-model-note"),
        rect(":scope > .frozen-model-panel > .provenance-panel"),
        rect(":scope > .frozen-model-panel > .score-table-scroll"),
        rect(":scope > .frozen-model-panel > .boundary-panel"),
      ],
      provenanceFlow: provenanceFactsElements.map(elementRect),
      boundaryFlow: boundaryFacts.map(elementRect),
    };
  });
}

async function readMetricsEvidence(diagram: Locator) {
  return diagram.evaluate((root) => ({
    boundary: Array.from(
      root.querySelectorAll<HTMLElement>("[data-boundary]"),
    ).map((record) => ({
      key: record.dataset.boundary,
      text: record.textContent?.trim(),
    })),
    provenance: Array.from(
      root.querySelectorAll<HTMLElement>(".provenance-facts > div"),
    ).map((record) => record.textContent?.trim()),
    scored: Array.from(
      root.querySelectorAll<HTMLElement>("[data-scored-partition]"),
    ).map((row) => ({
      key: row.dataset.scoredPartition,
      text: row.textContent?.trim(),
    })),
    stages: Array.from(root.querySelectorAll<HTMLElement>("[data-stage]")).map(
      (stage) => ({
        key: stage.dataset.stage,
        text: stage.textContent?.trim(),
      }),
    ),
    targets: Array.from(
      root.querySelectorAll<HTMLElement>("[data-target-index]"),
    ).map((row) => ({
      key: row.dataset.targetIndex,
      text: row.textContent?.trim(),
    })),
  }));
}

async function rememberAuthoredNodes(diagram: Locator, slot: string) {
  return diagram.evaluate((root, storageKey) => {
    const authored = [
      root,
      ...Array.from(root.querySelectorAll<HTMLElement>("*")),
    ].filter(
      (element) => !element.closest("[data-diagram-full-view-controls]"),
    );
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
      ...Array.from(root.querySelectorAll<HTMLElement>("*")),
    ].filter(
      (element) => !element.closest("[data-diagram-full-view-controls]"),
    );
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
      ":scope > [data-diagram-full-view-controls]",
    );
    const evidence = figure.querySelector<HTMLElement>(".provenance-panel");
    if (!action || !evidence)
      throw new Error("Missing Chapter 7 scroll-overlap evidence");
    const previous = figure.scrollTop;
    evidence.scrollIntoView({ block: "start", inline: "nearest" });
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

function expectReadableFullView(
  inline: Awaited<ReturnType<typeof readReadableFlow>>,
  full: Awaited<ReturnType<typeof readReadableFlow>>,
) {
  expect(full.columns).toBe(1);
  expect(full.calculationColumns).toBe(1);
  expect(full.frozenColumns).toBe(1);
  expect(full.provenanceColumns).toBe(1);
  expect(full.boundaryColumns).toBe(1);
  expect(full.actionPosition).toBe("static");
  for (const flow of [
    full.rootFlow,
    full.calculationFlow,
    full.frozenFlow,
    full.provenanceFlow,
    full.boundaryFlow,
  ]) {
    for (const region of flow) {
      expect(region.width).toBeGreaterThan(0);
      expect(region.height).toBeGreaterThan(0);
    }
    for (let index = 1; index < flow.length; index += 1) {
      expect(flow[index]!.top).toBeGreaterThanOrEqual(
        flow[index - 1]!.bottom - 2,
      );
    }
  }
  expect(full.widthSamples.map(({ key }) => key)).toEqual(
    inline.widthSamples.map(({ key }) => key),
  );
  const inlineWidths = new Map(
    inline.widthSamples.map(({ key, ...sample }) => [key, sample]),
  );
  for (const sample of full.widthSamples) {
    const before = inlineWidths.get(sample.key);
    expect(before, `${sample.key} inline witness`).toBeDefined();
    expect(sample.kind, `${sample.key} measurement kind`).toBe(before?.kind);
    expect(sample.height, `${sample.key} full-view height`).toBeGreaterThan(0);
    expect(
      sample.width + 2,
      `${sample.key} width (${sample.width} full versus ${before?.width} inline)`,
    ).toBeGreaterThanOrEqual(before?.width ?? Number.POSITIVE_INFINITY);
    if (sample.kind === "paint") {
      expect(
        sample.fragments,
        `${sample.key} paint fragments`,
      ).toBeLessThanOrEqual(before?.fragments ?? 0);
    }
  }
  for (const key of ["calculation", "provenance", "boundaries"] as const) {
    expect(
      full.occupiedPeers[key],
      `${key} fullscreen same-band peers`,
    ).toBeLessThanOrEqual(inline.occupiedPeers[key]);
  }
  for (const span of full.regionSpans) {
    expect(
      Math.abs(span.left - full.rootSpan.left),
      `${span.key} logical start`,
    ).toBeLessThanOrEqual(2);
    expect(
      Math.abs(span.right - full.rootSpan.right),
      `${span.key} logical end`,
    ).toBeLessThanOrEqual(2);
  }
  for (const span of full.chainStageSpans) {
    expect(
      Math.abs(span.left - full.chainSpan.left),
      `chain item ${span.key} start`,
    ).toBeLessThanOrEqual(2);
    expect(
      Math.abs(span.right - full.chainSpan.right),
      `chain item ${span.key} end`,
    ).toBeLessThanOrEqual(2);
  }
  for (const span of full.frozenRecordSpans) {
    expect(
      Math.abs(span.left - full.frozenSpan.left),
      `frozen item ${span.key} start`,
    ).toBeLessThanOrEqual(2);
    expect(
      Math.abs(span.right - full.frozenSpan.right),
      `frozen item ${span.key} end`,
    ).toBeLessThanOrEqual(2);
  }
  for (const span of full.provenanceFactSpans) {
    expect(
      Math.abs(span.left - full.provenanceSpan.left),
      `provenance fact ${span.key} start`,
    ).toBeLessThanOrEqual(2);
    expect(
      Math.abs(span.right - full.provenanceSpan.right),
      `provenance fact ${span.key} end`,
    ).toBeLessThanOrEqual(2);
  }
  expect(full.scrollers.map(({ key }) => key)).toEqual(
    inline.scrollers.map(({ key }) => key),
  );
  for (let index = 0; index < full.scrollers.length; index += 1) {
    const before = inline.scrollers[index]!;
    const after = full.scrollers[index]!;
    expect(
      Math.abs(after.left - after.ownerLeft),
      `${after.key} start edge`,
    ).toBeLessThanOrEqual(2);
    expect(
      Math.abs(after.right - after.ownerRight),
      `${after.key} end edge`,
    ).toBeLessThanOrEqual(2);
    expect(
      after.client + 2,
      `${after.key} client width`,
    ).toBeGreaterThanOrEqual(before.client);
    expect(after.debt, `${after.key} travel versus inline`).toBeLessThanOrEqual(
      before.debt + 2,
    );
    if (after.key.startsWith("chain:")) {
      expect(
        after.debt,
        `${after.key} avoidable local travel`,
      ).toBeLessThanOrEqual(2);
    } else {
      expect(
        after.debt,
        `${after.key} substantial intrinsic travel`,
      ).toBeLessThan(after.client);
    }
    expect(
      after.blockDebt,
      `${after.key} local block debt`,
    ).toBeLessThanOrEqual(2);
  }
  if (full.rootBlockDebt > 2) {
    expect(full.rootOverflowY).toMatch(/^(?:auto|scroll)$/);
  }
}

function expectRootOwnsVerticalContinuation(
  geometry: Awaited<ReturnType<typeof readMetricsGeometry>>,
) {
  expect(geometry.fullscreen).toBe(true);
  if (geometry.blockDebt > 2) {
    expect(geometry.rootOverflowY).toMatch(/^(?:auto|scroll)$/);
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
    order: 7,
    revision: contentRevision,
    revisionLabel: localized.revisionLabel,
    title: localized.chapterTitle,
  });

  for (const heading of localized.headings) {
    await expect(
      page.getByRole("heading", { level: 2, name: heading }),
    ).toBeVisible();
  }
  const lessonText = (await page.locator(".lesson-body").innerText()).replace(
    /\s+/g,
    " ",
  );
  for (const claim of localized.holdoutHandoff) {
    expect(lessonText).toContain(claim);
  }
  expect(lessonText).not.toMatch(
    locale === "en"
      ? /Chapter 34 (?:owns|performs) the first|Chapter 34 first scores|course(?:'s)? first and only|evaluate it once on the previously unscored/i
      : /В главе 34 мы впервые вычислим|глава 34 впервые оцени|первая и единственная итоговая оценка|ранее не оценивавш/i,
  );

  const displayedFormulae = page.locator(".katex-display");
  await expect(displayedFormulae).toHaveCount(5);
  await expect(displayedFormulae.first()).toHaveCSS("direction", "ltr");
  const formulaAnnotation = page
    .locator('annotation[encoding="application/x-tex"]')
    .filter({ hasText: formulaLatex });
  await expect(formulaAnnotation).toHaveCount(1);
  await expect(formulaAnnotation).toHaveText(formulaLatex);

  const rustSources = page.locator("figure.rust-source");
  await expect(rustSources).toHaveCount(5);
  const highlightedRust = rustSources.locator(
    'pre.rust-source-code.astro-code.github-dark-high-contrast[data-language="rust"]',
  );
  await expect(highlightedRust).toHaveCount(5);
  expect(
    await highlightedRust
      .locator("code")
      .evaluateAll((blocks) => blocks.map((block) => block.textContent)),
  ).toEqual(expectedRustSources);
  await expect(rustSources.locator("figcaption span")).toHaveText([
    ...localized.rustCaptions,
  ]);
  expect(
    await rustSources.evaluateAll((sources) =>
      sources.map((source) => source.getAttribute("data-source-region")),
    ),
  ).toEqual([
    "assigned-probability-metrics",
    "train-validation-scoring",
    "frozen-metric-fixture",
    "learner-output",
    "language-model-metrics-trace",
  ]);
  expect(
    await highlightedRust
      .locator("code")
      .evaluateAll((blocks) =>
        blocks.map(
          (block) => block.querySelectorAll(":scope > span.line").length,
        ),
      ),
  ).toEqual([56, 46, 24, 42, 18]);
  const highlightingEvidence = await highlightedRust.evaluateAll((blocks) =>
    blocks.map((block) => ({
      colors: new Set(
        Array.from(
          block.querySelectorAll<HTMLElement>('code span[style*="color"]'),
        )
          .map((token) => token.style.color)
          .filter(Boolean),
      ).size,
      tabIndex: block.getAttribute("tabindex"),
      label: block.getAttribute("aria-label"),
      direction: block.getAttribute("dir"),
    })),
  );
  for (const evidence of highlightingEvidence) {
    expect(evidence.colors).toBeGreaterThan(1);
    expect(evidence.tabIndex).toBe("0");
    expect(evidence.label).toBeTruthy();
    expect(evidence.direction).toBe("ltr");
  }
  expect(
    await highlightedRust.evaluateAll((blocks) =>
      blocks.map((block) => block.getAttribute("aria-label")),
    ),
  ).toEqual([...localized.rustLabels]);

  await expectVisualizationDecision(page, {
    decision: "useful",
    id: "language-model-metrics",
  });
  const diagram = page.locator(
    'figure[data-visualization-id="language-model-metrics"]',
  );
  await expect(diagram).toHaveAccessibleName(localized.accessibleName);
  await expect(diagram).toHaveAccessibleDescription(
    localized.accessibleDescription,
  );
  await expect(
    diagram.locator("figcaption > p:not(.visually-hidden)"),
  ).toHaveText(localized.diagramCaption);
  await expect(
    diagram.getByRole("heading", { level: 3, name: localized.diagramTitle }),
  ).toBeVisible();
  for (const sectionTitle of localized.diagramSections) {
    await expect(
      diagram.getByRole("heading", { name: sectionTitle }),
    ).toBeVisible();
  }
  await expect(diagram.locator(".stage-number")).toHaveText([
    "1",
    "2",
    "3",
    "4",
    "5",
  ]);
  await expect(
    diagram.locator(
      '[data-stage="probability-surprise"] caption > span:not(.stage-number):not(.inline-arrow)',
    ),
  ).toHaveText(localized.stageLabels.slice(0, 2));
  await expect(
    diagram.locator('[data-stage="aggregate"] h5'),
  ).toHaveAccessibleName(localized.stageLabels[2]);
  await expect(
    diagram.locator('[data-stage="mean-nll"] h5'),
  ).toHaveAccessibleName(localized.stageLabels[3]);
  await expect(
    diagram.locator('[data-stage="perplexity"] h5'),
  ).toHaveAccessibleName(localized.stageLabels[4]);
  await expect(
    diagram.locator('[data-stage="probability-surprise"] th[scope="col"]'),
  ).toHaveText([...localized.targetHeaders]);

  expect(
    await diagram.locator("[data-target-index]").evaluateAll((rows) =>
      rows.map((row) => ({
        index: row.getAttribute("data-target-index"),
        probability: row
          .querySelector('[data-evidence="probability"]')
          ?.textContent?.trim(),
        surprise: row
          .querySelector('[data-evidence="surprise"]')
          ?.textContent?.trim(),
      })),
    ),
  ).toEqual([
    { index: "0", probability: "0.500000000000", surprise: "0.693147180560" },
    { index: "1", probability: "0.250000000000", surprise: "1.386294361120" },
  ]);
  await expect(diagram.locator('[data-stage="aggregate"] dt')).toHaveText([
    ...localized.aggregateLabels,
  ]);
  await expect(diagram.locator('[data-stage="aggregate"] dd')).toHaveText([
    "2.079441541680",
    "2",
  ]);
  await expect(diagram.locator('[data-stage="mean-nll"] strong')).toHaveText(
    "1.039720770840",
  );
  await expect(diagram.locator('[data-stage="perplexity"] strong')).toHaveText(
    "2.828427124746",
  );

  await expect(diagram.locator(".provenance-facts dt")).toHaveText([
    ...localized.provenanceLabels,
  ]);
  await expect(diagram.locator(".provenance-facts dd")).toHaveText([
    "fnv1a64:723b071980ae8a22",
    "fixed-paired-document-holdout-v1",
    "1",
    "8",
    "8",
    "266",
    "1.000000000000",
    "train",
    "8",
    "1844",
  ]);

  const scoreTable = diagram.locator(".score-table-scroll table");
  await expect(scoreTable.getByRole("columnheader")).toHaveText([
    ...localized.scoreHeaders,
  ]);
  await expect(
    scoreTable.locator("tbody .score-row-heading > span"),
  ).toHaveText([...localized.partitionLabels]);
  expect(
    await scoreTable.locator("tbody tr").evaluateAll((rows) =>
      rows.map((row) => ({
        partition: row.getAttribute("data-scored-partition"),
        cells: Array.from(row.querySelectorAll("td")).map((cell) =>
          cell.textContent?.trim(),
        ),
      })),
    ),
  ).toEqual([
    {
      partition: "train",
      cells: [
        "8",
        "1844",
        "7067.943541648752",
        "3.832941183107",
        "46.198216022322",
      ],
    },
    {
      partition: "validation",
      cells: [
        "2",
        "469",
        "1867.529710185699",
        "3.981939680567",
        "53.620940919077",
      ],
    },
  ]);

  await expect(diagram.locator(".boundary-panel li > span")).toHaveText([
    ...localized.boundaries,
  ]);
  await expect(diagram.locator(".boundary-panel li > code")).toHaveText([
    "bos_target=no",
    "eos_target=yes",
    "cross_document=no",
    "test_selectable=no",
  ]);
  expect(
    await diagram
      .locator("code, bdi")
      .evaluateAll((nodes) =>
        nodes.every(
          (node) => window.getComputedStyle(node).direction === "ltr",
        ),
      ),
  ).toBe(true);

  await diagram.focus();
  await expect(diagram).toBeFocused();
  const chainScroll = diagram.locator(".chain-scroll");
  const scoreScroll = diagram.locator(".score-table-scroll");
  await expect(chainScroll).toHaveAccessibleName(localized.diagramSections[0]);
  await expect(chainScroll).toHaveAccessibleDescription(
    localized.scrollInstruction,
  );
  await expect(scoreScroll).toHaveAccessibleName(localized.diagramSections[1]);
  await expect(scoreScroll).toHaveAccessibleDescription(
    localized.frozenModelNote,
  );
  await chainScroll.focus();
  await expect(chainScroll).toBeFocused();
  await scoreScroll.focus();
  await expect(scoreScroll).toBeFocused();
  if (narrow) {
    for (const region of [chainScroll, scoreScroll]) {
      const widths = await region.evaluate((node) => ({
        client: node.clientWidth,
        scroll: node.scrollWidth,
      }));
      expect(widths.scroll).toBeGreaterThan(widths.client);
    }
  }

  await page.waitForFunction(
    () => document.documentElement.dataset.diagramFullViewReady === "true",
  );
  const fullViewToggle = diagram.locator("[data-diagram-full-view-toggle]");
  if (narrow) {
    await expect(fullViewToggle).toHaveCount(0);
  } else {
    await expect(fullViewToggle).toHaveCount(1);
    await expect(fullViewToggle).toBeVisible();
  }
  await settle(page);
  expectCompleteMetricsGeometry(await readMetricsGeometry(diagram));

  const exerciseDetails = page.locator(".lesson-body details");
  await expect(exerciseDetails).toHaveCount(1);
  await expect(exerciseDetails.locator("summary")).toHaveText(
    localized.exerciseSummary,
  );
  await exerciseDetails.locator("summary").click();
  await expect(exerciseDetails).toHaveAttribute("open", "");
  await expect(exerciseDetails).toContainText(localized.answerEvidence);

  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe(
  "chapter 7 localized vertical slice",
  { tag: chapterTag(chapterId) },
  () => {
    test.describe.configure({ mode: "serial" });

    test.beforeEach(({ browserName }) => {
      if (browserName !== "firefox") {
        throw new Error(
          `Chapter 7 browser validation requires Firefox; received ${browserName}.`,
        );
      }
    });

    test("chapter 7 is seventh on every course index and preserves locale switching", async ({
      page,
    }) => {
      for (const locale of chapterLocales) {
        const localized = copy[locale];
        const localeDefinition = chapterLocaleDefinitions.find(
          ({ code }) => code === locale,
        );
        expect(localeDefinition).toBeDefined();
        const chapters = await readOrderedCourseChapters(page, locale);
        expect(chapters.length).toBeGreaterThanOrEqual(7);
        expect(chapters[6]).toEqual(
          expect.objectContaining({
            chapterId,
            order: 7,
            title: localized.chapterTitle,
          }),
        );
        await expect(page.locator("html")).toHaveAttribute(
          "lang",
          localeDefinition?.languageTag ?? "",
        );
        await expect(
          page.getByRole("heading", { level: 1, name: localized.indexTitle }),
        ).toBeVisible();
        await page.getByRole("link", { name: localized.chapterTitle }).click();
        await expectLocalizedChapterRoute(page, {
          chapterId,
          locale,
          order: 7,
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
          await page
            .locator(`.locale-switch a[data-locale="${target.code}"]`)
            .click();
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
              name: copy[target.code].chapterTitle,
            }),
          ).toBeVisible();
        }
      }
    });

    for (const locale of chapterLocales) {
      test(`chapter 7 ${locale} renders every learning element at desktop and narrow widths`, async ({
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

    test("both locales reuse one semantic tree in a readable native-table full view", async ({
      page,
    }) => {
      await page.setViewportSize(standardFullView);

      for (const locale of chapterLocales) {
        await page.goto(chapterPath(locale, chapterId));
        await page.waitForFunction(
          () =>
            document.documentElement.dataset.diagramFullViewReady === "true",
        );
        await settle(page);

        const diagram = page.locator(diagramSelector);
        const toggle = diagram.locator("[data-diagram-full-view-toggle]");
        await expect(toggle).toHaveCount(1);
        await expect(toggle).toBeVisible();
        const beforeMarkup = await staticDiagramMarkup(diagram);
        const inlineGeometry = await readMetricsGeometry(diagram);
        expectCompleteMetricsGeometry(inlineGeometry);
        const inlineFlow = await readReadableFlow(diagram);
        const inlineEvidence = await readMetricsEvidence(diagram);
        const authoredNodeCount = await rememberAuthoredNodes(
          diagram,
          "__chapter07AuthoredNodes",
        );
        expect(authoredNodeCount).toBeGreaterThan(0);
        await diagram.evaluate((root) => {
          (
            window as typeof window & { __chapterSevenMetricsFigure?: Element }
          ).__chapterSevenMetricsFigure = root;
        });

        await toggle.click();
        await page.waitForFunction(
          () =>
            document.fullscreenElement?.getAttribute(
              "data-visualization-id",
            ) === "language-model-metrics",
        );
        await settle(page);
        expect(
          await diagram.evaluate(
            (root) =>
              root ===
                (
                  window as typeof window & {
                    __chapterSevenMetricsFigure?: Element;
                  }
                ).__chapterSevenMetricsFigure &&
              document.fullscreenElement === root,
          ),
        ).toBe(true);
        expect(await staticDiagramMarkup(diagram)).toBe(beforeMarkup);
        expect(
          await authoredNodesAreUnchanged(diagram, "__chapter07AuthoredNodes"),
        ).toBe(true);
        expect(await readMetricsEvidence(diagram)).toEqual(inlineEvidence);
        expectReadableFullView(inlineFlow, await readReadableFlow(diagram));
        expect(await readScrolledChromeRelation(diagram)).toEqual(
          expect.objectContaining({
            actionPosition: "static",
            evidenceAtScrollport: true,
            overlaps: false,
          }),
        );

        const fullGeometry = await readMetricsGeometry(diagram);
        expectCompleteMetricsGeometry(fullGeometry);
        expectRootOwnsVerticalContinuation(fullGeometry);
        expectFontsNotShrunk(inlineGeometry, fullGeometry);

        await page.keyboard.press("Escape");
        await page.waitForFunction(() => document.fullscreenElement === null);
        await expect(toggle).toBeFocused();
        await expect(toggle).toHaveAttribute("aria-expanded", "false");
        expect(
          await authoredNodesAreUnchanged(diagram, "__chapter07AuthoredNodes"),
        ).toBe(true);
        expect(await readMetricsEvidence(diagram)).toEqual(inlineEvidence);
        await expectNoOverflowOrClientScripts(page);
      }
    });

    test("the minimum eligible surface keeps full-width evidence without shrinking", async ({
      browser,
    }, testInfo) => {
      const baseURL = testInfo.project.use.baseURL;
      if (typeof baseURL !== "string")
        throw new Error("Playwright baseURL is required");
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
            () =>
              document.documentElement.dataset.diagramFullViewReady === "true",
          );
          await settle(page);
          const diagram = page.locator(diagramSelector);
          const toggle = diagram.locator("[data-diagram-full-view-toggle]");
          await expect(toggle).toHaveCount(1);
          await expect(toggle).toBeVisible();
          const beforeMarkup = await staticDiagramMarkup(diagram);
          const inlineGeometry = await readMetricsGeometry(diagram);
          expectCompleteMetricsGeometry(inlineGeometry);
          const inlineFlow = await readReadableFlow(diagram);
          const inlineEvidence = await readMetricsEvidence(diagram);
          const authoredNodeCount = await rememberAuthoredNodes(
            diagram,
            "__chapter07MinimumAuthoredNodes",
          );
          expect(authoredNodeCount).toBeGreaterThan(0);

          await toggle.click();
          await page.waitForFunction(
            () =>
              document.fullscreenElement?.getAttribute(
                "data-visualization-id",
              ) === "language-model-metrics",
          );
          await settle(page);
          expect(await staticDiagramMarkup(diagram)).toBe(beforeMarkup);
          expect(
            await authoredNodesAreUnchanged(
              diagram,
              "__chapter07MinimumAuthoredNodes",
            ),
          ).toBe(true);
          expect(await readMetricsEvidence(diagram)).toEqual(inlineEvidence);
          expectReadableFullView(inlineFlow, await readReadableFlow(diagram));
          expect(await readScrolledChromeRelation(diagram)).toEqual(
            expect.objectContaining({
              actionPosition: "static",
              evidenceAtScrollport: true,
              overlaps: false,
            }),
          );
          const fullGeometry = await readMetricsGeometry(diagram);
          expectCompleteMetricsGeometry(fullGeometry);
          expectRootOwnsVerticalContinuation(fullGeometry);
          expectFontsNotShrunk(inlineGeometry, fullGeometry);

          const surface = await page.evaluate(() => ({
            innerHeight,
            innerWidth,
            screenHeight: screen.height,
            screenWidth: screen.width,
          }));
          expect(surface.screenWidth).toBe(1024);
          expect(surface.screenHeight).toBe(576);
          expect(surface.innerWidth).toBeGreaterThanOrEqual(1280);
          expect(surface.innerHeight).toBeGreaterThanOrEqual(768);

          await page.keyboard.press("Escape");
          await page.waitForFunction(() => document.fullscreenElement === null);
          await expect(toggle).toBeFocused();
          await expect(toggle).toHaveAttribute("aria-expanded", "false");
          expect(
            await authoredNodesAreUnchanged(
              diagram,
              "__chapter07MinimumAuthoredNodes",
            ),
          ).toBe(true);
          expect(await readMetricsEvidence(diagram)).toEqual(inlineEvidence);
        }
      } finally {
        await context.close();
      }
    });

    test("localized causal connector words stay intact at desktop and narrow widths", async ({
      page,
    }) => {
      for (const locale of chapterLocales) {
        for (const viewport of [
          { width: 1440, height: 1000 },
          { width: 390, height: 844 },
        ]) {
          await page.setViewportSize(viewport);
          await page.goto(chapterPath(locale, chapterId));
          const labels = page.locator(
            'figure[data-visualization-id="language-model-metrics"] .stage-connector > span:last-child',
          );
          await expect(labels).toHaveCount(3);
          const evidence = await labels.evaluateAll((nodes) =>
            nodes.map((node) => {
              const range = document.createRange();
              range.selectNodeContents(node);
              return {
                lineCount: range.getClientRects().length,
                whiteSpace: window.getComputedStyle(node).whiteSpace,
              };
            }),
          );
          expect(evidence).toEqual(
            Array(3).fill({
              lineCount: 1,
              whiteSpace: "nowrap",
            }),
          );
        }
      }
    });

    test("Russian keeps redundant cues and technical direction in forced colors and RTL", async ({
      page,
    }) => {
      await page.emulateMedia({ forcedColors: "active" });
      await page.setViewportSize(standardFullView);
      await page.goto(chapterPath("ru", chapterId));
      await page.waitForFunction(
        () => document.documentElement.dataset.diagramFullViewReady === "true",
      );
      expect(
        await page.evaluate(
          () => matchMedia("(forced-colors: active)").matches,
        ),
      ).toBe(true);
      const diagram = page.locator(diagramSelector);
      await diagram.evaluate((node) => node.setAttribute("dir", "rtl"));
      await settle(page);

      const readDirectionAndCues = () =>
        diagram.evaluate((root) => {
          const style = (selector: string) =>
            getComputedStyle(root.querySelector<HTMLElement>(selector)!);
          return {
            aggregateBorder: style('[data-stage="aggregate"]').borderTopStyle,
            boundaryBorder: style(".boundary-panel").borderTopStyle,
            forcedColors: matchMedia("(forced-colors: active)").matches,
            frozenBorder: style(".frozen-model-panel").borderTopStyle,
            inlineArrowTransform: getComputedStyle(
              root.querySelector<HTMLElement>(".inline-arrow.causal-arrow")!,
            ).transform,
            meanBorder: style('[data-stage="mean-nll"]').borderTopStyle,
            stageConnectorTransforms: Array.from(
              root.querySelectorAll<HTMLElement>(
                ".stage-connector .causal-arrow",
              ),
            ).map((arrow) => getComputedStyle(arrow).transform),
            proseDirections: Array.from(
              root.querySelectorAll<HTMLElement>("h3, h4, h5, p, th, dt"),
            ).map((element) => getComputedStyle(element).direction),
            technicalDirections: Array.from(
              root.querySelectorAll<HTMLElement>("code, bdi"),
            ).map((element) => getComputedStyle(element).direction),
            validationCue: style(
              'tr[data-scored-partition="validation"] th[scope="row"]',
            ).borderInlineStartStyle,
          };
        });

      const readInlineCausalOrder = () =>
        diagram.evaluate((root) => ({
          direction: getComputedStyle(root).direction,
          regions: Array.from(
            root.querySelectorAll<HTMLElement>(
              ".calculation-chain > :is(.stage, .stage-connector)",
            ),
          ).map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              bottom: rect.bottom,
              left: rect.left,
              right: rect.right,
              top: rect.top,
            };
          }),
        }));

      const inline = await readDirectionAndCues();
      expect(inline.forcedColors).toBe(true);
      expect(inline.aggregateBorder).toBe("double");
      expect(inline.frozenBorder).toBe("double");
      expect(inline.meanBorder).toBe("dashed");
      expect(inline.boundaryBorder).toBe("dashed");
      expect(inline.validationCue).toBe("double");
      expect(
        inline.proseDirections.every((direction) => direction === "rtl"),
      ).toBe(true);
      expect(
        inline.technicalDirections.every((direction) => direction === "ltr"),
      ).toBe(true);
      expect(inline.stageConnectorTransforms).toHaveLength(3);
      expect(
        inline.stageConnectorTransforms.every((transform) =>
          transform.startsWith("matrix(-1"),
        ),
      ).toBe(true);
      expect(inline.inlineArrowTransform.startsWith("matrix(-1")).toBe(true);
      const inlineCausalOrder = await readInlineCausalOrder();
      expect(inlineCausalOrder.direction).toBe("rtl");
      expect(inlineCausalOrder.regions).toHaveLength(7);
      for (
        let index = 1;
        index < inlineCausalOrder.regions.length;
        index += 1
      ) {
        const previous = inlineCausalOrder.regions[index - 1]!;
        const current = inlineCausalOrder.regions[index]!;
        expect(previous.left + 1).toBeGreaterThanOrEqual(current.right);
        expect(
          Math.min(previous.bottom, current.bottom) -
            Math.max(previous.top, current.top),
        ).toBeGreaterThan(0);
      }
      const inlineGeometry = await readMetricsGeometry(diagram);
      expectCompleteMetricsGeometry(inlineGeometry);
      const inlineFlow = await readReadableFlow(diagram);

      const toggle = diagram.locator("[data-diagram-full-view-toggle]");
      await toggle.click();
      await page.waitForFunction(
        () =>
          document.fullscreenElement?.getAttribute("data-visualization-id") ===
          "language-model-metrics",
      );
      await settle(page);
      expectReadableFullView(inlineFlow, await readReadableFlow(diagram));
      expect(await readScrolledChromeRelation(diagram)).toEqual(
        expect.objectContaining({
          actionPosition: "static",
          evidenceAtScrollport: true,
          overlaps: false,
        }),
      );
      const full = await readDirectionAndCues();
      expect(full.forcedColors).toBe(true);
      expect(full.aggregateBorder).toBe("double");
      expect(full.frozenBorder).toBe("double");
      expect(full.meanBorder).toBe("dashed");
      expect(full.boundaryBorder).toBe("dashed");
      expect(full.validationCue).toBe("double");
      expect(
        full.proseDirections.every((direction) => direction === "rtl"),
      ).toBe(true);
      expect(
        full.technicalDirections.every((direction) => direction === "ltr"),
      ).toBe(true);
      expect(full.inlineArrowTransform.startsWith("matrix(-1")).toBe(true);
      expect(full.stageConnectorTransforms).toHaveLength(3);
      for (const transform of full.stageConnectorTransforms) {
        expect(transform).toMatch(/^matrix\(0, 1, -1, 0,/);
      }
      const fullGeometry = await readMetricsGeometry(diagram);
      expectCompleteMetricsGeometry(fullGeometry);
      expectRootOwnsVerticalContinuation(fullGeometry);
      expectFontsNotShrunk(inlineGeometry, fullGeometry);

      await page.keyboard.press("Escape");
      await page.waitForFunction(() => document.fullscreenElement === null);
      await expect(toggle).toBeFocused();
      await expectNoOverflowOrClientScripts(page);
    });

    test("an unavailable Fullscreen API exposes no nonfunctional control", async ({
      browser,
    }, testInfo) => {
      const baseURL = testInfo.project.use.baseURL;
      if (typeof baseURL !== "string") {
        throw new Error("Playwright baseURL is required");
      }
      const context = await browser.newContext({
        baseURL,
        viewport: desktop,
      });
      await context.addInitScript(() => {
        Object.defineProperty(document, "fullscreenEnabled", {
          configurable: true,
          value: false,
        });
      });
      const page = await context.newPage();
      try {
        await page.goto(chapterPath("en", chapterId));
        await page.waitForFunction(
          () =>
            document.documentElement.dataset.diagramFullViewReady === "true",
        );
        const diagram = page.locator(diagramSelector);
        await expect(diagram).toBeVisible();
        await expect(
          diagram.locator("[data-diagram-full-view-controls]"),
        ).toHaveCount(0);
        await expect(
          diagram.locator("[data-diagram-full-view-toggle]"),
        ).toHaveCount(0);
        await expect(diagram.locator("[data-stage]")).toHaveCount(4);
        await expect(diagram.locator("[data-scored-partition]")).toHaveCount(2);
        expectCompleteMetricsGeometry(await readMetricsGeometry(diagram));
        await expectNoOverflowOrClientScripts(page);
      } finally {
        await context.close();
      }
    });

  },
);
