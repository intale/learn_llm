# Chapter 44 — scalable BPE tokenizer: detailed implementation packet

Status: internal planning only. No tokenizer training, acquisition, implementation
or publication is authorized by this packet. Use [the common guide](README.md)
and [Chapter 43](43-deduplication-decontamination.md). The executor is one
context using the user-selected model without subagents; independent reviews require external
provisioning, not self-certification.

## 1. Scope and boundary

| Field | Commitment |
| --- | --- |
| Chapter / planning step | `44-scalable-bpe-tokenizer` / `detail-ch44-scalable-bpe-tokenizer` |
| Implementation / predecessor | `implement-ch44-scalable-bpe-tokenizer` / `execute-functional-corpus-dedup-split` |
| Capabilities | `CAP-DTH-TOK-01`, `CAP-DTH-TOK-02` |
| Finding / claims | `F07`; `CLAIM-01`, `CLAIM-03`, `CLAIM-04` |
| Formula / figure | `teaching-formula-ch44-scalable-bpe-tokenizer` / `scalable-bpe-tokenizer` |
| Small concept | A faster, bounded implementation must make the same ordered merge decisions as an inspectable scalar reference under the same policy. |
| Outcome | Train-only streaming BPE training/application; frozen text/control/artifact policy; deterministic parity and named efficiency evidence. |
| Boundary | No tokenizer library choosing merges, segmentation or control IDs; no implied GPT-2 compatibility from byte coverage; no new vocabulary layout or model acquisition. |

Exact frozen prerequisites:

```text
curriculum/functional-laptop-llm-extension-plan.md
audits/2026-08-10-functional-llm-capability/coverage.md
audits/2026-08-10-functional-llm-capability/requirements.md
audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md
.agents/skills/author-llm-course-english/SKILL.md
.agents/skills/localize-llm-course/SKILL.md
site/src/i18n/functional-chapter-locales.json
exact predecessor checkpoint=execute-functional-corpus-dedup-split
deduplicated-split-corpus-v1 receipt and frozen train-only split identity
exact standalone GPT-2 tokenizer admission/oracle contract; payload authority belongs only to the immediately following execution crosscut
artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
```

Missing future foundation/locale/runtime artifacts stay prerequisite-held, not
substituted by current legacy files. Preserve the execution boundary:

```text
execute-functional-corpus-dedup-split
 -> implement-ch44-scalable-bpe-tokenizer
 -> execute-functional-tokenizer-and-tokenized-splits
 -> implement-ch45-padded-variable-batches
```

The chapter implements/tests algorithms and emits its implementation receipt.
The following execution step owns real corpus training/tokenization, exact
standalone GPT-2 admission and independent oracle evidence. An N1 historical
source read is not N3 artifact acquisition.

## 2. Evidence, historical contrast and identity ledger

Baseline commit: `8a334552dc7b7ccbcdedfb910f512f2cae1c480d`.
Frozen [extension plan](../functional-laptop-llm-extension-plan.md) SHA-256:
`84d8ab860a3282dd5d373ca285a3815b04836d9abb7a1d2267e163143091bea1`.

Existing code:

- [bpe_trainer.rs](../../rust/crates/llm-from-scratch/src/tokenizer/bpe_trainer.rs)
  owns `BpeTrainer`, `BpeTraining`, `TokenPair`, `count_adjacent_pairs`,
  `choose_most_frequent_pair`, `replace_pair_left_to_right` and `bytes_to_tokens`.
  Training uses only `CorpusPartitions::training_documents()`. Counts come from
  current sequences, not the original text at every rank.
- The current `BTreeMap` pair order and strictly-greater winner update select
  the smallest `(left,right)` pair on equal frequency. Replacements consume
  nonoverlapping occurrences left to right. Preserve these semantics.
- [bpe.rs](../../rust/crates/llm-from-scratch/src/tokenizer/bpe.rs) owns
  `BpeTokenizer`, `TokenizerLayout`, merge/application traces, content/document
  encoding and strict decoding. Layout version 1 has BOS 0, EOS 1, bytes 2–257,
  first merge 258 and no PAD.
- `lib.rs` has the existing inline `tokenizer` module. Add registered children;
  do not invent a second module root or replace the old scalar implementation.

Primary sources inspected read-only on 2026-09-15:

| Frozen source | Historical commitment and limit |
| --- | --- |
| `SRC-DTH-TOK-01`, earlier 2016: [Sennrich et al.](https://aclanthology.org/P16-1162/), [section 3.2](https://aclanthology.org/P16-1162.pdf) | Learned subword units came from repeated pair-frequency decisions, with word-boundary treatment. This does not imply that their character-based system supplied the course's complete byte alphabet or artifact policy. |
| `SRC-DTH-TOK-04`, later 2019: [pinned GPT-2 encoder](https://github.com/openai/gpt-2/blob/e5c5054474f583d6d9499624649353995d63c70a/src/encoder.py) | Reversible byte-to-Unicode mapping, a concrete regex pretokenizer and ranked merges form an implementation-specific tokenizer. Raw-byte course BPE is not automatically compatible with it. |

The historical Rust contrast runs a scalar rank-by-rank pair trace and the
course-owned faster path on the same policy. A separate bounded imported-policy
fixture shows why different pretokenization/control rules change compatibility.
No Python code becomes a learner example; the later Python oracle is a separate
frozen validation role, not the course implementation.

### Do not conflate these identities

| Identity | Required treatment |
| --- | --- |
| Existing tiny-course tokenizer | Preserve current APIs, corpus and historical eight-merge evidence. Same vocabulary size does not identify its training lineage. |
| Frozen new course-reference lineage | Exactly 266 IDs, eight ordered merges emitted once from the frozen train-only corpus; BOS 0, EOS 1, bytes 2–257, merges 258–265, PAD absent; normalization none, `raw-bytes-only`. Bind before Chapters 45/56; no later retraining/substitution. |
| Scalable laptop tokenizer | The resource projection uses vocabulary 16,384; the capability estimates a 4,096–16,384 range. The main transform role is named `train-only-tokenizer`, but its relationship to the separate 266-ID receipt needs an explicit phase-spec binding before real execution. |
| Imported GPT-2 tokenizer | Native vocabulary 50,257 and end-of-text ID 50,256; exact pinned policy. Validation-only; never the course tokenizer or selected-model payload. |

Readiness refinement, not an edit to the frozen plan: propose that the main
train-only role identify the chosen scalable configuration, with the separately
required reference receipt identifying its exact eight-merge raw-byte prefix
when training policy and corpus are identical. Freeze both payload paths,
vocabulary expectations, receipts and consuming profiles in the execution spec
before any real training. If the completed foundation specifies a different
mapping, stop at that integration gate and record the difference; do not invent
an extra role, relabel one tokenizer, or substitute GPT-2 to make the shapes fit.
Algorithm fixtures and implementation-only evidence do not resolve this ambiguity.

The fixed reference template is
`configs/functional-data-pipeline/raw-token-sequence-template-v1.json`, with exact
canonical bytes `{"id":"raw-token-sequence-v1","template":"none"}\n` and SHA-256
`67e2739043a79fbd71491d8bbc86e4036bc6948d46952a578219071fc6d71321`.
It adds no conversation template. No vocabulary PAD ID is introduced here.
Chapter 45 may use a separately specified batch-storage sentinel; it must not
change or reinterpret this immutable tokenizer layout.

## 3. Frozen policy proposal and worked example

For the course path, keep normalization `none` and pretokenization
`raw-bytes-only`: each document is one byte sequence, and pairs never cross
document boundaries. Whitespace is ordinary preserved content. All 256 byte
values have content IDs; BOS/EOS are inserted through typed document framing,
not learned pair formation. Literal special-looking text remains content bytes.

Request a merge count explicitly. Choose the largest current pair frequency;
ties choose the smallest numeric pair. Apply all live nonoverlapping occurrences
left to right. Permit frequency-one merges in the fixture and fixed reference.
Stop on the requested count or absence of pairs; an exact-eight/reference or
exact-vocabulary requirement fails if too few merges are possible. Never pad
a vocabulary with fictitious merge rules.

Public layout-1 IDs are distinct from any internal trainer symbol numbering.
For public IDs, ASCII `a,b,c` are 99,100,101. Keep conversions named and checked;
never compare an internal byte-symbol ID directly with an artifact token ID.

### Complete two-merge fixture

Training documents are exactly `abab` and `abac`, independently framed;
held-out application text is `acac`. BOS/EOS do not contribute pair counts.

| Rank | Current pair counts | Chosen pair / new public ID | Training sequences after replacement |
| --- | --- | --- | --- |
| 0 | `(a,b)=3`, `(b,a)=2`, `(a,c)=1` | `(99,100)` → 258, bytes `ab` | `[258,258]`; `[258,99,101]` |
| 1 | `(258,258)=1`, `(258,99)=1`, `(99,101)=1` | `(99,101)` → 259, bytes `ac` | `[258,258]`; `[258,259]` |

There are three pair occurrences at rank 1, not four. All frequencies tie;
numeric pair order chooses `(99,101)`. A third requested merge would choose
`(258,258)` over `(258,259)`, emit ID 260, and leave `[260]`; `[258,259]`.
This extra rank is an exercise, not part of the primary two-merge trace.

Held-out `acac` encodes as `[259,259]` after two merges without changing the
trainer. A separate leakage test makes held-out `ac` repetition frequent enough
to change the winning pair if accidentally included, then proves that training
pairs/artifact remain unchanged when only held-out text changes.

Frozen formulas:
$$\operatorname{pair}_t=\operatorname{stable\,argmax}_{(a,b)}
  \operatorname{count}_t(a,b),\qquad
  \eta=\frac{\operatorname{token\_count}}{\operatorname{UTF8\_byte\_count}}.$$

The rank index $t$ counts already-applied merges. Define the stable tie rule
locally. For efficiency, primary `token_count` means content IDs only, excluding
BOS/EOS and any batch padding. Training text has 8 UTF-8 bytes and 4 content IDs
after two merges, so $\eta=4/8=1/2$. Encoding both framed documents adds four
controls, giving 8 total stored IDs; that different counter is named separately.
Held-out text has 4 bytes and 2 content IDs, also $1/2$. Empty content has zero
bytes and unavailable efficiency, not a zero or infinite claimed ratio.

A lower tokens-per-byte ratio describes this representation, not linguistic
quality, training quality or a guaranteed speedup. UTF-8 byte count is not
Unicode-scalar or grapheme count. A multibyte scalar begins as multiple byte
symbols; token fragments need not individually be valid UTF-8.

### Chunking and controls

Streaming means corpus input/output is incremental and resident state is bounded;
it does not mean global BPE statistics require constant memory. A transport
chunk boundary is not a document or pretoken boundary. Carry unfinished frames;
never prevent a valid merge merely because its bytes arrived in separate reads.
The Chapter 42 record bound helps application stay document-bounded.

Test byte APIs separately from text APIs. Every byte value round-trips through
content encoding/decoding. UTF-8 adapters reject invalid reconstructed text
rather than using replacement characters. Strict document decoding checks outer
BOS/EOS and refuses interior control IDs. Text containing a spelling such as
`<|pad|>` does not produce a structural control. A caller-supplied invalid
control-ID sequence is refused, not silently escaped or relabeled.

## 4. Rust design, scalable algorithm and artifact ownership

Exact frozen future outputs:

```text
curriculum/chapters/44-scalable-bpe-tokenizer.md
rust/crates/llm-from-scratch/module-registry/functional-v1/ch44-scalable-bpe-tokenizer.module
rust/crates/llm-from-scratch/tests/ch44_scalable_bpe_tokenizer.rs
rust/crates/llm-from-scratch/examples/ch44_scalable_bpe_tokenizer.rs
rust/crates/llm-from-scratch/examples/expected/ch44_scalable_bpe_tokenizer.txt
rust/crates/llm-from-scratch/src/tokenizer/streaming_trainer.rs
rust/crates/llm-from-scratch/src/tokenizer/streaming_bpe.rs
rust/crates/llm-from-scratch/src/tokenizer/policy.rs
rust/crates/llm-from-scratch/src/tokenizer/artifact.rs
rust/crates/llm-from-scratch/src/tokenizer/compatibility.rs
site/src/content/chapters/en/44-scalable-bpe-tokenizer.mdx
site/src/content/chapters/ru/44-scalable-bpe-tokenizer.mdx
site/src/i18n/functional-catalogs/en/44-scalable-bpe-tokenizer.json
site/src/i18n/functional-catalogs/ru/44-scalable-bpe-tokenizer.json
site/src/content/cheat-sheets/en/44-scalable-bpe-tokenizer.json
site/src/content/cheat-sheets/ru/44-scalable-bpe-tokenizer.json
site/src/components/chapters/ScalableBpeTokenizerDiagram.astro
site/tests/44-scalable-bpe-tokenizer-diagram.test.ts
site/tests/44-scalable-bpe-tokenizer.test.ts
site/tests/e2e/ch44-scalable-bpe-tokenizer.spec.ts
audits/functional-laptop/reviews/44-scalable-bpe-tokenizer/
artifacts/functional-laptop/chapters/44-scalable-bpe-tokenizer/
artifacts/functional-laptop/chapters/44-scalable-bpe-tokenizer/history-source-evidence-receipt.json
artifacts/functional-laptop/chapters/44-scalable-bpe-tokenizer/implementation-receipt.json
artifacts/functional-laptop/step-output-inventories/implement-ch44-scalable-bpe-tokenizer.json
BUILD_STATE.yaml
DECISIONS.md
```

Proposed interfaces, to adapt to completed foundation types:

```rust
pub fn train_streaming(
    train: &VerifiedTrainingView,
    policy: &TokenizerPolicy,
    limits: &TokenizerLimits,
    scratch: &mut BoundedScratch,
) -> Result<TrainedTokenizer, TokenizerError>;

pub fn encode_documents(
    source: &VerifiedPartitionView,
    tokenizer: &VerifiedTokenizer,
    sink: &mut impl EncodedDocumentSink,
) -> Result<EncodingSummary, TokenizerError>;

pub fn check_compatibility(
    tokenizer: &VerifiedTokenizer,
    expected: &TokenizerExpectation,
) -> Result<(), CompatibilityError>;
```

`policy.rs` owns normalization/pretoken boundaries, byte/control identity, rank
ties, exact merge-count requirements and limits. `streaming_trainer.rs` owns
statistics and incremental updates. `streaming_bpe.rs` owns merge application
and strict content/document separation. `artifact.rs` owns semantic format
validation and canonical payload emission. `compatibility.rs` owns complete
binding comparisons and imported-policy refusal/parity fixtures.

### Trainer plan

1. Stream only verified training records in frozen source order. Bind corpus,
   split and policy hashes. Spill bounded working data; never collect the entire
   corpus as Rust strings. Identical sequences may be weighted without changing
   counts, but no learned decision uses held-out records.
2. Keep each sequence as stable-index live token nodes with predecessor/successor
   indices. Track weighted adjacent-pair counts and live occurrence references.
   Check allocation arithmetic before growing any arena, map, queue or spill.
3. A priority queue orders maximum count, then minimum pair; pair generations
   invalidate stale queue entries. A popped entry must agree with current count.
4. For the selected pair, visit live occurrences in left-to-right order within
   each sequence. Validate adjacency and node liveness; overlapping stale
   occurrences do not become replacements.
5. Remove each disappearing local edge exactly once, replace the two nodes,
   then add each newly created edge exactly once. Multiply count changes by
   sequence weight. Do not subtract shared edges twice in adjacent replacements.
6. Compact stale occurrence/heap storage under a deterministic threshold while
   preserving semantic sequence positions and tie order. If compaction or limits
   cannot preserve the invariant, fail; do not silently change policies.
7. Emit every selected pair, its pre-merge count and rank for fixture parity.
   Serialize the canonical learned payload only after completion/validation.

`aaa` has two overlapping `aa` occurrences but only one left-to-right replacement.
`aaaa` has three overlapping counts and two replacements. An unordered hash-set
walk is therefore not a valid occurrence application order.

The scalar oracle recomputes full counts from current sequences each rank using
the existing inspectable helpers. Do not make it call the optimized update code.
Compare every rank/count/sequence, not just final decoded bytes.
The faster implementation still has data-dependent work and memory; do not
promise linear total training time or assume an external-memory spill is free.

### Application plan

For each bounded document, initialize byte nodes, then prioritize currently
adjacent eligible merges by learned rank and leftmost position. Validate stale
entries after every replacement and update neighboring candidates. Imported or
serialized merges must be topological: operands exist before their output rank.
Differentially compare to scalar rank-ordered left-to-right application.

Never merge across documents or across the imported policy's frozen pretoken
boundaries. Course `raw-bytes-only` has no internal pretoken boundaries; GPT-2's
regex policy is separate. A mature regex engine may execute a frozen pattern
only after its dependency/Unicode semantics are bound; it may not choose the
pattern or silently change segmentation. Missing offline regex support is a
prerequisite dependency decision, not permission to download crates under N1
or handwrite a general regex parser.

### Artifact contract proposal

Use a closed canonical course payload carrying schema/layout versions, byte/
control IDs, normalization and pretokenizer policy, ordered merge pairs/ranks,
training-corpus and split identity, trainer semantic version/config/seed policy,
and content/control efficiency counters with units. Reconstruct byte expansions
from valid prior operands; reject duplicate pairs, gaps, forward references,
unknown fields/versions and overflow before allocation.

No timestamp or machine-local path enters deterministic tokenizer content.
Bind implementation binaries, actual execution configuration and environment in
producer receipts. Same semantic tokenizer payload bytes may agree between
reference and optimized paths while their producer-bound manifests/receipts
differ. Show payload SHA equality, not fictitious equality of distinct provenance.

The exact reference lineage additionally carries `trainer_version`,
`training_corpus_receipt_sha256`, `train_split_only`, `seed`,
`merge_count_exact_8`, `ordered_merge_pairs_and_ranks`,
`canonical_tokenizer_bytes_sha256`, `license_and_redistribution_disposition`.
A hash-bound full-vocabulary tokenizer cannot be substituted for its prefix, or
vice versa. Repeat-training equality requires unchanged corpus, policy, tools
and complete canonical payload—not merely equal decoded text.

Supporting serialization/hashing/I/O libraries are allowed only within their
locked/allowlisted plumbing roles. Course Rust owns pair counts, choices,
application, control rules and every compatibility decision. This artifact
work must not replace Chapter 35's taught checkpoint-wire implementation.

## 5. Tests, failures and independent-oracle boundary

| Test | Exact acceptance |
| --- | --- |
| `two_rank_trace` | Counts, choices, IDs and intermediate sequences match section 3; rank-2 exercise chooses `(258,258)`. |
| `leftmost_overlap` | `aaa`, `aaaa`, adjacent disjoint pairs and stale overlapping references match scalar replacement. |
| `weighted_counts` | Repeated weighted sequences equal explicit expansion at every rank; checked overflow fails. |
| `no_cross_document_pair` | Separate one-byte documents `a` and `b` produce no `ab` pair. |
| `heldout_cannot_train` | Changing only validation/test content, including dominant `ac` repetitions, changes no training pair or artifact. |
| `chunk_invariance` | One-byte reads, every relevant UTF-8/frame split and whole reads yield identical documents, counts and encoded IDs. |
| `all_bytes_round_trip` | All 256 raw byte values round-trip in byte mode; UTF-8 adapters separately reject invalid text. |
| `control_forgery` | Literal control-looking text stays content; interior BOS/EOS, unknown IDs and malformed document frames fail. |
| `heap_and_scalar_differential` | Fixed cases plus at least 100 seeded bounded byte corpora agree at every rank and encode trace. Freeze seed/generator/version first. |
| `serialization_refuses_drift` | Bad schema/layout, reordered ranks, missing/extra fields, duplicate/forward operands, wrong training/split hash and truncated payload fail. |
| `identity_is_not_size` | Same vocabulary size with changed merge order, policy or corpus identity is incompatible. |
| `efficiency_units` | Content counts exclude controls; byte denominator is exact; empty content reports unavailable. |
| `resource_refusal` | Tiny injected arena/heap/scratch/artifact limits and I/O failures leave no success artifact or partial continuation. |
| `fresh_training_replay` | Same immutable inputs/config/tools produce byte-identical canonical tokenizer payload. |
| `reference_prefix_binding` | Required eight ranks and 266 layout are separately bound; prefix/full/imported receipts cannot be interchanged. |
| `imported_policy_fixture` | Controlled native-policy fixtures prove parser/control/segmentation mismatch refusal; they do not claim real GPT-2 admission or oracle pass. |

Freeze tolerance zero for integer counts, ranks, IDs and reconstructed bytes.
For numerical efficiency displays, preserve exact counters/fractions and test the
declared rounding separately. Timings/RSS are measurements, not stable hash inputs.

### Actual imported oracle is the following execution step

`execute-functional-tokenizer-and-tokenized-splits` alone admits exactly four
standalone GPT-2 files at revision
`e5c5054474f583d6d9499624649353995d63c70a`: `src/encoder.py`,
`encodings/main/encoder.json`, `encodings/main/vocab.bpe`, `LICENSE`.
Exact payload total 1,503,924 bytes; no model weights. Only the frozen URLs on
`raw.githubusercontent.com` and `openaipublic.blob.core.windows.net` are allowed.
Four requests, at most three redirects per request, maximum download 2,097,152
bytes and expanded size 4,194,304 bytes. If enabled by that step, transient retry
operation is `acquire-gpt2-tokenizer-source`, at most three attempts, preserving
attempt evidence. No fallback URL or package acquisition is implied.

Preserve exact MIT text and the hosted payloads' recorded license-scope
disposition; unresolved redistribution scope blocks publication and Chapter 45.
Admission records actual requested/resolved URLs, headers/content length,
ETag/content MD5, downloaded size/SHA, attempt inventory and retry evidence.
Planning does not make a legal determination.

The independent driver
`scripts/run-functional-gpt2-tokenizer-oracle.py` and the course Rust binary have
separate roles. Freeze
`configs/functional-data-pipeline/gpt2-tokenizer-oracle-inventory-v1.json`
before results. At least 100 strings cover exactly the registered categories:
`ASCII`, `all-byte-classes`, `whitespace-runs`, `contractions`,
`combining-marks`, `emoji-ZWJ`, `Unicode-category-boundaries`,
`leading-trailing-space`, `round-trip-invalid-byte-refusal`.

Compare exact native token IDs and reconstructed bytes for every supported text
case. Raw invalid-byte refusal cases are separate from valid Unicode strings;
do not pretend arbitrary invalid UTF-8 is a Python text string. Individual token
fragments may be invalid UTF-8 even when concatenation is valid. Never use
replacement-character decoding to hide a mismatch. Pin the oracle's runtime/
regex semantics through
`artifacts/functional-laptop/execution-boundaries/offline-workspace/gpt2-tokenizer-oracle-runtime-receipt.json`.

The chapter's implementation receipt cannot claim this acquisition/oracle work.
The later standalone oracle receipt and capability integration envelope are the
actual gate. Do not close `F07` or broader interoperability claims on a synthetic
parser fixture alone. An external oracle validates a bounded imported path;
it never creates the course tokenizer or selected-model payload.

## 6. Teaching and surface commitments

### Problem-first presentation

**Problem definition.** Explain that repeatedly scanning a corpus for each BPE merge is
expensive, while changing the order of merge decisions can change the resulting
tokenizer. Establish the need to make merge computation more efficient without changing
the scalar reference's ordered decisions and replacements.

Follow the current [authoring policy](README.md#current-learner-facing-authoring-policy-2026-10-02): problem definition, guided solution, history,
visualization, then small optional practice. The opening explains the problem and its
cause without questions. Explain the worked results and their formula/Rust connection.
Remove learner prediction prompts entirely; do not move them to optional practice.
Optional tasks reproduce, inspect or explain behavior already taught. The retained
commitments below specify evidence coverage, not the old opening order.

### Retained evidence and optional-practice commitments

Evidence coverage: explain the selected first pair from the shown counts and tie-break rule; recompute after replacement; resolve the tie;
compare reference/fast traces; expose overlap and chunk-boundary pitfalls;
derive content tokens per byte; distinguish byte coverage from imported-policy
compatibility; identify fixed controls/artifact identity; hand tokenized sequences
to Chapter 45.

The future Rust example emits policy/layout IDs, training-only fixture IDs,
ranked count table, selected pair, intermediate public IDs, decoded bytes,
content/control/byte counters and explicit refusal examples. Generate expected
stdout from Rust; do not handwrite a claimed execution transcript.

Titles/summaries distinguish scalable implementation from measured full-corpus
performance. Isolated pair counts name the current rank/training representation.
Efficiency labels name tokens and UTF-8 bytes and whether controls are excluded.
An identity label names tokenizer payload versus enclosing producer receipt.
An imported-policy result names the exact policy and tested scope.

Cheat-sheet candidates: byte coverage, BPE merge, merge rank, pretokenization,
special token, tokenizer compatibility, tokens per byte. Only chapter-used
LLM concepts; no generic serializer or queue tutorial. English comes from current
executable evidence; Russian follows its independently approved revision.

## 7. Visualization and accessibility

Use one `scalable-bpe-tokenizer` semantic figure in
`ScalableBpeTokenizerDiagram.astro`, with shared `course-diagram` and
`data-diagram-style="course-v1"` roles. Parallel scalar and optimized paths show
the same two rank decisions, then converge on the same canonical tokenizer
payload bytes. Producer receipts remain separately identified.

Reading order: training documents; rank 0 counts/choice; rank 1 changed
representation/tie; equal encoded sequences and payload identity; efficiency
counters. Add a compact incompatible-policy refusal, not an unexplained red badge.
Do not show the imported oracle as passed before actual evidence exists.

A token fragment's displayed text/bytes must say whether it is a whole UTF-8
string. Keep each fraction with its denominator meaning. The description names
both the tie rule and the excluded held-out text. Color is redundant.

Stack lanes on narrow containers; use a smallest named/focusable shared scroll
region only for irreducible rank tables. All nearest bounded boxes contain
text/formula ink, including nested cells. No clipping, shrinking, duplicate
trees, private scripts or chapter full-view controls. The shared enhancement
reuses the figure. Validate static math/data first, then sole Firefox with
JavaScript at desktop/narrow/full view, forced colors and applicable direction
cases; inspect Russian separately and test keyboard/focus behavior.

## 8. Serial implementation and real-execution handoff

After the implementation hold is released:

1. Verify the actual dedup/split checkpoint, train-only view, foundation schemas,
   offline dependencies and fixed reference/import contracts.
2. Freeze the main/reference tokenizer role mapping, vocabulary/count policy,
   no-normalization/raw-byte semantics and byte/control namespace. Do not add PAD.
3. Build the scalar two-rank fixture, malformed artifacts, controls and byte tests.
4. Implement bounded incremental training and encoding; compare every rank and
   output against independent scalar paths, including overlap/chunk failures.
5. Implement strict artifacts and compatibility checks; measure only authorized
   bounded fixtures. Write the implementation-only receipt with truthful scope.
6. Generate Rust stdout, author English contract/page/figure/catalog/cheat sheet,
   validate deterministic/static/Firefox gates, and obtain independent reviews.
7. Translate/review Russian, validate its rendering, publish the coherent
   implementation chapter, checkpoint and commit.
8. The separate execution step trains/tokenizes the admitted corpus, emits the
   required once-frozen reference lineage, admits GPT-2 and runs its independent
   oracle. Only its accepted receipts admit Chapter 45.

The execution step owns
`src/bin/llm-functional-tokenizer-splits.rs`,
`tests/functional_tokenizer_splits_runner.rs`,
`configs/functional-data-pipeline/tokenizer-and-tokenized-splits-v1.json`,
the oracle driver/config/inventory, source-admission receipts, course-reference
binary packager/tests and transform-publication receipt. These are not newly
implemented by this chapter packet.

Its closed transform command:

```bash
cargo run --release --locked -p llm-from-scratch --bin llm-functional-tokenizer-splits -- --spec configs/functional-data-pipeline/tokenizer-and-tokenized-splits-v1.json --input-receipt /receipts/input.json --input /artifacts/input --output /output
```

Input:
`artifacts/functional-laptop/data/deduplicated-split-corpus-v1/receipt.json`.
Output:
`artifacts/functional-laptop/data/tokenizer-and-tokenized-splits-v1/receipt.json`.
Roles: `train-only-tokenizer`, `tokenized-train`, `tokenized-valid`,
`tokenized-test`, `split-lineage`. Mount `/artifacts/input:ro`,
`/receipts/input.json:ro`, `/output:rw-run-scoped`. Acquisition is a separately
bounded N3 phase; transform/oracle execution is network-none. Validate full
inventory/hashes, fsync and atomic same-filesystem promotion before publication.

Refused or interrupted training leaves provisional staging. Start a new attempt
from immutable inputs; do not resume partial merge state unless a separately
versioned, fully bound recovery protocol has been approved. No such protocol is
invented in this packet.

## 9. Validation and external review gates

Exact future implementation commands:

```bash
scripts/run-functional-history-source-evidence.sh --step implement-ch44-scalable-bpe-tokenizer --chapter 44-scalable-bpe-tokenizer --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
scripts/run-functional-offline.sh --step implement-ch44-scalable-bpe-tokenizer --target implement-ch44-scalable-bpe-tokenizer-v1
scripts/run-functional-firefox.sh test --step implement-ch44-scalable-bpe-tokenizer --target chapter-44-scalable-bpe-tokenizer-v1
git diff --check
./course audit-host
```

These prerequisite-owned runners are not invoked or implemented during planning.
Their targets must cover locked Rust fmt/clippy/tests, exact stdout and artifacts,
dependency/ownership constraints, train-only and differential/control tests,
EN/RU contracts/parity, static build/links/math and Firefox. Record underlying
commands at future preflight. Do not replace the separate N3 oracle gate with
these implementation tests.

Follow the common guide and English-authoring skill: freeze evidence commitments,
role requirements, exact source/built HTML; use two fresh role-specific reviewers
and two additional role-specific adjudicators, distinct from the author and one
another. Route exact canonical four-artifact prompts and retain untouched raw
responses, routing manifests and receipts. All four verdicts must pass for one
unchanged candidate; approving a sound blocking review does not clear its finding.

Then translate Russian directly from approved English and obtain distinct
bilingual/target-only reviews plus target rendered evidence. The single executor
does not spawn agents or self-certify; missing external review capacity keeps
publication staged. Relevant edits invalidate dependent judgments. Preserve the
ignored root `target/` cache and any original host-audit failure; a scoped audit
does not relabel the original workspace pass.

## 10. Cost, risks and readiness

Current: medium planning, primary-source reads and tiny arithmetic only. No
packages, corpus/model acquisition, implementation, training, localization or
publication judgments.

Implementation: large C3/G0/N1/no paid service; historical evidence at most
134,217,728 bytes, zero new artifact-download authority. The chapter consumes
`8gb-gpu-core` metadata; it does not run GPU work.

Capability estimate: vocabulary 4,096–16,384, at most 30M core tokens,
4 GiB host RAM, 4 GB scratch, under 60 minutes CPU, tokenizer artifact below
10 MiB, encode throughput at least 1 MiB/s. These require actual authorized
measurements with named workload, bytes, toolchain and timing boundaries; a
tiny fixture cannot establish them. Count all arenas, stale queues and spill
files. Capacity failure is not a reason to silently shorten training input.

Following execution caps: C3/G0/N3/no paid service, 21,600 seconds,
8,589,934,592 host bytes, 16,000,000,000 disk bytes, exact artifact payload
1,503,924 bytes within 2,097,152 download bytes, at least 100 oracle strings.
Honor narrower tokenizer bounds inside the larger runner envelope.

Common content/review limits: 8 successful contexts, at most 16 attempts;
2,097,152 input bytes / 200,000 input tokens and 1,048,576 output bytes /
40,000 output tokens per context; aggregate input 33,554,432 bytes, output
16,777,216 bytes, wall 28,800 seconds. One image review context using the user-selected model,
16,777,216 input bytes, 262,144 output bytes, 900 seconds. Strong independent
course-content contexts are externally provisioned.

Readiness owners: foundation/execution spec resolves the main/reference payload
mapping and offline regex/oracle runtime; algorithm owner freezes counts and
limits; acquisition owner validates the four-file source/license scope; execution
owner produces actual reference/oracle/publication receipts; Chapter 45 owns
batch-local padding representation. Planning releases none of those actions.

Done means: preserved reference layout and train-only lineage; deterministic
rank/byte parity; strict controls and artifacts; bounded failure/replay behavior;
honest efficiency/history/compatibility scope; accessible Rust-driven figure;
independently reviewed EN/RU slice; exact gates and canonical/staged equality;
dedicated implementation checkpoint/commit. Real tokenizer processing and the
imported oracle remain the following execution step.
