#!/usr/bin/env bash
set -euo pipefail
# Closed host orchestration only; every corpus operation runs network-none.
root=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
cd "$root"
exec node --max-old-space-size=128 "$root/scripts/lib/run-functional-corpus-filtering.mjs" "$@"
