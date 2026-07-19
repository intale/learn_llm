#!/usr/bin/env bash
set -euo pipefail

if [[ -n ${MOCK_DOCKER_LOG:-} ]]; then
  printf '%q ' "$@" >> "$MOCK_DOCKER_LOG"
  printf '\n' >> "$MOCK_DOCKER_LOG"
fi

case "$1" in
  build|rm) exit 0 ;;
  create) printf 'mock-container\n' ;;
  cp) cp -a "$MOCK_RELEASE_EXPORT/." "$3" ;;
  run) exit 0 ;;
  logs)
    sleep 300 &
    mock_child=$!
    if [[ -n ${MOCK_DOCKER_LOG_PID_FILE:-} ]]; then
      printf '%s\n' "$$" > "$MOCK_DOCKER_LOG_PID_FILE"
    fi
    trap 'kill "$mock_child" >/dev/null 2>&1 || true; wait "$mock_child" >/dev/null 2>&1 || true; exit 0' INT TERM
    wait "$mock_child"
    ;;
  *) printf 'unexpected mock Docker command: %s\n' "$1" >&2; exit 1 ;;
esac
