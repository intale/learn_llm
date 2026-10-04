import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readBoundedResponse, responseBodyLimit } from '../lib/bounded-response.mjs';

function bodyResponse(...chunks) {
  let index = 0;
  return {
    body: {
      getReader() {
        return {
          async read() {
            return index < chunks.length
              ? { done: false, value: chunks[index++] }
              : { done: true };
          },
          async cancel() {},
        };
      },
    },
  };
}

test('redirect, non-success and success statuses select their frozen caps', () => {
  assert.equal(responseBodyLimit(302, 574236), 65536);
  assert.equal(responseBodyLimit(404, 574236), 65536);
  assert.equal(responseBodyLimit(200, 574236), 574236);
  assert.equal(responseBodyLimit(200, 262144), 262144);
});

test('a crossing chunk is truncated at the cap and delivered-byte count includes it whole', async () => {
  const first = Buffer.alloc(65535, 0x61);
  const crossing = Buffer.alloc(7, 0x62);
  const got = await readBoundedResponse(bodyResponse(first, crossing), 65536);
  assert.equal(got.body.length, 65536);
  assert.equal(got.bytesReceived, 65542);
  assert.equal(got.overflow, true);
  assert.equal(got.body.subarray(0, 65535).toString(), 'a'.repeat(65535));
  assert.equal(got.body.at(-1), 0x62);
});

test('overflow invokes reader cancellation with the frozen-cap reason', async () => {
  let cancelReason;
  const response = {
    body: {
      getReader: () => ({
        async read() { return { done: false, value: Buffer.from('abc') }; },
        async cancel(reason) { cancelReason = reason; },
      }),
    },
  };
  const got = await readBoundedResponse(response, 2);
  assert.equal(got.body.toString(), 'ab');
  assert.equal(got.overflow, true);
  assert.equal(cancelReason, 'frozen byte ceiling exceeded');
});

test('success bodies larger than 64 KiB are retained to their explicit cap', async () => {
  const a = Buffer.alloc(65536, 0x31);
  const b = Buffer.alloc(2048, 0x32);
  const got = await readBoundedResponse(bodyResponse(a, b), 574236);
  assert.equal(got.body.length, 67584);
  assert.equal(got.bytesReceived, 67584);
  assert.equal(got.overflow, false);
});

test('missing and null bodies return an empty non-overflow result', async () => {
  assert.deepEqual(await readBoundedResponse({}, 0), {
    body: Buffer.alloc(0), bytesReceived: 0, overflow: false,
  });
  assert.deepEqual(await readBoundedResponse({ body: null }, 8), {
    body: Buffer.alloc(0), bytesReceived: 0, overflow: false,
  });
});

test('zero and exact caps do not report overflow without discarded bytes', async () => {
  const empty = await readBoundedResponse(bodyResponse(), 0);
  assert.deepEqual([empty.body.length, empty.bytesReceived, empty.overflow], [0, 0, false]);

  const zero = await readBoundedResponse(bodyResponse(Buffer.from('x')), 0);
  assert.deepEqual([zero.body.length, zero.bytesReceived, zero.overflow], [0, 1, true]);

  const exact = await readBoundedResponse(bodyResponse(Buffer.from('abcd')), 4);
  assert.deepEqual([exact.body.toString(), exact.bytesReceived, exact.overflow], ['abcd', 4, false]);
});

test('negative, fractional, unsafe and nonnumeric caps are rejected', async () => {
  for (const cap of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, Number.NaN, '4']) {
    await assert.rejects(readBoundedResponse(bodyResponse(), cap), {
      name: 'TypeError', message: 'invalid frozen response limit',
    });
  }
});

test('reader failures propagate to the caller without becoming empty success', async () => {
  const failure = new Error('fixture read failure');
  const response = { body: { getReader: () => ({ async read() { throw failure; } }) } };
  await assert.rejects(readBoundedResponse(response, 8), error => error === failure);
});
