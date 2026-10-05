#!/usr/bin/env bash
set -euo pipefail
reframe_run=/home/int/rust/learn_llm/.build/runs/20261004T221700Z-reframe-functional-reference-core-surfaces-01
reframe_evidence=$reframe_run/publish/artifacts/functional-laptop/reframes/reference-core/20261004T221700Z-01/operations/ch39-execution-02
[[ ! -e $reframe_evidence ]] || exit 2
mkdir "$reframe_evidence"
docker run --rm --pull=never --network none --memory=2147483648 --memory-swap=2147483648 --cpus=2 --pids-limit=256 \
  --mount "type=bind,source=$reframe_run/publish/rust/demos/ch39-end-to-end-llm/src/lib.rs,target=/workspace/rust/demos/ch39-end-to-end-llm/src/lib.rs,readonly" \
  sha256:fc6a74e246e7c6959d56df2488beee12f922d15bcf571212e47e4f3936cf97b5 \
  cargo run --locked -p ch39-end-to-end-llm > "$reframe_evidence/stdout.txt" 2> "$reframe_evidence/stderr.txt"
diff -u "$reframe_run/publish/rust/demos/ch39-end-to-end-llm/expected.txt" "$reframe_evidence/stdout.txt" > "$reframe_evidence/golden.diff"
git -C /home/int/rust/learn_llm show 365f70dde3510f40e84f9700aa11a3dea79e2ff0:rust/demos/ch39-end-to-end-llm/expected.txt > "$reframe_evidence/baseline-golden.txt"
diff -u "$reframe_evidence/baseline-golden.txt" "$reframe_evidence/stdout.txt" > "$reframe_evidence/baseline.diff" || [[ $? == 1 ]]
sed -n '2,9p' "$reframe_evidence/stdout.txt" > "$reframe_evidence/current-control.txt"
sed -n '2,9p' "$reframe_evidence/baseline-golden.txt" > "$reframe_evidence/baseline-control.txt"
cmp "$reframe_evidence/current-control.txt" "$reframe_evidence/baseline-control.txt"
sha256sum "$reframe_evidence/stdout.txt" "$reframe_evidence/current-control.txt" "$reframe_evidence/golden.diff" "$reframe_evidence/baseline.diff"
