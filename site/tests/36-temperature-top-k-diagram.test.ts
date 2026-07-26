// @ts-ignore Node APIs are available in the Vitest runner.
import { existsSync, readFileSync } from "node:fs";
// @ts-ignore Node APIs are available in the Vitest runner.
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  parseTemperatureTopKTrace,
  validateTemperatureTopKDiagramLabels,
  type TemperatureTopKDiagramLabels,
} from "../src/lib/temperature-top-k-diagram";

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), "..");
const read = (path: string) =>
  readFileSync(resolve(repositoryRoot, path), "utf8");
const fixture = read("rust/demos/ch36-temperature-top-k/diagram-trace.txt");
const expectedOutput = read("rust/demos/ch36-temperature-top-k/expected.txt");
const parserSource = read("site/src/lib/temperature-top-k-diagram.ts");
const componentSource = read(
  "site/src/components/chapters/TemperatureTopKDiagram.astro",
);
const contractSource = read("curriculum/chapters/36-temperature-top-k.md");
const lessonSource = read(
  "site/src/content/chapters/en/36-temperature-top-k.mdx",
);
const coursePlanSource = read("curriculum/course-plan.md");
const generationSource = read(
  "rust/crates/llm-from-scratch/src/generation/sampling.rs",
);
const demoSource = read("rust/demos/ch36-temperature-top-k/src/lib.rs");

function frontmatter(source: string) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error("missing JSON frontmatter");
  return JSON.parse(match[1]);
}

const labels: TemperatureTopKDiagramLabels = {
  title: "title",
  description: "description",
  sections: {
    temperature: "temperature",
    topK: "top-k",
    draws: "draws",
    generation: "generation",
  },
  temperatures: {
    cold: "cold",
    neutral: "neutral",
    warm: "warm",
  },
  fixtures: {
    synthetic: "synthetic fixture",
    checkpoint: "checkpoint fixture",
  },
  fields: {
    token: "token",
    logit: "logit",
    rank: "rank",
    status: "status",
    probability: "probability",
    draw: "draw",
    interval: "interval",
    selectedToken: "selected token",
  },
  cues: {
    retained: "retained",
    removed: "removed",
    selected: "selected",
    greedy: "greedy",
    noDraw: "no draw",
    replayed: "replayed",
    contextStop: "context stop",
    eosStop: "EOS stop",
    validErrors: "valid errors",
  },
  captions: {
    temperature: "temperature caption",
    topK: "top-k caption",
    draws: "draw caption",
    generation: "generation caption",
  },
  proofs: {
    greedy: "greedy proof",
    loaded: "loaded proof",
    eos: "EOS proof",
    errors: "error proof",
  },
  scrollers: {
    topK: "top-k scroller",
  },
};

describe("Chapter 36 Rust trace parser", () => {
  it("preserves exact temperature, tied-boundary, draw, and generation evidence", () => {
    const trace = parseTemperatureTopKTrace(fixture);
    expect(trace.input).toEqual({
      logits: "[0.000000,1.000000,1.000000,2.000000]",
      vocabulary: "4",
    });
    expect(trace.temperatures.map(({ tau }) => tau)).toEqual([
      "0.500000",
      "1.000000",
      "2.000000",
    ]);
    expect(trace.temperatures[0].tokens[3]).toMatchObject({
      id: "3",
      rank: "1",
      probability: "0.775803492574",
      percent: "77.580349",
    });
    expect(trace.temperatures[2].tokens[3].probability).toBe(
      "0.387455619000",
    );
    expect(trace.topK.summary).toMatchObject({
      tau: "1.000000",
      top_k: "2",
      survivors: "[3,1]",
      tie_keep: "1",
      tie_remove: "2",
    });
    expect(trace.topK.tokens.map(({ retained }) => retained)).toEqual([
      "false",
      "true",
      "false",
      "true",
    ]);
    expect(trace.drawPolicy).toEqual({
      tau: "1.000000",
      top_k: "3",
      seed: "36",
      survivors: "[3,1,2]",
      sum: "1.000000000000",
      vocabulary: "4",
    });
    expect(trace.draws.map(({ token }) => token)).toEqual([
      "3",
      "2",
      "2",
      "2",
      "3",
      "3",
      "3",
      "3",
    ]);
    expect(trace.draws[1]).toMatchObject({
      unit: "0.338833394523",
      interval_start: "0.211941557617",
      interval_end: "0.423883115234",
      token: "2",
    });
    expect(trace.greedy).toMatchObject({
      token: "3",
      draw: "none",
      rng_advanced: "false",
    });
    expect(trace.loaded).toMatchObject({
      vocabulary: "5",
      context: "2",
      eos: "none",
      max_new_tokens: "4",
      prompt: "[0]",
      generated: "[4,4]",
      prefixes: "[1,2]",
      stop: "context-limit",
      calls: "2",
      replay: "true",
    });
    expect(trace.eos).toMatchObject({
      vocabulary: "5",
      context: "2",
      eos: "4",
      max_new_tokens: "4",
      generated: "[4]",
      stop: "eos",
      calls: "1",
    });
    expect(Object.values(trace.errors).every((value) => value === "true")).toBe(true);
    expect(Object.values(trace.history).every((value) => value === "true")).toBe(true);
  });

  it("rejects structural and semantic mutations before frozen fixture equality", () => {
    for (const changed of [
      fixture.replace("tie_keep=1", "tie_keep=2"),
      fixture.replace("retained=false", "retained=true"),
      fixture.replace("top_k=3|seed=36", "top_k=2|seed=36"),
      fixture.replace("unit=0.338833394523", "unit=0.900000000000"),
      fixture.replace("draw=none", "draw=0.000000000000"),
      fixture.replace("stop=context-limit", "stop=eos"),
      fixture.replace("rng_unchanged=true", "rng_unchanged=false"),
      fixture.slice(0, -1),
      fixture + "\n",
      fixture.replace(/\n/g, "\r\n"),
    ]) {
      expect(() => parseTemperatureTopKTrace(changed)).toThrow(
        /invalid temperature-top-k trace/,
      );
    }
    const lines = fixture.slice(0, -1).split("\n");
    for (const index of lines.keys()) {
      const changed = [...lines];
      changed[index] += "|tampered=true";
      expect(() =>
        parseTemperatureTopKTrace(changed.join("\n") + "\n"),
      ).toThrow(/invalid temperature-top-k trace/);
    }
  });

  it("requires every localized label and rejects blank, missing, or extra leaves", () => {
    expect(() => validateTemperatureTopKDiagramLabels(labels)).not.toThrow();
    expect(() =>
      validateTemperatureTopKDiagramLabels({ ...labels, title: "" }),
    ).toThrow(/labels\.title/);
    expect(() =>
      validateTemperatureTopKDiagramLabels({
        ...labels,
        cues: { ...labels.cues, extra: "extra" },
      } as unknown as TemperatureTopKDiagramLabels),
    ).toThrow(/cues has unexpected keys/);
    const missing = {
      ...labels,
      fields: { ...labels.fields },
    } as unknown as Record<string, unknown>;
    delete (missing.fields as Record<string, unknown>).interval;
    expect(() =>
      validateTemperatureTopKDiagramLabels(
        missing as unknown as TemperatureTopKDiagramLabels,
      ),
    ).toThrow(/fields has unexpected keys/);
  });
});

describe("Chapter 36 static diagram and content boundary", () => {
  it("projects one Rust-authored figure without scripts or sampling arithmetic", () => {
    expect(componentSource).toContain(
      "../../../../rust/demos/ch36-temperature-top-k/diagram-trace.txt?raw",
    );
    expect(componentSource).toContain("parseTemperatureTopKTrace(traceSource)");
    expect(componentSource).toContain(
      'data-visualization-id="temperature-top-k"',
    );
    expect(componentSource).toContain('data-diagram-style="course-v1"');
    expect(componentSource).not.toMatch(/<script|client:|<dialog/i);
    expect(componentSource).not.toMatch(/<(?:svg|canvas|path|polyline|line)\b/i);
    expect(componentSource).not.toMatch(/(?:softmax|sample_next_token|generate_uncached)\s*\(/i);
    expect(parserSource).not.toMatch(/Math\.(?:exp|log)|\.reduce\s*\(/);
    expect(componentSource.match(/<figure\b/g)).toHaveLength(1);
    expect(componentSource.match(/<figcaption\b/g)).toHaveLength(1);
    expect(componentSource.match(/data-diagram-scroll/g)).toHaveLength(1);
    expect(componentSource.match(/course-diagram__scroll/g)).toHaveLength(1);
    expect(componentSource.match(/role="region"/g)).toHaveLength(1);
    expect(componentSource.match(/tabindex="0"/g)).toHaveLength(2);
    expect(componentSource).toContain("trace.temperatures.map");
    expect(componentSource).toContain("trace.topK.tokens.map");
    expect(componentSource).toContain("trace.drawPolicy");
    expect(componentSource).toContain("trace.draws.map");
    expect(componentSource.match(/data-diagram-box/g)).toHaveLength(5);
    expect(componentSource.match(/data-diagram-table/g)).toHaveLength(1);
    expect(componentSource.match(/<caption>/g)).toHaveLength(1);
    expect(componentSource).toContain('scope="row"');
    expect(componentSource).toContain('scope="col"');
    expect(componentSource).toContain("border-inline-start-style: double");
    expect(componentSource).toContain("border-inline-start-style: dashed");
    expect(componentSource).toContain(
      "border-block-end: 0.2rem solid currentColor",
    );
    expect(componentSource).toContain(
      "border-block-end: 0.5rem double currentColor",
    );
    expect(componentSource).not.toMatch(/\.probability-(?:track|fill)[\s\S]*?background\s*:/);
    expect(componentSource).toContain("trace.errors.nonfinite_logit");
    expect(componentSource).toContain("data-eos-policy={trace.loaded.eos}");
    expect(componentSource).toContain("data-eos-policy={trace.eos.eos}");
    expect(componentSource).toContain("@container course-diagram");
    expect(componentSource).not.toMatch(/@media\s*\(/);
    expect(componentSource).not.toMatch(/overflow-x\s*:/);
    expect(componentSource).not.toMatch(/overflow\s*:\s*(?:hidden|clip)/);
    expect(componentSource).not.toMatch(/(?:border-radius|outline)\s*:/);
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
      "q_i^{(\\tau,k)}=\\frac{\\mathbf{1}[i\\in K_k]\\exp(\\ell_i/\\tau)}{\\sum_j\\mathbf{1}[j\\in K_k]\\exp(\\ell_j/\\tau)}",
    );
    expect(contract.content_revision).toBe(1);
    expect(lesson.content_revision).toBe(1);

    const normalizedLesson = lessonSource.replace(/\s+/g, " ");
    for (const source of lesson.history.llm_evolution.sources) {
      expect(lessonSource).toContain(source.source_url);
      expect(normalizedLesson).toContain(source.claim);
    }
    expect(lessonSource.match(/chapter-section:/g)).toHaveLength(8);
    expect(lessonSource.match(/<RustSource\b/g)).toHaveLength(5);
    expect(lessonSource).toContain(
      "<TemperatureTopKDiagram labels={diagramLabels} />",
    );
    expect(normalizedLesson).toContain(
      "not a universal quality guarantee, a hallucination defense, or the endpoint of decoding research",
    );
    expect(lessonSource).not.toMatch(/TypeScript (?:validates|performs|computes)/);
    expect(
      existsSync(
        resolve(repositoryRoot, "site/src/content/chapters/ru/36-temperature-top-k.mdx"),
      ),
    ).toBe(false);

    expect(generationSource).toContain("region:sampling-policy");
    expect(generationSource).toContain("region:uncached-generation");
    expect(generationSource).toContain("SamplingMode::Greedy");
    expect(generationSource).toContain("TemperatureTopK");
    expect(demoSource).toContain("region:historical-decoding-contrast");
    expect(demoSource).toContain("region:learner-evidence");
    expect(demoSource).toContain("TEMPERATURE_TOP_K_TRACE_V1");
  });
});
