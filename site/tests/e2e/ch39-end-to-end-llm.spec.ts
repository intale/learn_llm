import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  chapterPath,
  chapterTag,
  expectLocalizedChapterRoute,
  expectNoOverflowOrClientScripts,
  expectOrderedChapterNavigation,
  expectSeoDescription,
  expectVisualizationDecision,
  readOrderedCourseChapters,
  type CourseChapterLink,
} from "./chapter-helpers";

const chapterId = "39-end-to-end-llm";
type ChapterLocale = "en" | "ru";
const locales = ["en", "ru"] as const satisfies readonly ChapterLocale[];
const copy = {
  en: {
    revisionLabel: "Content revision",
    title: "Run the whole tiny LLM",
    description:
      "Trace a tiny decoder-only language model in Rust through validation-selected training, locally isolated fixed-fixture evaluation, exact checkpoint reload, and KV-cached generation while keeping regression evidence distinct from generalization.",
    diagramTitle: "Keep execution one-way and label fixture evidence",
    diagramDescription:
      "Follow frozen Rust evidence through training-only BPE, selection, a locally isolated evaluation of a fixed regression fixture, exact reload, and cached generation.",
    headings: [
      "Predict the boundary before predicting the output",
      "One product connects every next-token decision",
      "Keep sequence position separate from pipeline stage",
      "From short count contexts to autoregressive Transformer LLMs",
      "Assemble APIs instead of copying algorithms",
      "Follow the one-way pipeline",
      "Predict before checking the final trace",
      "Take ownership of the complete decoder",
    ],
    historyLimitation:
      "A count-based bigram estimates the next token from one preceding token",
    scaleBoundary:
      "none of its scale or capability results transfers to this tiny teaching run",
    qualityBoundary:
      "does not establish a universal architecture ranking or useful generation quality",
    detailsFragment: "The literal generated IDs are [260,34,34]",
    selectedCue: "validation-selected state",
    testCue: "|| one local access in this execution",
    checkpointCue:
      "= bytes, model, optimizer, and tokenizer round-trip exactly; probe logits match",
    generationCue: "= cached and complete-prefix decisions match",
    decodedTextLabel: "Cyrillic т followed by two generated spaces",
    spaceMarker: "Each ␠ marks one generated space.",
    ownershipFragments: [
      "SelectedDecoder borrows both",
      "records two facts",
      "moves the epoch into FinalEvaluator",
      "it verifies that the decoder’s configuration, ordered names and shapes, and every parameter bit still match the retained state",
      "The report derives the displayed count",
      "primary.selected_state().scalar_count()",
      "Checkpoint::from_snapshot deliberately copies the selected graph-free state and optimizer persistence state",
      "It then calls loaded.into_model(), which moves the owned model buffers into a decoder",
      "Both generation paths temporarily read that vector through immutable references",
      "GenerationEvidence takes ownership of the same vector",
    ],
    evidenceBoundaryFragments: [
      "That ordering is retained across later executions, so it is useful regression evidence. It is not an untouched independent estimate of generalization or evidence of architecture-wide decoder superiority.",
      "The permanently checked gap is fixed-fixture regression evidence, not causal attribution to context or attention and not an independent generalization estimate.",
      "this general warning does not establish any fact about the capstone fixture, its score, or its local access count",
      "decoder_lower_on_fixture:true",
      "scope:fixed-fixture-regression",
      "within_run_selection_isolated:true",
      "independent_generalization_estimate:false",
      "architecture_superiority_evidence:false",
      "evidence=scope:fixed-fixture-regression within_run_selection_isolated:true independent_generalization_estimate:false architecture_superiority_evidence:false",
    ],
    fullViewOpenLabel: "View diagram full screen",
    fullViewCloseLabel: "Exit full screen",
  },
  ru: {
    revisionLabel: "Версия материала",
    title: "Запустите небольшую LLM целиком",
    description:
      "Проследите полный цикл небольшой декодерной языковой модели на Rust: обучение с выбором состояния по валидации, локально изолированную оценку фиксированного примера, точное восстановление из контрольной точки и генерацию с KV-кэшем; при этом не смешивайте регрессионную проверку с независимой оценкой способности модели обобщать.",
    diagramTitle:
      "Сохраните односторонний порядок запуска и обозначьте статус результата",
    diagramDescription:
      "Проследите зафиксированные результаты программы на Rust: обучение BPE только по обучающим данным, выбор состояния, локально изолированная оценка фиксированного примера для регрессионной проверки, точное восстановление и генерация с кэшем.",
    headings: [
      "Сначала предскажите границы доступа, затем результат",
      "Одно произведение связывает все решения о следующем токене",
      "Не смешивайте позицию в последовательности с этапом процесса",
      "От короткого частотного контекста к авторегрессионным LLM на основе Transformer",
      "Соедините уже реализованные API, не дублируя алгоритмы",
      "Проследите процесс: поздние результаты не влияют на ранние этапы",
      "Сначала предскажите, затем проверьте итоговую трассировку",
      "Теперь весь декодер в ваших руках",
    ],
    historyLimitation:
      "Частотная биграммная модель оценивает следующий токен только по одному предыдущему токену",
    scaleBoundary:
      "Результаты по масштабу и возможностям этой модели нельзя переносить на небольшой учебный запуск",
    qualityBoundary: "не подтверждает полезное качество генерации",
    detailsFragment: "Точные сгенерированные ID: [260,34,34]",
    selectedCue: "состояние выбрано по валидации",
    testCue: "|| один локальный доступ в этом запуске",
    checkpointCue:
      "= байты и состояния модели, оптимизатора и токенизатора совпадают; логиты пробы — тоже",
    generationCue: "= решения с KV-кэшем и полным префиксом совпадают",
    decodedTextLabel: "кириллическая т и два сгенерированных пробела",
    spaceMarker: "␠ — сгенерированный пробел.",
    ownershipFragments: [
      "SelectedDecoder получает неизменяемые ссылки на оба объекта",
      "отдельно сохраняет два нужных для отчёта числа",
      "передаёт владение всем набором объекту FinalEvaluator",
      "При последующей сборке отчёта используются только заранее сохранённые два числа, поэтому копия всего набора тестовых мини-пакетов не нужна",
      "primary.selected_state().scalar_count()",
      "Метод не читает заранее сохранённый счётчик и не создаёт ещё один декодер только ради подсчёта",
      "Checkpoint::from_snapshot намеренно копирует выбранное состояние без графа вычислений и состояние оптимизатора",
      "loaded.into_model() передаёт методу владение контрольной точкой",
      "Генерация с KV-кэшем и эталонный расчёт по полному префиксу временно читают один и тот же вектор по неизменяемым ссылкам",
      "GenerationEvidence получает его во владение",
      "Перемещение Vec передаёт уже существующий буфер вместо создания копии ID токенов промпта для отчёта",
    ],
    evidenceBoundaryFragments: [
      "Этот порядок сохраняется в последующих запусках, поэтому результат полезен для регрессионной проверки. Он не является независимой оценкой способности модели обобщать на ранее не использованных данных и не доказывает общего превосходства архитектуры декодера.",
      "Постоянно проверяемая разница служит результатом фиксированного примера для регрессионной проверки, а не доказательством причинного влияния контекста или внимания и не независимой оценкой способности модели обобщать.",
      "этот общий вывод не устанавливает фактов об учебном примере, его результате или локальном счётчике доступа",
      "decoder_lower_on_fixture:true",
      "scope:fixed-fixture-regression",
      "within_run_selection_isolated:true",
      "independent_generalization_estimate:false",
      "architecture_superiority_evidence:false",
      "evidence=scope:fixed-fixture-regression within_run_selection_isolated:true independent_generalization_estimate:false architecture_superiority_evidence:false",
      "Прежнее имя decoder_wins не является актуальным свидетельством",
    ],
    fullViewOpenLabel: "Развернуть схему на весь экран",
    fullViewCloseLabel: "Выйти из полноэкранного режима",
  },
} as const;
const evidenceCopy = {
  en: [
    {
      id: "encoded-token-counts",
      label: "Encoded token counts — train / validation / test",
      value: "[1852,471,444]",
    },
    {
      id: "window-counts",
      label: "Causal-window counts — train / validation / test",
      value: "[1820,463,436]",
    },
    {
      id: "evaluation-batch-counts",
      label: "Evaluation mini-batch counts — train / validation / test",
      value: "[15,4,4]",
    },
    { id: "reload-probe-text", label: "Reload probe text", value: "At" },
    {
      id: "reload-probe-token-ids",
      label: "Token IDs encoding the reload probe At",
      value: "[67,118]",
    },
    {
      id: "retained-prefix-lengths",
      label:
        "Retained prefix lengths in tokens before successive token choices",
      value: "[1,2,3]",
    },
    {
      id: "cache-prefill-prompt-tokens",
      label: "Prompt tokens processed during cache prefill",
      value: "1",
    },
    {
      id: "one-token-decode-input-tokens",
      label:
        "Earlier generated tokens processed one at a time by decode calls to obtain later logits",
      value: "2",
    },
    {
      id: "cached-attention-score-cells",
      label: "Cached attention-score cells",
      value: "1+2+3=6",
      formula: true,
    },
    {
      id: "complete-prefix-attention-score-cells",
      label: "Calculated complete-prefix attention-score cells",
      value: "1^2+2^2+3^2=14",
      formula: true,
    },
  ],
  ru: [
    {
      id: "encoded-token-counts",
      label: "Число токенов после кодирования — обучение / валидация / тест",
      value: "[1852,471,444]",
    },
    {
      id: "window-counts",
      label: "Число каузальных окон — обучение / валидация / тест",
      value: "[1820,463,436]",
    },
    {
      id: "evaluation-batch-counts",
      label: "Число мини-пакетов оценки — обучение / валидация / тест",
      value: "[15,4,4]",
    },
    {
      id: "reload-probe-text",
      label: "Текст пробы для проверки логитов после восстановления",
      value: "At",
    },
    {
      id: "reload-probe-token-ids",
      label: "ID токенов, которыми закодирована проба At",
      value: "[67,118]",
    },
    {
      id: "retained-prefix-lengths",
      label:
        "Длины сохранённых префиксов перед каждым выбором токена (в токенах)",
      value: "[1,2,3]",
    },
    {
      id: "cache-prefill-prompt-tokens",
      label: "Число токенов промпта, обработанных при заполнении KV-кэша",
      value: "1",
    },
    {
      id: "one-token-decode-input-tokens",
      label:
        "Число ранее сгенерированных токенов, которые по одному подаются декодеру для вычисления следующих логитов",
      value: "2",
    },
    {
      id: "cached-attention-score-cells",
      label: "Число элементов матриц оценок внимания при работе с KV-кэшем",
      value: "1+2+3=6",
      formula: true,
    },
    {
      id: "complete-prefix-attention-score-cells",
      label:
        "Число элементов матриц оценок внимания при эталонном расчёте по полному префиксу",
      value: "1^2+2^2+3^2=14",
      formula: true,
    },
  ],
} as const;
const stageOrder = [
  "data",
  "tokenizer",
  "batches",
  "model",
  "selection",
  "test",
  "checkpoint",
  "generation",
] as const;

const normalizeMath = (value: string) => value.replace(/\s+/g, "");

async function expectExplicitEvidence(diagram: Locator, locale: ChapterLocale) {
  await expect(diagram.locator("[data-evidence]")).toHaveCount(10);
  for (const expected of evidenceCopy[locale]) {
    const row = diagram.locator(`[data-evidence="${expected.id}"]`);
    await expect(row).toHaveCount(1);
    await expect(row.locator("dt")).toHaveText(expected.label);
    if ("formula" in expected) {
      await expect(
        row.locator('annotation[encoding="application/x-tex"]'),
      ).toHaveText(expected.value);
    } else {
      await expect(row.locator("dd")).toHaveText(expected.value);
    }
  }
}

async function expectFormulaMarkup(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  const formulas = page.locator(
    ".lesson-body .katex-display, .lesson-body [data-inline-math] > .katex",
  );
  await expect(formulas).not.toHaveCount(0);
  const problems = await formulas.evaluateAll((nodes) => {
    const arity: Record<string, number> = {
      mfrac: 2,
      mover: 2,
      mroot: 2,
      msub: 2,
      msubsup: 3,
      msup: 2,
      munder: 2,
      munderover: 3,
    };
    const issues: string[] = [];
    for (const [index, node] of nodes.entries()) {
      const formula = node as HTMLElement;
      const rect = formula.getBoundingClientRect();
      const source =
        formula.querySelector('annotation[encoding="application/x-tex"]')
          ?.textContent ?? `formula ${index}`;
      let ancestor: HTMLElement | null = formula.parentElement;
      let localScroller = false;
      while (ancestor && ancestor !== document.body) {
        const style = getComputedStyle(ancestor);
        if (
          ["auto", "scroll"].includes(style.overflowX) &&
          ancestor.scrollWidth > ancestor.clientWidth + 1
        ) {
          localScroller = true;
          break;
        }
        ancestor = ancestor.parentElement;
      }
      if (
        (rect.left < -1 ||
          rect.right > document.documentElement.clientWidth + 1) &&
        !localScroller
      ) {
        issues.push(`${source} escapes the viewport`);
      }
      if (rect.width <= 0 || rect.height <= 0) {
        issues.push(`${source} has no visible box`);
      }
      if (getComputedStyle(formula).direction !== "ltr") {
        issues.push(`${source} is not left-to-right`);
      }
      const mathml = formula.querySelector<HTMLElement>(".katex-mathml");
      if (!mathml) {
        issues.push(`${source} lacks accessible MathML`);
      } else {
        if (
          mathml.querySelector(
            '[mathvariant]:not([mathvariant="normal"]), mo[mathvariant]',
          )
        ) {
          issues.push(`${source} contains deprecated MathML mathvariant`);
        }
        for (const element of mathml.querySelectorAll<MathMLElement>(
          Object.keys(arity).join(","),
        )) {
          const expected = arity[element.localName];
          if (element.children.length !== expected) {
            issues.push(
              `${source} has ${element.localName} arity ${element.children.length}, expected ${expected}`,
            );
          }
        }
      }
      if (
        ["auto", "clip", "hidden", "scroll"].includes(
          getComputedStyle(formula).overflowY,
        ) &&
        formula.scrollHeight > formula.clientHeight + 2
      ) {
        issues.push(`${source} clips vertically`);
      }
      if (formula.classList.contains("katex-display")) {
        const owner = formula.parentElement;
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
    }
    return issues;
  });
  expect(problems).toEqual([]);
}

async function expectDiagramContainment(page: Page) {
  const diagram = page.locator(
    'figure[data-visualization-id="end-to-end-llm"]',
  );
  const result = await diagram.evaluate((node) => {
    const root = node as HTMLElement;
    const rootRect = root.getBoundingClientRect();
    const problems: string[] = [];
    const boxes = Array.from(
      root.querySelectorAll<HTMLElement>("[data-diagram-box]"),
    );
    const innerRect = (box: HTMLElement) => {
      const rect = box.getBoundingClientRect();
      const style = getComputedStyle(box);
      return {
        bottom: rect.bottom - Number.parseFloat(style.borderBottomWidth),
        left: rect.left + Number.parseFloat(style.borderLeftWidth),
        right: rect.right - Number.parseFloat(style.borderRightWidth),
        top: rect.top + Number.parseFloat(style.borderTopWidth),
      };
    };
    const contains = (outer: ReturnType<typeof innerRect>, inner: DOMRect) =>
      inner.left >= outer.left - 2 &&
      inner.right <= outer.right + 2 &&
      inner.top >= outer.top - 2 &&
      inner.bottom <= outer.bottom + 2;

    for (const [index, box] of boxes.entries()) {
      const style = getComputedStyle(box);
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
      if (
        widths.some((width) => !(width > 0)) ||
        styles.some((value) => ["none", "hidden"].includes(value))
      ) {
        problems.push(`box ${index} lacks a four-sided border`);
      }
      if (
        box.scrollWidth > box.clientWidth + 2 ||
        box.scrollHeight > box.clientHeight + 2
      ) {
        problems.push(`box ${index} does not contain its content`);
      }
      if (
        [style.overflowX, style.overflowY].some((value) =>
          ["hidden", "clip"].includes(value),
        )
      ) {
        problems.push(`box ${index} hides overflow`);
      }
      if (style.contain.split(/\s+/).includes("paint")) {
        problems.push(`box ${index} uses paint containment`);
      }

      const edges = innerRect(box);
      const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
      let textNode = walker.nextNode();
      let textIndex = 0;
      while (textNode) {
        const text = textNode.textContent?.trim() ?? "";
        const parent = textNode.parentElement;
        if (text && parent && parent.closest("[data-diagram-box]") === box) {
          const range = document.createRange();
          range.selectNodeContents(textNode);
          for (const rect of Array.from(range.getClientRects())) {
            if (rect.width > 0 && !contains(edges, rect)) {
              problems.push(
                `box ${index} text ${textIndex} crosses its inner border`,
              );
            }
          }
          textIndex += 1;
        }
        textNode = walker.nextNode();
      }
      const formulas = Array.from(
        box.querySelectorAll<HTMLElement>(".katex"),
      ).filter(
        (formula) =>
          !formula.parentElement?.closest(".katex") &&
          formula.closest("[data-diagram-box]") === box,
      );
      for (const [formulaIndex, formula] of formulas.entries()) {
        if (!contains(edges, formula.getBoundingClientRect())) {
          problems.push(
            `box ${index} formula ${formulaIndex} crosses its inner border`,
          );
        }
      }
    }

    const scrollers = root.querySelectorAll("[data-diagram-scroll]");
    if (scrollers.length !== 0) {
      problems.push(
        "the reflowing pipeline must not create a private scroller",
      );
    }
    if (
      rootRect.left < -2 ||
      rootRect.right > document.documentElement.clientWidth + 2 ||
      root.scrollWidth > root.clientWidth + 2
    ) {
      problems.push("figure escapes its inline or fullscreen boundary");
    }
    return { boxCount: boxes.length, problems, scrollers: scrollers.length };
  });
  expect(result.problems).toEqual([]);
  expect(result.boxCount).toBe(8);
  expect(result.scrollers).toBe(0);
}

async function readStagePresentation(diagram: Locator) {
  return diagram.evaluate((node) => {
    const root = node as HTMLElement;
    const readableElements = (owner: HTMLElement) =>
      [owner, ...Array.from(owner.querySelectorAll<HTMLElement>("*"))].filter(
        (element) => {
          const rect = element.getBoundingClientRect();
          const hasDirectText = Array.from(element.childNodes).some(
            (child) =>
              child.nodeType === Node.TEXT_NODE &&
              Boolean(child.textContent?.trim()),
          );
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            (hasDirectText || element.matches(".katex, .katex-html")) &&
            !element.closest(".katex-mathml") &&
            !element.closest("[data-diagram-full-view-controls]")
          );
        },
      );
    const minFontSize = (owner: HTMLElement) =>
      Math.min(
        ...readableElements(owner).map((element) =>
          Number.parseFloat(getComputedStyle(element).fontSize),
        ),
      );
    const textSamples: Array<{
      fontSize: number;
      lineHeight: number;
      paint: number;
      text: string;
    }> = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const textNode = walker.currentNode as Text;
      const parent = textNode.parentElement;
      const text = textNode.data
        .replace(/[\s\u200b-\u200d\ufeff]+/g, " ")
        .trim();
      if (
        !text ||
        !parent ||
        parent.closest(".katex-mathml, [data-diagram-full-view-controls]")
      ) {
        continue;
      }
      const range = document.createRange();
      range.selectNodeContents(textNode);
      const style = getComputedStyle(parent);
      const lineHeight = Number.parseFloat(style.lineHeight);
      textSamples.push({
        fontSize: Number.parseFloat(style.fontSize),
        lineHeight: Number.isFinite(lineHeight) ? lineHeight : 0,
        paint: Array.from(range.getClientRects()).filter(
          ({ width, height }) => width > 0 && height > 0,
        ).length,
        text,
      });
    }
    const stages = Array.from(
      root.querySelectorAll<HTMLElement>("[data-stage]"),
    ).map((stage) => {
      const rect = stage.getBoundingClientRect();
      const allocations = Array.from(
        new Set([
          ...stage.querySelectorAll<HTMLElement>(
            ":scope > .stage-facts > div, :scope > dl > div, :scope .generation-facts > [data-evidence]",
          ),
        ]),
      );
      return {
        id: stage.dataset.stage ?? "",
        width: rect.width,
        minFontSize: minFontSize(stage),
        allocations: allocations.map((allocation, index) => ({
          key: `${stage.dataset.stage ?? ""}:${index}:${allocation.dataset.evidence ?? ""}`,
          width: allocation.getBoundingClientRect().width,
          minFontSize: minFontSize(allocation),
        })),
      };
    });
    return { stages, textSamples };
  });
}

const identityProperty = "__ch39AuthoredNodeIdentity__";

async function markAuthoredNodeIdentity(diagram: Locator, token: string) {
  return diagram.evaluate(
    (root, { property, value }) => {
      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      );
      const nodes: Node[] = [root];
      while (walker.nextNode()) {
        const candidate = walker.currentNode;
        const element =
          candidate.nodeType === Node.ELEMENT_NODE
            ? (candidate as Element)
            : candidate.parentElement;
        if (!element?.closest("[data-diagram-full-view-controls]")) {
          nodes.push(candidate);
        }
      }
      for (const [index, candidate] of nodes.entries()) {
        Object.defineProperty(candidate, property, {
          configurable: true,
          value: `${value}:${index}`,
        });
      }
      return nodes.length;
    },
    { property: identityProperty, value: token },
  );
}

async function expectAuthoredNodeIdentity(
  diagram: Locator,
  token: string,
  expectedCount: number,
) {
  const result = await diagram.evaluate(
    (root, { property, value }) => {
      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      );
      const nodes: Node[] = [root];
      while (walker.nextNode()) {
        const candidate = walker.currentNode;
        const element =
          candidate.nodeType === Node.ELEMENT_NODE
            ? (candidate as Element)
            : candidate.parentElement;
        if (!element?.closest("[data-diagram-full-view-controls]")) {
          nodes.push(candidate);
        }
      }
      return {
        count: nodes.length,
        stable: nodes.every(
          (candidate, index) =>
            (candidate as unknown as Record<string, unknown>)[property] ===
            `${value}:${index}`,
        ),
      };
    },
    { property: identityProperty, value: token },
  );
  expect(result).toEqual({ count: expectedCount, stable: true });
}

async function clearAuthoredNodeIdentity(diagram: Locator) {
  await diagram.evaluate((root, property) => {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    );
    delete (root as unknown as Record<string, unknown>)[property];
    while (walker.nextNode()) {
      delete (walker.currentNode as unknown as Record<string, unknown>)[
        property
      ];
    }
  }, identityProperty);
}

async function readFullViewPresentation(diagram: Locator) {
  return diagram.evaluate((node) => {
    const root = node as HTMLElement;
    const tolerance = 2;
    const problems: string[] = [];
    const rootRect = root.getBoundingClientRect();
    const rootStyle = getComputedStyle(root);
    const stages = Array.from(
      root.querySelectorAll<HTMLElement>("[data-stage]"),
    );
    const describe = (element: HTMLElement) =>
      element.dataset.stage ??
      element.className?.toString().split(/\s+/).filter(Boolean).join(".") ??
      element.tagName.toLowerCase();
    const transparent = (color: string) => {
      if (color === "transparent") return true;
      const alpha = color.match(/rgba?\([^)]*[,/]\s*(0(?:\.0+)?%?)\s*\)$/);
      return alpha
        ? Number.parseFloat(alpha[1]) === 0
        : /#[0-9a-f]{6}00$/i.test(color);
    };
    const concealed = (style: CSSStyleDeclaration) =>
      style.display === "none" ||
      style.visibility !== "visible" ||
      Number.parseFloat(style.opacity) < 0.99 ||
      style.filter !== "none" ||
      style.clipPath !== "none" ||
      Boolean(style.maskImage && style.maskImage !== "none") ||
      Boolean(
        style.getPropertyValue("-webkit-mask-image") &&
        style.getPropertyValue("-webkit-mask-image") !== "none",
      ) ||
      [style.overflowX, style.overflowY].some((value) =>
        ["hidden", "clip"].includes(value),
      ) ||
      style.textOverflow === "ellipsis" ||
      Boolean(
        style.getPropertyValue("line-clamp") &&
        style.getPropertyValue("line-clamp") !== "none",
      ) ||
      Boolean(
        style.getPropertyValue("-webkit-line-clamp") &&
        style.getPropertyValue("-webkit-line-clamp") !== "none",
      ) ||
      style.contentVisibility === "hidden" ||
      /(?:^|\s)(?:paint|strict|content)(?:\s|$)/.test(style.contain);

    const authoredElements = [
      root,
      ...Array.from(root.querySelectorAll<HTMLElement>("*")),
    ].filter(
      (element) =>
        !element.closest(".katex-mathml, [data-diagram-full-view-controls]"),
    );
    const scaledElements = authoredElements.flatMap((element, index) => {
      const style = getComputedStyle(element);
      const scale = style.getPropertyValue("scale");
      const zoom = style.getPropertyValue("zoom");
      return style.transform !== "none" ||
        Boolean(scale && scale !== "none") ||
        Boolean(zoom && zoom !== "normal" && Number.parseFloat(zoom) !== 1)
        ? [{ index, scale, transform: style.transform, zoom }]
        : [];
    });
    const concealedElements = authoredElements.flatMap((element, index) => {
      const style = getComputedStyle(element);
      const emptyKatexLayoutStrut =
        element.matches("span.pstrut") &&
        element.closest(".katex") !== null &&
        (element.textContent ?? "").trim() === "";
      return concealed(style) && !emptyKatexLayoutStrut
        ? [{ index, owner: describe(element) }]
        : [];
    });
    if (scaledElements.length > 0) {
      problems.push(
        `authored descendants scale or transform content: ${JSON.stringify(scaledElements)}`,
      );
    }
    if (concealedElements.length > 0) {
      problems.push(
        `authored descendants conceal content: ${JSON.stringify(concealedElements)}`,
      );
    }

    const structural = [
      root,
      ...Array.from(
        root.querySelectorAll<HTMLElement>(
          ":scope > figcaption, :scope > section, .course-diagram__card-stack, .pipeline, [data-diagram-box], .stage-facts, .selection-card > dl, .generation-facts",
        ),
      ),
    ].filter(
      (element) => !element.closest("[data-diagram-full-view-controls]"),
    );
    for (const element of structural) {
      const style = getComputedStyle(element);
      if (concealed(style)) {
        problems.push(`${describe(element)} conceals its content`);
      }
      if (
        element !== root &&
        [style.overflowX, style.overflowY].some((value) =>
          ["hidden", "clip"].includes(value),
        )
      ) {
        problems.push(`${describe(element)} hides overflow`);
      }
    }

    const descendantBlockOwners = Array.from(
      root.querySelectorAll<HTMLElement>("*"),
    )
      .filter((element) => {
        const overflow = getComputedStyle(element).overflowY;
        const debt = element.scrollHeight - element.clientHeight;
        return (
          !element.closest("[data-diagram-full-view-controls]") &&
          !element.closest(".katex-mathml") &&
          (overflow === "scroll" || (overflow === "auto" && debt > tolerance))
        );
      })
      .map(describe);
    if (descendantBlockOwners.length > 0) {
      problems.push(
        `descendants own vertical travel: ${descendantBlockOwners.join(", ")}`,
      );
    }
    const descendantInlineOwners = Array.from(
      root.querySelectorAll<HTMLElement>("*"),
    )
      .filter((element) => {
        const overflow = getComputedStyle(element).overflowX;
        const debt = element.scrollWidth - element.clientWidth;
        return (
          !element.closest("[data-diagram-full-view-controls]") &&
          !element.closest(".katex-mathml") &&
          (overflow === "scroll" || (overflow === "auto" && debt > tolerance))
        );
      })
      .map(describe);
    if (descendantInlineOwners.length > 0) {
      problems.push(
        `descendants own horizontal travel: ${descendantInlineOwners.join(", ")}`,
      );
    }
    const namedScrollerCount = root.querySelectorAll(
      "[data-diagram-scroll]",
    ).length;
    if (namedScrollerCount !== 0) {
      problems.push(`full view has ${namedScrollerCount} named scrollers`);
    }

    for (let leftIndex = 0; leftIndex < stages.length; leftIndex += 1) {
      const left = stages[leftIndex].getBoundingClientRect();
      for (
        let rightIndex = leftIndex + 1;
        rightIndex < stages.length;
        rightIndex += 1
      ) {
        const right = stages[rightIndex].getBoundingClientRect();
        const inlineOverlap =
          Math.min(left.right, right.right) - Math.max(left.left, right.left);
        const blockOverlap =
          Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top);
        if (inlineOverlap > tolerance && blockOverlap > tolerance) {
          problems.push(
            `${stages[leftIndex].dataset.stage} overlaps ${stages[rightIndex].dataset.stage}`,
          );
        }
      }
    }

    const direction = rootStyle.direction;
    for (let index = 1; index < stages.length; index += 1) {
      const previous = stages[index - 1].getBoundingClientRect();
      const current = stages[index].getBoundingClientRect();
      if (current.top < previous.top - tolerance) {
        problems.push("visual stage order reverses vertically");
      } else if (Math.abs(current.top - previous.top) <= tolerance) {
        const reversesInline =
          direction === "rtl"
            ? current.right > previous.right + tolerance
            : current.left < previous.left - tolerance;
        if (reversesInline) problems.push("visual stage order reverses inline");
      }
    }

    const textSamples: Array<{
      fontSize: number;
      lineHeight: number;
      paint: number;
      text: string;
    }> = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const text = walker.currentNode as Text;
      const parent = text.parentElement;
      if (
        !parent ||
        !text.data.trim() ||
        parent.closest(".katex-mathml") ||
        parent.closest("[data-diagram-full-view-controls]")
      )
        continue;
      let ancestor: HTMLElement | null = parent;
      let hidden = false;
      while (ancestor) {
        if (concealed(getComputedStyle(ancestor))) hidden = true;
        if (ancestor === root) break;
        ancestor = ancestor.parentElement;
      }
      const style = getComputedStyle(parent);
      const range = document.createRange();
      range.selectNodeContents(text);
      const paint = Array.from(range.getClientRects()).filter(
        ({ width, height }) => width > 0 && height > 0,
      );
      if (hidden || transparent(style.color) || paint.length === 0) {
        problems.push(`text is concealed: ${text.data.trim().slice(0, 40)}`);
      }
      if (
        paint.some(
          (rect) =>
            rect.left < rootRect.left - tolerance ||
            rect.right > rootRect.right + tolerance,
        )
      ) {
        problems.push(
          `text escapes the fullscreen root: ${text.data.trim().slice(0, 40)}`,
        );
      }
      const lineHeight = Number.parseFloat(style.lineHeight);
      textSamples.push({
        fontSize: Number.parseFloat(style.fontSize),
        lineHeight: Number.isFinite(lineHeight) ? lineHeight : 0,
        paint: paint.length,
        text: text.data.replace(/[\s\u200b-\u200d\ufeff]+/g, " ").trim(),
      });
    }

    const rootInlineDebt = Math.max(0, root.scrollWidth - root.clientWidth);
    const rootBlockDebt = Math.max(0, root.scrollHeight - root.clientHeight);
    let rootEndReachable = true;
    if (rootBlockDebt > tolerance) {
      if (!["auto", "scroll"].includes(rootStyle.overflowY)) {
        problems.push("the fullscreen root does not own its vertical travel");
      }
      const originalTop = root.scrollTop;
      root.scrollTop = rootBlockDebt;
      const lastStage = stages.at(-1)?.getBoundingClientRect();
      rootEndReachable = Boolean(
        lastStage &&
        lastStage.bottom <= root.getBoundingClientRect().bottom + tolerance &&
        lastStage.bottom >= root.getBoundingClientRect().top - tolerance,
      );
      root.scrollTop = originalTop;
      if (!rootEndReachable) {
        problems.push("the final stage is not reachable at root scroll end");
      }
    } else if (rootStyle.overflowY === "scroll") {
      problems.push("the debt-free fullscreen root forces vertical scrolling");
    }
    if (rootInlineDebt > tolerance) {
      problems.push("the fullscreen root travels horizontally");
    }

    const readableElements = (owner: HTMLElement) =>
      [owner, ...Array.from(owner.querySelectorAll<HTMLElement>("*"))].filter(
        (element) => {
          const hasDirectText = Array.from(element.childNodes).some(
            (child) =>
              child.nodeType === Node.TEXT_NODE &&
              Boolean(child.textContent?.trim()),
          );
          const rect = element.getBoundingClientRect();
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            (hasDirectText || element.matches(".katex, .katex-html")) &&
            !element.closest(".katex-mathml") &&
            !element.closest("[data-diagram-full-view-controls]")
          );
        },
      );
    const minFontSize = (owner: HTMLElement) =>
      Math.min(
        ...readableElements(owner).map((element) =>
          Number.parseFloat(getComputedStyle(element).fontSize),
        ),
      );
    const stagePresentation = stages.map((stage) => {
      const allocations = Array.from(
        new Set([
          ...stage.querySelectorAll<HTMLElement>(
            ":scope > .stage-facts > div, :scope > dl > div, :scope .generation-facts > [data-evidence]",
          ),
        ]),
      );
      return {
        id: stage.dataset.stage ?? "",
        width: stage.getBoundingClientRect().width,
        minFontSize: minFontSize(stage),
        allocations: allocations.map((allocation, index) => ({
          key: `${stage.dataset.stage ?? ""}:${index}:${allocation.dataset.evidence ?? ""}`,
          width: allocation.getBoundingClientRect().width,
          minFontSize: minFontSize(allocation),
        })),
      };
    });

    const rootRem = Number.parseFloat(
      getComputedStyle(document.documentElement).fontSize,
    );
    const rootContentWidth =
      root.clientWidth -
      Number.parseFloat(rootStyle.paddingLeft) -
      Number.parseFloat(rootStyle.paddingRight);

    return {
      descendantBlockOwners,
      descendantInlineOwners,
      concealedElements,
      namedScrollerCount,
      problems,
      rootBlockDebt,
      rootContentWidth,
      rootEndReachable,
      rootInlineDebt,
      rootRem,
      scaledElements,
      stagePresentation,
      stageOrder: stages.map((stage) => stage.dataset.stage ?? ""),
      textSamples,
      viewport: {
        height: window.innerHeight,
        width: window.innerWidth,
      },
    };
  });
}

async function expectChapterContent(
  page: Page,
  chapters: readonly CourseChapterLink[],
  locale: ChapterLocale,
) {
  const localized = copy[locale];
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale,
    order: 39,
    revision: 8,
    revisionLabel: localized.revisionLabel,
    title: localized.title,
    equivalentLocales: ["en", "ru"],
    fallbackRouteSuffix: "/course/",
  });
  await expect(page.locator(".lesson-description")).toHaveText(
    localized.description,
  );
  await expectSeoDescription(page, localized.description);
  await expect(page.locator(".lesson-body h2")).toHaveText(localized.headings);

  const annotations = await page
    .locator('.lesson-body annotation[encoding="application/x-tex"]')
    .allTextContents();
  for (const expected of [
    "P_\\theta(z_{1:T})=\\prod_{t=1}^{T}P_\\theta(z_t\\mid z_{<t})",
    "C=4",
    "N_{\\mathrm{test}}=W_{\\mathrm{test}}C=436\\cdot4=1744",
    "\\tau=0.8",
    "k=4",
    "3.981342714-3.866087547=0.115255167",
    "3.866087547<3.981342714",
    "1+2+3=6",
    "1^2+2^2+3^2=14",
  ]) {
    expect(
      annotations
        .map(normalizeMath)
        .some((formula) => formula.includes(normalizeMath(expected))),
      `expected rendered formula containing ${expected}`,
    ).toBe(true);
  }
  expect(annotations.some((formula) => formula.includes("\\*"))).toBe(false);
  await expect(page.locator(".lesson-body .katex-error")).toHaveCount(0);
  await expectFormulaMarkup(page);

  const lessonText = (await page.locator(".lesson-body").innerText()).replace(
    /\s+/g,
    " ",
  );
  expect(lessonText).toContain(localized.historyLimitation);
  expect(lessonText).toContain(localized.scaleBoundary);
  expect(lessonText).toContain(localized.qualityBoundary);
  for (const fragment of localized.ownershipFragments) {
    expect(lessonText).toContain(fragment);
  }
  for (const fragment of localized.evidenceBoundaryFragments) {
    expect(lessonText).toContain(fragment);
  }
  expect(lessonText).not.toMatch(
    locale === "en"
      ? /course(?:'s)? first and only final test|previously unscored test|proves? (?:independent )?generalization|shows? (?:that )?decoder architectures? (?:always|universally) (?:beat|outperform)/i
      : /первая и единственная итоговая оценка|ранее не оценивавш|доказывает независимую оценку обобщающей способности|подтверждает универсальное превосходство архитектуры/i,
  );
  expect(lessonText).not.toMatch(/\bdecoder_beats_bigram\b/);
  if (locale === "en") {
    expect(lessonText).not.toMatch(/\bdecoder_wins\b/);
  } else {
    expect(lessonText.match(/\bdecoder_wins\b/g)).toHaveLength(1);
    expect(lessonText).not.toMatch(/фикстур/i);
  }
  for (const href of [
    "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
    "https://arxiv.org/abs/1506.02629",
    "https://arxiv.org/pdf/1706.03762",
    "https://arxiv.org/pdf/2005.14165",
  ]) {
    await expect(page.locator(`.lesson-body a[href="${href}"]`)).toHaveCount(1);
  }
  await expect(page.locator("figure.rust-source")).toHaveCount(4);
  await expectVisualizationDecision(page, {
    decision: "useful",
    id: "end-to-end-llm",
  });

  const diagram = page.locator(
    'figure[data-visualization-id="end-to-end-llm"]',
  );
  await expect(diagram).toHaveAccessibleName(localized.diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(
    localized.diagramDescription,
  );
  await expect(diagram).toHaveAttribute("data-diagram-style", "course-v1");
  await expect(diagram.locator("[data-diagram-card]")).toHaveCount(8);
  await expect(diagram.locator("[data-diagram-box]")).toHaveCount(8);
  await expect(diagram.locator("[data-diagram-scroll]")).toHaveCount(0);
  await expectExplicitEvidence(diagram, locale);
  expect(
    await diagram
      .locator("[data-stage]")
      .evaluateAll((cards) =>
        cards.map((card) => card.getAttribute("data-stage")),
      ),
  ).toEqual(stageOrder);
  expect(
    await diagram
      .locator("[data-stage-index]")
      .evaluateAll((cards) =>
        cards.map((card) => card.getAttribute("data-stage-index")),
      ),
  ).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
  await expect(diagram.locator('[data-state="trusted"]')).toHaveCount(5);
  await expect(diagram.locator('[data-stage="data"]')).toContainText("8/2/2");
  await expect(diagram.locator('[data-stage="data"]')).toContainText(
    "fnv1a64:723b071980ae8a22",
  );
  await expect(diagram.locator('[data-stage="tokenizer"]')).toContainText(
    "266",
  );
  await expect(diagram.locator('[data-stage="batches"]')).toContainText(
    "16/128",
  );
  await expect(diagram.locator('[data-stage="model"]')).toContainText("1188");
  await expect(
    diagram
      .locator('[data-stage="model"] annotation[encoding="application/x-tex"]')
      .last(),
  ).toHaveText("L=1,\\ H=1,\\ D=4");
  await expect(
    diagram.locator(
      '[data-stage="selection"] annotation[encoding="application/x-tex"]',
    ),
  ).toHaveText([
    "s=0",
    "5.621745486",
    "5.628342353",
    "s=32",
    "3.855502695",
    "3.889531885",
  ]);
  await expect(diagram.locator(".selected-row dt")).toContainText(
    localized.selectedCue,
  );
  await expect(diagram.locator('[data-stage="selection"]')).toContainText(
    "3.889531885",
  );
  await expect(diagram.locator('[data-stage="test"]')).toContainText("1744");
  await expect(diagram.locator('[data-stage="test"]')).toContainText(
    "0.115255167",
  );
  await expect(diagram.locator('[data-stage="checkpoint"]')).toContainText(
    "30994",
  );
  await expect(diagram.locator('[data-stage="checkpoint"]')).toContainText(
    "34",
  );
  await expect(
    diagram.locator('[data-stage="generation"] code').first(),
  ).toHaveText("A [67]");
  await expect(
    diagram
      .locator(
        '[data-stage="generation"] annotation[encoding="application/x-tex"]',
      )
      .first(),
  ).toHaveText("\\tau=0.8,\\ k=4");
  await expect(diagram.locator('[data-stage="generation"]')).toContainText(
    "seed=38",
  );
  await expect(diagram.locator('[data-stage="generation"]')).toContainText(
    "[260,34,34]",
  );
  const decoded = diagram.locator('[data-stage="generation"] q');
  await expect(decoded).toHaveText("т␠␠");
  await expect(decoded).toHaveAccessibleName(localized.decodedTextLabel);
  await expect(diagram.locator('[data-stage="generation"] small')).toHaveText(
    localized.spaceMarker,
  );
  await expect(
    diagram.locator(
      '[data-stage="generation"] annotation[encoding="application/x-tex"]',
    ),
  ).toHaveText(["\\tau=0.8,\\ k=4", "1+2+3=6", "1^2+2^2+3^2=14"]);
  await expect(
    diagram
      .locator(
        '[data-stage="test"] .cue annotation[encoding="application/x-tex"]',
      )
      .first(),
  ).toHaveText("3.866087547<3.981342714");
  await expect(
    diagram.locator("svg, canvas, path, polyline, line"),
  ).toHaveCount(0);
  await expectDiagramContainment(page);

  const details = page.locator(".lesson-body details");
  await expect(details).toHaveCount(1);
  await details.locator("summary").click();
  await expect(details.locator("ol > li")).toHaveCount(10);
  await expect(details).toContainText(localized.detailsFragment);
  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expect(
    page.locator(
      'nav[data-chapter-navigation] a[data-chapter-direction="previous"]',
    ),
  ).toHaveAttribute("data-chapter-id", "38-cached-generation");
  await expect(
    page.locator(
      'nav[data-chapter-navigation] a[data-chapter-direction="next"]',
    ),
  ).toHaveCount(0);
  await expectNoOverflowOrClientScripts(page);
}

test.describe(
  "chapter 39 end-to-end LLM vertical slice",
  { tag: chapterTag(chapterId) },
  () => {
    test("English and Russian publish reciprocal Chapter 39 routes", async ({
      page,
    }) => {
      const english = await readOrderedCourseChapters(page, "en");
      expect(english).toHaveLength(39);
      const russian = await readOrderedCourseChapters(page, "ru");
      expect(russian).toHaveLength(39);

      for (const locale of locales) {
        const chapters = locale === "en" ? english : russian;
        expect(chapters[38]).toEqual(
          expect.objectContaining({
            chapterId,
            order: 39,
            title: copy[locale].title,
          }),
        );
        await page.goto(chapterPath(locale, chapterId));
        const other: ChapterLocale = locale === "en" ? "ru" : "en";
        await expect(
          page.locator(`.locale-switch a[data-locale="${other}"]`),
        ).toHaveAttribute("href", chapterPath(other, chapterId));
        await expect(
          page.locator(`link[rel="alternate"][hreflang="${other}"]`),
        ).toHaveAttribute(
          "href",
          new RegExp(`/${other}/course/${chapterId}/$`),
        );
      }
    });

    test("both complete capstone lessons render at desktop and narrow widths", async ({
      page,
    }) => {
      for (const locale of locales) {
        const chapters = await readOrderedCourseChapters(page, locale);
        await page.setViewportSize({ width: 1440, height: 1000 });
        await page.goto(chapterPath(locale, chapterId));
        await expectChapterContent(page, chapters, locale);
        await page.setViewportSize({ width: 390, height: 844 });
        await page.reload();
        await expectChapterContent(page, chapters, locale);
        await expect(
          page.locator(
            'figure[data-visualization-id="end-to-end-llm"] [data-diagram-full-view-toggle]',
          ),
        ).toHaveCount(0);
      }
    });

    test("full view reuses each localized complete pipeline", async ({
      page,
    }) => {
      test.setTimeout(120_000);
      const requestedViewports = [
        { width: 1280, height: 900 },
        { width: 1024, height: 576 },
      ] as const;
      const controlNames = new Map<ChapterLocale, string>();
      for (const requested of requestedViewports) {
        await page.setViewportSize(requested);
        for (const locale of locales) {
          await page.goto(chapterPath(locale, chapterId));
          const diagram = page.locator(
            'figure[data-visualization-id="end-to-end-llm"]',
          );
          await expect(diagram).toHaveCount(1);
          const toggle = diagram.locator("[data-diagram-full-view-toggle]");
          await expect(toggle).toHaveCount(1);
          await expect(toggle).toHaveAccessibleName(
            copy[locale].fullViewOpenLabel,
          );
          controlNames.set(
            locale,
            (await toggle.getAttribute("aria-label")) ?? "",
          );
          await page.evaluate(async () => {
            await document.fonts.ready;
            await new Promise<void>((resolveFrame) =>
              requestAnimationFrame(() =>
                requestAnimationFrame(() => resolveFrame()),
              ),
            );
          });
          const identityToken = `${locale}-${requested.width}x${requested.height}`;
          const authoredNodeCount = await markAuthoredNodeIdentity(
            diagram,
            identityToken,
          );
          expect(authoredNodeCount).toBeGreaterThan(0);
          const inlinePresentation = await readStagePresentation(diagram);
          await toggle.click();
          await page.waitForFunction(
            () =>
              document.fullscreenElement?.getAttribute(
                "data-visualization-id",
              ) === "end-to-end-llm",
          );
          await expect(toggle).toHaveAccessibleName(
            copy[locale].fullViewCloseLabel,
          );
          await expect(
            page.locator('figure[data-visualization-id="end-to-end-llm"]'),
          ).toHaveCount(1);
          await expectAuthoredNodeIdentity(
            diagram,
            identityToken,
            authoredNodeCount,
          );
          await expect(diagram.locator("[data-stage]")).toHaveCount(8);
          await expect(diagram.locator("[data-diagram-card]")).toHaveCount(8);
          await expect(diagram.locator("[data-diagram-box]")).toHaveCount(8);
          await expect(diagram.locator("[data-diagram-scroll]")).toHaveCount(0);
          await expectExplicitEvidence(diagram, locale);
          await expect(
            diagram.locator('[data-stage="generation"] code').first(),
          ).toHaveText("A [67]");
          await expect(
            diagram.locator('[data-stage="generation"] q'),
          ).toHaveText("т␠␠");
          await page.evaluate(async () => {
            await document.fonts.ready;
            await new Promise<void>((resolveFrame) =>
              requestAnimationFrame(() =>
                requestAnimationFrame(() => resolveFrame()),
              ),
            );
          });
          await expectDiagramContainment(page);
          const fullPresentation = await readFullViewPresentation(diagram);
          const diagnostic = `${locale} requested ${requested.width}x${requested.height}, actual ${fullPresentation.viewport.width}x${fullPresentation.viewport.height}`;
          expect(
            fullPresentation.problems,
            `${diagnostic}: ${JSON.stringify(fullPresentation)}`,
          ).toEqual([]);
          expect(fullPresentation.scaledElements, diagnostic).toEqual([]);
          expect(fullPresentation.concealedElements, diagnostic).toEqual([]);
          expect(fullPresentation.descendantBlockOwners, diagnostic).toEqual(
            [],
          );
          expect(fullPresentation.descendantInlineOwners, diagnostic).toEqual(
            [],
          );
          expect(fullPresentation.namedScrollerCount, diagnostic).toBe(0);
          expect(
            fullPresentation.rootInlineDebt,
            diagnostic,
          ).toBeLessThanOrEqual(2);
          expect(
            fullPresentation.rootBlockDebt,
            diagnostic,
          ).toBeGreaterThanOrEqual(0);
          expect(fullPresentation.rootEndReachable, diagnostic).toBe(true);
          expect(fullPresentation.stageOrder, diagnostic).toEqual(stageOrder);
          expect(
            fullPresentation.stagePresentation.map(({ id }) => id),
            diagnostic,
          ).toEqual(inlinePresentation.stages.map(({ id }) => id));
          expect(
            fullPresentation.textSamples.map(({ text }) => text),
            diagnostic,
          ).toEqual(inlinePresentation.textSamples.map(({ text }) => text));
          for (const [
            index,
            sample,
          ] of fullPresentation.textSamples.entries()) {
            const inlineSample = inlinePresentation.textSamples[index];
            expect(
              sample.fontSize + 0.01,
              `${diagnostic}: text ${index} (${sample.text}) font size must not shrink`,
            ).toBeGreaterThanOrEqual(inlineSample.fontSize);
            if (sample.lineHeight > 0 && inlineSample.lineHeight > 0) {
              expect(
                sample.lineHeight + 0.01,
                `${diagnostic}: text ${index} (${sample.text}) line height must not shrink`,
              ).toBeGreaterThanOrEqual(inlineSample.lineHeight);
            }
            expect(sample.paint, diagnostic).toBeGreaterThan(0);
          }
          for (const [
            index,
            fullStage,
          ] of fullPresentation.stagePresentation.entries()) {
            const inlineStage = inlinePresentation.stages[index];
            expect(
              fullStage.width,
              `${diagnostic}: ${fullStage.id} full-view width must not squeeze its inline entity`,
            ).toBeGreaterThanOrEqual(inlineStage.width - 2);
            if (
              fullPresentation.rootContentWidth >=
              32 * fullPresentation.rootRem
            ) {
              expect(
                fullStage.width,
                `${diagnostic}: ${fullStage.id} must retain the 32rem readable floor`,
              ).toBeGreaterThanOrEqual(32 * fullPresentation.rootRem - 2);
            }
            expect(
              fullStage.minFontSize,
              `${diagnostic}: ${fullStage.id} full-view text and math must not shrink`,
            ).toBeGreaterThanOrEqual(inlineStage.minFontSize - 0.01);
            expect(
              fullStage.allocations.map(({ key }) => key),
              diagnostic,
            ).toEqual(inlineStage.allocations.map(({ key }) => key));
            for (const [
              allocationIndex,
              fullAllocation,
            ] of fullStage.allocations.entries()) {
              const inlineAllocation = inlineStage.allocations[allocationIndex];
              expect(
                fullAllocation.width,
                `${diagnostic}: ${fullAllocation.key} inner allocation must not squeeze`,
              ).toBeGreaterThanOrEqual(inlineAllocation.width - 2);
              expect(
                fullAllocation.minFontSize,
                `${diagnostic}: ${fullAllocation.key} inner text and math must not shrink`,
              ).toBeGreaterThanOrEqual(inlineAllocation.minFontSize - 0.01);
            }
          }
          await expectAuthoredNodeIdentity(
            diagram,
            identityToken,
            authoredNodeCount,
          );
          await page.keyboard.press("Escape");
          await page.waitForFunction(() => document.fullscreenElement === null);
          await expectAuthoredNodeIdentity(
            diagram,
            identityToken,
            authoredNodeCount,
          );
          await clearAuthoredNodeIdentity(diagram);
          await expect(toggle).toBeFocused();
        }
      }
      expect(controlNames.size).toBe(locales.length);
      expect(new Set(controlNames.values()).size).toBe(locales.length);
    });

    test("localized text and redundant boundaries survive forced colors", async ({
      page,
    }) => {
      await page.emulateMedia({ forcedColors: "active" });
      for (const locale of locales) {
        await page.goto(chapterPath(locale, chapterId));
        const diagram = page.locator(
          'figure[data-visualization-id="end-to-end-llm"]',
        );
        await expect(diagram.locator('[data-stage="selection"]')).toHaveCSS(
          "border-top-style",
          "double",
        );
        await expect(diagram.locator('[data-stage="test"]')).toHaveCSS(
          "border-top-style",
          "double",
        );
        await expect(diagram.locator(".selected-row")).toHaveCSS(
          "border-left-style",
          "double",
        );
        await expect(diagram.locator(".selected-row dt")).toContainText(
          copy[locale].selectedCue,
        );
        await expect(
          diagram.locator('[data-stage="test"] .cue').first(),
        ).toHaveText(copy[locale].testCue);
        await expect(
          diagram.locator('[data-stage="checkpoint"] .cue'),
        ).toHaveText(copy[locale].checkpointCue);
        await expect(
          diagram.locator('[data-stage="generation"] .cue'),
        ).toHaveText(copy[locale].generationCue);
        await expectDiagramContainment(page);
        await expectNoOverflowOrClientScripts(page);
      }
    });

    test("RTL prose preserves localized stage order and left-to-right evidence", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      for (const locale of locales) {
        await page.goto(chapterPath(locale, chapterId));
        const diagram = page.locator(
          'figure[data-visualization-id="end-to-end-llm"]',
        );
        await diagram.evaluate((node) => node.setAttribute("dir", "rtl"));
        await expect(diagram.locator("h4").first()).toHaveCSS(
          "direction",
          "rtl",
        );
        expect(
          await diagram
            .locator("[data-stage]")
            .evaluateAll((cards) =>
              cards.map((card) => card.getAttribute("data-stage")),
            ),
        ).toEqual(stageOrder);
        expect(
          await diagram
            .locator("code, bdi, [data-inline-math]")
            .evaluateAll((nodes) =>
              nodes.every((node) => getComputedStyle(node).direction === "ltr"),
            ),
        ).toBe(true);
        const decoded = diagram.locator('[data-stage="generation"] q');
        await expect(decoded).toHaveText("т␠␠");
        await expect(decoded).toHaveAccessibleName(
          copy[locale].decodedTextLabel,
        );
        await expectDiagramContainment(page);
        await expectNoOverflowOrClientScripts(page);
      }
    });

    test("the complete pipeline remains available without JavaScript", async ({
      browser,
    }, testInfo) => {
      const context = await browser.newContext({
        javaScriptEnabled: false,
        baseURL: String(testInfo.project.use.baseURL),
      });
      const page = await context.newPage();
      for (const locale of locales) {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(chapterPath(locale, chapterId));
        await expect(
          page.getByRole("heading", { level: 1, name: copy[locale].title }),
        ).toBeVisible();
        await expect(page.locator("[data-stage]")).toHaveCount(8);
        await expect(page.locator("[data-diagram-card]")).toHaveCount(8);
        await expect(page.locator("[data-diagram-box]")).toHaveCount(8);
        await expect(page.locator("[data-diagram-scroll]")).toHaveCount(0);
        await expect(
          page.locator("[data-diagram-full-view-toggle]"),
        ).toHaveCount(0);
        await expectExplicitEvidence(
          page.locator('figure[data-visualization-id="end-to-end-llm"]'),
          locale,
        );
        await expect(page.locator('[data-stage="test"]')).toContainText("1744");
        await expect(page.locator('[data-stage="test"]')).toContainText(
          "0.115255167",
        );
        await expect(
          page.locator('[data-stage="generation"] code').first(),
        ).toHaveText("A [67]");
        await expect(page.locator('[data-stage="generation"]')).toContainText(
          "[260,34,34]",
        );
        const decoded = page.locator('[data-stage="generation"] q');
        await expect(decoded).toHaveText("т␠␠");
        await expect(decoded).toHaveAccessibleName(
          copy[locale].decodedTextLabel,
        );
        await expect(
          page.locator(
            '[data-stage="generation"] annotation[encoding="application/x-tex"]',
          ),
        ).toHaveText(["\\tau=0.8,\\ k=4", "1+2+3=6", "1^2+2^2+3^2=14"]);
        await expectDiagramContainment(page);
        await expectNoOverflowOrClientScripts(page);
      }
      await context.close();
    });
  },
);
