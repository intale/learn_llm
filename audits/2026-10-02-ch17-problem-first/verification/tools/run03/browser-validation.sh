#!/bin/sh
set -eu
task_phase=${1:?english-reviewed, final, or published}
task_attempt=${2:-01}
case "$task_phase" in english-reviewed|final|published) ;; *) exit 2 ;; esac
case "$task_attempt" in 01|02|03|04|05|06|07|08|09) ;; *) exit 2 ;; esac
task_run=/home/int/rust/learn_llm/.build/runs/20261002T142126Z-rewrite-ch17-problem-first-content-03
test ! -e "$task_run/evidence/$task_phase-validation-$task_attempt.log"
exec docker run --rm --pull=never --network none --user 1000:1000 \
  --read-only --cap-drop ALL --security-opt no-new-privileges --shm-size=512m \
  --env PATH=/cached-tools/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
  --env PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
  --env XDG_CACHE_HOME=/tmp/ch17-browser-cache \
  --env XDG_CONFIG_HOME=/tmp/ch17-browser-config \
  --tmpfs /home/ubuntu:rw,nosuid,nodev,size=134217728 \
  --tmpfs /tmp:rw,exec,nosuid,nodev,size=3221225472 \
  --mount type=bind,source=/home/int/rust/learn_llm,target=/repo,readonly \
  --mount type=bind,source="$task_run",target=/evidence \
  --mount type=bind,source="$task_run/browser-node_modules",target=/workspace/site/node_modules,readonly \
  --mount type=bind,source="$task_run/browser-tools",target=/cached-tools,readonly \
  --workdir /repo \
  mcr.microsoft.com/playwright:v1.61.1-noble@sha256:5b8f294aff9041b7191c34a4bab3ac270157a28774d4b0660e9743297b697e48 \
  sh -c 'sh /evidence/build-stage.sh "$1" > "/evidence/evidence/$1-validation-$2.log" 2>&1' \
  sh "$task_phase" "$task_attempt"
