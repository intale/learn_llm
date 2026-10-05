import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const repository = resolve(process.argv[2] ?? '.');
const run = '.build/runs/20261005T045500Z-reference-core-command-reframe-04';
const correctiveRun = '.build/runs/20261005T020709Z-reference-core-cheat-sheet-correction-02';
const priorRun = '.build/runs/20261004T221700Z-reframe-functional-reference-core-surfaces-01';
const root = resolve(repository, run, 'publish');
const out = 'audits/functional-laptop/reviews/reference-core-reframe/english-candidate-01';
if (existsSync(resolve(root, out, 'review-spec.json'))) throw Error('Candidate attempt already exists');
const tool = await import(resolve(repository, '.agents/skills/author-llm-course-english/scripts/english-review.mjs'));
const { parse } = createRequire('/workspace/site/package.json')('parse5');
const readRepo = p => readFileSync(resolve(repository, p));
const sha = b => createHash('sha256').update(b).digest('hex');
const write = (p, b) => { mkdirSync(dirname(resolve(root, p)), { recursive: true }); writeFileSync(resolve(root, p), b, { flag: 'wx' }); return { path: p, sha256: sha(b) }; };
const json = (p, v) => write(p, tool.canonicalJson(v));
const copy = (original, p) => write(p, readRepo(original));
const selectionPath = `${run}/publish/audits/functional-laptop/reviews/reference-core-reframe/english-selection-02/selected-surfaces-proposal.json`;
const selected = JSON.parse(readRepo(selectionPath));
if (sha(readRepo(selectionPath)) !== '320f6864ab3985d9ee3e9f25c542ca27a895f0c0a46a7d6853f6f2070cebc31c') throw Error('Root-reconciled selection drift');
const roleRequirements = JSON.parse(readRepo(`${correctiveRun}/authoring/role-requirements-en-01.json`));
const descriptor = p => ({ path: p, sha256: sha(readRepo(p)), bytes: readRepo(p).length });
const verify = d => { if (sha(readRepo(d.path)) !== d.sha256) throw Error(`Input drift ${d.path}`); };
for (const d of [...selected.sourceDocuments, ...selected.builtDocuments]) verify(d.candidate);
verify(selected.selection); verify(selected.requirements);
const originalAuthorPath = `${run}/authoring/english-author-context-01.json`;
const authorContext = copy(originalAuthorPath, `${out}/author-context.json`);
json(`${out}/author-input-encoding-provenance.json`, { schemaVersion: 1, original: descriptor(originalAuthorPath), frozen: authorContext, method: 'Maintained canonicalJson encoding of unchanged root-authored final author object, authorized before routing; no fact/timestamp/setting edit and no response normalization' });
const author = JSON.parse(readFileSync(resolve(root, authorContext.path)));
const inheritedMap = JSON.parse(readRepo(`${correctiveRun}/authoring/commitment-map-01.json`));
inheritedMap.scopeId = author.scopeId;
inheritedMap.commitments.push({ id: 'literal-cargo-command', kind: 'literal-program-command', claim: 'The exact copyable command is cargo run --quiet --locked -p ch39-end-to-end-llm; each long flag starts with two ASCII hyphens in source and rendered code. Cargo syntax must not be typographically transformed; prose and numerics remain unchanged.', evidence: [{ path: 'site/src/content/chapters/en/39-end-to-end-llm.mdx', locator: 'Unique literal command code span' }, { path: 'site/tests/e2e/ch39-end-to-end-llm.spec.ts', locator: 'both locales preserve literal ASCII command flags: exact static HTTP code text and unique live code text' }], affected: ['source.009', 'built.008', 'source-unit.044', 'unit.059', 'Direct Russian counterparts'] });
const commitmentMap = json(`${out}/commitment-map.json`, inheritedMap);
const rubrics = Object.fromEntries(['technical', 'isolated'].map(role => [role === 'technical' ? 'technicalPedagogical' : 'isolatedSurface', copy(`${priorRun}/authoring/${role}-rubric.md`, `${out}/rubrics/${role}.md`)]));
const schemas = Object.fromEntries([['reviewSchema', 'review-record'], ['adjudicationSchema', 'adjudication-record'], ['receiptSchema', 'evidence-receipt']].map(([key, name]) => [key, copy(`.agents/skills/author-llm-course-english/references/${name}.schema.json`, `${out}/schemas/${name}.schema.json`)]));
const sourceDocuments = selected.sourceDocuments.map(d => ({ id: d.id, kind: 'complete-source', roleRequirement: d.roleRequirement, file: copy(d.candidate.path, `${out}/sources/${d.canonicalPath}`), publicationPath: d.canonicalPath }));
const builtDocuments = selected.builtDocuments.map(d => ({ id: d.id, kind: 'complete-built-html', roleRequirement: d.roleRequirement, file: copy(d.candidate.path, `${out}/built/${d.routePath}`), route: '/' + d.routePath.replace(/index\.html$/, ''), publicationPath: d.candidate.path.slice(`${run}/publish/`.length) }));
const docs = new Map(selected.builtDocuments.map(d => [d.id, { ...d, dom: parse(readRepo(d.candidate.path).toString()) }]));
const nodeAt = (documentId, path) => path.reduce((n, i) => n?.childNodes?.[i], docs.get(documentId)?.dom);
const attrs = n => Object.fromEntries((n?.attrs ?? []).map(a => [a.name, a.value]));
const normalized = s => s.replace(/\p{White_Space}+/gu, ' ').trim();
const escape = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const auditValues = [], provenance = [];
function direct(unit) {
  if (!docs.has(unit.documentId) || !unit.origin?.nodePath) return null;
  const node = nodeAt(unit.documentId, unit.origin.nodePath);
  if (!node || node.tagName !== unit.origin.tag) throw Error(`Node provenance drift ${unit.id}`);
  const value = unit.valueType === 'attribute' ? attrs(node)[unit.attribute] : tool.extractAccessibleText(node);
  if (value !== unit.value) throw Error(`Extracted value drift ${unit.id}`);
  const candidates = [unit.origin.locator, attrs(node).id && { tag: node.tagName, id: attrs(node).id }, ...Object.entries(attrs(node)).map(([name, value]) => ({ tag: node.tagName, attribute: { name, value } }))].filter(Boolean);
  for (const locator of candidates) {
    const matches = []; const walk = n => { const a = attrs(n); if (n.tagName && (!locator.tag || n.tagName === locator.tag) && (!locator.id || a.id === locator.id) && (!locator.attribute || a[locator.attribute.name] === locator.attribute.value)) matches.push(n); (n.childNodes ?? []).forEach(walk); }; walk(docs.get(unit.documentId).dom);
    if (matches.length === 1 && matches[0] === node) return { documentId: unit.documentId, locator, value: unit.valueType === 'attribute' ? { type: 'attribute', name: unit.attribute } : { type: 'text' } };
  }
  return null;
}
function surface(unit, order, isolated) {
  let location = direct(unit);
  // Approved multi-node reading units and source-only units retain their exact
  // value in an audit-only document; neither public HTML nor teaching context
  // is changed. Existing accessible-text whitespace rules remain explicit.
  if (!location) { auditValues.push({ id: unit.id, value: unit.value }); location = { documentId: 'built.audit-isolation', locator: { tag: 'pre', id: unit.id }, value: { type: 'text' } }; }
  provenance.push({ id: unit.id, kind: unit.kind, roleRequirement: unit.roleRequirement, originalDocumentId: unit.documentId ?? null, original: unit.origin ?? { source: unit.source, jsonPath: unit.jsonPath ?? null, utf16StartOffset: unit.utf16StartOffset ?? null }, originalValueSha256: sha(Buffer.from(unit.value)), accessibleValueSha256: sha(Buffer.from(normalized(unit.value))), representation: location });
  return { id: unit.id, kind: unit.kind, roleRequirement: unit.roleRequirement, order, ...location, ...(isolated ? { literals: unit.kind === 'copyable-command' ? [{ kind: 'code', value: unit.value }] : [] } : {}) };
}
const readingSurfaces = selected.reading.map((u, i) => surface(u, i + 1, false));
const isolatedSurfaces = [...selected.isolated].sort((a, b) => Buffer.compare(Buffer.from(a.id), Buffer.from(b.id))).map((u, i) => surface(u, i + 1, true));
const auditHtml = '<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body><main>' + auditValues.map(u => `<pre id="${u.id}">${escape(u.value)}</pre>`).join('') + '</main></body></html>\n';
const auditFile = write(`${out}/built/audit-isolation.html`, Buffer.from(auditHtml));
const auditPublicationPath = `${out}/audit-only/audit-isolation.html`;
write(auditPublicationPath, Buffer.from(auditHtml));
for (const u of auditValues) { const doc = parse(auditHtml); let found; const walk = n => { if (attrs(n).id === u.id) found = n; (n.childNodes ?? []).forEach(walk); }; walk(doc); if (!found || tool.extractAccessibleText(found) !== normalized(u.value)) throw Error(`Audit view text drift ${u.id}`); }
builtDocuments.push({ id: 'built.audit-isolation', kind: 'complete-built-html', roleRequirement: roleRequirements.documents['isolation-view'], file: auditFile, route: `/audit-only/reference-core/en/corrective-final/extractions/`, publicationPath: auditPublicationPath });
const evidence = [];
function addEvidence(id, bound) { evidence.push({ id: `evidence.${id}`, ...bound }); }
addEvidence('provenance', json(`${out}/evidence/extraction-provenance.json`, { schemaVersion: 1, purpose: 'Audit-only exact extraction provenance; no public route or additional teaching context', selection: descriptor(selectionPath), predecessor: selected.predecessor, originalDocuments: [...selected.sourceDocuments, ...selected.builtDocuments].map(d => ({ id: d.id, file: d.candidate })), auditFile, auditPublicationPath, surfaces: provenance }));
const fullEvidence = ['rust/crates/llm-from-scratch/src/tensor/storage.rs', 'rust/crates/llm-from-scratch/src/tensor/matmul.rs', 'rust/crates/llm-from-scratch/src/pipeline.rs', 'curriculum/chapters/34-final-evaluation.md', 'site/src/content/chapters/en/34-final-evaluation.mdx', 'curriculum/future-chapter-plans/40-reference-core-handoff.md'];
for (const [i, p] of fullEvidence.entries()) addEvidence(`full.${String(i + 1).padStart(2, '0')}`, copy(p, `${out}/evidence/full/${p}`));
for (const [i, p] of ['rust/demos/ch39-end-to-end-llm/src/lib.rs', 'rust/demos/ch39-end-to-end-llm/expected.txt'].entries()) addEvidence(`demo.${i + 1}`, copy(`${run}/publish/${p}`, `${out}/evidence/full/${p}`));
const execution = `${priorRun}/publish/artifacts/functional-laptop/reframes/reference-core/20261004T221700Z-01/operations/ch39-execution-02`;
for (const name of ['stdout.txt', 'baseline.diff', 'current-control.txt', 'baseline-control.txt']) addEvidence(`execution.${name.replaceAll('.', '-')}`, copy(`${execution}/${name}`, `${out}/evidence/execution/${name}`));
addEvidence('execution-command', copy(`${priorRun}/machinery/capture-ch39-execution-02.sh`, `${out}/evidence/execution/command.sh`));
addEvidence('execution-bindings', json(`${out}/evidence/execution/bindings.json`, { schemaVersion: 1, commandExitCode: 0, stdout: descriptor(`${execution}/stdout.txt`), golden: descriptor(`${run}/publish/rust/demos/ch39-end-to-end-llm/expected.txt`), goldenDiff: descriptor(`${execution}/golden.diff`), baselineDiff: descriptor(`${execution}/baseline.diff`), currentControl: descriptor(`${execution}/current-control.txt`), baselineControl: descriptor(`${execution}/baseline-control.txt`), controlComparisonExitCode: 0, image: 'sha256:fc6a74e246e7c6959d56df2488beee12f922d15bcf571212e47e4f3936cf97b5', network: 'none' }));
function excerpt(id, path, ranges) { const lines = readRepo(path).toString().split(/(?<=\n)/); const selected = ranges.map(([start, end]) => ({ firstLine: start + 1, lastLine: end, text: lines.slice(start, end).join('') })); addEvidence(id, json(`${out}/evidence/${id}.json`, { schemaVersion: 1, original: descriptor(path), selections: selected })); }
const course = readRepo('curriculum/course-plan.md').toString().split(/(?<=\n)/); const targetStart = course.findIndex(l => /^  "target": \{/.test(l)); const targetEnd = course.findIndex((l, i) => i > targetStart && /^  \},/.test(l)); excerpt('course-target', 'curriculum/course-plan.md', [[targetStart, targetEnd + 1]]);
const extensionPath = 'curriculum/functional-laptop-llm-extension-plan.md', extensionLines = readRepo(extensionPath).toString().split(/(?<=\n)/);
const section = n => { const start = extensionLines.findIndex(l => l.startsWith(`## ${n}. `)); let end = extensionLines.findIndex((l, i) => i > start && l.startsWith('## ')); if (end < 0) end = extensionLines.length; return [start, end]; };
const identityEnd = extensionLines.findIndex(l => l.startsWith('  "design_input_identities"'));
excerpt('extension-boundaries', extensionPath, [[0, identityEnd], section(1), section(2), section(5)]);
const decisionLines = readRepo('DECISIONS.md').toString().split(/(?<=\n)/); const policyStart = decisionLines.findIndex(l => l.startsWith('### 2026-10-02 — Problem-first future authoring and causal explanations')); let policyEnd = decisionLines.findIndex((l, i) => i > policyStart && /^#{1,3} /.test(l)); if (policyStart < 0 || policyEnd < 0) throw Error('Policy excerpt missing'); excerpt('accepted-presentation-policy', 'DECISIONS.md', [[policyStart, policyEnd]]);
const stateLines = readRepo('BUILD_STATE.yaml').toString().split(/(?<=\n)/); const buildStart = stateLines.findIndex(l => l.includes('  - build_id: extend-course-to-functional-laptop-llm-20260810')); const nextBuild = stateLines.findIndex((l, i) => i > buildStart && /^  - build_id:/.test(l)); const stateEnd = nextBuild < 0 ? stateLines.length : nextBuild;
const ranges = [[buildStart, buildStart + 3]];
for (let i = buildStart; i < stateEnd; i++) if (/^      - id: (?:implement-ch(?:[4-7]\d|8[0-5])-|establish-functional-firefox-execution-boundary|establish-functional-successor-static-integration)/.test(stateLines[i])) { let end = i + 1; while (end < stateEnd && !/^        inputs:/.test(stateLines[end])) end++; ranges.push([i, end]); }
excerpt('current-availability', 'BUILD_STATE.yaml', ranges);
addEvidence('newest-logit-rust', copy('rust/demos/ch38-cached-generation/src/lib.rs', `${out}/evidence/full/rust/demos/ch38-cached-generation/src/lib.rs`));
addEvidence('newest-logit-mathematics', copy(`${correctiveRun}/authoring/newest-logit-evidence-01.md`, `${out}/evidence/newest-logit-evidence.md`));
addEvidence('literal-command-test', copy(`${run}/publish/site/tests/e2e/ch39-end-to-end-llm.spec.ts`, `${out}/evidence/command/ch39-end-to-end-llm.spec.ts`));
addEvidence('literal-command-observation', json(`${out}/evidence/command/exact-command.json`, { schemaVersion: 1, command: 'cargo run --quiet --locked -p ch39-end-to-end-llm', longOptions: ['--quiet', '--locked'], optionPrefixAsciiBytes: [45, 45], source: descriptor(`${run}/publish/site/src/content/chapters/en/39-end-to-end-llm.mdx`), built: descriptor(selected.builtDocuments.find(d => d.id === 'built.008').candidate.path), staticAndDomCommandRegressionExitCode: 0 }));
evidence.sort((a, b) => Buffer.compare(Buffer.from(a.id), Buffer.from(b.id)));
const selectedModel = { model: author.model, reasoning: author.reasoning };
const spec = { schemaVersion: 1, candidateId: author.candidateId, scopeId: author.scopeId, authorContext, requiredAuthor: selectedModel, requiredReviewers: { technicalPedagogical: selectedModel, isolatedSurface: selectedModel }, requiredAdjudicators: { technicalPedagogical: selectedModel, isolatedSurface: selectedModel }, evidence, commitmentMap, ...schemas, sourceDocuments, builtDocuments, readingSurfaces, isolatedSurfaces, rubrics };
const specFile = json(`${out}/spec.json`, spec);
console.log(JSON.stringify({ state: 'assembled immutable inputs; maintained preparation follows', specFile, auditUnits: auditValues.length, source: sourceDocuments.length, built: builtDocuments.length, reading: readingSurfaces.length, isolated: isolatedSurfaces.length }));
tool.prepareEvidence({ specPath: specFile.path, outDir: resolve(root, out, 'bundle'), root, parserRoot: '/workspace' });
const measured = Object.fromEntries(['technical-pedagogical', 'isolated-surface'].map(role => [role, { bundleBytes: readFileSync(resolve(root, out, 'bundle', role, 'review-bundle.json')).length, promptBytes: Buffer.byteLength(tool.canonicalReviewPrompt(role)), schemaBytes: readFileSync(resolve(root, schemas.reviewSchema.path)).length, contextManifestBytes: null, exactFourArtifactTotalBytes: null }]));
json(`${out}/preflight-measurements.json`, { schemaVersion: 1, effectivePerContextInputByteCap: 8388608, inputTokenCap: 200000, measured, tokenUsage: 'unobserved-not-estimated', note: 'Actual context manifests not yet generated; no tokenizer count is claimed. Required byte envelope includes their actual bytes after routing preparation.' });
console.log(JSON.stringify({ state: 'maintained prepare succeeded; no routing yet', measured }));
