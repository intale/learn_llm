import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('course Rust tests run in a BuildKit network-isolated layer after locked fetch', () => {
  const dockerfile = readFileSync(path.join(repositoryRoot, 'Dockerfile'), 'utf8');
  const fetch = dockerfile.indexOf('RUN cargo fetch --locked');
  const isolatedTests = dockerfile.indexOf('RUN --network=none cargo test --workspace --locked');
  const npmProvision = dockerfile.indexOf('npm --prefix site ci --ignore-scripts');

  assert.notEqual(npmProvision, -1, 'the existing locked npm provisioning remains in place');
  assert.notEqual(fetch, -1, 'locked Rust dependencies are fetched during setup');
  assert.notEqual(isolatedTests, -1, 'Rust tests execute in a networkless BuildKit RUN');
  assert.ok(fetch < isolatedTests, 'cargo fetch precedes networkless test execution');
});

test('./course run passes the no-network policy to its Docker runtime container', () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'course-network-policy-'));
  const bashEnvironment = path.join(temp, 'docker-function.sh');
  const tracePath = path.join(temp, 'docker-argv.jsonl');
  writeFileSync(bashEnvironment, 'docker() { printf \'%s\\n\' "$*" >> "$DOCKER_TRACE"; }\n');

  const result = spawnSync('bash', ['course', 'run', 'printf', 'offline'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      BASH_ENV: bashEnvironment,
      DOCKER_TRACE: tracePath,
    },
  });

  assert.equal(result.status, 0, result.stderr);
  const calls = readFileSync(tracePath, 'utf8').trim().split('\n').map((line) => line.split(' '));
  assert.equal(calls.length, 2, 'the workflow builds, then runs the workspace image');
  assert.deepEqual(calls[1], ['run', '--rm', '--network', 'none', 'learn-llm-workspace:local', 'printf', 'offline']);
});
