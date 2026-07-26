// @ts-ignore Node APIs are available in the Vitest runner.
import { existsSync, readFileSync } from "node:fs";
// @ts-ignore Node APIs are available in the Vitest runner.
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  parseFinalEvaluationTrace,
  validateFinalEvaluationDiagramLabels,
  type FinalEvaluationDiagramLabels,
} from "../src/lib/final-evaluation-diagram";

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), "..");
const read = (path: string) =>
  readFileSync(resolve(repositoryRoot, path), "utf8");
const fixture = read("rust/demos/ch34-final-evaluation/diagram-trace.txt");
const expectedOutput = read("rust/demos/ch34-final-evaluation/expected.txt");
const parserSource = read("site/src/lib/final-evaluation-diagram.ts");
const componentSource = read(
  "site/src/components/chapters/FinalEvaluationDiagram.astro",
);
const contractSource = read("curriculum/chapters/34-final-evaluation.md");
const lessonSource = read(
  "site/src/content/chapters/en/34-final-evaluation.mdx",
);
const coursePlanSource = read("curriculum/course-plan.md");
const evaluationSource = read(
  "rust/crates/llm-from-scratch/src/evaluation.rs",
);
const selectionSource = read(
  "rust/demos/ch33-training-selection/src/lib.rs",
);
const demoSource = read("rust/demos/ch34-final-evaluation/src/lib.rs");
const traceRustSource = read(
  "rust/demos/ch34-final-evaluation/src/diagram_trace.rs",
);

function frontmatter(source: string) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error("missing JSON frontmatter");
  return JSON.parse(match[1]);
}

const labels: FinalEvaluationDiagramLabels = {
  title: "title",
  description: "description",
  sections: {
    boundary: "boundary",
    comparison: "comparison",
    proof: "proof",
  },
  stages: {
    train: "train",
    validation: "validation",
    frozen: "frozen",
    test: "test",
    report: "report",
  },
  models: {
    decoder: "decoder",
    bigram: "bigram",
  },
  fields: {
    model: "model",
    fittedRole: "fitted role",
    selectedBy: "selected by",
    targetCount: "target count",
    totalNll: "total NLL",
    meanLoss: "mean loss",
  },
  cues: {
    fits: "fits",
    selects: "selects",
    sealed: "sealed",
    evaluatesOnce: "evaluates once",
    lowerLoss: "lower loss",
    sameTargets: "same targets",
    rejectedBeforeFreeze: "rejected before freeze",
    verified: "verified",
  },
  proofs: {
    provenance: "provenance",
    selectionClosed: "selection closed",
    noGrad: "no grad",
    immutableState: "immutable state",
  },
  captions: {
    boundary: "boundary caption",
    comparison: "comparison caption",
    proof: "proof caption",
  },
  scrollers: {
    comparison: "comparison scroller",
  },
};

describe("Chapter 34 Rust trace parser", () => {
  it("preserves the exact role, provenance, score, and immutable-report evidence", () => {
    const trace = parseFinalEvaluationTrace(fixture);
    expect(trace.report).toEqual({
      version: "1",
      partition: "test",
      selected_step: "8",
      selection_criterion: "validation-only",
      test_accesses: "1",
    });
    expect(trace.boundary).toEqual({
      train_role: "fit",
      validation_role: "select",
      test_role: "evaluate-once",
      selection_test_reads: "0",
      evaluation_test_reads: "1",
      test_selectable: "false",
    });
    expect(trace.provenance).toMatchObject({
      corpus: "ch33-34-synthetic-v1",
      split: "fixed-role-split-v1",
      tokenizer: "literal-u32-v1",
      vocabulary: "5",
      context: "2",
      documents: "test-a,test-b",
      windows: "12",
      batches: "3",
      targets: "24",
      target_fingerprint: "fnv1a64:dac4bb4d76beeb59",
    });
    expect(trace.scores).toEqual([
      {
        model: "selected-decoder",
        fit_partition: "train",
        selected_by: "validation",
        targets: "24",
        total_nll: "38.584306",
        mean_nll: "1.607679",
        perplexity: "4.991215",
      },
      {
        model: "frozen-bigram",
        fit_partition: "train",
        selected_by: "none",
        targets: "24",
        total_nll: "53.681634",
        mean_nll: "2.236735",
        perplexity: "9.362710",
      },
    ]);
    expect(trace.comparison).toEqual({
      lower_loss: "selected-decoder",
      loss_gap: "0.629055",
      same_targets: "true",
      decoder_beats_bigram: "true",
      fixture_specific: "true",
    });
    expect(trace.proof).toMatchObject({
      token_weighted: "true",
      provenance_match: "true",
      graph_nodes_before: "0",
      graph_nodes_after: "0",
      parameters_unchanged: "true",
      gradients_unchanged: "true",
      report_immutable: "true",
      selection_closed: "true",
    });
    expect(Object.values(trace.history).every((value) => value === "true")).toBe(
      true,
    );
  });

  it("rejects every structural or semantic mutation before frozen fixture equality", () => {
    for (const changed of [
      fixture.replace("test_accesses=1", "test_accesses=2"),
      fixture.replace("selection_test_reads=0", "selection_test_reads=1"),
      fixture.replace("targets=24", "targets=23"),
      fixture.replace("selected_by=validation", "selected_by=test"),
      fixture.replace("same_targets=true", "same_targets=false"),
      fixture.replace("fixture_specific=true", "fixture_specific=false"),
      fixture.slice(0, -1),
      fixture + "\n",
      fixture.replace(/\n/g, "\r\n"),
    ]) {
      expect(() => parseFinalEvaluationTrace(changed)).toThrow(
        /invalid final-evaluation trace/,
      );
    }
    const lines = fixture.slice(0, -1).split("\n");
    for (const index of lines.keys()) {
      const changed = [...lines];
      changed[index] += "|tampered=true";
      expect(() =>
        parseFinalEvaluationTrace(changed.join("\n") + "\n"),
      ).toThrow(/invalid final-evaluation trace/);
    }
  });

  it("requires every localized label and rejects blank, missing, or extra leaves", () => {
    expect(() => validateFinalEvaluationDiagramLabels(labels)).not.toThrow();
    expect(() =>
      validateFinalEvaluationDiagramLabels({ ...labels, title: "" }),
    ).toThrow(/labels\.title/);
    expect(() =>
      validateFinalEvaluationDiagramLabels({
        ...labels,
        cues: { ...labels.cues, extra: "extra" },
      } as unknown as FinalEvaluationDiagramLabels),
    ).toThrow(/cues has unexpected keys/);
    const missing = {
      ...labels,
      proofs: { ...labels.proofs },
    } as unknown as Record<string, unknown>;
    delete (missing.proofs as Record<string, unknown>).noGrad;
    expect(() =>
      validateFinalEvaluationDiagramLabels(
        missing as unknown as FinalEvaluationDiagramLabels,
      ),
    ).toThrow(/proofs has unexpected keys/);
  });
});

describe("Chapter 34 static diagram and content boundary", () => {
  it("projects one Rust-authored figure without scripts or model arithmetic", () => {
    expect(componentSource).toContain(
      "../../../../rust/demos/ch34-final-evaluation/diagram-trace.txt?raw",
    );
    expect(componentSource).toContain("parseFinalEvaluationTrace(traceSource)");
    expect(componentSource).toContain(
      'data-visualization-id="final-evaluation-boundary"',
    );
    expect(componentSource).toContain('data-diagram-style="course-v1"');
    expect(componentSource).not.toMatch(/<script|client:|<dialog/i);
    expect(componentSource).not.toMatch(/<(?:svg|canvas|path|polyline|line)\b/i);
    expect(componentSource).not.toMatch(/(?:softmax|matmul|backward|evaluate_once)\s*\(/i);
    expect(parserSource).not.toMatch(/(?:Math\.(?:exp|log)|\.reduce\s*\()/);
    expect(componentSource.match(/<figure\b/g)).toHaveLength(1);
    expect(componentSource.match(/<figcaption\b/g)).toHaveLength(1);
    expect(componentSource.match(/data-diagram-scroll/g)).toHaveLength(1);
    expect(componentSource.match(/course-diagram__scroll/g)).toHaveLength(1);
    expect(componentSource.match(/role="region"/g)).toHaveLength(1);
    expect(componentSource.match(/tabindex="0"/g)).toHaveLength(2);
    expect(componentSource).toContain("stages.map");
    expect(componentSource.match(/<article\b/g)).toHaveLength(5);
    expect(componentSource.match(/data-diagram-box/g)).toHaveLength(5);
    expect(componentSource.match(/data-diagram-table/g)).toHaveLength(1);
    expect(componentSource.match(/<caption>/g)).toHaveLength(1);
    expect(componentSource).toContain('scope="row"');
    expect(componentSource).toContain('scope="col"');
    expect(componentSource).toContain("border-inline-start-style: double");
    expect(componentSource).toContain("@container course-diagram");
    expect(componentSource).not.toMatch(/@media\s*\(/);
    expect(componentSource).not.toMatch(/overflow-x\s*:/);
    expect(componentSource).not.toMatch(/overflow\s*:\s*(?:hidden|clip)/);
    expect(componentSource).not.toMatch(/(?:background|border-color|border-radius|outline)\s*:/);
  });

  it("keeps the contract, lesson, formula, source evidence, and locale policy aligned", () => {
    const contract = frontmatter(contractSource);
    const lesson = frontmatter(lessonSource);
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
    expect([
      ...new Set(lesson.rust_sources.map(({ path }: { path: string }) => path)),
    ]).toEqual(contract.rust.sources);
    expect(coursePlanSource.replace(/\r?\n/g, "")).toContain(
      "\\mathcal{L}_{te}(\\theta_{s^*})=-\\frac{1}{N_{te}}\\sum_{n=1}^{N_{te}}\\log p_{\\theta_{s^*}}(y_n\\mid x_n)",
    );
    expect(contract.content_revision).toBe(1);
    expect(lesson.content_revision).toBe(1);
    expect(contractSource).not.toContain("s^\\*");
    expect(lessonSource).not.toContain("s^\\*");

    const normalizedLesson = lessonSource.replace(/\s+/g, " ");
    for (const source of lesson.history.llm_evolution.sources) {
      expect(lessonSource).toContain(source.source_url);
      expect(normalizedLesson).toContain(source.claim);
    }
    expect(lessonSource.match(/chapter-section:/g)).toHaveLength(8);
    expect(lessonSource.match(/<RustSource\b/g)).toHaveLength(6);
    expect(lessonSource).toContain(
      "<FinalEvaluationDiagram labels={diagramLabels} />",
    );
    expect(normalizedLesson).toContain(
      "This is a history of LLM evaluation practice, not a history of programming languages",
    );
    expect(normalizedLesson).toContain(
      "does not claim that decoders always beat bigrams",
    );
    expect(lessonSource).not.toMatch(/TypeScript (?:validates|performs|computes)/);
    expect(
      existsSync(
        resolve(repositoryRoot, "site/src/content/chapters/ru/34-final-evaluation.mdx"),
      ),
    ).toBe(false);

    expect(evaluationSource).toContain("region:evaluation-provenance");
    expect(evaluationSource).toContain("region:once-only-final-evaluation");
    expect(evaluationSource).toContain("AlreadyEvaluated");
    expect(evaluationSource).toContain("Partition::Test");
    expect(selectionSource).toContain("fixture_training_documents");
    expect(demoSource).toContain("region:historical-evaluation-contrast");
    expect(demoSource).toContain("region:learner-evidence");
    expect(traceRustSource).toContain("FINAL_EVALUATION_TRACE_V1");
  });
});
