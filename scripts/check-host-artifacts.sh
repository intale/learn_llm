#!/usr/bin/env bash
set -euo pipefail
root=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
for path in target site/node_modules site/.astro site/dist site/coverage site/test-results site/playwright-report; do
  test ! -e "$root/$path" || { echo "generated host artifact exists: $path" >&2; exit 1; }
done
if find "$root" -type f \( -name '*.pyc' -o -name '*.pyo' \) -print -quit | grep -q .; then
  echo 'Python bytecode exists in workspace' >&2; exit 1
fi
echo 'host artifact audit passed'
