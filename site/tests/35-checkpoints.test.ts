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
const coursePlanSource = read("curriculum/course-plan.md");
const englishLessonSource = read(
  "site/src/content/chapters/en/35-checkpoints.mdx",
);
const russianLessonSource = read(
  "site/src/content/chapters/ru/35-checkpoints.mdx",
);
const normalizedEnglishLessonSource = englishLessonSource.replace(/\s+/g, " ");
const normalizedRussianLessonSource = russianLessonSource.replace(/\s+/g, " ");
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
  it("keeps both localized lessons on reviewed revision 4 and the canonical evidence", () => {
    const contract = frontmatter(contractSource);
    const english = frontmatter(englishLessonSource);
    const russian = frontmatter(russianLessonSource);

    expect(contract.content_revision).toBe(4);
    expect(english.content_revision).toBe(4);
    expect(russian.content_revision).toBe(4);
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
      expect(source.match(/<RustSource\b/g)).toHaveLength(10);
      expect(source).not.toMatch(/<[A-Za-z]+Diagram\b/);
    }
    expect(coursePlanSource).toContain(
      "Content revision 4 replaces the temporary validation decoder with the shared borrowed decoder-layout check",
    );
    expect(normalizedEnglishLessonSource).toContain(
      "The shared decoder-layout validator reads each name and tensor through a scoped reference",
    );
    expect(normalizedEnglishLessonSource).toContain(
      "The plan creates no encoded byte vector per record.",
    );
    expect(normalizedEnglishLessonSource).toContain(
      "This is not allocation-free or zero-copy serialization.",
    );
    expect(normalizedEnglishLessonSource).toContain(
      "It is also not streaming to disk:",
    );
    expect(normalizedRussianLessonSource).toContain(
      "Это не сериализация без выделения памяти и не сериализация без копирования",
    );
    expect(normalizedRussianLessonSource).toContain(
      "Данные также не записываются на диск",
    );
    expect(normalizedRussianLessonSource).not.toContain(
      "загрузчик декодирует тензоры модели и создаёт отдельный временный декодер",
    );
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

  it("copies retained snapshots while planning borrowed payloads from owned state", () => {
    const transfer = region(checkpointSource, "checkpoint-state-transfer");
    expect(transfer).toContain("pub fn from_snapshot(");
    expect(transfer).toContain("model_state.independent_snapshot()");
    expect(transfer).toContain("optimizer.persistence_state()");
    expect(transfer).toContain("pub fn restore_independent_model(");
    expect(transfer).toContain(".restore_independent_model()");
    expect(transfer).toContain("pub fn into_model(self)");
    expect(transfer).toContain("self.model_state.into_model()");

    const recordsStart = checkpointSource.indexOf("fn tensor_record_plan(&self)");
    const recordsEnd = checkpointSource.indexOf(
      "fn write_fixed_header(",
      recordsStart,
    );
    expect(recordsStart).toBeGreaterThan(-1);
    expect(recordsEnd).toBeGreaterThan(recordsStart);
    const records = checkpointSource.slice(recordsStart, recordsEnd);
    expect(records).toContain("self.model_state.named_tensors()");
    expect(records).toContain("TensorPayload::Bytes(token)");
    expect(records).toContain("TensorPayload::BpePairs(pairs)");
    expect(records).toContain("TensorPayload::Float64(value.as_slice())");
    expect(records).toContain("TensorPayload::Float64(moments.first_moment())");
    expect(records).toContain("TensorPayload::Float64(moments.second_moment())");
    expect(records).not.toMatch(/token\.clone\(\)|f64_bytes|bytes:\s*Vec<u8>/);
    expect(records).not.toMatch(/restore_independent_model|into_model/);

    const recordPlan = region(checkpointSource, "checkpoint-record-planning");
    expect(recordPlan).toContain("Bytes(&'a [u8])");
    expect(recordPlan).toContain("BpePairs(&'a [TokenPair])");
    expect(recordPlan).toContain("Float64(&'a [f64])");
    expect(recordPlan).toContain("fn write_to(self, bytes: &mut Vec<u8>)");
    expect(recordPlan).toContain("struct TensorRecordPlan<'a>");
    expect(recordPlan).toContain("descriptor: CheckpointTensorDescriptor");
    expect(recordPlan).toContain("payload: TensorPayload<'a>");
    expect(recordPlan).not.toContain("bytes: Vec<u8>");

    const planConstructorStart = checkpointSource.indexOf(
      "impl<'a> TensorRecordPlan<'a>",
    );
    const planConstructorEnd = checkpointSource.indexOf(
      "impl Checkpoint {",
      planConstructorStart,
    );
    const planConstructor = checkpointSource.slice(
      planConstructorStart,
      planConstructorEnd,
    );
    expect(planConstructor).toContain("let dtype = payload.dtype();");
    expect(planConstructor).not.toContain("dtype: CheckpointDType");

    const encoding = region(checkpointSource, "versioned-checkpoint-encoding");
    expect(encoding).toContain("let mut records = self.tensor_record_plan()?;");
    expect(encoding).toContain("let total_capacity = u64_to_usize(total_bytes");
    expect(encoding).toContain(".try_reserve_exact(total_capacity)");
    expect(encoding).toContain("record.payload.write_to(&mut bytes);");
    expect(encoding).not.toContain("self.validate_parts()?");
    expect(encoding).not.toMatch(/record\.bytes|f64_bytes/);
    expect(checkpointSource).not.toMatch(/fn f64_bytes\b|unsafe\s*\{/);
    expect(checkpointSource).toContain("fn record_plan_borrows_every_payload_family()");
  });

  it("validates decoded model state before optimizer decoding and preserves error order", () => {
    expect(checkpointSource).toContain(
      "NamedParameter::validate_leaf(&descriptor.name, &tensor)?;",
    );
    expect(checkpointSource).toContain(
      "DecoderModelState::try_from_leaf_validated_parameters(config, parameters)",
    );

    const layoutAdapter = region(
      trainerSource,
      "decoder-state-layout-validation",
    );
    expect(layoutAdapter).toContain(
      "impl DecoderParameterSource for DecoderModelState",
    );
    expect(layoutAdapter).toContain(
      "pub(crate) fn try_from_leaf_validated_parameters(",
    );
    expect(layoutAdapter).toContain("validate_parameter_layout(config, &state)?;");
    expect(layoutAdapter).not.toMatch(
      /restore_independent_model|independent_snapshot|into_model|DecoderModel::from_parameters|NamedParameter::from_tensor|parameters\.clone\(\)|\.clone\(\)/,
    );
    expect(trainerSource).toContain(
      "fn owned_parameter_layout_validation_retains_the_input_buffers()",
    );

    const snapshotRegion = region(trainerSource, "decoder-state-snapshot");
    expect(snapshotRegion).not.toContain("impl DecoderParameterSource");
    expect(snapshotRegion).not.toContain("try_from_leaf_validated_parameters");

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

    const literalConstructorStart = checkpointSource.indexOf(
      "pub fn literal_tokens(",
    );
    const literalConstructorEnd = checkpointSource.indexOf(
      "pub fn byte_bpe(",
      literalConstructorStart,
    );
    const literalConstructor = checkpointSource.slice(
      literalConstructorStart,
      literalConstructorEnd,
    );
    expect(literalConstructor).toContain("let mut seen = BTreeSet::new();");
    expect(literalConstructor).toContain("seen.insert(token.as_slice())");
    expect(literalConstructor).not.toContain("token.clone()");

    const bpeDecodeStart = checkpointSource.indexOf("fn decode_tokenizer(");
    const bpeDecodeEnd = checkpointSource.indexOf(
      "fn decode_model(",
      bpeDecodeStart,
    );
    const bpeDecode = checkpointSource.slice(bpeDecodeStart, bpeDecodeEnd);
    expect(bpeDecode).toContain("for pair in bytes.chunks_exact(8)");
    expect(bpeDecode).toContain("pairs.push(TokenPair::new(left, right));");
    expect(bpeDecode).not.toMatch(/decode_u32|Vec<u32>/);
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
