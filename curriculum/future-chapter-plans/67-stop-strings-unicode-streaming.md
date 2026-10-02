# Chapter 67 — Stop strings and Unicode streaming

## 1. Scope and implementation boundary

This is an internal, single-executor implementation plan, not a lesson, an
implementation receipt, or authorization to run a model. The claimed planning
run is `20260916T133846Z-detail-ch67-stop-strings-unicode-streaming-01`, based on
commit `4c4c170b18dc605f6b349b20cf357e493e813b6e`. Its immutable
[inputs](../../.build/runs/20260916T133846Z-detail-ch67-stop-strings-unicode-streaming-01/inputs.json)
are 16,763 bytes with SHA-256
`ed8201329becafc7b374dfb6467ffed8f8f1c7bc924d8dfa4a9045a341c561ec`;
the 2,875-byte preflight has SHA-256
`6ec728c400eb19c53f9486692b59b823f8c5c03ec8165ca383a6d3d565ec346e`.
The live run claim, not a pre-claim snapshot field in the inputs, authorizes
these three staged planning files only.

The future implementation is
`implement-ch67-stop-strings-unicode-streaming` in build
`extend-course-to-functional-laptop-llm-20260810`, owned by `owner-ch67`.
Its exact implementation predecessor is
`implement-ch66-nucleus-penalties-logprobs`. A completed Chapter 66 planning
packet does not prove that implementation checkpoint exists. The chapter owns
`CAP-ISA-DEC-004` and `CAP-ISA-DEC-006`. Its direct `claim_ids`, `finding_ids`,
and `overbroad_surface_ids` are all empty. Related decoding findings elsewhere
are not new direct bindings or findings this chapter can declare closed.

Teach literal stop matching over generated tokenizer bytes, withholding bytes
that could still form a stop, withholding incomplete UTF-8 scalars, and producing
complete JSON/SSE events with one typed terminal outcome. Prompt bytes are
excluded from matching. Regex, semantic stopping, moderation, prompt-side stops,
Unicode normalization, grapheme-by-grapheme animation, arbitrary raw-byte output,
the Chapter 68 scheduler, and Chapter 69 transport cancellation are out of scope.
The stream is an inference output boundary, not a second sampler or KV owner.

The exact prerequisite inventory, in frozen order, is:

1. `curriculum/functional-laptop-llm-extension-plan.md`
2. `audits/2026-08-10-functional-llm-capability/coverage.md`
3. `audits/2026-08-10-functional-llm-capability/requirements.md`
4. `audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md`
5. `.agents/skills/author-llm-course-english/SKILL.md`
6. `.agents/skills/localize-llm-course/SKILL.md`
7. `site/src/i18n/functional-chapter-locales.json`
8. `exact predecessor checkpoint=implement-ch66-nucleus-penalties-logprobs`
9. `artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json`

Preserve the frozen formula ID
`teaching-formula-ch67-stop-strings-unicode-streaming` and literal notation:

```text
emit_len = min(stop_safe_prefix_len, utf8_complete_prefix_len)
```

In learner prose render
$e=\min(s,u)$, where all three lengths count **bytes from the same pending-buffer
start**: $s$ is the prefix proven safe from any winning stop, $u$ is the prefix
ending at the last complete valid UTF-8 scalar, and $e$ is the emitted prefix.
The stop boundary and UTF-8 validator must satisfy the invariants in §3; taking
the minimum of arbitrary integers alone is not a UTF-8 safety proof.

## 2. Evidence and historical boundary

Keep the two frozen historical entries and their order:

| Role | Frozen source | Bounded use |
| --- | --- | --- |
| Earlier, 2009 | `SRC-ISA-005`, [WHATWG Server-sent events](https://html.spec.whatwg.org/multipage/server-sent-events.html) | UTF-8 event-stream syntax, fields, blank-line dispatch, and incomplete-event handling |
| Later, 2014 | `SRC-ISA-004`, [WHATWG TextDecoder](https://encoding.spec.whatwg.org/#interface-textdecoder) | Incremental decoding and the distinction between fatal and replacement behavior |

These are the frozen registry years, not claims that either standard invented
literal model-output stopping. The SSE specification supplies a transport
framing comparison: a client accumulates lines and dispatches a completed event;
EOF before the final blank line does not dispatch the unfinished event. This
does not make a socket write atomic or guarantee exactly-once delivery.
TextDecoder supplies the later incremental-decoding comparison. Its existence
does not select the course's stop policy, tokenizer semantics, or error domain.
The course chooses strict output with no replacement; a browser's SSE decoding
behavior must not be presented as proof of that stronger producer policy.
Freeze retrieved source bytes, extraction selectors and receipts before future
implementation. These living URLs are not immutable version identifiers.

Supplemental standard-library evidence is
[Rust `Utf8Error`](https://doc.rust-lang.org/std/str/struct.Utf8Error.html):
`valid_up_to()` identifies the verified prefix, while `error_len() == None`
identifies a potentially incomplete trailing sequence, not permission to emit
it. The small suffix can contain one to three bytes. Use the pinned toolchain's
`std::str::from_utf8`; do not copy a lossy or unchecked example. This is syntax
validation plumbing, not a third historical replacement source. No additional
dependency is admitted by this plan.

Current executable evidence is narrower than the future capability. The BPE
tokenizer already exposes `token_bytes` returning `Option<&[u8]>` and strict
decoding; a token's bytes need not be a complete UTF-8 string on their own.
Current generation stop reasons cover EOS, token limit, and context limit, not
literal byte stops or streaming UTF-8 state. The cached generator validates the
request before cache allocation or RNG movement. With zero output tokens it
returns an empty generation, token-limit finish, and cache length zero without
allocating KV. In a nonempty run it prefills the prompt, selects a token, records
that token, checks EOS then token/context limits, and decodes it into KV only if
generation continues. Thus a terminal selected token is in generated history
but not necessarily in KV. Preserve that regression; do not report
`prompt.len() + generated.len()` as the cache length.

Chapter 66 owns request-local sampling order, counts, log-probability observation
and RNG consumption: greedy takes no draw, each stochastic selection takes one.
Its proposed extensions must be accepted first. Chapter 65 owns physical cache
release and in-flight leases. This chapter may report terminal intent to that
owner, but cannot reuse a device block behind an outstanding operation. Later
serving integration remains responsible for its exact scheduler-iteration
reclamation obligation. No present code is claimed to implement this plan's
proposed stream types or literal matcher.

## 3. Inputs, state machine, and worked examples

### The predeclared input policy

Validate at most 16 nonempty UTF-8 stop strings, at most 256 stop bytes in total,
the accepted tokenizer identity, configured EOS identity, output/context limits,
and checked byte/count arithmetic before RNG movement or model/KV allocation.
An empty stop **list** is distinct from an invalid empty stop **string**. Bind
stop bytes and configured order exactly; do not trim, normalize, lowercase,
replace malformed bytes, or search the prompt. Proposed duplicate handling is
to retain configured entries and let the first configured identical entry win;
charge both entries' bytes. Freeze that policy before implementation, rather than
silently deduplicating an ordered configuration.

The proposed policy name `literal-byte-stop-stream-v1` is a course-local design,
not an existing API or accepted upstream default. It records the matcher rule,
strict selected-token error domain, token commit point, terminal sealing rule,
duplicate policy, and combined-buffer accounting decision. Stop configuration
is immutable after generation begins. Changing it requires a new request and
identity, not reinterpretation of already emitted bytes.

Track separate quantities: selected token IDs; Chapter 66 history counts and RNG
state; generated content-byte offset; pending byte interval; emitted byte count;
matched stop interval and configured index; same-piece discarded bytes; cache
length; and terminal state. Integer offsets use checked arithmetic, never a
floating-point count. EOS is identified through the accepted tokenizer/config
binding, not an invented numeric ID or a printable spelling. It is a selected
control token that seals the content stream without contributing token bytes.
A selected non-EOS ID with no content bytes is a typed error unless an explicit
accepted control policy exists; do not silently discard unknown special tokens.

### One scalar and one stop across three token pieces

Use the exact stop `€!`, encoded as hex `E2 82 AC 21`, and these synthetic content
pieces. The labels are fixture token labels, not claims about real token IDs.

| Selected piece | Piece bytes | Generated byte offsets | Pending before decision | Emission/decision |
| --- | --- | --- | --- | --- |
| A | `41 E2` | `[0,2)` | `41 E2` | Emit `41` (`A`); retain `E2` |
| B | `82` | `[2,3)` | `E2 82` | Emit nothing; retain the incomplete scalar and stop prefix |
| C | `AC 21 5A` | `[3,6)` | `E2 82 AC 21 5A` | Stop at global `[1,5)`; suppress `€!` and same-piece `Z` |

There are six generated content bytes: one emitted byte, four matched stop
bytes, and one discarded overhang byte. The output is exactly `A`, not `A€`,
`A€!`, or a replacement character. In stochastic mode three selected pieces
consume three draws, even though only one byte becomes output. Greedy consumes
zero. The stop-bearing selected token is still in generated history and penalty
counts. No fourth token is selected after this decisive stop; no terminal token
is appended to KV just to produce unused next logits. Tokens and emitted text
are different objects: never reconstruct token history by retokenizing `A`.

At the first stage $s=u=e=1$ byte. At the second stage both safe/complete prefixes
from the pending-buffer start are zero. At the third stage the winning stop
starts at that buffer's offset zero, so $s=e=0$ even though the bytes are valid
UTF-8. The course computes the safe prefix from candidate starts and computes
the complete prefix from strict validation. For well-formed UTF-8 stop strings
within a valid generated prefix, candidate starts occur at scalar boundaries;
assert that the emitted slice also passes strict validation. Byte indices do
not count Unicode scalars, displayed columns, or grapheme clusters.

### A completed match need not yet be decisive

The frozen rule is earliest **start byte position**, with configured-order ties.
It is not first-completed or automatically longest match. Propose a bounded
literal matcher that retains a completed candidate while an earlier-start
prefix, or a higher-priority same-start prefix, could still win. Store candidate
identity/positions and compare original bytes; a black-box stop library must not
make the learner's decision.

| Ordered stops | Bytes available | Outcome before more input | Next input or seal | Final output and winner |
| --- | --- | --- | --- | --- |
| `abc`, `b` | `ab` | `b` is complete at byte 1, but `abc` is possible at byte 0; emit nothing | `c` | Empty output; `abc` wins `[0,3)` |
| `abc`, `b` | `ab` | Same pending state | `x` | Emit `a`; `b` wins `[1,2)`; suppress `x` |
| `abc`, `b` | `ab` | Same pending state | End of input | Emit `a`; `b` wins `[1,2)` |
| `abc`, `ab` | `ab` | First configured same-start stop could still win | `c` | Empty output; configured entry 0 wins |
| `ab`, `abc` | `ab` | Entry 0 is already decisive | No next selection | Empty output; `ab` wins immediately |

No extra sample is permitted after a **decisive** stop. A pending later complete
candidate can require another selected piece to disambiguate an earlier prefix,
but never beyond output/context budgets. At EOS, a limit or cancellation, seal
the input: unfinished candidates cannot receive imaginary future bytes; resolve
the best currently complete candidate before the lower-priority terminal reason.
If no stop completes, emit the remaining valid unmatched prefix when the bounded
producer queue can accept it. Queue acceptance is not proof a client received it.

For exactness, compare the same selected-piece sequence under every split of its
transport chunks. Do not promise invariance under retokenization: choosing a
different final token can change the already-selected overhang and strict-error
domain. Precomposed `é` (`C3 A9`) and decomposed `e` plus acute (`65 CC 81`) are
different byte strings. A fixture must demonstrate the non-match without
describing either spelling as malformed or introducing NFC normalization.

### Selection commit, strict byte processing, and finish precedence

Freeze this proposed transaction chronology before implementation:

1. Validate configuration, tokenizer binding, request limits and bounded staging
   capacity. Before sampling, perform all Chapter 66 distribution/observer checks
   and reserve enough producer capacity for the next bounded transaction and its
   eventual finish. A refusal here changes neither RNG nor generated counts.
2. Select the token with Chapter 66's candidate RNG, then commit that token ID,
   its one stochastic draw (or zero greedy draws), and its history-count increment
   exactly once. A token is not selected again after a decode error.
3. For a non-EOS content token, stage the complete tokenizer piece together with
   held UTF-8 bytes. Strictly validate **all already-selected piece bytes**,
   including overhang a stop might suppress. A malformed sequence is fatal.
   An incomplete suffix may remain pending only while input can continue.
4. Stage stop-state changes and a valid emission, serialize the bounded event,
   then publish that byte transaction. On a fatal byte error, publish no bytes
   from the failing token transaction; retain its committed token/count/RNG
   state and record a typed terminal error. Earlier emitted events cannot be
   retracted. Do not roll back token selection while retaining its bytes.
5. On a decisive stop or any terminal signal, seal the selected byte domain,
   reject an incomplete final scalar, resolve pending complete stops, choose one
   terminal outcome, and enqueue at most one finish. Subsequent calls return the
   recorded terminal outcome without another sample, byte event or finish.

The frozen precedence is:

```text
fatal decode → earliest stop BYTE POSITION / configured-order tie
             → EOS → output limit → context limit → cancellation → internal error
```

Store one typed outcome; distinct counters and diagnostics do not create a
second finish. Precedence compares conditions at the same declared observation
boundary. Cancellation observed before selection seals the current state;
cancellation observed after selection cannot pretend that selection never
happened. No implementation is permitted to race a cancellation callback against
RNG, byte-state or finish mutation without a single request-state owner. Later
serving code must provide that owner and its queue/lease handoff.

Test selected bytes `stop + FF`: fatal decode, not normal stop. Test
`stop + E2` when the stop would finish that piece: incomplete final scalar is
fatal under this proposed whole-selected-piece domain. Invalid bytes in a token
never selected are outside the domain and cannot retroactively fail the request.
For held `E2 82`, EOS, an output limit, context limit or cancellation seals an
incomplete scalar and gives fatal decode. No replacement character is emitted.
The same rules must be visible in trace fields: selection committed, byte
transaction rejected, emitted prefix unchanged, one terminal error, no extra
draw. This policy is deliberate, not dictated by WHATWG or the current sampler.

### Storage accounting is an explicit unresolved gate

Preserve the frozen bound **at most `longest_stop_bytes - 1` plus one piece**.
It is not safe to silently add a UTF-8 allowance and call the original bound
satisfied. For example, with no stops, or only single-byte stop `X`, one-byte
pieces `F0`, `9F`, `92` require three pending UTF-8 bytes although no stop prefix
requires them. An empty stop list has zero stop holdback but not necessarily zero
UTF-8 carry.

The proposed interpretation separates the literal matcher's stop holdback from
the strict decoder's at-most-three-byte incomplete suffix, the accepted maximum
incoming piece, and the bounded event queue. If stop and UTF-8 suffixes share one
buffer, charge that physical allocation once, not once per logical role. Track
capacity, length, scratch copies, event serialization and queued bytes separately.
All additions, longest-stop arithmetic, offsets and capacity conversions are
checked; use zero explicitly for the empty-list case, not unsigned subtraction.
Before implementation acceptance, the capability owner must either accept this
scope interpretation and its combined-storage proof, or reconcile the original
total-buffer limit. This plan does not change the frozen cap. A pass of the
four-byte-stop fixture cannot close this broader resource gate.

## 4. Rust ownership and declared outputs

Course-owned Rust implements the literal matcher, candidate ordering, safe-prefix
decision, terminal state machine and trace. Standard `std::str::from_utf8` checks
UTF-8 syntax; admitted `serde_json` serializes typed JSON. Neither may replace the
taught stopping or emission decisions. Do not handwrite JSON grammar, use lossy
decoding, or import a generator/stop processor that hides this chapter's algorithm.
No SSE dependency or module is currently admitted merely because SSE appears in
the capability. Freeze any necessary mature supporting dependency, full graph,
features and cost through the existing dependency gate before adoption.

Proposed, not current, interfaces are `StopConfig::validate`,
`StopMatcher::push_piece`, `UnicodeCarry::validate_piece`, and a terminal-sealing
operation owned by one generation state. Prefer a bounded structure with the
configured byte patterns, pending absolute offset, unresolved candidate starts,
best completed candidate, and an explicit terminal enum. An emission result
contains a valid borrowed/owned prefix, exact byte offsets, and an optional typed
finish; allocation ownership must be unambiguous. Error variants should
distinguish invalid configuration, count/offset overflow, missing token bytes,
invalid UTF-8, incomplete final UTF-8, resource refusal, state misuse and internal
failure. These are proposed course error categories, not names of existing enums.

`generation/stop.rs` owns byte stops and winner selection;
`generation/unicode.rs` owns strict incremental UTF-8 carry and safe emission
integration. The existing generation module must expose them, and cached and
non-cached generation must use the same policy. Module registration, request
configuration, shared trace enums, the Chapter 66 selection-commit hook, and the
bounded JSON/SSE adapter are necessary shared integrations not separately named
in the frozen inventory. Record their exact path owners and authorized edits
before implementation. Do not create parallel stop policies or pretend a later
Chapter 69 server already supplies these interfaces. A local in-memory producer
fixture may demonstrate event framing; it is not an HTTP service.

The exact 24 future implementation outputs are, in order:

```text
curriculum/chapters/67-stop-strings-unicode-streaming.md
rust/crates/llm-from-scratch/module-registry/functional-v1/ch67-stop-strings-unicode-streaming.module
rust/crates/llm-from-scratch/tests/ch67_stop_strings_unicode_streaming.rs
rust/crates/llm-from-scratch/examples/ch67_stop_strings_unicode_streaming.rs
rust/crates/llm-from-scratch/examples/expected/ch67_stop_strings_unicode_streaming.txt
rust/crates/llm-from-scratch/src/generation/stop.rs
rust/crates/llm-from-scratch/src/generation/unicode.rs
site/src/content/chapters/en/67-stop-strings-unicode-streaming.mdx
site/src/content/chapters/ru/67-stop-strings-unicode-streaming.mdx
site/src/i18n/functional-catalogs/en/67-stop-strings-unicode-streaming.json
site/src/i18n/functional-catalogs/ru/67-stop-strings-unicode-streaming.json
site/src/content/cheat-sheets/en/67-stop-strings-unicode-streaming.json
site/src/content/cheat-sheets/ru/67-stop-strings-unicode-streaming.json
site/src/components/chapters/StopStringsUnicodeStreamingDiagram.astro
site/tests/67-stop-strings-unicode-streaming-diagram.test.ts
site/tests/67-stop-strings-unicode-streaming.test.ts
site/tests/e2e/ch67-stop-strings-unicode-streaming.spec.ts
audits/functional-laptop/reviews/67-stop-strings-unicode-streaming/
artifacts/functional-laptop/chapters/67-stop-strings-unicode-streaming/
artifacts/functional-laptop/chapters/67-stop-strings-unicode-streaming/history-source-evidence-receipt.json
artifacts/functional-laptop/chapters/67-stop-strings-unicode-streaming/gpu-execution-receipt.json
artifacts/functional-laptop/step-output-inventories/implement-ch67-stop-strings-unicode-streaming.json
BUILD_STATE.yaml
DECISIONS.md
```

These are future owned outputs, not files this planning run may edit. The
implementation inventory must distinguish files, directories and evidence
receipts; listing a directory is not proof that its required contents exist.

## 5. Executable test and failure matrix

Use deterministic synthetic tokenizer-piece fixtures first, then the accepted
tiny decoder/tokenizer integration. Freeze fixture bytes, token IDs, tokenizer
hash, stops, limits, RNG state, expected event bytes and terminal outcomes before
execution. Do not choose only naturally convenient token boundaries from an
acquired model. No model acquisition is needed for these tests.

| Area | Concrete input and acceptance |
| --- | --- |
| Principal byte trace | Pieces `41 E2` / `82` / `AC 21 5A`, stop `E2 82 AC 21`: selected count 3; content count 6; output `41`; stop `[1,5)`; discarded overhang `5A`; exactly one stop finish |
| Formula safety | At every successful byte transaction, emitted bytes equal the minimum safe/complete prefix from the same buffer start; strictly decode every emitted slice; concatenate to the reference output |
| Stop partitioning | Enumerate every split of short fixed piece sequences into transport chunks, including empty transport chunks; selected token identities and commit boundaries remain fixed; output, winner, counters and finish agree |
| Delayed earliest start | `abc,b` with `ab+c`, `ab+x` and sealed `ab` gives the three distinct §3 results; first-completed implementation must fail this fixture |
| One-piece and overlap cases | Stop `STOP` inside one piece `xSTOPy` emits `x` and suppresses the stop/overhang; overlapping `aba,bab` in `ababa` chooses start zero, not a later overlap; combine these with the multi-piece principal fixture |
| Configured-order ties | `abc,ab` versus `ab,abc`; same-start priority changes when a match becomes decisive; identical duplicated entries retain the first configured index under the proposed policy |
| Exact bytes | Precomposed/decomposed accent non-match; embedded NUL content with an explicitly configured valid UTF-8 NUL stop; whitespace/newlines preserved; prompt-only or prompt/generated-crossing occurrence does not stop |
| Configuration bounds | Empty list accepted with zero stop holdback; empty entry refused; 16 versus 17 stops, 256 versus 257 total UTF-8 bytes; count bytes rather than characters; checked-overflow and missing tokenizer binding refuse before allocation/draw |
| Scalar boundaries | ASCII and valid 2-, 3-, 4-byte scalars split at every byte; all chunks empty except the completing chunk still yield one exact scalar; no grapheme or normalization claim |
| Invalid UTF-8 | Isolated continuation, `FF`, overlong `C0 AF`, surrogate encoding `ED A0 80`, and out-of-range `F4 90 80 80` give typed fatal errors, never replacement output |
| Final incomplete input | Each one-, two-, or three-byte prefix of a valid longer scalar is allowed only while pending; sealing it at EOS/limit/cancel gives incomplete-final-UTF-8 error |
| Error domain | Valid stop plus `FF` in one selected piece is fatal; stop plus final `E2` is fatal; invalid bytes solely in an unselected next token are not inspected; failing piece emits no partial delta |
| EOS/control IDs | Use the tokenizer's actual configured EOS ID; EOS is selected but contributes no printable bytes and is not KV-appended; absent content bytes for any other selected ID refuse unless an accepted explicit control policy covers it |
| Precedence | Pairwise simultaneous fatal/stop/EOS/output/context/cancel/internal conditions follow the frozen order; stop at a limit wins without generating another token; a pending complete stop is resolved at sealing |
| Selection atomicity | Invalid setup/distribution has zero draw/count change; post-selection byte failure retains exactly that selection's count/draw and unchanged emitted prefix; greedy remains zero-draw |
| Terminal idempotence | Repeated finish/cancel/flush calls return the stored outcome without another event, draw, count increment or decode; no second finish reason overwrites the first |
| Legacy empty output | Valid request with zero output budget returns no selected tokens, no cache allocation, cache length zero and token-limit result; invalid stop configuration still refuses before work |
| KV chronology | Compare cached/uncached serial traces; terminal selected stop/EOS/limit token is not appended just to compute unused logits; report actual final cache length rather than infer it from generated count |
| Allocation/queue refusal | Fail each bounded candidate/event allocation point; before-selection refusal is unchanged, post-selection failure is typed and retains the declared commit; no partial event escapes and no KV block is prematurely reused |
| Slow consumer/cancel | Fill available delta capacity while retaining the reserved finish capacity; further generation takes no draw until credit exists; cancel seals held bytes and records one finish without truncating a queued immutable JSON event or promising to recall partial wire bytes |
| Buffer boundaries | Exercise empty/single-byte/four-byte/maximum stops, maximum admitted piece size and three-byte UTF-8 carry; record physical capacity once; owner reconciliation must close the combined-cap counterexample, not waive it |

The UTF-8 predicate tests are exact byte decisions, not floating-point tolerance
tests. Chapter 66's log-probability tolerance remains its own boundary. A stream
observer, byte chunk size or event serialization option must not change selected
IDs, sample intervals, request-local RNG state, penalty counts or the terminal
decision for the same selected-piece domain. Do not substitute output-text
equality for this full-state comparison.

### Producer events and transport evidence

Propose a minimal typed delta event containing valid `text`, and a typed finish
event containing the reason and applicable stop index/byte interval. Freeze the
actual versioned schema and bounded serialization size with the integration
owner before implementation. Empty emission produces no delta event. The finish
is produced once even when no text was emitted. Serialize standard JSON with
`serde_json`; fixed, validated event names and JSON-escaped CR/LF prevent model
text from becoming new SSE fields. The following is a proposed synthetic frame,
not a frozen public server API:

```text
event: delta
data: {"text":"A"}

```

Its terminating blank line is part of the frame. The producer constructs and
validates a **complete immutable event** before putting it in a bounded queue.
That boundary is atomic from the queue consumer's perspective; socket writes
and TCP chunks may split the frame anywhere. Test JSON text containing quotes,
backslashes, CR/LF, NUL and a multibyte scalar. The decoded payload must equal the
intended emitted text, and no text may inject another event name or finish.
Do not put private prompts, arbitrary model paths or sensitive raw data in
telemetry; all stored examples here are synthetic.

Use exact expected frame bytes and a standards-based consumer/test harness for
dispatch behavior. Do not handwrite a general SSE/JSON parser just for this
chapter. If no admitted consumer harness exists, declare the narrow supporting
interface and its dependency/ownership gate; source inspection alone is not an
executed conformance receipt. A complete event split into one-byte transport
chunks must dispatch once after its blank line. EOF immediately before that
blank line must not dispatch the incomplete event. A disconnect cannot
retroactively unsend earlier bytes or events, and retries are not exactly-once
delivery. The static lesson can show these fixture frames without a production
SSE server or browser connection.

The bounded producer must reserve the ability to record its terminal outcome
before selecting further tokens. Freeze queue event/byte caps and backpressure
behavior; a full queue cannot silently allocate without limit or consume another
RNG draw. A tiny proposed capacity-two event fixture can hold one final delta
plus one finish, but is not a production queue default. Persisted terminal state
and successful client delivery remain separate. Chapter 69 receives the real
disconnect/cancellation/queue-reclamation integration; this chapter proves only
its local state machine and accepted framing boundary.

## 6. Teaching sequence and surface commitments

### Problem-first presentation

**Problem definition.** Explain that a generated token piece can end inside a UTF-8
character or a stop string, so immediately displaying every arriving byte can emit
invalid text or reveal bytes that should be withheld. Establish the need to release only
a prefix known to satisfy both character and stopping boundaries.

Follow the current [authoring policy](README.md#current-learner-facing-authoring-policy-2026-10-02): problem definition, guided solution, history,
visualization, then small optional practice. The opening explains the problem and its
cause without questions. Explain the worked results and their formula/Rust connection.
Remove learner prediction prompts entirely; do not move them to optional practice.
Optional tasks reproduce, inspect or explain behavior already taught. The retained
commitments below specify evidence coverage, not the old opening order.

### Retained evidence and optional-practice commitments

Retain these evidence and optional-practice commitments from the same Rust trace:

1. **A token is not a complete character.** Show the three pieces and explain
   which bytes can safely be displayed after each. Explain token IDs, raw byte pieces,
   Unicode scalar boundaries, and why a valid tokenizer piece can be incomplete
   text by itself.
2. **A stop is a byte interval, not a token.** Introduce `€!`, generated-only
   matching, the `[1,5)` interval, and suppression of same-piece `Z`. Compare six
   selected content bytes with one emitted byte, without confusing either with
   three token selections or physical KV length.
3. **Emit only a prefix proven safe twice.** Define the formula's three byte
   lengths locally, connect it to the table, and explain why a completed UTF-8
   scalar can still be withheld as part of a possible stop.
4. **Completion is not always the winning stop.** Use `abc,b` to explain delayed
   earliest-start matching and configured-order ties. Show why the future input
   budget cannot be ignored merely to disambiguate a prefix.
5. **Strict finalization and one finish.** Trace selected-token commit, byte
   staging, incomplete versus malformed bytes, EOS control behavior, and the
   exact finish precedence. Name which state changes on pre- and post-selection
   failures. Avoid the unsupported promise that every failure restores RNG.
6. **Complete events, splittable transport.** Explain incremental decoding and
   SSE framing through the two historical sources and Rust-generated fixtures.
   Contrast queue atomicity with arbitrary network chunking and incomplete-frame
   discard, not with an invented reliable-delivery guarantee.
7. **Reproduce and explain.** Run the bounded Rust example for the shown stop-ordering and final-piece cases, compare the winner/output/counts with their checked traces, and explain the differences. Hand off complete
   request-local events and terminal intent to later scheduling/cancellation work.

The contract, English chapter, Rust captions, expected output, cheat sheet,
catalog copy, diagram description and exercises must carry the same commitments.
Use a commitment map with evidence tags: current API observation; exact byte
derivation; primary history; proposed course policy. Do not turn a proposed
policy into an existing standard or a measured result. Learner-facing prose
must teach bytes and inference behavior, not authoring gates, framework machinery
or review procedures.

Exercises must include: derive the principal six-byte accounting; choose the
winner for `ab+x`; explain why sealing `E2 82` on cancellation is fatal; identify
why the EOS token can be in generated history but absent from KV; and explain why
an incomplete SSE frame need not become a client event. Answers state the exact
byte output, stop interval/index, RNG consumption where specified, and causal
reason. A question about a hypothetical retokenization must disclose that it
changes the selected-piece domain rather than expect false invariance.

Cheat-sheet terms are limited to terms actually taught: token piece, stop prefix,
UTF-8 scalar boundary, decisive stop, holdback, terminal outcome, and SSE event.
Do not make a Unicode encyclopedia or a second network lesson. Metadata should
promise literal stop and strict streaming behavior, not semantic safety,
moderation, arbitrary-language grapheme animation, or production serving.

## 7. Figure and accessibility plan

The registered figure `stop-strings-unicode-streaming`, implemented by
`StopStringsUnicodeStreamingDiagram.astro`, is useful because the same bytes have
three different boundaries: tokenizer pieces, Unicode scalars, and stop spans.
A plain final-output string hides why two intermediate emissions are empty.
Use one static semantic figure with a compact three-stage timeline/table, not
three duplicated presentation trees.

Show the six indexed bytes with piece boundaries after bytes 1 and 2, a scalar
bracket over `E2 82 AC`, the four-byte stop bracket `[1,5)`, output `41`, and
discarded overhang `5A`. Each stage names pending bytes, emitted bytes and whether
the stop is still possible or decisive. Use explicit hex/text labels and redundant
outline/pattern cues, never color alone. A small adjacent row may explain the
`abc,b` pending-candidate distinction without overwhelming the principal trace.

The accessible description must explain the relationship: piece A emits `A` but
holds the first euro byte; piece B extends an incomplete scalar; piece C completes
the euro sign and exclamation stop, so none of that held stop or trailing `Z`
is emitted. It must also state three selected pieces versus one emitted byte.
A list of hex values without these state changes is insufficient. Caption and
table headers identify what is counted in bytes; no label should imply Unicode
character counts or network delivery.

Use the shared diagram module and current style version, static math rendering,
one reading-order tree, and the repository's shared full-view control. Where
needed, only the smallest named keyboard-reachable region scrolls. Do not hide
overflow, clip byte cells, shrink text, or use private scripts. Future validation
checks built HTML, exact formula annotation, diagram registration, and nearest-box
containment in Firefox with JavaScript at desktop/narrow widths, full view,
forced colors and relevant direction-sensitive cases. Russian layout is checked
independently after translation from the reviewed English revision.

## 8. Serial implementation procedure

The future executor performs this sequence without subagents. A missing external
review or upstream interface is a recorded handoff, not permission to self-certify.

1. Confirm the actual Chapter 66 implementation checkpoint, current tokenizer and
   cached-generation regressions, frozen sources, resource/dependency graph, and
   exact step outputs. Reconcile module/shared-adapter ownership and the original
   combined holdback scope before any acceptance claim. Freeze the proposed
   matcher, duplicate, fatal-domain, EOS/control, commit-point and queue policies.
2. Write the synthetic piece fixtures and immutable expected byte/state traces
   first. Include the principal trace, delayed matches, strict-invalid cases,
   empty-list/zero-output cases, exact-cap boundaries and transport partitioning.
   Check that all fixtures are within explicit small host/time/disk bounds.
3. Implement the course-owned stop matcher and strict UTF-8 carry in the declared
   modules. Use checked lengths and offsets, candidate preparation followed by
   one byte-state commit, and stable configured ordering. Keep UTF-8 syntax in
   the standard library; prove the combined physical buffer accounting.
4. Integrate one stream state with Chapter 66 token selection and both serial
   generation paths. Preserve request-local RNG/counts and terminal-token KV
   chronology. Add typed sealing/finish behavior and the bounded producer adapter
   without implementing the future scheduler or server. Verify no hidden fallback.
5. Run the offline matrix and exact Rust demo/expected-output comparison, then the
   admitted GPU smoke integration only if all predecessor, backend, resource and
   probe-accounting gates are met. Compare scalar/cached/streamed semantic receipts;
   byte correctness is not established merely by a successful GPU launch.
6. Author canonical English from the exact executable trace and evidence map;
   render the formula and figure; freeze complete-document, reading-order and
   isolated-surface role requirements. Obtain the external independent English
   review/adjudication chain specified in §9. The author may revise but cannot
   issue its publication verdict.
7. Translate directly from that accepted English revision using the localization
   skill, obtain the two Russian reviews, and validate affected built pages and
   Firefox layouts. Any English semantic edit invalidates dependent reviews and
   translations; do not reuse stale approvals to meet a context budget.
8. Run all outer validations, verify required receipts/output inventory and
   canonical-byte identities, publish the coherent implementation, record its
   checkpoint and commit that step alone. Hand off stream events, stop provenance,
   terminal intent and pending serving gates to Chapter 68/69 owners. This planning
   task neither executes this sequence nor starts another chapter.

## 9. Exact validation commands and external handoffs

The six frozen `BUILD_STATE` validation commands run from the repository root:

```bash
scripts/run-functional-history-source-evidence.sh --step implement-ch67-stop-strings-unicode-streaming --chapter 67-stop-strings-unicode-streaming --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
scripts/run-functional-offline.sh --step implement-ch67-stop-strings-unicode-streaming --target implement-ch67-stop-strings-unicode-streaming-v1
scripts/run-functional-gpu-profile.sh run --step implement-ch67-stop-strings-unicode-streaming --target implement-ch67-stop-strings-unicode-streaming-v1 --profile 8gb-gpu-smoke
scripts/run-functional-firefox.sh test --step implement-ch67-stop-strings-unicode-streaming --target chapter-67-stop-strings-unicode-streaming-v1
git diff --check
./course audit-host
```

The frozen implementation-plan list has **19**, not 18, entries. It describes
runner-internal/future validation and does not replace the six outer commands.
Preserve the exact ordered literals below. The admitted runner executes Cargo
commands from the Rust workspace and repository scripts/npm commands from their
declared repository-root boundary; do not guess a new working directory or run
these host commands outside that boundary.

```bash
node scripts/check-functional-laptop-llm-plan.mjs
npm --prefix site run check:contract -- ../curriculum/chapters/67-stop-strings-unicode-streaming.md
node scripts/check-functional-rust-ownership.mjs --chapter 67-stop-strings-unicode-streaming
node scripts/check-functional-rust-examples.mjs --chapter 67-stop-strings-unicode-streaming
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo test --workspace --locked
scripts/check-rust-dependencies.sh
scripts/check-rust-demos.sh
node .agents/skills/author-llm-course-english/scripts/english-review.mjs verify --spec audits/functional-laptop/reviews/67-stop-strings-unicode-streaming/english/spec.json --bundle audits/functional-laptop/reviews/67-stop-strings-unicode-streaming/english/bundle --review-routing audits/functional-laptop/reviews/67-stop-strings-unicode-streaming/english/review-routing.json --review-seals audits/functional-laptop/reviews/67-stop-strings-unicode-streaming/english/review-seals --adjudication-bundle audits/functional-laptop/reviews/67-stop-strings-unicode-streaming/english/adjudication-bundle --adjudication-routing audits/functional-laptop/reviews/67-stop-strings-unicode-streaming/english/adjudication-routing.json --adjudication-seals audits/functional-laptop/reviews/67-stop-strings-unicode-streaming/english/adjudication-seals
node .agents/skills/localize-llm-course/scripts/localization-review.mjs verify --spec audits/functional-laptop/reviews/67-stop-strings-unicode-streaming/ru/spec.json --bundle audits/functional-laptop/reviews/67-stop-strings-unicode-streaming/ru/bundle --bilingual-record audits/functional-laptop/reviews/67-stop-strings-unicode-streaming/ru/bilingual.raw.json --target-only-record audits/functional-laptop/reviews/67-stop-strings-unicode-streaming/ru/target-only.raw.json
npm --prefix site run check:chapter -- --locale en --chapter 67-stop-strings-unicode-streaming
npm --prefix site run check:chapter -- --locale ru --chapter 67-stop-strings-unicode-streaming
npm --prefix site run check:parity -- --chapter 67-stop-strings-unicode-streaming
npm --prefix site run check:content
npm --prefix site run check
npm --prefix site run test -- --run
npm --prefix site run build
npm --prefix site run test:links
```

Use the shared [planning contract](README.md) for exact execution, publication
and review machinery. This packet adds chapter-specific evidence; it does not
weaken that contract. The single executor cannot provide its own independent
publication approval. Freeze the English source, built HTML, commitments,
reading-order/isolated inventories, neutral role requirements and author context.
Obtain a fresh technical/pedagogical review and a different fresh isolated-surface
review, then two further same-role adjudications. Use the exact canonical prompts,
four-artifact context boundaries, untouched raw response bytes, routing manifests
and deterministic seals; a host checker proves bindings, not teaching correctness.
All four English verdicts must pass before localization. These are future external
handoffs, not reviews this internal planning turn has run.

The Russian translator works directly from the accepted English revision, with
independent bilingual and target-only reviews and affected rendered validation.
The successful content-context inventory is eight: one English author, two
English reviewers, two adjudicators, one Russian translator, and two Russian
reviewers. A byte/meaning/role change invalidates dependent judgments as required;
failed or stale contexts remain evidence rather than being relabeled successful.
Firefox with JavaScript is the sole browser project. Built static HTML must
contain the formula, figure and substantive evidence; no server is required for
the published lesson. No alternative engine or scripting-off test is substituted.

## 10. Profiles, cost, readiness, and handoff

Only three profiles are bound to this chapter: `8gb-gpu-smoke` **executes**;
`8gb-gpu-core` **consumes**; `8gb-adapter` **consumes**, but remains blocked on
artifact selection. No cheap-seed or production profile is silently added.
Preserve their exact frozen limit literals:

```text
profile(8gb-gpu-smoke;state=planned;scale=laptop;device=rtx4070-laptop-8gb;dtype=wgpu-vulkan-fp16-fp32-protected-dynamicv1;P_max=32514560;C_max=128;N_max=65536;microbatch_max=1;accumulation_max=8;installed_host_bytes_min=8589934592;installed_host_bytes_recommended=17179869184;host_bytes_max=8589934592;device_bytes_max=2147483648;device_headroom_bytes_min=536870912;disk_bytes_max=5000000000;download_bytes_max=536870912;wall_seconds_max=900;calibration_policy=gpu-synchronized-v1;probe_seconds_min=300;probe_seconds_max=900;probe_synchronized_microsteps_min=100;probe_windows=10;calibration_tokens_min=10240;throughput_valid_tokens_per_second_min=128;throughput_stat=lower-aggregate-or-p10-window;second_half_median_percent_of_first_min=85)
profile(8gb-gpu-core;state=planned;scale=laptop;device=rtx4070-laptop-8gb;dtype=wgpu-vulkan-fp16-fp32-protected-dynamicv1;P_max=32514560;C_max=512;N_max=20000000;microbatch_max=1;accumulation_max=64;valid_tokens_per_update_max=32768;installed_host_bytes_min=17179869184;installed_host_bytes_recommended=34359738368;host_bytes_max=12884901888;device_bytes_max=6710886400;device_headroom_bytes_min=536870912;disk_bytes_max=30000000000;download_bytes_max=4000000000;wall_seconds_max=108000;calibration_policy=gpu-synchronized-v1;probe_seconds_min=300;probe_seconds_max=900;probe_synchronized_microsteps_min=100;probe_windows=10;calibration_tokens_min=10240;throughput_valid_tokens_per_second_min=350;throughput_stat=lower-aggregate-or-p10-window;second_half_median_percent_of_first_min=85;projection=fixed3600-plus-1.5N-over-rate)
profile(8gb-adapter;state=blocked-artifact-selection;scale=selected-compatible-20m-50m;device=rtx4070-laptop-8gb;dtype=wgpu-vulkan-fp16-fp32-protected-dynamicv1-and-artifact-bound;P_max=50000000;C_max=512;N_max=1048576;microbatch_max=1;accumulation_max=32;installed_host_bytes_min=17179869184;installed_host_bytes_recommended=34359738368;host_bytes_max=12884901888;device_bytes_max=6710886400;device_headroom_bytes_min=536870912;disk_bytes_max=21474836480;download_bytes_max=536870912;wall_seconds_max=43200;calibration_policy=gpu-synchronized-v1;probe_seconds_min_per_phase=300;probe_seconds_max_per_phase=900;probe_synchronized_microsteps_min_per_phase=100;probe_windows=10;calibration_tokens_min=10240;throughput_sft_response_tokens_per_second_min=100;throughput_preference_response_tokens_per_second_min=25;throughput_stat=lower-aggregate-or-p10-window;second_half_median_percent_of_first_min=85)
```

These are ceilings/requirements, not observed resource usage. Host-installed
memory differs from process use; allocator use differs from device-wide free
headroom. The smoke allocator cap is 2 GiB, host cap 8 GiB, headroom floor
512 MiB, disk cap 5 decimal GB, and wall cap 900 seconds. Exact stop/UTF-8 tests
must also charge buffers, scratch serialization and queued events. Model, KV,
workspace and other owners remain charged under the accepted complete estimator;
small visible text is not evidence that a model run fits. Core's nonborrowable
KV component remains 67,108,864 bytes, not the full device budget.

Carry Chapter 59/62's unresolved warmup/calibration/overhead token accounting
gate. The inherited probe is 300–900 seconds, at least 100 synchronized successful
microsteps, 10 equal-duration windows and at least 10,240 valid tokens; use the
lower aggregate-or-p10-window rate and require the second-half median to be at
least 85% of the first. Smoke requires 128 valid tokens/second, core 350, and the
blocked adapter profile separately requires 100 SFT response tokens/second and
25 preference response tokens/second. Freeze the precise quantile and combined
work accounting through their existing owners. Do not shorten duration, insert
sleep, exclude hidden work, equate enqueued work with completion, or borrow a
calibration for a changed backend/model/context tuple. A byte fixture is not a
physical GPU-admission measurement.

The future cost class is `C3/G1/N1`, with no paid service. Historical source
network input is capped at 134,217,728 bytes; model acquisition authority is zero.
Profile download ceilings do not authorize acquiring a model or introduce an
alternative runtime. Successful content contexts are exactly eight, at most 16
attempts, using the user-selected model. Each has at most 2,097,152
input bytes/200,000 input tokens and 1,048,576 output bytes/40,000 output tokens;
aggregate input/output limits are 33,554,432/16,777,216 bytes, with 28,800 seconds
wall time. No routine image review; optional screenshots after a human report follow the
README's conditional diagnostic policy and limits. These future limits
are not evidence that reviews or GPU work occurred in this planning run.

Implementation readiness requires all of the following, with an explicit owner
and receipt rather than an implied default:

- Actual Chapter 66 implementation and tokenizer/control identities; accepted
  request-local selection/count/RNG hooks and real cached-generation chronology.
- Owner-frozen earliest-start delayed matching, duplicate policy, whole-selected-
  piece fatal domain, selection/byte commit points and terminal sealing behavior.
- Reconciliation of the original holdback cap with strict UTF-8 carry, maximum
  admitted piece and physical queue/staging capacity, including the single-byte-
  stop counterexample. This plan does not amend the frozen capability.
- Declared shared module/trace/producer integration, a versioned JSON/SSE schema,
  an admitted consumer test boundary, and finite queue/backpressure policy. No
  phantom Chapter 69 service or unbounded event buffer may satisfy that gate.
- Accepted backend/Rust-only teaching policy, exact-tuple hardware admission,
  complete resource estimate and inherited probe-accounting reconciliation before
  any GPU execution. No fallback or surrogate core claim.
- Current history evidence, exact fixtures and trace receipts, independent English
  and Russian review handoffs, built/static/Firefox checks and output inventory.

The next owner receives emitted byte intervals and complete event payloads,
selected-token versus cache chronology, the single terminal result, stop
provenance, and pending queue/lease cleanup obligations. It does not receive
permission to reinterpret stop order or resample after termination. Planning
readiness is distinct from implementation readiness; all product implementation,
formal publication judgments, acquisition, and later chapter work remain held.
