import { spawn } from 'node:child_process';

const refused = () => new Error('governed worker channel refused');
const MAX_LINE = 524_288;

// Fixed binary/JSONL plumbing; no policy override, URL selector or filesystem
// mutation. The owning executor is responsible for the compiled binary/input
// identities and any separate acquisition authority.
export function createWorkerClient({ binary, env }) {
  if (typeof binary !== 'string' || !binary.startsWith('/')
      || !['synthetic-offline-fixture', 'production-source-policy'].includes(env?.CH41_POLICY_KIND)
      || typeof env.CH41_MANIFEST_PATH !== 'string'
      || typeof env.CH41_PROGRESS_DIRECTORY !== 'string') throw refused();
  const child = spawn(binary, [], { env: {
    ...process.env,
    CH41_POLICY_KIND: env.CH41_POLICY_KIND,
    CH41_MANIFEST_PATH: env.CH41_MANIFEST_PATH,
    CH41_PROGRESS_DIRECTORY: env.CH41_PROGRESS_DIRECTORY,
  }, stdio: ['pipe', 'pipe', 'pipe'] });
  let pending;
  let buffered = Buffer.alloc(0);
  let failed = false;
  const fail = () => {
    failed = true;
    pending?.reject(refused());
    pending = undefined;
    child.stdin.destroy();
    child.kill();
  };
  // Never echo private worker diagnostics or signed endpoint strings.
  child.stderr.on('data', () => {});
  child.on('error', fail);
  child.stdin.on('error', fail);
  child.stdout.on('data', (chunk) => {
    buffered = Buffer.concat([buffered, chunk]);
    if (buffered.length > MAX_LINE) return fail();
    const newline = buffered.indexOf(10);
    if (newline < 0) return;
    if (newline !== buffered.length - 1 || !pending) return fail();
    let reply;
    try { reply = JSON.parse(buffered.subarray(0, newline).toString('utf8')); }
    catch { return fail(); }
    buffered = Buffer.alloc(0);
    const resolve = pending.resolve;
    pending = undefined;
    resolve(reply);
  });
  const completion = new Promise((resolve) => child.on('close', (code) => {
    if (pending || buffered.length) fail();
    resolve(code);
  }));
  return {
    command(operation) {
      if (failed || pending || child.exitCode !== null) return Promise.reject(refused());
      const line = JSON.stringify(operation) + '\n';
      if (Buffer.byteLength(line) > MAX_LINE) return Promise.reject(refused());
      return new Promise((resolve, reject) => {
        pending = { resolve, reject };
        child.stdin.write(line, (error) => { if (error) fail(); });
      });
    },
    async close() {
      child.stdin.end();
      if (await completion !== 0 || failed) throw refused();
    },
    destroy: fail,
  };
}
