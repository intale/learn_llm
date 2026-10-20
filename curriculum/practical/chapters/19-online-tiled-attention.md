---
{
  "chapter_id": "19-online-tiled-attention",
  "concept_id": "online-tiled-attention",
  "content_revision": 1,
  "order": 19,
  "objective": {
    "en": "Compute causal attention with running maxima, normalization sums and value sums, then reconstruct tiled gradients while preserving the existing model."
  },
  "worked_inputs": {
    "en": "Use four text-derived query/key/value rows to follow two successive key tiles, compare all output and input-gradient coordinates with dense attention, and inspect the same restored text model under tiled execution."
  },
  "formula": {
    "latex": "\\begin{aligned}s_j&=\\langle q,k_j\\rangle/\\sqrt d,\\\\a&=\\max_{j\\in J}s_j,\\quad m'=\\max(m,a),\\\\\\alpha&=\\exp(m-m'),\\quad p_j=\\exp(s_j-m'),\\\\\\ell'&=\\alpha\\ell+\\sum_{j\\in J}p_j,\\\\u'&=\\alpha u+\\sum_{j\\in J}p_jv_j,\\\\o&=u/\\ell.\\end{aligned}",
    "symbols": [
      { "symbol": "q", "en": "fixed active query vector with d features" },
      { "symbol": "k_j", "en": "key vector with d features at zero-based key cell j" },
      { "symbol": "d", "en": "positive query/key feature count used in score scaling" },
      { "symbol": "s_j", "en": "dimensionless scaled dot-product score for this query and key j" },
      { "symbol": "j", "en": "zero-based sequence-cell index of a key" },
      { "symbol": "J", "en": "nonempty set of this tile's eligible key-cell indices for the fixed query" },
      { "symbol": "a", "en": "maximum score among the eligible keys in the current tile" },
      { "symbol": "m", "en": "maximum score over previously consumed eligible keys; initially negative infinity" },
      { "symbol": "m'", "en": "updated running maximum after including the current tile" },
      { "symbol": "\\alpha", "en": "dimensionless factor that rescales the previous sums to the updated maximum; explicitly zero for the first contributing tile" },
      { "symbol": "p_j", "en": "dimensionless shifted exponential weight for key j, before final normalization" },
      { "symbol": "\\ell", "en": "sum of previous shifted exponential weights; initially zero and positive after a contributing tile" },
      { "symbol": "\\ell'", "en": "updated shifted exponential sum after rescaling and adding the current tile" },
      { "symbol": "u", "en": "previous unnormalized weighted value vector; initially the zero vector" },
      { "symbol": "u'", "en": "updated unnormalized weighted value vector after rescaling and adding the current tile" },
      { "symbol": "v_j", "en": "value vector at key cell j, with the same feature count as u and o" },
      { "symbol": "o", "en": "final attention output vector, obtained by dividing the completed weighted value sum by its normalizer" }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "inference-design",
      "limitation": { "en": "Materialized attention stores a score and a probability for every query-key coordinate, so these intermediate grids grow quadratically with sequence length even though the output is a vector per query." },
      "later_advance": { "en": "Stable running summaries allow attention to consume key/value tiles; reconstructing probabilities during backward avoids retaining their complete grid." },
      "modern_llm_role": { "en": "Evaluate the same decoder attention with smaller explicit intermediate buffers while keeping logical storage, GPU memory traffic and measured speed as separate claims." },
      "sources": [
        {
          "role": "earlier", "year": 2018,
          "name": "Online normalizer calculation for softmax, version 1, 8 May 2018",
          "source_url": "https://arxiv.org/abs/1805.02867v1",
          "claim": { "en": "Milakov and Gimelshein's Algorithm 3 updates a running maximum and rescales the previous exponential normalizer when that maximum changes." }
        },
        {
          "role": "later", "year": 2022,
          "name": "Self-attention Does Not Need O(n²) Memory, version 3, 10 October 2022; initially released in 2021",
          "source_url": "https://arxiv.org/abs/2112.05682v3",
          "claim": { "en": "Rabe and Staats describe stable weighted attention summaries, query/key chunking and recomputation of chunk intermediates during differentiation." }
        },
        {
          "role": "later", "year": 2022,
          "name": "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness, version 1, 27 May 2022",
          "source_url": "https://arxiv.org/abs/2205.14135v1",
          "claim": { "en": "Dao and colleagues combine tiling, recomputation and fused GPU execution to reduce attention reads and writes between high-bandwidth memory and on-chip SRAM." }
        }
      ]
    },
    "approach": { "en": "Keep the existing dense attention as an inspectable reference and add output-oriented tiled evaluation through the same projections, layouts, tensor executor and autodiff tape." },
    "summary": { "en": "The course implements host-backed tiled attention and reports bounded CPU f64 comparisons and logical payload counts. It does not reproduce a fused FlashAttention kernel or measure GPU traffic, speed or language quality." },
    "rust_contrast": "Compare the existing materialized causal attention with stable tiled evaluation of the same eligible scores and values; reconstruct input gradients from saved linear-size state instead of retaining dense probability grids."
  },
  "rust": {
    "package": "practical-ch19-online-tiled-attention",
    "sources": [
      "rust/crates/llm-from-scratch-practical/src/attention/online.rs",
      "rust/crates/llm-from-scratch-practical/src/attention/multi_head.rs",
      "rust/crates/llm-from-scratch-practical/src/tensor/execution.rs",
      "rust/demos/practical-ch19-online-tiled-attention/src/lib.rs",
      "rust/demos/practical-ch19-online-tiled-attention/src/tests.rs",
      "rust/demos/practical-ch19-online-tiled-attention/src/main.rs"
    ],
    "expected_output": "{\"arithmetic\":\"f64\",\"execution_device\":\"Cpu\",\"gradient_comparison\":[{\"absolute_tolerance\":1e-10,\"compared_coordinates\":4,\"max_abs_error\":2.220446049250313e-15,\"operand\":\"query\",\"reference_gradient\":[0.0,0.25559551321392643,0.08488090893785102,1.2331725497110144],\"tiled_gradient\":[0.0,0.25559551321392643,0.08488090893785086,1.2331725497110166],\"within_tolerance\":true},{\"absolute_tolerance\":1e-10,\"compared_coordinates\":4,\"max_abs_error\":5.551115123125783e-16,\"operand\":\"key\",\"reference_gradient\":[-0.4437808622020972,-0.03271096962781736,-0.176884446000867,0.6533762778307811],\"tiled_gradient\":[-0.4437808622020972,-0.03271096962781728,-0.17688444600086686,0.6533762778307817],\"within_tolerance\":true},{\"absolute_tolerance\":1e-10,\"compared_coordinates\":8,\"max_abs_error\":1.3877787807814457e-17,\"operand\":\"value\",\"reference_gradient\":[1.011691211613217,0.09200559573620226,0.0317800080808774,0.11418304758331536,0.4838316684403387,0.012298215889444592,0.7726971118655668,0.05151314079103779],\"tiled_gradient\":[1.011691211613217,0.09200559573620226,0.031780008080877414,0.11418304758331536,0.4838316684403387,0.012298215889444592,0.7726971118655668,0.05151314079103779],\"within_tolerance\":true}],\"key_tile\":2,\"model_comparison\":{\"absolute_tolerance\":1e-10,\"all_outputs_graph_free\":true,\"compact_reports_omit_dense_intermediates\":true,\"compared_cached_logits\":1548,\"compared_full_logits\":5418,\"completed_training_updates\":0,\"kv_heads\":2,\"max_abs_cached_logit_error\":3.885780586188048e-16,\"max_abs_full_logit_error\":3.885780586188048e-16,\"model_id_after\":\"234d9d80f5d63091842fbf7b3cef7ac867aefd20732853a1a463c5b594f3f1f2\",\"model_id_before\":\"234d9d80f5d63091842fbf7b3cef7ac867aefd20732853a1a463c5b594f3f1f2\",\"one_tied_table\":true,\"prefix_rows\":6,\"query_heads\":4,\"window\":2,\"within_tolerance\":true},\"query_tile\":2,\"scope\":\"logical f64 payloads and bounded numerical comparisons; no timing, HBM traffic, peak process memory, full-corpus training or model-quality measurement\",\"storage_comparisons\":[{\"absolute_tolerance\":1e-10,\"f64_bytes\":8,\"key_shape\":[1,2,8,2],\"max_abs_output_error\":8.326672684688674e-17,\"query_shape\":[1,4,8,2],\"reference_probability_values\":256,\"reference_score_values\":256,\"tiled\":{\"eligible_scores\":144,\"input_values\":128,\"maximum_score_tile_values\":4,\"maximum_temporary_values\":20,\"output_values\":64,\"processed_tiles\":40,\"row_statistic_values\":64},\"tokens\":8,\"value_shape\":[1,2,8,2],\"within_tolerance\":true},{\"absolute_tolerance\":1e-10,\"f64_bytes\":8,\"key_shape\":[1,2,16,2],\"max_abs_output_error\":1.6653345369377348e-16,\"query_shape\":[1,4,16,2],\"reference_probability_values\":1024,\"reference_score_values\":1024,\"tiled\":{\"eligible_scores\":544,\"input_values\":256,\"maximum_score_tile_values\":4,\"maximum_temporary_values\":20,\"output_values\":128,\"processed_tiles\":144,\"row_statistic_values\":128},\"tokens\":16,\"value_shape\":[1,2,16,2],\"within_tolerance\":true},{\"absolute_tolerance\":1e-10,\"f64_bytes\":8,\"key_shape\":[1,2,32,2],\"max_abs_output_error\":1.6653345369377348e-16,\"query_shape\":[1,4,32,2],\"reference_probability_values\":4096,\"reference_score_values\":4096,\"tiled\":{\"eligible_scores\":2112,\"input_values\":512,\"maximum_score_tile_values\":4,\"maximum_temporary_values\":20,\"output_values\":256,\"processed_tiles\":544,\"row_statistic_values\":256},\"tokens\":32,\"value_shape\":[1,2,32,2],\"within_tolerance\":true}],\"worked_example\":{\"absolute_tolerance\":1e-10,\"all_outputs_graph_free\":true,\"key_rows\":[0.0,1.0,2.0,3.0],\"key_width\":1,\"last_reference_output\":[3.49265273458577,34.92652734585769],\"last_reference_probabilities\":[0.03205860328008499,0.08714431874203257,0.23688281808991013,0.6439142598879724],\"last_scores\":[0.0,1.0,2.0,3.0],\"last_tiled_output\":[3.492652734585769,34.9265273458577],\"max_abs_output_error\":7.105427357601002e-15,\"query_rows\":[1.0,1.0,1.0,1.0],\"stats\":{\"eligible_scores\":10,\"input_values\":16,\"maximum_score_tile_values\":4,\"maximum_temporary_values\":16,\"output_values\":8,\"processed_tiles\":3,\"row_statistic_values\":8},\"text\":\"abcd\",\"tile_summaries\":[{\"eligible_keys\":2,\"key_end\":2,\"key_start\":0,\"maximum\":1.0,\"normalizer\":1.3678794411714423,\"previous_rescale\":0.0,\"weighted_sum\":[2.3678794411714423,23.678794411714424]},{\"eligible_keys\":2,\"key_end\":4,\"key_start\":2,\"maximum\":3.0,\"normalizer\":1.553001792775919,\"previous_rescale\":0.1353352832366127,\"weighted_sum\":[5.424095958355416,54.240959583554165]}],\"value_rows\":[1.0,10.0,2.0,20.0,3.0,30.0,4.0,40.0],\"value_width\":2,\"within_tolerance\":true}}\n"
  },
  "visualization": {
    "decision": "useful", "id": "online-tiled-attention", "component": "OnlineTiledAttentionDiagram",
    "rationale": { "en": "Follow the same query through two successive key-tile summaries, show how the second rescales the first, and compare the final normalized coordinates with the dense output." }
  },
  "decoder_connection": {
    "en": "The existing text encoder, source-independent backbone, tied head and trainer can evaluate attention with compact shared heads and reconstructed gradients. Planned Chapter 20, Paged KV layout, will study logical-to-physical cache pages and partial-page waste while preserving cached logits."
  },
  "terminology": [
    { "concept_id": "online-attention", "en": "Online attention" },
    { "concept_id": "running-maximum", "en": "Running maximum" },
    { "concept_id": "shifted-normalization-sum", "en": "Shifted normalization sum" },
    { "concept_id": "unnormalized-value-sum", "en": "Unnormalized value sum" },
    { "concept_id": "attention-tile", "en": "Attention tile" },
    { "concept_id": "gradient-recomputation", "en": "Gradient recomputation" },
    { "concept_id": "logical-payload", "en": "Logical payload" },
    { "concept_id": "attention-execution-policy", "en": "Attention execution policy" }
  ],
  "translation_notes": [
    "English is the sole active practical locale. Retain typed locale catalogs, caller-owned diagram copy and the separate glossary prefix online-tiled-attention-term.",
    "Keep the prior and updated running maximum, shifted exponential sum and unnormalized value vector distinct. Rescale both previous sums before adding a contributing tile, then normalize once at the end. A prime marks updated state; lowercase p is a shifted weight and uppercase P is a reconstructed normalized probability.",
    "Preserve raw-attention shapes and the text-cell mapping. The worked key width one and value width two are not the configured RoPE decoder. Shared K/V grouping, causal eligibility, packed boundaries, padding and position labels retain their distinct meanings.",
    "Ideal arithmetic equality, bounded f64 output/gradient comparisons and exact same-execution training continuation are separate claims. Underflow and nonfinite refusal must remain explicit near the recurrence.",
    "The default untrained archive comparison uses the existing Chapter18 initialized model. The actual continuation test is a separate seeded training fixture using the same decoder/trainer capabilities. Never identify their weights or archive as the same.",
    "Payload counts describe the executed logical f64 shapes and selected owned buffers. Preserve the exclusions and do not convert them into peak process memory, GPU traffic, speed or quality claims.",
    "The cited Rabe/Staats paper was initially released in2021, but its frozen version3 is dated10October2022, after the cited Dao version1 dated27May2022. Source roles do not assert a causal ordering or invention claim.",
    "Orientation revision14 changes only current availability and the Chapter19 roadmap row. Preserve all33 rows and every earlier teaching word; Chapters20–32 remain planned and unlinked. Chapter20 is Paged KV layout."
  ],
  "acceptance_examples": [
    { "input": "Explain the final query's two observed summaries", "expected": "For content-only abcd, Q=[1,1,1,1], K=[0,1,2,3] and V=[1,10;2,20;3,30;4,40]. With key tiles two, final query3 consumes keys0/1 then2/3. First m1,l1.3678794411714423,u[2.3678794411714423,23.678794411714424],alpha0; second m3,alpha0.1353352832366127,l1.553001792775919,u[5.424095958355416,54.240959583554165]. Final tiled output[3.492652734585769,34.9265273458577] differs from dense[3.49265273458577,34.92652734585769] within absolute1e-10; all-eight-coordinate maximum7.105427357601002e-15." },
    { "input": "Derive and bound the recurrence", "expected": "For a fixed active query and nonempty eligible tile J, rescale prior l/u by exp(m-m') before adding exp(s_j-m') and its value-weighted contributions. First contributing alpha is explicitly zero; empty masked tiles leave state unchanged; inactive rows remain zero without division. Final o=u/l matches ideal dense attention. Represented reduction order, underflow and nonfinite refusal are separate." },
    { "input": "Preserve layout, head sharing and compact inputs", "expected": "Q[B,Hq,T,d],K[B,Hkv,T,d],V[B,Hkv,T,dv] produce[B,Hq,T,dv], with positive Hq divisible by positive Hkv. One existing group helper serves reference and tiled forward/backward. K/V remain unexpanded; shared projection/RoPE/layout preparation retains existing causal, packed, padded and window semantics. Tiles neither change eligibility nor evict cache rows." },
    { "input": "Reconstruct derivatives without saving dense probabilities", "expected": "Use saved Q/K/V/O and row m/l to reconstruct P, compute D=dot(g,o), dP=dot(g,v), dS=P*(dP-D), then accumulate dQ/dK/dV with score scaling and shared-head sums. Three parent edges own one Rc snapshot; each operand edge may recompute. No ordinary model trace or thread-local state is introduced. Existing stale/released-parent and transaction refusals remain." },
    { "input": "Compare every small input derivative", "expected": "Default compares4query+4key+8value coordinates with maximum absolute errors2.220446049250313e-15,5.551115123125783e-16,1.3877787807814457e-17, all within1e-10. Separate shared-head finite differences cover every small coordinate at step1e-6 and tolerance4e-6. Kernel tests also cover shape/layout/precision failures, masked/inactive/empty cases, tile edges, large/equal scores and stale/nonfinite failures." },
    { "input": "Count executed logical payloads", "expected": "For B1,Hq4,Hkv2,d=dv2,tiles2/2,T8/16/32, each dense score grid has256/1024/4096 values and each probability grid separately has the same count. Largest score tile is4values=32bytes; five counted forward buffers total20values=160bytes. Inputs have128/256/512 values; outputs and combined row statistics each have64/128/256. Each f64 value is8bytes. Exclude metadata, snapshots/tape alias accounting, primitive/backend/device workspace, model-wide activations and peak process RAM; full causal pair work remains quadratic." },
    { "input": "Compare the same portable restored model", "expected": "The zero-update Chapter18 initialized four-query/two-KV/window2 model compares5418 full-prefix and1548 last-row cached logits over six framed prefixes. Both maximum errors3.885780586188048e-16 are within1e-10. Model identity234d9d80f5d63091842fbf7b3cef7ac867aefd20732853a1a463c5b594f3f1f2 and one tied table persist; no-grad outputs are graph-free; compact reports omit dense block intermediates. No model-quality claim follows." },
    { "input": "Run supported reproduction and actual training continuation", "expected": "Repository-root COURSE_CORPUS=false ./course run commands use included fixtures. Default prints exact expected JSON; demo --lib selects2passing tests; attention::online::tests --lib selects8passing tests. A separate seeded accumulated/dropout/recomputed training fixture saves after update1 and matches state_record after both branches reach update2 under same-binary CPU f64 tiled-q2-k3; a q3-k2 execution label is refused." },
    { "input": "Inspect the explanation and publication boundary", "expected": "One static course-v1 figure reads actual expected JSON, keeps both same-query state summaries and their rescaling/final-division relationship accessible, and uses shared presentation roles only. The exact nine Rust regions are displayed once. New19 is English-only revision1; orientation14 promotes only19. Planned20 Paged KV layout is unimplemented and unlinked. Earlier teaching and the first course are preserved." }
  ],
  "exercises": [
    { "input": "Explain the report's recurrence and final division", "expected": "The maximum rises from1to3, so exp(-2) rescales both previous sums before keys2/3 are added. Normalize the completed weighted value vector once. Independent tile-normalized outputs lack the relative masses needed for an unweighted average." },
    { "input": "Inspect matrix, tile and linear payload counts", "expected": "Each dense grid grows256/1024/4096values while the largest score tile remains4values. Five counted temporary buffers total20values. Inputs128/256/512 and output/row-statistic64/128/256 remain. Multiply selected values by8bytes only for their own payload; infer neither peak RAM nor speed." },
    { "input": "Compare analytic derivatives and finite differences", "expected": "Inspect4query,4key,8value coordinates against dense derivatives at tolerance1e-10. Run the provided kernel command:8tests pass, including every small shared-head coordinate at finite-difference step1e-6 and tolerance4e-6. These checks establish tested values, not universal floating-point equality." },
    { "input": "Inspect portable identity and actual continuation", "expected": "The default's six framed prefixes give5418full and1548cached comparisons, both at maximum3.885780586188048e-16 within1e-10, with unchanged identity and tied table and zero training updates. The provided demo --lib command passes2tests; its separate seeded training fixture resumes through update2 with matching CPU f64 tile2/3 execution and refuses tile3/2." }
  ]
}
---

# Practical Chapter 19: Accumulate attention without keeping the full grid

<!-- contract-section:scope -->
## Scope

Extend the existing dense attention, common head preparation, tensor executor,
autodiff tape, source-independent decoder and trainer. Teach stable online
maximum/normalizer/value accumulation and tiled probability reconstruction in
backward. Keep learned projections, RoPE, eligible keys, head merging, output
projection, text encoding and tied head unchanged. Preserve the inspectable
dense path. This is host-backed tiled evaluation, not a fused FlashAttention
kernel, new CUDA runtime or independent attention/training stack.

The learner brings causal attention, stable softmax, reverse-mode gradients,
grouped K/V heads, padded/packed layout, the input-encoding boundary, portable
save/load and accumulated/recomputed training. Text is the only worked source.
Own only the new chapter's English surfaces and orientation revision14's
availability/row19 projection. Preserve earlier teaching and the first course.

<!-- contract-section:worked-inputs -->
## Explain the two-tile result before generalizing

Begin with the quadratic score/probability grid pressure, distinguishing it
from head sharing and local-window eligibility. Explain the four content-only
abcd rows, all axes, the raw key-width1/value-width2 boundary, final scores
and two successive summaries. Relate every coordinate to its key/value row.
Explain why the old normalizer and weighted sum both receive exp(-2) before
the new tile contributes, then divide once. Rounded explanatory values must be
marked approximate; report/diagram values project the exact accepted stdout.
No learner predictions are allowed anywhere.

<!-- contract-section:formula -->
## Preserve a stable summary and reconstruct derivatives

Define every primary formula symbol locally, including the fixed query, key
index, nonempty eligible tile, scores and maxima, shifted weights, rescaling
factor, dimensionless normalizer and value/output vector widths. Establish the
initial state, explicit first contributing alpha0, unchanged empty-tile state,
nonempty active rows through self eligibility and zero inactive padded output.
Prove rescaling with the common-shift identity and explain why independent
tile normalization plus unweighted averaging discards relative mass.

Keep ideal arithmetic equivalence distinct from represented f64 reduction
order, underflow and nonfinite refusal. Finite inputs alone do not guarantee
representable dot products or unnormalized sums.

For backward define the scalar objective, upstream vector, saved row output,
maximum/normalizer, reconstructed P, D=dot(g,o), dP=dot(g,v) and dS=P*(dP-D).
Explain the equality D=sum(P*dP), score scale, transpose, tile matrix shapes,
gradient accumulation and shared-K/V cotangent sums. Masked contributions are
zero. One Rc-owned immutable Q/K/V/O/m/l/layout/tile snapshot joins the existing
tape through three parent edges; no thread-local state. Per-operand
reconstruction repeats work without claiming speed. Ordinary model execution
saves no recurrence trace; optional tracing selects one query.

<!-- contract-section:history -->
## Keep the exact primary editions bounded

Use Milakov/Gimelshein2018v1 Algorithm3 only for the online scalar normalizer.
Use Rabe/Staats, initially2021 but cited2022v3, for stable weighted summaries,
query/key chunking and backward recomputation. Use Dao2022v1 for IO-aware
GPU tiling, recomputation and fused execution. The cited Rabe version is later
than Dao's cited May edition; make no unsupported invention/causal ordering.
Link all three primary URLs in visible history and keep each source-derived
account under200words. Attribute no local payload count, loop order, speed,
traffic or quality result to a paper.

<!-- contract-section:rust-behavior -->
## Reuse the model and compare actual execution

Display exactly nine maintained source regions once:
online-attention-worked-example, online-normalizer-update,
tiled-attention-backward, tiled-attention-autograd,
compact-grouped-attention, explicit-attention-execution,
online-attention-gradient-comparison, tiled-model-comparison and
tiled-accumulated-resume. Register the five displayed source files and thin
main.rs without an extra main excerpt.

State Q[B,Hq,T,d], K[B,Hkv,T,d], V[B,Hkv,T,dv] and output[B,Hq,T,dv],
positive counts and divisible head groups. One existing helper selects compact
shared K/V in the old layer and tiled forward/backward. Common preparation
owns projections, rotary Q/K, unrotated V and causal/packed/padded/window
eligibility; sequence cells and RoPE labels remain distinct. Tile choice is
explicit execution state. Initial tiled matmul is f64 only; reject other
policies before dispatch. Reuse the existing CPU/CUDA primitive boundary,
keep CPU use independent of CUDA and refuse unavailable CUDA explicitly.
Captured evidence is CPU only.

Bind all16 observed input-gradient comparisons and the separate exhaustive
small-coordinate finite differences to their stated tolerances. Explain
nonzero gradients, MHA/GQA/MQA, tile-edge and layout boundaries and existing
stale/released/nonfinite transactional refusal evidence at its tested scope.

The default portable comparison uses Chapter18's initialized zero-update
model: Hq4,Hkv2,window2, six framed prefixes,5418full and1548cached logit
coordinates, maximum error3.885780586188048e-16 for both within1e-10.
Preserve graph-free inference, one tied table and the exact before/after
identity. Compact reports omit dense intermediates; old inspectable APIs stay
dense. The generic backbone still consumes text-derived vectors without a
tokenizer requirement.

The actual training continuation is a separate seeded fixture using the
existing Chapter15 advance_with_execution loop with dropout, two-microbatch
accumulation, clipping/schedule/scaler and block recomputation. Save at update1,
restore and compare both branches' state_record values through update2.
State the same-executable CPU f64 tiled-q2-k3 envelope and q3-k2-label refusal
separately from portable inference and tolerance-based dense equality.

<!-- contract-section:visualization -->
## Show successive state, rescaling and final division

Use one OnlineTiledAttentionDiagram registered as online-tiled-attention.
Parse accepted expected JSON and format its numbers only; do not implement
attention or gradient mathematics in JavaScript. Preserve the first/second
same-query state relationship in both reading order and accessible prose:
rescale both prior sums before new keys contribute, then divide the final
weighted sum by the final normalizer. Display coordinate-by-coordinate
tiled/dense outputs and label the all-output error's broader scope.

All English labels remain caller-owned. Use shared course-v1 figure, caption,
description, card and math roles and the shared full-view controller. Component
CSS supplies geometry only. Reflow at ordinary text size and contain each
value within its nearest bounded box, without clipping, overlap, truncation,
shrinking or private controls/presentation trees. Add stable review anchors
at complete meaningful relationships rather than arbitrary fragments.

<!-- contract-section:exercises -->
## Reproduce the report and offer checked optional inspection

After the explanation/history/figure, supply repository-root working directory,
the existing Docker setup, included fixture prerequisites, exact supported
default/demo-library/kernel-filter commands and observable results. Default
prints the accepted JSON. Demo library tests select2passing tests; the kernel
filter selects8passing tests, including all small-coordinate finite differences.
The supported wrapper commands require execution before final publication.

Offer four optional tasks and checked numbered answers covering recurrence/
rescaling, matrix-versus-tile/linear payload counts, analytic-versus-finite-
difference derivatives, and same-model portable/actual-resume evidence. Every
run request points to a supplied copyable command. Understanding does not
depend on attempting the practice. Keep development/review machinery outside
the learner lesson.

<!-- contract-section:decoder-connection -->
## Hand off to a separate cache-layout question

Retain one text encoder, source-independent backbone, tied head, decoder and
trainer. Running summaries and reconstructed derivatives change intermediate
evaluation, while model semantics and portable identity persist.
Planned Chapter20 Paged KV layout remains unimplemented and unlinked; it will
map logical positions to physical pages and count partial-page waste while
preserving cached logits. Implement no allocator, serving scheduler or
multi-tenant cache.

<!-- contract-section:localization -->
## Preserve future localization support

English is canonical and the only active practical locale. Supply the typed
catalog and separate modal glossary using online-tiled-attention-term. Keep
formulas, literal output, code identifiers, axes, index mappings, causal order,
units, source dates and evidence limits stable for later localization.

<!-- contract-section:acceptance -->
## Validate the coherent staged candidate

Require exact contract/MDX/catalog parity, accepted stdout and nine source
excerpts, static mathematical rendering, programmatic Firefox containment/
full-view/keyboard behavior, both deployment bases, glossary and local links.
Check orientation revision14's33rows and the published1–19/planned20–32
boundary, earlier teaching preservation and the first-course boundary.
Freeze current source/evidence and obtain independent technical/pedagogical
and isolated-surface English judgments plus same-role adjudications. Authoring
and deterministic checks do not issue a publication verdict.
