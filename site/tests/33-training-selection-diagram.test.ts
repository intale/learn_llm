// @ts-ignore Node APIs are available in the Vitest runner.
import { createHash } from "node:crypto";
// @ts-ignore Node APIs are available in the Vitest runner.
import { readFileSync } from "node:fs";
// @ts-ignore Node APIs are available in the Vitest runner.
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  parseTrainingSelectionTrace,
  trainingSelectionPointPosition,
  validateTrainingSelectionDiagramLabels,
  type TrainingSelectionDiagramLabels,
} from "../src/lib/training-selection-diagram";

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), "..");
const read = (path: string) =>
  readFileSync(resolve(repositoryRoot, path), "utf8");
const fixture = read("rust/demos/ch33-training-selection/diagram-trace.txt");
const expectedOutput = read("rust/demos/ch33-training-selection/expected.txt");
const parserSource = read("site/src/lib/training-selection-diagram.ts");
const componentSource = read(
  "site/src/components/chapters/TrainingSelectionDiagram.astro",
);
const contractSource = read("curriculum/chapters/33-training-selection.md");
const lessonSource = read(
  "site/src/content/chapters/en/33-training-selection.mdx",
);
const russianLessonSource = read(
  "site/src/content/chapters/ru/33-training-selection.mdx",
);
const coursePlanSource = read("curriculum/course-plan.md");
const trainerSource = read(
  "rust/crates/llm-from-scratch/src/training/trainer.rs",
);
const adamwSource = read("rust/crates/llm-from-scratch/src/training/adamw.rs");
const tapeSource = read(
  "rust/crates/llm-from-scratch/src/autograd/tensor_core.rs",
);
const decoderSource = read(
  "rust/crates/llm-from-scratch/src/models/decoder.rs",
);
const demoSource = read("rust/demos/ch33-training-selection/src/lib.rs");
const traceRustSource = read(
  "rust/demos/ch33-training-selection/src/diagram_trace.rs",
);

function frontmatter(source: string) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error("missing JSON frontmatter");
  return JSON.parse(match[1]);
}

function diagramLabelsFromLesson(
  source: string,
): TrainingSelectionDiagramLabels {
  const match = source.match(/export const diagramLabels = (\{[\s\S]*?\n\});/);
  if (!match) throw new Error("missing diagramLabels object");
  return Function(
    `"use strict"; return (${match[1]});`,
  )() as TrainingSelectionDiagramLabels;
}

const labels: TrainingSelectionDiagramLabels = {
  title: "title",
  description: "description",
  sections: {
    order: "order",
    checkpoints: "checkpoints",
    proof: "proof",
  },
  operations: {
    forward: "forward",
    backward: "backward",
    finiteCheck: "finite check",
    clip: "clip",
    adamwStep: "AdamW step",
    zeroGrad: "zero gradient",
  },
  fields: {
    step: "step",
    trainLoss: "training loss",
    validationLoss: "validation loss",
    selected: "selected",
    learningRate: "learning rate",
    rawNorm: "raw norm",
    clippedNorm: "clipped norm",
  },
  cues: {
    trainMeasurement: "train measurement",
    validationMeasurement: "validation measurement",
    selectedState: "selected state",
    selectedCell: "selected",
    gapsUnobserved: "gaps unobserved",
    clipped: "clipped",
    notSelected: "not selected",
    testRejected: "test rejected",
    verified: "verified",
    parameterNodesPreserved: "parameter nodes preserved",
    gradientsCleared: "gradients cleared",
  },
  proofs: {
    selection: "selection",
    noGrad: "no grad",
    partitions: "partitions",
    optimization: "optimization",
  },
  captions: {
    order: "order caption",
    checkpoints: "checkpoint caption",
    proof: "proof caption",
  },
  scrollers: {
    checkpoints: "checkpoint scroller",
  },
};

describe("Chapter 33 Rust trace parser", () => {
  it("preserves the exact schedule, updates, measurements, and selection evidence", () => {
    const trace = parseTrainingSelectionTrace(fixture);
    expect(trace.config).toEqual({
      seed: "33",
      updates: "8",
      batch_size: "2",
      context: "2",
      validation_every: "2",
      clip_norm: "0.350000",
      runtime_limit_ms: "10000",
    });
    expect(trace.events).toEqual([
      "forward",
      "backward",
      "finite-check",
      "clip",
      "adamw-step",
      "zero-grad",
    ]);
    expect(trace.schedule).toEqual([
      { start: "1", end: "2", learning_rate: "0.040000" },
      { start: "3", end: "4", learning_rate: "0.025000" },
      { start: "5", end: "6", learning_rate: "0.015000" },
      { start: "7", end: "8", learning_rate: "0.008000" },
    ]);
    expect(trace.updates).toHaveLength(8);
    expect(trace.updates[0]).toMatchObject({
      step: "1",
      batch: "train-b@2,train-b@8",
      learning_rate: "0.040000",
      grad_norm_before: "4.051362",
      grad_norm_after: "0.350000",
      clipped: "true",
      finite: "true",
      nodes_preserved: "true",
      cleared: "true",
    });
    expect(trace.axis).toEqual({
      min: "1.300000",
      max: "2.100000",
      ticks: ["1.300000", "1.700000", "2.100000"],
    });
    expect(trace.checkpoints.map(({ step }) => step)).toEqual([
      "0",
      "2",
      "4",
      "6",
      "8",
    ]);
    expect(trace.checkpoints[4]).toEqual({
      step: "8",
      train_loss: "1.322897",
      validation_loss: "1.595297",
      selected: "true",
      train_graphs: "0",
      validation_graphs: "0",
    });
    expect(trace.selection).toEqual({
      step: "8",
      validation_loss: "1.595297",
      criterion: "validation-only",
      snapshot: "true",
      test_partition_rejected: "true",
    });
    expect(Object.values(trace.proof).every((value) => value === "true")).toBe(
      true,
    );
    expect(trace.proof).toMatchObject({
      parameter_nodes_preserved: "true",
      cleared_gradients: "true",
    });
    expect(trace).not.toHaveProperty("history");
  });

  it("derives plot coordinates only from the Rust-authored axis and update count", () => {
    const trace = parseTrainingSelectionTrace(fixture);
    expect(
      trainingSelectionPointPosition(
        "4",
        "1.700000",
        trace.axis,
        trace.config.updates,
      ),
    ).toEqual({ x: "50.000000%", y: "50.000000%" });
    expect(
      trainingSelectionPointPosition(
        "8",
        "1.595297",
        trace.axis,
        trace.config.updates,
      ),
    ).toEqual({ x: "100.000000%", y: "36.912125%" });
    expect(() =>
      trainingSelectionPointPosition(
        "9",
        "1.700000",
        trace.axis,
        trace.config.updates,
      ),
    ).toThrow(/point falls outside/);
  });

  it("rejects structural drift before accepting only the frozen Rust fixture", () => {
    const semanticMutations = [
      fixture.replace(
        "batch=train-b@2,train-b@8",
        "batch=validation-a@2,train-b@8",
      ),
      fixture.replace("validation_every=2", "validation_every=3"),
      fixture.replace("clipped=true|finite=true", "clipped=false|finite=true"),
      fixture.replace("nodes_preserved=true", "nodes_preserved=false"),
      fixture.replace(
        "parameter_nodes_preserved=true",
        "parameter_nodes_preserved=false",
      ),
      fixture.replace(
        "ticks=[1.300000,1.700000,2.100000]",
        "ticks=[1.300000,1.200000,2.100000]",
      ),
      fixture.replace(
        "step=6|train_loss=1.369832|validation_loss=1.642599|selected=false",
        "step=6|train_loss=1.369832|validation_loss=1.595297|selected=false",
      ),
    ];
    for (const changed of semanticMutations) {
      expect(() => parseTrainingSelectionTrace(changed)).toThrow(
        /invalid training-selection trace/,
      );
    }

    const lines = fixture.slice(0, -1).split("\n");
    for (const index of lines.keys()) {
      const changed = [...lines];
      changed[index] += " tampered=true";
      expect(() =>
        parseTrainingSelectionTrace(changed.join("\n") + "\n"),
      ).toThrow(/invalid training-selection trace/);
    }
    for (const changed of [
      fixture.slice(0, -1),
      fixture + "\n",
      fixture.replace(/\n/g, "\r\n"),
    ]) {
      expect(() => parseTrainingSelectionTrace(changed)).toThrow(
        /invalid training-selection trace/,
      );
    }
  });

  it("requires every localized label and rejects blank, missing, or extra leaves", () => {
    expect(() => validateTrainingSelectionDiagramLabels(labels)).not.toThrow();
    expect(() =>
      validateTrainingSelectionDiagramLabels({ ...labels, title: "" }),
    ).toThrow(/labels\.title/);
    expect(() =>
      validateTrainingSelectionDiagramLabels({
        ...labels,
        cues: { ...labels.cues, extra: "extra" },
      } as unknown as TrainingSelectionDiagramLabels),
    ).toThrow(/cues has unexpected keys/);
    const missing = {
      ...labels,
      operations: { ...labels.operations },
    } as unknown as Record<string, unknown>;
    delete (missing.operations as Record<string, unknown>).finiteCheck;
    expect(() =>
      validateTrainingSelectionDiagramLabels(
        missing as unknown as TrainingSelectionDiagramLabels,
      ),
    ).toThrow(/operations has unexpected keys/);
  });
});

describe("Chapter 33 static diagram and content boundary", () => {
  it("projects Rust-authored evidence without interpolation, hydration, or model arithmetic", () => {
    expect(componentSource).toContain(
      "../../../../rust/demos/ch33-training-selection/diagram-trace.txt?raw",
    );
    expect(componentSource).toContain(
      "parseTrainingSelectionTrace(traceSource)",
    );
    expect(componentSource).toContain(
      'data-visualization-id="training-validation-checkpoints"',
    );
    expect(componentSource).toContain('data-no-interpolation="true"');
    expect(componentSource).toContain('data-diagram-style="course-v1"');
    expect(componentSource).not.toMatch(/<script|client:|<dialog/i);
    expect(componentSource).not.toMatch(
      /<(?:svg|canvas|path|polyline|line)\b/i,
    );
    expect(componentSource).not.toMatch(
      /(?:softmax|matmul|backward|adamw)\s*\(/i,
    );
    expect(parserSource).not.toMatch(/(?:softmax|matmul|backward|adamw)\s*\(/i);
    expect(componentSource.match(/data-series="train"/g)).toHaveLength(2);
    expect(componentSource.match(/data-series="validation"/g)).toHaveLength(2);
    expect(componentSource).toContain("trainingSelectionPointPosition");
    expect(componentSource).toContain(
      "parameter_nodes_preserved={trace.proof.parameter_nodes_preserved}",
    );
    expect(componentSource).toContain(
      "cleared_gradients={trace.proof.cleared_gradients}",
    );
    expect(componentSource).toContain(
      'data-optimization-proof="parameter-nodes"',
    );
    expect(componentSource).toContain(
      'data-optimization-proof="gradients-cleared"',
    );
  });

  it("uses one semantic figure, one smallest named scroller, shared boxes, and non-color cues", () => {
    expect(componentSource.match(/<figure\b/g)).toHaveLength(1);
    expect(componentSource.match(/<figcaption\b/g)).toHaveLength(1);
    expect(componentSource.match(/data-diagram-scroll/g)).toHaveLength(1);
    expect(componentSource.match(/course-diagram__scroll/g)).toHaveLength(1);
    expect(componentSource.match(/role="region"/g)).toHaveLength(1);
    expect(componentSource.match(/tabindex="0"/g)).toHaveLength(2);
    expect(componentSource.match(/<article\b/g)).toHaveLength(6);
    expect(componentSource.match(/data-diagram-box/g)).toHaveLength(13);
    expect(componentSource).toContain("operationLabels.map");
    expect(componentSource.match(/data-diagram-table/g)).toHaveLength(1);
    expect(componentSource.match(/<caption>/g)).toHaveLength(1);
    expect(componentSource).toContain('scope="row"');
    expect(componentSource).toContain('scope="col"');
    expect(componentSource).toContain("text-decoration-style: double");
    expect(componentSource).toContain(
      "border-block-start: 1px dashed currentColor",
    );
    expect(componentSource).toContain("@media (forced-colors: active)");
    expect(componentSource).toContain("direction: ltr");
    expect(componentSource).toContain("unicode-bidi: isolate");
    expect(componentSource.match(/course-diagram__grid/g)).toHaveLength(4);
    expect(componentSource.match(/course-diagram__card-stack/g)).toHaveLength(
      13,
    );
    expect(componentSource).not.toMatch(/overflow-x\s*:/);
    expect(componentSource).not.toMatch(/overflow\s*:\s*(?:hidden|clip)/);
    expect(componentSource).not.toMatch(
      /(?:background|border-color|border-radius|outline)\s*:/,
    );
  });

  it("keeps the contract, lesson, Rust evidence, LLM history, formulas, and locale policy aligned", () => {
    const contract = frontmatter(contractSource);
    const lesson = frontmatter(lessonSource);
    const russianLesson = frontmatter(russianLessonSource);
    const englishDiagramLabels = diagramLabelsFromLesson(lessonSource);
    const russianDiagramLabels = diagramLabelsFromLesson(russianLessonSource);
    expect(contract.rust.expected_output).toBe(expectedOutput);
    expect(lesson.formula).toEqual({
      latex: contract.formula.latex,
      symbols: contract.formula.symbols.map(
        ({ symbol, en }: { symbol: string; en: string }) => ({
          symbol,
          meaning: en,
        }),
      ),
    });
    expect(lesson.objective).toBe(contract.objective.en);
    expect(lesson.worked_inputs).toBe(contract.worked_inputs.en);
    expect(lesson.decoder_connection).toBe(contract.decoder_connection.en);
    expect(lesson.history.approach).toBe(contract.history.approach.en);
    expect(lesson.history.summary).toBe(contract.history.summary.en);
    expect(lesson.history.llm_evolution).toEqual({
      predecessor_kind: contract.history.llm_evolution.predecessor_kind,
      limitation: contract.history.llm_evolution.limitation.en,
      later_advance: contract.history.llm_evolution.later_advance.en,
      modern_llm_role: contract.history.llm_evolution.modern_llm_role.en,
      sources: contract.history.llm_evolution.sources.map(
        (source: {
          role: string;
          year: number;
          name: string;
          source_url: string;
          claim: { en: string };
        }) => ({ ...source, claim: source.claim.en }),
      ),
    });
    expect(lesson.visualization).toEqual({
      decision: contract.visualization.decision,
      id: contract.visualization.id,
      rationale: contract.visualization.rationale.en,
    });
    expect(russianLesson.formula).toEqual({
      latex: contract.formula.latex,
      symbols: contract.formula.symbols.map(
        ({ symbol, ru }: { symbol: string; ru: string }) => ({
          symbol,
          meaning: ru,
        }),
      ),
    });
    expect(russianLesson.objective).toBe(contract.objective.ru);
    expect(russianLesson.worked_inputs).toBe(contract.worked_inputs.ru);
    expect(russianLesson.decoder_connection).toBe(contract.decoder_connection.ru);
    expect(russianLesson.history.approach).toBe(contract.history.approach.ru);
    expect(russianLesson.history.summary).toBe(contract.history.summary.ru);
    expect(russianLesson.history.llm_evolution).toEqual({
      predecessor_kind: contract.history.llm_evolution.predecessor_kind,
      limitation: contract.history.llm_evolution.limitation.ru,
      later_advance: contract.history.llm_evolution.later_advance.ru,
      modern_llm_role: contract.history.llm_evolution.modern_llm_role.ru,
      sources: contract.history.llm_evolution.sources.map(
        (source: {
          role: string;
          year: number;
          name: string;
          source_url: string;
          claim: { ru: string };
        }) => ({ ...source, claim: source.claim.ru }),
      ),
    });
    expect(russianLesson.visualization).toEqual({
      decision: contract.visualization.decision,
      id: contract.visualization.id,
      rationale: contract.visualization.rationale.ru,
    });
    expect([
      ...new Set(lesson.rust_sources.map(({ path }: { path: string }) => path)),
    ]).toEqual(contract.rust.sources);
    expect(
      russianLesson.rust_sources.map(
        ({ path, region }: { path: string; region?: string }) => ({ path, region }),
      ),
    ).toEqual(
      lesson.rust_sources.map(
        ({ path, region }: { path: string; region?: string }) => ({ path, region }),
      ),
    );
    expect([
      ...new Set(
        russianLesson.rust_sources.map(({ path }: { path: string }) => path),
      ),
    ]).toEqual(contract.rust.sources);
    for (const localizedLabels of [englishDiagramLabels, russianDiagramLabels]) {
      expect(() =>
        validateTrainingSelectionDiagramLabels(localizedLabels),
      ).not.toThrow();
      expect(Object.keys(localizedLabels).sort()).toEqual(
        Object.keys(englishDiagramLabels).sort(),
      );
      for (const namespace of [
        "sections",
        "operations",
        "fields",
        "cues",
        "proofs",
        "captions",
        "scrollers",
      ] as const) {
        expect(Object.keys(localizedLabels[namespace]).sort()).toEqual(
          Object.keys(englishDiagramLabels[namespace]).sort(),
        );
      }
    }
    expect(coursePlanSource.replace(/\r?\n/g, "")).toContain(
      "\\begin{aligned}g_s&=\\nabla_\\theta\\mathcal{L}_{tr}^{(s)}(\\theta_{s-1}),\\\\ \\widetilde g_s&=\\frac{c}{\\max(c,\\lVert g_s\\rVert_2)}g_s,\\\\ (\\theta_s,m_s,v_s)&=\\operatorname{AdamW}_{\\eta_s}\\!\\left(\\theta_{s-1},\\widetilde g_s,m_{s-1},v_{s-1}\\right),\\quad s=1,\\ldots,8,\\\\ s^*&=\\min\\left\\{s\\in\\mathcal{C}:\\mathcal{L}_{va}(\\theta_s)=\\min_{k\\in\\mathcal{C}}\\mathcal{L}_{va}(\\theta_k)\\right\\}\\end{aligned}",
    );
    expect(contract.content_revision).toBe(7);
    expect(lesson.content_revision).toBe(7);
    expect(russianLesson.content_revision).toBe(7);
    expect(contract.translation_notes).toContain(
      `canonical English SHA-256: ${createHash("sha256").update(lessonSource).digest("hex")}`,
    );
    expect(coursePlanSource).not.toContain("s^\\*");
    expect(contractSource).not.toContain("s^\\*");
    expect(lessonSource).not.toContain("s^\\*");

    const normalizedLesson = lessonSource.replace(/\s+/g, " ");
    for (const source of lesson.history.llm_evolution.sources) {
      expect(lessonSource).toContain(source.source_url);
      expect(normalizedLesson).toContain(source.claim);
    }
    expect(lessonSource.match(/chapter-section:/g)).toHaveLength(8);
    expect(lessonSource.match(/<RustSource\b/g)).toHaveLength(10);
    expect(lessonSource).toContain(
      "<TrainingSelectionDiagram labels={diagramLabels} />",
    );
    expect(normalizedLesson).toContain(
      "These training practices form part of the road to modern LLMs",
    );
    expect(lessonSource).not.toMatch(
      /TypeScript (?:validates|performs|computes)/,
    );
    expect(lessonSource).not.toMatch(
      /byte for byte|final newline|page parses|static diagram|implementation languages/i,
    );
    expect(russianLessonSource.match(/chapter-section:/g)).toHaveLength(8);
    expect(russianLessonSource.match(/<RustSource\b/g)).toHaveLength(10);
    expect(russianLessonSource).toContain(
      "<TrainingSelectionDiagram labels={diagramLabels} />",
    );
    expect(russianLessonSource).not.toMatch(
      /byte for byte|final newline|page parses|static diagram|implementation languages/i,
    );

    expect(trainerSource).toContain("region:training-plan");
    expect(trainerSource).toContain("region:no-grad-evaluation");
    expect(trainerSource).toContain("region:global-norm-clipping");
    expect(trainerSource).toContain("region:complete-training-loop");
    expect(trainerSource).toContain("Partition::Validation");
    expect(trainerSource).toContain("Partition::Test");
    expect(adamwSource).toContain("region:adamw-execution-and-trace-api");
    expect(adamwSource).toMatch(
      /pub fn step_with_learning_rate\([\s\S]*?\) -> Result<u64, AdamWError>/,
    );
    expect(adamwSource).toMatch(
      /pub fn step_with_learning_rate_and_trace\([\s\S]*?\) -> Result<AdamWStep, AdamWError>/,
    );
    expect(adamwSource).toMatch(
      /pub fn step_with_learning_rate_and_gradient_scale\([\s\S]*?gradient_scale: f64,[\s\S]*?\) -> Result<u64, AdamWError>/,
    );
    const completeLoopSource = trainerSource.match(
      /\/\/ region:complete-training-loop([\s\S]*?)\/\/ endregion:complete-training-loop/,
    )?.[1];
    expect(completeLoopSource).toBeDefined();
    expect(completeLoopSource).toMatch(
      /optimizer\.step_with_learning_rate_and_gradient_scale\([\s\S]*?model\.parameters\(\),[\s\S]*?learning_rate,[\s\S]*?norm\.scale,[\s\S]*?\)\?/,
    );
    expect(completeLoopSource).not.toMatch(
      /candidate_parameters|candidate_optimizer|\.parameters\(\)\.to_vec\(\)/,
    );
    expect(completeLoopSource).toContain("clear_and_verify_gradients(&model)?;");
    expect(completeLoopSource).toContain("parameter_nodes_preserved: true");
    expect(trainerSource).not.toContain("clipped_parameter_copy");
    expect(trainerSource).toContain("if optimizer_step != expected_optimizer_step");
    expect(trainerSource).not.toContain("optimizer_step.step()");
    expect(normalizedLesson).toContain(
      "The working decoder and optimizer then persist through all eight updates.",
    );
    expect(normalizedLesson).toContain(
      "The registry and every decoder component already hold aliases of those nodes, so the next forward pass observes the new values without rebuilding the decoder.",
    );
    expect(normalizedLesson).toContain(
      "AdamW deliberately leaves each raw gradient tensor unchanged on its parameter node.",
    );
    expect(normalizedLesson).toContain(
      "The trainer does not call it after each ordinary AdamW step.",
    );
    expect(normalizedLesson).toContain(
      "AdamW does hold each fully checked prospective tensor value until the transaction can commit.",
    );
    expect(normalizedLesson).toContain(
      "`parameter_bits` temporarily reads each parameter tensor, converts its scalar values to `u64`, and retains only the resulting bit vector after the read ends.",
    );
    expect(trainerSource).toMatch(
      /fn clear_and_verify_gradients\([\s\S]*?parameter\.tensor\(\)\.zero_grad\(\)\?;[\s\S]*?\.gradient\(\)/,
    );
    expect(russianLessonSource.replace(/\s+/g, " ")).toContain(
      "Затем этот декодер и этот оптимизатор используются во всех восьми обновлениях.",
    );
    expect(russianLessonSource.replace(/\s+/g, " ")).toContain(
      "В реестре и компонентах декодера хранятся дескрипторы этих же узлов, поэтому следующий прямой проход видит новые значения без повторной сборки декодера.",
    );
    expect(russianLessonSource.replace(/\s+/g, " ")).toContain(
      "Его не вызывают после каждого такого шага.",
    );
    expect(tapeSource).toContain("region:no-grad-scope");
    expect(decoderSource).toContain("region:decoder-parameter-rebuild");
    expect(decoderSource).toContain(
      "Ordinary optimizer steps instead update the existing leaves",
    );
    expect(demoSource).toContain("region:historical-selection-contrast");
    expect(demoSource).toContain("region:learner-evidence");
    expect(demoSource).toMatch(
      /fn parameter_bits\(model: &DecoderModel\)[\s\S]*?\.value\(\)[\s\S]*?\.as_slice\(\)/,
    );
    expect(demoSource).not.toContain(".value_snapshot()");
    expect(traceRustSource).toContain("TRAINING_SELECTION_TRACE_V1");
  });
});
