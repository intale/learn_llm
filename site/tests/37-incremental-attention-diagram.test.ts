// @ts-ignore Node APIs are available in the Vitest runner.
import { createHash } from "node:crypto";
// @ts-ignore Node APIs are available in the Vitest runner.
import { existsSync, readFileSync } from "node:fs";
// @ts-ignore Node APIs are available in the Vitest runner.
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  parseIncrementalAttentionTrace,
  validateIncrementalAttentionDiagramLabels,
  type IncrementalAttentionDiagramLabels,
} from "../src/lib/incremental-attention-diagram";

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), "..");
const read = (path: string) =>
  readFileSync(resolve(repositoryRoot, path), "utf8");
const fixture = read("rust/demos/ch37-incremental-attention/diagram-trace.txt");
const expectedOutput = read("rust/demos/ch37-incremental-attention/expected.txt");
const parserSource = read("site/src/lib/incremental-attention-diagram.ts");
const componentSource = read(
  "site/src/components/chapters/IncrementalAttentionDiagram.astro",
);
const contractSource = read("curriculum/chapters/37-incremental-attention.md");
const lessonSource = read(
  "site/src/content/chapters/en/37-incremental-attention.mdx",
);
const russianLessonSource = read(
  "site/src/content/chapters/ru/37-incremental-attention.mdx",
);
const coursePlanSource = read("curriculum/course-plan.md");
const incrementalSource = read(
  "rust/crates/llm-from-scratch/src/attention/incremental.rs",
);
const demoSource = read("rust/demos/ch37-incremental-attention/src/lib.rs");

function frontmatter(source: string) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error("missing JSON frontmatter");
  return JSON.parse(match[1]);
}

const labels: IncrementalAttentionDiagramLabels = {
  title: "title",
  description: "description",
  sections: {
    timeline: "timeline",
    work: "work",
    reset: "reset",
  },
  fields: {
    position: "position",
    cache: "cache",
    shape: "shape",
    head: "head",
    keys: "keys",
    values: "values",
    weights: "weights",
    cached: "cached",
    full: "full",
    difference: "difference",
  },
  cues: {
    retained: "retained",
    appended: "appended",
    match: "match",
    unchanged: "unchanged",
    replay: "replay",
    errors: "errors",
  },
  captions: {
    timeline: "timeline caption",
    work: "work caption",
    reset: "reset caption",
  },
  proofs: {
    full: "full proof",
    cached: "cached proof",
    reused: "reused proof",
  },
  lists: {
    cacheRows: "cache rows",
  },
};

describe("Chapter 37 Rust trace parser", () => {
  it("preserves exact append, retained-prefix, reference, work, and reset evidence", () => {
    const trace = parseIncrementalAttentionTrace(fixture);
    expect(trace.config).toEqual({
      batch: "1",
      tokens: "3",
      model_width: "4",
      heads: "2",
      head_width: "2",
      capacity: "4",
      rope_base: "100.000000",
      tolerance: "0.000000000001",
    });
    expect(trace.steps.map(({ position }) => position)).toEqual(["0", "1", "2"]);
    expect(trace.steps.map(({ cacheBefore, cacheAfter }) => [cacheBefore, cacheAfter])).toEqual([
      ["0", "1"],
      ["1", "2"],
      ["2", "3"],
    ]);
    expect(trace.steps.map(({ cacheShape }) => cacheShape)).toEqual([
      ["1", "2", "1", "2"],
      ["1", "2", "2", "2"],
      ["1", "2", "3", "2"],
    ]);

    const thirdHead = trace.steps[2].heads[1];
    expect(thirdHead.appendedKey).toEqual(["-1.325444263", "0.493150590"]);
    expect(thirdHead.appendedValue).toEqual(["1.000000000", "1.000000000"]);
    expect(thirdHead.keys).toEqual([
      "1.000000000",
      "0.000000000",
      "-0.841470985",
      "0.540302306",
      "-1.325444263",
      "0.493150590",
    ]);
    expect(thirdHead.weights).toEqual([
      "0.054696042457",
      "0.370955922197",
      "0.574348035346",
    ]);
    for (const step of trace.steps) {
      expect(step.incremental).toEqual(step.full);
      expect(step.maxAbsDiff).toBe("0.000000000000");
    }
    expect(trace.work).toEqual({
      full_rows_per_projection: "6",
      incremental_rows_per_projection: "3",
      reused_rows_per_kv_projection: "3",
      avoided_rows_across_kv: "6",
    });
    expect(trace.reset).toEqual({
      before: "3",
      after: "0",
      allocation_reused: "true",
      storage_unchanged: "true",
      replay_identical: "true",
    });
    expect(Object.values(trace.errors).every((value) => value === "true")).toBe(true);
    expect(trace.history).toEqual({
      newest_query_key_rows: "[1,2,3]",
      complete_prefix_rows_per_projection: "6",
      incremental_rows_per_projection: "3",
      reused_key_rows: "3",
      reused_value_rows: "3",
    });
    expect(trace.history.newest_query_key_rows).toBe(
      `[${trace.steps.map((step) => step.heads[0].weights.length).join(",")}]`,
    );
    expect(trace.history.complete_prefix_rows_per_projection).toBe(
      trace.work.full_rows_per_projection,
    );
    expect(trace.history.incremental_rows_per_projection).toBe(
      trace.work.incremental_rows_per_projection,
    );
    expect(trace.history.reused_key_rows).toBe(
      trace.work.reused_rows_per_kv_projection,
    );
    expect(trace.history.reused_value_rows).toBe(
      trace.work.reused_rows_per_kv_projection,
    );
    expect(trace.next).toBe("cached-generation");
  });

  it("rejects structural and semantic mutations before frozen fixture equality", () => {
    for (const changed of [
      fixture.replace("cache_after=2", "cache_after=3"),
      fixture.replace("cache_shape=[1,2,2,2]", "cache_shape=[1,2,3,2]"),
      fixture.replace("appended_key=[-0.841470985,0.540302306]", "appended_key=[0.000000000,0.000000000]"),
      fixture.replace("keys=[1.000000000,0.000000000,-0.841470985", "keys=[0.000000000,0.000000000,-0.841470985"),
      fixture.replace("weights=[0.500000000000,0.500000000000]", "weights=[0.400000000000,0.600000000000]"),
      fixture.replace("max_abs_diff=0.000000000000", "max_abs_diff=0.000000000002"),
      fixture.replace("incremental_rows_per_projection=3", "incremental_rows_per_projection=4"),
      fixture.replace("allocation_reused=true", "allocation_reused=false"),
      fixture.replace("layer_mismatch=true", "layer_mismatch=false"),
      fixture.replace("reused_value_rows=3", "reused_value_rows=4"),
      fixture.replace("next=cached-generation", "next=wrong-boundary"),
      fixture.slice(0, -1),
      fixture + "\n",
      fixture.replace(/\n/g, "\r\n"),
    ]) {
      expect(() => parseIncrementalAttentionTrace(changed)).toThrow(
        /invalid incremental-attention trace/,
      );
    }

    const lines = fixture.slice(0, -1).split("\n");
    for (const index of lines.keys()) {
      const changed = [...lines];
      changed[index] += "|tampered=true";
      expect(() =>
        parseIncrementalAttentionTrace(changed.join("\n") + "\n"),
      ).toThrow(/invalid incremental-attention trace/);
    }
  });

  it("requires every localized label and rejects blank, missing, or extra leaves", () => {
    expect(() => validateIncrementalAttentionDiagramLabels(labels)).not.toThrow();
    expect(() =>
      validateIncrementalAttentionDiagramLabels({ ...labels, title: "" }),
    ).toThrow(/labels\.title/);
    expect(() =>
      validateIncrementalAttentionDiagramLabels({
        ...labels,
        cues: { ...labels.cues, extra: "extra" },
      } as unknown as IncrementalAttentionDiagramLabels),
    ).toThrow(/cues has unexpected keys/);
    const missing = {
      ...labels,
      fields: { ...labels.fields },
    } as unknown as Record<string, unknown>;
    delete (missing.fields as Record<string, unknown>).weights;
    expect(() =>
      validateIncrementalAttentionDiagramLabels(
        missing as unknown as IncrementalAttentionDiagramLabels,
      ),
    ).toThrow(/fields has unexpected keys/);
  });
});

describe("Chapter 37 static diagram and content boundary", () => {
  it("projects one Rust-authored figure without scripts or attention arithmetic", () => {
    expect(componentSource).toContain(
      "../../../../rust/demos/ch37-incremental-attention/diagram-trace.txt?raw",
    );
    expect(componentSource).toContain("parseIncrementalAttentionTrace(traceSource)");
    expect(componentSource).toContain('data-visualization-id="incremental-attention"');
    expect(componentSource).toContain('data-diagram-style="course-v1"');
    expect(componentSource.match(/<figure\b/g)).toHaveLength(1);
    expect(componentSource.match(/<figcaption\b/g)).toHaveLength(1);
    expect(componentSource.match(/data-diagram-box/g)).toHaveLength(8);
    expect(componentSource.match(/data-diagram-card/g)).toHaveLength(8);
    expect(componentSource.match(/tabindex="0"/g)).toHaveLength(1);
    expect(componentSource).not.toMatch(/<script|client:|<dialog|<button/i);
    expect(componentSource).not.toMatch(/<(?:svg|canvas|path|polyline|line)\b/i);
    expect(componentSource).not.toMatch(/(?:forward_incremental|softmax|apply_rotary)\s*\(/i);
    expect(parserSource).not.toMatch(/Math\.(?:exp|log)|\.reduce\s*\(/);
    expect(componentSource).toContain("trace.steps.map");
    expect(componentSource).toContain("step.heads.map");
    expect(componentSource).toContain("data-rope-position={step.position}");
    expect(componentSource).toContain("data-diagram-card");
    expect(componentSource).toContain("border-style: double");
    expect(componentSource).toContain("<InlineMath latex={`[${step.cacheShape.join(',')}]`} />");
    expect(componentSource).toContain("trace.errors.layer_mismatch");
    expect(componentSource).toContain("trace.errors.rope_mismatch");
    expect(componentSource).toContain("trace.errors.rope_positions_mismatch");
    expect(componentSource).toContain("trace.errors.nonfinite_projection");
    expect(componentSource).toContain("@container course-diagram");
    expect(componentSource).not.toMatch(/@media\s*\(/);
    expect(componentSource).not.toMatch(/overflow(?:-x)?\s*:/);
    expect(componentSource).not.toMatch(/overflow\s*:\s*(?:hidden|clip)/);
    expect(componentSource).not.toMatch(/(?:background|color|box-shadow|border-radius|outline)\s*:/);
    expect(componentSource).not.toMatch(/Ã|â|�/);
  });

  it("keeps the contract, lesson, formula, LLM history, and locale policy aligned", () => {
    const contract = frontmatter(contractSource);
    const lesson = frontmatter(lessonSource);
    const russianLesson = frontmatter(russianLessonSource);
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
      "K^{(\\ell)}_{1:t}=[K^{(\\ell)}_{1:t-1};k^{(\\ell)}_t],\\quad V^{(\\ell)}_{1:t}=[V^{(\\ell)}_{1:t-1};v^{(\\ell)}_t]",
    );
    expect(contract.content_revision).toBe(3);
    expect(lesson.content_revision).toBe(3);
    expect(russianLesson.content_revision).toBe(3);
    expect(contract.translation_notes.join(" ")).toContain(
      `SHA-256 ${createHash("sha256").update(lessonSource).digest("hex")}`,
    );
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

    const normalizedLesson = lessonSource.replace(/\s+/g, " ");
    for (const source of lesson.history.llm_evolution.sources) {
      expect(lessonSource).toContain(source.source_url);
      expect(normalizedLesson).toContain(source.claim);
    }
    const historySection = lessonSource.split("{/* chapter-section:history */}")[1]
      .split("{/* chapter-section:rust-implementation */}")[0];
    expect(historySection).not.toMatch(/TypeScript|Python|programming language|build instructions/i);
    expect(lessonSource.match(/chapter-section:/g)).toHaveLength(8);
    expect(lessonSource.match(/<RustSource\b/g)).toHaveLength(6);
    expect(lessonSource.match(/<IncrementalAttentionDiagram\b/g)).toHaveLength(1);
    expect(lessonSource).toContain(
      "<IncrementalAttentionDiagram labels={diagramLabels} />",
    );
    expect(normalizedLesson).toContain(
      "does not claim constant-time attention or a measured speedup",
    );
    expect(lessonSource).not.toMatch(/TypeScript (?:validates|performs|computes)/);
    expect(lessonSource).not.toMatch(/refer(?:s|ring) to (?:the )?build instructions/i);
    expect(lessonSource).not.toMatch(/Ã|â|�/);
    expect(
      existsSync(
        resolve(repositoryRoot, "site/src/content/chapters/ru/37-incremental-attention.mdx"),
      ),
    ).toBe(true);
    const normalizedRussianLesson = russianLessonSource.replace(/\s+/g, " ");
    for (const source of russianLesson.history.llm_evolution.sources) {
      expect(russianLessonSource).toContain(source.source_url);
      expect(normalizedRussianLesson).toContain(source.claim);
    }
    expect(russianLessonSource.match(/chapter-section:/g)).toHaveLength(8);
    expect(russianLessonSource.match(/<RustSource\b/g)).toHaveLength(6);
    expect(russianLessonSource).toContain(
      "<IncrementalAttentionDiagram labels={diagramLabels} />",
    );
    expect(russianLessonSource).not.toMatch(
      /полно-префикс|инференс-состояни|безграфов|транзакционн|фикстур|репле|поинт|кей[- ]?велью/i,
    );

    expect(incrementalSource).toContain("region:layer-kv-cache");
    expect(incrementalSource).toContain("region:incremental-attention");
    expect(incrementalSource).toContain("LayerKvCache::new");
    expect(incrementalSource).toContain("forward_incremental");
    expect(incrementalSource).not.toContain("pub fn append");
    expect(demoSource).toContain("region:historical-kv-contrast");
    expect(demoSource).toContain("region:cache-errors");
    expect(demoSource).toContain("region:cache-step");
    expect(demoSource).toContain("INCREMENTAL_ATTENTION_TRACE_V1");
    expect(demoSource).toContain("rope_positions_mismatch_rejected");
  });
});
