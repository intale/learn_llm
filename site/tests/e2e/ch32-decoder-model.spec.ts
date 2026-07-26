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

const chapterId = "32-decoder-model";
const chapterTitle = "Stack a decoder and tie its vocabulary head";
const chapterDescription =
  "Learn how token embeddings, repeated causal blocks, final RMSNorm, and one tied vocabulary table produce differentiable next-token logits.";
const diagramTitle =
  "Follow one tied vocabulary table through a complete decoder";
const diagramDescription =
  "Read exact Rust-authored token rows through lookup, two distinct causal blocks, final RMSNorm, and the transpose projection back to five vocabulary logits.";
const chapterHeadings = [
  "Predict the axes before tracing the decoder",
  "Reuse the embedding table at the far end of the stack",
  "Distinguish one parameter from its two uses",
  "From separate recurrent components to one decoder stack",
  "Make the complete model boundary explicit in Rust",
  "Inspect one table at both ends of the forward path",
  "Test axes, ownership, causality, and failures",
  "Train this exact model at the next boundary",
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
    'figure[data-visualization-id="tied-decoder-model-flow"]',
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
  expect(result.scrollerCount).toBe(3);
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
    order: 32,
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
    "\\ell=\\operatorname{RMSNorm}(B_N(\\cdots B_1(E[z])\\cdots))E^\\top",
    "\\ell\\in\\mathbb{R}^{B\\times T\\times V}",
    "\\mathcal{L}=-\\frac{1}{BT}",
    "\\bar E=\\bar E_{\\mathrm{lookup}}+\\bar E_{\\mathrm{output}}",
    "\\tau=2\\times10^{-5}",
    "[-0.338936,\\ 1.116846,\\ 1.308420,\\ -0.962186]",
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
    "making its tied-head choice explicit rather than universal",
  );
  expect(lessonText).toContain("does not recreate a historical model");
  await expect(
    page.locator('.lesson-body a[href^="https://arxiv.org/abs/"]'),
  ).toHaveCount(3);
  await expect(
    page.locator('.lesson-body a[href^="https://cdn.openai.com/"]'),
  ).toHaveCount(1);
  await expect(page.locator("figure.rust-source")).toHaveCount(9);
  await expectVisualizationDecision(page, {
    decision: "useful",
    id: "tied-decoder-model-flow",
  });

  const diagram = page.locator(
    'figure[data-visualization-id="tied-decoder-model-flow"]',
  );
  await expect(diagram).toHaveAccessibleName(diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(diagramDescription);
  await expect(diagram).toHaveAttribute("data-diagram-style", "course-v1");
  await expect(diagram.locator("[data-model-stage]")).toHaveCount(6);
  await expect(diagram.locator("[data-diagram-box]")).toHaveCount(10);
  await expect(diagram.locator("[data-stage-evidence]")).toHaveCount(4);
  await expect(diagram.locator("[data-logit-token]")).toHaveCount(3);
  await expect(diagram.locator("table")).toHaveCount(2);
  await expect(diagram.locator("table caption")).toHaveCount(2);
  await expect(diagram.locator("[data-shared-parameter]")).toHaveAttribute(
    "data-shared-parameter",
    "token_embedding.weight",
  );
  await expect(diagram.locator("[data-shared-parameter]")).toHaveAttribute(
    "data-tied-roles",
    "lookup+output",
  );
  await expect(
    diagram.locator('[data-stage-evidence="block-1"] [data-trace-vector]'),
  ).toHaveAttribute(
    "data-trace-vector",
    "[-0.183854,0.605829,0.709748,-0.521934]",
  );
  await expect(diagram.locator('[data-logit-token="1"] annotation')).toHaveText(
    [
      "t=1",
      "-0.862249",
      "0.967613",
      "-0.991545",
      "-0.446363",
      "1.234533",
      "\\operatorname*{argmax}=4",
      "y=2",
    ],
  );
  await expect(diagram.locator('[data-prefix-position="0"]')).toContainText(
    "Bitwise unchanged",
  );
  await expect(diagram.locator('[data-prefix-position="1"]')).toContainText(
    "Bitwise unchanged",
  );
  await expect(diagram.locator('[data-prefix-position="2"]')).toContainText(
    "Numerically changed",
  );
  await expectDiagramContainment(page);

  const details = page.locator(".lesson-body details");
  await expect(details).toHaveCount(1);
  await details.locator("summary").click();
  await expect(details.locator("ol > li")).toHaveCount(6);
  await expect(details).toContainText(
    "The output role can contribute to every vocabulary row",
  );
  await expectOrderedChapterNavigation(page, "en", chapterId, chapters);
  await expect(
    page.locator(
      'nav[data-chapter-navigation] a[data-chapter-direction="previous"]',
    ),
  ).toHaveAttribute("data-chapter-id", "31-decoder-block");
  await expectNoOverflowOrClientScripts(page);
}

test.describe(
  "chapter 32 complete tied decoder model vertical slice",
  { tag: chapterTag(chapterId) },
  () => {
    test("English publishes Chapter 32 while Russian remains complete through Chapter 7", async ({
      page,
    }) => {
      const english = await readOrderedCourseChapters(page, "en");
      expect(english.length).toBeGreaterThanOrEqual(32);
      expect(english[31]).toEqual(
        expect.objectContaining({
          chapterId,
          order: 32,
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

    test("repeated, tied, and verified cues survive forced colors", async ({
      page,
    }) => {
      await page.emulateMedia({ forcedColors: "active" });
      await page.goto(chapterPath("en", chapterId));
      const diagram = page.locator(
        'figure[data-visualization-id="tied-decoder-model-flow"]',
      );
      await expect(diagram.locator(".cue-list li")).toHaveText([
        "Double edge: repeated blocks with distinct weights",
        "Dashed edge: two uses of one parameter",
        "Double underline: verified Rust evidence",
      ]);
      await expect(diagram.locator(".block-stack")).toHaveCSS(
        "border-left-style",
        "double",
      );
      await expect(diagram.locator(".shared-table-card")).toHaveCSS(
        "border-left-style",
        "dashed",
      );
      await expect(diagram.locator(".tied-cue")).toHaveCSS(
        "border-bottom-style",
        "dashed",
      );
      await expect(diagram.locator(".verified-cue")).toHaveCSS(
        "border-bottom-style",
        "double",
      );
      await expectNoOverflowOrClientScripts(page);
    });

    test("RTL prose keeps formulas, trace values, and vocabulary order left-to-right", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(chapterPath("en", chapterId));
      const diagram = page.locator(
        'figure[data-visualization-id="tied-decoder-model-flow"]',
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
          .locator("[data-logit-token]")
          .evaluateAll((rows) =>
            rows.map((row) => row.getAttribute("data-logit-token")),
          ),
      ).toEqual(["0", "1", "2"]);
      await expectNoOverflowOrClientScripts(page);
    });

    test("the lesson and exact decoder-model trace render without JavaScript", async ({
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
      await expect(page.locator("[data-model-stage]")).toHaveCount(6);
      await expect(page.locator("[data-stage-evidence]")).toHaveCount(4);
      await expect(page.locator("[data-logit-token]")).toHaveCount(3);
      await expect(page.locator("[data-shared-parameter]")).toContainText(
        "token_embedding.weight",
      );
      await expect(page.locator('[data-prefix-position="0"]')).toContainText(
        "Bitwise unchanged",
      );
      await expect(page.locator('[data-prefix-position="2"]')).toContainText(
        "Numerically changed",
      );
      await expectNoOverflowOrClientScripts(page);
      await context.close();
    });
  },
);
