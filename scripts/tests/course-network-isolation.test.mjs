import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
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

function cudaLauncherFixture() {
  const directory = mkdtempSync(path.join(tmpdir(), 'course-cuda-interface-'));
  const libraries = path.join(directory, 'cuda libraries');
  mkdirSync(libraries);
  for (const library of ['libcublas', 'libcublasLt']) {
    writeFileSync(path.join(libraries, library + '.so.12.fixture'), 'fixture only');
    symlinkSync(library + '.so.12.fixture', path.join(libraries, library + '.so.12'));
  }
  const environment = path.join(directory, 'docker-function.sh');
  const trace = path.join(directory, 'docker-argv.jsonl');
  writeFileSync(environment, `docker() { node -e 'require("node:fs").appendFileSync(process.env.DOCKER_TRACE, JSON.stringify(process.argv.slice(1))+"\\n")' "$@"; }\n`);
  return {directory, libraries, environment, trace};
}

function invokeCudaLauncher(fixture, arguments_) {
  return spawnSync('bash', ['course', 'run', ...arguments_], {
    cwd: repositoryRoot, encoding: 'utf8',
    env: {...process.env, COURSE_CORPUS: 'false', BASH_ENV: fixture.environment, DOCKER_TRACE: fixture.trace},
  });
}

test('./course run CUDA requires explicit selection and preserves the exact command argv', () => {
  const fixture = cudaLauncherFixture();
  const command = ['printf', 'two words', '--device', 'cuda:0'];
  const result = invokeCudaLauncher(fixture, ['--cuda', '--cuda-library-dir', fixture.libraries, '--', ...command]);
  assert.equal(result.status, 0, result.stderr);
  const calls = readFileSync(fixture.trace, 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(calls.length, 2);
  assert.equal(calls[0][0], 'build');
  assert.deepEqual(calls[1], [
    'run', '--rm', '-i', '--network', 'none', '--gpus', 'device=0',
    '--mount', `type=bind,source=${fixture.libraries},target=/opt/course-cuda-libs,readonly`,
    '--env', 'LD_LIBRARY_PATH=/opt/course-cuda-libs',
    '--env', 'NVIDIA_DRIVER_CAPABILITIES=compute,utility',
    'learn-llm-workspace:local', ...command,
  ]);
  assert.ok(!calls[1].some(argument => ['-p', '--publish', '-t', '--tty'].includes(argument)));
});

test('./course run CPU separator forwards command CUDA flags without exposing a GPU', () => {
  const fixture = cudaLauncherFixture();
  const result = invokeCudaLauncher(fixture, ['--', 'printf', '--cuda']);
  assert.equal(result.status, 0, result.stderr);
  const calls = readFileSync(fixture.trace, 'utf8').trim().split('\n').map(JSON.parse);
  assert.deepEqual(calls[1], ['run', '--rm', '-i', '--network', 'none', 'learn-llm-workspace:local', 'printf', '--cuda']);
});

test('./course run refuses invalid CUDA library requests before any Docker operation', () => {
  const missingLibrary = cudaLauncherFixture();
  const escapedLibrary = cudaLauncherFixture();
  const danglingLibrary = cudaLauncherFixture();
  const noLibraries = path.join(missingLibrary.directory, 'empty');
  mkdirSync(noLibraries);
  const outside = path.join(escapedLibrary.directory, 'external.so');
  writeFileSync(outside, 'outside selected directory');
  const escapingDirectory = path.join(escapedLibrary.directory, 'escaping');
  mkdirSync(escapingDirectory);
  symlinkSync(outside, path.join(escapingDirectory, 'libcublas.so.12'));
  symlinkSync(outside, path.join(escapingDirectory, 'libcublasLt.so.12'));
  const danglingDirectory = path.join(danglingLibrary.directory, 'dangling');
  mkdirSync(danglingDirectory);
  symlinkSync('absent', path.join(danglingDirectory, 'libcublas.so.12'));
  symlinkSync('absent', path.join(danglingDirectory, 'libcublasLt.so.12'));
  const cases = [
    [missingLibrary, ['--cuda', '--cuda-library-dir', 'relative', '--', 'true']],
    [missingLibrary, ['--cuda', '--cuda-library-dir', noLibraries, '--', 'true']],
    [missingLibrary, ['--cuda', '--cuda-library-dir', path.join(noLibraries, 'absent'), '--', 'true']],
    [missingLibrary, ['--cuda-library-dir', missingLibrary.libraries, '--', 'true']],
    [missingLibrary, ['--cuda', '--', 'true']],
    [missingLibrary, ['--cuda', '--cuda', '--', 'true']],
    [missingLibrary, ['--cuda', '--cuda-library-dir', missingLibrary.libraries, '--cuda-library-dir', missingLibrary.libraries, '--', 'true']],
    [missingLibrary, ['--cuda', '--cuda-library-dir', '/a,b', '--', 'true']],
    [escapedLibrary, ['--cuda', '--cuda-library-dir', escapingDirectory, '--', 'true']],
    [danglingLibrary, ['--cuda', '--cuda-library-dir', danglingDirectory, '--', 'true']],
  ];
  for (const [fixture, arguments_] of cases) {
    const result = invokeCudaLauncher(fixture, arguments_);
    assert.equal(result.status, 2, `${arguments_.join(' ')}: ${result.stderr}`);
    assert.equal(existsSync(fixture.trace), false, 'invalid request starts neither a build nor a runtime');
  }
});


test('./course run refuses absolute aliases that would break in the relocated CUDA mount', () => {
  for (const intermediate of [false, true]) {
    const fixture = cudaLauncherFixture();
    const soname = path.join(fixture.libraries, 'libcublas.so.12');
    const target = path.join(fixture.libraries, 'libcublas.so.12.fixture');
    unlinkSync(soname);
    if (intermediate) {
      symlinkSync(target, path.join(fixture.libraries, 'intermediate.so'));
      symlinkSync('intermediate.so', soname);
    } else {
      symlinkSync(target, soname);
    }
    const result = invokeCudaLauncher(fixture, [
      '--cuda', '--cuda-library-dir', fixture.libraries, '--', 'true',
    ]);
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, /relative contained symlink targets/);
    assert.equal(existsSync(fixture.trace), false, 'refusal precedes every Docker operation');
  }
});
