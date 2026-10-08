# Chapter 41 implementation packet: prepare a corpus with NeMo Curator

Status: current merged packet, replacing the former Chapter 41–43 teaching and
Rust-preparation scope under the user's explicit instruction. Historical packets,
runs, receipts and approved candidates remain historical evidence. This packet
does not relabel an old Rust filtering result as NeMo output.

## 1. Scope and boundary

Chapter `41-corpus-preparation`; actual integrated implementation step
`merge-ch41-nemo-corpus-preparation-20261007`; owner `owner-ch41`. Preserve
`implement-ch40-reference-core-handoff` and its source census. Own the current
teaching boundaries for `CAP-DTH-DATA-01`–`CAP-DTH-DATA-04`, findings `F02`/`P04`
and claim `CLAIM-02`, without upgrading a fixture to production evidence.

Problem: stored text is not automatically an appropriate training selection.
Documentation, exclusion, repeated text and evaluation overlap affect what the
model learns and what its scores mean. Use an external preparation tool rather
than implementing elementary filtering and data infrastructure as LLM lessons.
Rust's sole new reusable responsibility is reading the prepared interchange.

The user explicitly permits NeMo-provided preparation algorithms and its Python/
shell examples for this chapter. That exception does not admit tokenization,
tensor, decoder, differentiation, training or inference implementations from
libraries. The separately provisioned tool uses NVIDIA/CUDA; the Rust backend
does not become CUDA-based. CPU loading and the existing CPU reference remain.

Deliver English only. Russian41+, existing-chapter repairs, routine image review
and screenshots remain deferred under the current policy. Actual programmatic
Firefox and independent English review/adjudication gates remain required.

Successor: new Chapter42, formerly44, learns BPE from frozen training readers.
The separate lifecycle step `execute-functional-nemo-corpus-preparation` prepares
the approved full raw corpus before that execution becomes eligible. Current
Chapter41 implements and measures a bounded tool exercise, not that bulk job.

## 2. Evidence and source ledger

Baseline `2c876b9cc4cc1f50462e6a0fbf4ad209f877b74b`. The integrated run is
`.build/runs/20261007T085507Z-merge-ch41-nemo-corpus-preparation-01/`; its immutable
input snapshot and original41–43 records bind the current revision1 inputs.
The revision2 migration map binds old44–85 to new42–83, not historical run IDs.

Primary NeMo pin: v1.3.0, commit
`6b956ce8965820de1b638fedf6de0cbcf0cc46ba`, tree
`a7482ccd7b031383307f1440aefe6406579d219f`. Read the captured exact workflow,
identification, removal workflow, reader/writer, WordCountFilter and English
splitter sources. Exact grouping uses MD5 text hashes and a keep-first selection
after shuffle; no lowest-ID or bit-identical cross-run representative is promised.
`perform_removal=True` is not implemented for exact or fuzzy workflows.

Source IDs `SRC-DTH-DATA-01` (Datasheets, first2018) and `SRC-DTH-DATA-03`
(Deduplicating Training Data,2022) supply the primary historical contrast.
`SRC-DTH-DATA-02` supplies C4 exclusion evidence. Keep the other prior registered
source records as history, not new production approval. Derive current claims
from the pinned primary paper versions and actual executable/tool evidence.

The official NeMo26.07 linux/amd64 image is pinned by digest in
`docker/nemo-curator.Dockerfile`. Inspect its installed package version, Python,
CUDA and driver compatibility before the exercise. Documentation's stack labels
are not evidence that the image has identical versions. Image provisioning is
external dependency plumbing, not a full Linux-package audit.

The run's Docker NVIDIA query observes the RTX4070 Laptop device, driver580.178.04
and compute8.9. That is availability evidence only, not a NeMo result or future
laptop calibration. Host-sandbox visibility must not override a successful
container-side query or invent completed workload evidence.

Existing raw TinyStories receipt/cache bytes remain intact. The approved original
train/valid text pair totals1,943,728,838bytes, revision
`f54c09fd23315a6f9c86f9dc80f725de7d8f9c64`. Their digests are
`c5cf5e22ff13614e830afbe61a99fbcbe8bcb7dd72252b989fa1117a368d401f`
and `94e431816c4cce81ff71e4408ff8d3bda9a42e8d2663986697c3954288cb38b4`.
The old acquisition record supplies source/rights evidence, not permission to
redistribute the corpus or an assertion that the new tool prepared it.

## 3. Inputs and worked example

`tools/nemo-curator/fixtures/raw.jsonl` contains six literal course-authored
records: two identical `A cat naps.` stories, `A dog runs.`, `Rain feeds trees.`,
`hi` and `!!!`. Each has an opaque string ID and source-group metadata. The two
cat copies share family-a. No acquired data or real personal information occurs.

The bounded recipe selects WordCountFilter(min_words3,max_words20,lang_en).
English uses whitespace-separated items: punctuation alone is one item, not a
linguistically recognized word. Expected arithmetic is6input→4quality→3exact-
deduplicated documents. A recorded actual GPU run must establish the observed
result. Keep either cat representative; validate text multiplicities, not a
predicted representative ID, shard UUID or incidental execution time.

Before outcomes, fixtures/splits.json assigns family-a/e/f to training, family-b
to validation and family-c to test. Pandas joins that supplied metadata policy;
missing/ambiguous group assignments and an existing split field refuse rather
than inventing or overwriting a role. Expected survivor counts are1/1/1 and
decoded text bytes11/11/17. This checks known provided groups, not completeness
of related-source discovery or statistical quality on a one-story test split.
Export all prepared records for inspection plus separate train/validation/test
JSONL. Only the training export may supply BPE learning.

Teach `r_keep=N_prepared/N_input`, dimensionless and undefined for zero input.
The stage fractions4/6 and3/4 multiply to3/6. They count documents, not tokens,
bytes or quality. Explain duplicate weighting conditionally on document sampling;
actual token-target weighting also depends on lengths and batching.

The Rust demo has a separate manually prepared JSONL fixture: story-a/story-c/
story-d,11/11/17decodedUTF8textbytes. Its actual stdout reports3documents and
39textbytes. It is never presented as NeMo-produced evidence. Actual NeMo output
may preserve additional word-count metadata and either cat ID; the loaded text
counts still follow from those three unchanged texts.

## 4. Rust design and ownership

Reusable source: `src/data/prepared_corpus.rs`, registered by
`ch41-corpus-preparation.module`; public namespace
`functional::data::prepared_corpus`. Demo-specific summary/main/fixtures/tests
belong in `rust/demos/ch41-corpus-preparation/`.

`PreparedDocument` contains string id/text plus arbitrary JSON metadata.
`PreparedCorpusReader<R:BufRead>` yields one document per physical JSON line.
Standard buffered I/O supplies LF boundaries; Serde JSON supplies parsing and
escaped Unicode. Accept LF/CRLF and a final record without newline; a blank line
is malformed. Require nonblank id/text without trimming the returned values.

`ReadLimits` has positive maxima for source-record bytes including line ending,
document count and cumulative decoded text UTF8bytes. Read at most record_cap+1
bytes to distinguish the boundary from overflow; check counts before returning.
No dataset identity, URI, asset filename, checksum, split choice or persistence
adapter is built in. Reader duplicates remain duplicates: preparation is external.

Errors are typed: invalid limits, I/O, record size, JSON/schema, blank field,
document cap, decoded text cap and count overflow. The iterator becomes terminal
at its first error; the failed document is not counted. Earlier returned documents
are not rolled back. The demo emits a final summary only after successful EOF;
consumers needing atomic publication stage their own outputs.

Remove old Rust acquisition/filter/dedup lesson modules and demos. Preserve the
Chapter40 artifact_identity helper. Move still-needed generic manifest/source/
store validation into the existing operational artifact-cache tool; retarget
transport/cache consumers and their tests, not the Rust LLM API. Remove obsolete
filter-only operational runners rather than leaving hidden preparation algorithms.

## 5. Test and failure matrix

| Case | Observable result and state |
| --- | --- |
| Valid supplied JSONL | Exact document text/ID/metadata and accepted counters;3/39 for the separate prepared fixture. |
| Unicode and escaped newline | Preserve decoded café/newline text and correct UTF8byte count, not escape-source length. |
| LF/CRLF/final EOF | Exactly one document per JSON object line, no extra terminal record. |
| Blank/malformed/nonobject/invalid UTF8 | Typed JSON failure on that1-basedline; terminal reader and unchanged accepted counters. |
| Missing/wrongtype/duplicate required key | Serde schema refusal, no manual grammar parser or coercion. |
| Blank id/text | Typed field refusal; nonblank surrounding whitespace remains in returned text. |
| Exact/one-over record cap | Boundary includes line ending; one-over refuses before parse with at most cap+1 source bytes read. |
| Document/text cap | Exact cap still permits EOF; next excess document refuses without incrementing counters. |
| Injected I/O failure | Error rather than EOF; no success summary; prior returned records are not secretly revoked. |
| Repeated IDs/text | Loader returns both supplied records; test proves it is not a hidden curation algorithm. |
| NeMo fixture | Actual6→4→3 and exact three-text multiset; configured library path and GPU evidence, not mocked expected stdout. |
| Empty input/zero survivors | No invented fraction or unnecessary duplicate call; report skipped identification and zero prepared count honestly. |
| NeMo input schema/cap/duplicate ID | Refuse before GPU work and without overwriting any earlier output. |
| Existing output directory | Refuse nonempty destination; preserve earlier attempts. |
| Supplied group policy | Preserve texts/IDs, same group receives one predeclared role; unmapped/missing/blank groups, duplicate group assignments, unknown roles or prior split metadata refuse. Six helper unit tests establish the library-owned join/input contract, not a GPU execution. |
| Missing GPU/incompatible stack/workflow failure | Retain failed output/logs; no positive execution receipt, fallback or smaller-surrogate acceptance. |

These tests do not establish universal privacy, right to use, representative data,
full-corpus scale, near-duplicate recall, benchmark clearance or trained quality.

## 6. Teaching and surface commitments

Use problem→solution→formula→practical evidence→history→diagram→optional
reproduction/explanation. No prediction prompt. Define raw document, occurrence,
ID, source group, split role, token target, retention and decoded text bytes
locally. Explain a tool's limits at the point its output could be overinterpreted.

Theory carries source/rights context, exclusion bias, duplicate weighting,
related-group separation, protected evaluation, privacy review and withdrawal
limitations. The bounded executable practice carries quality/exact removal, fixed
known-group assignment and interchange/loading; it does not claim every theory
gate was automatically solved.

Use Python NeMo calls only for the scoped external-tool demonstration. All LLM
implementation and the historical loading contrast remain Rust. Every executable
instruction supplies command, cwd, prerequisite and expected observable result.
Filtered tests must select a nonzero test population.

Isolated captions, metadata, diagram descriptions, answers and cheat-sheet terms
must identify the operation, document/byte units, synthetic scope, external-tool/
Rust boundary and evidence limitation their role requires. Do not expose authoring,
review, build-state or publication machinery in visible teaching prose.

## 7. Visualization and accessibility

Register `corpus-preparation` in the shared diagram module. Show source context→
external NeMo preparation→prepared JSONL→Rust loading, then training-only
tokenizer learning with validation/test roles kept separate. This relationship is
more useful than an invented neural-quality score or a screenshot of a tool UI.

Use actual captured NeMo stage counts where displayed and the actual Rust loader
trace for decoded-text counts. This external-tool chapter permits tool-derived
preparation evidence; do not recreate the algorithm in Rust to manufacture a
Rust trace. Bind both trace producers and their distinct scopes.

Keep one semantic static figure, meaningful reading order, named quantities,
registered ID, shared full-view behavior and narrow containment. Do not use color
alone for role distinctions or pretend an arrow grants privacy clearance. Retain
programmatic sole-Firefox inline/full-view, narrow, forced-color, direction,
keyboard, individual-box and formula-ink checks; no routine image review.

## 8. Serial implementation procedure

1. Claim the integrated migration, preserve all old records and hash-bound input
   evidence, and stage the exact renumber/delete map. Do not publish a plan-only
   half that collides with old42 routes and ownership.
2. Freeze the loader/interchange and new41semantic record; compile/test the small
   CPU reader before operational refactoring. Derive its stdout from real runs.
3. Provision the separate official NeMo image with network; inspect actual API/
   package/stack; all runtime containers use network_none and NVIDIA support.
4. Run the bounded library recipe, preserve raw stage output/report/logs and verify
   its exact fixture texts/counts. Reconcile API differences from pinned evidence,
   never a hand-written substitute algorithm.
5. Move useful generic operational modules, remove the obsolete custom lesson
   preparation algorithms/demos/runners, and validate dependent tools/reference.
6. Stage revision2plan,44packet inventory and shifted42–83 IDs/links/owners/queue;
   update affected source-to-prepared handoffs, not only displayed numbers.
7. Author every English surface from evidence; freeze source/HTML/roles and obtain
   two fresh reviews plus two fresh same-role adjudications. Russian remains held.
8. Run full integrated selectors, publish the coherent replacement, verify hashes,
   checkpoint and commit this completed step before the next lifecycle job.

## 9. Validation and review handoffs

From repository root, current Rust learner commands are:

```sh
COURSE_CORPUS=false ./course run cargo run --offline --locked -p ch41-corpus-preparation < rust/demos/ch41-corpus-preparation/fixtures/prepared.jsonl
COURSE_CORPUS=false ./course run cargo test --offline --locked -p ch41-corpus-preparation --lib tests::malformed_later_input_has_no_success_summary -- --exact
```

The maintained wrapper must forward stdin with Docker_i, not tty allocation.
The first emits the actual3/39summary; the second selects exactly one passing
test. Additional read-only overlay validation runs the13module and3demo tests,
formatting, compilation, byte-identical fixture stdout and reference census.

The NeMo Dockerfile/build and mounted offline command in the chapter execute the
actual supplied fixture; assert installed v1.3.0, configured public APIs, GPU path,
text multiset, counters and interchange. The next bulk job is not a substitute
for these tests and is not run to finish this chapter.

Run maintained course-plan, current functional-plan compatibility, ownership,
contract/example/review/output inventory, dependency and reference selectors.
Stage source/static HTML/math/link/catalog/sheet checks and sole-Firefox layout/
accessibility/behavior in a complete overlay including the explicit deletions.
Record exact run commands/hashes; `git diff --check` and host audit still apply.

Use the current exact canonical review/adjudication tools and four-artifact fresh
contexts. The author cannot certify its own English. Preserve untouched raw JSON
responses, receipts and pairwise context independence. No routine image or
Russian gate is reintroduced. Meaning, role, source or built-text drift requires
fresh dependent judgments. Operational command-only fixes use only the current
explicit narrow exception, not a waiver for this complete rewrite.

## 10. Cost, risks and readiness

Bounded fixture default: at most4,194,304sourcebytes and4,096documents; caller
may not turn those settings into a bulk-resource assertion. Exact RMM pool is
536,870,912bytes, spill limit268,435,456bytes, block size65,536bytes, one GPU,
two Ray CPUs and536,870,912object-store bytes. These are configured bounds, not
total measured process/device peaks; observe context/driver/allocator overhead.

Cost C3/G1/N1 for current source/image setup and bounded exercise, no paid service.
Image build may use official provisioning network; every run network_none. Source
evidence is bounded; no new corpus/model input is acquired. The separate official
environment image may be large, but is not the course corpus, a Rust dependency,
the default site image or a distributable private-corpus image.

Full preparation keeps the accepted source identities and product/profile resource
limits. Its job owns these pre-execution decisions: mature raw-text format adapter
without restoring the custom Rust EOS parser; exact/fuzzy ID/replay and component
evidence; related-source group semantics; predeclared group split and protected
evaluation exclusion method; source/rights/privacy release status; complete RAM/
GPU/disk/time admission. Use pinned library operations for those tasks. If a
required behavior cannot be mapped to a supported API within the envelope, stop
that bulk job with the precise missing gate rather than borrowing a surrogate,
editing old evidence or claiming generic data safety. Do not use the bounded
example's3–20word range as an unreviewed production policy.

The bulk handoff receipt must name exact prepared shards/digests/counts, split
roles and source mappings, tool/configuration identity, removal/group/overlap
methods and observed outcomes, privacy/rights status and resource evidence. Its
training selection alone supplies new42's BPE learning reader. No dependency on
the removed RetainedSelection, SourceBinding or Rust dedup type survives.

Keep raw acquired/cache evidence, failed tool attempts, exact package/image/source
identities, CPU stdout and review bundles resumable with their hashes. Repairs,
Russian41+, private raw redistribution and unrelated future implementation remain
held. Do not call planning-ready or a passed tiny exercise a prepared full corpus.
