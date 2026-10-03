#!/bin/sh
set -eu
task_root=/tmp/ch17-locale-review-root
audit=audits/2026-10-02-ch17-problem-first
candidate=$audit/ru-r1
run=.build/runs/20261003T063100Z-rewrite-ch17-problem-first-content-04
mkdir -p "$task_root/$audit" "$task_root/.agents/skills" "$task_root/site/src/content/chapters/ru" "$task_root/site/src/content/cheat-sheets/ru" "$task_root/$run/final-build/dist/ru/course/17-parameter-initialization"
cp -R "/repo/$audit/." "$task_root/$audit/"
cp -R /repo/.agents/skills/localize-llm-course "$task_root/.agents/skills/"
cp /evidence/publish/site/src/content/chapters/ru/17-parameter-initialization.mdx "$task_root/site/src/content/chapters/ru/"
cp /evidence/publish/site/src/content/cheat-sheets/ru/17-parameter-initialization.json "$task_root/site/src/content/cheat-sheets/ru/"
cp /evidence/final-build/dist/ru/course/17-parameter-initialization/index.html "$task_root/$run/final-build/dist/ru/course/17-parameter-initialization/index.html"
mkdir -p "$task_root/$candidate/publication" "$task_root/$candidate/staged-verification"
cp "/repo/$candidate/frozen/contract.ru.json" "$task_root/$candidate/publication/contract.ru.json"
node /repo/.agents/skills/localize-llm-course/scripts/localization-review.mjs verify \
  --spec "$candidate/review-spec.json" --bundle "$candidate/bundle" \
  --bilingual-record "$candidate/raw/bilingual.json" \
  --target-only-record "$candidate/raw/target-only.json" \
  --root "$task_root" --report "$candidate/staged-verification/report.json"
mkdir -p "/repo/$candidate/staged-verification"
cp "$task_root/$candidate/staged-verification/report.json" "/repo/$candidate/staged-verification/report.json"
