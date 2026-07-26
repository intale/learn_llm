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

const chapterId = "33-training-selection";
const chapterTitle = "Train every step, select with validation";
const chapterDescription =
  "Learn how a decoder training loop orders backpropagation, gradient clipping, scheduled AdamW updates, graph-free validation, and checkpoint selection without using test data.";
const diagramTitle = "Separate updates from validation-based selection";
const diagramDescription =
  "Follow six ordered operations through eight Rust-authored updates, then compare ten isolated train and validation measurements at five checkpoints without inventing a curve between them.";
const chapterHeadings = [
  "Plan every update before you train",
  "Update on train, choose on validation",
  "Keep steps, gradients, and partitions distinct",
  "From training-only reports to validation-selected LLM checkpoints",
  "Make the cumulative training boundary explicit in Rust",
  "Read measured checkpoints without inventing a curve",
  "Test the information boundary and state ownership",
  "Freeze the selected decoder for one test pass",
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
        if (rect.width <= 0 || rect.height <= 0) {
          issues.push(source + " has no visible box");
        }
        const struts = element.querySelectorAll<HTMLElement>(
          ".katex-html .strut, .katex-html .katex-strut",
        );
        if (struts.length === 0) {
          issues.push(source + " has no KaTeX layout strut");
        }
        for (const [strutIndex, strut] of Array.from(struts).entries()) {
          if (getComputedStyle(strut).display !== "inline-block") {
            issues.push(
              source + " strut " + strutIndex + " is not inline-block",
            );
          }
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

async function expectDiagramContainment(page: Page) {
  const diagram = page.locator(
    'figure[data-visualization-id="training-validation-checkpoints"]',
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
      const borders = [
        style.borderTopWidth,
        style.borderRightWidth,
        style.borderBottomWidth,
        style.borderLeftWidth,
      ].map(Number.parseFloat);
      const borderStyles = [
        style.borderTopStyle,
        style.borderRightStyle,
        style.borderBottomStyle,
        style.borderLeftStyle,
      ];
      if (
        borders.some((width) => !(width > 0)) ||
        borderStyles.some((value) => ["none", "hidden"].includes(value))
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
      for (const [textIndex, text] of Array.from(
        box.querySelectorAll<HTMLElement>(
          ":scope > :is(h5,p,code), :scope > :is(h5,p,code) *",
        ),
      ).entries()) {
        if (text.closest("[data-diagram-box]") !== box) continue;
        const rect = text.getBoundingClientRect();
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
      if (!["auto", "scroll"].includes(style.overflowX)) {
        problems.push("scroller " + index + " does not own horizontal travel");
      }
      if (scroller.scrollHeight > scroller.clientHeight + 2) {
        problems.push("scroller " + index + " clips vertically");
      }
      if (rect.left < rootRect.left - 2 || rect.right > rootRect.right + 2) {
        problems.push("scroller " + index + " escapes the figure");
      }
    }
    const plot = root.querySelector<HTMLElement>(".plot-field");
    if (plot === null) {
      problems.push("plot field is missing");
    } else {
      const plotRect = plot.getBoundingClientRect();
      for (const [index, point] of Array.from(
        plot.querySelectorAll<HTMLElement>(".measurement-point > span"),
      ).entries()) {
        const rect = point.getBoundingClientRect();
        if (
          rect.left < plotRect.left - 2 ||
          rect.right > plotRect.right + 2 ||
          rect.top < plotRect.top - 2 ||
          rect.bottom > plotRect.bottom + 2
        ) {
          problems.push("measurement point " + index + " escapes the plot");
        }
      }
    }
    return {
      clientWidth: root.clientWidth,
      problems,
      scrollerCount: scrollers.length,
      scrollWidth: root.scrollWidth,
    };
  });
  expect(result.problems).toEqual([]);
  expect(result.scrollWidth).toBeLessThanOrEqual(result.clientWidth + 2);
  expect(result.scrollerCount).toBe(1);
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
    order: 33,
    revision: 2,
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
    "\\theta_{s+1}=\\operatorname{AdamW}",
    "s^*=\\arg\\min_s\\mathcal{L}_{va}(\\theta_s)",
    "\\widetilde g_s=\\alpha_s g_s",
    "\\mathcal{L}_{va}",
    "\\frac{\\sum_j n_j\\mathcal{L}^{(j)}_{va}}{\\sum_j n_j}",
    "s^*=\\min\\left\\{s:",
    "\\lVert g_s\\rVert_2\\leq0.35",
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
    "This is a history of the training practices on the road to modern LLMs",
  );
  expect(lessonText).toContain(
    "local teaching choices, not universal properties of LLM training",
  );
  await expect(
    page.locator('.lesson-body a[href^="https://www.jmlr.org/"]'),
  ).toHaveCount(2);
  await expect(
    page.locator('.lesson-body a[href^="https://arxiv.org/"]'),
  ).toHaveCount(3);
  await expect(page.locator("figure.rust-source")).toHaveCount(10);
  await expectVisualizationDecision(page, {
    decision: "useful",
    id: "training-validation-checkpoints",
  });

  const diagram = page.locator(
    'figure[data-visualization-id="training-validation-checkpoints"]',
  );
  await expect(diagram).toHaveAccessibleName(diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(diagramDescription);
  await expect(diagram).toHaveAttribute("data-diagram-style", "course-v1");
  await expect(diagram).toHaveAttribute("data-no-interpolation", "true");
  await expect(diagram.locator("[data-operation-order]")).toHaveCount(6);
  await expect(diagram.locator(".measurement-point")).toHaveCount(10);
  await expect(
    diagram.locator('[data-series="train"].measurement-point'),
  ).toHaveCount(5);
  await expect(
    diagram.locator('[data-series="validation"].measurement-point'),
  ).toHaveCount(5);
  await expect(diagram.locator(".selected-point")).toHaveCount(1);
  await expect(
    diagram.locator('[data-selected="true"].selected-point'),
  ).toHaveAttribute("data-checkpoint-step", "8");
  await expect(
    diagram.locator('[data-selected="true"].selected-point'),
  ).toHaveAttribute("data-loss", "1.595297");
  await expect(diagram.locator("[data-checkpoint-row]")).toHaveCount(5);
  await expect(diagram.locator("[data-diagram-box]")).toHaveCount(11);
  await expect(diagram.locator("table")).toHaveCount(1);
  await expect(
    diagram.locator("svg, canvas, path, polyline, line"),
  ).toHaveCount(0);
  await expect(
    diagram.locator('[data-checkpoint-row="0"] annotation'),
  ).toHaveText(["s=0", "2.095016", "1.918167"]);
  await expect(
    diagram.locator('[data-checkpoint-row="8"] annotation'),
  ).toHaveText(["s=8", "1.322897", "1.595297"]);
  await expect(diagram.locator(".selected-row")).toContainText(
    "Double underline: selected validation state",
  );
  await expectDiagramContainment(page);

  const details = page.locator(".lesson-body details");
  await expect(details).toHaveCount(1);
  await details.locator("summary").click();
  await expect(details.locator("ol > li")).toHaveCount(6);
  await expect(details).toContainText(
    "The first loss equal to the minimum wins",
  );
  await expectOrderedChapterNavigation(page, "en", chapterId, chapters);
  await expect(
    page.locator(
      'nav[data-chapter-navigation] a[data-chapter-direction="previous"]',
    ),
  ).toHaveAttribute("data-chapter-id", "32-decoder-model");
  await expect(
    page.locator(
      'nav[data-chapter-navigation] a[data-chapter-direction="next"]',
    ),
  ).toHaveAttribute("data-chapter-id", "34-final-evaluation");
  await expectNoOverflowOrClientScripts(page);
}

test.describe(
  "chapter 33 training and validation selection vertical slice",
  { tag: chapterTag(chapterId) },
  () => {
    test("English publishes Chapter 33 while Russian remains complete through Chapter 7", async ({
      page,
    }) => {
      const english = await readOrderedCourseChapters(page, "en");
      expect(english).toHaveLength(37);
      expect(english[32]).toEqual(
        expect.objectContaining({
          chapterId,
          order: 33,
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

    test("the Rust-backed lesson and discrete diagram render at desktop and narrow widths", async ({
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
        'figure[data-visualization-id="training-validation-checkpoints"]',
      );
      const toggle = diagram.locator("[data-diagram-full-view-toggle]");
      await expect(toggle).toHaveCount(1);
      await toggle.click();
      await page.waitForFunction(
        () =>
          document.fullscreenElement?.getAttribute("data-visualization-id") ===
          "training-validation-checkpoints",
      );
      await expect(diagram.locator("[data-operation-order]")).toHaveCount(6);
      await expect(diagram.locator(".measurement-point")).toHaveCount(10);
      await expectDiagramContainment(page);
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => document.fullscreenElement === null);
      await expect(toggle).toBeFocused();
    });

    test("marker shapes and selection emphasis survive forced colors", async ({
      page,
    }) => {
      await page.emulateMedia({ forcedColors: "active" });
      await page.goto(chapterPath("en", chapterId));
      const diagram = page.locator(
        'figure[data-visualization-id="training-validation-checkpoints"]',
      );
      await expect(diagram.locator(".cue-list li")).toHaveText([
        "● Circle: measured training loss",
        "◆ Diamond: measured validation loss",
        "◎ Double underline: selected validation state",
        "↔ Gaps contain no measured values or interpolated line",
      ]);
      await expect(diagram.locator(".selected-point > span")).toHaveCSS(
        "text-decoration-style",
        "double",
      );
      await expect(diagram.locator(".selected-row > :last-child")).toHaveCSS(
        "border-left-style",
        "double",
      );
      await expectNoOverflowOrClientScripts(page);
    });

    test("RTL prose keeps the plot, table values, and checkpoint order left-to-right", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(chapterPath("en", chapterId));
      const diagram = page.locator(
        'figure[data-visualization-id="training-validation-checkpoints"]',
      );
      await diagram.evaluate((node) => node.setAttribute("dir", "rtl"));
      await expect(diagram.locator("h4").first()).toHaveCSS("direction", "rtl");
      await expect(diagram.locator(".plot-field")).toHaveCSS(
        "direction",
        "ltr",
      );
      expect(
        await diagram
          .locator("[data-checkpoint-row]")
          .evaluateAll((rows) =>
            rows.map((row) => row.getAttribute("data-checkpoint-row")),
          ),
      ).toEqual(["0", "2", "4", "6", "8"]);
      expect(
        await diagram
          .locator("[data-inline-math]")
          .evaluateAll((nodes) =>
            nodes.every((node) => getComputedStyle(node).direction === "ltr"),
          ),
      ).toBe(true);
      await expectNoOverflowOrClientScripts(page);
    });

    test("the lesson and exact checkpoint evidence render without JavaScript", async ({
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
      await expect(page.locator("[data-operation-order]")).toHaveCount(6);
      await expect(page.locator(".measurement-point")).toHaveCount(10);
      await expect(page.locator("[data-checkpoint-row]")).toHaveCount(5);
      await expect(page.locator(".selected-point")).toHaveCount(1);
      await expect(page.locator("[data-diagram-full-view-toggle]")).toHaveCount(
        0,
      );
      await expectNoOverflowOrClientScripts(page);
      await context.close();
    });
  },
);
