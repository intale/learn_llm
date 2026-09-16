# Chapter 57 implementation packet: immutable artifact persistence

Status: internal planning only. Follow the [shared packet contract](README.md)
and [frozen extension plan](../functional-laptop-llm-extension-plan.md). This
packet neither releases the implementation/repair hold nor certifies English or
Russian for publication. One future executor can perform the serial work below;
independent language judgments remain external handoffs.

## 1. Scope and boundary

Teach one mechanism: preserve immutable, content-addressed model artifacts and
change a small root reference only after its complete successor is ready.

| Frozen field | Exact value |
| --- | --- |
| Chapter | `57-immutable-artifact-persistence` |
| Implementation step | `implement-ch57-immutable-artifact-persistence` |
| Dependency | `implement-ch56-tensor-artifact-interchange` |
| Rust owner | `owner-ch57` |
| Capabilities | `CAP-DTH-PERSIST-01`, `CAP-ISA-PER-001`, `CAP-ISA-PER-002` |
| Formula | `teaching-formula-ch57-immutable-artifact-persistence` |
| Figure | useful; `immutable-artifact-persistence` |
| Findings / claims / overbroad surfaces | `[]` / `[]` / `[]` |
| Active locales | `en`, `ru` |
| Special gates | `english-two-review-two-adjudication`, `direct-russian-bilingual-target-only`, `static-firefox-only` |

Exact outcome: “Store large immutable artifacts as content-addressed local files
and publish complete successors atomically.” Preserve Chapter 35's checkpoint
wire format and Chapter 56's tensor/config/tokenizer validation. Adopt Chapter
56's narrow local publisher into this one common boundary; do not leave two
independent publication protocols. Hash and publish the same bytes, preserve
lineage, and make retry, corruption, retention and deletion observable.

Exact prerequisites:

```text
curriculum/functional-laptop-llm-extension-plan.md
audits/2026-08-10-functional-llm-capability/coverage.md
audits/2026-08-10-functional-llm-capability/requirements.md
audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md
.agents/skills/author-llm-course-english/SKILL.md
.agents/skills/localize-llm-course/SKILL.md
site/src/i18n/functional-chapter-locales.json
exact predecessor checkpoint=implement-ch56-tensor-artifact-interchange
artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
```

Consume Chapter 56's validated immutable bundle and complete payload inventory,
including future `transformers-final-cache-publication-receipt.json` and
`llama2c-final-cache-publication-receipt.json` only after its producer/sign,
prompt, dependency and module-registration gates are resolved. They are not
currently available evidence merely because their filenames are specified.
Tiny diagnostic bytes support this chapter without downloading any model.

Exact successor handoff: “Chapter 58 builds complete training-job continuation
on these immutable and atomic file semantics.” Export object identity, snapshot
references, bounded reads and publication outcomes, not optimizer/RNG/job-state
serialization. No Event Sourcing, event ledger, database, PostgreSQL, network
object store, secure erase, universal filesystem guarantee, new build authority,
ANN index or static-site runtime service is introduced. `BUILD_STATE.yaml` and
`DECISIONS.md` remain the scheduling authority; an artifact lineage DAG is not a
replacement project ledger.

## 2. Evidence and source ledger

The immutable extraction for this packet is
`.build/runs/20260916T085447Z-detail-ch57-immutable-artifact-persistence-01/inputs.json`,
26,078 bytes, SHA-256
`c55ce7d15989172f24192154d27ac3eabb15eb45f27ab42f26b888eae7caf517`.
Planning baseline follows Chapter 56 commit
`7bae57d93d6975a99bb45e1b5b3f40b33b070330`. Execution must re-read the then-current
predecessor implementation and record its actual hashes; a planning commit does
not implement the capability.

| Evidence | Supported commitment | Limit |
| --- | --- | --- |
| Existing Chapter 35 `Checkpoint::save_atomic` | Unix path uses a newly created temporary file, write, file sync, rename and parent sync; current tests cover sequential replacement and temporary cleanup | FNV checkpoint encoding is not SHA-256 content identity; an error after rename can coexist with a new visible file. No observed general store, lock, crash matrix or GC acceptance |
| Chapter 56 planning packet | One bounded same-filesystem bundle publisher, exact-byte identity and source/config/tokenizer lineage | Proposed predecessor integration, not an existing general persistence service |
| Frozen capability records and this packet | Resource limits, ownership and proposed policies below | Course policy, not source-paper claims or measurements |
| Host-computed diagnostic SHA-256 values in §3 | Exact bytes and reproducible content identifiers | Not model-schema validation, authenticity, durability or a product test run |

The two historical sources remain exactly the frozen pair:

- Earlier, `SRC-DTH-ART-03` (2019), [ONNX Intermediate Representation](https://onnx.ai/onnx/repo-docs/IR.html): portable model representation includes graph, type, initializer and external tensor references. Use it to explain why a model can comprise related files, not to promise arbitrary decoder/runtime equivalence or a filesystem transaction.
- Later, `SRC-DTH-RESUME-01` (2021), [CheckFreq](https://www.microsoft.com/en-us/research/publication/checkfreq-frequent-fine-grained-dnn-checkpointing/): recovery must coordinate model/optimizer state and input progress. Its studied recovery and overhead results do not validate this course's format or imply database necessity.

The LLM progression is portable model interchange → coordinated recovery inputs
→ the course's complete immutable snapshot boundary. The Rust contrast shows a
model-only replacement and then a manifest binding related objects; Chapter 58,
not this example, supplies complete training continuation. Neither historical
source is credited with this content-addressed DAG, lock policy or exact protocol.

Supplemental implementation evidence is the pinned [Rust 1.93.1 File API](https://doc.rust-lang.org/1.93.1/std/fs/struct.File.html),
including `try_lock` (stable since 1.89), `sync_all` and the distinction between
buffered writes and synchronized files. It is not a third historical source.
Freeze the admitted host/filesystem/toolchain support receipt before relying on
these calls. A network filesystem or unsupported directory synchronization
behavior must refuse the durable mode rather than inherit a local guarantee.

## 3. Inputs and worked example

Ask the learner first: after writing a successor, which root may a reader see
at each interruption point, and which old bytes can be deleted? Use a private
temporary store, no model files, no seed and a two-byte diagnostic stream buffer.
The following payloads have no newline:

| Label | Literal Rust bytes | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| Old object | `b"abc"` | 3 | `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad` |
| New object | `b"abcd"` | 4 | `88d4266fd4e6338d13b845fcf289579d209c897823b9217da3e161936f031589` |
| Orphan | `b"orphan"` | 6 | `88f6811ab5d8fc6d3177f9b7609ae0fcebfda187e5046b62d38bb539e88b74d7` |

These are diagnostic JSON manifests, not an invented claim that the production
schema is already accepted. Construct each displayed compact UTF-8 line followed
by exactly one LF, with the displayed field/array order and no other whitespace:

```json
{"objects":[{"bytes":3,"sha256":"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"}],"parents":[],"version":1}
{"objects":[{"bytes":4,"sha256":"88d4266fd4e6338d13b845fcf289579d209c897823b9217da3e161936f031589"}],"parents":["8eb9d5a37fafc2d4399302eec7fe79e2170ce085cb578582fcd574b02c76e6e3"],"version":1}
```

The old manifest is 127 bytes with SHA-256
`8eb9d5a37fafc2d4399302eec7fe79e2170ce085cb578582fcd574b02c76e6e3`;
the successor is 193 bytes with SHA-256
`f8af698e7a778e0430f50530fcd131caf52d78ce2affa5eaf62a4bc476c724b3`.
Its `parents` edge is a diagnostic **strong restore dependency**, not mere
historical provenance; it names the old manifest. No manifest contains its own hash: the
whole-file SHA-256 lives in its object name/reference and external metadata.
A separately hashed receipt references the manifest; making the manifest then
reference that receipt would introduce a cycle and is not this construction.

Proposed fixture root bytes are the selected 64-character lowercase manifest
hash plus one LF, 65 bytes. Initially the root names the old manifest. Publish
new payload and manifest before replacing the root. The graph reachable from the
new root contains both manifests and both payloads: $127+193+3+4=327$ immutable
bytes. The six-byte orphan is outside that graph. The 65-byte root, lock file,
staging, directory entries, filesystem overhead and receipts are separate budget
items; 327 bytes is not total disk usage. Removing the old root alias does not
make the old payload collectible because the successor still references its
parent.

Use these eight named checkpoints in both the trace and interruption harness:

| Checkpoint reached | Visible root in the live filesystem | Successor state | Meaning of a stop here |
| --- | --- | --- | --- |
| K0: before candidate creation | old | absent | Old complete graph remains |
| K1: first two payload bytes written privately | old | partial private file | Ignore/quarantine incomplete staging; never serve it |
| K2: payload finished, buffer flushed, file synchronized | old | complete staged payload | No root publication yet |
| K3: payload renamed to immutable identity and parent synchronized | old | durable new object, unreferenced | Retry verifies/reuses exact bytes |
| K4: complete manifest synchronized, renamed and its parent synchronized | old | complete new graph, unreferenced | Old root remains; new graph can be recovered by identity |
| K5: root temporary file written and synchronized | old | new graph and staged root | Root replacement has not happened |
| K6: root renamed, before its parent sync succeeds | new | complete new graph | Visibility changed; durability outcome is uncertain if sync fails |
| K7: root parent sync succeeded | new | confirmed complete publication | Return committed receipt within the supported filesystem contract |

At K6, never report “error means old root”: re-open under the guard and verify the
visible reference. Process termination tests observe the same running kernel's
filesystem; they are not power-cut simulations. Recovered old or new references
must each resolve to a complete verified graph, but no table asserts universal
post-power-loss persistence. A synchronization error after rename yields an
uncertain-commit result, not success and not a destructive rollback.

Frozen formula literal:
`published(final) = fsync(temp) ∧ atomic_rename(temp, final)`.
Render the formula through the math pipeline and define staged bytes, the final
path, synchronization and atomic name replacement. Treat it as the core artifact
step within the complete protocol, not a sufficient theorem about all storage:
buffer flush, same filesystem, directory synchronization, durable child objects,
reference-last ordering and the supported filesystem assumptions remain explicit.

## 4. Rust design and ownership

All APIs below are proposed until implemented and tested. `ArtifactId` is a
validated 32-byte SHA-256 value with one lowercase-hex presentation, not an
arbitrary pathname. `ObjectDescriptor` binds kind/schema, exact byte length and
digest; a snapshot lists ordered child objects and parent snapshots plus the
predecessor's configuration/tokenizer/lineage identities. Distinguish content
identity from semantic compatibility and from mutable root names. Identical
bytes reuse one object even if multiple manifests reference it; changed metadata
creates changed manifest bytes and therefore a new manifest ID.

Before execution, reconcile one versioned canonical schema with Chapter 56:
fixed field order, deterministic ordering for set-like inventories, preserved
semantic order for ordered inputs, UTF-8 escaping/normalization policy, integer
range, exactly specified final-LF policy, and duplicate/unknown-field rejection.
The §3 fixture is fully fixed; the production schema is a named readiness gate,
not an implicit `serde_json` default. Standard serde syntax handling is plumbing;
course Rust owns canonicalization choices, DAG edges, bounds and compatibility.
Use the predecessor-admitted SHA implementation; never treat FNV as the store ID
or a hash as proof of source authenticity/license.

Proposed behavioral boundary:

```rust
// Proposed types; the transaction owns the exclusive store guard.
trait StoreTransaction {
    fn put_verified_stream(&mut self, expected: &ObjectDescriptor,
        reader: &mut dyn std::io::Read, limits: &StoreLimits)
        -> Result<ArtifactId, StoreError>;
    fn read_verified(&mut self, id: ArtifactId, limits: &StoreLimits)
        -> Result<VerifiedRead<'_>, StoreError>;
    fn publish_snapshot(&mut self, expected_old_root: Option<ArtifactId>,
        snapshot: &Snapshot) -> PublicationOutcome;
    fn walk_reachable(&mut self, roots: &[ArtifactId], limits: &StoreLimits)
        -> Result<Reachability, StoreError>;
    fn plan_retention(&mut self, roots: &[ArtifactId], candidates: &[ArtifactId])
        -> Result<RetentionPlan, StoreError>;
}
```

`VerifiedRead` borrows the guarded transaction, preventing its release while a
reader is live. These types are not current APIs. Keep
`Committed`, `UnchangedVerifiedReuse`, `RefusedBeforeCommit` and
`CommitDurabilityUnknown` distinguishable; an undifferentiated `Result<(), _>`
must not imply that every error preserved the old root. Proposed error classes
include `Busy`, `UnsupportedFilesystem`, `SizeLimit`, `SizeOverflow`,
`DigestMismatch`, `ExistingObjectConflict`, `InvalidManifest`, `UnknownVersion`,
`MissingParent`, `Cycle`, `TraversalLimit`, `RootChanged`, `ReferencedObject`,
`ReaderActive`, and stage-bearing I/O/synchronization failure. Map them through
Chapter 50's error/state-effect boundary; no fallback store or successful receipt
on a failed durable write.

Locking policy: one persistent, non-truncating lock file in the private store
namespace and `File::try_lock` for an immediate `Busy` refusal. Never unlink or
recreate a held lock file: a second inode would admit a second writer. Freeze the
admitted filesystem behavior and test separate processes, not only threads.
Serialize publication, verification, reads, reachability and retention under
one exclusive guard. A bounded verified-read handle retains its guard until the
reader finishes; no returned unguarded path may outlive it and let GC delete
behind a reader. Apply byte/work/time bounds and cancellation so this simple
policy does not promise unbounded waiting. This is a cooperative private
namespace, not a hostile-filesystem or multi-host security claim.

Publication order is course-owned. Under the guard, validate the expected old
root and budgets; create a unique same-filesystem temporary object with
create-new semantics; stream through the bounded hash/count buffer; reject early
EOF, extra bytes or digest mismatch. Hash the exact bytes being staged, not a
mutable path later reopened as different input. Flush buffering, synchronize the
file, verify the complete candidate, then rename only to an absent immutable
destination. `rename` can overwrite: existence checks are safe only inside this
cooperative guard. An existing ID is reusable only after exact length/hash/byte
verification; conflicting bytes refuse without overwriting them. Synchronize
every relevant staged/final parent directory. Publish all child objects first,
then the complete manifest, then the small root reference through its own
write/flush/sync/rename/parent-sync sequence. Compare the expected prior root
under the same guard to prevent a stale caller's lost update.

Bound every file size, metadata allocation, count, checked sum, edge and depth
before consumption; stream large payloads rather than creating a second full
copy. A reused existing object needs byte-identical comparison via bounded
reads, not mere trust in its filename. Protect the same inspected bytes during
verification/use. A `VerifiedRead` must not expose unauthenticated partial data as
a valid artifact. Manifest validation completes before serving a root.

Production edge kinds must distinguish strong restore dependencies from
provenance-only history. Strong retained roots keep their required payloads and
strong dependency closure live. Provenance edges preserve bounded ancestor
metadata and declared hashes, but do not automatically retain every ancestor's
heavy payload forever. A pruned payload needs an explicit retention/pruning
receipt; its historical snapshot is non-loadable (`PayloadPruned`), not falsely
present or silently corrupted. Missing required ancestor metadata still fails.
Chapter 58 can retain last-good plus its declared rotations as strong roots
without chaining all historical weights through strong edges. The §3 fixture
deliberately uses a strong edge, so its old payload remains live.

Reachability walks these typed edges with cycle detection and finite
node/edge/depth limits. Unknown schema or a missing required parent fails closed;
it does not turn the affected subtree into garbage. A
retention plan lists exact IDs, evidence roots and a generation/hash binding.
Dry run changes nothing. Revalidate the complete roots and candidate set under
the guard before applying an explicitly authorized plan. Referenced IDs refuse.
Default cleanup moves only selected unreferenced IDs to owned quarantine;
quarantine still counts against disk. Permanent deletion is a separate explicit
operation, exercised only on disposable fixtures here. Never scan-and-delete a
user directory, purge by age alone, or claim secure erase. Partial staging,
complete unreferenced objects, corrupt objects and reachable objects are distinct
recovery classes; preserve forensic bytes and never auto-promote an orphan root.

PER-002 additionally requires a local backend-neutral record/snapshot contract,
with in-memory and file adapters. It is not an optional omitted exercise. Share
canonical record bytes, logical errors, snapshots and retained idempotency
outcomes; only the file adapter claims tested persistence. An idempotency key
binds a canonical request hash: repeating the same key/hash returns the retained
outcome without a second mutation; a different hash refuses
`IdempotencyConflict`, including after restart. Freeze the canonical request's
semantic fields, namespace and bounded retention before execution. Snapshot
state includes the retained outcomes, not an Event Sourcing log. Backend choice
is explicit; no silent file-to-memory fallback, database/socket/client/container
dependency or model-weight storage inside a retrieval product.

Ranking inherits the course-owned `CAP-ISA-RT-001` oracle: provided vectors only,
host authorization before normalization, scoring and top-k. Dot products and
squared norms accumulate in F64 in strictly increasing dimension order. Sort
score descending then canonical document-ID UTF-8 bytes ascending; return exactly
the smaller of requested count and eligible count, with requested count at most
10. Return exact score bits plus document ID/content/vector/provenance hashes.
Both cosine and dot-product modes must agree across adapters and restart.
The manifest binds source/provenance, document ID/content SHA-256, dimension,
dtype, normalization and vector SHA-256. Corruption fails before record exposure.
Do not outsource ranking to a vector library or generate embeddings here. If
the RT oracle is not yet implemented, keep a bounded course-owned diagnostic
oracle in this step's tests and freeze the later RT ownership/handoff; do not
invent an available prerequisite or claim semantic retrieval acceptance.

Use 1,000 reproducible fixture records, IDs `doc-0000` through `doc-0999`, each
with 384 little-endian F32 components. For record index modulo four, choose
respectively the first unit basis vector, the first unit basis vector, the
second unit basis vector, or the negative first unit basis vector. Text is the
ASCII string `document ` followed by the unpadded decimal index, no LF; bind
its computed SHA and a fixed synthetic-fixture provenance record. All vectors
are already unit length. The query is the first unit basis vector. This is
1,536,000 vector bytes, not real embeddings. Bound text/metadata by 16 MiB,
RAM by 256 MiB and elapsed time by two minutes; apply any stricter enclosing cap.
For a six-record diagnostic prefix authorize only indices 1, 2, 3 and 4:
top-three IDs are `doc-0001`, `doc-0004`, `doc-0002`, with scores 1, 1, 0 for
both modes; requesting five returns those then `doc-0003` with score -1.
For the 1,000-record matrix exclude indices divisible by five before any vector
math; exactly 800 are eligible. Compare canonical records and ordered returned
IDs byte-for-byte across memory/file/restart, using the RT oracle's frozen
arithmetic for general scores. Basis scores here are exact. Include zero-norm,
nonfinite, shape/hash mismatch and unauthorized-record negatives. Only eligible
retrieved IDs may enter context/citation outputs. Retrieval-disabled baselines,
relevance and malicious-document curriculum remain the RT owner's gates; this
chapter proves storage/adaptor parity, not useful semantic retrieval.

Freeze ten score/tie fixtures as the two metrics crossed with five unit queries:
first basis, second basis, negative first, negative second and third basis.
On the six-record authorized prefix above, complete rankings are respectively
`[1,4,2,3]`, `[2,1,3,4]`, `[3,2,1,4]`, `[1,3,4,2]`, `[1,2,3,4]`, using the
corresponding `doc-000N` IDs; both metrics give identical exact ranks and scores
from the set -1, 0, 1. Cross these ten fixtures with ten authorization variants
that exclude record indices whose remainder modulo ten equals the variant index.
This specifies 100 conformance traces. Each follows insert → snapshot → same-key
retry → changed-request conflict → file restart → authorized query, and compares
memory/file canonical records, outcomes and ranks. Also test requested counts
1, 3 and 10, empty eligibility and over-limit refusal. Reuse verified immutable
base objects rather than retaining 100 full duplicate stores.

These are not only query scans: authorization variants 0–7 additionally exercise
respectively K0–K7 interruption and retry; variant 8 corrupts a payload byte;
variant 9 corrupts snapshot/idempotency metadata. Corrupt variants must refuse
before exposure. Restore the verified baseline after each negative case before
comparing its final query. The four-ID teaching ranks are a small subset; the
full 1,000-record cases independently use all eligible IDs and top-count 10.

The frozen warm 1,000-record query target is p95 below 100 ms, not an observed
result. Proposed measurement recipe: ten warm-up queries, then these 100 complete
queries in fixed order; report the 95th sorted latency, all samples, host/storage
identity, allocations and result hashes. Include authorization, required store
verification, scoring and output creation; do not omit work or discard outliers
to pass. Freeze this recipe before execution and reconcile any already-admitted
benchmark convention. Apply the stricter PER-002/chapter 256 MiB RAM cap rather
than the generic RT 512 MiB ceiling, without rewriting either source record.

Exact owned outputs, unchanged from the frozen step:

```text
curriculum/chapters/57-immutable-artifact-persistence.md
rust/crates/llm-from-scratch/module-registry/functional-v1/ch57-immutable-artifact-persistence.module
rust/crates/llm-from-scratch/tests/ch57_immutable_artifact_persistence.rs
rust/crates/llm-from-scratch/examples/ch57_immutable_artifact_persistence.rs
rust/crates/llm-from-scratch/examples/expected/ch57_immutable_artifact_persistence.txt
rust/crates/llm-from-scratch/src/artifact/files.rs
rust/crates/llm-from-scratch/src/artifact/atomic_publish.rs
rust/crates/llm-from-scratch/src/artifact/reachability.rs
rust/crates/llm-from-scratch/src/persistence/vector_store.rs
rust/crates/llm-from-scratch/src/persistence/memory.rs
rust/crates/llm-from-scratch/src/persistence/files.rs
scripts/check-functional-artifact-dag.mjs
site/src/content/chapters/en/57-immutable-artifact-persistence.mdx
site/src/content/chapters/ru/57-immutable-artifact-persistence.mdx
site/src/i18n/functional-catalogs/en/57-immutable-artifact-persistence.json
site/src/i18n/functional-catalogs/ru/57-immutable-artifact-persistence.json
site/src/content/cheat-sheets/en/57-immutable-artifact-persistence.json
site/src/content/cheat-sheets/ru/57-immutable-artifact-persistence.json
site/src/components/chapters/ImmutableArtifactPersistenceDiagram.astro
site/tests/57-immutable-artifact-persistence-diagram.test.ts
site/tests/57-immutable-artifact-persistence.test.ts
site/tests/e2e/ch57-immutable-artifact-persistence.spec.ts
audits/functional-laptop/reviews/57-immutable-artifact-persistence/
artifacts/functional-laptop/chapters/57-immutable-artifact-persistence/
artifacts/functional-laptop/chapters/57-immutable-artifact-persistence/history-source-evidence-receipt.json
artifacts/functional-laptop/step-output-inventories/implement-ch57-immutable-artifact-persistence.json
BUILD_STATE.yaml
DECISIONS.md
```

Ownership gate: ISA requirements separately name
`rust/crates/llm-persistence-api/{src,tests}`, whereas the step owns the above
`llm-from-scratch/src/persistence` modules. The implementation owner must approve
one placement and reconcile declarations before coding; do not silently create a
parallel crate. `artifact/mod.rs`, module exposure, predecessor
`conversion.rs`, `data_manifest.rs`, acquisition consumers and lineage tests need
explicit shared-integration/predecessor ownership. `training/job_checkpoint.rs`
belongs to Chapter 58's continuation work. Record necessary wiring without
silently enlarging this frozen output list or implementing the next chapter.

## 5. Test and failure matrix

Use equality for bytes, digests, IDs, graph membership, counters and trace order;
no floating tolerance applies. Tests run in disposable per-test directories and
never target a real user's artifact store.

| Named case | Input and expected evidence |
| --- | --- |
| Exact identity | Three payloads and two manifests in §3 reproduce lengths/hashes; a changed LF, byte or manifest field yields changed identity; the original expected digest rejects drift |
| Stream bounds | Two-byte chunks produce the same IDs as one chunk. Exact byte cap succeeds; cap minus one, extra byte, early EOF and checked-add overflow refuse before publication, preserving the root |
| Immutable reuse | Retry the new object: exact bytes reuse it with no second physical object. Precreate wrong bytes at that ID: `ExistingObjectConflict`, no overwrite. Renaming is never used as an unchecked replacement |
| Eight kill points | A child process signals K0–K7 and is terminated by a deterministic parent handshake; restart verifies root and its full closure, classifies staging/orphans and retries. No sleep-timing lottery, database or network |
| Sync/write errors | Inject short write, disk-full, file sync, object-directory sync, root rename and root-parent sync failures separately. Precommit failures keep old root; post-reference failure yields uncertain outcome and bounded re-verification, never deletes the valid successor |
| Two contenders | Hold the persistent guard in process A; B gets `Busy` before writes. Release A and retry B. A third process verifies no lockfile inode replacement. Expected-old-root mismatch refuses a stale update |
| Reader versus retention | Reader keeps the exclusive guard while verifying/streaming a bounded object; retention refuses `Busy`, then succeeds only after reader release and fresh reachability. Cancellation releases the guard without changing roots |
| Manifest negatives | One-bit payload drift, missing child/parent, duplicate key/ID, wrong size, unknown version, invalid ID/path and cyclic edge input refuse before activation. Test cycle validation on candidate descriptors without assuming a feasible SHA fixed-point cycle |
| Traversal budget | Exact node/edge/depth limits succeed; one over refuses with a bounded allocation receipt. A rejected or unknown graph never authorizes collection |
| Retention fixture | New root reaches old/new payloads and manifests. Dry run proposes only the orphan ID; naming the old payload refuses `ReferencedObject`. Changing roots between plan and application invalidates the plan |
| Quarantine/delete | Explicit orphan quarantine changes no live root, preserves bytes and counts disk; a separately authorized purge removes only the fixture ID. Repeating either action has a defined already-absent result; no broad-directory deletion |
| Backend parity | Memory and files reproduce IDs, snapshots, errors and reconstruction for the same logical operations; only real file tests can assert observed synchronization/locking behavior |
| PER-002 parity | Run the 1,000-by-384 provided-vector fixture for cosine and dot scoring; compare canonical bytes, exact ranks, retained same-key outcomes and changed-request refusal before/after file restart; measure the 16 MiB metadata, 256 MiB RAM and two-minute limits |
| Provenance versus restore | A provenance-only ancestor keeps its metadata/hash but permits an explicitly pruned historical payload; restore then returns `PayloadPruned`. A strong dependency still blocks that pruning. Missing ancestor metadata refuses either path |
| Clean reconstruction | Copy only declared immutable objects/roots/receipts into a clean bounded store; rebuild and verify every SHA without `.build` cache or database endpoint. Missing offline input refuses rather than fetching it |
| Budget reservation | Account retained objects, new children, staging, metadata and quarantine before writing; exact authorized remaining budget succeeds, one byte over refuses. One-object scratch is not a second full bundle copy |

For semantic malformed-manifest tests, recompute the outer hash so the intended
schema/graph validator is reached; retain the old expected hash in corruption
tests. Process-kill results must report host/filesystem and killpoint receipts;
they do not establish power-loss durability on every platform. Small stream tests
prove logic, not unmeasured 2 GiB throughput or a trained-model resume.

## 6. Teaching and surface commitments

Use these lesson sections in the required course reading order:

- Worked example: predict K1, K4 and K6 root visibility and explain why the old payload remains reachable from the successor.
- Formula and symbol glossary: staged versus final path, file sync versus directory sync, atomic visibility versus confirmed durability, SHA-256 object ID versus root alias. Explain the frozen formula's conditional scope locally.
- History: ONNX's portable representation and CheckFreq's coordinated recovery needs lead to complete immutable inputs; show the Rust model-only/manifest contrast without claiming a CheckFreq implementation.
- Rust implementation: connect byte hashing, guarded publication and graph traversal to the exact trace, including the uncertain-commit return. Keep code examples Rust; the site never reimplements publication logic.
- Visualization: follow old root, private candidate and new root through K0–K7; labels state what is visible and whether durable confirmation has occurred.
- Exercises: predict extra-byte refusal; identify why an existing wrong-byte object cannot be replaced; calculate 327 reachable immutable bytes; explain why deleting the old root alias does not collect its ancestor; diagnose the K6 error without assuming rollback.
- Decoder connection: Chapter 56's model/config/tokenizer/lineage objects become a portable complete snapshot. Chapter 58 adds job-state completeness and continuation, not a second persistence protocol.

Answer expectations are the exact §3 hashes/counts and §5 state effects. The
misconceptions are “rename flushes everything,” “an error guarantees no visible
change,” “a content hash authenticates the producer,” and “no current alias means
unreachable.” Correct each with the precise counterexample, not general slogans.

Freeze a commitment map and role requirements for the complete source/built
document, each reading unit, formula symbols, historical links, Rust captions,
figure caption/description/rows, exercise prompts/answers, metadata/catalog and
cheat sheet. A standalone “new” label must identify the new root or object;
“durable” must name the synchronization boundary and assumptions. Keep review,
filesystem test machinery and build instructions out of learner-facing prose.
English terminology is canonical; Russian is authored later from the reviewed
revision, not drafted inside this internal packet.

## 7. Visualization and accessibility

Implement one registered `immutable-artifact-persistence` figure from Rust trace
records, using `ImmutableArtifactPersistenceDiagram.astro`. The relationship is
a state sequence: old root stays active while new bytes/manifest are staged;
root rename changes visibility; parent synchronization confirms the declared
publication boundary. A secondary edge identifies the retained old ancestor and
the unreferenced orphan. The picture must not imply that K6 is old or that a
published manifest can name a partially written child.

Trace fields must distinguish checkpoint ordinal, operation, root ID, old/new
object state, manifest state, synchronization acknowledgement, reachable IDs and
publication outcome. IDs may have a visual short label only if the same figure
provides the full exact mapping in static text; accessible descriptions must
preserve which root references which complete graph. Display byte counts with
units. The caption names the publication/stop comparison, and the description
explains visibility versus confirmation and ancestor retention without relying
on color, spatial position or an unexplained arrow.

Use the shared diagram module, semantic figure/caption and one static evidence
tree. At narrow widths stack phases or use the smallest named keyboard-reachable
scroll region; retain chronological reading order. Shared full view reuses the
same figure, not a duplicate or chapter-local script. Validate desktop/narrow,
full-view, forced-color and direction-sensitive Firefox cases, with every label
and formula inside its nearest bounded box. Do not hide overflow, shrink text or
let a hash escape a card. TypeScript may parse/check trace grammar and present
it; the Rust trace remains the authority for root and reachability decisions.

## 8. Serial implementation procedure

1. After explicit release of the hold, verify actual Chapter 56 completion and the current lifecycle compatibility run. Freeze the ownership/schema/host decisions in §§4/10 before creating modules. Re-read the exact step and inspect unrelated worktree changes.
2. Bind the two permitted historical sources through the admitted N1 runner and preserve its extraction receipt; no new model acquisition or source substitution. Freeze the small fixture construction and canonical-schema policy separately.
3. Implement typed identities, checked limits and canonical manifests. Generate the diagnostic hashes/trace from Rust and compare independently with §3, including the final LF. Do not hand-author passing stdout.
4. Adopt Chapter 56's publisher into `atomic_publish.rs` and wire its consumer through the approved shared integration. Implement the persistent guard, bounded same-byte stream verification, immutable reuse and outcome distinctions before root publication.
5. Implement bounded reachability, explicit retention planning and fixture-only quarantine/deletion. Keep the reader guard active through every read; run contention and stale-plan cases before enabling cleanup paths.
6. Implement the admitted in-memory/file API placement, preserving no-fallback semantics. Run deterministic K0–K7 child-process interruption and injected-I/O tests; freeze host/filesystem and receipts. Stop on any partial live graph or ambiguous error reported as success.
7. Reconstruct a clean store from offline declared inputs. Integrate Chapter 56's actual final fixture receipts only when its gates are satisfied; do not manufacture them to close acceptance. Record byte/host/scratch/disk peaks separately from planned caps.
8. Write the contract, runnable historical Rust contrast, expected trace, English chapter/catalog/cheat sheet and useful figure from that evidence. Freeze source/build bytes, surface inventory and role requirements; obtain the external English reviews/adjudications.
9. Translate Russian directly from the accepted English revision, obtain separate bilingual/target-only and affected Firefox evidence, then run the full staged overlay. Publish the coherent chapter set only after all gates and byte identities pass; update state/decisions and make its dedicated commit. No next-chapter implementation begins here.

## 9. Validation and review handoffs

Run these exact frozen implementation commands from the repository root only
after their predecessor-owned runners/targets are admitted. Their presence here
does not claim they are executable now:

```sh
scripts/run-functional-history-source-evidence.sh --step implement-ch57-immutable-artifact-persistence --chapter 57-immutable-artifact-persistence --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
scripts/run-functional-offline.sh --step implement-ch57-immutable-artifact-persistence --target implement-ch57-immutable-artifact-persistence-v1
scripts/run-functional-firefox.sh test --step implement-ch57-immutable-artifact-persistence --target chapter-57-immutable-artifact-persistence-v1
git diff --check
./course audit-host
```

The offline target must contain Rust formatting/tests/dependency checks, exact
stdout, immutable-byte reconstruction, budget receipts, killpoint/lock/retention
cases, the DAG checker, contract/locale parity, static source/formula/figure
checks, site build and links. The browser target uses only the repository's
Firefox JavaScript project and shared loopback fixture configuration. Freeze the
target recipe before execution; do not invent an alternate ad-hoc command to
evade a missing prerequisite. Test that zero required database/vector-store
services and zero hidden network calls suffice.

Follow the [shared independent review handoff](README.md#one-executor-and-independent-review):
two distinct fresh English reviewers, then two further same-role adjudicators,
all separate from the author, exact canonical prompts and untouched hash-bound
responses. Both reviews and both adjudications must pass before direct Russian
localization. Obtain its distinct bilingual and source-blind target-only reviews
plus rendered evidence. The executor cannot self-certify these roles. Any
meaning/surface/trace change invalidates affected review bindings; byte checks
cannot certify pedagogy or accessibility meaning. Missing external review
capacity leaves a staged candidate, not a published chapter.

## 10. Cost, risks and readiness

All profiles remain future envelopes, not measurements of this planning run:

| Profile / mode | Host cap, bytes | Device cap, bytes | Disk cap, bytes | Wall cap, seconds |
| --- | ---: | ---: | ---: | ---: |
| `reference-ci` / executes | 268435456 | 0 | 1073741824 | 600 |
| `bridge-ci` / executes | 268435456 | 0 | 1073741824 | 600 |
| `8gb-gpu-core` / consumes | 12884901888 | 6710886400 | 30000000000 | 108000 |
| `8gb-adapter` / consumes, `blocked-artifact-selection` | 12884901888 | 6710886400 | 21474836480 | 43200 |

The full exact profile literals remain in the hash-bound inputs and frozen plan.
This chapter is CPU/filesystem work, G0; consume later GPU-profile artifacts
without claiming GPU execution or full training acceptance. Profile smoke limits
still apply even when the broader store API permits a larger object.

| Persistence quantity | Bound and accounting rule |
| --- | --- |
| One immutable object | at most 2147483648 bytes (2 GiB) |
| Streaming buffers combined | at most 8388608 bytes (8 MiB), including paired comparison buffers and host accounting |
| Host overhead beyond mappings | strictly less than 268435456 bytes (256 MiB); mappings remain separately budgeted, not free physical memory |
| Manifest/receipt metadata per complete run | at most 104857600 bytes (100 MiB) |
| Atomic scratch | at most one full artifact/object; sequential child publication avoids a hidden second full bundle copy |
| Provisional ISA managed-disk subset | at most 21474836480 bytes (20 GiB) |
| Whole mandatory DTH working disk | at most 30000000000 bytes (30 GB), including retained versions, children, staging, metadata and quarantine |

The 20 GiB subset is not equivalent to 30 GB and grants no authority to spend the
remainder. Check the active profile, managed-store and whole-run caps together.
Object and bundle are different units: Chapter 58 may bind a larger complete job
checkpoint from individually bounded objects, publishing each child sequentially
then its manifest; all durable children still count toward disk. This is only a
handoff contract, not a Chapter 58 implementation or measured checkpoint result.

Frozen implementation cost is `large`, CPU C3, GPU G0, network N1, paid none;
source evidence downloads are capped at 134217728 bytes and new artifact download
authority is zero. The exact cost record additionally caps successful learner
contexts at 8, attempts at 16, per-context input/output at 2097152/1048576 bytes
and 200000/40000 tokens, aggregate input/output at 33554432/16777216 bytes and
wall time at 28800 seconds. One rendered-image review, ceiling `gpt-5.6-terra`,
is capped at 16777216 input bytes, 262144 output bytes and 900 seconds. These are
future workflow bounds, not permission to start downloads/reviews in this run.

Before implementation, the owner must close: lifecycle release; actual Chapter
56 and source-cache gates; one reconciled persistence API/module placement and
shared wiring; canonical schema/compatibility limits; filesystem support and
lock semantics; explicit budgets and retention authorization; admitted target
recipes; and external review capacity. Reuse only immutable, hash-verified
fixtures/receipts with matching inputs. Preserve failed staging and failure
receipts; never relabel an interrupted run as success. Planning readiness means
these decisions and stop rules are explicit, not that their future gates passed.
