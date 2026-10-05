#!/usr/bin/env bash
set -euo pipefail
if [[ "$#" == 1 && "$1" == --help ]]; then
  printf '%s\n' 'Rust offline bundle publication/reverification is implemented and tested in Chapter41. The separate real artifact-cache execution boundary is pending; this command does not execute or certify it.'
  exit 0
fi
printf '%s\n' 'Artifact-cache execution refused: the separate execution-boundary step is pending. No corpus, cache or receipt is written.' >&2
exit 2
