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
type ChapterLocale = "en" | "ru";
const locales = ["en", "ru"] as const satisfies readonly ChapterLocale[];
const copy = {
  en: {
    revisionLabel: "Content revision",
    title: "Stack a decoder and tie its vocabulary head",
    description:
      "Learn how token embeddings, repeated causal blocks, final RMSNorm, and one tied vocabulary table produce differentiable next-token logits.",
    headings: [
      "Predict the axes before tracing the decoder",
      "Reuse the embedding table at the far end of the stack",
      "Distinguish one parameter from its two uses",
      "From separate recurrent components to one decoder stack",
      "Make the complete model boundary explicit in Rust",
      "Inspect one table at both ends of the forward path",
      "Test axes, ownership, causality, and failures",
      "Train this exact model at the next boundary",
    ],
    diagramTitle:
      "Follow one tied vocabulary table through a complete decoder",
    diagramDescription:
      "Read exact Rust-authored token rows through lookup, two distinct causal blocks, final RMSNorm, and the transpose projection back to five vocabulary logits.",
    cues: [
      "Double edge: repeated blocks with distinct weights",
      "Dashed edge: two uses of one parameter",
      "Double underline: verified Rust evidence",
    ],
    unchanged: "Bitwise unchanged",
    changed: "Numerically changed",
    stageRows: [
      "Embedding lookup",
      "After decoder block 1",
      "After decoder block 2",
      "After final RMSNorm",
    ],
    detailsFragment: "The output role can contribute to every vocabulary row",
    historyFragments: [
      "making its tied-head choice explicit rather than universal",
      "without claiming that the tiny fixture reproduces",
    ],
  },
  ru: {
    revisionLabel: "Версия материала",
    title: "Соберите декодер и свяжите веса проекции на словарь",
    description:
      "Разберитесь, как эмбеддинги токенов, повторяющиеся каузальные блоки, итоговый RMSNorm и одна общая таблица словаря создают дифференцируемые логиты следующего токена.",
    headings: [
      "Предскажите оси до трассировки декодера",
      "Повторно используйте таблицу эмбеддингов в конце стека",
      "Различайте один параметр и два его применения",
      "От раздельных рекуррентных компонентов к единому стеку декодера",
      "Явно задайте полную границу модели на Rust",
      "Проследите одну таблицу в начале и конце прямого прохода",
      "Проверьте оси, владение, каузальность и ошибки",
      "На следующем шаге обучите именно эту модель",
    ],
    diagramTitle: "Проследите общую таблицу словаря через весь декодер",
    diagramDescription:
      "Проследите точные строки признаков для токенов из вычислений Rust через выбор эмбеддингов, два разных каузальных блока, итоговый RMSNorm и транспонированную проекцию обратно в пять логитов словаря.",
    cues: [
      "Двойная граница: разные веса повторяющихся блоков",
      "Пунктирная граница: две роли одного параметра",
      "Двойное подчёркивание: проверено вычислениями Rust",
    ],
    unchanged: "Побитово без изменений",
    changed: "Численно изменилось",
    stageRows: [
      "Выбор эмбеддинга",
      "После блока декодера 1",
      "После блока декодера 2",
      "После итогового RMSNorm",
    ],
    detailsFragment: "Выходная роль может внести вклад в каждую строку словаря",
    historyFragments: [
      "не объявляются обязательными для всех моделей",
      "не выдаёт маленький пример",
    ],
  },
} as const;

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
  locale: ChapterLocale,
) {
  const localized = copy[locale];
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale,
    order: 32,
    revision: 3,
    revisionLabel: localized.revisionLabel,
    title: localized.title,
    equivalentLocales: locales,
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
  for (const fragment of localized.historyFragments) {
    expect(lessonText.toLocaleLowerCase(locale)).toContain(
      fragment.toLocaleLowerCase(locale),
    );
  }
  expect(lessonText).not.toMatch(
    /TypeScript|static HTML|JavaScript|trace grammar|site parser|page labels|programming languages/i,
  );
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
  await expect(diagram).toHaveAccessibleName(localized.diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(localized.diagramDescription);
  await expect(diagram).toHaveAttribute("data-diagram-style", "course-v1");
  await expect(diagram.locator("[data-model-stage]")).toHaveCount(6);
  await expect(diagram.locator("[data-diagram-box]")).toHaveCount(16);
  await expect(diagram.locator("[data-stage-evidence]")).toHaveCount(4);
  await expect(diagram.locator("[data-stage-evidence] th")).toHaveText(
    localized.stageRows,
  );
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
    localized.unchanged,
  );
  await expect(diagram.locator('[data-prefix-position="1"]')).toContainText(
    localized.unchanged,
  );
  await expect(diagram.locator('[data-prefix-position="2"]')).toContainText(
    localized.changed,
  );
  await expectDiagramContainment(page);

  const details = page.locator(".lesson-body details");
  await expect(details).toHaveCount(1);
  await details.locator("summary").click();
  await expect(details.locator("ol > li")).toHaveCount(6);
  await expect(details).toContainText(localized.detailsFragment);
  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expect(
    page.locator(
      'nav[data-chapter-navigation] a[data-chapter-direction="previous"]',
    ),
  ).toHaveAttribute("data-chapter-id", "31-decoder-block");
  await expect(
    page.locator(
      'nav[data-chapter-navigation] a[data-chapter-direction="next"]',
    ),
  ).toHaveAttribute("data-chapter-id", "33-training-selection");
  await expectNoOverflowOrClientScripts(page);
}

test.describe(
  "chapter 32 complete tied decoder model vertical slice",
  { tag: chapterTag(chapterId) },
  () => {
    test("English and Russian publish reciprocal Chapter 32 routes", async ({
      page,
    }) => {
      for (const locale of locales) {
        const chapters = await readOrderedCourseChapters(page, locale);
        expect(chapters[31]).toEqual(
          expect.objectContaining({
            chapterId,
            order: 32,
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
        ).toHaveAttribute("href", new RegExp(`/${other}/course/${chapterId}/$`));
      }
    });

    test("both complete lessons and contained diagrams render at desktop and narrow widths", async ({
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

    test("full view reuses the localized semantic figure and restores focus", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      const controlNames: string[] = [];
      for (const locale of locales) {
        await page.goto(chapterPath(locale, chapterId));
        const diagram = page.locator(
          'figure[data-visualization-id="tied-decoder-model-flow"]',
        );
        const toggle = diagram.locator("[data-diagram-full-view-toggle]");
        await expect(toggle).toHaveCount(1);
        controlNames.push((await toggle.getAttribute("aria-label")) ?? "");
        const before = await diagram.evaluate((node) => ({
          boxes: node.querySelectorAll("[data-diagram-box]").length,
          figures: document.querySelectorAll(
            'figure[data-visualization-id="tied-decoder-model-flow"]',
          ).length,
          scrollers: node.querySelectorAll("[data-diagram-scroll]").length,
          tables: node.querySelectorAll("table").length,
        }));
        await toggle.click();
        await page.waitForFunction(
          () =>
            document.fullscreenElement?.getAttribute("data-visualization-id") ===
            "tied-decoder-model-flow",
        );
        await page.evaluate(() => document.fonts.ready);
        const after = await diagram.evaluate((node) => ({
          boxes: node.querySelectorAll("[data-diagram-box]").length,
          debt: node.scrollWidth - node.clientWidth,
          figures: document.querySelectorAll(
            'figure[data-visualization-id="tied-decoder-model-flow"]',
          ).length,
          regions: Array.from(
            node.querySelectorAll<HTMLElement>("[data-diagram-scroll]"),
          ).map((region) => ({
            debt: region.scrollWidth - region.clientWidth,
            name: region.getAttribute("aria-label"),
          })),
          scrollers: node.querySelectorAll("[data-diagram-scroll]").length,
          tables: node.querySelectorAll("table").length,
          verticalViewports: node.scrollHeight / node.clientHeight,
        }));
        expect({
          boxes: after.boxes,
          figures: after.figures,
          scrollers: after.scrollers,
          tables: after.tables,
        }).toEqual(before);
        expect(after.debt).toBeLessThanOrEqual(2);
        expect(after.regions.filter(({ debt }) => debt > 320)).toEqual([]);
        expect(
          after.verticalViewports,
          `${locale} full-view regions: ${JSON.stringify(after.regions)}`,
        ).toBeLessThanOrEqual(3);
        await expectDiagramContainment(page);
        await page.keyboard.press("Escape");
        await page.waitForFunction(() => document.fullscreenElement === null);
        await expect(toggle).toBeFocused();
      }
      expect(new Set(controlNames).size).toBe(locales.length);
    });

    test("repeated, tied, and verified cues survive forced colors", async ({
      page,
    }) => {
      await page.emulateMedia({ forcedColors: "active" });
      for (const locale of locales) {
        await page.goto(chapterPath(locale, chapterId));
        const diagram = page.locator(
          'figure[data-visualization-id="tied-decoder-model-flow"]',
        );
        await expect(diagram.locator(".cue-list li")).toHaveText(
          copy[locale].cues,
        );
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
        await expectDiagramContainment(page);
        await expectNoOverflowOrClientScripts(page);
      }
    });

    test("RTL prose keeps formulas, trace values, and vocabulary order left-to-right", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      for (const locale of locales) {
        await page.goto(chapterPath(locale, chapterId));
        const diagram = page.locator(
          'figure[data-visualization-id="tied-decoder-model-flow"]',
        );
        await diagram.evaluate((node) => node.setAttribute("dir", "rtl"));
        await expect(diagram.locator("h4").first()).toHaveCSS(
          "direction",
          "rtl",
        );
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
        await expectDiagramContainment(page);
        await expectNoOverflowOrClientScripts(page);
      }
    });

    test("the lesson and exact decoder-model trace render without JavaScript", async ({
      browser,
    }, testInfo) => {
      const context = await browser.newContext({
        javaScriptEnabled: false,
        baseURL: String(testInfo.project.use.baseURL),
      });
      const page = await context.newPage();
      for (const locale of locales) {
        await page.goto(chapterPath(locale, chapterId));
        await expect(
          page.getByRole("heading", { level: 1, name: copy[locale].title }),
        ).toBeVisible();
        await expect(page.locator("[data-model-stage]")).toHaveCount(6);
        await expect(page.locator("[data-stage-evidence]")).toHaveCount(4);
        await expect(page.locator("[data-logit-token]")).toHaveCount(3);
        await expect(page.locator("[data-shared-parameter]")).toContainText(
          "token_embedding.weight",
        );
        await expect(page.locator('[data-prefix-position="0"]')).toContainText(
          copy[locale].unchanged,
        );
        await expect(page.locator('[data-prefix-position="2"]')).toContainText(
          copy[locale].changed,
        );
        await expect(page.locator("[data-diagram-full-view-toggle]")).toHaveCount(
          0,
        );
        await expectDiagramContainment(page);
        await expectNoOverflowOrClientScripts(page);
      }
      await context.close();
    });
  },
);
