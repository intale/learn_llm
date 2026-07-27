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

const chapterId = "36-temperature-top-k";
const chapterTitle = "Shape the choices, then draw once";
const chapterDescription =
  "Learn how positive temperature, stable top-k filtering, and one seeded categorical draw turn decoder logits into reproducible uncached LLM generation.";
const diagramTitle = "Temperature reshapes; top-k removes; one draw selects";
const diagramDescription =
  "The exact Rust trace compares three temperatures, exposes a stable tied boundary, follows eight seeded half-open intervals, and proves checkpoint generation stops.";
const chapterHeadings = [
  "Start with four logits and make every choice visible",
  "Filter the candidate set, then renormalize",
  "Keep logits, candidates, and probabilities distinct",
  "From constrained search to open-ended LLM sampling",
  "Validate first, rank stably, and advance the random stream once",
  "Read the distribution from left to right",
  "Predict before revealing the trace",
  "Preserve this uncached sequence when generation becomes incremental",
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
    'figure[data-visualization-id="temperature-top-k"]',
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
  expect(result.boxCount).toBe(7);
  expect(result.scrollerCount).toBe(1);
  expect(result.scrollWidth).toBeLessThanOrEqual(result.clientWidth + 2);
  const scroller = diagram.locator("[data-diagram-scroll]");
  await scroller.focus();
  await expect(scroller).toBeFocused();
}

async function expectProbabilityBarGeometry(page: Page) {
  const diagram = page.locator(
    'figure[data-visualization-id="temperature-top-k"]',
  );
  const expectations = [
    { tau: "0.500000", percent: "77.580349" },
    { tau: "1.000000", percent: "53.444665" },
    { tau: "2.000000", percent: "38.745562" },
  ] as const;
  for (const { tau, percent } of expectations) {
    const item = diagram.locator(
      '[data-temperature="' + tau + '"] [data-token-id="3"]',
    );
    const fill = item.locator("[data-probability-fill]");
    await expect(fill).toHaveAttribute("data-probability-percent", percent);
    const geometry = await item.evaluate((node) => {
      const track = node.querySelector<HTMLElement>(
        "[data-probability-track]",
      );
      const fill = node.querySelector<HTMLElement>("[data-probability-fill]");
      if (!track || !fill) throw new Error("probability bar is incomplete");
      const trackRect = track.getBoundingClientRect();
      const fillRect = fill.getBoundingClientRect();
      return {
        authored: fill.style.getPropertyValue("--probability-percent").trim(),
        ratio:
          trackRect.width === 0 ? -1 : (fillRect.width / trackRect.width) * 100,
        trackBorder: getComputedStyle(track).borderBottomStyle,
        fillBorder: getComputedStyle(fill).borderBottomStyle,
      };
    });
    expect(geometry.authored).toBe(percent + "%");
    expect(Math.abs(geometry.ratio - Number(percent))).toBeLessThan(0.2);
    expect(geometry.trackBorder).toBe("solid");
    expect(geometry.fillBorder).toBe("double");
  }
}

async function expectChapterContent(
  page: Page,
  chapters: readonly CourseChapterLink[],
) {
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale: "en",
    order: 36,
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
    "q_i^{(\\tau,k)}=\\frac{\\mathbf{1}[i\\in K_k]\\exp(\\ell_i/\\tau)}{\\sum_j\\mathbf{1}[j\\in K_k]\\exp(\\ell_j/\\tau)}",
    "\\tau=0.5",
    "q_1=0.268941421370",
    "1\\le k\\le V",
    "\\tau\\to0^+",
    "\\tau=0",
    "[a_i,b_i)",
    "a_i\\le u<b_i",
    "[0.211941557617,0.423883115234)",
    "i_{\\mathrm{EOS}}=4",
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
    "not a universal quality guarantee, a hallucination defense, or the endpoint of decoding research",
  );
  await expect(
    page.locator('.lesson-body a[href="https://arxiv.org/pdf/1805.04833"]'),
  ).toHaveCount(1);
  await expect(
    page.locator(
      '.lesson-body a[href="https://cdn.openai.com/better-language-models/language-models.pdf"]',
    ),
  ).toHaveCount(1);
  await expect(
    page.locator('.lesson-body a[href="https://arxiv.org/pdf/1904.09751"]'),
  ).toHaveCount(1);
  await expect(page.locator("figure.rust-source")).toHaveCount(5);
  await expectVisualizationDecision(page, {
    decision: "useful",
    id: "temperature-top-k",
  });

  const diagram = page.locator(
    'figure[data-visualization-id="temperature-top-k"]',
  );
  await expect(diagram).toHaveAccessibleName(diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(diagramDescription);
  await expect(diagram).toHaveAttribute("data-diagram-style", "course-v1");
  await expect(diagram.locator("[data-temperature]")).toHaveCount(3);
  await expect(diagram.locator("[data-temperature] [data-token-id]")).toHaveCount(12);
  await expect(diagram.locator("[data-top-k-token]")).toHaveCount(4);
  await expect(diagram.locator("[data-draw-index]")).toHaveCount(8);
  await expect(diagram.locator("[data-draw-policy]")).toHaveAttribute(
    "data-top-k",
    "3",
  );
  await expect(diagram.locator("[data-draw-policy]")).toHaveAttribute(
    "data-seed",
    "36",
  );
  await expect(diagram.locator("[data-draw-policy]")).toHaveAttribute(
    "data-vocabulary",
    "4",
  );
  await expect(diagram.locator("[data-draw-policy]")).toContainText(
    "survivors=[3,1,2]",
  );
  await expect(diagram.locator('[data-fixture="checkpoint"]')).toHaveAttribute(
    "data-vocabulary",
    "5",
  );
  await expect(diagram.locator("[data-proof]")).toHaveCount(4);
  await expect(diagram.locator("[data-diagram-box]")).toHaveCount(7);
  await expect(diagram.locator("table")).toHaveCount(1);
  await expect(diagram.locator("tbody tr")).toHaveCount(4);
  await expect(diagram.locator('[data-top-k-token="1"]')).toHaveAttribute(
    "data-retained",
    "true",
  );
  await expect(diagram.locator('[data-top-k-token="2"]')).toHaveAttribute(
    "data-retained",
    "false",
  );
  await expect(diagram.locator('[data-draw-index="1"]')).toHaveAttribute(
    "data-selected-token",
    "2",
  );
  await expect(diagram.locator('[data-proof="loaded"]')).toContainText(
    "prefixes=[1,2]",
  );
  await expect(diagram.locator('[data-proof="loaded"]')).toContainText(
    "calls=2",
  );
  await expect(diagram.locator('[data-proof="loaded"]')).toContainText(
    "eos=none",
  );
  await expect(diagram.locator('[data-proof="eos"]')).toContainText("eos=4");
  await expect(diagram.locator('[data-proof="errors"]')).toContainText(
    "nonfinite_logit=true",
  );
  await expect(diagram.locator('[data-proof="errors"]')).toContainText(
    "rng_unchanged=true",
  );
  await expect(diagram.locator("svg, canvas, path, polyline, line")).toHaveCount(
    0,
  );
  await expectDiagramContainment(page);
  await expectProbabilityBarGeometry(page);

  const details = page.locator(".lesson-body details");
  await expect(details).toHaveCount(1);
  await details.locator("summary").click();
  await expect(details.locator("ol > li")).toHaveCount(8);
  await expect(details).toContainText(
    "survives because equal logits use ascending token ID",
  );
  await expectOrderedChapterNavigation(page, "en", chapterId, chapters);
  await expect(
    page.locator(
      'nav[data-chapter-navigation] a[data-chapter-direction="previous"]',
    ),
  ).toHaveAttribute("data-chapter-id", "35-checkpoints");
  await expect(
    page.locator('nav[data-chapter-navigation] a[data-chapter-direction="next"]'),
  ).toHaveAttribute("data-chapter-id", "37-incremental-attention");
  await expectNoOverflowOrClientScripts(page);
}

test.describe(
  "chapter 36 temperature and top-k generation vertical slice",
  { tag: chapterTag(chapterId) },
  () => {
    test("English publishes Chapter 36 while Russian remains complete through Chapter 7", async ({
      page,
    }) => {
      const english = await readOrderedCourseChapters(page, "en");
      expect(english).toHaveLength(38);
      expect(english[35]).toEqual(
        expect.objectContaining({
          chapterId,
          order: 36,
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

    test("the Rust-backed sampler renders at desktop and narrow widths", async ({
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
        'figure[data-visualization-id="temperature-top-k"]',
      );
      const toggle = diagram.locator("[data-diagram-full-view-toggle]");
      await expect(toggle).toHaveCount(1);
      await toggle.click();
      await page.waitForFunction(
        () =>
          document.fullscreenElement?.getAttribute("data-visualization-id") ===
          "temperature-top-k",
      );
      await expect(diagram.locator("[data-temperature]")).toHaveCount(3);
      await expect(diagram.locator("[data-draw-index]")).toHaveCount(8);
      await expectDiagramContainment(page);
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => document.fullscreenElement === null);
      await expect(toggle).toBeFocused();
    });

    test("text plus solid, dashed, and double cues survive forced colors", async ({
      page,
    }) => {
      await page.emulateMedia({ forcedColors: "active" });
      await page.goto(chapterPath("en", chapterId));
      const diagram = page.locator(
        'figure[data-visualization-id="temperature-top-k"]',
      );
      await expect(diagram.locator(".cue-list li")).toHaveText([
        "✓ retained — double cue",
        "× removed — dashed cue",
        "→ selected by the draw",
      ]);
      await expect(
        diagram.locator('[data-top-k-token="1"] > :first-child'),
      ).toHaveCSS("border-left-style", "double");
      await expect(
        diagram.locator('[data-top-k-token="2"] > :first-child'),
      ).toHaveCSS("border-left-style", "dashed");
      await expectProbabilityBarGeometry(page);
      await expectNoOverflowOrClientScripts(page);
    });

    test("RTL prose keeps technical values and evidence order left-to-right", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(chapterPath("en", chapterId));
      const diagram = page.locator(
        'figure[data-visualization-id="temperature-top-k"]',
      );
      await diagram.evaluate((node) => node.setAttribute("dir", "rtl"));
      await expect(diagram.locator("h4").first()).toHaveCSS("direction", "rtl");
      expect(
        await diagram
          .locator("[data-temperature]")
          .evaluateAll((cards) =>
            cards.map((card) => card.getAttribute("data-temperature")),
          ),
      ).toEqual(["0.500000", "1.000000", "2.000000"]);
      expect(
        await diagram
          .locator("code, bdi, [data-inline-math]")
          .evaluateAll((nodes) =>
            nodes.every((node) => getComputedStyle(node).direction === "ltr"),
          ),
      ).toBe(true);
      await expectNoOverflowOrClientScripts(page);
    });

    test("the complete sampling evidence renders without JavaScript", async ({
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
      await expect(page.locator("[data-temperature]")).toHaveCount(3);
      await expect(page.locator("[data-top-k-token]")).toHaveCount(4);
      await expect(page.locator("[data-draw-index]")).toHaveCount(8);
      await expect(page.locator("[data-draw-policy]")).toHaveAttribute(
        "data-top-k",
        "3",
      );
      await expect(page.locator("[data-diagram-box]")).toHaveCount(7);
      await expect(page.locator("[data-diagram-scroll]")).toHaveCount(1);
      await expect(page.locator("[data-diagram-full-view-toggle]")).toHaveCount(
        0,
      );
      await expect(page.locator('[data-proof="loaded"]')).toContainText(
        "prefixes=[1,2]",
      );
      await expect(page.locator('[data-proof="loaded"]')).toContainText(
        "eos=none",
      );
      await expect(page.locator('[data-proof="eos"]')).toContainText("eos=4");
      await expectNoOverflowOrClientScripts(page);
      await context.close();
    });
  },
);
