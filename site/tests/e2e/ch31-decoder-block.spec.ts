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
type ChapterLocale = "en" | "ru";
const locales = ["en", "ru"] as const satisfies readonly ChapterLocale[];
const copy = {
  en: {
    revisionLabel: "Content revision",
    title: "Compose one pre-norm Transformer decoder block",
    description:
      "Learn how RMSNorm, causal multi-head attention, SwiGLU, and two residual paths compose one shape-preserving Transformer decoder block.",
    headings: [
      "Trace both residual paths before running the block",
      "Add each branch to the stream that entered it",
      "Keep branch values separate from residual values",
      "From recurrent state and post-norm blocks to pre-norm decoders",
      "Compose tested parts without hiding their boundaries",
      "Inspect both bypasses and both transformation branches",
      "Test order, shape, causality, and parameter ownership",
      "Repeat the block only at the next model boundary",
    ],
    diagramTitle:
      "Follow two pre-normalized branches around one residual stream",
    diagramDescription:
      "Follow three exact token rows through attention normalization, causal multi-head attention, the first residual merge, feed-forward normalization, SwiGLU, and the second residual merge.",
    cues: [
      "Solid border: unchanged identity path",
      "Dashed border: learned transformation branch",
      "Double border: residual addition",
      "Solid underline: visible key",
      "Dashed underline: masked future key",
    ],
    unchanged: "Bitwise unchanged",
    changed: "Numerically different",
    detailsFragment: "The feed-forward branch can still change",
    historyFragments: [
      "rather than a claim about every later LSTM language model",
      "without claiming that the helper reproduces an LSTM",
    ],
  },
  ru: {
    revisionLabel: "Версия материала",
    title:
      "Соберите блок декодера Transformer с предварительной нормализацией",
    description:
      "Разберите, как RMSNorm, каузальное многоголовое внимание, SwiGLU и два остаточных пути образуют блок декодера Transformer, сохраняющий форму тензора.",
    headings: [
      "Проследите оба остаточных пути до запуска блока",
      "Складывайте каждую ветвь с потоком на её входе",
      "Не смешивайте значения ветвей со значениями остаточного потока",
      "От рекуррентного состояния и Post-LN к декодерам с Pre-LN",
      "Соедините проверенные части, не скрывая их границы",
      "Рассмотрите оба обходных пути и обе ветви преобразования",
      "Проверьте порядок, форму, каузальность и принадлежность параметров",
      "Повторяйте блок только на следующей границе модели",
    ],
    diagramTitle:
      "Проследите две предварительно нормализованные ветви вокруг одного остаточного потока",
    diagramDescription:
      "Проследите три точные строки токенов через нормализацию перед вниманием, каузальное многоголовое внимание, первое остаточное сложение, нормализацию перед сетью прямого распространения, SwiGLU и второе остаточное сложение.",
    cues: [
      "Сплошная рамка: неизменённый тождественный путь",
      "Пунктирная рамка: обучаемая ветвь преобразования",
      "Двойная рамка: остаточное сложение",
      "Сплошное подчёркивание: доступный ключ",
      "Пунктирное подчёркивание: замаскированный будущий ключ",
    ],
    unchanged: "Побитово не изменилось",
    changed: "Численно изменилось",
    detailsFragment:
      "Ветвь сети прямого распространения всё ещё может изменить",
    historyFragments: [
      "не описывает устройство всех более поздних языковых моделей на LSTM",
      "не означают, что вспомогательная функция воспроизводит LSTM",
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
  locale: ChapterLocale,
) {
  const localized = copy[locale];
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale,
    order: 31,
    revision: 2,
    revisionLabel: localized.revisionLabel,
    title: localized.title,
    equivalentLocales: locales,
    fallbackRouteSuffix: "/course/",
  });
  await expect(page.locator(".lesson-description")).toHaveText(
    localized.description,
  );
  await expectSeoDescription(page, localized.description);
  await expect(page.locator(".lesson-body h2")).toHaveText(
    localized.headings,
  );

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
  for (const fragment of localized.historyFragments) {
    expect(lessonText.toLocaleLowerCase(locale)).toContain(
      fragment.toLocaleLowerCase(locale),
    );
  }
  expect(lessonText).not.toMatch(
    /TypeScript|static HTML|JavaScript|trace grammar|Rust-authored|Rust provenance/i,
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
  await expect(diagram).toHaveAccessibleName(localized.diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(
    localized.diagramDescription,
  );
  await expect(diagram).toHaveAttribute("data-diagram-style", "course-v1");
  await expect(diagram.locator("[data-shape-stage]")).toHaveCount(9);
  await expect(diagram.locator("[data-flow]")).toHaveCount(2);
  await expect(diagram.locator("[data-diagram-box]")).toHaveCount(34);
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
    localized.changed,
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
  await expect(details).toContainText(localized.detailsFragment);
  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
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
    test("English and Russian publish reciprocal Chapter 31 routes", async ({
      page,
    }) => {
      for (const locale of locales) {
        const chapters = await readOrderedCourseChapters(page, locale);
        expect(chapters[30]).toEqual(
          expect.objectContaining({
            chapterId,
            order: 31,
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

    test("both complete lessons and diagrams render at desktop and narrow widths", async ({
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
          'figure[data-visualization-id="pre-norm-decoder-block-flow"]',
        );
        const toggle = diagram.locator("[data-diagram-full-view-toggle]");
        await expect(toggle).toHaveCount(1);
        controlNames.push((await toggle.getAttribute("aria-label")) ?? "");
        const before = await diagram.evaluate((node) => ({
          boxes: node.querySelectorAll("[data-diagram-box]").length,
          figures: document.querySelectorAll(
            'figure[data-visualization-id="pre-norm-decoder-block-flow"]',
          ).length,
          scrollers: node.querySelectorAll("[data-diagram-scroll]").length,
          tables: node.querySelectorAll("table").length,
        }));
        await toggle.click();
        await page.waitForFunction(
          () =>
            document.fullscreenElement?.getAttribute("data-visualization-id") ===
            "pre-norm-decoder-block-flow",
        );
        await page.evaluate(() => document.fonts.ready);
        const after = await diagram.evaluate((node) => ({
          boxes: node.querySelectorAll("[data-diagram-box]").length,
          debt: node.scrollWidth - node.clientWidth,
          figures: document.querySelectorAll(
            'figure[data-visualization-id="pre-norm-decoder-block-flow"]',
          ).length,
          regions: Array.from(
            node.querySelectorAll<HTMLElement>("[data-diagram-scroll]"),
          ).map((region) => ({
            debt: region.scrollWidth - region.clientWidth,
            name: region.getAttribute("aria-label"),
          })),
          sections: Array.from(node.querySelectorAll<HTMLElement>(":scope > section")).map(
            (section) => ({
              height: section.getBoundingClientRect().height,
              name: section.getAttribute("aria-labelledby"),
            }),
          ),
          proofChildren: Array.from(
            node.querySelectorAll<HTMLElement>(".proof-section > *"),
          ).map((child) => ({
            className: child.className,
            height: child.getBoundingClientRect().height,
            top: child.offsetTop,
            width: child.getBoundingClientRect().width,
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
          `${locale} full-view sections: ${JSON.stringify(after.sections)}; proof children: ${JSON.stringify(after.proofChildren)}`,
        ).toBeLessThanOrEqual(3);
        await expectDiagramContainment(page);
        await page.keyboard.press("Escape");
        await page.waitForFunction(() => document.fullscreenElement === null);
        await expect(toggle).toBeFocused();
      }
      expect(new Set(controlNames).size).toBe(locales.length);
    });

    test("identity, branch, merge, allowed, and blocked cues survive forced colors", async ({
      page,
    }) => {
      await page.emulateMedia({ forcedColors: "active" });
      for (const locale of locales) {
        await page.goto(chapterPath(locale, chapterId));
        const diagram = page.locator(
          'figure[data-visualization-id="pre-norm-decoder-block-flow"]',
        );
        await expect(diagram.locator(".cue-list li")).toHaveText(
          copy[locale].cues,
        );
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
      }
    });

    test("RTL prose keeps formulas, trace values, and causal table order left-to-right", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      for (const locale of locales) {
        await page.goto(chapterPath(locale, chapterId));
        const diagram = page.locator(
          'figure[data-visualization-id="pre-norm-decoder-block-flow"]',
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
              nodes.every(
                (node) => getComputedStyle(node).direction === "ltr",
              ),
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
        await expectDiagramContainment(page);
        await expectNoOverflowOrClientScripts(page);
      }
    });

  },
);
