#!/usr/bin/env bash
# Offline execution plumbing only; the owning step authorizes the Cargo argv.
set -euo pipefail

fail() { printf 'error: %s\n' "$1" >&2; exit 2; }
[[ $# -ge 6 ]] || fail 'usage: run-functional-rust-overlay.sh RUN_ID OPERATION IMAGE_SHA -- cargo SUBCOMMAND ...'
run_id=$1
operation=$2
image=$3
[[ $run_id =~ ^[0-9]{8}T[0-9]{6}Z-[a-z0-9]+(-[a-z0-9]+)*$ ]] || fail 'invalid run ID'
[[ $operation =~ ^[a-z][a-z0-9]*(-[a-z0-9]+)*$ ]] || fail 'invalid operation'
[[ $image =~ ^sha256:[0-9a-f]{64}$ ]] || fail 'exact cached image digest required'
[[ $4 == -- && $5 == cargo ]] || fail 'only a Cargo argv vector is accepted'
shift 4
case $2 in
  check|clippy|test|run|tree) [[ " $* " == *' --locked '* ]] || fail 'locked Cargo inputs required' ;;
  fmt) ;;
  *) fail 'unsupported Cargo subcommand; provisioning and arbitrary executables are excluded' ;;
esac

repository_root=$(pwd -P)
[[ -f $repository_root/Cargo.toml && -d $repository_root/rust && -d $repository_root/configs ]] || fail 'invoke from repository root'
run="$repository_root/.build/runs/$run_id"
[[ -d $run && $(realpath -e -- "$run") == "$run" ]] || fail 'existing nonsymlink run required'
[[ -d $run/publish && ! -L $run/publish ]] || fail 'regular publish stage required'
[[ -d $run/cargo-cache/registry && ! -L $run/cargo-cache ]] || fail 'provisioned run cache required'
[[ ! -L $run/validation && ! -L $run/rust-target && ! -L $run/.rust-overlay.lock ]] || fail 'unsafe output path'
mkdir -p -- "$run/validation" "$run/rust-target"
exec 9>"$run/.rust-overlay.lock"
flock -n 9 || fail 'another Rust overlay owns this run'
evidence="$run/validation/$operation"
[[ ! -e $evidence && ! -L $evidence ]] || fail 'operation evidence already exists; choose a fresh operation'
mkdir -m 0700 -- "$evidence"
printf '%s\n' "$image" > "$evidence/image.txt"
printf '%s\0' "$@" > "$evidence/argv.nul"

set +e
docker run --rm --pull never --network none \
  --tmpfs /work:rw,nosuid,nodev,size=512m,mode=0755 \
  -v "$repository_root:/repo:ro" -v "$run/publish:/staged:ro" \
  -v "$run/cargo-cache:/cache" -v "$run/rust-target:/target" \
  -v "$evidence:/evidence" \
  -e CARGO_HOME=/cache -e CARGO_TARGET_DIR=/target \
  -e "OVERLAY_OWNER_UID=$(id -u)" -e "OVERLAY_OWNER_GID=$(id -g)" \
  --entrypoint sh "$image" -c '
set -eu
test -z "$(find /staged -type l -print -quit)" || { echo "symlink in stage" >&2; exit 2; }
tar -C /repo -cf - Cargo.toml Cargo.lock rust configs | tar -C /work -xf -
cd /staged
find . -type f -print0 | tar --null -T - -cf - | tar -C /work -xf -
cd /work
find Cargo.toml Cargo.lock rust configs -type f -print0 | sort -z | xargs -0 sha256sum > /evidence/input-hashes.txt
if "$@" > /evidence/stdout.txt 2> /evidence/stderr.txt; then outcome=0; else outcome=$?; fi
printf "%s\n" "$outcome" > /evidence/cargo-exit-status.txt
chown -R "$OVERLAY_OWNER_UID:$OVERLAY_OWNER_GID" /evidence /target
cat /evidence/stdout.txt /evidence/stderr.txt
exit "$outcome"
' sh "$@" > "$evidence/launcher.stdout.txt" 2> "$evidence/launcher.stderr.txt"
outcome=$?
set -e
printf '%s\n' "$outcome" > "$evidence/launcher-exit-status.txt"
cat "$evidence/launcher.stdout.txt" "$evidence/launcher.stderr.txt"
exit "$outcome"
