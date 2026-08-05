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
type ChapterLocale = "en" | "ru";
const locales = ["en", "ru"] as const satisfies readonly ChapterLocale[];
const copy = {
  en: {
    revisionLabel: "Content revision",
    title: "Keep the prefix, project only the new row",
    description:
      "Learn how one layer-bound KV cache appends rotated keys and unrotated values while reproducing full-prefix attention at the newest position.",
    diagramTitle: "Retain earlier key/value rows; append exactly one new pair",
    diagramDescription:
      "The exact Rust trace follows three absolute positions, shows both head caches and attention weights, matches each newest output to a full-prefix reference, and records that reset plus rejected calls preserve storage.",
    headings: [
      "Predict the third result before running the example",
      "Append along the position axis",
      "Keep layer, logical length, and capacity separate",
      "From causal attention to managed LLM inference state",
      "Bind the state, calculate completely, then commit",
      "Follow retained rows into the newest query",
      "Predict before checking the trace",
      "Give every decoder block its own state next",
    ],
    cues: [
      "| retained earlier row - solid border",
      "|| newly appended row - double border",
      "= newest outputs match within tolerance",
    ],
    detailsFragment:
      "A rebuilt layer fails the parameter-node identity check even when shapes and numeric values agree",
    revisionMismatchFragment:
      "An in-place AdamW update preserves the parameter nodes but advances their value revisions",
    resetBindingFragment:
      "It does not refresh the captured parameter identities or value revisions, and it does not rebind the cache",
    historyFragment: "local correctness policies",
    noSpeedupFragment:
      "does not claim constant-time attention or a measured speedup",
    fullViewOpenLabel: "View diagram full screen",
    fullViewCloseLabel: "Exit full screen",
  },
  ru: {
    revisionLabel: "Версия материала",
    title: "Сохраняйте префикс, проецируйте только новую строку",
    description:
      "Разберитесь, как привязанный к слою KV-кэш (кэш ключей и значений) добавляет повёрнутые ключи и значения без поворота, сохраняя для новой позиции результат расчёта внимания по полному префиксу.",
    diagramTitle:
      "Сохранять предыдущие строки ключей и значений; добавлять ровно одну новую пару",
    diagramDescription:
      "Точная трассировка программы на Rust охватывает три абсолютные позиции, показывает кэши обеих голов внимания и веса, сопоставляет выход последней позиции на каждом шаге с эталонным расчётом по полному префиксу и подтверждает сохранность хранилища после сброса и отклонённых вызовов.",
    headings: [
      "Предскажите результат третьего вызова до запуска примера",
      "Добавляйте строки вдоль оси позиций",
      "Различайте слой, логическую длину и ёмкость",
      "От каузального внимания к управлению состоянием LLM при генерации",
      "Привяжите состояние к слою, полностью вычислите результат и лишь затем обновите кэш",
      "Проследите путь сохранённых строк к последнему запросу",
      "Сначала предскажите, затем сверьтесь с трассировкой",
      "В следующей главе дайте каждому блоку декодера собственное состояние",
    ],
    cues: [
      "| сохранённая строка — сплошная рамка",
      "|| добавленная строка — двойная рамка",
      "= последние выходы совпадают в пределах допуска",
    ],
    detailsFragment:
      "В заново созданном слое не совпадут идентичности узлов параметров, даже если формы и числовые значения весов те же",
    revisionMismatchFragment:
      "Обновление AdamW на месте сохраняет узлы параметров, но увеличивает версии их значений",
    resetBindingFragment:
      "Он не обновляет зафиксированные идентичности узлов и версии значений параметров и не меняет привязку кэша",
    historyFragment: "локальные правила корректности этой главы",
    noSpeedupFragment:
      "не доказывают ни постоянного времени внимания, ни измеренного ускорения",
    fullViewOpenLabel: "Развернуть схему на весь экран",
    fullViewCloseLabel: "Выйти из полноэкранного режима",
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
      problems.push(
        "the reflowing cache timeline must not create a private scroller",
      );
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
  locale: ChapterLocale,
) {
  const localized = copy[locale];
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale,
    order: 37,
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
    "K^{(\\ell)}_{1:t}=[K^{(\\ell)}_{1:t-1};k^{(\\ell)}_t],\\quad V^{(\\ell)}_{1:t}=[V^{(\\ell)}_{1:t-1};v^{(\\ell)}_t]",
    "[B,H,C,d_h]",
    "[B,H,1,t+1]",
    "[1,2,3,2]",
    "K_{2,0}=-1.325444263",
    "K_{2,1}=0.493150590",
    "\\Delta_{\\mathrm{max}}=0.000000000000",
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
  expect(lessonText).toContain(localized.noSpeedupFragment);
  expect(lessonText).toContain(localized.historyFragment);
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
  await expect(diagram).toHaveAccessibleName(localized.diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(
    localized.diagramDescription,
  );
  await expect(diagram).toHaveAttribute("data-diagram-style", "course-v1");
  await expect(diagram.locator("[data-cache-step]")).toHaveCount(3);
  await expect(diagram.locator("[data-head]")).toHaveCount(6);
  await expect(diagram.locator("[data-cache-row]")).toHaveCount(12);
  await expect(diagram.locator("[data-match-proof]")).toHaveCount(3);
  await expect(diagram.locator("[data-diagram-card]")).toHaveCount(21);
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
  await expect(diagram.locator('[data-proof="full"]')).toContainText("1+2+3=6");
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
    "rope_positions_mismatch=true",
  );
  await expect(diagram.locator('[data-proof="errors"]')).toContainText(
    "nonfinite_projection=true",
  );
  await expect(diagram.locator('[data-proof="reset"]')).toContainText(
    "storage_unchanged=true",
  );
  await expect(
    diagram.locator("svg, canvas, path, polyline, line"),
  ).toHaveCount(0);
  await expectDiagramContainment(page);

  const details = page.locator(".lesson-body details");
  await expect(details).toHaveCount(1);
  await details.locator("summary").click();
  await expect(details.locator("ol > li")).toHaveCount(9);
  await expect(details).toContainText(localized.detailsFragment);
  await expect(details).toContainText(localized.revisionMismatchFragment);
  await expect(details).toContainText(localized.resetBindingFragment);
  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expect(
    page.locator(
      'nav[data-chapter-navigation] a[data-chapter-direction="previous"]',
    ),
  ).toHaveAttribute("data-chapter-id", "36-temperature-top-k");
  const next = page.locator(
    'nav[data-chapter-navigation] a[data-chapter-direction="next"]',
  );
  await expect(next).toHaveAttribute(
    "data-chapter-id",
    "38-cached-generation",
  );
  await expectNoOverflowOrClientScripts(page);
}

test.describe(
  "chapter 37 incremental attention vertical slice",
  { tag: chapterTag(chapterId) },
  () => {
    test("English and Russian publish reciprocal Chapter 37 routes", async ({
      page,
    }) => {
      const english = await readOrderedCourseChapters(page, "en");
      expect(english).toHaveLength(39);
      const russian = await readOrderedCourseChapters(page, "ru");
      expect(russian).toHaveLength(39);

      for (const locale of locales) {
        const chapters = locale === "en" ? english : russian;
        expect(chapters[36]).toEqual(
          expect.objectContaining({
            chapterId,
            order: 37,
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
        ).toHaveAttribute(
          "href",
          new RegExp(`/${other}/course/${chapterId}/$`),
        );
      }
    });

    test("both Rust-backed lessons render at desktop and narrow widths", async ({
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

    test("full view reuses each localized complete figure", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      const controlNames: string[] = [];
      for (const locale of locales) {
        await page.goto(chapterPath(locale, chapterId));
        const diagram = page.locator(
          'figure[data-visualization-id="incremental-attention"]',
        );
        const toggle = diagram.locator("[data-diagram-full-view-toggle]");
        await expect(toggle).toHaveCount(1);
        await expect(toggle).toHaveAccessibleName(
          copy[locale].fullViewOpenLabel,
        );
        controlNames.push((await toggle.getAttribute("aria-label")) ?? "");
        await toggle.click();
        await page.waitForFunction(
          () =>
            document.fullscreenElement?.getAttribute(
              "data-visualization-id",
            ) === "incremental-attention",
        );
        await expect(toggle).toHaveAccessibleName(
          copy[locale].fullViewCloseLabel,
        );
        await expect(diagram.locator("[data-cache-step]")).toHaveCount(3);
        await expect(diagram.locator("[data-cache-row]")).toHaveCount(12);
        await expectDiagramContainment(page);
        await page.keyboard.press("Escape");
        await page.waitForFunction(() => document.fullscreenElement === null);
        await expect(toggle).toBeFocused();
      }
      expect(new Set(controlNames).size).toBe(locales.length);
    });

    test("localized text plus solid and double cues survive forced colors", async ({
      page,
    }) => {
      await page.emulateMedia({ forcedColors: "active" });
      for (const locale of locales) {
        await page.goto(chapterPath(locale, chapterId));
        const diagram = page.locator(
          'figure[data-visualization-id="incremental-attention"]',
        );
        await expect(diagram.locator(".cue-list li")).toHaveText(
          copy[locale].cues,
        );
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
      }
    });

    test("RTL prose keeps technical values and cache order left-to-right", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      for (const locale of locales) {
        await page.goto(chapterPath(locale, chapterId));
        const diagram = page.locator(
          'figure[data-visualization-id="incremental-attention"]',
        );
        await diagram.evaluate((node) => node.setAttribute("dir", "rtl"));
        await expect(diagram.locator("h4").first()).toHaveCSS(
          "direction",
          "rtl",
        );
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
      }
    });

    test("the complete cache evidence renders without JavaScript", async ({
      browser,
    }, testInfo) => {
      const context = await browser.newContext({
        javaScriptEnabled: false,
        baseURL: String(testInfo.project.use.baseURL),
      });
      const page = await context.newPage();
      for (const locale of locales) {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(chapterPath(locale, chapterId));
        await expect(
          page.getByRole("heading", { level: 1, name: copy[locale].title }),
        ).toBeVisible();
        await expect(page.locator("[data-cache-step]")).toHaveCount(3);
        await expect(page.locator("[data-head]")).toHaveCount(6);
        await expect(page.locator("[data-cache-row]")).toHaveCount(12);
        await expect(page.locator("[data-diagram-box]")).toHaveCount(21);
        await expect(page.locator("[data-diagram-scroll]")).toHaveCount(0);
        await expect(
          page.locator("[data-diagram-full-view-toggle]"),
        ).toHaveCount(0);
        await expect(page.locator('[data-proof="reset"]')).toContainText(
          "storage_unchanged=true",
        );
        await expect(page.locator('[data-proof="errors"]')).toContainText(
          "unchanged=true",
        );
        await expectDiagramContainment(page);
        await expectNoOverflowOrClientScripts(page);
      }
      await context.close();
    });
  },
);
