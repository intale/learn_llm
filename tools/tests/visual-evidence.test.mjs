#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildVisualEvidence } from '../terra/visual-evidence.mjs';

const RUN_ID = '20260811T120000Z-visual-evidence-test-01';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACAQAAAABazTCJAAAADElEQVQI12M4wHAAAAMEAYHFO6KpAAAAAElFTkSuQmCC', 'base64');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const sorted = value => [...value].sort();

const CRC_TABLE = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit++) crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
  return crc >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function storedZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const [name, value] of entries) {
    const nameBytes = Buffer.from(name);
    const data = Buffer.from(value);
    const checksum = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0x21, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, nameBytes, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(0x0314, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0x21, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE((0o100600 << 16) >>> 0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, nameBytes);
    offset += local.length + nameBytes.length + data.length;
  }
  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'visual-evidence-test-'));
  const run = path.join(root, '.build', 'runs', RUN_ID);
  fs.mkdirSync(path.join(run, 'resources'), { recursive: true });
  fs.writeFileSync(path.join(run, 'one.png'), PNG);
  fs.writeFileSync(path.join(run, 'two.png'), PNG);
  fs.writeFileSync(path.join(run, 'resources', 'frame.jpeg'), Buffer.from('jpeg-resource'));
  const trace = [
    { type: 'context-options', origin: 'testRunner', browserName: '', options: {} },
    { type: 'context-options', origin: 'library', browserName: 'firefox', options: { javaScriptEnabled: true } },
    { type: 'frame-snapshot', snapshot: { html: '<main>snapshot</main>' } },
    { type: 'screencast-frame', sha1: 'frame.jpeg' },
  ].map(JSON.stringify).join('\n') + '\n';
  const traceBytes = Buffer.from(trace);
  fs.writeFileSync(path.join(run, 'trace.zip'), Buffer.from('synthetic zip')); // The shim supplies its members.
  const contract = {
    schemaVersion: 1, runId: RUN_ID, browser: 'firefox', javaScriptEnabled: true,
    traceArchives: [{ path: 'trace.zip', sha256: sha(Buffer.from('synthetic zip')) }],
    images: [{ path: 'one.png', sha256: sha(PNG) }, { path: 'two.png', sha256: sha(PNG) }],
    groups: [{ id: 'first', columns: 2, images: ['one.png', 'two.png'] }],
  };
  const contractPath = path.join(run, 'contract.json');
  fs.writeFileSync(contractPath, JSON.stringify(contract));
  return { root, run, contractPath, contract, traceBytes };
}

function commandsFor(fixtureValue) {
  const calls = [];
  const commands = {
    unzipList: args => { calls.push(['unzip-list', ...args]); return 'resources/frame.jpeg\ntrace.trace\n'; },
    unzipVerbose: args => { calls.push(['unzip-verbose', ...args]); return 'Unix file attributes (100600 octal): -rw-------\nUnix file attributes (100600 octal): -rw-------\n'; },
    unzipRead: (args) => {
      calls.push(['unzip-read', ...args]);
      if (args[0] === '-v') return 'UnZip 6.0\n';
      return fixtureValue.traceBytes;
    },
    identify: args => { calls.push(['identify', ...args]); return args[0] === '-version' ? 'ImageMagick 7.1\n' : 'PNG 1 1'; },
    identifyVersion: args => { calls.push(['identify-version', ...args]); return 'ImageMagick 7.1\n'; },
    montageVersion: args => { calls.push(['montage-version', ...args]); return 'ImageMagick 7.1\n'; },
    montage: args => {
      calls.push(['montage', ...args]);
      if (args[0] === '-version') return 'ImageMagick 7.1\n';
      const target = args.at(-1).replace(/^png:/, '');
      fs.writeFileSync(target, Buffer.concat([PNG, Buffer.from(args.slice(0, -1).join('\0'))]));
      return Buffer.alloc(0);
    },
  };
  return { commands, calls };
}

function editContract(f, edit) {
  edit(f.contract);
  fs.writeFileSync(f.contractPath, JSON.stringify(f.contract));
}

function withFixture(callback) {
  const f = fixture();
  try { return callback(f); } finally { fs.rmSync(f.root, { recursive: true, force: true }); }
}

function build(f, options = {}) {
  const out = options.output ?? path.join(f.root, 'out');
  fs.mkdirSync(out, { recursive: true });
  fs.chmodSync(out, 0o700);
  const tool = commandsFor(f);
  const result = buildVisualEvidence({ repoRoot: f.root, runId: RUN_ID, contractPath: f.contractPath, outputDir: out, commands: tool.commands });
  return { out, tool, result };
}

function fails(f, edit, pattern) {
  editContract(f, edit);
  const out = path.join(f.root, 'out'); fs.mkdirSync(out, { mode: 0o700 }); fs.chmodSync(out, 0o700);
  const beforeTemp = new Set(fs.readdirSync(os.tmpdir()));
  assert.throws(() => build(f, { output: out }), pattern);
  assert.deepEqual(fs.readdirSync(out), []);
  assert.deepEqual(fs.readdirSync(os.tmpdir()).filter(name => !beforeTemp.has(name) && name.startsWith('visual-evidence-')), []);
}

test('success publishes outputs, manifest, modes, and distinct tool versions', () => withFixture(f => {
  const { out, tool } = build(f);
  const names = fs.readdirSync(out);
  assert.deepEqual(names, ['first.png', 'inventory.json', 'manifest.sha256', 'summary.json']);
  for (const name of names) assert.equal(fs.statSync(path.join(out, name)).mode & 0o777, 0o600);
  const inventory = JSON.parse(fs.readFileSync(path.join(out, 'inventory.json')));
  assert.deepEqual(inventory.toolVersions, { unzip: 'UnZip 6.0\n', identify: 'ImageMagick 7.1\n', montage: 'ImageMagick 7.1\n' });
  assert.equal(JSON.parse(fs.readFileSync(path.join(out, 'summary.json'))).complete, true);
  assert.match(fs.readFileSync(path.join(out, 'manifest.sha256'), 'utf8'), /first\.png/);
  assert.equal(tool.calls.filter(c => c[0] === 'montage' && c[1] !== '-version').length, 1);
}));

test('trace and image hashes are enforced', () => withFixture(f => {
  editContract(f, c => { c.traceArchives[0].sha256 = '0'.repeat(64); });
  assert.throws(() => build(f), /trace hash mismatch/);
  editContract(f, c => { c.traceArchives[0].sha256 = sha(Buffer.from('synthetic zip')); c.images[0].sha256 = '0'.repeat(64); });
  assert.throws(() => build(f), /image hash mismatch/);
}));

test('unsafe contract paths are rejected', () => withFixture(f => fails(f, c => { c.images[0].path = '../one.png'; }, /images\[0\]\.path is unsafe/)));

test('symlinked source files are rejected', () => withFixture(f => {
  fs.unlinkSync(path.join(f.run, 'one.png')); fs.symlinkSync('two.png', path.join(f.run, 'one.png'));
  assert.throws(() => build(f), /image one\.png contains symlink/);
}));

test('schema unknown keys and wrong schema version are rejected', () => withFixture(f => {
  fails(f, c => { c.extra = true; }, /contract has unknown key extra/);
  editContract(f, c => { delete c.extra; c.schemaVersion = 2; });
  assert.throws(() => build(f), /contract version/);
}));

test('ordering and duplicate image entries are rejected', () => withFixture(f => {
  fails(f, c => { c.images.reverse(); }, /images is not C-sorted/);
  editContract(f, c => { c.images = [{ path: 'one.png', sha256: sha(PNG) }, { path: 'one.png', sha256: sha(PNG) }]; });
  assert.throws(() => build(f), /images contains duplicate/);
}));

test('browser and JavaScript contract modes are mandatory', () => withFixture(f => {
  fails(f, c => { c.browser = 'chromium'; }, /contract version/);
  editContract(f, c => { c.browser = 'firefox'; c.javaScriptEnabled = false; });
  assert.throws(() => build(f), /contract version/);
}));

test('trace rejects alternate browser and JavaScript-off evidence', () => withFixture(f => {
  f.traceBytes = Buffer.from(JSON.stringify({ type: 'context-options', origin: 'library', browserName: 'chromium', options: { javaScriptEnabled: true } }) + '\n');
  assert.throws(() => build(f), /authoritative context/);
  f.traceBytes = Buffer.from(JSON.stringify({ type: 'context-options', origin: 'library', browserName: 'firefox', options: { javaScriptEnabled: false } }) + '\n');
  assert.throws(() => build(f), /explicitly enable JavaScript/);
  f.traceBytes = Buffer.from(JSON.stringify({ type: 'context-options', origin: 'library', browserName: 'firefox', options: {} }) + '\n');
  assert.throws(() => build(f), /explicitly enable JavaScript/);
}));

test('ZIP inventory requires an exact regular-file mode for every member', () => withFixture(f => {
  const out = path.join(f.root, 'out'); fs.mkdirSync(out, { mode: 0o700 }); fs.chmodSync(out, 0o700);
  const { commands } = commandsFor(f);
  commands.unzipVerbose = () => 'Unix file attributes (120777 octal): lrwxrwxrwx\nUnix file attributes (100600 octal): -rw-------\n';
  assert.throws(() => buildVisualEvidence({ repoRoot: f.root, runId: RUN_ID, contractPath: f.contractPath, outputDir: out, commands }), /exact regular-file mode/);
}));

test('actual frame snapshot and screencast resource appear in inventory', () => withFixture(f => {
  const { out } = build(f);
  const report = JSON.parse(fs.readFileSync(path.join(out, 'inventory.json'))).traces[0];
  assert.equal(report.snapshots, 1);
  assert.deepEqual(report.jpegReferences, ['frame.jpeg']);
  assert.ok(report.entries.includes('trace.trace'));
}));

test('trace JSONL accepts a final record without LF and rejects empty or blank records', () => withFixture(f => {
  f.traceBytes = f.traceBytes.subarray(0, f.traceBytes.length - 1);
  assert.equal(JSON.parse(fs.readFileSync(path.join(build(f).out, 'summary.json'))).complete, true);

  f.traceBytes = Buffer.alloc(0);
  assert.throws(() => build(f, { output: path.join(f.root, 'empty') }), /ZIP trace\.trace is empty/);

  f.traceBytes = Buffer.from('{}\n\n');
  assert.throws(() => build(f, { output: path.join(f.root, 'blank') }), /ZIP trace\.trace has blank line/);
}));

test('missing frame snapshot and missing JPEG resource are rejected', () => withFixture(f => {
  f.traceBytes = Buffer.from(JSON.stringify({ type: 'context-options', origin: 'library', browserName: 'firefox', options: { javaScriptEnabled: true } }) + '\n' + JSON.stringify({ type: 'screencast-frame', sha1: 'frame.jpeg' }) + '\n');
  assert.throws(() => build(f), /DOM snapshots are missing/);
  f.traceBytes = Buffer.from(JSON.stringify({ type: 'context-options', origin: 'library', browserName: 'firefox', options: { javaScriptEnabled: true } }) + '\n' + JSON.stringify({ type: 'frame-snapshot' }) + '\n' + JSON.stringify({ type: 'screencast-frame', sha1: 'missing.jpeg' }) + '\n');
  assert.throws(() => build(f), /missing JPEG resource/);
}));

test('empty lists and invalid image metadata are rejected', () => withFixture(f => {
  fails(f, c => { c.groups = []; }, /lists must be nonempty/);
  editContract(f, c => { c.groups = [{ id: 'first', columns: 2, images: ['one.png', 'two.png'] }]; });
  const { commands } = commandsFor(f); commands.identify = () => 'JPEG 0 0';
  const out = path.join(f.root, 'bad-image'); fs.mkdirSync(out, { mode: 0o700 }); fs.chmodSync(out, 0o700);
  assert.throws(() => buildVisualEvidence({ repoRoot: f.root, runId: RUN_ID, contractPath: f.contractPath, outputDir: out, commands }), /not a finite positive PNG/);
}));

test('group contract rejects duplicates, omissions, and cross-group reuse', () => withFixture(f => {
  fails(f, c => { c.groups[0].images = ['one.png']; }, /ungrouped allowlisted image/);
  editContract(f, c => { c.groups[0].images = ['one.png', 'two.png']; c.groups.push({ id: 'second', columns: 1, images: ['two.png'] }); });
  assert.throws(() => build(f), /image appears in multiple groups/);
}));

test('output must start empty and successful output is nonempty', () => withFixture(f => {
  const out = path.join(f.root, 'out'); fs.mkdirSync(out, { mode: 0o700 }); fs.chmodSync(out, 0o700); fs.writeFileSync(path.join(out, 'old'), 'old');
  assert.throws(() => build(f, { output: out }), /output must be an empty mode-0700 regular directory/);
  fs.rmSync(path.join(out, 'old')); build(f, { output: out }); assert.ok(fs.readdirSync(out).length > 0);
}));

test('source run files and contract remain byte-identical', () => withFixture(f => {
  const before = new Map(['contract.json', 'one.png', 'two.png', 'trace.zip'].map(name => [name, fs.readFileSync(path.join(f.run, name))]));
  build(f);
  for (const [name, bytes] of before) assert.deepEqual(fs.readFileSync(path.join(f.run, name)), bytes);
}));

test('failed publication leaves no summary, temporary publish directory, or output residue', () => withFixture(f => {
  const out = path.join(f.root, 'out'); fs.mkdirSync(out, { mode: 0o700 }); fs.chmodSync(out, 0o700);
  const beforeTemp = new Set(fs.readdirSync(os.tmpdir()));
  const { commands } = commandsFor(f);
  commands.montage = args => {
    if (args[0] === '-version') return 'ImageMagick 7.1\n';
    throw new Error('injected montage failure');
  };
  assert.throws(() => buildVisualEvidence({ repoRoot: f.root, runId: RUN_ID, contractPath: f.contractPath, outputDir: out, commands }), /injected montage failure/);
  assert.equal(fs.existsSync(path.join(out, 'summary.json')), false);
  assert.deepEqual(fs.readdirSync(out), []);
  assert.deepEqual(fs.readdirSync(os.tmpdir()).filter(name => !beforeTemp.has(name) && name.startsWith('visual-evidence-')), []);
}));

test('two independent builds produce byte-deterministic output', () => withFixture(f => {
  const first = build(f).out;
  const firstBytes = new Map(fs.readdirSync(first).map(name => [name, fs.readFileSync(path.join(first, name))]));
  const second = path.join(f.root, 'second'); build(f, { output: second });
  assert.deepEqual(fs.readdirSync(second), sorted([...firstBytes.keys()]));
  for (const [name, bytes] of firstBytes) assert.deepEqual(fs.readFileSync(path.join(second, name)), bytes);
}));

test('version shims are distinguished from montage output and never write version files', () => withFixture(f => {
  const { out, tool } = build(f);
  assert.ok(tool.calls.some(c => c[0] === 'unzip-list' && c[1] === '-Z1'));
  assert.ok(tool.calls.some(c => c[0] === 'unzip-read' && c[1] === '-v'));
  assert.ok(tool.calls.some(c => c[0] === 'identify-version' && c[1] === '-version'));
  assert.ok(tool.calls.some(c => c[0] === 'montage-version' && c[1] === '-version'));
  assert.equal(fs.readdirSync(f.root, { recursive: true }).some(name => String(name).endsWith('-version')), false);
  assert.ok(fs.statSync(path.join(out, 'first.png')).size > PNG.length);
}));

test('pinned-tools integration exercises real unzip, identify, and montage', { skip: !process.env.CI_AGENT_TOOLS }, () => withFixture(f => {
  const zipBytes = storedZip([
    ['resources/frame.jpeg', Buffer.from('jpeg-resource')],
    ['trace.trace', f.traceBytes],
  ]);
  fs.writeFileSync(path.join(f.run, 'trace.zip'), zipBytes);
  editContract(f, contract => { contract.traceArchives[0].sha256 = sha(zipBytes); });
  const out = path.join(f.root, 'real-output');
  fs.mkdirSync(out, { mode: 0o700 });
  fs.chmodSync(out, 0o700);
  buildVisualEvidence({ repoRoot: f.root, runId: RUN_ID, contractPath: f.contractPath, outputDir: out });
  const summary = JSON.parse(fs.readFileSync(path.join(out, 'summary.json')));
  assert.equal(summary.complete, true);
  assert.deepEqual(summary.sheets, ['first.png']);
  assert.equal(fs.statSync(path.join(out, 'first.png')).size > 0, true);
}));
