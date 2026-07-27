// @ts-ignore Node APIs are available in the Vitest runner.
import { readFileSync } from "node:fs";
// @ts-ignore Node APIs are available in the Vitest runner.
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  parseCachedGenerationTrace,
  validateCachedGenerationDiagramLabels,
  type CachedGenerationDiagramLabels,
} from "../src/lib/cached-generation-diagram";

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), "..");
const read = (path: string) =>
  readFileSync(resolve(repositoryRoot, path), "utf8");
const fixture = read("rust/demos/ch38-cached-generation/diagram-trace.txt");
const parserSource = read("site/src/lib/cached-generation-diagram.ts");

const labels: CachedGenerationDiagramLabels = {
  title: "title",
  description: "description",
  sections: {
    timeline: "timeline",
    work: "work",
    generation: "generation",
    reset: "reset",
  },
  fields: {
    prompt: "prompt",
    token: "token",
    position: "position",
    cache: "cache",
    layer: "layer",
    shape: "shape",
    cached: "cached",
    completePrefix: "complete prefix",
    difference: "difference",
    scoreCells: "score cells",
    generated: "generated",
    stop: "stop",
  },
  cues: {
    prefill: "prefill",
    decode: "decode",
    distinct: "distinct",
    match: "match",
    reset: "reset",
    unchanged: "unchanged",
  },
  captions: {
    timeline: "timeline caption",
    work: "work caption",
    generation: "generation caption",
    reset: "reset caption",
  },
  proofs: {
    cache: "cache proof",
    reference: "reference proof",
    loaded: "loaded proof",
    eos: "eos proof",
  },
};

const cloneLabels = () =>
  JSON.parse(JSON.stringify(labels)) as CachedGenerationDiagramLabels;

describe("Chapter 38 Rust trace parser", () => {
  it("preserves exact model-wide cache, reference, work, and generation evidence", () => {
    const trace = parseCachedGenerationTrace(fixture);
    expect(trace.config).toEqual({
      layers: "2",
      heads: "2",
      model_width: "4",
      head_width: "2",
      capacity: "4",
      tolerance: "0.000000000002",
    });
    expect(trace.prefill).toMatchObject({
      prompt: ["0", "1"],
      cacheBefore: "0",
      cacheAfter: "2",
      positions: ["0", "1"],
      layerLengths: ["2", "2"],
      cacheShape: ["1", "2", "2", "2"],
    });
    expect(trace.prefill.layers).toEqual([
      {
        phase: "prefill",
        layer: "0",
        cacheLen: "2",
        shape: ["1", "2", "2", "2"],
        storage: "distinct",
      },
      {
        phase: "prefill",
        layer: "1",
        cacheLen: "2",
        shape: ["1", "2", "2", "2"],
        storage: "distinct",
      },
    ]);
    expect(trace.prefill.match.cached).toEqual([
      "1.768374438",
      "0.208825256",
      "1.056205728",
      "-0.451857108",
      "0.388467944",
    ]);
    expect(trace.prefill.match.cached).toEqual(
      trace.prefill.match.completePrefix,
    );
    expect(trace.prefill.match.maxAbsDiff).toBe("0.000000000000");

    expect(trace.decode).toMatchObject({
      token: "2",
      position: "2",
      cacheBefore: "2",
      cacheAfter: "3",
      layerLengths: ["3", "3"],
      cacheShape: ["1", "2", "3", "2"],
    });
    expect(
      trace.decode.layers.map(({ layer, cacheLen, storage }) => ({
        layer,
        cacheLen,
        storage,
      })),
    ).toEqual([
      { layer: "0", cacheLen: "3", storage: "distinct" },
      { layer: "1", cacheLen: "3", storage: "distinct" },
    ]);
    expect(trace.decode.match.cached).toEqual(
      trace.decode.match.completePrefix,
    );
    expect(trace.decode.match.maxAbsDiff).toBe("0.000000000000");

    expect(trace.work).toEqual({
      prefillTokens: "2",
      decodeTokens: "1",
      layerCaches: "2",
      cacheAppends: "6",
      qkvRows: "18",
      cachedScores: "24",
      completePrefixScores: "52",
      formulaCached: "4*(1+2+3)",
      formulaComplete: "4*(2^2+3^2)",
    });
    expect(trace.loaded).toEqual({
      checkpointBytes: "6330",
      rngState: "0x9e3779b97f4a7c38",
      prompt: ["0"],
      generated: ["4", "4"],
      text: "44",
      prefixes: ["1", "2"],
      stop: "context-limit",
      finalCache: "2",
      cachedScores: "6",
      completePrefixScores: "10",
      tokensMatch: "true",
      rngMatch: "true",
    });
    expect(trace.eos).toEqual({
      token: "4",
      generated: ["4"],
      stop: "eos",
      finalCache: "1",
      decodeTokens: "0",
      tokensMatch: "true",
      rngMatch: "true",
    });
    expect(trace.reset).toEqual({
      before: "3",
      after: "0",
      allocation_reused: "true",
      storage_unchanged: "true",
      work_zeroed: "true",
      replay_identical: "true",
    });
    expect(Object.values(trace.errors).every((value) => value === "true")).toBe(
      true,
    );
    expect(
      Object.values(trace.history).every((value) => value === "true"),
    ).toBe(true);
    expect(trace.next).toBe("end-to-end-llm");
  });

  it("rejects order, canonical-lexeme, semantic, and exact-byte mutations", () => {
    const mutations = [
      fixture.replace(
        "CACHED_GENERATION_TRACE_V1",
        "CACHED_GENERATION_TRACE_V2",
      ),
      fixture.replace("layers=2", "layers=02"),
      fixture.replace("tolerance=0.000000000002", "tolerance=2e-12"),
      fixture.replace("prompt=[0,1]", "prompt=[0, 1]"),
      fixture.replace("cache_after=2", "cache_after=3"),
      fixture.replace("positions=[0,1]", "positions=[1,0]"),
      fixture.replace("phase=prefill|layer=0", "phase=decode|layer=0"),
      fixture.replace("layer=1|cache_len=2", "layer=0|cache_len=2"),
      fixture.replace("storage=distinct", "storage=shared"),
      fixture.replace("cached=[1.768374438", "cached=[1.768374439"),
      fixture.replace(
        "max_abs_diff=0.000000000000",
        "max_abs_diff=0.000000000003",
      ),
      fixture.replace("token=2|position=2", "token=2|position=3"),
      fixture.replace("formula_cached=4*(1+2+3)", "formula_cached=24"),
      fixture.replace(
        "rng_state=0x9e3779b97f4a7c38",
        "rng_state=0X9E3779B97F4A7C38",
      ),
      fixture.replace("stop=context-limit", "stop=token-limit"),
      fixture.replace("text=44", "text=four-four"),
      fixture.replace("stop=eos", "stop=token-limit"),
      fixture.replace("work_zeroed=true", "work_zeroed=false"),
      fixture.replace("rebuilt_model=true", "rebuilt_model=false"),
      fixture.replace("paging_deferred=true", "paging_deferred=false"),
      fixture.replace("next=end-to-end-llm", "next=wrong-boundary"),
      fixture.replace(
        "PREFILL|prompt=[0,1]",
        "PREFILL|prompt=[0,1]|prompt=[0,1]",
      ),
      fixture.replace("cache_before=0", "Cache_before=0"),
      fixture.replace("\nPREFILL|", "\nDECODE|"),
      fixture.slice(0, -1),
      fixture + "\n",
      fixture.replace(/\n/g, "\r\n"),
      "\uFEFF" + fixture,
    ];
    for (const changed of mutations) {
      expect(() => parseCachedGenerationTrace(changed)).toThrow(
        /invalid cached-generation trace/,
      );
    }

    const frozenButStructurallyValid = fixture
      .replace(
        "cached=[0.032908910,-0.679583624,1.408381841,0.525525421,-0.588014095]",
        "cached=[0.132908910,-0.679583624,1.408381841,0.525525421,-0.588014095]",
      )
      .replace(
        "complete_prefix=[0.032908910,-0.679583624,1.408381841,0.525525421,-0.588014095]",
        "complete_prefix=[0.132908910,-0.679583624,1.408381841,0.525525421,-0.588014095]",
      );
    expect(() =>
      parseCachedGenerationTrace(frozenButStructurallyValid),
    ).toThrow(/frozen Rust fixture/);
  });

  it("rejects an extra field on every one of the 17 frozen lines", () => {
    const lines = fixture.slice(0, -1).split("\n");
    expect(lines).toHaveLength(17);
    for (const index of lines.keys()) {
      const changed = [...lines];
      changed[index] += "|extra=true";
      expect(() =>
        parseCachedGenerationTrace(changed.join("\n") + "\n"),
      ).toThrow(/invalid cached-generation trace/);
    }
  });

  it("validates structure without implementing decoder or score arithmetic", () => {
    expect(parserSource).not.toMatch(/Math\.(?:exp|log|pow)|\.reduce\s*\(/);
    expect(parserSource).not.toMatch(
      /(?:softmax|forward|attention|matmul)\s*\(/i,
    );
    expect(parserSource).toContain(
      'formulaCached: required(workFields, "formula_cached")',
    );
    expect(parserSource).toContain(
      'formulaComplete: required(workFields, "formula_complete")',
    );
  });
});

describe("Chapter 38 diagram label contract", () => {
  it("requires every localized label and rejects blank, missing, or extra leaves", () => {
    expect(() => validateCachedGenerationDiagramLabels(labels)).not.toThrow();

    for (const topLevel of ["title", "description"] as const) {
      const changed = cloneLabels() as unknown as Record<string, unknown>;
      changed[topLevel] = "";
      expect(() =>
        validateCachedGenerationDiagramLabels(
          changed as unknown as CachedGenerationDiagramLabels,
        ),
      ).toThrow(new RegExp("labels\\." + topLevel));
    }

    for (const groupName of [
      "sections",
      "fields",
      "cues",
      "captions",
      "proofs",
    ] as const) {
      const group = labels[groupName] as Readonly<Record<string, string>>;
      for (const key of Object.keys(group)) {
        const blank = cloneLabels() as unknown as Record<string, unknown>;
        (blank[groupName] as Record<string, unknown>)[key] = "";
        expect(() =>
          validateCachedGenerationDiagramLabels(
            blank as unknown as CachedGenerationDiagramLabels,
          ),
        ).toThrow(new RegExp("labels\\." + groupName + "\\." + key));

        const missing = cloneLabels() as unknown as Record<string, unknown>;
        delete (missing[groupName] as Record<string, unknown>)[key];
        expect(() =>
          validateCachedGenerationDiagramLabels(
            missing as unknown as CachedGenerationDiagramLabels,
          ),
        ).toThrow(new RegExp("labels\\." + groupName + " has unexpected keys"));
      }

      const extra = cloneLabels() as unknown as Record<string, unknown>;
      (extra[groupName] as Record<string, unknown>).extra = "extra";
      expect(() =>
        validateCachedGenerationDiagramLabels(
          extra as unknown as CachedGenerationDiagramLabels,
        ),
      ).toThrow(new RegExp("labels\\." + groupName + " has unexpected keys"));
    }

    const extraTopLevel = {
      ...labels,
      extra: "extra",
    } as unknown as CachedGenerationDiagramLabels;
    expect(() => validateCachedGenerationDiagramLabels(extraTopLevel)).toThrow(
      /labels has unexpected keys/,
    );
  });
});
