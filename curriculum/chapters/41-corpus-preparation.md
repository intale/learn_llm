---
{
  "chapter_id": "41-corpus-preparation",
  "concept_id": "corpus-preparation",
  "content_revision": 1,
  "order": 41,
  "objective": {
    "en": "Explain how source choices, exclusions, duplicates and evaluation overlap affect a training corpus; prepare a bounded example with NeMo Curator and load its selected documents through a caller-supplied Rust reader."
  },
  "worked_inputs": {
    "en": "Six course-authored documents include two copies of one cat story, two other three-word stories and two short records. NeMo's English word-count rule retains four occurrences; exact duplicate removal leaves three texts. A predeclared known-source-group policy assigns one survivor to each of training, validation and test. Rust loads all three as 39 decoded text bytes, or the selected training story as 11 bytes."
  },
  "formula": {
    "latex": "r_{\\mathrm{keep}}=\\frac{N_{\\mathrm{prepared}}}{N_{\\mathrm{input}}}",
    "symbols": [
      {
        "symbol": "N_{\\mathrm{input}}",
        "en": "the number of document occurrences entering the declared preparation pipeline, including repeated text"
      },
      {
        "symbol": "N_{\\mathrm{prepared}}",
        "en": "the number of documents remaining after those declared preparation stages"
      },
      {
        "symbol": "r_{\\mathrm{keep}}",
        "en": "the dimensionless retained-document fraction for nonempty input; undefined for zero input documents and not a measure of quality"
      }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "model-building-practice",
      "limitation": {
        "en": "Collecting readable text alone does not document its intended use, control the weight of repeated occurrences or protect held-out evaluation from training overlap."
      },
      "later_advance": {
        "en": "Dataset documentation makes source context reviewable; deduplication studies connect repeated training text with memorization and train-test overlap in their measured settings."
      },
      "modern_llm_role": {
        "en": "Keep documented source and selection evidence, inspect exclusions, handle related records together and preserve held-out roles before tokenizer learning or model training. No single preparation statistic certifies suitability."
      },
      "sources": [
        {
          "role": "earlier",
          "year": 2018,
          "name": "Datasheets for Datasets",
          "source_url": "https://arxiv.org/abs/1803.09010v8",
          "claim": {
            "en": "Gebru and colleagues propose documenting dataset motivation, composition, collection and intended uses so those choices can be reviewed."
          }
        },
        {
          "role": "later",
          "year": 2022,
          "name": "Deduplicating Training Data Makes Language Models Better",
          "source_url": "https://aclanthology.org/2022.acl-long.577/",
          "claim": {
            "en": "Lee and colleagues report reduced memorized output and train-test overlap after deduplication in their studied corpora and models; those outcomes are not measurements of this course fixture."
          }
        }
      ]
    },
    "approach": {
      "en": "Compare loading two identical supplied records with externally preparing a selected corpus; a reader preserves occurrences rather than silently curating them."
    },
    "summary": {
      "en": "Source documentation, exclusion counts, duplicate policies and overlap checks answer different questions. Keep their evidence and limitations separate."
    },
    "rust_contrast": "Load two identical caller-supplied JSONL records and preserve both occurrences. This is a course-local contrast between reading records and preparing a corpus, not a Rust reenactment of the primary papers' external preparation algorithms."
  },
  "rust": {
    "package": "ch41-corpus-preparation",
    "sources": [
      "rust/crates/llm-from-scratch/src/data/prepared_corpus.rs",
      "rust/demos/ch41-corpus-preparation/src/lib.rs",
      "rust/demos/ch41-corpus-preparation/src/main.rs"
    ],
    "expected_output": "{\n  \"first_documents\": [\n    {\n      \"id\": \"story-a\",\n      \"metadata_fields\": [\n        \"source_group\"\n      ],\n      \"text_utf8_bytes\": 11\n    },\n    {\n      \"id\": \"story-c\",\n      \"metadata_fields\": [\n        \"source_group\"\n      ],\n      \"text_utf8_bytes\": 11\n    },\n    {\n      \"id\": \"story-d\",\n      \"metadata_fields\": [\n        \"source_group\"\n      ],\n      \"text_utf8_bytes\": 17\n    }\n  ],\n  \"loaded\": {\n    \"documents\": 3,\n    \"text_bytes\": 39\n  }\n}\n"
  },
  "visualization": {
    "decision": "useful",
    "id": "corpus-preparation",
    "rationale": {
      "en": "The source-to-tool-to-JSONL-to-Rust relationship separates external preparation from loading and train-only tokenizer learning. Actual fixture stage and role counts show that document removal and role selection are different operations, not quality guarantees."
    }
  },
  "decoder_connection": {
    "en": "Only the frozen training selection supplies tokenizer learning and later token targets. Validation and test text can be encoded with that learned tokenizer but must not change its learned choices. The external preparation tool does not implement the Rust tokenizer, decoder or training algorithm."
  },
  "terminology": [
    {
      "concept_id": "training-corpus",
      "en": "Training corpus"
    },
    {
      "concept_id": "document-occurrence",
      "en": "Document occurrence"
    },
    {
      "concept_id": "retention-fraction",
      "en": "Retention fraction"
    },
    {
      "concept_id": "exact-deduplication",
      "en": "Exact deduplication"
    },
    {
      "concept_id": "near-duplicate",
      "en": "Near-duplicate"
    },
    {
      "concept_id": "source-group",
      "en": "Source group"
    },
    {
      "concept_id": "held-out-split",
      "en": "Held-out split"
    },
    {
      "concept_id": "decontamination",
      "en": "Decontamination"
    },
    {
      "concept_id": "prepared-document-interchange",
      "en": "Prepared-document interchange"
    }
  ],
  "translation_notes": [
    "English-first Chapter41 under the user's deferred Russian rollout. No Russian learner surface is created or activated."
  ],
  "acceptance_examples": [
    {
      "input": "Run the pinned NeMo recipe on the supplied six-document JSONL with its predeclared source-group policy",
      "expected": "Six input occurrences become four word-count survivors and three exact-deduplicated texts; train/validation/test each contain one document with decoded text byte counts11/11/17. Either cat-story representative ID is valid. This is a bounded tool result, not bulk corpus or trained-model acceptance."
    },
    {
      "input": "Compare retention at the quality stage and duplicate-removal stage",
      "expected": "The fractions are4/6 and3/4; their product is3/6. The duplicate stage's denominator is its own four entering occurrences, not the original six. Zero input has an undefined fraction."
    },
    {
      "input": "Load the separate manually prepared fixture through standard input",
      "expected": "Actual Rust stdout reports3documents and39decodedUTF8textbytes and preserves metadata. Matching aggregate counts does not establish a NeMo producer, rights, privacy, quality or correct split policy."
    },
    {
      "input": "Load only the generated training-role export",
      "expected": "One cat-story document and11decodedtextbytes are loaded. The reader does not infer roles or select a filename; the caller chooses the training-only stream."
    },
    {
      "input": "Provide a malformed later record or exceed a declared read limit",
      "expected": "The reader returns a typed first error and then terminates, without returning/counting the failed document. Prior returned records are not rolled back; the demo produces no success summary."
    },
    {
      "input": "Supply two identical records to the reader",
      "expected": "Both occurrences are returned. The loader contains no filtering, duplicate-removal or split algorithm."
    },
    {
      "input": "Supply an unmapped source group, duplicate policy assignment or prior split metadata",
      "expected": "The external helper refuses without silently choosing or overwriting a split role. Known-source-group assignment is not proof of complete near-duplicate discovery or evaluation decontamination."
    }
  ]
}
---
# Chapter 41: prepare text externally, then load it in Rust

<!-- contract-section:scope -->

## Scope

Replace former Chapters41–43 with one English chapter. Teach why selected text
and preparation evidence must precede tokenizer learning and training. NVIDIA
NeMo Curator owns the demonstrated quality and duplicate-removal operations;
Pandas and standard JSON/I/O libraries own export and supplied-policy joins.
The user-authorized Python/shell exception is limited to this external tool.
All tokenizer/decoder/training implementations remain course-owned Rust.

Rust owns only functional::data::prepared_corpus and the chapter's stdin demo.
No acquisition, filtering, deduplication, split algorithm, dataset identity,
transport or persistence adapter remains in the Rust LLM library for this chapter.
Retained generic cache infrastructure is operational tooling, not LLM teaching.
Preserve Chapter40/scalar sources, old artifacts and source-acquisition receipts.
Defer Russian41+ and existing repairs; no routine image review or screenshots.

<!-- contract-section:worked-inputs -->

## Worked inputs

Use the literal six-row tools/nemo-curator/fixtures/raw.jsonl and freeze its
supplied splits.json before observations. English WordCountFilter(3,20) counts
whitespace-separated items, including !!! as one. Four story occurrences pass;
exact MD5 text-hash grouping and separate removal leave cat/dog/rain once each.
Keep either cat-story ID, not a deterministic representative promise. Pandas
joins family-a/e/f→train, family-b→validation, family-c→test. Known provided
groups are not proof of complete related-source discovery.

Require actual NeMo counts6/4/3, role counts1/1/1 and decoded text bytes11/11/17.
Bind the separate official image/package/source/configuration and actual outputs.
Do not call manually authored prepared fixtures NeMo output. The Rust fixture
and actual all-role NeMo export both load as3/39; training-only NeMo loads1/11.
These equal aggregate quantities do not identify their producer or certify content.

<!-- contract-section:formula -->

## Formula

N_prepared divided by nonzero N_input counts documents, not bytes/tokens/quality.
The stage-local retention fractions4/6 and3/4 multiply to3/6. A zero population
has no fraction. A hypothetical uniform sampler over all-stage documents before
role selection gives the cat text2/4 before dedup and1/3 after; no actual fixture
model is trained and actual token weighting depends on length, splits and batching.
All learner equations and symbol definitions use the math pipeline.

<!-- contract-section:history -->

## Historical evidence

Primary earlier/later source IDs: SRC-DTH-DATA-01, Datasheets (first2018), and
SRC-DTH-DATA-03, Deduplicating Training Data (2022). Also use DATA02's2021C4
exclusion evidence. Bind exact primary URLs, revision/title/year and claim/limit
observations. Dataset documentation, removal statistics and measured language-
model results establish different claims. Do not claim our fixture repeats a
paper's experiment, legal/privacy approval or trained performance.

The Rust contrast deliberately loads two identical JSONL records and returns
both. It illustrates the limitation of loading occurrences alone; it is not a
historical preparation algorithm reimplemented in Rust. Render evolution limits,
advance and modern role locally as well as the two primary source claims.

<!-- contract-section:rust-behavior -->

## Rust behavior

Use PreparedCorpusReader<R:BufRead>, standard buffered I/O and Serde JSON.
One object per physical line, required nonblank string id/text, preserved text
and arbitrary metadata. Accept LF/CRLF/final no-LF; blank records fail. No
normalization, hidden filtering, duplicate suppression or split inference.

Caller-selected positive bounds limit source-record bytes including line ending,
successful document count and cumulative decoded UTF8textbytes. Read at most
recordcap+1 bytes, use checked arithmetic, count only returned successes. First
error terminates the iterator; prior returned documents remain returned, the
failed document is not counted. A caller needing atomic storage supplies staging.
The demo prints its bounded first-three summary only after complete successful
input. No dataset path, HTTP, filesystem destination, DB layout or GPU is needed.

<!-- contract-section:visualization -->

## Visualization

One corpus-preparation static semantic figure uses actual NeMo/Rust trace data,
not invented result text. Reading order: source/policy, external preparation,
JSONL/Rust boundary, then distinct role cards and train-only tokenizer learning.
Document counts and decoded UTF8textbytes are separately named. Show retention
as server-rendered math and keep evidence limits local. All source-group role
claims are for the supplied fixture, not universal decontamination.

Use shared diagram styling/full view, geometry-only component CSS, one tree,
complete individual-card and formula containment, narrow reflow and redundant
text role labels. Programmatic Firefox checks remain; no image approval pass.

<!-- contract-section:exercises -->

## Exercises

Optional reproduction/explanation, not prediction. Every command states cwd,
prerequisites and observable result. Build only the separate official NeMo image
with provisioning network, then runtime network_none/NVIDIA with read-only
recipe/input and fresh writable output. Include --split-policy for role exports.
Retain report and each report-listed file; failed/incomplete attempts are not
accepted as prepared output. This is not a multi-file crash transaction.

Provide copyable all-role and train-only Rust stdin commands, separate manual
fixture command and exact malformed-later-input test command selecting one test.
Explain why matching counts are not producer/quality evidence and why successful
stream loading cannot undo prior writes by a different caller.

<!-- contract-section:decoder-connection -->

## Decoder connection

New Chapter42 learns BPE only from frozen training JSONL readers and the full
prepared-corpus lifecycle receipt. It may encode held-out text with the learned
tokenizer, but held-out text cannot affect vocabulary/merges. Preserve original
tokenizer byte/tie/token policies and all unrelated model/resource boundaries.
The actual bulk NeMo job remains a separate required predecessor, not a use of
historical handwritten filtered results as evidence for a new tool.

<!-- contract-section:localization -->

## Localization

English-first41 under the explicit override. No Russian prose/catalog/sheet,
placeholder, language review or publication. Preserve localization architecture
and bilingual0–40. Obtain two fresh English reviews and two additional fresh
same-role adjudications for identical source/HTML/role inventory before publish;
author cannot self-certify. Exact canonical prompts/raw bytes/receipts apply.

<!-- contract-section:acceptance -->

## Acceptance

Pass actual bounded NeMo GPU execution, six supplied-policy/input helper tests,
13 Rust reader and3demo tests, exact demo stdout and intended learner commands.
Full migrated ownership/source census, shared operational consumers/tests,
44-entry renumbered planning inventory, revision2compatibility and unchanged
resource/oracle/modality boundaries must pass in a complete deletion overlay.

Pass contract/lesson/catalog/sheet/source/math agreement, static build/links,
sole-Firefox behavior/accessibility/layout and exact four English judgments.
Record durable primary-source observations and output inventory. Preserve old
approved candidates/receipts as history; do not mutate old completed runs.
The small exercise does not clear full-corpus privacy/rights/near-duplicate/
protected-evaluation/resource gates. Those have a separately named bulk owner.
