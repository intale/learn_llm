# Current course-policy evidence

The user defines two separate courses. "LLM from scratch" ends at Chapter 39.
"Practical LLM in Rust" starts at Chapter 0, which explains its structure;
Chapter 1 and later chapters contain learning material. The locale home pages
provide the two starting points.

The first course's implementation and teaching wording are kept at the
user-selected restored baseline, retaining accepted repairs. The first Rust
crate has the 41-file baseline from Git revision
`9f38a060903c472c4d571efd8e52da1f17e553ff`. The 17 declared restored learner and
demo files have the bytes from revision
`a4252dea7232e1e3f16666cb1dde95692cb78887`; the six declared catalog values per
locale are restored without replacing other catalog fields. Exact inventories
and source hashes define these sets. Preservation and route/navigation
boundaries are checked separately; the current language scope consists of the
new course and the chooser. Protected first-course wording is outside that
language scope.

One founding copy of `rust/crates/llm-from-scratch` becomes the sibling crate
`rust/crates/llm-from-scratch-practical`. That copy can evolve independently.
Within each course, existing functionality is reused or extended. A chapter
that actually requires reimplementation must stop for a user decision.

Practical content is available in English only for now. Localization support
remains part of the architecture. The Russian home chooser may identify the
English practical destination explicitly; there is no Russian practical index,
lesson, catalog, cheat sheet or substitute English page presented as Russian.

The current practical material consists of Chapter 0's course structure,
Chapter 1's fixed reference experiment and Chapter 2's corpus-preparation and
Rust-loading boundary. Chapter 3 extends the existing BPE trainer and tokenizer.
Later work follows the separately declared roadmap; a planned chapter is not
an available lesson or a measured capability.

CPU reference execution and loading of prepared documents work on CPU. The
GPU path requires compatible NVIDIA hardware. External NeMo preparation has
its own pinned CUDA/RAPIDS and driver prerequisites and can be replaced by
another supplier of the same tool-neutral prepared-document interchange.
These prerequisites authorize no acquisition, paid service or unperformed run.

Bounded prepared-corpus fixtures may support Chapter 3 before bulk NeMo
preparation is complete. Full-data corpus selection, tokenizer lineage and
artifact integrity, and measured training/inference resource acceptance remain
separate unfinished gates. No foreign tokenizer supplies an implementation or
admission oracle. A chapter-local historical comparison may demonstrate its
declared operations without becoming an LLM compatibility requirement.
