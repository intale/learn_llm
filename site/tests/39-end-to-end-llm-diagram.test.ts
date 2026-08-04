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
const contractSource = read("curriculum/chapters/39-end-to-end-llm.md");
const englishLessonSource = read(
  "site/src/content/chapters/en/39-end-to-end-llm.mdx",
);
const russianLessonSource = read(
  "site/src/content/chapters/ru/39-end-to-end-llm.mdx",
);
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
    targets: "targets",
    decoderLoss: "decoder loss",
    bigramLoss: "bigram loss",
    gap: "gap",
    bytes: "bytes",
    records: "records",
    logitProbe: "logit probe",
    prompt: "prompt",
    sampling: "sampling",
    generated: "generated",
    decoded: "decoded",
    generationWork: "generation work",
    attentionScores: "attention scores",
  },
  cues: {
    trainingOnly: "training only",
    candidate: "candidate",
    selected: "selected",
    oneTime: "one time",
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
    expect(trace.test).toMatchObject({
      access: "1",
      documents: ["en-winter-window", "ru-winter-window"],
      windows: "436",
      batches: "4",
      targets: "1744",
      fingerprint: "fnv1a64:77b836869f848986",
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
      targets: "1744",
      bigram_context: "1",
      decoder_context: "4",
      bigram: "3.981342714",
      decoder: "3.866087547",
      gap: "0.115255167",
    });
  });

  it.each([
    ["wrong header", fixture.replace("END_TO_END_LLM_TRACE_V2", "TRACE_V3")],
    ["test opened twice", fixture.replace("TEST|access=1", "TEST|access=2")],
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
      fixture.replace("|decoder_context=4", "|decoder_context=5"),
    ],
    ["loss gap differs", fixture.replace("gap=0.115255167", "gap=0.215255167")],
    [
      "unknown stop reason",
      fixture.replace("stop=token-limit", "stop=unknown"),
    ],
    [
      "invalid generated text",
      fixture.replace(/text="[^"]*"/, "text=not-json"),
    ],
    [
      "target arithmetic differs",
      fixture.replace("|targets=1744", "|targets=1743"),
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
});

describe("Chapter 39 diagram labels and component contract", () => {
  it("accepts a complete localized label set and rejects nested blanks", () => {
    expect(() => validateEndToEndLlmDiagramLabels(labels)).not.toThrow();
    const blank = cloneLabels();
    blank.fields.decoderLoss = " ";
    expect(() => validateEndToEndLlmDiagramLabels(blank)).toThrow(
      /decoderLoss/,
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
    expect(component).toContain("parseEndToEndLlmTrace(traceSource)");
    expect(component).toContain("validateEndToEndLlmDiagramLabels(labels)");
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

describe("Chapter 39 bilingual lesson and evidence contract", () => {
  it("publishes one exact revision-3 English/Russian lesson set", () => {
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
      content_revision: 3,
      order: 39,
    });
    expect(contract.translation_notes.join(" ")).toContain(
      "exact active locale set is {en, ru}",
    );
    expect(contract.translation_notes.join(" ")).toContain(
      "direct, meaning-first refresh of frozen English revision 3",
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
      content_revision: 3,
      order: contract.order,
      concept_id: contract.concept_id,
      title: "Run the whole tiny LLM",
      description:
        "Trace a tiny decoder-only language model in Rust from frozen bilingual splits and training-only BPE through validation-selected training, selection-isolated final evaluation, exact checkpoint reload, and KV-cached generation.",
    });
    expect(lessons.ru).toMatchObject({
      chapter_id: contract.chapter_id,
      locale: "ru",
      content_revision: 3,
      order: contract.order,
      concept_id: contract.concept_id,
      title: "Запустите небольшую LLM целиком",
      description:
        "Проследите полный процесс работы небольшой декодерной языковой модели на Rust: от зафиксированного разбиения двуязычного корпуса и обучения BPE только по обучающей выборке до выбора состояния по валидации, последующей итоговой оценки выбранного состояния, точного восстановления из контрольной точки и генерации с KV-кэшем.",
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
      `test=access:${trace.test.access} documents:[${trace.test.documents.join(",")}] windows:${trace.test.windows} batches:${trace.test.batches} targets:${trace.test.targets} fingerprint:${trace.test.fingerprint} decoder:${trace.test.decoder} bigram:${trace.test.bigram} gap:${trace.test.gap} decoder_wins:${trace.test.decoder_wins} no_grad:${trace.test.no_grad} unchanged:${trace.test.unchanged}`,
      `checkpoint=bytes:${trace.checkpoint.bytes} header:${trace.checkpoint.header} records:${trace.checkpoint.records} checksum:${trace.checkpoint.checksum} selected:${trace.checkpoint.selected} optimizer:${trace.checkpoint.optimizer} rng:${trace.checkpoint.rng} bytes_roundtrip:${trace.checkpoint.bytes_roundtrip} model_bits_exact:${trace.checkpoint.model_bits_exact} optimizer_bits_exact:${trace.checkpoint.optimizer_bits_exact} tokenizer_exact:${trace.checkpoint.tokenizer_exact} logit_probe:${trace.checkpoint.logit_probe} logit_probe_ids:[${trace.checkpoint.logit_probe_ids.join(",")}] prompt_logits_bitwise:${trace.checkpoint.prompt_logits_bitwise}`,
      `generation=prompt:${trace.generation.prompt} prompt_ids:[${trace.generation.prompt_ids.join(",")}] temperature:${trace.generation.temperature} top_k:${trace.generation.top_k} seed:${trace.generation.seed} generated:[${trace.generation.generated.join(",")}] text:${JSON.stringify(trace.generation.text)} prefixes:[${trace.generation.prefixes.join(",")}] stop:${trace.generation.stop} prefill:${trace.generation.prefill} decode:${trace.generation.decode} final_cache:${trace.generation.final_cache} cached_scores:${trace.generation.cached_scores} calculated_complete_prefix_scores:${trace.generation.calculated_complete_prefix_scores} rng_initial:${trace.generation.rng_initial} rng_final:${trace.generation.rng_final} tokens_exact:${trace.generation.tokens_exact} decisions_bitwise:${trace.generation.decisions_bitwise} rng_exact:${trace.generation.rng_exact}`,
      `history=targets:${trace.history.targets} bigram_context:${trace.history.bigram_context} decoder_context:${trace.history.decoder_context} bigram:${trace.history.bigram} decoder:${trace.history.decoder} gap:${trace.history.gap}`,
    ]);
    expect(reportLines.at(-1)).toBe(
      "next=inspect, modify, test, and extend the complete decoder",
    );
    expect(fixture).toMatch(/END\|next=student-owned-decoder\r?\n$/);
  });

  it("renders shared formulas and localized diagram accessibility copy explicitly", () => {
    const contract = frontmatter(contractSource);
    const lessonSources = {
      en: englishLessonSource,
      ru: russianLessonSource,
    };
    const accessibleDiagramText = {
      en: [
        'title: "Keep evidence one-way from text to generated text"',
        'description: "Follow frozen Rust evidence through training-only BPE, selection, test, exact reload, and cached generation."',
        'decodedText: "Cyrillic т followed by two generated spaces"',
        'spaceMarker: "Each ␠ marks one generated space."',
        'pipeline: "Numbers give executable order. Double borders mark training-only input, validation selection, the local one-use test gate, and exact replay boundaries."',
      ],
      ru: [
        'title: "Поздние результаты не меняют ранние этапы"',
        'description: "Проследите в программе на Rust обучение BPE только по обучающей выборке, выбор состояния, итоговую оценку, точное восстановление и генерацию с кэшем."',
        'decodedText: "кириллическая т и два сгенерированных пробела"',
        'spaceMarker: "␠ — сгенерированный пробел."',
        'evaluationBatches: "Мини-пакеты оценки по выборкам"',
        'generationWork: "Префиксы / порядок прямых проходов"',
        'attentionScores: "Ячейки оценок: кэш / полный пересчёт"',
        'cachedMatch: "решения с кэшем и полным пересчётом префикса совпадают"',
        'pipeline: "Числа задают порядок; двойные рамки — обучение без контрольных выборок, выбор по валидации, однократная оценка и точное воспроизведение."',
      ],
    };

    for (const locale of ["en", "ru"] as const) {
      const source = lessonSources[locale].replace(/\r\n/g, "\n");
      const body = source.replace(/^---\n[\s\S]*?\n---\n/, "");
      expect(body).toContain(`$$\n${contract.formula.latex}\n$$`);
      expect(body).toContain(
        "$$\nN_{\\mathrm{test}}=W_{\\mathrm{test}}C=436\\cdot4=1744.\n$$",
      );
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
