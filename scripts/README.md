# Maintained development tools

Development instructions, skills, decisions and checkpoint evidence are held in
concurrentDevelopmentMCP. `AGENTS.md` identifies the server and installation
repository. This file documents executable interfaces retained with the course.
Run the commands below from the repository root in the provisioned, locked
Rust/Node environment; the site dependency installation is shared with root
scripts through `node_modules -> site/node_modules`.

## Standalone product checks

```sh
node scripts/course-publication-lock.mjs verify --root .
node scripts/check-course-boundaries.mjs --root .
npm --prefix site run check
npm --prefix site run check:content
npm --prefix site run check:parity
npm --prefix site run build
npm --prefix site run test:links
npm --prefix site run test -- --run
node --test scripts/tests/*.test.mjs
node --test scripts/reviews/english/scripts/english-review.test.mjs scripts/reviews/localization/scripts/localization-review.test.mjs
```

`configs/course-publication-v1.json` is a closed byte inventory for the two
published courses, their locale/chapter/revision identities, source trees,
contracts, Rust demos/fixtures and static-build configuration. Verification
requires canonical compact JSON with one LF, exact inventory coverage, regular
nonsymlink files, and matching lengths and SHA-256 hashes. A missing or malformed
head fails; verification never rewrites it or chooses an older publication.
The frozen first crate separately retains its accepted 41-file/40-Rust-source
inventory at `configs/first-course-core-v1.json`.

The lock contains no publication verdict or independent review record. Its
capture command is an explicit migration operation, outside ordinary builds:

```sh
node scripts/course-publication-lock.mjs capture --root . \
  --history-root /absolute/exported-checkpoint \
  --out configs/course-publication-v1.json
```

Capture verifies the exported original four-role English chain and original
permitted link amendment, then requires exact current product bytes to equal the
checkpoint under the fixed transport-path overlay in
`reviews/product-migration-overlay.mjs`. Course IDs and current revisions must
match. It creates the lock exclusively and refuses an existing destination.
This verifies preservation of the original candidate and approved path edits;
it supplies no new semantic judgment. The independent development workflow in
MCP remains the authority for subsequent course work.

## Rust execution checks

```sh
cargo fmt --all -- --check
cargo test --workspace --locked --offline
scripts/check-rust-dependencies.sh
scripts/check-rust-demos.sh
```

The dependency policy inspects all workspace features, including optional CUDA,
through Cargo metadata; this does not compile a CUDA dependency or load a driver.

`./course run` preserves CPU execution by default. To expose NVIDIA GPU 0, use
`./course run --cuda --cuda-library-dir ABSOLUTE_DIRECTORY -- COMMAND ARGUMENTS`.
The library directory is required, readable and absolute, with readable
`libcublas.so.12` and `libcublasLt.so.12` targets contained inside it. Absolute
symlinks anywhere in the directory are refused because the mount uses a different
container path. The launcher passes it as a read-only mount and retains `--network none`. It adds no toolkit
to the normal image, downloads no vendor libraries and invokes no GPU monitor.

The demo checker requires the current product lock and checks exactly 39
first-course programs and 34 diagram traces against their committed stdout.
Its ownership scan recognizes the Practical demo directories named
by the locked current contracts; every unregistered `expected.txt` owner fails.
Practical demos retain their separate course commands, including supplied stdin
for Chapter 2, and require their own nonzero golden-output execution checks.
Chapter 7's default report is its golden output; the same binary's `--trace`
view is also checked byte-for-byte against the complete static-site trace.

## Exported checkpoint verification

Historical files must be supplied explicitly in an exact materialized checkpoint.
Maintained verifiers run from this checkout; bound record paths and bytes stay
relative to the exported checkpoint. Parser dependencies come from the current
locked site installation:

```sh
node scripts/reviews/practical-publication-history.mjs verify \
  --root /absolute/exported-checkpoint --parser-root .
COURSE_HISTORY_ROOT=/absolute/exported-checkpoint \
  node --test scripts/tests/history/review-prompt-identity.test.mjs scripts/tests/history/practical-link-amendment.test.mjs scripts/tests/history/course-publication-history.test.mjs scripts/tests/history/source-production-history.test.mjs
COURSE_HISTORY_ROOT=/absolute/exported-checkpoint \
  npm --prefix site run test -- --run --config vitest.history.config.ts
```

Select a checkpoint matching the historical test's original candidate. In
particular, the pre-separation Chapter 40/41 suites require their original lesson
and demo inputs, rather than the current first-course 0–39 tree. Default tests
exercise the current course and do not assert archived guidance or ledger bytes.

`check-course-plan.mjs` takes `--history-root`, with optional `--plan` and
`--state` paths within that checkpoint. `check-functional-laptop-llm-plan.mjs`
requires its historical `--root` export explicitly. Its six frozen design
values are parsed from the exact hash-bound original checker source in that
export; retrieved JavaScript is never evaluated or imported. API users select
the same input with `COURSE_HISTORY_ROOT`. `check-functional-chapter-reviews.mjs`
accepts a fixed review scope plus `--history-root` and optional `--parser-root`.
`check-functional-step-receipt.mjs` accepts a chapter ID with the same flags.
These tools retain the original complete evidence verification; a product hash
lock does not bypass a review/adjudication check.

## Review tooling

The maintained English executable and tests are in
`reviews/english/scripts/`, with its three unchanged schemas in
`reviews/english/references/`. Localization has the corresponding executable,
tests and schema in `reviews/localization/`. Canonical English review and
adjudication prompt functions retain their exact JSON output for both roles.
The exact-response schema, canonical byte checks, routing, receipt bindings,
fresh-context separation and substantive-verdict combination are unchanged.

The English tool exposes `prepare`, `prepare-routing`, `seal-reviews`,
`prepare-adjudication`, `seal-adjudications` and `verify`; each retains its
closed named arguments. `--root` selects input/output materialization and
`--parser-root` selects the locked site dependency installation when separate.
Use the workflow and role instructions retrieved from MCP for execution.

`localization-routing.mjs` keeps the `prepare` and `verify` four-artifact routing
interfaces. Supply exact prompt files; it does not author their contents. Fixed
schema/tool inputs live under `scripts/reviews/localization`. Omit `--out` on
verification for the same checks without writing a report. The complete
localization verifier remains independently required.

`check-english-review-durability.mjs --root EXPORT --spec RELATIVE_SPEC` validates
regular paths, archived bytes and exact publication topology. Add `--routing`
for frozen routed input bindings. It does not provide a language judgment.

## Optional corpus and cache tools

The source-image recipe remains `configs/functional-corpus-assets.json`.
`configs/course-source-metadata-v1.json` binds its exact accepted identity and the
two required local license/attribution inputs in `scripts/data/tinystories/`.
Docker maps those unchanged bytes to the existing source recipe paths.
`COURSE_CORPUS=false` suppresses corpus transfer; GitHub Pages explicitly selects
that mode. Source image construction and any separately authorized full-data
work remain distinct from offline site validation.

`build-functional-tinystories-image.mjs --run-id RUN [--corpus true|false]`
retains its closed selected-source target. An existing safe UID-1000 private run
directory is required. Optional `--runtime-image REF --expected-image-id
sha256:ID` must appear together and select an already inspected local runtime.
The builder preserves pre/post runtime identity, private write-once receipts and
its selected Docker build networking boundary.

`run-functional-artifact-cache.sh` retains `build-tools`, `self-test`, `publish`,
`verify`, `replay` and the pending external-producer selector. Publication,
verification and replay of the accepted production source additionally require
`--history-root EXPORTED_CHECKPOINT`. This verifies all 14 original metadata
inputs and all 16 original producer inputs before constructing the unchanged
source policy; the two local operational inputs cannot replace that provenance.
Fixture self-tests and tool compilation need no history export. Container
operations remain `--network none` with selected inputs/read-only replay mounts,
a frozen existing runtime ID, closed target mappings and write-once outputs.
No pending preparation is silently dispatched to another implementation.

`run-functional-rust-overlay.sh RUN OPERATION sha256:IMAGE -- cargo ...` retains
a regular-file stage overlay and only the allowed locked Cargo commands. Its
existing private run/cache inputs, operation lock and write-once logs are
required; it does not provision dependencies or pull images. Optional
`deleted-files.json` selects only validated owned Rust paths inside the temporary
candidate, leaving canonical source and prior evidence intact.

## Shared byte helpers

`lib/bound-files.mjs` provides the existing UTF-8-key canonical serializer,
SHA-256, closed-key validation and bounded regular-file reads once. It rejects
traversal, unsafe characters, symlink files/ancestors, nonregular inputs and
oversized files. Canonical JSON validation rejects duplicate keys, reordered
keys, extra whitespace and invalid final termination without rewriting bytes.
`lib/chapter-frontmatter.mjs` contains the existing JSON-frontmatter reader and
its unchanged error contract.

`lib/bounded-response.mjs` retains `responseBodyLimit` and
`readBoundedResponse`: callers supply their authority, transport and aggregate
limits. The retained response-body cap bounds buffered bytes, not observed wire
traffic. Redirect/error bodies have the existing 65,536-byte cap; partial-chunk
accounting, cancellation and read-error behavior remain unchanged.
