// @ts-ignore Node APIs are available in the Vitest runner.
import { createHash } from "node:crypto";
// @ts-ignore Node APIs are available in the Vitest runner.
import { readFileSync } from "node:fs";
// @ts-ignore Node APIs are available in the Vitest runner.
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  llmPartIds,
  llmPartsDiagramId,
  llmSystemDiagramId,
  llmPartsTrace,
  validateLlmPartsDiagramLabels,
  type LlmPartsDiagramLabels,
} from "../src/lib/llm-parts-diagram";

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), "..");
const read = (path: string) =>
  readFileSync(resolve(repositoryRoot, path), "utf8");
const detailComponent = read(
  "site/src/components/chapters/LlmPartsDiagram.astro",
);
const systemComponent = read(
  "site/src/components/chapters/LlmSystemDiagram.astro",
);
const contractSource = read("curriculum/chapters/00-llm-parts.md");
const diagramDataSource = read("site/src/lib/llm-parts-diagram.ts");
const chapterPages = {
  en: read("site/src/content/chapters/en/00-llm-parts.mdx"),
  ru: read("site/src/content/chapters/ru/00-llm-parts.mdx"),
};

function frontmatter(source: string) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error("missing JSON frontmatter");
  return JSON.parse(match[1]) as {
    content_revision: number;
    translation_notes?: string[];
  };
}

const labels = Object.fromEntries(
  llmPartIds.map((id) => [id, { name: id, purpose: `${id} purpose` }]),
) as LlmPartsDiagramLabels["parts"];
const completeLabels: LlmPartsDiagramLabels = {
  title: "title",
  description: "description",
  detailTitle: "detail title",
  detailDescription: "detail description",
  sections: {
    system: "system",
    inference: "inference",
    decoder: "decoder",
    learning: "learning",
  },
  captions: {
    system: "system",
    inference: "inference",
    decoder: "decoder",
    learning: "learning",
  },
  parts: labels,
  system: {
    forwardTitle: "forward",
    generationTitle: "generation",
    learningTitle: "learning",
    supportTitle: "support",
    logits: { name: "logits", purpose: "scores" },
    learningLogits: { name: "forward logits", purpose: "prediction scores" },
    learningJoin: "and",
    nextToken: { name: "next token", purpose: "append it" },
    target: { name: "target", purpose: "observed token" },
    gradients: { name: "gradients", purpose: "responsibility" },
    optimizer: { name: "optimizer", purpose: "change weights" },
    weights: { name: "weights", purpose: "updated parameters" },
    generationFeedback: "token feedback",
    weightFeedback: "weight feedback",
    cacheRelationship: "cache relationship",
    numericRelationship: "numeric relationship",
    evaluationRelationship: "selected weights to test score",
    checkpointRelationship: "training state to checkpoint",
  },
  cues: {
    chapterLinks: "chapters",
    chapterShort: "Ch",
    chapterLong: "Chapter",
    referenceLocaleBadge: "EN",
    referenceLocaleDestination: "English-language chapter",
    repeated: "repeated",
    nextTokenLoop: "loop",
    reuseTitle: "reuse",
    sharedForward: "forward",
    learningBoundary: "boundary",
  },
};

describe("Chapter 0 site-owned topology", () => {
  it("keeps every model part, nested flow, and implementation chapter reachable", () => {
    expect(llmPartsTrace.parts.map((part) => part.id)).toEqual(llmPartIds);
    expect(llmPartsTrace.flows.inference).toEqual([
      "input-text",
      "tokenizer",
      "embeddings",
      "decoder-block",
      "vocabulary-head",
      "sampler",
    ]);
    expect(llmPartsTrace.flows["decoder-block"]).toEqual([
      "rmsnorm",
      "causal-attention",
      "residual-stream",
      "rmsnorm",
      "swiglu",
      "residual-stream",
    ]);
    expect(llmPartsTrace.flows.learning).toEqual([
      "input-text",
      "tokenizer",
      "embeddings",
      "decoder-block",
      "vocabulary-head",
      "loss",
      "optimizer",
      "evaluation",
      "checkpoint",
    ]);
    expect(llmPartsTrace.byId["numeric-core"]).toEqual(
      expect.objectContaining({
        path: "both",
        purpose: expect.stringContaining("only during learning"),
      }),
    );
    expect(Object.values(llmPartsTrace.flows).flat()).not.toContain(
      "numeric-core",
    );
    expect(llmPartsTrace.capstone).toBe("39-end-to-end-llm");
    expect(llmPartsTrace.byId.evaluation).toEqual({
      id: "evaluation",
      path: "learning",
      purpose:
        "Score the selected frozen model after selection; retain the known result only as fixed-fixture regression evidence.",
      chapters: ["34-final-evaluation"],
    });
    expect(createHash("sha256").update(diagramDataSource).digest("hex")).toBe(
      "525d191b73c2c78932a3a86d2b3c7ef2c6158871487b0d55c3b077c2ad206a20",
    );
    const linkedOrders = new Set(
      llmPartsTrace.parts.flatMap((part) =>
        part.chapters.map((chapter) => Number(chapter.slice(0, 2))),
      ),
    );
    expect(linkedOrders).toEqual(
      new Set(Array.from({ length: 39 }, (_, index) => index + 1)),
    );
  });
});

describe("Chapter 0 diagram labels and component contract", () => {
  it("accepts exactly one complete ordered label set", () => {
    expect(() => validateLlmPartsDiagramLabels(completeLabels)).not.toThrow();
    const blank = structuredClone(completeLabels);
    blank.system.generationFeedback = " ";
    expect(() => validateLlmPartsDiagramLabels(blank)).toThrow(
      /generationFeedback/,
    );
    const reordered = structuredClone(completeLabels);
    reordered.parts = Object.fromEntries(
      Object.entries(reordered.parts).reverse(),
    ) as LlmPartsDiagramLabels["parts"];
    expect(() => validateLlmPartsDiagramLabels(reordered)).toThrow(
      /canonical part order/,
    );
  });

  it("renders the connected system and retained details as separate shared figures", () => {
    expect(llmSystemDiagramId).toBe("llm-system-map");
    expect(llmPartsDiagramId).toBe("llm-parts-map");
    expect(systemComponent.match(/<figure\b/g)).toHaveLength(1);
    expect(detailComponent.match(/<figure\b/g)).toHaveLength(1);
    expect(systemComponent).toContain(
      'class="course-diagram llm-system-diagram"',
    );
    expect(systemComponent).toContain('data-diagram-style="course-v1"');
    expect(systemComponent).toContain(
      "data-visualization-id={llmSystemDiagramId}",
    );
    expect(systemComponent).toContain('class="system-panel"');
    expect(systemComponent).toContain(
      'class="system-forward course-diagram__grid"',
    );
    expect(systemComponent).toContain(
      'class="system-branches course-diagram__grid"',
    );
    for (const stage of [
      "logits",
      "learning-logits",
      "next-token",
      "target",
      "gradients",
      "weights",
      "kv-cache",
      "numeric-foundation",
    ]) {
      expect(systemComponent).toContain(`data-schema-stage="${stage}"`);
    }
    expect(systemComponent.match(/data-schema-stage=/g)).toHaveLength(18);
    expect(detailComponent).toContain(
      'class="course-diagram llm-parts-diagram"',
    );
    expect(detailComponent).toContain('data-diagram-style="course-v1"');
    expect(detailComponent).toContain(
      "data-visualization-id={llmPartsDiagramId}",
    );
    expect(detailComponent).toContain('class="inference-panel"');
    expect(detailComponent).toContain('class="decoder-panel"');
    expect(detailComponent).toContain('class="learning-panel"');
    expect(detailComponent).not.toContain('class="system-panel"');
    expect(detailComponent).toContain("await getCollection(");
    expect(detailComponent).toContain(
      "chapterSet.byLocale[locale] ?? chapterSet.reference",
    );
    expect(detailComponent).toContain(
      "localePath(destination.locale, `/course/${chapterId}/`)",
    );
    expect(detailComponent).toContain(
      "getLocaleDefinition(chapterDestination(chapterId).locale).languageTag",
    );
    expect(detailComponent).toContain("data-chapter-link={chapterId}");
    expect(detailComponent).toContain(
      "data-chapter-locale={chapterDestination(chapterId).locale}",
    );
    expect(detailComponent).not.toMatch(
      />\s*Ch(?:apter)?\b|Check<wbr\s*\/?>point/,
    );
    for (const component of [systemComponent, detailComponent]) {
      expect(component).toContain("data-diagram-card");
      expect(component).toContain("data-diagram-box");
      expect(component).not.toMatch(
        /diagram-trace|rust\/demos\/ch00|<script\b|client:|<dialog\b|overflow:\s*(?:hidden|clip)/,
      );
    }
  });

  it("keeps the learner page an unassessed orientation", () => {
    for (const [locale, chapterPage] of Object.entries(chapterPages)) {
      expect(chapterPage).toContain('"chapter_kind": "orientation"');
      expect(chapterPage).toContain('"content_revision": 5');
      expect(chapterPage).toContain('"formula": null');
      expect(chapterPage).toContain('"rust_sources": []');
      expect(chapterPage).toContain("import LlmSystemDiagram");
      expect(chapterPage).toContain("import LlmPartsDiagram");
      expect(chapterPage).toContain(
        "<LlmSystemDiagram labels={diagramLabels} />",
      );
      expect(chapterPage).toContain(
        `<LlmPartsDiagram labels={diagramLabels} locale="${locale}" />`,
      );
      expect(chapterPage).not.toMatch(
        /chapter-section:(?:formula|symbol-glossary|rust-implementation|exercises)|<RustSource\b|<details\b|Check your first mental model|P_\\theta|rust\/demos\/ch00/,
      );
    }
    expect(chapterPages.en).toContain("You do not need to memorize this map.");
    expect(chapterPages.en).toContain(
      "The first figure is the whole-system schema",
    );
    expect(chapterPages.ru).toContain("Запоминать эту карту не нужно.");
    expect(chapterPages.ru).toContain("Первая схема показывает всю систему.");
    expect(chapterPages.ru).toContain(
      "На второй схеме модель показана подробнее.",
    );
    expect(chapterPages.ru).toContain(
      "Для каждой части указаны ссылки на главы курса,",
    );
    expect(chapterPages.ru).not.toMatch(
      /Ссылки на главы 1–7 открывают русские страницы|русская версия соответствующей главы пока недоступна|ссылка ведёт на английскую страницу/,
    );
  });

  it("bounds the evaluation node to one execution and fixed-fixture regression evidence", () => {
    const contract = frontmatter(contractSource);
    const english = chapterPages.en.replace(/\s+/g, " ");
    const russian = chapterPages.ru.replace(/\s+/g, " ");
    expect(contract.content_revision).toBe(5);
    expect(createHash("sha256").update(chapterPages.en).digest("hex")).toBe(
      "00ef6816f10320cc98ff31d60afd9dffb6798514cfdfbc0f2809d08b60ae495e",
    );
    expect(createHash("sha256").update(chapterPages.ru).digest("hex")).toBe(
      "315ea8f2523a8b01a3f3bca8de9f2d399790f698447f2b6e2d725dbecb006bfd",
    );
    expect(contract.translation_notes).toContain(
      "Canonical English revision 5 has SHA-256 00ef6816f10320cc98ff31d60afd9dffb6798514cfdfbc0f2809d08b60ae495e; the reviewed direct Russian revision 5 has SHA-256 315ea8f2523a8b01a3f3bca8de9f2d399790f698447f2b6e2d725dbecb006bfd.",
    );
    for (const fragment of [
      'purpose: "Score the selected frozen model after selection; retain the known result only as fixed-fixture regression evidence."',
      'evaluationRelationship: "Selected weights → one local evaluator → fixed-fixture report."',
      "Inside one execution, the local evaluator cannot affect the selected state; repository reruns retain the known result only as fixed-fixture regression evidence.",
    ])
      expect(english).toContain(fragment);
    for (const fragment of [
      'purpose: "Оценивает зафиксированную модель после завершения выбора; известный результат служит регрессионной проверкой фиксированного примера."',
      'evaluationRelationship: "Выбранные веса → один локальный оценщик → отчёт по фиксированному примеру."',
      "Узел итоговой оценки обозначает этап после выбора состояния, а не обещает, что при каждом последующем запуске модель получает новые, ранее не использованные данные.",
      "В пределах одного запуска локальный оценщик не может повлиять на выбранное состояние; известный результат служит регрессионной проверкой фиксированного примера.",
    ])
      expect(russian).toContain(fragment);
    expect(`${english} ${llmPartsTrace.byId.evaluation.purpose}`).not.toMatch(
      /Score the selected frozen model on unseen evaluation examples|Score the frozen selected model once on previously unopened test examples|Every repository run sees newly unseen evaluation data|Each repository run opens previously unopened test data|The fixture has never been read during repository development/i,
    );
    expect(russian).not.toMatch(
      /Тестирует фиксированную модель на новых примерах|при каждом запуске модель впервые видит тестовые данные|пример никогда прежде не открывали/i,
    );
  });
});
