#!/usr/bin/env bash
set -euo pipefail

root=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)

forbidden_directory=$(
  find "$root" \
    -path "$root/.git" -prune -o \
    -type d \( \
      -name target -o \
      -name node_modules -o \
      -name .astro -o \
      -name coverage -o \
      -name test-results -o \
      -name playwright-report -o \
      -name __pycache__ -o \
      -name .pytest_cache -o \
      -name .mypy_cache -o \
      -name .ruff_cache \
    \) -print -quit
)

if [[ -n $forbidden_directory ]]; then
  printf 'generated host artifact exists: %s\n' "${forbidden_directory#"$root/"}" >&2
  exit 1
fi

forbidden_python=$(
  find "$root" \
    -path "$root/.git" -prune -o \
    -type f \( -name '*.pyc' -o -name '*.pyo' \) -print -quit
)

if [[ -n $forbidden_python ]]; then
  printf 'Python bytecode exists in workspace: %s\n' "${forbidden_python#"$root/"}" >&2
  exit 1
fi

if [[ -e "$root/site/dist" && ! -f "$root/site/dist/index.html" ]]; then
  echo 'site/dist exists but is not a complete static release' >&2
  exit 1
fi

echo 'host artifact audit passed (site/dist is the intentional static-release exception)'
