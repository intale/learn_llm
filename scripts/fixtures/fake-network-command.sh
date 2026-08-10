#!/usr/bin/env bash
set -euo pipefail

if [[ -n ${FAKE_SLEEP_LOG:-} && $# -eq 1 && $1 =~ ^[12]$ ]]; then
  printf '%s\n' "$1" >> "$FAKE_SLEEP_LOG"
  exit 0
fi

: "${FAKE_NETWORK_MODE:?FAKE_NETWORK_MODE is required}"
: "${FAKE_NETWORK_STATE:?FAKE_NETWORK_STATE is required}"

attempt=0
if [[ -f $FAKE_NETWORK_STATE ]]; then
  attempt=$(<"$FAKE_NETWORK_STATE")
fi
attempt=$((attempt + 1))
printf '%s\n' "$attempt" > "$FAKE_NETWORK_STATE"

if [[ -n ${FAKE_NETWORK_ARGV_LOG:-} ]]; then
  : > "${FAKE_NETWORK_ARGV_LOG}.${attempt}.nul"
  for argument in "$@"; do
    printf '%s\0' "$argument" >> "${FAKE_NETWORK_ARGV_LOG}.${attempt}.nul"
  done
fi

case "$FAKE_NETWORK_MODE" in
  transient-then-success)
    if (( attempt == 1 )); then
      printf 'discarded transient stdout\n'
      printf 'curl: (6) Could not resolve host: example.invalid\n' >&2
      exit 6
    fi
    printf 'terminal stdout\n'
    printf 'terminal stderr\n' >&2
    ;;
  transient-always)
    printf 'attempt %d terminal candidate\n' "$attempt"
    printf 'HTTP/1.1 503 Service Unavailable (attempt %d)\n' "$attempt" >&2
    exit 75
    ;;
  transient-message)
    printf '%s\n' "${FAKE_NETWORK_MESSAGE:?FAKE_NETWORK_MESSAGE is required}" >&2
    exit "${FAKE_NETWORK_EXIT:-75}"
    ;;
  success-with-failure-text)
    printf 'HTTP 503 and assertion failed are quoted documentation\n'
    printf 'successful stderr\n' >&2
    ;;
  large-success)
    for ((line = 0; line < 262144; line++)); do
      printf '0123456789abcdef0123456789abcdef\n'
    done
    ;;
  unknown)
    printf 'unclassified deterministic failure\n' >&2
    exit 47
    ;;
  denied-assertion)
    printf 'assertion failed after temporary failure in name resolution\n' >&2
    exit 21
    ;;
  denied-compile-type)
    printf 'could not compile because of a type error; HTTP 503\n' >&2
    exit 22
    ;;
  denied-browser)
    printf 'Playwright browser test failed after connection reset\n' >&2
    exit 23
    ;;
  denied-interruption)
    printf 'operation interrupted after HTTP 429\n' >&2
    exit 24
    ;;
  denied-oom)
    printf 'out of memory after connection timed out\n' >&2
    exit 25
    ;;
  denied-401)
    printf 'HTTP 401 Unauthorized; upstream also returned HTTP 503\n' >&2
    exit 26
    ;;
  denied-403)
    printf 'HTTP 403 Forbidden; connection reset\n' >&2
    exit 27
    ;;
  denied-404)
    printf 'HTTP 404 Not Found; request timed out\n' >&2
    exit 28
    ;;
  denied-license)
    printf 'license acceptance refused after HTTP 502\n' >&2
    exit 29
    ;;
  denied-policy)
    printf 'blocked by policy after a TLS timeout\n' >&2
    exit 30
    ;;
  denied-checksum)
    printf 'checksum mismatch after HTTP 504\n' >&2
    exit 31
    ;;
  denied-integrity)
    printf 'integrity verification failed after connection reset\n' >&2
    exit 32
    ;;
  denied-invalid)
    printf 'invalid option after temporary failure in name resolution\n' >&2
    exit 33
    ;;
  denied-certificate)
    printf 'certificate verification failed after request timed out\n' >&2
    exit 34
    ;;
  denied-hostname)
    printf 'TLS hostname mismatch after HTTP 500\n' >&2
    exit 35
    ;;
  denied-unknown-ca)
    printf 'unknown CA after connection reset\n' >&2
    exit 36
    ;;
  signal-wait)
    : "${FAKE_NETWORK_READY:?FAKE_NETWORK_READY is required}"
    : "${FAKE_NETWORK_PID_FILE:?FAKE_NETWORK_PID_FILE is required}"
    trap 'printf "child received INT\n" >&2; exit 130' INT
    trap 'printf "child received TERM\n" >&2; exit 143' TERM
    printf 'signal child ready\n'
    printf '%s\n' "$$" > "$FAKE_NETWORK_PID_FILE"
    : > "$FAKE_NETWORK_READY"
    while :; do :; done
    ;;
  *)
    printf 'unknown fake mode: %s\n' "$FAKE_NETWORK_MODE" >&2
    exit 64
    ;;
esac
