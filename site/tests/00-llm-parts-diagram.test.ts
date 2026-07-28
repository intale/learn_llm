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
const read = (path: string) => readFileSync(resolve(repositoryRoot, path), "utf8");
const detailComponent = read("site/src/components/chapters/LlmPartsDiagram.astro");
const systemComponent = read("site/src/components/chapters/LlmSystemDiagram.astro");
const chapterPages = {
  en: read("site/src/content/chapters/en/00-llm-parts.mdx"),
  ru: read("site/src/content/chapters/ru/00-llm-parts.mdx"),
};

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
    expect(Object.values(llmPartsTrace.flows).flat()).not.toContain("numeric-core");
    expect(llmPartsTrace.capstone).toBe("39-end-to-end-llm");
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
    expect(() => validateLlmPartsDiagramLabels(blank)).toThrow(/generationFeedback/);
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
    expect(systemComponent).toContain('class="course-diagram llm-system-diagram"');
    expect(systemComponent).toContain('data-diagram-style="course-v1"');
    expect(systemComponent).toContain("data-visualization-id={llmSystemDiagramId}");
    expect(systemComponent).toContain('class="system-panel"');
    expect(systemComponent).toContain('class="system-forward course-diagram__grid"');
    expect(systemComponent).toContain('class="system-branches course-diagram__grid"');
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
    expect(detailComponent).toContain('class="course-diagram llm-parts-diagram"');
    expect(detailComponent).toContain('data-diagram-style="course-v1"');
    expect(detailComponent).toContain("data-visualization-id={llmPartsDiagramId}");
    expect(detailComponent).toContain('class="inference-panel"');
    expect(detailComponent).toContain('class="decoder-panel"');
    expect(detailComponent).toContain('class="learning-panel"');
    expect(detailComponent).not.toContain('class="system-panel"');
    expect(detailComponent).toContain("await getCollection(");
    expect(detailComponent).toContain("chapterSet.byLocale[locale] ?? chapterSet.reference");
    expect(detailComponent).toContain("localePath(destination.locale, `/course/${chapterId}/`)");
    expect(detailComponent).toContain("getLocaleDefinition(chapterDestination(chapterId).locale).languageTag");
    expect(detailComponent).toContain("data-chapter-link={chapterId}");
    expect(detailComponent).toContain("data-chapter-locale={chapterDestination(chapterId).locale}");
    expect(detailComponent).not.toMatch(/>\s*Ch(?:apter)?\b|Check<wbr\s*\/?>point/);
    for (const component of [systemComponent, detailComponent]) {
      expect(component).toContain("data-diagram-card");
      expect(component).toContain("data-diagram-box");
      expect(component).not.toMatch(/diagram-trace|rust\/demos\/ch00|<script\b|client:|<dialog\b|overflow:\s*(?:hidden|clip)/);
    }
  });

  it("keeps the learner page an unassessed orientation", () => {
    for (const [locale, chapterPage] of Object.entries(chapterPages)) {
      expect(chapterPage).toContain('"chapter_kind": "orientation"');
      expect(chapterPage).toContain('"formula": null');
      expect(chapterPage).toContain('"rust_sources": []');
      expect(chapterPage).toContain("import LlmSystemDiagram");
      expect(chapterPage).toContain("import LlmPartsDiagram");
      expect(chapterPage).toContain("<LlmSystemDiagram labels={diagramLabels} />");
      expect(chapterPage).toContain(
        `<LlmPartsDiagram labels={diagramLabels} locale="${locale}" />`,
      );
      expect(chapterPage).not.toMatch(
        /chapter-section:(?:formula|symbol-glossary|rust-implementation|exercises)|<RustSource\b|<details\b|Check your first mental model|P_\\theta|rust\/demos\/ch00/,
      );
    }
    expect(chapterPages.en).toContain("You do not need to memorize this map.");
    expect(chapterPages.en).toContain("The first figure is the whole-system schema");
    expect(chapterPages.ru).toContain("Запоминать эту карту не нужно.");
    expect(chapterPages.ru).toContain("Первая схема показывает всю систему.");
  });
});
