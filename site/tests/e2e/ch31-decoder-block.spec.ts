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

const chapterId = "31-decoder-block";
const chapterTitle = "Compose one pre-norm Transformer decoder block";
const chapterDescription =
  "Learn how RMSNorm, causal multi-head attention, SwiGLU, and two residual paths compose one shape-preserving Transformer decoder block.";
const diagramTitle =
  "Follow two pre-normalized branches around one residual stream";
const diagramDescription =
  "Read exact Rust-authored rows through attention normalization, causal multi-head attention, the first residual merge, feed-forward normalization, SwiGLU, and the second residual merge.";
const chapterHeadings = [
  "Trace both residual paths before running the block",
  "Add each branch to the stream that entered it",
  "Keep branch values separate from residual values",
  "From recurrent state and post-norm blocks to pre-norm decoders",
  "Compose tested parts without hiding their boundaries",
  "Inspect both bypasses and both transformation branches",
  "Test order, shape, causality, and parameter ownership",
  "Repeat the block only at the next model boundary",
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
    'figure[data-visualization-id="pre-norm-decoder-block-flow"]',
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
    return {
      clientWidth: root.clientWidth,
      problems,
      scrollerCount: scrollers.length,
      scrollWidth: root.scrollWidth,
    };
  });
  expect(result.problems).toEqual([]);
  expect(result.scrollWidth).toBeLessThanOrEqual(result.clientWidth + 2);
  expect(result.scrollerCount).toBe(7);
  for (const scroller of await diagram.locator("[data-diagram-scroll]").all()) {
    await scroller.focus();
    await expect(scroller).toBeFocused();
  }
}

async function expectChapterContent(
  page: Page,
  chapters: readonly CourseChapterLink[],
) {
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale: "en",
    order: 31,
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
    "x'=x+\\operatorname{MHA}(\\operatorname{RMSNorm}(x)),\\quad",
    "y=x'+\\operatorname{FFN}(\\operatorname{RMSNorm}(x'))",
    "x,x',y\\in\\mathbb{R}^{B\\times T\\times d_{\\mathrm{model}}}",
    "N_\\theta",
    "\\operatorname{LayerNorm}(x+\\operatorname{MHA}(x))",
    "x'_1=[0.010881,3.989119,0,0]",
  ]) {
    expect(
      annotations
        .map(normalizeMath)
        .some((formula) => formula.includes(normalizeMath(expected))),
      "expected a rendered formula containing " + expected,
    ).toBe(true);
  }
  await expect(page.locator(".lesson-body .katex-error")).toHaveCount(0);
  await expectFormulaGeometry(page);

  const lessonText = (await page.locator(".lesson-body").innerText()).replace(
    /\s+/g,
    " ",
  );
  expect(lessonText).toContain(
    "rather than a claim about every later LSTM language model",
  );
  expect(lessonText).toContain(
    "without claiming that the helper reproduces an LSTM",
  );
  await expect(
    page.locator('.lesson-body a[href^="https://arxiv.org/abs/"]'),
  ).toHaveCount(3);
  await expect(
    page.locator(
      '.lesson-body a[href^="https://direct.mit.edu/neco/article/"]',
    ),
  ).toHaveCount(1);
  await expect(page.locator("figure.rust-source")).toHaveCount(6);
  await expectVisualizationDecision(page, {
    decision: "useful",
    id: "pre-norm-decoder-block-flow",
  });

  const diagram = page.locator(
    'figure[data-visualization-id="pre-norm-decoder-block-flow"]',
  );
  await expect(diagram).toHaveAccessibleName(diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(diagramDescription);
  await expect(diagram).toHaveAttribute("data-diagram-style", "course-v1");
  await expect(diagram.locator("[data-shape-stage]")).toHaveCount(9);
  await expect(diagram.locator("[data-flow]")).toHaveCount(2);
  await expect(diagram.locator("[data-diagram-box]")).toHaveCount(16);
  await expect(diagram.locator("[data-stage-token]")).toHaveCount(3);
  await expect(diagram.locator("[data-attention-head]")).toHaveCount(6);
  await expect(diagram.locator('[data-visibility="allowed"]')).toHaveCount(12);
  await expect(diagram.locator('[data-visibility="blocked"]')).toHaveCount(6);
  await expect(diagram.locator("table")).toHaveCount(4);
  await expect(diagram.locator("table caption")).toHaveCount(4);
  await expect(
    diagram.locator(
      '[data-attention-head="0"][data-attention-query="1"] annotation',
    ),
  ).toHaveText(["0", "q=1", "0.005440", "0.994560", "0.000000", "1.000000"]);
  const tokenOne = await diagram
    .locator('[data-stage-token="1"] annotation')
    .allTextContents();
  expect(tokenOne).toContain("[0.010881,3.989119,0.000000,0.000000]");
  const feedForwardTokenOne = await diagram
    .locator('[data-feed-forward-token="1"] annotation')
    .allTextContents();
  expect(feedForwardTokenOne).toContain(
    "[0.010896,7.512278,0.000000,0.000000]",
  );
  const probeTokenOne = await diagram
    .locator('[data-probe-token-row="1"] annotation')
    .allTextContents();
  expect(probeTokenOne).toContain("[0.010896,7.512278,-7.523174]");
  await expect(diagram.locator('[data-order-proof="true"]')).toContainText(
    "Numerically different",
  );
  await expect(diagram.locator('[data-prefix-position="0"]')).toHaveAttribute(
    "data-prefix-status",
    "bitwise-unchanged",
  );
  await expect(diagram.locator('[data-prefix-position="1"]')).toHaveAttribute(
    "data-prefix-status",
    "bitwise-unchanged",
  );
  await expect(diagram.locator('[data-prefix-position="2"]')).toHaveAttribute(
    "data-prefix-status",
    "changed",
  );
  await expectDiagramContainment(page);

  const details = page.locator(".lesson-body details");
  await expect(details).toHaveCount(1);
  await details.locator("summary").click();
  await expect(details.locator("ol > li")).toHaveCount(6);
  await expect(details).toContainText(
    "The feed-forward branch can still change",
  );
  await expectOrderedChapterNavigation(page, "en", chapterId, chapters);
  await expect(
    page.locator(
      'nav[data-chapter-navigation] a[data-chapter-direction="previous"]',
    ),
  ).toHaveAttribute("data-chapter-id", "30-multi-head-attention");
  await expect(
    page.locator(
      'nav[data-chapter-navigation] a[data-chapter-direction="next"]',
    ),
  ).toHaveAttribute("data-chapter-id", "32-decoder-model");
  await expectNoOverflowOrClientScripts(page);
}

test.describe(
  "chapter 31 pre-normalized decoder block vertical slice",
  { tag: chapterTag(chapterId) },
  () => {
    test("English publishes Chapter 31 while its Russian route remains deferred", async ({
      page,
    }) => {
      const english = await readOrderedCourseChapters(page, "en");
      expect(english.length).toBeGreaterThanOrEqual(31);
      expect(english[30]).toEqual(
        expect.objectContaining({
          chapterId,
          order: 31,
          title: chapterTitle,
        }),
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

    test("the Rust-backed lesson and contained diagram render at desktop and narrow widths", async ({
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

    test("identity, branch, merge, allowed, and blocked cues survive forced colors", async ({
      page,
    }) => {
      await page.emulateMedia({ forcedColors: "active" });
      await page.goto(chapterPath("en", chapterId));
      const diagram = page.locator(
        'figure[data-visualization-id="pre-norm-decoder-block-flow"]',
      );
      await expect(diagram.locator(".cue-list li")).toHaveText([
        "Solid border: unchanged identity path",
        "Dashed border: learned transformation branch",
        "Double border: residual addition",
        "Solid underline: visible key",
        "Dashed underline: masked future key",
      ]);
      await expect(diagram.locator(".identity-card").first()).toHaveCSS(
        "border-left-style",
        "solid",
      );
      await expect(diagram.locator(".branch-card").first()).toHaveCSS(
        "border-left-style",
        "dashed",
      );
      await expect(diagram.locator(".merge-card").first()).toHaveCSS(
        "border-left-style",
        "double",
      );
      await expect(diagram.locator("td.allowed").first()).toHaveCSS(
        "border-bottom-style",
        "solid",
      );
      await expect(diagram.locator("td.blocked").first()).toHaveCSS(
        "border-bottom-style",
        "dashed",
      );
      await expectNoOverflowOrClientScripts(page);
    });

    test("RTL prose keeps formulas, trace values, and causal table order left-to-right", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(chapterPath("en", chapterId));
      const diagram = page.locator(
        'figure[data-visualization-id="pre-norm-decoder-block-flow"]',
      );
      await diagram.evaluate((node) => node.setAttribute("dir", "rtl"));
      await expect(diagram.locator("h4").first()).toHaveCSS("direction", "rtl");
      expect(
        await diagram
          .locator(".technical, [data-inline-math]")
          .evaluateAll((nodes) =>
            nodes.every((node) => getComputedStyle(node).direction === "ltr"),
          ),
      ).toBe(true);
      expect(
        await diagram
          .locator("[data-attention-head]")
          .evaluateAll((rows) =>
            rows.map((row) => [
              row.getAttribute("data-attention-head"),
              row.getAttribute("data-attention-query"),
            ]),
          ),
      ).toEqual([
        ["0", "0"],
        ["0", "1"],
        ["0", "2"],
        ["1", "0"],
        ["1", "1"],
        ["1", "2"],
      ]);
      await expectNoOverflowOrClientScripts(page);
    });

    test("the lesson and exact decoder-block trace render without JavaScript", async ({
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
      await expect(page.locator("[data-shape-stage]")).toHaveCount(9);
      await expect(page.locator("[data-flow]")).toHaveCount(2);
      await expect(page.locator("[data-stage-token]")).toHaveCount(3);
      await expect(page.locator("[data-attention-head]")).toHaveCount(6);
      await expect(page.locator('[data-prefix-position="0"]')).toContainText(
        "Bitwise unchanged",
      );
      await expect(page.locator('[data-prefix-position="2"]')).toContainText(
        "Numerically different",
      );
      await expectNoOverflowOrClientScripts(page);
      await context.close();
    });
  },
);
