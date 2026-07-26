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

const chapterId = "34-final-evaluation";
const chapterTitle = "Open test once, keep the report";
const chapterDescription =
  "Learn how to freeze validation-selected model decisions, score identical held-out targets once without a gradient graph, and publish a provenance-checked final LLM evaluation report.";
const diagramTitle = "Freeze choices before final evidence";
const diagramDescription =
  "Follow training, validation selection, a sealed state, one test evaluation, and an immutable report; then compare two Rust-authored losses over the same 24 target slots.";
const chapterHeadings = [
  "Freeze the comparison before opening test",
  "Average surprise over target tokens",
  "Keep states, slots, and roles distinct",
  "From training scores to governed final LLM evidence",
  "Make the final boundary executable",
  "Read one information boundary and one comparison",
  "Classify legal decisions before you run",
  "Carry the selected and evaluated state forward",
] as const;

const normalizeMath = (value: string) => value.replace(/\s+/g, "");

async function expectFormulaGeometry(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  const problems = await page
    .locator(
      ".lesson-body .katex-display, .lesson-body [data-inline-math] > .katex",
    )
    .evaluateAll((nodes) =>
      nodes.flatMap((node, index) => {
        const element = node as HTMLElement;
        const rect = element.getBoundingClientRect();
        const source =
          element.querySelector('annotation[encoding="application/x-tex"]')
            ?.textContent ?? "formula " + index;
        const issues: string[] = [];
        let ancestor: HTMLElement | null = element.parentElement;
        let localScroller = false;
        while (ancestor && ancestor !== document.body) {
          const { overflowX } = getComputedStyle(ancestor);
          if (
            ["auto", "scroll"].includes(overflowX) &&
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
          issues.push(source + " escapes the viewport");
        }
        if (rect.width <= 0 || rect.height <= 0)
          issues.push(source + " has no visible box");
        const mathml = element.querySelector<HTMLElement>(".katex-mathml");
        if (!mathml) {
          issues.push(source + " has no accessible MathML projection");
        } else {
          const style = getComputedStyle(mathml);
          if (style.display !== "block" || style.overflowX !== "clip")
            issues.push(source + " does not contain its MathML projection");
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

async function expectDiagramContainment(page: Page) {
  const diagram = page.locator(
    'figure[data-visualization-id="final-evaluation-boundary"]',
  );
  const result = await diagram.evaluate((node) => {
    const root = node as HTMLElement;
    const rootRect = root.getBoundingClientRect();
    const problems: string[] = [];
    const boxes = Array.from(
      root.querySelectorAll<HTMLElement>("[data-diagram-box]"),
    );
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
        problems.push("box " + index + " lacks a four-sided border");
      }
      if (
        box.scrollWidth > box.clientWidth + 2 ||
        box.scrollHeight > box.clientHeight + 2
      ) {
        problems.push("box " + index + " does not contain its content");
      }
      if (
        [style.overflowX, style.overflowY].some((value) =>
          ["hidden", "clip"].includes(value),
        )
      ) {
        problems.push("box " + index + " hides overflow");
      }
      const boxRect = box.getBoundingClientRect();
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
            if (
              rect.width > 0 &&
              (rect.left < boxRect.left - 2 ||
                rect.right > boxRect.right + 2 ||
                rect.top < boxRect.top - 2 ||
                rect.bottom > boxRect.bottom + 2)
            ) {
              problems.push(
                "box " + index + " text " + textIndex + " crosses its border",
              );
            }
          }
          textIndex += 1;
        }
        textNode = walker.nextNode();
      }
    }
    const scrollers = Array.from(
      root.querySelectorAll<HTMLElement>("[data-diagram-scroll]"),
    );
    for (const [index, scroller] of scrollers.entries()) {
      const rect = scroller.getBoundingClientRect();
      const style = getComputedStyle(scroller);
      if (
        scroller.getAttribute("role") !== "region" ||
        scroller.getAttribute("tabindex") !== "0" ||
        !scroller.getAttribute("aria-label")
      ) {
        problems.push("scroller " + index + " is not a named keyboard region");
      }
      if (!["auto", "scroll"].includes(style.overflowX))
        problems.push("scroller " + index + " does not own horizontal travel");
      if (scroller.scrollHeight > scroller.clientHeight + 2)
        problems.push("scroller " + index + " clips vertically");
      if (rect.left < rootRect.left - 2 || rect.right > rootRect.right + 2)
        problems.push("scroller " + index + " escapes the figure");
    }
    return {
      boxCount: boxes.length,
      clientWidth: root.clientWidth,
      problems,
      scrollerCount: scrollers.length,
      scrollWidth: root.scrollWidth,
    };
  });
  expect(result.problems).toEqual([]);
  expect(result.boxCount).toBe(9);
  expect(result.scrollerCount).toBe(1);
  expect(result.scrollWidth).toBeLessThanOrEqual(result.clientWidth + 2);
  const scroller = diagram.locator("[data-diagram-scroll]");
  await scroller.focus();
  await expect(scroller).toBeFocused();
}

async function expectChapterContent(
  page: Page,
  chapters: readonly CourseChapterLink[],
) {
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale: "en",
    order: 34,
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
    "\\mathcal{L}_{te}(\\theta_{s^*})=-\\frac{1}{N_{te}}",
    "\\sum_{n=1}^{N_{te}}\\log p_{\\theta_{s^*}}(y_n\\mid x_n)",
    "\\frac{\\sum_d N_d\\mathcal{L}^{(d)}_{te}}{\\sum_d N_d}",
    "N_{te}=24",
    "\\Delta_{te}=0.629055",
  ]) {
    expect(
      annotations
        .map(normalizeMath)
        .some((formula) => formula.includes(normalizeMath(expected))),
      "expected a rendered formula containing " + expected,
    ).toBe(true);
  }
  expect(annotations.some((expression) => expression.includes("\\*"))).toBe(
    false,
  );
  await expect(page.locator(".lesson-body .katex-error")).toHaveCount(0);
  await expectFormulaGeometry(page);

  const lessonText = (await page.locator(".lesson-body").innerText()).replace(
    /\s+/g,
    " ",
  );
  expect(lessonText).toContain(
    "This is a history of LLM evaluation practice, not a history of programming languages",
  );
  expect(lessonText).toContain(
    "does not claim that decoders always beat bigrams",
  );
  expect(lessonText).toContain(
    "not a replacement for organizational data governance",
  );
  await expect(
    page.locator('.lesson-body a[href^="https://www.jmlr.org/"]'),
  ).toHaveCount(2);
  await expect(
    page.locator('.lesson-body a[href^="https://proceedings.neurips.cc/"]'),
  ).toHaveCount(1);
  await expect(page.locator("figure.rust-source")).toHaveCount(6);
  await expectVisualizationDecision(page, {
    decision: "useful",
    id: "final-evaluation-boundary",
  });

  const diagram = page.locator(
    'figure[data-visualization-id="final-evaluation-boundary"]',
  );
  await expect(diagram).toHaveAccessibleName(diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(diagramDescription);
  await expect(diagram).toHaveAttribute("data-diagram-style", "course-v1");
  await expect(diagram.locator("[data-stage]")).toHaveCount(5);
  await expect(diagram.locator("[data-diagram-box]")).toHaveCount(9);
  await expect(diagram.locator("table")).toHaveCount(1);
  await expect(diagram.locator("tbody tr")).toHaveCount(2);
  await expect(diagram.locator('[data-score-model="selected-decoder"]')).toHaveAttribute(
    "data-lower-loss",
    "true",
  );
  await expect(diagram.locator('[data-score-model="selected-decoder"] annotation')).toHaveText([
    "N_{te}=24",
    "\\sum_n-\\log p_n=38.584306",
    "\\mathcal{L}_{te}=1.607679",
  ]);
  await expect(diagram.locator('[data-score-model="frozen-bigram"] annotation')).toHaveText([
    "N_{te}=24",
    "\\sum_n-\\log p_n=53.681634",
    "\\mathcal{L}_{te}=2.236735",
  ]);
  await expect(diagram).toContainText("fnv1a64:dac4bb4d76beeb59");
  await expect(diagram).toContainText("selection_test_reads=0");
  await expect(diagram).toContainText("test_accesses=1");
  await expect(diagram.locator("svg, canvas, path, polyline, line")).toHaveCount(
    0,
  );
  await expectDiagramContainment(page);

  const details = page.locator(".lesson-body details");
  await expect(details).toHaveCount(1);
  await details.locator("summary").click();
  await expect(details.locator("ol > li")).toHaveCount(8);
  await expect(details).toContainText("Dataset access control and a shared audit log");
  await expectOrderedChapterNavigation(page, "en", chapterId, chapters);
  await expect(
    page.locator(
      'nav[data-chapter-navigation] a[data-chapter-direction="previous"]',
    ),
  ).toHaveAttribute("data-chapter-id", "33-training-selection");
  await expect(
    page.locator('nav[data-chapter-navigation] a[data-chapter-direction="next"]'),
  ).toHaveAttribute("data-chapter-id", "35-checkpoints");
  await expectNoOverflowOrClientScripts(page);
}

test.describe(
  "chapter 34 once-only final evaluation vertical slice",
  { tag: chapterTag(chapterId) },
  () => {
    test("English publishes Chapter 34 while Russian remains complete through Chapter 7", async ({
      page,
    }) => {
      const english = await readOrderedCourseChapters(page, "en");
      expect(english).toHaveLength(35);
      expect(english[33]).toEqual(
        expect.objectContaining({
          chapterId,
          order: 34,
          title: chapterTitle,
        }),
      );
      const russian = await readOrderedCourseChapters(page, "ru");
      expect(russian).toHaveLength(7);
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

    test("the Rust-backed lesson and final report render at desktop and narrow widths", async ({
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

    test("the shared full-view control reuses the same complete figure", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(chapterPath("en", chapterId));
      const diagram = page.locator(
        'figure[data-visualization-id="final-evaluation-boundary"]',
      );
      const toggle = diagram.locator("[data-diagram-full-view-toggle]");
      await expect(toggle).toHaveCount(1);
      await toggle.click();
      await page.waitForFunction(
        () =>
          document.fullscreenElement?.getAttribute("data-visualization-id") ===
          "final-evaluation-boundary",
      );
      await expect(diagram.locator("[data-stage]")).toHaveCount(5);
      await expect(diagram.locator("tbody tr")).toHaveCount(2);
      await expectDiagramContainment(page);
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => document.fullscreenElement === null);
      await expect(toggle).toBeFocused();
    });

    test("text, double borders, and numbered states survive forced colors", async ({
      page,
    }) => {
      await page.emulateMedia({ forcedColors: "active" });
      await page.goto(chapterPath("en", chapterId));
      const diagram = page.locator(
        'figure[data-visualization-id="final-evaluation-boundary"]',
      );
      await expect(diagram.locator(".cue-list li")).toHaveText([
        "≡ Equal sign: identical target slots",
        "║ Double border: lower loss in this fixture",
        "× Cross: reject test access before choices close",
      ]);
      await expect(diagram.locator('[data-stage="validation"]')).toHaveCSS(
        "border-top-style",
        "double",
      );
      await expect(
        diagram.locator('[data-score-model="selected-decoder"] > :first-child'),
      ).toHaveCSS("border-left-style", "double");
      await expectNoOverflowOrClientScripts(page);
    });

    test("RTL prose keeps technical values and evidence order left-to-right", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(chapterPath("en", chapterId));
      const diagram = page.locator(
        'figure[data-visualization-id="final-evaluation-boundary"]',
      );
      await diagram.evaluate((node) => node.setAttribute("dir", "rtl"));
      await expect(diagram.locator("h4").first()).toHaveCSS("direction", "rtl");
      expect(
        await diagram
          .locator("[data-stage]")
          .evaluateAll((stages) => stages.map((stage) => stage.getAttribute("data-stage"))),
      ).toEqual(["train", "validation", "frozen", "test", "report"]);
      expect(
        await diagram
          .locator("code, bdi, [data-inline-math]")
          .evaluateAll((nodes) =>
            nodes.every((node) => getComputedStyle(node).direction === "ltr"),
          ),
      ).toBe(true);
      await expectNoOverflowOrClientScripts(page);
    });

    test("the lesson and exact report evidence render without JavaScript", async ({
      browser,
    }, testInfo) => {
      const context = await browser.newContext({
        javaScriptEnabled: false,
        baseURL: String(testInfo.project.use.baseURL),
      });
      const page = await context.newPage();
      await page.goto(chapterPath("en", chapterId));
      await expect(
        page.getByRole("heading", { level: 1, name: chapterTitle }),
      ).toBeVisible();
      await expect(page.locator("[data-stage]")).toHaveCount(5);
      await expect(page.locator("[data-diagram-box]")).toHaveCount(9);
      await expect(page.locator("tbody tr")).toHaveCount(2);
      await expect(page.locator("[data-diagram-scroll]")).toHaveCount(1);
      await expect(page.locator("[data-diagram-full-view-toggle]")).toHaveCount(
        0,
      );
      await expect(page.locator(".lesson-body")).toContainText(
        "fnv1a64:dac4bb4d76beeb59",
      );
      await expectNoOverflowOrClientScripts(page);
      await context.close();
    });
  },
);
