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
type ChapterLocale = "en" | "ru";
const locales = ["en", "ru"] as const satisfies readonly ChapterLocale[];
const copy = {
  en: {
    revisionLabel: "Content revision",
    title: "Open test once, keep the report",
    description:
      "Learn how to freeze validation-selected choices, validate and record the ordered test inputs and targets at one final-evaluation gate, aggregate every target token fairly, and publish graph-free decoder and bigram scores in a provenance-checked report.",
    headings: [
      "Freeze the comparison before opening test",
      "Average surprise over target tokens",
      "Keep states, slots, and roles distinct",
      "From training scores to governed final LLM evidence",
      "Make the final boundary executable",
      "Read one information boundary and one comparison",
      "Classify legal decisions before you run",
      "Carry the selected and evaluated state forward",
    ],
    diagramTitle: "Freeze choices before final evidence",
    diagramDescription:
      "Follow training and validation to one test gate. At gate opening, the evaluator records 24 ordered, vocabulary-checked input/target pairs in one private inspected view. The decoder then scores the original epoch separately without a graph, while the bigram reuses those pairs; both results enter one immutable report.",
    cues: [
      "≡ Equivalence sign: same inspected target order",
      "║ Double border: lower loss in this fixture",
      "× Cross: selection rejected the test partition",
    ],
    detailsFragment: "Dataset access control and a shared audit log",
    historyFragments: [
      "Early neural language-model evaluation moved from training-set reporting",
      "does not claim that these papers used exactly one test query",
    ],
    ownershipFragments: [
      "TrainingResult already owns two independent representations of the validation choice",
      "Immediately before the test gate opens, FinalEvaluator compares the decoder configuration",
      "A mismatch returns SelectedStateMismatch while the gate-opening count remains 0",
      "InspectedTestEpoch and its fields are private to the evaluation module",
      "one input-validation boundary for report evidence and later bigram scoring",
      "does not promise one physical memory pass",
    ],
  },
  ru: {
    revisionLabel: "Версия материала",
    title: "Откройте доступ к тестовой выборке один раз и сохраните отчёт",
    description:
      "Разберитесь, как зафиксировать решения, принятые по валидации, при открытии итогового доступа проверить и сохранить упорядоченные пары входных и целевых токенов тестовой выборки, усреднить потери по всем целевым токенам и записать оценки декодера и биграммной модели без графа вычислений в отчёт с проверенными сведениями о происхождении данных и условиях оценки.",
    headings: [
      "Зафиксируйте условия сравнения до открытия тестовой выборки",
      "Усредняйте неожиданность по целевым токенам",
      "Не смешивайте состояния, позиции и роли выборок",
      "От результатов обучения к управляемой итоговой оценке LLM",
      "Реализуйте правила итоговой оценки в коде",
      "Проследите одну информационную границу и одно сравнение",
      "Определите допустимые решения до запуска",
      "Сохраните в контрольной точке то же выбранное состояние",
    ],
    diagramTitle: "Зафиксируйте решения до итоговой оценки",
    diagramDescription:
      "Проследите путь от обучения и выбора по валидации к однократному открытию тестовой выборки. При открытии доступа оценщик создаёт проверенное внутреннее представление тестовой эпохи и сохраняет в нём 24 упорядоченные пары индексов входного и целевого токенов. Затем декодер отдельно оценивает исходную эпоху без записи графа вычислений, а биграммная модель использует сохранённые пары; результаты обеих моделей входят в один неизменяемый отчёт.",
    cues: [
      "≡ Знак эквивалентности: одна и та же последовательность проверенных пар «вход — цель»",
      "║ Двойная рамка: меньшие потери в этом примере",
      "× Знак ×: при выборе доступ к тестовой выборке был отклонён",
    ],
    detailsFragment: "контроля доступа к набору данных и общего журнала аудита",
    historyFragments: [
      "В ранних исследованиях нейронных языковых моделей постепенно переходили",
      "Это не означает, что в процитированных работах тестовую выборку запрашивали ровно один раз",
    ],
    ownershipFragments: [
      "TrainingResult хранит результат выбора по валидации в двух независимых формах",
      "Непосредственно перед открытием доступа к тестовой выборке FinalEvaluator сверяет конфигурацию декодера",
      "При несовпадении возвращается SelectedStateMismatch, а счётчик открытий доступа остаётся равным 0",
      "InspectedTestEpoch и его поля доступны только внутри модуля оценки",
      "входные данные проверяются на одной границе — при открытии доступа к тестовой эпохе",
      "не означает один физический проход по памяти",
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
    const markedBoxes = Array.from(
      root.querySelectorAll<HTMLElement>("[data-diagram-box]"),
    );
    const boxes = Array.from(
      root.querySelectorAll<HTMLElement>(
        "[data-diagram-box], [data-diagram-table] th, [data-diagram-table] td",
      ),
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
        const nearestBox = parent?.closest(
          "[data-diagram-box], [data-diagram-table] th, [data-diagram-table] td",
        );
        const nearestScroller = parent?.closest("[data-diagram-scroll]");
        if (
          text &&
          parent &&
          nearestBox === box &&
          !(nearestScroller && box.contains(nearestScroller))
        ) {
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
      boundedBoxCount: boxes.length,
      boxCount: markedBoxes.length,
      clientWidth: root.clientWidth,
      problems,
      scrollerCount: scrollers.length,
      scrollWidth: root.scrollWidth,
    };
  });
  expect(result.problems).toEqual([]);
  expect(result.boundedBoxCount).toBe(33);
  expect(result.boxCount).toBe(15);
  expect(result.scrollerCount).toBe(1);
  expect(result.scrollWidth).toBeLessThanOrEqual(result.clientWidth + 2);
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
    order: 34,
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
  for (const fragment of localized.historyFragments) {
    expect(lessonText).toContain(fragment);
  }
  for (const fragment of localized.ownershipFragments) {
    expect(lessonText).toContain(fragment);
  }
  expect(lessonText).toContain(
    locale === "en"
      ? "does not claim that decoders always beat bigrams"
      : "из этого результата нельзя заключать, что декодеры всегда превосходят биграммные модели",
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
  await expect(diagram).toHaveAccessibleName(localized.diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(localized.diagramDescription);
  await expect(diagram).toHaveAttribute("data-diagram-style", "course-v1");
  await expect(diagram.locator("[data-stage]")).toHaveCount(5);
  await expect(diagram.locator("[data-diagram-box]")).toHaveCount(15);
  await expect(diagram.locator("table")).toHaveCount(1);
  await expect(diagram.locator("tbody tr")).toHaveCount(2);
  await expect(diagram.locator('[data-score-model="selected-decoder"]')).toHaveAttribute(
    "data-lower-loss",
    "true",
  );
  await expect(diagram.locator('[data-score-model="selected-decoder"] annotation')).toHaveText([
    "N_{te}=24",
    "\\sum_n(-\\log p_n)=38.584306",
    "\\mathcal{L}_{te}=1.607679",
  ]);
  await expect(diagram.locator('[data-score-model="frozen-bigram"] annotation')).toHaveText([
    "N_{te}=24",
    "\\sum_n(-\\log p_n)=53.681634",
    "\\mathcal{L}_{te}=2.236735",
  ]);
  await expect(diagram).toContainText("fnv1a64:dac4bb4d76beeb59");
  await expect(diagram).toContainText("selection_test_partition_rejected=true");
  await expect(diagram).toContainText("gate_openings_before=0");
  await expect(diagram).toContainText("gate_openings_after=1");
  await expect(diagram).toContainText("graph_nodes=0");
  await expect(diagram.locator("svg, canvas, path, polyline, line")).toHaveCount(
    0,
  );
  await expectDiagramContainment(page);

  const details = page.locator(".lesson-body details");
  await expect(details).toHaveCount(1);
  await details.locator("summary").click();
  await expect(details.locator("ol > li")).toHaveCount(8);
  await expect(details).toContainText(localized.detailsFragment);
  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expect(
    page.locator(
      'nav[data-chapter-navigation] a[data-chapter-direction="previous"]',
    ),
  ).toHaveAttribute("data-chapter-id", "33-training-selection");
  const next = page.locator(
    'nav[data-chapter-navigation] a[data-chapter-direction="next"]',
  );
  await expect(next).toHaveAttribute("data-chapter-id", "35-checkpoints");
  await expectNoOverflowOrClientScripts(page);
}

test.describe(
  "chapter 34 once-only final evaluation vertical slice",
  { tag: chapterTag(chapterId) },
  () => {
    test("English and Russian publish reciprocal Chapter 34 routes", async ({
      page,
    }) => {
      for (const locale of locales) {
        const chapters = await readOrderedCourseChapters(page, locale);
        expect(chapters[33]).toEqual(
          expect.objectContaining({
            chapterId,
            order: 34,
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

    test("both complete lessons and final reports render at desktop and narrow widths", async ({
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

    test("full view reuses each localized complete figure and restores focus", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      const controlNames: string[] = [];
      for (const locale of locales) {
        await page.goto(chapterPath(locale, chapterId));
        const diagram = page.locator(
          'figure[data-visualization-id="final-evaluation-boundary"]',
        );
        const toggle = diagram.locator("[data-diagram-full-view-toggle]");
        await expect(toggle).toHaveCount(1);
        controlNames.push((await toggle.getAttribute("aria-label")) ?? "");
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
      }
      expect(new Set(controlNames).size).toBe(locales.length);
    });

    test("text, double borders, and numbered states survive forced colors", async ({
      page,
    }) => {
      await page.emulateMedia({ forcedColors: "active" });
      for (const locale of locales) {
        await page.goto(chapterPath(locale, chapterId));
        const diagram = page.locator(
          'figure[data-visualization-id="final-evaluation-boundary"]',
        );
        await expect(diagram.locator(".cue-list li")).toHaveText(
          copy[locale].cues,
        );
        await expect(diagram.locator('[data-stage="frozen"]')).toHaveCSS(
          "border-top-style",
          "double",
        );
        await expect(
          diagram.locator('[data-score-model="selected-decoder"] > :first-child'),
        ).toHaveCSS("border-left-style", "double");
        await expectDiagramContainment(page);
        await expectNoOverflowOrClientScripts(page);
      }
    });

    test("RTL prose keeps technical values and evidence order left-to-right", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      for (const locale of locales) {
        await page.goto(chapterPath(locale, chapterId));
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
        await expectDiagramContainment(page);
        await expectNoOverflowOrClientScripts(page);
      }
    });

    test("the lesson and exact report evidence render without JavaScript", async ({
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
        await expect(page.locator("[data-stage]")).toHaveCount(5);
        await expect(page.locator("[data-diagram-box]")).toHaveCount(15);
        await expect(page.locator("tbody tr")).toHaveCount(2);
        await expect(page.locator("[data-diagram-scroll]")).toHaveCount(1);
        await expect(page.locator("[data-diagram-full-view-toggle]")).toHaveCount(
          0,
        );
        await expect(page.locator(".lesson-body")).toContainText(
          "fnv1a64:dac4bb4d76beeb59",
        );
        await expectDiagramContainment(page);
        await expectNoOverflowOrClientScripts(page);
      }
      await context.close();
    });
  },
);
