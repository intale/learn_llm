#!/usr/bin/env bash
set -euo pipefail
# Host Node orchestrates fixed Docker argv only; all payload operations use the
# admitted Rust tool in network-none containers (acquire is separately scoped).
root=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
cd "$root"
exec node "$root/scripts/lib/run-functional-artifact-cache.mjs" "$@"
