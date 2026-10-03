# Chapter 77 implementation packet: constrained JSON decoding

Internal planning only. Follow the [packet contract](README.md) and substantive
[extension plan](../functional-laptop-llm-extension-plan.md). No implementation,
model execution, acquisition, repair or localization is performed. Current
problem-first/no-prediction, selected-model and no-routine-image policies apply;
planning does not release the execution hold.

## 1. Scope and boundary

| Frozen binding | Value |
| --- | --- |
| Chapter / planning step | `77-constrained-json-decoding` / `detail-ch77-constrained-json-decoding` |
| Build / implementation | `extend-course-to-functional-laptop-llm-20260810` / `implement-ch77-constrained-json-decoding` |
| Predecessor / owner / capability | `implement-ch76-retrieval-provenance` / `owner-ch77` / `CAP-ISA-RT-003` |
| Finding / claim / overbroad-surface IDs | All empty |
| Formula / figure | `teaching-formula-ch77-constrained-json-decoding` / `constrained-json-decoding` |
| Profiles / locales | `8gb-gpu-smoke`: `executes`; `8gb-adapter`: `consumes`; `en`, `ru` |
| Special gates | `english-two-review-two-adjudication`; `direct-russian-bilingual-target-only`; `static-firefox-only` |

Teach how a byte-prefix automaton removes tokens that cannot lead to a member
of an explicit finite JSON language, before the existing sampler chooses a
token. Post-validation is still required. A schema-valid object can contain
false or unauthorized requests; Chapter 78 supplies host tool authorization.
No complete JSON Schema support, general regex/reference engine, arbitrary
programming-language grammar, hidden grammar-library mask or second sampler.

Exact prerequisites: `curriculum/functional-laptop-llm-extension-plan.md`,
`audits/2026-08-10-functional-llm-capability/coverage.md`,
`audits/2026-08-10-functional-llm-capability/requirements.md`,
`audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md`,
`.agents/skills/author-llm-course-english/SKILL.md`,
`.agents/skills/localize-llm-course/SKILL.md`,
`site/src/i18n/functional-chapter-locales.json`,
`exact predecessor checkpoint=implement-ch76-retrieval-provenance`, and
`artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json`.

Consume 44's exact token bytes/controls, 50–51's dependency/errors/admission,
52–53/62's accepted precision/device, 65's transactional KV, 66's sampler order
and request RNG, 67's UTF-8/stop policy, 68–70's request lifecycle, 74's cache
identity and 75's context policy. Reuse 76's distinction between validated
structure and authorized meaning; its post-parse citation envelope does not
implement token constraints. Shared generation/request/service integration must
be declared with its owner before edits; no parallel decoding loop or state store.

## 2. Evidence and source ledger

Baseline `58c91920d09612a548342f39a6f85a851ad78e3d`; run
`20261003T111056Z-detail-ch77-constrained-json-decoding-01`. Inputs: 62,516 bytes,
SHA-256 `631bdb0f433b984395b2234b01a3261ce5e1755650767820c04aa157c145b048`.
Preflight hash `129144f8078f66dc2cb234eacf190f812ed857157d4cade6e4919445afc58a81`.
Current plan hash `be619fa7e8a09adc95b7e7d7ab89b23a1c2998389f43b69a53bd92748aedfd6d`;
Chapter 76 hash `faad88ff071db1a185ba84b22a1defd71145cee3e269bc0ad7cadee93e4700b1`.

Observed current Rust: `BpeTokenizer::from_merge_pairs(&[])` constructs the
zero-merge byte vocabulary; `token_bytes` returns raw content bytes and `None`
for controls/unknown IDs (`src/tokenizer/bpe.rs`, SHA-256
`81d209a4b1286db72d4b24bdbb3a30a30273da0fac254a4a17cfa66be5881469`). BOS/EOS are
0/1, content byte IDs are byte+2. `sampling_distribution` and
`sample_next_token_with_trace` in `src/generation/sampling.rs` reject nonfinite
logits, including negative infinity. The current source has no constrained-schema
compiler, automaton or grammar-aware support API. All interfaces below are
proposed; inspected source behavior is not future feature acceptance.

Read-only lookup inspected only these frozen primary sources on 2026-10-03:

- `SRC-ISA-026`, [PICARD, EMNLP 2021](https://aclanthology.org/2021.emnlp-main.779/), abstract: incremental parsing rejects inadmissible tokens during SQL generation. Its task/model results do not supply this JSON subset or semantic correctness.
- `SRC-ISA-030`, [llama.cpp GBNF guide](https://github.com/ggml-org/llama.cpp/blob/master/grammars/README.md), “JSON Schemas → GBNF”: practical subset conversion and documented unsupported features. No claim of complete schema support or permission to reuse its token-mask implementation follows.

The second frozen URL names mutable `master`; the inspected page did not expose
an exact commit. **Source-owner gate:** before implementation history is authored,
resolve this same guide to an actual commit, freeze commit URL plus transport and
extraction hashes, then recheck the claimed passages. Missing pin stops that
evidence path; do not invent a revision or substitute a third citation. Preserve
the frozen source ID/original URL and add resolved provenance through the accepted
N1 receipt. No raw body hashes were measured in this planning lookup. Both future
source records bind the accepted extractor runtime and auditable claim locators.

The finite subset, canonical language, trie compiler and failure choices below
are course-local proposed design, not attributed to either historical system.
The Rust historical contrast uses post-hoc rejection versus incremental filtering
on the same tiny language, not a reproduction of PICARD's SQL model or llama.cpp.

## 3. Inputs and worked example

### Freeze a genuinely finite subset

Proposed `FiniteJsonV1` is a deliberately small subset of JSON Schema 2020-12
with a stricter canonical **generation language**. It is not a general schema
engine. Schema input is at most16,384 UTF-8 bytes, nesting depth4 schema nodes,
and contains no duplicate object keys. A mature strict JSON parser provides
syntax/Unicode/number lexemes; course code owns the supported-keyword whitelist,
finite expansion and canonical-generation policy. Reject unknown keys at every
subschema, including nested `$ref` and `format`, before model/KV allocation.

| Node type | Accepted keys and exact restrictions |
| --- | --- |
| Common | Required single string `type`, never a type array. Optional root-only `$schema` must equal `https://json-schema.org/draft/2020-12/schema`. No `$id`, `$defs`, `const`, combinators, references, formats, patterns, annotations or unlisted keywords. |
| `object` | Exactly `type`, `properties`, `required`, `additionalProperties`; last must be explicit `false`. At most4 distinct property names, each at most16 UTF-8 bytes; required is a unique subset of those names. Optional properties may be absent or present. Every property has a recursively valid subschema. |
| `array` | Exactly `type`, `items`, `minItems`, `maxItems`; homogeneous items only, integers0≤min≤max≤3. No tuple schema, uniqueItems or contains. |
| `string` | Exactly `type`, `enum`;1–20 distinct decoded Unicode strings, each≤16 Unicode scalars and≤64 UTF-8 bytes. Controls are permitted only via valid JSON escapes in schema syntax; unpaired surrogates refuse. No unrestricted strings or minLength/maxLength/pattern. |
| `integer` | Exactly `type`, `enum`;1–20 distinct integer values from -1024 through1024. Accept only plain canonical decimal lexemes, no exponent, fraction, negative zero or leading zeros. |
| `number` | Exactly `type`, `enum`;1–20 distinct multiples of one quarter in [-1024,1024]. Parser-preserved numeric lexemes must be plain integer spelling or integer plus `.25`, `.5` or `.75`; sign applies to the whole value. No exponent, `.0`, `.50`, negative zero, NaN/infinity or rounding an arbitrary decimal into the subset. Checked integer quarter-units establish exact equality. |
| `boolean` / `null` | Exactly `type`; boolean's domain is false/true, null's domain is null. No enum on these nodes in V1. |

This whitelist is the exact admitted schema shape, not a claim that other JSON
Schema forms are invalid standards. Duplicate enum values after semantic decoding
refuse. Canonical property order is decoded-name UTF-8 bytes ascending. Output
has no whitespace, no BOM and no trailing LF. Emit all required keys and each
chosen optional key once; unknown/duplicate keys are impossible in the language.
Strings use raw UTF-8 for non-control Unicode; quote/backslash and controls use
the pinned JSON serializer's verified canonical escaping policy: `\"`, `\\`,
`\b`, `\f`, `\n`, `\r`, `\t`, other U+0000–001F as lowercase `\u00hh`.
Solidus stays `/`. Numeric values use the canonical admitted decimal spelling;
null and boolean use their lowercase JSON literals. Standard serialization
plumbing may emit escaped strings; course code chooses order/domain and verifies
the canonical bytes. It must not handwrite a general JSON parser/serializer.

Expand the finite semantic choices with checked cardinality, stopping before
more than20 distinct complete output alternatives or8,192 bytes per alternative.
Each intermediate Cartesian-product/optional/array expansion must obey those
bounds, not allocate a giant product before counting it. Build a course-owned
byte-prefix trie with at most **64 states including root and dead state**; each
distinct prefix is a real state. This counts expanded alternatives, punctuation,
escapes and UTF-8 byte positions, not schema syntax nodes. Stop before adding
state65; no hidden NFA/product/minimization work may evade the cap. V1 rejects
otherwise valid schemas whose language exceeds these bounds. No separately
measured enlarged cap is selected by this packet.

Every nondead trie prefix has a byte completion. Binding a tokenizer additionally
builds token edges from complete raw token byte strings, excludes empty/control
pieces and computes backward reachability to an accepting state with EOS. A
prefix without a tokenizable completion is unusable, even if byte-completable.
This graph uses the same bounded states; edge/mask arrays still require checked
allocation against actual vocabulary size and the CPU budget. Do not call it
free because the state count is small.

### Literal euro fixture

Schema is the exact JSON value:

```json
{"type":"object","properties":{"s":{"type":"string","enum":["€"]}},"required":["s"],"additionalProperties":false}
```

The sole canonical output is `{"s":"€"}`:11 UTF-8 bytes, but9 Unicode scalars.
With `BpeTokenizer::from_merge_pairs(&[])`, its content token IDs are
`[125,36,117,36,60,36,228,132,174,36,127]`, followed by EOS1. BOS0 is never
an allowed generated token. The euro bytes are hex `E2 82 AC`, individually
token IDs228,132,174. There are12 live prefix states plus one dead state:13 total.

Let qj mean j canonical bytes consumed. The initial state q0 admits byte `{`;
after `{"s":"`, q6 admits E2. q7 admits only82, and q8 onlyAC; neither q7 norq8
is a complete UTF-8 string or accepting JSON state. EOS is inadmissible there.
After q11, only EOS is admissible for this singleton language. A token carrying
the complete `{"s":"€"}x` is rejected atomically: reaching acceptance partway
through its bytes does not license the trailing `x`. A token containing only
`E2 82` at q6 is allowed if its resulting q8 has a tokenizable completion.
Token boundaries need not align with Unicode scalars, JSON punctuation or escapes.

Frozen notation:

```text
A(q) = {token_i | delta_star(q, token_bytes_i) is live}
```

Explain $\delta^*$ as consuming **all** bytes of one token without changing the
live request; “live” means an accepted continuation remains in the declared
language and tokenizer binding. EOS is a separate zero-byte terminal action,
allowed only at accepting q. Non-EOS zero-byte tokens are rejected, preventing
an empty-piece loop. The final JSON parser receives concatenated bytes, never
one decoded string per token.

With byte budget11 and sampled-token budget12 **including required EOS**, the
fixture succeeds. Byte budget10 or token budget11 cannot complete that byte-token
path and must refuse admission or return a typed incomplete outcome, never a
successful truncated object. The policy below uses a preflight shortest-path
check, then explicit failure at an exhausted cap; it does not promise completion
for every sampled branch. At a accepting prefix with longer alternatives, both
EOS and valid continuation content tokens may be eligible if budgets permit.

### Sampling and bounded-failure policy

Bind one immutable schema/compiler/tokenizer identity and request-local grammar
state. Compute admissible content IDs plus EOS, then intersect with the request's
remaining byte capacity and reserved-EOS policy. With only one selection slot
left, only EOS may be selected; if q is not accepting, return
`ConstraintBudgetExhausted` before sampling. Count content and EOS selections,
raw output bytes and context usage separately. The initial shortest tokenizable
completion plus EOS must fit declared token/context limits and some completion
must fit byte limits; this preliminary feasibility check is not a joint
all-future-branches completion guarantee. Do not say grammar liveness assures a
finish within512 tokens. A later long branch may end in typed incomplete failure.

The Chapter66 order becomes: grammar eligibility → presence/frequency penalties
on eligible IDs → temperature/full-eligible-support probabilities → nucleus
prefix → top-k intersection → one protected categorical draw. Full support means
all grammar-eligible tokens here, not the original vocabulary and not an
already-truncated top-k set. Stable ties still use token ID; retain the existing
finite-logit validation over the original raw vocabulary. Validate top-k against
that original vocabulary size V; its eligible-rank prefix contains
min(k, eligible_count) IDs before intersection with the nucleus prefix. Keep
original token IDs throughout, not indices into a compact slice. Thus k=V
remains valid when grammar leaves only one token. Use an explicit eligible-ID
view, **not negative infinity
in the current finite-only API**. Raw model logprob and final constrained-policy
logprob have different denominators; label both through the existing66 evidence
contract. Mask construction, rejected token trials and dead-end checks consume
no RNG. Greedy consumes none; stochastic selection consumes the same one draw
under the existing request policy even for singleton support. Disabled
constraints take the unchanged unconstrained path.

Reject nonempty literal-stop configuration for constrained V1 before allocation:
a stop substring can cut inside JSON. Use required EOS as the only successful
finish; token/context cap, cancellation, timeout, device error or validation
failure is not successful structured output. Buffer at most8KiB output until EOS
and independent validation pass; then emit one complete UTF-8 structured result
through the accepted serving transport. Do not emit partial JSON as success or
pretend post-validation retracts earlier bytes. Ordinary unconstrained streaming
and stop behavior remain unchanged. Tool execution remains impossible here.

### Complete finite evidence and100 seeds

Use ten schemas below, all in the declared subset; fixtures mention semantic
values, which the course compiler canonicalizes exactly. Seed s=0..99 chooses
case `s % 10`. Run all100 distinct seeds through the accepted request RNG and
record input seed/state, support trace, selected tokens, final bytes and parser
result. For positive byte-tokenizer tests use byte capacity64 and selection
capacity65 including EOS, enough for every word below. These are CPU scripted
logit tests, separate from actual GPU smoke evidence.

| Case | Schema construction / canonical language | Alternatives / trie states including dead / longest bytes |
| --- | --- | --- |
| 0 | Euro object above |1 /13 /11 |
| 1 | Array of booleans, min0 max2 |7 /39 /13 |
| 2 | String enum empty, euro, LF |3 /11 /5 |
| 3 | Integer enum[-2,0,3] |3 /6 /2 |
| 4 | Number enum[-1.5,0,2.25] |3 /11 /4 |
| 5 | Boolean |2 /11 /5 |
| 6 | Null |1 /6 /4 |
| 7 | Object properties a:boolean,b:null; required[a], additionalProperties:false |4 /38 /20 |
| 8 | Array of integer enum[0,1], min1 max2 |6 /17 /5 |
| 9 | String enum quote, backslash, U+1F600 |3 /13 /6 |

Counts above are independent prefix-set derivations, not observed Rust output.
Freeze the explicit value lists and build a separate test enumerator from those
literal lists, not production compiler output. Exhaustively compare every legal
prefix and all256 next bytes with the literal language's prefix set; accepting
states equal complete words exactly. Test EOS at every prefix. Extend to a
bounded test vocabulary containing individual bytes plus complete/multipart
strings, bad suffixes and empty/control cases. Product traversal of trie versus
literal-prefix oracle must visit all reachable paired states and compare
acceptance/transitions; record its state count and charge its memory. This proves
the finite fixture language, not all arbitrary schemas or model truthfulness.

For each seed's scripted logits, use finite values `((token_id + s) % 7) - 3`
computed in signed arithmetic; set an inadmissible token's logit to100 whenever
one exists. The mask must prevent its selection. Keep penalties/temperature,
top-p/top-k and seed policy explicit in the fixture manifest; proposed baseline
is zero penalties, temperature1, top-p1 and top-k equal vocabulary size. Add
separate nonzero-penalty/top-p/top-k cases that compare against the same66 oracle
on the explicit eligible subset. No expectation that arbitrary seeds visit every
branch; exhaustive language tests provide that coverage separately.

## 4. Rust design and ownership

Proposed chapter APIs:

```rust
struct FiniteSchema { /* version, admitted AST, canonical identity */ }
struct ByteAutomaton { /* <=64 states, accepting bits, byte transitions */ }
struct BoundConstraint { /* automaton + tokenizer identity + token liveness */ }
struct ConstraintState { /* state ID, committed bytes, counters */ }
fn compile(schema_bytes: &[u8], budget: &mut CompileBudget)
    -> Result<ByteAutomaton, ConstraintError>;
fn allowed_ids(bound: &BoundConstraint, state: &ConstraintState,
    limits: RemainingLimits) -> Result<EligibleTokenIds, ConstraintError>;
fn advance_trial(bound: &BoundConstraint, state: &ConstraintState, token: u32)
    -> Result<ConstraintTrial, ConstraintError>;
fn validate_complete(schema: &FiniteSchema, bytes: &[u8])
    -> Result<ValidatedJson, ConstraintError>;
```

`schema.rs` owns whitelist/type/domain/canonical policy and checked finite
expansion. `automaton.rs` owns trie states/transitions/acceptance/reachability;
`token_mask.rs` owns raw-piece trials and eligible IDs; `validate.rs` owns final
semantic/canonical checks after a mature independent strict JSON parser. The
independent validation path must walk parsed values against the admitted schema
without consulting DFA accepting state or enumerated-language membership as its
only answer. It also checks canonical key order/escaping/numeric spelling and
duplicates from lossless parse evidence. A parser that silently collapses
duplicate keys is insufficient; use a duplicate-rejecting visitor/approved parser
interface, not a hand-coded general JSON parser. A mature subset validator may
add a second semantic check, but cannot own token masking/grammar compilation.
Dependency versions/features/full graph must be approved under owner50 before use.

Build a transition table with checked sizes;64×256 one-byte state indices is
16,384 bytes if the admitted representation uses u8 IDs, plus explicit acceptance
and metadata. This is a design calculation, not total measured memory. Trial
transitions never mutate live q, history, byte buffer, RNG or KV. Preserve the
66/67 chronology: the forward producing current logits completes first; validate
mask/trials and reserve commit storage; then one sampling decision commits its
RNG, history, grammar state, output bytes and counters together. Only afterward,
if another logits step is needed, append the selected nonterminal token through
the decoder/KV owner. Failure of that later append does not undo the committed
selection, redraw randomness or rewind grammar state. It terminates this request
without accepted JSON exposure. EOS requires no unused append. Final
post-validation failure likewise does not rewrite already consumed RNG/history;
it refuses publication. Failed pre-selection masks/trials consume no draw and
leave the previous committed state unchanged.

Reserve output/trial/token-mask/graph resources before model/KV allocation.
Compiler all-state cap includes root/dead, expanded optional/array products and
all byte prefixes; tokenizer reachability and independent product traversal have
their own counted memory/work, no unbounded hidden graph. Hash schema bytes,
canonical subset/version, compiler, tokenizer vocabulary/byte expansions, EOS
policy and output-budget policy into request/receipt identity. Prompt KV values
do not depend on grammar alone, so do not arbitrarily invalidate safe prompt KV;
generation-result/sampler identities must bind the constraint. Shared cache and
request owners decide the precise existing identity field integration.

Map the old capability paths `application/constrained.rs` and
`generation/decoding.rs` to the four frozen owned modules below. Declare changes
to the existing66 sampler support API, generation loop,67 finish handling,
serving/request and service schema before edits. Keep one sampler/RNG/finish
registry and one decoder. Full-prefix/cached decoding must use the same grammar
state and compare exact support/token/RNG/finish traces under identical logits;
device numerical parity uses accepted52/53 tolerances, not a tolerance for changed
discrete decisions. A real model smoke run and synthetic mask proof are separate.

Errors distinguish `SchemaTooLarge`, `UnsupportedKeyword`, `UnsupportedSchema`,
`DuplicateKey`, `AlternativeLimit`, `StateLimit`, `TokenizerMismatch`,
`UntokenizableLanguage`, `EmptyLegalSupport`, `ConstraintBudgetExhausted`,
`InvalidConstrainedToken`, `IncompleteJson`, `PostValidationFailed` and inherited
resource/device/cancel errors. Validate input/schema/stop configuration first,
then bounded compilation/token binding and admission, then run. Unknown/nested
keywords fail before any model/device/KV allocation. On dead support do not
relax the schema, expose all tokens, resample by rejection or fall back to
unconstrained generation. Cap failures preserve the last committed request
state for diagnostics but expose no successful JSON; cleanup follows69 ownership.

Exact26 implementation outputs:

```text
curriculum/chapters/77-constrained-json-decoding.md
rust/crates/llm-from-scratch/module-registry/functional-v1/ch77-constrained-json-decoding.module
rust/crates/llm-from-scratch/tests/ch77_constrained_json_decoding.rs
rust/crates/llm-from-scratch/examples/ch77_constrained_json_decoding.rs
rust/crates/llm-from-scratch/examples/expected/ch77_constrained_json_decoding.txt
rust/crates/llm-from-scratch/src/generation/constrained/schema.rs
rust/crates/llm-from-scratch/src/generation/constrained/automaton.rs
rust/crates/llm-from-scratch/src/generation/constrained/token_mask.rs
rust/crates/llm-from-scratch/src/generation/constrained/validate.rs
site/src/content/chapters/en/77-constrained-json-decoding.mdx
site/src/content/chapters/ru/77-constrained-json-decoding.mdx
site/src/i18n/functional-catalogs/en/77-constrained-json-decoding.json
site/src/i18n/functional-catalogs/ru/77-constrained-json-decoding.json
site/src/content/cheat-sheets/en/77-constrained-json-decoding.json
site/src/content/cheat-sheets/ru/77-constrained-json-decoding.json
site/src/components/chapters/ConstrainedJsonDecodingDiagram.astro
site/tests/77-constrained-json-decoding-diagram.test.ts
site/tests/77-constrained-json-decoding.test.ts
site/tests/e2e/ch77-constrained-json-decoding.spec.ts
audits/functional-laptop/reviews/77-constrained-json-decoding/
artifacts/functional-laptop/chapters/77-constrained-json-decoding/
artifacts/functional-laptop/chapters/77-constrained-json-decoding/history-source-evidence-receipt.json
artifacts/functional-laptop/chapters/77-constrained-json-decoding/gpu-execution-receipt.json
artifacts/functional-laptop/step-output-inventories/implement-ch77-constrained-json-decoding.json
BUILD_STATE.yaml
DECISIONS.md
```

## 5. Test and failure matrix

| Case | Concrete assertion and state after failure |
| --- | --- |
| `schema_closed_before_allocation` | Unknown root/nested keyword, `$ref`, `format`, missing false additionalProperties, duplicate keys/enum values, invalid numeric lexemes and schema16KiB+1 all refuse with allocation/dispatch counters0. Schema semantics is not silently narrowed. |
| `finite_expansion_caps` |20 alternatives accepted if states fit;21 refuses before materialization. A string enum containing ten U+0000 scalars serializes to62 bytes (quotes plus ten six-byte escapes), giving63 live-prefix states plus dead=64; append ASCII a to require state65 and refuse. Count optional/array Cartesian products, token reachability and oracle-product memory. |
| `euro_byte_trace` | Exact11 bytes/11 content IDs plusEOS; q7/q8 forbidEOS and invalid continuation bytes. Whole token ending in x rejects without prefix commit; raw E2/82 split remains valid as a prefix. |
| `unicode_escape_and_keys` | Quote/backslash/LF/emoji cases; reject overlong UTF-8, stray continuation, truncated scalar, unpaired-surrogate schema strings, noncanonical escaped euro, unknown/duplicate output keys, wrong key order or whitespace. Valid JSON outside canonical generation language is not admitted by V1. |
| `literal_language_equivalence` | Exhaust all prefixes×256 bytes and EOS for ten literal languages; paired-state traversal matches acceptance and transitions. Independently parse every complete canonical word and validate schema semantics; mutated near misses reject. |
| `hundred_seed_outputs` | Seeds0..99 across ten cases; invalid high-logit ID never selected; final concatenated JSON passes independent validation. Record actual RNG/support/token/finish traces, no hand-authored passing stdout. |
| `processor_order` | Grammar first, then66 penalties/temperature/full-eligible nucleus/top-k. Compare finite eligible-ID oracle; k=V with singleton grammar support remains valid, original IDs remain unchanged and current raw nonfinite-logit rejection remains. No RNG advancement during masks or rejected trials. |
| `budgets_not_liveness` | Euro11-byte/12-selection succeeds;10-byte or11-selection refuses/fails incomplete. A branching enum with a short and long word demonstrates preflight feasibility does not promise all branches fit; hitting cap yields typed failure, never a partial success. EOS consumes a slot but no output bytes. |
| `empty_and_control_tokens` | Empty non-EOS/control/unknown token pieces excluded; EOS only accepting; tokenizer with no path to any word refuses binding. A runtime exhausted mask never falls back to unconstrained support. |
| `stop_and_stream_boundary` | Nonempty literal stops rejected before allocation. No partial JSON emitted beforeEOS/final validation. Cancel/timeout/device failure releases owned resources and returns typed failure, not valid-object finish. |
| `post_validator_independent` | Inject compiler bug accepting duplicate/unknown key or wrong scalar type: independent parser/schema/canonical checks reject. JSON syntax alone does not satisfy schema. A schema-valid false tool request passes structure only, not authorization. |
| `disabled_and_cache_parity` | Disabled mode matches protected66 unconstrained tokens/RNG/logprobs/finish byte-for-byte. Constrained full/cached fixture matches states/support/tokens/RNG/bytes; no terminalEOS KV append. Changed tokenizer/schema binding refuses stale reuse. |

All byte sequences, IDs, state counts, support sets and discrete transitions use
equality. Only decoder/logit numerical comparisons use the existing declared
operation-specific tolerance; schema or sampling differences cannot be excused
by a broad epsilon. Fault tests assert both returned error and absence of partial
publication, unchanged previously committed state and exactly-once lease/KV cleanup.

## 6. Teaching and surface commitments

Open with the problem: a decoder chooses vocabulary tokens, while an application
expects a complete structured value; requesting JSON in a prompt does not remove
tokens that break the required shape. Explain that a token can contain several
punctuation marks or only part of a Unicode character. No questions or learner
predictions appear in the opening or later practice.

Follow **problem → explained solution → history → figure/optional practice**.
Walk the euro object through q6/q7/q8 first, distinguishing bytes, Unicode
scalars and tokens. Explain the all-bytes trial and EOS condition, then derive
the allowed-set formula and show Rust's trial/eligible-ID boundary. Introduce
the finite subset and actual state caps before generalizing; it is not all JSON
or full JSON Schema. Explain why post-validation remains independent and why
syntax, schema membership, factual correctness and host permission are different
claims. Only then contrast PICARD's incremental rejection and GBNF subset use.

Optional reproduction/inspection tasks and checked answers:

- Reproduce euro's11 bytes and12 selections including EOS. The middle E2/82
  states remain incomplete; EOS cannot complete them.
- Inspect a token with valid object plus trailing x. All-byte transition fails
  and no prefix is committed, even though an intermediate state accepted.
- Inspect k=V when only one grammar token is eligible. The original ID remains,
  top-k retains min(k,eligible count), and no compact-array ID is substituted.
- Reproduce the64/65-state escape-string boundary. Counts include every byte
  prefix and dead state, not merely one schema string node.
- Explain a budget-exhausted live prefix. A future byte completion exists but
  the request cannot finish within its remaining limit; return incomplete failure.
- Inspect a schema-valid tool request. Its syntax provides no authorization;
  Chapter78 must decide permission before any action.

Freeze separate role requirements for the subset table, formula symbols,
byte/token/state trace, error text, captions, metadata and cheat sheet. “Allowed”
always means under the named schema/tokenizer/budget phase, not semantically
safe. EOS labels state zero output bytes but one selection. State counts specify
root/dead inclusion; Unicode labels state bytes versus scalars. Captions name
the exact fixture and whole-token rejection. Learner-facing mathematics uses
the math pipeline; literal JSON, byte hex and token IDs remain program data.
Do not leak build/reviewer instructions into the lesson.

## 7. Visualization and accessibility

Register one `constrained-json-decoding` figure from the Rust trace. Display
committed prefix and q, candidate token ID/raw bytes, trial state after every
byte, final liveness, allowed support, selected token and committed next q.
Use the euro split and the complete-object-plus-x rejection as two small paths;
show EOS as a separate accepting-state action. A caption explains that an
intermediate accepting state cannot rescue a token's invalid later byte.

Reading order: schema's required value → current prefix → candidate bytes in
order → full trial outcome → eligible IDs → selection/commit. Accessible
description carries the relationship between token boundaries and incomplete
UTF-8, distinguishes trial from committed state, and explains EOS eligibility.
Use text/borders as well as color for refusal; no screenshot is the evidence.
Trace fields include schema/tokenizer hashes, q IDs, byte offsets, token IDs,
accepting/live flags, output-byte/selection counters and finish/error reason.

Use shared diagram roles and one static semantic tree with
`data-visualization-id="constrained-json-decoding"`, `course-diagram` and the
current style version. Stack paths at narrow widths; only the smallest named
byte table may scroll with keyboard access. Mark bounded owners and assert text
and formula ink against their nearest box. Sole-Firefox automated desktop/narrow,
inline/full-view, keyboard/focus, forced-color and applicable direction tests
remain required. No clipping/shrinking/private scripts or routine image checks.
Only a human-reported visual issue can trigger scoped screenshot diagnostics.

## 8. Serial implementation procedure

1. After explicit release, reconcile lifecycle/policy bindings and actual76
   completion. Agree shared66/67/serving ownership, parser/validator dependency
   roles, raw-token API, schema identity and ordinary-smoke budget. Resolve and
   bind the GBNF guide commit before historical claims are authored.
2. Freeze `FiniteJsonV1` table, canonical spelling, actual64-state/20-alternative
   compiler limits, error precedence, EOS/stop/cap policy and independent oracle.
   Derive literal languages/fixture state counts; no model allocation yet.
3. Implement schema admission/finite expansion/trie and test every prefix/byte
   against literal fixture languages. Add lossless duplicate-aware parser and
   independent final semantic/canonical validator. Reject unsupported nested
   keywords and excessive products before allocation.
4. Bind tokenizer bytes, tokenizable liveness and eligible-ID support through
   the accepted sampler. Test split Unicode/escapes, EOS, whole-token suffixes,
   original-ID/top-k mapping, RNG and disabled parity before decoder integration.
5. Integrate one generation lifecycle with buffered structured output and
   transactional grammar/KV ownership. Run all100 seeded CPU cases, failures and
   full/cached comparisons; preserve actual stdout and resource traces.
6. Run only the frozen ordinary-smoke target on the accepted device/backend.
   Freeze a feasible short prompt/output recipe inside C128 and900s before
   launch; demonstrate mask/finish behavior using the actual decoder and record
   the device path separately from synthetic completeness proofs. Do not train,
   acquire another model or silently switch to the7200s advanced profile.
7. Author the coherent English contract/lesson/figure/catalog/sheet from those
   artifacts. Perform the README's external English two-review/two-adjudication
   handoff; translate approved English directly to Russian and obtain both fresh
   locale reviews plus automated layout evidence. Serial contexts are allowed;
   self-approval is not.
8. Execute the exact validation inventory, publish the complete bilingual step
   atomically, verify hashes, checkpoint and commit. Handoff only a validated,
   untrusted structured value to78, never tool permission.

Keep partial compiler/fixture/trace/source/measurement artifacts in the named
run. Content/schema/tokenizer or numerical-policy changes invalidate their
dependent evidence; preserve failed runs and create new immutable attempts.

## 9. Validation and review handoffs

Exact six outer commands from repository root, future execution only:

```bash
scripts/run-functional-history-source-evidence.sh --step implement-ch77-constrained-json-decoding --chapter 77-constrained-json-decoding --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
scripts/run-functional-offline.sh --step implement-ch77-constrained-json-decoding --target implement-ch77-constrained-json-decoding-v1
scripts/run-functional-gpu-profile.sh run --step implement-ch77-constrained-json-decoding --target implement-ch77-constrained-json-decoding-v1 --profile 8gb-gpu-smoke
scripts/run-functional-firefox.sh test --step implement-ch77-constrained-json-decoding --target chapter-77-constrained-json-decoding-v1
git diff --check
./course audit-host
```

The frozen plan's `resource_projection.execution_boundaries` owns all inner
commands. Offline target `implement-ch77-constrained-json-decoding-v1` is snapshot
locator `$.offline_workspace.target_registry.51`, bound in
`inputs.json.execution_targets[0].record.commands`: all19 commands, unchanged.
They cover contract/ownership/example checks, Rust format/clippy/tests/dependency
and stdout, independent English/localization receipt verification, EN/RU/parity,
content/type/tests/build/links. Use its exact dependency-refreshed workspace
image receipt, not an unpinned host build or installation.

Firefox target `chapter-77-constrained-json-decoding-v1` is
`$.firefox.target_registry.41`: project Firefox revision1532, phase test,
selector `@chapter:77-constrained-json-decoding`, owned spec, EN/RU and
desktop/narrow, network none. Use the shared automated loopback configuration
and programmatic content/formula/behavior/accessibility/containment assertions.

GPU target `implement-ch77-constrained-json-decoding-v1` is
`$.gpu.target_registry.27`, bound by
`configs/functional-gpu-execution-targets.json`. It uses ordinary
`8gb-gpu-smoke`, G1, backend `wgpu-vulkan-fp16-fp32-protected-dynamicv1`, and the
exact closed command in `inputs.json.execution_targets[2].record.closed_command`.
Require accepted62 device/precision/path evidence, refreshed runtime and
`functional-gpu-execution-receipt-v2` binding source/target/kernel/input/resource
identities and actual outcomes. No hidden scalar/f32 fallback, new download,
network-at-runtime or alternate phase. Empty future input bindings require
owner-frozen bounded fixtures before launch, not invented measured evidence.

Formal language handoffs follow README/current skills, not a shortened private
protocol: exact English source/HTML, commitment and role inventories, actual
author identity; two fresh role reviewers and two further fresh same-role
adjudicators through canonical four-artifact prompts and untouched response
bytes/verified external receipts. Both reviews and adjudications must pass.
Then direct Russian localization with independent bilingual and source-blind
target-only judgments; the actual author may translate, without fabricated
freshness. Meaning/role/presentation drift invalidates dependent judgments.
No routine screenshot gate or extra human approval pause. Missing capacity
leaves staging held rather than permitting self-certification.

Planning validation is only structural/input/link consistency, internal
mathematical/interface review, `git diff --check` and the ordinary pinned
offline `node scripts/check-course-plan.mjs`. It proves no model behavior,
performance or publication-language quality and does not run these future gates.

## 10. Cost, risks and readiness

Implementation is large C3/G1/N1, paid none; planning is bounded prose/read-only
evidence. The closed source lane permits only the two frozen historical records,
at most134,217,728 source-evidence bytes. New artifact-download authority is zero.
No corpus/model acquisition, learned retriever, training or database service.

CPU correctness lane: schema≤16,384 bytes, root-expanded alternatives≤20,
compiled states≤64 including root/dead, output≤8,192 bytes and≤512 selected
tokens including requiredEOS; **host≤1,073,741,824 bytes and wall≤300 seconds**.
Charge parser/AST/product/trie/token-edge masks, output buffers and independent
oracle products, not only the16,384-byte transition table. Bound nesting and
string/array domains as§3; reject excess before materialization. Record actual
peaks and durations. These maxima do not guarantee every schema reaches them
or every output can finish; stricter state/context/resource limits still apply.

| Binding | Frozen envelope |
| --- | --- |
| Ordinary `8gb-gpu-smoke`, executes | P≤32,514,560, C≤128, N≤65,536, microbatch1, accumulation8; host≤8,589,934,592, device≤2,147,483,648, headroom≥536,870,912, disk≤5,000,000,000 bytes; wall≤900s. Installed host minimum8GiB/recommended16GiB. Profile download ceiling536,870,912 bytes grants no new download here. |
| `8gb-adapter`, consumes | Blocked-artifact-selection; P≤50,000,000, C≤512, N≤1,048,576, microbatch1, accumulation32; host/device/disk≤12,884,901,888 /6,710,886,400 /21,474,836,480 bytes, headroom≥536,870,912; wall≤43,200s. Installed host minimum16GiB/recommended32GiB. No adapter run is added by consumption. |

Complete inherited calibration fields remain bound in `inputs.json.profiles`:
smoke300–900s,100 synchronized microsteps,10 windows,10,240 valid calibration
tokens,128 valid-token/s floor, lower-aggregate-or-p10 statistic and85% stability.
Warmup/calibration/actual constrained workload and cleanup must fit one900s
phase under the accepted measurement owner. Consume prior calibration only within
its identity/scope; no hidden extra probe or7200s override. The512-output-token
CPU ceiling does not fit a C128 smoke request automatically: freeze actual prompt
plus output reservations within75's admitted context and the request/KV contract.

Content/review budgets are the immutable cost record and README: user-selected
model, actual reasoning settings,16 attempts maximum, per-context2MiB/200,000
input tokens and1MiB/40,000 output tokens, aggregate32MiB input/16MiB output and
28,800 seconds. Reconcile historical eight-successful-context accounting with
permitted author reuse at execution compatibility, preserving all fresh judgments.
No routine image pass; human-report diagnostics alone have the existing bounded
one-context allowance.

Readiness requires build-owner release/compatibility, source-owner GBNF revision
pin, owner50 approved duplicate-aware JSON plumbing, schema owner's exact
canonical policy,66 original-ID eligible-support integration,67 buffered
EOS-only finish contract,65/69 transaction/cleanup,75 actual context admission,
GPU owner's feasible ordinary-smoke recipe and external independent reviews.
Each missing gate stops its operation; none permits a competing grammar library,
larger cap, second sampler, guessed source revision or weakened review.

Handoff checklist:26 owned outputs;6 outer/19 inner validators; ten exact finite
languages and100 seeded cases; UTF-8/EOS/whole-token edge coverage; unsupported
schemas rejected before allocation; independent complete validation; disabled
and full/cached parity; actual bounded CPU/GPU evidence; source receipts and
EN/RU/static/Firefox gates; atomic inventory/checkpoint and dedicated commit.
Retain raw traces, seed/RNG snapshots, compiler/tokenizer identities and failed
receipts for restart-safe reuse. Planning-ready is not full JSON Schema support,
within-budget completion assurance, tool authorization or model-quality evidence.
