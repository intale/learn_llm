#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat >&2 <<'EOF'
usage: scripts/retry-transient-network.sh --run-id RUN_ID --operation OPERATION --max-attempts 1|2|3 -- COMMAND [ARG ...]
EOF
}

fail() {
  printf 'retry-transient-network: %s\n' "$1" >&2
  exit 2
}

root=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)

if (( $# < 8 )); then
  usage
  exit 2
fi

[[ $1 == --run-id ]] || fail 'expected --run-id as the first argument'
run_id=$2
[[ $3 == --operation ]] || fail 'expected --operation after the run ID'
operation=$4
[[ $5 == --max-attempts ]] || fail 'expected --max-attempts after the operation'
max_attempts=$6
[[ $7 == -- ]] || fail 'expected a literal -- before the command'
shift 7
(( $# > 0 )) || fail 'a command is required after --'
command_argv=("$@")

[[ ${#run_id} -le 128 ]] || fail 'run ID is too long'
[[ $run_id =~ ^[0-9]{8}T[0-9]{6}Z-[a-z0-9][a-z0-9-]*-[0-9]{2}$ ]] ||
  fail 'run ID does not match the course run-ID format'
[[ ${#operation} -ge 1 && ${#operation} -le 64 ]] ||
  fail 'operation must contain between 1 and 64 characters'
[[ $operation =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?$ ]] ||
  fail 'operation must start and end with a lowercase ASCII letter or digit and contain only letters, digits, and hyphens'
[[ $max_attempts =~ ^[123]$ ]] || fail 'max attempts must be exactly 1, 2, or 3'

runs_dir="$root/.build/runs"
run_dir="$runs_dir/$run_id"
evidence_dir="$run_dir/retry-transient-network-$operation"

[[ -d $root/.build && ! -L $root/.build ]] || fail '.build must be a real directory'
[[ -d $runs_dir && ! -L $runs_dir ]] || fail '.build/runs must be a real directory'
[[ -d $run_dir && ! -L $run_dir ]] || fail "run directory is missing or unsafe: $run_id"
[[ ! -e $evidence_dir && ! -L $evidence_dir ]] ||
  fail "evidence directory already exists and cannot be reused: ${evidence_dir#"$root/"}"

# Only the repository's deterministic local fixture may replace sleep, and only
# behind the explicit test switch. Production callers always use real 1s/2s
# delays even if an unrelated environment happens to define a sleeper variable.
if [[ ${RETRY_TRANSIENT_NETWORK_TESTING:-0} == 1 ]]; then
  sleeper=${RETRY_TRANSIENT_NETWORK_SLEEPER:-}
  [[ $sleeper == "$root/scripts/fixtures/fake-network-command.sh" ]] ||
    fail 'test mode requires the repository fake sleeper'
else
  [[ -z ${RETRY_TRANSIENT_NETWORK_SLEEPER:-} ]] ||
    fail 'the sleeper override is available only to the repository test harness'
  sleeper=sleep
fi
if [[ $sleeper == */* ]]; then
  [[ -x $sleeper && ! -d $sleeper ]] || fail 'configured sleeper is not executable'
else
  command -v "$sleeper" >/dev/null 2>&1 || fail 'configured sleeper is not available'
fi

umask 077
mkdir -m 700 -- "$evidence_dir" || fail 'could not create the private evidence directory'
evidence_created=true
child_pid=
signal_status=0
signal_name=
signal_forwarded_pid=

seal_evidence() {
  local original_status=$?
  trap - EXIT INT TERM

  if [[ -n ${child_pid:-} ]] && kill -0 "$child_pid" >/dev/null 2>&1; then
    kill -TERM "$child_pid" >/dev/null 2>&1 || true
    wait "$child_pid" >/dev/null 2>&1 || true
  fi

  if [[ ${evidence_created:-false} == true && -d $evidence_dir ]]; then
    find "$evidence_dir" -type f -exec chmod 400 -- {} + >/dev/null 2>&1 || true
    find "$evidence_dir" -depth -type d -exec chmod 500 -- {} + >/dev/null 2>&1 || true
  fi

  exit "$original_status"
}

forward_pending_signal() {
  if (( signal_status != 0 )) &&
    [[ -n ${child_pid:-} && ${signal_forwarded_pid:-} != "$child_pid" ]] &&
    kill -0 "$child_pid" >/dev/null 2>&1; then
    if kill "-${signal_name:-TERM}" "$child_pid" >/dev/null 2>&1; then
      signal_forwarded_pid=$child_pid
    fi
  fi
}

handle_signal() {
  local received_name=$1
  local received_status=$2

  if (( signal_status == 0 )); then
    signal_name=$received_name
    signal_status=$received_status
  fi
  forward_pending_signal
}

trap seal_evidence EXIT
trap 'handle_signal INT 130' INT
trap 'handle_signal TERM 143' TERM

atomic_write_lines() {
  local destination=$1
  shift
  local partial="$destination.partial"

  [[ ! -e $destination && ! -L $destination && ! -e $partial && ! -L $partial ]] ||
    fail "refusing to overwrite evidence: ${destination#"$root/"}"
  printf '%s\n' "$@" > "$partial" || fail 'could not write evidence'
  mv -- "$partial" "$destination" || fail 'could not publish evidence atomically'
}

atomic_mark_complete() {
  local destination=$1
  local partial="$destination.partial"

  [[ ! -e $destination && ! -L $destination && ! -e $partial && ! -L $partial ]] ||
    fail "refusing to overwrite completion evidence: ${destination#"$root/"}"
  : > "$partial" || fail 'could not write a completion marker'
  mv -- "$partial" "$destination" || fail 'could not publish a completion marker atomically'
}

write_argv() {
  local destination=$1
  shift
  local argument
  local separator=
  local nul_partial="$destination/argv.nul.partial"
  local text_partial="$destination/argv.txt.partial"

  [[ ! -e $destination/argv.nul && ! -L $destination/argv.nul &&
    ! -e $destination/argv.txt && ! -L $destination/argv.txt ]] ||
    fail 'refusing to overwrite argv evidence'
  : > "$nul_partial" || fail 'could not create binary argv evidence'
  : > "$text_partial" || fail 'could not create readable argv evidence'
  for argument in "$@"; do
    printf '%s\0' "$argument" >> "$nul_partial" || fail 'could not write binary argv evidence'
    printf '%s%q' "$separator" "$argument" >> "$text_partial" ||
      fail 'could not write readable argv evidence'
    separator=' '
  done
  printf '\n' >> "$text_partial" || fail 'could not finish readable argv evidence'
  mv -- "$nul_partial" "$destination/argv.nul" || fail 'could not publish binary argv evidence'
  mv -- "$text_partial" "$destination/argv.txt" || fail 'could not publish readable argv evidence'
}

started_at=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
atomic_write_lines "$evidence_dir/invocation.txt" \
  "run_id=$run_id" \
  "operation=$operation" \
  "max_attempts=$max_attempts" \
  "started_at=$started_at" \
  "evidence_dir=${evidence_dir#"$root/"}" \
  'backoff_seconds=1,2'
write_argv "$evidence_dir" "${command_argv[@]}"
mv -- "$evidence_dir/argv.nul" "$evidence_dir/invocation.argv.nul"
mv -- "$evidence_dir/argv.txt" "$evidence_dir/invocation.argv.txt"
atomic_mark_complete "$evidence_dir/invocation.complete"

matches_output() {
  local pattern=$1
  LC_ALL=C grep -aEiq -- "$pattern" "$attempt_stdout" "$attempt_stderr"
}

classify_failure() {
  local exit_code=$1
  local token_left='(^|[^[:alnum:]_])'
  local token_right='($|[^[:alnum:]_])'

  if (( exit_code >= 128 )); then
    printf '%s\n' 'denied-signal'
    return
  fi

  if (( exit_code == 126 || exit_code == 127 )); then
    printf '%s\n' 'denied-invalid-command'
    return
  fi

  # Denials are deliberately evaluated before every transient allowlist entry.
  if matches_output '(playwright|browser[^[:cntrl:]]*(assertion|error|failed|failure|test))'; then
    printf '%s\n' 'denied-browser'
    return
  fi
  if matches_output '(assertion(error|[[:space:]]+failed)|assert[[:space:]]+failed|test(s| suite)?[[:space:]]+(failed|failure)|test result:[^[:cntrl:]]*failed|panic(ked)?([[:space:]]+at|:)|could not compile|compil(e|ation|er)[^[:cntrl:]]*(error|failed|failure)|type[ -]?(error|check)[^[:cntrl:]]*(error|failed|failure)?|typeerror|typescript[^[:cntrl:]]*error|error\[[[:alnum:]_]+\]:|:[0-9]+:[0-9]+:[[:space:]]+(fatal[[:space:]]+)?error:|(^|[^[:alnum:]_])ts[0-9]{4}([^0-9]|$)|syntax[[:space:]]+error|build[[:space:]]+(failed|failure))'; then
    printf '%s\n' 'denied-assertion-build-type'
    return
  fi
  if matches_output '(interrupt(ed|ion)?|terminated by signal|signal[[:space:]]+[0-9]+|sig(int|term|kill)|killed by signal)'; then
    printf '%s\n' 'denied-signal'
    return
  fi
  if matches_output '(out of memory|oom[- ]?(kill|killed)?|cannot allocate memory|memory allocation failed)'; then
    printf '%s\n' 'denied-out-of-memory'
    return
  fi
  if matches_output '(authentication|authorization|unauthorized|forbidden|access denied|permission denied|(^|[^0-9])(401|403|404)([^0-9]|$))'; then
    printf '%s\n' 'denied-authentication-authorization'
    return
  fi
  if matches_output '(licen[cs]e[^[:cntrl:]]*(denied|refus|invalid|not accepted|prohibit)|policy[^[:cntrl:]]*(denied|refus|violation|prohibit|blocked)|blocked by policy|terms[^[:cntrl:]]*not accepted)'; then
    printf '%s\n' 'denied-license-policy'
    return
  fi
  if matches_output '(checksum|digest mismatch|hash mismatch|integrity|signature verification failed|corrupt(ed|ion))'; then
    printf '%s\n' 'denied-checksum-integrity'
    return
  fi
  if matches_output '(certificate[^[:cntrl:]]*(verify|verification|expired|revoked|invalid|mismatch|does not match|not match)|self[- ]signed certificate|host(name| name)[[:space:]]+mismatch|no alternative certificate subject name matches|unknown[[:space:]]+ca|unable to get local issuer|certificate authority|ssl certificate problem|tls certificate problem)'; then
    printf '%s\n' 'denied-tls-identity'
    return
  fi
  if matches_output '(command not found|no such file or directory|invalid[[:space:]]+(command|option|argument)|unknown[[:space:]]+(command|option|argument|flag)|unrecognized[[:space:]]+(option|argument|flag)|error:[[:space:]]*(unknown|invalid|unrecognized)[[:space:]]+(command|option|argument|flag)|option[^[:cntrl:]]*(is unknown|not recognized|requires an argument)|unexpected[[:space:]]+(argument|option|flag)|(^|[[:space:]])usage:)'; then
    printf '%s\n' 'denied-invalid-command'
    return
  fi

  if matches_output "${token_left}(temporary[[:space:]]+failure[[:space:]]+in[[:space:]]+name[[:space:]]+resolution|name[[:space:]]+or[[:space:]]+service[[:space:]]+not[[:space:]]+known|could[[:space:]]+not[[:space:]]+resolve[[:space:]]+(host|hostname)|failed[[:space:]]+to[[:space:]]+resolve[[:space:]]+(host|hostname|name|dns)|dns[[:space:]]+(query[[:space:]]+)?(temporary[[:space:]]+failure|timeout|timed[[:space:]]+out|servfail)|server[[:space:]]+misbehaving|eai_again)${token_right}"; then
    printf '%s\n' 'transient-dns'
    return
  fi
  if matches_output "${token_left}(connection[[:space:]]+(timed[[:space:]]+out|timeout|reset|refused|aborted)|could[[:space:]]+not[[:space:]]+connect|couldn't[[:space:]]+connect|failed[[:space:]]+to[[:space:]]+connect|connect[[:space:]]+(timed[[:space:]]+out|timeout)|network[[:space:]]+is[[:space:]]+unreachable|no[[:space:]]+route[[:space:]]+to[[:space:]]+host|econnreset|econnrefused|etimedout)${token_right}"; then
    printf '%s\n' 'transient-connection'
    return
  fi
  if matches_output "${token_left}((network|http|socket|client|server|remote|upstream|download)[[:space:]]+(transport|operation|request|i/o|context)[[:space:]]+(timeout|timed[[:space:]]+out|deadline[[:space:]]+exceeded)|transport[[:space:]]+(connection|network|http)[[:space:]]+(timeout|timed[[:space:]]+out|temporary[[:space:]]+failure|reset))${token_right}"; then
    printf '%s\n' 'transient-transport-timeout'
    return
  fi
  if matches_output "${token_left}curl:[[:space:]]+\\(28\\)[[:space:]]+operation[[:space:]]+timed[[:space:]]+out${token_right}"; then
    printf '%s\n' 'transient-transport-timeout'
    return
  fi
  if matches_output "${token_left}(tls|ssl)[[:space:]]+(handshake|connection)[[:space:]]+(timeout|timed[[:space:]]+out)${token_right}"; then
    printf '%s\n' 'transient-tls-timeout'
    return
  fi
  if matches_output "${token_left}http(/[0-9.]+)?[[:space:]:=-]+((response[[:space:]]+code|status([[:space:]]+code)?|error|response|code)[[:space:]:=-]+)?(408|425|429|500|502|503|504)${token_right}"; then
    printf '%s\n' 'transient-http'
    return
  fi
  if matches_output "${token_left}curl:[[:space:]]+\\(22\\)[[:space:]]+the[[:space:]]+requested[[:space:]]+url[[:space:]]+returned[[:space:]]+error:[[:space:]]*(408|425|429|500|502|503|504)${token_right}"; then
    printf '%s\n' 'transient-http'
    return
  fi

  printf '%s\n' 'unknown-nonzero'
}

run_command_child() {
  trap - INT TERM
  exec "${command_argv[@]}"
}

run_sleeper_child() {
  trap - INT TERM
  exec "$sleeper" "$backoff_seconds"
}

run_stdout_replay_child() {
  trap - INT TERM
  exec cat -- "$attempt_stdout"
}

run_stderr_replay_child() {
  trap - INT TERM
  exec cat -- "$attempt_stderr"
}

wait_for_child() {
  local observed_status

  forward_pending_signal
  set +e
  wait "$child_pid"
  observed_status=$?
  set -e

  if (( signal_status != 0 )); then
    forward_pending_signal
    if kill -0 "$child_pid" >/dev/null 2>&1; then
      wait "$child_pid" >/dev/null 2>&1 || true
    fi
    observed_status=$signal_status
  fi

  child_pid=
  child_status=$observed_status
}

write_summary() {
  local result=$1
  local result_exit_code=$2
  local completed_attempts=$3
  local result_classification=$4
  local finished_at

  finished_at=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
  atomic_write_lines "$evidence_dir/summary.txt" \
    "result=$result" \
    "exit_code=$result_exit_code" \
    "attempts=$completed_attempts" \
    "classification=$result_classification" \
    "finished_at=$finished_at"
  atomic_mark_complete "$evidence_dir/summary.complete"
  atomic_mark_complete "$evidence_dir/.complete"
}

replay_attempt() {
  replay_exit_code=0

  if (( signal_status != 0 )); then
    replay_exit_code=$signal_status
    return
  fi

  signal_forwarded_pid=
  run_stdout_replay_child &
  child_pid=$!
  wait_for_child
  replay_exit_code=$child_status
  if (( replay_exit_code != 0 || signal_status != 0 )); then
    (( signal_status == 0 )) || replay_exit_code=$signal_status
    return
  fi

  if (( signal_status != 0 )); then
    replay_exit_code=$signal_status
    return
  fi

  signal_forwarded_pid=
  run_stderr_replay_child >&2 &
  child_pid=$!
  wait_for_child
  replay_exit_code=$child_status
  (( signal_status == 0 )) || replay_exit_code=$signal_status
}

finish_terminal() {
  local result=$1
  local result_exit_code=$2
  local completed_attempts=$3
  local result_classification=$4

  replay_attempt
  if (( signal_status != 0 )); then
    result=interrupted
    result_exit_code=$signal_status
    result_classification=denied-signal
  elif (( replay_exit_code != 0 )); then
    result=replay-failed
    result_exit_code=$replay_exit_code
    result_classification=runner-output-replay-failed
  fi

  write_summary "$result" "$result_exit_code" "$completed_attempts" "$result_classification"
  exit "$result_exit_code"
}

if (( signal_status != 0 )); then
  write_summary interrupted "$signal_status" 0 denied-signal
  exit "$signal_status"
fi

attempt=1
while (( attempt <= max_attempts )); do
  if (( signal_status != 0 )); then
    write_summary interrupted "$signal_status" "$((attempt - 1))" denied-signal
    exit "$signal_status"
  fi

  printf -v attempt_name 'attempt-%02d' "$attempt"
  attempt_dir="$evidence_dir/$attempt_name"
  mkdir -m 700 -- "$attempt_dir" || fail 'could not create an attempt evidence directory'
  write_argv "$attempt_dir" "${command_argv[@]}"
  if (( signal_status != 0 )); then
    write_summary interrupted "$signal_status" "$((attempt - 1))" denied-signal
    exit "$signal_status"
  fi
  attempt_stdout="$attempt_dir/stdout.bin"
  attempt_stderr="$attempt_dir/stderr.bin"
  attempt_stdout_partial="$attempt_stdout.partial"
  attempt_stderr_partial="$attempt_stderr.partial"
  attempt_started_at=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
  attempt_started_epoch=$(date -u '+%s')

  signal_forwarded_pid=
  run_command_child > "$attempt_stdout_partial" 2> "$attempt_stderr_partial" &
  child_pid=$!
  wait_for_child
  attempt_exit_code=$child_status
  mv -- "$attempt_stdout_partial" "$attempt_stdout" || fail 'could not publish attempt stdout'
  mv -- "$attempt_stderr_partial" "$attempt_stderr" || fail 'could not publish attempt stderr'

  attempt_finished_at=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
  attempt_finished_epoch=$(date -u '+%s')
  attempt_elapsed=$((attempt_finished_epoch - attempt_started_epoch))
  atomic_write_lines "$attempt_dir/exit-code" "$attempt_exit_code"
  atomic_write_lines "$attempt_dir/timing" \
    "started_at=$attempt_started_at" \
    "finished_at=$attempt_finished_at" \
    "elapsed_seconds=$attempt_elapsed"

  if (( signal_status != 0 )); then
    classification=denied-signal
    atomic_write_lines "$attempt_dir/classification" "$classification"
    atomic_write_lines "$attempt_dir/backoff-seconds" 0
    atomic_mark_complete "$attempt_dir/.complete"
    finish_terminal interrupted "$signal_status" "$attempt" "$classification"
  fi

  if (( attempt_exit_code == 0 )); then
    classification=success
    atomic_write_lines "$attempt_dir/classification" "$classification"
    atomic_write_lines "$attempt_dir/backoff-seconds" 0
    atomic_mark_complete "$attempt_dir/.complete"
    finish_terminal succeeded 0 "$attempt" "$classification"
  fi

  classification=$(classify_failure "$attempt_exit_code")
  if (( signal_status != 0 )); then
    classification=denied-signal
    atomic_write_lines "$attempt_dir/classification" "$classification"
    atomic_write_lines "$attempt_dir/backoff-seconds" 0
    atomic_mark_complete "$attempt_dir/.complete"
    finish_terminal interrupted "$signal_status" "$attempt" "$classification"
  fi
  if [[ $classification != transient-* ]]; then
    atomic_write_lines "$attempt_dir/classification" "$classification"
    atomic_write_lines "$attempt_dir/backoff-seconds" 0
    atomic_mark_complete "$attempt_dir/.complete"
    finish_terminal failed "$attempt_exit_code" "$attempt" "$classification"
  fi

  if (( attempt == max_attempts )); then
    classification="exhausted-$classification"
    atomic_write_lines "$attempt_dir/classification" "$classification"
    atomic_write_lines "$attempt_dir/backoff-seconds" 0
    atomic_mark_complete "$attempt_dir/.complete"
    finish_terminal failed "$attempt_exit_code" "$attempt" "$classification"
  fi

  backoff_seconds=$attempt
  atomic_write_lines "$attempt_dir/classification" "$classification"
  atomic_write_lines "$attempt_dir/backoff-seconds" "$backoff_seconds"
  atomic_mark_complete "$attempt_dir/.complete"

  if (( signal_status != 0 )); then
    finish_terminal interrupted "$signal_status" "$attempt" denied-signal
  fi
  signal_forwarded_pid=
  run_sleeper_child &
  child_pid=$!
  wait_for_child
  sleeper_exit_code=$child_status
  if (( signal_status != 0 )); then
    finish_terminal interrupted "$signal_status" "$attempt" denied-signal
  fi
  if (( sleeper_exit_code != 0 )); then
    finish_terminal runner-error 2 "$attempt" runner-error-sleeper
  fi

  attempt=$((attempt + 1))
done

fail 'internal attempt-loop error'
