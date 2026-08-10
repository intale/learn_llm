import { expect, test, type Locator, type Page } from "@playwright/test";

import chapterLocaleManifest from "../../src/i18n/chapter-locales.json" with { type: "json" };

import {
  chapterPath,
  chapterTag,
  type ChapterLocale,
  type CourseChapterLink,
  expectLocalizedChapterRoute,
  expectNoOverflowOrClientScripts,
  expectOrderedChapterNavigation,
  expectVisualizationDecision,
  readOrderedCourseChapters,
} from "./chapter-helpers";

const chapterId = "00-llm-parts";
const systemDiagramId = "llm-system-map";
const detailDiagramId = "llm-parts-map";

function policyChapters(locale: ChapterLocale, includeIntroduction: boolean) {
  return chapterLocaleManifest.chapters.filter(
    (chapter) =>
      chapter.activeLocales.includes(locale) &&
      (includeIntroduction || chapter.order > 0),
  );
}

const russianPolicyChapterIds = new Set(
  policyChapters("ru", true).map(({ chapterId }) => chapterId),
);

const chapterCopy = {
  en: {
    title: "A map of a modern LLM",
    description:
      "See how tokenization, embeddings, decoder blocks, attention, feed-forward layers, training, sampling, and caching fit together in a decoder-only LLM.",
    revisionLabel: "Content revision",
    headings: [
      "See the system before its mechanisms",
      "A short road to the modern block diagram",
      "Follow the blocks as one connected system",
      "Use the map as a table of contents",
      "Start with the model’s input boundary",
    ],
    systemSection: "How the complete system connects",
    forward: "Shared forward path",
    generation: "Generation branch",
    learning: "Learning branch",
    inference: "The next-token inference path",
    decoder: "Inside every pre-norm decoder block",
    learningDetail: "Learning and evaluating the same weights",
    numericPurpose: "record gradients only while learning",
    sharedForward:
      "text → tokenizer → embeddings → decoder blocks → vocabulary head",
    orientationBoundary:
      "This overview deliberately stops at names, purposes, and connections.",
    noMemorization: "You do not need to memorize this map.",
    linksStatement: "Every named part links to the chapter that implements it.",
    samplerCue: "token ID to embeddings",
    generationFeedback:
      "The chosen ID returns to embedding lookup for the next cached step.",
    weightFeedback:
      "Updated weights feed the shared forward path on the next training step.",
    evaluationPurpose:
      "Score the selected frozen model after selection; retain the known result only as fixed-fixture regression evidence.",
    evaluationRelationship:
      "Selected weights → one local evaluator → fixed-fixture report",
    evaluationBoundary:
      "Inside one execution, the local evaluator cannot affect the selected state; repository reruns retain the known result only as fixed-fixture regression evidence.",
    evaluationFrequencyBoundary:
      "The evaluation node names a post-selection role, not a promise that every repository run sees newly unopened data.",
    checkpointRelationship: "training state ↔ saved checkpoint",
    learningLogits: "Forward logits",
    learningJoin: "and",
    optimizerPurpose: "validation chooses a state",
    chapterShort: "Ch",
    chapterLong: "Chapter",
  },
  ru: {
    title: "Карта устройства современной LLM",
    description:
      "Посмотрите, как токенизация, эмбеддинги, блоки декодера, внимание, ветви прямого распространения, обучение, выбор токена и KV-кэш соединяются в LLM только с декодером.",
    revisionLabel: "Версия материала",
    headings: [
      "Сначала взгляните на систему целиком",
      "Короткий путь к современной блок-схеме",
      "Проследите путь по единой системе",
      "Используйте карту как оглавление",
      "Начните с входной границы модели",
    ],
    systemSection: "Как связана вся система",
    forward: "Общий путь прямого распространения",
    generation: "Генерация",
    learning: "Обучение",
    inference: "Генерация следующего токена",
    decoder: "Внутри блока декодера",
    learningDetail: "Обучение и оценка тех же весов",
    numericPurpose: "Тензорные операции; граф вычислений — только при обучении",
    sharedForward:
      "текст → токенизатор → эмбеддинги → декодер → проекция на словарь",
    orientationBoundary:
      "Этот обзор намеренно ограничивается названиями, назначением и связями частей.",
    noMemorization: "Запоминать эту карту не нужно.",
    linksStatement:
      "Для каждой части указаны ссылки на главы курса, где она реализуется.",
    samplerCue: "ID токена → эмбеддинг",
    generationFeedback:
      "Выбранный ID возвращается к эмбеддингам на следующем шаге с KV‑кэшем.",
    weightFeedback: "Следующий прямой проход использует обновлённые веса.",
    evaluationPurpose:
      "Оценивает зафиксированную модель после завершения выбора; известный результат служит регрессионной проверкой фиксированного примера.",
    evaluationRelationship:
      "Выбранные веса → один локальный оценщик → отчёт по фиксированному примеру",
    evaluationBoundary:
      "В пределах одного запуска локальный оценщик не может повлиять на выбранное состояние; известный результат служит регрессионной проверкой фиксированного примера.",
    evaluationFrequencyBoundary:
      "Узел итоговой оценки обозначает этап после выбора состояния, а не обещает, что при каждом последующем запуске модель получает новые, ранее не использованные данные.",
    checkpointRelationship: "Состояние модели и обучения ↔ контрольная точка",
    learningLogits: "Логиты модели",
    learningJoin: "и",
    optimizerPurpose: "отбор — по валидации",
    chapterShort: "Гл.",
    chapterLong: "Глава",
  },
} as const;

async function expectContainedDiagram(page: Page, diagramId: string) {
  const problems = await page
    .locator(`figure[data-visualization-id="${diagramId}"]`)
    .evaluate((node) => {
      const figure = node as HTMLElement;
      const figureRect = figure.getBoundingClientRect();
      const issues: string[] = [];
      if (
        figureRect.left < -1 ||
        figureRect.right > document.documentElement.clientWidth + 1
      ) {
        issues.push("figure escapes the viewport");
      }
      for (const [index, candidate] of Array.from(
        figure.querySelectorAll<HTMLElement>("[data-diagram-box]"),
      ).entries()) {
        const rect = candidate.getBoundingClientRect();
        const style = getComputedStyle(candidate);
        if (
          rect.width <= 0 ||
          rect.height <= 0 ||
          rect.left < figureRect.left - 1 ||
          rect.right > figureRect.right + 1
        ) {
          issues.push(`box ${index} is outside the figure`);
        }
        if (
          [
            style.borderTopStyle,
            style.borderRightStyle,
            style.borderBottomStyle,
            style.borderLeftStyle,
          ].some((value) => value === "none")
        ) {
          issues.push(`box ${index} lacks a complete border`);
        }
        if (
          [style.overflowX, style.overflowY].some((value) =>
            ["hidden", "clip"].includes(value),
          )
        ) {
          issues.push(`box ${index} conceals overflow`);
        }
        if (
          candidate.scrollWidth > candidate.clientWidth + 1 ||
          candidate.scrollHeight > candidate.clientHeight + 1
        ) {
          issues.push(`box ${index} does not contain its content`);
        }
      }
      return issues;
    });
  expect(problems).toEqual([]);
}

async function splitOrdinaryWords(diagram: Locator) {
  return diagram.locator("[data-diagram-box]").evaluateAll((boxes) =>
    boxes.flatMap((box, boxIndex) => {
      const split: string[] = [];
      const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        for (const match of node.data.matchAll(
          /[\p{L}\p{M}]+(?:['’‑–—-][\p{L}\p{M}]+)*/gu,
        )) {
          const range = document.createRange();
          range.setStart(node, match.index ?? 0);
          range.setEnd(node, (match.index ?? 0) + match[0].length);
          if (range.getClientRects().length > 1) {
            split.push(`${boxIndex}:${match[0]}`);
          }
        }
      }
      return split;
    }),
  );
}

async function readFullViewSafety(diagram: Locator) {
  return diagram.evaluate(async (node) => {
    await document.fonts.ready;
    await new Promise<void>((resolveFrame) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame())),
    );
    const root = node as HTMLElement;
    const tolerance = 2;
    const problems: string[] = [];
    const describe = (element: HTMLElement) =>
      element.getAttribute("data-schema-stage") ??
      element.getAttribute("data-part-id") ??
      element.className?.toString().split(/\s+/).filter(Boolean).join(".") ??
      element.tagName.toLowerCase();
    const colorHasZeroAlpha = (color: string) => {
      if (color === "transparent") return true;
      const rgba = color.match(/rgba?\([^)]*[,/]\s*(0(?:\.0+)?%?)\s*\)$/);
      return rgba
        ? Number.parseFloat(rgba[1]) === 0
        : /#[0-9a-f]{6}00$/i.test(color);
    };
    const concealedStyle = (style: CSSStyleDeclaration) => {
      const webkitMask = style.getPropertyValue("-webkit-mask-image");
      const lineClamp = style.getPropertyValue("line-clamp");
      const webkitLineClamp = style.getPropertyValue("-webkit-line-clamp");
      return (
        style.display === "none" ||
        ["hidden", "collapse"].includes(style.visibility) ||
        Number.parseFloat(style.opacity) < 0.99 ||
        colorHasZeroAlpha(style.color) ||
        style.filter !== "none" ||
        style.clipPath !== "none" ||
        Boolean(style.maskImage && style.maskImage !== "none") ||
        Boolean(webkitMask && webkitMask !== "none") ||
        [style.overflowX, style.overflowY].some((value) =>
          ["hidden", "clip"].includes(value),
        ) ||
        style.textOverflow === "ellipsis" ||
        Boolean(lineClamp && lineClamp !== "none") ||
        Boolean(webkitLineClamp && webkitLineClamp !== "none") ||
        /(?:^|\s)(?:paint|strict|content)(?:\s|$)/.test(style.contain) ||
        style.contentVisibility === "hidden"
      );
    };
    const isUnitArrowRotation = (element: HTMLElement, transform: string) => {
      if (
        !element.matches('.system-arrow[aria-hidden="true"]') ||
        transform === "none"
      ) {
        return false;
      }
      const match = transform.match(/^matrix\(([^)]+)\)$/);
      if (!match) return false;
      const values = match[1].split(",").map(Number.parseFloat);
      if (
        values.length !== 6 ||
        values.some((value) => !Number.isFinite(value))
      )
        return false;
      const [a, b, c, d, tx, ty] = values;
      const quarterTurn = [a, b, c, d].every(
        (value) =>
          Math.abs(value) <= 0.001 || Math.abs(Math.abs(value) - 1) <= 0.001,
      );
      return (
        quarterTurn &&
        Math.abs(Math.hypot(a, b) - 1) <= 0.001 &&
        Math.abs(Math.hypot(c, d) - 1) <= 0.001 &&
        Math.abs(a * c + b * d) <= 0.001 &&
        Math.abs(a * d - b * c - 1) <= 0.001 &&
        Math.abs(tx) <= 0.001 &&
        Math.abs(ty) <= 0.001
      );
    };
    const authoredElements = [
      root,
      ...Array.from(root.querySelectorAll<HTMLElement>("*")),
    ].filter(
      (element) => !element.closest("[data-diagram-full-view-controls]"),
    );
    const scaledElements: Array<{
      index: number;
      owner: string;
      scale: string;
      transform: string;
      zoom: string;
    }> = [];
    const concealedElements: Array<{ index: number; owner: string }> = [];
    for (const [index, element] of authoredElements.entries()) {
      const style = getComputedStyle(element);
      const scale = style.getPropertyValue("scale");
      const zoom = style.getPropertyValue("zoom");
      const scaled =
        Boolean(scale && scale !== "none") ||
        Boolean(zoom && zoom !== "normal" && Number.parseFloat(zoom) !== 1);
      const transformed =
        style.transform !== "none" &&
        !isUnitArrowRotation(element, style.transform);
      if (scaled || transformed) {
        scaledElements.push({
          index,
          owner: describe(element),
          scale,
          transform: style.transform,
          zoom,
        });
      }
      if (concealedStyle(style)) {
        concealedElements.push({ index, owner: describe(element) });
      }
    }
    if (scaledElements.length > 0) {
      problems.push(
        `authored descendants scale or transform content: ${JSON.stringify(scaledElements)}`,
      );
    }
    if (concealedElements.length > 0) {
      problems.push(
        `authored descendants conceal content: ${JSON.stringify(concealedElements)}`,
      );
    }

    const textSamples: Array<{
      fontSize: number;
      lineHeight: number;
      paint: number;
      text: string;
    }> = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const textNode = walker.currentNode as Text;
      const parent = textNode.parentElement;
      const text = textNode.data
        .replace(/[\s\u200b-\u200d\ufeff]+/g, " ")
        .trim();
      if (
        !text ||
        !parent ||
        parent.closest("[data-diagram-full-view-controls]")
      ) {
        continue;
      }
      const range = document.createRange();
      range.selectNodeContents(textNode);
      const paint = Array.from(range.getClientRects()).filter(
        ({ width, height }) => width > 0 && height > 0,
      );
      const style = getComputedStyle(parent);
      const lineHeight = Number.parseFloat(style.lineHeight);
      if (paint.length === 0 || colorHasZeroAlpha(style.color)) {
        problems.push(
          `text has no positive visible paint: ${text.slice(0, 40)}`,
        );
      }
      textSamples.push({
        fontSize: Number.parseFloat(style.fontSize),
        lineHeight: Number.isFinite(lineHeight) ? lineHeight : 0,
        paint: paint.length,
        text,
      });
    }

    const originalScrollTop = root.scrollTop;
    const rootStyle = getComputedStyle(root);
    const blockDebt = Math.max(0, root.scrollHeight - root.clientHeight);
    const descendantVerticalOwners = Array.from(
      root.querySelectorAll<HTMLElement>("*"),
    )
      .filter(
        (element) =>
          element.closest("[data-diagram-full-view-controls]") === null,
      )
      .flatMap((element) => {
        const style = getComputedStyle(element);
        const debt = Math.max(0, element.scrollHeight - element.clientHeight);
        return style.overflowY === "scroll" ||
          (style.overflowY === "auto" && debt > tolerance)
          ? [`${describe(element)}:${style.overflowY}:${debt}`]
          : [];
      });

    root.scrollTop = root.scrollHeight;
    const reachedScrollEnd =
      blockDebt <= tolerance || root.scrollTop >= blockDebt - tolerance;
    const rootRect = root.getBoundingClientRect();
    const contentBottom = Math.max(
      rootRect.top,
      ...Array.from(
        root.querySelectorAll<HTMLElement>("[data-diagram-box], figcaption"),
      ).map((element) => element.getBoundingClientRect().bottom),
    );
    const endContentReachable =
      blockDebt <= tolerance || contentBottom <= rootRect.bottom + tolerance;
    root.scrollTop = originalScrollTop;

    return {
      blockDebt,
      concealedElements,
      descendantVerticalOwners,
      endContentReachable,
      horizontalDebt: Math.max(0, root.scrollWidth - root.clientWidth),
      problems,
      reachedScrollEnd,
      rootOverflowY: rootStyle.overflowY,
      scaledElements,
      textSamples,
    };
  });
}

async function expectChapter(page: Page, locale: ChapterLocale) {
  const copy = chapterCopy[locale];
  await expectLocalizedChapterRoute(page, {
    chapterId,
    locale,
    order: 0,
    revision: 5,
    revisionLabel: copy.revisionLabel,
    title: copy.title,
    equivalentLocales: ["en", "ru"],
  });
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    copy.description,
  );
  expect(await page.locator(".lesson-body h2").allInnerTexts()).toEqual(
    copy.headings,
  );
  await expectVisualizationDecision(page, {
    decision: "useful",
    id: systemDiagramId,
    supplementary: [{ id: detailDiagramId }],
  });
  const systemDiagram = page.locator(
    `figure[data-visualization-id="${systemDiagramId}"]`,
  );
  const detailDiagram = page.locator(
    `figure[data-visualization-id="${detailDiagramId}"]`,
  );
  const system = systemDiagram.locator(".system-panel");
  await expect(
    system.getByRole("heading", { name: copy.systemSection }),
  ).toBeVisible();
  await expect(
    system.getByRole("heading", { name: copy.forward }),
  ).toBeVisible();
  await expect(
    system.getByRole("heading", { name: copy.generation }),
  ).toBeVisible();
  await expect(
    system.getByRole("heading", { name: copy.learning }),
  ).toBeVisible();
  await expect(system.locator("[data-schema-stage]")).toHaveCount(18);
  expect(
    await system
      .locator("[data-schema-stage]")
      .evaluateAll((stages) =>
        stages.map((stage) => stage.getAttribute("data-schema-stage")),
      ),
  ).toEqual([
    "prompt",
    "tokenizer",
    "embeddings",
    "decoder-stack",
    "vocabulary-head",
    "logits",
    "sampler",
    "next-token",
    "learning-logits",
    "target",
    "loss",
    "gradients",
    "optimizer",
    "weights",
    "kv-cache",
    "numeric-foundation",
    "evaluation",
    "checkpoint",
  ]);
  await expect(system).toContainText(copy.generationFeedback);
  await expect(system).toContainText(copy.weightFeedback);
  await expect(
    system.locator('[data-schema-stage="evaluation"]'),
  ).toContainText(copy.evaluationRelationship);
  await expect(
    system.locator('[data-schema-stage="checkpoint"]'),
  ).toContainText(copy.checkpointRelationship);
  await expect(
    detailDiagram.getByRole("heading", { name: copy.inference }),
  ).toBeVisible();
  await expect(
    detailDiagram.getByRole("heading", { name: copy.decoder }),
  ).toBeVisible();
  await expect(
    detailDiagram.getByRole("heading", { name: copy.learningDetail }),
  ).toBeVisible();
  await expect(systemDiagram.locator("[data-diagram-box]")).toHaveCount(18);
  await expect(
    systemDiagram.locator('[data-schema-stage="learning-logits"]'),
  ).toContainText(copy.learningLogits);
  await expect(systemDiagram.locator(".system-join")).toHaveText(
    copy.learningJoin,
  );
  await expect(
    detailDiagram.locator('[data-part-id="optimizer"]'),
  ).toContainText(copy.optimizerPurpose);
  await expect(
    detailDiagram.locator('[data-part-id="evaluation"]'),
  ).toContainText(copy.evaluationPurpose);
  await expect(detailDiagram.locator("[data-part-id]")).toHaveCount(19);
  await expect(detailDiagram.locator("[data-diagram-box]")).toHaveCount(19);
  expect(
    await splitOrdinaryWords(systemDiagram),
    `${locale} whole-system word wrapping`,
  ).toEqual([]);
  expect(
    await splitOrdinaryWords(detailDiagram),
    `${locale} detail-map word wrapping`,
  ).toEqual([]);
  await expect(
    detailDiagram.locator('[data-part-id="numeric-core"]'),
  ).toHaveAttribute("data-part-path", "both");
  await expect(
    detailDiagram.locator('[data-part-id="numeric-core"]'),
  ).toContainText(copy.numericPurpose);
  await expect(detailDiagram.locator("[data-learning-reuse]")).toContainText(
    copy.sharedForward,
  );
  await expect(page.locator(".lesson-body")).toContainText(
    copy.orientationBoundary,
  );
  await expect(page.locator(".lesson-body")).toContainText(copy.noMemorization);
  await expect(page.locator(".lesson-body")).toContainText(copy.linksStatement);
  await expect(page.locator(".lesson-body")).toContainText(
    copy.evaluationBoundary,
  );
  await expect(page.locator(".lesson-body")).toContainText(
    copy.evaluationFrequencyBoundary,
  );
  const lessonText = (await page.locator(".lesson-body").innerText()).replace(
    /\s+/g,
    " ",
  );
  expect(lessonText).not.toMatch(
    locale === "en"
      ? /Score the selected frozen model on unseen evaluation examples|Score the frozen selected model once on previously unopened test examples|Every repository run sees newly unseen evaluation data|Each repository run opens previously unopened test data|The fixture has never been read during repository development/i
      : /Тестирует фиксированную модель на новых примерах|при каждом запуске модель впервые видит тестовые данные|пример никогда прежде не открывали/i,
  );
  if (locale === "ru") {
    await expect(page.locator(".lesson-body")).not.toContainText(
      "Ссылки на главы 1–7 открывают русские страницы.",
    );
    await expect(page.locator(".lesson-body")).not.toContainText(
      "русская версия соответствующей главы пока недоступна",
    );
  }
  await expect(detailDiagram.locator('[data-part-id="sampler"]')).toContainText(
    copy.samplerCue,
  );
  await expect(detailDiagram.locator("ol.inference-flow")).toHaveCount(1);
  await expect(detailDiagram.locator("ol.decoder-flow")).toHaveCount(1);
  await expect(detailDiagram.locator("ol.learning-flow")).toHaveCount(1);
  await expect(detailDiagram.locator(".learning-flow")).toHaveAttribute(
    "start",
    "6",
  );
  const stateSymbols = detailDiagram.locator(".state-symbol");
  await expect(stateSymbols).toHaveCount(19);
  expect(
    await stateSymbols.evaluateAll((symbols) =>
      symbols.every((symbol) => symbol.getAttribute("aria-hidden") === "true"),
    ),
  ).toBe(true);
  const chapterLinks = detailDiagram.locator("a[data-chapter-link]");
  await expect(chapterLinks).toHaveCount(43);
  expect(
    await detailDiagram.locator(".learning-flow > li").evaluateAll((cards) =>
      cards.map((card) => ({
        metadata: card.getAttribute("data-flow-order"),
        visible: card
          .querySelector("header .state-symbol")
          ?.textContent?.trim(),
      })),
    ),
  ).toEqual([
    { metadata: "6", visible: "6" },
    { metadata: "7", visible: "7" },
    { metadata: "8", visible: "8" },
    { metadata: "9", visible: "9" },
  ]);
  const destinations = await chapterLinks.evaluateAll((links) =>
    links.map((link) => link.getAttribute("data-chapter-link") ?? ""),
  );
  expect(new Set(destinations).size).toBe(39);
  for (let order = 1; order <= 39; order += 1) {
    const prefix = `${order.toString().padStart(2, "0")}-`;
    expect(destinations.some((chapter) => chapter.startsWith(prefix))).toBe(
      true,
    );
  }
  await expect(page.locator(".lesson-body .katex")).toHaveCount(0);
  await expect(
    page.locator(
      ".lesson-body pre, .lesson-body details, .lesson-body [data-rust-source]",
    ),
  ).toHaveCount(0);
  await expect(page.locator(".lesson-body")).not.toContainText(
    "Check your first mental model",
  );
  await expectContainedDiagram(page, systemDiagramId);
  await expectContainedDiagram(page, detailDiagramId);
  await expectNoOverflowOrClientScripts(page);
}

async function expectCompleteChapterLinks(
  page: Page,
  locale: ChapterLocale,
  englishChapters: readonly CourseChapterLink[],
  russianChapters: readonly CourseChapterLink[],
) {
  const englishById = new Map(
    englishChapters
      .filter(({ order }) => order > 0)
      .map((chapter) => [chapter.chapterId, chapter]),
  );
  const russianById = new Map(
    russianChapters
      .filter(({ order }) => order > 0)
      .map((chapter) => [chapter.chapterId, chapter]),
  );
  const diagram = page.locator(
    `figure[data-visualization-id="${detailDiagramId}"]`,
  );
  const links = await diagram
    .locator("a[data-chapter-link]")
    .evaluateAll((nodes) =>
      nodes.map((node) => ({
        chapterId: node.getAttribute("data-chapter-link") ?? "",
        destinationLocale: node.getAttribute("data-chapter-locale") ?? "",
        href: node.getAttribute("href") ?? "",
        hreflang: node.getAttribute("hreflang") ?? "",
        label: node.getAttribute("aria-label") ?? "",
        visible: (node as HTMLElement).innerText.trim(),
      })),
    );
  expect(links).toHaveLength(43);
  for (const link of links) {
    const englishChapter = englishById.get(link.chapterId);
    expect(
      englishChapter,
      `unknown diagram destination ${link.chapterId}`,
    ).toBeDefined();
    const useRussianDestination =
      locale === "ru" && russianPolicyChapterIds.has(link.chapterId);
    const destination = useRussianDestination
      ? russianById.get(link.chapterId)
      : englishChapter;
    expect(
      destination,
      `missing localized destination ${link.chapterId}`,
    ).toBeDefined();
    const number = englishChapter!.order.toString().padStart(2, "0");
    const destinationLocale = useRussianDestination ? "ru" : "en";
    const fallbackPrefix =
      locale === "ru" && destinationLocale === "en"
        ? ", страница на английском"
        : "";
    const visible =
      locale === "ru" && destinationLocale === "en"
        ? `${number} EN`
        : `${chapterCopy[locale].chapterShort} ${number}`;
    expect(link.visible).toBe(visible);
    expect(link.label).toBe(
      `${chapterCopy[locale].chapterLong} ${number}${fallbackPrefix} — ${destination!.title}`,
    );
    expect(link.href).toBe(destination!.href);
    expect(link.destinationLocale).toBe(destinationLocale);
    expect(link.hreflang).toBe(destinationLocale);
  }

  const listProblems = await diagram
    .locator(".course-diagram__link-list")
    .evaluateAll((lists) =>
      lists.flatMap((list, listIndex) => {
        const items = Array.from(list.children);
        const issues: string[] = [];
        items.forEach((item, itemIndex) => {
          const separators = item.querySelectorAll(
            ":scope > .course-diagram__link-separator",
          );
          const expected = itemIndex < items.length - 1 ? 1 : 0;
          if (separators.length !== expected) {
            issues.push(`list ${listIndex} item ${itemIndex}`);
          }
          separators.forEach((separator) => {
            if (
              separator.textContent !== "," ||
              separator.getAttribute("aria-hidden") !== "true"
            ) {
              issues.push(`list ${listIndex} separator ${itemIndex}`);
            }
          });
          if (item.querySelector("a .course-diagram__link-separator")) {
            issues.push(`list ${listIndex} nested separator ${itemIndex}`);
          }
        });
        return issues;
      }),
    );
  expect(listProblems).toEqual([]);

  const cache = diagram.locator('[data-part-id="kv-cache"]');
  await expect(cache.locator("a[data-chapter-link]")).toHaveCount(2);
  const cacheSeparator = cache.locator(
    ":scope .course-diagram__link-separator",
  );
  await expect(cacheSeparator).toHaveCount(1);
  await expect(cacheSeparator).toHaveAttribute("aria-hidden", "true");
  await expect(cacheSeparator).toHaveText(",");
  expect(
    await cacheSeparator.evaluate((separator) => {
      const previousLink = separator.previousElementSibling;
      if (!(previousLink instanceof HTMLAnchorElement)) {
        return Number.POSITIVE_INFINITY;
      }
      return Math.abs(
        separator.getBoundingClientRect().left -
          previousLink.getBoundingClientRect().right,
      );
    }),
  ).toBeLessThanOrEqual(0.5);
  await expect(cache.locator("a .course-diagram__link-separator")).toHaveCount(
    0,
  );
}

test.describe(
  "Chapter 0 LLM-parts orientation",
  { tag: chapterTag(chapterId) },
  () => {
    test("English and Russian both start with Chapter 0", async ({ page }) => {
      for (const locale of ["en", "ru"] as const) {
        const chapters = await readOrderedCourseChapters(page, locale, {
          includeIntroduction: true,
        });
        expect(chapters).toHaveLength(policyChapters(locale, true).length);
        expect(chapters[0]).toEqual(
          expect.objectContaining({
            chapterId,
            order: 0,
            title: chapterCopy[locale].title,
          }),
        );
        await expect(page.locator("ol.course-list")).toHaveAttribute(
          "start",
          "0",
        );
        const implementationChapters = await readOrderedCourseChapters(
          page,
          locale,
        );
        expect(implementationChapters).toHaveLength(
          policyChapters(locale, false).length,
        );
        expect(implementationChapters[0].chapterId).toBe("01-text-units");
        const response = await page.goto(chapterPath(locale, chapterId));
        expect(response?.status()).toBe(200);
      }
    });

    for (const locale of ["en", "ru"] as const) {
      test(`${locale} linked map remains complete at desktop and narrow widths`, async ({
        page,
      }) => {
        const englishChapters = await readOrderedCourseChapters(page, "en", {
          includeIntroduction: true,
        });
        const russianChapters = await readOrderedCourseChapters(page, "ru", {
          includeIntroduction: true,
        });
        const currentChapters =
          locale === "en" ? englishChapters : russianChapters;
        await page.setViewportSize({ width: 1366, height: 768 });
        await page.goto(chapterPath(locale, chapterId));
        await expectChapter(page, locale);
        await expectCompleteChapterLinks(
          page,
          locale,
          englishChapters,
          russianChapters,
        );
        await expectOrderedChapterNavigation(
          page,
          locale,
          chapterId,
          currentChapters,
        );
        await expect(
          page.locator('a[data-chapter-direction="next"]'),
        ).toHaveAttribute("data-chapter-id", "01-text-units");
        await expect(
          page.locator('a[data-chapter-direction="previous"]'),
        ).toHaveCount(0);

        await page.setViewportSize({ width: 390, height: 844 });
        await page.reload();
        await expectChapter(page, locale);
        await expect(
          page.locator(
            `[data-visualization-id="${systemDiagramId}"] [data-diagram-full-view-toggle], ` +
              `[data-visualization-id="${detailDiagramId}"] [data-diagram-full-view-toggle]`,
          ),
        ).toHaveCount(0);
      });

      test(`${locale} full-view controls expand each figure and restore focus`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: 1366, height: 768 });
        await page.goto(chapterPath(locale, chapterId));
        await expect(page.locator("figure[data-visualization-id]")).toHaveCount(
          2,
        );

        for (const [id, boxCount] of [
          [systemDiagramId, 18],
          [detailDiagramId, 19],
        ] as const) {
          const diagram = page.locator(`figure[data-visualization-id="${id}"]`);
          const toggle = diagram.locator("[data-diagram-full-view-toggle]");
          await expect(toggle).toHaveCount(1);
          const inlinePresentation = await readFullViewSafety(diagram);
          expect(inlinePresentation.problems, `${locale} ${id} inline`).toEqual(
            [],
          );
          expect(inlinePresentation.scaledElements).toEqual([]);
          expect(inlinePresentation.concealedElements).toEqual([]);
          expect(inlinePresentation.textSamples.length).toBeGreaterThan(0);
          await toggle.click();
          await page.waitForFunction(
            (visualizationId) =>
              document.fullscreenElement?.getAttribute(
                "data-visualization-id",
              ) === visualizationId,
            id,
          );
          await expect(diagram.locator("[data-diagram-box]")).toHaveCount(
            boxCount,
          );
          await expectContainedDiagram(page, id);
          expect(
            await splitOrdinaryWords(diagram),
            `${locale} ${id} word wrapping`,
          ).toEqual([]);

          const presentation = await readFullViewSafety(diagram);
          expect(presentation.problems, `${locale} ${id} full view`).toEqual(
            [],
          );
          expect(presentation.scaledElements, `${locale} ${id}`).toEqual([]);
          expect(presentation.concealedElements, `${locale} ${id}`).toEqual([]);
          expect(
            presentation.horizontalDebt,
            `${locale} ${id}`,
          ).toBeLessThanOrEqual(2);
          expect(
            presentation.descendantVerticalOwners,
            `${locale} ${id}`,
          ).toEqual([]);
          if (presentation.blockDebt > 2) {
            expect(
              ["auto", "scroll"],
              `${locale} ${id} root owns vertical continuation`,
            ).toContain(presentation.rootOverflowY);
          }
          expect(presentation.reachedScrollEnd, `${locale} ${id}`).toBe(true);
          expect(presentation.endContentReachable, `${locale} ${id}`).toBe(
            true,
          );
          expect(presentation.textSamples.map(({ text }) => text)).toEqual(
            inlinePresentation.textSamples.map(({ text }) => text),
          );
          for (const [index, sample] of presentation.textSamples.entries()) {
            const inlineSample = inlinePresentation.textSamples[index];
            expect(
              sample.fontSize + 0.01,
              `${locale} ${id} text ${index} (${sample.text}) does not shrink in full view`,
            ).toBeGreaterThanOrEqual(inlineSample.fontSize);
            if (sample.lineHeight > 0 && inlineSample.lineHeight > 0) {
              expect(
                sample.lineHeight + 0.01,
                `${locale} ${id} text ${index} (${sample.text}) line height does not shrink`,
              ).toBeGreaterThanOrEqual(inlineSample.lineHeight);
            }
            expect(sample.paint).toBeGreaterThan(0);
          }
          await page.keyboard.press("Escape");
          await page.waitForFunction(() => document.fullscreenElement === null);
          await expect(toggle).toBeFocused();
        }
      });

    }
  },
);
