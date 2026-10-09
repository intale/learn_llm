# Current Practical Chapter 3 commitments

The current English candidate contains the home selector, practical index and
Practical Chapters 0–3. Chapter 0 explains the structure; later chapters teach
material. Current entries and navigation identify actual available chapters.
The first course ends at Chapter 39 and retains its implementation and accepted
wording. Practical lessons are English only, with localization support retained.
Applicable home, index, Chapter 0–2 and shared-surface commitments retain their
original concepts and evidence limits, interpreted against the current sources
and complete built pages.

The practical GPU path requires compatible NVIDIA hardware; CPU reference work,
prepared-corpus loading and the current tokenizer fixtures are usable on CPU.
External corpus preparation is replaceable and separate from the course-owned
Rust model. Bounded fixtures do not complete full preparation, accepted
full-corpus lineage, full tokenizer fitting, measured hardware or model quality.

## Existing implementation and decision rules

Chapter 3 extends the existing practical `BpeTrainer` and `BpeTokenizer`. The
original scalar learning loop supplies the recounting reference; existing
scalar ranked application supplies the application reference. Local pair
statistics and bounded live-adjacency application are strategies behind those
same owners. Layout, rules, operands, vocabulary expansion, framing and decoding
retain their existing owner. `train_byte_fixture` adapts input to the existing
learning loop. It does not copy that loop or define another tokenizer.

At each rank, count adjacent positions within each current training document,
including overlaps and excluding document boundaries and structural controls.
Select the greatest count; ties select the smallest left content ID and then
the smallest right content ID. Replace left to right without consuming an
input position twice. Consequently `aaa` has two counted occurrences and one
replacement; `aaaa` has three counted occurrences and two replacements.

The requested merge count is normally an upper limit. Prepared policy may
require an exact count and then refuses exhausted pairs. The trainer's count
and artifact policy must agree. Zero rounds is valid. The formula, its adjacent
selection explanation and definitions name the rank, pair IDs, integer count,
overlap/document scope and numeric tie order.

## Observed worked example

The separate training documents are `abab` and `abac`. BOS and EOS have IDs
`0,1`, one-byte content IDs are `2..257`, and `a,b,c` have IDs `99,100,101`.
There is no PAD. Before rank 0, counts are `(99,100):3`, `(99,101):1` and
`(100,99):2`. The selected `(99,100)` creates ID `258` with three replacements;
sequences become `[258,258]` and `[258,99,101]`.

Before rank 1, `(99,101)`, `(258,99)` and `(258,258)` each have count one.
Numeric order selects `(99,101)`, creating `259` with one replacement;
sequences become `[258,258]` and `[258,259]`. Held-out `acac` supplies no
learning counts. Frozen application emits `[259,259]`, reconstructs `acac`
and frames the document as `[0,259,259,1]`.

Both observed canonical payloads have SHA-256
`8b1534b8711b1b55c97466fcdd94c6059395acf553e25ba66a6e4911604014b9`.
Eight training input bytes produce four content tokens. Four inserted controls
for two documents are excluded from the numerator: 0.5 content tokens per
input byte. Empty input has no defined ratio. Eighteen local edge updates,
eight peak node slots, four peak pair types, eleven peak heap entries and zero
rebuilds are logical working-representation observations, not measured RAM or
throughput. Sequence length, memory, speed and model quality remain distinct.

## Local updates, application and bounds

Stable nodes retain predecessor/successor links. A replacement removes the
existing incoming, selected and outgoing edges, then immediately adds new
neighbor edges. Ordered occurrences preserve leftmost nonoverlapping
replacement. Queue order preserves maximum count/minimum pair; generations
reject stale entries, and a capacity rebuild uses current pair states.

Consumed slots remain allocated. `max_nodes` counts all ingested byte positions;
documents, pair types, heap entries and trace values have distinct limits.
Weighted fixture records use checked counts without allocating every repeated
copy. Streaming input releases document text but retains the bounded working
representation. This is neither constant-memory nor external-memory training.
Avoiding unaffected-edge recounts establishes no measured speed improvement.

Frozen application selects the earliest eligible learned rank, then the
leftmost position, and rechecks adjacency and versions. Operands must precede
their rule's output. Reader chunks are transport boundaries: one bounded whole
document is collected, and separate documents require separate calls.
Decoding concatenates existing byte expansions exactly; text decoding checks
UTF-8 after concatenation. Literal control spellings are ordinary content.
The existing framing validator owns BOS/EOS placement. Decoded output size is
checked before allocation; per-token and total-vocabulary expansion limits
separately bound expansion work.

## Corpus and artifact evidence

The caller supplies a training-only prepared stream and accepts its corpus
evidence. The existing reader decodes documents; training verifies exact source
SHA-256 and refuses supplied non-training split metadata. These checks do not
discover overlap or certify rights, privacy, quality or suitability.

The artifact records closed schema/layout, raw-byte policy, training binding,
requested count, ordered rules and counters. Course-owned checks reject unknown
fields/versions, duplicate pairs, rank gaps, forward operands and inconsistent
reductions; existing tokenizer construction validates vocabulary expansions.
JSON syntax is supporting plumbing. Fixed canonical payload bytes identify
rules and declared lineage. Producer timestamps, paths and machines belong in
separate receipts. Equal vocabulary size does not identify a tokenizer.

## History, comparison and reproduction

Sennrich and colleagues' 2016 subword method repeatedly merges frequent symbol
pairs in a character representation retaining word boundaries. The pinned
published GPT-2 encoder applies a reversible byte map, its concrete
pretokenization pattern and frozen ranks within each piece. The boundaries
determine where a learned merge can apply.

The chapter-local Rust example implements that byte mapping and fixed pattern,
reuses the existing course rank engine and supplies a tiny illustrative
vocabulary. Its IDs are not pretrained GPT-2 IDs. For `a1`, the course raw-byte
path uses a merge learned from `a1a1` and emits `[258]` with fragment `6131`.
The separate pattern example emits pieces `a,1`, illustrative IDs `[64,16]`
and fragments `61,31`. Both reconstruct `a1`; reconstruction does not imply
equal segmentation. The supporting regex engine performs pattern matching,
not course BPE, byte-map, pattern-choice, rank or vocabulary decisions.
This is no full-pretrained-tokenizer or Python-runtime parity claim.

No foreign tokenizer supplies an assertion, oracle, snapshot, parity or
admission gate. Historical outputs are displayed observations. Own-course
tests compare scalar and extended strategies: every rank for 100 seeded
three-document corpora, lengths 0–32 over `a..h`, and application/decoding for
10,000 strings of length 0–64 mixing `a..c` and arbitrary bytes. They reuse
SplitMix64 with seed `0x42b0d5eed`. Sixteen integration and three demo tests
passed, including the optional third-rank exercise. Current formatted workspace
validation passed 501 tests, Clippy and format checks.

Learner run instructions supply repository-root context, Docker/workspace
prerequisites, copyable commands and observable output. The nonquiet Cargo demo
and both exact single-test selectors executed successfully in the cached
offline image; each selector ran exactly one test. Wrapper provisioning was
not run under the offline execution boundary. Practice and answers explain
overlap, the next own-course tie and pretoken boundaries.

Freeze tokenizer policy before decoder targets and encode each document with
the same frozen vocabulary. The Chapter 4 batching handoff describes later
material, not an already available chapter or measured capability.
