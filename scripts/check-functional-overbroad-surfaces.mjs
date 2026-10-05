#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dispatchVerifiers } from './check-functional-chapter-reviews.mjs';
import { verifyRouting } from './localization-routing.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REVIEW = 'audits/functional-laptop/reviews/reference-core-reframe';
export const CLOSURE_PATH = `${REVIEW}/closure.json`;
export const BASELINE_COMMIT = '365f70dde3510f40e84f9700aa11a3dea79e2ff0';
const COVERAGE = { path: 'audits/2026-08-10-functional-llm-capability/coverage.md', sha256: '42a2fd6ea482995c280f1c55d1a8c30a494968116edc57594579a7b1da2f4fb1' };
const PLAN = { path: 'curriculum/functional-laptop-llm-extension-plan.md', sha256: 'be619fa7e8a09adc95b7e7d7ab89b23a1c2998389f43b69a53bd92748aedfd6d' };
const INVENTORY_PATHS = {
  english: `${REVIEW}/english-candidate-01/bundle/inventory.json`,
  russian: `${REVIEW}/closure-evidence/ru-inventory.json`,
};
const CONTROL_HASHES = {
  'curriculum/chapters/34-final-evaluation.md': 'ade774f925dbaf5c830651ea5067fd98e6d4573c727497c3264e2bf7725ae38b',
  'site/src/content/chapters/en/34-final-evaluation.mdx': '095902ed5db207ba601f29e2fedd5f40fa427badd0aa1c5d27bdb942dad07791',
  'rust/demos/ch39-end-to-end-llm/expected.txt': 'da73ba11478416d6471e815a5269f9143c14408e77d298d114997bf796aed0ef',
  'curriculum/chapters/38-cached-generation.md': '97d19afb97f44fa8472014c9177c4b7dba0310a42149a45fe3b79ace0e80eef6',
  'curriculum/chapters/39-end-to-end-llm.md': 'bfa7b47ba4c0046cc0ce4d58d6caf91b60251e2a31a8ae5bdce33bf38fe86eaa',
};
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
function fail(message) { throw new Error(message); }
function keys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).sort().join('\0') !== [...expected].sort().join('\0')) fail(`${label}: closed object keys required`);
}
function string(value, label) { if (typeof value !== 'string' || !value) fail(`${label}: nonempty string required`); }
function unique(values, label) { if (new Set(values).size !== values.length) fail(`${label}: duplicate entry`); }
export function readSafe(root, path) {
  string(path, 'path');
  const parts = path.split('/');
  if (path.includes('\\') || parts.some(p => !p || p === '.' || p === '..')) fail(`unsafe path: ${path}`);
  let current = resolve(root);
  for (const [index, part] of parts.entries()) {
    current = resolve(current, part);
    const stat = lstatSync(current);
    if (stat.isSymbolicLink() || (index === parts.length - 1 ? !stat.isFile() : !stat.isDirectory())) fail(`not a regular safe file: ${path}`);
  }
  return readFileSync(current);
}
export function readBound(root, descriptor) {
  keys(descriptor, ['path', 'sha256'], 'file descriptor');
  if (!/^[a-f0-9]{64}$/.test(descriptor.sha256)) fail('invalid sha256');
  const bytes = readSafe(root, descriptor.path);
  if (sha256(bytes) !== descriptor.sha256) fail(`hash drift: ${descriptor.path}`);
  return bytes;
}
function json(root, descriptor) { return JSON.parse(readBound(root, descriptor)); }
function between(text, start, end) {
  const a = text.indexOf(start);
  if (a < 0 || text.indexOf(start, a + start.length) !== -1) fail('control start must be unique');
  const b = text.indexOf(end, a + start.length);
  if (b < 0 || text.indexOf(end, b + end.length) !== -1) fail('control end must be unique');
  return text.slice(a + start.length, b);
}
export function controlBytes(path, bytes) {
  if (path === 'rust/demos/ch39-end-to-end-llm/expected.txt') {
    const lines = bytes.toString('utf8').split('\n');
    if (lines.length < 10) fail('missing stdout control lines');
    return Buffer.from(`${lines.slice(1, 9).join('\n')}\n`);
  }
  if (path === 'curriculum/chapters/38-cached-generation.md') {
    const text = bytes.toString('utf8');
    const start = 'It does not introduce batching,';
    const end = 'production memory allocator.';
    const middle = between(text, start, end);
    return Buffer.from(start + middle + end);
  }
  if (path === 'curriculum/chapters/39-end-to-end-llm.md') return Buffer.from(between(bytes.toString('utf8'), '## Scope\n', '<!-- contract-section:worked-inputs -->'));
  if (!Object.hasOwn(CONTROL_HASHES, path)) fail('unknown control path');
  return bytes;
}
export function validateControls(root) {
  for (const [path, expected] of Object.entries(CONTROL_HASHES)) {
    if (sha256(controlBytes(path, readSafe(root, path))) !== expected) fail(`baseline control drift: ${path}`);
  }
}

// Pure structural mapping validation. The caller supplies frozen registries and
// inventories; this function does not approve a surface's meaning or mapping.
export function validateMappings(dispositions, registry, inventories, readDescriptor) {
  if (!Array.isArray(dispositions) || dispositions.length !== 21 || registry.length !== 21) fail('exactly 21 OVER records required');
  const ids = dispositions.map(row => row.surfaceId);
  unique(ids, 'OVER IDs');
  if (ids.join('\0') !== [...registry.map(row => row.surface_id)].sort().join('\0')) fail('OVER coverage/order drift');
  const inventoryIds = Object.fromEntries(Object.entries(inventories).map(([locale, inventory]) => {
    if (inventory.schemaVersion !== 1 || !Array.isArray(inventory.surfaces)) fail('invalid inventory');
    const ids = inventory.surfaces.map(surface => surface.id);
    unique(ids, 'inventory IDs');
    return [locale, new Set(ids)];
  }));
  for (const row of dispositions) {
    keys(row, ['surfaceId', 'disposition', 'ownerStep', 'locators'], 'disposition');
    const original = registry.find(item => item.surface_id === row.surfaceId);
    if (row.disposition !== original.disposition || row.ownerStep !== original.owner_step) fail(`frozen disposition/owner drift: ${row.surfaceId}`);
    if (!Array.isArray(row.locators) || row.locators.length !== original.locators.length) fail('locator coverage drift');
    const seen = [];
    for (const locator of row.locators) {
      keys(locator, ['canonicalPath', 'role', 'source', 'mode', 'inventoryLinks'], 'locator');
      const key = `${locator.canonicalPath}\0${locator.role}`;
      seen.push(key);
      if (!original.locators.some(item => `${item.path}\0${item.role}` === key)) fail('frozen canonicalPath/role drift');
      if (locator.source.path !== locator.canonicalPath) fail('source must bind actual canonical locator path');
      readDescriptor(locator.source);
      const prior = row.ownerStep === 'design-functional-laptop-llm-curriculum-extension';
      const expectedMode = prior ? 'prior-plan' : row.disposition === 'preserve' ? 'control' : 'publication';
      if (locator.mode !== expectedMode) fail('locator mode drift');
      if (!Array.isArray(locator.inventoryLinks) || (!prior && row.disposition !== 'preserve' && !locator.inventoryLinks.length)) fail('publication inventory links required');
      if (prior && locator.inventoryLinks.length) fail('prior internal plans are not new publication reviews');
      const locales = [];
      for (const link of locator.inventoryLinks) {
        keys(link, ['locale', 'surfaceIds'], 'inventory link');
        if (!Object.hasOwn(inventoryIds, link.locale) || !Array.isArray(link.surfaceIds) || !link.surfaceIds.length) fail('invalid inventory link');
        locales.push(link.locale);
        unique(link.surfaceIds, 'linked surface IDs');
        for (const id of link.surfaceIds) if (!inventoryIds[link.locale].has(id)) fail(`missing inventory surface: ${id}`);
      }
      unique(locales, 'linked locales');
    }
    unique(seen, 'canonicalPath/role locators');
  }
}

export function loadInventories(root, descriptors) {
  keys(descriptors, ['english', 'russian'], 'inventories');
  const inventories = {};
  for (const locale of ['english', 'russian']) {
    const descriptor = descriptors[locale];
    if (descriptor.path !== INVENTORY_PATHS[locale]) fail('final inventory path required');
    const inventory = json(root, descriptor);
    const bindingsPath = `${REVIEW}/${locale === 'english' ? 'english-candidate-01' : 'ru-candidate-01'}/bundle/bindings.json`;
    const bindings = JSON.parse(readSafe(root, bindingsPath));
    if (bindings.inventorySha256 !== descriptor.sha256 || bindings.candidateId !== inventory.candidateId || bindings.scopeId !== inventory.scopeId) fail('inventory binding drift');
    inventories[locale] = inventory;
  }
  return inventories;
}
export function loadFrozenRegistry(root) {
  const coverage = readBound(root, COVERAGE).toString('utf8');
  const planText = readBound(root, PLAN).toString('utf8');
  const registry = JSON.parse(planText.split('---\n')[1]).overbroad_surface_map;
  const coverageIds = [...coverage.matchAll(/^\| `(OVER-[A-Z0-9-]+)` \|/gm)].map(match => match[1]);
  unique(coverageIds, 'coverage IDs');
  if (coverageIds.length !== 21 || coverageIds.sort().join('\0') !== registry.map(row => row.surface_id).sort().join('\0')) fail('coverage/plan registry drift');
  return registry;
}
export function validateClosure(root = ROOT) {
  const manifest = JSON.parse(readSafe(root, CLOSURE_PATH));
  keys(manifest, ['schemaVersion', 'baselineCommit', 'coverage', 'plan', 'inventories', 'dispositions', 'localeRouting', 'localeAuthorContext'], 'closure');
  if (manifest.schemaVersion !== 1 || manifest.baselineCommit !== BASELINE_COMMIT) fail('closure version/baseline drift');
  for (const [name, expected] of [['coverage', COVERAGE], ['plan', PLAN]]) {
    if (manifest[name]?.path !== expected.path || manifest[name]?.sha256 !== expected.sha256) fail(`frozen ${name} drift`);
    readBound(root, manifest[name]);
  }
  const registry = loadFrozenRegistry(root);
  const inventories = loadInventories(root, manifest.inventories);
  validateMappings(manifest.dispositions, registry, inventories, descriptor => readBound(root, descriptor));
  validateControls(root);
  if (manifest.localeRouting?.path !== `${REVIEW}/ru-candidate-01/routes/routing.json` || manifest.localeAuthorContext?.path !== `${REVIEW}/ru-candidate-01/frozen/author-context.json`) fail('fixed final locale provenance paths required');
  readBound(root, manifest.localeRouting); readBound(root, manifest.localeAuthorContext);
  return manifest;
}
export async function checkClosure({ root = ROOT, run } = {}) {
  const manifest = validateClosure(root);
  // Actual receipt verifiers are mandatory and untouched; zero from this
  // structural validator alone is never a publication verdict.
  const status = dispatchVerifiers('reference-core', { root, ...(run ? { run } : {}) });
  if (status !== 0) return status;
  await verifyRouting({ root, routingPath: manifest.localeRouting.path, authorContext: manifest.localeAuthorContext.path, bilingualRecord: `${REVIEW}/ru-candidate-01/bilingual.raw.json`, targetOnlyRecord: `${REVIEW}/ru-candidate-01/target-only.raw.json` });
  return 0;
}
if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? '')).href) {
  try {
    if (process.argv.length !== 2) fail('usage: node scripts/check-functional-overbroad-surfaces.mjs');
    process.exitCode = await checkClosure();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
