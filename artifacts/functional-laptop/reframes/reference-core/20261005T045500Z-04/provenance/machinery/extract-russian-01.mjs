import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const root = resolve(process.argv[2] ?? '.');
const old = '.build/runs/20261005T020709Z-reference-core-cheat-sheet-correction-02';
const run = '.build/runs/20261005T045500Z-reference-core-command-reframe-04';
const stage = `${run}/publish`, audit = `${stage}/audits/functional-laptop/reviews/reference-core-reframe`;
const oldAudit = `${old}/publish/audits/functional-laptop/reviews/reference-core-reframe`;
const oldOut = `${oldAudit}/final-ru-proposal-04`, out = `${audit}/russian-selection-01`;
const oldBuild = `${old}/publish/artifacts/functional-laptop/reframes/reference-core/20261005T020709Z-02/final-build-02`;
const build = `${stage}/artifacts/functional-laptop/reframes/reference-core/20261005T045500Z-04/build-01`;
const read = p => readFileSync(resolve(root, p)), sha = b => createHash('sha256').update(b).digest('hex');
const desc = p => ({ path: p, sha256: sha(read(p)), bytes: read(p).length });
const write = (p, b) => { mkdirSync(dirname(resolve(root, p)), { recursive: true }); writeFileSync(resolve(root, p), b, { flag: 'wx' }); };
const json = (p, v) => write(p, JSON.stringify(v, null, 2) + '\n');
if (existsSync(resolve(root, out))) throw Error('Immutable Russian proposal exists');
const priorPath = `${oldOut}/inventory-proposal.json`;
if (sha(read(priorPath)) !== 'ead06379506cdf1ccebb0660f31eb1ff5e2fac75c4cdad24c8c13493901b1976') throw Error('Approved Russian predecessor drift');
const { parse } = createRequire('/workspace/site/package.json')('parse5');
const { extractAccessibleText } = await import(resolve(root, '.agents/skills/author-llm-course-english/scripts/english-review.mjs'));
const englishPath = `${audit}/english-selection-02/selected-surfaces-proposal.json`, english = JSON.parse(read(englishPath));
function refresh(v) {
  if (Array.isArray(v)) return v.map(refresh);
  if (!v || typeof v !== 'object') return v;
  if (typeof v.path === 'string' && typeof v.sha256 === 'string') {
    let path = v.path.startsWith(oldBuild + '/') ? v.path.replace(oldBuild, build) : v.path.startsWith(oldOut + '/projections/') ? v.path.replace(oldOut, out) : v.path.startsWith(old + '/publish/') && !v.path.includes('/audits/') && !v.path.includes('/artifacts/') ? v.path.replace(old + '/publish/', stage + '/') : v.path;
    if (v.path.startsWith(oldOut + '/projections/')) { const bytes = read(v.path); if (sha(bytes) !== v.sha256) throw Error('Projection drift'); if (!existsSync(resolve(root, path))) write(path, bytes); }
    if (path === v.path && sha(read(path)) !== v.sha256) throw Error('Predecessor descriptor drift ' + path);
    return { ...v, ...desc(path) };
  }
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, refresh(x)]));
}
const proposal = refresh(JSON.parse(read(priorPath)));
const doms = new Map(), attrs = n => Object.fromEntries((n?.attrs ?? []).map(a => [a.name, a.value]));
function at(origin) { const path = origin.document.path; if (!doms.has(path)) doms.set(path, parse(read(path).toString(), { sourceCodeLocationInfo: true })); return origin.nodePath.reduce((n, i) => n?.childNodes?.[i], doms.get(path)); }
function updateOrigin(o) {
  if (Array.isArray(o)) return o.map(updateOrigin);
  if (!o || typeof o !== 'object') return o;
  if (o.document && o.nodePath) { const node = at(o); if (!node || node.tagName !== o.tag) throw Error('Locale origin role/tag drift'); return { ...o, attributes: attrs(node), sourceCodeLocation: node.sourceCodeLocation ?? null }; }
  if (o.document && o.parentNodePath) { const node = at({ ...o, nodePath: o.parentNodePath }), ns = node.childNodes.slice(...o.childNodeRange); return { ...o, sourceCodeLocation: { startOffset: ns[0]?.sourceCodeLocation?.startOffset, endOffset: ns.at(-1)?.sourceCodeLocation?.endOffset } }; }
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, updateOrigin(v)]));
}
function extracted(o, attribute) {
  if (Array.isArray(o)) return o.map(x => extracted(x)).join(' ');
  if (o.document && o.nodePath) return attribute ? attrs(at(o))[attribute] : extractAccessibleText(at(o));
  if (o.document && o.parentNodePath) return at({ ...o, nodePath: o.parentNodePath }).childNodes.slice(...o.childNodeRange).map(extractAccessibleText).filter(Boolean).join(' ');
  if (o.file && o.jsonPath) { const path = o.file.path, bytes = read(path).toString(), metadata = path.endsWith('.json') ? JSON.parse(bytes) : JSON.parse(bytes.match(/^---\n([^]*?)\n---\n/)[1]); return o.jsonPath.reduce((v, k) => v?.[k], metadata); }
  throw Error('Unknown preserved extraction origin');
}
for (const pair of proposal.pairs) {
  const en = english.isolated.find(u => u.id === pair.id);
  const attribute = en?.valueType === 'attribute' ? en.attribute : undefined;
  pair.provenance = updateOrigin(pair.provenance);
  if (extracted(pair.provenance.source, attribute) !== pair.sourceValue || extracted(pair.provenance.target, attribute) !== pair.targetValue) throw Error('Preserved pair value drift ' + pair.id);
}
for (const d of proposal.completeDocuments) if (d.publicationPath?.startsWith('artifacts/functional-laptop/reframes/reference-core/20261005T020709Z-02/final-build-02/')) d.publicationPath = d.publicationPath.replace('artifacts/functional-laptop/reframes/reference-core/20261005T020709Z-02/final-build-02/', 'artifacts/functional-laptop/reframes/reference-core/20261005T045500Z-04/build-01/');
const append = 'Preserve the literal executable Cargo command, including its ASCII option prefixes, in source and rendered code.';
for (const id of ['doc.lesson.39', 'doc.rendered.008']) { const d = proposal.completeDocuments.find(d => d.id === id), role = proposal.neutralRoleMap.find(d => d.id === id); d.roleRequirement += ' ' + append; role.roleRequirement = d.roleRequirement; }
const command = 'cargo run --quiet --locked -p ch39-end-to-end-llm';
const requirement = 'Provide the literal Cargo command for running the Chapter 39 demo, preserving the package name and the two ASCII hyphens of each long option so the command can be copied and executed.';
function sourceOrigin(locale) { const path = `${stage}/site/src/content/chapters/${locale}/39-end-to-end-llm.mdx`, text = read(path).toString(), start = text.indexOf(command); if (start < 0 || text.indexOf(command, start + 1) >= 0) throw Error('Nonunique source command'); return { file: desc(path), utf16StartOffset: start, utf16EndOffset: start + command.length, utf8StartOffset: Buffer.byteLength(text.slice(0, start)), utf8EndOffset: Buffer.byteLength(text.slice(0, start + command.length)) }; }
function codeOrigin(locale) { const path = `${build}/${locale}/course/39-end-to-end-llm/index.html`, dom = parse(read(path).toString(), { sourceCodeLocationInfo: true }), matches = []; function walk(node, nodePath = []) { if (node.tagName === 'code' && extractAccessibleText(node).startsWith('cargo run')) matches.push({ node, nodePath }); (node.childNodes ?? []).forEach((n, i) => walk(n, [...nodePath, i])); } walk(dom); if (matches.length !== 1 || extractAccessibleText(matches[0].node) !== command) throw Error('Nonunique rendered command'); const { node, nodePath } = matches[0]; return { document: desc(path), nodePath, tag: 'code', attributes: attrs(node), sourceCodeLocation: node.sourceCodeLocation }; }
for (const [id, fn] of [['source-unit.044', sourceOrigin], ['unit.059', codeOrigin]]) { proposal.pairs.push({ id, kind: 'copyable-command', requirementKey: 'ch39-cargo-command', roleRequirement: requirement, sourceValue: command, targetValue: command, localization: 'copy', provenance: { source: fn('en'), target: fn('ru') } }); proposal.neutralRoleMap.push({ id, kind: 'copyable-command', order: proposal.neutralRoleMap.length + 1, requirementKey: 'ch39-cargo-command', roleRequirement: requirement }); }
proposal.englishSelection = desc(englishPath);
proposal.status = 'Exact successor locale correspondence proposal; root reconciliation required before freeze';
proposal.measuredBytes = { completeSourceBytes: proposal.completeDocuments.reduce((n, d) => n + d.source.bytes, 0), completeTargetBytes: proposal.completeDocuments.reduce((n, d) => n + d.target.bytes, 0), pairedUnitSourceBytes: proposal.pairs.reduce((n, u) => n + Buffer.byteLength(u.sourceValue), 0), pairedUnitTargetBytes: proposal.pairs.reduce((n, u) => n + Buffer.byteLength(u.targetValue), 0) };
json(`${out}/inventory-proposal.json`, proposal);
json(`${out}/neutral-role-map-draft.json`, proposal.neutralRoleMap);
json(`${out}/delta-vs-run02.json`, { schemaVersion: 1, predecessor: desc(priorPath), prior82IdsKindsOrderGroupsValuesRequirementsPreservedExceptTwoComplete39Requirements: true, completeRequirementChanges: ['doc.lesson.39', 'doc.rendered.008'], appendedRoles: proposal.neutralRoleMap.slice(82), appendedPairs: proposal.pairs.slice(-2), counts: { complete: proposal.completeDocuments.length, pairs: proposal.pairs.length, all: proposal.neutralRoleMap.length } });
console.log(JSON.stringify({ proposal: desc(`${out}/inventory-proposal.json`), delta: desc(`${out}/delta-vs-run02.json`), counts: { complete: proposal.completeDocuments.length, pairs: proposal.pairs.length, all: proposal.neutralRoleMap.length }, ...proposal.measuredBytes }));
