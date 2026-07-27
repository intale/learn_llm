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

const chapterId = "38-cached-generation";
const chapterTitle = "Prefill once, then advance one token";
const chapterDescription =
  "Learn how one independent KV cache per decoder block turns prompt prefill into coherent one-token decoding while matching complete-prefix generation.";
const diagramTitle = "Prefill every layer once; decode every layer together";
const diagramDescription =
  "The exact Rust trace follows a two-token prompt and one later token through two distinct decoder-block caches, matches newest-position logits, and compares bounded attention-score work plus stopping and reset behavior.";
const chapterHeadings = [
  "Predict both cache lengths before running",
  "Count attention-score cells, not total runtime",
  "Keep retained length and final length separate",
  "From causal stacks to prompt and decode phases",
  "Prepare every block, then commit the stack",
  "Follow prefill into one-token decode",
  "Predict before checking the evidence",
  "Connect inference to the whole pipeline",
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
    'figure[data-visualization-id="cached-generation"]',
  );
  const result = await diagram.evaluate((node) => {
    const root = node as HTMLElement;
    const rootRect = root.getBoundingClientRect();
    const problems: string[] = [];
    const boxes = Array.from(
      root.querySelectorAll<HTMLElement>("[data-diagram-box]"),
    );
    const contains = (outer: DOMRect, inner: DOMRect) =>
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
      if (style.contain.split(/\s+/).includes("paint"))
        problems.push("box " + index + " uses paint containment");

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
            if (rect.width > 0 && !contains(boxRect, rect)) {
              problems.push(
                "box " + index + " text " + textIndex + " crosses its border",
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
        if (!contains(boxRect, formula.getBoundingClientRect())) {
          problems.push(
            "box " + index + " formula " + formulaIndex + " crosses its border",
          );
        }
      }
    }

    const scrollers = root.querySelectorAll("[data-diagram-scroll]");
    if (scrollers.length !== 0)
      problems.push(
        "the reflowing cache evidence must not create a private scroller",
      );
    if (
      rootRect.left < -2 ||
      rootRect.right > document.documentElement.clientWidth + 2 ||
      root.scrollWidth > root.clientWidth + 2
    ) {
      problems.push("figure escapes its inline or fullscreen boundary");
    }
    return {
      boxCount: boxes.length,
      problems,
      scrollerCount: scrollers.length,
    };
  });
  expect(result.problems).toEqual([]);
  expect(result.boxCount).toBe(12);
  expect(result.scrollerCount).toBe(0);
}

async function expectChapterContent(
  page: Page,
  chapters: readonly CourseChapterLink[],
) {
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale: "en",
    order: 38,
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
    "\\sum_{t=1}^{T}t^2\\in\\Theta(T^3),\\quad \\sum_{t=1}^{T}t\\in\\Theta(T^2)",
    "2\\times10^{-12}",
    "4(1+2+3)=24",
    "4(2^2+3^2)=52",
    "[B,H,t,d_h]",
    "\\Delta_{\\max}=0.000000000000",
    "4\\times(1+2+3)=24",
    "4\\times(2^2+3^2)=52",
    "z_{\\mathrm{EOS}}=4",
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
  expect(lessonText).toContain("Cached attention is not constant-time");
  expect(lessonText).toContain(
    "local correctness choices rather than policies defined by those papers",
  );
  for (const href of [
    "https://arxiv.org/pdf/1706.03762",
    "https://arxiv.org/pdf/1911.02150",
    "https://arxiv.org/pdf/2309.06180",
  ]) {
    await expect(page.locator(`.lesson-body a[href="${href}"]`)).toHaveCount(1);
  }
  await expect(page.locator("figure.rust-source")).toHaveCount(6);
  await expectVisualizationDecision(page, {
    decision: "useful",
    id: "cached-generation",
  });

  const diagram = page.locator(
    'figure[data-visualization-id="cached-generation"]',
  );
  await expect(diagram).toHaveAccessibleName(diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(diagramDescription);
  await expect(diagram).toHaveAttribute("data-diagram-style", "course-v1");
  await expect(diagram.locator("[data-phase]")).toHaveCount(2);
  await expect(diagram.locator("[data-layer]")).toHaveCount(4);
  await expect(diagram.locator("[data-match-phase]")).toHaveCount(2);
  await expect(diagram.locator("[data-diagram-card]")).toHaveCount(8);
  await expect(diagram.locator("[data-diagram-box]")).toHaveCount(12);
  await expect(diagram.locator("[data-diagram-scroll]")).toHaveCount(0);
  await expect(diagram.locator('[data-phase="prefill"]')).toHaveAttribute(
    "data-cache-before",
    "0",
  );
  await expect(diagram.locator('[data-phase="prefill"]')).toHaveAttribute(
    "data-cache-after",
    "2",
  );
  await expect(diagram.locator('[data-phase="prefill"]')).toHaveAttribute(
    "data-cache-shape",
    "1,2,2,2",
  );
  await expect(diagram.locator('[data-phase="decode"]')).toHaveAttribute(
    "data-cache-before",
    "2",
  );
  await expect(diagram.locator('[data-phase="decode"]')).toHaveAttribute(
    "data-cache-after",
    "3",
  );
  await expect(diagram.locator('[data-phase="decode"]')).toHaveAttribute(
    "data-cache-shape",
    "1,2,3,2",
  );
  await expect(
    diagram.locator('[data-phase="prefill"] [data-layer]'),
  ).toHaveCount(2);
  await expect(
    diagram.locator('[data-phase="decode"] [data-layer]'),
  ).toHaveCount(2);
  await expect(
    diagram.locator('[data-layer][data-storage="distinct"]'),
  ).toHaveCount(4);
  await expect(diagram.locator('[data-proof="cache"]')).toContainText(
    "cache_appends=6",
  );
  await expect(diagram.locator('[data-proof="cache"]')).toContainText(
    "qkv_rows=18",
  );
  await expect(diagram.locator('[data-proof="reference"]')).toContainText(
    "layer_caches=2",
  );
  await expect(diagram.locator('[data-generation="loaded"]')).toContainText(
    "[4,4] -> 44",
  );
  await expect(diagram.locator('[data-generation="loaded"]')).toContainText(
    "context-limit",
  );
  await expect(diagram.locator('[data-generation="loaded"]')).toContainText(
    "rng_match=true",
  );
  await expect(
    diagram
      .locator(
        '[data-generation="eos"] annotation[encoding="application/x-tex"]',
      )
      .last(),
  ).toHaveText("n_{\\mathrm{decode}}=0");
  await expect(diagram.locator('[data-proof="reset"]')).toContainText(
    "storage_unchanged=true",
  );
  await expect(diagram.locator('[data-proof="reset"]')).toContainText(
    "work_zeroed=true",
  );
  await expect(diagram.locator('[data-proof="errors"]')).toContainText(
    "rebuilt_model=true",
  );
  await expect(diagram.locator('[data-proof="errors"]')).toContainText(
    "changed_config=true",
  );
  await expect(diagram.locator('[data-proof="errors"]')).toContainText(
    "unchanged=true",
  );
  await expect(
    diagram.locator("svg, canvas, path, polyline, line"),
  ).toHaveCount(0);
  await expectDiagramContainment(page);

  const details = page.locator(".lesson-body details");
  await expect(details).toHaveCount(1);
  await details.locator("summary").click();
  await expect(details.locator("ol > li")).toHaveCount(9);
  await expect(details).toContainText(
    "Equal values and shapes do not preserve parameter-node identity",
  );
  await expectOrderedChapterNavigation(page, "en", chapterId, chapters);
  await expect(
    page.locator(
      'nav[data-chapter-navigation] a[data-chapter-direction="previous"]',
    ),
  ).toHaveAttribute("data-chapter-id", "37-incremental-attention");
  await expect(
    page.locator(
      'nav[data-chapter-navigation] a[data-chapter-direction="next"]',
    ),
  ).toHaveCount(0);
  await expectNoOverflowOrClientScripts(page);
}

test.describe(
  "chapter 38 cached generation vertical slice",
  { tag: chapterTag(chapterId) },
  () => {
    test("English publishes Chapter 38 while Russian remains complete through Chapter 7", async ({
      page,
    }) => {
      const english = await readOrderedCourseChapters(page, "en");
      expect(english).toHaveLength(38);
      expect(english[37]).toEqual(
        expect.objectContaining({
          chapterId,
          order: 38,
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

    test("the complete cached-generation lesson renders at desktop and narrow widths", async ({
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
        'figure[data-visualization-id="cached-generation"]',
      );
      await expect(
        page.locator('figure[data-visualization-id="cached-generation"]'),
      ).toHaveCount(1);
      const toggle = diagram.locator("[data-diagram-full-view-toggle]");
      await expect(toggle).toHaveCount(1);
      await toggle.click();
      await page.waitForFunction(
        () =>
          document.fullscreenElement?.getAttribute("data-visualization-id") ===
          "cached-generation",
      );
      await expect(
        page.locator('figure[data-visualization-id="cached-generation"]'),
      ).toHaveCount(1);
      await expect(diagram.locator("[data-phase]")).toHaveCount(2);
      await expect(diagram.locator("[data-layer]")).toHaveCount(4);
      await expect(diagram.locator("[data-diagram-card]")).toHaveCount(8);
      await expect(diagram.locator("[data-diagram-box]")).toHaveCount(12);
      await expect(diagram.locator("[data-diagram-scroll]")).toHaveCount(0);
      await expectDiagramContainment(page);
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => document.fullscreenElement === null);
      await expect(toggle).toBeFocused();
    });

    test("text plus solid and double phase cues survive forced colors", async ({
      page,
    }) => {
      await page.emulateMedia({ forcedColors: "active" });
      await page.goto(chapterPath("en", chapterId));
      const diagram = page.locator(
        'figure[data-visualization-id="cached-generation"]',
      );
      await expect(diagram.locator(".cue-list li")).toHaveText([
        "| prompt prefill - solid cue",
        "|| new one-token decode - double cue",
        "= newest logits match within tolerance",
      ]);
      await expect(
        diagram.locator('[data-phase="prefill"] [data-layer="0"]'),
      ).toHaveCSS("border-left-style", "solid");
      await expect(
        diagram.locator('[data-phase="decode"] [data-layer="0"]'),
      ).toHaveCSS("border-left-style", "double");
      await expectDiagramContainment(page);
      await expectNoOverflowOrClientScripts(page);
    });

    test("RTL prose keeps technical values and phase order left-to-right", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(chapterPath("en", chapterId));
      const diagram = page.locator(
        'figure[data-visualization-id="cached-generation"]',
      );
      await diagram.evaluate((node) => node.setAttribute("dir", "rtl"));
      await expect(diagram.locator("h4").first()).toHaveCSS("direction", "rtl");
      expect(
        await diagram
          .locator("[data-phase]")
          .evaluateAll((cards) =>
            cards.map((card) => card.getAttribute("data-phase")),
          ),
      ).toEqual(["prefill", "decode"]);
      expect(
        await diagram
          .locator("[data-layer]")
          .evaluateAll((rows) =>
            rows.map((row) => [
              row.getAttribute("data-layer-phase"),
              row.getAttribute("data-layer"),
            ]),
          ),
      ).toEqual([
        ["prefill", "0"],
        ["prefill", "1"],
        ["decode", "0"],
        ["decode", "1"],
      ]);
      expect(
        await diagram
          .locator("code, bdi, [data-inline-math]")
          .evaluateAll((nodes) =>
            nodes.every((node) => getComputedStyle(node).direction === "ltr"),
          ),
      ).toBe(true);
      await expectDiagramContainment(page);
      await expectNoOverflowOrClientScripts(page);
    });

    test("the complete model-wide cache evidence renders without JavaScript", async ({
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
      await expect(page.locator("[data-phase]")).toHaveCount(2);
      await expect(page.locator("[data-layer]")).toHaveCount(4);
      await expect(page.locator("[data-match-phase]")).toHaveCount(2);
      await expect(page.locator("[data-diagram-card]")).toHaveCount(8);
      await expect(page.locator("[data-diagram-box]")).toHaveCount(12);
      await expect(page.locator("[data-diagram-scroll]")).toHaveCount(0);
      await expect(page.locator("[data-diagram-full-view-toggle]")).toHaveCount(
        0,
      );
      await expect(page.locator('[data-phase="prefill"]')).toHaveAttribute(
        "data-cache-after",
        "2",
      );
      await expect(page.locator('[data-phase="decode"]')).toHaveAttribute(
        "data-cache-after",
        "3",
      );
      await expect(page.locator('[data-generation="loaded"]')).toContainText(
        "tokens_match=true",
      );
      await expect(page.locator('[data-generation="loaded"]')).toContainText(
        "rng_match=true",
      );
      await expect(
        page
          .locator(
            '[data-generation="eos"] annotation[encoding="application/x-tex"]',
          )
          .last(),
      ).toHaveText("n_{\\mathrm{decode}}=0");
      await expect(page.locator('[data-proof="reset"]')).toContainText(
        "replay_identical=true",
      );
      await expect(page.locator('[data-proof="errors"]')).toContainText(
        "unchanged=true",
      );
      await expectDiagramContainment(page);
      await expectNoOverflowOrClientScripts(page);
      await context.close();
    });
  },
);
