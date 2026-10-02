# Chapter 50 — dependency and error contract: detailed implementation packet

Status: internal planning only. Repairs, implementation, acquisition, training,
localization and course publication remain held. Read [the common guide](README.md)
and [Chapter 49](49-dropout-semantics.md). This packet is for a future single
executor without sub-agents; it is neither an implemented chapter nor approved
learner-facing English.

## 1. Scope, ownership and prerequisites

| Field | Commitment |
| --- | --- |
| Chapter / planning step | `50-dependency-error-contract` / `detail-ch50-dependency-error-contract` |
| Implementation / predecessor | `implement-ch50-dependency-error-contract` / `implement-ch49-dropout-semantics` |
| Capabilities / classifications | `CAP-ISA-ARCH-002` and `CAP-ISA-ARCH-003`; both `mandatory-laptop-implementation`. |
| Claims / findings | Both frozen lists are empty. Do not invent claim or finding IDs. |
| Rust owner / locales | `owner-ch50`; canonical English and Russian. |
| Formula | `teaching-formula-ch50-dependency-error-contract`. |
| Visualization | `not-useful`; visualization ID is null. Exact tables and typed mutation records are the evidence. |
| Small concept | A dependency is admitted for an exact supporting role, and a failed model operation has a typed, bounded state transition. |
| Outcome | Make the supporting-library boundary and recoverable/terminal failures inspectable and enforceable without delegating taught LLM operations. |
| Non-goals | A new package manager, parser, general Rust tutorial, universal static semantic analysis, arbitrary dependency acquisition, serving implementation or whole-process rollback. |
| Successor | Chapter 51 consumes these types for serving configuration/admission; the separate dependency-admission step consumes the graph checker before backend dependencies become usable. |

Actual implementation of Chapter 49 is required before execution. Its
planning-ready packet is not a completed model/mode/RNG implementation.
Preserve its explicit Train/Eval behavior, unchanged-state admission failures,
forward-only candidate counter commit and limited replay claims. A common error
wrapper must not turn those promises into an invented optimizer/job transaction.

Preserve course-owned tokenization, filtering, masks, tensor operations,
autograd, initialization, loss, optimizer, checkpoint wire format and sampling.
A package may parse ordinary configuration syntax while course code validates
its model-specific meaning. A library's presence on an allowlist never permits
every operation the library exposes.

This chapter supplies a checker and a typed contract against admitted inputs
and local fixtures. `admit-functional-supporting-dependency-graph` is a separate,
later step that depends on this implementation. Do not require its future
successful receipt as a prerequisite for finishing this chapter, fetch its
packages here, or issue its admission receipt from a synthetic graph.

Exact frozen prerequisites, in order:

```text
curriculum/functional-laptop-llm-extension-plan.md
audits/2026-08-10-functional-llm-capability/coverage.md
audits/2026-08-10-functional-llm-capability/requirements.md
audits/2026-08-10-functional-llm-capability/resource-and-dependency-contract.md
.agents/skills/author-llm-course-english/SKILL.md
.agents/skills/localize-llm-course/SKILL.md
site/src/i18n/functional-chapter-locales.json
exact predecessor checkpoint=implement-ch49-dropout-semantics
artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
```

Exact capability-receipt destinations:

```text
artifacts/functional-laptop/chapters/50-dependency-error-contract/capabilities/CAP-ISA-ARCH-002.json
artifacts/functional-laptop/chapters/50-dependency-error-contract/capabilities/CAP-ISA-ARCH-003.json
```

These receipts must distinguish contract/checker evidence from later full-graph
admission and from future callers' integration tests. A deliberately malformed
fixture is test data, not an admitted package or executed hostile dependency.

## 2. Evidence ledger and historical scope

Planning baseline: `7e8b934625e366287a785a44f8e620a2c75bb832`.
The unchanged [extension plan](../functional-laptop-llm-extension-plan.md) has
SHA-256 `84d8ab860a3282dd5d373ca285a3815b04836d9abb7a1d2267e163143091bea1`.
The accepted Chapter 49 packet has SHA-256
`0055de2431da77d2bc633f554b71e4aa140b6fdbd9f4af5587b72b55273b72bf`.
These identify planning inputs, not newly executed Rust or published content.

| Existing file / symbol | Observed boundary, not a new execution result |
| --- | --- |
| [check-rust-dependencies.sh](../../scripts/check-rust-dependencies.sh) | Checks package names from locked Cargo tree normal/build/dev edges against an eleven-name external allowlist and a concept-package denylist. It does not check exact versions, sources, features or call-site roles. |
| [Cargo.toml](../../rust/crates/llm-from-scratch/Cargo.toml) | Direct dependencies are serde with requested derive support and serde_json. Those declarations are not the complete resolved feature set. |
| [corpus.rs](../../rust/crates/llm-from-scratch/src/corpus.rs), `DocumentJson`, `SplitManifestJson` | Already uses admitted serde syntax decoding and strict unknown-field handling; course validation owns corpus/split invariants. |
| [pipeline.rs](../../rust/crates/llm-from-scratch/src/pipeline.rs), `PipelineStage`, `PipelineError` | Stage/message errors exist; generic Display mapping loses typed source identity. Do not claim an existing cross-system terminal taxonomy. |
| [checkpoint.rs](../../rust/crates/llm-from-scratch/src/checkpoint.rs), `CheckpointError` | Typed corruption/version/dtype/extent/allocation/I/O and nested component errors exist, with staged atomic-save checks. |
| [generation/sampling.rs](../../rust/crates/llm-from-scratch/src/generation/sampling.rs), `SamplingError`, `GenerationStop` | Invalid-input errors exist. Successful EOS/token/context stopping is not a failed request category. |
| [generation/kv_cache.rs](../../rust/crates/llm-from-scratch/src/generation/kv_cache.rs) | Identity/capacity/ordering/allocation guards and failure/reset/RNG tests provide existing seam evidence, not the later page scheduler. |

The repository-root [Cargo.lock](../../Cargo.lock) has SHA-256
`b9491c2c89096a48ea62c98f79b5851272df4cb3afca09d41b80ed679b5a7fe1`.
Its eleven external packages are itoa 1.0.18, memchr 2.8.3, proc-macro2 1.0.107,
quote 1.0.47, serde/serde_core/serde_derive 1.0.229, serde_json 1.0.151,
syn 3.0.3, unicode-ident 1.0.24 and zmij 1.0.23. Workspace packages are additional.
These are the recorded local lock identities, not recommendations to install
them. The lockfile does not record resolved feature activation.

The current name allowlist is `itoa`, `memchr`, `proc-macro2`, `quote`,
`serde`, `serde_core`, `serde_derive`, `serde_json`, `syn`,
`unicode-ident`, `zmij`. Preserve its baseline coverage; do not silently
turn an allowlisted transitive crate into a new approved direct call. The
functional support modules/checker and local server do not exist yet.
Prospective SHA/backend/CLI/format/server dependencies are not currently admitted
merely because the extension plan mentions them. PostgreSQL/pgvector remains
unselected and is not related to the abandoned project event-store approach.

At future preflight reread the actual accepted Chapter 49 and shared foundation
rather than assuming the proposed names in earlier packets already exist.
Separate four evidence classes throughout the chapter: observed repository
behavior, course-policy commitments, a proposed interface and future measured
results.

Primary documentation checked read-only on 2026-09-15:

- `SRC-ISA-046`,
  [Cargo.toml vs Cargo.lock](https://doc.rust-lang.org/cargo/guide/cargo-toml-vs-cargo-lock.html):
  the manifest describes dependency requirements; the lockfile records resolved
  identities. A lockfile does not establish whether a dependency performs a
  permitted teaching role or make an arbitrary execution environment identical.
- `SRC-ISA-047`,
  [cargo build](https://doc.rust-lang.org/cargo/commands/cargo-build.html):
  `--locked` rejects a missing or changing lockfile; `--offline` prevents Cargo's
  network access but may resolve differently against cached availability;
  `--frozen` combines both. Cargo reports failure with status `101`.
  Neither flag is a sandbox for arbitrary build scripts or the resulting program.
- Additional technical guidance, not new frozen historical source IDs:
  [cargo metadata](https://doc.rust-lang.org/cargo/commands/cargo-metadata.html)
  describes versioned JSON with package IDs, resolved edges and enabled features.
  `--no-deps` omits the required resolved graph. Default resolution includes all
  targets; platform filtering narrows `resolve`, not every declared dependency.
  Bind the actual toolchain, feature request and target matrix.
- Additional technical guidance:
  [Cargo features](https://doc.rust-lang.org/cargo/reference/features.html)
  explains that features can activate dependencies and other features. Disabling
  defaults at one edge does not prevent another edge from enabling them.
  Therefore inspect the resolved feature set, not just one manifest line.

These sources support tooling semantics; none is evidence for an LLM invention
or a historical improvement in model quality. Do not label a change from
unlocked to locked Cargo builds as the history of large language models.

Historical-readiness gate: the frozen two-source list currently supplies no
primary LLM-specific historical anchor. The future contract/history-inventory
owner must reconcile that gap before learner-content approval, under the
existing history-source evidence workflow. Either bind a previously admitted
primary model source, with an explicit claim and executable course-owned
contrast, or record an approved scope/source amendment in a new run. Do not
invent a source ID, silently broaden acquisition, or claim Cargo documentation
satisfies the historical LLM spine.

The proposed local teaching bridge is the transition from the already-taught
small course model to the configurable decoder: more storage/device/configuration
plumbing may be needed, but its presence must not hide the same inspectable
attention, loss or optimizer operation. Use actual earlier and current course
Rust on one shared tiny tensor to show the unchanged taught decision. That is
a course-sequence comparison, not evidence of historical precedence. Any
historical claim layered on it remains gated by the approved primary anchor.
The packet is planning-ready because the missing evidence, owner and decision
rule are explicit; the historical publication gate is not already passed.

## 3. Worked evidence and exact semantics

### 3.1 What the graph formula means

The frozen notation is
`allowed_graph = packages union edges union features union call_site_roles`.
This is an internal contract literal, not learner-facing math markup. Render the
relationship through the math pipeline, with distinct record tags:

$$
A=P\uplus E\uplus F\uplus R.
$$

Here $P$ is the set of approved package-identity records; $E$ contains directed
dependency-edge records; $F$ contains enabled-feature records; $R$ contains
approved edge-role and course-call-site-role records. The disjoint-union symbol
means their record kinds remain distinguishable; it does not turn a feature
name into a package or an edge into a source-code proof. All cardinalities count
records, not bytes, parameters or model quality.

Bind a particular build context $c$: workspace roots, toolchain, target matrix,
feature request, dependency kinds and policy revision. Let $O_c$ be the observed
tagged records and $A_c$ the frozen approved snapshot for that same context.
For the exact-snapshot fixture:

$$
\Delta_c^+=O_c\setminus A_c,\qquad
\Delta_c^-=A_c\setminus O_c,\qquad
\operatorname{structural\_match}(c)
=[\Delta_c^+=\varnothing]\land[\Delta_c^-=\varnothing].
$$

A broader permission catalog may contain alternatives, but the approved
context-specific snapshot cannot be manufactured from the candidate being
checked. Keep permission, resolved snapshot and observation as distinct inputs.
An intentional removal or reduced feature set needs a new approved snapshot,
not a silent rewrite of historical evidence.

An edge records source package, destination package, dependency alias, normal/
build/dev kind and target condition. A package identity includes version and
source identity, plus the applicable locked/source-content checksum binding.
Two packages with the same name but different versions or sources are distinct.
Features are keyed by package identity, not by a global feature name.

### 3.2 A complete synthetic graph, not a real package admission

Use the following deliberately local records in the Rust example. They are
pedagogical labels, not crates.io packages, invented registry checksums or a
second authoritative dependency-manifest format. Encode them directly as typed
fixture values; no network, lockfile generation or package installation.

```text
context: fixture-cpu-v1
package C: fixture-course@1, source=local-fixture-C
package J: fixture-json@1, source=local-fixture-J
package U: fixture-text@1, source=local-fixture-U
edge e1: C -> J, alias=json, kind=normal, target=all
edge e2: J -> U, alias=text, kind=normal, target=all
feature f1: J/std
feature f2: U/std
role r1: edge=e1, role=json
role r2: edge=e2, role=json
role r3: call=decode_config, dependency=J,
         role=json, course_validation=validate_model_shape
```

Resolve C/J/U aliases to their full package identities before comparing the
edge and feature records; aliases are presentation shorthand, not a license to
ignore the version in a reference.

Thus the baseline has three package records, two edges, two features and three
role records: ten tagged records total. A call-site role record binds the
actual course symbol and source bytes in real evidence; here its literal name
makes a small equality exercise, not a claim that source review occurred.

| Independent candidate mutation | Added records | Missing records | Structural result |
| --- | ---: | ---: | --- |
| Unchanged candidate | 0 | 0 | Match. |
| Add feature `J/automatic_attention` | 1 | 0 | Reject: undeclared enabled feature. |
| Change e2 from `normal` to `build`, leaving its other fields fixed | 1 | 1 | Reject: different edge, not a harmless spelling change. |
| Change U to `fixture-text@2` and update e2/f2 consistently | 3 | 3 | Reject: one package, one edge and one feature changed. |
| Remove r3 | 0 | 1 | Reject: uncovered direct course call. |
| Add a second r3 with a different role | 1 | 0 | Reject: ambiguous role binding, before snapshot comparison. |
| Keep all records, change the bound call-site source bytes | 0 in this name-only toy view | 0 in this name-only toy view | Real source-binding gate rejects; toy record counts cannot detect it. |

In the version-change row r2 names the stable edge ID e2, so its own record is
unchanged; edge identity e2's content is what differs. In a real schema that
embeds the full edge tuple in its role record, that role record must change too.
Freeze the chosen representation before computing counts. Unchanged r2 text
still loses approval when its referenced edge/package/source changes: real role
approval is transitively bound to the entire graph context and source snapshot.
The toy count does not preserve stale semantic approval. Do not present this
ten-record toy as the actual Cargo graph or copy its counts into a real receipt.

Run the Rust comparison, show both missing and added records, and explain which mutations a package-name-only check misses. Finally replace
the name-only source reference with a real source binding and show why identical
package names still do not prove the call is permitted.

### 3.3 A supporting parser does not validate a model

Use literal ASCII/UTF-8 JSON bytes, no BOM and no trailing newline:

```text
valid:           {"width":4,"heads":2}
bad-shape:       {"width":5,"heads":2}
zero-heads:      {"width":4,"heads":0}
malformed:       {"width":4,"heads":}
unknown-field:   {"width":4,"heads":2,"automatic_attention":true}
duplicate-field: {"width":4,"heads":2,"heads":1}
```

The admitted standard JSON parser may decode syntax into a small typed record.
Course Rust must enforce nonzero quantities, checked divisibility and the
declared field policy before constructing model state. For positive head count
$h$ and width $d$:

$$
d>0,\qquad h>0,\qquad d\bmod h=0,\qquad d_{\mathrm{head}}=d/h.
$$

The valid record yields head width two; the bad-shape record decodes but fails
model validation. Zero heads must be rejected before division. The malformed
record fails syntax decoding. Unknown and duplicate fields must be rejected
explicitly, not silently ignored or accepted with last-value-wins behavior.
Use a derived typed structure with the admitted parser's supported strict-field
mechanism; test the actual duplicate-field behavior. Map serde_json syntax/EOF
classification to `Config/syntax` and a typed-record data mismatch to
`Config/record_fields` before separate course shape checks. Unknown, duplicate or missing fields, wrong field types, invalid variants and
other typed-record data mismatches share that stable field-error reason;
unknown and duplicate fields are distinct injected inputs; do not parse serde's English message to invent a typed distinction.
If finer field diagnostics become necessary, use an explicitly typed
domain-record visitor/adapter over the standard parser, with its own tests,
not a handwritten JSON parser. Do not decode to a generic map that has already
lost duplicate evidence. Add missing-heads, string-width and fractional-heads
fixtures to confirm the whole data-error mapping. For actual nested configuration
objects, test each relevant object's strict policy; a strict outer struct does
not make an arbitrary nested map reject duplicates.

The tiny record is a local teaching fixture, not a replacement for Chapter 48's
full versioned decoder configuration. A production adapter must consume the
accepted configuration schema and preserve its checks and IDs. Neither the
parser nor a role declaration supplies attention, tensor allocation or a model
validator.

Before each failure test take the same declared state snapshot:

```text
model revision: 7
dropout next counter: 192
cache logical length: 3
published-output count: 0
```

These are literal harness state values, not an assertion that the current
model uses this exact struct. Parsing/admission failures leave all four
unchanged and allocate no model/cache storage. Diagnostic-buffer or parser
scratch allocation is not model allocation. Successful validation returns a
validated descriptor; it does not increment revision, draw randomness or publish
a model merely because parsing succeeded.

### 3.4 Error identity and state effect are different facts

An error category identifies the failed contract. A disposition says what the
caller is allowed to do next. A state-effect record says what the failed operation
actually changed. Do not infer the latter two from an English error string.

Use a course-owned checked transition helper in the fixture:
validate the complete candidate first, then commit the new descriptor/state in
one scoped assignment. The malformed, bad-shape and zero-head cases are
pre-commit rejections. A failure after a computation begins may instead require
discarding a provisional result, resetting a session or stopping the job.
Do not describe such a failure as an unchanged-state rejection unless the
implementation and fault-injection test establish that promise.

RNG, cache, parameter and optimizer state must be compared independently.
Chapter 49's failed forward candidate can leave its live dropout counter
unchanged without promising to reverse every graph allocation or a previous
successful optimizer update. A terminal failure forbids further use of the
affected operation/session until its declared recovery action; it does not
mean the operating system or every other independent session has failed.

## 4. Rust design, ownership and integration

### 4.1 Authority and existing versus proposed interfaces

The frozen capability mapping is important: `CAP-ISA-ARCH-002` owns fail-loud
behavior; `CAP-ISA-ARCH-003` owns the complete supporting-dependency graph.
Older audit paths such as `src/error.rs` and `tests/fail_loud.rs` are proposals,
not permission to create a competing error module beside the frozen Chapter 50
owner paths. Reconcile names against the accepted foundation and use one shared
type boundary.

Proposed interfaces, to adapt to that actual boundary before implementation:

```rust
pub enum FailureCategory {
    Artifact, Dependency, Version, Dtype, Quantization, Device, Kernel,
    Adapter, Config, Schema, Tool, Persistence, Migration, Resource,
    Timeout, Cancelled, Numeric, Internal,
}
pub enum FailurePhase {
    Startup, ArtifactRead, ConfigAdmission, RequestAdmission,
    Execution, Commit, Cleanup,
}
pub enum FailureDisposition {
    RejectUnchanged, AbortProvisional, StopSession, StopJob,
}
pub enum TerminalState { Rejected, Failed, Cancelled, TimedOut }

pub struct FunctionalError {
    // Private, validated fields; no caller-selected arbitrary fallback.
    // category, stable typed reason, phase, disposition, terminal_state,
    // safe context identifiers, and an optional preserved source error.
}
pub type FunctionalResult<T> = Result<T, FunctionalError>;

pub fn compare_graph(
    approved: &ApprovedContext,
    observed: &ObservedContext,
) -> FunctionalResult<GraphComparison>;

pub fn validate_call_site_roles(
    roles: &ReviewedRoleLedger,
    source: &BoundSourceInventory,
) -> FunctionalResult<RoleBindingCheck>;
```

These signatures are proposed, not present APIs. Use exhaustive matches inside
the course; freeze stable serialized category/reason tokens explicitly rather
than relying on Rust enum debug output, discriminant order or message text.
A category-specific reason enum is preferable to an unconstrained string.
For transport decoding, use a strict outer record with category/reason tokens
as strings, then course-owned exhaustive token and tuple validation. Outer
field mismatches map to `Schema/record_fields`; unknown category tokens map
to `Schema/unknown_category`. This preserves typed distinctions without
inspecting a serializer's English error message.
Reject impossible category/reason/phase/disposition combinations when decoding
records; unknown semantic fields or unsupported schema versions fail closed.

`FunctionalError` implements `Display` and `std::error::Error`; keep the original
typed source through `source()` where available. A safe public diagnostic need
not dump the private source message. Do not compare OS-dependent error wording
in goldens or erase the original cause merely to obtain a stable JSON record.
An unexpected supporting-library error maps to an explicit internal/boundary
reason with its source retained, never to success or an automatic retry.

Use adapters at owned seams rather than replacing every existing public error
in earlier chapters. Preserve existing variants, return behavior, source chains
and failure ordering unless the accepted implementation scope explicitly permits
a compatibility change. Module-registry wiring is a necessary shared integration
edit only when the actual registry mechanism requires it; do not fork `lib.rs`
or introduce another competing support namespace.

### 4.2 Graph representation and proof boundary

Course Rust owns tagged comparison, ambiguity/coverage checks, role-policy
decisions and the deterministic mutation example. `dependency_role.rs` defines
the normalized records, sorted evidence and invariants. The `.mjs` checker
orchestrates already provisioned Cargo evidence, standard JSON decoding, hashes
and exact inventory checks. It does not replace the learner-visible Rust rule
with a separate hidden implementation.

Bind these distinct inputs before validation:

1. Independently approved permissions, context-specific resolved snapshot and
   call-site role review, including their versions and source identities.
2. Actual manifests, lockfile, source snapshot, Cargo configuration/toolchain,
   target/feature matrix and dependency-kind selection.
3. Observed complete package/edge/feature graph and actual course call sites.
4. Source/provenance/license/checksum records for packages and non-Cargo
   components where the governing admission contract requires them.

The frozen permitted role vocabulary is `allocation`, `storage`, `transfer`,
`device`, `stream`, `gemm`, `primitive-dispatch`, `tensor-container`,
`json`, `http`, `sse`, `cli`, `tls`, `compression`, `checksum`,
`metrics`, `conditional-database-plumbing`. The synthetic parser records use
`json`; their configuration-syntax explanation is not a new policy role.
Permitted low-level GEMM/device dispatch applies only at its explicitly approved
supporting call sites; it does not replace the scalar reference or an operation
the learner is asked to implement. A permission label never hides attention,
softmax, autograd, optimizer, tokenizer, checkpoint policy or another taught
decision. Conditional database plumbing remains unselected without its separate
decision and admission.

The full admission record additionally needs package path/name, exact version/
source/checksum, license and retained-license hash, enabled features,
build/native/network behavior, role, direct parent, duplicate-version rationale,
advisory disposition and authorized call sites. The ten-record toy deliberately
omits that provenance envelope. Omission is acceptable for labeled teaching data,
never for a real full-graph receipt. An advisory record is bound evidence of a
particular assessment, not a claim of permanent safety or permission to contact
an advisory service during an offline check.

Retain package source IDs as tool-provided identities with a pinned adapter;
do not guess their grammar or collapse registry/git/path identities by name.
Workspace/path packages bind their actual source inventory. Renamed edges must
retain alias and destination identity. Normal, build, dev, target-specific and
proc-macro relationships are not discarded. Inactive optional dependencies do
not appear in one active graph; inventory their declarations and either reject
their activation or bind a separately approved supported context. Do not run
`--all-features` speculatively to define what the course supports.

Obtain pinned version-1 Cargo JSON in the existing offline runtime, with
`--locked --offline`, without `--no-deps`, for the declared contexts. Inspect
the accepted target's exact command rather than inventing an executable runner.
Compare all-target declaration coverage as well as the supported resolved
contexts. Bind target conditions and resolver/feature settings; an aggregate
feature union is not evidence of every separate host/target compilation unit.
If the frozen capability demands a finer build-unit view than the accepted
extractor supplies, the tooling/admission owner must supply that evidence before
the graph is certified.

No hand-written TOML, JSON, Cargo-resolution, Rust-parser or SHA implementation
is warranted here. Use admitted narrowly scoped plumbing and keep taught
policy validation in course code. Native Node JSON/crypto can handle orchestration
syntax/hashing; admitted serde/serde_json can handle Rust fixture syntax.
A transitive parser crate's presence in a lockfile does not make it an approved
new direct parser API. New plumbing still requires role rationale, complete
graph admission and offline availability.

A source scan can locate candidate imports/call sites and detect changed bytes.
It cannot prove that an aliased/re-exported/generated call leaves an LLM
operation course-owned. Keep an exhaustive source/module inventory, explicit
call-site symbols/spans, macro/generated-source provenance when relevant, and
substantive source-role review. Bind the reviewed bytes and fail on uncovered or
changed sites. Do not market a regex or matching hash as semantic verification.

Publish separate results for structural graph match, source-binding coverage
and substantive role approval. A green first field cannot manufacture the other
two. An approved library used for a forbidden model operation fails the role
boundary even when its version and features are unchanged.

### 4.3 Failure phases, precedence and safe diagnostics

Freeze a deterministic evaluation order for each owned public boundary.
Proposed admission order: already-signaled cancellation, then an already-expired
deadline, then requested optional capability enabled; configuration
syntax/schema/version; required artifact existence/identity; shape/dtype/quant/
adapter compatibility; required device/kernel/tool availability; checked resource
admission; only then execution and commit. Do not probe a device or open an
artifact merely to report a later error after an earlier cheap rejection.
Actual inherited ordering takes precedence until explicitly reconciled.

For multiple faults, return the first failure in that documented order. Tests
must include pairs; do not let hash-map iteration, worker timing or OS wording
choose a user-visible reason. Once execution begins, failure ordering follows
the actual synchronized operation/commit boundary, not the preflight table.

Every diagnostic record has a version, stable category/reason/phase, explicit
terminal state, disposition, requested identity and actual selected identity
when selection occurred. Use `not_selected` for an absent actual identity,
never copy the requested value and imply it was used. Carry model/config/
policy/backend IDs as bounded safe identifiers, not raw prompts, credentials,
SQL, filesystem contents or unbounded source messages. Public errors and metrics
must agree; retain sensitive implementation detail only in appropriately scoped
private evidence, if authorized at all.

Proposed process policy for a future course CLI boundary: success `0`, explicit
refusal/failure nonzero `1`, diagnostic usage error `2` only if the accepted
command layer distinguishes it. These are proposals, not frozen Cargo codes or
a serving HTTP contract. Cargo failures retain child status `101` as tool
evidence; do not reinterpret it as the course's category. The local-server
owner must map the typed category to its documented protocol response later.
Do not implement server routing, retries, status codes or streaming behavior in
this chapter.

Required-capability readiness and process health are different observations.
An alive process missing a requested kernel is not ready to serve that
configuration. A disabled optional feature produces explicit unsupported at
compile/startup/request visibility as applicable, not a substitute CPU backend,
smaller model, lower precision, shorter context, unconstrained output, missing
adapter, different persistence backend or skipped evaluation.

### 4.4 Mutation and recovery scope

Use checked arithmetic and admission before large allocations. Define the exact
commit point and last-good state for each operation. A provisional buffer or
temporary file can be discarded on rejection; a canonical output cannot be
published partially. Do not catch an arbitrary panic, allocator abort, device
loss or OS failure and pretend normal rollback succeeded.

Freeze each snapshot location in the case manifest before running the test:
API entry or the named transaction boundary, never a point chosen after partial
failure. Record any legitimate earlier gradient/update work separately.
For the local fixture, pre-commit errors preserve model revision 7, dropout
counter 192, cache length 3 and published-output count zero. For actual inherited
model APIs compare parameters/revisions, optimizer state where in scope, RNG
cursor, cache ownership/length and output bytes as the existing contract requires.
Count allocations and releases through the actual admitted allocator interface,
not just object-drop assumptions. Distinguish request-owned live storage,
reusable retained capacity and cumulative/high-water measurements. Existing
cache reset may retain reusable allocation while restoring logical state. Permit
that only when the actual boundary explicitly allows it, report retained bytes
and enforce the cap; if the frozen gate requires stronger counter restoration,
resolve that discrepancy with its owner instead of redefining the requirement.

Timeout/cancel tests use injected deterministic clocks/cancellation flags and
explicit phase barriers, not wall-clock sleeps. Test before allocation, during
provisional work and before commit. A cancellation received after a successful
commit cannot retract that completed result; the next operation observes the
flag according to its documented rule. A cleanup failure gets its own evidence
and terminal disposition without overwriting the original execution cause.

Later artifact, serving, page-allocation and persistence owners must exercise
these conditions against their actual state machines. An in-memory stand-in
can validate category and cleanup protocol, not prove a filesystem rename,
database transaction, kernel cancellation or multi-request page allocator works.
If the Chapter 50 capability gate demands those real integrations, record the
lifecycle dependency and wait for its owner to reconcile acceptance; do not
count a mock as a real end-to-end failure-atomicity result.

### 4.5 Exact frozen implementation outputs

Only these 22 canonical outputs belong to the future chapter, plus necessary
shared integration edits explicitly recorded before use:

```text
curriculum/chapters/50-dependency-error-contract.md
rust/crates/llm-from-scratch/module-registry/functional-v1/ch50-dependency-error-contract.module
rust/crates/llm-from-scratch/tests/ch50_dependency_error_contract.rs
rust/crates/llm-from-scratch/examples/ch50_dependency_error_contract.rs
rust/crates/llm-from-scratch/examples/expected/ch50_dependency_error_contract.txt
rust/crates/llm-from-scratch/src/support/functional_error.rs
rust/crates/llm-from-scratch/src/support/dependency_role.rs
scripts/check-functional-laptop-dependencies.mjs
site/src/content/chapters/en/50-dependency-error-contract.mdx
site/src/content/chapters/ru/50-dependency-error-contract.mdx
site/src/i18n/functional-catalogs/en/50-dependency-error-contract.json
site/src/i18n/functional-catalogs/ru/50-dependency-error-contract.json
site/src/content/cheat-sheets/en/50-dependency-error-contract.json
site/src/content/cheat-sheets/ru/50-dependency-error-contract.json
site/tests/50-dependency-error-contract.test.ts
site/tests/e2e/ch50-dependency-error-contract.spec.ts
audits/functional-laptop/reviews/50-dependency-error-contract/
artifacts/functional-laptop/chapters/50-dependency-error-contract/
artifacts/functional-laptop/chapters/50-dependency-error-contract/history-source-evidence-receipt.json
artifacts/functional-laptop/step-output-inventories/implement-ch50-dependency-error-contract.json
BUILD_STATE.yaml
DECISIONS.md
```

The seven Rust/checker owner paths are the module registry, integration test,
example, expected stdout, two support modules and the functional dependency
checker listed above. Store case definitions and structured results inside the
chapter test/example and named chapter artifact directory rather than adding
unowned global schemas or replacing the separate graph-admission manifest.

The chapter artifact directory should contain a versioned local fixture
manifest; normalized comparison/delta records; source-role inventory bindings;
failure-case definitions and results; before/after state snapshots; resource
measurements; source evidence; and the two capability records. These are
proposed internal filenames to freeze at implementation preflight, not an
alternative run-manifest authority.

Use the accepted shared run-manifest schema, whose frozen version-1 commitment
binds semantic/run config hashes, source commit, dependency receipt, device/
driver/backend/kernel/dtype identity, artifact DAG root, resource profile/plan,
allocator counters, thresholds, seeds, phase and terminal state, with unknown
fields rejected. No randomness is needed for the deterministic Chapter 50
fixtures; record that explicitly rather than inventing seeded stochastic data.
An actual receipt must not copy a dependency receipt from a different graph.

The separate admission step owns the future full dependency manifests,
allowlist/lockfiles and provisioning receipts, including backend/native/tool
boundaries. Chapter 50's checker output is input to that step, not its result.

## 5. Tests, failure matrix and observable results

### 5.1 Coverage rules and assertion bundles

Keep every case below as a named row in a versioned fixture manifest, with one
literal mutation or reproducible injected condition, exact expected category/
reason/phase/disposition, before/after state and evidence path. Do not inflate
the count by rerunning the same case under multiple seeds or counting expected
successes as failures. The matrix specifies 18 graph failures and 52 boundary
failures: 70 distinct planned injections, exceeding the frozen minimum of 50.

All reason tokens below are proposed stable course tokens, not strings found
in today's code. Freeze their mapping to the actual predecessor's typed errors
before implementing. Categories are those in section 4; phases are explicit.
Use three evidence scopes:

- `L`: Chapter 50's own local comparison/parser/record-validation logic.
- `I`: inherited real component API or accepted prerequisite adapter.
- `F`: contract harness now plus a mandatory later real integration gate.
  Harness success is never mislabeled as actual backend/server/persistence proof.

The named plan has 29 purely L cases (including the 18 graph rows), 7 I cases,
33 F cases and one mixed L/F precedence case, totaling 70. Record executed,
passed, failed and unresolved counts separately for those scopes; these counts
describe planned coverage, not results. No test has been executed in this
planning checkpoint.

For each failed case assert `D`: correct typed category/reason/phase, a non-success
result, explicit terminal state/disposition, bounded diagnostic and no silent
substitution. Also apply the relevant state bundle:

- `U`: pre-commit rejection; the declared live snapshot is byte/counter-identical,
  no model/page allocation and no publication. Scratch parser/diagnostic memory
  is measured separately.
- `P`: provisional work may allocate, but it is released/discarded; live committed
  state and last-good artifact remain unchanged, live provisional ownership returns to the declared baseline, with no RNG/page/
  request leak and no partial response publication. Reusable retained capacity
  and cumulative/high-water counters have separately frozen effects; they are
  not all reset counters.
- `T`: stop the affected session/job explicitly when cleanup cannot establish safe
  reuse; retain the last-good committed state and both original/cleanup evidence.
  Never claim unverified cleanup or continue using possibly corrupted state.

For `F`, execute an explicitly labeled injected boundary harness now and bind
the later owner's real test requirement. If the mandatory capability verifier
requires the real caller already, leave that gate unresolved; the 70-row plan
cannot authorize a false passing receipt. Do not weaken the scope to make a
numerical test count pass.

### 5.2 Graph and role failures — G01–G18

All graph cases are local `L`, `Dependency` category, `Startup` phase, `D+U`,
terminal rejected, unless the row names a stronger semantic gate. Candidate
fixtures are read-only inputs; the approved snapshot, manifests and lockfiles
must not be changed by rejection.

| ID / test suffix | One injected condition | Exact proposed reason and observation |
| --- | --- | --- |
| G01 `package_added` | Add a fourth unapproved local package. | `package_unapproved`; one added package record. |
| G02 `package_removed` | Remove U and its dependent references coherently. | `snapshot_incomplete`; missing approved package/edge/feature records. |
| G03 `version_changed` | Apply the U version mutation from section 3. | `package_identity_mismatch`; three additions and three removals. |
| G04 `source_changed` | Same package name/version, different source identity. | `package_source_mismatch`; no name-based acceptance. |
| G05 `checksum_changed` | Change one byte of retained package content with fixed expected digest. | `package_checksum_mismatch`; no rewritten expected hash. |
| G06 `edge_added` | Add C → U with alias `text_direct`. | `edge_unapproved`; approved transitive package is not an approved direct edge. |
| G07 `edge_kind_changed` | Change e2 from normal to build. | `edge_kind_mismatch`; one addition and one removal. |
| G08 `alias_changed` | Rename e1's alias without an approved snapshot change. | `edge_alias_mismatch`; identity does not collapse to target package name. |
| G09 `target_changed` | Change e2 target condition from all to a new condition. | `edge_target_mismatch`; no host-only blind spot. |
| G10 `feature_added` | Add `J/automatic_attention`. | `feature_unapproved`; one addition, zero removals. |
| G11 `feature_missing` | Remove approved `U/std`. | `snapshot_incomplete`; exact snapshot differs even if a broader catalog permits less. |
| G12 `role_missing` | Remove r3. | `call_site_uncovered`; one missing record. |
| G13 `role_ambiguous` | Add a conflicting second role for r3. | `call_site_role_ambiguous`; reject before set comparison. |
| G14 `role_forbidden` | Declare r3's operation as attention instead of JSON syntax. | `role_forbidden`; policy refuses this declared taught operation. A falsely labeled call additionally needs source review. |
| G15 `source_binding_drift` | Change reviewed call-site bytes without changing the ledger hash. | `call_site_source_mismatch`; structural name-only view alone still matches. |
| G16 `provenance_missing` | Remove retained license hash from a full admission-record fixture. | `provenance_incomplete`; toy records are not reused as real provenance. |
| G17 `context_mismatch` | Check metadata from a different feature/target context. | `build_context_mismatch`; do not compare unlike snapshots. |
| G18 `graph_too_large` | Construct 501 distinct typed package records under the 500-package policy. | `package_count_limit`; reject before graph expansion or provisioning. |

Also test duplicate package/edge IDs, malformed metadata, unsupported record
schema, an alias/re-export missed by a naive source grep, unbound build-script
or native behavior, unresolved duplicate-version rationale and absent advisory
disposition. These are additional coverage, not substitutes for the 18 named
rows. The semantic review of a disguised taught operation remains substantive:
passing an import scan is not the expected answer.

### 5.3 Boundary failures — F01–F52

Use the exact requested identities from the fixture manifest. Symbolic names
such as `device-A` are local test identifiers, not claims about a real device.
For an artifact-integrity fixture, reuse its actual format and checksum algorithm,
then flip exactly one covered payload byte with the stored checksum unchanged.
The inherited Chapter 35 checkpoint uses its existing non-cryptographic u64
checksum, not SHA-256. Full artifact SHA-256 admission is a separate future
binding and must not be claimed from this inherited test.

| ID / suffix | Injected condition | Category / reason | Phase; scope; state |
| --- | --- | --- | --- |
| F01 `artifact_missing` | Requested local artifact path absent in the owned temporary fixture directory. | Artifact / `missing` | ArtifactRead; I; U |
| F02 `artifact_checksum` | Flip one covered payload byte in the accepted checkpoint fixture with its stored u64 checksum unchanged. | Artifact / `checksum_mismatch` | ArtifactRead; I; U |
| F03 `artifact_extent` | Remove the final byte of the accepted tiny checkpoint fixture; declared total length remains unchanged. | Artifact / `file_extent` | ArtifactRead; I; U |
| F04 `artifact_version` | Change only the fixed-header version in the accepted checkpoint corruption fixture to its unsupported value; version is checked before extent/checksum. | Version / `unsupported` | ArtifactRead; I; U |
| F05 `dtype_mismatch` | Requested dtype and artifact dtype differ. | Dtype / `mismatch` | RequestAdmission; F; U |
| F06 `quant_layout` | Requested quantization layout is unsupported. | Quantization / `unsupported_layout` | RequestAdmission; F; U |
| F07 `device_missing` | Requested device absent from injected availability inventory. | Device / `unavailable` | Startup; F; U |
| F08 `device_identity` | Available device has a different required identity. | Device / `identity_mismatch` | Startup; F; U |
| F09 `kernel_missing` | Required named kernel absent. | Kernel / `unavailable` | Startup; F; U |
| F10 `kernel_identity` | Kernel identity differs from the admitted binding. | Kernel / `identity_mismatch` | Startup; F; U |
| F11 `adapter_missing` | Requested adapter absent, while base model is available. | Adapter / `missing` | RequestAdmission; F; U |
| F12 `adapter_base` | Adapter binding names a different base-model hash. | Adapter / `base_mismatch` | RequestAdmission; F; U |
| F13 `config_syntax` | Use the malformed JSON bytes in section 3. | Config / `syntax` | ConfigAdmission; L; U |
| F14 `config_divisibility` | Use width 5, heads 2. | Config / `shape_divisibility` | ConfigAdmission; L; U |
| F15 `config_zero_heads` | Use width 4, heads 0. | Config / `zero_heads` | ConfigAdmission; L; U |
| F16 `config_unknown` | Use the unknown-field JSON bytes. | Config / `record_fields` | ConfigAdmission; L; U |
| F17 `config_duplicate` | Use the duplicate-field JSON bytes. | Config / `record_fields` | ConfigAdmission; L; U |
| F18 `schema_version` | Unsupported request/config schema version. | Schema / `unsupported_version` | RequestAdmission; F; U |
| F19 `constraint_unavailable` | Required constrained-output schema cannot be enforced by the selected capability. | Schema / `enforcement_unavailable` | RequestAdmission; F; U |
| F20 `tool_missing` | Required tool absent in injected tool inventory. | Tool / `unavailable` | Startup; F; U |
| F21 `tool_version` | Provisioned tool version does not match the bound version. | Tool / `version_mismatch` | Startup; F; U |
| F22 `persistence_off` | Request persistence while that optional feature is disabled. | Persistence / `unsupported` | RequestAdmission; F; U |
| F23 `persistence_backend` | Explicitly selected optional backend unavailable. | Persistence / `backend_unavailable` | Startup; F; U |
| F24 `persistence_restore` | Selected optional restore has an identity mismatch. | Persistence / `restore_identity_mismatch` | ArtifactRead; F; U |
| F25 `migration_version` | Selected optional restore needs an unsupported migration. | Migration / `unsupported_version` | ArtifactRead; F; U |
| F26 `migration_abort` | Inject failure before migration's commit barrier. | Migration / `failed` | Execution; F; P |
| F27 `byte_over_limit` | Admission estimate 1025 bytes under a 1024-byte local test cap. | Resource / `byte_limit` | RequestAdmission; L; U |
| F28 `shape_product_overflow` | Checked product of `usize::MAX` and 2 in a shape estimate. | Resource / `size_overflow` | ConfigAdmission; L; U |
| F29 `host_cap` | Required host estimate exceeds its bound by one byte. | Resource / `host_limit` | Startup; F; U |
| F30 `page_quota` | Request one more page than the admitted per-request quota. | Resource / `page_limit` | RequestAdmission; F; U |
| F31 `timeout_before` | Inject expired deadline before admission. | Timeout / `deadline` | RequestAdmission; F; U |
| F32 `timeout_provisional` | Inject deadline at a barrier after provisional allocation but before commit. | Timeout / `deadline` | Execution; F; P |
| F33 `cancel_before` | Cancellation flag set before admission. | Cancelled / `requested` | RequestAdmission; F; U |
| F34 `cancel_provisional` | Set flag at the pre-commit execution barrier. | Cancelled / `requested` | Execution; F; P |
| F35 `nonfinite_input` | Supply NaN where the accepted sampling/model boundary requires finite input. | Numeric / `nonfinite_input` | RequestAdmission; I; U |
| F36 `nonfinite_gradient` | Inject a nonfinite gradient before the optimizer update. | Numeric / `nonfinite_gradient` | Execution; I; U |
| F37 `quant_feature_off` | Quantized execution requested with its optional feature disabled. | Quantization / `unsupported` | RequestAdmission; F; U |
| F38 `error_unknown_field` | Decode an error-record fixture with an undeclared semantic field. | Schema / `record_fields` | ConfigAdmission; L; U |
| F39 `error_unknown_category` | Decode an unsupported serialized category token. | Schema / `unknown_category` | ConfigAdmission; L; U |
| F40 `error_impossible_tuple` | Decode a rejected admission record claiming a successful committed disposition. | Schema / `invalid_error_tuple` | ConfigAdmission; L; U |
| F41 `precedence_optional` | Persistence disabled and its requested artifact missing. | Persistence / `unsupported` | RequestAdmission; F; U |
| F42 `precedence_config` | Malformed config and required device unavailable. | Config / `syntax` | ConfigAdmission; L/F; U |
| F43 `publication_failure` | Inject write/rename failure before the accepted atomic-publication commit. | Artifact / `publication_failed` | Commit; I; P |
| F44 `cleanup_failure` | Inject cleanup failure after a separately retained execution failure. | Internal / `cleanup_failed` | Cleanup; F; T |
| F45 `shorter_context` | Requested context cannot be admitted; smaller context would fit. | Config / `context_unavailable` | RequestAdmission; F; U |
| F46 `cpu_substitution` | Required device unavailable; CPU is available but not requested. | Device / `fallback_forbidden` | Startup; F; U |
| F47 `lower_precision` | Required dtype unavailable; lower precision is available. | Dtype / `fallback_forbidden` | RequestAdmission; F; U |
| F48 `adapter_omission` | Adapter load fails; base-only generation would be possible. | Adapter / `fallback_forbidden` | RequestAdmission; F; U |
| F49 `evaluation_omission` | Required evaluation cannot execute; training result otherwise exists. | Config / `required_evaluation_unavailable` | Execution; F; T |
| F50 `unknown_source_error` | Inject a supporting error with no declared safe boundary mapping. | Internal / `unmapped_source` | Execution; L; T |
| F51 `smaller_model` | Required model cannot be admitted; a smaller model is available. | Config / `model_unavailable` | RequestAdmission; F; U |
| F52 `persistence_substitution` | Selected optional backend fails; another backend is available. | Persistence / `fallback_forbidden` | Startup; F; U |

Each row also asserts `D`. Timeout/cancel rows use their respective terminal
states; ordinary pre-commit refusals use rejected, execution/commit/cleanup
failures use failed unless an accepted existing contract dictates a more
specific frozen mapping. `U` describes preserved state, not a universal terminal
label: F36 can fail during execution while preserving the pre-update state.

F02/F03/F04 reuse the literal construction in the existing
`version_extent_and_checksum_corruptions_are_typed` test. Bind its actual field
positions and chosen unsupported value before copying a fixture into the
integration test. Removing the last byte reaches the early declared-extent
guard, not a reader-level `Truncated` error. Retain the underlying typed source
variant in all adapters.

In F36 snapshot the state at the optimizer admission boundary, including the
already supplied gradient; this test does not undo the earlier forward/backward.
F43 adapts the actual checkpoint's supported replacement/atomicity rules; do not
assume every platform supports atomic replacement. F44 must retain the original
cause alongside cleanup failure and stop reuse, not replace one error with the
other. F49 stops the affected job's success claim without erasing a valid
last-good checkpoint. F50 exercises a real source-preserving adapter, not an
arbitrary error string with no underlying type.

Ordinary unavailability and an attempted fallback are different test inputs:
F07 refuses an unavailable request; F46 injects an explicit proposed substitute
and proves the policy rejects that substitution. Do not assign two reasons
nondeterministically to the same event.

### 5.4 Positive, compatibility and transport observations

Required positive controls do not count toward the 70 failures:

- The unchanged synthetic graph has 3 packages, 2 edges, 2 features, 3 roles and
  zero differences. Ordering of input vectors does not change sorted output;
  duplicate identity records are not silently deduplicated.
- Valid tiny JSON returns head width 2, with the declared state unchanged.
  The bound full model config remains the predecessor's schema.
- At the local 1024-byte cap, 1024 is admitted and 1025 is refused; capture
  allocation counters before either candidate allocation.
- The actual admitted current graph passes only the checks it has enough
  provenance and role evidence to support. Missing full-graph fields leave
  full admission pending, not an automatic migration from the name allowlist.
- Required device unavailable: process-health fixture may be healthy while
  readiness is false, with exact missing-capability reason. Available requested
  device: readiness can pass only after all declared checks.
- Successful EOS, token-limit and context-limit generation stops remain the
  inherited successful stop conditions; do not relabel them as failure merely
  to fill the error taxonomy. Conversely, invalid context configuration or
  unexpected exhaustion must not be converted into a successful context stop.
- Cancellation observed strictly after commit does not roll back the completed
  result; retain its explicit committed-outcome receipt. A subsequent cancellation
  record identifies the next stopped work, not an undone prior result; no
  duplicate response/commit is emitted. Its effect on the next
  operation follows the frozen state machine.
- Public diagnostic contains stable safe IDs and no raw prompt/credential/path
  payload. Source error remains accessible to the authorized internal adapter.
  Metric, response and receipt use the same actual identity, or `not_selected`.
- A failed checker leaves policy/manifests/lockfile bytes unchanged and reports
  nonzero. A Cargo child failure retains child-status evidence, not a fake
  dependency-policy match or a network retry.

Reuse existing checkpoint fixtures
`literal_checkpoint_round_trip_is_byte_deterministic`,
`version_extent_and_checksum_corruptions_are_typed` and
`atomic_save_replaces_one_complete_file_and_leaves_no_temporary`, plus cache
fixtures `request_errors_and_late_prompt_error_preserve_logical_state`,
`final_normalization_failure_after_layer_preparation_commits_nothing` and
`invalid_cached_generation_requests_never_advance_rng`. Reinspect their exact
signatures at execution time; a new wrapper must not weaken their original
assertions or rewrite their goldens.

The example's proposed stable trace fields are context, record counts,
mutation ID, added/missing counts, category/reason/phase, disposition, terminal
state and before/after counters. Generate expected stdout from real Rust only
after independent arithmetic/policy checks; one final newline, deterministic
ordering, no wall times, absolute paths or platform-dependent error strings.
Bind complete structured case records separately; concise stdout must not
conceal missing coverage.

No floating tolerance is needed for set differences, enum identities, hashes,
counts, phases or state snapshots. NaN rejection is an explicit classification
test. Inherited model numerical tests retain their own frozen operation/dtype/
reduction-order tolerances. Passing this matrix does not prove hardware-fault
recovery, security against malicious build scripts, general package safety or
improved model quality.

## 6. Teaching and surface commitments

### Problem-first presentation

**Problem definition.** Explain that adding supporting libraries can obscure ownership
of taught operations, while failures at library boundaries can leave partially changed
state. Establish the need to keep course-owned decisions explicit and make typed
failures preserve the state promised by each operation.

Follow the current [authoring policy](README.md#current-learner-facing-authoring-policy-2026-10-02): problem definition, guided solution, history,
visualization, then small optional practice. The opening explains the problem and its
cause without questions. Explain the worked results and their formula/Rust connection.
Remove learner prediction prompts entirely; do not move them to optional practice.
Optional tasks reproduce, inspect or explain behavior already taught. The retained
commitments below specify evidence coverage, not the old opening order.

### Retained evidence and optional-practice commitments

This is a bounded lesson about keeping a model's operations inspectable as its
surrounding software grows, not a detour through package-manager design.

| Retained coverage | Learner action and evidence | Required commitment |
| --- | --- | --- |
| 1. Explain the boundary | Compare parsing the tiny width/head record with computing attention. | Name exactly what the supporting package does and what course Rust still decides. |
| 2. Read the graph | Expand C/J/U into package, edge, feature and role records. | Explain direction, dependency kind, exact identity and record counts locally. |
| 3. Optional mutation practice | Inspect the Rust comparison and explain the added/missing records; optionally reproduce the comparison. | A name-only allowlist misses version, edge, feature and source-role changes. |
| 4. Decode is not validate | Run valid, bad-shape and zero-head JSON. | Syntax success is not shape validity; zero heads is checked before division. |
| 5. Follow a failure | Read code, phase, reason, state effect and allowed recovery separately. | A typed failure is observable and does not silently select a different model/device/configuration. |
| 6. Revisit an earlier model mechanism | Use the approved historical anchor and course-owned contrast once its gate is resolved. | Dependency policy preserves visibility; it did not cause the historical modeling improvement. |
| 7. Reproduce and transfer | Add an unauthorized feature, remove a role binding, inject a pre-commit error. | Inspect the exact refusal and verify the declared state counters remain unchanged. |

Keep build instructions, artifact receipts, authority rules, model routing,
review machinery and static-site implementation outside learner-facing prose.
Explain the LLM relevance in terms of which model operation remains visible and
which result can be trusted after a failed operation. Do not say the lesson has
no figure because a contract or test forbids one.

Define $A$, $P$, $E$, $F$, $R$, $c$, $O_c$, both differences and $d,h,d_{\mathrm{head}}$
where used. Explain disjoint record tags and the difference between a permission
catalog and an exact approved context snapshot. Use math markup for every
expression and code styling only for literal records, APIs and trace tokens.

Exercises and expected answer commitments:

1. Change U's version in the synthetic fixture, updating its edge and feature
   references. The exact-snapshot comparison has three added and three missing
   records under the declared edge-ID role representation; it is not a one-record
   change merely because one package changed.
2. Ask whether `{"width":5,"heads":2}` is valid JSON and a valid model shape.
   Answers are yes and no, respectively; divisibility fails after syntax decoding.
3. Ask whether disabling default features in one dependency declaration proves
   no default feature is active. No: inspect the resolved context across all
   activating edges.
4. Given a pre-allocation rejection at revision 7, counter 192 and cache length 3,
   report those same values afterward. Do not claim that a different post-commit
   failure must have the same guarantee.
5. Ask whether a graph-policy pass proves a call performs only plumbing. No:
   the source-role claim requires evidence and substantive review; hashes only
   bind the claim to exact bytes.
6. Ask whether an unsupported backend permits silent CPU fallback. No: return
   the prescribed explicit category and reason; a different backend needs an
   explicitly admitted configuration and its own identity.

Freeze neutral role requirements before external judgment:

- Complete document: connect the library boundary and typed state effects to the
  inspectable decoder without claiming they improve model quality.
- Contextual graph heading: identify the table's role; its associated explanation
  supplies the chapter concept, so do not force every heading to repeat it.
- Isolated mutation row: identify baseline, exactly one change, expected category,
  added/missing interpretation and any state effect needed to understand the row.
- Isolated error code/reason pair: retain the failed operation/phase and recovery
  scope; a bare word such as `unsupported` is insufficient on its own.
- Example output block: label synthetic graph versus actual dependency evidence,
  units/counts, configuration input and unchanged-state snapshot.
- History paragraph and related Rust: name the earlier model limitation, later
  mechanism and supported observation after the source gate is resolved; do not
  substitute tooling chronology.
- Cheat sheet: concise chapter-used LLM-context terms only, such as supporting
  operation, model invariant and terminal request state. Do not fill it with
  unrelated Rust vocabulary or make it a second lesson.

The English contract, lesson, catalogs, sheet, output explanations and accessible
table labels carry the same scope. Russian must later translate the matching
approved English directly; no localized wording is authored in this packet.

## 7. Tables, mathematics and accessibility; no diagram

The frozen visualization decision is `not-useful`, with null ID. Exact table
cells expose changed package identities, edges, features and terminal categories
more precisely than a node-link diagram, which would obscure the fields being
compared. Do not create a chapter figure, diagram component, visualization ID,
private expansion control or diagram-trace artifact.

Use semantic tables with captions and explicit column/row headers, in the same
reading order as the explanation. A mutation's input, expected reason and state
effect must remain associated at narrow widths and in the accessibility tree.
Do not use color alone for admitted/rejected or unchanged/changed state.

The small worked graph should fit through concise identities and local aliases
whose meanings are provided before the table. For longer real identities,
provide a named keyboard-reachable scroll region only where the actual table
needs it; do not let the whole page overflow or clip the values. A partial
checksum prefix is a display label only and cannot stand in for the exact
evidence binding. Keep the full needed static value accessible.

Built HTML must contain every table cell, error token, explanatory label and
server-rendered math annotation once in the intended content surface. Test
formula spacing and containment on desktop and narrow widths. No figure means
there is no chapter-specific full-view test; it does not waive whole-page,
table, formula, keyboard, forced-color or direction-sensitive validation in
the sole Firefox project with JavaScript enabled.

The separate shared cheat-sheet modal still needs its one static term tree,
keyboard entry/close/Escape/focus restoration and constrained narrow scrolling.
Do not create a second scripting-off interaction or substitute English terms
on Russian pages. English layout is not evidence that Russian fits.

## 8. Serial implementation procedure and stop conditions

The following are phases within the canonical bilingual implementation step,
not permission to publish separate unfinished vertical slices. Each phase is
small enough to checkpoint and resume using a fresh run when bound inputs drift.

| Phase / predecessor | Inputs to preserve | Output and exact stop condition |
| --- | --- | --- |
| 50.1 / accepted Chapter 49 | Actual modes/errors, manifests, current graph checker, frozen resource/error clauses, source inventory | Freeze context snapshot, role ledger, category/reason/state-effect table and ownership map. Reconcile conflicting prior API names before code. History source gap remains an explicit content gate. |
| 50.2 / 50.1 | Already admitted syntax/hash plumbing and deterministic graph fixture | Implement the course-owned normalized comparison and typed-error primitive. Toy deltas, strict JSON and all immediately owned failures pass with no new package acquisition. |
| 50.3 / 50.2 | Pinned offline Cargo evidence and independently approved role claims | Add the functional checker adapter and graph mutation suite. Bind real source bytes and all supported contexts; structural success and semantic role approval remain separate fields. |
| 50.4 / 50.3 | Actual predecessor APIs and the frozen failure matrix | Add lossless adapters and fault injection. Every required case has exact category/phase/reason, terminal/disposition and state assertions. Mark later-owned integration coverage honestly; resolve any acceptance dependency before claiming capability completion. |
| 50.5 / 50.4 | Rust traces, passing resource checks and approved historical anchor/evidence | Author English contract/lesson/catalog/sheet with neutral whole/reading/isolated roles. Stop before review if history or any mandatory capability gate is missing. |
| 50.6 / 50.5 | Frozen source and built English HTML | Obtain both independent reviews and both same-role adjudications through the external workflow; only four passing verdicts release localization. |
| 50.7 / 50.6 | Matching approved English | Localize Russian directly, obtain independent bilingual/target-only review and separate Firefox layout evidence. No self-certification or invented approval. |
| 50.8 / 50.7 | Coherent Rust/EN/RU artifacts and all exact receipts | Publish atomically where practical; rerun publication identity checks, complete the step and commit only its owned outputs. Do not begin graph admission, serving or Chapter 51 merely because this step completed. |

Keep the normalized fixture definitions, policy revision, Cargo context argv and
raw metadata, source bindings, comparison deltas, role evidence, typed failure
records and before/after snapshots in the named staging/artifact directory.
A restart may reuse only checksum-verified inputs and evidence that still match.
Changed source, feature context, error precedence, policy or learner meaning
invalidates dependent results. Preserve rejected records and failed runs.

The executor must not mutate earlier completed artifacts to make a new snapshot
appear historically approved. A new supporting dependency, feature, backend,
error compatibility break or historical source needs the recorded owner action
and a new bound run, not an automatic allowlist rewrite during validation.

## 9. Exact validation and independent review handoffs

Exact future commands, from repository root:

```bash
scripts/run-functional-history-source-evidence.sh --step implement-ch50-dependency-error-contract --chapter 50-dependency-error-contract --runtime-receipt artifacts/functional-laptop/execution-boundaries/offline-workspace/history-source-extractor-toolchain-receipt.json
scripts/run-functional-offline.sh --step implement-ch50-dependency-error-contract --target implement-ch50-dependency-error-contract-v1
scripts/run-functional-firefox.sh test --step implement-ch50-dependency-error-contract --target chapter-50-dependency-error-contract-v1
git diff --check
./course audit-host
```

The history/offline/Firefox wrappers are future prerequisite-owned inputs, not
commands created or run in planning. At implementation preflight inspect the
actual target and bind its exact inner commands for Rust formatting, clippy,
unit/integration/mutation tests, module ownership, dependency/feature/source
checks and byte-exact example output. Include both capabilities and every
required failure record; one wrapper exit code without coverage is insufficient.

Also bind contract/content/catalog/cheat-sheet checks, math annotations, static
production build, links and whole-page Firefox cases. There is no visualization
registration for Chapter 50. Do not invent a required figure to satisfy a generic
template or omit table/formula checks because the figure list is empty.

The offline runtime receipt binds schema, image/manifest, source snapshot,
Cargo/site lock identities and the declared command context. Use the admitted
runtime rather than host tool substitutions. Neither Cargo's offline option nor
an approved package confers network, filesystem, container or GPU authority.
Keep ignored root `target/` cache intact; a real host-audit failure remains a
failed gate, not a reason to delete unrelated cached work.

Automated Firefox preview binds one explicit loopback test port distinct from
human preview, deriving command/readiness/base URL from that same setting. Do
not adopt an unrelated running server or publish the automated port to the host
in the supported container workflow. No alternate browser engine or JavaScript-
disabled interactive surface is supported.

For English, follow the current authoring skill and common guide. Freeze source,
built HTML, evidence/commitment map, neutral requirements and the complete/
reading-order/isolated inventory. Use an actual frozen author context and two
fresh different reviewer contexts, followed by two additional fresh same-role
adjudicators. All five contexts are pairwise distinct. Route exact canonical
four-artifact prompts and validate untouched raw JSON response bytes and external
routing/receipts. Both review and both adjudication verdicts must pass for the
same unchanged candidate. Supporting a sound blocking review does not turn the
candidate into a pass.

The future single executor using the user-selected model cannot spawn agents or approve its
own publication. Supply those judgments externally; absent capacity leaves the
candidate staged. Deterministic tools may verify binding and coverage but cannot
prove that a library call is pedagogically permissible or that prose teaches it
well. Never normalize or repair semantic response bytes.

Russian follows from the exact approved English using the localization skill,
with independent bilingual and target-only review and its own desktop/narrow
Firefox evidence. Meaning, role, presentation or extracted-surface drift
invalidates dependent review evidence. No actual review or localization occurs
during this planning checkpoint.

## 10. Cost, risks and readiness

Current work is medium internal planning with bounded read-only official
documentation inspection. No package, model or data acquisition; no training,
GPU work, learner-content publication or external review activation.

The frozen chapter lifecycle is C3/G0/N2, paid none, but
`implement-ch50-dependency-error-contract` itself is large C3/G0/N1, paid none.
Only that implementation step and the later
`admit-functional-supporting-dependency-graph` are lifecycle cost-authority
steps. The N2 admission activity belongs to the latter; it is not hidden inside
this chapter's N1 implementation. The source-evidence cap is 134,217,728 bytes;
new artifact-download authority is zero. A planned package is not available
until its exact graph and offline source material have been admitted.

Capability ceilings remain: failure scan below 2 GiB RAM and 30 minutes;
dependency graph at most 500 packages, scan below 2 GiB and 10 minutes;
separately provisioned offline build below 12 GiB and 60 minutes. These are
upper bounds, not permission to exceed the stricter executing profile or to
charge the separate provisioning step here.

`reference-ci` and `bridge-ci` execute; `8gb-gpu-core` only plans. The CPU
profiles retain f64, P1188/context4/N2048/microbatch16/accumulation1 and
P8304/context16/N65536/microbatch8/accumulation1 respectively. Each permits
host at most 268,435,456 bytes, device/headroom zero, disk 1,073,741,824 bytes,
download zero and wall 600 seconds. Installed-host minimum/recommendation is
1,073,741,824 bytes; calibration tokens are zero. A 2 GiB capability ceiling
does not expand a 256 MiB execution profile. If compilation needs another
declared provisioning envelope, the runner must separate and receipt it;
otherwise stop with a budget conflict rather than hiding the peak.

The planned core retains P32,514,560/context512/N20,000,000/microbatch1/
accumulation64 and at most 32,768 valid tokens/update. Host cap is
12,884,901,888 bytes; device cap 6,710,886,400; headroom at least 536,870,912;
disk 30,000,000,000; download ceiling 4,000,000,000; wall 108,000 seconds.
Installed-host minimum/recommendation is 17,179,869,184/34,359,738,368 bytes.
Keep the protected FP16/FP32 WGPU/Vulkan dtype policy. None of these ceilings
authorizes a GPU run or dependency download for this G0 chapter.

Core calibration remains planned: synchronized 300–900 seconds, at least
100 microsteps, ten windows, at least 10,240 tokens, at least 350 valid tokens/
second using the lower aggregate-or-p10-window statistic, second-half median
at least 85% of the first, and projection `fixed3600-plus-1.5N-over-rate`.
This packet reports no measured throughput, model quality or device availability.

Content budget: eight successful contexts, at most sixteen attempts; per
context input 2,097,152 bytes/200,000 tokens and output 1,048,576 bytes/40,000
tokens; aggregate input 33,554,432 bytes, output 16,777,216 bytes and wall
28,800 seconds. One rendered-image context using the user-selected model permits input
16,777,216 bytes, output 262,144 bytes and wall 900 seconds. Operational
routing uses the user-selected model. These budgets do not waive external independence.

Readiness ownership and decision rules:

- The accepted predecessor supplies real APIs, model/config/error identities
  and current state-effect guarantees; reconcile before implementing adapters.
- The existing foundation supplies approved parsing/hash/runtime inputs.
  Do not let a checker approve its own newly downloaded bootstrap dependencies.
- The separate graph-admission owner resolves and admits the larger backend
  graph after this checker exists; synthetic graph tests are not that receipt.
- The history/contract owner must supply an approved primary model anchor or
  an explicit recorded scope/source amendment before content approval.
- Later serving, artifact and training owners integrate terminal errors into
  their real state machines. A local harness does not certify an unimplemented
  request/page allocator or complete job resume. If a frozen Chapter 50 gate
  demands those later artifacts, reconcile lifecycle ownership before acceptance;
  do not forge coverage or start later steps to bypass their dependencies.
- External judgment capacity is required for English and Russian publication.
  Missing capacity leaves staged work and an explicit gate, not self-approval.

Future done means an exact context-bound graph policy, independently evidenced
call-site roles, a complete typed failure matrix with at least 50 distinct
injections at their declared scope, no silent substitution, tested preallocation/
commit/cleanup behavior, honest resource accounting and coherent Rust-driven
EN/RU content with all historical, independent review and publication gates.
Planning done means those decisions, examples, tests and unresolved-owner rules
are explicit; it does not make their future evidence exist.

Stop this requested planning batch after Chapter 50's validated planning
checkpoint and dedicated commit. Chapter 51 planning remains pending.
