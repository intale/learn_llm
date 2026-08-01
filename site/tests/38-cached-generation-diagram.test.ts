// @ts-ignore Node APIs are available in the Vitest runner.
import { existsSync, readFileSync } from "node:fs";
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
const expectedOutput = read("rust/demos/ch38-cached-generation/expected.txt");
const parserSource = read("site/src/lib/cached-generation-diagram.ts");
const componentSource = read(
  "site/src/components/chapters/CachedGenerationDiagram.astro",
);
const contractSource = read("curriculum/chapters/38-cached-generation.md");
const lessonSource = read(
  "site/src/content/chapters/en/38-cached-generation.mdx",
);
const russianLessonSource = read(
  "site/src/content/chapters/ru/38-cached-generation.mdx",
);
const chapterLocaleConfiguration = JSON.parse(
  read("site/src/i18n/chapter-locales.json"),
);

function frontmatter(source: string) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error("missing JSON frontmatter");
  return JSON.parse(match[1]);
}

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
    expect(trace.prefill.match.cachedScores).toBe("12");
    expect(trace.prefill.match.completePrefixScores).toBe("16");

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
    expect(trace.decode.match.cachedScores).toBe("12");
    expect(trace.decode.match.completePrefixScores).toBe("36");

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
      contextCapacity: "2",
      rngState: "0x9e3779b97f4a7c38",
      prompt: ["0"],
      generated: ["4", "4"],
      text: "44",
      prefixes: ["1", "2"],
      stop: "context-limit",
      finalCache: "2",
      prefillTokens: "1",
      decodeTokens: "1",
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
    expect(trace.history).toEqual({
      lanes: "4",
      cachedLengths: ["1", "2", "3"],
      cachedScores: "24",
      completePrefixLengths: ["2", "3"],
      completePrefixScores: "52",
      avoidedScores: "28",
    });
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
      fixture.replace("cached_scores=12", "cached_scores=13"),
      fixture.replace("complete_prefix_scores=16", "complete_prefix_scores=15"),
      fixture.replace("token=2|position=2", "token=2|position=3"),
      fixture.replace("formula_cached=4*(1+2+3)", "formula_cached=24"),
      fixture.replace(
        "rng_state=0x9e3779b97f4a7c38",
        "rng_state=0X9E3779B97F4A7C38",
      ),
      fixture.replace("stop=context-limit", "stop=token-limit"),
      fixture.replace("context_capacity=2", "context_capacity=3"),
      fixture.replace("prefill_tokens=1", "prefill_tokens=2"),
      fixture.replace("decode_tokens=1", "decode_tokens=0"),
      fixture.replace("text=44", "text=four-four"),
      fixture.replace("stop=eos", "stop=token-limit"),
      fixture.replace("work_zeroed=true", "work_zeroed=false"),
      fixture.replace("rebuilt_model=true", "rebuilt_model=false"),
      fixture.replace("lanes=4", "lanes=3"),
      fixture.replace("cached_lengths=[1,2,3]", "cached_lengths=[1,3]"),
      fixture.replace(
        "complete_prefix_lengths=[2,3]",
        "complete_prefix_lengths=[1,3]",
      ),
      fixture.replace("avoided_scores=28", "avoided_scores=27"),
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
    expect(parserSource).toContain(
      'invalid("WORK counters disagree with phase evidence")',
    );
    expect(parserSource).toContain(
      'invalid("HISTORY contrast disagrees with measured work")',
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

  it("uses shared diagram roles and math rendering for tensor shapes", () => {
    expect(componentSource.match(/\sdata-diagram-card(?:\s|>)/g)).toHaveLength(
      10,
    );
    expect(componentSource.match(/\sdata-diagram-box(?:\s|>)/g)).toHaveLength(
      10,
    );
    expect(componentSource).toContain("course-diagram__grid");
    expect(componentSource).toContain("course-diagram__card-stack");
    expect(componentSource).toContain("course-diagram__card-heading");
    expect(componentSource).toContain(
      "trace.prefill.cacheShape.join(',')}\\\\right]",
    );
    expect(componentSource).toContain(
      "trace.decode.cacheShape.join(',')}\\\\right]",
    );
    expect(componentSource).not.toMatch(/overflow:\s*(?:hidden|clip)/);
  });
});

describe("Chapter 38 lesson localization contract", () => {
  it("keeps both active lessons semantically aligned with revision 2", () => {
    const contract = frontmatter(contractSource);
    const lessons = {
      en: frontmatter(lessonSource),
      ru: frontmatter(russianLessonSource),
    };
    const lessonSources = {
      en: lessonSource,
      ru: russianLessonSource,
    };
    const activeChapter = chapterLocaleConfiguration.chapters.find(
      ({ chapterId }: { chapterId: string }) =>
        chapterId === "38-cached-generation",
    );

    expect(activeChapter).toEqual({
      chapterId: "38-cached-generation",
      order: 38,
      activeLocales: ["en", "ru"],
    });
    expect(contract.content_revision).toBe(2);
    expect(contract.rust.expected_output).toBe(expectedOutput);
    expect(contract.translation_notes.join(" ")).toContain(
      "exact active locale set is {en, ru}",
    );

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
      const localeKeys = Object.keys(localized).filter(
        (key) => key !== "symbol",
      );
      expect(localeKeys).toEqual(["en", "ru"]);
    }
    for (const term of contract.terminology) {
      expect(Object.keys(term)).toEqual(["concept_id", "en", "ru"]);
    }

    for (const locale of ["en", "ru"] as const) {
      const lesson = lessons[locale];
      const source = lessonSources[locale];
      const localized = (value: Record<"en" | "ru", string>) => value[locale];

      expect(lesson).toMatchObject({
        chapter_id: contract.chapter_id,
        locale,
        content_revision: 2,
        order: contract.order,
        concept_id: contract.concept_id,
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
      expect(lesson.history.approach).toBe(
        localized(contract.history.approach),
      );
      expect(lesson.history.summary).toBe(localized(contract.history.summary));
      expect(lesson.history.llm_evolution).toEqual({
        predecessor_kind: contract.history.llm_evolution.predecessor_kind,
        limitation: localized(contract.history.llm_evolution.limitation),
        later_advance: localized(contract.history.llm_evolution.later_advance),
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

      expect(source.match(/chapter-section:/g)).toHaveLength(8);
      expect(source.match(/<RustSource\b/g)).toHaveLength(6);
      expect(source.match(/<CachedGenerationDiagram\b/g)).toHaveLength(1);
      expect(source).toContain(
        "<CachedGenerationDiagram labels={diagramLabels} />",
      );

      const lessonBody = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
      const normalizedBody = lessonBody.replace(/\s+/g, " ");
      for (const historySource of lesson.history.llm_evolution.sources) {
        expect(lessonBody).toContain(historySource.source_url);
        expect(normalizedBody).toContain(historySource.claim);
      }
      expect(lessonBody).not.toMatch(
        /build instructions|authoring contract|test requirements|framework constraints|deployment constraints|presentation implementation/i,
      );
      expect(source).not.toMatch(/Ã|â|�/);
    }

    expect(
      existsSync(
        resolve(
          repositoryRoot,
          "site/src/content/chapters/ru/38-cached-generation.mdx",
        ),
      ),
    ).toBe(true);
    expect(russianLessonSource).not.toMatch(
      /кэшированн\w* генерац|промпт-фаз|репле(?:й|я)|однотокенн\w* декод|паритет генерац|рандомн\w* вытяж|останавливающ\w* поведен|интерфейсы с явными прежними|согласованн\w* фиксаци\w* изменений|зафиксируйте весь стек|предполагаемый новый выход|путь всей модели может удерживать|измеренн\w* тензор\w* оценок внимания|два итоговых числа|Проверить девять предположений|не фиксируют изменений состояния/i,
    );
    expect(russianLessonSource).not.toMatch(
      /инструкц\w* по сборк|авторск\w* контракт|требовани\w* тест|ограничени\w* фреймворк|механик\w* презентац/i,
    );
  });
});
