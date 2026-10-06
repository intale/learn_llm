# Maintained development-script helpers

These small modules support deterministic repository tooling; they do not
implement learner-facing LLM algorithms or grant callers additional authority.
Run their focused tests with the pinned development Node environment declared by
the owning `BUILD_STATE.yaml` step.

## Functional successor integration

`site/src/i18n/functional-chapter-locales.json` is the separate exact40–85
projection:40 is English/Russian,41+ English-only while Russian is held. The
revision78 base manifest and both readers are immutable. The composed Node/typed
helpers validate the separate projection without changing those base exports.

`site/src/lib/functional-course-publication.mjs` owns pure production and private
candidate selectors. Production needs the exact contiguous prefix and validated
active-locale evidence. A missing receipt stops activation; a malformed existing
receipt fails the build. Detail/index/navigation/sitemap and content/link checks
share that decision. No partial Chapter40 is published by infrastructure setup.

Functional catalog files use closed fields `schemaVersion`, `chapterId`,
`locale`, `contentRevision`, `title`, `description`, `objective`; the last
three equal actual lesson metadata. Their canonical paths are
`site/src/i18n/functional-catalogs/<locale>/<chapter-id>.json`.

A separate `artifacts/functional-laptop/chapters/<id>/publication-receipt.json`
has closed fields `schemaVersion:1`, `chapterId`, `contentRevision`, `files`.
Every `files` key is an exact path returned by
`publicationInputPaths(id, activeLocales)`, with only `bytes` and `sha256`.
Use the maintained review tool's `canonicalJson` for compact sorted JSON+LF.
This receipt records bytes, NOT a verdict. The verifier recomputes the complete
inventory and invokes the unchanged maintained English four-chain verifier,
plus Russian localization verification for40. It checks revision, the existing
localized contract/lesson projection, neutral signature, catalog metadata and
sheet identities. Unknown, missing, extra, unsafe or drifting inputs refuse.
Run `node scripts/check-functional-step-receipt.mjs <chapter-id>`.

Private review uses only the existing `./course review RUN --check` staging
overlay. That Docker target sets `COURSE_BUILD_ROLE=private-review`; production
refuses a private descriptor. In the stage only, create
`site/src/i18n/functional-catalogs/private-review.json` with closed fields
`schemaVersion:1`, `chapterId`, `scopeId`, `sourceHashes`, canonical JSON+LF,
at most16384bytes. Source hashes are exactly `{en:<sha256>}`, or `{en,ru}` for
Chapter40 after English approval. Every declared source must exist and match;
actual locale revisions/signatures agree. There is no Russian41+ scope or stub.
The English-only40 candidate keeps declared final bilingual language links; only
its exact absent Russian equivalent is tolerated by private link audit. Production
checks every link. This rendering mechanism grants no author/review approval.

Contract checking dispatches0..39 through the unchanged demo checker. Exact
Chapters40/41 use their `rust/demos/ch<chapter-id>/` package main/lib sources and
`expected.txt`, retaining shared private/production locale/publication gates.
Chapter40 has no cumulative module fragment. Chapter41 separately registers its
four reusable artifact modules through the unchanged cumulative registry grammar.
Chapters42+ retain the cumulative crate's exact example/golden/registry paths.
`check-functional-rust-examples.mjs --all|--chapter <id>` runs the bounded
demo or in-package example and compares exact stdout. `check-functional-rust-ownership.mjs`
enforces the accepted ownership-map-v1 grammar and registered source coverage.
Only exact approved Chapters40/41 use the demo exception; no other chapter ID
selects it. Chapter41's standard URL/header/filesystem supporting dependencies
are separately pinned, fully allowlisted and cached; they never perform course
manifest/policy/identity/budget/restart decisions. No registry serialization change.

`node scripts/check-functional-chapter-reviews.mjs ch41-governed-corpus-acquisition`
dispatches the maintained complete English four-chain verifier at the exact
Chapter41 `english/` review root. It adds no Russian check under the user hold,
preserves the existing reference-core and measured-PostgreSQL dispatches, and
propagates verifier failure without rewriting raw judgments or supplying a verdict.

### Offline Rust current-source overlay

From the repository root, run:

```sh
scripts/run-functional-rust-overlay.sh RUN_ID OPERATION sha256:IMAGE_DIGEST -- cargo check --offline --locked -p PACKAGE
```

Before publication, the same script can be invoked by its immutable staged path
while the current directory remains the repository root. The owning step must
already authorize the command, image and inputs; this launcher grants no authority.
It requires an existing safe `.build/runs/RUN_ID/publish` and provisioned
`cargo-cache/registry`. It never provisions crates or pulls/builds an image.
Accepted Cargo subcommands are check/clippy/test/run/tree (locked) and fmt.
Docker always uses network-none, the proven private0755tmpfs, read-only canonical
and stage mounts, and a regular-file-only stage overlay. Empty claimed directories
do not become incomplete Cargo packages. Target/cache/log writes stay in the run;
a stable advisory lock serializes its Rust operations. Each fresh operation owns
private `validation/OPERATION` logs, exact argv, image and copied input hashes.
An existing operation refuses overwrite; Cargo/Docker failure is propagated.
There is no site/browser/review/acquisition mode or semantic validation shortcut.

Regression: `node --test scripts/tests/run-functional-rust-overlay.test.mjs`.
Its Docker fixture checks command plumbing only, not Rust execution or acceptance.

`llm_from_scratch::reference_source_identity` exposes
`verify_reference_source(manifest_bytes, supplied_files)` and
`verify_compiled_reference_source() -> Result<ReferenceSourceProof, ReferenceSourceError>`.
The latter uses the same checks without duplicating40-path loader plumbing.
Proof construction is private; getters are `source_revision()`, `identity()`,
`digest()`. The approved schema1 manifest domain is
`functional-reference-source`; the existing ArtifactIdentity domain is
`functional_reference_source`. They identify different structural layers, not
different hash algorithms. RustCrypto SHA256 remains the sole digest plumbing.
The explicit40 reference course source files are compiler-bound, as is the exact
approved schema1 manifest with `dependencyHashes: {}`. Cargo manifests and lock
are not source-census entries. Missing/extra/duplicate/stale/oversized or
noncanonical supplied input refuses. This proves compiled reference bytes, not
live Git cleanliness, dependency/runtime/environment equivalence, model quality
or reference training-resource accounting. Equal source identities alone do not
establish cross-environment bitwise equality. Actual Cargo.lock/hash, resolved
versions/features and toolchain remain separately recorded and checked by existing
execution/dependency gates; no dependency-closure tool or nested Cargo build call.

Focused tests: the five `scripts/tests/check-functional-*.test.mjs` infrastructure
files declared by the static step, `site/tests/functional-course-routes.test.ts`,
`cargo test --locked -p llm-from-scratch --test reference_source_identity`, and
the sole-Firefox `functional-course-shell.spec.ts`. Browser discovery reads actual
built routes; it is not an activation or semantic-certification mechanism.

## Bounded response byte reader

`lib/bounded-response.mjs` exports:

- `responseBodyLimit(status, successByteLimit)`: returns the supplied success
  byte cap for a 2xx status; returns 65,536 bytes for redirects, other
  non-success statuses, and statuses outside the success range.
- `readBoundedResponse(response, limit)`: reads `response.body` through its
  stream reader and returns `{ body, bytesReceived, overflow }`. `body` is a
  `Buffer` containing no more than `limit` bytes. `bytesReceived` counts the
  complete chunks delivered by `reader.read()`; a chunk that crosses the cap is
  counted in full even though only its fitting prefix is retained. This is not
  a count of wire bytes, headers, or bytes read ahead by a transport. The cap
  bounds retained response-body bytes, not transient memory used for a large
  chunk the transport has already delivered; creating a `Buffer` from that
  chunk can temporarily occupy more memory than the retained cap.

The reader validates that `limit` is a nonnegative safe integer. A missing or
null body produces an empty result. When a chunk crosses the cap, the reader
best-effort cancels the stream and reports `overflow: true`; cancellation
failure does not invalidate the bounded retained bytes. Read errors propagate
to the caller.

This helper buffers a single explicitly bounded byte response, not a large
corpus stream. Callers own URL/authority selection, redirects, retries,
timeouts, decompression, response sequencing, and aggregate/total-response byte
budgets. The status-dependent 65,536-byte cap is a default policy for
non-success bodies, not permission to make a request. It has no network access.

Focused tests: `node --test scripts/tests/bounded-response.test.mjs`.

## Reference-core OVER closure

Run `node scripts/check-functional-overbroad-surfaces.mjs` from the maintained
repository environment. The command has no flags and reads only the fixed
`audits/functional-laptop/reviews/reference-core-reframe/closure.json`.
Run regressions with
`node --test scripts/tests/check-functional-overbroad-surfaces.test.mjs`.

Closure schema version1 is a closed object with `schemaVersion`,
`baselineCommit`, `coverage`, `plan`, `inventories`, `dispositions`,
`localeRouting`, and `localeAuthorContext`.
Every file descriptor has exactly `path` (safe repository-relative regular file,
no symlink in any component) and `sha256` (exact current bytes). Coverage and
accepted plan descriptors are fixed by the checker. The baseline is commit
`365f70dde3510f40e84f9700aa11a3dea79e2ff0`.

`inventories` has exactly `english` and `russian` descriptors. English is the
final maintained `english-candidate-01/bundle/inventory.json`; Russian is the mechanically
exported `closure-evidence/ru-inventory.json`. Each exact inventory hash and
candidate/scope identity must equal the corresponding maintained
`english-candidate-01/bundle/bindings.json` or `ru-candidate-01/bundle/bindings.json`. The unchanged real
locale verifier recomputes the Russian inventory independently from the final
spec and source/target files. The snapshot adds no review role or API.

`dispositions` contains exactly the21 UTF-8-sorted original OVER IDs. Each closed
record has `surfaceId`, `disposition`, `ownerStep`, and `locators`; disposition
and owner must match the frozen accepted-plan registry. Every original locator
is mapped once by its actual `canonicalPath` plus `role`, not historical line
numbers. A locator has exactly `canonicalPath`, `role`, `source` (descriptor
whose path equals canonicalPath), `mode`, and `inventoryLinks`. Each link has
exactly `locale` (`english` or `russian`) and nonempty unique `surfaceIds`
existing in that final inventory. Publication locators require links. Only
OVER-PLAN01–05 use `prior-plan`, with no new publication-review links; preserved
records use `control`, while the remaining current-step locators use
`publication`. The root author reconciles the concrete role-to-occurrence
mapping; structural validation cannot determine whether it is semantically apt.

The checker hard-pins whole Chapter34 contract/EN lesson hashes, Chapter39
stdout lines2–9, the unique Chapter38 omission sentence, and the entire Chapter39
scope body to baseline bytes. It does not claim whole Chapter38/39 contracts
unchanged. It then invokes the unchanged maintained reference-core English
review/adjudication and Russian bilingual/target-only receipt verifiers with
all required arguments. Missing final inputs or any nonzero verification result
fail closed. Synthetic tests and command shims prove deterministic plumbing,
not technical truth, wording quality, localization approval, or publication.

`localeRouting` binds the exact final `ru-candidate-01/routes/routing.json` file;
`localeAuthorContext` binds `ru-candidate-01/frozen/author-context.json`, both relative to
the fixed reference-core review root. After the two unchanged maintained
review verifiers pass, closure repeats the locale helper's exact four-artifact
route validation in read-only mode against `ru-candidate-01/bilingual.raw.json` and
`ru-candidate-01/target-only.raw.json`. It cannot substitute declared prompt/context hash
strings for the actual frozen files or a status marker for receipt verification.

The reference-core receipt wrapper pins the settings-corrected final roots
`english-candidate-01/` and `ru-candidate-01/`, with the actual pre-seal
`english-candidate-01/review-routing.json` descriptor. Earlier mismatched
settings preparations remain immutable evidence; byte-identical aliases do not
replace receipt path identity. The measured-PostgreSQL dispatch stays unchanged.

## Exact locale routing and provenance

`localization-routing.mjs` promotes only the run-independent four-artifact
preparation/verification portion of the archived Chapter17 run04 mechanism.
It has two roles, `bilingual` and `target-only`, and no policy selector,
translation operation, content extractor, or semantic-schema extension.
Supply exact root-authored prompt files; the helper never authors their text.
The fixed output schema is copied from the maintained localization skill.

Prepare an immutable route before assigning fresh contexts:

```sh
node scripts/localization-routing.mjs prepare \
  --root /absolute/repository \
  --bundle audits/example/ru/bundle \
  --author-context audits/example/ru/frozen/author-context.json \
  --bilingual-context-id fresh_bilingual \
  --target-only-context-id fresh_target_only \
  --bilingual-prompt audits/example/ru/authoring/bilingual-prompt.txt \
  --target-only-prompt audits/example/ru/authoring/target-only-prompt.txt \
  --out audits/example/ru/routes
```

All file arguments except `--root` are normalized repository-relative paths.
Inputs must be regular nonsymlink files; output and every ancestor must not
traverse a symlink. `--out` must not exist. The author manifest must match
the maintained prepared bindings' author ID and exact manifest hash. Both role
bundles must match their maintained prepared hashes and candidate/inventory
identity, and retain the author's actual configured model/reasoning settings.
The helper does not impose a model or effort pin.

The output contains `routing.json`, two context manifests, two byte-identical
prompt copies, and one fixed schema copy. Each context lists only its four
authorized artifacts. `createdAt` records logical routing-context preparation,
not native thread creation. Root must still assign actual fresh, distinct
native threads and externally record that binding; no UUID or backend telemetry
is inferred. `responsePath` names the planned raw capture destination, not an
instruction for the judge to write a file. Capture native final response bytes
unchanged, including the actual single finalLF.

```sh
node scripts/localization-routing.mjs verify \
  --root /absolute/repository \
  --routing audits/example/ru/routes/routing.json \
  --author-context audits/example/ru/frozen/author-context.json \
  --bilingual-record audits/example/ru/routes/raw/bilingual.json \
  --target-only-record audits/example/ru/routes/raw/target-only.json \
  --out audits/example/ru/routing-report.json
```

Verification requires unchanged four-artifact bytes/membership, actual context
and access-boundary identity, author/reviewer separation, actual selected
configuration, raw context/prompt/bundle hashes, the fixed maintained schema,
and passing role verdicts. It rejects noncompact/noncanonical raw JSON, missing
or extra finalLF, unsorted ID-reference arrays or findings, and all drift without
repairing/replacing/reordering model-authored bytes. The maintained serializer
is used only to compare the closed raw-byte contract, never to rewrite a record.
The output report must not exist and records operational provenance only.
Omit `--out` to perform the identical verification read-only; this creates no
report and is safe to repeat. Omitting a report never skips a check or alters
verdict semantics. Closure uses this mode. The exact frozen author-file hash
is checked again against maintained bindings, not only its ID/settings.

Always run the unchanged localization `verify` command as well: this helper
does not certify record-schema completeness, surface coverage, source/target
binding, absence of blockers, publication identity, or language quality. Neither
it nor a synthetic regression fixture authorizes publication. Run focused
regressions with `node --test scripts/tests/localization-routing.test.mjs`.
The suite also prepares a tiny candidate with the real maintained localization
tool and checks its `targetOnly` binding through routing and read-only verification.
Course-specific extraction, full original-file provenance, locale-owned contract
projections and inventory snapshot generation remain immutable per-run work.

### Governed acquisition transport (offline Chapter41)

`scripts/lib/governed-acquisition-transport.mjs` exports
`transport({command, requestFactory})` for one Rust-selected source. `command`
is the private typed artifact-policy-worker request/reply channel; `requestFactory`
uses Node `https.request(url, options, callback)`'s interface and is mandatory.
Chapter41 supplies an injected offline factory, never a live downloader. There
is no network CLI, URL override, retry loop, cache-boundary selector or filesystem
write. A later separately authorized executor may supply Node HTTPS plumbing.

The module follows only Rust-returned GET permits and grants, sends identity
encoding unchanged, retains every raw relevant header occurrence, reads paused
binary streams with at most the grant (maximum65,536bytes), and sends EOF as a
separate operation. It does not decompress, resolve redirect targets, validate
HTTP policy, write progress/partials or decide budgets. Redirect bodies are
destroyed before cancellation; worker/transport refusal destroys the stream
without inventing a grant settlement or retry. Rust restoration conservatively
charges an outstanding uncertain grant. Errors are static and never echo signed
URLs, raw headers or private worker diagnostics. The returned object is Rust's
file-verification acknowledgment, not dataset approval.

The worker permit supplies its persisted `deadline_unix_seconds`. One monotonic
timer covers header wait and all body reads; its duration derives only from that
deadline and does not restart on redirects or chunks. Expiration destroys the
request/response, refuses further command dispatch and leaves grant recovery to
Rust. There is no transport-defined policy duration.

`scripts/lib/governed-acquisition-worker-client.mjs` supplies the private fixed
binary JSONL channel, with bounded messages, one outstanding command, no stderr
echo and no URL or policy-limit override. The Rust integration test constructs
the canonical manifest and owned directory, then launches
`scripts/tests/fixtures/governed-transport-round-trip.mjs` with the exact compiled
worker binary and fixed fixture input paths. Two injected streams exercise the
real worker protocol without any network request or Node-side manifest authoring.

Run `node --test scripts/tests/governed-acquisition-transport.test.mjs` in the
pinned offline image. Injected streams test chunk/EOF ordering, duplicate headers,
opaque bytes, manual redirect cancellation, short/zero/maximum grants and refusal.
These machinery fixtures do not certify course protocol semantics or authorize
corpus acquisition.

### Chapter41 offline boundary entrypoints

`node scripts/check-functional-acquisition.mjs --chapter 41-governed-corpus-acquisition`
checks the existing protected scalar census, exact module registry ownership,
required protocol/transport files and the actual offline fixture report's
closed shape and scope. It does not execute a Rust policy, reimplement a digest,
certify semantics, or replace the29Rust tests and real Rust-worker/Node roundtrip.
`bash scripts/check-functional-offline-replay.sh --chapter 41-governed-corpus-acquisition`
dispatches that same supplementary report/wiring check; actual bundle replay and
tamper refusal are exercised in the Rust test
`publication_and_replay_reverify_complete_payload`.

`node scripts/acquire-functional-llm-artifacts.mjs` always refuses live acquisition.
`bash scripts/check-functional-artifact-cache.sh` always refuses real cache
execution. Their `--help` descriptions distinguish implemented Rust offline
publication/reverification from the separate pending artifact-cache execution
boundary. Neither command writes a corpus/cache/receipt or opens a connection;
neither can declare the future boundary passed. No runtime policy/URL override,
later acquisition selector or download configuration is introduced here.
Regression: `node --test scripts/tests/check-functional-acquisition.test.mjs`.

Chapter41 language verification selects its frozen `english-candidate-02` and
nested review/adjudication routing files. `/english` publication receipt aliases
must be byte-identical, not rewritten semantic records. The original relative
candidate paths remain available under the durable owned audit root; actual
verifier `--root` can be the publication repository after staging cleanup.
Chapter40 and Chapter42+ conventions remain unchanged.

### Maintained artifact-cache boundary

`scripts/run-functional-artifact-cache.sh` owns closed Docker mount/target
orchestration. Its dedicated Rust plumbing package,
`rust/tools/functional-artifact-cache`, calls the existing Chapter41 manifest,
source-policy, inventory, atomic-publication and replay APIs. It implements no
new course algorithm. Production records cannot select synthetic fixture policy;
external target/metadata/producer hashes bind provenance before Rust admission.
Replay uses the accepted immutable acquisition `production-binding.json`, not
current unrelated Dockerfile or global-registry hashes. A new acquisition binds
its actual producer bytes; changing a verifier does not silently change source
provenance or require downloading an unchanged valid artifact again.
Future filtered/model validators are unavailable until their owning chapter
registers them. A raw-pair validator never admits a filtered bundle.

All container invocations are offline. Source transfer belongs to an explicitly
selected network-enabled Docker image build; publication, verification and
consumption then run with `--network none`. The cache is ignored, local and
content-addressed under `.build/artifact-cache/functional-v1/sha256/<digest>`.
Consumers receive only that selected digest directory read-only. No generic
URL, policy, image, arbitrary executable or broad cache-mount override is offered.

From the repository root, with Docker available, the tiny synthetic fixture can
be reproduced independently of the 2GB corpus:

```sh
docker build --target workspace -t learn-llm-workspace:local .
mkdir -p .build/runs/20261006T000000Z-cache-example-01
chmod 700 .build/runs/20261006T000000Z-cache-example-01
bash scripts/run-functional-artifact-cache.sh build-tools --run-id 20261006T000000Z-cache-example-01
bash scripts/run-functional-artifact-cache.sh self-test --run-id 20261006T000000Z-cache-example-01 --step establish-functional-artifact-cache-execution-boundary --target artifact-cache-v1
node scripts/check-functional-artifact-cache-receipt.mjs --step establish-functional-artifact-cache-execution-boundary --receipt .build/runs/20261006T000000Z-cache-example-01/artifact-cache-receipt.json
```

After image cleanup, rebuild the same existing Dockerfile workspace target using
the command above. The runner resolves the one fixed public workspace tag,
checks Rust1.93.1/Node22.12.0, and freezes the actual resulting image ID in the
tool-build receipt. Subsequent operations refuse a changed tag/receipt binding;
no private registry edit or permanent old image ID is required. `build-tools`
seeds the private run cache from that image's Cargo registry, then compiles the
maintained package offline with the tracked lockfile. No hidden old-run binary,
archive or source adapter is required. Reuse an existing verified tool receipt
when inputs match; otherwise use a fresh private run ID rather than repeating the
literal example ID. Operation evidence is
write-once and a failed fixture directory is not overwritten.

Expected fixture result: one 46-byte synthetic four-file bundle is verified,
atomically published, replayed from an exact read-only digest mount and handed
through a generated-fixture producer receipt. An attempted consumer write fails
with EROFS. Symlink, unsafe-mode, wrong-UID and unapproved-endpoint cases refuse.
This evidence proves boundary mechanics, not acquired corpus, filtering, model
quality or language-review correctness. The checker validates structure and
declared checks only; Rust and actual container receipts supply execution evidence.

Full-data setup is owned by `acquire-functional-tinystories-raw-pair`, using the
same Dockerfile's explicitly selected `functional-tinystories-corpus` target.
Its two fixed source identities, raw checksums, complete license text and credits
must survive offline verification before production cache publication. It does
not run or claim Chapter41's online resumable protocol. Never push that local
image or commit raw payloads. Deleting `.build` requires rebuilding maintained
tools and reacquiring the exact source pair, not recovering old opaque adapters.

Focused development checks:

```sh
node --test scripts/tests/run-functional-artifact-cache.test.mjs scripts/tests/check-functional-artifact-cache-receipt.test.mjs scripts/tests/run-functional-rust-overlay.test.mjs
```
