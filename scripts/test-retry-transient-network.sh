#!/usr/bin/env bash
set -euo pipefail

root=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
runner="$root/scripts/retry-transient-network.sh"
fake="$root/scripts/fixtures/fake-network-command.sh"
run_id="20991231T235959Z-retry-network-test-$$-01"
run_dir="$root/.build/runs/$run_id"
sleep_log="$run_dir/fake-sleeps"

fail() {
  printf 'retry runner test failed: %s\n' "$1" >&2
  exit 1
}

cleanup() {
  if [[ -d $run_dir && ! -L $run_dir ]]; then
    chmod -R u+rwX -- "$run_dir" >/dev/null 2>&1 || true
    rm -rf -- "$run_dir"
  fi
}
trap cleanup EXIT INT TERM

[[ ! -e $run_dir && ! -L $run_dir ]] || fail "test run already exists: $run_id"
mkdir -m 700 -- "$run_dir"
: > "$sleep_log"

assert_eq() {
  local expected=$1
  local actual=$2
  local label=$3
  [[ $actual == "$expected" ]] || fail "$label: expected <$expected>, got <$actual>"
}

assert_file() {
  [[ -f $1 && ! -L $1 ]] || fail "missing regular evidence file: $1"
}

run_fake() {
  local operation=$1
  local attempts=$2
  local mode=$3
  local expected_status=$4
  shift 4
  local state="$run_dir/$operation.state"
  local argv_log="$run_dir/$operation.argv"
  local stdout="$run_dir/$operation.stdout"
  local stderr="$run_dir/$operation.stderr"
  local observed_status

  set +e
  FAKE_NETWORK_MODE="$mode" \
  FAKE_NETWORK_STATE="$state" \
  FAKE_NETWORK_ARGV_LOG="$argv_log" \
  FAKE_SLEEP_LOG="$sleep_log" \
  RETRY_TRANSIENT_NETWORK_TESTING=1 \
  RETRY_TRANSIENT_NETWORK_SLEEPER="$fake" \
    "$runner" \
      --run-id "$run_id" \
      --operation "$operation" \
      --max-attempts "$attempts" \
      -- "$fake" "$@" > "$stdout" 2> "$stderr"
  observed_status=$?
  set -e

  assert_eq "$expected_status" "$observed_status" "$operation exit status"
}

evidence_for() {
  printf '%s/retry-transient-network-%s' "$run_dir" "$1"
}

assert_attempt_count() {
  local operation=$1
  local expected=$2
  local evidence
  local actual
  evidence=$(evidence_for "$operation")
  actual=$(find "$evidence" -mindepth 1 -maxdepth 1 -type d -name 'attempt-*' | wc -l)
  actual=${actual//[[:space:]]/}
  assert_eq "$expected" "$actual" "$operation evidence attempt count"
  assert_eq "$expected" "$(<"$run_dir/$operation.state")" "$operation command attempt count"
}

assert_summary() {
  local operation=$1
  local expected_result=$2
  local expected_status=$3
  local expected_attempts=$4
  local expected_classification=$5
  local summary
  summary="$(evidence_for "$operation")/summary.txt"
  assert_file "$summary"
  assert_file "$(evidence_for "$operation")/invocation.complete"
  assert_file "$(evidence_for "$operation")/summary.complete"
  assert_file "$(evidence_for "$operation")/.complete"
  grep -Fx -- "result=$expected_result" "$summary" >/dev/null || fail "$operation summary result"
  grep -Fx -- "exit_code=$expected_status" "$summary" >/dev/null || fail "$operation summary exit"
  grep -Fx -- "attempts=$expected_attempts" "$summary" >/dev/null || fail "$operation summary attempts"
  grep -Fx -- "classification=$expected_classification" "$summary" >/dev/null || fail "$operation summary classification"
  grep -Eq '^finished_at=[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$' "$summary" ||
    fail "$operation summary timing"
}

weird_arguments=('two words' '' '*' 'semi;colon' '$(not-executed)' $'line one\nline two')
run_fake success-after-transient 3 transient-then-success 0 "${weird_arguments[@]}"
assert_attempt_count success-after-transient 2
assert_summary success-after-transient succeeded 0 2 success
assert_eq 'terminal stdout' "$(<"$run_dir/success-after-transient.stdout")" 'terminal stdout replay'
assert_eq 'terminal stderr' "$(<"$run_dir/success-after-transient.stderr")" 'terminal stderr replay'
assert_eq '1' "$(<"$sleep_log")" 'first deterministic backoff'

success_evidence=$(evidence_for success-after-transient)
expected_command_argv="$run_dir/expected-command.argv.nul"
expected_fake_argv="$run_dir/expected-fake.argv.nul"
: > "$expected_command_argv"
printf '%s\0' "$fake" "${weird_arguments[@]}" > "$expected_command_argv"
: > "$expected_fake_argv"
printf '%s\0' "${weird_arguments[@]}" > "$expected_fake_argv"
for attempt in 01 02; do
  cmp -- "$expected_command_argv" "$success_evidence/attempt-$attempt/argv.nul" >/dev/null ||
    fail "attempt $attempt did not preserve command argv"
  cmp -- "$expected_fake_argv" "$run_dir/success-after-transient.argv.$((10#$attempt)).nul" >/dev/null ||
    fail "fake command did not receive exact argv on attempt $attempt"
  assert_file "$success_evidence/attempt-$attempt/argv.txt"
  assert_file "$success_evidence/attempt-$attempt/stdout.bin"
  assert_file "$success_evidence/attempt-$attempt/stderr.bin"
  assert_file "$success_evidence/attempt-$attempt/exit-code"
  assert_file "$success_evidence/attempt-$attempt/classification"
  assert_file "$success_evidence/attempt-$attempt/timing"
  assert_file "$success_evidence/attempt-$attempt/.complete"
  grep -Eq '^started_at=.*Z$' "$success_evidence/attempt-$attempt/timing" || fail 'missing attempt start time'
  grep -Eq '^finished_at=.*Z$' "$success_evidence/attempt-$attempt/timing" || fail 'missing attempt finish time'
  grep -Eq '^elapsed_seconds=[0-9]+$' "$success_evidence/attempt-$attempt/timing" || fail 'missing elapsed time'
done
[[ -z $(find "$success_evidence" -name '*.partial' -print -quit) ]] ||
  fail 'completed evidence retained a partial file'
cmp -- "$expected_command_argv" "$success_evidence/invocation.argv.nul" >/dev/null ||
  fail 'invocation did not preserve command argv'
assert_eq 500 "$(stat -c '%a' "$success_evidence")" 'sealed private evidence directory mode'
assert_eq 400 "$(stat -c '%a' "$success_evidence/summary.txt")" 'sealed evidence file mode'

: > "$sleep_log"
run_fake exhausted 3 transient-always 75
assert_attempt_count exhausted 3
assert_summary exhausted failed 75 3 exhausted-transient-http
assert_eq $'1\n2' "$(<"$sleep_log")" 'capped deterministic backoff'
assert_eq 'attempt 3 terminal candidate' "$(<"$run_dir/exhausted.stdout")" 'exhaustion stdout replay'
assert_eq 'HTTP/1.1 503 Service Unavailable (attempt 3)' "$(<"$run_dir/exhausted.stderr")" 'exhaustion stderr replay'
[[ $(<"$(evidence_for exhausted)/attempt-01/stdout.bin") == 'attempt 1 terminal candidate' ]] ||
  fail 'first transient stdout evidence was not retained'

: > "$sleep_log"
run_fake one-attempt-boundary 1 transient-always 75
assert_attempt_count one-attempt-boundary 1
assert_summary one-attempt-boundary failed 75 1 exhausted-transient-http
[[ ! -s $sleep_log ]] || fail 'one-attempt boundary slept'

: > "$sleep_log"
run_fake success-text 3 success-with-failure-text 0
assert_attempt_count success-text 1
assert_summary success-text succeeded 0 1 success
[[ ! -s $sleep_log ]] || fail 'successful output was classified as a failure'

: > "$sleep_log"
run_fake unknown 3 unknown 47
assert_attempt_count unknown 1
assert_summary unknown failed 47 1 unknown-nonzero
[[ ! -s $sleep_log ]] || fail 'unknown failure retried'

denial_cases=(
  'denial-assertion denied-assertion 21 denied-assertion-build-type'
  'denial-compile denied-compile-type 22 denied-assertion-build-type'
  'denial-browser denied-browser 23 denied-browser'
  'denial-interruption denied-interruption 24 denied-signal'
  'denial-oom denied-oom 25 denied-out-of-memory'
  'denial-401 denied-401 26 denied-authentication-authorization'
  'denial-403 denied-403 27 denied-authentication-authorization'
  'denial-404 denied-404 28 denied-authentication-authorization'
  'denial-license denied-license 29 denied-license-policy'
  'denial-policy denied-policy 30 denied-license-policy'
  'denial-checksum denied-checksum 31 denied-checksum-integrity'
  'denial-integrity denied-integrity 32 denied-checksum-integrity'
  'denial-invalid denied-invalid 33 denied-invalid-command'
  'denial-certificate denied-certificate 34 denied-tls-identity'
  'denial-hostname denied-hostname 35 denied-tls-identity'
  'denial-unknown-ca denied-unknown-ca 36 denied-tls-identity'
)
for denial_case in "${denial_cases[@]}"; do
  read -r operation mode expected_status expected_classification <<< "$denial_case"
  : > "$sleep_log"
  run_fake "$operation" 3 "$mode" "$expected_status"
  assert_attempt_count "$operation" 1
  assert_summary "$operation" failed "$expected_status" 1 "$expected_classification"
  [[ ! -s $sleep_log ]] || fail "$operation retried despite denial precedence"
done

adversarial_denial_messages=(
  'AssertionError: local invariant failed; HTTP 503'
  'test result: FAILED. 1 failed; HTTP 503'
  'error: unknown flag --bad; HTTP 503'
  "thread 'worker' panicked at local.rs:1; connection reset"
)
adversarial_denial_classes=(
  denied-assertion-build-type
  denied-assertion-build-type
  denied-invalid-command
  denied-assertion-build-type
)
for adversarial_index in "${!adversarial_denial_messages[@]}"; do
  operation="adversarial-denial-$adversarial_index"
  FAKE_NETWORK_MESSAGE="${adversarial_denial_messages[$adversarial_index]}" \
    run_fake "$operation" 3 transient-message 75
  assert_attempt_count "$operation" 1
  assert_summary "$operation" failed 75 1 "${adversarial_denial_classes[$adversarial_index]}"
done

allowed_messages=(
  'temporary failure in name resolution'
  'connection reset by peer'
  'network transport timed out'
  'TLS handshake timeout'
  "couldn't connect"
  'getaddrinfo EAI_AGAIN'
  'socket ECONNRESET'
  'curl: (28) Operation timed out after 1000 milliseconds'
  'HTTP 408'
  'HTTP 425'
  'HTTP 429'
  'HTTP 500'
  'HTTP 502'
  'HTTP 503'
  'HTTP 504'
  'HTTP response code: 503'
  'curl: (22) The requested URL returned error: 503'
)
allowed_index=0
for allowed_message in "${allowed_messages[@]}"; do
  allowed_index=$((allowed_index + 1))
  operation="allowed-$allowed_index"
  FAKE_NETWORK_MESSAGE="$allowed_message" run_fake "$operation" 1 transient-message 75
  assert_attempt_count "$operation" 1
  classification=$(<"$(evidence_for "$operation")/attempt-01/classification")
  [[ $classification == exhausted-transient-* ]] || fail "$operation was not positively allowlisted"
done

boundary_messages=(
  'HTTP 501 Not Implemented'
  'HTTP 5030'
  'HTTP 1503'
  'HTTP 503abc'
  'HTTP 503_local'
  'NOTHTTP 503'
  'HTTP response code: 503failure'
  'returned an error: 503'
  'MYEAI_AGAINNESS'
  'XECONNRESETY'
  'PRECONNREFUSEDPOST'
  'NOTETIMEDOUTVALUE'
  'classloader timed out locally'
  'notatlstimeout'
  'mydnssetting temporary local metadata'
  'disconnect hook timed out'
  'reconnection reset counter'
  'pretransport network timeout'
  'downloader operation timed out'
  'couldnXt connect'
  'couldn_t connect'
  'couldn t connect'
  'mycurl: (28) Operation timed out'
  'curl: (22) The requested URL returned error: 503failure'
  'curl: (22) The requested URL returned error: 501'
  'timeout budget configured'
  'DNS records updated'
  'unexpected EOF while parsing local JSON'
  'broken pipe writing local report'
  'operation timed out waiting for a local mutex'
)
boundary_index=0
for boundary_message in "${boundary_messages[@]}"; do
  boundary_index=$((boundary_index + 1))
  operation="unknown-boundary-$boundary_index"
  FAKE_NETWORK_MESSAGE="$boundary_message" run_fake "$operation" 3 transient-message 75
  assert_attempt_count "$operation" 1
  assert_summary "$operation" failed 75 1 unknown-nonzero
done

: > "$sleep_log"
missing_command="$run_dir/definitely-missing-command"
set +e
RETRY_TRANSIENT_NETWORK_TESTING=1 RETRY_TRANSIENT_NETWORK_SLEEPER="$fake" "$runner" \
  --run-id "$run_id" --operation missing-command --max-attempts 3 -- \
  "$missing_command" > "$run_dir/missing.stdout" 2> "$run_dir/missing.stderr"
missing_status=$?
set -e
assert_eq 127 "$missing_status" 'missing command status propagation'
assert_summary missing-command failed 127 1 denied-invalid-command
[[ ! -s $sleep_log ]] || fail 'missing command retried'

for signal_spec in 'INT 130' 'TERM 143'; do
  read -r signal expected_status <<< "$signal_spec"
  operation="signal-${signal,,}"
  state="$run_dir/$operation.state"
  ready="$run_dir/$operation.ready"
  child_pid_file="$run_dir/$operation.child-pid"
  stdout="$run_dir/$operation.stdout"
  stderr="$run_dir/$operation.stderr"

  # Job control keeps INT at its default disposition when this foreground-style
  # signal fixture is launched asynchronously by the test harness.
  set -m
  FAKE_NETWORK_MODE=signal-wait \
  FAKE_NETWORK_STATE="$state" \
  FAKE_NETWORK_READY="$ready" \
  FAKE_NETWORK_PID_FILE="$child_pid_file" \
  FAKE_SLEEP_LOG="$sleep_log" \
  RETRY_TRANSIENT_NETWORK_TESTING=1 \
  RETRY_TRANSIENT_NETWORK_SLEEPER="$fake" \
    "$runner" --run-id "$run_id" --operation "$operation" --max-attempts 3 -- \
      "$fake" > "$stdout" 2> "$stderr" &
  wrapper_pid=$!
  set +m

  deadline=$((SECONDS + 5))
  while [[ ! -f $ready ]] && kill -0 "$wrapper_pid" >/dev/null 2>&1 && (( SECONDS < deadline )); do :; done
  [[ -f $ready ]] || { kill -KILL "$wrapper_pid" >/dev/null 2>&1 || true; fail "$signal child did not become ready"; }
  signal_evidence=$(evidence_for "$operation")
  [[ ! -e $signal_evidence/attempt-01/.complete ]] || fail 'running attempt looked complete'
  kill "-$signal" "$wrapper_pid"

  deadline=$((SECONDS + 5))
  while kill -0 "$wrapper_pid" >/dev/null 2>&1 && (( SECONDS < deadline )); do :; done
  if kill -0 "$wrapper_pid" >/dev/null 2>&1; then
    kill -KILL "$wrapper_pid" >/dev/null 2>&1 || true
    fail "$signal did not stop the runner"
  fi
  set +e
  wait "$wrapper_pid"
  observed_status=$?
  set -e
  assert_eq "$expected_status" "$observed_status" "$signal status propagation"
  assert_attempt_count "$operation" 1
  assert_summary "$operation" interrupted "$expected_status" 1 denied-signal
  assert_eq "child received $signal" "$(<"$(evidence_for "$operation")/attempt-01/stderr.bin")" \
    "$signal exact child delivery"
  [[ ! -s $stderr ]] || fail "$signal emitted terminal output after interruption"
  child_process_pid=$(<"$child_pid_file")
  if kill -0 "$child_process_pid" >/dev/null 2>&1; then
    fail "$signal child was not reaped"
  fi
done

backpressure_operation=terminal-backpressure
backpressure_state="$run_dir/$backpressure_operation.state"
backpressure_fifo="$run_dir/$backpressure_operation.fifo"
backpressure_stderr="$run_dir/$backpressure_operation.stderr"
mkfifo -- "$backpressure_fifo"
exec 9<>"$backpressure_fifo"
FAKE_NETWORK_MODE=large-success \
FAKE_NETWORK_STATE="$backpressure_state" \
FAKE_SLEEP_LOG="$sleep_log" \
RETRY_TRANSIENT_NETWORK_TESTING=1 \
RETRY_TRANSIENT_NETWORK_SLEEPER="$fake" \
  "$runner" --run-id "$run_id" --operation "$backpressure_operation" --max-attempts 1 -- \
    "$fake" > "$backpressure_fifo" 2> "$backpressure_stderr" &
backpressure_wrapper_pid=$!
backpressure_evidence=$(evidence_for "$backpressure_operation")

deadline=$((SECONDS + 10))
while [[ ! -e $backpressure_evidence/attempt-01/.complete ]] &&
  kill -0 "$backpressure_wrapper_pid" >/dev/null 2>&1 && (( SECONDS < deadline )); do :; done
[[ -e $backpressure_evidence/attempt-01/.complete ]] || {
  kill -KILL "$backpressure_wrapper_pid" >/dev/null 2>&1 || true
  exec 9>&-
  fail 'backpressure replay did not start'
}
kill -0 "$backpressure_wrapper_pid" >/dev/null 2>&1 || fail 'backpressure replay did not remain live'
[[ ! -e $backpressure_evidence/.complete && ! -e $backpressure_evidence/summary.txt ]] ||
  fail 'terminal evidence completed before output replay'

kill -TERM "$backpressure_wrapper_pid"
deadline=$((SECONDS + 5))
while kill -0 "$backpressure_wrapper_pid" >/dev/null 2>&1 && (( SECONDS < deadline )); do :; done
if kill -0 "$backpressure_wrapper_pid" >/dev/null 2>&1; then
  kill -KILL "$backpressure_wrapper_pid" >/dev/null 2>&1 || true
  exec 9>&-
  fail 'TERM did not stop blocked terminal replay'
fi
set +e
wait "$backpressure_wrapper_pid"
backpressure_status=$?
set -e
exec 9>&-
assert_eq 143 "$backpressure_status" 'blocked terminal replay signal status'
assert_attempt_count "$backpressure_operation" 1
assert_summary "$backpressure_operation" interrupted 143 1 denied-signal
[[ $(<"$backpressure_evidence/attempt-01/classification") == success ]] ||
  fail 'backpressure fixture command itself did not succeed'
[[ -z $(find "$backpressure_evidence" -name '*.partial' -print -quit) ]] ||
  fail 'interrupted replay retained a partial metadata file'

set +e
RETRY_TRANSIENT_NETWORK_TESTING=1 RETRY_TRANSIENT_NETWORK_SLEEPER="$fake" "$runner" \
  --run-id "$run_id" --operation success-after-transient --max-attempts 1 -- "$fake" \
  > "$run_dir/reuse.stdout" 2> "$run_dir/reuse.stderr"
reuse_status=$?
set -e
assert_eq 2 "$reuse_status" 'evidence reuse refusal'

set +e
RETRY_TRANSIENT_NETWORK_SLEEPER="$fake" "$runner" \
  --run-id "$run_id" --operation inherited-sleeper --max-attempts 1 -- "$fake" \
  >/dev/null 2>&1
inherited_sleeper_status=$?
set -e
assert_eq 2 "$inherited_sleeper_status" 'ungated sleeper override status'
[[ ! -e $(evidence_for inherited-sleeper) && ! -L $(evidence_for inherited-sleeper) ]] ||
  fail 'ungated sleeper override created evidence'

for invalid_invocation in zero four missing-dash; do
  set +e
  case "$invalid_invocation" in
    zero)
      "$runner" --run-id "$run_id" --operation invalid-zero --max-attempts 0 -- "$fake" >/dev/null 2>&1
      ;;
    four)
      "$runner" --run-id "$run_id" --operation invalid-four --max-attempts 4 -- "$fake" >/dev/null 2>&1
      ;;
    missing-dash)
      "$runner" --run-id "$run_id" --operation invalid-dash --max-attempts 1 "$fake" >/dev/null 2>&1
      ;;
  esac
  invalid_status=$?
  set -e
  assert_eq 2 "$invalid_status" "$invalid_invocation runner error status"
done

operation_64=$(printf '%064d' 0)
run_fake "$operation_64" 1 success-with-failure-text 0
assert_attempt_count "$operation_64" 1

operation_65="${operation_64}0"
for invalid_operation in "$operation_65" 'contains_underscore' 'HAS-UPPERCASE' '-leading' 'trailing-'; do
  set +e
  "$runner" --run-id "$run_id" --operation "$invalid_operation" --max-attempts 1 -- "$fake" \
    >/dev/null 2>&1
  invalid_status=$?
  set -e
  assert_eq 2 "$invalid_status" 'invalid operation runner error status'
done

set +e
"$runner" --run-id not-a-course-run --operation valid --max-attempts 1 -- "$fake" >/dev/null 2>&1
invalid_status=$?
set -e
assert_eq 2 "$invalid_status" 'invalid run ID runner error status'

echo 'bounded transient-network retry runner tests passed'
