// @ts-ignore Node APIs are available in the Playwright test runner.
import { readFileSync } from "node:fs";
// @ts-ignore Node APIs are available in the Playwright test runner.
import { resolve } from "node:path";

import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  chapterLocales,
  chapterLocaleDefinitions,
  chapterPath,
  chapterTag,
  expectLocalizedChapterRoute,
  expectNoOverflowOrClientScripts,
  expectOrderedChapterNavigation,
  expectVisualizationDecision,
  readOrderedCourseChapters,
  type ChapterLocale,
  type CourseChapterLink,
} from "./chapter-helpers";

declare const process: { cwd(): string };

const chapterId = "02-corpus-partitions";
const contentRevision = 9;
const formulaLatex = String.raw`\mathcal{D}=\mathcal{D}_{tr}\mathbin{\dot\cup}\mathcal{D}_{va}\mathbin{\dot\cup}\mathcal{D}_{te},\quad \mathcal{D}_{a}\cap\mathcal{D}_{b}=\varnothing\;(a\ne b)`;
const repositoryRoot = resolve(process.cwd(), "..");
const manifest = JSON.parse(
  readFileSync(resolve(repositoryRoot, "rust/data/splits.json"), "utf8"),
) as Record<"train" | "validation" | "test", string[]>;

function readRustRegion(path: string, region: string): string {
  const lines = readFileSync(resolve(repositoryRoot, path), "utf8").split(
    /\r?\n/,
  );
  const start = lines.findIndex(
    (line: string) => line.trim() === `// region:${region}`,
  );
  const end = lines.findIndex(
    (line: string) => line.trim() === `// endregion:${region}`,
  );
  if (start === -1 || end <= start) {
    throw new Error(`Missing ordered Rust region ${region} in ${path}`);
  }
  return lines.slice(start + 1, end).join("\n");
}

const expectedRustSources = [
  readRustRegion(
    "rust/demos/ch02-corpus-partitions/src/lib.rs",
    "overlapping-excerpts",
  ),
  readRustRegion(
    "rust/crates/llm-from-scratch/src/corpus.rs",
    "document-loader",
  ),
  readRustRegion(
    "rust/crates/llm-from-scratch/src/corpus.rs",
    "partition-invariants",
  ),
  readRustRegion(
    "rust/demos/ch02-corpus-partitions/src/main.rs",
    "chapter-output",
  ),
];

const copy = {
  en: {
    indexTitle: "From text to a tiny language model",
    chapterTitle: "Corpus documents and frozen partitions",
    revisionLabel: "Content revision",
    headings: {
      formula: "Coverage and separation in one statement",
      history: "Before dependable holdout boundaries",
      rust: "Enforce the boundary in Rust",
      visualization: "Verify all twelve assignments at a glance",
      exercises: "Predict, then validate",
      decoder: "Hand only training documents to BPE",
    },
    rustCaptions: [
      "Different excerpt IDs with shared source context",
      "Load whole documents before tokenization",
      "Validate before exposing partition views",
      "The deterministic Chapter 2 audit",
    ],
    roles: {
      train: { title: "Training", purpose: "Used to learn" },
      validation: { title: "Validation", purpose: "Used to choose" },
      test: { title: "Test", purpose: "Reserved for post-selection evidence" },
    },
    diagramTitle: "One corpus, three disjoint document sets",
    fixtureCounts:
      "8 / 2 / 2 (eight documents in training, two in validation, and two in test)",
    overlapExplanation:
      "Different IDs alone do not prove that the underlying text is different.",
    readingGuide:
      "Use each region heading to identify its partition, then use the stable ID on each card to verify that every document appears exactly once.",
    formatBoundary:
      "Corpus::from_json accepts the JSON text as &str, so Rust guarantees valid UTF-8 before the method begins.",
    semanticBoundary:
      "Those format checks do not validate whether the document assignments satisfy the train/validation/test invariants.",
    scopeFragments: [
      "In the demonstrated course execution, test cannot fit or select: Chapter 34 gives one local evaluator instance access only after selection. That order does not claim that the checked-in fixture has never been read during repository development.",
      "The generic test role is post-selection evidence. In this course, the enforceable guarantee is narrower: test cannot affect the selected state inside one execution, while the checked-in result may be rerun as repository regression evidence.",
    ],
    staleScopeClaims: [
      "Test stays sealed until the final evaluation chapter.",
      "Test is used only once for the final report.",
      "The checked-in test fixture has never been read.",
    ],
    documentCountLabel: "Documents",
    wholeDocument: "Whole document",
    assignedLabel: "Assigned documents",
    repeatedLabel: "Repeated IDs",
    invariants: [
      "Complete: every corpus ID appears",
      "Disjoint: no corpus ID repeats",
      "Paired provenance stays in one partition",
    ],
    exerciseSummary: "Check your predictions",
    exerciseAnswer:
      "The changed corpus bytes cause a checksum mismatch first. If only the recorded checksum were refreshed, coverage validation would then report that the manifest omits doc-07.",
  },
  ru: {
    indexTitle: "От текста к небольшой языковой модели",
    chapterTitle: "Документы корпуса и фиксированное разбиение на выборки",
    revisionLabel: "Версия материала",
    headings: {
      formula: "Полнота и непересечение в одной записи",
      history:
        "До появления надёжного разделения обучающих и отложенных данных",
      rust: "Проверьте границу данных в Rust",
      visualization:
        "Проверьте распределение всех двенадцати документов на одной диаграмме",
      exercises: "Сначала предскажите, затем проверьте",
      decoder: "Передайте алгоритму BPE только обучающие документы",
    },
    rustCaptions: [
      "Разные ID фрагментов с общим исходным контекстом",
      "Загрузка целых документов до токенизации",
      "Проверка перед возвратом заимствованных ссылок на документы",
      "Воспроизводимая проверка главы 2",
    ],
    roles: {
      train: { title: "Обучающая", purpose: "Для обучения" },
      validation: { title: "Валидационная", purpose: "Для выбора настроек" },
      test: {
        title: "Тестовая",
        purpose: "Для оценки после завершения выбора",
      },
    },
    diagramTitle: "Один корпус, три непересекающиеся выборки",
    fixtureCounts:
      "8 / 2 / 2 (восемь документов в обучающей выборке, два — в валидационной и два — в тестовой)",
    overlapExplanation:
      "Разные ID сами по себе ещё не означают, что за ними стоит разный текст.",
    readingGuide:
      "По заголовку каждой области определите, какая это выборка, а по стабильному ID на каждой карточке проверьте, что каждый документ встречается ровно один раз.",
    formatBoundary:
      "Corpus::from_json принимает текст JSON как &str. Тип &str уже гарантирует корректность UTF-8.",
    semanticBoundary:
      "Эти проверки формата не определяют, соблюдены ли инварианты распределения документов между обучающей, валидационной и тестовой выборками.",
    scopeFragments: [
      "В показанном запуске тестовая выборка не участвует ни в обучении, ни в выборе: в главе 34 один локальный экземпляр оценщика получит к ней доступ только после завершения выбора. Такой порядок внутри запуска ничего не утверждает о том, сколько раз сохранённый в репозитории пример читали при разработке.",
      "Общая роль тестовой выборки — предоставлять данные для оценки после завершения выбора. Гарантия, которую обеспечивает программа, имеет более узкую область: в пределах одного запуска тест не может повлиять на выбранное состояние, а проверка сохранённого в репозитории примера может выполняться повторно как регрессионная.",
      "повторное использование известного примера в последующих запусках служит регрессионной проверкой, а не даёт новую независимую оценку",
    ],
    staleScopeClaims: [
      "Тестовая выборка остаётся закрытой до главы итоговой оценки.",
      "Тестовую выборку используют только один раз для итогового отчёта.",
      "Сохранённый тестовый пример прежде никто не открывал.",
    ],
    documentCountLabel: "Документов",
    wholeDocument: "Целый документ",
    assignedLabel: "Распределено документов",
    repeatedLabel: "Повторяющихся ID",
    invariants: [
      "Полнота: присутствует каждый ID корпуса",
      "Непересечение: ID не повторяются",
      "Документы из одной группы происхождения остаются в одной выборке",
    ],
    exerciseSummary: "Проверьте ответы",
    exerciseAnswer:
      "Сначала будет обнаружено несовпадение контрольной суммы, поскольку байты корпуса изменились. Если обновить только записанную контрольную сумму, проверка полноты затем сообщит, что в манифесте нет doc-07.",
  },
} as const satisfies Record<ChapterLocale, unknown>;

async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolveFrame) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame())),
    );
  });
}

async function readDiagramGeometry(diagram: Locator) {
  return diagram.evaluate((root) => {
    const tolerance = 2;
    const problems: string[] = [];
    const boxes = Array.from(
      root.querySelectorAll<HTMLElement>("[data-diagram-box]"),
    );
    const allElements = [root, ...root.querySelectorAll<HTMLElement>("*")];
    const fontSizes = allElements.flatMap((element, index) => {
      if (
        element.closest("[data-diagram-full-view-controls]") ||
        element.closest(".visually-hidden, .katex-mathml")
      ) {
        return [];
      }
      const style = getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") return [];
      const hasDirectText = [...element.childNodes].some(
        (child) =>
          child.nodeType === Node.TEXT_NODE &&
          Boolean(child.textContent?.trim()),
      );
      if (!hasDirectText && !element.classList.contains("katex")) return [];
      return [{ index, pixels: Number.parseFloat(style.fontSize) }];
    });

    const visibleTextRectangles = (owner: HTMLElement) => {
      const rectangles: DOMRect[] = [];
      const walker = document.createTreeWalker(owner, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const textNode = walker.currentNode as Text;
        if (!textNode.textContent?.trim()) continue;
        const parent = textNode.parentElement;
        if (!parent || parent.closest(".visually-hidden, .katex-mathml"))
          continue;
        const style = getComputedStyle(parent);
        if (style.display === "none" || style.visibility === "hidden") continue;
        const range = document.createRange();
        range.selectNodeContents(textNode);
        rectangles.push(
          ...Array.from(range.getClientRects()).filter(
            (rectangle) => rectangle.width > 0 && rectangle.height > 0,
          ),
        );
      }
      return rectangles;
    };

    for (const [index, box] of boxes.entries()) {
      const style = getComputedStyle(box);
      const borderWidths = [
        Number.parseFloat(style.borderTopWidth),
        Number.parseFloat(style.borderRightWidth),
        Number.parseFloat(style.borderBottomWidth),
        Number.parseFloat(style.borderLeftWidth),
      ];
      const borderStyles = [
        style.borderTopStyle,
        style.borderRightStyle,
        style.borderBottomStyle,
        style.borderLeftStyle,
      ];
      if (
        borderWidths.some((width) => !Number.isFinite(width) || width <= 0) ||
        borderStyles.some((value) => value === "none" || value === "hidden")
      ) {
        problems.push(`box-${index}: incomplete border`);
      }
      const inlineDebt = Math.max(0, box.scrollWidth - box.clientWidth);
      const blockDebt = Math.max(0, box.scrollHeight - box.clientHeight);
      if (inlineDebt > tolerance || blockDebt > tolerance) {
        problems.push(`box-${index}: scroll debt ${inlineDebt}/${blockDebt}`);
      }
      if (style.overflowX === "hidden" || style.overflowX === "clip") {
        problems.push(`box-${index}: clipped inline overflow`);
      }
      if (style.overflowY === "hidden" || style.overflowY === "clip") {
        problems.push(`box-${index}: clipped block overflow`);
      }

      const rectangle = box.getBoundingClientRect();
      const inner = {
        left: rectangle.left + borderWidths[3]!,
        right: rectangle.right - borderWidths[1]!,
        top: rectangle.top + borderWidths[0]!,
        bottom: rectangle.bottom - borderWidths[2]!,
      };
      for (const paint of visibleTextRectangles(box)) {
        if (
          paint.left < inner.left - tolerance ||
          paint.right > inner.right + tolerance ||
          paint.top < inner.top - tolerance ||
          paint.bottom > inner.bottom + tolerance
        ) {
          problems.push(`box-${index}: painted text crossed its border`);
          break;
        }
      }
    }

    for (const formula of root.querySelectorAll<HTMLElement>(".katex")) {
      const owner = formula.closest<HTMLElement>("[data-diagram-box]");
      if (!owner) {
        problems.push("formula has no bounded owner");
        continue;
      }
      const formulaRect = formula.getBoundingClientRect();
      const ownerRect = owner.getBoundingClientRect();
      if (
        formulaRect.left < ownerRect.left - tolerance ||
        formulaRect.right > ownerRect.right + tolerance ||
        formulaRect.top < ownerRect.top - tolerance ||
        formulaRect.bottom > ownerRect.bottom + tolerance
      ) {
        problems.push("formula crossed its bounded owner");
      }
    }

    return {
      blockBudget: Math.ceil(root.clientHeight * 0.2),
      blockDebt: Math.max(0, root.scrollHeight - root.clientHeight),
      blockViewport: root.clientHeight,
      boxCount: boxes.length,
      fontSizes,
      inlineDebt: Math.max(0, root.scrollWidth - root.clientWidth),
      problems,
    };
  });
}

async function expectChapterContent(
  page: Page,
  locale: ChapterLocale,
  expectedColumns: number,
  chapters: readonly CourseChapterLink[],
) {
  const localized = copy[locale];

  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale,
    order: 2,
    revision: contentRevision,
    revisionLabel: localized.revisionLabel,
    title: localized.chapterTitle,
  });

  for (const heading of Object.values(localized.headings)) {
    await expect(
      page.getByRole("heading", { level: 2, name: heading }),
    ).toBeVisible();
  }
  await expect(
    page.locator("p").filter({ hasText: localized.fixtureCounts }),
  ).toHaveCount(1);
  await expect(
    page.locator("p").filter({ hasText: localized.overlapExplanation }),
  ).toHaveCount(1);
  await expect(
    page.locator("p").filter({ hasText: localized.readingGuide }),
  ).toHaveCount(1);
  await expect(
    page.locator("p").filter({ hasText: localized.formatBoundary }),
  ).toHaveCount(1);
  await expect(
    page.locator("p").filter({ hasText: localized.semanticBoundary }),
  ).toHaveCount(1);
  const lessonText = (await page.locator(".lesson-body").innerText()).replace(
    /\s+/g,
    " ",
  );
  for (const fragment of localized.scopeFragments) {
    expect(lessonText).toContain(fragment);
  }
  for (const staleClaim of localized.staleScopeClaims) {
    expect(lessonText).not.toContain(staleClaim);
  }

  const displayedFormula = page.locator(".katex-display");
  await expect(displayedFormula).toHaveCount(1);
  await expect(displayedFormula).toHaveCSS("direction", "ltr");
  await expect(
    displayedFormula.locator('annotation[encoding="application/x-tex"]'),
  ).toHaveText(formulaLatex);

  const rustSources = page.locator("figure.rust-source");
  await expect(rustSources).toHaveCount(4);
  const highlightedRust = rustSources.locator(
    'pre.rust-source-code.astro-code.github-dark-high-contrast[data-language="rust"]',
  );
  await expect(highlightedRust).toHaveCount(4);
  const highlightingEvidence = await highlightedRust.evaluateAll((blocks) =>
    blocks.map((block) => ({
      lineCount: block.querySelectorAll("code > span.line").length,
      tokenColors: [
        ...new Set(
          Array.from(
            block.querySelectorAll<HTMLElement>('code span[style*="color"]'),
          )
            .map((token) => token.style.color)
            .filter(Boolean),
        ),
      ],
      tabIndex: block.getAttribute("tabindex"),
      label: block.getAttribute("aria-label"),
      direction: block.getAttribute("dir"),
    })),
  );
  for (const evidence of highlightingEvidence) {
    expect(evidence.lineCount).toBeGreaterThan(0);
    expect(evidence.tokenColors.length).toBeGreaterThan(1);
    expect(evidence.tabIndex).toBe("0");
    expect(evidence.label).toBeTruthy();
    expect(evidence.direction).toBe("ltr");
  }
  expect(
    await highlightedRust
      .locator("code")
      .evaluateAll((blocks) => blocks.map((block) => block.textContent)),
  ).toEqual(expectedRustSources);
  await expect(rustSources.locator("figcaption span")).toHaveText([
    ...localized.rustCaptions,
  ]);
  expect(
    await rustSources.evaluateAll((sources) =>
      sources.map((source) => source.getAttribute("data-source-region")),
    ),
  ).toEqual([
    "overlapping-excerpts",
    "document-loader",
    "partition-invariants",
    "chapter-output",
  ]);
  await highlightedRust.first().focus();
  await expect(highlightedRust.first()).toBeFocused();

  await expectVisualizationDecision(page, {
    decision: "useful",
    id: "corpus-partitions",
  });
  const diagram = page.locator(
    'figure[data-visualization-id="corpus-partitions"]',
  );
  await expect(diagram.locator(":scope > figcaption > h3")).toHaveText(
    localized.diagramTitle,
  );
  const partitionCards = diagram.locator(".partition-card");
  await expect(partitionCards).toHaveCount(3);

  for (const role of ["train", "validation", "test"] as const) {
    const partition = diagram.locator(`[data-partition="${role}"]`);
    await expect(partition).toHaveCount(1);
    await expect(
      partition.getByRole("heading", {
        level: 3,
        name: localized.roles[role].title,
      }),
    ).toBeVisible();
    await expect(partition.locator(".partition-purpose")).toHaveText(
      localized.roles[role].purpose,
    );
    await expect(partition.locator(".document-count span")).toHaveText(
      localized.documentCountLabel,
    );
    await expect(partition.locator(".document-count strong")).toHaveText(
      String(manifest[role].length),
    );
    await expect(partition.locator(".document-card")).toHaveCount(
      manifest[role].length,
    );
    expect(
      await partition
        .locator(".document-card")
        .evaluateAll((cards) =>
          cards.map((card) => card.getAttribute("data-document-id")),
        ),
    ).toEqual(manifest[role]);
  }

  const allIds = [...manifest.train, ...manifest.validation, ...manifest.test];
  await expect(diagram.locator(".document-card")).toHaveCount(allIds.length);
  await expect(diagram.locator(".whole-document")).toHaveText(
    allIds.map(() => localized.wholeDocument),
  );
  expect(
    await diagram
      .locator(".document-card")
      .evaluateAll((cards) =>
        cards.every(
          (card) =>
            Boolean(card.getAttribute("data-language")) &&
            Boolean(card.getAttribute("data-provenance-group")),
        ),
      ),
  ).toBe(true);
  expect(
    await diagram
      .locator("[data-document-id]")
      .evaluateAll(
        (cards) =>
          new Set(cards.map((card) => card.getAttribute("data-document-id")))
            .size,
      ),
  ).toBe(allIds.length);
  await expect(diagram.locator(".partition-summary p").nth(0)).toContainText(
    localized.assignedLabel,
  );
  await expect(
    diagram.locator(
      '[data-assigned-count] annotation[encoding="application/x-tex"]',
    ),
  ).toHaveText(String.raw`\frac{12}{12}`);
  await expect(diagram.locator(".partition-summary p").nth(1)).toContainText(
    localized.repeatedLabel,
  );
  await expect(diagram.locator("[data-repeated-count]")).toHaveText("0");
  await expect(diagram.locator(".partition-invariants li")).toHaveText([
    ...localized.invariants,
  ]);
  expect(
    await diagram
      .locator("code")
      .evaluateAll((codes) =>
        codes.every(
          (code) =>
            code.getAttribute("dir") === "ltr" &&
            window.getComputedStyle(code).direction === "ltr",
        ),
      ),
  ).toBe(true);
  await diagram.focus();
  await expect(diagram).toBeFocused();
  const columnCount = await diagram
    .locator(".partition-grid")
    .evaluate(
      (grid) =>
        window
          .getComputedStyle(grid)
          .gridTemplateColumns.split(/\s+/)
          .filter(Boolean).length,
    );
  expect(columnCount).toBe(expectedColumns);
  await settle(page);
  const geometry = await readDiagramGeometry(diagram);
  expect(geometry.boxCount).toBe(16);
  expect(geometry.inlineDebt).toBeLessThanOrEqual(2);
  expect(geometry.problems).toEqual([]);

  const exerciseDetails = page.locator(".lesson-body details");
  await expect(exerciseDetails).toHaveCount(1);
  await expect(exerciseDetails.locator("summary")).toHaveText(
    localized.exerciseSummary,
  );
  await exerciseDetails.locator("summary").click();
  await expect(exerciseDetails).toHaveAttribute("open", "");
  await expect(exerciseDetails).toContainText(localized.exerciseAnswer);

  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expectNoOverflowOrClientScripts(page);
}

test.describe(
  "chapter 2 localized vertical slice",
  { tag: chapterTag(chapterId) },
  () => {
    test("chapter 2 is second on every course index and preserves locale switching", async ({
      page,
    }) => {
      for (const locale of chapterLocales) {
        const localized = copy[locale];
        const localeDefinition = chapterLocaleDefinitions.find(
          ({ code }) => code === locale,
        );
        expect(localeDefinition).toBeDefined();
        const chapters = await readOrderedCourseChapters(page, locale);
        expect(chapters.length).toBeGreaterThanOrEqual(2);
        expect(chapters[1]).toEqual(
          expect.objectContaining({
            chapterId,
            order: 2,
            title: localized.chapterTitle,
          }),
        );
        await expect(page.locator("html")).toHaveAttribute(
          "lang",
          localeDefinition?.languageTag ?? "",
        );
        await expect(
          page.getByRole("heading", { level: 1, name: localized.indexTitle }),
        ).toBeVisible();

        await page.getByRole("link", { name: localized.chapterTitle }).click();
        await expectLocalizedChapterRoute(page, {
          chapterId,
          locale,
          order: 2,
          revision: contentRevision,
          revisionLabel: localized.revisionLabel,
          title: localized.chapterTitle,
        });
        await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
        await expectNoOverflowOrClientScripts(page);
      }

      for (const source of chapterLocaleDefinitions) {
        for (const target of chapterLocaleDefinitions.filter(
          ({ code }) => code !== source.code,
        )) {
          await page.goto(chapterPath(source.code, chapterId));
          await page
            .locator(`.locale-switch a[data-locale="${target.code}"]`)
            .click();
          await expect(page).toHaveURL(
            new RegExp(`${chapterPath(target.code, chapterId)}$`),
          );
          await expect(page.locator("html")).toHaveAttribute(
            "lang",
            target.languageTag,
          );
          await expect(
            page.getByRole("heading", {
              level: 1,
              name: copy[target.code].chapterTitle,
            }),
          ).toBeVisible();
        }
      }
    });

    for (const locale of chapterLocales) {
      test(`chapter 2 ${locale} lesson renders every learning element at desktop and narrow widths`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: 1440, height: 1000 });
        const chapters = await readOrderedCourseChapters(page, locale);
        await page.goto(chapterPath(locale, chapterId));
        await expectChapterContent(page, locale, 3, chapters);

        await page.setViewportSize({ width: 390, height: 844 });
        await page.reload();
        await expectChapterContent(page, locale, 1, chapters);
      });
    }

    test("chapter 2 full view keeps all partition evidence readable without substantial travel", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      for (const locale of chapterLocales) {
        const localized = copy[locale];
        await page.goto(chapterPath(locale, chapterId));
        await page.waitForFunction(
          () =>
            document.documentElement.dataset.diagramFullViewReady === "true",
        );
        await settle(page);

        const diagram = page.locator(
          'figure[data-visualization-id="corpus-partitions"]',
        );
        const toggle = diagram.locator("[data-diagram-full-view-toggle]");
        await expect(toggle).toBeVisible();
        const inlineGeometry = await readDiagramGeometry(diagram);
        const inlineMarkup = await diagram.evaluate((root) => {
          const clone = root.cloneNode(true) as HTMLElement;
          clone.querySelector("[data-diagram-full-view-controls]")?.remove();
          return clone.innerHTML;
        });

        await toggle.click();
        await page.waitForFunction(
          () =>
            document.fullscreenElement?.getAttribute(
              "data-visualization-id",
            ) === "corpus-partitions",
        );
        await settle(page);

        const fullGeometry = await readDiagramGeometry(diagram);
        expect(fullGeometry.blockDebt).toBeLessThanOrEqual(
          fullGeometry.blockBudget,
        );
        expect(fullGeometry.inlineDebt).toBeLessThanOrEqual(2);
        expect(fullGeometry.boxCount).toBe(16);
        expect(fullGeometry.problems).toEqual([]);
        expect(fullGeometry.fontSizes).toHaveLength(
          inlineGeometry.fontSizes.length,
        );
        for (const [index, full] of fullGeometry.fontSizes.entries()) {
          const inline = inlineGeometry.fontSizes[index];
          expect(full?.index).toBe(inline?.index);
          expect((full?.pixels ?? 0) + 0.01).toBeGreaterThanOrEqual(
            inline?.pixels ?? Number.POSITIVE_INFINITY,
          );
        }

        expect(
          await diagram.evaluate((root) => {
            const clone = root.cloneNode(true) as HTMLElement;
            clone.querySelector("[data-diagram-full-view-controls]")?.remove();
            return clone.innerHTML;
          }),
        ).toBe(inlineMarkup);
        expect(
          await diagram
            .locator("[data-partition]")
            .evaluateAll((partitions) =>
              partitions.map((partition) =>
                partition.getAttribute("data-partition"),
              ),
            ),
        ).toEqual(["train", "validation", "test"]);
        expect(
          await diagram
            .locator("[data-document-id]")
            .evaluateAll((cards) =>
              cards.map((card) => card.getAttribute("data-document-id")),
            ),
        ).toEqual([
          ...manifest.train,
          ...manifest.validation,
          ...manifest.test,
        ]);
        await expect(
          diagram.locator(
            '[data-assigned-count] annotation[encoding="application/x-tex"]',
          ),
        ).toHaveText(String.raw`\frac{12}{12}`);
        await expect(diagram.locator("[data-repeated-count]")).toHaveText("0");
        await expect(diagram.locator(".partition-invariants li")).toHaveText([
          ...localized.invariants,
        ]);

        const composition = await diagram.evaluate((root) => {
          const train = root
            .querySelector<HTMLElement>('[data-partition="train"]')!
            .getBoundingClientRect();
          const validation = root
            .querySelector<HTMLElement>('[data-partition="validation"]')!
            .getBoundingClientRect();
          const test = root
            .querySelector<HTMLElement>('[data-partition="test"]')!
            .getBoundingClientRect();
          const trackCount = (selector: string) =>
            getComputedStyle(root.querySelector<HTMLElement>(selector)!)
              .gridTemplateColumns.split(/\s+/)
              .filter(Boolean).length;
          return {
            holdoutTopDelta: Math.abs(validation.top - test.top),
            trainBeforeHoldouts:
              train.bottom <= Math.min(validation.top, test.top) + 2,
            trainTracks: trackCount('[data-partition="train"] .document-list'),
            validationTracks: trackCount(
              '[data-partition="validation"] .document-list',
            ),
            testTracks: trackCount('[data-partition="test"] .document-list'),
          };
        });
        expect(composition.trainBeforeHoldouts).toBe(true);
        expect(composition.holdoutTopDelta).toBeLessThanOrEqual(2);
        expect(composition.trainTracks).toBe(4);
        expect(composition.validationTracks).toBe(2);
        expect(composition.testTracks).toBe(2);

        await page.keyboard.press("Escape");
        await page.waitForFunction(() => document.fullscreenElement === null);
        await expect(toggle).toBeFocused();
        await expectNoOverflowOrClientScripts(page);
      }
    });

    test("chapter 2 keeps one coherent full-view composition at the minimum supported viewport", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1024, height: 576 });
      for (const locale of chapterLocales) {
        await page.goto(chapterPath(locale, chapterId));
        await page.waitForFunction(
          () =>
            document.documentElement.dataset.diagramFullViewReady === "true",
        );
        await settle(page);

        const diagram = page.locator(
          'figure[data-visualization-id="corpus-partitions"]',
        );
        const toggle = diagram.locator("[data-diagram-full-view-toggle]");
        await expect(toggle).toBeVisible();
        await toggle.click();
        await page.waitForFunction(
          () =>
            document.fullscreenElement?.getAttribute(
              "data-visualization-id",
            ) === "corpus-partitions",
        );
        await settle(page);

        const geometry = await readDiagramGeometry(diagram);
        expect(geometry.blockDebt).toBeLessThanOrEqual(geometry.blockViewport);
        expect(geometry.inlineDebt).toBeLessThanOrEqual(2);
        expect(geometry.boxCount).toBe(16);
        expect(geometry.problems).toEqual([]);
        const tracks = await diagram.evaluate((root) => {
          const trackCount = (element: Element) =>
            getComputedStyle(element)
              .gridTemplateColumns.split(/\s+/)
              .filter(Boolean).length;
          return {
            figure: trackCount(root),
            partitions: trackCount(root.querySelector(".partition-grid")!),
            train: trackCount(
              root.querySelector('[data-partition="train"] .document-list')!,
            ),
            validation: trackCount(
              root.querySelector(
                '[data-partition="validation"] .document-list',
              )!,
            ),
            test: trackCount(
              root.querySelector('[data-partition="test"] .document-list')!,
            ),
          };
        });
        expect(tracks).toEqual({
          figure: 2,
          partitions: 2,
          train: 4,
          validation: 2,
          test: 2,
        });

        await page.keyboard.press("Escape");
        await page.waitForFunction(() => document.fullscreenElement === null);
        await expect(toggle).toBeFocused();
        await expectNoOverflowOrClientScripts(page);
      }
    });
  },
);
