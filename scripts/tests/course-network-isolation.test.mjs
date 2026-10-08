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
  assert.deepEqual(calls[1], ['run', '--rm', '-i', '--network', 'none', 'learn-llm-workspace:local', 'printf', 'offline']);
});

test('./course run dispatches the prepared-reader Cargo vectors with fixture-only setup', () => {
  const vectors = [['cargo', 'run', '--offline', '--locked', '-p', 'ch41-corpus-preparation']];
  for (const name of [
    'loads_the_explicitly_hand_prepared_course_fixture',
    'malformed_later_input_has_no_success_summary',
    'summary_retains_only_three_document_descriptions',
  ]) vectors.push(['cargo', 'test', '--offline', '--locked', '-p',
    'ch41-corpus-preparation', '--lib', 'tests::' + name, '--', '--exact']);
  for (const argv of vectors) {
    const temp = mkdtempSync(path.join(tmpdir(), 'course-command-forwarding-'));
    const bashEnvironment = path.join(temp, 'docker-function.sh');
    const tracePath = path.join(temp, 'docker-argv.jsonl');
    writeFileSync(bashEnvironment, 'docker() { printf \'%s\\n\' "$*" >> "$DOCKER_TRACE"; }\n');
    const result = spawnSync('bash', ['course', 'run', ...argv], {
      cwd: repositoryRoot, encoding: 'utf8',
      env: {...process.env, COURSE_CORPUS: 'false', BASH_ENV: bashEnvironment, DOCKER_TRACE: tracePath},
    });
    assert.equal(result.status, 0, result.stderr);
    const calls = readFileSync(tracePath, 'utf8').trim().split('\n').map(line => line.split(' '));
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[0].slice(0, 4), ['build', '--target', 'workspace', '-t']);
    assert.ok(calls[0].includes('COURSE_CORPUS=false'));
    assert.deepEqual(calls[1], ['run', '--rm', '-i', '--network', 'none', 'learn-llm-workspace:local', ...argv]);
  }
});

test('./course run forwards redirected input unchanged without allocating a TTY', () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'course-stdin-'));
  const bashEnvironment = path.join(temp, 'docker-function.sh');
  const tracePath = path.join(temp, 'docker-argv.jsonl');
  writeFileSync(bashEnvironment, 'docker() { printf \'%s\\n\' "$*" >> "$DOCKER_TRACE"; if [[ $1 == run ]]; then cat; fi; }\n');
  for (const input of [Buffer.from('{"id":"a","text":"one"}\n'), Buffer.alloc(0), Buffer.from('not-json\n')]) {
    const result = spawnSync('bash', ['course', 'run', 'cargo', 'run', '--offline', '--locked', '-p', 'ch41-corpus-preparation'], {
      cwd: repositoryRoot, input,
      env: {...process.env, COURSE_CORPUS: 'false', BASH_ENV: bashEnvironment, DOCKER_TRACE: tracePath},
    });
    assert.equal(result.status, 0);
    assert.deepEqual(result.stdout, input, 'transport neither parses nor changes supplied bytes');
  }
  const calls = readFileSync(tracePath, 'utf8').trim().split('\n').map(line => line.split(' '));
  for (const args of calls.filter(argv => argv[0] === 'run')) {
    assert.ok(args.includes('-i'));
    assert.ok(!args.includes('-t') && !args.includes('--tty'));
    assert.deepEqual(args.slice(0, 5), ['run', '--rm', '-i', '--network', 'none']);
    assert.deepEqual(args.slice(-6), ['cargo', 'run', '--offline', '--locked', '-p', 'ch41-corpus-preparation']);
  }
});

test('./course propagates default true or explicit fixture-only false before offline run',()=>{
 for(const mode of [undefined,'false','true','FALSE']){
  const temp=mkdtempSync(path.join(tmpdir(),'course-corpus-mode-')),environment=path.join(temp,'mock.sh'),trace=path.join(temp,'trace');
  writeFileSync(environment,'docker() { printf \'%s\\n\' "$*" >> "$DOCKER_TRACE"; }\n');
  const env={...process.env,BASH_ENV:environment,DOCKER_TRACE:trace};delete env.COURSE_CORPUS;if(mode!==undefined)env.COURSE_CORPUS=mode;
  const result=spawnSync('bash',['course','run','printf','fixture'],{cwd:repositoryRoot,encoding:'utf8',env});
  if(mode==='FALSE'){assert.equal(result.status,2);assert.match(result.stderr,/true or false/);continue;}
  assert.equal(result.status,0,result.stderr);const calls=readFileSync(trace,'utf8').trim().split('\n');assert.ok(calls[0].includes('--build-arg COURSE_CORPUS='+(mode??'true')));assert.ok(calls[1].includes('--network none'));
 }
});
