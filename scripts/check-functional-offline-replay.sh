#!/usr/bin/env bash
set -euo pipefail
if [[ "$#" != 2 || "$1" != --chapter || "$2" != 41-governed-corpus-acquisition ]]; then
  printf '%s\n' 'usage: bash scripts/check-functional-offline-replay.sh --chapter 41-governed-corpus-acquisition (supplementary fixture-report check only)' >&2
  exit 2
fi
script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
exec node "$script_dir/check-functional-acquisition.mjs" --chapter "$2"
