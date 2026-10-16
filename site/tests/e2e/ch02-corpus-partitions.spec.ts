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
const contentRevision = 10;
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
      formula: "Express coverage and separation as sets",
      history: "Preserve the source boundary behind each ID",
      rust: "Inspect the existing document and split checks",
      visualization: "Follow all twelve documents in the fixed corpus",
      exercises: "Optional inspection and reproduction",
      decoder: "Give BPE only the training documents",
    },
    rustCaptions: [
      "Two overlapping windows from one source sentence",
      "Load whole source documents in their original order",
      "Check membership, source order, and declared provenance before returning views",
      "Report the fixed split and its eight-document training handoff",
    ],
    roles: {
      train: { title: "Training", purpose: "Fits tokenizer rules and model weights" },
      validation: { title: "Validation", purpose: "Compares choices fitted on training data" },
      test: { title: "Test", purpose: "Reports results after choices are fixed" },
    },
    diagramTitle: "Twelve whole documents assigned to three roles",
    fixtureCounts:
      "eight documents in four groups. Validation contains the night-station pair: two documents in one group. Test contains the winter-window pair: two documents in one group.",
    overlapExplanation:
      "If we name those windows separately and put one in training and the other in validation, the IDs differ but source context crosses the role boundary.",
    readingGuide:
      "The figure lists every exact ID, language, and group. Its three lists are peer sets, not stages through which a document moves. Read each card as one whole document and read the cards within each role in corpus source order:",
    formatBoundary:
      "Its input is JSON text as &str, so valid UTF-8 is already guaranteed at that boundary.",
    semanticBoundary:
      "successful JSON decoding alone says nothing about whether its assignments are a valid split of this corpus.",
    scopeFragments: [
      "Chapter 34 later demonstrates that order with a local evaluator inside one execution. Its gate cannot enforce unique access across all callers or later executions, and its caller-supplied provenance labels do not independently establish data history.",
      "Rerunning a known test result checks for regression; it does not supply a fresh, independent estimate of generalization each time.",
    ],
    staleScopeClaims: [
      "Test stays sealed until the final evaluation chapter.",
      "Test is used only once for the final report.",
      "The checked-in test fixture has never been read.",
    ],
    documentCountLabel: "Documents",
    wholeDocument: "Whole source document",
    assignedLabel: "Assigned corpus documents",
    repeatedLabel: "Repeated document IDs",
    invariants: [
      "Complete: every corpus document is assigned",
      "Disjoint: no document is assigned to different roles",
      "Every declared provenance group stays in one role",
    ],
    exerciseSummary: "Read the checked explanations and reproduction results",
    exerciseAnswer:
      "A match reports the recorded 64-bit checksum, not guaranteed byte identity or authenticity.",
    cheatSheetBpe: {
      term: "Byte-pair encoding (BPE)",
      definition:
        "The tokenizer learned in Chapter 3 using pair counts from training documents only, with no pair counted across a document boundary; frozen rules can later encode holdout text.",
    },
  },
  ru: {
    indexTitle: "От текста к небольшой языковой модели",
    chapterTitle: "Документы корпуса и фиксированное разбиение на выборки",
    revisionLabel: "Версия материала",
    headings: {
      formula: "Запишите полноту и непересечение через множества",
      history:
        "Сохраняйте исходные границы за каждым ID",
      rust: "Изучите существующие проверки документов и разбиения",
      visualization:
        "Проследите все двенадцать документов корпуса",
      exercises: "Необязательная проверка примеров и запуск",
      decoder: "Передайте BPE только обучающие документы",
    },
    rustCaptions: [
      "Два перекрывающихся окна из одного исходного предложения",
      "Загрузка целых исходных документов с сохранением порядка",
      "Проверка состава выборок, порядка и объявленных групп происхождения до возврата представлений",
      "Фиксированное разбиение и передача восьми обучающих документов",
    ],
    roles: {
      train: { title: "Обучающая", purpose: "Обучение токенизатора и весов модели" },
      validation: { title: "Валидация", purpose: "Сравнение вариантов, обученных на обучающей выборке" },
      test: {
        title: "Тестовая",
        purpose: "Отчёт после завершения выбора",
      },
    },
    diagramTitle: "Двенадцать целых документов в трёх выборках",
    fixtureCounts:
      "восемь документов в четырёх группах. Валидационная выборка содержит пару night-station — два документа одной группы. Тестовая содержит пару winter-window — также два документа одной группы.",
    overlapExplanation:
      "Если дать окнам разные имена и поместить одно в обучение, а другое — в валидацию, ID будут различаться, но исходный контекст окажется по обе стороны границы.",
    readingGuide:
      "На схеме приведены точные ID, языки и группы всех документов. Три списка — равноправные множества, а не этапы перемещения документа. Каждая карточка представляет целый документ; карточки внутри выборки идут в порядке корпуса:",
    formatBoundary:
      "Его вход — текст JSON в виде &str, поэтому на этой границе уже гарантирован корректный UTF-8.",
    semanticBoundary:
      "успешное декодирование JSON само по себе ничего не говорит о корректности разбиения этого корпуса.",
    scopeFragments: [
      "В главе 34 этот порядок показан локальным механизмом оценки внутри одного выполнения. Такой механизм не обеспечивает однократный доступ к тестовым данным за пределами одного выполнения: другие программы и будущие запуски могут прочитать их снова. Переданные вызывающей стороной метки происхождения сами по себе не дают независимого подтверждения истории данных.",
      "Более позднее сравнение специально подобрано, а его известный результат служит проверке регрессий, не оценке обобщения на нетронутых данных.",
      "Повторный запуск с известным тестовым результатом проверяет отсутствие регрессий, а не даёт каждый раз новую независимую оценку способности модели обобщать.",
    ],
    staleScopeClaims: [
      "Тестовая выборка остаётся закрытой до главы итоговой оценки.",
      "Тестовую выборку используют только один раз для итогового отчёта.",
      "Сохранённый тестовый пример прежде никто не открывал.",
    ],
    documentCountLabel: "Документов",
    wholeDocument: "Целый документ",
    assignedLabel: "Распределено документов",
    repeatedLabel: "Повторов ID",
    invariants: [
      "Полнота: распределён каждый документ корпуса",
      "Непересечение: ни один документ не отнесён к разным выборкам",
      "Каждая объявленная группа происхождения остаётся в одной выборке",
    ],
    exerciseSummary: "Проверенные объяснения и результаты запуска",
    exerciseAnswer:
      "Совпадение сообщает о записанном 64-битном значении, но не гарантирует тождество байтов или подлинность.",
    cheatSheetBpe: {
      term: "Кодирование пар байтов (BPE)",
      definition:
        "Токенизатор из главы 3, который учится по частотам пар только в обучающих документах, без подсчёта пар через границы документов; зафиксированные правила затем могут кодировать отложенный текст.",
    },
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

  const staticResponse = await page.request.get(chapterPath(locale, chapterId));
  expect(staticResponse.ok(), `${locale} Chapter 2 static response`).toBe(true);
  const staticHtml = await staticResponse.text();
  const staticCheatSheet = await page.evaluate(
    ({ html, bpeTerm }) => {
      const parsed = new DOMParser().parseFromString(html, "text/html");
      const roots = parsed.querySelectorAll<HTMLElement>("[data-cheat-sheet]");
      const root = roots.item(0);
      const bpeEntries = root
        ? [...root.querySelectorAll<HTMLElement>(".cheat-sheet-term")]
            .filter(
              (entry) => entry.querySelector("dt")?.textContent === bpeTerm,
            )
            .map((entry) => ({
              definition: entry.querySelector("dd")?.textContent ?? "",
              term: entry.querySelector("dt")?.textContent ?? "",
            }))
        : [];
      return {
        bpeEntries,
        definitionCount: root?.querySelectorAll("dd").length ?? 0,
        pageCount: root?.getAttribute("data-cheat-sheet-page-count") ?? null,
        pageElementCount:
          root?.querySelectorAll("[data-cheat-sheet-page]").length ?? 0,
        paginationCount:
          root?.querySelectorAll("[data-cheat-sheet-pagination]").length ?? 0,
        rootCount: roots.length,
        termCount: root?.querySelectorAll("dt").length ?? 0,
      };
    },
    { html: staticHtml, bpeTerm: localized.cheatSheetBpe.term },
  );
  expect(staticCheatSheet).toEqual({
    bpeEntries: [localized.cheatSheetBpe],
    definitionCount: 10,
    pageCount: "1",
    pageElementCount: 1,
    paginationCount: 0,
    rootCount: 1,
    termCount: 10,
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
          const caption = root
            .querySelector<HTMLElement>("figcaption")!
            .getBoundingClientRect();
          const actions = root
            .querySelector<HTMLElement>("[data-diagram-full-view-controls]")!
            .getBoundingClientRect();
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
            captionActionTopDelta: Math.abs(caption.top - actions.top),
            figureTracks: getComputedStyle(root)
              .gridTemplateColumns.split(/\s+/)
              .filter(Boolean).length,
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
        expect(composition.figureTracks).toBe(3);
        expect(composition.captionActionTopDelta).toBeLessThanOrEqual(2);
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
          figure: 3,
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
