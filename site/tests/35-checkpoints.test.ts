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
const checkpointSource = read("rust/crates/llm-from-scratch/src/checkpoint.rs");
const trainerSource = read(
  "rust/crates/llm-from-scratch/src/training/trainer.rs",
);
const demoSource = read("rust/demos/ch35-checkpoints/src/lib.rs");
const frozenVersionOneHex = read(
  "rust/demos/ch35-checkpoints/fixtures/v1-selected-step8.hex",
);

const componentReplayLine =
  "component_replay=caller_inputs:[0,1] caller_targets:[1,2] caller_learning_rate:0.006000 next_step:9 parameter_bits_identical:true optimizer_state_identical:true logits_bits_identical:true logits_fingerprint:fnv1a64:0b875a0c9f380d8f changed_batch_diverges:true changed_learning_rate_diverges:true";
const scopeLine =
  "scope=tokenizer:stored model:stored optimizer:stored selected_step:stored optimizer_step:stored optimizer_base_learning_rate:stored sampling_rng:stored step_equality:validated model_lineage:not_stored corpus_identity:not_stored split_identity:not_stored epoch_materialization:not_stored epoch_cursor:not_stored batch_order:not_stored batch_cursor:not_stored shuffle_rng:not_stored training_rng:not_stored learning_rate_schedule:not_stored next_learning_rate:not_stored clipping_policy:not_stored validation_policy:not_stored gradients:not_stored trainer_capture:creation_required caller_next_batch:required caller_next_learning_rate:required clean_post_update:required whole_job_resume:false";
const rejectionLine =
  "reject=version:true vocabulary_mismatch:true step_mismatch:true truncation:true checksum:true";

function frontmatter(source: string) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error("missing JSON frontmatter");
  return JSON.parse(match[1]);
}

function region(source: string, name: string) {
  const match = source.match(
    new RegExp(`// region:${name}([\\s\\S]*?)// endregion:${name}`),
  );
  if (!match) throw new Error(`missing Rust region ${name}`);
  return match[1];
}

describe("Chapter 35 checkpoint ownership contract", () => {
  it("keeps both localized lessons on reviewed revision 5 and the bounded component evidence", () => {
    const contract = frontmatter(contractSource);
    const english = frontmatter(englishLessonSource);
    const russian = frontmatter(russianLessonSource);

    expect(contract.content_revision).toBe(5);
    expect(english.content_revision).toBe(5);
    expect(russian.content_revision).toBe(5);
    expect(contract.rust.expected_output).toBe(expectedOutput);
    expect(contract.translation_notes).toContain(
      `canonical English SHA-256: ${createHash("sha256").update(englishLessonSource).digest("hex")}`,
    );
    expect(contract.translation_notes).toContain(
      `reviewed Russian SHA-256: ${createHash("sha256").update(russianLessonSource).digest("hex")}`,
    );
    expect(createHash("sha256").update(englishLessonSource).digest("hex")).toBe(
      "580ca1003d53d5a8c9a8329671a84dd9453566a167afd55f374f20bb5b3d2835",
    );
    expect(createHash("sha256").update(russianLessonSource).digest("hex")).toBe(
      "e77dd34be4c85a5bc09abca2445ee7aa087e450550651953a60ce4a868db9ee4",
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
      "Content revision 5 preserves wire version 1 while replacing the free model/optimizer/step constructor with a sealed trainer-issued selected-state capture",
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
    expect(normalizedEnglishLessonSource).toContain(
      "**Stored:** tokenizer, decoder configuration and parameter bits, trainer-paired AdamW state, their shared recorded step, and the sampling RNG.",
    );
    expect(normalizedEnglishLessonSource).toContain(
      "**Supplied by the caller for the demonstrated update:** inputs `[0,1]`, targets `[1,2]`, and learning rate $0.006$.",
    );
    expect(normalizedEnglishLessonSource).toContain(
      "**Still required to continue training:** corpus and split identity, tokenized data, batch order and cursor, training RNG, learning-rate schedule, gradient clipping, and validation policy.",
    );
    expect(normalizedEnglishLessonSource).toContain(
      "**Outside this checkpoint:** the Chapter 34 evaluation report and test provenance, gradients at this clean boundary, and the attention cache that Chapter 38 will own.",
    );
    expect(normalizedRussianLessonSource).toContain(
      "**В файле:** токенизатор, конфигурация и биты параметров декодера, состояние AdamW из того же снимка цикла обучения, записанные номера шагов и генератор для выбора токенов.",
    );
    expect(normalizedRussianLessonSource).toContain(
      "**Для показанного обновления вызывающий код передаёт:** входы `[0,1]`, цели `[1,2]` и скорость обучения $0.006$.",
    );
    expect(normalizedRussianLessonSource).toContain(
      "**Для продолжения обучения всё ещё нужны:** сведения о корпусе и разбиении, токенизированные данные, порядок и текущая позиция пакетов, генератор, используемый при обучении, расписание скорости обучения, ограничение нормы градиента и правила валидации.",
    );
    expect(normalizedRussianLessonSource).toContain(
      "**За пределами контрольной точки:** итоговый отчёт и сведения о происхождении тестовых данных из главы 34, градиенты на этой чистой границе и кэш внимания, которым займётся глава 38.",
    );
    for (const source of [
      contractSource,
      englishLessonSource,
      russianLessonSource,
      expectedOutput,
    ]) {
      expect(source).not.toMatch(
        /Save every state, resume exactly|Сохраните всё состояние и продолжите без расхождений|complete selected decoder continuation boundary|resume=learning_rate|Exact resumed update|Точное продолжение обновления/,
      );
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

  it("accepts only a sealed trainer capture while planning borrowed payloads from owned state", () => {
    const transfer = region(checkpointSource, "checkpoint-state-transfer");
    const publicConstructorStart = transfer.indexOf("pub fn from_snapshot(");
    const ownedConstructorStart = transfer.indexOf("fn from_owned_parts(");
    expect(publicConstructorStart).toBeGreaterThan(-1);
    expect(ownedConstructorStart).toBeGreaterThan(publicConstructorStart);
    const publicConstructor = transfer.slice(
      publicConstructorStart,
      ownedConstructorStart,
    );
    expect(publicConstructor).toContain("selected: &SelectedTrainingState");
    expect(publicConstructor).toContain(
      "selected.model_state().independent_snapshot()",
    );
    expect(publicConstructor).toContain("selected.optimizer_state().clone()");
    expect(publicConstructor).toContain("selected.step()");
    expect(publicConstructor).not.toMatch(
      /model_state:\s*&DecoderModelState|optimizer:\s*&AdamW|selected_step:\s*u64/,
    );
    expect(transfer).not.toContain("pub fn from_owned_parts(");
    expect(checkpointSource).not.toMatch(
      /pub\s+(?:const\s+)?fn\s+\w+\s*\([^)]*(?:model_state\s*:\s*&?DecoderModelState|optimizer(?:_state)?\s*:\s*&?(?:AdamW|AdamWState)|selected_step\s*:\s*u64)/s,
    );
    expect(transfer).toContain("pub fn restore_independent_model(");
    expect(transfer).toContain(".restore_independent_model()");
    expect(transfer).toContain("pub fn into_model(self)");
    expect(transfer).toContain("self.model_state.into_model()");

    const recordsStart = checkpointSource.indexOf(
      "fn tensor_record_plan(&self)",
    );
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
    expect(records).toContain(
      "TensorPayload::Float64(moments.second_moment())",
    );
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
    expect(checkpointSource).toContain(
      "fn record_plan_borrows_every_payload_family()",
    );

    const snapshot = region(trainerSource, "decoder-state-snapshot");
    expect(snapshot).toContain("pub struct SelectedTrainingState {");
    expect(snapshot).toContain("step: usize,");
    expect(snapshot).toContain("model_state: DecoderModelState,");
    expect(snapshot).toContain("optimizer_state: AdamWState,");
    expect(snapshot).not.toMatch(
      /pub\s+(?:step|model_state|optimizer_state)\s*:/,
    );
    expect(snapshot).toContain("```compile_fail");
    const selectedStateImpl = snapshot.slice(
      snapshot.indexOf("impl SelectedTrainingState {"),
    );
    expect(
      [...selectedStateImpl.matchAll(/pub const fn (\w+)\(/g)].map(
        ([, name]) => name,
      ),
    ).toEqual(["step", "model_state", "optimizer_state"]);
    expect(selectedStateImpl).not.toMatch(
      /pub(?:\([^)]*\))?\s+(?:const\s+)?fn\s+(?:new|from_\w+|\w+)\s*\([^)]*\)\s*->\s*(?:Self|SelectedTrainingState)/s,
    );
    expect(
      trainerSource
        .replace(/^\/\/\/.*$/gm, "")
        .match(/selected_training_state:\s*SelectedTrainingState\s*\{/g),
    ).toHaveLength(1);
    expect(trainerSource).toContain(
      "fn exact_validation_ties_keep_the_earliest_checkpoint()",
    );
    expect(trainerSource).toContain(
      "assert_eq!(result.selected_optimizer_state().step_count(), 0);",
    );
    expect(trainerSource).toContain(
      "assert_eq!(result.final_optimizer().step_count(), 1);",
    );
    expect(trainerSource).toContain(
      "fn complete_training_loop_rejects_a_component_checkpoint_as_job_continuation()",
    );
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
    expect(layoutAdapter).toContain(
      "validate_parameter_layout(config, &state)?;",
    );
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
    const optimizerDecode = loading.indexOf(
      "let optimizer_state = decode_optimizer(",
    );
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
    expect(evidence).toContain(
      "let selected_training_state = selected.result.selected_training_state();",
    );
    expect(evidence).toContain(
      "Checkpoint::from_snapshot(\n        literal_tokenizer()?,\n        selected_training_state,\n        saved_sampling_rng_state,",
    );
    const originalRestore = evidence.indexOf(
      "checkpoint.restore_independent_model()?",
    );
    const loadedOptimizer = evidence.indexOf("loaded.restore_optimizer()");
    const loadedRng = evidence.indexOf("loaded.sampling_rng_state()");
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

  it("freezes wire version 1 and the exact caller-bounded report", () => {
    const compactHex = frozenVersionOneHex.replace(/\s+/g, "");
    expect(compactHex).toMatch(/^[0-9a-f]+$/);
    expect(compactHex).toHaveLength(12_660);
    const frozenBytes = Uint8Array.from(
      compactHex.match(/../g)!.map((pair: string) => Number.parseInt(pair, 16)),
    );
    expect(frozenBytes).toHaveLength(6_330);
    expect(createHash("sha256").update(frozenBytes).digest("hex")).toBe(
      "fdca5cb0d0d9fa37065db4abb5fbb49abd52009d3e477f58f079bba1d3037525",
    );
    expect(compactHex.slice(0, 32)).toBe("4c4c4d4350333500010004030201350b");
    expect(checkpointSource).toContain(
      "pub const CHECKPOINT_VERSION: u16 = 1;",
    );
    expect(demoSource).toContain(
      'include_str!("../fixtures/v1-selected-step8.hex")',
    );
    expect(demoSource).toContain(
      "fn frozen_complete_version_one_fixture_loads_and_reencodes_byte_exactly()",
    );
    expect(demoSource).toContain(
      'assert_eq!(current.encoded.checksum_label(), "fnv1a64:2b8b6097eaed6a91");',
    );
    expect(checkpointSource).toContain(
      "fn true_model_optimizer_step_mismatch_is_rejected_for_owned_and_loaded_state()",
    );

    const lines = expectedOutput.trimEnd().split("\n");
    expect(lines).toContain(componentReplayLine);
    expect(lines).toContain(scopeLine);
    expect(lines).toContain(rejectionLine);
    expect(lines).toContain(
      "state=selected_step:8 optimizer_step:8 parameter_tensors:11 parameter_scalars:144 sampling_rng:splitmix64-v1 sampling_rng_state:0x9e3779b97f4a7c38",
    );
    expect(lines).toContain(
      "atomic=replaced_complete_file:true loaded_sampling_rng_state:0x9e3779b97f4a7c39 temporary_files:0 unix_same_directory:true",
    );
    expect(createHash("sha256").update(expectedOutput).digest("hex")).toBe(
      "42ae6583b3c1d836cc0e35a1f37f46e604c906465fbf5686f42a9165ad6f0e75",
    );
    expect(demoSource).toContain(
      'assert_eq!(first, include_str!("../expected.txt"));',
    );
    expect(demoSource).toContain(
      "fn caller_supplied_batch_and_learning_rate_bound_component_replay()",
    );
    expect(expectedOutput).not.toMatch(
      /\nresume=|continuation_rng|whole_job_resume:true/,
    );
    for (const source of [englishLessonSource, russianLessonSource]) {
      expect(source).toContain(componentReplayLine);
      expect(source).toContain(scopeLine);
      expect(source).toContain(rejectionLine);
    }
  });
});
