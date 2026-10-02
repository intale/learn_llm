# Chapter 41 — governed corpus acquisition: detailed implementation packet

Status: internal planning only; not implemented, downloaded or publication-approved.
The user's repair/implementation hold remains in force. Use this packet with
[the common guide](README.md) and [Chapter 40's handoff](40-reference-core-handoff.md).
Proposed interfaces/schema refinements below are explicit planning choices, not
claims that the corresponding Rust or runner already exists.

## 1. Scope and boundary

| Item | Exact commitment |
| --- | --- |
| Chapter / planning step | `41-governed-corpus-acquisition` / `detail-ch41-governed-corpus-acquisition` |
| Future implementation step | `implement-ch41-governed-corpus-acquisition` |
| Implementation predecessor | `implement-ch40-reference-core-handoff` |
| Capability / findings | `CAP-DTH-DATA-01`; `F02`, `P04` |
| Teaching formula ID | `teaching-formula-ch41-governed-corpus-acquisition` |
| Small taught concept | A training-data input is admitted by a complete, immutable provenance record and verified bytes, not by its filename or a successful download. |
| Implementation outcome | Define and exercise the governed, restart-safe protocol on bounded offline fixtures before bulk data becomes eligible. |
| Eventual lifecycle outcome | Acquire only the selected original TinyStories raw pair into the verified content-addressed offline cache. |
| Non-goals | Filtering, deduplication, final dataset splits, tokenization, training, weight redistribution, privacy clearance, quality claims, generic downloading or new repository-state architecture. |

Preserve this order:

```text
implement-ch40-reference-core-handoff
  -> implement-ch41-governed-corpus-acquisition
  -> establish-functional-artifact-cache-execution-boundary
  -> acquire-functional-tinystories-raw-pair
  -> implement-ch42-deterministic-corpus-filtering
```

Chapter 41 implements the policy and offline evidence; the following boundary
step deploys the real cache/mount separation; the separate acquisition step alone
has N3 authority for raw payloads. Do not make Chapter 41 depend on that later
boundary or issue a real TinyStories receipt to complete the chapter.

The frozen Chapter 41 input list is:

```text
curriculum/functional-laptop-llm-extension-plan.md
audits/2026-08-10-functional-llm-capability/coverage.md
audits/2026-08-10-functional-llm-capability/requirements.md
audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md
.agents/skills/author-llm-course-english/SKILL.md
.agents/skills/localize-llm-course/SKILL.md
site/src/i18n/functional-chapter-locales.json
exact predecessor checkpoint=implement-ch40-reference-core-handoff
artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
```

Some execution inputs do not exist yet; require their predecessor-owned current
versions at implementation preflight. The locale registry and history toolchain
receipt are not Chapter 41 outputs to invent. Read the English skill for English
authoring and the localization skill when the approved English reaches Russian
localization; listing those inputs does not start either publication workflow now.

The later acquisition boundary uses
`configs/functional-artifact-cache-targets.json#acquire-functional-tinystories-raw-pair-v1`
and emits
`artifacts/functional-laptop/acquisition/tinystories/manifest.json` and
`artifacts/functional-laptop/acquisition/tinystories/receipt.json`.
Those are later-step outputs, not Chapter 41 completion evidence. Section 3 fixes
the proposed receipt-selected consumer paths; Section 4 lists this chapter's
owned outputs. Chapter 42's predecessor is the successful acquisition checkpoint,
not merely Chapter 41 or an available cache directory.

Chapter 42 consumes the receipt-selected raw pair read-only. The upstream file
named validation is a raw held-out source, not a proof that the course's later
train/validation/test split, deduplication or contamination policy is complete.
The selected source is synthetic English short-story data, not a broad-language
corpus or evidence of the future model's capabilities.

## 2. Evidence and source ledger

Baseline commit: `49004e5675fc0af0a0649f88cceb18b8f8effc45`.
The accepted [extension plan](../functional-laptop-llm-extension-plan.md) has
SHA-256 `84d8ab860a3282dd5d373ca285a3815b04836d9abb7a1d2267e163143091bea1`.
Read its Chapter 41, source registry, artifact schema, inventory, transport and
queue records alongside the
[resource/dependency contract](../../audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md).
The Chapter 40 packet input has SHA-256
`a1ad7fc9fee8d1d64ffb67115730d56c14313127c9f1c109f1e01bce11e3ec82`.

Existing code to inspect and preserve:

- [corpus.rs](../../rust/crates/llm-from-scratch/src/corpus.rs):
  `Corpus::from_json`, `SplitManifest::from_json`, `CorpusError`; Serde handles
  JSON syntax while Rust owns ID/checksum/coverage/separation/order validation.
  Its FNV-1a64 checksum is not the new SHA-256 artifact identity.
- [checkpoint.rs](../../rust/crates/llm-from-scratch/src/checkpoint.rs):
  `Checkpoint::save_atomic` illustrates temporary write, synchronization and
  same-directory promotion. Do not replace Chapter 35's taught wire format or
  assume its file-save helper already implements directory-bundle publication.
- [retry-transient-network.sh](../../scripts/retry-transient-network.sh):
  the existing bounded retry/evidence helper; it supplies neither acquisition
  policy nor a fresh budget on every invocation.
- The cumulative crate currently has `serde` and `serde_json`, no artifact
  module, SHA-256 library or HTTP client. All Chapter 41-specific Rust, examples,
  scripts and receipts listed in Section 4 are future outputs.

Frozen historical sources, checked read-only on 2026-09-15:

| Source | Supported teaching claim and limit |
| --- | --- |
| `SRC-DTH-DATA-01`: [Datasheets for Datasets](https://arxiv.org/abs/1803.09010), Gebru et al. | Dataset motivation, composition, collection and intended uses should be reviewable. First posted in 2018; journal publication in 2021. Documentation does not itself validate rights, representativeness or privacy. |
| `SRC-DTH-DATA-05`: [The BigScience ROOTS Corpus](https://arxiv.org/abs/2303.03915), Laurençon et al. | Corpus governance and curation are substantive model-building work. The selected arXiv record is from 2023 and identifies NeurIPS 2022. ROOTS is a precedent, not this course's dataset, language coverage or scale target. |

Retain the full frozen contrast when authoring: Datasheets also makes preprocessing,
distribution and maintenance reviewable; ROOTS treats governance and source
selection as first-class construction decisions. The Rust contrast in Section 6
illustrates that motivation, not either paper's entire process. Neither source
establishes this course's permission to acquire, process, train on or redistribute
a particular dataset.

The pinned [TinyStories dataset card](https://huggingface.co/datasets/roneneldan/TinyStories/blob/f54c09fd23315a6f9c86f9dc80f725de7d8f9c64/README.md)
resolves and describes the original synthetic English source and declared license.
The [TinyStories paper](https://arxiv.org/abs/2305.07759) supplies dataset context,
not course model results. Neither is an additional Chapter 41 historical source
ID. The [official CDLA-Sharing-1.0 text](https://cdla.dev/sharing-1-0/) is license
evidence to retain and bind, not a legal opinion from this course.

Planning metadata lookups do not expand the later closed N1 history allowlist.
The actual raw sizes/hashes below are frozen repository inputs, not raw bytes
downloaded or independently verified by this planning run. Retained production
license/attribution text and its hashes are not yet frozen; their absence is an
explicit pre-acquisition gate, not permission to fetch extra metadata during N3.

## 3. Inputs and worked example

### The only production source pair

Both files use revision
`f54c09fd23315a6f9c86f9dc80f725de7d8f9c64`, media type `text/plain`
with UTF-8 expected, and license identifier `CDLA-Sharing-1.0`.

| Stable source ID | Exact upstream path | Expected bytes | Expected payload SHA-256 |
| --- | --- | ---: | --- |
| `tinystories-train-raw` | `TinyStories-train.txt` | 1,924,281,556 | `c5cf5e22ff13614e830afbe61a99fbcbe8bcb7dd72252b989fa1117a368d401f` |
| `tinystories-valid-raw` | `TinyStories-valid.txt` | 19,447,282 | `94e431816c4cce81ff71e4408ff8d3bda9a42e8d2663986697c3954288cb38b4` |

Construct each requested URL by appending the exact case-sensitive upstream path
to this fixed prefix; do not accept a caller-supplied URL:

```text
https://huggingface.co/datasets/roneneldan/TinyStories/resolve/f54c09fd23315a6f9c86f9dc80f725de7d8f9c64/
```

The two payloads total 1,943,728,838 bytes. Do not substitute a floating revision,
Parquet/NumPy/Pickle, archive, sibling file, GPT-4-only variant, filtered corpus,
tokenizer, weights or adapter. The raw files are never committed to Git.

### What is hashed

The teaching relation is
$\mathrm{artifact\_id}=\operatorname{SHA256}(\mathrm{canonical\_manifest\_bytes})$.

Define the input as the complete canonical **artifact manifest** of one dataset
bundle, including its payload inventory and provenance. The output is a 256-bit
digest represented by 64 lowercase hexadecimal characters. A payload SHA-256
identifies one file's bytes; the artifact ID identifies the manifest-bound bundle.
Neither checksum proves authenticity, legal permission, privacy or training quality.

Proposed mapping, filling the accepted plan's previously unspecified details:

```text
.build/artifact-cache/functional-v1/sha256/<artifact_id>/
  artifact-manifest.json
  payload/
    raw/TinyStories-train.txt
    raw/TinyStories-valid.txt
    provenance/LICENSE.txt
    provenance/ATTRIBUTION.txt
```

One receipt selects one entry for the whole pair. Mount that entry root at
`/artifacts/tinystories:ro`; Chapter 42 reads
`/artifacts/tinystories/payload/raw/TinyStories-train.txt` and
`/artifacts/tinystories/payload/raw/TinyStories-valid.txt`, verifying
`/artifacts/tinystories/artifact-manifest.json` against the selected receipt.
The cache-entry digest equals
the artifact-manifest hash, not either raw-file hash. The manifest inventories
exactly the four payload files, excluding itself. The outer acquisition binding
holds the derived artifact ID and cache path; neither the hashed manifest nor its
metadata payloads may embed that derived ID/path or a downstream receipt hash.
This avoids a self-referential hash.

The dataset-specific artifact manifest's proposed schema-1 fields are:

| Object | Required fields / order |
| --- | --- |
| Root | `schema_version` = 1, `kind` = `dataset`, `dataset_scope`, `sources`, `payload`, `redistribution`, `producer`. No artifact ID or cache path here. |
| `dataset_scope` | `language`, `domain`, `selected_source`; production values `en`, `synthetic-short-stories`, `roneneldan-TinyStories-original-text-pair`. |
| `sources` | Exactly train then validation. Each: `source_id`, `source_kind`, `upstream_revision`, `requested_url`, `resolved_url`, `payload_path`, `bytes`, `sha256`, `media_type`, `license_id`, `license_path`, `license_text_sha256`, `attribution_path`, `attribution_sha256`, `attribution_references`, `filter_script_sha256`, `filter_config_sha256`. |
| `payload` | UTF-8-byte path order; each entry has `path`, `role`, `media_type`, `bytes`, `sha256`. Roles: `raw-train`, `raw-validation`, `license`, `attribution`. |
| `producer` | `script_sha256`, `config_sha256` bind the actual acquisition producer and canonical input configuration. |
| `redistribution` | Separate `raw_input`, `derived_model`, `adapter` values; proposed initial course disposition `not-approved` for each. This acquisition issues no redistribution permission; model/adapter artifacts are absent. |

For raw inputs, both filter hashes are explicit `null`: no filtering or conversion
was performed. Do not use zero hashes to pretend those transformations occurred.
Shared license and attribution files are explicitly referenced by both source
records; their inventory and reference hashes must agree.

`resolved_url` is the later plan's redacted endpoint object, not a full signed
URL. It contains exactly `scheme`, `host`, `path`, `query_keys`,
`query_key_inventory_sha256`, `query_values_redacted`, `transport_caps_passed`.
Proposed query inventory codec: retain every query-key occurrence, sort by UTF-8
bytes, encode that array as canonical JSON plus LF, then SHA-256 those bytes.
Query values never enter the canonical manifest. Reconcile this codec with the
completed history boundary's redaction codec before implementing; a disagreement
requires a recorded compatibility decision, not two silently different codecs.
Requested URLs remain the exact public immutable URLs.

Canonical JSON is compact UTF-8 without BOM, recursively UTF-8-byte-sorted unique
keys, no unknown/defaulted schema fields, canonical unsigned integers, declared
array order, and exactly one final LF. This chapter needs no floating-point values.
Reject noncanonical input rather than silently rewriting it at admission.
Use Serde for syntax/escaping; Rust owns schema, duplicate/unknown-field refusal,
array/path policy and comparison against canonical bytes. A generic JSON value
map that has already discarded duplicate keys is insufficient.

Proposed outer acquisition binding at
`artifacts/functional-laptop/acquisition/tinystories/manifest.json` has exactly
`schema_version`, `artifact_id`, `kind`, `cache_path`, `artifact_manifest`.
The embedded object is re-encoded under the same canonical rule, including its
final LF, to reproduce `artifact_id`; the cached `artifact-manifest.json` must
match those bytes. Source-level fields above plus this binding cover the resource
contract's acquisition fields, without placing the computed identity inside itself.
The receipt separately binds the outer manifest's hash and the selected entry.
The resource contract's `provenance` commitment is the combination of
`dataset_scope`, both immutable `sources` records and `producer`, not an omitted
check: validate all three as one required relationship. Its `attribution`
commitment is each source's retained attribution path/hash plus references.
Its `sha256` and `bytes` describe each raw object, while the outer
`artifact_id` identifies the complete bundle. Its `resolved-url` commitment uses
the later frozen redacted endpoint representation. The outer `cache_path`
must be recomputed from the artifact ID, never trusted as an arbitrary path.
Raw-input, model and adapter redistribution decisions remain separate even
though this bundle contains no model or adapter.
Freeze these proposed mappings against prerequisite schemas before execution.

### Synthetic offline positive case

These are course-authored test bytes, not excerpts from TinyStories or production
license evidence. The ordinary example has no network capability.

| Fixture payload path | Literal UTF-8 bytes | Length |
| --- | --- | ---: |
| `raw/train.txt` | Rust `b"abc"` | 3 |
| `raw/valid.txt` | Rust `b"hello\n"` | 6 |
| `provenance/LICENSE.txt` | Rust `b"fixture-only\n"` | 13 |
| `provenance/ATTRIBUTION.txt` | Rust `b"course-authored fixture\n"` | 24 |

There are four payload files totaling 46 bytes, of which 9 are raw fixture bytes.
The first two SHA-256 values are
`ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad`
and `5891b5b522d5df086d0ff0b110fbd9d21bb4fc7163af34d08286a2e846f6be03`.
No trimming, newline conversion, decompression or Unicode normalization occurs.

Construct the complete fixture manifest with the schema above, these four
inventory rows, and these remaining exact assignments:

- `dataset_scope`: language `fixture`, domain `synthetic-policy-fixture`,
  selected source `fixture-pair`.
- Source IDs `fixture-train`, `fixture-valid`; kinds `raw-corpus`,
  `raw-heldout-source`; both revisions `fixture-revision-1`.
- Requested URLs `https://example.invalid/fixtures/train.txt` and
  `https://example.invalid/fixtures/valid.txt`; matching HTTPS endpoint host/path,
  no query keys, both redaction/caps booleans `true`.
- Both licenses `LicenseRef-Course-Test-Only`; both attribution reference arrays
  contain only `https://example.invalid/fixtures`. Hash the literal shared
  metadata files above. Both filter hashes are `null`.
- Every payload has media type `text/plain`; producer script/config hashes each
  contain exactly 64 zero characters **only as labelled fixture literals**;
  redistribution values are all `not-approved`.

The fixture policy is injected only into offline example/test entry points.
The production command admits only the frozen TinyStories identities and never
accepts fixture URLs, IDs, zero producer hashes or a caller-selected policy.
Do not expose a runtime option that relaxes the production allowlist.

Golden vectors below were computed during planning from those exact synthetic
assignments, not by the future Rust implementation. Each manifest length includes
its single final LF. The implementation must reproduce the canonical bytes and
hashes independently.

| Exact object | Bytes | SHA-256 |
| --- | ---: | --- |
| Baseline canonical artifact manifest | 3,084 | `569de16c16720f73aca07de6a3184b779b80700c3f5f8eefc01f60fea3019b89` |
| `provenance/LICENSE.txt` | 13 | `db64e55296d3cb3c38619dae7b7cce54bb74a83956423be38443258ebb0724da` |
| Baseline `provenance/ATTRIBUTION.txt` | 24 | `0d00779105653df98f180d5d8b910ea061782492fcb25e1d955e70453c3456f5` |
| Empty query-key inventory, literal `[]\n` | 3 | `37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570` |
| Variant attribution, Rust `b"course-authored fixture v2\n"` | 27 | `3f250a36fe41bf09d2ae73ee8934365a83c08784d3ac2257dbc92b39411efc88` |
| Variant canonical manifest, with all three attribution references updated | 3,084 | `bb4cd61a666c474f893ca2a9027005f00155b2f6fa573010188aa48258723305` |

In the variant, change the attribution inventory length/hash and both source
`attribution_sha256` values. All other fields are unchanged: raw hashes and
9 raw bytes remain the same, while total payload bytes become 49. In the
`[]\n` spelling, backslash-n denotes one LF byte, not two literal characters.
The fixture assignment specification retained with the planning run is evidence
for these calculations; this packet contains every value needed to reconstruct
it and does not make ignored run files a future implementation prerequisite.

### Explained cases and optional reproduction

1. Explain why a renamed filename with unchanged bytes is insufficient for admission. Answer: no; requested identity, path, inventory and provenance must
   also match the bound manifest.
2. Explain the artifact-identity change when the attribution file changes but both raw files remain unchanged. Answer: raw hashes stay the same, but
   the updated inventory/source metadata produces a different artifact manifest
   and therefore a different fixture artifact ID.
3. Explain why a verified training file and a truncated validation file do not permit publication. Answer: neither a pair entry nor a success receipt may be
   published; verified run-staged bytes can be retained for a permitted resume.
4. Work through the toy transfer budget: two discarded body bytes already charged, 9
   remaining raw bytes needed, ceiling 10. Projected need is 11, so refuse before
   dispatch; observed spent bytes remain 2. Do not report 11 as bytes transferred.

The future Rust trace must report fixture scope, 2 logical sources, 4 inventoried
files, 9 raw bytes, 46 total payload bytes, distinct payload/manifest identities,
and each case's acceptance/refusal with its reason. Then repeat from a fresh
temporary directory and from a valid partial; exact bytes/IDs/decisions agree.
These are planned expectations, not an executed Chapter 41 example.

## 4. Rust design and ownership

Frozen future output paths:

```text
curriculum/chapters/41-governed-corpus-acquisition.md
rust/crates/llm-from-scratch/module-registry/functional-v1/ch41-governed-corpus-acquisition.module
rust/crates/llm-from-scratch/tests/ch41_governed_corpus_acquisition.rs
rust/crates/llm-from-scratch/examples/ch41_governed_corpus_acquisition.rs
rust/crates/llm-from-scratch/examples/expected/ch41_governed_corpus_acquisition.txt
rust/crates/llm-from-scratch/src/artifact/acquisition.rs
rust/crates/llm-from-scratch/src/artifact/canonical_manifest.rs
rust/crates/llm-from-scratch/src/artifact/inventory.rs
rust/crates/llm-from-scratch/src/artifact/lineage.rs
scripts/acquire-functional-llm-artifacts.mjs
scripts/check-functional-acquisition.mjs
scripts/check-functional-artifact-cache.sh
scripts/check-functional-offline-replay.sh
site/src/content/chapters/en/41-governed-corpus-acquisition.mdx
site/src/content/chapters/ru/41-governed-corpus-acquisition.mdx
site/src/i18n/functional-catalogs/en/41-governed-corpus-acquisition.json
site/src/i18n/functional-catalogs/ru/41-governed-corpus-acquisition.json
site/src/content/cheat-sheets/en/41-governed-corpus-acquisition.json
site/src/content/cheat-sheets/ru/41-governed-corpus-acquisition.json
site/tests/41-governed-corpus-acquisition.test.ts
site/tests/e2e/ch41-governed-corpus-acquisition.spec.ts
audits/functional-laptop/reviews/41-governed-corpus-acquisition/
artifacts/functional-laptop/chapters/41-governed-corpus-acquisition/
artifacts/functional-laptop/chapters/41-governed-corpus-acquisition/history-source-evidence-receipt.json
artifacts/functional-laptop/step-output-inventories/implement-ch41-governed-corpus-acquisition.json
BUILD_STATE.yaml
DECISIONS.md
```

No diagram component is owned. Necessary shared Rust exports, dependency lock/
allowlist integration and runner wiring must be declared at implementation
preflight under the completed module-registry convention; do not add another
crate, daemon, registry or independent CLI framework.

Proposed APIs, not current symbols:

```rust
pub fn parse_dataset_manifest(bytes: &[u8])
    -> Result<DatasetArtifactManifestV1, AcquisitionError>;
pub fn canonical_manifest_bytes(manifest: &DatasetArtifactManifestV1)
    -> Result<Vec<u8>, AcquisitionError>;
pub fn artifact_id(manifest: &DatasetArtifactManifestV1)
    -> Result<[u8; 32], AcquisitionError>;
pub fn verify_payload(
    expected: &ExpectedPayload,
    reader: &mut impl std::io::Read,
) -> Result<VerifiedPayload, AcquisitionError>;
pub fn verify_bundle(
    manifest: &DatasetArtifactManifestV1,
    payload_root: &std::path::Path,
) -> Result<VerifiedBundle, AcquisitionError>;
```

Ownership:

| Module | Course-owned decisions |
| --- | --- |
| `canonical_manifest.rs` | Closed dataset schema, canonical byte acceptance, manifest identity; initially only the dataset-kind branch, not every later artifact format. |
| `inventory.rs` | Exact regular-file coverage, portable relative paths, byte counts/hashes and shared metadata reference agreement. |
| `lineage.rs` | Requested source/revision binding, explicit untransformed raw status, retained license/attribution and separate redistribution dispositions. |
| `acquisition.rs` | Request/range/redirect/counter admission, progress transitions, verified bundle and success/refusal records. |
| Node acquisition script | Fixed-command argument parsing and HTTPS transport only; no independent policy acceptance, auto-redirect, content transformation or success decision. |

Use the existing Serde libraries for parsing/serialization. Select a mature
supporting SHA-256 implementation and mature URL/header parsing plumbing, with
minimal features and the complete locked/allowlisted graph. A missing crate or
graph must be supplied through a separately authorized offline dependency input;
N1 does not authorize Cargo downloads. Do not handwrite SHA-256, JSON/URL parsers,
a filesystem sandbox or a general command-line layer. Existing FNV checksum
behavior and checkpoint encoding remain unchanged.

The Rust/Node bridge has a closed request/response protocol, not a generic URL
proxy. Bind it to the existing closed runner's worker convention before coding.
Operations required: admit/reserve a request; admit a redirect before dispatch;
validate status/headers before body use; record bounded body progress; finalize
or refuse a file; verify the complete bundle. Inputs/outputs are typed JSON
handled by the existing serializer, with exact schema/version and no arbitrary
command/path/policy fields. Rust returns a request permit only after durable
counter/reservation updates; Node executes exactly its method, URL, range and
encoding requirements. Node cannot independently turn a response into an
approved source. Tests exercise the same Rust decisions with injected offline
response records; no server, socket or real download is needed.

Use a 65,536-byte working buffer for streaming payload verification. Bound
manifest bytes at 1,048,576, each retained metadata file at 1,048,576, and keep
only the four expected inventory entries in memory. These are proposed local
implementation bounds beneath the frozen global caps. Do not load either real
raw file into a String or Vec, or decode corpus records in Chapter 41.

Reject absolute/dot/dot-dot/empty path segments, backslashes, drive prefixes,
NULs, case collisions, duplicate entries, symlinks, hardlinks, devices and
unindexed regular files. Compare descriptor/file identity while reading under
the single-writer boundary; use approved no-follow/containment plumbing rather
than a check-then-follow path escape. Never "fix" unsafe input paths.

## 5. Test and failure matrix

### Protocol and durable progress

Use these proposed private progress states:

```text
admitted inputs -> reserved request -> receiving private partial
 -> verified run-staged file -> verified complete bundle
 -> network-none publication -> verified receipt-selected replay
```

Only the following boundary/acquisition steps deploy the last two transitions
against the real cache. Chapter 41 proves them with bounded private fixtures.
No file merely existing, HTTP success code or ETag is a completed checkpoint.

Exactly two **logical source identities** are allowed. HTTPS redirects and range
retries are separately recorded transport attempts, not permission to add files.
Allowed redirect hosts are exactly:

```text
huggingface.co
cdn-lfs.huggingface.co
cdn-lfs-us-1.huggingface.co
cdn-lfs-eu-1.huggingface.co
cas-bridge.xethub.hf.co
```

Resolve redirect URLs with mature URL plumbing, then apply Rust's exact host
allowlist: HTTPS only, no user information or fragment, and no port other than
the HTTPS default 443. Reject the destination before dispatch when any condition
fails; do not forward caller-supplied credentials or arbitrary headers.

Rust admits at most 3 initial/resumed request chains (attempts) and 5 followed
redirects per file. A redirect hop consumes the redirect counter within its
existing attempt; a new initial or Range request consumes another attempt.
Both counters accumulate across retries/resumes. Use one outer invocation of
`scripts/retry-transient-network.sh` with operation
`acquire-tinystories-raw-pair` and maximum 3 pair-driver invocations.
The restart-safe driver handles train then validation, verifies and skips a
completed staged file, and independently enforces each file's counters.
No nested retry loops or automatic HTTP retries. Three outer invocations are an
upper bound, not a guarantee of three attempts for the second file.

Counters, request reservations, partial provenance and the wall-time deadline
live in a private atomically replaced run progress record under a single-writer
lock. Before reserving the new chain's first grant, check charged bytes plus
remaining unacquired raw bytes against the ceiling; do not count the grant and
the raw bytes it will deliver twice. Before dispatch, durably charge the
attempt/redirect and reserve its
first bounded body-read allowance. Before each subsequent read, reserve another
allowance durably. Use at most 65,536 bytes per grant; the grant is the smaller of
65,536 and the unreserved transfer balance. Zero balance refuses further nonempty
body delivery but must still permit a zero-byte end-of-body notification.
A reader may deliver no more than its grant, with EOF represented separately
from bytes. Settle the actual delivered count and release unused reservation only
after accounting and partial state are durable. A crash with an unsettled reservation leaves it
charged; a safe refusal is preferable to recreating spent budget. Record a
verified continuation chain if a new run resumes old bytes; changing run ID or
relaunching the helper never resets counters/deadline. A run may fail closed when
uncertainty leaves too little budget to finish.

Meter cumulative HTTP body bytes delivered to the bounded transport/policy
interface, including failed/discarded data and error/redirect bodies. Cancel
unneeded bodies; reserve/account any delivered bytes rather than assuming zero.
This meter does not measure TCP/TLS overhead or exact physical network ingress.
A transport overrun produces failed evidence, never a passing receipt. Node must
not read body data into the policy interface without its grant; bounded transport
buffering is separate and is not advertised as measured physical ingress.

The private progress schema must carry policy/producer/config bindings,
first-start time and fixed deadline, source order, each source's attempt and
redirect counters, strong validator, partial byte count/digest, settled delivered
bytes, cumulative uncertain charged bytes, outstanding grant and state. Give each
grant a monotonically increasing sequence number and settle it at most once.
The admission total is acknowledged delivered bytes plus prior uncertainty plus
the current outstanding grant. Reclaimed unused grants cannot refund earlier
discarded bytes. On recovery, move an unsettled grant exactly once into cumulative
uncertainty and clear its active slot in the same durable update. It remains
fully charged, but must not be mislabeled as measured delivery or charged again
on a second recovery. Unreceipted partial writes are not a verified prefix.
Rehash the recorded prefix before reuse; quarantine mismatched partials.

For each update, fsync the new progress file, replace the old file atomically, then
fsync its parent directory before dispatch or acknowledging settlement. Lock a
separate stable lock file, not the replaced progress inode. An unreadable or
inconsistent record refuses continuation instead of initializing fresh counters.
This is an ordinary private text record, not an event store or new repository-state
architecture. Enforce the deadline
with monotonic elapsed time within a process and the original absolute deadline
across restarts; a backwards-clock inconsistency refuses continuation. The
implementation tests these proposed fields and transitions before enabling real
network mode. Do not serialize secret signed URLs into this record's canonical
receipt projection.

For resumable partials, require matching fixed source/revision/size/hash policy,
producer/config and local partial receipt; verify the retained prefix before
reuse. Bind a strong upstream validator for a range continuation. A single-part
206 must match the requested offset and expected total, with no overlap/gap.
A 200 response to Range is not appendable; restart from zero only as a new bounded
attempt, or refuse if remaining allowance is insufficient. Changed/missing strong
validators, wrong totals, multipart ranges, 416 without a locally complete
verified object, or incompatible encoding do not establish a complete file.
These admission choices use [HTTP's range semantics](https://www.rfc-editor.org/rfc/rfc9110.html#name-206-partial-content)
but are stricter course policy, not a promise that every server supports resume.

Request identity content encoding and reject an unexpected transformation before
using the body; normalize only supported MIME header syntax, not payload bytes.
Accept `text/plain` with absent or UTF-8 charset under the declared policy;
refuse incompatible type/charset/encoding. Framing, text filtering and privacy
decisions belong to Chapter 42. Rehash the entire assembled raw file before
marking it verified; an ETag or partial-prefix digest does not replace full SHA-256.

### Decisive cases

| Proposed test | Exact observation / refusal |
| --- | --- |
| `fixture_pair_is_fully_bound` | Four fixture files, 46 total bytes, 9 raw bytes, exact hashes and one manifest ID; all metadata references agree. |
| `attribution_change_changes_bundle_identity` | Replace attribution with `b"course-authored fixture v2\n"`; update both metadata references/inventory. Raw digests unchanged; manifest digest changes; old receipt rejected. |
| `canonical_bytes_are_not_repaired` | Nested duplicate/unknown key, reordered key, leading-zero/negative/float byte count, BOM, extra whitespace, missing/double final LF or wrong source-array order: reject; retain invalid input as failed evidence. |
| `same_size_wrong_bytes_fail` | Replace `abc` by `abd` with expected size 3 unchanged: SHA mismatch, no complete bundle or success receipt. |
| `missing_or_extra_inventory_bytes_fail` | Omit validation or add `extra.txt`; also symlink, hardlink, device, traversal and case-collision cases: no successful admission. |
| `metadata_swap_fails` | Change retained license/attribution without updating its bound hash, use unknown license, omit provenance or turn a redistribution disposition into unsupported approval: refuse. |
| `production_rejects_fixture_policy` | Every fixture ID/URL, zero producer hash or policy override supplied to the production route: reject before dispatch. |
| `redirect_admission_precedes_io` | Unapproved host, HTTPS downgrade, credential-bearing URL or sixth followed redirect: no request to that destination. |
| `resume_contiguity_is_exact` | Retain `ab`, continue `c` with range `bytes 2-2/3` and matching strong validator: assemble exactly `abc`; offset 1/total 4/changed validator/truncation: no verified file. |
| `ignored_range_is_not_appended` | Partial `ab` plus 200 body `abc`: never `ababc`; fresh bounded restart or explicit budget refusal. |
| `oversize_encoding_and_media_fail` | A fourth byte for expected `abc`, incompatible Content-Type/charset, compressed response or multipart range: failed evidence, no promotion. |
| `budgets_survive_resume` | Toy spent 2, remaining raw work 9, limit 10: projected 11 fails before dispatch; attempt/redirect/deadline exhaustion survives helper restart and run-ID changes. |
| `crash_windows_do_not_refund_budget` | Interrupt after reservation, partial write, final verification and accounting update. Missing durable settlement retains reservation; mismatched partial receipt is not reused. |
| `uncertainty_is_not_measured_delivery` | Start with 2 acknowledged bytes, 1 uncertain byte and 3 remaining bytes under ceiling 10. Successful continuation reports 5 acknowledged, 1 uncertain and 6 charged bytes, not 6 measured bytes. Repeated recovery never charges the same grant twice. |
| `exact_budget_allows_eof_only` | Three expected bytes under ceiling 3 followed by EOF: accept; any fourth byte: reject. The first grant is not double-counted in the pre-dispatch remaining-work check. |
| `progress_lock_survives_replacement` | A second writer cannot acquire the stable lock across progress-file replacement; missing fsync acknowledgement or corrupt progress cannot trigger dispatch with reset counters. |
| `one_file_is_not_a_pair` | Train verified, validation fails: preserve eligible private staging, publish no pair entry/receipt. |
| `publication_stays_within_cache_mount` | Stage/cache are distinct mounts: copy to a private cache-root temporary entry, reverify, fsync, rename within that mount. No cross-mount rename assumption. |
| `existing_entry_is_never_overwritten` | Exact valid digest entry: verify/reuse; corrupt entry or identity/path mismatch: refuse and preserve it for diagnosis. |
| `promotion_without_receipt_is_not_complete` | Crash after entry rename but before receipt publication: no consumer admission by path existence; resume re-verifies entry and finishes only the bound receipt/inventory. |
| `offline_replay_is_exact_and_read_only` | Accept only the selected entry and exact raw paths; missing/modified manifest, extra payload, broad-cache mount or consumer write fails. |
| `signed_urls_stay_private` | Query-value canaries in success, redirects, errors and retry history never appear in canonical manifest, receipt or learner trace; redacted endpoint/key inventory stays complete. |

Golden output must come from the implemented Rust example, not a handwritten
passing transcript. Compare byte counts, hashes, IDs, inventory, error categories
and trace order exactly; no floating tolerance is needed.

### Publication and receipt contract

Real acquisition runs only in run-staging RW with **no cache mount**. Real
publication has **network none** and the exact cache root RW. Copy the verified
bundle into a private temporary entry inside that mount, verify copied bytes and
inventory again, fsync files and directories, then atomically rename within the
same mounted filesystem. Include that temporary copy in disk accounting.
An existing digest entry is verified/reused or rejected, never overwritten.

Publish the canonical manifest/receipt/output inventory only after the entry is
complete. The receipt binds its `artifact_id`, outer manifest hash, cache entry,
raw relative paths, complete status and exact per-source transport records.
Use a closed schema-1 root with `schema_version`, `artifact_id`,
`acquisition_manifest_sha256`, `cache_path`, `status`, `requests`,
`body_bytes_total`, `uncertain_body_bytes`, `budget_charged_bytes`,
`started_at`, `finished_at`, and `policy_sha256`.
A success has `status: "complete"`, exactly train-then-validation request records,
matching source IDs by that frozen order, and a nonnegative body total equal to
the sum of the two records' `attempt_bytes`. These are durably acknowledged
delivered bytes, not a claim to know delivery during an interrupted grant.
`uncertain_body_bytes` is the disjoint cumulative upper bound retained from
those grants; `budget_charged_bytes` is their sum and must not exceed the ceiling.
No current grant remains outstanding at success. All three quantities are
nonnegative integer bytes, so offline verification can enforce conservative
accounting without opening private signed-URL logs. The selected manifest supplies the
exact raw paths; do not add an independent mutable path mapping to the receipt.
Timestamp strings use fixed UTC second precision. Bind the exact policy inputs
through `policy_sha256`; bind retained private retry evidence through the per-source
evidence hashes without copying secret logs into Git. The canonical source record
and receipt endpoint must agree for the final accepted body. Refusal evidence
stays run-local and is never a canonical success-shaped receipt.

Each request record carries the frozen fields `requested_url`, `resolved_endpoint`,
`status`, `media_type`, `range_requests`, `attempts`, `attempt_bytes`,
`expected_bytes`, `downloaded_bytes`, `expected_sha256`, `observed_sha256`,
`retry_evidence_sha256`. Define `downloaded_bytes` as final assembled source
bytes and use `attempt_bytes` for cumulative acknowledged body accounting;
uncertainty remains separately charged as above. Never substitute these quantities
for one another or describe an upper bound as observed transfer.

Raw signed URLs/query values stay in private transport logs only. The canonical
record uses the approved endpoint schema, including errors; logs are not course
prose. Missing metadata receipts or a missing selected entry must fail closed.

The separate step-output inventory retains its frozen fields
`schema_version`, `step_id`, `declared_outputs_sha256`, `files`,
`inventory_root_sha256`. Its root hashes UTF-8 lines
`path TAB bytes TAB sha256 LF` in byte-sorted path order, excluding the inventory
itself and shared state/decision files. It is distinct from the bundle payload
inventory. Run-only partials/logs are not fresh-clone canonical dependencies.

## 6. Teaching and surface commitments

### Problem-first presentation

**Problem definition.** Explain that a successful download does not establish that
corpus bytes match the declared artifact or that their provenance and permitted use are
known. Establish the need to bind admission evidence to the exact corpus bytes before
treating them as training input.

Follow the current [authoring policy](README.md#current-learner-facing-authoring-policy-2026-10-02): problem definition, guided solution, history,
visualization, then small optional practice. The opening explains the problem and its
cause without questions. Explain the worked results and their formula/Rust connection.
Remove learner prediction prompts entirely; do not move them to optional practice.
Optional tasks reproduce, inspect or explain behavior already taught. The retained
commitments below specify evidence coverage, not the old opening order.

### Retained evidence and optional-practice commitments

Evidence coverage:

1. Explain why “download succeeded” does not establish corpus admission.
2. Audit the two-file fixture's bytes, inventory and provenance together.
3. Define payload hash versus manifest identity and reproduce the attribution
   change counterexample.
4. Explain source/revision/media/license evidence and their limits.
5. Teach earlier dataset documentation and later governance-aware corpus
   construction with the two exact historical sources.
6. Run the Rust failure matrix: same-size corruption, incomplete pair and resume.
7. Check the exercises, then hand off raw verified inputs to Chapter 42.

Historical Rust contrast: compare a course-local bare `filename + size` inventory
with the governed report for the **same** fixture. Both can recognize the size-3
file; only the governed check detects `abd` replacing `abc`, missing provenance
or a changed metadata binding. Label this a demonstration of the motivation for
documented/governed data inputs, not a reproduction of Datasheets or ROOTS.
Do not implement a second downloader or claim those papers prescribe our cache.

Surface commitments:

- Titles/catalog/accessible summaries identify governed **raw-corpus acquisition**,
  not clean training data or permission to distribute weights.
- Table headers distinguish expected/observed bytes and payload/manifest SHA-256.
- A success result names the exact bundle and checks passed; its local scope
  excludes privacy, quality and redistribution approval.
- Failure labels name the rejected object, condition and absent publication,
  rather than unexplained status colors.
- Formula symbol explanations identify the canonical manifest bytes and digest
  representation locally; do not treat a filename or ETag as equivalent.
- Both required cheat sheets include only chapter-used LLM data terms, such as
  corpus provenance, raw source and artifact identity—not a second HTTP/Rust
  programming lesson. English first; no Russian copy is drafted in this packet.

Checked misconceptions: a checksum proves only the specified byte comparison;
documented license metadata is not blanket legal clearance; synthetic source
does not imply privacy-safe text; an upstream validation filename does not freeze
the course split; interrupted files are not complete assets; planned corpus bytes
are not measured training outcomes. Avoid legal conclusions about derived models
or adapters: record the separate unapproved disposition and future decision gate.

## 7. Visualization and accessibility

Decision: `not-useful`; visualization ID `null`. The exact manifest/payload/
hash/license comparison and failure conditions are better read in ordered
tables and Rust trace rows than inferred from spatial geometry. No diagram
component, fake figure, private expand control or Chapter 41 visualization ID.

The future page must explain that learning reason and teach directly from the
evidence tables. Keep complete tables, code, formulas and disclosures in static
HTML. Use meaningful captions/headers; wrap long hashes/URLs without changing
their copyable bytes. If an evidence table genuinely needs horizontal travel,
use the shared accessible named, keyboard-reachable region and contain each cell's
text; do not make the page overflow, clip cells or shrink type.

Validate English and Russian pages in the sole Firefox project at desktop/narrow
widths, including formulas, headers, code direction, keyboard navigation and
cheat-sheet dialog behavior. No diagram full-view test is invented for a chapter
with no registered figure; shared applicable forced-color/direction and containment
gates still apply. Never infer Russian layout safety from English.

## 8. Serial implementation procedure

These are future instructions, not authorization for this planning run.

1. Confirm the user has released the execution hold and the pending repairs,
   Chapter 40, static/offline prerequisites and checker-lifecycle compatibility
   gates are complete. Do not bypass them because this packet is planning-ready.
2. Read the current foundation's schema/registry/worker conventions and bind
   the proposed manifest, endpoint codec, progress accounting and module exports.
   Record incompatibilities before code; do not invent parallel infrastructure.
   Require an authorized offline supporting-dependency graph before Cargo work.
3. Freeze the implementation run's exact inputs/outputs and bounded fixture
   bytes. Keep producer hashes zero only in clearly separated synthetic fixtures.
   Begin with canonical-schema/path/hash tests, then trace and refusal tests.
4. Implement Rust policies and the minimal Node transport bridge; test injected
   responses and crash points without sockets. Exercise private-directory
   publication/replay behavior without the real cache boundary or raw corpus.
5. Regenerate Rust trace/expected output. Author English contract/page/catalog/
   cheat sheet from it, including both history sources and no-diagram rationale.
6. Run declared deterministic and static/Firefox gates, freeze English source,
   built HTML, commitment map and actual document/reading-order/isolated roles.
   Hand off to externally provisioned independent reviews/adjudications.
7. After same-candidate English acceptance, translate Russian directly from that
   revision using the localization skill; obtain independent bilingual/target-only
   reviews and affected Russian Firefox evidence. No executor self-approval.
8. Publish the coherent Chapter 41 slice only after its gates pass; checkpoint and
   commit that step separately. Hand policy/fixtures/schema to
   `establish-functional-artifact-cache-execution-boundary`, not directly to
   a bulk download.
9. The later boundary must prove real mount/permission/promotion semantics.
   The later acquisition step must additionally have exact retained metadata,
   the frozen pair, fresh allowed network/resources and its execution receipt.
   Its successful receipt selects the raw pair for Chapter 42.

At a failed gate, retain useful hashed staging and accurate failure evidence.
Do not manufacture a receipt, broaden an allowlist or run another chapter to
conceal the missing dependency.

## 9. Validation and review handoffs

The exact future Chapter 41 gates, from repository root, are:

```bash
scripts/run-functional-history-source-evidence.sh --step implement-ch41-governed-corpus-acquisition --chapter 41-governed-corpus-acquisition --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
scripts/run-functional-offline.sh --step implement-ch41-governed-corpus-acquisition --target implement-ch41-governed-corpus-acquisition-v1
scripts/run-functional-firefox.sh test --step implement-ch41-governed-corpus-acquisition --target chapter-41-governed-corpus-acquisition-v1
git diff --check
./course audit-host
```

The three closed runners are prerequisite-owned future tools, not currently
available commands to improvise or run during planning. Their registered targets
must cover contract/ownership/example checks, locked fmt/clippy/Rust tests,
dependency/demo checks, canonical manifest/acquisition/cache/offline-replay
fixtures, English/Russian chapter/parity/content checks, static build/links and
the sole Firefox target. Copy their exact current underlying commands into the
implementation run at preflight; no gate is optional because this summary groups it.

The existing ignored host `target/` cache is preserved. If the canonical host
audit still fails, retain that failure and use only a separately recorded,
accepted scope distinction; never delete the user's cache or claim a scoped
source audit is a pass of the original workspace. This planning run needs no
course build, browser, Rust execution or host-cache repair.

Use the common guide's external review handoff: author plus two fresh English
reviewers and two more fresh role-specific adjudicators, exact canonical
four-artifact prompts, untouched raw JSON records and externally verified
receipts. Both review and both adjudication verdicts must pass for one unchanged
candidate; an adjudicator's support for a blocking finding does not clear it.
The one executor cannot create independence by relabeling its own context.
If required external contexts/receipts are unavailable, keep publication staged.

Russian follows that exact approved English revision and the localization
skill's independent bilingual, target-only and rendered-layout gates. Text,
meaning, role, reading-order or inventory changes invalidate dependent reviews.
The Chapter 41 implementation budget records 8 successful learner-content
contexts and at most 16 attempts; do not treat that as permission to spawn agents
inside the later single-agent executor or to skip independent review.

## 10. Cost, risks and readiness

Current planning cost: medium, read-only evidence/source lookup and tiny
deterministic fixture arithmetic only. No corpus/model download or implementation.

Future Chapter 41 implementation: C3 CPU, G0 GPU, N1 history evidence, no paid
service, zero new artifact-download authority. Its N1 set is exactly Datasheets
and ROOTS, maximum source-evidence download 134,217,728 bytes. Per learner-content
context: at most 2,097,152 input bytes / 200,000 input tokens and 1,048,576 output
bytes / 40,000 output tokens; at most 16 attempts, aggregates 33,554,432 input
bytes / 16,777,216 output bytes and 28,800 seconds. No routine image review;
optional screenshots after a human report follow the README's conditional
diagnostic policy and limits. Use the user-selected model for language
authoring/judgments, with external review provisioning as above.

The full lifecycle consumes the frozen `8gb-gpu-core` profile but acquisition
does no GPU work. Only the separate N3 raw-pair step has these limits:

| Quantity | Frozen limit; proposed accounting where stated |
| --- | --- |
| Final accepted raw bytes | Exactly 1,943,728,838 |
| Download ceiling | 2,000,000,000 conservatively charged HTTP body bytes: acknowledged delivery plus retained uncertainty |
| Headroom beyond accepted raw bytes | 56,271,162 bytes; not three complete downloads |
| Host memory ceiling | 4,294,967,296 bytes |
| Disk ceiling | 8,000,000,000 bytes, including staging/private publication copy and retained partials |
| Wall ceiling | 14,400 seconds under a non-resetting operation deadline |
| Per-file attempts / redirects | At most 3 / 5 across helper invocations and resumes |

The numerical limits are frozen. The meter, uncertainty charges, helper
composition and counter persistence across resumes are explicit Chapter 41
planning refinements, not additional literal fields of the original target.
Reconcile them with the foundation before enabling real transport without
increasing any limit.

Raw payload bytes and small retained local metadata have distinct accounting:
the former fixes the selected two-object download total; the bundle inventory
also includes the exact metadata sizes. Retries, error bodies and discarded
partials consume transport allowance. A failed/uncertain attempt may leave too
little allowance to continue; do not silently increase a cap or reset it by
creating another run.

Readiness gates and their owners:

- User hold and prior repairs/checker compatibility: explicit release and valid
  predecessor checkpoints before any implementation.
- Manifest/cache/progress refinements: Chapter 41 owns schema/policy fixtures;
  reconcile declared foundation conventions before code. The following boundary
  owns real mounts, cache exposure and atomic directory deployment.
- SHA/URL/no-follow plumbing: accepted minimal locked graph must be supplied
  offline by an authorized dependency input; no implicit N1 fetch.
- Exact production license/attribution text, evidence references, hashes and
  separate redistribution dispositions: the acquisition preflight owner must
  obtain separately authorized retained metadata inputs before N3 can start.
  Missing evidence blocks acquisition; record the required input/approval rather
  than insert a hidden fetch into Chapter 41 or N3. Do not fetch auxiliary pages under the
  two-payload allowance, claim fixture metadata is real, or infer weight rights.
- Actual corpus verification and cache receipt: only the later acquisition run;
  this plan and Chapter 41's synthetic tests supply neither.
- External language review capacity: valid same-candidate receipts, not self-review.

Completion checklist for the future chapter: exact fixture and source boundaries;
closed canonical schema/identity; no unindexed or unsafe paths; reproducible
normal/failure/resume tests; conservative resource accounting; bounded transport
with Rust-owned decisions; correct historical contrast; no diagram invented;
reviewed English/Russian static surfaces; all owned gates pass; staged and
published bytes match; dedicated implementation checkpoint and commit. It does
not include or authorize bulk acquisition.
