// @ts-ignore Node APIs are available in the Vitest runner.
import { existsSync, readFileSync } from "node:fs";
// @ts-ignore Node APIs are available in the Vitest runner.
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  parseDecoderModelTrace,
  validateDecoderModelDiagramLabels,
  type DecoderModelDiagramLabels,
} from "../src/lib/decoder-model-diagram";

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), "..");
const read = (path: string) =>
  readFileSync(resolve(repositoryRoot, path), "utf8");
const fixture = read("rust/demos/ch32-decoder-model/diagram-trace.txt");
const expectedOutput = read("rust/demos/ch32-decoder-model/expected.txt");
const parserSource = read("site/src/lib/decoder-model-diagram.ts");
const componentSource = read(
  "site/src/components/chapters/DecoderModelDiagram.astro",
);
const contractSource = read("curriculum/chapters/32-decoder-model.md");
const lessonSource = read("site/src/content/chapters/en/32-decoder-model.mdx");
const coursePlanSource = read("curriculum/course-plan.md");
const modelSource = read("rust/crates/llm-from-scratch/src/models/decoder.rs");
const demoSource = read("rust/demos/ch32-decoder-model/src/lib.rs");
const traceRustSource = read(
  "rust/demos/ch32-decoder-model/src/diagram_trace.rs",
);

function frontmatter(source: string) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error("missing JSON frontmatter");
  return JSON.parse(match[1]);
}

const labels: DecoderModelDiagramLabels = {
  title: "title",
  description: "description",
  sections: {
    pipeline: "pipeline",
    evidence: "evidence",
    proof: "proof",
  },
  stages: {
    ids: "ids",
    lookup: "lookup",
    blocks: "blocks",
    finalNorm: "final norm",
    projection: "projection",
    logits: "logits",
  },
  fields: {
    shape: "shape",
    stage: "stage",
    token: "token",
    target: "target",
    values: "values",
    prediction: "prediction",
    meanLoss: "mean loss",
    parameterCount: "parameter count",
    parameterSaving: "parameter saving",
    gradientProof: "gradient proof",
    causalProof: "causal proof",
    depthProof: "depth proof",
  },
  cues: {
    oneTable: "one table",
    lookupRole: "lookup role",
    projectionRole: "projection role",
    repeated: "repeated",
    tied: "tied",
    verified: "verified",
    unchanged: "unchanged",
    changed: "changed",
  },
  captions: {
    pipeline: "pipeline caption",
    evidence: "evidence caption",
    proof: "proof caption",
  },
  scrollers: {
    pipeline: "pipeline scroller",
    stages: "stages scroller",
    logits: "logits scroller",
  },
};

describe("Chapter 32 Rust trace parser", () => {
  it("preserves configuration, every stage row, tied logits, and proofs as strings", () => {
    const trace = parseDecoderModelTrace(fixture);
    expect(trace.config).toEqual({
      batch: "1",
      tokens: "3",
      vocabulary: "5",
      model_width: "4",
      layers: "2",
      heads: "2",
      feed_forward_width: "4",
      context: "4",
    });
    expect(trace.tokens).toMatchObject({
      shape: "[1,3]",
      values: { latex: "[0,1,2]", values: ["0", "1", "2"] },
    });
    expect(trace.targets.latex).toBe("[1,2,3]");
    expect(trace.stages.map(({ name, shape }) => ({ name, shape }))).toEqual([
      { name: "embedding", shape: "[1,3,4]" },
      { name: "block-0", shape: "[1,3,4]" },
      { name: "block-1", shape: "[1,3,4]" },
      { name: "final-norm", shape: "[1,3,4]" },
    ]);
    expect(trace.stages.every(({ tokens }) => tokens.length === 3)).toBe(true);
    expect(trace.stages[2].tokens[1]).toMatchObject({
      token: "1",
      values: { latex: "[-0.183854,0.605829,0.709748,-0.521934]" },
    });
    expect(
      trace.logits.map(({ token, values }) => ({
        token,
        values: values.latex,
      })),
    ).toEqual([
      {
        token: "0",
        values: "[0.386115,0.276091,0.301266,-0.460642,-0.735173]",
      },
      {
        token: "1",
        values: "[-0.862249,0.967613,-0.991545,-0.446363,1.234533]",
      },
      {
        token: "2",
        values: "[-0.220241,0.332921,-0.193218,-0.267554,-0.500487]",
      },
    ]);
    expect(trace.predictions.latex).toBe("[0,4,1]");
    expect(trace.loss).toEqual({ mean: "2.045535" });
    expect(trace.tying).toEqual({
      name: "token_embedding.weight",
      lookup_and_head: "true",
      gradient_roles: "lookup+output",
      decomposition_error: "0.000000000000",
    });
    expect(trace.parameters).toEqual({
      tensors: "20",
      scalars: "264",
      untied_scalars: "284",
      saved: "20",
      bias_free: "true",
      stable_order: "true",
    });
    expect(trace.causality).toEqual({
      prefix_0_bitwise: "true",
      prefix_1_bitwise: "true",
      suffix_changed: "true",
    });
    expect(trace.gradcheck).toEqual({
      tied_table: "20",
      final_norm: "4",
      total: "24",
      tolerance: "0.000020",
      passed: "true",
      stack_gradients: "20/20",
    });
    expect(trace.depths).toEqual({
      zero_one_two: "true",
      context_limit: "true",
      vocabulary_errors: "true",
      target_errors: "true",
    });
    expect(trace.history).toEqual({
      recurrent_components: "true",
      tied_embeddings: "true",
      transformer_stack: "true",
      final_norm: "true",
      rmsnorm_decoder: "true",
    });
    expect(trace.replay).toEqual({ bitwise: "true" });
  });

  it("rejects every changed line, ordering drift, numeric drift, and line-ending drift", () => {
    const lines = fixture.slice(0, -1).split("\n");
    for (const index of lines.keys()) {
      const changed = [...lines];
      changed[index] += " tampered=true";
      expect(() => parseDecoderModelTrace(changed.join("\n") + "\n")).toThrow(
        /invalid decoder-model trace/,
      );
    }
    for (const changed of [
      fixture.slice(0, -1),
      fixture + "\n",
      fixture.replace(/\n/g, "\r\n"),
      fixture.replace("block-0 shape", "block-1 shape"),
      fixture.replace("1.234533", "1.234534"),
      fixture.replace("lookup+output", "output+lookup"),
      fixture.replace(
        "decomposition_error=0.000000000000",
        "decomposition_error=0.000000000001",
      ),
      fixture.replace("prefix_1_bitwise=true", "prefix_1_bitwise=false"),
    ]) {
      expect(() => parseDecoderModelTrace(changed)).toThrow(
        /invalid decoder-model trace/,
      );
    }
  });

  it("requires every localized label and rejects blank, missing, or extra leaves", () => {
    expect(() => validateDecoderModelDiagramLabels(labels)).not.toThrow();
    expect(() =>
      validateDecoderModelDiagramLabels({ ...labels, title: "" }),
    ).toThrow(/labels\.title/);
    expect(() =>
      validateDecoderModelDiagramLabels({
        ...labels,
        cues: { ...labels.cues, extra: "extra" },
      } as unknown as DecoderModelDiagramLabels),
    ).toThrow(/cues has unexpected keys/);
    const missing = {
      ...labels,
      fields: { ...labels.fields },
    } as unknown as Record<string, unknown>;
    delete (missing.fields as Record<string, unknown>).gradientProof;
    expect(() =>
      validateDecoderModelDiagramLabels(
        missing as unknown as DecoderModelDiagramLabels,
      ),
    ).toThrow(/fields has unexpected keys/);
  });
});

describe("Chapter 32 static diagram and content boundary", () => {
  it("projects frozen Rust strings without model arithmetic, hydration, or a private presentation tree", () => {
    expect(componentSource).toContain(
      "../../../../rust/demos/ch32-decoder-model/diagram-trace.txt?raw",
    );
    expect(componentSource).toContain(
      "import InlineMath from '../InlineMath.astro'",
    );
    expect(componentSource).toContain("parseDecoderModelTrace(traceSource)");
    expect(componentSource).toContain(
      'data-visualization-id="tied-decoder-model-flow"',
    );
    expect(componentSource).toContain('data-diagram-style="course-v1"');
    expect(componentSource).not.toContain("<script");
    expect(componentSource).not.toContain("client:");
    expect(componentSource).not.toContain("<dialog");
    expect(componentSource).not.toContain("<svg");
    expect(componentSource).not.toContain("<canvas");
    expect(parserSource).not.toMatch(
      /\b(?:Number|parseFloat|parseInt|Math)\s*[.(]/,
    );
    expect(parserSource).not.toContain(".reduce(");
    for (const forbidden of ["softmax(", "matmul(", "rmsnorm(", "gradient("]) {
      expect(parserSource.toLowerCase()).not.toContain(forbidden);
    }
    for (const field of [
      "trace.stages",
      "trace.logits",
      "trace.loss",
      "trace.tying",
      "trace.parameters",
      "trace.depths",
      "trace.causality",
      "trace.gradcheck",
    ]) {
      expect(componentSource).toContain(field);
    }
  });

  it("uses one semantic figure, shared roles, local named scrollers, natural height, and non-color cues", () => {
    expect(componentSource.match(/<figure\b/g)).toHaveLength(1);
    expect(componentSource.match(/<figcaption\b/g)).toHaveLength(1);
    expect(componentSource.match(/data-diagram-scroll/g)).toHaveLength(3);
    expect(
      componentSource.match(/class="[^"]*course-diagram__scroll[^"]*"/g),
    ).toHaveLength(3);
    expect(componentSource.match(/role="region"/g)).toHaveLength(3);
    expect(componentSource.match(/tabindex="0"/g)).toHaveLength(4);
    expect(componentSource.match(/<article\b/g)).toHaveLength(10);
    expect(componentSource.match(/data-diagram-box/g)).toHaveLength(10);
    expect(componentSource.match(/data-diagram-table/g)).toHaveLength(2);
    expect(componentSource.match(/<caption>/g)).toHaveLength(2);
    expect(componentSource).toContain('scope="row"');
    expect(componentSource).toContain('scope="col"');
    expect(componentSource).toContain("border-inline-start-style: double");
    expect(componentSource).toContain("border-style: dashed");
    expect(componentSource).toContain("border-block-end-style: double");
    expect(componentSource).toContain("@media (forced-colors: active)");
    expect(componentSource).toContain("direction: ltr");
    expect(componentSource).toContain("unicode-bidi: isolate");
    expect(componentSource).not.toMatch(/overflow-x\s*:/);
    expect(componentSource).not.toMatch(/overflow\s*:\s*(?:hidden|clip)/);
    expect(componentSource).not.toMatch(/\b(?:block-size|height)\s*:/);
    expect(componentSource).not.toMatch(
      /(?:background|border-color|border-radius|outline)\s*:/,
    );
  });

  it("keeps contract, lesson, Rust, history, formula, source evidence, and locale policy aligned", () => {
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
      "\\ell=\\operatorname{RMSNorm}(B_N(\\cdots B_1(E[z])\\cdots))E^\\top",
    );

    const normalizedLesson = lessonSource.replace(/\s+/g, " ");
    for (const source of lesson.history.llm_evolution.sources) {
      expect(lessonSource).toContain(source.source_url);
      expect(normalizedLesson).toContain(source.claim);
    }
    expect(lessonSource.match(/chapter-section:/g)).toHaveLength(8);
    expect(lessonSource.match(/<RustSource\b/g)).toHaveLength(9);
    expect(lessonSource).toContain(
      "<DecoderModelDiagram labels={diagramLabels} />",
    );
    expect(lessonSource).not.toMatch(
      /TypeScript (?:validates|performs|computes)/,
    );
    expect(
      existsSync(
        resolve(
          repositoryRoot,
          "site/src/content/chapters/ru/32-decoder-model.mdx",
        ),
      ),
    ).toBe(false);

    expect(modelSource).toContain("region:decoder-model-errors");
    expect(modelSource).toContain("region:decoder-model-config");
    expect(modelSource).toContain("region:decoder-model-layer");
    expect(modelSource).toContain(".transpose(0, 1)");
    expect(modelSource).toContain(".indexed_mean_nll(2, &target_indices)");
    expect(modelSource).not.toContain("lm_head");
    expect(demoSource).toContain("region:tied-gradient-proof");
    expect(demoSource).toContain("region:gradient-checks");
    expect(demoSource).toContain("region:learner-evidence");
    expect(demoSource).toContain("region:learner-report");
    expect(traceRustSource).toContain("DECODER_MODEL_TRACE_V1");
  });
});
