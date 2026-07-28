import { expect, test, type Page } from "@playwright/test";

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
const chapterTitle = "Run the whole tiny LLM";
const chapterDescription =
  "Connect frozen bilingual data, training-only BPE, decoder training, final evaluation, checkpoint reload, and cached text generation in one Rust program.";
const diagramTitle =
  "Keep evidence one-way from text to generated text";
const diagramDescription =
  "Follow frozen Rust evidence through training-only BPE, selection, test, exact reload, and cached generation.";
const chapterHeadings = [
  "Predict the boundary before predicting the output",
  "One product connects every next-token decision",
  "Keep sequence position separate from pipeline stage",
  "From short count contexts to autoregressive Transformer LLMs",
  "Assemble APIs instead of copying algorithms",
  "Follow the one-way pipeline",
  "Predict before checking the final trace",
  "Take ownership of the complete decoder",
] as const;
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
) {
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale: "en",
    order: 39,
    revision: 1,
    revisionLabel: "Content revision",
    title: chapterTitle,
    equivalentLocales: ["en"],
    fallbackRouteSuffix: "/course/",
  });
  await expect(page.locator(".lesson-description")).toHaveText(
    chapterDescription,
  );
  await expectSeoDescription(page, chapterDescription);
  await expect(page.locator(".lesson-body h2")).toHaveText(chapterHeadings);

  const annotations = await page
    .locator('.lesson-body annotation[encoding="application/x-tex"]')
    .allTextContents();
  for (const expected of [
    "P_\\theta(z_{1:T})=\\prod_{t=1}^{T}P_\\theta(z_t\\mid z_{<t})",
    "C=4",
    "3.981342714-3.866087547=0.115255167",
    "3.866087547<3.981342714",
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
  expect(lessonText).toContain(
    "A count-based bigram estimates the next token from one preceding token",
  );
  expect(lessonText).toContain(
    "scale and capability claims from that model do not transfer to this tiny teaching run",
  );
  expect(lessonText).toContain(
    "It does not establish a universal architecture ranking or useful generation quality",
  );
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
  await expect(diagram).toHaveAccessibleName(diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(diagramDescription);
  await expect(diagram).toHaveAttribute("data-diagram-style", "course-v1");
  await expect(diagram.locator("[data-diagram-card]")).toHaveCount(8);
  await expect(diagram.locator("[data-diagram-box]")).toHaveCount(8);
  await expect(diagram.locator("[data-diagram-scroll]")).toHaveCount(0);
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
  await expect(diagram.locator('[data-stage="tokenizer"]')).toContainText(
    "266",
  );
  await expect(diagram.locator('[data-stage="batches"]')).toContainText(
    "[1820,463,436]",
  );
  await expect(diagram.locator('[data-stage="model"]')).toContainText("1188");
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
  await expect(diagram.locator('[data-stage="generation"]')).toContainText(
    "[260,34,34]",
  );
  expect(
    await diagram.locator('[data-stage="generation"] q').textContent(),
  ).toBe("т  ");
  await expect(diagram.locator('[data-stage="generation"]')).toContainText(
    "6/14",
  );
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
  await expect(details).toContainText(
    "The literal generated IDs are [260,34,34]",
  );
  await expectOrderedChapterNavigation(page, "en", chapterId, chapters);
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
    test("English publishes Chapter 39 while its Russian route remains deferred", async ({
      page,
    }) => {
      const english = await readOrderedCourseChapters(page, "en");
      expect(english).toHaveLength(39);
      expect(english[38]).toEqual(
        expect.objectContaining({ chapterId, order: 39, title: chapterTitle }),
      );
      const russian = await readOrderedCourseChapters(page, "ru");
      expect(russian.length).toBeGreaterThan(0);
      const lastRussianChapter = russian[russian.length - 1]!;
      await page.goto(chapterPath("ru", lastRussianChapter.chapterId));
      await expectOrderedChapterNavigation(
        page,
        "ru",
        lastRussianChapter.chapterId,
        russian,
      );
      expect(russian.some((chapter) => chapter.chapterId === chapterId)).toBe(
        false,
      );
      await page.goto(chapterPath("en", chapterId));
      await expect(
        page.locator('.locale-switch a[data-locale="ru"]'),
      ).toHaveAttribute("href", "/ru/course/");
      await expect(
        page.locator('link[rel="alternate"][hreflang="ru"]'),
      ).toHaveCount(0);
      const missing = await page.goto(chapterPath("ru", chapterId));
      expect(missing?.status()).toBe(404);
    });

    test("the complete capstone lesson renders at desktop and narrow widths", async ({
      page,
    }) => {
      const chapters = await readOrderedCourseChapters(page, "en");
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(chapterPath("en", chapterId));
      await expectChapterContent(page, chapters);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      await expectChapterContent(page, chapters);
    });

    test("the shared full-view control reuses the same complete pipeline", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(chapterPath("en", chapterId));
      const diagram = page.locator(
        'figure[data-visualization-id="end-to-end-llm"]',
      );
      await expect(diagram).toHaveCount(1);
      const toggle = diagram.locator("[data-diagram-full-view-toggle]");
      await expect(toggle).toHaveCount(1);
      await toggle.click();
      await page.waitForFunction(
        () =>
          document.fullscreenElement?.getAttribute("data-visualization-id") ===
          "end-to-end-llm",
      );
      await expect(
        page.locator('figure[data-visualization-id="end-to-end-llm"]'),
      ).toHaveCount(1);
      await expect(diagram.locator("[data-stage]")).toHaveCount(8);
      await expect(diagram.locator("[data-diagram-box]")).toHaveCount(8);
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
    });

    test("text and border cues survive forced colors", async ({ page }) => {
      await page.emulateMedia({ forcedColors: "active" });
      await page.goto(chapterPath("en", chapterId));
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
      await expect(
        diagram.locator('[data-stage="test"] .cue').first(),
      ).toContainText("|| one-way test gate");
      await expect(
        diagram.locator('[data-stage="checkpoint"] .cue'),
      ).toContainText("= restored tokenizer and logits are exact");
      await expectDiagramContainment(page);
      await expectNoOverflowOrClientScripts(page);
    });

    test("RTL prose preserves stage order and left-to-right technical evidence", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(chapterPath("en", chapterId));
      const diagram = page.locator(
        'figure[data-visualization-id="end-to-end-llm"]',
      );
      await diagram.evaluate((node) => node.setAttribute("dir", "rtl"));
      await expect(diagram.locator("h4").first()).toHaveCSS("direction", "rtl");
      expect(
        await diagram.locator("[data-stage]").evaluateAll((cards) =>
          cards.map((card) => card.getAttribute("data-stage")),
        ),
      ).toEqual(stageOrder);
      expect(
        await diagram
          .locator('code, bdi[dir="ltr"], [data-inline-math]')
          .evaluateAll((nodes) =>
            nodes.every((node) => getComputedStyle(node).direction === "ltr"),
          ),
      ).toBe(true);
      await expect(
        diagram.locator('[data-stage="generation"] bdi[dir="auto"]'),
      ).toHaveCSS("direction", "ltr");
      await expectDiagramContainment(page);
      await expectNoOverflowOrClientScripts(page);
    });

    test("the complete pipeline remains available without JavaScript", async ({
      browser,
    }, testInfo) => {
      const context = await browser.newContext({
        javaScriptEnabled: false,
        baseURL: String(testInfo.project.use.baseURL),
      });
      const page = await context.newPage();
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(chapterPath("en", chapterId));
      await expect(
        page.getByRole("heading", { level: 1, name: chapterTitle }),
      ).toBeVisible();
      await expect(page.locator("[data-stage]")).toHaveCount(8);
      await expect(page.locator("[data-diagram-card]")).toHaveCount(8);
      await expect(page.locator("[data-diagram-box]")).toHaveCount(8);
      await expect(page.locator("[data-diagram-scroll]")).toHaveCount(0);
      await expect(page.locator("[data-diagram-full-view-toggle]")).toHaveCount(
        0,
      );
      await expect(page.locator('[data-stage="test"]')).toContainText(
        "3.866087547",
      );
      await expect(page.locator('[data-stage="generation"]')).toContainText(
        "[260,34,34]",
      );
      await expectDiagramContainment(page);
      await expectNoOverflowOrClientScripts(page);
      await context.close();
    });
  },
);
