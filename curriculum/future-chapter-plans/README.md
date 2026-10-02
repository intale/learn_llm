# Future-chapter implementation packets

Status: planning only. These are internal author/executor instructions, not
learner-facing lessons, approved English, or permission to execute the extension.

## Authority and execution hold

The accepted scope remains
[the functional laptop extension plan](../functional-laptop-llm-extension-plan.md).
Its 46 chapters, capability ownership, resource profiles, queue and conditional
PostgreSQL decision are not replaced by this directory. BUILD_STATE.yaml and
DECISIONS.md remain the text-file scheduling authority. No event store, database
or new project ledger is introduced.

The user requested these packets for one `gpt-6-astra max` executor with no
sub-agent facility. This is an execution constraint supplied by the user, not a
claim about a model's general capabilities. Detail must reduce reconstruction
and ambiguity without pretending that an unimplemented interface or unmeasured
result exists.

Repairs and implementation are held pending. Planning completion never releases
that hold. Before execution, obtain the user's explicit instruction to resume,
then reconcile the frozen execution checker's prior lifecycle assertions in a
new compatibility run. Preserve all historical runs and all substantive
curriculum/resource/queue checks. That reconciliation is also pending now.

## Inventory and this checkpoint

[index.json](index.json) enumerates every Chapter 40–85 with its stable planning
step, proposed packet path and status. A `pending` entry is a queued plan, not a
missing completed artifact. A `planning-ready` entry means its internal packet
passed a planning-consistency check; it does not mean the chapter exists or its
content has passed publication review.

Completed planning checkpoints:

- [Chapter 40: scalar-reference handoff](40-reference-core-handoff.md).
- [Chapter 41: governed corpus acquisition](41-governed-corpus-acquisition.md).
- [Chapter 42: deterministic corpus filtering](42-deterministic-corpus-filtering.md).
- [Chapter 43: deduplication and decontamination](43-deduplication-decontamination.md).
- [Chapter 44: scalable BPE tokenizer](44-scalable-bpe-tokenizer.md).
- [Chapter 45: padded variable-length batches](45-padded-variable-batches.md).
- [Chapter 46: packed sequence masks](46-packed-sequence-masks.md).
- [Chapter 47: depth-aware initialization and health](47-depth-stable-decoder.md).
- [Chapter 48: configurable decoder core](48-configurable-decoder-core.md).
- [Chapter 49: dropout semantics](49-dropout-semantics.md).
- [Chapter 50: dependency and error contract](50-dependency-error-contract.md).
- [Chapter 51: serving configuration and admission](51-serving-config-admission.md).
- [Chapter 52: accelerator tensor parity](52-accelerator-tensor-parity.md).
- [Chapter 53: mixed-precision training](53-mixed-precision-training.md).
- [Chapter 54: memory-bounded training](54-memory-bounded-training.md).
- [Chapter 55: optimizer schedules and clipping](55-optimizer-schedules-clipping.md).
- [Chapter 56: tensor artifact interchange](56-tensor-artifact-interchange.md).
- [Chapter 57: immutable artifact persistence](57-immutable-artifact-persistence.md).
- [Chapter 58: exact job resume](58-exact-job-resume.md).
- [Chapter 59: resource observability](59-resource-observability.md).
- [Chapter 60: multi-seed evaluation](60-multi-seed-evaluation.md).
- [Chapter 61: quantized GGUF artifacts](61-quantized-gguf-artifacts.md).
- [Chapter 62: laptop hardware admission](62-laptop-hardware-admission.md).
- [Chapter 63: GQA and context policy](63-gqa-context-policy.md).
- [Chapter 64: online tiled attention](64-online-tiled-attention.md).
- [Chapter 65: KV block pool](65-kv-block-pool.md).
- [Chapter 66: nucleus penalties and logprobs](66-nucleus-penalties-logprobs.md).
- [Chapter 67: stop strings and Unicode streaming](67-stop-strings-unicode-streaming.md).
- [Chapter 68: continuous batch scheduling](68-continuous-batch-scheduling.md).
- [Chapter 69: cancellation, backpressure, and budgets](69-cancellation-backpressure-budgets.md).
- [Chapter 70: loopback serving and metrics](70-loopback-serving-metrics.md).
- [Chapter 71: LoRA and response-masked SFT adapters](71-lora-sft-adapters.md).

Chapters 72–85 remain separate pending planning steps. Do not substitute this
guide for those individual packets.
Each subsequent packet must fill in the chapter-specific facts below, not repeat
generic instructions or present placeholders as finished detail.

## Required packet contract

Every packet must include the following numbered sections. An item that genuinely
does not apply must state why and identify the replacement evidence.

1. **Scope and boundary.** Exact chapter/implementation/capability IDs, outcome,
   one small taught concept, prerequisites, what is preserved, explicit
   non-goals, successor handoff and every cross-chapter output it consumes.
2. **Evidence and source ledger.** Relevant existing files and symbols, baseline
   revision/hashes, observed results, primary historical/technical references,
   precise supported claims and limits. Distinguish repository observation,
   mathematical derivation, proposed design and future measurement.
3. **Inputs and worked example.** Literal small inputs or a complete reproducible
   construction; dimensions, units, axes, ordering, seeds, state transitions,
   exact discrete results and justified floating-point comparisons. Give the
   learner's prediction, observable output, explanation and reproduction task.
4. **Rust design and ownership.** Existing versus proposed modules and signatures,
   data representation, invariants, mutations, errors, dependency roles,
   resource bounds, serialization/compatibility boundaries and downstream API
   handoff. Rust owns every taught decision. Mature supporting libraries may
   handle plumbing; do not bury the lesson's algorithm in a dependency.
5. **Test and failure matrix.** Named cases with inputs, observable success/failure,
   numerical tolerances, state/output after failure, and what the case does not
   prove. Cover boundary cases and restart/cleanup where applicable. Avoid
   "test edge cases" or "ensure correctness" as substitutes for actual cases.
6. **Teaching and surface commitments.** Ordered lesson sections, symbol
   definitions, formula derivation, historical contrast with related Rust,
   misconceptions, exercises with answer expectations, and exact scope each
   heading, caption, description, output or other isolated surface must carry.
7. **Visualization and accessibility.** Useful relationship and registered ID,
   trace fields, reading order, quantities/units, labels/role requirements,
   narrow/full-view strategy and containment checks. Or a concrete pedagogical
   reason for no diagram plus the evidence that teaches the relationship.
8. **Serial implementation procedure.** Small ordered actions with stop conditions
   and intermediate artifacts. Respect the canonical step's output ownership.
   Keep the bilingual chapter a coherent vertical delivery; phases inside it
   are not permission to publish half a chapter or start unrelated infrastructure.
9. **Validation and review handoffs.** Exact commands and working-directory
   expectations; mark existing commands versus future prerequisite-owned
   runners. List source/trace/content/build/Firefox and independent language
   gates. State the expected evidence and how drift invalidates it.
10. **Cost, risks and readiness.** Frozen profile/budget limits, explicit allowed
    network inputs, useful resumable artifacts, unresolved dependencies with
    an owner/decision rule, and a complete handoff checklist. No invented
    throughput, quality, device availability or trained-model results.

A packet may choose a concrete proposed API. Label it proposed, make its behavior
precise and show how it uses the established shared boundary. If a prerequisite
has not yet fixed that boundary, specify the required interface behavior,
ownership and preflight reconciliation rule rather than inventing a competing
format, runner, backend or architecture. A missing substantive design choice
without such a rule means the packet is not planning-ready.

## Evidence and teaching rules

Numbers copied from a checked-in stdout fixture are *recorded baseline evidence*,
not a fresh run. Future stdout must be regenerated from the actual implementation;
never write plausible expected output merely to make a test pass. Exact counters,
tokens, digests and serialized bytes use equality. Floating results need a
declared comparison justified by the current numerical contract, not an arbitrary
epsilon or an expectation that all hardware behaves bit-identically.

Preserve local referents and conditions: name who performs an operation, on which
quantity, in which order, and under which mask/state/resource constraint. Use
units and explicitly distinguish token IDs from positions, sequences from batches,
counts from rates, and planned envelopes from measurements. When a figure is not
useful, explain the learning reason rather than site/build machinery.

Canonical-English authoring follows the repository skill. Every future formula
in learner-facing prose uses the math pipeline. Derive diagrams and numerical
examples from Rust traces. Do not author translated copy as part of an English
packet, and do not let implementation notes leak into learner-facing prose.

## One executor and independent review

The executor can author, implement, run deterministic validation and self-audit.
It cannot approve its own English for publication. Its lack of sub-agents does
not remove or weaken the course's independence rules.

After English source, rendered HTML, role requirements and inventory are frozen,
handoff to an externally provisioned review workflow: two fresh, distinct
reviewer contexts (technical/pedagogical and isolated-surface), followed by two
additional fresh same-role adjudicator contexts. Follow the current exact
canonical prompts, four-artifact boundaries, raw-response byte contract and
external routing/receipt verification. This is a serial handoff contract, not an
instruction for the executor to spawn agents. An adjudicator approves or rejects
the soundness of its review; it does not erase a supported blocking finding.

The executor resumes publication only with both review and both adjudication
verdicts passing for the same unchanged candidate. A rejected or invalid record
requires the protocol's fresh replacement context, never a repaired JSON record.
Content changes invalidate dependent review evidence.

Translate Russian directly from that approved English revision using the
localization skill. Obtain its independent bilingual and target-only reviews and
affected Firefox rendered-layout evidence. Do not self-certify those gates
because only one execution context is available. If external review capacity is
unavailable, checkpoint staged artifacts and the missing gate; no publication.
Do not add an extra discretionary human approval gate for otherwise completed
localization.

## Planning validation and updates

For a packet, check its IDs and owned outputs against the frozen chapter record;
inspect each referenced existing symbol and distinguish all future paths; work
through every tiny example; audit expected tests and scope claims; and verify its
predecessor/successor interfaces. Record substantive findings and resolutions.
This is internal planning review, not any of the four English publication roles.

Deterministic checks may verify the 46-entry inventory, status/path/step alignment,
required section coverage, relative links, YAML/JSON syntax, unchanged held steps,
and that no course implementation file changed. They do not prove pedagogy,
technical truth, language quality or review soundness. Run `git diff --check`
and the ordinary course-plan checker in the existing offline pinned container.
No browser or full course rebuild is needed when only these internal planning
documents and ledger/decision records change.

Future packet runs should record their exact validation commands and input
hashes. Stage, validate, publish the packet and update its inventory entry, then
checkpoint and commit only that completed planning step. Do not modify completed
run artifacts. Do not start a future chapter merely because its plan is ready.

## Known deferred gates

- The repair `repair-ch06-symbol-table-and-ch08-ch10-learning-surfaces` and all
  functional implementation/acquisition steps remain pending and unchanged.
- The frozen functional checker needs a separately authorized lifecycle
  compatibility run before execution resumes. Its failure under the planning
  phase must not be presented as a passing live execution check.
- Source `SRC-DTH-EVAL-01` labels arXiv `2002.06305` as "On the Stability of
  Fine-tuning BERT". The linked primary record is instead "Fine-Tuning Pretrained
  Language Models: Weight Initializations, Data Orders, and Early Stopping"
  (Dodge et al., 2020). Chapter 40 records the correct linked evidence; correcting
  the frozen source registry and its bindings remains pending. Do not silently
  switch papers, use the incorrect title in a lesson or mutate the completed plan.
