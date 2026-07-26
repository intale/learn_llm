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

const chapterId = "37-incremental-attention";
const chapterTitle = "Keep the prefix, project only the new row";
const chapterDescription =
  "Learn how one layer-bound KV cache appends rotated keys and values while reproducing full-prefix attention at the newest position.";
const diagramTitle = "Retain earlier K/V rows; append exactly one new row";
const diagramDescription =
  "The exact Rust trace follows three absolute positions, shows both head caches and attention weights, matches each newest output to a full-prefix reference, and proves reset plus rejected calls preserve storage.";
const chapterHeadings = [
  "Predict the third call before running it",
  "Append along the position axis",
  "Keep layer, logical length, and capacity separate",
  "From causal attention to managed LLM inference state",
  "Bind the state, calculate completely, then commit",
  "Follow retained rows into the newest query",
  "Predict before checking the trace",
  "Give every decoder block its own state next",
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
        if (
          rect.left < -1 ||
          rect.right > document.documentElement.clientWidth + 1
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
    'figure[data-visualization-id="incremental-attention"]',
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

    if (root.querySelector("[data-diagram-scroll]"))
      problems.push("the reflowing cache timeline must not create a private scroller");
    if (
      rootRect.left < -2 ||
      rootRect.right > document.documentElement.clientWidth + 2 ||
      root.scrollWidth > root.clientWidth + 2
    ) {
      problems.push("figure escapes its inline or fullscreen boundary");
    }
    return { boxCount: boxes.length, problems };
  });
  expect(result.problems).toEqual([]);
  expect(result.boxCount).toBe(21);
}

async function expectChapterContent(
  page: Page,
  chapters: readonly CourseChapterLink[],
) {
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale: "en",
    order: 37,
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
    "K^{(\\ell)}_{1:t}=[K^{(\\ell)}_{1:t-1};k^{(\\ell)}_t],\\quad V^{(\\ell)}_{1:t}=[V^{(\\ell)}_{1:t-1};v^{(\\ell)}_t]",
    "[B,H,C,d_h]",
    "[B,H,1,t+1]",
    "K_{2,0}=-1.325444263",
    "K_{2,1}=0.493150590",
    "\\Delta_{\\max}=0.000000000000",
    "2\\times3=6",
    "10^{-12}",
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
    "does not claim constant-time attention or a measured speedup",
  );
  expect(lessonText).toContain(
    "local correctness policies rather than claims made by those papers",
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
    id: "incremental-attention",
  });

  const diagram = page.locator(
    'figure[data-visualization-id="incremental-attention"]',
  );
  await expect(diagram).toHaveAccessibleName(diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(diagramDescription);
  await expect(diagram).toHaveAttribute("data-diagram-style", "course-v1");
  await expect(diagram.locator("[data-cache-step]")).toHaveCount(3);
  await expect(diagram.locator("[data-head]")).toHaveCount(6);
  await expect(diagram.locator("[data-cache-row]")).toHaveCount(12);
  await expect(diagram.locator("[data-match-proof]")).toHaveCount(3);
  await expect(diagram.locator("[data-diagram-card]")).toHaveCount(9);
  await expect(diagram.locator("[data-diagram-box]")).toHaveCount(21);
  await expect(diagram.locator('[data-cache-step="2"]')).toHaveAttribute(
    "data-cache-before",
    "2",
  );
  await expect(diagram.locator('[data-cache-step="2"]')).toHaveAttribute(
    "data-cache-after",
    "3",
  );
  await expect(diagram.locator('[data-cache-step="2"]')).toHaveAttribute(
    "data-rope-position",
    "2",
  );
  await expect(diagram.locator('[data-cache-step="2"]')).toHaveAttribute(
    "data-cache-shape",
    "1,2,3,2",
  );
  await expect(
    diagram.locator('[data-cache-step="2"] [data-head="1"]'),
  ).toContainText("-1.325444263");
  await expect(diagram.locator('[data-proof="full"]')).toContainText(
    "1+2+3=6",
  );
  await expect(diagram.locator('[data-proof="cached"]')).toContainText(
    "1+1+1=3",
  );
  await expect(diagram.locator('[data-proof="errors"]')).toContainText(
    "layer_mismatch=true",
  );
  await expect(diagram.locator('[data-proof="errors"]')).toContainText(
    "rope_mismatch=true",
  );
  await expect(diagram.locator('[data-proof="errors"]')).toContainText(
    "nonfinite_append=true",
  );
  await expect(diagram.locator('[data-proof="reset"]')).toContainText(
    "storage_unchanged=true",
  );
  await expect(diagram.locator("svg, canvas, path, polyline, line")).toHaveCount(
    0,
  );
  await expectDiagramContainment(page);

  const details = page.locator(".lesson-body details");
  await expect(details).toHaveCount(1);
  await details.locator("summary").click();
  await expect(details.locator("ol > li")).toHaveCount(8);
  await expect(details).toContainText(
    "Parameter identity is part of compatibility even when shapes agree",
  );
  await expectOrderedChapterNavigation(page, "en", chapterId, chapters);
  await expect(
    page.locator(
      'nav[data-chapter-navigation] a[data-chapter-direction="previous"]',
    ),
  ).toHaveAttribute("data-chapter-id", "36-temperature-top-k");
  await expect(
    page.locator('nav[data-chapter-navigation] a[data-chapter-direction="next"]'),
  ).toHaveCount(0);
  await expectNoOverflowOrClientScripts(page);
}

test.describe(
  "chapter 37 incremental attention vertical slice",
  { tag: chapterTag(chapterId) },
  () => {
    test("English publishes Chapter 37 while Russian remains complete through Chapter 7", async ({
      page,
    }) => {
      const english = await readOrderedCourseChapters(page, "en");
      expect(english).toHaveLength(37);
      expect(english[36]).toEqual(
        expect.objectContaining({
          chapterId,
          order: 37,
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

    test("the Rust-backed cache renders at desktop and narrow widths", async ({
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
        'figure[data-visualization-id="incremental-attention"]',
      );
      const toggle = diagram.locator("[data-diagram-full-view-toggle]");
      await expect(toggle).toHaveCount(1);
      await toggle.click();
      await page.waitForFunction(
        () =>
          document.fullscreenElement?.getAttribute("data-visualization-id") ===
          "incremental-attention",
      );
      await expect(diagram.locator("[data-cache-step]")).toHaveCount(3);
      await expect(diagram.locator("[data-cache-row]")).toHaveCount(12);
      await expectDiagramContainment(page);
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => document.fullscreenElement === null);
      await expect(toggle).toBeFocused();
    });

    test("text plus solid and double cues survive forced colors", async ({
      page,
    }) => {
      await page.emulateMedia({ forcedColors: "active" });
      await page.goto(chapterPath("en", chapterId));
      const diagram = page.locator(
        'figure[data-visualization-id="incremental-attention"]',
      );
      await expect(diagram.locator(".cue-list li")).toHaveText([
        "| retained earlier row - solid cue",
        "|| newly appended row - double cue",
        "= newest outputs match within tolerance",
      ]);
      await expect(
        diagram.locator(
          '[data-cache-step="2"] [data-head="0"] [data-cache-row="0"]',
        ),
      ).toHaveCSS("border-left-style", "solid");
      await expect(
        diagram.locator(
          '[data-cache-step="2"] [data-head="0"] [data-cache-row="2"]',
        ),
      ).toHaveCSS("border-left-style", "double");
      await expectDiagramContainment(page);
      await expectNoOverflowOrClientScripts(page);
    });

    test("RTL prose keeps technical values and cache order left-to-right", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(chapterPath("en", chapterId));
      const diagram = page.locator(
        'figure[data-visualization-id="incremental-attention"]',
      );
      await diagram.evaluate((node) => node.setAttribute("dir", "rtl"));
      await expect(diagram.locator("h4").first()).toHaveCSS("direction", "rtl");
      expect(
        await diagram
          .locator("[data-cache-step]")
          .evaluateAll((cards) =>
            cards.map((card) => card.getAttribute("data-cache-step")),
          ),
      ).toEqual(["0", "1", "2"]);
      expect(
        await diagram
          .locator('[data-cache-step="2"] [data-head="0"] [data-cache-row]')
          .evaluateAll((rows) =>
            rows.map((row) => row.getAttribute("data-cache-row")),
          ),
      ).toEqual(["0", "1", "2"]);
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

    test("the complete cache evidence renders without JavaScript", async ({
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
      await expect(page.locator("[data-cache-step]")).toHaveCount(3);
      await expect(page.locator("[data-head]")).toHaveCount(6);
      await expect(page.locator("[data-cache-row]")).toHaveCount(12);
      await expect(page.locator("[data-diagram-box]")).toHaveCount(21);
      await expect(page.locator("[data-diagram-scroll]")).toHaveCount(0);
      await expect(page.locator("[data-diagram-full-view-toggle]")).toHaveCount(
        0,
      );
      await expect(page.locator('[data-proof="reset"]')).toContainText(
        "storage_unchanged=true",
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
