# Functional-laptop LLM audit: current-course inventory

Run: `20260813T154026Z-audit-functional-laptop-llm-capability-gaps-01`
Lane: current course, contracts, locale sources, Rust workspace, executables, tests, claims, and capstone
Audit base: commit `006a8f5553599dd28c0b01dfd6e5bbe51a840a50`, tree `22e099406e2ce8fcb5dfe2bdecc7e04966bf6597`
Disposition: **all F01–F12 and P01–P05 are confirmed against the current committed product tree.** Chapters 0–39 form a coherent, well-bounded scalar reference core and an end-to-end integration proof; they do not fulfill the active build's production-shaped laptop endpoint. No tracked product file was edited by this lane.

## 1. Provenance and method

### 1.1 Repository provenance and external cross-references (lane-local, non-composable)

This subsection predates the parent composer's final `SRC-*` schema and is retained only as lane-local provenance. It is **not** a source-register payload for canonical composition; the parent must use the independently verified primary/official register from the research lanes.

| ID | Source and authority | Exact anchor |
|---|---|---|
| `SRC-INV-U1` | Exact user review preserved in local Codex session history. This is mutable, uncommitted local history, not repository authority; it is used only to recover the requested wording and is independently checked below. | `/home/int/.codex/history.jsonl:538`; SHA-256 of that one LF-terminated JSONL record: `2af3d10b8576e11c11fa23681d0d6f7701cbe26f54e9a66fc900d8100f72af4e` |
| `SRC-INV-D1` | Accepted decision making the current course a reference core and requiring the laptop path. | `DECISIONS.md:19613-19719` |
| `SRC-INV-D2` | Accepted fail-loud refinements for course ownership, padded/packed equivalence, depth stability, resume, multiple seeds, generation, and serving. | `DECISIONS.md:19728-19803` |
| `SRC-INV-D3` | PostgreSQL is optional, justified plumbing behind a course-owned persistence boundary, not a default requirement. | `DECISIONS.md:19805-19870` and the adapter clarification beginning at `DECISIONS.md:19873` |
| `SRC-INV-B1` | Active build objective, completion criteria, audit acceptance, and immutable run fingerprint. | `BUILD_STATE.yaml:41857-41916` |
| `SRC-INV-CP1` | Current plan identity and explicit reference target. | `curriculum/course-plan.md:3-43` |
| `SRC-INV-CP2` | Current narrative target and explicit omissions. | `curriculum/course-plan.md:773-815` |
| `SRC-INV-CAP1` | Capstone configuration and integration code. | `rust/crates/llm-from-scratch/src/pipeline.rs:31-150`, `:1180-1283` |
| `SRC-INV-CAP2` | Frozen capstone report. | `rust/demos/ch39-end-to-end-llm/expected.txt:1-13` |
| `SRC-INV-CAP3` | Capstone assertions. | `rust/demos/ch39-end-to-end-llm/src/lib.rs:9-17`, `:121-157`, `:620-720` |
| `SRC-INV-TRANSFORMER` | Vaswani et al., *Attention Is All You Need* (primary paper; inherited from the current chapter source register, not re-browsed in this lane). | https://arxiv.org/abs/1706.03762; registered at `curriculum/chapters/29-rope.md:130` and `curriculum/chapters/30-multi-head-attention.md:175` |
| `SRC-INV-ROPE` | Su et al., RoPE (primary paper; inherited from the current chapter source register, not re-browsed here). | https://arxiv.org/abs/2104.09864; `curriculum/chapters/29-rope.md:140` |
| `SRC-INV-LLAMA` | Touvron et al., LLaMA (primary paper; inherited from the current chapter source register, not re-browsed here). | https://arxiv.org/abs/2302.13971; `curriculum/chapters/29-rope.md:150`, `curriculum/chapters/30-multi-head-attention.md:185` |
| `SRC-INV-TOPP` | Holtzman et al., nucleus/top-p sampling (primary paper; inherited from the current chapter source register, not re-browsed here). | https://arxiv.org/pdf/1904.09751; `curriculum/chapters/36-temperature-top-k.md:120` |
| `SRC-INV-MQA` | Shazeer, incremental decoding / shared KV formulation (primary paper; inherited from the current chapter source register, not re-browsed here). | https://arxiv.org/pdf/1911.02150; `curriculum/chapters/38-cached-generation.md:80` |
| `SRC-INV-PAGED` | Kwon et al., PagedAttention/vLLM (primary paper; inherited from the current chapter source register, not re-browsed here). | https://arxiv.org/pdf/2309.06180; `curriculum/chapters/38-cached-generation.md:90` |
| `SRC-INV-SAFETENSORS` | Hugging Face safetensors format specification (official repository specification; inherited from current Chapter 35 source register, not re-browsed here). | https://github.com/huggingface/safetensors/blob/main/README.md; `curriculum/chapters/35-checkpoints.md:95` |
| `SRC-INV-DWORK` | Dwork et al., adaptive holdout reuse (primary paper; inherited from current Chapter 34/39 source register, not re-browsed here). | https://arxiv.org/abs/1506.02629; `site/src/content/chapters/en/39-end-to-end-llm.mdx:65-68` |

No web lookup was performed in this lane. Modern capability requirements in the matrices below come from `SRC-INV-U1`, accepted repository decisions `SRC-INV-D1`/`SRC-INV-D2`, and active acceptance `SRC-INV-B1`; the external primary/official entries above are already registered in committed chapter evidence and are included only as cross-lane identifiers. Sibling research lanes own fresh primary-paper and official-spec verification.

### 1.2 Read and inventory coverage

- Read the active build/step/run record and the 2026-08-10 endpoint, fail-loud, and persistence decisions.
- Parsed all 40 chapter-contract JSON frontmatters and inspected all 40 scope sections and all decoder handoffs. `node scripts/check-course-plan.mjs` passed: `40 chapters, 111 scheduled steps, 40 implemented contract(s) through 39-end-to-end-llm`.
- Parsed all 40 English and 40 Russian lesson frontmatters and verified `chapter_id`, `content_revision`, and locale parity for each pair. There are also 39 English and 39 Russian cheat sheets (Chapter 0 intentionally has none).
- Inventoried the workspace manifest, cumulative crate, every course demo package, every default chapter executable, trace executable, checked output, and test declaration.
- Inspected capstone construction, fixed output, and tests; did not rerun the CPU-expensive capstone in this read-only lane.
- Product paths `README.md`, `curriculum/`, `rust/`, `site/`, `Cargo.toml`, and `Cargo.lock` have no working-tree diff. Parent-owned run checkpoint edits exist only in `BUILD_STATE.yaml` and `DECISIONS.md`.

Manifest-of-hashes fingerprints (SHA-256 of path-ordered `sha256sum` records) are:

| Inventory | Count | Manifest fingerprint |
|---|---:|---|
| chapter contracts | 40 | `bd8841dcf194036ad3e5831101b1851db2d7219dcc6658ebf2f7dbc012a308aa` |
| English MDX | 40 | `9515eb97f11f41742454234f4b0df91610741cdb920bcd6e8278c0cc157edd30` |
| Russian MDX | 40 | `347ea47408106dbfda35e52d6185840cdfc007b1ac7fa67cd6034f8f5164d2a7` |
| cumulative Rust sources | 40 files including `lib.rs` and `generation/mod.rs` | `397c5ff4b406adf9446eae525d1c7337e010c785d9e142d0e3eeaa09d4cf36e8` |
| chapter demo manifests, main/lib sources, and expected outputs | 39 packages | `be13bd4d6ddd0dba025b24efc0d66733a5c66b38b078d79c19544bef37d8e08b` |

The standalone content/contract check could not run because the host has no installed `css-tree` package (`ERR_MODULE_NOT_FOUND` from `site/scripts/css-scope-validation.mjs`). Dependencies were not installed because this audit forbids undeclared acquisition. The direct deterministic frontmatter comparison reported parity for all 40 pairs; this is inventory evidence, not a substitute for the unavailable complete validator.

## 2. Exact supplied review, independently verified

Line references in `U1` describe the 2026-08-10 tree and some have shifted after later content corrections. Each item therefore includes current anchors instead of trusting the old line number.

### F01–F12

**F01 — “The final model is an integration proof, not a useful language model.”** The capstone has eight BPE merges, one block, width four, one head, context length four, 1,188 parameters, and 32 updates, and explicitly makes no prose-quality or generalization claim. **Confirmed.** Configuration: `rust/crates/llm-from-scratch/src/pipeline.rs:54-76`; output: `rust/demos/ch39-end-to-end-llm/expected.txt:3-5`; explicit boundary: `curriculum/chapters/39-end-to-end-llm.md:267-285`. The measured generated text is only one seeded `"т  "` sample (`expected.txt:11`), and the lesson correctly says it is not a semantic benchmark (`site/src/content/chapters/en/39-end-to-end-llm.mdx:610-614`).

**F02 — “The data pipeline is tiny and curated.”** The corpus is twelve documents split eight/two/two; the course does not implement realistic collection, filtering, deduplication, licensing/privacy review, quality scoring, or large-scale decontamination. **Confirmed.** All documents are visible at `rust/data/tiny-bilingual-corpus.json:1-74`; the split is `rust/data/splits.json:1-23`; the fixture's origin and quality boundary are explicit at `rust/data/README.md:3-11`; the contract states the counts at `curriculum/chapters/02-corpus-partitions.md:226-230` and limits the checksum's provenance/licensing meaning at `:276-280`. Current code proves JSON/schema, checksum, coverage, disjointness, order, and provenance-group co-location—not acquisition governance or semantic duplicate/quality/privacy controls.

**F03 — “Computation is CPU-only f64 reference code.”** One numeric type, scalar loops, no SIMD/BLAS/GPU/fusion/device abstraction/memory planner. **Confirmed.** The plan fixes `dependency-free f64` and `bounded CPU-only` at `curriculum/course-plan.md:35-43`; `Tensor` is a `Vec<f64>` at `rust/crates/llm-from-scratch/src/tensor/storage.rs:6-12`; matmul performs an explicit scalar inner loop at `rust/crates/llm-from-scratch/src/tensor/matmul.rs:122-173`; Chapter 8 excludes devices/dtypes at `curriculum/chapters/08-tensor-storage.md:211-228`; Chapter 11 explicitly leaves SIMD, threads, BLAS, accelerators, and hardware optimization out at `curriculum/chapters/11-matrix-multiplication.md:265-269`.

**F04 — “Modern training systems are omitted.”** No mixed precision, distributed/data/tensor/pipeline parallelism, model-level microbatch accumulation, activation checkpointing, fused optimizer, or large-data streaming. **Confirmed with one qualification.** The plan exclusion is explicit at `curriculum/course-plan.md:812-815`; Chapter 33 excludes mixed precision/distributed/data-parallel arithmetic at `curriculum/chapters/33-training-selection.md:300-310`. Chapter 21 does implement a pedagogical `TokenMeanAccumulator` that can merge raw per-token loss/gradient coordinates (`rust/crates/llm-from-scratch/src/training/batch.rs:535-669`), but the real decoder trainer executes one batch forward/backward and an optimizer step on every loop iteration (`rust/crates/llm-from-scratch/src/training/trainer.rs:1072-1104`). It therefore is not memory-saving accumulation across decoder microbatches. No activation recomputation or streaming corpus reader exists in the module inventory.

**F05 — “The training recipe is deliberately predetermined.”** Fixed seed/batches/schedule/few updates/periodic validation/earliest minimum; no realistic hyperparameter search or seed-sensitivity study; dropout excluded. **Confirmed.** `LearningRateSchedule` and `TrainerConfig` are frozen lists/policies at `rust/crates/llm-from-scratch/src/training/trainer.rs:17-132`; `train_decoder` cycles deterministic batches, consumes every planned rate, and only snapshots predetermined validation steps at `:1021-1155`; the contract explicitly executes all eight updates and excludes dropout at `curriculum/chapters/33-training-selection.md:300-310`. The capstone freezes seed 39 and 32 updates (`pipeline.rs:54-76`) and demonstrates same-seed replay, not multiple-seed outcome spread (`expected.txt:5`).

**F06 — “Checkpoints cannot resume the complete training job.”** Stored model/tokenizer/AdamW/step/sampling RNG; omitted corpus/data cursor/shuffle/training RNG/schedule/clipping/validation; one caller update, not trainer resume. **Confirmed.** Exact stored and omitted state is enumerated at `curriculum/chapters/35-checkpoints.md:241-277`; the Rust type and doc comment match at `rust/crates/llm-from-scratch/src/checkpoint.rs:296-309`; frozen evidence says every omitted field is `not_stored` and `whole_job_resume:false` at `rust/demos/ch35-checkpoints/expected.txt:9`.

**F07 — “The tokenizer is intentionally simpler than common production tokenizers.”** Byte BPE lacks GPT-2-style pretokenization/category barriers and has BOS/EOS only—no chat roles, task separators, or PAD. **Confirmed.** The contract excludes PAD, pretokenization, normalization, and batching at `curriculum/chapters/04-apply-bpe-tokenizer.md:155-167`, and explicitly says it does not reproduce GPT-2 pretokenization/category barriers at `:198-212`. Layout constants define only BOS and EOS plus content ranges at `rust/crates/llm-from-scratch/src/tokenizer/bpe.rs:13-27`; the English lesson explicitly says there is no PAD at `site/src/content/chapters/en/04-apply-bpe-tokenizer.mdx:195-206`.

**F08 — “Attention is the basic dense MHA design.”** No GQA, Flash/online memory-efficient kernel, sparse/sliding attention, partial RoPE, frequency scaling, or context extension. **Confirmed.** RoPE deferrals are explicit at `curriculum/chapters/29-rope.md:281-294`; Chapter 30 excludes GQA and optimized attention at `curriculum/chapters/30-multi-head-attention.md:321-331`; the implementation materializes scores, log-softmax, probabilities, then a value matmul at `rust/crates/llm-from-scratch/src/attention/self_attention.rs:223-252`.

**F09 — “Generation is limited to greedy, temperature, and top-k.”** No top-p, beam, penalties, constrained/speculative decoding, or multiple-candidate search; uncached generation stops instead of sliding. **Confirmed.** `SamplingMode` has only `Greedy` and `TemperatureTopK` at `rust/crates/llm-from-scratch/src/generation/sampling.rs:13-21`; the contract states full-prefix recomputation, no sliding, and no multiple-sequence search at `curriculum/chapters/36-temperature-top-k.md:253-268`; top-p appears only as a later historical response, not an implementation, at `:339-346`; the uncached path is `sampling.rs:842-881`.

**F10 — “KV caching stops before modern serving.”** Correct prefill/incremental decode, but no request/continuous batching, paging, sharing, eviction, parallel prefill, or production allocator. **Confirmed.** The contract names every omission at `curriculum/chapters/38-cached-generation.md:279-285`; each decoder block allocates a fixed-capacity cache with batch size exactly one at `rust/crates/llm-from-scratch/src/generation/kv_cache.rs:424-451`, and binding rejects any layer cache whose batch size is not one at `:566-573`. The workspace has no server/network dependency (`Cargo.toml:1-10`, `rust/crates/llm-from-scratch/Cargo.toml:11-13`).

**F11 — “Evaluation is fixture regression, not evidence of generalization.”** Deliberately selected ordering, capstone slot-weighted overlap rather than a once-per-transition corpus metric, no broad benchmarks/multiple seeds/uncertainty/tasks. **Confirmed.** Chapter 34 says the reverse-cycle documents were deliberately selected and the result is not independent generalization at `curriculum/chapters/34-final-evaluation.md:269-294` and gives the measured comparison at `:312-324`; the English page says the same at `site/src/content/chapters/en/34-final-evaluation.mdx:241-246`. The capstone reports 1,744 overlapping window-target slots, marks the 442-transition metric `reported:false`, and sets both independent-generalization and architecture-superiority flags false at `rust/demos/ch39-end-to-end-llm/expected.txt:6-9`; assertions are at `rust/demos/ch39-end-to-end-llm/src/lib.rs:632-663`. No benchmark/task or multiple-seed evaluator exists in `rust/crates/llm-from-scratch/src/lib.rs:7-73`.

**F12 — “Post-training and application behavior are absent.”** No instruction/preference tuning or RLHF-style method, retrieval, tool use, chat templates, safety behavior, or production serving; MoE and quantization excluded. **Confirmed.** The plan exclusion is explicit at `curriculum/course-plan.md:812-815`; Chapter 0 also says these are not taught by the orientation at `curriculum/chapters/00-llm-parts.md:160-173`. A word-bounded search of every cumulative/demo Rust source finds no `RLHF`, `DPO`, `LoRA`, `RAG`, `MoE`, instruction tuning, retrieval-augmented generation, tool calling, chat template, quantization, or distributed-training implementation. The complete exported module set is at `rust/crates/llm-from-scratch/src/lib.rs:7-73`.

### P01–P05

The five priority gaps recovered exactly from `U1` are:

| ID | Exact priority | Current proof of gap | Disposition |
|---|---|---|---|
| `P01` | variable-length batches and padding | Fixed complete windows and explicit deferral: `curriculum/chapters/21-mini-batches.md:269-278`; no PAD: `site/src/content/chapters/en/04-apply-bpe-tokenizer.mdx:204-206` | `mandatory-laptop-implementation` |
| `P02` | full training checkpoint/resume | `curriculum/chapters/35-checkpoints.md:264-277`; `rust/demos/ch35-checkpoints/expected.txt:9` | `mandatory-laptop-implementation` |
| `P03` | realistic evaluation and corpus metrics | `curriculum/chapters/34-final-evaluation.md:289-294`; `rust/demos/ch39-end-to-end-llm/expected.txt:6-9` | `mandatory-laptop-implementation` |
| `P04` | scalable data preparation | `rust/data/README.md:3-11`; `curriculum/chapters/02-corpus-partitions.md:226-280` | `mandatory-laptop-implementation` |
| `P05` | accelerator-aware training and batched serving | `curriculum/course-plan.md:35-43`, `:812-815`; `curriculum/chapters/38-cached-generation.md:279-285` | `mandatory-laptop-implementation` |

`U1` suggested MoE, retrieval, alignment, quantization, and distributed execution as advanced tracks. Accepted decisions refined that advice: retrieval/tool boundaries, bounded SFT/LoRA/direct preference work, and quantized local inference are now mandatory (`D1`, `D2`, `B1`); only their scale-heavy forms, multi-device execution, large MoE, and reward-model/PPO-scale RLHF may remain advanced/bounded.

### 2.1 Validator-shaped reconciliation records

The following literal fields are intentionally one physical line each.

### F01 — The final model is an integration proof, not a useful language model
- Supplied claim: The capstone has eight BPE merges, one block, width four, one head, context length four, 1,188 parameters, and 32 updates, and makes no useful-prose/generalization claim.
- Independent verdict: confirmed
- Current evidence: rust/crates/llm-from-scratch/src/pipeline.rs:54-76; rust/demos/ch39-end-to-end-llm/expected.txt:3-11; curriculum/chapters/39-end-to-end-llm.md:267-285
- Requirement links: CAP-AUDIT-POSITION-01; CAP-AUDIT-FROM-SCRATCH-ENDPOINT-01; CAP-DTH-ARCH-02; CAP-DTH-EVAL-02; CAP-DTH-HW-01; CAP-ISA-ARCH-004; CAP-ISA-ART-003; CAP-ISA-PT-001; CAP-ISA-SRV-006; CAP-ISA-ENDPOINT-001
- Remaining misconception risk: “Whole,” “complete,” and “functional” terminal surfaces can still turn exact integration into an implied realistic-quality endpoint.

### F02 — The data pipeline is tiny and curated
- Supplied claim: Twelve documents split 8/2/2 teach clean boundaries but not realistic collection, filtering, deduplication, licensing/privacy review, quality scoring, or large-scale contamination control.
- Independent verdict: confirmed
- Current evidence: rust/data/tiny-bilingual-corpus.json:1-74; rust/data/splits.json:1-23; rust/data/README.md:3-11; curriculum/chapters/02-corpus-partitions.md:226-280
- Requirement links: CAP-DTH-DATA-01; CAP-DTH-DATA-02; CAP-DTH-DATA-03; CAP-DTH-DATA-04
- Remaining misconception risk: A checksum, stable ID, or deterministic split may be mistaken for rights, privacy, quality, representativeness, or semantic uniqueness.

### F03 — Computation is CPU-only f64 reference code
- Supplied claim: The course has one host numeric type and scalar loops, with no SIMD, BLAS, GPU kernels, fusion, device abstraction, or memory planner.
- Independent verdict: confirmed
- Current evidence: curriculum/course-plan.md:35-43; rust/crates/llm-from-scratch/src/tensor/storage.rs:6-12; rust/crates/llm-from-scratch/src/tensor/matmul.rs:122-173; curriculum/chapters/11-matrix-multiplication.md:265-269
- Requirement links: CAP-DTH-ARCH-02; CAP-DTH-BACKEND-01; CAP-DTH-MP-01; CAP-DTH-MEM-01; CAP-DTH-HW-01; CAP-DTH-OBS-01
- Remaining misconception risk: Algorithmic correctness at tiny f64 CPU scale may be assumed to transfer directly to device, dtype, memory, and performance behavior.

### F04 — Modern training systems are omitted
- Supplied claim: There is no mixed precision, distributed/data/tensor/pipeline parallelism, model microbatch accumulation, activation checkpointing, fused optimizer, or large-data streaming.
- Independent verdict: confirmed
- Current evidence: curriculum/course-plan.md:812-815; curriculum/chapters/33-training-selection.md:300-310; rust/crates/llm-from-scratch/src/training/batch.rs:535-669; rust/crates/llm-from-scratch/src/training/trainer.rs:1072-1104
- Requirement links: CAP-DTH-DATA-03; CAP-DTH-TOK-02; CAP-DTH-ARCH-02; CAP-DTH-MP-01; CAP-DTH-MEM-01; CAP-DTH-OPT-01; CAP-DTH-DIST-01; CAP-DTH-DIST-02
- Remaining misconception risk: TokenMeanAccumulator merges pedagogical token-coordinate sums, but it is not decoder microbatch gradient accumulation; conflating them would falsely close this gap.

### F05 — The training recipe is deliberately predetermined
- Supplied claim: Fixed seed, batches, schedule, few updates, periodic validation, and earliest-minimum selection do not study realistic search or seed sensitivity; dropout is excluded.
- Independent verdict: confirmed
- Current evidence: rust/crates/llm-from-scratch/src/training/trainer.rs:17-132; rust/crates/llm-from-scratch/src/training/trainer.rs:1021-1155; curriculum/chapters/33-training-selection.md:300-310
- Requirement links: CAP-DTH-ARCH-02; CAP-DTH-ARCH-03; CAP-DTH-MEM-01; CAP-DTH-OPT-01; CAP-DTH-EVAL-02; CAP-DTH-OBS-01
- Remaining misconception risk: Same-seed replay or one validation curve may be read as recipe robustness or uncertainty evidence.

### F06 — Checkpoints cannot resume the complete training job
- Supplied claim: The file stores tokenizer/model/AdamW/step/sampling RNG but omits corpus/data cursors, shuffle/training RNG, schedule, clipping, validation policy, and trainer continuation.
- Independent verdict: confirmed
- Current evidence: curriculum/chapters/35-checkpoints.md:241-277; rust/crates/llm-from-scratch/src/checkpoint.rs:296-309; rust/demos/ch35-checkpoints/expected.txt:9
- Requirement links: CAP-DTH-RESUME-01
- Remaining misconception risk: Reload plus one caller-constructed update can be mistaken for exact interrupted-job continuation.

### F07 — The tokenizer is intentionally simpler than common production tokenizers
- Supplied claim: Ranked byte BPE omits GPT-2-like pretokenization/category barriers and has BOS/EOS only, without PAD, roles, or task separators.
- Independent verdict: confirmed
- Current evidence: curriculum/chapters/04-apply-bpe-tokenizer.md:155-167; curriculum/chapters/04-apply-bpe-tokenizer.md:198-212; rust/crates/llm-from-scratch/src/tokenizer/bpe.rs:13-27; site/src/content/chapters/en/04-apply-bpe-tokenizer.mdx:195-206
- Requirement links: CAP-DTH-TOK-02; CAP-DTH-BATCH-02; CAP-ISA-PT-001
- Remaining misconception risk: Byte reversibility may be confused with token efficiency or complete model-specific control/template behavior.

### F08 — Attention is the basic dense MHA design
- Supplied claim: The course omits GQA, Flash/online memory-efficient kernels, sparse/sliding attention, partial RoPE, frequency scaling, and context extension.
- Independent verdict: confirmed
- Current evidence: curriculum/chapters/29-rope.md:281-294; curriculum/chapters/30-multi-head-attention.md:321-331; rust/crates/llm-from-scratch/src/attention/self_attention.rs:223-252
- Requirement links: CAP-DTH-ARCH-02; CAP-DTH-BATCH-02; CAP-ISA-ATT-002; CAP-ISA-ATT-003; CAP-ISA-ATT-005
- Remaining misconception risk: Dense mathematical MHA or accepting larger position indices may be mistaken for modern memory/context behavior.

### F09 — Generation is limited to greedy, temperature, and top-k
- Supplied claim: There is no top-p, beam, penalties, constrained/speculative decoding, or multiple-candidate search, and uncached generation stops rather than sliding.
- Independent verdict: confirmed
- Current evidence: rust/crates/llm-from-scratch/src/generation/sampling.rs:13-21; curriculum/chapters/36-temperature-top-k.md:253-268; curriculum/chapters/36-temperature-top-k.md:339-346; rust/crates/llm-from-scratch/src/generation/sampling.rs:842-881
- Requirement links: CAP-ISA-DEC-002; CAP-ISA-DEC-003; CAP-ISA-DEC-004; CAP-ISA-DEC-005; CAP-ISA-DEC-006; CAP-ISA-DEC-007; CAP-ISA-RT-003
- Remaining misconception risk: A seeded token choice may obscure top-p set semantics, logprob meanings, stop boundaries, streaming Unicode, and request isolation.

### F10 — KV caching stops before modern serving
- Supplied claim: Correct prefill/incremental decode lacks request/continuous batching, paging, sharing, eviction, parallel prefill, and a production allocator.
- Independent verdict: confirmed
- Current evidence: curriculum/chapters/38-cached-generation.md:279-285; rust/crates/llm-from-scratch/src/generation/kv_cache.rs:424-451; rust/crates/llm-from-scratch/src/generation/kv_cache.rs:566-573
- Requirement links: CAP-ISA-ARCH-004; CAP-ISA-ATT-004; CAP-ISA-SRV-001; CAP-ISA-SRV-002; CAP-ISA-SRV-003; CAP-ISA-SRV-004; CAP-ISA-SRV-005; CAP-ISA-SRV-006; CAP-ISA-SRV-007; CAP-ISA-SRV-008; CAP-ISA-SRV-009; CAP-ISA-SRV-010; CAP-ISA-OBS-001
- Remaining misconception risk: A batch-one model-bound cache or HTTP wrapper may be called a serving system without scheduling, lifecycle, bounds, or reclamation.

### F11 — Evaluation is fixture regression, not evidence of generalization
- Supplied claim: Test documents were deliberately selected for an ordering; 1,744 overlapping slots are reported while the 442-transition corpus policy is not; no broad benchmarks, seeds, uncertainty, or tasks exist.
- Independent verdict: confirmed
- Current evidence: curriculum/chapters/34-final-evaluation.md:269-324; rust/demos/ch39-end-to-end-llm/expected.txt:6-9; rust/demos/ch39-end-to-end-llm/src/lib.rs:632-663
- Requirement links: CAP-DTH-EVAL-01; CAP-DTH-EVAL-02; CAP-ISA-SAFE-001
- Remaining misconception risk: A lower fixed slot-weighted loss may be read as untouched generalization, task competence, or architecture superiority despite current caveats.

### F12 — Post-training and application behavior are absent
- Supplied claim: Instruction/preference tuning, retrieval, tools, chat templates, safety, production serving, MoE, and quantization are outside the current course.
- Independent verdict: confirmed
- Current evidence: curriculum/course-plan.md:812-815; curriculum/chapters/00-llm-parts.md:160-173; rust/crates/llm-from-scratch/src/lib.rs:7-73
- Requirement links: CAP-DTH-ARCH-02; CAP-DTH-QUANT-01; CAP-DTH-DIST-01; CAP-DTH-MOE-01; CAP-ISA-PT-001; CAP-ISA-PT-003; CAP-ISA-RT-001; CAP-ISA-RT-002; CAP-ISA-RT-003; CAP-ISA-SAFE-001; CAP-ISA-SAFE-002; CAP-ISA-SAFE-003; CAP-ISA-SRV-006; CAP-ISA-ENDPOINT-001
- Remaining misconception risk: A decoder pretraining graph may be mistaken for the chat/application/safety behavior users normally associate with an LLM.

### P01 — Variable-length batches and padding
- Supplied claim: Variable-length batches and padding are a largest educational gap.
- Independent verdict: confirmed
- Current evidence: curriculum/chapters/21-mini-batches.md:269-278; site/src/content/chapters/en/04-apply-bpe-tokenizer.mdx:204-206
- Requirement links: CAP-DTH-BATCH-02
- Remaining misconception risk: Rectangular PAD storage alone does not establish attention, loss, position, target, or packed-document semantics.

### P02 — Full training checkpoint/resume
- Supplied claim: Full training checkpoint/resume is a largest educational gap.
- Independent verdict: confirmed
- Current evidence: curriculum/chapters/35-checkpoints.md:264-277; rust/demos/ch35-checkpoints/expected.txt:9
- Requirement links: CAP-DTH-RESUME-01
- Remaining misconception risk: Component replay may continue to be mislabeled whole-job resume unless event/cursor/RNG/policy state is proven.

### P03 — Realistic evaluation and corpus metrics
- Supplied claim: Realistic evaluation and corpus metrics are a largest educational gap.
- Independent verdict: confirmed
- Current evidence: curriculum/chapters/34-final-evaluation.md:289-324; rust/demos/ch39-end-to-end-llm/expected.txt:6-9
- Requirement links: CAP-DTH-EVAL-02; CAP-ISA-SAFE-001
- Remaining misconception risk: Correct NLL mathematics on a deliberately selected repeated-slot fixture is not realistic held-out evidence.

### P04 — Scalable data preparation
- Supplied claim: Scalable data preparation is a largest educational gap.
- Independent verdict: confirmed
- Current evidence: rust/data/README.md:3-11; curriculum/chapters/02-corpus-partitions.md:226-280
- Requirement links: CAP-DTH-DATA-01; CAP-DTH-DATA-02; CAP-DTH-DATA-03; CAP-DTH-DATA-04
- Remaining misconception risk: Twelve inspectable documents teach invariants but not the rights, quality, privacy, contamination, streaming, and memory problems of real preparation.

### P05 — Accelerator-aware training and batched serving
- Supplied claim: Accelerator-aware training and batched serving are a largest educational gap.
- Independent verdict: confirmed
- Current evidence: curriculum/course-plan.md:35-43; curriculum/course-plan.md:812-815; curriculum/chapters/38-cached-generation.md:279-285
- Requirement links: CAP-DTH-ARCH-02; CAP-DTH-BACKEND-01; CAP-DTH-MEM-01; CAP-DTH-HW-01; CAP-ISA-ARCH-004; CAP-ISA-SRV-001; CAP-ISA-SRV-002; CAP-ISA-SRV-007
- Remaining misconception risk: GPU allocation or a tensor batch axis alone can be mistaken for correct accelerator training or independent continuously batched request lifecycle.

## 3. Machine-checkable chapter, contract, locale, executable, and objective inventory

### 3.1 Inventory rules

- Every row's contract is `curriculum/chapters/<id>.md`; objective begins at line 7 (Chapter 0 line 8) and the exact scope begins at the listed `scope` anchor.
- Every row has current canonical English and direct Russian sources at `site/src/content/chapters/{en,ru}/<id>.mdx`. Their objective is line 10, except Chapter 0 line 11 and Chapter 6's compact JSON line 2. The deterministic comparison found matching IDs/revisions and correct `en`/`ru` locale values for all 40 rows.
- For Chapters 1–39, package is `rust/demos/chNN-<slug>`; its default executable starts at `src/main.rs:1`, its manifest at `Cargo.toml:1`, and frozen learner output at `expected.txt:1`. Chapter 0 is intentionally orientation-only with no Rust package.
- `demo_tests` counts `#[test]` declarations under that chapter demo. The cumulative crate separately has 459 `#[test]` declarations; the demos have 141. Counts prove inventory presence, not test passage.
- All rows below are `reference-core-proven` only within their stated objective and boundary. No row inherits a production-scale claim from the word “complete.”

```tsv
id	rev	exact English objective	contract scope	cumulative/source owner	demo_tests	visualization	boundary that must remain visible
00-llm-parts	5	Identify the major parts of a decoder-only LLM, understand how they connect, and use the course links to find the chapter that builds each part.	curriculum/chapters/00-llm-parts.md:162	orientation only	0	useful:llm-system-map (+ llm-parts-map)	structural map; does not teach production serving, retrieval, MoE, instruction tuning, or claim one small model represents every modern system
01-text-units	6	Implement and verify a reversible mapping from known Unicode scalar values to deterministic vocabulary IDs for English and Cyrillic text.	curriculum/chapters/01-text-units.md:155	rust/demos/ch01-text-units/src/lib.rs	6	useful:text-units-pipeline	demo-only scalar vocabulary; not graphemes, learned BPE, embeddings, or the cumulative tokenizer
02-corpus-partitions	9	Load a frozen corpus split manifest in Rust and verify that every whole document belongs to exactly one nonempty training, validation, or test partition before any tokenizer statistic is learned.	curriculum/chapters/02-corpus-partitions.md:186	rust/crates/llm-from-scratch/src/corpus.rs	2	useful:corpus-partitions	integrity/split invariants only; deterministic does not mean representative and IDs do not detect all near duplicates
03-learn-bpe-merges	7	Learn an ordered byte-pair merge table from the frozen training documents only, with overlapping candidate counts, an explicit numeric tie rule, and left-to-right non-overlapping replacement.	curriculum/chapters/03-learn-bpe-merges.md:176	rust/crates/llm-from-scratch/src/tokenizer/bpe_trainer.rs	1	useful:learn-bpe-merges	learn ranks only; no arbitrary-input application, controls, decode, or validation tuning
04-apply-bpe-tokenizer	9	Apply frozen byte-pair ranks to arbitrary UTF-8 text or byte sequences, wrap documents with reserved control IDs, and recover the exact content bytes.	curriculum/chapters/04-apply-bpe-tokenizer.md:155	rust/crates/llm-from-scratch/src/tokenizer/bpe.rs	1	useful:apply-bpe-tokenizer	BOS/EOS byte BPE; no PAD, pretokenization, normalization, role/task controls, or batching
05-autoregressive-examples	8	Turn each encoded document into fixed-length input–target pairs for next-token prediction without joining documents or data partitions.	curriculum/chapters/05-autoregressive-examples.md:184	rust/crates/llm-from-scratch/src/data.rs	2	useful:autoregressive-examples	complete fixed windows only; no variable length, padding, packing, or model-side visibility rule
06-bigram-baseline	5	Build and inspect a smoothed bigram next-token distribution by counting each transition in the original wrapped training documents exactly once.	curriculum/chapters/06-bigram-baseline.md:94	rust/crates/llm-from-scratch/src/bigram.rs	0	useful:bigram-baseline	one-token training-only baseline; no validation/test fit or gradients
07-language-model-metrics	7	Compute average negative log-likelihood and perplexity from the probabilities assigned to observed target tokens.	curriculum/chapters/07-language-model-metrics.md:192	rust/crates/llm-from-scratch/src/metrics.rs	4	useful:language-model-metrics	generic NLL/PPL plus train/validation bigram scorer; no test, model selection, or realistic corpus evaluator
08-tensor-storage	5	Store a multidimensional tensor in one flat value buffer and map valid coordinates to deterministic offsets.	curriculum/chapters/08-tensor-storage.md:208	rust/crates/llm-from-scratch/src/tensor/storage.rs	4	useful:tensor-storage	owned contiguous f64 only; no dtype/device/memory planner/arithmetic
09-tensor-views	6	Transform tensor layouts with reshape, transpose, permutation, and slicing while preserving logical values and making every materialized copy explicit.	curriculum/chapters/09-tensor-views.md:264	rust/crates/llm-from-scratch/src/tensor/view.rs	5	useful:tensor-views	immutable f64 views; no mutable/stepped views, dtype/device, arithmetic, or gradients
10-broadcasting-reductions	5	Apply elementwise functions across compatible shapes and reduce explicit axes without silent shape ambiguity.	curriculum/chapters/10-broadcasting-reductions.md:264	rust/crates/llm-from-scratch/src/tensor/ops.rs	3	useful:broadcasting-reductions	new owned outputs; no in-place, parallel, dtype/device polymorphism, or gradients
11-matrix-multiplication	5	Compute checked 2-D and batched matrix products from scalar loops and tensor strides.	curriculum/chapters/11-matrix-multiplication.md:248	rust/crates/llm-from-scratch/src/tensor/matmul.rs	3	useful:matrix-multiplication	naive scalar f64 contractions; no tiling, SIMD, BLAS, threads, accelerator, or fusion
12-stable-softmax	8	Convert finite logits into normalized probabilities and log-probabilities, and score indexed targets using maximum shifting and log-domain arithmetic that avoid failures from raw exponentiation.	curriculum/chapters/12-stable-softmax.md:233	rust/crates/llm-from-scratch/src/nn/probability.rs	3	useful:stable-softmax	finite-input f64 reference; no mask-aware -inf, mixed dtype, sparse/top-p, accelerator, or fused kernel
13-gradient-checking	6	Approximate locally smooth derivatives from actual representable probes and compare sampled analytic candidates using scale-aware error.	curriculum/chapters/13-gradient-checking.md:268	rust/crates/llm-from-scratch/src/autograd/gradcheck.rs	6	useful:gradient-checking	sampled local f64 evidence, with shared assumptions; not exhaustive correctness or nonsmooth/mixed-precision checking
14-scalar-autodiff	6	Build a scalar computation graph and accumulate reverse-mode adjoints across every operand use in shared subexpressions.	curriculum/chapters/14-scalar-autodiff.md:273	rust/crates/llm-from-scratch/src/autograd/scalar.rs	3	useful:scalar-autodiff	single-thread scalar graph; no tensor/device/mixed precision/optimizer
15-tensor-autodiff-core	9	Differentiate structural and elementwise tensor expressions while reversing shape transformations, broadcasts, and reductions correctly.	curriculum/chapters/15-tensor-autodiff-core.md:314	rust/crates/llm-from-scratch/src/autograd/tensor_core.rs	5	useful:tensor-autodiff-core	finite owned f64 tape; structural/elementwise subset, not model-critical VJPs or higher/parallel/device autodiff
16-model-autodiff-ops	7	Differentiate matrix products, repeated embedding lookups, nonlinearities, log-softmax, and indexed mean token loss.	curriculum/chapters/16-model-autodiff-ops.md:289	rust/crates/llm-from-scratch/src/autograd/model_ops.rs	5	useful:model-autodiff-ops	operation tape only; no masks/padding/mixed precision/accelerator packaging
17-parameter-initialization	4	Create named trainable weight matrices reproducibly at width-aware scales and distinguish the separate starting policies for biases, normalization gains, and token tables.	curriculum/chapters/17-parameter-initialization.md:235	rust/crates/llm-from-scratch/src/nn/init.rs	5	useful:parameter-initialization	Xavier-style matrix sampler and local conventions; no depth-stability proof or device kernels
18-token-embeddings	8	Gather trainable embedding rows for token IDs and scatter-add gradients for repeated IDs.	curriculum/chapters/18-token-embeddings.md:245	rust/crates/llm-from-scratch/src/nn/embedding.rs	3	useful:token-embeddings	no padding convention, sharding, quantization, positional treatment, or sparse optimizer
19-linear-layers	5	Project vectors, sequences, and mini-batches through one trainable feature matrix with an explicit optional-bias policy.	curriculum/chapters/19-linear-layers.md:226	rust/crates/llm-from-scratch/src/nn/linear.rs	3	useful:linear-layers	feature projection only; no padding/residual/optimizer/accelerator behavior
20-swiglu-feed-forward	3	Compose three bias-free projections with a differentiable SiLU gate, preserve every leading position, and verify the exact forward and reverse values.	curriculum/chapters/20-swiglu-feed-forward.md:241	rust/crates/llm-from-scratch/src/nn/swiglu.rs	3	useful:swiglu-feed-forward	position-wise reference module; no residual/norm/batching/optimized fused kernel
21-mini-batches	3	Shuffle complete causal windows reproducibly, stack fixed-size token rows without crossing boundaries, and average loss plus gradients over the target tokens actually present.	curriculum/chapters/21-mini-batches.md:269	rust/crates/llm-from-scratch/src/training/batch.rs	3	useful:mini-batches	fixed-length rows; no padding, variable lengths, packing, distributed batches, or trainer microbatch accumulation
22-adamw	8	Update a stable set of named decoder parameters with bias-corrected first and second gradient moments while keeping weight decay outside the adaptive gradient path.	curriculum/chapters/22-adamw.md:333	rust/crates/llm-from-scratch/src/training/adamw.rs	7	useful:adamw	f64 named state; no mixed precision, fused/device implementation, serialization in this chapter, or distributed state
23-neural-ngram	5	Train an embedding-plus-SwiGLU fixed-context language model whose validation loss improves from initialization.	curriculum/chapters/23-neural-ngram.md:237	rust/crates/llm-from-scratch/src/models/neural_ngram.rs	5	useful:neural-ngram	fixed context C=2 and preselected 15-update fixture; no attention/schedule/selection/checkpoint/distributed training
24-residual-connections	3	Add a shape-preserving residual branch and verify identity and gradient paths through stacked transformations.	curriculum/chapters/24-residual-connections.md:195	rust/crates/llm-from-scratch/src/nn/residual.rs	5	useful:residual-connections	algebraic identity path; no depth-aware residual scaling and no guarantee of successful deep optimization
25-rmsnorm	5	Implement differentiable last-axis RMSNorm and distinguish ideal positive-scale invariance from epsilon-dominated behavior near zero.	curriculum/chapters/25-rmsnorm.md:242	rust/crates/llm-from-scratch/src/nn/rmsnorm.rs	4	useful:rmsnorm	f64 reference; no mixed precision/fused kernel/production epsilon selection
26-qkv-projections	2	Project one hidden-state sequence into separate query, key, and value tensors while preserving its batch and token axes.	curriculum/chapters/26-qkv-projections.md:218	rust/crates/llm-from-scratch/src/attention/qkv.rs	3	useful:qkv-projections	dense independent Q/K/V only; no attention, mask, multihead, GQA, or cache
27-self-attention	2	Compute one unmasked attention head and explain every score, probability, and weighted value.	curriculum/chapters/27-self-attention.md:204	rust/crates/llm-from-scratch/src/attention/self_attention.rs	3	useful:self-attention	dense materialized unmasked head; no padding/causal mask, positions, cache, or optimized kernel
28-causal-masking	2	Apply an inclusive lower-triangular mask so each query attends only to its available prefix.	curriculum/chapters/28-causal-masking.md:192	rust/crates/llm-from-scratch/src/attention/causal_mask.rs; rust/crates/llm-from-scratch/src/autograd/model_ops.rs	3	useful:causal-masking	fixed-length causal mask only; no padding/segment mask, variable length, or parallel generation
29-rope	3	Rotate query and key feature pairs by absolute position, then observe signed relative positions in their dot products without changing the causal visibility boundary.	curriculum/chapters/29-rope.md:278	rust/crates/llm-from-scratch/src/attention/rope.rs; rust/crates/llm-from-scratch/src/autograd/model_ops.rs	5	useful:rotary-position-pairs	full adjacent-pair fixed frequencies; no partial rotary, scaling, long-context policy, or extension claim
30-multi-head-attention	2	Split projected features into independent causal attention heads, concatenate their outputs, and learn how to mix them with an output projection.	curriculum/chapters/30-multi-head-attention.md:318	rust/crates/llm-from-scratch/src/attention/multi_head.rs	3	useful:multi-head-attention-flow	dense MHA; no GQA, padding mask, cache, dropout, or optimized/memory-efficient attention
31-decoder-block	2	Compose one differentiable pre-normalized decoder block and verify the exact order of its attention and feed-forward residual paths.	curriculum/chapters/31-decoder-block.md:207	rust/crates/llm-from-scratch/src/models/decoder_block.rs	4	useful:pre-norm-decoder-block-flow	one reference block; no stack, dropout, cache ownership, optimized kernel, or depth-stability evidence
32-decoder-model	4	Assemble token lookup, repeated pre-normalized decoder blocks, final RMSNorm, and one genuinely tied vocabulary projection into differentiable logits.	curriculum/chapters/32-decoder-model.md:269	rust/crates/llm-from-scratch/src/models/decoder.rs	3	useful:tied-decoder-model-flow	architecturally complete scalar decoder; no optimization/evaluation/generation/dropout/cache offsets/production functionality
33-training-selection	11	Run every step of a bounded decoder training plan, measure graph-free validation loss at fixed checkpoints, and restore the model state saved at the earliest checkpoint with minimum validation loss, all without consulting test data during this training execution.	curriculum/chapters/33-training-selection.md:297	rust/crates/llm-from-scratch/src/training/trainer.rs (+ adamw.rs, tensor_core.rs, decoder.rs)	3	useful:training-validation-checkpoints	predetermined schedule/batches/candidates; no early stop, test, dropout, mixed precision, accumulation/checkpointing/distributed system
34-final-evaluation	7	Evaluate the frozen validation-selected decoder through one local test-only gate, validate and record the ordered test input/target positions, aggregate every target token fairly, and compare it with a frozen bigram while identifying the deliberately selected comparison as fixed-fixture regression evidence.	curriculum/chapters/34-final-evaluation.md:269	rust/crates/llm-from-scratch/src/evaluation.rs (+ bigram.rs)	6	useful:final-evaluation-boundary	local one-use type and fixed chosen fixture; not global access control, independent generalization, benchmark, uncertainty, or architecture ranking
35-checkpoints	5	Save and load one versioned decoder checkpoint that restores its tokenizer, decoder configuration and parameter bits, trainer-paired AdamW state and shared step, and a separate sampling RNG, then show that one caller-supplied update matches across the original and loaded branches.	curriculum/chapters/35-checkpoints.md:238	rust/crates/llm-from-scratch/src/checkpoint.rs (+ trainer.rs, adamw.rs)	4	not-useful:-	component checkpoint only; no corpus/data cursor/training RNG/schedule/clipping/validation state or train_decoder resume
36-temperature-top-k	6	Shape one next-token distribution with positive-temperature scaling and stable top-k filtering, distinguish its rank-retained set from its positive representable sampling support, then reproduce a categorical choice by restoring the same random-generator state in an uncached autoregressive loop.	curriculum/chapters/36-temperature-top-k.md:253	rust/crates/llm-from-scratch/src/generation/sampling.rs	2	useful:temperature-top-k	greedy/temp/top-k, one sequence, no slide/cache in this path; no top-p/penalties/logprobs/stops/constrained/speculative/multiple candidates
37-incremental-attention	5	Append one position's rotated keys and unrotated values to one attention-layer cache and reproduce the full-prefix attention result at that newest position.	curriculum/chapters/37-incremental-attention.md:242	rust/crates/llm-from-scratch/src/attention/incremental.rs	2	useful:incremental-attention	one layer fixed cache; no query cache, training, paging, prefill, or model-wide/multi-request coordination
38-cached-generation	6	Give every decoder block its own KV cache, bind that model-wide state to one exact decoder for a session, and prefill the prompt once. For the exact fixtures, advance all block caches coherently and verify that newest-position logits and generation decisions match complete-prefix references.	curriculum/chapters/38-cached-generation.md:257	rust/crates/llm-from-scratch/src/generation/kv_cache.rs (+ attention/incremental.rs)	4	useful:cached-generation	batch-one fixed allocation; no request/continuous batching, paging/sharing/eviction, parallel prefill, allocator, queue, cancellation, or server
39-end-to-end-llm	9	Run one deterministic bilingual decoder-only LLM end to end, report mean NLL and perplexity for its overlapping test-window slots, distinguish those 1,744 slots from 442 within-document transition occurrences, and preserve the boundaries around selection, regression evidence, checkpoint reload, and cached generation.	curriculum/chapters/39-end-to-end-llm.md:267	rust/crates/llm-from-scratch/src/pipeline.rs	5	useful:end-to-end-llm	1,188-parameter/32-update integration proof; not useful prose, broad generalization, production throughput, distributed training, or deployed-LLM scale
```

### 3.2 Workspace/module/executable inventory

The root workspace includes `rust/crates/*` and `rust/demos/*`, uses Rust 2024 / Rust 1.93, and forbids unsafe code (`Cargo.toml:1-10`). The cumulative crate declares only `serde` with derive and `serde_json` (`rust/crates/llm-from-scratch/Cargo.toml:1-16`), used as JSON plumbing rather than an LLM implementation.

All exported cumulative modules are accounted for by `rust/crates/llm-from-scratch/src/lib.rs:7-73`:

```text
top-level: bigram.rs, checkpoint.rs, corpus.rs, data.rs, evaluation.rs, metrics.rs, pipeline.rs
attention: causal_mask.rs, incremental.rs, multi_head.rs, qkv.rs, rope.rs, self_attention.rs
autograd: gradcheck.rs, model_ops.rs, scalar.rs, tensor_core.rs
generation: mod.rs, kv_cache.rs, sampling.rs
models: decoder.rs, decoder_block.rs, neural_ngram.rs
nn: embedding.rs, init.rs, linear.rs, probability.rs, residual.rs, rmsnorm.rs, swiglu.rs
tensor: matmul.rs, ops.rs, storage.rs, view.rs
tokenizer: bpe.rs, bpe_trainer.rs
training: adamw.rs, batch.rs, trainer.rs
```

Executable inventory is exhaustive: 39 default chapter binaries (`ch01`–`ch39`), 34 `diagram_trace` example binaries (Chapters 5–34 except the no-figure Chapter 35, then Chapters 36–39), and no Chapter 0 binary. `rust/demos/chapter-demo-template` is authoring scaffolding, not a learner chapter. The fixed outputs and trace files are checked into each applicable demo; for the capstone, byte-for-byte output/trace assertions are `rust/demos/ch39-end-to-end-llm/src/lib.rs:620-630`.

### 3.3 What the final objective currently proves

The plan calls the map “Complete decoder-only LLM course plan” and says the endpoint can partition, tokenize, train/evaluate, persist, and KV-generate at CPU scale (`curriculum/course-plan.md:773-780`). The capstone really does orchestrate each corresponding API and checks exact replay/reload/cache evidence (`rust/crates/llm-from-scratch/src/pipeline.rs:1180-1283`; `CAP2`; `CAP3`). That is a valid **integration objective**.

It is not the active build's **functional laptop objective**, which additionally requires governed/scalable data, realistic padded/packed batches, depth stability, accelerator/dtype and memory-bounded training, full resume, conventional evaluation, interoperable artifacts, modern decoding/serving, post-training, retrieval/tools, safety/privacy, and quantized inference (`BUILD_STATE.yaml:41865-41874`). The current course's own explicit exclusions (`curriculum/course-plan.md:812-815`) establish that this second objective is unproved rather than implicitly satisfied.

## 4. Per-chapter claim records

These headings expose one stable claim ID for every chapter. Each claim is deliberately narrower than the chapter title or handoff.

### CLAIM-00 — Reference-core system map
- Classification: reference-core-proven
- Claim: The course provides a structural map of the scalar decoder reference path.
- Evidence: curriculum/chapters/00-llm-parts.md:162-173; site/src/content/chapters/en/00-llm-parts.mdx:9-11; site/src/content/chapters/ru/00-llm-parts.mdx:9-11
- Boundary: Orientation only; it does not establish production serving, retrieval, MoE, instruction tuning, or representativeness of one small model.

### CLAIM-01 — Unicode scalar vocabulary
- Classification: reference-core-proven
- Claim: The Chapter 1 demo reversibly maps its known English/Cyrillic Unicode scalar values to deterministic IDs.
- Evidence: curriculum/chapters/01-text-units.md:155-189; rust/demos/ch01-text-units/src/lib.rs:1; rust/demos/ch01-text-units/expected.txt:1
- Boundary: Demo-only scalar vocabulary, not grapheme segmentation or the cumulative BPE tokenizer.

### CLAIM-02 — Frozen corpus partitions
- Classification: reference-core-proven
- Claim: The fixed manifest enforces whole-document, nonempty, disjoint, complete, ordered, provenance-group-preserving train/validation/test partitions before tokenizer learning.
- Evidence: curriculum/chapters/02-corpus-partitions.md:186-210; rust/crates/llm-from-scratch/src/corpus.rs:212; rust/data/splits.json:1-23
- Boundary: Integrity and role assignment do not prove acquisition rights, representativeness, privacy, semantic deduplication, or quality.

### CLAIM-03 — Deterministic BPE merge learning
- Classification: reference-core-proven
- Claim: Training-only byte sequences produce deterministic ranked BPE merges with explicit tie and replacement rules.
- Evidence: curriculum/chapters/03-learn-bpe-merges.md:176-190; rust/crates/llm-from-scratch/src/tokenizer/bpe_trainer.rs:1; rust/demos/ch03-learn-bpe-merges/expected.txt:1
- Boundary: Rank learning only; no arbitrary-input tokenization, controls, decoding, or scalable trainer.

### CLAIM-04 — Reversible byte-BPE application
- Classification: reference-core-proven
- Claim: Frozen byte-BPE ranks encode arbitrary bytes canonically and decode represented content bytes exactly with BOS/EOS boundaries.
- Evidence: curriculum/chapters/04-apply-bpe-tokenizer.md:155-212; rust/crates/llm-from-scratch/src/tokenizer/bpe.rs:13-27; rust/demos/ch04-apply-bpe-tokenizer/expected.txt:1-19
- Boundary: No PAD, pretokenization/category barriers, normalization, role/task tokens, template, or efficiency evidence.

### CLAIM-05 — Fixed causal windows
- Classification: reference-core-proven
- Claim: Fixed-length shifted causal windows remain inside document and partition boundaries.
- Evidence: curriculum/chapters/05-autoregressive-examples.md:184-205; rust/crates/llm-from-scratch/src/data.rs:1; rust/demos/ch05-autoregressive-examples/expected.txt:1
- Boundary: No short-row padding, variable length, packing, segment masks, or model-side causal enforcement.

### CLAIM-06 — Smoothed bigram baseline
- Classification: reference-core-proven
- Claim: The smoothed bigram counts each within-document wrapped training transition once and forms defined probability rows.
- Evidence: curriculum/chapters/06-bigram-baseline.md:94-99; rust/crates/llm-from-scratch/src/bigram.rs:1; rust/demos/ch06-bigram-baseline/expected.txt:1
- Boundary: Transparent one-token training baseline, not a competitive model or final evaluator.

### CLAIM-07 — NLL and perplexity
- Classification: reference-core-proven
- Claim: The reference code computes token-weighted mean NLL and perplexity from assigned target probabilities.
- Evidence: curriculum/chapters/07-language-model-metrics.md:192-216; rust/crates/llm-from-scratch/src/metrics.rs:1; rust/demos/ch07-language-model-metrics/expected.txt:1
- Boundary: Mathematical metric and train/validation fixture only; no conventional capstone corpus result, benchmark, or uncertainty.

### CLAIM-08 — Contiguous f64 tensor storage
- Classification: reference-core-proven
- Claim: One contiguous f64 buffer, shape, and row-major strides map checked tensor coordinates to deterministic offsets.
- Evidence: curriculum/chapters/08-tensor-storage.md:208-228; rust/crates/llm-from-scratch/src/tensor/storage.rs:6-12; rust/crates/llm-from-scratch/src/tensor/storage.rs:59-130
- Boundary: One host dtype; no device, allocator, planner, arithmetic, or accelerator.

### CLAIM-09 — Immutable tensor views
- Classification: reference-core-proven
- Claim: Immutable reshape/transpose/permute/slice views preserve logical values and make materialization explicit.
- Evidence: curriculum/chapters/09-tensor-views.md:264-286; rust/crates/llm-from-scratch/src/tensor/view.rs:92-200
- Boundary: No mutation, stepped/negative stride, dtype/device metadata, or accelerator layout contract.

### CLAIM-10 — Broadcasting and reductions
- Classification: reference-core-proven
- Claim: Owned and strided f64 inputs support checked trailing-axis broadcasting and named single-axis reductions.
- Evidence: curriculum/chapters/10-broadcasting-reductions.md:264-282; rust/crates/llm-from-scratch/src/tensor/ops.rs:1
- Boundary: New owned outputs; no parallel/in-place/device/dtype-polymorphic operations.

### CLAIM-11 — Scalar matrix multiplication
- Classification: reference-core-proven
- Claim: Scalar loops compute checked rank-two and batched strided matrix products with optional logical transposes.
- Evidence: curriculum/chapters/11-matrix-multiplication.md:248-269; rust/crates/llm-from-scratch/src/tensor/matmul.rs:122-173
- Boundary: No tiling, SIMD, BLAS, threads, GPU, fusion, or performance claim.

### CLAIM-12 — Stable probabilities and token loss
- Classification: reference-core-proven
- Claim: Maximum-shifted f64 log-sum-exp, softmax, log-softmax, and indexed mean NLL are numerically stable for their finite-input contract.
- Evidence: curriculum/chapters/12-stable-softmax.md:233-246; rust/crates/llm-from-scratch/src/nn/probability.rs:1
- Boundary: No mask-aware negative infinity, sparse/top-p policy, mixed dtype, accelerator, or fused kernel.

### CLAIM-13 — Sampled gradient checks
- Classification: reference-core-proven
- Claim: Sampled unequal-spacing finite differences can cross-check selected analytic derivatives of a locally smooth f64 objective.
- Evidence: curriculum/chapters/13-gradient-checking.md:268-289; rust/crates/llm-from-scratch/src/autograd/gradcheck.rs:1
- Boundary: Sampled evidence with shared assumptions, not proof of all gradients or mixed-precision/device numerics.

### CLAIM-14 — Scalar reverse mode
- Classification: reference-core-proven
- Claim: A scalar reverse-mode graph accumulates adjoints correctly through repeated operand uses.
- Evidence: curriculum/chapters/14-scalar-autodiff.md:273-289; rust/crates/llm-from-scratch/src/autograd/scalar.rs:1
- Boundary: Single-thread finite f64 scalars; no tensor/device/mixed-precision/optimizer system.

### CLAIM-15 — Tensor structural VJPs
- Classification: reference-core-proven
- Claim: The tensor tape reverses selected structural and elementwise transformations to exact parent shapes.
- Evidence: curriculum/chapters/15-tensor-autodiff-core.md:314-339; rust/crates/llm-from-scratch/src/autograd/tensor_core.rs:1
- Boundary: Reference subset only; no higher derivatives, parallel/device tape, memory planner, or activation checkpointing.

### CLAIM-16 — Model-critical VJPs
- Classification: reference-core-proven
- Claim: The tape differentiates matmul, repeated embedding gather, nonlinearities, log-softmax, and indexed token loss.
- Evidence: curriculum/chapters/16-model-autodiff-ops.md:289-310; rust/crates/llm-from-scratch/src/autograd/model_ops.rs:1
- Boundary: No integer tensor, pad/segment mask, mixed precision, or accelerator VJP implementation.

### CLAIM-17 — Reproducible initialization
- Classification: reference-core-proven
- Claim: Named trainable matrices initialize reproducibly at a declared Xavier-style width-aware scale.
- Evidence: curriculum/chapters/17-parameter-initialization.md:235-255; rust/crates/llm-from-scratch/src/nn/init.rs:1
- Boundary: A local initializer is not depth-stability evidence and does not select production initialization for a deep model.

### CLAIM-18 — Embedding gather and scatter-add
- Classification: reference-core-proven
- Claim: Embedding lookup gathers valid rows and repeated IDs scatter-add gradients into one shared row.
- Evidence: curriculum/chapters/18-token-embeddings.md:245-260; rust/crates/llm-from-scratch/src/nn/embedding.rs:1
- Boundary: No PAD semantics, sharding, quantization, sparse optimizer, or positional policy.

### CLAIM-19 — Linear projection
- Classification: reference-core-proven
- Claim: One optional-bias linear projection preserves leading axes and changes the last feature width.
- Evidence: curriculum/chapters/19-linear-layers.md:226-239; rust/crates/llm-from-scratch/src/nn/linear.rs:1
- Boundary: Scalar reference feature projection, not a fused/device layer.

### CLAIM-20 — SwiGLU
- Classification: reference-core-proven
- Claim: Three bias-free projections and SiLU implement a differentiable position-wise SwiGLU feed-forward module.
- Evidence: curriculum/chapters/20-swiglu-feed-forward.md:241-250; rust/crates/llm-from-scratch/src/nn/swiglu.rs:1
- Boundary: No fused kernel, residual/norm composition, padding behavior, or accelerator evidence.

### CLAIM-21 — Fixed-window mini-batches
- Classification: reference-core-proven
- Claim: Complete fixed windows shuffle reproducibly, stack without boundary crossing, keep a final short batch, and average contributions by admitted target count.
- Evidence: curriculum/chapters/21-mini-batches.md:269-278; rust/crates/llm-from-scratch/src/training/batch.rs:535-669
- Boundary: No variable length, PAD, packing, segment/position/attention/loss masks, or decoder microbatch accumulation.

### CLAIM-22 — AdamW
- Classification: reference-core-proven
- Claim: Named f64 AdamW state applies moment correction and decoupled decay with whole-set validation/commit.
- Evidence: curriculum/chapters/22-adamw.md:333-351; rust/crates/llm-from-scratch/src/training/adamw.rs:1
- Boundary: No mixed-precision master weights/scaler, fused device update, sharding, or distributed optimizer.

### CLAIM-23 — Neural n-gram
- Classification: reference-core-proven
- Claim: A fixed-context embedding-plus-SwiGLU model trains for the frozen budget and improves validation loss.
- Evidence: curriculum/chapters/23-neural-ngram.md:237-261; rust/crates/llm-from-scratch/src/models/neural_ngram.rs:1
- Boundary: Preselected tiny fixture and context two; not realistic recipe, attention model, or generalization evidence.

### CLAIM-24 — Residual paths
- Classification: reference-core-proven
- Claim: A shape-preserving residual merge carries identity and learned-branch gradients through a small algebraic stack.
- Evidence: curriculum/chapters/24-residual-connections.md:195-207; rust/crates/llm-from-scratch/src/nn/residual.rs:1
- Boundary: It does not prove deep optimization stability or implement architecture-specific residual scaling.

### CLAIM-25 — RMSNorm
- Classification: reference-core-proven
- Claim: Last-axis RMSNorm implements the declared epsilon/gain forward and reverse behavior.
- Evidence: curriculum/chapters/25-rmsnorm.md:242-255; rust/crates/llm-from-scratch/src/nn/rmsnorm.rs:1
- Boundary: f64 reference only; no mixed-precision/fused kernel or production epsilon selection.

### CLAIM-26 — QKV projections
- Classification: reference-core-proven
- Claim: Independent bias-free projections map hidden states to Q, K, and V while preserving batch/token axes.
- Evidence: curriculum/chapters/26-qkv-projections.md:218-235; rust/crates/llm-from-scratch/src/attention/qkv.rs:1
- Boundary: Dense equal-role projection stage only; no GQA/KV sharing, mask, cache, or attention kernel.

### CLAIM-27 — Dense unmasked attention
- Classification: reference-core-proven
- Claim: One dense unmasked attention head exposes raw/scaled scores, normalized weights, and the value mixture.
- Evidence: curriculum/chapters/27-self-attention.md:204-218; rust/crates/llm-from-scratch/src/attention/self_attention.rs:223-252
- Boundary: Materializes O(T²) intermediates and provides no causal/padding/segment mask or efficient kernel.

### CLAIM-28 — Causal mask
- Classification: reference-core-proven
- Claim: An inclusive lower-triangular mask gives exact zero future probability and causal prefix invariance for fixed lengths.
- Evidence: curriculum/chapters/28-causal-masking.md:192-205; rust/crates/llm-from-scratch/src/attention/causal_mask.rs:1
- Boundary: No padding, variable sequence, or packed-document isolation mask.

### CLAIM-29 — RoPE
- Classification: reference-core-proven
- Claim: Full adjacent query/key pairs receive checked absolute-position RoPE rotations and retain the declared relative-dot identity.
- Evidence: curriculum/chapters/29-rope.md:278-294; rust/crates/llm-from-scratch/src/attention/rope.rs:1
- Boundary: No partial rotary, frequency scaling, long-context policy, or extension validation.

### CLAIM-30 — Dense multi-head attention
- Classification: reference-core-proven
- Claim: Dense projected Q/K/V split into causal heads, receive RoPE, merge, and pass through an output projection with gradients.
- Evidence: curriculum/chapters/30-multi-head-attention.md:318-331; rust/crates/llm-from-scratch/src/attention/multi_head.rs:1
- Boundary: No GQA, pad/segment mask, cache state, dropout, or memory-efficient device kernel.

### CLAIM-31 — Decoder block
- Classification: reference-core-proven
- Claim: One pre-norm block composes RMSNorm-attention-residual then RMSNorm-SwiGLU-residual in exact order.
- Evidence: curriculum/chapters/31-decoder-block.md:207-220; rust/crates/llm-from-scratch/src/models/decoder_block.rs:1
- Boundary: A block is not deep-stack stability, optimized execution, dropout, or serving state.

### CLAIM-32 — Decoder graph
- Classification: reference-core-proven
- Claim: Token lookup, configurable reference blocks, final RMSNorm, and a truly tied embedding/output matrix produce differentiable logits/loss.
- Evidence: curriculum/chapters/32-decoder-model.md:269-282; rust/crates/llm-from-scratch/src/models/decoder.rs:1
- Boundary: “Complete decoder-only language model” means architectural graph only, not trained usefulness or production-shaped operation.

### CLAIM-33 — Bounded trainer
- Classification: reference-core-proven
- Claim: The bounded trainer executes all planned f64 updates, clips/checks gradients, measures fixed validation candidates without test access, and restores the earliest minimum.
- Evidence: curriculum/chapters/33-training-selection.md:297-310; rust/crates/llm-from-scratch/src/training/trainer.rs:1021-1155
- Boundary: Predetermined single-seed plan; no dynamic search, dropout, accumulation/checkpointing, mixed precision, streaming, or distributed system.

### CLAIM-34 — Fixed-fixture evaluator
- Classification: reference-core-proven
- Claim: One local evaluator opens test after selection, scores identical fixed target slots without a graph, and records immutable fixed-fixture regression evidence.
- Evidence: curriculum/chapters/34-final-evaluation.md:269-324; rust/crates/llm-from-scratch/src/evaluation.rs:891-1015
- Boundary: Local type safety does not create global data governance or independent generalization; the ordering was deliberately selected.

### CLAIM-35 — Component checkpoint
- Classification: reference-core-proven
- Claim: Version-1 bytes round-trip tokenizer, selected model/AdamW/step, and sampling RNG and replay one caller-specified update under the same environment.
- Evidence: curriculum/chapters/35-checkpoints.md:238-278; rust/crates/llm-from-scratch/src/checkpoint.rs:296-330; rust/demos/ch35-checkpoints/expected.txt:2-10
- Boundary: Component checkpoint, not whole-job resume, standard interchange, authentication, or arbitrary-hardware bitwise portability.

### CLAIM-36 — Greedy, temperature, and top-k decoding
- Classification: reference-core-proven
- Claim: Greedy and positive-temperature stable top-k sampling reproduce choices from restored SplitMix64 state in an uncached full-prefix loop.
- Evidence: curriculum/chapters/36-temperature-top-k.md:253-268; rust/crates/llm-from-scratch/src/generation/sampling.rs:13-21; rust/crates/llm-from-scratch/src/generation/sampling.rs:842-881
- Boundary: No top-p, penalties, logprobs, boundary-spanning stops, Unicode streaming, constrained/speculative/multi-candidate generation, or sliding context.

### CLAIM-37 — Layer KV cache
- Classification: reference-core-proven
- Claim: One layer appends rotated K/unrotated V for the newest row and matches the full-prefix newest-position attention result.
- Evidence: curriculum/chapters/37-incremental-attention.md:242-263; rust/crates/llm-from-scratch/src/attention/incremental.rs:121-195
- Boundary: One fixed-capacity layer cache; no paging, sharing, batching, prefill owner, allocator, or multi-request lifecycle.

### CLAIM-38 — Batch-one model-wide KV cache
- Classification: reference-core-proven
- Claim: One cache per block binds to one exact scalar decoder, prefills once, decodes one token at a time, and matches fixed uncached decisions.
- Evidence: curriculum/chapters/38-cached-generation.md:257-285; rust/crates/llm-from-scratch/src/generation/kv_cache.rs:400-475; rust/crates/llm-from-scratch/src/generation/kv_cache.rs:566-585
- Boundary: Batch one and fixed allocation; no continuous batching, paging/sharing/eviction, queues, cancellation, backpressure, networking, or production allocator.

### CLAIM-39 — Tiny integration capstone
- Classification: reference-core-proven
- Claim: The exact tiny fixture integrates split, BPE, fixed windows, scalar decoder/AdamW selection, fixed-fixture slot evaluation, component checkpoint, and batch-one cached top-k generation.
- Evidence: curriculum/chapters/39-end-to-end-llm.md:267-285; rust/crates/llm-from-scratch/src/pipeline.rs:54-76; rust/demos/ch39-end-to-end-llm/expected.txt:1-13; rust/demos/ch39-end-to-end-llm/src/lib.rs:620-720
- Boundary: Integration proof only: 1,188 parameters and 32 updates, not useful prose/generalization, realistic corpus evaluation, full resume, accelerator training, post-training, or production-shaped serving.

## 6. Misleading or currently overbroad claim map

The issue is usually not that the nearby chapter scope is false—it is often admirably explicit—but that an isolated title, catalog card, handoff, or terminal sentence can be read without that boundary. “Complete” remains valid for a named graph/file/session/integration program; it is overbroad when the referent can be mistaken for the active functional-modern-LLM endpoint.

| ID | Exact current surface and wording | Assessment | Required wording boundary / action | Dependencies |
|---|---|---|---|---|
| `OVER-README-01` | `README.md:1`, `LLM, piece by piece`; `README.md:5-9`, “learning how modern large language models work … progressing … to a tiny but functional decoder-only LLM.” | Blocking before presenting the extension. “Tiny” helps, but “functional” plus broad modern-LLM purpose does not identify reference-core integration versus real-laptop functionality. | Say Chapters 0–39 are the exact scalar reference core/integration proof and name the separate production-shaped laptop track; keep explicit no-quality/no-production-scale boundary. | CAP-AUDIT-POSITION-01; canonical-English and Russian/catalog review |
| `OVER-CATALOG-EN-01` | `site/src/i18n/catalogs/en.json:3`, “Learn how modern language models work…”; `:10-12`, “working model,” “Build an LLM from first principles,” “one Rust program.” | Blocking isolated home/SEO copy. It can imply the current endpoint covers modern operational capability. | Retain the approachable title only with locally visible reference-core/laptop-track distinction; “working” must say what works (tiny scalar train/evaluate/reload/generate fixture) and what does not. | CAP-AUDIT-POSITION-01; home/index/SEO surface inventory and reviews |
| `OVER-CATALOG-RU-01` | `site/src/i18n/catalogs/ru.json:3`, “современные языковые модели”; `:10-12`, “работающей модели,” “Создайте LLM с нуля.” | Blocking Russian counterpart for the same isolated-role reason. | Translate the frozen revised English meaning directly; natural Russian must distinguish “скалярное эталонное ядро/интеграционный пример” from the laptop capability track without English calques. | English first, then localization workflow |
| `OVER-PLAN-01` | `curriculum/course-plan.md:773`, “Complete decoder-only LLM course plan”; `:775-780`, final target “complete enough to partition … train and evaluate … persist … generate with a key/value cache.” | Overbroad internal title/final-target statement after the accepted endpoint decision. | Rename/scope as the complete **40-chapter scalar reference-core plan** and point to the extension plan; do not call it the final course target. | CAP-AUDIT-POSITION-01; extension design |
| `OVER-PLAN-02` | `curriculum/course-plan.md:796-815`, “Target model and explicit boundaries,” ending “agreed functional teaching model.” | The boundaries are accurate, but “target” and “functional teaching model” now conflict with `D1`: it is no longer the final target. | Preserve exact architecture/exclusion record but relabel it “reference-core target”; say excluded capabilities are mandatory/advanced in the accepted extension rather than generic later work. | Audit and design classification |
| `OVER-PLAN-03` | `curriculum/course-plan.md:1499`, “Chapter 33 trains this complete decoder.” | Locally defensible graph referent but vulnerable in handoff inventory. | Prefer “complete scalar decoder graph assembled in Chapter 32”; do not imply complete training system. | CAP-AUDIT-POSITION-01, CAP-DTH-ARCH-02; CAP-DTH-BACKEND-01; CAP-DTH-MP-01; CAP-DTH-MEM-01; CAP-DTH-OPT-01; CAP-DTH-RESUME-01; CAP-DTH-EVAL-02; CAP-DTH-HW-01; CAP-ISA-ATT-002; CAP-ISA-ATT-003 |
| `OVER-PLAN-04` | `curriculum/course-plan.md:1594`, “Chapter 39 proves the complete course as one train/evaluate/save/load/cached-generate program.” | Blocking handoff: it claims course completion exactly where accepted decisions now say reference-core completion only. | “Chapter 39 integrates the Chapters 0–39 scalar reference path…” and hand off explicitly to governed laptop capabilities. | CAP-AUDIT-POSITION-01; extension plan ordering |
| `OVER-PLAN-05` | `curriculum/course-plan.md:1602`, “one functional bilingual decoder-only LLM”; `:1610`, “every component required to … extend a functional decoder-only LLM.” | Blocking final objective/handoff. The outcome is true as a tiny program but transferable completeness is not local enough. | Call it a deterministic scalar integration fixture and enumerate missing functional-laptop domains or link to the next track; “every component” must be “every reference-core component.” | CAP-AUDIT-POSITION-01; CAP-AUDIT-POSITION-01; CAP-DTH-HW-01; CAP-DTH-EVAL-02; CAP-ISA-ART-003; CAP-ISA-PT-001; CAP-ISA-SRV-006; CAP-ISA-SAFE-001 |
| `OVER-CH00-CONTRACT-01` | `curriculum/chapters/00-llm-parts.md:160`, “A map of a modern LLM”; `:225-228`, Chapter 39 “connects the complete system.” | Title is broader than the depicted model/application system; nearby `:170-173` correctly excludes serving/retrieval/MoE/instruction tuning, but the isolated title/map label does not carry that. | Title/map should identify the decoder reference core (or explicitly distinguish model core from wider modern system); “complete system” becomes “complete Chapters 0–39 reference pipeline.” | CAP-AUDIT-POSITION-01; Chapter 0 English review then Russian localization |
| `OVER-CH00-EN-01` | `site/src/content/chapters/en/00-llm-parts.mdx:9`, “A map of a modern LLM”; `:70`, “See the whole LLM”; `:75`, “How the complete system connects”; `:291`, “whole tiny LLM.” | Blocking isolated title/diagram labels; accessibility/figure roles can be consumed without distant scope. | Each isolated label names the decoder reference core/pipeline; add separate nodes or explicit later-track handoff rather than implying retrieval/tools/serving/post-training are inside the diagram. | English authoring/review workflow; diagram role inventory |
| `OVER-CH00-RU-01` | `site/src/content/chapters/ru/00-llm-parts.mdx:9`, “Карта устройства современной LLM”; `:70`, “LLM целиком”; `:75`, “вся система.” | Blocking localized isolated surfaces. | Directly localize the revised English role with natural bounded terminology; do not independently weaken/expand the boundary. | English freeze, then localization workflow |
| `OVER-CH32-01` | `curriculum/chapters/32-decoder-model.md:272`, “the first complete decoder-only language model in the course”; analogous English page headings at `site/src/content/chapters/en/32-decoder-model.mdx:176`, `:410`, `:494`. | Advisory-to-blocking at the new handoff: “complete” has a clear architectural meaning in local prose, but isolated headings/captions can imply operational completeness. | Keep “complete decoder graph/forward-and-loss boundary” and state explicitly that training system, realistic data/eval, accelerator, resume, post-training, and serving are absent. | CAP-AUDIT-POSITION-01; CAP-DTH-DATA-03; CAP-DTH-ARCH-02; CAP-DTH-BACKEND-01; CAP-DTH-MEM-01; CAP-DTH-RESUME-01; CAP-DTH-EVAL-02; CAP-ISA-PT-001; CAP-ISA-SRV-002 |
| `OVER-CH38-CONTRACT-01` | `curriculum/chapters/38-cached-generation.md:284-285`, “complete training-to-generation program”; `:503`, “complete graph-free inference path”; `:509-511`, one end-to-end program. | `complete graph-free inference path` is valid only for the batch-one scalar decoder; terminal handoff is overbroad. | Retain the local cache/session correctness claim but insert “batch-one fixed-capacity scalar reference”; handoff says Chapter 39 integrates the reference path, then points to continuous serving track. | CAP-AUDIT-POSITION-01; CAP-ISA-ATT-004; CAP-ISA-SRV-001; CAP-ISA-SRV-002; CAP-ISA-SRV-003/CAP-ISA-SRV-004; CAP-ISA-SRV-005; CAP-ISA-SRV-007; CAP-ISA-OBS-001 |
| `OVER-CH38-EN-01` | `site/src/content/chapters/en/38-cached-generation.mdx:530-543`, “Connect inference to the whole pipeline,” “The complete decoder,” and “whole road in one program.” | Blocking handoff immediately before capstone; current omissions at `:309` are too distant for the isolated heading/handoff role. | Use “Connect batch-one cached inference to the reference pipeline”; repeat batching/paging/eviction/server deferral and next-track destination locally. | English authoring/review, then locale refresh |
| `OVER-CH38-RU-01` | `site/src/content/chapters/ru/38-cached-generation.mdx:579-600`, “со всем процессом,” “полный декодер,” “полным процессом,” “весь пройденный путь.” | Blocking localized counterpart. | Natural Russian must identify the fixed-capacity batch-one reference pipeline and functional-serving handoff. | English freeze, then localization workflow |
| `OVER-CH39-CONTRACT-01` | `curriculum/chapters/39-end-to-end-llm.md:265`, “Run the whole tiny LLM”; `:559`, “The course now ends with one functioning decoder-only language-model program.” | Title's “tiny” and scope `:275-285` are honest; terminal course-end framing is obsolete under `D1`. | May retain “whole tiny reference LLM” if the title/description locally says integration proof; change course end to reference-core checkpoint and explicit next laptop track. | CAP-AUDIT-POSITION-01; CAP-AUDIT-POSITION-01; CAP-DTH-HW-01; CAP-DTH-EVAL-02; CAP-ISA-ART-003; CAP-ISA-PT-001; CAP-ISA-SRV-006; CAP-ISA-SAFE-001 |
| `OVER-CH39-OUTPUT-01` | `rust/demos/ch39-end-to-end-llm/expected.txt:13` and contract embedded expected output at `curriculum/chapters/39-end-to-end-llm.md:135`, `next=inspect, modify, test, and extend the complete decoder`. | Blocking learner evidence/handoff; exact output is an isolated surface and currently says “complete decoder” without referent. | Change to “complete scalar reference decoder” or equivalent, then regenerate all contract/page/trace/tests and invalidate/review dependent English/Russian evidence correctly. | CAP-AUDIT-POSITION-01; Rust/demo/content/review coordinated step |
| `OVER-CH39-EN-01` | `site/src/content/chapters/en/39-end-to-end-llm.mdx:8`, “Run the whole tiny LLM”; `:116`, “one functional program”; `:620`, “Take ownership of the complete decoder”; `:634`, “completes … modern decoder-only LLM at teaching scale.” | Blocking capstone/title/handoff. Exact metric limitations are excellent, but operational/domain gaps remain outside the terminal claim. | Title/description and terminal isolated section explicitly say scalar reference integration; replace course-completion sentence with handoff to production-shaped laptop track and its two endpoints. | CAP-AUDIT-POSITION-01; CAP-AUDIT-POSITION-01; CAP-DTH-HW-01; CAP-DTH-EVAL-02; CAP-ISA-ART-003; CAP-ISA-PT-001; CAP-ISA-SRV-006; CAP-ISA-SAFE-001; English review |
| `OVER-CH39-RU-01` | `site/src/content/chapters/ru/39-end-to-end-llm.mdx:596`, unchanged English `complete decoder` trace; `:702`, “весь декодер”; `:704`, “работающей программе”; `:718-722`, road to a modern decoder LLM completes. | Blocking Russian capstone/trace/handoff. | Localize the frozen English reference-core handoff; exact trace must either be intentionally language-neutral and bounded or localized consistently, never left as a broader English claim on the Russian page. | English/Rust evidence freeze, then direct Russian localization/review |
| `OVER-EVAL-01` | `curriculum/chapters/34-final-evaluation.md:269-294`; `site/src/content/chapters/en/34-final-evaluation.mdx:241-246`; `rust/demos/ch39-end-to-end-llm/expected.txt:6-9`. | **No reframe of the evidence classification is needed.** These surfaces already say fixed-fixture regression, deliberately selected ordering, and no independent generalization. | Preserve these statements verbatim in meaning; add a later conventional evaluator rather than weakening or relabeling current evidence. | CAP-DTH-EVAL-02/CAP-DTH-DATA-02; CAP-DTH-DATA-04; CAP-ISA-SAFE-001; CAP-ISA-SAFE-002 |
| `OVER-SCOPE-01` | `curriculum/chapters/39-end-to-end-llm.md:267-285`, explicitly no useful prose/generalization/production throughput/distributed scale; Chapter 38 omissions at `curriculum/chapters/38-cached-generation.md:279-285`. | **Accurate scope; preserve.** The problem is distant isolated titles/handoffs, not these paragraphs. | Keep the exact limitation facts and bring the smallest sufficient subset into each isolated terminal/title surface. | CAP-AUDIT-POSITION-01 |

Required sequencing: reframe canonical English and machine-generated learner evidence first; refresh contract commitments and exact tests; run the full English review/adjudication workflow; then translate directly into Russian and run target-only/bilingual/rendered review. A text edit to these surfaces invalidates existing English and locale judgments under `AGENTS.md`.

## 7. Limitations and parent handoff

- The exact 2026-08-10 review was recovered from mutable, uncommitted local session history. Its record hash and location are supplied above; every factual finding was rechecked independently against the current committed tree, so the history record is provenance for wording rather than authority for the verdict.
- This lane inspected source, contracts, manifests, frozen outputs, test declarations, and capstone assertions. It did not rerun the CPU-expensive capstone, install missing JavaScript dependencies, perform rendered Firefox review, acquire models/data, or execute GPU work.
- The standalone content validator was unavailable because `css-tree` is not installed. The direct 40-pair frontmatter inventory established chapter ID/revision/locale parity, but does not replace the complete content validator.
- The inventory is broad but not claimed exhaustive beyond the explicitly enumerated path classes and claim records. Fresh research-lane evidence may add capabilities or tighten boundaries; it cannot convert an unimplemented current-course capability into proof.
- Section 5 is explicitly provisional and excluded from canonical composition. The parent composer owns the final capability/source namespaces, literal C-sorted path inventory, cross-lane de-duplication, resource envelope, and canonical audit artifacts.

## 7. Literal live file inventory

This C-path-sorted inventory is generated from the same live roots as the validator; each file remains independently subject to the narrower claim and boundary above.

- `curriculum/chapters/00-llm-parts.md`
- `curriculum/chapters/01-text-units.md`
- `curriculum/chapters/02-corpus-partitions.md`
- `curriculum/chapters/03-learn-bpe-merges.md`
- `curriculum/chapters/04-apply-bpe-tokenizer.md`
- `curriculum/chapters/05-autoregressive-examples.md`
- `curriculum/chapters/06-bigram-baseline.md`
- `curriculum/chapters/07-language-model-metrics.md`
- `curriculum/chapters/08-tensor-storage.md`
- `curriculum/chapters/09-tensor-views.md`
- `curriculum/chapters/10-broadcasting-reductions.md`
- `curriculum/chapters/11-matrix-multiplication.md`
- `curriculum/chapters/12-stable-softmax.md`
- `curriculum/chapters/13-gradient-checking.md`
- `curriculum/chapters/14-scalar-autodiff.md`
- `curriculum/chapters/15-tensor-autodiff-core.md`
- `curriculum/chapters/16-model-autodiff-ops.md`
- `curriculum/chapters/17-parameter-initialization.md`
- `curriculum/chapters/18-token-embeddings.md`
- `curriculum/chapters/19-linear-layers.md`
- `curriculum/chapters/20-swiglu-feed-forward.md`
- `curriculum/chapters/21-mini-batches.md`
- `curriculum/chapters/22-adamw.md`
- `curriculum/chapters/23-neural-ngram.md`
- `curriculum/chapters/24-residual-connections.md`
- `curriculum/chapters/25-rmsnorm.md`
- `curriculum/chapters/26-qkv-projections.md`
- `curriculum/chapters/27-self-attention.md`
- `curriculum/chapters/28-causal-masking.md`
- `curriculum/chapters/29-rope.md`
- `curriculum/chapters/30-multi-head-attention.md`
- `curriculum/chapters/31-decoder-block.md`
- `curriculum/chapters/32-decoder-model.md`
- `curriculum/chapters/33-training-selection.md`
- `curriculum/chapters/34-final-evaluation.md`
- `curriculum/chapters/35-checkpoints.md`
- `curriculum/chapters/36-temperature-top-k.md`
- `curriculum/chapters/37-incremental-attention.md`
- `curriculum/chapters/38-cached-generation.md`
- `curriculum/chapters/39-end-to-end-llm.md`
- `rust/crates/llm-from-scratch/src/attention/causal_mask.rs`
- `rust/crates/llm-from-scratch/src/attention/incremental.rs`
- `rust/crates/llm-from-scratch/src/attention/multi_head.rs`
- `rust/crates/llm-from-scratch/src/attention/qkv.rs`
- `rust/crates/llm-from-scratch/src/attention/rope.rs`
- `rust/crates/llm-from-scratch/src/attention/self_attention.rs`
- `rust/crates/llm-from-scratch/src/autograd/gradcheck.rs`
- `rust/crates/llm-from-scratch/src/autograd/model_ops.rs`
- `rust/crates/llm-from-scratch/src/autograd/scalar.rs`
- `rust/crates/llm-from-scratch/src/autograd/tensor_core.rs`
- `rust/crates/llm-from-scratch/src/bigram.rs`
- `rust/crates/llm-from-scratch/src/checkpoint.rs`
- `rust/crates/llm-from-scratch/src/corpus.rs`
- `rust/crates/llm-from-scratch/src/data.rs`
- `rust/crates/llm-from-scratch/src/evaluation.rs`
- `rust/crates/llm-from-scratch/src/generation/kv_cache.rs`
- `rust/crates/llm-from-scratch/src/generation/mod.rs`
- `rust/crates/llm-from-scratch/src/generation/sampling.rs`
- `rust/crates/llm-from-scratch/src/lib.rs`
- `rust/crates/llm-from-scratch/src/metrics.rs`
- `rust/crates/llm-from-scratch/src/models/decoder.rs`
- `rust/crates/llm-from-scratch/src/models/decoder_block.rs`
- `rust/crates/llm-from-scratch/src/models/neural_ngram.rs`
- `rust/crates/llm-from-scratch/src/nn/embedding.rs`
- `rust/crates/llm-from-scratch/src/nn/init.rs`
- `rust/crates/llm-from-scratch/src/nn/linear.rs`
- `rust/crates/llm-from-scratch/src/nn/probability.rs`
- `rust/crates/llm-from-scratch/src/nn/residual.rs`
- `rust/crates/llm-from-scratch/src/nn/rmsnorm.rs`
- `rust/crates/llm-from-scratch/src/nn/swiglu.rs`
- `rust/crates/llm-from-scratch/src/pipeline.rs`
- `rust/crates/llm-from-scratch/src/tensor/matmul.rs`
- `rust/crates/llm-from-scratch/src/tensor/ops.rs`
- `rust/crates/llm-from-scratch/src/tensor/storage.rs`
- `rust/crates/llm-from-scratch/src/tensor/view.rs`
- `rust/crates/llm-from-scratch/src/tokenizer/bpe.rs`
- `rust/crates/llm-from-scratch/src/tokenizer/bpe_trainer.rs`
- `rust/crates/llm-from-scratch/src/training/adamw.rs`
- `rust/crates/llm-from-scratch/src/training/batch.rs`
- `rust/crates/llm-from-scratch/src/training/trainer.rs`
- `rust/demos/ch01-text-units/Cargo.toml`
- `rust/demos/ch01-text-units/src/lib.rs`
- `rust/demos/ch01-text-units/src/main.rs`
- `rust/demos/ch02-corpus-partitions/Cargo.toml`
- `rust/demos/ch02-corpus-partitions/src/lib.rs`
- `rust/demos/ch02-corpus-partitions/src/main.rs`
- `rust/demos/ch03-learn-bpe-merges/Cargo.toml`
- `rust/demos/ch03-learn-bpe-merges/src/lib.rs`
- `rust/demos/ch03-learn-bpe-merges/src/main.rs`
- `rust/demos/ch04-apply-bpe-tokenizer/Cargo.toml`
- `rust/demos/ch04-apply-bpe-tokenizer/src/lib.rs`
- `rust/demos/ch04-apply-bpe-tokenizer/src/main.rs`
- `rust/demos/ch05-autoregressive-examples/Cargo.toml`
- `rust/demos/ch05-autoregressive-examples/examples/diagram_trace.rs`
- `rust/demos/ch05-autoregressive-examples/src/lib.rs`
- `rust/demos/ch05-autoregressive-examples/src/main.rs`
- `rust/demos/ch06-bigram-baseline/Cargo.toml`
- `rust/demos/ch06-bigram-baseline/examples/diagram_trace.rs`
- `rust/demos/ch06-bigram-baseline/src/lib.rs`
- `rust/demos/ch06-bigram-baseline/src/main.rs`
- `rust/demos/ch07-language-model-metrics/Cargo.toml`
- `rust/demos/ch07-language-model-metrics/examples/diagram_trace.rs`
- `rust/demos/ch07-language-model-metrics/src/diagram_trace.rs`
- `rust/demos/ch07-language-model-metrics/src/lib.rs`
- `rust/demos/ch07-language-model-metrics/src/main.rs`
- `rust/demos/ch08-tensor-storage/Cargo.toml`
- `rust/demos/ch08-tensor-storage/examples/diagram_trace.rs`
- `rust/demos/ch08-tensor-storage/src/diagram_trace.rs`
- `rust/demos/ch08-tensor-storage/src/lib.rs`
- `rust/demos/ch08-tensor-storage/src/main.rs`
- `rust/demos/ch09-tensor-views/Cargo.toml`
- `rust/demos/ch09-tensor-views/examples/diagram_trace.rs`
- `rust/demos/ch09-tensor-views/src/diagram_trace.rs`
- `rust/demos/ch09-tensor-views/src/lib.rs`
- `rust/demos/ch09-tensor-views/src/main.rs`
- `rust/demos/ch10-broadcasting-reductions/Cargo.toml`
- `rust/demos/ch10-broadcasting-reductions/examples/diagram_trace.rs`
- `rust/demos/ch10-broadcasting-reductions/src/diagram_trace.rs`
- `rust/demos/ch10-broadcasting-reductions/src/lib.rs`
- `rust/demos/ch10-broadcasting-reductions/src/main.rs`
- `rust/demos/ch11-matrix-multiplication/Cargo.toml`
- `rust/demos/ch11-matrix-multiplication/examples/diagram_trace.rs`
- `rust/demos/ch11-matrix-multiplication/src/diagram_trace.rs`
- `rust/demos/ch11-matrix-multiplication/src/lib.rs`
- `rust/demos/ch11-matrix-multiplication/src/main.rs`
- `rust/demos/ch12-stable-softmax/Cargo.toml`
- `rust/demos/ch12-stable-softmax/examples/diagram_trace.rs`
- `rust/demos/ch12-stable-softmax/src/diagram_trace.rs`
- `rust/demos/ch12-stable-softmax/src/lib.rs`
- `rust/demos/ch12-stable-softmax/src/main.rs`
- `rust/demos/ch13-gradient-checking/Cargo.toml`
- `rust/demos/ch13-gradient-checking/examples/diagram_trace.rs`
- `rust/demos/ch13-gradient-checking/src/diagram_trace.rs`
- `rust/demos/ch13-gradient-checking/src/lib.rs`
- `rust/demos/ch13-gradient-checking/src/main.rs`
- `rust/demos/ch14-scalar-autodiff/Cargo.toml`
- `rust/demos/ch14-scalar-autodiff/examples/diagram_trace.rs`
- `rust/demos/ch14-scalar-autodiff/src/diagram_trace.rs`
- `rust/demos/ch14-scalar-autodiff/src/lib.rs`
- `rust/demos/ch14-scalar-autodiff/src/main.rs`
- `rust/demos/ch15-tensor-autodiff-core/Cargo.toml`
- `rust/demos/ch15-tensor-autodiff-core/examples/diagram_trace.rs`
- `rust/demos/ch15-tensor-autodiff-core/src/diagram_trace.rs`
- `rust/demos/ch15-tensor-autodiff-core/src/lib.rs`
- `rust/demos/ch15-tensor-autodiff-core/src/main.rs`
- `rust/demos/ch16-model-autodiff-ops/Cargo.toml`
- `rust/demos/ch16-model-autodiff-ops/examples/diagram_trace.rs`
- `rust/demos/ch16-model-autodiff-ops/src/diagram_trace.rs`
- `rust/demos/ch16-model-autodiff-ops/src/lib.rs`
- `rust/demos/ch16-model-autodiff-ops/src/main.rs`
- `rust/demos/ch17-parameter-initialization/Cargo.toml`
- `rust/demos/ch17-parameter-initialization/examples/diagram_trace.rs`
- `rust/demos/ch17-parameter-initialization/src/diagram_trace.rs`
- `rust/demos/ch17-parameter-initialization/src/lib.rs`
- `rust/demos/ch17-parameter-initialization/src/main.rs`
- `rust/demos/ch18-token-embeddings/Cargo.toml`
- `rust/demos/ch18-token-embeddings/examples/diagram_trace.rs`
- `rust/demos/ch18-token-embeddings/src/diagram_trace.rs`
- `rust/demos/ch18-token-embeddings/src/lib.rs`
- `rust/demos/ch18-token-embeddings/src/main.rs`
- `rust/demos/ch19-linear-layers/Cargo.toml`
- `rust/demos/ch19-linear-layers/examples/diagram_trace.rs`
- `rust/demos/ch19-linear-layers/src/diagram_trace.rs`
- `rust/demos/ch19-linear-layers/src/lib.rs`
- `rust/demos/ch19-linear-layers/src/main.rs`
- `rust/demos/ch20-swiglu-feed-forward/Cargo.toml`
- `rust/demos/ch20-swiglu-feed-forward/examples/diagram_trace.rs`
- `rust/demos/ch20-swiglu-feed-forward/src/diagram_trace.rs`
- `rust/demos/ch20-swiglu-feed-forward/src/lib.rs`
- `rust/demos/ch20-swiglu-feed-forward/src/main.rs`
- `rust/demos/ch21-mini-batches/Cargo.toml`
- `rust/demos/ch21-mini-batches/examples/diagram_trace.rs`
- `rust/demos/ch21-mini-batches/src/diagram_trace.rs`
- `rust/demos/ch21-mini-batches/src/lib.rs`
- `rust/demos/ch21-mini-batches/src/main.rs`
- `rust/demos/ch22-adamw/Cargo.toml`
- `rust/demos/ch22-adamw/examples/diagram_trace.rs`
- `rust/demos/ch22-adamw/src/diagram_trace.rs`
- `rust/demos/ch22-adamw/src/lib.rs`
- `rust/demos/ch22-adamw/src/main.rs`
- `rust/demos/ch23-neural-ngram/Cargo.toml`
- `rust/demos/ch23-neural-ngram/examples/diagram_trace.rs`
- `rust/demos/ch23-neural-ngram/src/diagram_trace.rs`
- `rust/demos/ch23-neural-ngram/src/lib.rs`
- `rust/demos/ch23-neural-ngram/src/main.rs`
- `rust/demos/ch24-residual-connections/Cargo.toml`
- `rust/demos/ch24-residual-connections/examples/diagram_trace.rs`
- `rust/demos/ch24-residual-connections/src/diagram_trace.rs`
- `rust/demos/ch24-residual-connections/src/lib.rs`
- `rust/demos/ch24-residual-connections/src/main.rs`
- `rust/demos/ch25-rmsnorm/Cargo.toml`
- `rust/demos/ch25-rmsnorm/examples/diagram_trace.rs`
- `rust/demos/ch25-rmsnorm/src/diagram_trace.rs`
- `rust/demos/ch25-rmsnorm/src/lib.rs`
- `rust/demos/ch25-rmsnorm/src/main.rs`
- `rust/demos/ch26-qkv-projections/Cargo.toml`
- `rust/demos/ch26-qkv-projections/examples/diagram_trace.rs`
- `rust/demos/ch26-qkv-projections/src/diagram_trace.rs`
- `rust/demos/ch26-qkv-projections/src/lib.rs`
- `rust/demos/ch26-qkv-projections/src/main.rs`
- `rust/demos/ch27-self-attention/Cargo.toml`
- `rust/demos/ch27-self-attention/examples/diagram_trace.rs`
- `rust/demos/ch27-self-attention/src/diagram_trace.rs`
- `rust/demos/ch27-self-attention/src/lib.rs`
- `rust/demos/ch27-self-attention/src/main.rs`
- `rust/demos/ch28-causal-masking/Cargo.toml`
- `rust/demos/ch28-causal-masking/examples/diagram_trace.rs`
- `rust/demos/ch28-causal-masking/src/diagram_trace.rs`
- `rust/demos/ch28-causal-masking/src/lib.rs`
- `rust/demos/ch28-causal-masking/src/main.rs`
- `rust/demos/ch29-rope/Cargo.toml`
- `rust/demos/ch29-rope/examples/diagram_trace.rs`
- `rust/demos/ch29-rope/src/diagram_trace.rs`
- `rust/demos/ch29-rope/src/lib.rs`
- `rust/demos/ch29-rope/src/main.rs`
- `rust/demos/ch30-multi-head-attention/Cargo.toml`
- `rust/demos/ch30-multi-head-attention/examples/diagram_trace.rs`
- `rust/demos/ch30-multi-head-attention/src/diagram_trace.rs`
- `rust/demos/ch30-multi-head-attention/src/lib.rs`
- `rust/demos/ch30-multi-head-attention/src/main.rs`
- `rust/demos/ch31-decoder-block/Cargo.toml`
- `rust/demos/ch31-decoder-block/examples/diagram_trace.rs`
- `rust/demos/ch31-decoder-block/src/diagram_trace.rs`
- `rust/demos/ch31-decoder-block/src/lib.rs`
- `rust/demos/ch31-decoder-block/src/main.rs`
- `rust/demos/ch32-decoder-model/Cargo.toml`
- `rust/demos/ch32-decoder-model/examples/diagram_trace.rs`
- `rust/demos/ch32-decoder-model/src/diagram_trace.rs`
- `rust/demos/ch32-decoder-model/src/lib.rs`
- `rust/demos/ch32-decoder-model/src/main.rs`
- `rust/demos/ch33-training-selection/Cargo.toml`
- `rust/demos/ch33-training-selection/examples/diagram_trace.rs`
- `rust/demos/ch33-training-selection/src/diagram_trace.rs`
- `rust/demos/ch33-training-selection/src/lib.rs`
- `rust/demos/ch33-training-selection/src/main.rs`
- `rust/demos/ch34-final-evaluation/Cargo.toml`
- `rust/demos/ch34-final-evaluation/examples/diagram_trace.rs`
- `rust/demos/ch34-final-evaluation/src/diagram_trace.rs`
- `rust/demos/ch34-final-evaluation/src/lib.rs`
- `rust/demos/ch34-final-evaluation/src/main.rs`
- `rust/demos/ch35-checkpoints/Cargo.toml`
- `rust/demos/ch35-checkpoints/src/lib.rs`
- `rust/demos/ch35-checkpoints/src/main.rs`
- `rust/demos/ch36-temperature-top-k/Cargo.toml`
- `rust/demos/ch36-temperature-top-k/examples/diagram_trace.rs`
- `rust/demos/ch36-temperature-top-k/src/lib.rs`
- `rust/demos/ch36-temperature-top-k/src/main.rs`
- `rust/demos/ch37-incremental-attention/Cargo.toml`
- `rust/demos/ch37-incremental-attention/examples/diagram_trace.rs`
- `rust/demos/ch37-incremental-attention/src/lib.rs`
- `rust/demos/ch37-incremental-attention/src/main.rs`
- `rust/demos/ch38-cached-generation/Cargo.toml`
- `rust/demos/ch38-cached-generation/examples/diagram_trace.rs`
- `rust/demos/ch38-cached-generation/src/lib.rs`
- `rust/demos/ch38-cached-generation/src/main.rs`
- `rust/demos/ch39-end-to-end-llm/Cargo.toml`
- `rust/demos/ch39-end-to-end-llm/examples/diagram_trace.rs`
- `rust/demos/ch39-end-to-end-llm/src/lib.rs`
- `rust/demos/ch39-end-to-end-llm/src/main.rs`
- `rust/demos/chapter-demo-template/Cargo.toml`
- `rust/demos/chapter-demo-template/src/main.rs`
- `site/src/content/chapters/en/00-llm-parts.mdx`
- `site/src/content/chapters/en/01-text-units.mdx`
- `site/src/content/chapters/en/02-corpus-partitions.mdx`
- `site/src/content/chapters/en/03-learn-bpe-merges.mdx`
- `site/src/content/chapters/en/04-apply-bpe-tokenizer.mdx`
- `site/src/content/chapters/en/05-autoregressive-examples.mdx`
- `site/src/content/chapters/en/06-bigram-baseline.mdx`
- `site/src/content/chapters/en/07-language-model-metrics.mdx`
- `site/src/content/chapters/en/08-tensor-storage.mdx`
- `site/src/content/chapters/en/09-tensor-views.mdx`
- `site/src/content/chapters/en/10-broadcasting-reductions.mdx`
- `site/src/content/chapters/en/11-matrix-multiplication.mdx`
- `site/src/content/chapters/en/12-stable-softmax.mdx`
- `site/src/content/chapters/en/13-gradient-checking.mdx`
- `site/src/content/chapters/en/14-scalar-autodiff.mdx`
- `site/src/content/chapters/en/15-tensor-autodiff-core.mdx`
- `site/src/content/chapters/en/16-model-autodiff-ops.mdx`
- `site/src/content/chapters/en/17-parameter-initialization.mdx`
- `site/src/content/chapters/en/18-token-embeddings.mdx`
- `site/src/content/chapters/en/19-linear-layers.mdx`
- `site/src/content/chapters/en/20-swiglu-feed-forward.mdx`
- `site/src/content/chapters/en/21-mini-batches.mdx`
- `site/src/content/chapters/en/22-adamw.mdx`
- `site/src/content/chapters/en/23-neural-ngram.mdx`
- `site/src/content/chapters/en/24-residual-connections.mdx`
- `site/src/content/chapters/en/25-rmsnorm.mdx`
- `site/src/content/chapters/en/26-qkv-projections.mdx`
- `site/src/content/chapters/en/27-self-attention.mdx`
- `site/src/content/chapters/en/28-causal-masking.mdx`
- `site/src/content/chapters/en/29-rope.mdx`
- `site/src/content/chapters/en/30-multi-head-attention.mdx`
- `site/src/content/chapters/en/31-decoder-block.mdx`
- `site/src/content/chapters/en/32-decoder-model.mdx`
- `site/src/content/chapters/en/33-training-selection.mdx`
- `site/src/content/chapters/en/34-final-evaluation.mdx`
- `site/src/content/chapters/en/35-checkpoints.mdx`
- `site/src/content/chapters/en/36-temperature-top-k.mdx`
- `site/src/content/chapters/en/37-incremental-attention.mdx`
- `site/src/content/chapters/en/38-cached-generation.mdx`
- `site/src/content/chapters/en/39-end-to-end-llm.mdx`
- `site/src/content/chapters/ru/00-llm-parts.mdx`
- `site/src/content/chapters/ru/01-text-units.mdx`
- `site/src/content/chapters/ru/02-corpus-partitions.mdx`
- `site/src/content/chapters/ru/03-learn-bpe-merges.mdx`
- `site/src/content/chapters/ru/04-apply-bpe-tokenizer.mdx`
- `site/src/content/chapters/ru/05-autoregressive-examples.mdx`
- `site/src/content/chapters/ru/06-bigram-baseline.mdx`
- `site/src/content/chapters/ru/07-language-model-metrics.mdx`
- `site/src/content/chapters/ru/08-tensor-storage.mdx`
- `site/src/content/chapters/ru/09-tensor-views.mdx`
- `site/src/content/chapters/ru/10-broadcasting-reductions.mdx`
- `site/src/content/chapters/ru/11-matrix-multiplication.mdx`
- `site/src/content/chapters/ru/12-stable-softmax.mdx`
- `site/src/content/chapters/ru/13-gradient-checking.mdx`
- `site/src/content/chapters/ru/14-scalar-autodiff.mdx`
- `site/src/content/chapters/ru/15-tensor-autodiff-core.mdx`
- `site/src/content/chapters/ru/16-model-autodiff-ops.mdx`
- `site/src/content/chapters/ru/17-parameter-initialization.mdx`
- `site/src/content/chapters/ru/18-token-embeddings.mdx`
- `site/src/content/chapters/ru/19-linear-layers.mdx`
- `site/src/content/chapters/ru/20-swiglu-feed-forward.mdx`
- `site/src/content/chapters/ru/21-mini-batches.mdx`
- `site/src/content/chapters/ru/22-adamw.mdx`
- `site/src/content/chapters/ru/23-neural-ngram.mdx`
- `site/src/content/chapters/ru/24-residual-connections.mdx`
- `site/src/content/chapters/ru/25-rmsnorm.mdx`
- `site/src/content/chapters/ru/26-qkv-projections.mdx`
- `site/src/content/chapters/ru/27-self-attention.mdx`
- `site/src/content/chapters/ru/28-causal-masking.mdx`
- `site/src/content/chapters/ru/29-rope.mdx`
- `site/src/content/chapters/ru/30-multi-head-attention.mdx`
- `site/src/content/chapters/ru/31-decoder-block.mdx`
- `site/src/content/chapters/ru/32-decoder-model.mdx`
- `site/src/content/chapters/ru/33-training-selection.mdx`
- `site/src/content/chapters/ru/34-final-evaluation.mdx`
- `site/src/content/chapters/ru/35-checkpoints.mdx`
- `site/src/content/chapters/ru/36-temperature-top-k.mdx`
- `site/src/content/chapters/ru/37-incremental-attention.mdx`
- `site/src/content/chapters/ru/38-cached-generation.mdx`
- `site/src/content/chapters/ru/39-end-to-end-llm.mdx`
- `site/src/content/cheat-sheets/en/01-text-units.json`
- `site/src/content/cheat-sheets/en/02-corpus-partitions.json`
- `site/src/content/cheat-sheets/en/03-learn-bpe-merges.json`
- `site/src/content/cheat-sheets/en/04-apply-bpe-tokenizer.json`
- `site/src/content/cheat-sheets/en/05-autoregressive-examples.json`
- `site/src/content/cheat-sheets/en/06-bigram-baseline.json`
- `site/src/content/cheat-sheets/en/07-language-model-metrics.json`
- `site/src/content/cheat-sheets/en/08-tensor-storage.json`
- `site/src/content/cheat-sheets/en/09-tensor-views.json`
- `site/src/content/cheat-sheets/en/10-broadcasting-reductions.json`
- `site/src/content/cheat-sheets/en/11-matrix-multiplication.json`
- `site/src/content/cheat-sheets/en/12-stable-softmax.json`
- `site/src/content/cheat-sheets/en/13-gradient-checking.json`
- `site/src/content/cheat-sheets/en/14-scalar-autodiff.json`
- `site/src/content/cheat-sheets/en/15-tensor-autodiff-core.json`
- `site/src/content/cheat-sheets/en/16-model-autodiff-ops.json`
- `site/src/content/cheat-sheets/en/17-parameter-initialization.json`
- `site/src/content/cheat-sheets/en/18-token-embeddings.json`
- `site/src/content/cheat-sheets/en/19-linear-layers.json`
- `site/src/content/cheat-sheets/en/20-swiglu-feed-forward.json`
- `site/src/content/cheat-sheets/en/21-mini-batches.json`
- `site/src/content/cheat-sheets/en/22-adamw.json`
- `site/src/content/cheat-sheets/en/23-neural-ngram.json`
- `site/src/content/cheat-sheets/en/24-residual-connections.json`
- `site/src/content/cheat-sheets/en/25-rmsnorm.json`
- `site/src/content/cheat-sheets/en/26-qkv-projections.json`
- `site/src/content/cheat-sheets/en/27-self-attention.json`
- `site/src/content/cheat-sheets/en/28-causal-masking.json`
- `site/src/content/cheat-sheets/en/29-rope.json`
- `site/src/content/cheat-sheets/en/30-multi-head-attention.json`
- `site/src/content/cheat-sheets/en/31-decoder-block.json`
- `site/src/content/cheat-sheets/en/32-decoder-model.json`
- `site/src/content/cheat-sheets/en/33-training-selection.json`
- `site/src/content/cheat-sheets/en/34-final-evaluation.json`
- `site/src/content/cheat-sheets/en/35-checkpoints.json`
- `site/src/content/cheat-sheets/en/36-temperature-top-k.json`
- `site/src/content/cheat-sheets/en/37-incremental-attention.json`
- `site/src/content/cheat-sheets/en/38-cached-generation.json`
- `site/src/content/cheat-sheets/en/39-end-to-end-llm.json`
- `site/src/content/cheat-sheets/ru/01-text-units.json`
- `site/src/content/cheat-sheets/ru/02-corpus-partitions.json`
- `site/src/content/cheat-sheets/ru/03-learn-bpe-merges.json`
- `site/src/content/cheat-sheets/ru/04-apply-bpe-tokenizer.json`
- `site/src/content/cheat-sheets/ru/05-autoregressive-examples.json`
- `site/src/content/cheat-sheets/ru/06-bigram-baseline.json`
- `site/src/content/cheat-sheets/ru/07-language-model-metrics.json`
- `site/src/content/cheat-sheets/ru/08-tensor-storage.json`
- `site/src/content/cheat-sheets/ru/09-tensor-views.json`
- `site/src/content/cheat-sheets/ru/10-broadcasting-reductions.json`
- `site/src/content/cheat-sheets/ru/11-matrix-multiplication.json`
- `site/src/content/cheat-sheets/ru/12-stable-softmax.json`
- `site/src/content/cheat-sheets/ru/13-gradient-checking.json`
- `site/src/content/cheat-sheets/ru/14-scalar-autodiff.json`
- `site/src/content/cheat-sheets/ru/15-tensor-autodiff-core.json`
- `site/src/content/cheat-sheets/ru/16-model-autodiff-ops.json`
- `site/src/content/cheat-sheets/ru/17-parameter-initialization.json`
- `site/src/content/cheat-sheets/ru/18-token-embeddings.json`
- `site/src/content/cheat-sheets/ru/19-linear-layers.json`
- `site/src/content/cheat-sheets/ru/20-swiglu-feed-forward.json`
- `site/src/content/cheat-sheets/ru/21-mini-batches.json`
- `site/src/content/cheat-sheets/ru/22-adamw.json`
- `site/src/content/cheat-sheets/ru/23-neural-ngram.json`
- `site/src/content/cheat-sheets/ru/24-residual-connections.json`
- `site/src/content/cheat-sheets/ru/25-rmsnorm.json`
- `site/src/content/cheat-sheets/ru/26-qkv-projections.json`
- `site/src/content/cheat-sheets/ru/27-self-attention.json`
- `site/src/content/cheat-sheets/ru/28-causal-masking.json`
- `site/src/content/cheat-sheets/ru/29-rope.json`
- `site/src/content/cheat-sheets/ru/30-multi-head-attention.json`
- `site/src/content/cheat-sheets/ru/31-decoder-block.json`
- `site/src/content/cheat-sheets/ru/32-decoder-model.json`
- `site/src/content/cheat-sheets/ru/33-training-selection.json`
- `site/src/content/cheat-sheets/ru/34-final-evaluation.json`
- `site/src/content/cheat-sheets/ru/35-checkpoints.json`
- `site/src/content/cheat-sheets/ru/36-temperature-top-k.json`
- `site/src/content/cheat-sheets/ru/37-incremental-attention.json`
- `site/src/content/cheat-sheets/ru/38-cached-generation.json`
- `site/src/content/cheat-sheets/ru/39-end-to-end-llm.json`
