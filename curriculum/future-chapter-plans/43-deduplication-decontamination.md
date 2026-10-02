# Chapter 43 — deduplication and decontamination: detailed implementation packet

Status: internal planning only. Implementation, repairs and publication remain
held. Use [the common guide](README.md) and
[Chapter 42](42-deterministic-corpus-filtering.md). Concrete policies below are
proposals to freeze at implementation preflight, not measured corpus results.

## 1. Scope and boundary

| Field | Commitment |
| --- | --- |
| Chapter / planning step | `43-deduplication-decontamination` / `detail-ch43-deduplication-decontamination` |
| Future implementation | `implement-ch43-deduplication-decontamination` |
| Required predecessor | `execute-functional-corpus-filtering` |
| Capability / claim | `CAP-DTH-DATA-04`; `CLAIM-02`; no frozen finding IDs |
| Formula / figure | `teaching-formula-ch43-deduplication-decontamination` / `deduplication-decontamination` |
| Small concept | Similarity edges create connected components; keeping a component together prevents the declared overlap class from crossing partitions. |
| Outcome | Deterministic exact/near grouping, canonical survivor and lineage, whole-component splits, and pre-evaluation contamination evidence before tokenizer learning. |
| Boundary | No semantic/embedding deduplication, universal threshold, internet-wide benchmark search, rights certification or proof of generalization. |

Exact frozen prerequisites:

```text
curriculum/functional-laptop-llm-extension-plan.md
audits/2026-08-10-functional-llm-capability/coverage.md
audits/2026-08-10-functional-llm-capability/requirements.md
audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md
.agents/skills/author-llm-course-english/SKILL.md
.agents/skills/localize-llm-course/SKILL.md
site/src/i18n/functional-chapter-locales.json
exact predecessor checkpoint=execute-functional-corpus-filtering
filtered-corpus-v1 cache receipt mounted read-only
artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
```

Future locale/runtime files and execution receipts are not currently completed
inputs. Do not substitute the legacy locale registry or a fixture receipt.
The implementation/real-execution sequence is:

```text
execute-functional-corpus-filtering
 -> implement-ch43-deduplication-decontamination
 -> execute-functional-corpus-dedup-split
 -> implement-ch44-scalable-bpe-tokenizer
```

Only the separately accepted real dedup/split receipt admits Chapter 44.
Upstream TinyStories train/validation filenames remain provenance, not the final
course split. Never learn tokenizer statistics before the final split is frozen.

## 2. Evidence and source ledger

Baseline commit: `58c2d5b23da0a39a493f60f61a006098ff44cf99`.
The frozen [extension plan](../functional-laptop-llm-extension-plan.md) remains
SHA-256 `84d8ab860a3282dd5d373ca285a3815b04836d9abb7a1d2267e163143091bea1`.

Existing code to preserve:

- [corpus.rs](../../rust/crates/llm-from-scratch/src/corpus.rs) rejects duplicate
  full text in the tiny JSON loader. It does not discover normalization variants,
  near duplicates or benchmark overlap. New streaming input must not use that
  loader before its duplicate fixtures can be inspected.
- `SplitManifest::partition` validates checksum, complete/disjoint/nonempty/
  ordered roles and intact provenance groups. `CorpusPartitions::training_documents()`
  is the existing train-only learning view. `CLAIM-02` is about those structural
  invariants, not content independence, quality or privacy.
- [data.rs](../../rust/crates/llm-from-scratch/src/data.rs) and
  [pipeline.rs](../../rust/crates/llm-from-scratch/src/pipeline.rs) preserve
  document-local windows and corpus → split → train-only BPE → separate encoding.
  Keep the 12-document 8/2/2 fixture and its FNV checksum unchanged.
- Chapter 42 supplies retained eligibility, raw-source/span lineage and policy
  identity. A digest of text is not an authorization or anonymity guarantee.

Primary sources inspected read-only on 2026-09-15:

| Source | Historical commitment and limit |
| --- | --- |
| `SRC-DTH-EVAL-04`, earlier 2020: [Language Models are Few-Shot Learners](https://proceedings.neurips.cc/paper/2020/hash/1457c0d6bfcb4967418bfb8ac142f64a-Abstract.html), [section 4 / appendix C](https://arxiv.org/html/2005.14165v4) | GPT-3 investigated training–benchmark overlap and documented incomplete filtering and limitations of interpreting score differences. An overlap detector and a model-quality conclusion are different claims. |
| `SRC-DTH-DATA-03`, later 2022: [Deduplicating Training Data Makes Language Models Better](https://aclanthology.org/2022.acl-long.577/) | Experiments examined exact/near repetition, memorized output and validation overlap. Their observed improvements and overlap rates belong to the studied datasets/models, not this course. |

The historical Rust comparison is exact-text-only grouping versus the declared
shingle/component policy on the same tiny fixture. It is not a reproduction of
the papers' full tools or model experiments. No dataset or model was acquired.

## 3. Inputs, policy and worked example

### Proposed matching policy

Keep original retained text and source/span identity immutable. Build a separately
named matching view: ASCII letters lowercased, split on ASCII whitespace bytes
`0x09..0x0d` and `0x20`, then join words with one ASCII space. No punctuation
removal, transliteration, Unicode case folding or NFC/NFKC normalization.
UTF-8 must already be valid. Unicode scalars and non-ASCII whitespace are
preserved literally. Record the policy ID and hash alongside each view hash.

This deliberately narrow policy detects declared whitespace/case variants but
does not call canonically equivalent Unicode strings identical. Freeze both
positive ASCII-whitespace and negative composed/decomposed-Unicode fixtures.
Those Unicode fixtures test matching-view equality, not a claim that such texts
can never be near neighbors when enough unchanged surrounding shingles remain.
Expanding normalization is a new course-owned policy, not an unreviewed library
default. Preserve both source-text SHA-256 and matching-view SHA-256.

Exact equality requires matching view bytes, not a hash comparison alone.
For each exact group choose the smallest immutable record ID as representative;
keep every alias, source restriction and withdrawal edge. Hash collisions are
bucket candidates and require byte comparison. Never select the least restrictive
license or discard provenance when choosing the representative.

Near comparison uses SETS of consecutive word tuples, not bags. Encode each tuple
unambiguously with length-prefixed UTF-8 words. Proposed production parameters:
five-word shingles and threshold $4/5$. The teaching fixture overrides these to
two-word shingles and threshold $1/2$. Both versions are named and hash-bound.
No claim is made that these thresholds are optimal for TinyStories.

Frozen teaching formula:
$$J(A,B)=\frac{|A\cap B|}{|A\cup B|}.$$
Here $A$ and $B$ are finite shingle sets, not document IDs or token-frequency
vectors. Keep intersection and union counts in receipts. Compare rational
thresholds using checked integers, without floating-point rounding.

Two different texts with empty shingle sets have unavailable near similarity,
not similarity one; only their exact-equality path can group them. If one set
is empty and the other nonempty, Jaccard is zero. Short protected items also
receive the separate exact/substring scan below.

### Six-record fixture

These are controlled source records, in the shown source order. Alias IDs are
readable fixture names; production uses bound immutable IDs.

| ID | Text | Bigram set |
| --- | --- | --- |
| `a` | `a b c d` | `a b`, `b c`, `c d` |
| `a-copy` | `a b c d` | same as `a` |
| `b` | `b c d e` | `b c`, `c d`, `d e` |
| `c` | `c d e f` | `c d`, `d e`, `e f` |
| `d` | `g h i j` | `g h`, `h i`, `i j` |
| `e` | `k l m n` | `k l`, `l m`, `m n` |

Exact pass keeps `a` and aliases `a-copy` to it. Five exact representatives remain.
Among `a,b,c`, Jaccard values are $2/4$, $2/4$ and $1/5$ for `a–b`, `b–c`
and `a–c`, respectively. The threshold includes equality, so only the first
two near edges exist. They produce one transitive component despite the endpoints
being below threshold. `d` and `e` are singleton components.

Proposed retention policy: collapse exact aliases, retain distinct near variants,
but coassign the whole near/provenance component. The canonical component
representative is its smallest original member ID; it is an identity/ordering
anchor, not permission to discard every other near variant. Record this policy
explicitly so “deduplication” is not mistaken for near-text deletion.

Thus input count 6 = 5 retained exact representatives + 1 exact alias; component
sizes in original identities are 4,1,1. The main fixture assigns component
`{a,a-copy,b,c}` to train, `{d}` to validation and `{e}` to test. This explicit
assignment is a fixture-only splitter used to expose the invariant.

Component identity hashes a canonical record containing policy identity and all
sorted original member IDs, including exact aliases. Union-find root selection,
traversal order or input shuffling must not affect this identity.

Worked observations:

1. `a` and `c` belong together without a direct above-threshold edge.
2. Assigning `b` to validation violates component isolation even though IDs differ.
3. At threshold $3/5$, the three near variants separate; at $1/5$, their graph
   is fully connected. Exact aliases stay together in all cases.
4. Repeating a bigram changes a bag count but not the corresponding set member.
5. Dropping `a-copy`'s lineage loses provenance even though its text is redundant.

### Protected overlap and split policy

Freeze a nonempty, versioned inventory of evaluation prompts, held-out items and
benchmark texts before scanning or observing model metrics. Bind role, item ID,
source/license provenance, normalization, exact-match rules, shingle size,
threshold and short-item substring rules. Missing inventory is a preflight
dependency failure; an empty default must not produce a “zero contamination” pass.
The future execution owner must resolve the actual inventory in its phase spec
before processing the real corpus. This packet does not invent benchmark
acquisition authority.

For the teaching contamination variant, protected benchmark `q` has `b`'s text.
It is not another training-source record. Its exact match quarantines the whole
`{a,a-copy,b,c}` component from training and all candidate course splits.
Record protected side retained; corpus side excluded; exact score $1/1$,
threshold, direct matching IDs and all component consequences.
The original fixture train role then becomes empty: refuse publication.
Do not move `d` or `e` or change the seed to make this result pass.

Production scans:

- Exact normalized hashes with byte verification against protected inventory.
- Declared full shingle-set Jaccard, including its threshold and scope.
- Exact contiguous matching-word subsequences for protected items shorter than
  the shingle size; scan every position, not just the first occurrence. For
  longer protected items, also report shared fixed-length word shingles as an
  overlap diagnostic. A shared shingle alone is not an above-threshold Jaccard
  match; never silently combine the two criteria.
- A policy may quarantine on additional diagnostic overlap only if that rule
  was frozen in advance. Store which rule actually caused exclusion.

Report both matching pairs and affected documents/components; do not confuse
their denominators. A zero after-scan count means no matches under the named
inventory/rules, not no possible semantic contamination.

Proposed production assignment after protected exclusion: hash a domain-tagged
canonical pair of split-policy seed and complete component ID; interpret the
first eight digest bytes as unsigned big-endian, reduce modulo 10,000.
Buckets 0–8999 train, 9000–9499 validation, 9500–9999 test.
Freeze seed `course-split-v1` before results. Bucket proportions are assignment
probabilities, not guaranteed document/token ratios. Enforce all three roles
nonempty; no reseeding, exact-size rebalancing or splitting a component.
Verify and freeze the assignment manifest before tokenizer learning.

Explicit upstream provenance-group relationships add union edges BEFORE final
component identity/assignment. A whole source filename is not automatically a
single provenance group: that would merge an entire raw file. Without an explicit
shared-group assertion, each framed story's immutable source/span is its own
origin unit. Do not infer bilingual pairing or independence from filenames.

## 4. Rust design and ownership

Exact frozen future outputs:

```text
curriculum/chapters/43-deduplication-decontamination.md
rust/crates/llm-from-scratch/module-registry/functional-v1/ch43-deduplication-decontamination.module
rust/crates/llm-from-scratch/tests/ch43_deduplication_decontamination.rs
rust/crates/llm-from-scratch/examples/ch43_deduplication_decontamination.rs
rust/crates/llm-from-scratch/examples/expected/ch43_deduplication_decontamination.txt
rust/crates/llm-from-scratch/src/data/exact_dedup.rs
rust/crates/llm-from-scratch/src/data/near_dedup.rs
rust/crates/llm-from-scratch/src/data/decontamination.rs
rust/crates/llm-from-scratch/src/data/grouped_split.rs
site/src/content/chapters/en/43-deduplication-decontamination.mdx
site/src/content/chapters/ru/43-deduplication-decontamination.mdx
site/src/i18n/functional-catalogs/en/43-deduplication-decontamination.json
site/src/i18n/functional-catalogs/ru/43-deduplication-decontamination.json
site/src/content/cheat-sheets/en/43-deduplication-decontamination.json
site/src/content/cheat-sheets/ru/43-deduplication-decontamination.json
site/src/components/chapters/DeduplicationDecontaminationDiagram.astro
site/tests/43-deduplication-decontamination-diagram.test.ts
site/tests/43-deduplication-decontamination.test.ts
site/tests/e2e/ch43-deduplication-decontamination.spec.ts
audits/functional-laptop/reviews/43-deduplication-decontamination/
artifacts/functional-laptop/chapters/43-deduplication-decontamination/
artifacts/functional-laptop/chapters/43-deduplication-decontamination/history-source-evidence-receipt.json
artifacts/functional-laptop/step-output-inventories/implement-ch43-deduplication-decontamination.json
BUILD_STATE.yaml
DECISIONS.md
```

Proposed API sketches, not existing symbols:

```rust
pub struct SimilarityCount { pub intersection: u64, pub union: u64 }
pub struct RationalThreshold { pub numerator: u32, pub denominator: u32 }
pub fn jaccard_counts(a: &[Shingle], b: &[Shingle]) -> SimilarityCount;
pub fn build_components(
    records: &VerifiedRetainedCorpus,
    policy: &DedupPolicy,
    scratch: &mut BoundedScratch,
) -> Result<ComponentManifest, DedupError>;
pub fn scan_protected(
    corpus: &ComponentManifest,
    protected: &VerifiedProtectedInventory,
    policy: &DecontaminationPolicy,
) -> Result<ContaminationReport, DedupError>;
pub fn assign_groups(
    admitted: &DecontaminatedComponents,
    policy: &SplitPolicy,
) -> Result<FrozenSplitManifest, SplitError>;
```

`exact_dedup.rs` owns matching-view construction, exact verification and alias
selection. `near_dedup.rs` owns shingling, candidate filtering, set similarity and
union logic. `decontamination.rs` owns protected-role matching and quarantine
decisions. `grouped_split.rs` owns whole-component assignment, complete coverage,
stable order and nonempty-role validation. Use the existing `data.rs` module and
foundation module registry; no parallel root or replacement of old APIs.

Supporting serializers, hashes and file I/O may be reused within their locked/
allowlisted role. A library may not choose normalization, shingles, similarities,
representatives, component membership, split roles or exclusions. Rust owns
historical demonstrations too.

### Bounded implementation strategy

Exact hashing is a linear streaming pass over admitted text. Use bounded hash
partitions/external sorting for grouping; verify matching bytes within candidate
buckets. Preserve stable output ordering separately from internal processing order.

Production never runs an unconditional all-document-pairs loop. Build a disk-backed
shingle index and exact prefix candidate filter:

1. Count each shingle's document frequency, not repeated occurrences in one set.
2. Freeze one global total order: frequency ascending, then tuple bytes.
3. Sort every nonempty set in that order. For threshold $t$, retain prefix length
   $|S|-\lceil t|S|\rceil+1$.
4. Generate canonical candidate ID pairs sharing a prefix shingle. Apply necessary
   size bound $\min(|S|,|T|)\ge t\max(|S|,|T|)$.
5. Externally deduplicate candidate pairs, then verify exact full-set Jaccard.
6. Union qualifying pairs and explicit provenance links. Final IDs use sorted
   original members, never the mutable union-find root.

Why the prefix filter does not miss a qualifying nonempty pair: its intersection
has at least $\lceil t|S|\rceil$ and $\lceil t|T|\rceil$ members. The earliest
common shingle in the shared order must therefore lie within both prefixes.
This is a correctness filter, not a worst-case runtime guarantee. Many documents
can genuinely share many qualifying pairs.

Freeze scratch, posting, candidate-enumeration and memory limits before allocation
or growth; fail closed on dense buckets rather than dropping frequent shingles,
sampling pairs, silently switching to MinHash or claiming complete coverage.
The quadratic reference is fixture-only, at most 10,000 documents. Exhaustively
compare candidate coverage against it on small generated sets. Performance
admission for the real corpus remains measured future work.

The capability estimate is for an approved core corpus of at most 30M tokens.
The execution step still processes its entire declared input: it cannot silently
take the first 30M symbols from a larger bundle. Reconcile the selected corpus
profile and token unit with the upstream receipt before execution; any approved
subset needs a bound selection policy and complete omission/accounting lineage.

The generated bundle must use a strict dedup/split manifest variant, preserve
Chapter 42 policy/source restrictions, and enumerate exact payload hashes.
Output roles are `deduplicated-corpus`, `decontamination-rejections` and
`frozen-train-valid-test-splits`. Include component/alias maps, assigned original
and surviving IDs, excluded IDs/reasons, source/language counts, threshold and
protected-inventory hashes. Complete input coverage includes excluded records,
not merely a complete partition of survivors.

Deletion of an alias invalidates known descendants conservatively; whether an
identical authorized source permits later rebuilding is a new evidence decision.
Do not rewrite completed receipts or claim removal from learned weights.

## 5. Falsifiable tests and failure handling

Freeze at least these fixture classes and exact expected outcomes:

| Test | Decisive expectation |
| --- | --- |
| `six_record_components` | 6 source IDs, 5 exact representatives, 3 components; only `a–b` and `b–c` near edges. |
| `input_order_invariance` | Permuted records, index traversal and union order yield identical groups, canonical IDs, survivors, roles and output hashes. |
| `normalization_scope` | ASCII case/multiple whitespace variants group; composed/decomposed accents and non-ASCII spaces follow the explicit non-normalization policy. Raw lineage survives. |
| `hash_collision_verifies_bytes` | Inject identical bucket hashes for unequal bytes: no false exact merge. |
| `set_not_bag` | Repeated shingles count once for Jaccard; tuple boundaries cannot collide through concatenation. |
| `threshold_boundary` | Exact equality accepted; $1/5$, $1/2$, $3/5$ sensitivity changes graphs as predicted, before metrics. |
| `empty_and_short_sets` | Unequal one-word texts do not become near duplicates; identical ones still exact-dedup; short protected substring found at every valid offset. |
| `substring_and_paraphrase` | Partial repeated phrase is diagnostic under its rule; paraphrase-like but lexically distinct text stays unmatched with the limitation stated. |
| `protected_quarantine` | `q=b` excludes the entire ABC component and records score/threshold/source IDs/retained side; empty train refuses publication. |
| `no_inventory_no_clearance` | Missing, empty or hash-mismatched required protected inventory fails. |
| `group_and_role_integrity` | Exact aliases, transitive neighbors and asserted provenance groups never cross roles; duplicates/omissions/order errors fail. |
| `split_bucket_boundaries` | Bucket values 8999/9000/9499/9500 map exactly; production hash encoding/seed is fixed. Fixture role injection is not a production option. |
| `candidate_completeness` | Every qualifying nonempty pair in exhaustive tiny sets is emitted by prefix filtering; then full Jaccard rejects false candidates. |
| `dense_bucket_limits` | Pathological common-shingle inputs hit a predeclared budget with explicit failure, not incomplete success. |
| `upstream_drift` | Modified retained body, policy, source, lineage or extra/missing payload fails admission. |
| `fresh_attempt_replay` | Same admitted bytes/config/tools in new staging give identical canonical bytes and hashes. |

Additionally verify zero train–validation–test exact-hash overlap and zero
above-threshold protected overlap AFTER exclusion, with byte-confirmed hashes.
Run the matching policy across final role pairs too; failure is not rescued by
document-ID disjointness. Preserve diagnostics without raw sensitive snippets.

Read/write/overflow/cap failures leave provisional output and no success receipt.
Restart from immutable inputs into new staging. No v1 resumable append is claimed.

## 6. Teaching and isolated-surface commitments

### Problem-first presentation

**Problem definition.** Explain that different record identifiers can still refer to
duplicate or closely related text, allowing overlapping material to enter both training
and evaluation. Establish the need to identify connected groups of overlapping records
and keep each group within a single split.

Follow the current [authoring policy](README.md#current-learner-facing-authoring-policy-2026-10-02): problem definition, guided solution, history,
visualization, then small optional practice. The opening explains the problem and its
cause without questions. Explain the worked results and their formula/Rust connection.
Remove learner prediction prompts entirely; do not move them to optional practice.
Optional tasks reproduce, inspect or explain behavior already taught. The retained
commitments below specify evidence coverage, not the old opening order.

### Retained evidence and optional-practice commitments

Evidence coverage: explain why different IDs do not establish independent data; derive
the exact alias; construct three bigram sets and fractions; distinguish direct
edges from transitive membership; assign whole components; insert protected `q`;
explain refusal; compare historical overlap evidence; inspect policy sensitivity;
hand frozen training IDs to Chapter 44.

Generate the example trace and expected stdout from Rust. It must name raw ID,
exact representative, matching policy, full shingle sets, intersection/union,
threshold, edge decision, component member list, role and protected exclusion.
Keep the edge table distinct from the component table.

Every isolated score names both records, shingle policy and counted sets.
Every component label states whether it denotes original IDs or surviving rows.
“No overlap” names the checked inventory and rules. A canonical representative
is not the only retained near variant under this policy. Excluded-component
counts do not masquerade as direct matching-pair counts.

Cheat-sheet candidates: exact duplicate, shingle, Jaccard similarity, connected
component, decontamination, training partition. Only include chapter-used terms.
No second lesson or generic hashing/JSON glossary. Author English from executable
evidence, then translate Russian only from its independently approved revision.

## 7. Visualization and accessibility

One figure `deduplication-decontamination`, through the declared
`DeduplicationDecontaminationDiagram.astro` and shared `course-diagram`,
`data-diagram-style="course-v1"` roles. Show the exact alias, two near edges,
the containing ABC component, and three whole-component destination boxes.
A second state within the same reading order shows `q` triggering quarantine
and the resulting empty-training refusal.

Label edges with exact fractions and threshold; explicitly mark `a–c` as no
direct edge while keeping it in the component. Use text and redundant border/
shape cues, not color alone. The description preserves all membership,
transitivity and exclusion relationships.

Stack component and destination panels on narrow containers. If the exact
comparison table needs travel, use the smallest named/focusable shared scroll
region. Each bounded box, including a cell inside a scroller, contains its ink.
No clipped text, reduced font, private script/full-view control or duplicate DOM.
The shared full-view enhancement reuses the same semantic figure.

Future static HTML checks prove visible data/math/links; sole Firefox with
JavaScript checks desktop, narrow, full view, forced colors and applicable
direction cases, including keyboard/Escape/focus restoration. Validate Russian
independently. TypeScript may parse the Rust trace but must not compute grouping.

## 8. Serial implementation procedure

After implementation is released:

1. Verify the actual filtering checkpoint/receipt, foundation schemas/module
   registry, protected-inventory ownership and corpus-profile bounds.
2. Freeze matching/exact/near/retention/protected/split policies, their canonical
   encodings and resource limits before scanning or seeing held-out metrics.
3. Implement the six-record scalar oracle, exact aliases, shingle counts, threshold
   comparison, components, protected variant and fixture-only role assignment.
4. Implement indexed/prefix candidate generation and bounded external processing;
   differentially compare to exhaustive fixtures. Test dense-index failures.
5. Implement production hash assignment, role/lineage manifests and independent
   final overlap scans. Run failure and fresh-attempt replay tests.
6. Generate stdout; author the contract, English page/figure/catalog/cheat sheet.
   Run deterministic, static and Firefox validation.
7. Freeze one English candidate and obtain the external reviews/adjudications.
   Translate/review Russian, revalidate layout and publish the coherent chapter.
8. Checkpoint and commit the implementation separately. Only then may
   `execute-functional-corpus-dedup-split` apply it to the real admitted bundle.

The later execution wrapper owns:
`src/bin/llm-functional-corpus-dedup-split.rs`,
`tests/functional_corpus_dedup_split_runner.rs` and
`configs/functional-data-pipeline/corpus-dedup-split-v1.json`.
Its closed invocation is:

```bash
cargo run --release --locked -p llm-from-scratch --bin llm-functional-corpus-dedup-split -- --spec configs/functional-data-pipeline/corpus-dedup-split-v1.json --input-receipt /receipts/input.json --input /artifacts/input --output /output
```

Input receipt: `artifacts/functional-laptop/data/filtered-corpus-v1/receipt.json`.
Output receipt:
`artifacts/functional-laptop/data/deduplicated-split-corpus-v1/receipt.json`.
Mounts `/artifacts/input:ro`, `/receipts/input.json:ro`,
`/output:rw-run-scoped`; network none. The runner executes focused tests before
the full transform and verifies inventory/hashes, fsync and same-filesystem
atomic promotion before publication. No post-publication transform rerun.

## 9. Validation and external review handoff

Exact future implementation commands:

```bash
scripts/run-functional-history-source-evidence.sh --step implement-ch43-deduplication-decontamination --chapter 43-deduplication-decontamination --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
scripts/run-functional-offline.sh --step implement-ch43-deduplication-decontamination --target implement-ch43-deduplication-decontamination-v1
scripts/run-functional-firefox.sh test --step implement-ch43-deduplication-decontamination --target chapter-43-deduplication-decontamination-v1
git diff --check
./course audit-host
```

The following separately owned execution commands are not Chapter 43 fixture
validation and are not run during planning:

```bash
scripts/run-functional-offline.sh --step execute-functional-corpus-dedup-split --target execute-functional-corpus-dedup-split-v1
scripts/run-functional-artifact-cache.sh publish-generated --step execute-functional-corpus-dedup-split --target corpus-dedup-split-v1
scripts/run-functional-artifact-cache.sh verify --step execute-functional-corpus-dedup-split --target corpus-dedup-split-v1
```

Registered future targets must cover locked Rust fmt/clippy/tests, exact stdout,
dependency/ownership policy, all six required fixture classes and additional
failures above, manifest/count/lineage invariants, EN/RU parity, static build,
links/math and Firefox. Record underlying commands at implementation preflight;
do not invent missing runners now.

Use the common guide's external author/two-reviewer/two-adjudicator separation.
Freeze requirements, exact source and built HTML; route canonical four-artifact
prompts and preserve untouched exact raw responses/receipts. Both review verdicts
and both adjudication verdicts must pass. A sound blocking review approved by
its adjudicator is still blocking. Then obtain distinct bilingual and target-only
Russian reviews plus affected rendered evidence.

The future single executor cannot spawn agents or certify itself independently;
external judgment capacity is a prerequisite, otherwise output remains staged.
Meaning/role/reading-order/extracted-surface edits invalidate dependent judgments.
The ignored root `target/` and any original host-audit failure remain preserved.
Planning validation is not a publication review or an executable dedup benchmark.

## 10. Cost, risks and readiness

Current cost: medium planning, local read-only evidence, primary-source lookup and
tiny shingle arithmetic only; no corpus processing, package install, training,
course implementation or publication judgments.

Implementation: large C3/G0/N1/no paid service; two frozen historical sources,
134,217,728-byte evidence ceiling, zero new artifact-download authority.
Profile `8gb-gpu-core` is consumed, not GPU execution permission.

Content/review caps: 8 successful contexts, at most 16 attempts; per-context
2,097,152 input bytes / 200,000 tokens, 1,048,576 output bytes / 40,000 tokens;
aggregate input 33,554,432 bytes, output 16,777,216 bytes, wall 28,800 seconds.
One rendered-image context using the user-selected model: 16,777,216 input bytes,
262,144 output bytes and 900 seconds. Strong course-content contexts and
independent external handoffs remain required.

Capability estimate for the approved ≤30M-token core corpus: at most 6 GiB
host RAM, 8 GB index/scratch and 5–60 minutes. Hashing is linear; the quadratic
reference is restricted to ≤10,000-document fixtures. Estimates are not measured
performance. Prefix filtering can still encounter quadratic candidate density;
bounded failure must never be reported as a clean corpus.

Separate real execution caps: C3/G0/N0/no paid service, 10,800 seconds,
8,589,934,592 host bytes, 14,000,000,000 disk bytes, zero download authority.
Honor the narrower algorithm/index envelope within the whole runner envelope.
Its receipt binds `input_receipt_sha256`, `phase_spec_sha256`,
`focused_test_command_sha256`, `output_payload_inventory_sha256` and
`semantic_receipt_sha256`.

Preflight owners must resolve: exact protected inventory before scanning; approved
core input selection/count unit; strict manifest variant and shared exports;
proposed normalization/retention/threshold/hash encoding; measured candidate
budget. None authorizes altering the held build, fixing older chapters or running
a transform now.

Done means: deterministic grouping/survivors and alias lineage; explicit near
retention policy; whole-component nonempty splits; scoped pre-evaluation overlap
report; six required fixture classes and bounded-index failures; train-only
handoff; truthful history and accessible Rust-driven figure; independently
reviewed EN/RU slice; exact gates and staged/canonical equality; its own
implementation checkpoint/commit. The separate real execution remains separate.
