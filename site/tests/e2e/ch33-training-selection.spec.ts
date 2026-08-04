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
type ChapterLocale = "en" | "ru";
const locales = ["en", "ru"] as const satisfies readonly ChapterLocale[];
const copy = {
  en: {
    revisionLabel: "Content revision",
    title: "Train every step, select with validation",
    description:
      "Learn how a decoder training loop orders backpropagation, gradient clipping, scheduled AdamW updates, graph-free validation, and checkpoint selection without using test data.",
    headings: [
      "Plan every update before you train",
      "Update on train, choose on validation",
      "Keep steps, gradients, and partitions distinct",
      "From training-only reports to validation-selected LLM checkpoints",
      "Represent the complete training plan explicitly in Rust",
      "Read measured checkpoints without inventing a curve",
      "Test the information boundary and state ownership",
      "Freeze the selected decoder for one test pass",
    ],
    diagramTitle: "Separate updates from validation-based selection",
    diagramDescription:
      "Follow six ordered operations through eight measured updates, then compare ten isolated train and validation measurements at five checkpoints without inventing a curve between them.",
    selectedCell: "Selected",
    cues: [
      "● Circle: measured training loss",
      "◆ Diamond: measured validation loss",
      "◎ Double underline: selected validation state",
      "↔ Gaps contain no measured values or interpolated line",
    ],
    detailsFragment: "The first loss equal to the minimum wins",
    historyFragments: [
      "These training practices form part of the road to modern LLMs",
      "local teaching choices, not universal properties of LLM training",
    ],
    executionFragment:
      "The method then returns the new optimizer step number, which the trainer compares directly with the planned update index.",
  },
  ru: {
    revisionLabel: "Версия материала",
    title: "Выполните все шаги обучения и выберите модель по валидации",
    description:
      "Разберитесь, как цикл обучения декодера упорядочивает обратное распространение, ограничение нормы градиента, шаги AdamW по расписанию, валидацию без записи графа и выбор состояния без обращения к тестовым данным.",
    headings: [
      "Задайте весь план до начала обучения",
      "Обновляйте по обучающей выборке, выбирайте по валидационной",
      "Не смешивайте шаги, градиенты и роли выборок",
      "От отчёта по обучению к контрольной точке LLM, выбранной по валидации",
      "Явно задайте полный план обучения в Rust",
      "Читайте только измеренные точки и не дорисовывайте кривую",
      "Проверьте информационную границу и владение состоянием",
      "Зафиксируйте выбранный декодер для одной тестовой оценки",
    ],
    diagramTitle: "Разделите обновление параметров и выбор модели по валидации",
    diagramDescription:
      "Проследите шесть последовательных операций в восьми измеренных обновлениях, затем сравните десять отдельных измерений на обучающей и валидационной выборках в пяти контрольных точках, не проводя между ними выдуманную кривую.",
    selectedCell: "Выбрано",
    cues: [
      "● Круг: измерение на обучающей выборке",
      "◆ Ромб: измерение на валидационной выборке",
      "◎ Двойное подчёркивание: состояние, выбранное по валидации",
      "↔ В промежутках нет измеренных значений или интерполированной линии",
    ],
    detailsFragment: "Побеждает первое значение, равное минимуму",
    historyFragments: [
      "Эти приёмы — часть пути к современным LLM",
      "локальные учебные решения, а не общепринятая практика",
    ],
    executionFragment:
      "Затем он возвращает новый номер шага оптимизатора, и цикл напрямую сравнивает его с номером обновления в плане.",
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
        const katex = text.closest(".katex");
        if (katex && text !== katex) continue;
        const rect = text.getBoundingClientRect();
        if (
          rect.width > 0 &&
          (rect.left < boxRect.left - 2 ||
            rect.right > boxRect.right + 2 ||
            rect.top < boxRect.top - 2 ||
            rect.bottom > boxRect.bottom + 2)
        ) {
          problems.push(
            "box " +
              index +
              " text " +
              textIndex +
              " (" +
              text.tagName.toLowerCase() +
              "." +
              (text.getAttribute("class") ?? "") +
              ") crosses its border",
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
  locale: ChapterLocale,
) {
  const localized = copy[locale];
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale,
    order: 33,
    revision: 4,
    revisionLabel: localized.revisionLabel,
    title: localized.title,
    equivalentLocales: ["en", "ru"],
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
    "g_s&=\\nabla_\\theta\\mathcal{L}_{tr}^{(s)}(\\theta_{s-1})",
    "\\widetilde g_s&=\\frac{c}{\\max(c,\\lVert g_s\\rVert_2)}g_s",
    "(\\theta_s,m_s,v_s)&=\\operatorname{AdamW}_{\\eta_s}",
    "\\mathcal{L}_{va}",
    "\\frac{\\sum_j n_j\\mathcal{L}^{(j)}_{va}}{\\sum_j n_j}",
    "s^*=\\min\\left\\{s\\in\\mathcal{C}:",
    "\\lVert \\widetilde g_s\\rVert_2\\leq0.35",
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
  for (const fragment of localized.historyFragments) {
    expect(lessonText).toContain(fragment);
  }
  expect(lessonText).toContain(localized.executionFragment);
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
  await expect(diagram).toHaveAccessibleName(localized.diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(
    localized.diagramDescription,
  );
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
  await expect(diagram.locator("[data-diagram-box]")).toHaveCount(18);
  await expect(diagram.locator("table")).toHaveCount(1);
  expect(
    await diagram
      .locator("svg, canvas, path, polyline, line")
      .evaluateAll((nodes) => nodes.filter((node) => !node.closest(".katex")).length),
  ).toBe(0);
  await expect(
    diagram.locator('[data-checkpoint-row="0"] annotation'),
  ).toHaveText(["s=0", "2.095016", "1.918167"]);
  await expect(
    diagram.locator('[data-checkpoint-row="8"] annotation'),
  ).toHaveText(["s=8", "1.322897", "1.595297"]);
  await expect(diagram.locator(".selected-row")).toContainText(
    localized.selectedCell,
  );
  await expectDiagramContainment(page);

  const details = page.locator(".lesson-body details");
  await expect(details).toHaveCount(1);
  await details.locator("summary").click();
  await expect(details.locator("ol > li")).toHaveCount(6);
  await expect(details).toContainText(
    localized.detailsFragment,
  );
  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expect(
    page.locator(
      'nav[data-chapter-navigation] a[data-chapter-direction="previous"]',
    ),
  ).toHaveAttribute("data-chapter-id", "32-decoder-model");
  const next = page.locator(
    'nav[data-chapter-navigation] a[data-chapter-direction="next"]',
  );
  await expect(next).toHaveAttribute("data-chapter-id", "34-final-evaluation");
  await expectNoOverflowOrClientScripts(page);
}

test.describe(
  "chapter 33 training and validation selection vertical slice",
  { tag: chapterTag(chapterId) },
  () => {
    test("English and Russian publish reciprocal Chapter 33 routes", async ({
      page,
    }) => {
      for (const locale of locales) {
        const chapters = await readOrderedCourseChapters(page, locale);
        expect(chapters[32]).toEqual(
          expect.objectContaining({
            chapterId,
            order: 33,
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

    test("full view reuses each localized semantic figure and restores focus", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      const controlNames: string[] = [];
      for (const locale of locales) {
        await page.goto(chapterPath(locale, chapterId));
        const diagram = page.locator(
          'figure[data-visualization-id="training-validation-checkpoints"]',
        );
        const toggle = diagram.locator("[data-diagram-full-view-toggle]");
        await expect(toggle).toHaveCount(1);
        controlNames.push((await toggle.getAttribute("aria-label")) ?? "");
        const before = await diagram.evaluate((node) => ({
          boxes: node.querySelectorAll("[data-diagram-box]").length,
          figures: document.querySelectorAll(
            'figure[data-visualization-id="training-validation-checkpoints"]',
          ).length,
          scrollers: node.querySelectorAll("[data-diagram-scroll]").length,
          tables: node.querySelectorAll("table").length,
        }));
        await toggle.click();
        await page.waitForFunction(
          () =>
            document.fullscreenElement?.getAttribute("data-visualization-id") ===
            "training-validation-checkpoints",
        );
        await page.evaluate(() => document.fonts.ready);
        const after = await diagram.evaluate((node) => ({
          boxes: node.querySelectorAll("[data-diagram-box]").length,
          debt: node.scrollWidth - node.clientWidth,
          figures: document.querySelectorAll(
            'figure[data-visualization-id="training-validation-checkpoints"]',
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
        await expect(diagram.locator("[data-operation-order]")).toHaveCount(6);
        await expect(diagram.locator(".measurement-point")).toHaveCount(10);
        await expectDiagramContainment(page);
        await page.keyboard.press("Escape");
        await page.waitForFunction(() => document.fullscreenElement === null);
        await expect(toggle).toBeFocused();
      }
      expect(new Set(controlNames).size).toBe(locales.length);
    });

    test("marker shapes and selection emphasis survive forced colors", async ({
      page,
    }) => {
      await page.emulateMedia({ forcedColors: "active" });
      for (const locale of locales) {
        await page.goto(chapterPath(locale, chapterId));
        const diagram = page.locator(
          'figure[data-visualization-id="training-validation-checkpoints"]',
        );
        await expect(diagram.locator(".cue-list li")).toHaveText(
          copy[locale].cues,
        );
        await expect(diagram.locator(".selected-point > span")).toHaveCSS(
          "text-decoration-style",
          "double",
        );
        await expect(diagram.locator(".selected-row > :last-child")).toHaveCSS(
          "border-left-style",
          "double",
        );
        await expectDiagramContainment(page);
        await expectNoOverflowOrClientScripts(page);
      }
    });

    test("RTL prose keeps the plot, table values, and checkpoint order left-to-right", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      for (const locale of locales) {
        await page.goto(chapterPath(locale, chapterId));
        const diagram = page.locator(
          'figure[data-visualization-id="training-validation-checkpoints"]',
        );
        await diagram.evaluate((node) => node.setAttribute("dir", "rtl"));
        await expect(diagram.locator("h4").first()).toHaveCSS(
          "direction",
          "rtl",
        );
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
        await expectDiagramContainment(page);
        await expectNoOverflowOrClientScripts(page);
      }
    });

    test("the lesson and exact checkpoint evidence render without JavaScript", async ({
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
        await expect(page.locator("[data-operation-order]")).toHaveCount(6);
        await expect(page.locator(".measurement-point")).toHaveCount(10);
        await expect(page.locator("[data-checkpoint-row]")).toHaveCount(5);
        await expect(page.locator(".selected-point")).toHaveCount(1);
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
