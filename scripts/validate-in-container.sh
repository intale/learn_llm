#!/usr/bin/env bash
set -euo pipefail
npm --prefix site run check
npm --prefix site run test -- --run
npm --prefix site run check:content
npm --prefix site run check:parity
npm --prefix site run test:links
npm --prefix site run build
cargo fmt --all -- --check
cargo test --workspace --locked
scripts/check-rust-dependencies.sh
scripts/check-rust-demos.sh
