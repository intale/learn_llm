import { readFileSync, readdirSync, lstatSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
const root = resolve(process.argv[2] ?? '.');
const old = '.build/runs/20261005T020709Z-reference-core-cheat-sheet-correction-02/publish';
const run = '.build/runs/20261005T045500Z-reference-core-command-reframe-04';
const read = p => readFileSync(resolve(root, p));
const sha = b => createHash('sha256').update(b).digest('hex');
const prior = JSON.parse(read(`${old}/artifacts/functional-laptop/reframes/reference-core/20261005T020709Z-02/operations/stage-preflight-01.json`));
const paths = prior.records.map(r => r.canonicalPath).sort();
if (paths.length !== 35 || new Set(paths).size !== 35) throw Error('Expected exact35 product paths');
const command = 'cargo run --quiet --locked -p ch39-end-to-end-llm';
const test = 'site/tests/e2e/ch39-end-to-end-llm.spec.ts';
const canonicalTest = read(test).toString();
const start = canonicalTest.indexOf('    test("both locales preserve literal ASCII command flags"');
const end = canonicalTest.indexOf('    test("English and Russian publish reciprocal Chapter 39 routes"', start);
if (start < 0 || end < 0) throw Error('Root test patch not found');
const insertion = canonicalTest.slice(start, end);
if (insertion.split('\n').length - 1 !== 17) throw Error('Expected exact17line insertion');
const records = paths.map(path => {
  const before = read(`${old}/${path}`), after = read(`${run}/publish/${path}`);
  let expected = before.toString(), change = 'unchanged';
  if (['site/src/content/chapters/en/39-end-to-end-llm.mdx', 'site/src/content/chapters/ru/39-end-to-end-llm.mdx'].includes(path)) {
    const literal = `<code>${command}</code>`;
    if (expected.split(literal).length !== 2) throw Error('Nonunique command');
    expected = expected.replace(literal, '`' + command + '`'); change = 'exact-command-markup';
  } else if (path === test) {
    const anchor = '    test("English and Russian publish reciprocal Chapter 39 routes"';
    if (expected.split(anchor).length !== 2) throw Error('Nonunique test anchor');
    expected = expected.replace(anchor, insertion + anchor); change = 'exact-root17line-test';
  }
  if (!after.equals(Buffer.from(expected))) throw Error('Unauthorized staged delta: ' + path);
  return { canonicalPath: path, priorPath: `${old}/${path}`, priorSha256: sha(before), path: `${run}/publish/${path}`, sha256: sha(after), bytes: after.length, change };
});
const actual = [];
function walk(path, prefix = '') {
  for (const entry of readdirSync(resolve(root, path)).sort()) {
    const child = `${path}/${entry}`, rel = prefix ? `${prefix}/${entry}` : entry;
    const stat = lstatSync(resolve(root, child));
    if (stat.isDirectory()) walk(child, rel); else if (stat.isFile()) actual.push(rel); else throw Error('Unsafe stage entry');
  }
}
walk(`${run}/publish`);
if (JSON.stringify(actual.sort()) !== JSON.stringify(paths)) throw Error('Extra/missing staged product');
const specPath = `${old}/audits/functional-laptop/reviews/reference-core-reframe/english-candidate-02/spec.json`;
const spec = JSON.parse(read(specPath));
if (sha(read(specPath)) !== '966527d11626223b7c4e53115fad8a3b45fc7e0a69807f2a02e6fcc4158a48ca') throw Error('Prior spec drift');
for (const d of spec.sourceDocuments) {
  const bytes = read(`${old}/${d.file.path}`);
  if (sha(bytes) !== d.file.sha256 || !bytes.equals(read(`${old}/${d.publicationPath}`))) throw Error('Prior exact-source binding drift');
}
const output = `${run}/preflight/product-inputs-01.json`;
mkdirSync(dirname(resolve(root, output)), { recursive: true });
writeFileSync(resolve(root, output), JSON.stringify({ schemaVersion: 1, priorSpecSha256: sha(read(specPath)), records, productFiles: 35, changedFiles: records.filter(r => r.change !== 'unchanged').length, limits: { attempts: 40, aggregateInputBytes: 83886080 }, limitations: 'Exact mechanical bytes/provenance only; no current language or publication approval.' }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ path: output, sha256: sha(read(output)), productFiles: 35, changedFiles: 3 }));
