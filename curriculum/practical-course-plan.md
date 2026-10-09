# Practical LLM in Rust: current course plan

This is the live amendment for the separate course authorized on 2026-10-08.
It records current ownership and numbering without changing the historical
extension plan, its runs, reviews, receipts or raw artifacts.

The historical curriculum input is
`curriculum/functional-laptop-llm-extension-plan.md`, revision 2, SHA-256
`81d445a07868e6d1958557b1b166dea0cbdfbe447948095edebe8f037f806ad3`.
Its old course membership, crate paths, locale selectors, tokenizer comparison
gates and execution dependencies do not authorize current work. Each practical
step must declare its current outputs, prerequisites and validation selectors
before execution.

## Course boundaries and starting implementation

LLM from scratch ends at Chapter 39. Its implementation and affected lesson
wording are restored to the approved pre-extension baselines while retaining
accepted repairs. Both locale home pages offer the two course starting points;
first-course lessons do not explain the new course.

Practical LLM in Rust starts with one authorized copy of the completed original
crate at `rust/crates/llm-from-scratch-practical`. The copy is an independent
workspace package. Practical work reuses and extends its existing mechanisms.
It must not introduce a second owner of an already implemented operation. If a
chapter actually requires reimplementation, explain the overlap and stop the
affected work until the user resolves it.

The original crate remains the read-only fixed scalar reference for the
reference experiment. Its forty Rust source files, including `lib.rs`, are
bound to revision `9f38a060903c472c4d571efd8e52da1f17e553ff` by
`configs/practical-reference-source-v1.json`. The evolving practical crate and
report wrapper are excluded from that fixed source identity.

## Current numbering and availability

| Practical chapter | Origin | Purpose |
| --- | --- | --- |
| 0: Course structure | New orientation | Explain the starting model, prerequisites, sequence and limits of examples. |
| 1: Reference-core handoff | Original Chapter 40 | Record the fixed experiment and distinguish observed behavior from broader claims. |
| 2: Corpus preparation | Original merged Chapter 41 | Separate external preparation from bounded Rust loading of tool-neutral prepared documents. |
| 3: Scalable BPE tokenizer | Original Chapter 42 objective | Extend the existing trainer and tokenizer with bounded ingestion, local pair updates and ranked application. |
| 4–44 | Original future Chapters 43–83, in their existing order | Continue the practical curriculum from variable-length batching through the persistence-scale decision. |

The foundation checkpoint owns the course split and Chapters 0–2. Chapter 3
has a separate implementation checkpoint and cannot execute or publish before
the foundation passes. The course index lists actual publishable lessons;
remaining chapters are a roadmap rather than available lessons.

For original future Chapters 43–83, subtract 39 from the chapter number and
retain the descriptive slug. That mapping applies only to new live practical
contracts, outputs and selectors. Historical identities and paths remain
unchanged. Each later chapter still requires an audit of existing functionality
and a closed current claim before implementation.

## Routes and localization

First-course routes are `/{locale}/course/` and contain Chapters 0–39 in English
and Russian. Practical routes are `/{locale}/practical-llm-in-rust/`; English is
the only active practical locale. Chapter 0 explains the structure, and Chapter
1 onward contains learning material.

Keep course identity separate from locale identity in collections, contracts,
catalogs, navigation, cheat sheets and publication checks. Reuse the shared
chapter and index renderers, math pipeline, accessible dialogs and diagram
controller. Preserve the architecture for additional practical locales without
creating Russian practical lessons, indexes, catalogs, sheets or placeholders.
The Russian home chooser may explicitly link to the English practical start.

Canonical English requires two fresh independent reviews and two fresh
same-role adjudications for the exact candidate. Russian home chooser wording
is localized from the passing English source and independently reviewed.
Old review verdicts do not certify newly named practical content. Current
static and sole-Firefox checks remain required before publication.

## Tokenizer example and full-data dependencies

The original Chapter 42 objective continues as practical Chapter 3. Bounded
prepared-document fixtures are authorized before the unfinished bulk NeMo run.
The lesson extends the copied `BpeTrainer` and `BpeTokenizer`; scalar and local
update strategies share the existing layout, merge-rule construction, byte
expansions, document framing and decoding.

No external tokenizer is an oracle, admission check, parity gate or LLM
dependency. A chapter-local Rust example may show the published GPT-2 byte map
and pretokenization policy with an illustrative vocabulary and the existing
course rank engine. It has no pretrained tokenizer IDs or model weights and
adds no foreign-tokenizer assertions or compatibility requirement.

Bounded fixture completion does not close bulk preparation, accepted full-data
selection, source and receipt lineage, protected evaluation boundaries, full
tokenizer training, or measured training/inference resource acceptance. Full
workloads require their own declared inputs, execution authority and measured
evidence. The compatible NVIDIA prerequisite remains for the GPU-backed path;
CPU reference execution and loading prepared documents remain usable on CPU.
NeMo is an external replaceable preparation tool, with its own pinned
CUDA/RAPIDS requirements, and adds no preparation dependency to the Rust model.

This amendment authorizes no download, install, GPU or cloud purchase, remote
execution, paid service, screenshot review, or full-corpus run. Current bounded
development uses already cached pinned containers with networking disabled.
