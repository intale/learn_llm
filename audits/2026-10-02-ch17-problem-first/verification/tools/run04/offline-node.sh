#!/bin/sh
set -eu
exec docker run --rm --pull=never --network none --user 1000:1000 \
  --read-only --cap-drop ALL --security-opt no-new-privileges \
  --env NODE_PATH=/workspace/site/node_modules \
  --tmpfs /tmp:rw,exec,nosuid,nodev,size=268435456 \
  --mount type=bind,source=/home/int/rust/learn_llm,target=/repo \
  --workdir /repo \
  sha256:b225a2a2671c8cf95e37397c96150c9950304f7eb96b8d4f5e7e03f4bb87fcad \
  "$@"
