import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  chapterPath,
  chapterTag,
  expectLocalizedChapterRoute,
  expectNoOverflowOrClientScripts,
  expectOrderedChapterNavigation,
  expectSeoDescription,
  expectVisualizationDecision,
  readMathAwareText,
  readOrderedCourseChapters,
  type CourseChapterLink,
} from "./chapter-helpers";

const chapterId = "35-checkpoints";
type ChapterLocale = "en" | "ru";
const locales = ["en", "ru"] as const satisfies readonly ChapterLocale[];
const copy = {
  en: {
    revisionLabel: "Content revision",
    title: "Save decoder state, replay one specified update",
    description:
      "Learn how a versioned checkpoint stores the tokenizer, decoder, trainer-paired AdamW state, and a separate sampling RNG, rejects corrupted bytes, and matches one update whose inputs, targets, and learning rate the caller supplies.",
    headings: [
      "Save the declared component state, not only weights",
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
      "This progression follows the state needed to preserve a language model's meaning",
      "The script does not establish a single self-contained file, exact training resumption",
      "does not by itself define tokenizer, decoder configuration, optimizer, RNG",
      "does not describe GPT-2 or safetensors as a raw-memory dump",
    ],
    checksumFragment:
      "FNV-1a detects accidental corruption; it does not authenticate",
    atomicFragment: "supported Unix same-filesystem rename semantics",
    adjacencyFragment:
      "Each row must begin exactly where the previous row ends",
    evidenceFragment: "Together with roundtrip, component_replay, and scope",
    answerFragment:
      "FNV-1a detects accidental corruption but provides no authentication",
    implementationFragments: [
      "Checkpoint::from_snapshot borrows the trainer-issued selected training state",
      "into_model consumes the checkpoint and moves its model buffers",
      "one token_embedding.weight value slot, no separate output-head parameter, and no live component alias",
      "The plan creates no encoded byte vector per record",
      "converts each referenced payload value directly into that final buffer",
      "This is not allocation-free or zero-copy serialization",
      "It is also not streaming to disk",
      "The shared decoder-layout validator reads each name and tensor through a scoped reference",
      "It does not copy a tensor",
      "build decoder components, or create a live embedding/output alias",
      "This layout check finishes before the reader decodes optimizer tensors",
    ],
    obligationFragments: [
      "Stored: tokenizer, decoder configuration and parameter bits, trainer-paired AdamW state, their shared recorded step, and the sampling RNG.",
      "Supplied by the caller for the demonstrated update: inputs [0,1], targets [1,2], and learning rate 0.006.",
      "Still required to continue training: corpus and split identity, tokenized data, batch order and cursor, training RNG, learning-rate schedule, gradient clipping, and validation policy.",
      "Outside this checkpoint: the Chapter 34 evaluation report and test provenance, gradients at this clean boundary, and the attention cache that Chapter 38 will own.",
      "It does not call train_decoder, restore a corpus or batch cursor, or apply the Chapter 33 learning-rate schedule, clipping, or validation policy.",
      "Equality belongs to this one specified update, not to an unstored trainer trajectory.",
    ],
  },
  ru: {
    revisionLabel: "Версия материала",
    title:
      "Сохраните состояние декодера и точно повторите одно заданное обновление",
    description:
      "Разберитесь, как контрольная точка с версией формата сохраняет токенизатор, декодер, состояние AdamW из того же снимка цикла обучения и отдельный генератор для выбора токенов, отклоняет повреждённые байты и даёт одинаковый результат одного обновления, если вызывающий код передаёт обеим ветвям одинаковые входы, цели и скорость обучения.",
    headings: [
      "Сохраните заявленное состояние компонентов, а не только веса",
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
      "Однако скрипт не описывает единый самодостаточный файл, точное продолжение обучения",
      "Сам по себе он не задаёт токенизатор, конфигурацию декодера, оптимизатор",
      "не описывает GPT-2 или safetensors как дамп памяти",
    ],
    checksumFragment:
      "FNV-1a обнаруживает случайные повреждения, но не подтверждает подлинность",
    atomicFragment: "атомарная замена в пределах одной файловой системы",
    adjacencyFragment:
      "Каждая строка должна начинаться точно там, где заканчивается предыдущая",
    evidenceFragment: "Строки roundtrip, component_replay и scope",
    answerFragment:
      "FNV-1a обнаруживает случайные повреждения, но не подтверждает подлинность",
    implementationFragments: [
      "Checkpoint::from_snapshot получает по ссылке состояние, выданное циклом обучения",
      "into_model забирает контрольную точку целиком и переносит её буферы модели",
      "один тензор token_embedding.weight и не содержит отдельного параметра выходной проекции",
      "План не создаёт отдельный вектор закодированных байтов для каждой записи",
      "сразу преобразует каждое значение из плана в канонические байты",
      "Это не сериализация без выделения памяти и не сериализация без копирования данных",
      "Данные также не записываются на диск потоком",
      "Этот интерфейс позволяет общей проверке структуры декодера читать имена по ссылке",
      "Для этого не копируется ни один тензор",
      "не создаются объекты NamedParameter или компоненты декодера",
      "Вся эта проверка завершается до декодирования тензоров оптимизатора",
    ],
    obligationFragments: [
      "В файле: токенизатор, конфигурация и биты параметров декодера, состояние AdamW из того же снимка цикла обучения, записанные номера шагов и генератор для выбора токенов.",
      "Для показанного обновления вызывающий код передаёт: входы [0,1], цели [1,2] и скорость обучения 0.006.",
      "Для продолжения обучения всё ещё нужны: сведения о корпусе и разбиении, токенизированные данные, порядок и текущая позиция пакетов, генератор, используемый при обучении, расписание скорости обучения, ограничение нормы градиента и правила валидации.",
      "За пределами контрольной точки: итоговый отчёт и сведения о происхождении тестовых данных из главы 34, градиенты на этой чистой границе и кэш внимания, которым займётся глава 38.",
      "Он не вызывает train_decoder, не восстанавливает корпус или текущую позицию пакетов и не применяет расписание скорости обучения, ограничение нормы градиента или правила валидации из главы 33.",
      "Совпадение относится к одному заданному обновлению, а не к не сохранённой в файле траектории обучения.",
    ],
  },
} as const;

const componentReplayLine =
  "component_replay=caller_inputs:[0,1] caller_targets:[1,2] caller_learning_rate:0.006000 next_step:9 parameter_bits_identical:true optimizer_state_identical:true logits_bits_identical:true logits_fingerprint:fnv1a64:0b875a0c9f380d8f changed_batch_diverges:true changed_learning_rate_diverges:true";
const scopeLine =
  "scope=tokenizer:stored model:stored optimizer:stored selected_step:stored optimizer_step:stored optimizer_base_learning_rate:stored sampling_rng:stored step_equality:validated model_lineage:not_stored corpus_identity:not_stored split_identity:not_stored epoch_materialization:not_stored epoch_cursor:not_stored batch_order:not_stored batch_cursor:not_stored shuffle_rng:not_stored training_rng:not_stored learning_rate_schedule:not_stored next_learning_rate:not_stored clipping_policy:not_stored validation_policy:not_stored gradients:not_stored trainer_capture:creation_required caller_next_batch:required caller_next_learning_rate:required clean_post_update:required whole_job_resume:false";
const rejectionLine =
  "reject=version:true vocabulary_mismatch:true step_mismatch:true truncation:true checksum:true";

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

interface TableTypographySample {
  readonly cellIndex: number;
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly owner: string;
}

async function readTableTypography(
  table: Locator,
): Promise<readonly TableTypographySample[]> {
  return table.evaluate((node) => {
    const samples: TableTypographySample[] = [];
    const seen = new Set<HTMLElement>();
    const cells = Array.from(node.querySelectorAll<HTMLElement>("th, td"));
    for (const [cellIndex, cell] of cells.entries()) {
      const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const textNode = walker.currentNode as Text;
        const parent = textNode.parentElement;
        if (
          !textNode.data.trim() ||
          !parent ||
          parent.closest(".katex-mathml")
        ) {
          continue;
        }
        const sampleOwner = parent.closest<HTMLElement>(".katex") ?? parent;
        if (seen.has(sampleOwner)) continue;
        seen.add(sampleOwner);
        const style = getComputedStyle(sampleOwner);
        const lineHeight = Number.parseFloat(style.lineHeight);
        samples.push({
          cellIndex,
          fontSize: Number.parseFloat(style.fontSize),
          lineHeight: Number.isFinite(lineHeight) ? lineHeight : 0,
          owner: `${sampleOwner.tagName.toLowerCase()}.${sampleOwner.className} ${sampleOwner.textContent
            ?.replace(/\s+/g, " ")
            .trim()
            .slice(0, 48)}`,
        });
      }
    }
    return samples;
  });
}

async function expectTableCellPaintContainment(
  table: Locator,
  desktopTypography: readonly TableTypographySample[],
) {
  const evidence = await table.evaluate((node) => {
    const owner = node as HTMLElement;
    const problems: string[] = [];
    const tableStyle = getComputedStyle(owner);
    if (!["auto", "scroll"].includes(tableStyle.overflowX)) {
      problems.push(`table overflow-x is ${tableStyle.overflowX}`);
    }

    const authoredElements = [
      owner,
      ...owner.querySelectorAll<HTMLElement>("*"),
    ].filter((element) => {
      if (element.closest(".katex-mathml")) return false;
      const katex = element.closest(".katex");
      if (!katex || element.classList.contains("katex")) return true;
      return (
        Boolean(element.closest(".katex-html")) &&
        Boolean(element.textContent?.trim())
      );
    });
    for (const element of authoredElements) {
      const authoredStyle = getComputedStyle(element);
      const label = `${element.tagName.toLowerCase()}.${element.className}`;
      const opacity = Number.parseFloat(authoredStyle.opacity);
      const maskImage = authoredStyle.getPropertyValue("mask-image");
      const webkitMaskImage =
        authoredStyle.getPropertyValue("-webkit-mask-image");
      const clipsOverflow = [
        authoredStyle.overflowX,
        authoredStyle.overflowY,
      ].some((value) => ["hidden", "clip"].includes(value));
      const inactiveInlineKatexScroller =
        element.matches("span.katex") &&
        authoredStyle.overflowX === "auto" &&
        authoredStyle.overflowY === "hidden" &&
        element.scrollWidth <= element.clientWidth + 2 &&
        element.scrollHeight <= element.clientHeight + 2;
      if (
        element.hasAttribute("hidden") ||
        authoredStyle.display === "none" ||
        ["hidden", "collapse"].includes(authoredStyle.visibility) ||
        (Number.isFinite(opacity) && opacity < 0.99) ||
        authoredStyle.filter !== "none" ||
        authoredStyle.clipPath !== "none" ||
        (maskImage !== "" && maskImage !== "none") ||
        (webkitMaskImage !== "" && webkitMaskImage !== "none") ||
        (clipsOverflow && !inactiveInlineKatexScroller) ||
        authoredStyle.textOverflow === "ellipsis" ||
        /(?:^|\s)(?:paint|strict|content)(?:\s|$)/.test(authoredStyle.contain)
      ) {
        problems.push(`${label} has concealed authored content`);
      }
      const zoom = Number.parseFloat(authoredStyle.zoom);
      const scale = authoredStyle.getPropertyValue("scale");
      if (
        authoredStyle.transform !== "none" ||
        (scale !== "" && scale !== "none") ||
        (Number.isFinite(zoom) && Math.abs(zoom - 1) > 0.001)
      ) {
        problems.push(`${label} scales authored content`);
      }
    }

    const cells = Array.from(owner.querySelectorAll<HTMLElement>("th, td"));
    for (const [cellIndex, cell] of cells.entries()) {
      const cellRect = cell.getBoundingClientRect();
      const style = getComputedStyle(cell);
      const left = cellRect.left + Number.parseFloat(style.borderLeftWidth);
      const right = cellRect.right - Number.parseFloat(style.borderRightWidth);
      const top = cellRect.top + Number.parseFloat(style.borderTopWidth);
      const bottom =
        cellRect.bottom - Number.parseFloat(style.borderBottomWidth);
      const label = `${cell.tagName.toLowerCase()} ${cellIndex} ${cell.textContent
        ?.replace(/\s+/g, " ")
        .trim()
        .slice(0, 48)}`;

      if (
        cell.scrollWidth > cell.clientWidth + 1 ||
        cell.scrollHeight > cell.clientHeight + 1
      ) {
        problems.push(`${label} owns unresolved overflow`);
      }

      let scrollOwner: HTMLElement | null = cell.parentElement;
      while (scrollOwner && scrollOwner !== document.body) {
        const scrollStyle = getComputedStyle(scrollOwner);
        if (
          ["auto", "scroll"].includes(scrollStyle.overflowX) &&
          scrollOwner.scrollWidth > scrollOwner.clientWidth + 1
        ) {
          break;
        }
        scrollOwner = scrollOwner.parentElement;
      }
      if (scrollOwner !== owner) {
        problems.push(`${label} does not use the table as its scroll owner`);
      }

      const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
      const measuredKatex = new Set<HTMLElement>();
      while (walker.nextNode()) {
        const textNode = walker.currentNode as Text;
        const parent = textNode.parentElement;
        if (
          !textNode.data.trim() ||
          !parent ||
          parent.closest(".katex-mathml")
        ) {
          continue;
        }
        const katex = parent.closest<HTMLElement>(".katex");
        if (katex) {
          if (measuredKatex.has(katex)) continue;
          measuredKatex.add(katex);
          const paint = katex.getBoundingClientRect();
          if (
            paint.width <= 0 ||
            paint.height <= 0 ||
            paint.left < left - 1 ||
            paint.right > right + 1 ||
            paint.top < top - 1 ||
            paint.bottom > bottom + 1
          ) {
            problems.push(`${label} lets formula ink cross its border`);
          }
          continue;
        }
        const range = document.createRange();
        range.selectNodeContents(textNode);
        const paintRects = Array.from(range.getClientRects()).filter(
          ({ width, height }) => width > 0 && height > 0,
        );
        if (paintRects.length === 0) {
          problems.push(`${label} has authored text without visible paint`);
        }
        for (const paint of paintRects) {
          if (
            paint.left < left - 1 ||
            paint.right > right + 1 ||
            paint.top < top - 1 ||
            paint.bottom > bottom + 1
          ) {
            problems.push(`${label} lets painted text cross its border`);
          }
        }
      }
    }

    return {
      cellCount: cells.length,
      problems,
      rootRem: Number.parseFloat(
        getComputedStyle(document.documentElement).fontSize,
      ),
      tableClientWidth: owner.clientWidth,
      tableScrollWidth: owner.scrollWidth,
    };
  });
  const narrowTypography = await readTableTypography(table);

  expect(evidence.cellCount).toBe(36);
  expect(evidence.tableScrollWidth).toBeGreaterThan(evidence.tableClientWidth);
  expect(evidence.problems).toEqual([]);
  expect(
    narrowTypography.map(({ cellIndex, owner }) => ({ cellIndex, owner })),
  ).toEqual(
    desktopTypography.map(({ cellIndex, owner }) => ({ cellIndex, owner })),
  );
  for (const [index, narrow] of narrowTypography.entries()) {
    const desktop = desktopTypography[index];
    expect(desktop).toBeDefined();
    if (!desktop) continue;
    expect(
      narrow.fontSize + 0.01,
      `${narrow.owner} font size must not shrink at narrow width`,
    ).toBeGreaterThanOrEqual(desktop.fontSize);
    expect(
      narrow.fontSize + 0.01,
      `${narrow.owner} must retain the table text-size floor`,
    ).toBeGreaterThanOrEqual(evidence.rootRem * 0.875);
    if (desktop.lineHeight > 0) {
      expect(
        narrow.lineHeight + 0.01,
        `${narrow.owner} line height must not shrink at narrow width`,
      ).toBeGreaterThanOrEqual(desktop.lineHeight);
    }
  }
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
    revision: 5,
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
    "roundtrip=bytes_deterministic:true loaded_bytes_identical:true logits_bits_identical:true logits_fingerprint:fnv1a64:6029064fe7cd162d sampling_rng_next_identical:true sampling_rng_next:0x9a8c505971939232",
    componentReplayLine,
    scopeLine,
    rejectionLine,
    "atomic=replaced_complete_file:true loaded_sampling_rng_state:0x9e3779b97f4a7c39 temporary_files:0 unix_same_directory:true",
  ]);
  await expect(proof).toHaveCount(1);
  await expect(proof).toContainText(
    "logits_fingerprint:fnv1a64:6029064fe7cd162d",
  );
  await expect(proof).toContainText(
    "caller_learning_rate:0.006000 next_step:9 parameter_bits_identical:true optimizer_state_identical:true",
  );
  await expect(proof).toContainText(
    "changed_batch_diverges:true changed_learning_rate_diverges:true",
  );
  await expect(proof).toContainText(scopeLine);
  await expect(proof).toContainText(rejectionLine);
  await expect(proof).toContainText(
    "atomic=replaced_complete_file:true loaded_sampling_rng_state:0x9e3779b97f4a7c39",
  );

  const lessonText = await readMathAwareText(page.locator(".lesson-body"));
  for (const fragment of expected.historyFragments) {
    expect(lessonText).toContain(fragment);
  }
  expect(lessonText).toContain(expected.checksumFragment);
  expect(lessonText).toContain(expected.atomicFragment);
  expect(lessonText).toContain(expected.adjacencyFragment);
  expect(lessonText).toContain(expected.evidenceFragment);
  for (const fragment of expected.obligationFragments) {
    expect(lessonText).toContain(fragment);
  }
  expect(lessonText).not.toMatch(
    locale === "en"
      ? /Save every state, resume exactly|complete selected decoder continuation boundary|one equal resumed update|whole-job resume is true/i
      : /Сохраните всё состояние и продолжите без расхождений|точное продолжение обновления|возобновление всего процесса обучения возможно/i,
  );
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
  for (const fragment of expected.implementationFragments) {
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
  await expect(page.locator("figure.rust-source")).toHaveCount(10);
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
  "chapter 35 component-checkpoint replay vertical slice",
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
        ).toHaveAttribute(
          "href",
          new RegExp(`/${other}/course/${chapterId}/$`),
        );
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
        const desktopTypography = await readTableTypography(
          page.getByRole("table", { name: copy[locale].tableCaption }),
        );

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
        await expectTableCellPaintContainment(table, desktopTypography);
        await table.focus();
        await expect(table).toBeFocused();

        const evidenceBlocks = page.locator(
          ".lesson-body > pre.astro-code:not(.rust-source-code)",
        );
        for (const [index, block] of (await evidenceBlocks.all()).entries()) {
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

  },
);
