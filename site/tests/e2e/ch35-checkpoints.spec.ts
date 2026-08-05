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

const chapterId = "35-checkpoints";
type ChapterLocale = "en" | "ru";
const locales = ["en", "ru"] as const satisfies readonly ChapterLocale[];
const copy = {
  en: {
    revisionLabel: "Content revision",
    title: "Save every state, resume exactly",
    description:
      "Learn how a versioned LLM checkpoint stores tokenizer and decoder configuration, parameters, optimizer moments, and RNG state, rejects corrupted bytes, and resumes with identical logits and one identical update.",
    headings: [
      "Freeze the whole state, not only weights",
      "Advance each offset by shape times byte width",
      "Separate record order, shape, and representation",
      "From artifact bundles to validated LLM checkpoints",
      "Encode, validate, and replace atomically",
      "Audit the byte layout before trusting the payload",
      "Predict offsets before loading corruptions",
      "Load the same state before choosing a token",
    ],
    tableCaption: "Contiguous grouped byte spans in the Chapter 35 checkpoint",
    tableHeaders: [
      "Record or group",
      "Role",
      "Dtype",
      "Shape or count",
      "Bytes per element",
      "Half-open byte range",
    ],
    historyFragments: [
      "This progression follows the state needed to preserve a language model’s meaning",
      "The script does not establish a single self-contained file, exact training resumption",
      "does not by itself define tokenizer, decoder configuration, optimizer, RNG",
      "does not describe GPT-2 or safetensors as a raw-memory dump",
    ],
    checksumFragment:
      "FNV-1a detects accidental corruption; it does not authenticate",
    atomicFragment: "supported Unix same-filesystem rename semantics",
    adjacencyFragment:
      "Each row must begin exactly where the previous row ends",
    evidenceFragment: "Together with the exact round trip and resumed update",
    answerFragment:
      "FNV-1a detects accidental corruption but provides no authentication",
    ownershipFragments: [
      "Checkpoint::from_snapshot receives selected model state and an optimizer that their callers still need",
      "This validation finishes before optimizer tensors are decoded",
      "into_model consumes the checkpoint and moves its model buffers",
    ],
  },
  ru: {
    revisionLabel: "Версия материала",
    title: "Сохраните всё состояние и продолжите без расхождений",
    description:
      "Разберитесь, как контрольная точка LLM с версией формата сохраняет токенизатор и конфигурацию декодера, параметры, моменты AdamW и состояние генератора псевдослучайных чисел, отклоняет повреждённые данные, а после загрузки воспроизводит логиты и следующее обновление без расхождений.",
    headings: [
      "Зафиксируйте всё состояние, а не только веса",
      "Вычисляйте следующее смещение по форме и размеру элемента",
      "Не смешивайте порядок записей, форму и представление значений",
      "От комплектов файлов модели к проверяемым контрольным точкам LLM",
      "Кодируйте и проверяйте данные, затем заменяйте файл атомарно",
      "Проверьте расположение байтов, прежде чем доверять данным",
      "Предскажите смещения, затем проверьте повреждённые файлы",
      "Перед выбором токена загрузите то же состояние",
    ],
    tableCaption:
      "Сгруппированные смежные диапазоны байтов в контрольной точке главы 35",
    tableHeaders: [
      "Запись или группа",
      "Назначение",
      "Тип данных",
      "Форма или число элементов",
      "Размер элемента, байт",
      "Полуоткрытый диапазон байтов",
    ],
    historyFragments: [
      "Эта последовательность показывает, какое состояние нужно сохранять",
      "Этот скрипт не задаёт единый автономный файл, точное продолжение обучения",
      "Сам по себе он не задаёт токенизатор, конфигурацию декодера, оптимизатор",
      "не описывает GPT-2 или safetensors как дамп памяти",
    ],
    checksumFragment:
      "FNV-1a обнаруживает случайные повреждения, но не подтверждает подлинность",
    atomicFragment:
      "атомарная замена в пределах одной файловой системы",
    adjacencyFragment:
      "Каждая строка должна начинаться точно там, где заканчивается предыдущая",
    evidenceFragment:
      "Вместе с точным циклом сохранения-загрузки и одинаковым следующим обновлением",
    answerFragment:
      "FNV-1a обнаруживает случайные повреждения, но не подтверждает подлинность",
    ownershipFragments: [
      "Checkpoint::from_snapshot получает по ссылке состояние выбранной модели и оптимизатор",
      "Проверка модели полностью завершается до декодирования тензоров состояния оптимизатора",
      "При вызове into_model контрольная точка передаётся методу целиком и больше недоступна вызывающему коду",
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
        if (direction !== "ltr") {
          issues.push(source + " is not left-to-right");
        }
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

async function expectChapterContent(
  page: Page,
  chapters: readonly CourseChapterLink[],
  locale: ChapterLocale,
) {
  const expected = copy[locale];
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale,
    order: 35,
    revision: 3,
    revisionLabel: expected.revisionLabel,
    title: expected.title,
    equivalentLocales: ["en", "ru"],
    fallbackRouteSuffix: "/course/",
  });
  await expect(page.locator(".lesson-description")).toHaveText(
    expected.description,
  );
  await expectSeoDescription(page, expected.description);
  await expect(page.locator(".lesson-body h2")).toHaveText(expected.headings);

  const annotations = await page
    .locator('.lesson-body annotation[encoding="application/x-tex"]')
    .allTextContents();
  for (const expected of [
    "o_{k+1}=o_k+b_k\\prod_i n_i^{(k)},\\quad o_0=h",
    "2874+8(5\\cdot4)=3034",
    "5+11+22=38",
    "h=2869",
    "[2869,2874)",
    "o_{k+1}",
    "o_k",
    "b_k",
    "n_i^{(k)}",
    "\\prod_i n_i^{(k)}",
    "o_0=h",
  ]) {
    expect(
      annotations
        .map(normalizeMath)
        .some((formula) => formula.includes(normalizeMath(expected))),
      "expected a rendered formula containing " + expected,
    ).toBe(true);
  }
  expect(annotations).toContain("\\prod_i n_i^{(k)}");
  expect(annotations).not.toContain("prod_i n_i^{(k)}");
  expect(annotations.some((expression) => expression.includes("\\*"))).toBe(
    false,
  );
  await expect(page.locator(".lesson-body .katex-error")).toHaveCount(0);
  await expectFormulaGeometry(page);

  const inlineCode = await page
    .locator(".lesson-body :not(pre) > code")
    .allInnerTexts();
  for (const formerMath of [
    "o_{k+1}",
    "o_k",
    "b_k",
    "n_i^{(k)}",
    "o_0=h",
    "2874+8(5*4)=3034",
  ]) {
    expect(inlineCode).not.toContain(formerMath);
  }

  const table = page.getByRole("table", { name: expected.tableCaption });
  await expect(table).toHaveCount(1);
  await expect(table).toHaveAccessibleName(expected.tableCaption);
  await expect(table).toHaveAttribute("tabindex", "0");
  await expect(table.getByRole("columnheader")).toHaveText(
    expected.tableHeaders,
  );
  await expect(table.locator("tbody tr")).toHaveCount(5);
  await expect(table).toContainText("token_embedding.weight");
  await expect(table).toContainText("[2874,3034)");
  await expect(table).toContainText("[3034,6330)");
  await expect(table).toContainText("412");

  const evidenceBlocks = page.locator(
    ".lesson-body > pre.astro-code:not(.rust-source-code)",
  );
  await expect(evidenceBlocks).toHaveCount(2);
  for (const block of await evidenceBlocks.all()) {
    await expect(block).toHaveAttribute("tabindex", "0");
    await expect(block).toHaveAttribute("data-language", "text");
    await expect(block).toHaveAttribute("dir", "ltr");
    await expect(block).toHaveCSS("overflow-x", "auto");
  }
  await expect(evidenceBlocks.nth(0).locator("code > .line")).toHaveText([
    "4c 4c 4d 43 50 33 35 00 01 00 04 03 02 01 35 0b",
  ]);
  const proof = evidenceBlocks.nth(1);
  await expect(proof.locator("code > .line")).toHaveText([
    "roundtrip=bytes_deterministic:true loaded_bytes_identical:true logits_bits_identical:true logits_fingerprint:fnv1a64:6029064fe7cd162d rng_next_identical:true rng_next:0x9a8c505971939232",
    "resume=learning_rate:0.006000 next_step:9 parameter_bits_identical:true optimizer_state_identical:true logits_bits_identical:true logits_fingerprint:fnv1a64:0b875a0c9f380d8f",
    "reject=version:true vocabulary_mismatch:true truncation:true checksum:true",
    "atomic=replaced_complete_file:true loaded_rng_state:0x9e3779b97f4a7c39 temporary_files:0 unix_same_directory:true",
  ]);
  await expect(proof).toHaveCount(1);
  await expect(proof).toContainText(
    "logits_fingerprint:fnv1a64:6029064fe7cd162d",
  );
  await expect(proof).toContainText(
    "next_step:9 parameter_bits_identical:true optimizer_state_identical:true",
  );
  await expect(proof).toContainText(
    "reject=version:true vocabulary_mismatch:true truncation:true checksum:true",
  );
  await expect(proof).toContainText(
    "atomic=replaced_complete_file:true loaded_rng_state:0x9e3779b97f4a7c39",
  );

  const lessonText = (await page.locator(".lesson-body").innerText()).replace(
    /\s+/g,
    " ",
  );
  for (const fragment of expected.historyFragments) {
    expect(lessonText).toContain(fragment);
  }
  expect(lessonText).toContain(expected.checksumFragment);
  expect(lessonText).toContain(expected.atomicFragment);
  expect(lessonText).toContain(expected.adjacencyFragment);
  expect(lessonText).toContain(expected.evidenceFragment);
  for (const buildMeta of [
    "build instructions",
    "authoring contract",
    "registers no course diagram",
    "full-view control",
    "static HTML",
    "shared lesson-table",
    "shared code-block overflow",
    "private scroller",
    "hydration directive",
    "presentation tree",
  ]) {
    expect(lessonText).not.toContain(buildMeta);
  }
  for (const fragment of expected.ownershipFragments) {
    expect(lessonText).toContain(fragment);
  }

  await expect(
    page.locator(
      '.lesson-body a[href="https://github.com/openai/gpt-2/blob/master/download_model.py"]',
    ),
  ).toHaveCount(1);
  await expect(
    page.locator('.lesson-body a[href="https://arxiv.org/pdf/1910.02054"]'),
  ).toHaveCount(1);
  await expect(
    page.locator(
      '.lesson-body a[href="https://github.com/huggingface/safetensors/blob/main/README.md"]',
    ),
  ).toHaveCount(1);
  await expect(page.locator("figure.rust-source")).toHaveCount(8);
  await expectVisualizationDecision(page, {
    decision: "not-useful",
    id: null,
  });
  await expect(page.locator("[data-diagram-full-view-toggle]")).toHaveCount(0);
  await expect(page.locator("[data-diagram-scroll]")).toHaveCount(0);

  const details = page.locator(".lesson-body details");
  await expect(details).toHaveCount(1);
  await details.locator("summary").click();
  await expect(details.locator("ol > li")).toHaveCount(8);
  await expect(details).toContainText(expected.answerFragment);

  await expectOrderedChapterNavigation(page, locale, chapterId, chapters);
  await expect(
    page.locator(
      'nav[data-chapter-navigation] a[data-chapter-direction="previous"]',
    ),
  ).toHaveAttribute("data-chapter-id", "34-final-evaluation");
  const nextChapter = page.locator(
    'nav[data-chapter-navigation] a[data-chapter-direction="next"]',
  );
  await expect(nextChapter).toHaveAttribute(
    "data-chapter-id",
    "36-temperature-top-k",
  );
  await expectNoOverflowOrClientScripts(page);
}

test.describe(
  "chapter 35 exact checkpoint and resume vertical slice",
  { tag: chapterTag(chapterId) },
  () => {
    test("English and Russian publish reciprocal Chapter 35 routes", async ({
      page,
    }) => {
      for (const locale of locales) {
        const chapters = await readOrderedCourseChapters(page, locale);
        expect(chapters[34]).toEqual(
          expect.objectContaining({
            chapterId,
            order: 35,
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

    test("both Rust-backed checkpoint lessons render at desktop and narrow widths", async ({
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
        const table = page.getByRole("table", {
          name: copy[locale].tableCaption,
        });
        const tableOverflow = await table.evaluate((element) => {
          const node = element as HTMLElement;
          return {
            clientWidth: node.clientWidth,
            overflowX: getComputedStyle(node).overflowX,
            scrollWidth: node.scrollWidth,
          };
        });
        expect(["auto", "scroll"]).toContain(tableOverflow.overflowX);
        expect(tableOverflow.scrollWidth).toBeGreaterThan(
          tableOverflow.clientWidth,
        );
        await table.focus();
        await expect(table).toBeFocused();

        const evidenceBlocks = page.locator(
          ".lesson-body > pre.astro-code:not(.rust-source-code)",
        );
        for (const [index, block] of (
          await evidenceBlocks.all()
        ).entries()) {
          const overflow = await block.evaluate((element) => {
            const node = element as HTMLElement;
            return {
              clientWidth: node.clientWidth,
              overflowX: getComputedStyle(node).overflowX,
              scrollWidth: node.scrollWidth,
            };
          });
          expect(["auto", "scroll"]).toContain(overflow.overflowX);
          expect(overflow.scrollWidth).toBeGreaterThanOrEqual(
            overflow.clientWidth,
          );
          if (index === 1) {
            expect(overflow.scrollWidth).toBeGreaterThan(overflow.clientWidth);
          }
          await block.focus();
          await expect(block).toBeFocused();
        }
      }
    });

    test("both complete tables, formulas, and evidence remain static without JavaScript", async ({
      browser,
    }, testInfo) => {
      const context = await browser.newContext({
        javaScriptEnabled: false,
        baseURL: String(testInfo.project.use.baseURL),
      });
      const page = await context.newPage();
      await page.setViewportSize({ width: 390, height: 844 });
      for (const locale of locales) {
        await page.goto(chapterPath(locale, chapterId));
        await expect(
          page.getByRole("heading", { level: 1, name: copy[locale].title }),
        ).toBeVisible();
        await expect(
          page.getByRole("table", { name: copy[locale].tableCaption }),
        ).toHaveCount(1);
        await expect(
          page.locator(
            '.lesson-body annotation[encoding="application/x-tex"]',
          ),
        ).not.toHaveCount(0);
        await expect(page.locator("figure.rust-source")).toHaveCount(8);
        await expect(page.locator("figure[data-visualization-id]")).toHaveCount(0);
        await expect(
          page.locator("[data-diagram-full-view-toggle]"),
        ).toHaveCount(0);
        await expect(page.locator(".lesson-body")).toContainText(
          "logits_fingerprint:fnv1a64:0b875a0c9f380d8f",
        );
        await expectNoOverflowOrClientScripts(page);
      }
      await context.close();
    });
  },
);
