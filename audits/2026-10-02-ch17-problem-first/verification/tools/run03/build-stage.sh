#!/bin/sh
set -eu
phase=${1:?english, english-reviewed, final, or published}
case "$phase" in english|english-reviewed|final|published) ;; *) exit 2 ;; esac
task_root=/tmp/ch17-work
mkdir -p "$task_root"
tar -C /repo --exclude=.git --exclude=.build --exclude=.codex --exclude=.aws --exclude=site/node_modules --exclude=site/dist --exclude=site/.astro --exclude=site/test-results --exclude=target --exclude=node_modules -cf - . | tar --no-same-owner -C "$task_root" -xf -
cp -R /workspace/site/node_modules "$task_root/site/node_modules"
if [ "$phase" != published ]; then
  cp -R /evidence/publish/. "$task_root/"
fi
cd "$task_root"
mkdir -p "/evidence/$phase-build"
if [ "$phase" = english ] || [ "$phase" = english-reviewed ]; then
  # Render the English candidate with unchanged baseline Russian in a temporary
  # revision-compatible fixture. This is not a translated/publishable candidate.
  node -e 'const fs=require("fs");const p="site/src/content/chapters/ru/17-parameter-initialization.mdx";const t=fs.readFileSync(p,"utf8");if(!t.includes("\"content_revision\": 4"))throw Error("unexpected baseline RU");fs.writeFileSync(p,t.replace("\"content_revision\": 4","\"content_revision\": 5"));'
fi
if [ "$phase" = english-reviewed ]; then
  # Expectation-only extraction in the ephemeral fixture, not publication.
  node /evidence/update-test-copy.mjs "$task_root"
fi
if [ "$phase" = final ] || [ "$phase" = published ]; then
  node scripts/check-course-plan.mjs
  npm --prefix site run check:contract -- ../curriculum/chapters/17-parameter-initialization.md
  npm --prefix site run check:chapter -- --locale en --chapter 17-parameter-initialization
  npm --prefix site run check:chapter -- --locale ru --chapter 17-parameter-initialization
  npm --prefix site run check:parity -- --chapter 17-parameter-initialization
  npm --prefix site run check:content
  npm --prefix site run check
  npm --prefix site run test -- --run tests/17-parameter-initialization-diagram.test.ts tests/content-contract.test.ts
fi
npm --prefix site run build
npm --prefix site run test:links
mkdir -p "/evidence/$phase-build/dist"
cp -R site/dist/. "/evidence/$phase-build/dist/"
if [ "$phase" = final ] || [ "$phase" = published ]; then
  npm --prefix site run test:e2e -- --workers=2 --grep '@chapter:17-parameter-initialization|@formula-rendering|@cheat-sheet:.*:17-parameter-initialization'
fi
if [ "$phase" = english-reviewed ]; then
  # The unchanged baseline Russian lesson is only a rendering fixture here.
  # Its old Rust reading order is intentionally not the English author's gate.
  # Final/published phases above still require the complete bilingual coverage.
  npm --prefix site run test:e2e -- --workers=2 --grep '@chapter:17-parameter-initialization' --grep-invert 'the complete ru Rust-backed lesson'
fi
