# Current practical foundation commitments

These author-owned commitments describe the meaning carried by the scoped
English home, practical index and Practical Chapters 0–2. They are checked
against the bound current source, built HTML and technical evidence. They
supply no candidate classification or judgment verdict. Each actual review
surface carries its separately frozen neutral role requirement.

## Home, index and course boundaries

- The home offers two named courses and two named start actions. LLM from
  scratch builds a small Rust language model through Chapters 0–39. Practical
  LLM in Rust extends a separate founding copy of that completed model.
- Chapter 0 explains the practical course's structure. Chapter 1 and later
  chapters contain learning material. The practical index links to the available
  lessons and distinguishes them from the later roadmap.
- The practical course requires the first course's basics or equivalent Rust
  and LLM experience. Its current lessons are in English. A Russian home can
  identify the English destination explicitly. Course identity and locale
  identity are distinct; there is no Russian practical lesson or English
  substitute presented as Russian.
- The two start actions lead to their respective orientation chapters. In that
  course-choice presentation, the repository action remains; the earlier single
  unnamed course-start action and note are absent.
- First-course implementation and teaching wording stay at the selected
  restored baseline, retaining accepted repairs. The first-course list and
  navigation end at Chapter 39. Practical navigation uses its own sequence.
  These boundaries do not supply a current language verdict for protected
  first-course wording.
- The practical index's independent description identifies a completed Rust
  language model, its separate practical copy, the orientation and learning
  sequence, and the distinction between available lessons and the roadmap.

Evidence carriers: the current course-boundary configuration, exact restoration
and founding-copy inventories, English message catalog in its scoped role,
current home/index HTML, ordered chapter cards and their actual destinations,
and current static/link and boundary validation.

## Practical Chapter 0

- The separate practical Rust crate starts with existing BPE, tensors,
  automatic differentiation, a causal decoder, training, evaluation, checkpoints
  and cached generation. New practical chapters extend those mechanisms.
- Chapter 1 records the fixed reference experiment. Chapter 2 separates
  external corpus preparation from Rust loading. Chapter 3 extends the existing
  BPE trainer and tokenizer. Later curriculum stages include variable-length
  batches and packing, configurable decoder shape, GPU execution, larger
  training runs, complete resume state, evaluation, adaptation, quantized
  inference and serving. A stage in the roadmap is not an available lesson or
  a measured capability.
- CPU reference execution and Rust loading of prepared documents work on CPU.
  The GPU path requires compatible NVIDIA hardware. External NeMo preparation
  has its own pinned CUDA/RAPIDS and driver prerequisites. Another tool may
  supply the same tool-neutral prepared-document interchange.
- Small fixtures establish the observed behavior for their stated inputs.
  They do not establish full-corpus throughput, useful generated language or
  larger-model memory use. Full-data and hardware measurements supply separate
  evidence.
- An ordered path associates the lessons and purposes directly. Orientation
  introduces no new mathematical or Rust algorithm to reproduce and has no
  cheat sheet.

Evidence carriers: the exact practical founding-copy inventory, completed
reference implementation, current Chapter 0 contract and lesson, current
practical curriculum and policy, available routes and chapter ordering.

## Practical Chapter 1

- The example executes the restored original scalar pipeline without changing
  it. The practical copy can evolve while that fixed comparison point remains.
  Its report identifies fixed inputs and scopes the behavior actually observed.
- The input identity composes named canonical configuration, fixture and source
  fields, then hashes the complete record. The displayed composition symbol
  names that field composition, rather than unframed string concatenation.
  Definitions explain the digest, its units and representation, every input,
  field boundaries and the computation's limits.
- The source identity combines its baseline revision and exact forty original
  crate Rust source files, including module declarations in `lib.rs`. It
  excludes the evolving practical crate, reporting wrapper and interface.
  Toolchain, locked dependencies and arithmetic environment are recorded
  separately. A matching input digest does not certify algorithm correctness,
  matching execution environments or reproducibility of every floating bit.
- Fixed inputs include eight training, two validation and two test documents;
  1,188 learned scalar parameters; context capacity four tokens; and eighteen
  specified settings. Floating settings are identified by their exact bit
  patterns.
- Primary training and separately executed replay each perform thirty-two
  updates of sixteen windows with four valid targets, giving 2,048 training
  targets per schedule and 4,096 combined. These counts derive from the frozen
  full-batch schedule. Evaluation targets and generated tokens are different
  quantities. Two executions from the same seed are not independent seed samples.
- Decoder and frozen bigram score the same 1,744 overlapping test-window target
  slots. Their mean NLLs are approximately 3.866087547 and 3.981342714 nats per
  slot. The test documents contain 442 within-document transition occurrences.
  Overlapping windows can score an occurrence repeatedly. A once-per-occurrence
  longest-causal-prefix policy is explained but its numeric NLL and perplexity
  are not reported by this example.
- The checkpoint round trip preserves encoded bytes, model and optimizer bits,
  tokenizer and fixed-probe logits. The probe `At` has token IDs `[67,118]`.
  Cached and complete-prefix generation agree on `[260,34,34]`, representing
  Cyrillic `т` followed by two spaces.
- Identity, replay, window-slot evaluation, reload and generation agreement have
  distinct meanings. These checks do not establish useful language quality,
  variation across seeds, complete job resumption or laptop throughput.
- Model Cards motivates reporting intended use and evaluation conditions. The
  later fine-tuning study measures variation in its own pretrained models and
  settings. It does not measure this tiny decoder's variation. The Rust reporting
  comparison uses one observation, without retraining a historical model or
  executing a seed sweep.
- The runnable report and pure identity-input mutation exercise give the
  repository working directory, Docker/image prerequisites, exact commands and
  expected selected work. Constructing a changed identity does not admit changed
  corpus or split bytes to the fixed reference execution.

Evidence carriers: the verified forty-file manifest and compiled-byte source
proof, current reporting wrapper and tests, restored original pipeline and
configuration, exact corpus/split bytes, actual report stdout, current input-fit
records for retained executions and the fresh reference tests, primary historical
source records, and current formula, figure, term definitions and practice.

## Practical Chapter 2

- Source context, intended use, configured exclusions, duplicate handling,
  privacy and protected evaluation overlap are separate corpus decisions.
  A checksum, retention fraction or successful load does not certify them.
- Under one pass per stored document occurrence, repeated copies supply repeated
  token targets. Removing copies changes weighting. Document-sampling fractions
  and token-target fractions measure different quantities.
- The bounded external example applies NeMo's declared word-count proxy to six
  course-authored input records, retaining four occurrences, then exact duplicate
  removal leaves three texts. Either original cat-story ID may survive, and no
  output order is promised.
- The source-group role policy is fixed before preparation outcomes. The cat,
  dog and rain stories supply one training, one validation and one test document.
  Checking known groups does not discover every related example. Disjoint IDs,
  exact duplicate removal and evaluation decontamination are distinct claims.
- Retention fractions name their entering population: four of six after
  filtering, three of four after duplicate removal, and three of six overall.
  Empty input has no retained-document fraction. Retention is not a quality score.
- The interchange is UTF-8 JSONL with nonblank string `id` and `text` fields and
  preserved additional metadata. Newlines within text are escaped. The practical
  Rust reader preserves decoded content without normalization, duplicate removal,
  retrieval, source selection or split assignment.
- Source-record bytes, document counts and decoded-text bytes have distinct
  bounds and units. The iterator stops at its first error; documents already
  returned remain returned. The demo consumes the complete input before printing
  its success summary. A caller publishing each item immediately needs its own
  staging to prevent partial publication after a later error.
- All-role inspection contains three documents and 39 decoded text bytes:
  11, 11 and 17 bytes. The selected training export contains one document and
  11 bytes. The separate manually prepared fixture has its own origin, even
  when its document and byte counts match the tool-produced output.
- The separate NeMo workflow does not add preparation dependencies to the Rust
  language model. The bounded workflow is not a bulk-corpus result. Retained
  measured preparation evidence keeps its original run identity; moving its
  teaching into this course does not claim a new preparation execution.
- Dataset documentation and cited filtering/duplicate-removal studies support
  their specific historical claims. The fixture does not reproduce the studies'
  trained-model outcomes.
- Only accepted training selection supplies later tokenizer fitting and model
  targets. Validation and test may be encoded with frozen rules but do not fit
  those rules. Bounded Chapter 3 fixtures may proceed before the separate bulk
  preparation, full-data lineage and measured resource gates are complete.

Evidence carriers: the unchanged prepared-corpus reader, actual reader/demo
tests and stdout, exact six-record input and predeclared group policy,
checksum-verified measured NeMo output and trace with original provenance,
external recipe/tool-version evidence, primary historical records, and current
contract, formula definitions, figure, cheat sheet and reproduction commands.

## Shared and progressive surfaces

Complete scoped documents, their local reading order and genuine isolated
surfaces retain the current inventory's exact neutral role requirements. Course
cards associate names, purposes, prerequisites, languages and destinations;
chapter cards associate number, title, purpose, revision and destination.
Contextual headings name their associated sections. Formula definitions remain
with their computation in its real reading order. Figure naming/description
groups contain their actual accessibility targets; cards and tables retain
their own labeled evidence. Term pairs preserve each term's definition.
Practice, answers, navigation, actions, status ranges and accessible names remain
bound to their actual roles and destinations. Progressive labels retain exact
source and controlled-content provenance. Audit-only markup adds no learner
text and supplies no publication verdict.
