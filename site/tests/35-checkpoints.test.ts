// @ts-ignore Node APIs are available in the Vitest runner.
import { createHash } from "node:crypto";
// @ts-ignore Node APIs are available in the Vitest runner.
import { readFileSync } from "node:fs";
// @ts-ignore Node APIs are available in the Vitest runner.
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

declare const process: { cwd(): string };

const repositoryRoot = resolve(process.cwd(), "..");
const read = (path: string) =>
  readFileSync(resolve(repositoryRoot, path), "utf8");
const contractSource = read("curriculum/chapters/35-checkpoints.md");
const englishLessonSource = read(
  "site/src/content/chapters/en/35-checkpoints.mdx",
);
const russianLessonSource = read(
  "site/src/content/chapters/ru/35-checkpoints.mdx",
);
const expectedOutput = read("rust/demos/ch35-checkpoints/expected.txt");
const checkpointSource = read(
  "rust/crates/llm-from-scratch/src/checkpoint.rs",
);
const trainerSource = read(
  "rust/crates/llm-from-scratch/src/training/trainer.rs",
);
const demoSource = read("rust/demos/ch35-checkpoints/src/lib.rs");

function frontmatter(source: string) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error("missing JSON frontmatter");
  return JSON.parse(match[1]);
}

function region(source: string, name: string) {
  const match = source.match(
    new RegExp(
      `// region:${name}([\\s\\S]*?)// endregion:${name}`,
    ),
  );
  if (!match) throw new Error(`missing Rust region ${name}`);
  return match[1];
}

describe("Chapter 35 checkpoint ownership contract", () => {
  it("keeps both localized lessons on revision 3 and the canonical evidence", () => {
    const contract = frontmatter(contractSource);
    const english = frontmatter(englishLessonSource);
    const russian = frontmatter(russianLessonSource);

    expect(contract.content_revision).toBe(3);
    expect(english.content_revision).toBe(3);
    expect(russian.content_revision).toBe(3);
    expect(contract.rust.expected_output).toBe(expectedOutput);
    expect(contract.translation_notes).toContain(
      `canonical English SHA-256: ${createHash("sha256").update(englishLessonSource).digest("hex")}`,
    );
    expect(
      russian.rust_sources.map(
        ({ path, region }: { path: string; region?: string }) => ({
          path,
          ...(region ? { region } : {}),
        }),
      ),
    ).toEqual(
      english.rust_sources.map(
        ({ path, region }: { path: string; region?: string }) => ({
          path,
          ...(region ? { region } : {}),
        }),
      ),
    );
    expect([
      ...new Set(
        english.rust_sources.map(({ path }: { path: string }) => path),
      ),
    ]).toEqual(contract.rust.sources);
    for (const source of [englishLessonSource, russianLessonSource]) {
      expect(source.match(/chapter-section:/g)).toHaveLength(8);
      expect(source.match(/<RustSource\b/g)).toHaveLength(8);
      expect(source).not.toMatch(/<[A-Za-z]+Diagram\b/);
    }
    expect(english.visualization).toMatchObject({
      decision: "not-useful",
      id: null,
    });
    expect(russian.visualization).toMatchObject({
      decision: english.visualization.decision,
      id: english.visualization.id,
    });
    expect(russian.visualization.rationale.trim()).not.toBe("");
  });

  it("copies retained snapshots and moves exclusively owned model buffers", () => {
    const transfer = region(checkpointSource, "checkpoint-state-transfer");
    expect(transfer).toContain("pub fn from_snapshot(");
    expect(transfer).toContain("model_state.independent_snapshot()");
    expect(transfer).toContain("optimizer.persistence_state()");
    expect(transfer).toContain("pub fn restore_independent_model(");
    expect(transfer).toContain(".restore_independent_model()");
    expect(transfer).toContain("pub fn into_model(self)");
    expect(transfer).toContain("self.model_state.into_model()");

    const recordsStart = checkpointSource.indexOf("fn tensor_records(&self)");
    const recordsEnd = checkpointSource.indexOf(
      "fn write_fixed_header(",
      recordsStart,
    );
    expect(recordsStart).toBeGreaterThan(-1);
    expect(recordsEnd).toBeGreaterThan(recordsStart);
    const records = checkpointSource.slice(recordsStart, recordsEnd);
    expect(records).toContain("self.model_state.named_tensors()");
    expect(records).not.toMatch(/restore_independent_model|into_model/);
  });

  it("validates decoded model state before optimizer decoding and preserves error order", () => {
    expect(checkpointSource).toContain(
      "NamedParameter::validate_leaf(&descriptor.name, &tensor)?;",
    );
    expect(checkpointSource).toContain(
      "DecoderModelState::try_from_owned_parameters(config, parameters)",
    );
    expect(trainerSource).toContain("drop(state.restore_independent_model()?);");

    const loading = region(checkpointSource, "validated-checkpoint-loading");
    const modelDecode = loading.indexOf("let model_state = decode_model(");
    const optimizerDecode = loading.indexOf("let optimizer_state = decode_optimizer(");
    const ownedConstruction = loading.indexOf("Self::from_owned_parts(");
    expect(modelDecode).toBeGreaterThan(-1);
    expect(optimizerDecode).toBeGreaterThan(modelDecode);
    expect(ownedConstruction).toBeGreaterThan(optimizerDecode);
    expect(checkpointSource).toContain(
      "fn model_error_precedes_a_later_optimizer_fault()",
    );
  });

  it("uses an independent original branch and consumes the loaded branch", () => {
    const evidence = region(demoSource, "learner-evidence");
    const originalRestore = evidence.indexOf(
      "checkpoint.restore_independent_model()?",
    );
    const loadedOptimizer = evidence.indexOf("loaded.restore_optimizer()");
    const loadedRng = evidence.indexOf("loaded.rng_state()");
    const loadedMove = evidence.indexOf("loaded.into_model()?");
    expect(originalRestore).toBeGreaterThan(-1);
    expect(loadedOptimizer).toBeGreaterThan(originalRestore);
    expect(loadedRng).toBeGreaterThan(originalRestore);
    expect(loadedMove).toBeGreaterThan(loadedOptimizer);
    expect(loadedMove).toBeGreaterThan(loadedRng);
    for (const source of [checkpointSource, demoSource]) {
      expect(source).not.toMatch(
        /Checkpoint::new\(|restore_model\(|DecoderModelState::capture/,
      );
    }
  });
});
