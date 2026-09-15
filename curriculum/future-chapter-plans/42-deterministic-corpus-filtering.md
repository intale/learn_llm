# Chapter 42 — deterministic corpus filtering: detailed implementation packet

Status: internal planning only; no filtering, implementation or publication approval.
Use [the common guide](README.md) and [Chapter 41](41-governed-corpus-acquisition.md).
The user's implementation/repair hold remains in force. Proposed parameters and
interfaces below are course-local choices to freeze against the completed
foundation, not observations of the real TinyStories files.

## 1. Scope and boundary

| Field | Commitment |
| --- | --- |
| Chapter / planning step | `42-deterministic-corpus-filtering` / `detail-ch42-deterministic-corpus-filtering` |
| Future implementation | `implement-ch42-deterministic-corpus-filtering` |
| Implementation predecessor | `acquire-functional-tinystories-raw-pair`, not merely Chapter 41 |
| Capabilities | `CAP-DTH-DATA-02`, `CAP-DTH-DATA-03`; no frozen finding/claim IDs |
| Formula ID | `teaching-formula-ch42-deterministic-corpus-filtering` |
| Small concept | An ordered, inspectable policy gives each framed record one disposition, with counts explaining exactly which records reached each rule. |
| Outcome | Streaming filtering, quality/language heuristics, privacy/secret refusal, manual-review exclusion and deletion lineage with complete accounting. |
| Non-goals | Universal PII detection, privacy certification, legal conclusions, learned quality ranking, deduplication, split assignment, tokenizer training, model training or unlearning. |

Frozen prerequisites:

```text
curriculum/functional-laptop-llm-extension-plan.md
audits/2026-08-10-functional-llm-capability/coverage.md
audits/2026-08-10-functional-llm-capability/requirements.md
audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md
.agents/skills/author-llm-course-english/SKILL.md
.agents/skills/localize-llm-course/SKILL.md
site/src/i18n/functional-chapter-locales.json
exact predecessor checkpoint=acquire-functional-tinystories-raw-pair
exact TinyStories raw-pair cache receipt mounted read-only
artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
```

Missing future inputs do not authorize inventing a receipt or downloader.
The frozen functional locale registry and history-runtime receipt are future
foundation outputs, not present-day files to repair. The existing
`site/src/i18n/chapter-locales.json` is not a substitute for the frozen
`functional-chapter-locales.json` prerequisite. Keep implementation pending until
its actual predecessor produces the required inputs.
Preserve the actual order:

```text
acquire-functional-tinystories-raw-pair
 -> implement-ch42-deterministic-corpus-filtering
 -> execute-functional-corpus-filtering
 -> implement-ch43-deduplication-decontamination
```

Chapter 42 proves the policy on bounded fixtures. The separate execution step
applies it to the admitted pair through
`configs/functional-data-pipeline/corpus-filter-v1.json`. Its input receipt is
`artifacts/functional-laptop/acquisition/tinystories/receipt.json`; its output
receipt is `artifacts/functional-laptop/data/filtered-corpus-v1/receipt.json`.
Its output roles are exactly `privacy-filtered-corpus`,
`filter-policy-rejections` and `source-lineage`. Chapter 43 consumes verified
retained records and lineage, never manual-review bodies selected by filename.

Keep mount contexts distinct. Chapter 41's proposed chapter-consumer entry is
`/artifacts/tinystories:ro`. The separate real filtering runner mounts
`/artifacts/input:ro`, `/receipts/input.json:ro` and `/output:rw-run-scoped`;
its raw paths below that entry are `payload/raw/TinyStories-train.txt` and
`payload/raw/TinyStories-valid.txt`. Do not change the closed runner's aliases.

Upstream train/validation names are provenance, not final course partitions.
Chapter 43 groups duplicates before final train/validation/test assignment.
Chapter 42 therefore preserves duplicate text with distinct source identities.

## 2. Evidence and source ledger

Baseline commit: `41f7d211e8b9f72aa9566f8b2eca987a3221a29c`.
The [accepted extension plan](../functional-laptop-llm-extension-plan.md) SHA-256 is
`84d8ab860a3282dd5d373ca285a3815b04836d9abb7a1d2267e163143091bea1`;
the Chapter 41 packet SHA-256 is
`c5b07acabf9fc66df4b5e3af70c665aa872798e60f5950358add59a3fe8ec3bd`.
The held functional build block is the exact byte slice beginning at the
`extend-course-to-functional-laptop-llm-20260810` build record and ending
immediately before the `detail-future-chapter-execution-plans-20260915` build
record: 664,197 bytes, SHA-256
`223d5ca13c087dc2c334c223916cda42f5e65b822dac8c214f199a7f5a3adba4`.

Existing evidence to preserve:

- [corpus.rs](../../rust/crates/llm-from-scratch/src/corpus.rs):
  `Document`, `Corpus::from_json`, `SplitManifest::partition`,
  `SPLIT_SCHEMA_VERSION = 1` and
  `SPLIT_STRATEGY = "fixed-paired-document-holdout-v1"`.
  The current loader materializes a tiny JSON corpus and rejects duplicate text.
  It is not the new streaming interface: using it here would remove the behavior
  Chapter 43 must inspect.
- [rust/data/README.md](../../rust/data/README.md) and
  [splits.json](../../rust/data/splits.json): preserve the 12-document bilingual
  fixture, 8/2/2 split and `fnv1a64:723b071980ae8a22` binding. Its whole-document/
  provenance-group separation and train-only tokenizer learning remain intact.
- [data.rs](../../rust/crates/llm-from-scratch/src/data.rs) already owns
  `CausalWindowConfig`, `CausalWindow`, `IncompleteTail`, `EncodedDocument` and
  `EncodedCorpusPartitions`. Existing windows are document-local, shifted by one
  token, unpadded, and preserve `[BOS,content...,EOS]`. Keep those public paths.
  Rust can keep a file module and place its submodules in a same-named directory;
  adding `data/stream.rs` does not by itself require moving `data.rs`.
  Use the completed module-registry convention; do not create a second module root.
- Chapter 41 supplies artifact identity, exact inventory, immutable raw admission
  and read-only access. Its raw-pair validator is not automatically a validator
  for this chapter's filtered payload.

Primary sources checked read-only on 2026-09-15:

| Frozen source | Supported history and limit |
| --- | --- |
| `SRC-DTH-DATA-02`, earlier, 2021: [Documenting Large Webtext Corpora](https://aclanthology.org/2021.emnlp-main.98/) | C4 inspection found unexpected/generated content, evaluation contamination and filtering-related demographic/exclusion effects. Inspecting removed as well as retained data matters; its rates are not TinyStories measurements. |
| `SRC-DTH-DATA-06`, later, 2023: [The RefinedWeb Dataset for Falcon LLM](https://proceedings.neurips.cc/paper_files/paper/2023/hash/fa3ed726cc5073b9c31e3e49a807789c-Abstract-Datasets_and_Benchmarks.html) | Filtering, deduplication, retained volume and model comparisons are explicit parts of that larger pipeline. Its scale, policies and model effects are not a laptop recipe, license audit or course result. |

The historical Rust contrast uses the same fixture with an unexplained blanket
keep/drop rule and an auditable ordered report. This illustrates inspection and
accounting, not a reproduction of either paper or an invention claim.

The accepted plan leaves concrete framing, thresholds, patterns, manual-release
fields and deletion-graph fields unspecified. The following choices are explicit
proposals. Reconcile foundation schemas before coding; never silently change a
frozen execution input. No raw corpus was opened in planning.

## 3. Inputs and worked example

### Framing and normalization proposal

Use a 65,536-byte read buffer. Production candidate v1 permits at most 65,536 raw
payload bytes per record, excluding delimiter bytes; the fixture uses 64.
These are local corpus-policy bounds, not model sequence-length ceilings.

A complete physical line whose content is exactly `<|endoftext|>` is a separator.
Accept LF or CRLF endings, or that exact marker at EOF. A marker inside a longer
line is text. Payload spans include their physical line endings and exclude the
separator line. Empty frames between separators are records and fail the length
rule; EOF immediately after a separator adds no phantom record. A nonempty
unterminated final payload fails framing rather than being silently accepted.

Store half-open `[start,end)` byte offsets from the raw file's beginning and
account separately for delimiter spans. Payload and delimiter spans must cover
every input byte exactly once. Verify this convention against the pinned source
during authorized execution preflight; disagreement requires a new versioned
framing policy, not a fallback parser selected by trial and error.

Drain an oversized frame to its known boundary with bounded memory, assigning
a size rejection. Reject bad UTF-8 when the frame boundary is unambiguous.
If framing or an I/O failure makes boundaries unknowable, fail the run instead
of inventing how many records were rejected. No success receipt in that case.

After size/UTF-8 checks, replace CRLF with LF and trim only leading/trailing ASCII
space, tab, CR and LF. Preserve case, internal spacing and all other Unicode
distinctions. No lossy decode, replacement characters, Unicode normalization or
transliteration. Keep raw-span identity distinct from normalized-text identity.

### Fixed rule order

Use a closed typed policy schema, unique rule IDs, bounded literal lists, checked
integer bounds and positive ratio denominators. Hash canonical configuration.
A change to ordering, thresholds, markers or normalization changes the policy
binding and downstream lineage.

| Order / ID | Terminal action | Production candidate v1 | Eight-record fixture |
| --- | --- | --- | --- |
| 1 `raw-size` | reject | raw frame over 65,536 bytes | over 64 bytes |
| 2 `utf8` | reject | invalid strict UTF-8 | same |
| Transform only | normalize | CRLF/ASCII-edge trim above | same |
| 3 `min-length` | reject | normalized length below 16 UTF-8 bytes | below 4 bytes |
| 4 `ascii-letter` | reject | fewer than 8 ASCII alphabetic characters | fewer than 1 |
| 5 `secret-marker` | reject | ASCII-case-insensitive literal match: `demo-key=CANARY`, `api_key=`, `password=`, `-----BEGIN PRIVATE KEY-----` | only `demo-key=CANARY` |
| 6 `manual-marker` | manual-review | literal `contact=` or `@` | only `contact=` |
| 7 `ascii-coverage-review` | manual-review | ASCII letters below half the count of Unicode scalar values after excluding ASCII whitespace | ratio threshold zero; still evaluated |
| After all rules | retain | no terminal rule matched | same |

These narrow heuristics are course policy, not validated language, privacy or
quality classifiers. Ordinary prose can match a marker; unmarked sensitive text
can pass. ASCII coverage cannot prove English. Compare ratios with checked
integer cross-products; rounded display values never decide disposition.
Freeze and measure the production candidate before accepting its real output;
do not invent retention rates or tune against held-out model evaluation.

First terminal match wins. Later rules are not evaluated, never reported as
negative. Any later exhaustive audit needs separately named counters and cannot
rewrite this terminal report. Normalization counters are transformation counts,
not rejection counts.

### Complete synthetic fixture

Each row is an already-framed raw payload, including its LF. All bodies are
course-authored fixtures, not real personal information or credentials.
Use train-source fixture identity for `r0`–`r3`, validation-source identity for
`r4`–`r7`; preserve source order. Production retains Chapter 41's pinned identities.

| ID | Raw payload construction | Raw bytes | Disposition / first terminal rule |
| --- | --- | ---: | --- |
| `r0` | Rust `b"cat sat.\n"` | 9 | retained |
| `r1` | bytes `[0xff,0x0a]` | 2 | rejected / `utf8` |
| `r2` | 65 ASCII `x` bytes followed by LF | 66 | rejected / `raw-size` |
| `r3` | Rust `b"hi\n"` | 3 | rejected / `min-length` |
| `r4` | Rust `b"....\n"` | 5 | rejected / `ascii-letter` |
| `r5` | Rust `b"demo-key=CANARY\n"` | 16 | rejected / `secret-marker` |
| `r6` | Rust `b"contact=alex@example.invalid\n"` | 29 | manual-review / `manual-marker` |
| `r7` | Rust `b"demo-key=CANARY contact=alex@example.invalid\n"` | 45 | rejected / `secret-marker`; manual not evaluated |

Normalization sees six records (`r0,r3,r4,r5,r6,r7`) and removes their final LF.
The one retained text is exactly `cat sat.`: 8 UTF-8 bytes. Manual-review `r6`
does not enter the retained payload.

| Rule | Seen here | Terminal here | Survivors | Stage rate |
| --- | ---: | ---: | ---: | --- |
| `raw-size` | 8 | 1 rejected | 7 | $1/8$ |
| `utf8` | 7 | 1 rejected | 6 | $1/7$ |
| `min-length` | 6 | 1 rejected | 5 | $1/6$ |
| `ascii-letter` | 5 | 1 rejected | 4 | $1/5$ |
| `secret-marker` | 4 | 2 rejected | 2 | $2/4$ |
| `manual-marker` | 2 | 1 manual-review | 1 | $1/2$ |
| `ascii-coverage-review` | 1 | 0 manual-review | 1 | $0/1$ |

Final accounting is 1 retained + 6 rejected + 1 manual-review = 8.
The overall rejection fraction is $6/8$; the secret rule's stage rate is $2/4$,
not $2/8$. Fractions/counts are exact planning derivations, not future Rust output.

Frozen teaching formula:
$$r_k=\frac{n_{\mathrm{disposition},k}}{n_{\mathrm{seen},k}}.$$
Here $k$ identifies a rule; the denominator counts records reaching it and the
numerator counts its terminal dispositions. Name whether that numerator is
rejection or manual-review. Zero seen gives an unavailable rate (`null` /
`not-evaluated`), never a fabricated zero. The two underlying zero counts remain.

Prediction questions and answers:

1. Why is there no manual result for `r7`? The earlier secret match terminated
   evaluation; “not evaluated” does not mean no contact marker exists.
2. Swap manual and secret rules: `r7` becomes manual-review and final totals are
   1/5/2. This is a different policy binding, not an equivalent implementation.
3. All frames oversized: later seen/terminal counts are 0/0, rates unavailable.
4. Copy `r6` to training after changing its label: invalid. Policy v1 has no
   release route; later release requires new bound evidence and all checks.
5. All synthetic canaries excluded: this proves neither privacy completeness
   nor that future weights cannot memorize.

For full framer tests, append a separator line to each raw payload. Test every
relevant split in the separator and a valid multibyte scalar. Exact source bytes
must give the same spans, IDs, normalized texts and counts for every read chunking.

### Source/language and token-count accounting

Report before/after documents and raw/normalized bytes by immutable source and
declared language; label the language as upstream metadata, not detector truth.
The sum of each source/language table must reconcile to its matching global total.
Keep rejected, manual and retained counts separate; no mixture row disappears.

No learned tokenizer exists yet at this stage. Proposed interim token unit:
the fixed UTF-8 byte-base alphabet (one symbol per valid UTF-8 byte, no BOS/EOS).
Record `token_count_kind="utf8-byte-base-v1"`; count only valid decodable spans,
separately reporting undecodable record coverage as unavailable. These are not
merged BPE-token counts. Later Chapter 44's tokenized-split receipt supplies
actual learned-tokenizer counts under its own identity. If the completed
foundation's capability contract requires another specific tokenizer/count unit,
resolve that dependency explicitly before execution; do not call bytes BPE tokens.

Bound manual-audit samples to the first 32 body-free references per
source/rule/disposition in stable source order, with total-population and sampled
counts. Sampling does not replace full disposition accounting, authorize release
or estimate detector effectiveness.

## 4. Rust design and ownership

Exact frozen future outputs:

```text
curriculum/chapters/42-deterministic-corpus-filtering.md
rust/crates/llm-from-scratch/module-registry/functional-v1/ch42-deterministic-corpus-filtering.module
rust/crates/llm-from-scratch/tests/ch42_deterministic_corpus_filtering.rs
rust/crates/llm-from-scratch/examples/ch42_deterministic_corpus_filtering.rs
rust/crates/llm-from-scratch/examples/expected/ch42_deterministic_corpus_filtering.txt
rust/crates/llm-from-scratch/src/data/stream.rs
rust/crates/llm-from-scratch/src/data/filter.rs
rust/crates/llm-from-scratch/src/data/privacy.rs
rust/crates/llm-from-scratch/src/data/deletion.rs
rust/crates/llm-from-scratch/src/data/governance.rs
site/src/content/chapters/en/42-deterministic-corpus-filtering.mdx
site/src/content/chapters/ru/42-deterministic-corpus-filtering.mdx
site/src/i18n/functional-catalogs/en/42-deterministic-corpus-filtering.json
site/src/i18n/functional-catalogs/ru/42-deterministic-corpus-filtering.json
site/src/content/cheat-sheets/en/42-deterministic-corpus-filtering.json
site/src/content/cheat-sheets/ru/42-deterministic-corpus-filtering.json
site/src/components/chapters/DeterministicCorpusFilteringDiagram.astro
site/tests/42-deterministic-corpus-filtering-diagram.test.ts
site/tests/42-deterministic-corpus-filtering.test.ts
site/tests/e2e/ch42-deterministic-corpus-filtering.spec.ts
audits/functional-laptop/reviews/42-deterministic-corpus-filtering/
artifacts/functional-laptop/chapters/42-deterministic-corpus-filtering/
artifacts/functional-laptop/chapters/42-deterministic-corpus-filtering/history-source-evidence-receipt.json
artifacts/functional-laptop/step-output-inventories/implement-ch42-deterministic-corpus-filtering.json
BUILD_STATE.yaml
DECISIONS.md
```

The later execution step owns `src/bin/llm-functional-corpus-filter.rs`,
`functional_corpus_filter_runner.rs` and the phase spec, not this chapter.

Proposed interfaces, not existing symbols:

```rust
pub struct SourceSpan {
    pub source_artifact_id: ArtifactId,
    pub source_path: PortablePath,
    pub start: u64,
    pub end: u64,
}
pub enum Disposition { Retained, Rejected, ManualReview }
pub struct RuleCount { pub seen: u64, pub terminal: u64 }
pub fn filter_stream<R: std::io::Read>(
    reader: R,
    source: &VerifiedRawSource,
    policy: &FilterPolicyV1,
    limits: &FilterLimits,
    sink: &mut impl FilterSink,
) -> Result<FilterSummary, FilterError>;
pub fn affected_descendants(
    graph: &ValidatedLineage,
    withdrawn: &[RecordId],
) -> Result<Vec<ArtifactId>, LineageError>;
```

Adapt verified-source, artifact-ID and portable-path types to the completed
foundation. Verified constructors stay private; callers cannot forge admission.
Declare necessary shared module/export changes at preflight without moving old
code or introducing a parallel artifact/runner architecture.

| Module | Course-owned behavior |
| --- | --- |
| `stream.rs` | Chunk-independent framing, exact spans, bounded draining, strict UTF-8 outcomes and framing/I/O failure. |
| `filter.rs` | Policy/normalization order, first-terminal evaluation, checked counters, named denominators, stable sink order. |
| `privacy.rs` | Transparent literal/coverage predicates and reason codes; fixture vs production configuration binding. |
| `governance.rs` | Source/policy/producer binding, manual exclusion, body-free projection and typed retained eligibility. |
| `deletion.rs` | Lineage-DAG validation and deterministic descendant invalidation planning. |

Reuse mature serializer/SHA/filesystem plumbing. Rust owns every taught predicate,
normalization, framing choice, disposition, count and lineage decision. No learned
quality/language/PII package or corpus-filter library may hide them. Missing
supporting dependencies need an authorized locked/allowlisted offline graph;
N1 history permission cannot download crates.

Proposed retained rows: closed canonical JSON Lines, one LF each, source order
(train file then validation file; ascending spans). Fields:
`schema_version`, `record_id`, `source`, `source_file_sha256`, `text`,
`text_sha256`, `policy_sha256`. Derive record ID from canonical immutable source
identity and span, not normalized text. Equal text at two locations stays two IDs.

Retained rows themselves establish retained dispositions. Rejected/manual rows
carry source reference, record ID, raw byte count, nullable normalized byte count,
disposition, first terminal rule and ordered evaluated-rule IDs. The union of
both streams covers every identified record exactly once. Do not duplicate all
retained records into the findings stream merely to count them.

No rejected snippet, detector capture, decoder excerpt or free-form body-bearing
error enters canonical reports. Bind reject-hash lineage through the canonical
body-free disposition record and its immutable source/span reference; any required
raw-content digest remains controlled lineage evidence, not an anonymization
claim. Ordinary hashes of predictable sensitive text can be guessed.

The filtered bundle retains the foundation's canonical manifest-SHA identity,
exact payload inventory, producer/config/policy hashes, upstream source binding
and inherited license/attribution/redistribution restrictions. Register a strict
filtered-stage payload/schema branch. Do not weaken Chapter 41's raw-pair schema,
pass filtered data to its raw validator or trust a caller's arbitrary stage tag.
Freeze the exact shared discriminator/validator mapping at preflight.

Stream outputs to run-staged files, keeping one bounded frame, fixed counters
and bounded writers in memory. No full `Vec<Document>`. The algorithm's stricter
cap is 2 GiB RAM with scan chunks at most 64 MiB; the proposed 64 KiB buffer is
within it. Total redacted findings/receipts must be strictly below 100 MiB.
Charge metadata growth before writing and fail if the cap would be reached;
never truncate findings, skip accounting or produce a success-shaped partial.
Large retained data/lineage payloads remain separately inventoried and subject
to the whole execution disk cap; classification cannot be used to hide findings
outside their cap.

## 5. Tests, failures and recovery

| Named case | Input and decisive result |
| --- | --- |
| `eight_records_reconcile` | Exact 8-record fixture, seven stage rows, six normalizations and 1/6/1 final partition. |
| `first_terminal_wins` | `r7` stops at secret rule; manual not evaluated. Swapped policy gives 1/5/2 with different binding. |
| `zero_seen_is_unavailable` | Everything fails size; later 0/0 rates unavailable, not zero. |
| `chunking_does_not_change_records` | Whole-file, one-byte and every marker/scalar boundary split: identical spans, IDs, text and counts. |
| `utf8_is_not_repaired` | Invalid/truncated/overlong scalar in known frame rejected; valid scalar split across reads accepted. |
| `size_boundary_and_drain` | Raw 63/64/65 bytes under cap 64: first two reach UTF-8, third is rejected/drained; delimiter bytes excluded. |
| `separator_and_eof` | Empty frame, CRLF separator, marker-at-EOF, embedded marker and unterminated tail have explicit distinct outcomes. |
| `normalization_is_narrow` | Only declared CRLF/edge bytes change; case, internal spaces and composed/decomposed Unicode distinctions survive. |
| `heuristics_have_false_results` | Benign quoted marker may fail, unmarked sensitive-looking fixture may pass; no accuracy or safety claim. |
| `manual_is_not_trainable` | `r6` has only excluded lineage/reference evidence; label edits or injecting it into retained-role input are refused. |
| `high_risk_fixtures_are_detected` | Freeze all synthetic risk fixtures and expected terminal reasons before execution; 100% of that exact set is detected/excluded, including multi-marker cases. Never expand that percentage into a recall claim. |
| `reports_never_copy_sensitive_values` | Success, refusal, UTF-8 errors, samples and trace all omit body/capture canaries outside controlled synthetic inputs. |
| `equal_text_is_not_deduped_here` | Two acceptable equal texts with distinct spans produce two retained IDs; legacy duplicate-rejecting loader is not called. |
| `source_policy_and_inventory_binding` | Wrong/modified raw receipt, policy order/hash, source path or missing/extra payload: no success receipt. |
| `all_counts_name_units` | Source/language document/byte/byte-base-symbol totals reconcile; unavailable invalid-UTF-8 token coverage is not zero. |
| `sample_is_bounded_not_population` | More than 32 findings in one sample stratum: sample holds first 32 references, full findings/counts preserved. |
| `budget_or_io_failure` | Inject read/write/count overflow or output cap (including exact 100 MiB limit): fail with provisional staging, no publication. |
| `withdrawal_reaches_known_descendants` | Graph below returns exact affected aliases once, including statistics, but not the unrelated branch. |
| `invalid_graph_fails` | Cycle, dangling edge or missing withdrawn record: error, not empty successful invalidation. |
| `fresh_attempt_replay` | Same immutable inputs/policy/tools, new staging: same output order, reasons, counts and SHA-256. |

Policy v1 has no manual-release command. Manual-review records remain excluded;
the receipt names that disposition instead of “cleared.” Controlled inspection
reads the admitted source by reference, not a body copied into public reports.

A later release needs separately versioned policy/results, authorized review
evidence and all mandatory rejection checks. Preserve the original disposition.
A label edit cannot bypass a later secret/privacy rule. The downstream reader
admits only verified retained-role payloads with matching source/policy identity.

Deletion fixture: fictional aliases `f0` (filtered data), `a0` (accounting),
`s0` (split), `tok0` (tokenizer) and `w0` (weights).
Edges: `r0 -> f0`, `r0 -> a0`, `f0 -> s0`, `s0 -> tok0`, `s0 -> w0`,
`tok0 -> w0`; separate `r9 -> f9`. Withdraw `r0`: revoked source `[r0]`,
sorted affected artifacts `[a0,f0,s0,tok0,w0]`, `w0` once; `f9` unaffected.
Production uses real hash-bound IDs; missing provenance forbids a completeness
claim. Include derived statistics/manifests, not only copied text.

This is known graph reachability, not permission to delete files, knowledge of
every external copy or removal of model influence. Actual revocation/deletion/
rebuild integration belongs to later authorized data/persistence owners.
Never rewrite completed run evidence to conceal prior lineage.

Canary exclusion here is a data-path result. A later non-memorization probe
requires an actual bound model, corpus, prompt set and observed outputs; even
that bounded result cannot establish global non-memorization. No model training
is authorized as a Chapter 42 shortcut.

## 6. Teaching and surface commitments

Lesson sequence: predict an ambiguous rejection-rate statement; inspect the
eight raw payloads/source identities; walk first-terminal paths; derive stage
denominators and final counts; compare blanket filtering with auditable evidence;
teach the C4-to-RefinedWeb contrast within its limits; show manual exclusion and
known deletion descendants; answer predictions; hand retained records to Chapter 43.

The future Rust trace exposes fixture label, rule ID, seen/terminal/survivor
counts, terminal kind, rate numerator/denominator and final totals. Per-record
paths and aggregate rows are separate. Generate stdout/expected bytes from Rust,
not a handwritten passing transcript. All formulas, cards and answers use that trace.

Freeze actual document, reading-unit and isolated-role requirements. In particular:

- Titles/summaries name deterministic filtering, not “safe” or universally
  “clean” training data.
- Every isolated rate names the rule, terminal kind and counted population.
- A record result names its source record and first terminal rule; a skipped
  label says an earlier terminal rule prevented evaluation.
- Retention is policy-relative and excludes manual review; it does not certify
  privacy, language, quality or redistribution rights.
- Deletion copy distinguishes affected descendants from actual deletion and
  model unlearning.
- Cheat-sheet terms are chapter-used LLM data concepts: provenance, filtering,
  retention rate, contamination risk and manual-review exclusion. No second
  JSON/HTTP/Rust vocabulary lesson.

English is authored from future Rust evidence using the English-authoring skill.
Russian follows only that independently approved revision via the localization
skill. This packet drafts no translated copy or learner-facing chapter.

## 7. Visualization and accessibility

Frozen figure ID: `deterministic-corpus-filtering`; decision useful.
Use the declared `DeterministicCorpusFilteringDiagram.astro`, one semantic figure
and shared `course-diagram` / `data-diagram-style="course-v1"` roles.

Reading order: input 8; seven ordered rule cards with seen/terminal/survivor
counts; final 1 retained / 6 rejected / 1 manual; the `r7` path stopping at secret.
The essential relationship is rule order changing the next denominator.
A small descendant example may share the figure only if still readable and
explicitly scoped; otherwise teach its exact ID list in prose/trace.

Name states in text with redundant shape/border cues. No “green means safe.”
The nonvisual description preserves first-match causality, denominator change
and the unvisited manual rule. Keep a count and its meaning together only where
the actual reading order presents them as one unit.

Stack cards at narrow widths. Any essential wide table gets the smallest shared
named, focusable scroll region. Every bounded box contains its text/formula ink,
including cells inside scrollers. No clipping, shrinking, private palette,
hydration, duplicated tree or chapter-local full-view control. The shared
enhancement reuses the existing figure.

Future validation checks complete static HTML/math, then sole Firefox with
JavaScript at desktop/narrow widths, desktop full view, forced colors and
applicable direction cases. Test keyboard entry/Escape/focus restoration and
nearest-box containment. Russian is inspected independently. A site parser may
validate/display the Rust trace, never decide filters in TypeScript.

## 8. Serial implementation procedure

Only after user release of implementation:

1. Verify acquisition predecessor, held repairs/checker compatibility, completed
   static/offline prerequisites, source receipt and read-only mount.
2. Freeze module exports, typed filtered-stage schema/validator and source/
   output-inventory mapping without changing old corpus/data APIs.
3. Bind proposed framing/rules/parameters to the approved source/spec. A source
   mismatch needs an explicit new policy decision before any real pass.
4. Implement bounded framing and strict normalization, then rules/counters,
   body-free output, source/language accounting, sample bounds and manual exclusion.
5. Implement lineage validation and fictional withdrawal; run all injected
   failures and fresh-attempt replay. No real deletion or model run.
6. Regenerate Rust output and author the English contract/page/figure/catalog/
   cheat sheet from it.
7. Run deterministic/static/Firefox gates, freeze English requirements/bytes and
   obtain the external independent reviews/adjudications below.
8. Translate Russian from accepted English, obtain independent target reviews
   and layout evidence, publish the coherent chapter, checkpoint and commit.
9. Hand the algorithm to the separately scheduled real filtering wrapper.
   Only that step's accepted filtered-corpus receipt admits Chapter 43.

Failed output stays provisional. Restart from immutable input into new staging;
v1 does not claim resumable partial filtered-output append. A path or planned
interface is not a completed predecessor checkpoint.

## 9. Validation and external reviews

Exact future Chapter 42 commands from repository root:

```bash
scripts/run-functional-history-source-evidence.sh --step implement-ch42-deterministic-corpus-filtering --chapter 42-deterministic-corpus-filtering --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
scripts/run-functional-offline.sh --step implement-ch42-deterministic-corpus-filtering --target implement-ch42-deterministic-corpus-filtering-v1
scripts/run-functional-firefox.sh test --step implement-ch42-deterministic-corpus-filtering --target chapter-42-deterministic-corpus-filtering-v1
git diff --check
./course audit-host
```

The runners are prerequisite-owned future tools, not commands to invent now.
Their registered targets cover contract/ownership, locked Rust fmt/clippy/tests,
exact stdout, dependency policy, source/policy/accounting/manifest fixtures,
EN/RU content/parity, static build/links, diagram roles and Firefox. Record their
exact underlying commands and receipt paths at future implementation preflight.

Follow the common guide's external handoff: author, two fresh English reviewers
and two additional fresh role-specific adjudicators in pairwise-distinct contexts;
exact canonical four-artifact prompts, untouched raw responses, external routing
and deterministic receipt verification. Both reviews and adjudications must
pass for one unchanged candidate. Support of a sound blocking finding does not
clear it.

Only then translate Russian directly from approved English and obtain distinct
bilingual and target-only reviews plus affected Firefox evidence. The later
single executor neither spawns agents nor relabels itself as independent.
Unavailable external review capacity leaves publication staged. Meaning, role,
reading-order or extracted-surface changes invalidate dependent reviews;
rendered changes require refreshed affected visual evidence.

Preserve the ignored root `target/` cache and any original host-audit failure.
A separately accepted scoped audit is not a pass of the original workspace.
This planning checkpoint needs only internal consistency, diff and ordinary
course-plan checking in the existing offline image.

## 10. Cost, risks and readiness

Current: medium planning, local read-only evidence, the two frozen primary
pages and tiny byte/count arithmetic. No data acquisition, install, Rust/site
execution, training or publication review.

Future implementation: large C3 CPU, G0 GPU, N1 history, no paid service;
`8gb-gpu-core` profile consumption does not imply GPU work for filtering.
Only the two history sources may use N1, at most 134,217,728 bytes, with zero
new artifact-download authority.

Frozen content/render budgets: 8 successful learner-content contexts, at most
16 attempts; per context input 2,097,152 bytes / 200,000 tokens and output
1,048,576 bytes / 40,000 tokens; aggregates 33,554,432 input bytes,
16,777,216 output bytes, 28,800 seconds. At most one rendered-image context,
Terra ceiling, 16,777,216 input bytes, 262,144 output bytes and 900 seconds.
Use strongest available course-content author/judgment contexts with external
review provisioning, not self-certification.

Separate `execute-functional-corpus-filtering` limits:
C3/G0/N0/no paid service; 7,200 seconds; 8,589,934,592 host bytes;
12,000,000,000 disk bytes; zero download authority. The core privacy scan still
obeys its stricter 2 GiB RAM, at-most-64 MiB chunks and below-100 MiB redacted
findings/receipt caps. Do not expand a narrower capability cap to the whole
runner's larger envelope. Enforce all applicable bounds.

The real wrapper's receipt binds `input_receipt_sha256`, `phase_spec_sha256`,
`focused_test_command_sha256`, `output_payload_inventory_sha256` and
`semantic_receipt_sha256`. It calls the chapter-owned transform; the cache
runner supplies plumbing only. Complete manifest/inventory/hash validation,
fsync and same-filesystem atomic promotion precede success publication.

Readiness owners:

- User/predecessors: release implementation and satisfy repairs/checker gates;
  planning completion releases nothing.
- Chapter 42 preflight: reconcile framing, parameters, typed schema/module
  integration, token-count unit and strict output-cap accounting.
- Execution wrapper: freeze real config/resources, exact source receipt/mounts
  and downstream admission. Policy changes create new bindings before execution.
- Governance: v1 manual records remain excluded; a future release needs its own
  authorization, complete checks and versioned evidence.
- Data/persistence owners: actual revocation/deletion/rebuild decisions.
- Publication workflow: independent same-candidate receipts and target layout.

Completion checklist: bounded strict framing; fixed normalization and first-match
rules; complete source/rule counts with named units/denominators; exact fixtures
and failure/replay tests; bounded findings and samples; manual exclusion and
body-free evidence; known-descendant limits; preserved legacy APIs; truthful
history and accessible Rust-driven figure; independently reviewed EN/RU slice;
all gates pass; staged/canonical equality; dedicated implementation checkpoint/
commit. Real corpus processing remains the separate execution step.
