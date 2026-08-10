// @ts-ignore Node APIs are available in the Vitest runner.
import { createHash } from "node:crypto";
// @ts-ignore Node APIs are available in the Vitest runner.
import { existsSync, readFileSync } from "node:fs";
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
const expectedOutput = read("rust/demos/ch39-end-to-end-llm/expected.txt");
const component = read("site/src/components/chapters/EndToEndLlmDiagram.astro");
const parserSource = read("site/src/lib/end-to-end-llm-diagram.ts");
const demoSource = read("rust/demos/ch39-end-to-end-llm/src/lib.rs");
const mainSource = read("rust/demos/ch39-end-to-end-llm/src/main.rs");
const contractSource = read("curriculum/chapters/39-end-to-end-llm.md");
const englishLessonSource = read(
  "site/src/content/chapters/en/39-end-to-end-llm.mdx",
);
const russianLessonSource = read(
  "site/src/content/chapters/ru/39-end-to-end-llm.mdx",
);
const evaluationSource = read("rust/crates/llm-from-scratch/src/evaluation.rs");
const pipelineSource = read("rust/crates/llm-from-scratch/src/pipeline.rs");
const chapterLocaleConfiguration = JSON.parse(
  read("site/src/i18n/chapter-locales.json"),
);

function frontmatter(source: string) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error("missing JSON frontmatter");
  return JSON.parse(match[1]);
}

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
    updateBatchSize: "update batch size",
    evaluationBatchSize: "evaluation batch size",
    evaluationBatches: "evaluation batches",
    parameters: "parameters",
    trainLoss: "train loss",
    validationLoss: "validation loss",
    windowSlots: "window slots",
    distinctTransitions: "distinct transitions",
    transitionMultiplicity: "transition multiplicity",
    decoderSlotMeanNll: "decoder slot mean NLL",
    decoderSlotPerplexity: "decoder slot perplexity",
    bigramSlotMeanNll: "bigram slot mean NLL",
    bigramSlotPerplexity: "bigram slot perplexity",
    slotGap: "slot gap",
    transitionMetric: "transition metric",
    decoderContextCapacity: "decoder context capacity",
    decoderSlotContextLengths: "decoder slot context lengths",
    bytes: "bytes",
    records: "records",
    logitProbeText: "logit probe text",
    logitProbeTokenIds: "logit probe token IDs",
    prompt: "prompt",
    sampling: "sampling",
    generated: "generated",
    decoded: "decoded",
    retainedPrefixLengths: "retained prefix lengths",
    cachePrefillPromptTokens: "cache prefill prompt tokens",
    oneTokenDecodeInputTokens: "one-token decode input tokens",
    cachedAttentionScoreCells: "cached attention score cells",
    completePrefixAttentionScoreCells: "complete-prefix attention score cells",
  },
  cues: {
    trainingOnly: "training only",
    candidate: "candidate",
    selected: "selected",
    oneTime: "one time",
    sharedSlots: "shared slots",
    transitionMetricNotReported: "transition metric not reported",
    exact: "exact",
    cachedMatch: "cached match",
    decodedText: "decoded text",
    spaceMarker: "space marker",
  },
  captions: { pipeline: "pipeline caption" },
};

const cloneLabels = () =>
  JSON.parse(JSON.stringify(labels)) as EndToEndLlmDiagramLabels;

describe("Chapter 39 Rust trace parser", () => {
  it("preserves every frozen pipeline boundary and final proof", () => {
    const trace = parseEndToEndLlmTrace(fixture);
    expect(trace.data).toEqual({
      checksum: "fnv1a64:723b071980ae8a22",
      split: "fixed-paired-document-holdout-v1",
      train: "8",
      validation: "2",
      test: "2",
      train_ids: [
        "en-river-dawn",
        "ru-river-dawn",
        "en-clock-shop",
        "ru-clock-shop",
        "en-rain-library",
        "ru-rain-library",
        "en-bee-garden",
        "ru-bee-garden",
      ],
      validation_ids: ["en-night-station", "ru-night-station"],
      test_ids: ["en-winter-window", "ru-winter-window"],
    });
    expect(trace.tokenizer).toEqual({
      layout: "1",
      requested: "8",
      learned: "8",
      vocabulary: "266",
      training_only: "true",
      training_ids: [
        "en-river-dawn",
        "ru-river-dawn",
        "en-clock-shop",
        "ru-clock-shop",
        "en-rain-library",
        "ru-rain-library",
        "en-bee-garden",
        "ru-bee-garden",
      ],
      encoded: ["1852", "471", "444"],
    });
    expect(trace.batches).toEqual({
      context: "4",
      update_batch_size: "16",
      evaluation_batch_size: "128",
      windows: ["1820", "463", "436"],
      evaluation_batches: ["15", "4", "4"],
    });
    expect(trace.model).toEqual({
      layers: "1",
      heads: "1",
      width: "4",
      feed_forward: "4",
      parameters: "1188",
    });
    expect(trace.training).toEqual({
      updates: "32",
      seed: "39",
      replay_bitwise: "true",
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
    expect(trace.test).toEqual({
      access: "1",
      documents: ["en-winter-window", "ru-winter-window"],
      stride: "1",
      windows: "436",
      batches: "4",
      window_target_slots: "1744",
      document_transition_occurrences: "442",
      transition_multiplicity_counts: "1x4,2x4,3x4,4x430",
      window_slot_fingerprint: "fnv1a64:77b836869f848986",
      no_grad: "true",
      unchanged: "true",
    });
    expect(trace.slotMetric).toEqual({
      unit: "overlapping-window-target-slot",
      decoder_window_slot_mean_nll_nats: "3.866087547",
      decoder_window_slot_perplexity: "47.755180205",
      bigram_window_slot_mean_nll_nats: "3.981342714",
      bigram_window_slot_perplexity: "53.588940583",
      window_slot_gap_nats: "0.115255167",
      comparison_slot_set: "shared-ordered-window-slots",
      decoder_lower_on_fixture: "true",
    });
    expect(trace.transitionMetric).toEqual({
      unit: "within-document-next-token-transition",
      count: "442",
      context_policy: "longest-available-causal-prefix-up-to-4",
      newest_position_only: "true",
      reported: "false",
      mean_nll: "not-reported",
      perplexity: "not-reported",
    });
    expect(trace.evidence).toEqual({
      scope: "fixed-fixture-regression",
      within_run_selection_isolated: "true",
      independent_generalization_estimate: "false",
      architecture_superiority_evidence: "false",
    });
    expect(trace.checkpoint).toEqual({
      bytes: "30994",
      header: "2418",
      records: "34",
      checksum: "fnv1a64:67aeaaea603b291f",
      selected: "32",
      optimizer: "32",
      rng: "0x0000000000000026",
      bytes_roundtrip: "true",
      model_bits_exact: "true",
      optimizer_bits_exact: "true",
      tokenizer_exact: "true",
      logit_probe: "At",
      logit_probe_ids: ["67", "118"],
      prompt_logits_bitwise: "true",
    });
    expect(trace.generation).toEqual({
      prompt: "A",
      prompt_ids: ["67"],
      temperature: "0.8",
      top_k: "4",
      seed: "38",
      generated: ["260", "34", "34"],
      text: "т  ",
      prefixes: ["1", "2", "3"],
      stop: "token-limit",
      prefill: "1",
      decode: "2",
      final_cache: "3",
      cached_scores: "6",
      calculated_complete_prefix_scores: "14",
      rng_initial: "0x0000000000000026",
      rng_final: "0xdaa66d2c7ddf7465",
      tokens_exact: "true",
      decisions_bitwise: "true",
      rng_exact: "true",
    });
    expect(trace.history).toEqual({
      window_slot_unit: "overlapping-window-target-slot",
      window_target_slots: "1744",
      document_transition_occurrences: "442",
      bigram_context_tokens: "1",
      decoder_context_capacity: "4",
      decoder_window_slot_context_lengths: "1,2,3,4",
      bigram_window_slot_mean_nll_nats: "3.981342714",
      decoder_window_slot_mean_nll_nats: "3.866087547",
      window_slot_gap_nats: "0.115255167",
    });
  });

  it.each([
    ["wrong header", fixture.replace("END_TO_END_LLM_TRACE_V3", "TRACE_V4")],
    ["test opened twice", fixture.replace("TEST|access=1", "TEST|access=2")],
    [
      "tokenizer saw later data",
      fixture.replace("training_only=true", "training_only=false"),
    ],
    [
      "fixed fixture ordering changed",
      fixture.replace(
        "decoder_lower_on_fixture=true",
        "decoder_lower_on_fixture=false",
      ),
    ],
    [
      "stale universal-win field",
      fixture.replace("decoder_lower_on_fixture=true", "decoder_wins=true"),
    ],
    [
      "evidence scope changed",
      fixture.replace(
        "EVIDENCE|scope=fixed-fixture-regression",
        "EVIDENCE|scope=independent-generalization",
      ),
    ],
    [
      "within-run isolation changed",
      fixture.replace(
        "within_run_selection_isolated=true",
        "within_run_selection_isolated=false",
      ),
    ],
    [
      "independent-estimate claim changed",
      fixture.replace(
        "independent_generalization_estimate=false",
        "independent_generalization_estimate=true",
      ),
    ],
    [
      "architecture-superiority claim changed",
      fixture.replace(
        "architecture_superiority_evidence=false",
        "architecture_superiority_evidence=true",
      ),
    ],
    [
      "reload differs",
      fixture.replace(
        "prompt_logits_bitwise=true",
        "prompt_logits_bitwise=false",
      ),
    ],
    [
      "cached decisions differ",
      fixture.replace("decisions_bitwise=true", "decisions_bitwise=false"),
    ],
    [
      "historical boundary differs",
      fixture.replace(
        "|decoder_context_capacity=4",
        "|decoder_context_capacity=5",
      ),
    ],
    [
      "window-slot gap differs",
      fixture.replace(
        "window_slot_gap_nats=0.115255167",
        "window_slot_gap_nats=0.215255167",
      ),
    ],
    [
      "unknown stop reason",
      fixture.replace("stop=token-limit", "stop=unknown"),
    ],
    [
      "invalid generated text",
      fixture.replace(/text="[^"]*"/, "text=not-json"),
    ],
    [
      "window-slot arithmetic differs",
      fixture.replace("|window_target_slots=1744", "|window_target_slots=1743"),
    ],
    [
      "window slots and transitions are swapped",
      fixture.replace(
        "|window_target_slots=1744|document_transition_occurrences=442",
        "|window_target_slots=442|document_transition_occurrences=1744",
      ),
    ],
    [
      "fixture-critical counts become zero",
      fixture
        .replace("|windows=436|batches=4", "|windows=0|batches=0")
        .replace("|window_target_slots=1744", "|window_target_slots=0")
        .replace(
          "|document_transition_occurrences=442",
          "|document_transition_occurrences=0",
        ),
    ],
    [
      "transition occurrence count differs",
      fixture.replace(
        "|document_transition_occurrences=442",
        "|document_transition_occurrences=443",
      ),
    ],
    [
      "multiplicity histogram total differs",
      fixture.replace("1x4,2x4,3x4,4x430", "1x4,2x4,3x5,4x430"),
    ],
    [
      "multiplicity histogram order differs",
      fixture.replace("1x4,2x4,3x4,4x430", "2x4,1x4,3x4,4x430"),
    ],
    ["stride differs", fixture.replace("|stride=1", "|stride=2")],
    [
      "window-slot fingerprint differs",
      fixture.replace(
        "window_slot_fingerprint=fnv1a64:77b836869f848986",
        "window_slot_fingerprint=fnv1a64:77b836869f848987",
      ),
    ],
    [
      "window-slot unit differs",
      fixture.replace(
        "unit=overlapping-window-target-slot",
        "unit=within-document-next-token-transition",
      ),
    ],
    [
      "comparison slot set differs",
      fixture.replace(
        "comparison_slot_set=shared-ordered-window-slots",
        "comparison_slot_set=different-window-slots",
      ),
    ],
    [
      "decoder perplexity differs",
      fixture.replace(
        "decoder_window_slot_perplexity=47.755180205",
        "decoder_window_slot_perplexity=47.755180305",
      ),
    ],
    [
      "bigram perplexity differs",
      fixture.replace(
        "bigram_window_slot_perplexity=53.588940583",
        "bigram_window_slot_perplexity=53.588940683",
      ),
    ],
    [
      "mean NLL is relabeled as perplexity",
      fixture.replace(
        "decoder_window_slot_mean_nll_nats=3.866087547",
        "decoder_window_slot_mean_nll_nats=47.755180205",
      ),
    ],
    [
      "transition unit differs",
      fixture.replace(
        "TRANSITION_METRIC|unit=within-document-next-token-transition",
        "TRANSITION_METRIC|unit=overlapping-window-target-slot",
      ),
    ],
    [
      "transition count differs",
      fixture.replace(
        "TRANSITION_METRIC|unit=within-document-next-token-transition|count=442",
        "TRANSITION_METRIC|unit=within-document-next-token-transition|count=443",
      ),
    ],
    [
      "transition context policy differs",
      fixture.replace(
        "context_policy=longest-available-causal-prefix-up-to-4",
        "context_policy=fixed-four-token-window",
      ),
    ],
    [
      "transition newest-position rule differs",
      fixture.replace(
        "newest_position_only=true",
        "newest_position_only=false",
      ),
    ],
    [
      "transition metric is falsely reported",
      fixture.replace("|reported=false", "|reported=true"),
    ],
    [
      "transition mean NLL receives a slot value",
      fixture.replace("|mean_nll=not-reported", "|mean_nll=3.866087547"),
    ],
    [
      "transition perplexity receives a slot value",
      fixture.replace("|perplexity=not-reported", "|perplexity=47.755180205"),
    ],
    [
      "decoder slot context lengths differ",
      fixture.replace(
        "decoder_window_slot_context_lengths=1,2,3,4",
        "decoder_window_slot_context_lengths=1,2,4,4",
      ),
    ],
    [
      "stale target aliases return",
      fixture.replace("window_target_slots=1744", "targets=1744"),
    ],
    [
      "prefix schedule differs",
      fixture.replace("|prefixes=1,2,3", "|prefixes=1,2,4"),
    ],
    [
      "checkpoint and generation RNG differ",
      fixture.replace(
        "|rng_initial=0x0000000000000026",
        "|rng_initial=0x0000000000000027",
      ),
    ],
    [
      "record fields are reordered",
      fixture.replace("|train=8|validation=2", "|validation=2|train=8"),
    ],
    [
      "metric records are reordered",
      fixture.replace(
        /(SLOT_METRIC[^\r\n]+)\r?\n(TRANSITION_METRIC[^\r\n]+)/,
        "$2\n$1",
      ),
    ],
    ["missing field", fixture.replace("|records=34", "")],
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
    ["missing final newline", fixture.trimEnd()],
  ])("rejects %s", (_name, mutation) => {
    expect(() => parseEndToEndLlmTrace(mutation)).toThrow();
  });

  it("reports compound proof and evidence-scope drift accurately", () => {
    expect(() =>
      parseEndToEndLlmTrace(
        fixture.replace(
          "architecture_superiority_evidence=false",
          "architecture_superiority_evidence=true",
        ),
      ),
    ).toThrow(/capstone proof or metric-scope field changed/);
  });
});

describe("Chapter 39 diagram labels and component contract", () => {
  it("accepts a complete localized label set and rejects nested blanks", () => {
    expect(() => validateEndToEndLlmDiagramLabels(labels)).not.toThrow();
    const blank = cloneLabels();
    blank.fields.decoderSlotMeanNll = " ";
    expect(() => validateEndToEndLlmDiagramLabels(blank)).toThrow(
      /decoderSlotMeanNll/,
    );
    const extra = cloneLabels() as EndToEndLlmDiagramLabels & {
      extra?: string;
    };
    extra.extra = "unexpected";
    expect(() => validateEndToEndLlmDiagramLabels(extra)).toThrow(/field set/);
  });

  it("registers one static shared-style semantic figure", () => {
    expect(endToEndLlmDiagramId).toBe("end-to-end-llm");
    expect(component.match(/<figure\b/g)).toHaveLength(1);
    expect(component).toContain(
      'class="course-diagram end-to-end-llm-diagram"',
    );
    expect(component).toContain('data-diagram-style="course-v1"');
    expect(component).toContain("data-visualization-id={endToEndLlmDiagramId}");
    expect(component).toContain('class="course-diagram__caption"');
    expect(component).toContain('class="course-diagram__description"');
    expect(component).toContain("course-diagram__grid");
    expect(component).toContain("course-diagram__card-stack");
    expect(component).toContain("course-diagram__card-heading");
    expect(component.match(/data-diagram-card/g)).toHaveLength(8);
    expect(component.match(/data-stage-index=/g)).toHaveLength(8);
    expect(component.match(/data-evidence="/g)).toHaveLength(21);
    for (const evidence of [
      "encoded-token-counts",
      "window-counts",
      "evaluation-batch-counts",
      "window-target-slot-count",
      "document-transition-occurrence-count",
      "transition-multiplicity-counts",
      "decoder-window-slot-mean-nll",
      "decoder-window-slot-perplexity",
      "bigram-window-slot-mean-nll",
      "bigram-window-slot-perplexity",
      "window-slot-mean-nll-gap",
      "decoder-context-capacity",
      "decoder-window-slot-context-lengths",
      "transition-metric-status",
      "reload-probe-text",
      "reload-probe-token-ids",
      "retained-prefix-lengths",
      "cache-prefill-prompt-tokens",
      "one-token-decode-input-tokens",
      "cached-attention-score-cells",
      "complete-prefix-attention-score-cells",
    ]) {
      expect(
        component.match(new RegExp(`data-evidence="${evidence}"`, "g")),
      ).toHaveLength(1);
    }
    expect(component).toContain("parseEndToEndLlmTrace(traceSource)");
    expect(component).toContain("validateEndToEndLlmDiagramLabels(labels)");
    expect(component).not.toContain("prefixes=[");
    expect(component).not.toContain("prefill={");
    expect(component).not.toContain("decode={");
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

  it("gives full view readable card floors and root-owned vertical continuation", () => {
    const css = component.replace(/\s+/g, " ");
    const fullscreen =
      "figure.course-diagram.end-to-end-llm-diagram[data-diagram-style='course-v1']:fullscreen";
    expect(css).toContain(
      `${fullscreen} { align-content: start; align-items: start; }`,
    );
    expect(css).toContain(
      `${fullscreen} .pipeline.course-diagram__grid { display: grid; grid-template-columns: minmax(0, 1fr); align-items: start; }`,
    );
    expect(css).toContain("@container course-diagram (min-width: 68rem)");
    expect(css).toContain("repeat(auto-fit, minmax(min(100%, 32rem), 1fr))");
    expect(css).toContain(
      ".stage-card[data-stage='selection'], .stage-card[data-stage='test'], .stage-card[data-stage='generation'] ) { grid-column: 1 / -1; }",
    );
    expect(css).toContain(
      ".selection-card > dl { grid-template-columns: repeat(2, minmax(0, 1fr)); }",
    );
    expect(css).toContain("repeat(auto-fit, minmax(min(100%, 22rem), 1fr))");
    expect(css).not.toContain("display: contents");
    expect(css).not.toMatch(
      /repeat\(12,\s*minmax|grid-template-columns:\s*repeat\(6/,
    );
    const fullViewDeclarations = Array.from(
      css.matchAll(
        /figure\.course-diagram\.end-to-end-llm-diagram\[data-diagram-style='course-v1'\]:fullscreen[^{}]*\{([^}]*)\}/g,
      ),
      (match: RegExpMatchArray) => match[1],
    ).join(" ");
    expect(fullViewDeclarations).not.toMatch(/flex:\s*1\s+0\s+(?:23|49)%/);
  });

  it("adds no private script, hydration, scroller, or expansion tree", () => {
    expect(component).not.toMatch(/<script\b/);
    expect(component).not.toMatch(/client:/);
    expect(component).not.toMatch(/data-diagram-scroll/);
    expect(component).not.toMatch(/requestFullscreen|<dialog|expand/i);
  });
});

describe("Chapter 39 bilingual lesson and evidence contract", () => {
  it("publishes one exact revision-9 English/Russian lesson set", () => {
    const contract = frontmatter(contractSource);
    const lessons = {
      en: frontmatter(englishLessonSource),
      ru: frontmatter(russianLessonSource),
    };
    const lessonSources = {
      en: englishLessonSource,
      ru: russianLessonSource,
    };
    const activeChapter = chapterLocaleConfiguration.chapters.find(
      ({ chapterId }: { chapterId: string }) =>
        chapterId === "39-end-to-end-llm",
    );

    expect(activeChapter).toEqual({
      chapterId: "39-end-to-end-llm",
      order: 39,
      activeLocales: ["en", "ru"],
    });
    expect(contract).toMatchObject({
      chapter_id: "39-end-to-end-llm",
      concept_id: "end-to-end-llm",
      content_revision: 9,
      order: 39,
    });
    expect(contract.translation_notes.join(" ")).toContain(
      "exact active locale set is {en, ru}",
    );
    expect(contract.translation_notes.join(" ")).toContain(
      "direct, meaning-first translation of frozen English revision 9",
    );
    expect(contract.translation_notes.join(" ")).toContain(
      `SHA-256 ${createHash("sha256").update(englishLessonSource).digest("hex")}`,
    );
    expect(contract.translation_notes.join(" ")).toContain(
      `Russian lesson SHA-256 is ${createHash("sha256").update(russianLessonSource).digest("hex")}`,
    );
    expect(contract.translation_notes.join(" ")).toContain(
      "The English and reviewed Russian Chapter 39 cheat sheets have SHA-256 90b1610666270ef7a3cba38e1070f3d666080a6a8487515b4478c7917918b0b0 and 21db369c97bdb443a17320b108b37e22b302d0a73c9da91ec85c1bcfb852a2fa respectively.",
    );
    expect(createHash("sha256").update(contractSource).digest("hex")).toBe(
      "bf0db5d7bae95444752332ab3be98f3b07a6e6ef1c62720dd39b919ca58fec15",
    );
    expect(createHash("sha256").update(englishLessonSource).digest("hex")).toBe(
      "6234b3ea092e6a53f74fe8d10fc6ed85c4f2f168192356b4264b502d3fa84f07",
    );
    expect(createHash("sha256").update(russianLessonSource).digest("hex")).toBe(
      "83b5b1200a3c7c685552236646bb5d8dc36d1beb16e9de84d9dc6f50710732d7",
    );
    expect(lessons.ru.history.summary).toBe(
      "Частотные n-граммы служили сильной базовой моделью с коротким контекстом; обучаемые распределённые признаки и маскированное самовнимание сделали возможными более длинные обучаемые вычисления, а масштабированные авторегрессионные модели на основе Transformer стали одним из основных семейств современных LLM. Завершающий пример показывает локальные границы ответственности, а известное более низкое среднее NLL декодера по позициям окон представлено лишь как результат фиксированного примера для регрессионной проверки.",
    );
    const dworkSource = contract.history.llm_evolution.sources.find(
      ({ source_url }: { source_url: string }) =>
        source_url === "https://arxiv.org/abs/1506.02629",
    );
    expect(dworkSource).toEqual({
      role: "later",
      year: 2015,
      name: "Generalization in Adaptive Data Analysis and Holdout Reuse",
      source_url: "https://arxiv.org/abs/1506.02629",
      claim: {
        en: "Dwork and colleagues show that adaptive repeated reuse of a standard holdout can overfit that holdout; this general warning does not establish any fact about the capstone fixture, its score, or its local access count.",
        ru: "Дворк и соавторы показывают, что многократное адаптивное использование обычной отложенной выборки может привести к переобучению на самой этой выборке; этот общий вывод не устанавливает фактов об учебном примере, его результате или локальном счётчике доступа.",
      },
    });

    const localizedRecords = [
      contract.objective,
      contract.worked_inputs,
      ...contract.formula.symbols,
      contract.history.llm_evolution.limitation,
      contract.history.llm_evolution.later_advance,
      contract.history.llm_evolution.modern_llm_role,
      ...contract.history.llm_evolution.sources.map(
        ({ claim }: { claim: Record<string, string> }) => claim,
      ),
      contract.history.approach,
      contract.history.summary,
      contract.visualization.rationale,
      contract.decoder_connection,
    ];
    for (const localized of localizedRecords) {
      expect(Object.keys(localized).filter((key) => key !== "symbol")).toEqual([
        "en",
        "ru",
      ]);
    }
    expect(contract.terminology).toEqual([
      {
        concept_id: "end-to-end-llm",
        en: "end-to-end LLM",
        ru: "полный цикл работы LLM",
      },
      {
        concept_id: "training-only-tokenizer",
        en: "training-only tokenizer",
        ru: "токенизатор, обученный только на обучающей выборке",
      },
      {
        concept_id: "validation-selected-state",
        en: "validation-selected state",
        ru: "состояние, выбранное по валидации",
      },
      {
        concept_id: "one-time-final-evaluation",
        en: "local single-use final evaluation",
        ru: "локальная однократная итоговая оценка",
      },
      {
        concept_id: "overlapping-window-target-slot",
        en: "overlapping window-target slot",
        ru: "целевая позиция перекрывающегося окна",
      },
      {
        concept_id: "window-slot-mean-nll",
        en: "window-slot mean NLL",
        ru: "среднее NLL по целевым позициям окон",
      },
      {
        concept_id: "window-slot-perplexity",
        en: "window-slot perplexity",
        ru: "перплексия по целевым позициям окон",
      },
      {
        concept_id: "within-document-transition-occurrence",
        en: "within-document transition occurrence",
        ru: "переход внутри документа в заданной позиции",
      },
      {
        concept_id: "decoder-context-capacity",
        en: "decoder context capacity",
        ru: "максимальная длина контекста декодера",
      },
      {
        concept_id: "fixed-fixture-regression-evidence",
        en: "fixed-fixture regression evidence",
        ru: "результат фиксированного примера для регрессионной проверки",
      },
      {
        concept_id: "frozen-bigram-baseline",
        en: "frozen bigram baseline",
        ru: "зафиксированная биграммная базовая модель",
      },
      {
        concept_id: "bitwise-replay",
        en: "bitwise deterministic replay",
        ru: "побитовая воспроизводимость повторного запуска",
      },
      {
        concept_id: "cached-continuation",
        en: "cached continuation",
        ru: "продолжение с KV-кэшем",
      },
    ]);

    expect(lessons.en).toMatchObject({
      chapter_id: contract.chapter_id,
      locale: "en",
      content_revision: 9,
      order: contract.order,
      concept_id: contract.concept_id,
      title: "Run the whole tiny LLM",
      description:
        "Trace a tiny decoder-only language model in Rust through validation-selected training, a fixed-fixture comparison over overlapping window-target slots, exact reload, and KV-cached generation. Distinguish that comparison from the unreported policy that would score 442 within-document transitions once each with the longest causal prefix capped at four tokens and only its newest-position distribution; numeric NLL and PPL are not reported for that policy.",
    });
    expect(lessons.ru).toMatchObject({
      chapter_id: contract.chapter_id,
      locale: "ru",
      content_revision: 9,
      order: contract.order,
      concept_id: contract.concept_id,
      title: "Запустите небольшую LLM целиком",
      description:
        "Проследите полный цикл небольшой декодерной языковой модели на Rust: обучение с выбором по валидации, сравнение по целевым позициям перекрывающихся окон, точное восстановление и генерацию с KV-кэшем. Отдельное правило оценивало бы каждый из 442 переходов внутри документов один раз, использовало бы максимально доступный каузальный префикс не длиннее четырёх токенов и только распределение в последней позиции; числовые значения среднего NLL и перплексии по этому правилу не приводятся.",
    });

    for (const locale of ["en", "ru"] as const) {
      const lesson = lessons[locale];
      const source = lessonSources[locale];
      const localized = (value: Record<"en" | "ru", string>) => value[locale];

      expect(lesson).toMatchObject({
        objective: localized(contract.objective),
        worked_inputs: localized(contract.worked_inputs),
        decoder_connection: localized(contract.decoder_connection),
      });
      expect(lesson.formula).toEqual({
        latex: contract.formula.latex,
        symbols: contract.formula.symbols.map(
          ({ symbol, en, ru }: { symbol: string; en: string; ru: string }) => ({
            symbol,
            meaning: locale === "en" ? en : ru,
          }),
        ),
      });
      expect(lesson.history).toEqual({
        llm_evolution: {
          predecessor_kind: contract.history.llm_evolution.predecessor_kind,
          limitation: localized(contract.history.llm_evolution.limitation),
          later_advance: localized(
            contract.history.llm_evolution.later_advance,
          ),
          modern_llm_role: localized(
            contract.history.llm_evolution.modern_llm_role,
          ),
          sources: contract.history.llm_evolution.sources.map(
            (historySource: {
              role: string;
              year: number;
              name: string;
              source_url: string;
              claim: Record<"en" | "ru", string>;
            }) => ({
              ...historySource,
              claim: historySource.claim[locale],
            }),
          ),
        },
        approach: localized(contract.history.approach),
        summary: localized(contract.history.summary),
        rust_source: "rust/demos/ch39-end-to-end-llm/src/lib.rs",
      });
      expect(lesson.visualization).toEqual({
        decision: contract.visualization.decision,
        id: contract.visualization.id,
        rationale: localized(contract.visualization.rationale),
      });
      expect([
        ...new Set(
          lesson.rust_sources.map(({ path }: { path: string }) => path),
        ),
      ]).toEqual(contract.rust.sources);
      expect(
        lesson.rust_sources.map(
          ({ path, region }: { path: string; region?: string }) => ({
            path,
            ...(region ? { region } : {}),
          }),
        ),
      ).toEqual([
        {
          path: "rust/crates/llm-from-scratch/src/pipeline.rs",
          region: "end-to-end-capstone",
        },
        {
          path: "rust/demos/ch39-end-to-end-llm/src/lib.rs",
          region: "historical-contrast",
        },
        {
          path: "rust/demos/ch39-end-to-end-llm/src/lib.rs",
          region: "capstone-evidence",
        },
        { path: "rust/demos/ch39-end-to-end-llm/src/main.rs" },
      ]);

      expect(source.match(/chapter-section:/g)).toHaveLength(8);
      expect(source.match(/<RustSource\b/g)).toHaveLength(4);
      expect(source.match(/<EndToEndLlmDiagram\b/g)).toHaveLength(1);
      expect(source).toContain("<EndToEndLlmDiagram labels={diagramLabels} />");

      const lessonBody = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
      const normalizedBody = lessonBody.replace(/\s+/g, " ");
      for (const historySource of lesson.history.llm_evolution.sources) {
        expect(lessonBody).toContain(historySource.source_url);
        expect(normalizedBody).toContain(historySource.claim);
      }
      expect(lessonBody).not.toMatch(
        /build instructions|authoring contract|test requirements|framework constraints|deployment constraints|presentation implementation/i,
      );
      expect(source).not.toMatch(/Ã|â|�|Ð|Ñ/);
    }

    expect(
      existsSync(
        resolve(
          repositoryRoot,
          "site/src/content/chapters/ru/39-end-to-end-llm.mdx",
        ),
      ),
    ).toBe(true);
  });

  it("keeps evaluation, checkpoint snapshot, loaded move, and probe order explicit", () => {
    const capstoneSource = pipelineSource.match(
      /\/\/ region:end-to-end-capstone([\s\S]*?)\/\/ endregion:end-to-end-capstone/,
    )?.[1];
    expect(capstoneSource).toBeDefined();
    expect(capstoneSource).toMatch(
      /SelectedDecoder::new\([\s\S]*?primary\.selected_state\(\),[\s\S]*?primary\.selected_model\(\),/,
    );
    const evaluationIndex = capstoneSource!.indexOf("evaluator.evaluate_once(");
    const checkpointIndex = capstoneSource!.indexOf(
      "Checkpoint::from_snapshot(",
    );
    const intoModelIndex = capstoneSource!.indexOf("loaded.into_model()");
    const probeIndex = capstoneSource!.indexOf(
      "logits_bits(primary.selected_model(), &logit_probe_ids)",
    );
    expect(evaluationIndex).toBeGreaterThan(-1);
    expect(checkpointIndex).toBeGreaterThan(evaluationIndex);
    expect(capstoneSource).toContain("primary.selected_state(),");
    for (const metadata of [
      "loaded.tokenizer().restore_bpe()",
      "loaded.selected_step()",
      "loaded.optimizer_state()",
      "loaded.sampling_rng_state()",
    ]) {
      const metadataIndex = capstoneSource!.indexOf(metadata);
      expect(metadataIndex).toBeGreaterThan(checkpointIndex);
      expect(intoModelIndex).toBeGreaterThan(metadataIndex);
    }
    expect(probeIndex).toBeGreaterThan(intoModelIndex);
    expect(capstoneSource).not.toMatch(
      /DecoderModelState::capture|restore_model|restore_independent_model|\.restore\(\)/,
    );
    const firstTrainingIndex = capstoneSource!.indexOf(
      "let primary = training_once(&prepared, config)?;",
    );
    const replayTrainingIndex = capstoneSource!.indexOf(
      "let replay = training_once(&prepared, config)?;",
    );
    const selectedStateIndex = capstoneSource!.indexOf(
      "primary.selected_state(),",
    );
    const testEpochIndex = capstoneSource!.indexOf("let test_epoch = epoch(");
    expect(firstTrainingIndex).toBeGreaterThan(-1);
    expect(replayTrainingIndex).toBeGreaterThan(firstTrainingIndex);
    expect(selectedStateIndex).toBeGreaterThan(replayTrainingIndex);
    expect(testEpochIndex).toBeGreaterThan(selectedStateIndex);
    expect(evaluationIndex).toBeGreaterThan(testEpochIndex);
    expect(pipelineSource).toContain(
      "The checked capstone also retains its decoder-lower score as a fixed-fixture",
    );
    expect(pipelineSource).toContain(
      "it is not a generic evaluator requirement, an independent estimate",
    );
    expect(capstoneSource).toContain(
      '"fixed capstone fixture no longer records lower decoder loss than its frozen bigram"',
    );
    expect(demoSource).toContain(
      "fn records_the_fixed_fixture_loss_order_after_one_local_test_access()",
    );
    expect(demoSource).toMatch(
      /"evidence=scope:\{\} within_run_selection_isolated:\{\} independent_generalization_estimate:\{\} architecture_superiority_evidence:\{\}",\s*FIXED_FIXTURE_EVIDENCE_SCOPE,\s*within_run_selection_isolated\(evidence\),\s*INDEPENDENT_GENERALIZATION_ESTIMATE,\s*ARCHITECTURE_SUPERIORITY_EVIDENCE,/,
    );
    const normalizedEnglishLesson = englishLessonSource.replace(/\s+/g, " ");
    expect(normalizedEnglishLesson).toContain(
      "The lower decoder slot mean-NLL ordering is retained across later executions, so it is useful regression evidence. It is not an untouched independent estimate of generalization or evidence of architecture-wide decoder superiority.",
    );
    expect(normalizedEnglishLesson).toContain(
      "The mean-NLL gap retained by later executions is fixed-fixture regression evidence, not causal attribution to context or attention and not an independent generalization estimate.",
    );
    expect(normalizedEnglishLesson).toContain(
      "this general warning does not establish any fact about the capstone fixture, its score, or its local access count",
    );
    expect(normalizedEnglishLesson).toContain(
      "What is the measured slot mean-NLL gap, how is window-slot perplexity related to each model's slot mean NLL, and what evidence scope does the ordering have?",
    );
    expect(normalizedEnglishLesson).not.toMatch(
      /measured slot mean-NLL gap, how is window-slot perplexity related to (?:it|the (?:mean-NLL )?gap)/i,
    );
    expect(normalizedEnglishLesson).not.toMatch(
      /course(?:'s)? first and only final test|previously unscored test|proves? (?:independent )?generalization|shows? (?:that )?decoder architectures? (?:always|universally) (?:beat|outperform)/i,
    );
    const normalizedRussianLesson = russianLessonSource.replace(/\s+/g, " ");
    expect(normalizedRussianLesson).toContain(
      "Порядок результатов сохраняется в последующих запусках, поэтому он полезен для регрессионной проверки. Это не независимая оценка способности модели обобщать на ранее не использованных данных и не доказательство общего превосходства архитектуры декодера.",
    );
    expect(normalizedRussianLesson).toContain(
      "Разницу средних NLL, сохраняемую при последующих запусках, используют для регрессионной проверки фиксированного примера; она не доказывает причинного влияния контекста или внимания и не является независимой оценкой способности модели обобщать.",
    );
    expect(normalizedRussianLesson).toContain(
      "этот общий вывод не устанавливает фактов об учебном примере, его результате или локальном счётчике доступа",
    );
    expect(normalizedRussianLesson).toContain(
      "Чему равна измеренная разница средних NLL по позициям окон, как перплексия связана со средним NLL каждой модели и какова область применимости этого порядка результатов?",
    );
    expect(normalizedRussianLesson).not.toMatch(
      /измеренная разница средних NLL[^?]*как с ней связана перплексия/i,
    );
    expect(normalizedRussianLesson).not.toMatch(/фикстур/i);
  });

  it("moves final-use containers after retaining their report evidence", () => {
    const capstoneSource = pipelineSource.match(
      /\/\/ region:end-to-end-capstone([\s\S]*?)\/\/ endregion:end-to-end-capstone/,
    )?.[1];
    expect(capstoneSource).toBeDefined();

    const testEpochIndex = capstoneSource!.indexOf("let test_epoch = epoch(");
    const testWindowCountIndex = capstoneSource!.indexOf(
      "let test_window_count = test_epoch.window_count();",
    );
    const testBatchCountIndex = capstoneSource!.indexOf(
      "let test_batch_count = test_epoch.batch_count();",
    );
    const evaluatorIndex = capstoneSource!.indexOf("FinalEvaluator::new(");
    expect(testEpochIndex).toBeGreaterThan(-1);
    expect(testWindowCountIndex).toBeGreaterThan(testEpochIndex);
    expect(testBatchCountIndex).toBeGreaterThan(testWindowCountIndex);
    expect(evaluatorIndex).toBeGreaterThan(testBatchCountIndex);
    expect(capstoneSource).toMatch(
      /FinalEvaluator::new\(\s*test_epoch,\s*provenance\.clone\(\)\s*,?\s*\)/,
    );
    expect(capstoneSource).not.toContain("test_epoch.clone()");
    expect(capstoneSource).toContain("test_window_count,");
    expect(capstoneSource).toContain("test_batch_count,");

    expect(capstoneSource).toContain(
      "parameter_count: primary.selected_state().scalar_count(),",
    );
    expect(capstoneSource).not.toContain("DecoderModel::new(");

    const generationSource = pipelineSource.match(
      /fn generation_evidence\([\s\S]*?\n}\n\n\/\/\/ Runs data partitioning/,
    )?.[0];
    expect(generationSource).toBeDefined();
    const cachedIndex = generationSource!.indexOf("generate_cached(");
    const uncachedIndex = generationSource!.indexOf("generate_uncached(");
    const promptMoveIndex = generationSource!.indexOf("        prompt_ids,\n");
    expect(cachedIndex).toBeGreaterThan(-1);
    expect(uncachedIndex).toBeGreaterThan(cachedIndex);
    expect(promptMoveIndex).toBeGreaterThan(uncachedIndex);
    expect(generationSource).not.toContain("prompt_ids.clone()");
  });

  it("derives both denominators from one inspected slot stream and tests their exact fixture", () => {
    const evaluation = evaluationSource.replace(/\s+/g, " ");
    const pipeline = pipelineSource.replace(/\s+/g, " ");
    const demo = demoSource.replace(/\s+/g, " ");

    expect(evaluationSource).toContain(
      "pub const FINAL_EVALUATION_REPORT_VERSION: u32 = 1;",
    );
    expect(evaluation).toContain(
      "for (slot, (&input, &target)) in inputs.iter().zip(targets).enumerate()",
    );
    expect(evaluation).toContain("window_target_slot_count += 1;");
    expect(evaluation).toContain(
      "let absolute_target_position = origin.start() + slot + 1;",
    );
    expect(evaluation).toContain(
      ".entry((origin.document_id().to_owned(), absolute_target_position)) .or_default() += 1;",
    );
    expect(evaluation).toContain(
      "let document_transition_occurrence_count = transition_multiplicities.len();",
    );
    expect(evaluation).toContain(
      "transition_multiplicity_counts[multiplicity - 1] += 1;",
    );
    expect(evaluation).toContain(
      "window_target_slot_count, transition_multiplicity_counts .iter() .enumerate() .map(|(index, count)| (index + 1) * count) .sum::<usize>()",
    );
    expect(evaluation).toContain(
      "let measured = evaluate_no_grad(model, inspected.epoch())?;",
    );
    expect(evaluation).toContain("for pair in inspected.checked_pairs()");
    expect(evaluation).toContain(
      "inspected.evidence().window_target_slot_count != measured.token_count() || inspected.evidence().window_target_slot_count != bigram_score.target_count()",
    );
    expect(evaluation).toContain(
      "measured.mean_loss(), measured.mean_loss().exp(),",
    );
    expect(evaluation).toContain("metrics.mean_nll(), metrics.perplexity(),");
    expect(evaluation).toContain(
      "fn alignment_guard_rejects_length_drift_before_zip_can_truncate()",
    );
    expect(evaluation).toContain(
      "fn evidence_fingerprint_covers_ordered_origins_inputs_and_targets()",
    );
    expect(evaluation).toContain(
      "assert_eq!(first_evidence.window_target_slot_count, 14);",
    );
    expect(evaluation).toContain(
      "assert_eq!(first_evidence.document_transition_occurrence_count, 9);",
    );
    expect(evaluation).toContain(
      "assert_eq!(first_evidence.transition_multiplicity_counts, [4, 5]);",
    );

    expect(pipeline).toContain(
      "let expected_window_target_slots = test_window_count .checked_mul(config.context_length())",
    );
    expect(pipeline).toContain(
      ".map(|document| document.token_ids().len().saturating_sub(1)) .sum::<usize>();",
    );
    expect(pipeline).toContain(
      ".map(|(index, count)| (index + 1) * count) .sum::<usize>();",
    );
    expect(pipeline).toContain(
      "multiplicity_transition_count == expected_document_transition_occurrences",
    );

    expect(demo).toContain(
      "fn generated_stdout_and_trace_match_the_frozen_files_byte_for_byte()",
    );
    expect(demo).toContain(
      "assert_eq!(report.window_target_slot_count(), 1_744);",
    );
    expect(demo).toContain(
      "assert_eq!(report.document_transition_occurrence_count(), 442);",
    );
    expect(demo).toContain(
      "assert_eq!(report.transition_multiplicity_counts(), [4, 4, 4, 430]);",
    );
    expect(demo).toContain(
      'assert_eq!(report.window_slot_fingerprint(), "fnv1a64:77b836869f848986");',
    );
    expect(demo).toContain(
      "report.decoder().perplexity().to_bits(), report.decoder().mean_nll().exp().to_bits()",
    );
    expect(demo).toContain(
      "report.bigram().perplexity().to_bits(), report.bigram().mean_nll().exp().to_bits()",
    );
    expect(demo).toContain(
      "assert_eq!(contrast.decoder_window_slot_context_lengths, [1, 2, 3, 4]);",
    );
  });

  it("keeps the contract report and raw diagram trace on the same Rust evidence", () => {
    const contract = frontmatter(contractSource);
    const trace = parseEndToEndLlmTrace(fixture);
    const reportLines = expectedOutput.trimEnd().split(/\r?\n/);
    const [initial, selected] = trace.selection;

    expect(contract.rust.expected_output).toBe(expectedOutput);
    expect(component).toContain(
      "../../../../rust/demos/ch39-end-to-end-llm/diagram-trace.txt?raw",
    );
    expect(component).toContain("parseEndToEndLlmTrace(traceSource)");
    expect(reportLines[0]).toBe("chapter=39-end-to-end-llm");
    expect(reportLines.slice(1, -1)).toEqual([
      `data=checksum:${trace.data.checksum} split:${trace.data.split} documents:${trace.data.train}/${trace.data.validation}/${trace.data.test} train_ids:[${trace.data.train_ids.join(",")}] validation_ids:[${trace.data.validation_ids.join(",")}] test_ids:[${trace.data.test_ids.join(",")}]`,
      `tokenizer=layout:${trace.tokenizer.layout} requested:${trace.tokenizer.requested} learned:${trace.tokenizer.learned} training_only:${trace.tokenizer.training_only} vocabulary:${trace.tokenizer.vocabulary} encoded_tokens:[${trace.tokenizer.encoded.join(",")}]`,
      `model=layers:${trace.model.layers} heads:${trace.model.heads} width:${trace.model.width} feed_forward:${trace.model.feed_forward} context:${trace.batches.context} parameters:${trace.model.parameters} update_batch_size:${trace.batches.update_batch_size} evaluation_batch_size:${trace.batches.evaluation_batch_size} windows:[${trace.batches.windows.join(",")}] evaluation_batches:[${trace.batches.evaluation_batches.join(",")}]`,
      `training=updates:${trace.training.updates} seed:${trace.training.seed} checkpoints:${initial.step}:${initial.train}/${initial.validation}/candidate;${selected.step}:${selected.train}/${selected.validation}/selected selected:${selected.step} validation:${selected.validation} optimizer:${trace.checkpoint.optimizer} replay_bitwise:${trace.training.replay_bitwise}`,
      `test=access:${trace.test.access} documents:[${trace.test.documents.join(",")}] stride:${trace.test.stride} windows:${trace.test.windows} batches:${trace.test.batches} window_target_slots:${trace.test.window_target_slots} document_transition_occurrences:${trace.test.document_transition_occurrences} transition_multiplicity_counts:[${trace.test.transition_multiplicity_counts}] window_slot_fingerprint:${trace.test.window_slot_fingerprint} no_grad:${trace.test.no_grad} unchanged:${trace.test.unchanged}`,
      `slot_metric=unit:${trace.slotMetric.unit} decoder_window_slot_mean_nll_nats:${trace.slotMetric.decoder_window_slot_mean_nll_nats} decoder_window_slot_perplexity:${trace.slotMetric.decoder_window_slot_perplexity} bigram_window_slot_mean_nll_nats:${trace.slotMetric.bigram_window_slot_mean_nll_nats} bigram_window_slot_perplexity:${trace.slotMetric.bigram_window_slot_perplexity} window_slot_gap_nats:${trace.slotMetric.window_slot_gap_nats} comparison_slot_set:${trace.slotMetric.comparison_slot_set} decoder_lower_on_fixture:${trace.slotMetric.decoder_lower_on_fixture}`,
      `transition_metric=unit:${trace.transitionMetric.unit} count:${trace.transitionMetric.count} context_policy:${trace.transitionMetric.context_policy} newest_position_only:${trace.transitionMetric.newest_position_only} reported:${trace.transitionMetric.reported} mean_nll:${trace.transitionMetric.mean_nll} perplexity:${trace.transitionMetric.perplexity}`,
      `evidence=scope:${trace.evidence.scope} within_run_selection_isolated:${trace.evidence.within_run_selection_isolated} independent_generalization_estimate:${trace.evidence.independent_generalization_estimate} architecture_superiority_evidence:${trace.evidence.architecture_superiority_evidence}`,
      `checkpoint=bytes:${trace.checkpoint.bytes} header:${trace.checkpoint.header} records:${trace.checkpoint.records} checksum:${trace.checkpoint.checksum} selected:${trace.checkpoint.selected} optimizer:${trace.checkpoint.optimizer} rng:${trace.checkpoint.rng} bytes_roundtrip:${trace.checkpoint.bytes_roundtrip} model_bits_exact:${trace.checkpoint.model_bits_exact} optimizer_bits_exact:${trace.checkpoint.optimizer_bits_exact} tokenizer_exact:${trace.checkpoint.tokenizer_exact} logit_probe:${trace.checkpoint.logit_probe} logit_probe_ids:[${trace.checkpoint.logit_probe_ids.join(",")}] prompt_logits_bitwise:${trace.checkpoint.prompt_logits_bitwise}`,
      `generation=prompt:${trace.generation.prompt} prompt_ids:[${trace.generation.prompt_ids.join(",")}] temperature:${trace.generation.temperature} top_k:${trace.generation.top_k} seed:${trace.generation.seed} generated:[${trace.generation.generated.join(",")}] text:${JSON.stringify(trace.generation.text)} prefixes:[${trace.generation.prefixes.join(",")}] stop:${trace.generation.stop} prefill:${trace.generation.prefill} decode:${trace.generation.decode} final_cache:${trace.generation.final_cache} cached_scores:${trace.generation.cached_scores} calculated_complete_prefix_scores:${trace.generation.calculated_complete_prefix_scores} rng_initial:${trace.generation.rng_initial} rng_final:${trace.generation.rng_final} tokens_exact:${trace.generation.tokens_exact} decisions_bitwise:${trace.generation.decisions_bitwise} rng_exact:${trace.generation.rng_exact}`,
      `history=window_slot_unit:${trace.history.window_slot_unit} window_target_slots:${trace.history.window_target_slots} document_transition_occurrences:${trace.history.document_transition_occurrences} bigram_context_tokens:${trace.history.bigram_context_tokens} decoder_context_capacity:${trace.history.decoder_context_capacity} decoder_window_slot_context_lengths:[${trace.history.decoder_window_slot_context_lengths}] bigram_window_slot_mean_nll_nats:${trace.history.bigram_window_slot_mean_nll_nats} decoder_window_slot_mean_nll_nats:${trace.history.decoder_window_slot_mean_nll_nats} window_slot_gap_nats:${trace.history.window_slot_gap_nats}`,
    ]);
    expect(reportLines.at(-1)).toBe(
      "next=inspect, modify, test, and extend the complete decoder",
    );
    expect(fixture).toMatch(/END\|next=student-owned-decoder\r?\n$/);
    expect(fixture).toContain(
      "SLOT_METRIC|unit=overlapping-window-target-slot|decoder_window_slot_mean_nll_nats=3.866087547|decoder_window_slot_perplexity=47.755180205|bigram_window_slot_mean_nll_nats=3.981342714|bigram_window_slot_perplexity=53.588940583|window_slot_gap_nats=0.115255167|comparison_slot_set=shared-ordered-window-slots|decoder_lower_on_fixture=true",
    );
    expect(fixture).toContain(
      "TRANSITION_METRIC|unit=within-document-next-token-transition|count=442|context_policy=longest-available-causal-prefix-up-to-4|newest_position_only=true|reported=false|mean_nll=not-reported|perplexity=not-reported",
    );
    expect(fixture).toContain(
      "EVIDENCE|scope=fixed-fixture-regression|within_run_selection_isolated=true|independent_generalization_estimate=false|architecture_superiority_evidence=false",
    );
    for (const source of [expectedOutput, fixture, component, parserSource]) {
      expect(source).not.toMatch(
        /(?:\btargets\b|\bfingerprint\b|\bdecoder\b|\bbigram\b|\bgap\b)[:=](?=\d|fnv1a64)/,
      );
    }
    for (const [name, source] of [
      ["expected output", expectedOutput],
      ["diagram trace", fixture],
      ["component", component],
      ["parser", parserSource],
      ["demo", demoSource],
      ["main", mainSource],
      ["English lesson", englishLessonSource],
      ["Russian lesson", russianLessonSource.replace("`decoder_wins`", "")],
      ["contract", contractSource.replace("`decoder_wins`", "")],
      ["pipeline", pipelineSource],
    ] as const) {
      expect(
        source,
        `${name} retains stale architecture-win fields`,
      ).not.toMatch(/\b(?:decoder_wins|decoder_beats_bigram)\b/);
    }
    expect(contractSource.match(/\bdecoder_wins\b/g)).toHaveLength(1);
    expect(russianLessonSource.match(/\bdecoder_wins\b/g)).toHaveLength(1);
    expect(contractSource.replace(/\s+/g, " ")).toContain(
      "The stale token `decoder_wins` is not current evidence.",
    );
    expect(russianLessonSource.replace(/\s+/g, " ")).toContain(
      "Прежнее имя `decoder_wins` не является актуальным свидетельством.",
    );
  });

  it("renders shared formulas and localized diagram accessibility copy explicitly", () => {
    const contract = frontmatter(contractSource);
    const lessonSources = {
      en: englishLessonSource,
      ru: russianLessonSource,
    };
    const accessibleDiagramText = {
      en: [
        'title: "Keep execution one-way and label fixture evidence"',
        'description: "Follow frozen Rust evidence through training-only BPE, selection, and a locally isolated comparison over 1,744 overlapping window-target slots. A separate unreported metric would score 442 within-document transition occurrences once each with the longest available causal prefix capped at four tokens and only its newest-position distribution; its numeric mean NLL and PPL are not reported. Then follow exact reload and cached generation."',
        'test: "Score the fixed fixture locally"',
        'oneTime: "one local access in this execution"',
        'decodedText: "Cyrillic т followed by two generated spaces"',
        'spaceMarker: "Each ␠ marks one generated space."',
        'windows: "Overlapping stride-one window counts — train / validation / test"',
        'evaluationBatches: "Evaluation mini-batch counts — train / validation / test"',
        'windowSlots: "Overlapping window-target slots"',
        'distinctTransitions: "Within-document transition occurrences"',
        'transitionMultiplicity: "Transition occurrence multiplicities — 1× / 2× / 3× / 4×"',
        'decoderSlotMeanNll: "Decoder mean NLL — nats per slot"',
        'decoderSlotPerplexity: "Decoder window-slot perplexity — dimensionless"',
        'bigramSlotMeanNll: "Bigram mean NLL — nats per slot"',
        'bigramSlotPerplexity: "Bigram window-slot perplexity — dimensionless"',
        'slotGap: "Fixed-fixture mean-NLL gap — nats per slot"',
        'transitionMetric: "Once per transition — longest causal prefix capped at four tokens; newest position only"',
        'decoderContextCapacity: "Decoder context capacity"',
        'decoderSlotContextLengths: "Actual decoder slot context lengths"',
        'sharedSlots: "both models score the same ordered slots, including repetitions"',
        'transitionMetricNotReported: "442 within-document occurrences once each; longest causal prefix capped at four tokens; newest position only; numeric mean NLL and PPL not reported"',
        'logitProbeText: "Reload probe text"',
        'logitProbeTokenIds: "Token IDs encoding the reload probe"',
        'retainedPrefixLengths: "Retained prefix lengths in tokens before successive token choices"',
        'cachePrefillPromptTokens: "Prompt tokens processed during cache prefill"',
        'oneTokenDecodeInputTokens: "Earlier generated tokens processed one at a time by decode calls to obtain later logits"',
        'cachedAttentionScoreCells: "Cached attention-score cells"',
        'completePrefixAttentionScoreCells: "Calculated complete-prefix attention-score cells"',
        'pipeline: "Numbers give executable order. The test stage reports the equal-slot comparison. It also marks the separate 442-transition policy—longest causal prefix capped at four tokens, newest-position distribution only—and states that its numeric mean NLL and PPL are not reported. Double borders mark training-only input, validation selection, locally isolated fixed-fixture evaluation, and exact replay boundaries."',
      ],
      ru: [
        'title: "Сохраните односторонний порядок запуска и обозначьте статус результата"',
        'description: "Проследите зафиксированные результаты программы на Rust: обучение BPE только по обучающим данным, выбор состояния и локально изолированное сравнение по 1744 целевым позициям перекрывающихся окон. Отдельное правило оценивало бы 442 перехода внутри документов по одному разу, использовало бы максимально доступный каузальный префикс не длиннее четырёх токенов и только распределение в последней позиции; числовые значения среднего NLL и перплексии по этому правилу не приводятся. Затем проследите точное восстановление и генерацию с кэшем."',
        'test: "Локально оцените фиксированный пример"',
        'oneTime: "один локальный доступ в этом запуске"',
        'decodedText: "кириллическая т и два сгенерированных пробела"',
        'spaceMarker: "␠ — сгенерированный пробел."',
        'encodedTokens: "Число токенов после кодирования — обучение / валидация / тест"',
        'windows: "Число перекрывающихся окон с шагом 1 — обучение / валидация / тест"',
        'evaluationBatches: "Число мини-пакетов оценки — обучение / валидация / тест"',
        'windowSlots: "Целевые позиции перекрывающихся окон"',
        'distinctTransitions: "Переходы внутри документов в заданных позициях"',
        'transitionMultiplicity: "Число переходов с кратностью 1× / 2× / 3× / 4×"',
        'decoderSlotMeanNll: "Среднее NLL декодера, в натах на позицию окна"',
        'decoderSlotPerplexity: "Безразмерная перплексия декодера по позициям окон"',
        'bigramSlotMeanNll: "Среднее NLL биграммной модели, в натах на позицию окна"',
        'bigramSlotPerplexity: "Безразмерная перплексия биграммной модели по позициям окон"',
        'slotGap: "Разница средних NLL, в натах на позицию окна"',
        'transitionMetric: "Каждый переход один раз — максимально доступный каузальный префикс не длиннее четырёх токенов; только последняя позиция"',
        'decoderContextCapacity: "Максимальная длина контекста декодера"',
        'decoderSlotContextLengths: "Фактические длины контекста в позициях окон"',
        'sharedSlots: "обе модели оценивают один и тот же упорядоченный набор позиций, включая повторы"',
        'transitionMetricNotReported: "442 перехода внутри документов по одному разу; максимально доступный каузальный префикс не длиннее четырёх токенов; только последняя позиция; числовые значения среднего NLL и перплексии по этому правилу не приводятся"',
        'logitProbeText: "Текст пробы для проверки логитов после восстановления"',
        'logitProbeTokenIds: "ID токенов, которыми закодирована проба"',
        'retainedPrefixLengths: "Длины сохранённых префиксов перед каждым выбором токена (в токенах)"',
        'cachePrefillPromptTokens: "Число токенов промпта, обработанных при заполнении KV-кэша"',
        'oneTokenDecodeInputTokens: "Число ранее сгенерированных токенов, которые по одному подаются декодеру для вычисления следующих логитов"',
        'cachedAttentionScoreCells: "Число элементов матриц оценок внимания при работе с KV-кэшем"',
        'completePrefixAttentionScoreCells: "Число элементов матриц оценок внимания при эталонном расчёте по полному префиксу"',
        'cachedMatch: "решения с KV-кэшем и полным префиксом совпадают"',
        'pipeline: "Номера задают порядок. На этапе тестирования показано сравнение по одним и тем же позициям окон. Отдельно обозначено правило для 442 переходов: каждый оценивается один раз, используется максимально доступный каузальный префикс не длиннее четырёх токенов и только распределение в последней позиции; числовые значения среднего NLL и перплексии по этому правилу не приводятся. Двойные рамки отмечают BPE только по обучающим данным, выбор по валидации, локально изолированную оценку фиксированного примера и точное воспроизведение."',
      ],
    };

    for (const locale of ["en", "ru"] as const) {
      const source = lessonSources[locale].replace(/\r\n/g, "\n");
      const body = source.replace(/^---\n[\s\S]*?\n---\n/, "");
      expect(body).toContain(`$$\n${contract.formula.latex}\n$$`);
      for (const formula of [
        "N_{\\mathrm{slot}}=W_{\\mathrm{test}}C=436\\cdot4=1744.",
        "4\\cdot1+4\\cdot2+4\\cdot3+430\\cdot4=1744.",
        "\\operatorname{PPL}_{\\mathrm{slot}}\n=\\exp\\!\\left(\\mathcal L_{\\mathrm{slot}}\\right).",
        "N_{\\mathrm{transition}}\n=\\sum_{d\\in\\mathcal D_{\\mathrm{test}}}\\left(\\lvert z^{(d)}\\rvert-1\\right)\n=444-2=442.",
        "\\mathcal L_{\\mathrm{slot}}\n=-\\frac{1}{N_{\\mathrm{slot}}}\n\\sum_{i=1}^{N_{\\mathrm{slot}}}\\log P_\\theta(z_i\\mid c_i).",
      ]) {
        expect(body).toContain(`$$\n${formula}\n$$`);
      }
      expect(body).not.toContain("N_{\\mathrm{test}}=W_{\\mathrm{test}}C");
      for (const formula of [
        "$C=4$",
        "$\\tau=0.8$",
        "$k=4$",
        "$1+2+3=6$",
        "$1^2+2^2+3^2=14$",
      ]) {
        expect(body).toContain(formula);
      }
      for (const localizedText of accessibleDiagramText[locale]) {
        expect(source).toContain(localizedText);
      }
      for (const group of [
        labels.sections,
        labels.stages,
        labels.fields,
        labels.cues,
        labels.captions,
      ]) {
        for (const key of Object.keys(group)) {
          expect(source).toMatch(new RegExp(`\\b${key}:\\s*"`));
        }
      }
    }

    expect(component).toContain("aria-labelledby={titleId}");
    expect(component).toContain("aria-describedby={descriptionId}");
    expect(component).toContain("aria-label={labels.cues.decodedText}");
    expect(component).toContain("{labels.cues.spaceMarker}");
    expect(component).toContain("trace.generation.text.replaceAll(' ', '␠')");
    expect(englishLessonSource).not.toContain(
      'encodedTokens: "Encoded tokens by partition"',
    );
    expect(englishLessonSource).not.toContain(
      'evaluationBatches: "Evaluation mini-batches by partition"',
    );
    expect(`${englishLessonSource}\n${contractSource}`).not.toMatch(
      /capped at four(?! tokens)/,
    );
    expect(russianLessonSource).not.toContain('windows: "Окна по выборкам"');
  });

  it("rejects literal Russian calques, authoring leakage, and mojibake", () => {
    const russianBody = russianLessonSource.replace(
      /^---\r?\n[\s\S]*?\r?\n---\r?\n/,
      "",
    );
    expect(russianBody).not.toMatch(
      /энд[- ]?ту[- ]?энд|пайплайн|валидационно[- ]выбранн|финальн\w* эвалюац|замороженн\w* биграм|побитов\w* репле|кэшированн\w* продолжен|рандомн\w* сид|полно[- ]префикс|чекпойнт|датасет/i,
    );
    expect(russianBody).not.toMatch(
      /инструкц\w* по сборк|авторск\w* контракт|требовани\w* тест|ограничени\w* фреймворк|ограничени\w* развёртыван|механик\w* презентац/i,
    );
    expect(englishLessonSource).not.toMatch(
      /TypeScript (?:validates|performs|computes)|refer(?:s|ring) to (?:the )?build instructions/i,
    );
    expect(englishLessonSource).not.toMatch(/Ã|â|�|Ð|Ñ/);
    expect(russianLessonSource).not.toMatch(/Ã|â|�|Ð|Ñ/);
  });
});
