#!/usr/bin/env node
// Hash/path orchestration only. Full maintained semantic verifiers remain
// mandatory and no status field in this receipt can approve publication.
import {createHash} from 'node:crypto';
import {existsSync, lstatSync, readFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {canonicalJson} from '../.agents/skills/author-llm-course-english/scripts/english-review.mjs';
import {FUNCTIONAL_CHAPTER_IDS, functionalChapterSignature} from '../site/src/lib/functional-course-publication.mjs';
import {parseJsonFrontmatter} from './check-site-content.mjs';
import {validateContractLesson} from './check-chapter-contract.mjs';

export const MAX_RECEIPT_BYTES = 32768;
export const MAX_INPUT_FILE_BYTES = 16 * 1024 * 1024;
export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export function closed(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort()))
    throw new Error(label + ': exact closed keys required');
}
export function readRegularFile(root, path, limit = MAX_INPUT_FILE_BYTES) {
  if (typeof path !== 'string' || !path || !/^[A-Za-z0-9_./-]+$/.test(path) ||
      path.startsWith('/') || path.split('/').some(p => !p || p === '.' || p === '..'))
    throw new Error('unsafe repository-relative path');
  const parts = path.split('/');
  let current = resolve(root);
  for (let i = 0; i < parts.length; i++) {
    current = resolve(current, parts[i]);
    const stat = lstatSync(current);
    if (stat.isSymbolicLink() || (i === parts.length - 1 ? !stat.isFile() : !stat.isDirectory()))
      throw new Error('symlink/nonregular input: ' + path);
    if (i === parts.length - 1 && stat.size > limit) throw new Error('oversized input: ' + path);
  }
  return readFileSync(current);
}
export function jsonFile(root, path, limit = MAX_INPUT_FILE_BYTES, canonical = false) {
  const bytes = readRegularFile(root, path, limit);
  const value = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
  if (canonical && !bytes.equals(Buffer.from(canonicalJson(value))))
    throw new Error('noncanonical/duplicate JSON input: ' + path);
  return value;
}

export function publicationInputPaths(chapterId, activeLocales) {
  if (!FUNCTIONAL_CHAPTER_IDS.includes(chapterId) ||
      JSON.stringify(activeLocales) !== JSON.stringify(chapterId.startsWith('40-') ? ['en','ru'] : ['en']))
    throw new Error('unknown chapter or inactive-locale inventory');
  const base = 'audits/functional-laptop/reviews/' + chapterId;
  const english = base + '/english';
  return [
    'curriculum/chapters/' + chapterId + '.md',
    ...activeLocales.flatMap(locale => [
      'site/src/content/chapters/' + locale + '/' + chapterId + '.mdx',
      'site/src/content/cheat-sheets/' + locale + '/' + chapterId + '.json',
      'site/src/i18n/functional-catalogs/' + locale + '/' + chapterId + '.json',
    ]),
    english + '/spec.json',
    english + '/review-seals/technical-pedagogical/receipt.json',
    english + '/review-seals/isolated-surface/receipt.json',
    english + '/adjudication-seals/technical-pedagogical/receipt.json',
    english + '/adjudication-seals/isolated-surface/receipt.json',
    ...(activeLocales.includes('ru') ? [
      base + '/ru/spec.json', base + '/ru/bilingual.raw.json', base + '/ru/target-only.raw.json',
    ] : []),
  ].sort();
}

export function languageVerifierInvocations(chapterId, activeLocales, root) {
  publicationInputPaths(chapterId, activeLocales);
  const base = 'audits/functional-laptop/reviews/' + chapterId;
  // Chapter40's immutable routed artifacts retain their original relative
  // candidate paths. Flat English aliases are publication inventory copies,
  // not replacement routing identities. Other chapter conventions are intact.
  const isChapter40 = chapterId === '40-reference-core-handoff';
  const isChapter41 = chapterId === '41-governed-corpus-acquisition';
  const english = base + (isChapter40 ? '/english-candidate-03' : isChapter41 ? '/english-candidate-02' : '/english');
  const reviewRouting = english + (isChapter40 || isChapter41 ? '/review-routing/review-routing.json' : '/review-routing.json');
  const adjudicationRouting = english + (isChapter40 || isChapter41 ? '/adjudication-routing/adjudication-routing.json' : '/adjudication-routing.json');
  const commands = [{executable: process.execPath, args: [
    resolve(root, '.agents/skills/author-llm-course-english/scripts/english-review.mjs'),
    'verify', '--spec', english + '/spec.json', '--bundle', english + '/bundle',
    '--review-routing', reviewRouting, '--review-seals', english + '/review-seals',
    '--adjudication-bundle', english + '/adjudication-bundle',
    '--adjudication-routing', adjudicationRouting,
    '--adjudication-seals', english + '/adjudication-seals', '--root', root,
  ]}];
  if (activeLocales.includes('ru')) commands.push({executable: process.execPath, args: [
    resolve(root, '.agents/skills/localize-llm-course/scripts/localization-review.mjs'),
    'verify', '--spec', base + '/ru/spec.json', '--bundle', base + '/ru/bundle',
    '--bilingual-record', base + '/ru/bilingual.raw.json',
    '--target-only-record', base + '/ru/target-only.raw.json', '--root', root,
  ]});
  return commands;
}

export function verifyPublicationReceipt(root, chapter, {run = spawnSync} = {}) {
  const receiptPath = 'artifacts/functional-laptop/chapters/' + chapter.chapterId + '/publication-receipt.json';
  const receipt = jsonFile(root, receiptPath, MAX_RECEIPT_BYTES, true);
  closed(receipt, ['schemaVersion','chapterId','contentRevision','files'], 'publication receipt');
  if (receipt.schemaVersion !== 1 || receipt.chapterId !== chapter.chapterId ||
      !Number.isSafeInteger(receipt.contentRevision) || receipt.contentRevision < 1)
    throw new Error('receipt identity drift');
  const paths = publicationInputPaths(chapter.chapterId, chapter.activeLocales);
  closed(receipt.files, paths, 'receipt file inventory');
  let total = 0;
  for (const path of paths) {
    const descriptor = receipt.files[path];
    closed(descriptor, ['bytes','sha256'], path);
    const bytes = readRegularFile(root, path);
    total += bytes.length;
    if (total > 64 * 1024 * 1024 || descriptor.bytes !== bytes.length ||
        !/^[0-9a-f]{64}$/.test(descriptor.sha256) || descriptor.sha256 !== hash(bytes))
      throw new Error('receipt file byte/hash drift: ' + path);
  }
  const contract = parseJsonFrontmatter(readRegularFile(root, paths.find(p => p.startsWith('curriculum/'))).toString()).data;
  if (contract.content_revision !== receipt.contentRevision || contract.chapter_id !== chapter.chapterId ||
      contract.order !== chapter.order) throw new Error('contract identity drift');
  let signature;
  const catalogs = {};
  for (const locale of chapter.activeLocales) {
    const lessonPath = 'site/src/content/chapters/' + locale + '/' + chapter.chapterId + '.mdx';
    const lesson = parseJsonFrontmatter(readRegularFile(root, lessonPath).toString());
    const data = lesson.data;
    validateContractLesson(contract, lesson, locale, lessonPath);
    const localeSignature = functionalChapterSignature(data);
    if (signature === undefined) signature = localeSignature;
    if (data.content_revision !== receipt.contentRevision ||
        localeSignature !== signature) throw new Error('contract/locale signature drift');
    const catalog = jsonFile(root, 'site/src/i18n/functional-catalogs/' + locale + '/' + chapter.chapterId + '.json');
    closed(catalog, ['schemaVersion','chapterId','locale','contentRevision','title','description','objective'], 'catalog');
    if (catalog.schemaVersion !== 1 || catalog.chapterId !== chapter.chapterId ||
        catalog.locale !== locale || catalog.contentRevision !== receipt.contentRevision ||
        ['title','description','objective'].some(k => catalog[k] !== data[k]))
      throw new Error('catalog metadata drift');
    catalogs[locale] = catalog;
    const sheet = jsonFile(root, 'site/src/content/cheat-sheets/' + locale + '/' + chapter.chapterId + '.json');
    if (sheet.chapter_id !== chapter.chapterId || sheet.locale !== locale || !Array.isArray(sheet.terms) ||
        sheet.terms.length < 5) throw new Error('sheet identity/terms drift');
  }
  for (const invocation of languageVerifierInvocations(chapter.chapterId, chapter.activeLocales, root)) {
    const result = run(invocation.executable, invocation.args, {cwd:root, encoding:'utf8', shell:false});
    if (result.error || result.status !== 0)
      throw new Error('maintained language verifier refused: ' + (result.error?.message ?? result.stderr ?? result.status));
  }
  return Object.freeze({verified:true,chapterId:chapter.chapterId,revision:receipt.contentRevision,
    signature,activeLocales:chapter.activeLocales,catalogs:Object.freeze(catalogs),sheets:[...chapter.activeLocales]});
}

export function readPublicationEvidence(root, configuration) {
  const evidence = {};
  for (const chapter of configuration.functional.chapters) {
    const path = 'artifacts/functional-laptop/chapters/' + chapter.chapterId + '/publication-receipt.json';
    if (!existsSync(resolve(root,path))) break;
    evidence[chapter.chapterId] = verifyPublicationReceipt(root,chapter);
  }
  return Object.freeze(evidence);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    const chapterId = process.argv[2];
    const chapter = {chapterId,order:Number(chapterId?.slice(0,2)),activeLocales:chapterId?.startsWith('40-')?['en','ru']:['en']};
    verifyPublicationReceipt(root, chapter);
    console.log('Functional publication receipt verified: ' + chapterId);
  } catch (error) {console.error(error.message);process.exitCode=1;}
}
