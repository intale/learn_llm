import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { createWorkerClient } from '../../lib/governed-acquisition-worker-client.mjs';
import { transport } from '../../lib/governed-acquisition-transport.mjs';

const client = createWorkerClient({ binary: process.env.CH41_WORKER_BINARY, env: process.env });
const payloads = [Buffer.from('abc'), Buffer.from('hello\n')];
const requestFactory = (url, options, callback) => {
  assert.equal(options.method, 'GET');
  assert.equal(options.headers['accept-encoding'], 'identity');
  const payload = payloads.shift();
  assert.ok(payload, 'exactly two offline fixture sources');
  const response = Readable.from([payload], { objectMode: false });
  response.statusCode = 200;
  response.rawHeaders = ['Content-Type', 'text/plain', 'Content-Length', String(payload.length), 'ETag', '"fixture-v1"'];
  const request = new EventEmitter();
  request.end = () => queueMicrotask(() => callback(response));
  request.destroy = () => {};
  return request;
};
try {
  for (let source = 0; source < 2; source += 1) {
    const reply = await transport({ command: client.command, requestFactory });
    assert.equal(reply.kind, 'file-verified');
  }
  const { progress } = await client.command({ op: 'status' });
  assert.equal(progress.source_index, 2);
  assert.equal(progress.outstanding_grant, null);
  assert.equal(progress.uncertain_body_bytes, 0);
  assert.equal(progress.sources.reduce((sum, source) => sum + source.acknowledged_body_bytes, 0), 9);
  assert.deepEqual(progress.sources.map((source) => source.attempts), [1, 1]);
  assert.ok(progress.sources.every((source) => source.verified && source.body_eof));
  assert.equal(payloads.length, 0);
  await client.close();
} catch {
  client.destroy();
  throw new Error('offline governed transport round trip refused');
}
