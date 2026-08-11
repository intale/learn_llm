import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { verifyRun } from '../luna/verify-run.mjs';

const runId = '20260811T120000Z-verifier-fixture-01';

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'luna-verifier-'));
  const run = path.join(root, '.build', 'runs', runId);
  const out = path.join(root, 'output');
  fs.mkdirSync(run, { recursive: true });
  fs.mkdirSync(out, { mode: 0o700 });
  fs.writeFileSync(path.join(root, 'tracked.txt'), 'tracked\n');
  const git = (args) => execFileSync('git', ['-C', root, ...args], { stdio: 'ignore' });
  git(['init', '-q']);
  git(['config', 'user.email', 'test@example.invalid']);
  git(['config', 'user.name', 'Test']);
  git(['add', 'tracked.txt']);
  git(['commit', '-qm', 'fixture']);
  return { root, run, out };
}

function hash(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }

function makeManifest(f, patch = {}) {
  const tracked = path.join(f.root, 'tracked.txt');
  const manifest = {
    schemaVersion: 1,
    runId,
    authorities: {
      files: [{ path: 'tracked.txt', sha256: hash(tracked) }],
      sha256Manifests: [{ path: `.build/runs/${runId}/files.sha256`, base: 'repository', expectedCount: 1 }],
      statusFiles: [{ path: `.build/runs/${runId}/status.txt` }],
    },
    scope: { declaredOutputs: [`.build/runs/${runId}/files.sha256`, `.build/runs/${runId}/manifest.json`, `.build/runs/${runId}/status.txt`] },
    ...patch,
  };
  fs.writeFileSync(path.join(f.run, 'files.sha256'), `${hash(tracked)}  tracked.txt\n`);
  fs.writeFileSync(path.join(f.run, 'status.txt'), '0\n');
  fs.writeFileSync(path.join(f.run, 'manifest.json'), JSON.stringify(manifest));
  return path.join(f.run, 'manifest.json');
}

function check(f, manifest = makeManifest(f)) {
  return verifyRun({ repoRoot: f.root, runId, manifestPath: manifest, outputDir: f.out });
}

test('success writes deterministic mode-0600 report', () => {
  const f = fixture();
  const result = check(f);
  assert.equal(result.status, 'success');
  assert.equal(fs.statSync(path.join(f.out, 'authority-report.json')).mode & 0o777, 0o600);
  const first = fs.readFileSync(path.join(f.out, 'authority-report.json'), 'utf8');
  assert.equal(first, '{"schemaVersion":1,"runId":"20260811T120000Z-verifier-fixture-01","status":"success","errors":[]}\n');
});

test('rejects schema, run, path, ordering, hash, count, and scope violations', () => {
  for (const mutate of [
    (m) => { delete m.schemaVersion; },
    (m) => { m.schemaVersion = 2; },
    (m) => { m.authorities.files[0].sha256 = m.authorities.files[0].sha256.toUpperCase(); },
    (m) => { m.authorities.files.push({ path: 'aaa.txt', sha256: '0'.repeat(64) }); },
    (m) => { m.authorities.sha256Manifests[0].expectedCount = 2; },
    (m) => { m.scope.declaredOutputs = []; },
  ]) {
    const f = fixture();
    const m = JSON.parse(fs.readFileSync(makeManifest(f), 'utf8'));
    mutate(m);
    fs.writeFileSync(path.join(f.run, 'manifest.json'), JSON.stringify(m));
    assert.equal(check(f, path.join(f.run, 'manifest.json')).status, 'fail');
  }
});

test('enforces manifest-directory base, exhaustive roots, and exclusions', () => {
  const f = fixture();
  fs.mkdirSync(path.join(f.run, 'tree'));
  fs.writeFileSync(path.join(f.run, 'tree', 'a.txt'), 'a');
  fs.writeFileSync(path.join(f.run, 'tree', 'b.txt'), 'b');
  const m = JSON.parse(fs.readFileSync(makeManifest(f), 'utf8'));
  m.authorities.sha256Manifests = [{ path: `.build/runs/${runId}/tree.sha256`, base: 'manifest-directory', expectedCount: 2, exhaustiveRoot: 'tree' }];
  m.authorities.files = [];
  m.authorities.statusFiles = [];
  m.scope.declaredOutputs = [`.build/runs/${runId}/files.sha256`, `.build/runs/${runId}/manifest.json`, `.build/runs/${runId}/status.txt`, `.build/runs/${runId}/tree.sha256`, `.build/runs/${runId}/tree/a.txt`, `.build/runs/${runId}/tree/b.txt`];
  fs.writeFileSync(path.join(f.run, 'tree.sha256'), `${hash(path.join(f.run, 'tree', 'a.txt'))}  tree/a.txt\n${hash(path.join(f.run, 'tree', 'b.txt'))}  tree/b.txt\n`);
  fs.writeFileSync(path.join(f.run, 'manifest.json'), JSON.stringify(m));
  assert.equal(check(f, path.join(f.run, 'manifest.json')).status, 'success');

  const extra = fixture();
  fs.mkdirSync(path.join(extra.run, 'tree'));
  for (const [name, value] of [['a.txt', 'a'], ['b.txt', 'b'], ['extra.txt', 'x']]) fs.writeFileSync(path.join(extra.run, 'tree', name), value);
  const extraManifest = JSON.parse(fs.readFileSync(makeManifest(extra), 'utf8'));
  extraManifest.authorities.sha256Manifests = [{ path: `.build/runs/${runId}/tree.sha256`, base: 'manifest-directory', expectedCount: 2, exhaustiveRoot: 'tree' }];
  extraManifest.authorities.files = [];
  extraManifest.authorities.statusFiles = [];
  extraManifest.scope.declaredOutputs = [`.build/runs/${runId}/files.sha256`, `.build/runs/${runId}/manifest.json`, `.build/runs/${runId}/status.txt`, `.build/runs/${runId}/tree.sha256`, `.build/runs/${runId}/tree/a.txt`, `.build/runs/${runId}/tree/b.txt`, `.build/runs/${runId}/tree/extra.txt`];
  fs.writeFileSync(path.join(extra.run, 'tree.sha256'), `${hash(path.join(extra.run, 'tree', 'a.txt'))}  tree/a.txt\n${hash(path.join(extra.run, 'tree', 'b.txt'))}  tree/b.txt\n`);
  fs.writeFileSync(path.join(extra.run, 'manifest.json'), JSON.stringify(extraManifest));
  assert.equal(check(extra, path.join(extra.run, 'manifest.json')).status, 'fail');

  const excludedFixture = fixture();
  fs.mkdirSync(path.join(excludedFixture.run, 'tree', 'hidden'), { recursive: true });
  fs.writeFileSync(path.join(excludedFixture.run, 'tree', 'a.txt'), 'a');
  fs.writeFileSync(path.join(excludedFixture.run, 'tree', 'hidden', 'ignored.txt'), 'ignored');
  const excludedManifest = JSON.parse(fs.readFileSync(makeManifest(excludedFixture), 'utf8'));
  excludedManifest.authorities.sha256Manifests = [{ path: `.build/runs/${runId}/tree.sha256`, base: 'manifest-directory', expectedCount: 1, exhaustiveRoot: 'tree', excludes: ['tree/hidden'] }];
  excludedManifest.authorities.files = [];
  excludedManifest.authorities.statusFiles = [];
  excludedManifest.scope.declaredOutputs = [`.build/runs/${runId}/files.sha256`, `.build/runs/${runId}/manifest.json`, `.build/runs/${runId}/status.txt`, `.build/runs/${runId}/tree.sha256`, `.build/runs/${runId}/tree/a.txt`, `.build/runs/${runId}/tree/hidden/ignored.txt`];
  fs.writeFileSync(path.join(excludedFixture.run, 'tree.sha256'), `${hash(path.join(excludedFixture.run, 'tree', 'a.txt'))}  tree/a.txt\n`);
  fs.writeFileSync(path.join(excludedFixture.run, 'manifest.json'), JSON.stringify(excludedManifest));
  assert.equal(check(excludedFixture, path.join(excludedFixture.run, 'manifest.json')).status, 'success');

  const bad = fixture();
  const badManifest = JSON.parse(fs.readFileSync(makeManifest(bad), 'utf8'));
  badManifest.authorities.sha256Manifests[0].exhaustiveRoot = 'tracked.txt';
  badManifest.authorities.sha256Manifests[0].excludes = ['outside'];
  fs.writeFileSync(path.join(bad.run, 'manifest.json'), JSON.stringify(badManifest));
  assert.equal(check(bad, path.join(bad.run, 'manifest.json')).status, 'fail');
});

test('rejects symlinks, malformed manifests/status, scope drift, and nonempty output without overwrite', () => {
  const f = fixture();
  fs.symlinkSync(path.join(f.root, 'tracked.txt'), path.join(f.run, 'link.txt'));
  const m = JSON.parse(fs.readFileSync(makeManifest(f), 'utf8'));
  m.authorities.files.push({ path: `.build/runs/${runId}/link.txt`, sha256: '0'.repeat(64) });
  m.authorities.files.sort((a, b) => a.path.localeCompare(b.path));
  fs.writeFileSync(path.join(f.run, 'manifest.json'), JSON.stringify(m));
  assert.equal(check(f, path.join(f.run, 'manifest.json')).status, 'fail');

  const status = fixture();
  const statusManifest = makeManifest(status);
  fs.writeFileSync(path.join(status.run, 'status.txt'), '01\n');
  assert.equal(check(status, statusManifest).status, 'fail');

  const nonempty = fixture();
  makeManifest(nonempty);
  fs.writeFileSync(path.join(nonempty.out, 'sentinel'), 'keep');
  assert.equal(check(nonempty).status, 'fail');
  assert.equal(fs.readFileSync(path.join(nonempty.out, 'sentinel'), 'utf8'), 'keep');
  assert.equal(fs.existsSync(path.join(nonempty.out, 'authority-report.json')), false);

  const wrongMode = fixture();
  makeManifest(wrongMode);
  fs.chmodSync(wrongMode.out, 0o755);
  assert.equal(check(wrongMode).status, 'fail');
  assert.equal(fs.existsSync(path.join(wrongMode.out, 'authority-report.json')), false);
});

test('accepts an exact empty sha256 manifest and rejects schema/path/order variants', () => {
  const f = fixture();
  const m = JSON.parse(fs.readFileSync(makeManifest(f), 'utf8'));
  m.authorities.files = [];
  m.authorities.statusFiles = [];
  m.authorities.sha256Manifests = [{ path: `.build/runs/${runId}/empty.sha256`, base: 'repository', expectedCount: 0 }];
  m.scope.declaredOutputs = [`.build/runs/${runId}/empty.sha256`, `.build/runs/${runId}/manifest.json`];
  fs.unlinkSync(path.join(f.run, 'files.sha256'));
  fs.unlinkSync(path.join(f.run, 'status.txt'));
  fs.writeFileSync(path.join(f.run, 'empty.sha256'), '');
  fs.writeFileSync(path.join(f.run, 'manifest.json'), JSON.stringify(m));
  assert.equal(check(f, path.join(f.run, 'manifest.json')).status, 'success');

  const bad = [
    (x) => { x.unknown = 1; },
    (x) => { x.authorities.unknown = []; },
    (x) => { x.authorities.files[0].unknown = 1; },
    (x) => { x.authorities.sha256Manifests[0].unknown = 1; },
    (x) => { x.authorities.statusFiles[0].unknown = 1; },
    (x) => { x.scope.unknown = 1; },
    (x) => { x.scope.declaredOutputs = ['z', 'a']; },
    (x) => { x.authorities.files.push({ ...x.authorities.files[0] }); },
    (x) => { x.authorities.files.push({ path: 'aaa.txt', sha256: '0'.repeat(64) }); },
    (x) => { x.authorities.sha256Manifests.push({ ...x.authorities.sha256Manifests[0] }); },
    (x) => { x.authorities.statusFiles.push({ ...x.authorities.statusFiles[0] }); },
  ];
  for (const mutate of bad) {
    const g = fixture();
    const manifest = makeManifest(g);
    const value = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    mutate(value);
    fs.writeFileSync(manifest, JSON.stringify(value));
    assert.equal(check(g, manifest).status, 'fail');
  }
});

test('rejects unsafe paths, run mismatches, outside-run manifests, and symlink ancestors', () => {
  const paths = ['/absolute', 'a\\b', 'a/../b', 'a//b', 'a\tb'];
  for (const unsafe of paths) {
    const f = fixture();
    const manifest = makeManifest(f);
    const value = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    value.scope.declaredOutputs = [unsafe];
    fs.writeFileSync(manifest, JSON.stringify(value));
    assert.equal(check(f, manifest).status, 'fail', unsafe);
  }
  const mismatch = fixture();
  const mismatchManifest = makeManifest(mismatch);
  assert.equal(verifyRun({ repoRoot: mismatch.root, runId: '20260811T120000Z-other-01', manifestPath: mismatchManifest, outputDir: mismatch.out }).status, 'fail');

  const outside = fixture();
  const outsideManifest = path.join(outside.root, 'outside.json');
  fs.writeFileSync(outsideManifest, fs.readFileSync(makeManifest(outside)));
  assert.equal(check(outside, outsideManifest).status, 'fail');

  const linked = fixture();
  const real = path.join(linked.root, 'real-run');
  fs.renameSync(linked.run, real);
  fs.symlinkSync(real, linked.run);
  assert.equal(check(linked, path.join(linked.run, 'manifest.json')).status, 'fail');
});

test('enforces strict sha rows, hashes, counts, and exhaustive repository/manifest-directory sets', () => {
  for (const content of [
    `${'0'.repeat(64)} tracked.txt`,
    `${'0'.repeat(64)}\ttracked.txt\n`,
    `${'0'.repeat(64)}  tracked.txt\r\n`,
    `${'0'.repeat(64)}  tracked.txt`,
    `${'0'.repeat(64)}  tracked.txt\n${'0'.repeat(64)}  tracked.txt\n`,
  ]) {
    const f = fixture();
    const manifest = makeManifest(f);
    fs.writeFileSync(path.join(f.run, 'files.sha256'), content);
    assert.equal(check(f, manifest).status, 'fail');
  }
  const variants = ['+1\n', '01\n', ' 1\n', '1\r\n', ''];
  for (const content of variants) {
    const f = fixture();
    const manifest = makeManifest(f);
    fs.writeFileSync(path.join(f.run, 'status.txt'), content);
    assert.equal(check(f, manifest).status, 'fail');
  }
  const negative = fixture();
  const negativeManifest = makeManifest(negative);
  fs.writeFileSync(path.join(negative.run, 'status.txt'), '-12\n');
  assert.equal(check(negative, negativeManifest).status, 'success');
});

test('reports deterministic failures, preserves empty-output atomicity, and leaves no temporary files', () => {
  const a = fixture();
  const manifest = makeManifest(a);
  fs.writeFileSync(path.join(a.run, 'status.txt'), 'bad\n');
  const first = check(a, manifest);
  const bytes = fs.readFileSync(path.join(a.out, 'authority-report.json'));
  const b = fixture();
  const manifestB = makeManifest(b);
  fs.writeFileSync(path.join(b.run, 'status.txt'), 'bad\n');
  const second = check(b, manifestB);
  assert.equal(first.status, 'fail');
  assert.equal(second.status, 'fail');
  assert.equal(bytes.toString('utf8').replaceAll(runId, 'RUN'), fs.readFileSync(path.join(b.out, 'authority-report.json'), 'utf8').replaceAll(runId, 'RUN'));
  assert.deepEqual(fs.readdirSync(a.out), ['authority-report.json']);
  assert.equal(fs.statSync(path.join(a.out, 'authority-report.json')).mode & 0o777, 0o600);
});

test('course wrapper uses bounded fake-Docker runtime and rejects unsafe inputs', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'luna-wrapper-'));
  const tools = path.join(root, 'tools');
  const run = path.join(root, '.build', 'runs', runId);
  const fakeBin = path.dirname(fileURLToPath(new URL('./docker', import.meta.url)));
  fs.mkdirSync(path.join(tools, 'luna'), { recursive: true });
  fs.mkdirSync(path.join(tools, 'terra'));
  fs.mkdirSync(run, { recursive: true });
  fs.copyFileSync(new URL('../luna/verify-run.mjs', import.meta.url), path.join(tools, 'luna', 'verify-run.mjs'));
  fs.copyFileSync(new URL('./verify-run.test.mjs', import.meta.url), path.join(tools, 'tests-placeholder.mjs'));
  for (const file of ['Dockerfile', 'toolchain.lock.json']) fs.writeFileSync(path.join(tools, file), 'fixture\n');
  for (const file of ['visual-evidence.mjs', 'visual-evidence.test.mjs']) fs.writeFileSync(path.join(tools, file.includes('test') ? 'tests-placeholder-visual.mjs' : 'terra/visual-evidence.mjs'), 'fixture\n');
  fs.mkdirSync(path.join(tools, 'tests'), { recursive: true });
  fs.copyFileSync(path.join(tools, 'tests-placeholder.mjs'), path.join(tools, 'tests', 'verify-run.test.mjs'));
  fs.writeFileSync(path.join(tools, 'tests', 'visual-evidence.test.mjs'), 'fixture\n');
  fs.copyFileSync(new URL('./docker', import.meta.url), path.join(tools, 'tests', 'docker'));
  const courseSource = process.env.COURSE_SOURCE || new URL('../../course', import.meta.url);
  fs.copyFileSync(courseSource, path.join(root, 'course'));
  fs.chmodSync(path.join(root, 'course'), 0o755);
  fs.writeFileSync(path.join(run, 'input.json'), '{}\n');
  const sourcePaths = ['Dockerfile', 'luna/verify-run.mjs', 'terra/visual-evidence.mjs', 'tests/docker', 'tests/verify-run.test.mjs', 'tests/visual-evidence.test.mjs'];
  const sourceLines = sourcePaths.map((p) => `${hash(path.join(tools, p))}  ${p}\n`).join('');
  const sourceHash = crypto.createHash('sha256').update(sourceLines).digest('hex');
  const lockHash = hash(path.join(tools, 'toolchain.lock.json'));
  const log = path.join(root, 'docker.log');
  const fakeEnvironment = {
    FAKE_DOCKER_LOG: log,
    FAKE_DOCKER_LOCK_HASH: lockHash,
    FAKE_DOCKER_SOURCE_HASH: sourceHash,
    FAKE_DOCKER_BASE_DIGEST: 'sha256:5b8f294aff9041b7191c34a4bab3ac270157a28774d4b0660e9743297b697e48',
    FAKE_DOCKER_SNAPSHOT: '20260811T091000Z',
    FAKE_DOCKER_IMAGE_ID: 'image',
  };
  const invoke = (args, overrides = {}) => execFileSync('bash', [path.join(root, 'course'), ...args], {
    env: { ...process.env, ...fakeEnvironment, ...overrides, PATH: `${fakeBin}:${process.env.PATH}` },
    encoding: 'utf8',
  });
  try {
    invoke(['tools', 'verify-run', runId, '--manifest', 'input.json']);
  } catch (error) {
    // Some restricted Node harnesses report EPERM after a zero-exit child;
    // the fake Docker log is still authoritative for this bounded probe.
    if (error.code !== 'EPERM' || error.status !== 0) throw error;
  }
  const lines = fs.readFileSync(log, 'utf8').split('\n').filter(Boolean).map((line) => line.split('\0'));
  const runArgs = lines.find((args) => args.includes('run'));
  assert.ok(runArgs);
  for (const required of ['--network', 'none', '--read-only', '--cap-drop=ALL', '--security-opt', 'no-new-privileges', '--user', '--env', 'LC_ALL=C', '--env', 'TZ=UTC', '--mount']) assert.ok(runArgs.includes(required), required);
  for (const forbidden of ['--privileged', '--net=host', '--publish', '-p', '/var/run/docker.sock']) assert.equal(runArgs.includes(forbidden), false, forbidden);
  const mountValues = runArgs.filter((value, index) => runArgs[index - 1] === '--mount');
  assert.ok(mountValues.includes(`type=bind,src=${root},dst=/workspace,readonly`));
  assert.ok(mountValues.includes(`type=bind,src=${path.join(run, 'tooling', 'verify-run')},dst=/output`));
  assert.equal(mountValues.some((value) => value.endsWith(',rw')), false);

  // A second invocation cannot overwrite prior evidence, and a reused parent
  // with the wrong mode is rejected before Docker is called.
  assert.throws(() => invoke(['tools', 'verify-run', runId, '--manifest', 'input.json']));
  fs.rmSync(path.join(run, 'tooling'), { recursive: true, force: true });
  fs.mkdirSync(path.join(run, 'tooling'), { mode: 0o755 });
  assert.throws(() => invoke(['tools', 'verify-run', runId, '--manifest', 'input.json']));
  fs.chmodSync(path.join(run, 'tooling'), 0o700);
  assert.throws(() => invoke(
    ['tools', 'verify-run', runId, '--manifest', 'input.json'],
    { FAKE_DOCKER_LOCK_HASH: '0'.repeat(64) },
  ));

  const unsafe = invoke;
  assert.throws(() => unsafe(['tools', 'verify-run', runId, '--manifest', '../input.json']));
  fs.rmSync(path.join(tools, 'luna', 'verify-run.mjs'));
  assert.throws(() => unsafe(['tools', 'verify-run', runId, '--manifest', 'input.json']));
});
