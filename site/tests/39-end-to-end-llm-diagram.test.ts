// @ts-ignore Node APIs are available in the Vitest runner.
import { readFileSync } from "node:fs";
// @ts-ignore Node APIs are available in the Vitest runner.
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  endToEndLlmDiagramId,
  parseEndToEndLlmTrace,
  validateEndToEndLlmDiagramLabels,
  type EndToEndLlmDiagramLabels,
} from "../src/lib/end-to-end-llm-diagram";

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), "..");
const read = (path: string) =>
  readFileSync(resolve(repositoryRoot, path), "utf8");
const fixture = read("rust/demos/ch39-end-to-end-llm/diagram-trace.txt");
const component = read(
  "site/src/components/chapters/EndToEndLlmDiagram.astro",
);

const labels: EndToEndLlmDiagramLabels = {
  title: "title",
  description: "description",
  sections: { pipeline: "pipeline" },
  stages: {
    data: "data",
    tokenizer: "tokenizer",
    batches: "batches",
    model: "model",
    selection: "selection",
    test: "test",
    checkpoint: "checkpoint",
    generation: "generation",
  },
  fields: {
    documents: "documents",
    vocabulary: "vocabulary",
    encodedTokens: "encoded tokens",
    context: "context",
    windows: "windows",
    parameters: "parameters",
    trainLoss: "train loss",
    validationLoss: "validation loss",
    targets: "targets",
    decoderLoss: "decoder loss",
    bigramLoss: "bigram loss",
    gap: "gap",
    bytes: "bytes",
    records: "records",
    prompt: "prompt",
    generated: "generated",
    decoded: "decoded",
    attentionScores: "attention scores",
  },
  cues: {
    trainingOnly: "training only",
    candidate: "candidate",
    selected: "selected",
    oneTime: "one time",
    exact: "exact",
    cachedMatch: "cached match",
  },
  captions: { pipeline: "pipeline caption" },
};

const cloneLabels = () =>
  JSON.parse(JSON.stringify(labels)) as EndToEndLlmDiagramLabels;

describe("Chapter 39 Rust trace parser", () => {
  it("preserves every frozen pipeline boundary and final proof", () => {
    const trace = parseEndToEndLlmTrace(fixture);
    expect(trace.data).toEqual({
      checksum: "fnv1a64:04786e7303f1dfd6",
      split: "fixed-paired-document-holdout-v1",
      train: "8",
      validation: "2",
      test: "2",
    });
    expect(trace.tokenizer).toEqual({
      layout: "1",
      requested: "8",
      learned: "8",
      vocabulary: "266",
      training_only: "true",
      encoded: ["1852", "471", "444"],
    });
    expect(trace.batches).toEqual({
      context: "4",
      windows: ["1820", "463", "436"],
      batches: ["15", "4", "4"],
    });
    expect(trace.model).toEqual({
      layers: "1",
      heads: "1",
      width: "4",
      feed_forward: "4",
      parameters: "1188",
    });
    expect(trace.selection).toEqual([
      {
        step: "0",
        train: "5.621745486",
        validation: "5.628342353",
        selected: "false",
      },
      {
        step: "32",
        train: "3.855502695",
        validation: "3.889531885",
        selected: "true",
      },
    ]);
    expect(trace.test).toMatchObject({
      access: "1",
      windows: "436",
      batches: "4",
      targets: "1744",
      decoder: "3.866087547",
      bigram: "3.981342714",
      gap: "0.115255167",
      decoder_wins: "true",
      no_grad: "true",
      unchanged: "true",
    });
    expect(trace.checkpoint).toEqual({
      bytes: "30994",
      header: "2418",
      records: "34",
      selected: "32",
      optimizer: "32",
      tokenizer_exact: "true",
      logits_bitwise: "true",
    });
    expect(trace.generation).toEqual({
      prompt: "A",
      prompt_ids: ["67"],
      generated: ["260", "34", "34"],
      text: "т  ",
      stop: "token-limit",
      final_cache: "3",
      cached_scores: "6",
      complete_prefix_scores: "14",
      tokens_exact: "true",
      decisions_bitwise: "true",
      rng_exact: "true",
    });
    expect(trace.history).toEqual({
      bigram_context: "1",
      distributed_features: "true",
      causal_transformer: "true",
      scaled_autoregressive: "true",
    });
  });

  it.each([
    ["wrong header", fixture.replace("END_TO_END_LLM_TRACE_V1", "TRACE_V2")],
    [
      "test opened twice",
      fixture.replace("TEST|access=1", "TEST|access=2"),
    ],
    [
      "tokenizer saw later data",
      fixture.replace("training_only=true", "training_only=false"),
    ],
    [
      "decoder no longer wins",
      fixture.replace("decoder_wins=true", "decoder_wins=false"),
    ],
    [
      "reload differs",
      fixture.replace("logits_bitwise=true", "logits_bitwise=false"),
    ],
    [
      "cached decisions differ",
      fixture.replace("decisions_bitwise=true", "decisions_bitwise=false"),
    ],
    [
      "historical boundary differs",
      fixture.replace("causal_transformer=true", "causal_transformer=false"),
    ],
    [
      "loss gap differs",
      fixture.replace("gap=0.115255167", "gap=0.215255167"),
    ],
    [
      "unknown stop reason",
      fixture.replace("stop=token-limit", "stop=unknown"),
    ],
    [
      "invalid generated text",
      fixture.replace('text="т  "', "text=not-json"),
    ],
    [
      "missing field",
      fixture.replace("|records=34", ""),
    ],
    [
      "duplicate field",
      fixture.replace("|records=34", "|records=34|records=34"),
    ],
    [
      "extra record",
      fixture.replace(
        "END|next=student-owned-decoder",
        "EXTRA|value=1\nEND|next=student-owned-decoder",
      ),
    ],
  ])("rejects %s", (_name, mutation) => {
    expect(() => parseEndToEndLlmTrace(mutation)).toThrow();
  });
});

describe("Chapter 39 diagram labels and component contract", () => {
  it("accepts a complete localized label set and rejects nested blanks", () => {
    expect(() => validateEndToEndLlmDiagramLabels(labels)).not.toThrow();
    const blank = cloneLabels();
    blank.fields.decoderLoss = " ";
    expect(() => validateEndToEndLlmDiagramLabels(blank)).toThrow(
      /decoderLoss/,
    );
  });

  it("registers one static shared-style semantic figure", () => {
    expect(endToEndLlmDiagramId).toBe("end-to-end-llm");
    expect(component.match(/<figure\b/g)).toHaveLength(1);
    expect(component).toContain('class="course-diagram end-to-end-llm-diagram"');
    expect(component).toContain('data-diagram-style="course-v1"');
    expect(component).toContain("data-visualization-id={endToEndLlmDiagramId}");
    expect(component).toContain('class="course-diagram__caption"');
    expect(component).toContain('class="course-diagram__description"');
    expect(component.match(/data-diagram-card/g)).toHaveLength(8);
    expect(component.match(/data-stage-index=/g)).toHaveLength(8);
    expect(component).toContain("parseEndToEndLlmTrace(traceSource)");
    expect(component).toContain(
      "validateEndToEndLlmDiagramLabels(labels)",
    );
  });

  it("keeps every shared stage card visible and marked", () => {
    expect(component.match(/data-diagram-box/g)).toHaveLength(8);
    expect(component).not.toMatch(/overflow\s*:\s*(?:hidden|clip)/);
    expect(component).not.toMatch(/contain\s*:\s*paint/);
    expect(component).not.toMatch(
      /@media\s*\(\s*(?:max|min)-(?:width|inline-size)/,
    );
    expect(component).toContain("@container course-diagram");
    expect(component).toContain("@media (forced-colors: active)");
  });

  it("adds no private script, hydration, scroller, or expansion tree", () => {
    expect(component).not.toMatch(/<script\b/);
    expect(component).not.toMatch(/client:/);
    expect(component).not.toMatch(/data-diagram-scroll/);
    expect(component).not.toMatch(/requestFullscreen|<dialog|expand/i);
  });
});
