---
{
  "chapter_id": "17-weight-quantization",
  "concept_id": "weight-quantization",
  "content_revision": 1,
  "order": 17,
  "objective": {
    "en": "Quantize the existing learned matrices with row-local scales, then compare saved storage, reconstruction error and selected-target likelihood without retraining."
  },
  "worked_inputs": {
    "en": "Encode a constructed two-by-four matrix with groups of two and four weights. Follow both reconstructions through the existing matrix product, then quantize one saved model after two updates and load it in separate CPU inference and evaluation programs."
  },
  "formula": {
    "latex": "\\begin{aligned}a&=\\max_{i\\in H}|w_i|,&s&=\\begin{cases}a/7,&a>0,\\\\1,&a=0,\\end{cases}\\\\q_i&=\\operatorname{clamp}(\\operatorname{round}_{\\mathrm{away}}(w_i/s),-7,7),&\\widehat w_i&=s q_i.\\end{aligned}",
    "symbols": [
      { "symbol": "H", "en": "indices of one contiguous group within one matrix row" },
      { "symbol": "i", "en": "index of one weight in that group" },
      { "symbol": "w_i", "en": "source weight at index i, in the matrix's numerical weight units" },
      { "symbol": "a", "en": "largest absolute source weight in the group, in weight units" },
      { "symbol": "s", "en": "positive scale shared by the group, in weight units per integer code step" },
      { "symbol": "\\operatorname{round}_{\\mathrm{away}}", "en": "nearest-integer rounding with halfway values rounded away from zero" },
      { "symbol": "\\operatorname{clamp}(z,-7,7)", "en": "restrict z to the inclusive signed code range from minus seven to seven" },
      { "symbol": "q_i", "en": "dimensionless signed integer code for source weight i" },
      { "symbol": "\\widehat w_i", "en": "reconstructed weight obtained from code i and its group's scale" }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "inference-design",
      "limitation": { "en": "A shared scale makes the largest magnitude determine the spacing available to smaller values; representation alone also leaves execution costs unresolved." },
      "later_advance": { "en": "LLM.int8() combines vector-wise scaling with a separate higher-precision path for transformer outlier features." },
      "modern_llm_role": { "en": "Measure both numerical changes and model scores when reducing stored precision, and distinguish the stored representation from the arithmetic used for inference." },
      "sources": [
        {
          "role": "earlier", "year": 2018,
          "name": "Quantization and Training of Neural Networks for Efficient Integer-Arithmetic-Only Inference",
          "source_url": "https://arxiv.org/pdf/1712.05877",
          "claim": { "en": "Jacob and colleagues describe a scaled affine integer representation and the additional arithmetic needed for integer-only inference. The linked author preprint dates from 2017; the work appeared at CVPR 2018." }
        },
        {
          "role": "later", "year": 2022,
          "name": "LLM.int8(): 8-bit Matrix Multiplication for Transformers at Scale",
          "source_url": "https://papers.nips.cc/paper_files/paper/2022/file/c3ba4962c05c49636d4c6206a97e9c8a-Paper-Conference.pdf",
          "claim": { "en": "Dettmers and colleagues discuss absolute-maximum quantization and combine vector-wise scaling with mixed-precision treatment of transformer outlier features." }
        }
      ]
    },
    "approach": { "en": "Use the existing f64 weights and matrix product as the reference, then replace only the saved weight representation with integer codes and scales." },
    "summary": { "en": "The four-bit row groups, reserved code, tie rule and constructed examples are course choices. The Rust path reconstructs f64 weights before inference and reproduces neither paper's execution method or quality results." },
    "rust_contrast": "Use the original f64 matrix as the reference for the existing matmul, then call that same matmul with its code-and-scale reconstruction. Display the course-owned scalar conversion, grouped encoding and decoding instead of substituting a research implementation."
  },
  "rust": {
    "package": "practical-ch17-weight-quantization",
    "sources": [
      "rust/crates/llm-from-scratch-practical/src/tensor/quantization.rs",
      "rust/crates/llm-from-scratch-practical/src/checkpoint/quantization.rs",
      "rust/demos/practical-ch17-weight-quantization/src/lib.rs",
      "rust/demos/practical-ch17-weight-quantization/src/main.rs"
    ],
    "expected_output": "{\n  \"chapter\": \"17-weight-quantization\",\n  \"comparison_note\": \"Fixed Chapter 16 comparison documents; train is their split label, not the Chapter 15 parent's training corpus.\",\n  \"matrix_probes\": [\n    {\n      \"code_bytes\": 4,\n      \"codes\": [\n        -7,\n        -4,\n        0,\n        7,\n        4,\n        7,\n        0,\n        7\n      ],\n      \"decoded\": [\n        -7.0,\n        -4.0,\n        0.0,\n        3.5,\n        0.1142857142857143,\n        0.2,\n        0.0,\n        7.0\n      ],\n      \"decoded_output\": [\n        -6.771428571428571,\n        -3.6,\n        0.0,\n        17.5\n      ],\n      \"f64_weight_bytes\": 64,\n      \"group_size\": 2,\n      \"input\": [\n        1.0,\n        2.0\n      ],\n      \"original_output\": [\n        -6.8,\n        -3.1,\n        0.6,\n        17.5\n      ],\n      \"output_error\": {\n        \"max_absolute_error\": 0.6,\n        \"mean_squared_error\": 0.152704081633,\n        \"values\": 4\n      },\n      \"packed_hex\": [\n        \"C9\",\n        \"70\",\n        \"74\",\n        \"70\"\n      ],\n      \"scale_bytes\": 32,\n      \"scales\": [\n        1.0,\n        0.5,\n        0.028571428571428574,\n        1.0\n      ],\n      \"shape\": [\n        2,\n        4\n      ],\n      \"weight_error\": {\n        \"max_absolute_error\": 0.5,\n        \"mean_squared_error\": 0.042525510204,\n        \"values\": 8\n      }\n    },\n    {\n      \"code_bytes\": 4,\n      \"codes\": [\n        -7,\n        -4,\n        0,\n        4,\n        0,\n        0,\n        0,\n        7\n      ],\n      \"decoded\": [\n        -7.0,\n        -4.0,\n        0.0,\n        4.0,\n        0.0,\n        0.0,\n        0.0,\n        7.0\n      ],\n      \"decoded_output\": [\n        -7.0,\n        -4.0,\n        0.0,\n        18.0\n      ],\n      \"f64_weight_bytes\": 64,\n      \"group_size\": 4,\n      \"input\": [\n        1.0,\n        2.0\n      ],\n      \"original_output\": [\n        -6.8,\n        -3.1,\n        0.6,\n        17.5\n      ],\n      \"output_error\": {\n        \"max_absolute_error\": 0.9,\n        \"mean_squared_error\": 0.365,\n        \"values\": 4\n      },\n      \"packed_hex\": [\n        \"C9\",\n        \"40\",\n        \"00\",\n        \"70\"\n      ],\n      \"scale_bytes\": 16,\n      \"scales\": [\n        1.0,\n        1.0\n      ],\n      \"shape\": [\n        2,\n        4\n      ],\n      \"weight_error\": {\n        \"max_absolute_error\": 0.5,\n        \"mean_squared_error\": 0.08,\n        \"values\": 8\n      }\n    }\n  ],\n  \"quantized_models\": [\n    {\n      \"comparison_documents\": {\n        \"train\": {\n          \"batches\": 2,\n          \"metrics\": {\n            \"mean_nll_nats_per_target\": 5.442309,\n            \"perplexity\": 230.974776,\n            \"total_nll_nats\": 48.980777,\n            \"valid_targets\": 9\n          },\n          \"recorded_graphs\": 0\n        },\n        \"validation\": {\n          \"batches\": 2,\n          \"metrics\": {\n            \"mean_nll_nats_per_target\": 5.455546,\n            \"perplexity\": 234.052658,\n            \"total_nll_nats\": 49.099915,\n            \"valid_targets\": 9\n          },\n          \"recorded_graphs\": 0\n        }\n      },\n      \"execution\": \"CPU f64 after load-time dequantization\",\n      \"group_size\": 2,\n      \"matrix_weight_error\": {\n        \"max_absolute_error\": 0.057162531282,\n        \"mean_squared_error\": 0.000092861899,\n        \"values\": 1544\n      },\n      \"model_id\": \"cceae534f1ae26a6971d8c5350205615003eb462c156bb2ae5efaefe86a43e26\",\n      \"storage\": {\n        \"file_bytes\": 15340,\n        \"logical_shape_bytes\": 352,\n        \"matrices\": 22,\n        \"matrix_values\": 1544,\n        \"scale_bytes\": 6176,\n        \"total_payload_bytes\": 7604,\n        \"unchanged_payload_bytes\": 304,\n        \"weight_bytes\": 772\n      }\n    },\n    {\n      \"comparison_documents\": {\n        \"train\": {\n          \"batches\": 2,\n          \"metrics\": {\n            \"mean_nll_nats_per_target\": 5.451792,\n            \"perplexity\": 233.175595,\n            \"total_nll_nats\": 49.066126,\n            \"valid_targets\": 9\n          },\n          \"recorded_graphs\": 0\n        },\n        \"validation\": {\n          \"batches\": 2,\n          \"metrics\": {\n            \"mean_nll_nats_per_target\": 5.460701,\n            \"perplexity\": 235.262392,\n            \"total_nll_nats\": 49.146313,\n            \"valid_targets\": 9\n          },\n          \"recorded_graphs\": 0\n        }\n      },\n      \"execution\": \"CPU f64 after load-time dequantization\",\n      \"group_size\": 4,\n      \"matrix_weight_error\": {\n        \"max_absolute_error\": 0.057162531282,\n        \"mean_squared_error\": 0.000156773622,\n        \"values\": 1544\n      },\n      \"model_id\": \"ba40116d31d1d7c25b63fc8b6dca03d0e4a510d3efdc3a29a50ec058948fa12f\",\n      \"storage\": {\n        \"file_bytes\": 12236,\n        \"logical_shape_bytes\": 352,\n        \"matrices\": 22,\n        \"matrix_values\": 1544,\n        \"scale_bytes\": 3088,\n        \"total_payload_bytes\": 4516,\n        \"unchanged_payload_bytes\": 304,\n        \"weight_bytes\": 772\n      }\n    }\n  ],\n  \"reference_updates\": 2,\n  \"source\": {\n    \"comparison_documents\": {\n      \"train\": {\n        \"batches\": 2,\n        \"metrics\": {\n          \"mean_nll_nats_per_target\": 5.415779,\n          \"perplexity\": 224.927749,\n          \"total_nll_nats\": 48.742013,\n          \"valid_targets\": 9\n        },\n        \"recorded_graphs\": 0\n      },\n      \"validation\": {\n        \"batches\": 2,\n        \"metrics\": {\n          \"mean_nll_nats_per_target\": 5.447734,\n          \"perplexity\": 232.231355,\n          \"total_nll_nats\": 49.029607,\n          \"valid_targets\": 9\n        },\n        \"recorded_graphs\": 0\n      }\n    },\n    \"model_id\": \"8f8bb1391d98f406da73979c68f10ea79c9b6af1676f7d142fc19702cb5bec24\",\n    \"storage\": {\n      \"file_bytes\": 15832,\n      \"logical_shape_bytes\": 0,\n      \"matrices\": 22,\n      \"matrix_values\": 1544,\n      \"scale_bytes\": 0,\n      \"total_payload_bytes\": 12656,\n      \"unchanged_payload_bytes\": 304,\n      \"weight_bytes\": 12352\n    }\n  },\n  \"source_unchanged\": true\n}\n"
  },
  "visualization": {
    "decision": "useful", "id": "weight-quantization", "component": "WeightQuantizationDiagram",
    "rationale": { "en": "Follow the same constructed matrix through two group sizes, their code and scale storage, reconstruction and the existing matrix product, so the storage and error comparison keeps one reference." }
  },
  "decoder_connection": {
    "en": "The same encoder, source-independent backbone and tied text head can load reconstructed weights from a smaller saved representation and use the existing CPU evaluator and generator. Lossy weights do not support exact training resume. Planned Chapter 18, Grouped-query attention and context masks, will change attention sharing and permitted context."
  },
  "terminology": [
    { "concept_id": "weight-quantization", "en": "Weight quantization" },
    { "concept_id": "row-group", "en": "Row group" },
    { "concept_id": "absolute-maximum-scale", "en": "Absolute-maximum scale" },
    { "concept_id": "symmetric-signed-code", "en": "Symmetric signed code" },
    { "concept_id": "clipping", "en": "Clipping" },
    { "concept_id": "nibble-packing", "en": "Nibble packing" },
    { "concept_id": "dequantization", "en": "Dequantization" },
    { "concept_id": "reconstruction-error", "en": "Reconstruction error" },
    { "concept_id": "saved-payload", "en": "Saved payload" }
  ],
  "translation_notes": [
    "English is the only active practical-course locale. Retain locale-aware catalogs, the separate cheat sheet and caller-owned diagram labels; the glossary prefix is weight-quantization-term.",
    "Keep integer code units distinct from weight units, a row-local scale group distinct from a packed byte, and a shorter final group distinct from an unused padding nibble. Preserve low-nibble-first ordering and the reserved minus-eight code.",
    "The half-scale error bound assumes ideal real arithmetic and no clipping. Preserve the separate fixed-scale clipping example, represented f64 scale-underflow refusal, twelve-decimal error summaries and six-decimal likelihood summaries.",
    "Keep the constructed matrix separate from learned matrices. Chapter 16 comparison-document train/validation labels do not identify the Chapter 15 parent's training corpus. Code bytes, scale bytes, total tensor payload and complete file bytes are separate quantities.",
    "Orientation revision twelve changes only current availability and row 17 promotion. Preserve all 33 roadmap entries, planned Chapters 18–32 without links, existing Chapter 16 teaching words and all first-course files. The Chapter 18 handoff is planned and unlinked."
  ],
  "acceptance_examples": [
    { "input": "Fit and encode the constructed two-by-four matrix", "expected": "For source rows [-7,-3.5,0,3.5] and [0.1,0.2,0.3,7], group size four has scales [1,1], codes [-7,-4,0,4,0,0,0,7] and bytes C9 40 00 70. Group size two has printed scales [1,0.5,0.028571428571428574,1], codes [-7,-4,0,7,4,7,0,7] and bytes C9 70 74 70. Its source 0.1 reconstructs as printed f64 value 0.1142857142857143." },
    { "input": "Explain rounding, clipping and invalid representations", "expected": "Halfway values plus/minus 0.5 at scale one become plus/minus one. In ideal real arithmetic without clipping, reconstruction error is at most half the scale. Fixed-scale plus/minus ten at scale one clips to plus/minus seven with error three, outside that bound. Reserve code minus eight; reject nonfinite values, invalid scales/counts/shapes, nonzero padding and nonfinite reconstruction. All-zero groups use scale one. The five-weight tail example has scales [1,1] and bytes C9 40 07." },
    { "input": "Compare actual existing matrix products", "expected": "Input [1,2] gives source product [-6.8,-3.1,0.6,17.5], group-four reconstruction product [-7,-4,0,18], and printed group-two product [-6.771428571428571,-3.6,0,17.5]. Across eight weights, both maximum errors are 0.5 and MSEs are 0.042525510204 for group two and 0.08 for group four. Across four products, maxima are 0.6/0.9 and MSEs 0.152704081633/0.365. The ideal local relation is output error x times weight-error matrix, not a transformer-wide quality bound." },
    { "input": "Count the actual learned-model representation", "expected": "The source has 22 matrices and 1544 matrix weights: 12352 weight bytes plus 304 unchanged bytes, 12656 total payload and 15832 full file bytes. Group two uses 772 code, 6176 scale and 352 shape bytes plus 304 unchanged: 7604 payload and 15340 file bytes. Group four uses 772 code, 3088 scale, 352 shape and 304 unchanged: 4516 payload and 12236 file bytes. Tiny code-and-scale subtotals are 36 and 20 versus 64 source weight bytes. Loading restores f64 matrices, so saved-byte reduction proves no smaller live RAM or speedup." },
    { "input": "Score the same two-update learned state after quantization", "expected": "Reuse Chapter 15's two actual updates and Chapter 16's fixed comparison documents without refitting. Each labeled comparison split has nine targets, two batches and zero graphs. Source train/validation NLL is 5.415779/5.447734 and PPL 224.927749/232.231355. Group-two NLL is 5.442309/5.455546 and PPL 230.974776/234.052658; group-four NLL is 5.451792/5.460701 and PPL 233.175595/235.262392. Learned-matrix max error is 0.057162531282 for both; MSE is 0.000092861899/0.000156773622. Both validation scores worsen in this bounded observation. The parent was not trained on the two strings carrying the comparison train label." },
    { "input": "Restore the actual composition and preserve source state", "expected": "The existing PortableModel stores standard U8 codes, F64 scales and U64[2] shapes with the native versioned config-lib descriptor. Quantize all and only rank-two learned matrices, preserve other named records and the source settings/model identity, and restore one tied embedding/head table. A generic backbone requires no tokenizer. Exact training resume rejects packed weights even inside a checksum-valid envelope; inference loading is not exact training continuation." },
    { "input": "Save, exit, quantize, infer and evaluate", "expected": "One retained Docker sh session runs the exact four positive commands: Chapter 15 train until two to parent.safetensors/parent.train, Chapter 17 quantize to group4.safetensors with group size four, unchanged Chapter 15 infer with prompt ab and three tokens, unchanged Chapter 16 evaluate with one batch row. All four programs exit successfully. The latter three report derived identity ba40116d31d1d7c25b63fc8b6dca03d0e4a510d3efdc3a29a50ec058948fa12f; inference reports cpu/f64 and tied_alias true, generated IDs [108,27,159] mapping to bytes [106,25,157], not useful prose. Evaluation retains validation NLL/PPL 5.460701/235.262392 and nine targets without training. The default demo library command executes two tests." }
  ],
  "exercises": [
    { "input": "Inspect fitted scales and contrast fixed-scale clipping", "expected": "At group size four, scale one maps 3.5 to code four and reconstruction four. At group size two, scale 0.5 maps it to code seven and reconstruction 3.5. Fixed-scale ten at scale one clips to seven with error three, so the ideal no-clipping half-scale bound is inapplicable." },
    { "input": "Decode low-first bytes and distinguish a tail from padding", "expected": "C9 stores minus seven first and minus four second. C9 40 07 holds the five real codes from groups of four and one; the last group's scale is real metadata, while the final high zero nibble stores no weight." },
    { "input": "Inspect actual product errors in the default report", "expected": "Both weight maximum errors are 0.5, but their locations and input-weighted column sums differ. Product MSE is 0.152704081633 for group two versus 0.365 for group four. Equal maximum weight error does not determine output error." },
    { "input": "Compare payload, full file size and fixed-document likelihood", "expected": "Equal 772-byte code payloads have different 6176/3088-byte scale payloads and 15340/12236-byte complete files. Both are smaller than the 15832-byte source and have higher validation NLL than 5.447734. These four fixed documents do not establish population quality, speed or live-memory savings." },
    { "input": "Run the saved-model sequence and two demo tests", "expected": "One session retains files across four exited programs. Quantize/infer/evaluate report the same derived model identity; inference is CPU f64 with one tied table, and evaluation reports validation NLL/PPL 5.460701/235.262392 over nine targets, two batches and zero graphs. Neither consumer trains; two library tests pass." }
  ]
}
---

# Practical Chapter 17: Store weights in four bits and measure the error

<!-- contract-section:scope -->
## Scope

Extend the existing tensor, PortableModel and decoder restoration paths with
an explicit lossy weight representation. Keep the existing model, matrix
multiplication, training, evaluation and generation algorithms. Supporting
SafeTensors, config-lib and clap retain their existing roles; do not implement
a second archive codec, settings grammar or command-line parser.

The learner needs the practical tensor/matrix conventions, the text encoder,
source-independent backbone and tied head, Chapter 15 save/load and bounded
resume, and Chapter 16 selected-target likelihood. Author only English Chapter
17, its separate glossary/catalog, the semantic figure and the narrow Chapter
0 availability projection. Preserve existing practical Rust excerpts, Chapter
16 teaching words, all first-course bytes and locale support. Planned Chapter
18 remains unimplemented and unlinked.

<!-- contract-section:worked-inputs -->
## Worked inputs

Explain why saving fewer weight bits introduces an approximation before
notation or optional inspection. Work through W=[[-7,-3.5,0,3.5],
[0.1,0.2,0.3,7]], with W shape [2,4] and x=[1,2] shape [1,2]. Its product
has shape [1,4]. Keep this constructed matrix separate from learned weights.

For group size four, derive scales [1,1], codes and low-first bytes C9 40 00
70. Explain both halfway ties and loss of the small second-row values. For
group size two, derive the four row-local scales and bytes C9 70 74 70.
Preserve the printed third scale 0.028571428571428574 and reconstructed source
0.1 value 0.1142857142857143 as represented f64 observations, not exact real
decimals. Smaller groups improve this fixture's MSE but do not imply universal
monotonic improvement. No prediction tasks belong in the lesson.

<!-- contract-section:formula -->
## Scaled signed integer representation

Render the exact formula and define its actors, group indices, source weight,
absolute maximum, scale units, integer-code units, halfway-away rounding,
clamping and reconstruction locally. Use contiguous groups of at most a
positive g within each row, retaining shorter final groups. Zero point is zero;
the fifteen codes minus seven through seven are valid and minus eight is
reserved. An all-zero group uses scale one and reconstructs zeros without
preserving signed zero.

Prove the ideal no-clipping half-scale absolute error bound by bounding the
rounded ratio's distance by one half and multiplying by the positive scale.
Contrast supplied fixed scale one and plus/minus ten, which saturate at
plus/minus seven and have error three. This is a separate example from
absolute-maximum fitting. Distinguish ideal arithmetic from f64 fitting,
division and multiplication. Explain finite/positive scale checks, possible
scale underflow and nonfinite reconstruction refusal without promising the
ideal inequality as universal exact represented behavior.

Explain four-bit two's-complement nibbles, first code in low bits, continuous
row-major packing, row-local scales and odd-count zero padding. Decode C9 as
minus seven then minus four. A byte can cross a row boundary while its codes
still use different row-local scales. The five-weight example has a shorter
real group and separate unused final high nibble; never conflate the two.

<!-- contract-section:history -->
## Bounded primary-source comparison

Keep Jacob et al.'s CVPR 2018 work and its linked 2017 author preprint distinct
editions. Use the scaled affine representation and its separation from integer
execution. Keep the LLM.int8() account within the NeurIPS 2022 discussion of
absolute-maximum quantization, transformer feature outliers, vector-wise
scaling and mixed precision. Link both primary sources directly. Attribute no
course four-bit policy, tie rule, reserved code, fixture, local quality or byte
count to either paper. The implementation is not LLM.int8(), GPTQ, AWQ or an
integer-only matrix engine.

<!-- contract-section:rust-behavior -->
## Rust behavior and measured tradeoff

Display exactly these nine regions once, with descriptive captions and source
path parity: symmetric-i4-code; grouped-i4-quantize; grouped-i4-validation;
grouped-i4-dequantize; quantized-matrix-probe; portable-weight-quantization;
portable-weight-dequantization; trained-weight-comparison; quantize-saved-model.
The displayed regions use three implementation files. The contract
rust.sources list also registers the thin CLI entry point in
`rust/demos/practical-ch17-weight-quantization/src/main.rs`, without displaying
an additional excerpt. Do not force an unrelated whole-file excerpt or copy
an old algorithm.

Use existing checked layout arithmetic. Refuse invalid shape, code length,
scale count, nonfinite/nonpositive scale, reserved code, nonzero final padding
and nonfinite reconstruction. Retain the separate zero-group, halfway,
fixed-scale clipping, short-group and cross-row packing evidence.

Define maximum absolute error and MSE with their value counts and units. Report
all four matrix/product error summaries and relate ideal output error to xE
and the triangle inequality. The local product identity is not a global
transformer quality guarantee. Round error summaries after calculation to
twelve decimal places, preserving normal f64 printing for scales and decoded
values.

Derive per-matrix code count ceil(N/2), group count R ceil(C/g), f64 scale
bytes 8G, and source weight bytes 8N. For many independent matrices, add
individual ceilings; do not erase padding at matrix boundaries. Separate
tiny code-and-scale subtotals from shape data and complete file sizes. Show
every observed learned-model storage row: source and group sizes two/four,
including 304 unchanged payload bytes, 352 packed-shape bytes and actual
whole-file counts. Standard U8 codes, F64 scales and U64[2] shapes are not
floating F4. Configuration/header overhead belongs to the complete file.

Use one actual Chapter 15 model after two updates; serialize and reload both
derived archives. Quantize all and only rank-two learned matrices. Preserve
gains, constants, text assets and source settings/named records/model identity.
Do not infer generic SafeTensors byte-order determinism. Restore through the
existing logical constructors with one tied embedding/head table. A backbone
archive has no tokenizer requirement. Exact resume refuses packed weights even
in a checksum-valid envelope. Reconstructed execution remains CPU f64; saved
bytes establish no faster kernel or smaller live inference RAM.

The four Chapter 16 comparison strings retain their own split labels; never
claim the Chapter 15 parent was trained on the two comparison train strings.
Both splits have nine selected targets, two batches and zero recorded graphs.
State NLL units and target-weighted perplexity, all source/derived scores,
learned-matrix error counts and six-decimal likelihood display precision.
Both quantized validation NLLs worsen in this observation. No training occurs
during quantization or consumer scoring, and no population-quality, useful
prose, throughput, full-corpus or physical-GPU inference follows.

<!-- contract-section:visualization -->
## Semantic representation and product figure

Register WeightQuantizationDiagram as weight-quantization. Follow one source
matrix to codes plus row-group scales, then to reconstructed f64 weights and
the existing product using one input. Compare both group sizes against that
same original product. Read actual numeric results from the Rust expected
JSON using standard parsing and presentation formatting only; do not implement
quantization, matrix multiplication, metrics or model scoring in the site.

Keep labels caller-owned for future localization. The accessible description
must explain the shared source, two grouping/scaling paths, reconstruction,
same input/product and error reference. A value list or color cue is
insufficient. Use one complete static semantic course-v1 figure, shared cards
and the shared full-view enhancement. Local CSS expresses only grid geometry;
keep every bounded box readable in narrow and expanded presentation without
clipping, shrinking or a private overflow implementation.

<!-- contract-section:exercises -->
## Optional practice and checked answers

After explanation, history, Rust and figure, offer five optional tasks with
checked answers: fitted scales versus clipping; low-first packing and tails;
actual product errors; full storage/likelihood tradeoff; independent saved-model
use and two demo tests. Provide the repository-root working directory, existing
Docker setup, included inputs, copyable supported commands and observable
results. Use COURSE_CORPUS=false and the literal current package/arguments.

The default no-subcommand example prints the exact frozen complete report.
The test command executes two library tests. The complete positive saved-model
flow is one course run sh session with set -eu and a retained
tmp/ch17-quantization-flow directory. Run existing Chapter 15 train until two,
new Chapter 17 quantize at group four, unchanged Chapter 15 infer with prompt
ab and three tokens, then unchanged Chapter 16 evaluate at one row. Preserve
literal file paths and all four positive commands; separate disposable wrapper
invocations lose the file. Each program exits before the next starts.

Compare the quantizer/consumer identity, CPU f64 and tied_alias result,
generated IDs and their byte mapping, and validation score/counts. The IDs do
not demonstrate useful prose. No consumer trains. Equal displayed metrics
establish only their stated display precision. Do not place development,
review, checkpoint or publication workflow inside the learner flow.

<!-- contract-section:decoder-connection -->
## Decoder connection and handoff

Keep the existing encoder/backbone/head and CPU inference/evaluation path.
Quantization changes the saved representation and reconstructed numerical
weights, not the taught model algorithms. Exact training continuation retains
its unquantized state requirement. Planned Chapter 18 is Grouped-query
attention and context masks, unlinked: it concerns attention sharing and
permitted full/cached context rather than a new weight-storage format.

<!-- contract-section:localization -->
## Localization

English is the canonical active practical locale. Keep the registered locale
architecture, caller-owned diagram labels, typed catalog and separate modal
glossary. Preserve code/byte literals, symbol meanings, ordering, unit mappings,
conditions and bounded evidence when later locales are requested.

<!-- contract-section:acceptance -->
## Validation

Require exact default-output binding, source/contract/schema parity, unchanged
earlier excerpts and first-course files, current static math and links, both
URL-base builds and supported Firefox behavior/containment. Require independent
technical/pedagogical and isolated English reviews with their matching fresh
adjudications over the actual frozen bytes. Deterministic machinery does not
provide an English or mathematical publication judgment.
