---
{
  "chapter_id": "20-paged-kv-layout",
  "concept_id": "paged-kv-layout",
  "content_revision": 1,
  "order": 20,
  "objective": {
    "en": "Translate logical token positions into physical KV pages, account for live and unused payload, and verify that cache placement preserves the model's logits."
  },
  "worked_inputs": {
    "en": "Follow seven framed positions from abcde through a nonidentity page table, count both key and value buffers, and compare paged, contiguous and full-prefix computation of the same restored text model."
  },
  "formula": {
    "latex": "\\begin{aligned}N&=\\lceil C/P\\rceil,\\\\q&=\\lfloor p/P\\rfloor,\\\\r&=p\\bmod P,\\\\s&=T[q].\\end{aligned}",
    "symbols": [
      { "symbol": "C", "en": "positive logical token capacity of one layer cache" },
      { "symbol": "P", "en": "positive number of token positions per page" },
      { "symbol": "N", "en": "number of physical pages reserved for the logical capacity" },
      { "symbol": "p", "en": "zero-based logical token position, at least zero and strictly below C" },
      { "symbol": "q", "en": "zero-based logical page containing token position p" },
      { "symbol": "r", "en": "zero-based token offset within that page, strictly below P" },
      { "symbol": "T", "en": "immutable page table that assigns each logical page one distinct physical page" },
      { "symbol": "s", "en": "physical page index obtained from entry q of the page table" }
    ]
  },
  "history": {
    "llm_evolution": {
      "predecessor_kind": "inference-design",
      "limitation": { "en": "Earlier LLM inference systems reserved contiguous KV storage for a sequence's maximum length, leaving reserved capacity unused when its live prefix was shorter." },
      "later_advance": { "en": "PagedAttention separates fixed-token logical blocks from physical blocks and uses a block table to locate keys and values during attention." },
      "modern_llm_role": { "en": "Cache addressing can change without changing token order, rotary positions or eligible context." },
      "sources": [
        {
          "role": "earlier", "year": 2023,
          "name": "Efficient Memory Management for Large Language Model Serving with PagedAttention, version 1, 12 September 2023: earlier-system analysis",
          "source_url": "https://arxiv.org/abs/2309.06180v1",
          "claim": { "en": "Earlier LLM inference systems reserved contiguous KV storage for a sequence's maximum length, leaving reserved capacity unused when its live prefix was shorter." }
        },
        {
          "role": "later", "year": 2023,
          "name": "The same PagedAttention version 1: logical and physical block lookup",
          "source_url": "https://arxiv.org/html/2309.06180v1",
          "claim": { "en": "PagedAttention separates fixed-token logical blocks from physical blocks and uses a block table to locate keys and values during attention." }
        }
      ]
    },
    "approach": { "en": "Retain the existing contiguous cache as the runnable reference and add page lookup to the same layer cache and decoder generation path." },
    "summary": { "en": "This chapter reserves a fixed host pool eagerly. It demonstrates addressing and numerical-payload accounting, without dynamic allocation, sharing, scheduling or measured system gains." },
    "rust_contrast": "The existing contiguous row index and the new page-table row index select the same logical K/V rows in the same attention loop; compare their logits using one restored model."
  },
  "rust": {
    "package": "practical-ch20-paged-kv-layout",
    "sources": [
      "rust/crates/llm-from-scratch-practical/src/attention/paged.rs",
      "rust/crates/llm-from-scratch-practical/src/attention/incremental.rs",
      "rust/crates/llm-from-scratch-practical/src/generation/kv_cache.rs",
      "rust/demos/practical-ch20-paged-kv-layout/src/lib.rs",
      "rust/demos/practical-ch20-paged-kv-layout/src/main.rs"
    ],
    "expected_output": "{\"batch\":1,\"capacity\":12,\"document\":\"abcde\",\"execution\":\"cpu-f64-reserved-paged-kv\",\"framed_token_ids\":[0,99,100,101,102,103,1],\"generation\":{\"decode_tokens\":3,\"final_cache_len\":5,\"generated_token_ids\":[70,56,216,6],\"mode\":\"greedy\",\"prefill_tokens\":2,\"prompt_token_ids\":[0,99],\"same_next_rng_value\":true,\"same_tokens_steps_stop_work\":true},\"head_width\":2,\"kv_heads\":2,\"layers\":2,\"length\":7,\"mappings\":[{\"address\":{\"logical_page\":0,\"logical_position\":0,\"offset_in_page\":0,\"physical_page\":2},\"key_scalar_start_head0\":24,\"value_scalar_start_head0\":24},{\"address\":{\"logical_page\":0,\"logical_position\":1,\"offset_in_page\":1,\"physical_page\":2},\"key_scalar_start_head0\":26,\"value_scalar_start_head0\":26},{\"address\":{\"logical_page\":0,\"logical_position\":2,\"offset_in_page\":2,\"physical_page\":2},\"key_scalar_start_head0\":28,\"value_scalar_start_head0\":28},{\"address\":{\"logical_page\":1,\"logical_position\":3,\"offset_in_page\":0,\"physical_page\":0},\"key_scalar_start_head0\":0,\"value_scalar_start_head0\":0},{\"address\":{\"logical_page\":1,\"logical_position\":4,\"offset_in_page\":1,\"physical_page\":0},\"key_scalar_start_head0\":2,\"value_scalar_start_head0\":2},{\"address\":{\"logical_page\":1,\"logical_position\":5,\"offset_in_page\":2,\"physical_page\":0},\"key_scalar_start_head0\":4,\"value_scalar_start_head0\":4},{\"address\":{\"logical_page\":2,\"logical_position\":6,\"offset_in_page\":0,\"physical_page\":3},\"key_scalar_start_head0\":36,\"value_scalar_start_head0\":36}],\"model_comparison\":{\"absolute_tolerance\":1e-10,\"all_outputs_graph_free\":true,\"compared_logits_per_reference\":1806,\"max_abs_paged_contiguous_error\":0.0,\"max_abs_paged_full_prefix_error\":0.0,\"model_id\":\"97d068dc931cc123096433f5f5dd0bf45bce815fe5163127155d251f32d5e5bc\",\"one_tied_table\":true,\"same_cached_bits\":true,\"same_model_id\":true,\"vocabulary_size\":258,\"within_tolerance\":true},\"page_table\":[2,0,3,1],\"page_tokens\":3,\"per_layer_payloads\":[{\"active_page_tail_payload_bytes\":128,\"active_page_tail_scalar_slots\":16,\"active_pages\":3,\"allocated_payload_bytes\":768,\"allocated_scalar_slots\":96,\"inactive_page_payload_bytes\":192,\"inactive_page_scalar_slots\":24,\"live_payload_bytes\":448,\"live_scalar_slots\":56,\"reserved_pages\":4,\"unused_payload_bytes\":320,\"unused_scalar_slots\":40},{\"active_page_tail_payload_bytes\":128,\"active_page_tail_scalar_slots\":16,\"active_pages\":3,\"allocated_payload_bytes\":768,\"allocated_scalar_slots\":96,\"inactive_page_payload_bytes\":192,\"inactive_page_scalar_slots\":24,\"live_payload_bytes\":448,\"live_scalar_slots\":56,\"reserved_pages\":4,\"unused_payload_bytes\":320,\"unused_scalar_slots\":40}],\"physical_pages\":[{\"logical_page\":1,\"physical_page\":0,\"positions\":[{\"logical_position\":3,\"state\":\"filled\"},{\"logical_position\":4,\"state\":\"filled\"},{\"logical_position\":5,\"state\":\"filled\"}]},{\"logical_page\":3,\"physical_page\":1,\"positions\":[{\"logical_position\":9,\"state\":\"reserved-unfilled\"},{\"logical_position\":10,\"state\":\"reserved-unfilled\"},{\"logical_position\":11,\"state\":\"reserved-unfilled\"}]},{\"logical_page\":0,\"physical_page\":2,\"positions\":[{\"logical_position\":0,\"state\":\"filled\"},{\"logical_position\":1,\"state\":\"filled\"},{\"logical_position\":2,\"state\":\"filled\"}]},{\"logical_page\":2,\"physical_page\":3,\"positions\":[{\"logical_position\":6,\"state\":\"filled\"},{\"logical_position\":7,\"state\":\"reserved-unfilled\"},{\"logical_position\":8,\"state\":\"reserved-unfilled\"}]}],\"query_heads\":4,\"rounding_comparison_empty_layer\":{\"contiguous_allocated_scalar_slots\":80,\"length\":0,\"logical_capacity\":10,\"page_tokens\":3,\"paged_allocated_scalar_slots\":96},\"schema_version\":1,\"total_allocated_payload_bytes\":1536}\n"
  },
  "visualization": {
    "decision": "useful", "id": "paged-kv-layout", "component": "PagedKvLayoutDiagram",
    "rationale": { "en": "Connect logical reading order to a nonidentity page table and physical page contents, then separate live K/V payload from a partial-page tail and an unused whole page." }
  },
  "decoder_connection": {
    "en": "The same text encoder, source-independent backbone, tied head and cached generator now support explicit page placement without changing logical context or saved model identity. Planned Chapter 21, Sampling distributions, will extend how the existing sampler turns vocabulary scores into token choices."
  },
  "terminology": [
    { "concept_id": "paged-kv-cache", "en": "Paged KV cache" },
    { "concept_id": "logical-token-position", "en": "Logical token position" },
    { "concept_id": "kv-page-table", "en": "KV page table" },
    { "concept_id": "physical-kv-page", "en": "Physical KV page" },
    { "concept_id": "partial-page-tail", "en": "Partial-page tail" },
    { "concept_id": "inactive-kv-page", "en": "Inactive KV page" },
    { "concept_id": "kv-payload", "en": "KV payload" },
    { "concept_id": "eager-cache-reservation", "en": "Eager cache reservation" }
  ],
  "translation_notes": [
    "English is canonical and the sole active practical locale. Retain caller-owned figure strings, the typed catalog and the paged-kv-layout-term glossary prefix.",
    "Keep logical token position, logical page, token offset within a page, physical page and scalar index distinct. Both K and V use identical placement in separate arrays. An index counts f64 elements in one array; it is neither a byte offset nor a pointer.",
    "The page table is a checked permutation of a fixed reserved pool. This chapter implements no page sharing, eviction, dynamic allocator, scheduler, serving layer or prefix reuse. Page size does not change RoPE positions or attention-window eligibility.",
    "Every payload count combines K and V with compact shared KV heads, not query heads. Distinguish allocated, live, total unused, partial-page tail and inactive whole-page slots; multiply by eight only for f64 buffer bytes. These counts exclude process RAM and overhead.",
    "The main cache has capacity12 and length7. The separate capacity10 rounding comparison is empty, length0. Do not transfer the main live/tail counts to that comparison.",
    "Seven framed prefixes each contribute258last-row logits against each reference,1806per reference. Both measured maximum errors are zero in this CPU f64 fixture; the full-prefix comparison still declares tolerance1e-10. Do not promise cross-device bitwise equality or trained quality.",
    "The two history entries refer to one inspected PagedAttention v1 edition, dated12September2023, using its abstract and HTML URLs for earlier-system analysis and block lookup. They are not two independent historical experiments.",
    "Orientation revision15 promotes only Chapter20. Keep all33rows: published1–20, planned21–32with no links. Preserve all older teaching words outside the authorized availability projection."
  ],
  "acceptance_examples": [
    { "input": "Trace the default logical prefix", "expected": "B1,Hq4,Hkv2,d2,C12,P3,T[2,0,3,1],n7. Logical positions0..6 map to physical pages[2,2,2,0,0,0,3], offsets[0,1,2,0,1,2,0] and first-feature indices[24,26,28,0,2,4,36] for batch0/shared head0 in each separate K/V array." },
    { "input": "Explain the indexing invariant", "expected": "N=ceil(C/P),q=floor(p/P),r=p mod P,s=T[q] for0<=p<C. T permutes0..N-1, preventing aliasing. Each physical array has[N,B,Hkv,P,d]; index=((((s*B+b)*Hkv+h)*P+r)*d+f). Logical snapshots remain[B,Hkv,n,d]. Reads follow eligible logical positions in unchanged reduction order; RoPE remains logical." },
    { "input": "Partition the owned K/V payload", "expected": "U=2BHkv*d=8,A=ceil(n/P)=3,N4. Per layer allocated96slots/768B,live56/448B,unused40/320B; unused is partial tail16/128B plus inactive whole page24/192B. Two layers allocate1536B in these arrays. Count no metadata, allocator overhead, weights, temporaries, peak process RAM, GPU traffic or speed." },
    { "input": "Inspect a non-divisible capacity", "expected": "The separate empty capacity10,page3 layer allocates96paged slots versus80contiguous slots. Rounding contributes16extra f64 slots/128B. Positions10and11 are inaccessible; all reserved slots are unused at length0. Eager paging establishes no general storage saving." },
    { "input": "Compare one restored model", "expected": "Seven framed abcde prefixes times258vocabulary coordinates give1806comparisons against EACH reference: contiguous cached and full-prefix current last row. Both measured maximum errors0 within absolute1e-10 on CPU f64; cachedbits match. Graph-free outputs, one tied table and modelID97d068dc931cc123096433f5f5dd0bf45bce815fe5163127155d251f32d5e5bc persist. The fixture is untrained." },
    { "input": "Reuse generation", "expected": "Existing greedy generation selects[70,56,216,6] from prompt[0,99]. Contiguous and paged results agree in tokens, steps, stop and work; next RNG values agree. Prefill2plus decode3 leaves cachelen5 because the fourth selected token is not fed back after the token limit. Reuse the same decoder and sampler." },
    { "input": "Reproduce selected evidence", "expected": "Repository-root COURSE_CORPUS=false ./course run commands with the existing Docker/course setup print the accepted JSON and select2passing demo tests and10passing attention::paged::tests. Tests cover checked tables/overflow, conservation/rounding, batched head sharing/windows, snapshots/reset, logits, generator equivalence, binding/capacity and failed-step rollback. Native config-lib page-table syntax is whitespace-separated." },
    { "input": "Read the historical contrast", "expected": "One Kwon et al. PagedAttention v1,12September2023, supplies the earlier maximum-length contiguous reservation and later fixed-token block lookup contrast. Cite both inspected URLs visibly. The existing contiguous Rust cache is executable evidence; dynamic allocation, sharing, scheduling and system performance gains are outside this eager host pool." },
    { "input": "Inspect the teaching and availability boundary", "expected": "One static course-v1 figure projects accepted Rust data with all strings supplied by the English lesson, preserving logical mapping and live/tail/whole-page relationships accessibly. Seven Rust regions render once. Four optional practices have checked answers. New20revision1and orientation15 preserve first-course and prior teaching bytes; all33roadmap rows remain, with1–20published and21–32planned/unlinked. Chapter21handoff is sampling distributions." }
  ],
  "exercises": [
    { "input": "Trace page crossings in the accepted report", "expected": "Position2uses logicalpage0,physicalpage2,offset2,index28; position3uses logicalpage1,physicalpage0,offset0,index0; position6uses logicalpage2,physicalpage3,offset0,index36. These are batch0/head0 first-feature indices in each separate array. Logical attention order remains2then3thenlater6, irrespective of physical order." },
    { "input": "Reconcile the seven-position payload", "expected": "Both K/V buffers count8slots per logical position across1batch,2KVheads,2features. Allocated96=live56+unused40; unused40=tail16+inactive24. Byte counts are768=448+320 and320=128+192. All pages are allocated, including inactive physicalpage1." },
    { "input": "Inspect logits and generation from the same restored model", "expected": "1806coordinates per reference are7prefixes times258vocabulary logits, using only each full-prefix last row. Both default errors are0 within1e-10; cachedbits, modelID and tied table persist. GeneratedIDs[70,56,216,6] need2prefill and3decode inputs,cachelen5. These untrained fixture results establish no language quality or universal bitwise guarantee." },
    { "input": "Explain rounding and run the focused checks", "expected": "The empty C10/P3comparison rounds reservation to12positions:96paged versus80contiguous slots,16extra/128B,allunused. Logical positions10/11remain invalid. The provided demo and paging-library commands pass2and10tests, including alternate config page order, unchanged reset allocations/bytes and all-layer failure rollback. An unused reserved page is not an unallocated page." }
  ]
}
---

# Practical Chapter 20: Keep token order across cache pages

<!-- contract-section:scope -->
## Scope

Extend the existing layer-cache row index, decoder-cache construction and cached
generator's layout selection. Teach a checked logical-page/offset/physical-page
mapping inside an eagerly reserved fixed host pool. Reuse projections, RoPE,
eligibility, softmax, compact shared K/V heads, the prepared all-layer commit,
the source-independent backbone, text wrapper, portable model and sampler.
Implement no general allocator, dynamic allocation, page sharing, eviction,
scheduler, serving integration, prefix reuse or GPU kernel.

Prerequisites are cached generation, grouped K/V heads and context masks,
rotary positions, the input-encoding boundary and portable model restoration.
Text is the only worked source. Preserve the first course and earlier practical
teaching. Own only new20 English products and orientation0's revision15
availability/roadmap projection.

<!-- contract-section:worked-inputs -->
## Explain placement before generalizing

Begin with the need to separate a generated token's logical position from its
cache address. A contiguous row index is valid for its layout; page lookup adds
the ability to place neighboring logical pages in different physical regions.
Do not imply that this fixed eagerly reserved pool saves memory automatically.

Explain the actual framed abcde IDs[0,99,100,101,102,103,1] and seven logical
positions. Use C12,P3,T[2,0,3,1],B1,Hq4,Hkv2,d2. Work positions2,3and6 across
page boundaries, including head0 first-feature scalar indices28,0and36.
Physical page1 remains allocated for logical9–11 although it is unfilled.
State that keys and values have identical placement in separate arrays.
No learner prediction prompts appear anywhere.

<!-- contract-section:formula -->
## Preserve positions while translating addresses

Display the exact primary formula once and define all its symbols locally.
Require positive capacity/page size and an immutable permutation of N reserved
pages. Define batch, shared KV heads, feature width and their zero-based indices
before expanding the scalar address for[N,B,Hkv,P,d]. Show that the same lane's
different logical positions cannot alias. Distinguish scalar element index,
byte offset and pointer; logical snapshots retain[B,Hkv,n,d]. Page size is
neither an attention window nor a RoPE position.

Define n current length, A=ceil(n/P)withA0atn0 and U=2BHkv*d. Derive allocated,
live, partial-tail, inactive-whole-page and total-unused scalar slots. Count
both K/V using compactHkv, then multiply by8 for f64 payload bytes. Give the
observed96/56/40slot and768/448/320Bpartition; splitunused16/128Btail plus
24/192Bwholepage. State1536Ballocated across the two layers' arrays.
Exclude metadata, allocator overhead/capacity beyond lengths, weights,
activations, temporaries, process RAM, GPU memory/traffic and speed.

Keep the separate EMPTY C10/P3comparison at length0:96paged versus80contiguous
slots,16extra/128Bfrom rounding. Rounded positions10/11are inaccessible and
allocated unused. This example refutes automatic memory-saving claims.

<!-- contract-section:history -->
## Connect the mechanism to LLM inference

Use only the inspected Kwon et al. PagedAttention v1 dated12September2023.
Its sections3.1and4.1–4.3 support earlier maximum-length contiguous KV
reservation and later fixed-token block lookup. The two source records
describe one edition through its abs and HTML URLs, not independent papers.
Render both exact URLs as visible links. Keep attributed paraphrase bounded
near150words. The runnable contrast is the existing contiguous cache versus
page lookup in the same cache/attention implementation. Do not attribute the
course's exact API, layout or payload figures to the paper, or claim its dynamic
allocation, sharing, scheduling or measured system gains.

<!-- contract-section:rust-behavior -->
## Compare the same restored model and generator

Render exactly these seven source regions once: logical-to-physical-kv-page,
checked-kv-page-table, paged-cache-row-index, paged-kv-payload-accounting,
model-wide-paged-cache, paged-model-reference-comparison and
paged-existing-generator-comparison. Register their four source files plus
the thin main entry, with no additional main excerpt.

Explain that cached score and value loops retain eligible logical order, the
same operands and the same reduction order in this scalar CPU execution.
RoPE uses the logical position. Existing windows, parameter/RoPE bindings,
head groups, append checks and all-layer prepared commit remain in force.
Reject zero sizes, invalid page permutations, overflow, allocation failure
and model/layout capacity mismatch. Reset removes the live prefix while
retaining buffer identities, bytes and page table. A refused prepared step
commits no partial physical rows across layers.

Use the same saved/restored zero-update text model for contiguous/paged/full
prefix comparisons. Seven framed prefixes times258vocabulary coordinates give
1806comparisons against EACH reference. Count only the current last row of
each full prefix. Both observed errors are0, within CPU f64 absolute1e-10;
cachedbits also match. Preserve graph-free outputs, one tied table and ID
97d068dc931cc123096433f5f5dd0bf45bce815fe5163127155d251f32d5e5bc.
Do not turn fixture equality into a cross-device or language-quality claim.

The existing generator, with optional layout selection, produces identical
tokens, steps, stop and work, with the same next RNG value. Default greedy IDs
are[70,56,216,6]from prompt[0,99]. Explain prefill2,decode3andcachelen5:
the last selected token is not fed back after the token limit. Native config-lib
loads whitespace-separated page-table values; clap selects an optional config.
No parser, tokenizer, decoder or sampling algorithm is duplicated.

<!-- contract-section:visualization -->
## Relate logical order, page placement and payload

Use one static PagedKvLayoutDiagram registered as paged-kv-layout. Read the
accepted Rust expected JSON and only group/format its reported records.
Group a logical-page heading with its token positions, offsets and K/V scalar
starts. Place the physical-page contents beside this logical reading order
when space permits. Show live rows, the partial-page tail and the allocated
inactive page without relying on color. Keep all English strings caller-owned.

The accessible description must explain logical-to-physical lookup, unchanged
read order, identical placement in separate K/V arrays and unused-but-allocated
storage. Use shared course-v1 roles, math and the shared full-view controller.
Local CSS controls geometry only. Reflow at normal text size in narrow boxes
and use the larger full-view width to reduce vertical travel. Never hide,
clip, shrink, overlap or duplicate the semantic tree.

<!-- contract-section:exercises -->
## Offer four optional inspections after the explanation

Give repository-root working directory, existing Docker/course setup and included
fixture prerequisites beside exact supported default/demo-library/paging-library
commands. Default prints accepted JSON; focused tests select2demo and10library
cases. Verify wrapper forwarding before publication through machinery.

Offer four numbered practices and checked numbered answers covering page
crossings, the seven-position K/V partition, same-model logits/generation and
empty rounding/failure checks. Every run request points to a supplied command.
Practice is optional; understanding the explanation does not depend on it.

<!-- contract-section:decoder-connection -->
## Hand off to token selection

The text encoder, source-independent backbone, tied head and one cached
generator retain their semantics. Page placement is execution/storage state,
not saved logical model identity. Planned Chapter21 Sampling distributions
extends the existing sampler's transformation of vocabulary scores into token
choices. Keep that lesson planned and unlinked.

<!-- contract-section:localization -->
## Retain localization architecture

English is the only active practical locale. Supply the typed catalog, caller
labels and separate modal glossary with the paged-kv-layout-term prefix.
Preserve mappings, index meanings, arithmetic, units, source boundaries and
fixture limits in future translations. Create no Russian practical products.

<!-- contract-section:acceptance -->
## Validate one coherent candidate

Require contract/MDX/catalog parity, byte-exact stdout, seven displayed regions,
static formulas and figure evidence, glossary, links and sole-Firefox checks
for narrow/desktop/full-view/forced-color/direction states at both bases.
Validate every bounded box without clipping or font shrinking. Orientation15
retains33rows with published1–20and planned/unlinked21–32. Preserve the first
course and older teaching. Root freezes source/evidence for two independent
English reviews and two same-role adjudications; the author issues no verdict.
