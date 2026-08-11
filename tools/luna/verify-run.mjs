/**
 * Offline authority verifier, schema v1.
 *
 * The manifest deliberately has a small, closed schema.  It authenticates
 * files, strict sha256sum-style manifests, integer status files, and the exact
 * current worktree scope.  It never writes below the repository.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 1;
const HASH = /^[0-9a-f]{64}$/;
const RUN_ID = /^[0-9]{8}T[0-9]{6}Z-[a-z0-9][a-z0-9-]*-[0-9]{2}$/;
const INTEGER_FILE = /^(?:0|-?[1-9][0-9]*)\n$/;
// Exactly two ASCII spaces separate digest and path, and exactly one LF ends
// every row.  A row path is validated separately as a normalized path.
const MANIFEST_ROW = /^([0-9a-f]{64})  ([^\r\n]+)\n$/;

export class VerificationError extends Error {}

function fail(message) {
  throw new VerificationError(message);
}

function object(value, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${label} must be an object`);
  }
  return value;
}

function exactKeys(value, allowed, label) {
  object(value, label);
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) fail(`${label} has unknown key: ${key}`);
  }
  for (const key of allowed) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      fail(`${label} is missing key: ${key}`);
    }
  }
}

function optionalKeys(value, required, optional, label) {
  object(value, label);
  const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(`${label} has unknown key: ${key}`);
  }
  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      fail(`${label} is missing key: ${key}`);
    }
  }
}

function cCompare(a, b) {
  return Buffer.from(a, 'utf8').compare(Buffer.from(b, 'utf8'));
}

function assertRepoPath(value, label) {
  if (typeof value !== 'string' || value.length === 0 || value.includes('\0')) {
    fail(`${label} must be a non-empty repository-relative path`);
  }
  // Match the wrapper's transport-safe path grammar.  In particular, do not
  // allow control characters, whitespace, drive prefixes, or alternate path
  // syntaxes to enter a manifest that will later be interpreted by another
  // tool.
  if (!/^[A-Za-z0-9._/-]+$/.test(value) || value.startsWith('/') || value.includes('\\') || value.includes('//')) {
    fail(`${label} is not a normalized repository-relative path`);
  }
  const parts = value.split('/');
  if (parts.some((part) => part.length === 0 || part === '.' || part === '..')) {
    fail(`${label} contains a path escape or empty component`);
  }
  return value;
}

function assertHash(value, label) {
  if (typeof value !== 'string' || !HASH.test(value)) {
    fail(`${label} must be 64 lower-case hex characters`);
  }
}

function assertCount(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    fail(`${label} must be a non-negative safe integer`);
  }
}

function sortedUnique(values, label) {
  let previous;
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) fail(`${label} contains a duplicate path: ${value}`);
    if (previous !== undefined && cCompare(previous, value) >= 0) {
      fail(`${label} is not in C order: ${value}`);
    }
    seen.add(value);
    previous = value;
  }
}

function canonicalRoot(root) {
  try {
    const stat = fs.lstatSync(root);
    if (stat.isSymbolicLink() || !stat.isDirectory()) fail('repository root is not a regular directory');
    return fs.realpathSync(root);
  } catch (error) {
    if (error instanceof VerificationError) throw error;
    fail('repository root does not exist');
  }
}

function inside(root, target) {
  return target === root || target.startsWith(`${root}${path.sep}`);
}

/** Resolve and authenticate an existing repository-relative regular file/dir. */
function safeExistingPath(repoRoot, relative, label, { directory = false } = {}) {
  assertRepoPath(relative, label);
  const lexical = path.resolve(repoRoot, ...relative.split('/'));
  if (!inside(repoRoot, lexical)) fail(`${label} escapes the repository`);

  let current = repoRoot;
  const components = path.relative(repoRoot, lexical).split(path.sep);
  for (const component of components) {
    current = path.join(current, component);
    let stat;
    try { stat = fs.lstatSync(current); } catch { fail(`${label} is missing: ${relative}`); }
    if (stat.isSymbolicLink()) fail(`${label} contains a symlink: ${relative}`);
  }
  let stat;
  try { stat = fs.lstatSync(lexical); } catch { fail(`${label} is missing: ${relative}`); }
  if (stat.isSymbolicLink()) fail(`${label} is a symlink: ${relative}`);
  if (directory ? !stat.isDirectory() : !stat.isFile()) {
    fail(`${label} is not a regular ${directory ? 'directory' : 'file'}: ${relative}`);
  }
  const canonical = fs.realpathSync(lexical);
  if (!inside(repoRoot, canonical)) fail(`${label} target escapes the repository: ${relative}`);
  return canonical;
}

function readHash(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function parseShaManifest(content, label) {
  // A byte-for-byte UTF-8 round trip rejects malformed UTF-8 rather than
  // silently replacing it with U+FFFD during fs.readFile({encoding:'utf8'}).
  const bytes = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
  // A declared zero-entry manifest is represented by exactly zero bytes.
  // Non-empty manifests retain the strict sha256sum LF-row contract below.
  if (bytes.length === 0) return [];
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  if (!text.endsWith('\n')) fail(`${label} must end with LF`);
  const rows = [];
  let start = 0;
  while (start < text.length) {
    const end = text.indexOf('\n', start);
    const line = end === -1 ? text.slice(start) : text.slice(start, end + 1);
    const match = MANIFEST_ROW.exec(line);
    if (!match) fail(`${label} has a malformed row`);
    const rowPath = assertRepoPath(match[2], `${label} row path`);
    rows.push({ sha256: match[1], path: rowPath });
    start = end + 1;
  }
  sortedUnique(rows.map((row) => row.path), `${label} rows`);
  return rows;
}

function relativeToRepo(repoRoot, target, label) {
  const relative = path.relative(repoRoot, target).split(path.sep).join('/');
  assertRepoPath(relative, label);
  return relative;
}

function resolveAgainstBase(repoRoot, manifestFile, base, relative, label) {
  assertRepoPath(relative, label);
  const baseDirectory = base === 'repository' ? repoRoot : path.dirname(manifestFile);
  const lexical = path.resolve(baseDirectory, ...relative.split('/'));
  if (!inside(repoRoot, lexical)) fail(`${label} escapes the repository`);
  return lexical;
}

function excluded(candidate, excludes) {
  return excludes.some((entry) => candidate === entry || candidate.startsWith(`${entry}/`));
}

function discoverFiles(root, rootRelative, excludes, label) {
  const found = [];
  function walk(directory, relativeDirectory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const relative = `${relativeDirectory}/${entry.name}`;
      const target = path.join(directory, entry.name);
      // Do this before applying excludes: an excluded symlink is still an
      // unsafe filesystem object and must not become an escape hatch.
      if (entry.isSymbolicLink()) fail(`${label} contains a symlink: ${relative}`);
      if (entry.isDirectory()) walk(target, relative);
      else if (entry.isFile()) {
        if (!excluded(relative, excludes)) found.push(relative);
      } else {
        fail(`${label} contains a non-regular entry: ${relative}`);
      }
    }
  }
  walk(root, rootRelative);
  found.sort(cCompare);
  return found;
}

function parseInputManifest(raw) {
  let value;
  try { value = JSON.parse(raw); } catch { fail('manifest is not valid JSON'); }
  exactKeys(value, ['schemaVersion', 'runId', 'authorities', 'scope'], 'manifest');
  if (value.schemaVersion !== SCHEMA_VERSION) fail('manifest schemaVersion must be 1');
  if (typeof value.runId !== 'string') fail('runId must be a string');

  object(value.authorities, 'authorities');
  exactKeys(value.authorities, ['files', 'sha256Manifests', 'statusFiles'], 'authorities');
  for (const key of ['files', 'sha256Manifests', 'statusFiles']) {
    if (!Array.isArray(value.authorities[key])) fail(`authorities.${key} must be an array`);
  }
  for (const [index, entry] of value.authorities.files.entries()) {
    exactKeys(entry, ['path', 'sha256'], `authorities.files[${index}]`);
    assertRepoPath(entry.path, `authorities.files[${index}].path`);
    assertHash(entry.sha256, `authorities.files[${index}].sha256`);
  }
  sortedUnique(value.authorities.files.map((entry) => entry.path), 'authorities.files');
  for (const [index, entry] of value.authorities.sha256Manifests.entries()) {
    optionalKeys(entry, ['path', 'base', 'expectedCount'], ['exhaustiveRoot', 'excludes'], `authorities.sha256Manifests[${index}]`);
    assertRepoPath(entry.path, `authorities.sha256Manifests[${index}].path`);
    if (entry.base !== 'repository' && entry.base !== 'manifest-directory') {
      fail(`authorities.sha256Manifests[${index}].base is invalid`);
    }
    assertCount(entry.expectedCount, `authorities.sha256Manifests[${index}].expectedCount`);
    const hasRoot = Object.prototype.hasOwnProperty.call(entry, 'exhaustiveRoot');
    const hasExcludes = Object.prototype.hasOwnProperty.call(entry, 'excludes');
    if (hasExcludes && !hasRoot) fail(`authorities.sha256Manifests[${index}].excludes requires exhaustiveRoot`);
    if (hasRoot) assertRepoPath(entry.exhaustiveRoot, `authorities.sha256Manifests[${index}].exhaustiveRoot`);
    if (hasExcludes) {
      if (!Array.isArray(entry.excludes)) fail(`authorities.sha256Manifests[${index}].excludes must be an array`);
      for (const [excludeIndex, exclude] of entry.excludes.entries()) {
        assertRepoPath(exclude, `authorities.sha256Manifests[${index}].excludes[${excludeIndex}]`);
      }
      sortedUnique(entry.excludes, `authorities.sha256Manifests[${index}].excludes`);
    }
  }
  sortedUnique(value.authorities.sha256Manifests.map((entry) => entry.path), 'authorities.sha256Manifests');
  for (const [index, entry] of value.authorities.statusFiles.entries()) {
    exactKeys(entry, ['path'], `authorities.statusFiles[${index}]`);
    assertRepoPath(entry.path, `authorities.statusFiles[${index}].path`);
  }
  sortedUnique(value.authorities.statusFiles.map((entry) => entry.path), 'authorities.statusFiles');

  exactKeys(value.scope, ['declaredOutputs'], 'scope');
  if (!Array.isArray(value.scope.declaredOutputs)) fail('scope.declaredOutputs must be an array');
  for (const [index, output] of value.scope.declaredOutputs.entries()) {
    assertRepoPath(output, `scope.declaredOutputs[${index}]`);
  }
  sortedUnique(value.scope.declaredOutputs, 'scope.declaredOutputs');
  return value;
}

function gitScope(repoRoot) {
  const runGit = (args) => {
    try {
      return execFileSync('git', ['-C', repoRoot, ...args], {
        encoding: 'buffer', stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch {
      fail('cannot inspect git scope');
    }
  };
  const nulPaths = (buffer) => buffer.toString('utf8').split('\0').filter(Boolean);
  const changed = [
    ...nulPaths(runGit(['diff', '--name-only', '-z', 'HEAD'])),
    ...nulPaths(runGit(['ls-files', '--others', '--exclude-standard', '-z'])),
  ];
  const unique = new Set();
  for (const entry of changed) {
    // Git emits repository-relative names.  Validate them instead of trusting
    // that assumption so backslashes and path escapes fail closed.
    assertRepoPath(entry, 'git scope path');
    unique.add(entry);
  }
  return [...unique].sort(cCompare);
}

function verifyGitScope(repoRoot, declaredOutputs) {
  const actual = gitScope(repoRoot);
  if (actual.length !== declaredOutputs.length || actual.some((entry, index) => entry !== declaredOutputs[index])) {
    fail(`scope mismatch (declared ${declaredOutputs.length}, actual ${actual.length})`);
  }
}

function verifyManifest(value, repoRoot, runId, manifestFile) {
  if (value.runId !== runId) fail('manifest runId does not match CLI run ID');
  const authorityPaths = new Set();
  const claim = (relative, label) => {
    if (authorityPaths.has(relative)) fail(`duplicate authority path: ${relative}`);
    authorityPaths.add(relative);
    return safeExistingPath(repoRoot, relative, label);
  };

  for (const entry of value.authorities.files) {
    const file = claim(entry.path, `authority file ${entry.path}`);
    if (readHash(file) !== entry.sha256) fail(`authority hash drift: ${entry.path}`);
  }

  for (const [index, entry] of value.authorities.sha256Manifests.entries()) {
    const manifestFilePath = claim(entry.path, `sha256 manifest ${entry.path}`);
    const rows = parseShaManifest(fs.readFileSync(manifestFilePath), `sha256 manifest ${entry.path}`);
    if (rows.length !== entry.expectedCount) fail(`sha256 manifest count drift: ${entry.path}`);
    const excludes = entry.excludes ?? [];
    let exhaustiveRoot;
    if (entry.exhaustiveRoot !== undefined) {
      exhaustiveRoot = resolveAgainstBase(repoRoot, manifestFilePath, entry.base, entry.exhaustiveRoot, `sha256Manifests[${index}].exhaustiveRoot`);
      const rootRepositoryPath = relativeToRepo(repoRoot, exhaustiveRoot, `sha256Manifests[${index}].exhaustiveRoot`);
      safeExistingPath(repoRoot, rootRepositoryPath, `sha256Manifests[${index}].exhaustiveRoot`, { directory: true });
      // Rows and exclusions are expressed in the same base coordinate system;
      // rootRelative is therefore the exact prefix expected in each row.
      const rootRelative = entry.exhaustiveRoot;
      for (const exclude of excludes) {
        if (exclude === rootRelative || !exclude.startsWith(`${rootRelative}/`)) {
          fail(`sha256 manifest exclude is outside exhaustive root: ${exclude}`);
        }
      }
      const expected = discoverFiles(exhaustiveRoot, rootRelative, excludes, `sha256 manifest ${entry.path}`);
      const listed = rows.map((row) => row.path);
      if (expected.length !== listed.length || expected.some((filePath, rowIndex) => filePath !== listed[rowIndex])) {
        fail(`sha256 manifest file-set drift: ${entry.path}`);
      }
    }
    for (const row of rows) {
      const target = resolveAgainstBase(repoRoot, manifestFilePath, entry.base, row.path, `sha256 manifest ${entry.path} row path`);
      const targetRepositoryPath = relativeToRepo(repoRoot, target, `sha256 row ${row.path}`);
      if (excluded(row.path, excludes)) fail(`sha256 row is excluded: ${row.path}`);
      const targetFile = safeExistingPath(repoRoot, targetRepositoryPath, `sha256 row ${row.path}`);
      if (readHash(targetFile) !== row.sha256) fail(`sha256 row hash drift: ${row.path}`);
    }
  }

  for (const entry of value.authorities.statusFiles) {
    const file = claim(entry.path, `status file ${entry.path}`);
    const content = new TextDecoder('utf-8', { fatal: true }).decode(fs.readFileSync(file));
    if (!INTEGER_FILE.test(content)) fail(`status file is not exact INTEGER LF: ${entry.path}`);
  }
  verifyGitScope(repoRoot, value.scope.declaredOutputs);
}

function stableReport(runId, status, errors) {
  return `${JSON.stringify({ schemaVersion: SCHEMA_VERSION, runId, status, errors: [...errors] })}\n`;
}

function writeExclusiveReport(outputDir, content) {
  if (typeof outputDir !== 'string' || !path.isAbsolute(outputDir)) fail('output directory must be absolute');
  let directory;
  try {
    const stat = fs.lstatSync(outputDir);
    if (stat.isSymbolicLink() || !stat.isDirectory()) fail('output directory is not a regular directory');
    if ((stat.mode & 0o777) !== 0o700) fail('output directory must be mode 0700');
    directory = fs.realpathSync(outputDir);
  } catch (error) {
    if (error instanceof VerificationError) throw error;
    fail('output directory does not exist');
  }
  if (fs.readdirSync(directory).length !== 0) fail('output directory must be empty; refusing overwrite');

  const temporary = path.join(directory, `.authority-report.${process.pid}.${crypto.randomBytes(8).toString('hex')}.tmp`);
  let fd;
  try {
    fd = fs.openSync(temporary, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL, 0o600);
    fs.writeFileSync(fd, content, { encoding: 'utf8' });
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = undefined;
    // link + unlink is atomic and refuses a destination race instead of
    // allowing rename() to overwrite a concurrently-created report.
    fs.linkSync(temporary, path.join(directory, 'authority-report.json'));
    fs.unlinkSync(temporary);
    return path.join(directory, 'authority-report.json');
  } catch (error) {
    if (fd !== undefined) fs.closeSync(fd);
    try { fs.unlinkSync(temporary); } catch {}
    throw error;
  }
}

export function validateRunId(runId) {
  if (typeof runId !== 'string' || runId.length > 128 || !RUN_ID.test(runId)) {
    fail('run ID must match YYYYMMDDTHHMMSSZ-lowercase-step-name-NN');
  }
  return runId;
}

export function verifyRun({ repoRoot = process.cwd(), runId, manifestPath, outputDir, writeReport = true } = {}) {
  const errors = [];
  let safeRunId = typeof runId === 'string' ? runId : '';
  let reportPath;
  try {
    validateRunId(runId);
    safeRunId = runId;
    const root = canonicalRoot(repoRoot);
    const runDirectory = path.join(root, '.build', 'runs', runId);
    const runStat = fs.lstatSync(runDirectory);
    if (runStat.isSymbolicLink() || !runStat.isDirectory()) fail('run directory is missing or unsafe');
    const canonicalRun = fs.realpathSync(runDirectory);
    if (typeof manifestPath !== 'string' || !path.isAbsolute(manifestPath)) fail('manifest path must be absolute');
    const manifestStat = fs.lstatSync(manifestPath);
    if (manifestStat.isSymbolicLink() || !manifestStat.isFile()) fail('manifest must be a regular non-symlink file');
    const canonicalManifest = fs.realpathSync(manifestPath);
    if (!inside(canonicalRun, canonicalManifest)) fail('manifest is outside the selected run');
    // Check every ancestor from repository root as well as the run boundary.
    const manifestRelative = relativeToRepo(root, canonicalManifest, 'manifest');
    safeExistingPath(root, manifestRelative, 'manifest');
    const parsed = parseInputManifest(fs.readFileSync(canonicalManifest, 'utf8'));
    verifyManifest(parsed, root, runId, canonicalManifest);
  } catch (error) {
    errors.push(error instanceof VerificationError ? error.message : `verification error: ${error.message}`);
  }

  const status = errors.length === 0 ? 'success' : 'fail';
  const content = stableReport(safeRunId, status, errors);
  if (writeReport) {
    try {
      reportPath = writeExclusiveReport(outputDir, content);
    } catch (error) {
      // A non-empty output directory is intentionally not modified, including
      // when the verification itself failed.  The returned result remains
      // useful to callers and the CLI exits nonzero.
      errors.push(error instanceof VerificationError ? error.message : `report error: ${error.message}`);
      return { schemaVersion: SCHEMA_VERSION, runId: safeRunId, status: 'fail', errors, reportPath: undefined };
    }
  }
  return { schemaVersion: SCHEMA_VERSION, runId: safeRunId, status, errors, reportPath };
}

export function main(argv = process.argv.slice(2)) {
  if (argv.length !== 5 || argv[1] !== '--manifest' || argv[3] !== '--output' || argv[4] !== '/output') {
    process.stderr.write('usage: verify-run.mjs RUN_ID --manifest ABS_PATH --output /output\n');
    return 2;
  }
  const result = verifyRun({ runId: argv[0], manifestPath: argv[2], outputDir: argv[4] });
  process.stdout.write(`${result.status}\n`);
  return result.status === 'success' ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  process.exitCode = main();
}
