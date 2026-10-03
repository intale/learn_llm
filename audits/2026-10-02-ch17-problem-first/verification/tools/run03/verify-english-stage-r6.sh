#!/bin/sh
set -eu
task_root=/tmp/ch17-review-root
audit=audits/2026-10-02-ch17-problem-first
candidate=$audit/english-r6
run=.build/runs/20261002T142126Z-rewrite-ch17-problem-first-content-03
mkdir -p "$task_root/$audit" "$task_root/.agents/skills" "$task_root/site/src/content/chapters/en" "$task_root/site/src/content/cheat-sheets/en" "$task_root/$run/final-build/dist/en/course/17-parameter-initialization"
cp -R "/repo/$audit/." "$task_root/$audit/"
cp -R /repo/.agents/skills/author-llm-course-english "$task_root/.agents/skills/"
cp /evidence/publish/site/src/content/chapters/en/17-parameter-initialization.mdx "$task_root/site/src/content/chapters/en/"
cp /evidence/publish/site/src/content/cheat-sheets/en/17-parameter-initialization.json "$task_root/site/src/content/cheat-sheets/en/"
cp /evidence/english-r6-build/dist/en/course/17-parameter-initialization/index.html "$task_root/$run/final-build/dist/en/course/17-parameter-initialization/index.html"
mkdir -p "$task_root/$candidate/publication" "$task_root/$candidate/staged-verification"
cp "/repo/$candidate/frozen/contract.en.md" "$task_root/$candidate/publication/contract.en.md"
cp "/repo/$candidate/frozen/isolated.en.html" "$task_root/$candidate/publication/isolated.en.html"
node --input-type=module -e 'const {runCli}=await import("/repo/.agents/skills/author-llm-course-english/scripts/english-review.mjs");process.exitCode=runCli(process.argv.slice(1),{parserRoot:"/workspace"})' verify \
  --spec "$candidate/review-spec.json" --bundle "$candidate/bundle" \
  --review-routing "$candidate/review-routing/review-routing.json" --review-seals "$candidate/review-seals" \
  --adjudication-bundle "$candidate/adjudication-bundle" \
  --adjudication-routing "$candidate/adjudication-routing/adjudication-routing.json" --adjudication-seals "$candidate/adjudication-seals" \
  --root "$task_root" --report "$candidate/staged-verification/report.json"
mkdir -p "/repo/$candidate/staged-verification"
cp "$task_root/$candidate/staged-verification/report.json" "/repo/$candidate/staged-verification/report.json"
