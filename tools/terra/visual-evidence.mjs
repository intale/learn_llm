#!/usr/bin/env node
/* Deterministic, offline Playwright trace evidence builder. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const HASH = /^[0-9a-f]{64}$/;
const RUN = /^[0-9]{8}T[0-9]{6}Z-[a-z0-9][a-z0-9-]*-[0-9]{2}$/;
const MAX_COMMAND_BUFFER = 256 * 1024 * 1024;
const C = (a, b) => Buffer.from(a).compare(Buffer.from(b));
class EvidenceError extends Error {}
const fail = (s) => { throw new EvidenceError(s); };
let ACTIVE_COMMANDS = {};
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
function keys(v, wanted, label) {
  if (!isObj(v)) fail(`${label} must be an object`);
  for (const k of Object.keys(v)) if (!wanted.includes(k)) fail(`${label} has unknown key ${k}`);
  for (const k of wanted) if (!(k in v)) fail(`${label} is missing ${k}`);
}
function rel(v, label) {
  if (typeof v !== 'string' || !v || !/^[A-Za-z0-9._/@-]+$/.test(v) || v.includes('\0') || v.startsWith('/') || v.includes('\\') || v.includes('//')) fail(`${label} is unsafe`);
  const p = v.split('/'); if (p.some(x => !x || x === '.' || x === '..')) fail(`${label} is unsafe`);
  return v;
}
function sortedUnique(a, label) {
  const seen = new Set(); let previous;
  for (const x of a) { if (seen.has(x)) fail(`${label} contains duplicate ${x}`); if (previous !== undefined && C(previous, x) >= 0) fail(`${label} is not C-sorted`); seen.add(x); previous = x; }
}
function hash(v, label) { if (typeof v !== 'string' || !HASH.test(v)) fail(`${label} must be lowercase SHA256`); }
function inside(root, target) { return target === root || target.startsWith(`${root}${path.sep}`); }
function safePath(root, value, label, file = true) {
  rel(value, label); const target = path.resolve(root, ...value.split('/')); if (!inside(root, target)) fail(`${label} escapes run`);
  let cur = root;
  for (const part of path.relative(root, target).split(path.sep)) { cur = path.join(cur, part); let st; try { st = fs.lstatSync(cur); } catch { fail(`${label} is missing`); } if (st.isSymbolicLink()) fail(`${label} contains symlink`); }
  const st = fs.lstatSync(target); if (file ? !st.isFile() : !st.isDirectory()) fail(`${label} is not a regular ${file ? 'file' : 'directory'}`);
  if (!inside(root, fs.realpathSync(target))) fail(`${label} escapes run`); return target;
}
function safeContract(run, value) {
  if (path.isAbsolute(value)) {
    const target = path.resolve(value); if (!inside(run, target)) fail('contract escapes run');
    return safePath(run, path.relative(run, target).split(path.sep).join('/'), 'contract');
  }
  return safePath(run, value, 'contract');
}
function sha(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function command(cmd, args, input = undefined) { const injected = ACTIVE_COMMANDS[cmd]; if (injected) return Buffer.from(injected(args, input)); try { return execFileSync(cmd, args, { input, encoding: 'buffer', maxBuffer: MAX_COMMAND_BUFFER, stdio: ['pipe', 'pipe', 'pipe'] }); } catch (e) { fail(`${cmd} failed: ${e.stderr?.toString().trim() || e.message}`); } }
function zipEntries(zip) {
  const listing = command('unzip', ['-Z1', '--', zip]).toString('utf8');
  if (!listing.endsWith('\n')) fail('ZIP listing is not newline terminated');
  const names = listing.split('\n').slice(0, -1);
  const seen = new Set();
  for (const n of names) {
    rel(n, 'ZIP member'); if (seen.has(n)) fail(`ZIP duplicate member ${n}`); seen.add(n);
    if (n.endsWith('/')) fail(`ZIP nonregular member ${n}`);
  }
  // The pinned Linux Playwright workflow emits one Unix mode record per member.
  // Require every central-directory entry to be a regular file (0100xxx).
  const verbose = command('unzip', ['-Zv', '--', zip]).toString('utf8');
  const modes = [...verbose.matchAll(/Unix file attributes \(([0-7]{6}) octal\):\s+([^\r\n]+)/g)];
  if (modes.length !== names.length || modes.some((match) => !match[1].startsWith('100') || !match[2].trimStart().startsWith('-'))) fail('ZIP contains a member without an exact regular-file mode');
  return names.sort(C);
}
function jsonLines(buf, label) {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(buf); if (!text) fail(`${label} is empty`);
  const lines = text.split('\n'); if (lines.at(-1) === '') lines.pop();
  const out = []; for (const line of lines) { if (!line.trim()) fail(`${label} has blank line`); try { out.push(JSON.parse(line)); } catch { fail(`${label} has invalid JSON`); } } return out;
}
function traceAudit(zip) {
  const entries = zipEntries(zip); const traces = entries.filter(x => x.endsWith('.trace') || x.endsWith('.jsonl'));
  if (!traces.length) fail('trace JSONL is missing');
  let contexts = 0, snapshots = 0, screencasts = 0; const resources = new Set();
  for (const n of traces) for (const e of jsonLines(command('unzip', ['-p', '--', zip, n]), `ZIP ${n}`)) {
    const t = e.type ?? e.method ?? e.name;
    if (t === 'context-options' && e.origin === 'library') {
      contexts++;
      if (e.browserName !== 'firefox') fail('every authoritative context must be Firefox');
      if (e.options?.javaScriptEnabled !== true) fail('every authoritative context must explicitly enable JavaScript');
    }
    if (t === 'frame-snapshot') snapshots++;
    if (t === 'screencast-frame') {
      if (typeof e.sha1 !== 'string' || !/^[A-Za-z0-9@._-]+\.jpe?g$/.test(e.sha1)) fail('screencast frame has an unsafe or missing sha1');
      resources.add(e.sha1);
      screencasts++;
    }
  }
  if (!contexts) fail('authoritative Firefox context is missing');
  if (!snapshots) fail('DOM snapshots are missing');
  if (!screencasts) fail('screencast JPEG resource references are missing');
  for (const ref of resources) if (!entries.includes(`resources/${ref}`)) fail(`missing JPEG resource ${ref}`);
  return { entries, contexts, snapshots, jpegReferences: [...resources].sort(C) };
}
function parseContract(raw, runId) {
  let c; try { c = JSON.parse(raw); } catch { fail('contract is not JSON'); }
  keys(c, ['schemaVersion', 'runId', 'browser', 'javaScriptEnabled', 'traceArchives', 'images', 'groups'], 'contract');
  if (c.schemaVersion !== 1 || c.runId !== runId || c.browser !== 'firefox' || c.javaScriptEnabled !== true) fail('contract version, runId, browser, or JavaScript setting is invalid');
  if (!Array.isArray(c.traceArchives) || !c.traceArchives.length || !Array.isArray(c.images) || !c.images.length || !Array.isArray(c.groups) || !c.groups.length) fail('contract lists must be nonempty arrays');
  const traces = c.traceArchives.map((x, i) => { keys(x, ['path', 'sha256'], `traceArchives[${i}]`); const p = rel(x.path, `traceArchives[${i}].path`); hash(x.sha256, `traceArchives[${i}].sha256`); return { path: p, sha256: x.sha256 }; }); sortedUnique(traces.map(x => x.path), 'traceArchives');
  const images = c.images.map((x, i) => { keys(x, ['path', 'sha256'], `images[${i}]`); const p = rel(x.path, `images[${i}].path`); hash(x.sha256, `images[${i}].sha256`); return { path: p, sha256: x.sha256 }; }); sortedUnique(images.map(x => x.path), 'images');
  const groups = c.groups.map((x, i) => { keys(x, ['id', 'columns', 'images'], `groups[${i}]`); if (typeof x.id !== 'string' || !x.id || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(x.id)) fail(`groups[${i}].id is unsafe`); if (!Number.isSafeInteger(x.columns) || x.columns <= 0) fail(`groups[${i}].columns must be positive`); if (!Array.isArray(x.images) || !x.images.length) fail(`groups[${i}].images must be nonempty`); for (const p of x.images) rel(p, `groups[${i}] image`); return { id: x.id, columns: x.columns, images: x.images }; });
  const ids = groups.map(x => x.id); sortedUnique(ids, 'groups'); if (new Set(ids).size !== ids.length) fail('groups have duplicate ids'); const allow = new Set(images.map(x => x.path)); const used = new Set(); for (const g of groups) { for (const p of g.images) { if (!allow.has(p)) fail(`group image is not allowlisted: ${p}`); if (used.has(p)) fail(`image appears in multiple groups: ${p}`); used.add(p); } }
  if (used.size !== allow.size) fail('ungrouped allowlisted image');
  for (const g of groups) sortedUnique(g.images, `group ${g.id} images`);
  return { traces, images, groups };
}
export function buildVisualEvidence({ repoRoot = process.cwd(), runId, contractPath, outputDir, commands = {} }) {
  const argv = ['node', 'visual-evidence.mjs', runId, '--contract', contractPath, '--output', outputDir];
  ACTIVE_COMMANDS = {
    unzip: commands.unzipList || commands.unzipRead || commands.unzipVerbose || commands.unzipVersion ? ((args, input) => {
      if (args[0] === '-Z1') return commands.unzipList(args, input);
      if (args[0] === '-Zv') return commands.unzipVerbose(args, input);
      if (args[0] === '-v') return (commands.unzipVersion ?? commands.unzipRead)(args, input);
      return commands.unzipRead(args, input);
    }) : undefined,
    identify: commands.identify || commands.identifyVersion ? ((args, input) => args[0] === '-version' ? (commands.identifyVersion ?? commands.identify)(args, input) : commands.identify(args, input)) : undefined,
    montage: commands.montage || commands.montageVersion ? ((args, input) => args[0] === '-version' ? (commands.montageVersion ?? commands.montage)(args, input) : commands.montage(args, input)) : undefined,
  };
  try { return main(argv, { repoRoot, commands, outputDir }); } finally { ACTIVE_COMMANDS = {}; }
}
function main(argv, options = {}) {
  if (argv.length !== 7 || argv[3] !== '--contract' || argv[5] !== '--output') fail('usage: RUN_ID --contract CONTRACT --output OUTPUT');
  const runId = argv[2], contractRel = argv[4], output = argv[6]; if (!RUN.test(runId)) fail('invalid run ID');
  const root = options.repoRoot || process.cwd(); const run = path.resolve(root, '.build', 'runs', runId); safePath(path.dirname(run), runId, 'run', false); const contract = safeContract(run, contractRel);
  if (!options.outputDir && output !== '/output') fail('output must be /output');
  const out = options.outputDir || '/output'; const st = fs.lstatSync(out); if (st.isSymbolicLink() || !st.isDirectory() || (st.mode & 0o777) !== 0o700 || fs.readdirSync(out).length) fail('output must be an empty mode-0700 regular directory');
  const c = parseContract(fs.readFileSync(contract, 'utf8'), runId); const traceReports = [];
  for (const item of c.traces) { const p = item.path; const z = safePath(run, p, `trace ${p}`); if (sha(z) !== item.sha256) fail(`trace hash mismatch: ${p}`); const a = traceAudit(z); traceReports.push({ path: p, sha256: item.sha256, entries: a.entries, contexts: a.contexts, snapshots: a.snapshots, jpegReferences: a.jpegReferences }); }
  const imageReports = c.images.map(x => { const f = safePath(run, x.path, `image ${x.path}`); if (sha(f) !== x.sha256) fail(`image hash mismatch: ${x.path}`); const info = command('identify', ['-format', '%m %w %h', '--', f]).toString('utf8').trim().split(/\s+/); const width = Number(info[1]), height = Number(info[2]); if (info.length !== 3 || !/^PNG$/i.test(info[0]) || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) fail(`image is not a finite positive PNG: ${x.path}`); return { ...x, bytes: fs.statSync(f).size, format: info[0], width, height }; });
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'visual-evidence-')); const files = [];
  try {
    const normalizeVersion = (value, label) => { const text = new TextDecoder('utf-8', { fatal: true }).decode(value).replaceAll('\r\n', '\n').trimEnd(); if (!text || text.includes('\0')) fail(`${label} version output is empty or unsafe`); return `${text}\n`; };
    const versions = { unzip: normalizeVersion(command('unzip', ['-v']), 'unzip'), identify: normalizeVersion(command('identify', ['-version']), 'identify'), montage: normalizeVersion(command('montage', ['-version']), 'montage') };
    for (const g of c.groups) { const target = path.join(temp, `${g.id}.png`); const args = ['-limit', 'thread', '1', '-background', '#ffffff', '-fill', '#111111', '-font', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '-label', '%f', '-geometry', '640x480+12+12', '-tile', `${g.columns}x`, ...g.images.map(p => safePath(run, p, `group image ${p}`)), '-strip', '-define', 'png:exclude-chunk=time', 'png:' + target]; command('montage', args); files.push({ path: `${g.id}.png`, target, group: g }); }
    const inventory = { schemaVersion: 1, runId, browser: 'firefox', javaScriptEnabled: true, toolVersions: versions, traces: traceReports, images: imageReports, groups: c.groups.map(g => ({ id: g.id, columns: g.columns, images: g.images })) };
    fs.writeFileSync(path.join(temp, 'inventory.json'), JSON.stringify(inventory, null, 2) + '\n'); files.push({ path: 'inventory.json', target: path.join(temp, 'inventory.json') });
    const manifest = files.map(x => `${sha(x.target)}  ${x.path}\n`).sort(C).join(''); fs.writeFileSync(path.join(temp, 'manifest.sha256'), manifest); files.push({ path: 'manifest.sha256', target: path.join(temp, 'manifest.sha256') });
    const summary = { complete: true, schemaVersion: 1, runId, browser: 'firefox', javaScriptEnabled: true, sheets: files.filter(x => x.path.endsWith('.png')).map(x => x.path).sort(C), inventory: 'inventory.json', manifest: 'manifest.sha256' }; fs.writeFileSync(path.join(temp, 'summary.json'), JSON.stringify(summary, null, 2) + '\n'); files.push({ path: 'summary.json', target: path.join(temp, 'summary.json') });
    const publish = fs.mkdtempSync(path.join(out, '.publish-'));
    try {
      for (const x of files.filter(x => x.path !== 'summary.json').sort((a, b) => C(a.path, b.path))) { const p = path.join(publish, x.path); fs.copyFileSync(x.target, p); fs.chmodSync(p, 0o600); }
      for (const x of files.filter(x => x.path !== 'summary.json').sort((a, b) => C(a.path, b.path))) fs.renameSync(path.join(publish, x.path), path.join(out, x.path));
      const summaryFile = files.find(x => x.path === 'summary.json'); const sp = path.join(publish, 'summary.json'); fs.copyFileSync(summaryFile.target, sp); fs.chmodSync(sp, 0o600); fs.renameSync(sp, path.join(out, 'summary.json'));
    } finally { fs.rmSync(publish, { recursive: true, force: true }); }
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  try { main(process.argv); } catch (e) { if (e instanceof EvidenceError) { console.error(`error: ${e.message}`); process.exitCode = 2; } else { console.error(e); process.exitCode = 1; } }
}
