// @ts-ignore Node APIs are available in the Vitest runner.
import { createHash } from "node:crypto";
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
const russianLessonSource = read(
  "site/src/content/chapters/ru/34-final-evaluation.mdx",
);
const coursePlanSource = read("curriculum/course-plan.md");
const evaluationSource = read(
  "rust/crates/llm-from-scratch/src/evaluation.rs",
);
const bigramSource = read("rust/crates/llm-from-scratch/src/bigram.rs");
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

function chapterSection(source: string, id: string) {
  const marker = `{/* chapter-section:${id} */}`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`missing chapter section ${id}`);
  const contentStart = start + marker.length;
  const next = source.indexOf("{/* chapter-section:", contentStart);
  return source.slice(contentStart, next < 0 ? source.length : next);
}

function diagramLabelsFromLesson(
  source: string,
): FinalEvaluationDiagramLabels {
  const match = source.match(/export const diagramLabels = (\{[\s\S]*?\n\});/);
  if (!match) throw new Error("missing diagramLabels object");
  return Function(
    `"use strict"; return (${match[1]});`,
  )() as FinalEvaluationDiagramLabels;
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
  roles: {
    train: "training",
    validation: "validation",
    none: "not selected",
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
      gate_openings_before: "0",
      gate_openings_after: "1",
    });
    expect(trace.gate).toEqual({
      selection_test_partition_rejected: "true",
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
    });
    expect(trace.proof).toMatchObject({
      token_weighted: "true",
      provenance_assertions_match: "true",
      graph_nodes: "0",
      parameters_unchanged: "true",
      gradients_unchanged: "true",
      selection_closed: "true",
    });
  });

  it("rejects every structural or semantic mutation before frozen fixture equality", () => {
    for (const changed of [
      fixture.replace("gate_openings_after=1", "gate_openings_after=2"),
      fixture.replace(
        "selection_test_partition_rejected=true",
        "selection_test_partition_rejected=false",
      ),
      fixture.replace("targets=24", "targets=23"),
      fixture.replace("selected_by=validation", "selected_by=test"),
      fixture.replace("same_targets=true", "same_targets=false"),
      fixture.replace(
        "provenance_assertions_match=true",
        "provenance_match=true",
      ),
      fixture.replace(
        "provenance_assertions_match=true",
        "provenance_assertions_match=false",
      ),
      fixture.replace("graph_nodes=0", "graph_nodes=1"),
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
    expect(componentSource.match(/data-diagram-box/g)).toHaveLength(11);
    expect(componentSource).toContain("course-diagram__card-stack");
    expect(componentSource).toContain("course-diagram__grid");
    expect(componentSource.match(/data-diagram-table/g)).toHaveLength(1);
    expect(componentSource.match(/<table\b/g)).toHaveLength(1);
    expect(componentSource.match(/<caption>/g)).toHaveLength(1);
    expect(componentSource).toContain('scope="row"');
    expect(componentSource).toContain('scope="col"');
    for (const [section, heading] of [
      ["boundary", "final-evaluation-boundary-title"],
      ["comparison", "final-evaluation-comparison-title"],
      ["proof", "final-evaluation-proof-title"],
    ] as const) {
      expect(componentSource).toContain(
        `<section class="course-diagram__card-stack" data-diagram-box aria-labelledby="${heading}">`,
      );
      expect(componentSource).toContain(`<h4 id="${heading}">`);
      expect(componentSource).toContain(`labels.sections.${section}`);
    }
    expect(componentSource).toContain(
      "provenance_assertions_match={trace.proof.provenance_assertions_match}",
    );
    expect(componentSource).not.toContain("provenance_match=");
    expect(componentSource).toContain("border-inline-start-style: double");
    expect(componentSource).toContain(
      "repeat(auto-fit, minmax(min(100%, 20rem), 1fr))",
    );
    expect(componentSource).not.toContain(
      "repeat(auto-fit, minmax(min(100%, 13rem), 1fr))",
    );
    expect(componentSource).toMatch(
      /\.final-evaluation-diagram:fullscreen\s+\.stage-list\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\);\s*\}/,
    );
    expect(componentSource).toContain("@container course-diagram");
    expect(componentSource).not.toMatch(/@media\s*\(/);
    expect(componentSource).not.toMatch(/overflow-x\s*:/);
    expect(componentSource).not.toMatch(/overflow\s*:\s*(?:hidden|clip)/);
    expect(componentSource).not.toMatch(/(?:background|border-color|border-radius|outline)\s*:/);
  });

  it("keeps the contract, lesson, formula, source evidence, and locale policy aligned", () => {
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
    const expectedRustProjections = [
      {
        path: "rust/crates/llm-from-scratch/src/evaluation.rs",
        region: "evaluation-provenance",
      },
      {
        path: "rust/crates/llm-from-scratch/src/evaluation.rs",
        region: "inspected-test-epoch",
      },
      {
        path: "rust/crates/llm-from-scratch/src/evaluation.rs",
        region: "once-only-final-evaluation",
      },
      {
        path: "rust/demos/ch34-final-evaluation/src/lib.rs",
        region: "learner-evidence",
      },
      {
        path: "rust/crates/llm-from-scratch/src/bigram.rs",
        region: "checked-bigram-probability",
      },
      {
        path: "rust/demos/ch34-final-evaluation/src/main.rs",
        region: undefined,
      },
      {
        path: "rust/demos/ch34-final-evaluation/src/diagram_trace.rs",
        region: "final-evaluation-trace",
      },
    ];
    expect(
      lesson.rust_sources.map(
        ({ path, region }: { path: string; region?: string }) => ({ path, region }),
      ),
    ).toEqual(expectedRustProjections);
    expect(
      russianLesson.rust_sources.map(
        ({ path, region }: { path: string; region?: string }) => ({ path, region }),
      ),
    ).toEqual(
      lesson.rust_sources.map(
        ({ path, region }: { path: string; region?: string }) => ({ path, region }),
      ),
    );
    for (const localizedLabels of [englishDiagramLabels, russianDiagramLabels]) {
      expect(() =>
        validateFinalEvaluationDiagramLabels(localizedLabels),
      ).not.toThrow();
      expect(Object.keys(localizedLabels).sort()).toEqual(
        Object.keys(englishDiagramLabels).sort(),
      );
      for (const namespace of [
        "sections",
        "stages",
        "models",
        "roles",
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
    expect(englishDiagramLabels.fields).toEqual({
      model: "Model",
      fittedRole: "Asserted fit role",
      selectedBy: "Asserted selection role",
      targetCount: "Shared targets",
      totalNll: "Total NLL",
      meanLoss: "Mean test loss",
    });
    expect(russianDiagramLabels.fields).toEqual({
      model: "Модель",
      fittedRole: "Заявленная роль при обучении",
      selectedBy: "Заявленная роль при выборе",
      targetCount: "Одинаковые целевые позиции",
      totalNll: "Суммарная NLL",
      meanLoss: "Средние потери на тесте",
    });
    expect(englishDiagramLabels.roles).toEqual({
      train: "Training",
      validation: "Validation",
      none: "Not selected",
    });
    expect(russianDiagramLabels.roles).toEqual({
      train: "Обучение",
      validation: "Валидация",
      none: "Нет",
    });
    expect(englishDiagramLabels.proofs).toEqual({
      provenance: "Caller-supplied identifiers agree",
      selectionClosed: "Selection was already closed",
      noGrad: "Decoder scoring stays separate and graph-free",
      immutableState: "One inspected test view and one report",
    });
    expect(russianDiagramLabels.proofs).toEqual({
      provenance: "Заданные вызывающим кодом идентификаторы совпадают",
      selectionClosed: "Выбор уже был завершён",
      noGrad: "Декодер оценивается отдельно, без записи графа вычислений",
      immutableState:
        "Одно проверенное представление тестовой эпохи и один отчёт",
    });
    expect(englishDiagramLabels.sections.proof).toBe(
      "Separate assertions from checked facts",
    );
    expect(russianDiagramLabels.sections.proof).toBe(
      "Отделите заявленные сведения от проверяемых фактов",
    );
    expect(englishDiagramLabels.captions.proof).toBe(
      "Corpus, split, and tokenizer strings are caller-supplied; equality checks only their consistency. Context, vocabulary, test targets, state/model identity, and no-grad state preservation are independently checked. The fixture assembly supplies the intended histories.",
    );
    expect(russianDiagramLabels.captions.proof).toBe(
      "Строки корпуса, разбиения и токенизатора задаёт вызывающий код; их совпадение показывает только согласованность метаданных. Длину контекста, словарь, тестовые цели, совпадение состояния с моделью и сохранность состояния при оценке без графа реализация проверяет отдельно. Требуемую историю объектов обеспечивает код сборки примера.",
    );
    const proofCards = componentSource.match(
      /<article class="proof-card[\s\S]*?<\/article>/g,
    );
    expect(proofCards).toHaveLength(4);
    expect(proofCards![0]).toContain("labels.proofs.provenance");
    expect(proofCards![0]).toContain("corpus={trace.provenance.corpus}");
    expect(proofCards![0]).toContain("split={trace.provenance.split}");
    expect(proofCards![0]).toContain("tokenizer={trace.provenance.tokenizer}");
    expect(proofCards![0]).toContain(
      "provenance_assertions_match={trace.proof.provenance_assertions_match}",
    );
    expect(proofCards![0]).not.toContain("target_fingerprint");
    expect(proofCards![3]).toContain("labels.proofs.immutableState");
    expect(proofCards![3]).toContain(
      "V=${trace.provenance.vocabulary},\\;T=${trace.provenance.context},\\;N_{te}=${trace.provenance.targets}",
    );
    expect(proofCards![3]).toContain("trace.provenance.target_fingerprint");
    expect(proofCards![3]).not.toContain("provenance_assertions_match");
    expect(coursePlanSource.replace(/\r?\n/g, "")).toContain(
      "\\mathcal{L}_{te}(\\theta_{s^*})=-\\frac{1}{N_{te}}\\sum_{n=1}^{N_{te}}\\log p_{\\theta_{s^*}}(y_n\\mid x_n)",
    );
    expect(contract.content_revision).toBe(5);
    expect(lesson.content_revision).toBe(5);
    expect(russianLesson.content_revision).toBe(5);
    expect(contract.translation_notes).toContain(
      `canonical English SHA-256: ${createHash("sha256").update(lessonSource).digest("hex")}`,
    );
    expect(contract.translation_notes).toContain(
      `reviewed Russian SHA-256: ${createHash("sha256").update(russianLessonSource).digest("hex")}`,
    );
    expect(createHash("sha256").update(lessonSource).digest("hex")).toBe(
      "ab71bcf95e1bcb446d01cd531e9a0aad29dbe8afd03751b38d5c543f99e18e6c",
    );
    expect(
      createHash("sha256").update(russianLessonSource).digest("hex"),
    ).toBe(
      "20d40b3340755af228eea0c4a988623686b481a129def2fe7a6ca4cd65e468ec",
    );
    expect(
      contract.translation_notes.filter((note: string) =>
        note.startsWith("canonical English SHA-256:"),
      ),
    ).toHaveLength(1);
    expect(
      contract.translation_notes.filter((note: string) =>
        note.startsWith("reviewed Russian SHA-256:"),
      ),
    ).toHaveLength(1);
    expect(contractSource).not.toContain("s^\\*");
    expect(lessonSource).not.toContain("s^\\*");

    const normalizedLesson = lessonSource.replace(/\s+/g, " ");
    for (const source of lesson.history.llm_evolution.sources) {
      expect(lessonSource).toContain(source.source_url);
      expect(normalizedLesson).toContain(source.claim);
    }
    expect(lessonSource.match(/chapter-section:/g)).toHaveLength(8);
    expect(lessonSource.match(/<RustSource\b/g)).toHaveLength(7);
    expect(lessonSource).toContain(
      "<FinalEvaluationDiagram labels={diagramLabels} />",
    );
    expect(normalizedLesson).not.toContain("history of programming languages");
    expect(normalizedLesson).toContain(
      "does not claim that decoders always beat bigrams",
    );
    expect(lessonSource).not.toMatch(/TypeScript (?:validates|performs|computes)/);
    expect(
      existsSync(
        resolve(repositoryRoot, "site/src/content/chapters/ru/34-final-evaluation.mdx"),
      ),
    ).toBe(true);
    expect(russianLessonSource.match(/chapter-section:/g)).toHaveLength(8);
    expect(russianLessonSource.match(/<RustSource\b/g)).toHaveLength(7);
    expect(russianLessonSource).toContain(
      "<FinalEvaluationDiagram labels={diagramLabels} />",
    );
    expect(lessonSource).toContain("`provenance_assertions_match=true`");
    expect(russianLessonSource).toContain(
      "`provenance_assertions_match=true`",
    );
    expect(expectedOutput).toContain("provenance_assertions_match:true");
    expect(fixture).toContain("provenance_assertions_match=true");
    expect(parserSource).toContain("provenance_assertions_match=true");
    for (const source of [
      expectedOutput,
      fixture,
      parserSource,
      componentSource,
      lessonSource,
      russianLessonSource,
      demoSource,
      traceRustSource.replace(
        'assert!(!trace.contains("provenance_match="));',
        "",
      ),
    ]) {
      expect(source).not.toMatch(/\bprovenance_match\b/);
    }
    expect(traceRustSource).toContain(
      'assert!(!trace.contains("provenance_match="));',
    );

    expect(evaluationSource).toContain("region:evaluation-provenance");
    expect(evaluationSource).toContain("region:inspected-test-epoch");
    expect(evaluationSource).toContain("region:once-only-final-evaluation");
    expect(evaluationSource).toContain("AlreadyEvaluated");
    expect(evaluationSource).toContain("Partition::Test");
    const evaluationProvenanceSource = evaluationSource.match(
      /\/\/ region:evaluation-provenance([\s\S]*?)\/\/ endregion:evaluation-provenance/,
    )?.[1];
    expect(evaluationProvenanceSource).toBeDefined();
    expect(evaluationProvenanceSource).toContain(
      "Equality between values of this type proves",
    );
    expect(evaluationProvenanceSource).toContain(
      "only that callers supplied matching assertions",
    );
    expect(evaluationProvenanceSource).toContain(
      "it does not hash or inspect a",
    );
    expect(evaluationProvenanceSource).toMatch(
      /pub struct EvaluationProvenance[\s\S]*?pub struct SelectedDecoder<'a>[\s\S]*?selection_partition_assertion: Partition[\s\S]*?pub struct FrozenBigram<'a>[\s\S]*?fit_partition_assertion: Partition/,
    );
    expect(evaluationSource).toContain(
      "fn require_matching_provenance_assertions(",
    );
    expect(evaluationSource).toContain(
      "fn matching_caller_assertions_are_not_lineage_proof()",
    );
    expect(evaluationSource).toContain(
      "fn provenance_assertion_and_shape_errors_before_open_leave_access_unused()",
    );
    expect(evaluationSource).toMatch(
      /EvaluationProvenance::new\("corpus-v1", "split-v1", "other", 2\)[\s\S]*?ProvenanceField::Tokenizer[\s\S]*?evaluator\.access_count\(\), 0/,
    );
    expect(evaluationSource).toMatch(
      /assert_ne!\(\s*report\.target_fingerprint\(\),\s*other_report\.target_fingerprint\(\)\s*\)/,
    );
    expect(evaluationSource).toMatch(
      /assert_eq!\(report\.provenance\(\), other_report\.provenance\(\)\)/,
    );
    expect(evaluationSource).toMatch(
      /for invalid_loss in \[f64::NAN, -0\.25, f64::INFINITY, f64::NEG_INFINITY\]/,
    );
    expect(evaluationSource).toMatch(
      /let wrong_bigram = FrozenBigram::new\([\s\S]*?evaluator\.evaluate_once\(decoder, wrong_bigram\)[\s\S]*?EvaluationError::ProvenanceMismatch \{ field \}/,
    );
    for (const exactDisplay of [
      "tokenizer provenance assertion must not be blank",
      "corpus provenance assertion does not match",
      "the caller selection-partition assertion must be Validation, got Train",
      "the caller fit-partition assertion must be Train, got Validation",
      "final evaluation requires an epoch labeled Test, got Validation",
    ]) {
      expect(evaluationSource).toContain(exactDisplay);
    }
    expect(evaluationSource).not.toContain(
      "fn require_matching_provenance(",
    );
    expect(evaluationSource).toMatch(
      /pub struct SelectedDecoder<'a> \{[\s\S]*?state: &'a DecoderModelState,[\s\S]*?model: &'a DecoderModel,/,
    );
    const finalEvaluationSource = evaluationSource.match(
      /\/\/ region:once-only-final-evaluation([\s\S]*?)\/\/ endregion:once-only-final-evaluation/,
    )?.[1];
    expect(finalEvaluationSource).toBeDefined();
    const preOpenOperations = [
      "require_matching_provenance_assertions(&self.provenance, decoder.provenance())?",
      "require_matching_provenance_assertions(&self.provenance, bigram.provenance())?",
      "selected_state_matches_model(decoder.state(), decoder.model())",
      "model_config.max_positions() != self.provenance.context_length()",
      "let decoder_vocabulary = model_config.vocabulary_size()",
      "let bigram_vocabulary = bigram.model().vocabulary_size()",
      "self.access_count = 1",
      "InspectedTestEpoch::inspect(&self.test_epoch, decoder_vocabulary)",
    ];
    let operationCursor = -1;
    for (const operation of preOpenOperations) {
      const operationIndex = finalEvaluationSource!.indexOf(
        operation,
        operationCursor + 1,
      );
      expect(
        operationIndex,
        `ordered final-evaluation operation: ${operation}`,
      ).toBeGreaterThan(operationCursor);
      operationCursor = operationIndex;
    }
    expect(
      finalEvaluationSource!.indexOf("InspectedTestEpoch::inspect("),
    ).toBeGreaterThan(finalEvaluationSource!.indexOf("self.access_count = 1"));
    expect(finalEvaluationSource!.indexOf("parameter_bits(model)")).toBeGreaterThan(
      finalEvaluationSource!.indexOf("InspectedTestEpoch::inspect("),
    );
    expect(finalEvaluationSource!.indexOf("evaluate_no_grad(")).toBeGreaterThan(
      finalEvaluationSource!.indexOf("parameter_bits(model)"),
    );
    expect(finalEvaluationSource!.indexOf("score_bigram(")).toBeGreaterThan(
      finalEvaluationSource!.indexOf("evaluate_no_grad("),
    );
    expect(finalEvaluationSource).not.toMatch(
      /restore_independent_model|into_model|\.restore\(\)/,
    );

    const inspectedSource = evaluationSource.match(
      /\/\/ region:inspected-test-epoch([\s\S]*?)\/\/ endregion:inspected-test-epoch/,
    )?.[1];
    expect(inspectedSource).toBeDefined();
    expect(inspectedSource).toMatch(
      /struct InspectedTestEpoch<'a> \{[\s\S]*?epoch: &'a MiniBatchEpoch,[\s\S]*?evidence: TestEvidence,[\s\S]*?checked_pairs: Vec<CheckedTokenPair>,/,
    );
    expect(inspectedSource).toMatch(
      /inputs\.len\(\) != targets\.len\(\)[\s\S]*?InputTokenOutOfRange[\s\S]*?TargetTokenOutOfRange/,
    );
    expect(inspectedSource).not.toMatch(
      /pub(?:\([^)]*\))?\s+(?:struct|fn)\s+(?:InspectedTestEpoch|inspect)\b/,
    );
    expect(inspectedSource).not.toMatch(
      /require_matching_provenance|selected_state_matches_model|gradient_bits|fn score_bigram/,
    );

    const scoreBigramSource = evaluationSource.match(
      /fn score_bigram\([\s\S]*?\n\}\n\n\/\/ region:once-only-final-evaluation/,
    )?.[0];
    expect(scoreBigramSource).toBeDefined();
    expect(scoreBigramSource).toContain("inspected: &InspectedTestEpoch<'_>");
    expect(scoreBigramSource).toContain(
      "smoothed_probability_for_checked_indices(pair.input, pair.target)",
    );
    expect(scoreBigramSource).not.toMatch(
      /MiniBatchEpoch|append_checked_aligned_tokens|\.smoothed_probability\(/,
    );

    const checkedBigramSource = bigramSource.match(
      /\/\/ region:checked-bigram-probability([\s\S]*?)\/\/ endregion:checked-bigram-probability/,
    )?.[1];
    expect(checkedBigramSource).toBeDefined();
    expect(checkedBigramSource).toContain(
      "pub(crate) fn smoothed_probability_for_checked_indices",
    );
    expect(checkedBigramSource).not.toContain("token_index(");
    const publicProbabilitySource = bigramSource.match(
      /pub fn smoothed_probability\([\s\S]*?\n    \}/,
    )?.[0];
    expect(publicProbabilitySource).toContain("self.count(from, to)?");
    expect(publicProbabilitySource).toContain("self.smoothing_denominator(from)?");

    const englishRustSection = chapterSection(
      lessonSource,
      "rust-implementation",
    ).replace(/\s+/g, " ");
    const russianRustSection = chapterSection(
      russianLessonSource,
      "rust-implementation",
    ).replace(/\s+/g, " ");
    const englishExercisesSection = chapterSection(
      lessonSource,
      "exercises",
    ).replace(/\s+/g, " ");
    const russianExercisesSection = chapterSection(
      russianLessonSource,
      "exercises",
    ).replace(/\s+/g, " ");
    expect(englishRustSection).toContain(
      "one input-validation boundary for report evidence and later bigram scoring",
    );
    expect(englishRustSection).toContain(
      "does not promise one physical memory pass or remove checks needed by decoder evaluation",
    );
    expect(englishRustSection).toContain(
      "other public raw-ID entries retain their existing checks",
    );
    expect(englishRustSection).toContain(
      "The evaluator compares those strings for exact equality; it neither derives them nor checks their relationship to the underlying corpus, split construction, or tokenizer. Equal strings can therefore describe different underlying artifacts.",
    );
    expect(englishRustSection).toContain(
      "It does not validate `selected_step`, and it checks `selected_validation_loss` only for finiteness and nonnegativity.",
    );
    expect(englishRustSection).toContain(
      "The Chapter 34 fixture supplies the intended histories at its assembly call sites.",
    );
    expect(englishRustSection).toContain(
      "That concrete assembly evidence is stronger than the generic constructors' labels",
    );
    expect(englishRustSection).toContain(
      "it cannot discover which documents produced the counts",
    );
    expect(englishRustSection).toContain(
      "that label alone does not prove external holdout lineage",
    );
    expect(englishExercisesSection).toContain(
      "First change the tokenizer mapping while reusing the same tokenizer fingerprint string and the same vocabulary/context sizes. Then change only the fingerprint string.",
    );
    expect(englishExercisesSection).toContain(
      "Reusing the same string hides the first change from these assertion checks; the API does not inspect the tokenizer. Changing only the string creates an assertion mismatch, so the gate stays closed with count",
    );
    expect(russianRustSection).toContain(
      "входные данные проверяются на одной границе — при открытии доступа к тестовой эпохе",
    );
    expect(russianRustSection).toContain(
      "Это не означает один физический проход по памяти",
    );
    expect(russianRustSection).toContain(
      "Оценщик проверяет точное совпадение этих строк, но сам не вычисляет их и не сверяет с фактическим корпусом, способом разбиения или токенизатором. Поэтому одинаковыми строками можно ошибочно пометить разные данные или токенизаторы.",
    );
    expect(russianRustSection).toContain(
      "Значение `selected_step` не проверяется, а `selected_validation_loss` проверяется только на конечность и неотрицательность.",
    );
    expect(russianRustSection).toContain(
      "В учебном примере главы 34 требуемая история обеспечивается в местах сборки объектов.",
    );
    expect(russianRustSection).toContain(
      "Такие места вызова дают больше оснований, чем метки универсальных конструкторов",
    );
    expect(russianRustSection).toContain(
      "не может определить, по каким документам были рассчитаны счётчики",
    );
    expect(russianRustSection).toContain(
      "эта метка сама по себе не доказывает независимость тестовых данных",
    );
    expect(russianExercisesSection).toContain(
      "Сначала измените отображение токенизатора, но повторно используйте прежнюю строку отпечатка и сохраните размеры словаря и контекста. Затем измените только строку отпечатка.",
    );
    expect(russianExercisesSection).toContain(
      "Повторное использование той же строки скрывает первое изменение от проверки заявленных сведений: API не исследует токенизатор. Изменение самой строки создаёт несовпадение заявленных сведений",
    );
    for (const staleClaim of [
      /matching provenance cannot hide a changed tokenizer/i,
      /matching label cannot hide a changed tokenizer/i,
      /verifies held-out test role and provenance/i,
      /their provenance must match/i,
      /provenance-checked report/i,
      /accepts only a model (?:selected|fitted) on/i,
      /SelectedDecoder accepts only a validation-selected model/i,
    ]) {
      expect(normalizedLesson).not.toMatch(staleClaim);
    }
    for (const staleClaim of [
      /проверяет роль и происхождение/i,
      /происхождение должно совпадать/i,
      /проверенные сведения о происхождении/i,
      /совпадающая метка не может скрыть/i,
      /принимает только модель, (?:обученную|выбранную)/i,
      /принимает только модель, выбранную по валидации/i,
    ]) {
      expect(russianLessonSource.replace(/\s+/g, " ")).not.toMatch(staleClaim);
    }
    const normalizedCoursePlan = coursePlanSource.replace(/\s+/g, " ");
    expect(normalizedCoursePlan).toContain(
      "caller-supplied provenance assertions",
    );
    expect(normalizedCoursePlan).toContain("facts checked mechanically");
    expect(normalizedCoursePlan).toContain("fixture assembly evidence");
    expect(selectionSource).toContain("fixture_training_documents");
    expect(selectionSource).toContain("pub fn learner_evidence");
    const fixtureTrainingSource = selectionSource.match(
      /pub fn fixture_training_documents\(\)[\s\S]*?^\}/m,
    )?.[0];
    expect(fixtureTrainingSource).toBeDefined();
    expect(fixtureTrainingSource).toContain(
      '("train-a", TRAIN_A.as_slice())',
    );
    expect(fixtureTrainingSource).toContain(
      '("train-b", TRAIN_B.as_slice())',
    );
    const preparedEpochsSource = selectionSource.match(
      /fn prepared_epochs\(\)[\s\S]*?^\}/m,
    )?.[0];
    expect(preparedEpochsSource).toBeDefined();
    expect(preparedEpochsSource).toContain(
      '("train-a", TRAIN_A.as_slice())',
    );
    expect(preparedEpochsSource).toContain(
      '("train-b", TRAIN_B.as_slice())',
    );
    expect(selectionSource).toMatch(
      /test_partition_rejected = matches!\([\s\S]*?TrainerError::WrongPartition[\s\S]*?actual: Partition::Test/,
    );
    expect(demoSource).not.toContain("region:historical-evaluation-contrast");
    expect(demoSource).toContain("region:learner-evidence");
    expect(demoSource).toMatch(
      /SelectedDecoder::new\([\s\S]*?selected_state\(\),[\s\S]*?selected_model\(\),/,
    );
    const learnerEvidenceSource = demoSource.match(
      /\/\/ region:learner-evidence([\s\S]*?)\/\/ endregion:learner-evidence/,
    )?.[1];
    expect(learnerEvidenceSource).toBeDefined();
    expect(learnerEvidenceSource).toMatch(
      /BigramModel::fit_training_documents\([\s\S]*?training_documents\.iter\(\)\.map\(\|\(_, tokens\)\| \*tokens\)/,
    );
    expect(learnerEvidenceSource).toMatch(
      /FinalEvaluator::new\(test_epoch\(\)\?, provenance_assertions\.clone\(\)\)/,
    );
    expect(learnerEvidenceSource).toContain(
      "selection_test_partition_rejected: selected.test_partition_rejected",
    );
    const assemblyOperations = [
      "selection_evidence()?",
      "fixture_provenance_assertions()?",
      "fixture_training_documents()",
      "BigramModel::fit_training_documents(",
      "SelectedDecoder::new(",
      "selected.result.selected_state()",
      "selected.result.selected_model()",
      "selected.result.selected_step()",
      "selected.result.selected_validation_loss()",
      "FrozenBigram::new(",
      "FinalEvaluator::new(",
      "evaluator.evaluate_once(decoder, bigram)",
    ];
    let assemblyCursor = -1;
    for (const operation of assemblyOperations) {
      const operationIndex = learnerEvidenceSource!.indexOf(
        operation,
        assemblyCursor + 1,
      );
      expect(
        operationIndex,
        `ordered fixture assembly operation: ${operation}`,
      ).toBeGreaterThan(assemblyCursor);
      assemblyCursor = operationIndex;
    }
    expect(traceRustSource).toContain("FINAL_EVALUATION_TRACE_V1");
  });
});
