import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import test from 'node:test';
import { transport } from '../lib/governed-acquisition-transport.mjs';

function fixture(responses, reply) {
  const operations = [];
  const requests = [];
  const streams = [];
  const command = async (operation) => {
    operations.push(operation);
    return reply(operation, operations, streams);
  };
  const requestFactory = (url, options, callback) => {
    requests.push({ url, options });
    const definition = responses.shift();
    assert.ok(definition, 'no implicit retry or extra request');
    const stream = Readable.from(definition.chunks ?? [], { objectMode: false });
    stream.statusCode = definition.status ?? 200;
    stream.rawHeaders = definition.headers ?? ['Content-Type', 'text/plain'];
    const read = stream.read.bind(stream);
    stream.readSizes = [];
    stream.read = (bytes) => { stream.readSizes.push(bytes); return read(bytes); };
    streams.push(stream);
    const request = new EventEmitter();
    request.end = () => queueMicrotask(() => callback(stream));
    request.destroy = () => { request.destroyed = true; };
    return request;
  };
  return { command, requestFactory, operations, requests, streams };
}

function replies(operation) {
  if (operation.op === 'start' || operation.op === 'redirect') return {
    kind: 'request', method: 'GET', url: 'https://fixture.invalid/source?signed=PRIVATE',
    deadline_unix_seconds: Math.floor(Date.now() / 1000) + 60,
    headers: { 'accept-encoding': 'identity', range: 'bytes=1-', 'if-range': '"v1"' },
    grant: { bytes: 3, sequence: 1, source_index: 0 },
  };
  if (operation.op === 'next-grant') return { kind: 'grant', grant: { bytes: 3, sequence: 2, source_index: 0 } };
  if (operation.op === 'finish') return { kind: 'file-verified' };
  return { kind: 'acknowledged' };
}

test('paused grant-sized bytes and separate EOF are relayed; request headers unchanged', async () => {
  const f = fixture([{ chunks: [Buffer.from('abc')] }], replies);
  assert.deepEqual(await transport(f), { kind: 'file-verified' });
  assert.deepEqual(f.operations.map((op) => op.op), ['start', 'head', 'body', 'next-grant', 'eof', 'finish']);
  assert.deepEqual(f.operations[2], { op: 'body', sequence: 1, bytes: [97, 98, 99], retain: true });
  assert.equal(f.operations[4].sequence, 2);
  assert.deepEqual(f.requests[0].options, { method: 'GET', headers: replies({ op: 'start' }).headers });
  assert.ok(f.streams[0].readSizes.every((size) => size === 3 || size === 0));
});

test('raw duplicate headers and compressed bytes are not normalized or decompressed', async () => {
  const payload = Buffer.from([31, 139, 8]);
  const f = fixture([{ chunks: [payload], headers: [
    'Content-Encoding', 'gzip', 'ETag', '"a"', 'etag', '"b"',
    'Content-Length', '3', 'content-length', '3',
  ] }], replies);
  await transport(f);
  assert.deepEqual(f.operations[1].head.etag, ['"a"', '"b"']);
  assert.deepEqual(f.operations[1].head.content_length, ['3', '3']);
  assert.deepEqual(f.operations[1].head.content_encoding, ['gzip']);
  assert.deepEqual(f.operations[2].bytes, [...payload]);
});

test('redirect body is destroyed before grant cancellation and only Rust chooses next URL', async () => {
  const f = fixture([
    { status: 302, headers: ['Location', '/next'], chunks: [Buffer.from('ignored')] },
    { chunks: [Buffer.from('abc')] },
  ], (operation, operations, streams) => {
    if (operation.op === 'cancel') assert.equal(streams[0].closed, true);
    return replies(operation);
  });
  await transport(f);
  assert.deepEqual(f.operations.slice(0, 3), [
    { op: 'start' }, { op: 'cancel', sequence: 1 }, { op: 'redirect', location: '/next' },
  ]);
  assert.equal(f.requests[1].url, replies({ op: 'start' }).url);
  assert.equal(f.operations.filter((operation) => operation.op === 'body').length, 1);
});

test('short final body is acknowledged before separate EOF, without exceeding grant', async () => {
  const f = fixture([{ chunks: [Buffer.from('a')] }], replies);
  await transport(f);
  assert.deepEqual(f.operations.find((operation) => operation.op === 'body').bytes, [97]);
  assert.equal(f.operations.find((operation) => operation.op === 'eof').sequence, 2);
});

test('worker head refusal destroys body, never retries or releases uncertain grant', async () => {
  const f = fixture([{ status: 500, chunks: [Buffer.from('error')] }], (operation) =>
    operation.op === 'head' ? { kind: 'refused', error: 'private URL detail' } : replies(operation));
  await assert.rejects(transport(f), { message: 'governed transport refused' });
  assert.equal(f.streams[0].closed, true);
  assert.deepEqual(f.operations.map((operation) => operation.op), ['start', 'head']);
  assert.equal(f.requests.length, 1);
});

test('malformed grants, missing injected factory and duplicate redirect locations refuse', async () => {
  await assert.rejects(transport({ command: async () => replies({ op: 'start' }) }), /refused/);
  const bad = fixture([], () => ({ ...replies({ op: 'start' }), grant: { bytes: 65_537, sequence: 1 } }));
  await assert.rejects(transport(bad), /refused/);
  assert.equal(bad.requests.length, 0);
  const redirect = fixture([{ status: 302, headers: ['Location', '/one', 'location', '/two'] }], replies);
  await assert.rejects(transport(redirect), /refused/);
  assert.deepEqual(redirect.operations.map((operation) => operation.op), ['start', 'cancel']);
  assert.equal(redirect.streams[0].closed, true);
});

test('maximum granted chunk is bounded and a zero grant never consumes payload', async () => {
  let sequence = 1;
  const f = fixture([{ chunks: [Buffer.alloc(65_536)] }], (operation) => {
    if (operation.op === 'start') return { ...replies(operation), grant: { bytes: 65_536, sequence } };
    if (operation.op === 'next-grant') return { kind: 'grant', grant: { bytes: 0, sequence: ++sequence } };
    return replies(operation);
  });
  await transport(f);
  assert.equal(f.operations.find((operation) => operation.op === 'body').bytes.length, 65_536);
  const zero = fixture([{ chunks: [Buffer.from('a')] }], (operation) => ({
    ...replies(operation), grant: { bytes: 0, sequence: 1 },
  }));
  await assert.rejects(transport(zero), /refused/);
  assert.equal(zero.operations.some((operation) => operation.op === 'body'), false);
});

test('expired persisted deadline refuses before HTTP dispatch', async () => {
  const f = fixture([], (operation) => ({ ...replies(operation), deadline_unix_seconds: 1 }));
  await assert.rejects(transport(f), /refused/);
  assert.equal(f.requests.length, 0);
});

test('one persisted deadline destroys hanging headers and a hanging body', async () => {
  // Choose the next second: no arbitrary policy duration is supplied to transport.
  const permit = () => ({ ...replies({ op: 'start' }), deadline_unix_seconds: Math.floor(Date.now() / 1000) + 1 });
  let request;
  const hangingHead = {
    command: async () => permit(),
    requestFactory: () => {
      request = new EventEmitter();
      request.end = () => {};
      request.destroy = () => { request.destroyed = true; };
      return request;
    },
  };
  await assert.rejects(transport(hangingHead), /refused/);
  assert.equal(request.destroyed, true);
  let response;
  const operations = [];
  const hangingBody = {
    command: async (operation) => { operations.push(operation); return operation.op === 'start' ? permit() : { kind: 'accepted-head' }; },
    requestFactory: (url, options, callback) => {
      response = new Readable({ read() {} });
      response.statusCode = 200;
      response.rawHeaders = [];
      const req = new EventEmitter();
      req.end = () => queueMicrotask(() => callback(response));
      req.destroy = () => {};
      return req;
    },
  };
  await assert.rejects(transport(hangingBody), /refused/);
  assert.equal(response.destroyed, true);
  assert.deepEqual(operations.map((operation) => operation.op), ['start', 'head']);
});
