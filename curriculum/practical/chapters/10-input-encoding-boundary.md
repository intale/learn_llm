---
{
  "chapter_id":"10-input-encoding-boundary","concept_id":"input-encoding-boundary","content_revision":2,"order":10,
  "objective":{"en":"Separate source-to-vector encoding, causal hidden features and text logits while preserving the existing model's values, gradients and shared embedding table."},
  "worked_inputs":{"en":"Encode the text ab with the existing empty-merge BPE, giving document IDs [0,99,100,1]. Compose inputs [0,99,100] and targets [99,100,1] with seed 39, vocabulary 258, residual width four and two existing decoder blocks. Inspect the shared-table gradient and cached prefill [0,99] followed by token 100."},
  "formula":{
    "latex":"\\begin{aligned}\nX_{b,t,d}&=E_{i_{b,t},d},\\\\\nH&=F_\\theta(X;\\Lambda),\\\\\nZ_{b,t,v}&=\\sum_{d=0}^{D-1}H_{b,t,d}E_{v,d},\\\\\n\\nabla_E\\mathcal L&=G_{\\mathrm{lookup}}+G_{\\mathrm{head}}.\n\\end{aligned}",
    "symbols":[
      {"symbol":"B","en":"number of batch rows"},
      {"symbol":"T","en":"number of supplied positions per row"},
      {"symbol":"D","en":"number of residual features at each position"},
      {"symbol":"V","en":"number of entries in the text vocabulary"},
      {"symbol":"b,t,d,v","en":"zero-based batch-row, position, residual-feature and vocabulary-entry indices"},
      {"symbol":"i_{b,t}","en":"text token ID at row b and position t, selecting one table row"},
      {"symbol":"E","en":"one live learned text table, with a row per vocabulary entry and residual-width features, shared by lookup and the transposed text head"},
      {"symbol":"X","en":"prepared batch of residual-width input vectors, one vector per supplied position"},
      {"symbol":"F_\\theta","en":"the existing causal backbone, with backbone parameters theta"},
      {"symbol":"\\Lambda","en":"checked active lengths, causal range starts and RoPE positions supplied with the vectors"},
      {"symbol":"H","en":"final-normalized residual-width hidden features at each supplied position"},
      {"symbol":"Z","en":"text logits, with one score per vocabulary entry at each supplied position"},
      {"symbol":"\\mathcal L","en":"scalar text loss formed from logits, targets and any valid-target mask outside the backbone"},
      {"symbol":"G_{\\mathrm{lookup}},G_{\\mathrm{head}}","en":"the two contributions to the same table gradient at fixed numerical weights, input and loss"}
    ]
  },
  "history":{
    "llm_evolution":{
      "predecessor_kind":"model-building-practice",
      "limitation":{"en":"A language model can learn different matrices for input lookup and output vocabulary projection. Tying instead constrains those two roles to one parameter."},
      "later_advance":{"en":"Section 3.4 of the 2017 Transformer paper describes learned token embeddings and the final linear/softmax transform as separate operations while sharing selected weight matrices."},
      "modern_llm_role":{"en":"Separating components does not require separate learned storage: both text operations borrow one live table and add their derivative contributions."},
      "sources":[
        {"role":"earlier","year":2017,"name":"Using the Output Embedding to Improve Language Models","source_url":"https://aclanthology.org/E17-2025/","claim":{"en":"Press and Wolf's 2017 paper studies sharing input and output embeddings and the update of the common parameter. Its reported language-model results are not measurements of this course fixture."}},
        {"role":"later","year":2017,"name":"Attention Is All You Need","source_url":"https://arxiv.org/html/1706.03762v7#S3.SS4","claim":{"en":"Section 3.4 of the 2017 Transformer paper describes learned token embeddings and the final linear/softmax transform as separate operations while sharing selected weight matrices. The course's existing RMSNorm, RoPE and SwiGLU operations are its own decoder architecture, with different normalization and position treatment from that paper."}}
      ]
    },
    "approach":{"en":"Use the existing text lookup and vocabulary projection in separate borrowing components, then fix one role at a time to inspect the common table's two derivative contributions."},
    "summary":{"en":"Separating the operations makes their roles visible. Weight tying still means one learned allocation, with both roles contributing to its gradient; the tiny fixture establishes no quality or performance benefit."},
    "rust_contrast":"Compose the existing text lookup, backbone and transposed live table. For the same numerical weights, input and loss, fix a detached head table to isolate the lookup derivative, then fix detached text embeddings to isolate the head derivative. Production retains both paths; no second learned table or new algorithm is introduced."
  },
  "rust":{
    "package":"practical-ch10-input-encoding-boundary",
    "sources":[
      "rust/crates/llm-from-scratch-practical/src/models/prepared_decoder_input.rs",
      "rust/crates/llm-from-scratch-practical/src/models/text_input.rs",
      "rust/crates/llm-from-scratch-practical/src/models/causal_decoder_core.rs",
      "rust/demos/practical-ch10-input-encoding-boundary/src/lib.rs",
      "rust/demos/practical-ch10-input-encoding-boundary/src/main.rs"
    ],
    "expected_output":"{\"chapter\":\"10-input-encoding-boundary\",\"composition\":{\"first_embedding_bits\":[\"3fb7bbb321b0174c\",\"3fbee29afb04fe46\",\"bfa3a2f9e673205b\",\"3fa47d03ace7074c\"],\"loss\":5.668398842431571,\"loss_bits\":\"4016ac70bf03b620\",\"same_text_wrapper_logits\":true},\"execution\":{\"cached\":{\"attention_score_values\":12,\"cache_appends\":6,\"graph_free\":true,\"newest_logit_bit_mismatches\":0,\"prefix_tokens\":3,\"token_forwards\":3},\"full_no_grad_hidden_graph_free\":true},\"fixture\":{\"document_ids\":[0,99,100,1],\"input_ids\":[0,99,100],\"seed\":39,\"targets\":[99,100,1],\"text\":\"ab\"},\"gradients\":{\"absolute_tolerance\":1e-12,\"max_partition_error\":0.0,\"sample\":{\"feature\":0,\"head_path\":-0.0014913707928583008,\"lookup_path\":0.02265892535638777,\"row\":99,\"total\":0.021167554563529468},\"within_tolerance\":true},\"parameters\":{\"lookup_and_head_same_node\":true,\"scalars\":1372,\"tensors\":20},\"refusals\":{\"tracked_input_under_no_grad\":\"graph-recording mode\",\"wrong_width\":\"B,T,D or admitted row count\"},\"scope\":\"one CPU/f64 text fixture; other input encoders and GPU execution are not implemented\",\"shapes\":{\"embedding\":[1,3,4],\"hidden\":[1,3,4],\"logits\":[1,3,258],\"table\":[258,4]}}\n"
  },
  "visualization":{"decision":"useful","id":"input-encoding-boundary","component":"InputEncodingBoundaryDiagram","rationale":{"en":"One figure connects text IDs, shared-table lookup, residual vectors, the existing backbone, hidden features and the transposed text head. Both derivative paths meet at one shared table, counted once."}},
  "decoder_connection":{"en":"Chapter 11 will add GPU numerical execution behind a narrow execution boundary while preserving this encoder, backbone and head composition and CPU inference. Chapter 15 will restore the composition and shared parameter aliases when persistence is implemented."},
  "terminology":[
    {"concept_id":"input-encoder","en":"Input encoder"},
    {"concept_id":"prepared-decoder-input","en":"Prepared decoder input"},
    {"concept_id":"sequence-layout","en":"Sequence layout"},
    {"concept_id":"decoder-backbone","en":"Decoder backbone"},
    {"concept_id":"text-output-head","en":"Text output head"},
    {"concept_id":"weight-tying","en":"Weight tying"},
    {"concept_id":"live-parameter-binding","en":"Live parameter binding"}
  ],
  "translation_notes":["Deliver English only and retain locale-aware practical content, catalog and glossary structures. Use glossary prefix input-encoding-term. Keep formulas, shapes, API names, source regions, literal IDs, gradient-path distinctions, live parameter identity and the text-only implementation scope exact. Retain shared diagram presentation and caller-owned figure copy."],
  "acceptance_examples":[
    {"input":"Encode ab through the existing empty-merge BPE and select the next-token fixture","expected":"Document IDs [0,99,100,1], input IDs [0,99,100], targets [99,100,1]. With seed39,V258,D4,L2,H1,F8,C8,RoPEbase10000 and RMSepsilon1e-6, X/H shape[1,3,4], Z shape[1,3,258], E shape[258,4]."},
    {"input":"Compose TextInputEncoder, DecoderBackbone and TextOutputHead","expected":"The actual wrapper uses the same composition; identical logit bits and loss5.668398842431571, bits4016ac70bf03b620. Same live lookup/head table node. Preserve1372unique learned scalars and20named tensors, with the1032-scalar table counted once."},
    {"input":"Partition the same table derivative with the same numerical weights, input and loss","expected":"Fix a detached output table to isolate lookup-path derivative, then fix detached text embeddings to isolate head-path derivative. Maximum absolute partition error0.0, compared with declared absolute tolerance1e-12. At row99,feature0, lookup0.02265892535638777 plus head-0.0014913707928583008 gives total0.021167554563529468. Production keeps both paths."},
    {"input":"Construct a backbone from existing blocks, final RMSNorm and DecoderBlockConfig","expected":"No DecoderModel, text vocabulary, tokenizer or output table is required by the borrowing backbone. Text-derived vectors pass the public checked full entry. Learned values are not copied, and one transformer loop serves full and internal cached execution."},
    {"input":"Supply malformed width/layout/position, graph-tracked vectors under no-grad, wrong or changed backbone parameters, or a changed learned producer","expected":"Refuse at the checked vector boundary before any block. Exact embedding and parameter nodes/revisions plus read guards protect live state. A descriptive provenance string does not authorize vectors or substitute for these checks."},
    {"input":"Prefill [0,99] and decode100 through the existing text cache","expected":"Prefix length3, token forwards3, cache appends6, attention-score values12, graph-free logits and zero newest-full/cached logit bit mismatches in this CPU/f64 fixture. Cache layer tickets publish only after the text head succeeds; no public generic source cache session is added."},
    {"input":"Run the focused public-boundary and demo library checks","expected":"The repository-root Docker-backed commands select6boundary tests and1demo library test. Validate old exact-output demonstrations and all old traces freshly; baseline success is not a post-refactor result."}
  ],
  "exercises":[
    {"input":"Explain why detaching only the experimental head table leaves a lookup contribution to the original table","expected":"The head table's numerical values are fixed, removing its direct gradient connection. The original lookup still differentiates through backbone and head hidden input. Fixing the text embeddings instead isolates the direct head contribution; production retains both."},
    {"input":"Trace the malformed text-derived shape[1,1,3] into a width-four backbone","expected":"PreparedDecoderInput rejects the feature mismatch with B,T,D or admitted row count before a block runs. The shape is neither padded nor truncated nor interpreted as token IDs."},
    {"input":"Identify which worked-input data belong to the backbone, text encoding and text loss","expected":"Backbone consumes checked vectors/layout/context/live bindings. Text IDs and tokenizer/batch-source validation belong to encoding; targets[99,100,1] and valid-target masks belong to loss. Compatible width alone establishes no other-source understanding or training."}
  ]
}
---
# Practical Chapter 10: separate input encoding from the transformer

<!-- contract-section:scope -->
## Scope

Extend the existing prepared-input seam into a real source-to-vector boundary.
Implement InputEncoder, a checked public PreparedDecoderInput and SequenceLayout,
the borrowing DecoderBackbone, and TextInputEncoder/TextOutputHead using existing
lookup, decoder and autodiff operations. The generic backbone accepts vectors
and returns hidden features without a tokenizer, token ID, vocabulary, text split
identity, targets or tied output-table requirement. Only text encoding is
implemented or used as a worked source. The first course remains unchanged.

Route real ordinary, padded/packed, optional-dropout/replay, loss and cached text
calls through this composition. Preserve learned nodes, names/order/counts,
weight tying and operation order. Maintain one full/cached transformer loop;
the generic cached entry remains internal to the existing transactional text
cache. No second decoder, tokenizer, embedding/autodiff algorithm, registry,
parser, dependency, non-text adapter or GPU implementation belongs here.

<!-- contract-section:worked-inputs -->
## Worked inputs

The existing empty-merge BPE encodes `ab` as `[0,99,100,1]`. Use input
`[0,99,100]`, target `[99,100,1]`, seed `39`, $V=258,D=4,L=2,F=8,C=8$,
one attention head, RoPE base $10000$ and RMSNorm epsilon $10^{-6}$.
Here $L$ counts blocks, $F$ is feed-forward width and $C$ is position
capacity. Use no corpus or model acquisition.

Observe $X,H$ with shape $[1,3,4]$, $Z$ with $[1,3,258]$ and table $E$
with $[258,4]$. The table contains $1032$ scalars, each block $168$, and
final norm $4$, giving $1032+2\cdot168+4=1372$ scalars in $20$ named tensors.
Count the shared table once. Loss is $5.668398842431571$ nats with bits
`4016ac70bf03b620`. Prefill `[0,99]`, then decode `100` through the existing
text cache.

<!-- contract-section:formula -->
## Formula

Define $B$ batch rows, $T$ positions per row, $D$ residual features per
position and $V$ text vocabulary entries. Text lookup uses
$X_{b,t,d}=E_{i_{b,t},d}$ for token IDs $0\le i_{b,t}<V$ and table shape
$[V,D]$. The existing causal backbone gives $H=F_\theta(X;\Lambda)$,
preserving shape $[B,T,D]$. Its $\theta$ comprises blocks and final RMSNorm;
$\Lambda$ gives active lengths, causal range starts and explicit RoPE
positions. The head gives $Z=HE^{\mathsf T}$ with shape $[B,T,V]$.
Text targets and valid-target masks belong to the scalar loss $\mathcal L$,
outside the backbone.

At identical numerical parameters, input and loss, the shared-table chain rule
adds lookup-path and direct head-path derivatives. A detached output table fixes
only the head occurrence and isolates lookup; detached text embeddings fix
lookup and isolate the head. Clear accumulated gradients between observations.
Production retains both paths into one live parameter. Compare every one of
the $1032$ table coordinates with declared absolute error less than $10^{-12}$.
Measured maximum is zero. Row $99$, feature $0$ has lookup
$0.02265892535638777$, head $-0.0014913707928583008$ and total
$0.021167554563529468$. Rounded displays must use explicit approximation.
No general claim about path magnitudes or signs follows.

<!-- contract-section:history -->
## History

Use Press and Wolf's 2017 paper for sharing input/output embedding parameters
and their common update; use section 3.4 of the 2017 Transformer paper for the
separate embedding and final vocabulary operations and selected weight sharing.
An untied alternative may use separate matrices. Tying constrains one shared
allocation and adds both roles' gradient contributions. Cite each primary
source near its supported claim and do not infer paper-level quality benefits
from this fixture.

The Rust contrast reuses the existing lookup, transpose/matmul and detach to
inspect the shared parameter. The input encoder here is a source-to-vector
adapter, not the bidirectional encoder stack in the original Transformer.
Do not attribute the course's RMSNorm, RoPE, SwiGLU, settings or numerical
observations to that paper's different architecture.

<!-- contract-section:rust-behavior -->
## Rust behavior

InputEncoder receives an explicit graph context and destination backbone.
SequenceLayout owns shape, active row-prefix lengths, causal range starts per
cell and explicit RoPE positions. PreparedDecoderInput retains the embedding
handle and checked shape/layout/context, descriptive provenance, backbone
configuration/identity and exact live backbone and learned-producer bindings.
Text source identity and validity checks stay in TextInputEncoder; target
eligibility stays with text loss. Provenance text is descriptive, never live
parameter authorization.

Reject wrong width/layout/position, graph-tracked prepared vectors under
no-grad, incompatible or changed backbone nodes/revisions, changed producer
revisions and replaced embedding handles before any block. Retain value read
guards through backbone consumption and through the normal text wrapper's head.
Use text-derived refusal and component-construction tests only.

DecoderBackbone borrows blocks/final norm and can be assembled from their
existing configuration and components without DecoderModel or text assets.
It returns final-normalized hidden features. TextOutputHead borrows the live
lookup table and reuses transpose/matmul; no learned values or parameters are
duplicated. Ordinary/padded/packed/dropout/replay/loss/cache routes use this
composition. Positioned text encoding supplies a position, independently of
full or cached transformer execution. Numerical execution remains CPU `f64`.

Cached text chooses no-grad before lookup, holds the existing session binding
and publishes layer tickets only after the text head succeeds. The fixture
reaches length $3$ with $3$ token forwards, $6$ layer appends and $12$ attention
scores, graph-free logits and zero newest-full/cached bit mismatches. Preserve
existing cache/dropout failure guarantees at their own operation boundaries;
they do not promise optimizer or whole-job rollback.

<!-- contract-section:visualization -->
## Visualization

Use one static semantic figure, ID `input-encoding-boundary`, implemented by
InputEncodingBoundaryDiagram. Show text IDs selecting shared-table rows,
$X[B,T,D]$ entering the existing backbone, $H[B,T,D]$ leaving it and the same
$E^{\mathsf T}$ producing text logits $Z[B,T,V]$. Both derivative paths join
at one table, counted once. Define fixture axis counts locally: one row,
three positions, four residual features and $258$ text vocabulary scores.
The shared $[258,4]$ table has $1032$ scalars; $1372$ scalars/$20$ tensors
describe the complete model.

Use the shared `course-v1` diagram roles, caller-owned labels, server-rendered
math and bounded-box markers. Reflow this complete relationship at narrow
widths. No private scripts, screenshots, expanded controls, duplicated tree,
clipping, truncation or reduced type. Existing shared presentation owns full
view and forced colors.

<!-- contract-section:exercises -->
## Exercises

After the explanation and history, give optional reproduction and three checked
explanations: isolate the lookup derivative by fixing the head table; trace a
three-feature text-derived vector to a width refusal; place text IDs, targets
and valid-target masks on their proper side of the boundary. No opening
prediction task, non-text encoder or application integration exercise.

From repository root, document Docker and initial image/toolchain provisioning
as prerequisites. Use `COURSE_CORPUS=false ./course run` with locked offline
Cargo and no new arguments/parser. Reproduce the no-argument demo with
`cargo run --offline --locked -p practical-ch10-input-encoding-boundary`.
Select six boundary tests with
`cargo test --offline --locked -p llm-from-scratch-practical --lib models::prepared_decoder_input::tests`
and one demo test with
`cargo test --offline --locked -p practical-ch10-input-encoding-boundary --lib`.
State the expected JSON fields and nonzero test counts. These prepared inner
commands do not establish that a fresh outer image build was executed.

<!-- contract-section:decoder-connection -->
## Decoder connection

Chapter 11 will add GPU numerical execution behind a narrow execution boundary
and preserve this encoder/backbone/head composition and CPU inference.
Chapter 15 persistence must restore the actual composition, relevant text
assets and shared parameter aliases, saving the tied table once. Neither
capability is implemented here. Do not link unpublished chapter routes.
Other sources require compatible encoding, training and any additional mask
or objective semantics; this interface alone establishes no such capability.

<!-- contract-section:localization -->
## Localization

Deliver English only. Keep locale-aware content/catalog/sheet structures and
glossary prefix `input-encoding-term`, with the exact seven chapter-used terms.
Chapter 7 receives revision two only for the historical private seam and evolved
live source descriptions; preserve its formulas, numeric evidence, commands,
exercises and sheet bytes. Do not edit Chapter 9, orientation or the first course.

<!-- contract-section:acceptance -->
## Acceptance

Bind the no-argument demo stdout exactly to expected output and the course trace.
The public-boundary six tests and demo one test must execute. Freshly validate
the current core suite, the Chapter 7–9 demo libraries, all old exact-output
demos and all old traces. The pre-refactor baseline already passed $605$ core
tests, six Chapter 7–9 library tests, $39$ first-course and nine practical
golden demos and $34$ old traces; those observations alone are insufficient
post-refactor evidence.

The frozen text probe compares exact embeddings, hidden features, logits, loss,
every named value and gradient, and cache observations across the separation.
Retain operation order and parameter identity/counts and require the exact
fixture comparison. Separate generic malformed/stale checks from any external
tokenizer comparison; no foreign tokenizer equivalence gate exists. Keep
fixture, ideal derivative and represented-arithmetic scope distinct. No GPU,
full-data training, performance or quality conclusion is established.
