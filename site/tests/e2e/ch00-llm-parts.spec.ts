import { expect, test, type Page } from "@playwright/test";

import {
  chapterPath,
  chapterTag,
  type CourseChapterLink,
  expectLocalizedChapterRoute,
  expectNoOverflowOrClientScripts,
  expectOrderedChapterNavigation,
  expectVisualizationDecision,
  readOrderedCourseChapters,
} from "./chapter-helpers";

const chapterId = "00-llm-parts";
const chapterTitle = "A map of a modern LLM";
const chapterDescription =
  "See how tokenization, embeddings, decoder blocks, attention, feed-forward layers, training, sampling, and caching fit together in a decoder-only LLM.";
const diagramId = "llm-parts-map";
const chapterHeadings = [
  "Trace one token before learning any details",
  "One objective connects all the blocks",
  "Read the notation",
  "A short road to the modern block diagram",
  "Freeze the topology as data",
  "Put every later lesson in one place",
  "Check your first mental model",
  "Start the implementation path",
] as const;

async function expectContainedDiagram(page: Page) {
  const problems = await page
    .locator(`figure[data-visualization-id="${diagramId}"]`)
    .evaluate((node) => {
      const figure = node as HTMLElement;
      const figureRect = figure.getBoundingClientRect();
      const issues: string[] = [];
      if (
        figureRect.left < -1 ||
        figureRect.right > document.documentElement.clientWidth + 1
      ) {
        issues.push("figure escapes the viewport");
      }
      for (const [index, candidate] of Array.from(
        figure.querySelectorAll<HTMLElement>("[data-diagram-box]"),
      ).entries()) {
        const rect = candidate.getBoundingClientRect();
        const style = getComputedStyle(candidate);
        if (
          rect.width <= 0 ||
          rect.height <= 0 ||
          rect.left < figureRect.left - 1 ||
          rect.right > figureRect.right + 1
        ) {
          issues.push(`box ${index} is outside the figure`);
        }
        if (
          [style.borderTopStyle, style.borderRightStyle, style.borderBottomStyle, style.borderLeftStyle]
            .some((value) => value === "none")
        ) {
          issues.push(`box ${index} lacks a complete border`);
        }
        if ([style.overflowX, style.overflowY].some((value) => ["hidden", "clip"].includes(value))) {
          issues.push(`box ${index} conceals overflow`);
        }
        if (
          candidate.scrollWidth > candidate.clientWidth + 1 ||
          candidate.scrollHeight > candidate.clientHeight + 1
        ) {
          issues.push(`box ${index} does not contain its content`);
        }
      }
      return issues;
    });
  expect(problems).toEqual([]);
}

async function expectChapter(page: Page) {
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale: "en",
    order: 0,
    revision: 1,
    revisionLabel: "Content revision",
    title: chapterTitle,
    equivalentLocales: ["en"],
    fallbackRouteSuffix: "/course/",
  });
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    chapterDescription,
  );
  expect(
    await page.locator(".lesson-body h2").allInnerTexts(),
  ).toEqual(chapterHeadings);
  await expectVisualizationDecision(page, {
    decision: "useful",
    id: diagramId,
  });
  const diagram = page.locator(`figure[data-visualization-id="${diagramId}"]`);
  await expect(diagram.getByRole("heading", { name: "The next-token inference path" })).toBeVisible();
  await expect(diagram.getByRole("heading", { name: "Inside every pre-norm decoder block" })).toBeVisible();
  await expect(diagram.getByRole("heading", { name: "Learning and evaluating the same weights" })).toBeVisible();
  await expect(diagram.locator("[data-part-id]")).toHaveCount(19);
  await expect(diagram.locator("[data-diagram-box]")).toHaveCount(19);
  await expect(diagram.locator('[data-part-id="numeric-core"]')).toHaveAttribute(
    "data-part-path",
    "both",
  );
  await expect(diagram.locator('[data-part-id="numeric-core"]')).toContainText(
    "record gradients only while learning",
  );
  await expect(diagram.locator("[data-learning-reuse]")).toContainText(
    "text → tokenizer → embeddings → decoder blocks → vocabulary head",
  );
  await expect(page.locator(".lesson-body")).toContainText(
    "Training shifts targets by one position, so this allowed diagonal never exposes the token being predicted.",
  );
  await expect(page.locator(".lesson-body")).toContainText(
    /ID[’']s embedding/,
  );
  await expect(page.locator(".lesson-body")).toContainText(
    "does not detokenize and tokenize the whole growing sequence again",
  );
  await expect(diagram.locator('[data-part-id="sampler"]')).toContainText(
    "token ID to embeddings",
  );
  await expect(diagram.locator("ol.inference-flow")).toHaveCount(1);
  await expect(diagram.locator("ol.decoder-flow")).toHaveCount(1);
  await expect(diagram.locator("ol.learning-flow")).toHaveCount(1);
  await expect(diagram.locator(".learning-flow")).toHaveAttribute("start", "6");
  const stateSymbols = diagram.locator(".state-symbol");
  await expect(stateSymbols).toHaveCount(19);
  expect(
    await stateSymbols.evaluateAll((symbols) =>
      symbols.every((symbol) => symbol.getAttribute("aria-hidden") === "true"),
    ),
  ).toBe(true);
  const chapterLinks = diagram.locator("a[data-chapter-link]");
  await expect(chapterLinks).toHaveCount(43);
  await expect(
    diagram.getByRole("link", {
      name: "Ch 01 — Text units and vocabulary IDs",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    diagram.getByRole("link", {
      name: "Ch 39 — Run the whole tiny LLM",
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await chapterLinks.evaluateAll((links) =>
      links.every((link) => {
        const visible = (link as HTMLElement).innerText.trim();
        const name = link.getAttribute("aria-label") ?? "";
        return /^Ch \d{2} — \S/.test(name) && name.startsWith(visible);
      }),
    ),
  ).toBe(true);
  expect(
    await diagram.locator(".learning-flow > li").evaluateAll((cards) =>
      cards.map((card) => ({
        metadata: card.getAttribute("data-flow-order"),
        visible: card.querySelector("header .state-symbol")?.textContent?.trim(),
      })),
    ),
  ).toEqual([
    { metadata: "6", visible: "6" },
    { metadata: "7", visible: "7" },
    { metadata: "8", visible: "8" },
    { metadata: "9", visible: "9" },
  ]);
  const destinations = await chapterLinks.evaluateAll((links) =>
    links.map((link) => link.getAttribute("data-chapter-link") ?? ""),
  );
  expect(new Set(destinations).size).toBe(39);
  for (let order = 1; order <= 39; order += 1) {
    const prefix = `${order.toString().padStart(2, "0")}-`;
    expect(destinations.some((chapter) => chapter.startsWith(prefix))).toBe(true);
  }
  await expect(
    page.locator('.lesson-body annotation[encoding="application/x-tex"]').filter({
      hasText: String.raw`P_\theta(z_{1:T})=\prod_{t=1}^{T}P_\theta(z_t\mid z_{<t})`,
    }),
  ).toHaveCount(1);
  await expectContainedDiagram(page);
  await expectNoOverflowOrClientScripts(page);
}

async function expectCompleteChapterLinks(
  page: Page,
  courseChapters: readonly CourseChapterLink[],
) {
  const expectedById = new Map(
    courseChapters
      .filter(({ order }) => order > 0)
      .map((chapter) => [chapter.chapterId, chapter]),
  );
  const diagram = page.locator(`figure[data-visualization-id="${diagramId}"]`);
  const links = await diagram.locator("a[data-chapter-link]").evaluateAll((nodes) =>
    nodes.map((node) => ({
      chapterId: node.getAttribute("data-chapter-link") ?? "",
      href: node.getAttribute("href") ?? "",
      label: node.getAttribute("aria-label") ?? "",
      visible: (node as HTMLElement).innerText.trim(),
    })),
  );
  expect(links).toHaveLength(43);
  for (const link of links) {
    const chapter = expectedById.get(link.chapterId);
    expect(chapter, `unknown diagram destination ${link.chapterId}`).toBeDefined();
    const visible = `Ch ${chapter!.order.toString().padStart(2, "0")}`;
    expect(link.visible).toBe(visible);
    expect(link.label).toBe(`${visible} — ${chapter!.title}`);
    expect(link.href).toBe(chapterPath("en", chapter!.chapterId));
  }

  const listProblems = await diagram.locator(".course-diagram__link-list").evaluateAll((lists) =>
    lists.flatMap((list, listIndex) => {
      const items = Array.from(list.children);
      const issues: string[] = [];
      items.forEach((item, itemIndex) => {
        const separators = item.querySelectorAll(":scope > .course-diagram__link-separator");
        const expected = itemIndex < items.length - 1 ? 1 : 0;
        if (separators.length !== expected) issues.push(`list ${listIndex} item ${itemIndex}`);
        separators.forEach((separator) => {
          if (separator.textContent !== "," || separator.getAttribute("aria-hidden") !== "true") {
            issues.push(`list ${listIndex} separator ${itemIndex}`);
          }
        });
        if (item.querySelector("a .course-diagram__link-separator")) {
          issues.push(`list ${listIndex} nested separator ${itemIndex}`);
        }
      });
      return issues;
    }),
  );
  expect(listProblems).toEqual([]);

  const cache = diagram.locator('[data-part-id="kv-cache"]');
  await expect(cache.locator("a[data-chapter-link]")).toHaveCount(2);
  const cacheSeparator = cache.locator(":scope .course-diagram__link-separator");
  await expect(cacheSeparator).toHaveCount(1);
  await expect(cacheSeparator).toHaveAttribute("aria-hidden", "true");
  await expect(cacheSeparator).toHaveText(",");
  expect(
    await cacheSeparator.evaluate((separator) => {
      const previousLink = separator.previousElementSibling;
      if (!(previousLink instanceof HTMLAnchorElement)) return Number.POSITIVE_INFINITY;
      return Math.abs(separator.getBoundingClientRect().left - previousLink.getBoundingClientRect().right);
    }),
  ).toBeLessThanOrEqual(0.5);
  await expect(cache.locator("a .course-diagram__link-separator")).toHaveCount(0);
}

test.describe(
  "Chapter 0 LLM-parts orientation",
  { tag: chapterTag(chapterId) },
  () => {
    test("English starts with Chapter 0 while Russian still starts with Chapter 1", async ({
      page,
    }) => {
      const english = await readOrderedCourseChapters(page, "en", {
        includeIntroduction: true,
      });
      expect(english).toHaveLength(40);
      expect(english[0]).toEqual(
        expect.objectContaining({ chapterId, order: 0, title: chapterTitle }),
      );
      await expect(page.locator("ol.course-list")).toHaveAttribute("start", "0");
      const implementationChapters = await readOrderedCourseChapters(page, "en");
      expect(implementationChapters).toHaveLength(39);
      expect(implementationChapters[0].chapterId).toBe("01-text-units");
      const russian = await readOrderedCourseChapters(page, "ru", {
        includeIntroduction: true,
      });
      expect(russian).toHaveLength(7);
      expect(russian[0].chapterId).toBe("01-text-units");
      await expect(page.locator("ol.course-list")).toHaveAttribute("start", "1");
      const missing = await page.goto(chapterPath("ru", chapterId));
      expect(missing?.status()).toBe(404);
    });

    test("the linked mental map remains complete at desktop and narrow widths", async ({
      page,
    }) => {
      const chapters = await readOrderedCourseChapters(page, "en", {
        includeIntroduction: true,
      });
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.goto(chapterPath("en", chapterId));
      await expectChapter(page);
      await expectCompleteChapterLinks(page, chapters);
      await expectOrderedChapterNavigation(page, "en", chapterId, chapters);
      await expect(
        page.locator('a[data-chapter-direction="next"]'),
      ).toHaveAttribute("data-chapter-id", "01-text-units");
      await expect(
        page.locator('a[data-chapter-direction="previous"]'),
      ).toHaveCount(0);

      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      await expectChapter(page);
      await expect(
        page.locator(`[data-visualization-id="${diagramId}"] [data-diagram-full-view-toggle]`),
      ).toHaveCount(0);
    });

    test("the shared full-view control expands the same figure and restores focus", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.goto(chapterPath("en", chapterId));
      const diagram = page.locator(`figure[data-visualization-id="${diagramId}"]`);
      const toggle = diagram.locator("[data-diagram-full-view-toggle]");
      await expect(toggle).toHaveCount(1);
      await toggle.click();
      await page.waitForFunction(
        (id) => document.fullscreenElement?.getAttribute("data-visualization-id") === id,
        diagramId,
      );
      await expect(page.locator(`figure[data-visualization-id="${diagramId}"]`)).toHaveCount(1);
      await expect(diagram.locator("[data-diagram-box]")).toHaveCount(19);
      await expectContainedDiagram(page);
      const panels = await diagram.locator(":scope > section").evaluateAll((sections) =>
        sections.map((section) => {
          const rect = section.getBoundingClientRect();
          return { top: rect.top, left: rect.left, right: rect.right };
        }),
      );
      expect(panels).toHaveLength(3);
      expect(
        Math.max(...panels.map(({ top }) => top)) -
          Math.min(...panels.map(({ top }) => top)),
      ).toBeLessThanOrEqual(1);
      expect(panels[0]!.right).toBeLessThanOrEqual(panels[1]!.left);
      expect(panels[1]!.right).toBeLessThanOrEqual(panels[2]!.left);
      const splitHeadingWords = await diagram.locator("h5").evaluateAll((headings) => {
        const split: string[] = [];
        for (const heading of headings) {
          const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
          while (walker.nextNode()) {
            const node = walker.currentNode as Text;
            for (const match of node.data.matchAll(/\S+/g)) {
              const range = document.createRange();
              range.setStart(node, match.index ?? 0);
              range.setEnd(node, (match.index ?? 0) + match[0].length);
              if (range.getClientRects().length > 1) {
                split.push(match[0]);
              }
            }
          }
        }
        return split;
      });
      expect(splitHeadingWords).toEqual([]);
      const travel = await diagram.evaluate((node) => ({
        horizontal: node.scrollWidth - node.clientWidth,
        vertical: node.scrollHeight - node.clientHeight,
        verticalLimit: Math.ceil(node.clientHeight * 0.2),
      }));
      expect(travel.horizontal).toBe(0);
      expect(travel.vertical).toBeLessThanOrEqual(travel.verticalLimit);
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => document.fullscreenElement === null);
      await expect(toggle).toBeFocused();
    });

    test("the complete linked map remains available without JavaScript", async ({
      browser,
    }, testInfo) => {
      const context = await browser.newContext({
        javaScriptEnabled: false,
        baseURL: String(testInfo.project.use.baseURL),
      });
      const page = await context.newPage();
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(chapterPath("en", chapterId));
      await expect(page.getByRole("heading", { level: 1, name: chapterTitle })).toBeVisible();
      await expect(page.locator(`[data-visualization-id="${diagramId}"]`)).toHaveCount(1);
      await expect(page.locator("a[data-chapter-link]")).toHaveCount(43);
      await expect(page.locator("[data-diagram-full-view-toggle]")).toHaveCount(0);
      await expectContainedDiagram(page);
      await expectNoOverflowOrClientScripts(page);
      await context.close();
    });
  },
);
