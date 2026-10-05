#!/usr/bin/env node
// Hash/path orchestration only. Full maintained semantic verifiers remain
// mandatory and no status field in this receipt can approve publication.
import {createHash} from 'node:crypto';
import {existsSync, lstatSync, readFileSync, mkdtempSync, mkdirSync, cpSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {canonicalJson, verifyAdjudication} from '../.agents/skills/author-llm-course-english/scripts/english-review.mjs';
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

// One explicit user-authorized command-only amendment, not a language verdict.
export const CH41_COMMAND_TESTS = Object.freeze([
  'size_digest_truncation_and_overrun_are_separate_failures',
  'provenance_changes_identity_without_changing_raw_digests',
  'actual_error_body_consumes_budget_without_retaining_payload',
]);
export const CH41_COMMAND_SETUP = 'Run the commands below from the repository root, the directory containing\n`course`, with Docker installed and running. The `./course run` wrapper prepares\nthe course workspace, then runs the selected test with network access disabled.\nEach command should report `running 1 test` and `1 passed; 0 failed`; a report of\nzero tests means the named check did not run.\n\n';
export const CH41_CONTRACT_COMMAND_RULE = 'Every run task includes its copyable repository-root command using the supported\noffline course wrapper, exact demo package, integration-test target and test\nname. Explain the Docker prerequisite and require one selected test to pass;\na successful command that selects zero tests is not reproduction evidence.\n';
export const ch41CommandBlock = name => '   ```sh\n   ./course run cargo test --offline --locked \\\n     -p ch41-governed-corpus-acquisition \\\n     --test governed_acquisition \\\n     '+name+' -- --exact\n   ```\n\n';
export function reconstructCh41CommandBaseline(bytes, kind) {
  let text=bytes.toString('utf8');
  const removeOnce=literal=>{if(text.split(literal).length!==2)throw new Error('command amendment missing/duplicate exact insertion');text=text.replace(literal,'');};
  if(kind==='catalog') {const revision='"contentRevision": 2';if(text.split(revision).length!==2)throw new Error('command amendment revision drift');return Buffer.from(text.replace(revision,'"contentRevision": 1'));}
  const revision='"content_revision": 2';if(text.split(revision).length!==2)throw new Error('command amendment revision drift');text=text.replace(revision,'"content_revision": 1');
  if(kind==='lesson'){removeOnce(CH41_COMMAND_SETUP);for(const name of CH41_COMMAND_TESTS)removeOnce(ch41CommandBlock(name));
    // The inserted blocks add one blank line before tasks 2 and 3.
    text=text.replace('\n\n2. Run <code','\n2. Run <code').replace('\n\n3. Run <code','\n3. Run <code');
  }else if(kind==='contract')removeOnce(CH41_CONTRACT_COMMAND_RULE);else throw new Error('unknown command amendment source kind');
  return Buffer.from(text);
}
export function verifyCh41CommandAmendment(root) {
  const base='audits/functional-laptop/reviews/41-governed-corpus-acquisition/english-candidate-02';
  const path='artifacts/functional-laptop/chapters/41-governed-corpus-acquisition/revision-02/command-amendment.json';
  const amendment=jsonFile(root,path,MAX_RECEIPT_BYTES,true);
  closed(amendment,['schemaVersion','chapterId','baseRevision','contentRevision','authority','baselineSpec','files','tests','built','validation'], 'command amendment');
  if(amendment.schemaVersion!==1||amendment.chapterId!=='41-governed-corpus-acquisition'||amendment.baseRevision!==1||amendment.contentRevision!==2||amendment.authority!=="User: you don't have to validate english wording if all you did is inserted run command")throw new Error('command amendment authority/identity drift');
  const bound=(descriptor)=>{closed(descriptor,['path','bytes','sha256'],'command amendment descriptor');const bytes=readRegularFile(root,descriptor.path);if(bytes.length!==descriptor.bytes||hash(bytes)!==descriptor.sha256)throw new Error('command amendment descriptor drift');return bytes;};
  if(amendment.baselineSpec.path!==base+'/spec.json')throw new Error('command amendment baseline path drift');
  const spec=JSON.parse(bound(amendment.baselineSpec));
  const sources=spec.sourceDocuments;
  closed(amendment.files,sources.map(d=>d.publicationPath),'command amendment source inventory');
  for(const d of sources){const baseline=readRegularFile(root,d.file.path);if(hash(baseline)!==d.file.sha256)throw new Error('command amendment baseline source drift');const current=bound(amendment.files[d.publicationPath]);if(amendment.files[d.publicationPath].path!==d.publicationPath)throw new Error('command amendment current path drift');const kind=d.id.slice('source.'.length),restored=kind==='sheet'?current:reconstructCh41CommandBaseline(current,kind);if(!restored.equals(baseline))throw new Error('command amendment unrelated source edit: '+d.id);}
  if(!Array.isArray(amendment.tests)||amendment.tests.length!==3)throw new Error('command amendment test inventory');
  for(const [i,e]of amendment.tests.entries()){closed(e,['name','stdout'],'command test evidence');if(e.name!==CH41_COMMAND_TESTS[i])throw new Error('command test order/name drift');const output=bound(e.stdout).toString();if(!output.includes('running 1 test\n')||!output.includes('test '+e.name+' ... ok\n')||!output.includes('1 passed; 0 failed;'))throw new Error('command amendment nonzero test proof missing');}
  if(!Array.isArray(amendment.built)||amendment.built.length!==3)throw new Error('command amendment built inventory');
  const builtPaths=['en/course/41-governed-corpus-acquisition/index.html','en/course/index.html','en/course/40-reference-core-handoff/index.html'].map(p=>'artifacts/functional-laptop/chapters/41-governed-corpus-acquisition/revision-02/english-html/'+p);
  for(const [i,d]of amendment.built.entries()){if(d.path!==builtPaths[i])throw new Error('command amendment built path/order drift');bound(d);}
  closed(amendment.validation,['source','wrapper','firefox'],'command amendment focused validation');
  if(!bound(amendment.validation.source).toString().includes('Tests  6 passed (6)')||!bound(amendment.validation.wrapper).toString().includes('# pass 3')||!bound(amendment.validation.firefox).toString().includes('6 passed'))throw new Error('command amendment focused validation proof missing');
  // Current Rust must still equal the reviewed executable evidence. No algorithm
  // changes can piggyback on a command-only exception.
  for(const e of spec.evidence.filter(e=>e.id.startsWith('evidence.demo.')||e.id.startsWith('evidence.shared.'))){const demo=e.id.startsWith('evidence.demo.'),relative=e.path.split(demo?'/evidence/demo/':'/evidence/shared/')[1];if(!relative)throw new Error('reviewed Rust locator drift');const actual=(demo?'rust/demos/ch41-governed-corpus-acquisition/':'rust/crates/llm-from-scratch/src/artifact/')+relative;if(hash(readRegularFile(root,actual))!==e.sha256)throw new Error('command amendment Rust evidence drift');}
  const temporary=mkdtempSync(resolve(tmpdir(),'ch41-reviewed-baseline-'));
  try{mkdirSync(resolve(temporary,dirname(base)),{recursive:true});cpSync(resolve(root,base),resolve(temporary,base),{recursive:true});for(const d of [...spec.sourceDocuments,...spec.builtDocuments]){const destination=resolve(temporary,d.publicationPath);mkdirSync(dirname(destination),{recursive:true});writeFileSync(destination,readRegularFile(root,d.file.path));}
    verifyAdjudication({root:temporary,parserRoot:root,specPath:resolve(temporary,base,'spec.json'),bundleDir:resolve(temporary,base,'bundle'),reviewRoutingPath:resolve(temporary,base,'review-routing/review-routing.json'),reviewSealsDir:resolve(temporary,base,'review-seals'),adjudicationBundleDir:resolve(temporary,base,'adjudication-bundle'),adjudicationRoutingPath:resolve(temporary,base,'adjudication-routing/adjudication-routing.json'),adjudicationSealsDir:resolve(temporary,base,'adjudication-seals')});
  }finally{rmSync(temporary,{recursive:true,force:true});}
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
  const commandOnly=chapter.chapterId==='41-governed-corpus-acquisition'&&receipt.contentRevision===2;
  if(commandOnly)verifyCh41CommandAmendment(root);
  for (const invocation of commandOnly?[]:languageVerifierInvocations(chapter.chapterId, chapter.activeLocales, root)) {
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
