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
type ChapterLocale = "en" | "ru";
const locales = ["en", "ru"] as const satisfies readonly ChapterLocale[];
const copy = {
  en: {
    revisionLabel: "Content revision",
    title: "Shape the choices, then draw once",
    description:
      "Learn how positive temperature, stable top-k filtering, and a restored random-generator state turn decoder logits into controlled, replayable uncached LLM generation.",
    diagramTitle: "Temperature reshapes; top-k removes; one draw selects",
    diagramDescription:
      "The exact Rust trace compares three temperatures, exposes a stable tied boundary, follows eight seeded half-open intervals, and records checkpoint generation stops.",
    headings: [
      "Start with four logits and make every choice visible",
      "Filter the candidate set, then renormalize",
      "Keep logits, candidates, and probabilities distinct",
      "From constrained search to open-ended LLM sampling",
      "Validate first, rank stably, and advance the random stream once",
      "Read the distribution from left to right",
      "Predict before revealing the trace",
      "Preserve this uncached sequence when generation becomes incremental",
    ],
    cues: [
      "✓ retained — double border",
      "× removed — dashed border",
      "→ selected by the draw",
    ],
    detailsFragment: "survives because equal logits use ascending token ID",
    historyFragment:
      "not a universal quality guarantee, a hallucination defense, or the endpoint of decoding research",
    executionFragment:
      "The ordinary call still needs temporary arrays of ranked token IDs and probabilities",
    ownershipFragment:
      "It first records the saved random state, then consumes the checkpoint and moves its already-owned model buffers into the decoder",
  },
  ru: {
    revisionLabel: "Версия материала",
    title: "Сформируйте набор вариантов, затем сделайте один случайный выбор",
    description:
      "Разберитесь, как положительная температура, фильтрация top-k с однозначным порядком и восстановленное состояние генератора псевдослучайных чисел превращают логиты декодера в управляемую и воспроизводимую генерацию LLM без кэша.",
    diagramTitle:
      "Температура меняет форму, top-k отсекает, случайное число выбирает",
    diagramDescription:
      "Точная трасса из программы на Rust сравнивает три температуры, показывает границу равных логитов с однозначным порядком, восемь полуоткрытых интервалов и причины остановки генерации из контрольной точки.",
    headings: [
      "Начните с четырёх логитов и сделайте каждый выбор явным",
      "Отфильтруйте кандидатов, затем нормализуйте заново",
      "Не смешивайте логиты, кандидатов и вероятности",
      "От поиска при жёстких ограничениях к свободной генерации LLM",
      "Сначала проверьте входы, однозначно задайте порядок и лишь затем измените состояние генератора",
      "Прочитайте распределение слева направо",
      "Сначала предскажите, затем откройте трассу",
      "Сохраните эту последовательность без кэша при переходе к поэтапной генерации",
    ],
    cues: [
      "✓ оставлен — двойная рамка",
      "× исключён — пунктирная рамка",
      "→ выбран случайным числом",
    ],
    detailsFragment: "Остаётся токен 1",
    historyFragment:
      "не универсальная гарантия качества, не защита от галлюцинаций и не конечная точка исследований декодирования",
    executionFragment:
      "Обычному вызову всё равно нужны временные массивы",
    ownershipFragment:
      "Сначала он сохраняет отдельно записанное в ней состояние генератора псевдослучайных чисел. Затем метод into_model получает контрольную точку по значению и перемещает в декодер буферы модели",
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
  locale: ChapterLocale,
) {
  const localized = copy[locale];
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale,
    order: 36,
    revision: 5,
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
  expect(lessonText).toContain(localized.historyFragment);
  expect(lessonText).toContain(localized.executionFragment);
  expect(lessonText).toContain(localized.ownershipFragment);
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
  await expect(diagram).toHaveAccessibleName(localized.diagramTitle);
  await expect(diagram).toHaveAccessibleDescription(
    localized.diagramDescription,
  );
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
  await expect(details).toContainText(localized.detailsFragment);
  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expect(
    page.locator(
      'nav[data-chapter-navigation] a[data-chapter-direction="previous"]',
    ),
  ).toHaveAttribute("data-chapter-id", "35-checkpoints");
  const next = page.locator(
    'nav[data-chapter-navigation] a[data-chapter-direction="next"]',
  );
  await expect(next).toHaveAttribute(
    "data-chapter-id",
    "37-incremental-attention",
  );
  await expectNoOverflowOrClientScripts(page);
}

test.describe(
  "chapter 36 temperature and top-k generation vertical slice",
  { tag: chapterTag(chapterId) },
  () => {
    test("English and Russian publish reciprocal Chapter 36 routes", async ({
      page,
    }) => {
      for (const locale of locales) {
        const chapters = await readOrderedCourseChapters(page, locale);
        expect(chapters[35]).toEqual(
          expect.objectContaining({
            chapterId,
            order: 36,
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
          'figure[data-visualization-id="temperature-top-k"]',
        );
        const toggle = diagram.locator("[data-diagram-full-view-toggle]");
        await expect(toggle).toHaveCount(1);
        controlNames.push((await toggle.getAttribute("aria-label")) ?? "");
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
      }
      expect(new Set(controlNames).size).toBe(locales.length);
    });

    test("text plus solid, dashed, and double cues survive forced colors", async ({
      page,
    }) => {
      await page.emulateMedia({ forcedColors: "active" });
      for (const locale of locales) {
        await page.goto(chapterPath(locale, chapterId));
        const diagram = page.locator(
          'figure[data-visualization-id="temperature-top-k"]',
        );
        await expect(diagram.locator(".cue-list li")).toHaveText(
          copy[locale].cues,
        );
        await expect(
          diagram.locator('[data-top-k-token="1"] > :first-child'),
        ).toHaveCSS("border-left-style", "double");
        await expect(
          diagram.locator('[data-top-k-token="2"] > :first-child'),
        ).toHaveCSS("border-left-style", "dashed");
        await expectProbabilityBarGeometry(page);
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
      }
    });

  },
);
