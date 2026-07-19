#!/usr/bin/env bash
set -euo pipefail

root=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
course="$root/course"
test_paths=()
mock_logs_pid=

cleanup_test_artifacts() {
  local path
  if [[ -n ${mock_logs_pid:-} ]]; then
    kill "$mock_logs_pid" >/dev/null 2>&1 || true
  fi
  for path in "${test_paths[@]}"; do
    case "$path" in
      "$root"/.build/*) rm -rf -- "$path" ;;
    esac
  done
}

trap cleanup_test_artifacts EXIT

expect_failure() {
  if "$@" >/dev/null 2>&1; then
    printf 'expected command to fail: %q' "$1" >&2
    shift
    printf ' %q' "$@" >&2
    printf '\n' >&2
    exit 1
  fi
}

bash -n "$course" "$root/scripts/check-host-artifacts.sh" "$root/scripts/check-course-cli.sh"

help=$("$course" help)
for marker in \
  'build                         Build the deployable static-site image.' \
  'release                       Atomically export that image to site/dist.' \
  'review RUN_ID [PORT]' \
  'review RUN_ID --check' \
  'audit-host'; do
  [[ $help == *"$marker"* ]] || { printf 'missing help marker: %s\n' "$marker" >&2; exit 1; }
done

expect_failure "$course" review
expect_failure "$course" review ../escape --check
expect_failure "$course" review 20260719T160959Z-valid-step-01 --port 80
expect_failure "$course" review 20260719T160959Z-valid-step-01 --port 01024
expect_failure "$course" review 20260719T160959Z-valid-step-01 --port not-a-port
expect_failure "$course" review 20260719T160959Z-valid-step-01 --unknown
expect_failure "$course" review 20260719T160959Z-does-not-exist-01 --check
expect_failure "$course" release unexpected
expect_failure "$course" unknown

test_run_id="20260719T162400Z-cli-unlisted-${BASHPID}-01"
test_run="$root/.build/runs/$test_run_id"
test_paths+=("$test_run")
mkdir -p "$test_run/publish/site"
printf 'listed\n' > "$test_run/publish/site/listed.txt"
printf 'unlisted\n' > "$test_run/publish/site/unlisted.txt"
listed_hash=$(sha256sum -- "$test_run/publish/site/listed.txt")
listed_hash=${listed_hash%%[[:space:]]*}
printf '%s  .build/runs/%s/publish/site/listed.txt\n' "$listed_hash" "$test_run_id" > "$test_run/publish.sha256"
expect_failure "$course" review "$test_run_id" --check

test_run_id="20260719T162401Z-cli-escape-${BASHPID}-01"
test_run="$root/.build/runs/$test_run_id"
test_paths+=("$test_run")
mkdir -p "$test_run/publish/site"
printf 'staged\n' > "$test_run/publish/site/staged.txt"
outside_hash=$(sha256sum -- "$root/README.md")
outside_hash=${outside_hash%%[[:space:]]*}
printf '%s  README.md\n' "$outside_hash" > "$test_run/publish.sha256"
expect_failure "$course" review "$test_run_id" --check

test_run_id="20260719T162402Z-cli-symlink-${BASHPID}-01"
test_run="$root/.build/runs/$test_run_id"
test_paths+=("$test_run")
mkdir -p "$test_run/publish/site"
ln -s "$root/README.md" "$test_run/publish/site/linked-readme"
expect_failure "$course" review "$test_run_id" --check

test_run_id="20260719T162403Z-cli-manifest-link-${BASHPID}-01"
test_run="$root/.build/runs/$test_run_id"
test_paths+=("$test_run")
mkdir -p "$test_run/publish/site"
printf 'staged\n' > "$test_run/publish/site/staged.txt"
ln -s "$root/README.md" "$test_run/publish.sha256"
expect_failure "$course" review "$test_run_id" --check

release_fixture="$root/.build/course-cli-release-${BASHPID}"
test_paths+=("$release_fixture")
mkdir -p \
  "$release_fixture/bin" \
  "$release_fixture/export/en/course" \
  "$release_fixture/export/ru/course" \
  "$release_fixture/site/dist"
cp "$course" "$release_fixture/course"
cp "$root/scripts/fixtures/mock-release-docker.sh" "$release_fixture/bin/docker"
printf 'new root\n' > "$release_fixture/export/index.html"
printf 'new English index\n' > "$release_fixture/export/en/course/index.html"
printf 'new Russian index\n' > "$release_fixture/export/ru/course/index.html"
printf 'stale\n' > "$release_fixture/site/dist/stale.txt"
chmod +x "$release_fixture/bin/docker"
PATH="$release_fixture/bin:$PATH" MOCK_RELEASE_EXPORT="$release_fixture/export" \
  "$release_fixture/course" release >/dev/null
[[ -f "$release_fixture/site/dist/index.html" ]]
[[ ! -e "$release_fixture/site/dist/stale.txt" ]]
[[ ! -e "$release_fixture/site/.release.lock" ]]
[[ -z $(find "$release_fixture/site" -maxdepth 1 -name '.release-*' -print -quit) ]]

mkdir "$release_fixture/site/.release.lock"
expect_failure env PATH="$release_fixture/bin:$PATH" \
  MOCK_RELEASE_EXPORT="$release_fixture/export" "$release_fixture/course" release
rmdir "$release_fixture/site/.release.lock"

grep -F -- "trap 'exit 130' INT" "$course" >/dev/null
grep -F -- "trap 'exit 143' TERM" "$course" >/dev/null
grep -F -- 'mv --exchange --no-copy -T' "$course" >/dev/null

review_run_id="20260719T162404Z-cli-signal-${BASHPID}-01"
review_run="$release_fixture/.build/runs/$review_run_id"
mkdir -p "$review_run/publish/site/src/content/chapters/en"
printf '%s\n' '# signal fixture' > "$review_run/publish/site/src/content/chapters/en/99-signal-fixture.mdx"
mock_docker_log="$release_fixture/docker.log"
mock_docker_pid_file="$release_fixture/docker-logs.pid"
PATH="$release_fixture/bin:$PATH" \
MOCK_RELEASE_EXPORT="$release_fixture/export" \
MOCK_DOCKER_LOG="$mock_docker_log" \
MOCK_DOCKER_LOG_PID_FILE="$mock_docker_pid_file" \
  "$release_fixture/course" review "$review_run_id" --port 43199 >/dev/null 2>&1 &
review_wrapper_pid=$!

review_started=false
for _ in {1..50}; do
  if [[ -f $mock_docker_log ]] && grep -F -- 'logs --follow' "$mock_docker_log" >/dev/null; then
    review_started=true
    break
  fi
  sleep 0.1
done
$review_started || { kill -KILL "$review_wrapper_pid" >/dev/null 2>&1 || true; echo 'mock review did not start' >&2; exit 1; }

kill -TERM "$review_wrapper_pid"
review_stopped=false
for _ in {1..50}; do
  if ! kill -0 "$review_wrapper_pid" >/dev/null 2>&1; then
    review_stopped=true
    break
  fi
  sleep 0.1
done
if ! $review_stopped; then
  kill -KILL "$review_wrapper_pid" >/dev/null 2>&1 || true
  echo 'review wrapper ignored direct SIGTERM' >&2
  exit 1
fi

set +e
wait "$review_wrapper_pid"
review_status=$?
set -e
[[ $review_status -eq 143 ]] || { echo "review SIGTERM status was $review_status, expected 143" >&2; exit 1; }
grep -F -- 'rm -f learn-llm-review-' "$mock_docker_log" >/dev/null
if [[ -f $mock_docker_pid_file ]]; then
  mock_logs_pid=$(<"$mock_docker_pid_file")
  if kill -0 "$mock_logs_pid" >/dev/null 2>&1; then
    echo 'mock Docker log follower survived review cleanup' >&2
    exit 1
  fi
  mock_logs_pid=
fi

for marker in \
  './course review 20260719T135559Z-rewrite-ch06-bigram-baseline-01' \
  './course release' \
  'site/dist' \
  'Ctrl+C'; do
  grep -F -- "$marker" "$root/README.md" >/dev/null || {
    printf 'README is missing command marker: %s\n' "$marker" >&2
    exit 1
  }
done

echo 'course CLI contract passed'
