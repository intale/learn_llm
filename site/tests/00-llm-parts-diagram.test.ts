// @ts-ignore Node APIs are available in the Vitest runner.
import { readFileSync } from "node:fs";
// @ts-ignore Node APIs are available in the Vitest runner.
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  llmPartIds,
  llmPartsDiagramId,
  parseLlmPartsTrace,
  validateLlmPartsDiagramLabels,
  type LlmPartsDiagramLabels,
} from "../src/lib/llm-parts-diagram";

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), "..");
const read = (path: string) => readFileSync(resolve(repositoryRoot, path), "utf8");
const fixture = read("rust/demos/ch00-llm-parts/diagram-trace.txt");
const component = read("site/src/components/chapters/LlmPartsDiagram.astro");
const chapterPage = read("site/src/content/chapters/en/00-llm-parts.mdx");

const labels = Object.fromEntries(
  llmPartIds.map((id) => [id, { name: id, purpose: `${id} purpose` }]),
) as LlmPartsDiagramLabels["parts"];
const completeLabels: LlmPartsDiagramLabels = {
  title: "title",
  description: "description",
  sections: { inference: "inference", decoder: "decoder", learning: "learning" },
  captions: { inference: "inference", decoder: "decoder", learning: "learning" },
  parts: labels,
  cues: {
    chapterLinks: "chapters",
    repeated: "repeated",
    nextTokenLoop: "loop",
    reuseTitle: "reuse",
    sharedForward: "forward",
    learningBoundary: "boundary",
  },
};

describe("Chapter 0 Rust topology parser", () => {
  it("keeps every model part, nested flow, and implementation chapter reachable", () => {
    const trace = parseLlmPartsTrace(fixture);
    expect(trace.parts.map((part) => part.id)).toEqual(llmPartIds);
    expect(trace.flows.inference).toEqual([
      "input-text",
      "tokenizer",
      "embeddings",
      "decoder-block",
      "vocabulary-head",
      "sampler",
    ]);
    expect(trace.flows["decoder-block"]).toEqual([
      "rmsnorm",
      "causal-attention",
      "residual-stream",
      "rmsnorm",
      "swiglu",
      "residual-stream",
    ]);
    expect(trace.flows.learning).toEqual([
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
    expect(trace.byId["numeric-core"]).toEqual(
      expect.objectContaining({
        path: "both",
        purpose: expect.stringContaining("only during learning"),
      }),
    );
    expect(Object.values(trace.flows).flat()).not.toContain("numeric-core");
    expect(trace.capstone).toBe("39-end-to-end-llm");
    const linkedOrders = new Set(
      trace.parts.flatMap((part) =>
        part.chapters.map((chapter) => Number(chapter.slice(0, 2))),
      ),
    );
    expect(linkedOrders).toEqual(new Set(Array.from({ length: 39 }, (_, index) => index + 1)));
  });

  it.each([
    ["header", fixture.replace("LLM_PARTS_TRACE_V1", "LLM_PARTS_TRACE_V2")],
    ["part order", fixture.replace("id=tokenizer", "id=embeddings")],
    ["path", fixture.replace("path=inference", "path=unknown")],
    ["destination", fixture.replace("01-text-units", "chapter-one")],
    ["duplicate destination", fixture.replace("03-learn-bpe-merges", "01-text-units")],
    [
      "missing chapter",
      fixture.replace(
        "chapters=39-end-to-end-llm",
        "chapters=38-cached-generation",
      ),
    ],
    ["flow order", fixture.replace("name=inference", "name=learning")],
    ["unknown flow part", fixture.replace("parts=input-text,tokenizer", "parts=unknown,tokenizer")],
    [
      "separate learning path",
      fixture.replace(
        "parts=input-text,tokenizer,embeddings,decoder-block,vocabulary-head,loss",
        "parts=input-text,numeric-core,loss",
      ),
    ],
    ["capstone", fixture.replace("END|chapter=39-end-to-end-llm", "END|chapter=38-cached-generation")],
    ["extra record", fixture.replace("END|", "FLOW|name=extra|parts=tokenizer\nEND|")],
  ])("rejects a changed %s", (_name, mutation) => {
    expect(() => parseLlmPartsTrace(mutation)).toThrow();
  });
});

describe("Chapter 0 diagram labels and component contract", () => {
  it("accepts exactly one complete ordered label set", () => {
    expect(() => validateLlmPartsDiagramLabels(completeLabels)).not.toThrow();
    const blank = structuredClone(completeLabels);
    blank.parts["causal-attention"].purpose = " ";
    expect(() => validateLlmPartsDiagramLabels(blank)).toThrow(/causal-attention/);
    const reordered = structuredClone(completeLabels);
    reordered.parts = Object.fromEntries(
      Object.entries(reordered.parts).reverse(),
    ) as LlmPartsDiagramLabels["parts"];
    expect(() => validateLlmPartsDiagramLabels(reordered)).toThrow(/complete Rust part order/);
  });

  it("registers one static shared-style semantic figure with build-time course links", () => {
    expect(llmPartsDiagramId).toBe("llm-parts-map");
    expect(component.match(/<figure\b/g)).toHaveLength(1);
    expect(component).toContain('class="course-diagram llm-parts-diagram"');
    expect(component).toContain('data-diagram-style="course-v1"');
    expect(component).toContain("data-visualization-id={llmPartsDiagramId}");
    expect(component).toContain('tabindex="0"');
    expect(component).toContain("await getCollection(");
    expect(component).toContain("localePath(locale, `/course/${chapterId}/`)");
    expect(component).toContain("data-chapter-link={chapterId}");
    expect(component).toContain('aria-label={`Ch ${chapterNumber(chapterId)} — ${chapterTitle(chapterId)}`}');
    expect(component).toContain("chapterTitle(chapterId)");
    expect(component).toContain("{sharedForwardLength + occurrence}");
    expect(component).toContain("data-diagram-card");
    expect(component).toContain("data-diagram-box");
    expect(component).toContain('class="state-symbol"');
    expect(component).toContain("course-diagram__grid");
    expect(component).toContain("course-diagram__card-stack");
    expect(component).toContain("start={sharedForwardLength + 1}");
    expect(component).toContain("course-diagram__card-heading");
    expect(component).toContain("course-diagram__link-list");
    expect(component).toContain("course-diagram__link-separator");
    expect(component.match(/class="state-symbol" aria-hidden="true"/g)).toHaveLength(6);
    expect(component).toContain("cache.part.chapters.map((chapterId, chapterIndex)");
    expect(chapterPage).toContain(
      "Training shifts targets by one position, so this allowed",
    );
    expect(chapterPage).toContain(
      "The next cached\ndecode starts from that ID's embedding; it does not detokenize and tokenize the\nwhole growing sequence again.",
    );
    const localStyle = component.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
    expect(localStyle).not.toMatch(/\bgap\s*:|overflow-wrap|word-break|font-size|\.state-symbol/);
    expect(component).not.toMatch(/<script\b|client:|<dialog\b|overflow:\s*(?:hidden|clip)/);
  });
});
