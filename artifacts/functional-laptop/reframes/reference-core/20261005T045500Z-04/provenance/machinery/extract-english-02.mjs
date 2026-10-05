import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const root = resolve(process.argv[2] ?? '.');
const old = '.build/runs/20261005T020709Z-reference-core-cheat-sheet-correction-02';
const run = '.build/runs/20261005T045500Z-reference-core-command-reframe-04';
const stage = `${run}/publish`, audit = `${stage}/audits/functional-laptop/reviews/reference-core-reframe`;
const output = `${audit}/english-selection-02`;
const oldBuild = `${old}/publish/artifacts/functional-laptop/reframes/reference-core/20261005T020709Z-02/final-build-02`;
const build = `${stage}/artifacts/functional-laptop/reframes/reference-core/20261005T045500Z-04/build-01`;
const priorPath = `${old}/publish/audits/functional-laptop/reviews/reference-core-reframe/final-en-selection-01/selected-surfaces-proposal.json`;
const read = p => readFileSync(resolve(root, p)), sha = b => createHash('sha256').update(b).digest('hex');
const desc = p => ({ path: p, sha256: sha(read(p)), bytes: read(p).length });
const { parse } = createRequire('/workspace/site/package.json')('parse5');
const { extractAccessibleText } = await import(resolve(root, '.agents/skills/author-llm-course-english/scripts/english-review.mjs'));
if (existsSync(resolve(root, output))) throw Error('Immutable proposal exists');
if (sha(read(priorPath)) !== '23cd37826cb94d13fbc4123a3ec71d4df92ed232dcc627857f180e06a25a9b3c') throw Error('Approved predecessor drift');
const prior = JSON.parse(read(priorPath));
const command = 'cargo run --quiet --locked -p ch39-end-to-end-llm';
const completeAppend = 'Preserve the literal executable Cargo command, including its ASCII option prefixes, in source and rendered code.';
const unitRequirement = 'Provide the literal Cargo command for running the Chapter 39 demo, preserving the package name and the two ASCII hyphens of each long option so the command can be copied and executed.';
function refresh(v) {
  if (Array.isArray(v)) return v.map(refresh);
  if (!v || typeof v !== 'object') return v;
  if (typeof v.path === 'string' && typeof v.sha256 === 'string') {
    let path = v.path.startsWith(oldBuild + '/') ? v.path.replace(oldBuild, build) : v.path.startsWith(old + '/publish/') && !v.path.includes('/audits/') && !v.path.includes('/artifacts/') ? v.path.replace(old + '/publish/', stage + '/') : v.path;
    // Canonical pre-repair baselines are retained exactly in the repair audit.
    if (path === 'site/src/content/chapters/en/39-end-to-end-llm.mdx') path = 'artifacts/functional-laptop/repairs/ch39-rendered-command/20261005T044231Z-03/before/' + path;
    if (path === v.path && sha(read(path)) !== v.sha256) throw Error('Predecessor descriptor drift ' + path);
    return { ...v, ...desc(path) };
  }
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, refresh(x)]));
}
const proposal = refresh(prior);
const attrs = n => Object.fromEntries((n?.attrs ?? []).map(a => [a.name, a.value]));
const doms = new Map(proposal.builtDocuments.map(d => [d.id, parse(read(d.candidate.path).toString(), { sourceCodeLocationInfo: true })]));
const at = (id, path) => path.reduce((n, i) => n?.childNodes?.[i], doms.get(id));
const origin = (id, path) => { const n = at(id, path); return { document: proposal.builtDocuments.find(d => d.id === id).candidate, nodePath: path, tag: n.tagName, attributes: attrs(n), locator: null, sourceCodeLocation: n.sourceCodeLocation ?? null }; };
for (const unit of proposal.isolated) if (unit.origin?.nodePath) {
  const node = at(unit.documentId, unit.origin.nodePath);
  if (!node || node.tagName !== unit.origin.tag) throw Error('Old isolation role/tag drift ' + unit.id);
  const value = unit.valueType === 'attribute' ? attrs(node)[unit.attribute] : extractAccessibleText(node);
  if (value !== unit.value) throw Error('Old isolation value drift ' + unit.id);
  unit.origin = { ...unit.origin, ...origin(unit.documentId, unit.origin.nodePath), locator: unit.origin.locator };
}
for (const unit of proposal.reading) {
  if (unit.origin.document) {
    const d = proposal.builtDocuments.find(d => d.candidate.path === unit.origin.document.path);
    const parent = at(d.id, unit.origin.parentNodePath), [start, end] = unit.origin.childNodeRange;
    const nodes = parent.childNodes.slice(start, end), value = nodes.map(extractAccessibleText).filter(Boolean).join(' ');
    if (value !== unit.value) throw Error('Old reading group drift ' + unit.id);
    unit.origin.sourceCodeLocation = { startOffset: nodes[0]?.sourceCodeLocation?.startOffset, endOffset: nodes.at(-1)?.sourceCodeLocation?.endOffset };
  } else for (const member of unit.origin.members ?? []) if (member.origin?.nodePath) {
    const node = at(member.documentId, member.origin.nodePath);
    if (!node || node.tagName !== member.origin.tag) throw Error('Old reading member drift');
    member.origin = { ...member.origin, ...origin(member.documentId, member.origin.nodePath) };
  }
}
for (const id of ['source.009', 'built.008']) {
  const d = [...proposal.sourceDocuments, ...proposal.builtDocuments].find(d => d.id === id);
  d.roleRequirement += ' ' + completeAppend;
}
const source = proposal.sourceDocuments.find(d => d.id === 'source.009');
const sourceText = read(source.candidate.path).toString(), index = sourceText.indexOf(command);
if (index < 0 || sourceText.indexOf(command, index + 1) >= 0 || sourceText.slice(index - 1, index) !== '`' || sourceText.slice(index + command.length, index + command.length + 1) !== '`') throw Error('Nonunique literal source code span');
proposal.isolated.push({ id: 'source-unit.044', documentId: 'source.009', canonicalPath: source.canonicalPath, kind: 'copyable-command', value: command, source: source.candidate, utf16StartOffset: index, origin: { source: source.candidate, utf16StartOffset: index, utf16EndOffset: index + command.length, utf8StartOffset: Buffer.byteLength(sourceText.slice(0, index)), utf8EndOffset: Buffer.byteLength(sourceText.slice(0, index + command.length)) }, roleRequirement: unitRequirement, requirementKey: 'ch39-cargo-command' });
const matches = [];
function walk(n, path = []) { if (n.tagName === 'code' && extractAccessibleText(n).startsWith('cargo run')) matches.push(path); (n.childNodes ?? []).forEach((c, i) => walk(c, [...path, i])); }
walk(doms.get('built.008'));
if (matches.length !== 1 || extractAccessibleText(at('built.008', matches[0])) !== command) throw Error('Nonunique actual rendered command');
proposal.isolated.push({ id: 'unit.059', documentId: 'built.008', kind: 'copyable-command', value: command, valueType: 'text', origin: origin('built.008', matches[0]), roleRequirement: unitRequirement, requirementKey: 'ch39-cargo-command' });
proposal.predecessor = desc(priorPath);
proposal.status = 'Exact proposed successor extraction; root reconciliation required before freeze';
const sourceBytes = proposal.sourceDocuments.reduce((n, d) => n + d.candidate.bytes, 0), builtBytes = proposal.builtDocuments.reduce((n, d) => n + d.candidate.bytes, 0);
proposal.measuredBytes = { sourceBytes, builtBytes, rawCompleteDocumentBytes: sourceBytes + builtBytes, note: 'Prepared input sizes remain to be measured; no tokenizer estimate.' };
mkdirSync(resolve(root, output), { recursive: true });
const json = (path, value) => writeFileSync(resolve(root, path), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const files = []; function inventory(path, prefix = '') { for (const e of readdirSync(resolve(root, path), { withFileTypes: true })) { const p = `${path}/${e.name}`, rel = prefix ? `${prefix}/${e.name}` : e.name; if (e.isDirectory()) inventory(p, rel); else { const current = read(p), before = read(`${oldBuild}/${rel}`); const expected = rel.endsWith('/39-end-to-end-llm/index.html') ? Buffer.from(before.toString().replace('cargo run —quiet —locked -p ch39-end-to-end-llm', command)) : before; if (!current.equals(expected)) throw Error('Unexpected built delta ' + rel); files.push({ ...desc(p), relativePath: rel, priorSha256: sha(before), unchanged: current.equals(before) }); } } }
inventory(build);
json(`${output}/selected-surfaces-proposal.json`, proposal);
json(`${output}/delta-vs-run02.json`, { schemaVersion: 1, predecessor: desc(priorPath), counts: { source: proposal.sourceDocuments.length, built: proposal.builtDocuments.length, reading: proposal.reading.length, isolated: proposal.isolated.length }, existingReadingAndIsolatedValuesRolesRequirementsUnchanged: true, changedCompleteRequirements: ['source.009', 'built.008'], appendedUnits: proposal.isolated.slice(-2), staticFiles: files.length, changedStaticFiles: files.filter(f => !f.unchanged), limitations: 'Exact extraction/provenance only; no semantic or publication approval.' });
json(`${output}/export-inventory.json`, { schemaVersion: 1, files });
console.log(JSON.stringify({ proposal: desc(`${output}/selected-surfaces-proposal.json`), delta: desc(`${output}/delta-vs-run02.json`), counts: { source: proposal.sourceDocuments.length, built: proposal.builtDocuments.length, reading: proposal.reading.length, isolated: proposal.isolated.length }, ...proposal.measuredBytes }));
