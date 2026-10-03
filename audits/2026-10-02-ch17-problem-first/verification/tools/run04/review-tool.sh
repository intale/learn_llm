#!/bin/sh
set -eu
task_run=/home/int/rust/learn_llm/.build/runs/20261003T063100Z-rewrite-ch17-problem-first-content-04
exec docker run --rm --pull=never --network none --user 1000:1000 \
  --read-only --cap-drop ALL --security-opt no-new-privileges \
  --env NODE_PATH=/workspace/site/node_modules \
  --tmpfs /tmp:rw,exec,nosuid,nodev,size=536870912 \
  --mount type=bind,source=/home/int/rust/learn_llm,target=/repo \
  --mount type=bind,source="$task_run",target=/evidence \
  --workdir /repo \
  sha256:b225a2a2671c8cf95e37397c96150c9950304f7eb96b8d4f5e7e03f4bb87fcad "$@"
