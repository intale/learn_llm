# Rust workspace audit

Audited product revision: `2b24a50d86609445ed19aa33a4162414904dc4ca`

Toolchain: Linux x86_64 in the accepted immutable source image, Rust/Cargo
1.93.1, offline locked dependency resolution, and no external network.

## Finding

### Medium: repeated example target names produce workspace output collisions

`cargo test --workspace --locked` passes, but Cargo emits repeated warnings that
different packages all write an example target named `diagram_trace` to
`target/debug/examples/diagram_trace` (and the corresponding `.dwp` path). For
example, the warning first contrasts
`rust/demos/ch05-autoregressive-examples/examples/diagram_trace.rs` with
`rust/demos/ch06-bigram-baseline/examples/diagram_trace.rs`; the source inventory
contains 34 chapter packages with that same example filename. Cargo explicitly
warns that this may become a hard error and recommends unique names or separate
compilation.

This does not invalidate the current library tests or the chapter demos' main
output fixtures, all of which pass. It does make workspace-wide example output
ambiguous and leaves the course vulnerable to a future Cargo upgrade turning a
warning into a build failure.

## Verified passes

- `cargo fmt --all -- --check` passed in 1.2 seconds.
- `cargo clippy --workspace --all-targets --locked -- -D warnings` passed in
  7.9 seconds with no Rust lint diagnostic.
- `cargo test --workspace --locked` passed in 144.1 seconds: 500 tests across
  120 unit/integration/doc-test result groups, zero failures. This includes the
  cumulative crate's 364-test suite and its two compile-fail documentation tests.
- `scripts/check-rust-dependencies.sh` passed: every resolved package is local to
  the workspace, no supporting dependency is undeclared, and no library
  implementing an LLM concept is present.
- `scripts/check-rust-demos.sh` passed in 133.3 seconds: all 39 implementation
  chapter demos were discovered, built, run offline, and matched their exact
  checked `expected.txt` bytes. Chapter 0 is correctly excluded as the sole
  orientation without a Rust implementation.
- Coverage inventory found 40 chapter contracts, 39 implementation demo
  directories, 39 expected-output fixtures, and 41 workspace packages (the
  cumulative crate, 39 published demos, and the unpublished demo template).

## Evidence and limitations

Complete logs are preserved under
`.build/runs/20260802T095110Z-audit-rust-workspace-01/`: `cargo-fmt.log`,
`cargo-clippy.log`, `cargo-test.log`, `rust-dependencies.log`,
`rust-demos.log`, and their elapsed-time/exit-code metadata.

The audit proves the frozen tests and fixtures at this revision; it is not a
formal proof of numerical correctness for arbitrary models, shapes, datasets, or
floating-point environments. Browser rendering of Rust excerpts is covered by
the separate rendered-course audit.
