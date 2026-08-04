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
      "Trace a tiny decoder-only language model in Rust from frozen bilingual splits and training-only BPE through validation-selected training, selection-isolated final evaluation, exact checkpoint reload, and KV-cached generation.",
    diagramTitle: "Keep evidence one-way from text to generated text",
    diagramDescription:
      "Follow frozen Rust evidence through training-only BPE, selection, test, exact reload, and cached generation.",
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
      "It does not establish a universal architecture ranking or useful generation quality",
    detailsFragment: "The literal generated IDs are [260,34,34]",
    selectedCue: "validation-selected state",
    testCue: "|| local one-use test gate",
    checkpointCue:
      "= bytes, model, optimizer, and tokenizer round-trip exactly; probe logits match",
    generationCue: "= cached and complete-prefix decisions match",
    decodedTextLabel: "Cyrillic т followed by two generated spaces",
    spaceMarker: "Each ␠ marks one generated space.",
    fullViewOpenLabel: "View diagram full screen",
    fullViewCloseLabel: "Exit full screen",
  },
  ru: {
    revisionLabel: "Версия материала",
    title: "Запустите небольшую LLM целиком",
    description:
      "Проследите полный процесс работы небольшой декодерной языковой модели на Rust: от зафиксированного разбиения двуязычного корпуса и обучения BPE только по обучающей выборке до выбора состояния по валидации, последующей итоговой оценки выбранного состояния, точного восстановления из контрольной точки и генерации с KV-кэшем.",
    diagramTitle: "Поздние результаты не меняют ранние этапы",
    diagramDescription:
      "Проследите в программе на Rust обучение BPE только по обучающей выборке, выбор состояния, итоговую оценку, точное восстановление и генерацию с кэшем.",
    headings: [
      "Сначала предскажите границы доступа, затем результат",
      "Одно произведение связывает все решения о следующем токене",
      "Не смешивайте позицию в последовательности с этапом процесса",
      "От короткого частотного контекста к авторегрессионным LLM на основе Transformer",
      "Соберите готовые API, не копируя алгоритмы",
      "Проследите процесс: поздние результаты не влияют на ранние этапы",
      "Сначала предскажите, затем проверьте итоговую трассировку",
      "Теперь весь декодер в ваших руках",
    ],
    historyLimitation:
      "Биграммная модель на основе частот оценивает следующий токен по одному предшествующему токену",
    scaleBoundary:
      "Результаты по масштабу и возможностям этой модели нельзя переносить на небольшой учебный запуск",
    qualityBoundary: "не подтверждает полезное качество генерации",
    detailsFragment: "Точные сгенерированные ID: [260,34,34]",
    selectedCue: "выбрано по валидации",
    testCue:
      "|| тестовая выборка открывается один раз после выбора состояния",
    checkpointCue:
      "= байты и всё состояние восстанавливаются точно; логиты пробы совпадают",
    generationCue:
      "= решения с кэшем и полным пересчётом префикса совпадают",
    decodedTextLabel: "кириллическая т и два сгенерированных пробела",
    spaceMarker: "␠ — сгенерированный пробел.",
    fullViewOpenLabel: "Развернуть схему на весь экран",
    fullViewCloseLabel: "Выйти из полноэкранного режима",
  },
} as const;
const evidenceCopy = {
  en: [
    { id: "encoded-token-counts", label: "Encoded token counts — train / validation / test", value: "[1852,471,444]" },
    { id: "window-counts", label: "Causal-window counts — train / validation / test", value: "[1820,463,436]" },
    { id: "evaluation-batch-counts", label: "Evaluation mini-batch counts — train / validation / test", value: "[15,4,4]" },
    { id: "reload-probe-text", label: "Reload probe text", value: "At" },
    { id: "reload-probe-token-ids", label: "Token IDs encoding the reload probe At", value: "[67,118]" },
    { id: "retained-prefix-lengths", label: "Retained prefix lengths in tokens before successive token choices", value: "[1,2,3]" },
    { id: "cache-prefill-prompt-tokens", label: "Prompt tokens processed during cache prefill", value: "1" },
    { id: "one-token-decode-input-tokens", label: "Earlier generated tokens processed one at a time by decode calls to obtain later logits", value: "2" },
    { id: "cached-attention-score-cells", label: "Cached attention-score cells", value: "1+2+3=6", formula: true },
    { id: "complete-prefix-attention-score-cells", label: "Calculated complete-prefix attention-score cells", value: "1^2+2^2+3^2=14", formula: true },
  ],
  ru: [
    { id: "encoded-token-counts", label: "Число токенов после кодирования — обучение / валидация / тест", value: "[1852,471,444]" },
    { id: "window-counts", label: "Число каузальных окон — обучение / валидация / тест", value: "[1820,463,436]" },
    { id: "evaluation-batch-counts", label: "Число мини-пакетов оценки — обучение / валидация / тест", value: "[15,4,4]" },
    { id: "reload-probe-text", label: "Текст пробы для проверки логитов после восстановления", value: "At" },
    { id: "reload-probe-token-ids", label: "ID токенов, которыми закодирована проба At", value: "[67,118]" },
    { id: "retained-prefix-lengths", label: "Длины сохранённых префиксов перед каждым выбором токена (в токенах)", value: "[1,2,3]" },
    { id: "cache-prefill-prompt-tokens", label: "Число токенов промпта, обработанных при заполнении KV-кэша", value: "1" },
    { id: "one-token-decode-input-tokens", label: "Число сгенерированных токенов, по одному поданных декодеру для следующих логитов", value: "2" },
    { id: "cached-attention-score-cells", label: "Число оценок внимания при работе с KV-кэшем", value: "1+2+3=6", formula: true },
    { id: "complete-prefix-attention-score-cells", label: "Число оценок внимания при эталонном расчёте по полному префиксу", value: "1^2+2^2+3^2=14", formula: true },
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

async function expectExplicitEvidence(
  diagram: Locator,
  locale: ChapterLocale,
) {
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
    const contains = (
      outer: ReturnType<typeof innerRect>,
      inner: DOMRect,
    ) =>
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
      problems.push("the reflowing pipeline must not create a private scroller");
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
    revision: 4,
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
  for (const href of [
    "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
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
    await diagram.locator("[data-stage]").evaluateAll((cards) =>
      cards.map((card) => card.getAttribute("data-stage")),
    ),
  ).toEqual(stageOrder);
  expect(
    await diagram.locator("[data-stage-index]").evaluateAll((cards) =>
      cards.map((card) => card.getAttribute("data-stage-index")),
    ),
  ).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
  await expect(diagram.locator('[data-state="trusted"]')).toHaveCount(5);
  await expect(diagram.locator('[data-stage="data"]')).toContainText(
    "8/2/2",
  );
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
    diagram
      .locator(
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
  await expect(
    diagram.locator('[data-stage="generation"] small'),
  ).toHaveText(localized.spaceMarker);
  await expect(
    diagram.locator(
      '[data-stage="generation"] annotation[encoding="application/x-tex"]',
    ),
  ).toHaveText([
    "\\tau=0.8,\\ k=4",
    "1+2+3=6",
    "1^2+2^2+3^2=14",
  ]);
  await expect(
    diagram
      .locator('[data-stage="test"] .cue annotation[encoding="application/x-tex"]')
      .first(),
  ).toHaveText("3.866087547<3.981342714");
  await expect(diagram.locator("svg, canvas, path, polyline, line")).toHaveCount(
    0,
  );
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
      }
    });

    test("full view reuses each localized complete pipeline", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      const controlNames: string[] = [];
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
        controlNames.push((await toggle.getAttribute("aria-label")) ?? "");
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
        await expectDiagramContainment(page);
        const travel = await diagram.evaluate((node) => ({
          horizontal: node.scrollWidth - node.clientWidth,
          vertical: node.scrollHeight - node.clientHeight,
          verticalLimit: Math.ceil(node.clientHeight * 0.12),
        }));
        expect(travel.horizontal).toBe(0);
        expect(travel.vertical).toBeLessThanOrEqual(travel.verticalLimit);
        await page.keyboard.press("Escape");
        await page.waitForFunction(() => document.fullscreenElement === null);
        await expect(toggle).toBeFocused();
      }
      expect(new Set(controlNames).size).toBe(locales.length);
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
          await diagram.locator("[data-stage]").evaluateAll((cards) =>
            cards.map((card) => card.getAttribute("data-stage")),
          ),
        ).toEqual(stageOrder);
        expect(
          await diagram
            .locator("code, bdi, [data-inline-math]")
            .evaluateAll((nodes) =>
              nodes.every(
                (node) => getComputedStyle(node).direction === "ltr",
              ),
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
        await expect(page.locator('[data-stage="test"]')).toContainText(
          "1744",
        );
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
        ).toHaveText([
          "\\tau=0.8,\\ k=4",
          "1+2+3=6",
          "1^2+2^2+3^2=14",
        ]);
        await expectDiagramContainment(page);
        await expectNoOverflowOrClientScripts(page);
      }
      await context.close();
    });
  },
);
