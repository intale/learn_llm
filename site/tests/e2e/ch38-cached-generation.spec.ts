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
type ChapterLocale = "en" | "ru";
const locales = ["en", "ru"] as const satisfies readonly ChapterLocale[];
const copy = {
  en: {
    revisionLabel: "Content revision",
    title: "Prefill once, then advance one token",
    description:
      "Learn how one KV cache per decoder block turns prompt processing into coherent one-token decoding, with measured newest-logit and generation checks against complete-prefix references.",
    diagramTitle: "Prefill every layer once; decode every layer together",
    diagramDescription:
      "The exact Rust trace follows a two-token prompt and one later token through two distinct decoder-block caches, checks newest-position logits within tolerance, and compares measured attention-score work plus stopping and reset behavior.",
    headings: [
      "Predict both cache lengths before running",
      "Count attention-score cells, not total runtime",
      "Keep retained length and final length separate",
      "From causal stacks to prompt and decode phases",
      "Prepare every block, then commit the stack",
      "Follow prefill into one-token decode",
      "Predict before checking the evidence",
      "Connect inference to the whole pipeline",
    ],
    cues: [
      "| prompt prefill — solid border",
      "|| new one-token decode — double border",
      "= newest logits match within tolerance",
    ],
    detailsFragment:
      "Equal values and shapes do not preserve parameter-node identity or the exact decoder configuration recorded by the cache",
    constantTimeFragment: "Cached attention is not constant-time",
    historyPolicyFragment:
      "local correctness choices rather than policies defined by the cited papers",
    historyCountFragment: "this exact schedule avoids",
    contextBoundaryFragment:
      "selected from those logits and returned, then context-limit stops before decoding it",
    fullViewOpenLabel: "View diagram full screen",
    fullViewCloseLabel: "Exit full screen",
  },
  ru: {
    revisionLabel: "Версия материала",
    title: "Один раз заполните кэши, затем декодируйте по одному токену",
    description:
      "Разберитесь, как отдельный KV-кэш (кэш ключей и значений) каждого блока декодера позволяет один раз обработать промпт, затем согласованно декодировать по одному токену и отдельно сверять с расчётом по полному префиксу логиты последней позиции и решения при генерации.",
    diagramTitle:
      "Один раз заполните кэш каждого слоя; затем декодируйте все слои согласованно",
    diagramDescription:
      "Точная трассировка программы на Rust проводит промпт из двух токенов и один следующий токен через два отдельных кэша блоков декодера, проверяет логиты последней позиции в пределах допуска и сравнивает измеренное число оценок внимания, причины остановки и поведение при сбросе.",
    headings: [
      "Предскажите длины обоих кэшей до запуска",
      "Считайте значения оценок внимания, а не полное время работы",
      "Не смешивайте сохранённую и конечную длины",
      "От стека каузальных слоёв к обработке промпта и последовательному декодированию",
      "Подготовьте каждый блок, затем согласованно примените изменения ко всему стеку",
      "Проследите путь от промпта до декодирования одного токена",
      "Сначала предскажите, затем проверьте свидетельства",
      "Соедините вывод со всем процессом",
    ],
    cues: [
      "| заполнение по промпту — сплошная рамка",
      "|| новый шаг декодирования одного токена — двойная рамка",
      "= логиты последней позиции совпадают в пределах допуска",
    ],
    detailsFragment:
      "Одинаковые значения и формы не сохраняют идентичность узлов параметров и точную конфигурацию декодера, записанную в кэше",
    constantTimeFragment: "Внимание с KV-кэшем не работает за постоянное время",
    historyPolicyFragment:
      "локальные правила корректности, а не требования цитируемых статей",
    historyCountFragment:
      "в этой заданной последовательности вызовов не вычисляются",
    contextBoundaryFragment:
      "выбирается из полученных логитов и возвращается, после чего ограничение контекста останавливает генерацию до его декодирования",
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
  locale: ChapterLocale,
) {
  const localized = copy[locale];
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale,
    order: 38,
    revision: 3,
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
    "\\sum_{t=1}^{T}t^2\\in\\Theta(T^3),\\quad \\sum_{t=1}^{T}t\\in\\Theta(T^2)",
    "2\\times10^{-12}",
    "4(1+2+3)=24",
    "4(2^2+3^2)=52",
    "[B,H,t,d_h]",
    "\\Delta_{\\mathrm{max}}=0.000000000000",
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
  expect(annotations.map(normalizeMath)).toContain("28");
  expect(annotations.some((expression) => expression.includes("\\*"))).toBe(
    false,
  );
  await expect(page.locator(".lesson-body .katex-error")).toHaveCount(0);
  await expectFormulaGeometry(page);

  const lessonText = (await page.locator(".lesson-body").innerText()).replace(
    /\s+/g,
    " ",
  );
  expect(lessonText).toContain(localized.constantTimeFragment);
  expect(lessonText).toContain(localized.historyPolicyFragment);
  expect(lessonText).toContain(localized.historyCountFragment);
  expect(lessonText).toContain(localized.contextBoundaryFragment);
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
  await expect(diagram).toHaveAccessibleName(localized.diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(
    localized.diagramDescription,
  );
  await expect(diagram).toHaveAttribute("data-diagram-style", "course-v1");
  await expect(diagram.locator("[data-phase]")).toHaveCount(2);
  await expect(diagram.locator("[data-layer]")).toHaveCount(4);
  await expect(diagram.locator("[data-match-phase]")).toHaveCount(2);
  await expect(diagram.locator("[data-diagram-card]")).toHaveCount(12);
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
  await expect(
    diagram
      .locator('[data-proof="cache"] annotation[encoding="application/x-tex"]')
      .first(),
  ).toHaveText("4\\times(1+2+3)=24");
  await expect(
    diagram
      .locator(
        '[data-proof="reference"] annotation[encoding="application/x-tex"]',
      )
      .first(),
  ).toHaveText("4\\times(2^2+3^2)=52");
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
    diagram.locator(
      '[data-generation="loaded"] annotation[encoding="application/x-tex"]',
    ),
  ).toHaveText(["t=2", "N_{\\mathrm{cache}}=6", "N_{\\mathrm{full}}=10"]);
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
  await expect(details).toContainText(localized.detailsFragment);
  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expect(
    page.locator(
      'nav[data-chapter-navigation] a[data-chapter-direction="previous"]',
    ),
  ).toHaveAttribute("data-chapter-id", "37-incremental-attention");
  const next = page.locator(
    'nav[data-chapter-navigation] a[data-chapter-direction="next"]',
  );
  await expect(next).toHaveAttribute("data-chapter-id", "39-end-to-end-llm");
  await expectNoOverflowOrClientScripts(page);
}

test.describe(
  "chapter 38 cached generation vertical slice",
  { tag: chapterTag(chapterId) },
  () => {
    test("English and Russian publish reciprocal Chapter 38 routes", async ({
      page,
    }) => {
      const english = await readOrderedCourseChapters(page, "en");
      expect(english).toHaveLength(39);
      const russian = await readOrderedCourseChapters(page, "ru");
      expect(russian).toHaveLength(39);

      for (const locale of locales) {
        const chapters = locale === "en" ? english : russian;
        expect(chapters[37]).toEqual(
          expect.objectContaining({
            chapterId,
            order: 38,
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

    test("both complete cached-generation lessons render at desktop and narrow widths", async ({
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
          'figure[data-visualization-id="cached-generation"]',
        );
        await expect(
          page.locator('figure[data-visualization-id="cached-generation"]'),
        ).toHaveCount(1);
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
            ) === "cached-generation",
        );
        await expect(toggle).toHaveAccessibleName(
          copy[locale].fullViewCloseLabel,
        );
        await expect(
          page.locator('figure[data-visualization-id="cached-generation"]'),
        ).toHaveCount(1);
        await expect(diagram.locator("[data-phase]")).toHaveCount(2);
        await expect(diagram.locator("[data-layer]")).toHaveCount(4);
        await expect(diagram.locator("[data-diagram-card]")).toHaveCount(12);
        await expect(diagram.locator("[data-diagram-box]")).toHaveCount(12);
        await expect(diagram.locator("[data-diagram-scroll]")).toHaveCount(0);
        await expectDiagramContainment(page);
        await page.keyboard.press("Escape");
        await page.waitForFunction(() => document.fullscreenElement === null);
        await expect(toggle).toBeFocused();
      }
      expect(new Set(controlNames).size).toBe(locales.length);
    });

    test("localized text plus solid and double phase cues survive forced colors", async ({
      page,
    }) => {
      await page.emulateMedia({ forcedColors: "active" });
      for (const locale of locales) {
        await page.goto(chapterPath(locale, chapterId));
        const diagram = page.locator(
          'figure[data-visualization-id="cached-generation"]',
        );
        await expect(diagram.locator(".cue-list li")).toHaveText(
          copy[locale].cues,
        );
        await expect(
          diagram.locator('[data-phase="prefill"] [data-layer="0"]'),
        ).toHaveCSS("border-left-style", "solid");
        await expect(
          diagram.locator('[data-phase="decode"] [data-layer="0"]'),
        ).toHaveCSS("border-left-style", "double");
        await expectDiagramContainment(page);
        await expectNoOverflowOrClientScripts(page);
      }
    });

    test("RTL prose keeps technical values and phase order left-to-right", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      for (const locale of locales) {
        await page.goto(chapterPath(locale, chapterId));
        const diagram = page.locator(
          'figure[data-visualization-id="cached-generation"]',
        );
        await diagram.evaluate((node) => node.setAttribute("dir", "rtl"));
        await expect(diagram.locator("h4").first()).toHaveCSS(
          "direction",
          "rtl",
        );
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
      }
    });

    test("the complete model-wide cache evidence renders without JavaScript", async ({
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
        await expect(page.locator("[data-phase]")).toHaveCount(2);
        await expect(page.locator("[data-layer]")).toHaveCount(4);
        await expect(page.locator("[data-match-phase]")).toHaveCount(2);
        await expect(page.locator("[data-diagram-card]")).toHaveCount(12);
        await expect(page.locator("[data-diagram-box]")).toHaveCount(12);
        await expect(page.locator("[data-diagram-scroll]")).toHaveCount(0);
        await expect(
          page.locator("[data-diagram-full-view-toggle]"),
        ).toHaveCount(0);
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
      }
      await context.close();
    });
  },
);
