#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';


const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENGLISH_VERIFIER = '.agents/skills/author-llm-course-english/scripts/english-review.mjs';
const RUSSIAN_VERIFIER = '.agents/skills/localize-llm-course/scripts/localization-review.mjs';

const REVIEW_ROOTS = Object.freeze({
  'ch41-corpus-preparation': 'audits/functional-laptop/reviews/41-corpus-preparation',
  'reference-core': 'audits/functional-laptop/reviews/reference-core-reframe',
  'measured-postgresql-v1': 'audits/functional-laptop/reviews/85-persistence-scale-decision-measured-postgresql-v1',
});

export function verifierInvocations(scope, root = REPOSITORY_ROOT) {
  if (!Object.hasOwn(REVIEW_ROOTS, scope)) throw new Error('scope must be reference-core, measured-postgresql-v1 or ch41-corpus-preparation');
  if(scope==='ch41-corpus-preparation')return [{executable:process.execPath,
    args:[resolve(root,'scripts/check-functional-step-receipt.mjs'),'41-corpus-preparation']}];
  const reviewRoot = REVIEW_ROOTS[scope];
  const english = `${reviewRoot}/${scope === 'reference-core' ? 'english-candidate-01' : 'english'}`;
  const russian = `${reviewRoot}/${scope === 'reference-core' ? 'ru-candidate-01' : 'ru'}`;
  return [
    {
      executable: process.execPath,
      args: [
        resolve(root, ENGLISH_VERIFIER),
        'verify',
        '--spec', `${english}/spec.json`,
        '--bundle', `${english}/bundle`,
        '--review-routing', `${english}/${scope === 'reference-core' ? 'review-routing.json' : 'review-routing.json'}`,
        '--review-seals', `${english}/review-seals`,
        '--adjudication-bundle', `${english}/adjudication-bundle`,
        '--adjudication-routing', `${english}/adjudication-routing.json`,
        '--adjudication-seals', `${english}/adjudication-seals`,
        '--root', root,
      ],
    },
    {
      executable: process.execPath,
      args: [
        resolve(root, RUSSIAN_VERIFIER),
        'verify',
        '--spec', `${russian}/spec.json`,
        '--bundle', `${russian}/bundle`,
        '--bilingual-record', `${russian}/bilingual.raw.json`,
        '--target-only-record', `${russian}/target-only.raw.json`,
        '--root', root,
      ],
    },
  ];
}

export function dispatchVerifiers(scope, { root = REPOSITORY_ROOT, run = spawnSync } = {}) {
  for (const invocation of verifierInvocations(scope, root)) {
    const result = run(invocation.executable, invocation.args, {
      cwd: root,
      stdio: 'inherit',
      shell: false,
    });
    if (result.error) throw result.error;
    if (result.status !== 0) return result.status ?? 1;
  }
  return 0;
}

function main(argv) {
  if (argv.length !== 1 || !Object.hasOwn(REVIEW_ROOTS, argv[0])) {
    process.stderr.write('usage: node scripts/check-functional-chapter-reviews.mjs <reference-core|measured-postgresql-v1|ch41-corpus-preparation>\n');
    return 2;
  }
  return dispatchVerifiers(argv[0]);
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? '')).href) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error?.message ?? error}\n`);
    process.exitCode = 2;
  }
}
