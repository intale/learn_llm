// Transport plumbing only. The caller supplies a private typed Rust command
// channel and an explicitly authorized request factory (offline in Chapter41).
const MAX_CHUNK = 65_536;
const HEAD_FIELDS = {
  'content-encoding': 'content_encoding',
  'content-length': 'content_length',
  'content-range': 'content_range',
  'content-type': 'content_type',
  etag: 'etag',
};
const refusal = () => new Error('governed transport refused');

function grantOf(reply) {
  const grant = reply?.grant;
  if (!Number.isSafeInteger(grant?.bytes) || grant.bytes < 0 || grant.bytes > MAX_CHUNK
      || !Number.isSafeInteger(grant.sequence) || grant.sequence < 1) throw refusal();
  return grant;
}

function observedHead(response) {
  if (!Number.isInteger(response.statusCode) || !Array.isArray(response.rawHeaders)
      || response.rawHeaders.length % 2 !== 0) throw refusal();
  const head = Object.fromEntries(Object.values(HEAD_FIELDS).map((field) => [field, []]));
  const locations = [];
  for (let index = 0; index < response.rawHeaders.length; index += 2) {
    const name = response.rawHeaders[index];
    const value = response.rawHeaders[index + 1];
    if (typeof name !== 'string' || typeof value !== 'string') throw refusal();
    const field = HEAD_FIELDS[name.toLowerCase()];
    if (field) head[field].push(value);
    if (name.toLowerCase() === 'location') locations.push(value);
  }
  head.status = response.statusCode;
  return { head, locations };
}

function openResponse(requestFactory, permit) {
  if (permit?.kind !== 'request' || permit.method !== 'GET' || typeof permit.url !== 'string'
      || permit.headers?.['accept-encoding'] !== 'identity') throw refusal();
  let request;
  const response = new Promise((resolve, reject) => {
    request = requestFactory(permit.url, { method: 'GET', headers: permit.headers }, (incoming) => {
      incoming.pause();
      // Do not allow a response error to become an unhandled event while Rust
      // persists the head or acknowledges bytes. nextChunk checks this state.
      incoming.on('error', () => {});
      resolve(incoming);
    });
    request.on('error', () => reject(refusal()));
    request.end();
  });
  return { request, response };
}

function nextChunk(response, bytes) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      response.off('readable', inspect);
      response.off('end', inspect);
      response.off('error', failed);
      response.off('aborted', failed);
      response.off('close', closed);
    };
    const failed = () => { cleanup(); reject(refusal()); };
    const closed = () => { if (!response.readableEnded) failed(); else inspect(); };
    const inspect = () => {
      if (response.errored || response.readableAborted) return failed();
      if (bytes === 0 && response.readableLength !== 0) return failed();
      const chunk = response.read(bytes);
      if (chunk !== null) {
        cleanup();
        if (!Buffer.isBuffer(chunk) || chunk.length > bytes || chunk.length > MAX_CHUNK) reject(refusal());
        else resolve(chunk);
      } else if (response.readableEnded) { cleanup(); resolve(null); }
    };
    response.on('readable', inspect);
    response.on('end', inspect);
    response.on('error', failed);
    response.on('aborted', failed);
    response.on('close', closed);
    inspect();
  });
}

// Destruction completes before Rust is told that no body bytes were delivered.
async function stopBody(response, request) {
  if (response && !response.closed) {
    const closed = new Promise((resolve) => response.once('close', resolve));
    response.destroy();
    await closed;
  }
  request?.destroy();
}

/** Fetch exactly one Rust-selected source. No URL, policy, retry or filesystem
 * selector is accepted. command(op) returns the worker's private JSON reply.
 * requestFactory has Node https.request's interface; Chapter41 injects it.
 * Returned data is only Rust's file-verification acknowledgment, not a URL.
 */
export async function transport({ command, requestFactory }) {
  if (typeof command !== 'function' || typeof requestFactory !== 'function') throw refusal();
  let timedOut = false;
  const send = async (operation) => {
    if (timedOut) throw refusal();
    const reply = await command(operation);
    if (!reply || reply.kind === 'refused') throw refusal();
    return reply;
  };
  let permit;
  let activeResponse;
  let activeRequest;
  let deadlineTimer;
  try {
    permit = await send({ op: 'start' });
    if (!Number.isSafeInteger(permit.deadline_unix_seconds)) throw refusal();
    const deadline = permit.deadline_unix_seconds;
    const milliseconds = deadline * 1000 - Date.now();
    if (milliseconds <= 0) throw refusal();
    const monotonicEnd = performance.now() + milliseconds;
    const expired = new Promise((resolve, reject) => {
      const arm = () => {
        const remaining = monotonicEnd - performance.now();
        if (remaining <= 0) { timedOut = true; activeResponse?.destroy(); activeRequest?.destroy(); reject(refusal()); }
        else deadlineTimer = setTimeout(arm, Math.min(remaining, 2_147_483_647));
      };
      arm();
    });
    const transfer = async () => { while (true) {
      if (permit.deadline_unix_seconds !== deadline) throw refusal();
      let grant = grantOf(permit);
      const pending = openResponse(requestFactory, permit);
      activeRequest = pending.request;
      activeResponse = await pending.response;
      const { head, locations } = observedHead(activeResponse);
      if ([301, 302, 303, 307, 308].includes(head.status)) {
        await stopBody(activeResponse, activeRequest);
        activeResponse = undefined;
        await send({ op: 'cancel', sequence: grant.sequence });
        if (locations.length !== 1) throw refusal();
        permit = await send({ op: 'redirect', location: locations[0] });
        continue;
      }
      // Rust owns status, encoding, validator, range and length admission.
      await send({ op: 'head', head });
      while (true) {
        const chunk = await nextChunk(activeResponse, grant.bytes);
        if (chunk === null) {
          await send({ op: 'eof', sequence: grant.sequence });
          const verified = await send({ op: 'finish' });
          await stopBody(activeResponse, activeRequest);
          return verified;
        }
        await send({ op: 'body', sequence: grant.sequence, bytes: [...chunk], retain: true });
        grant = grantOf(await send({ op: 'next-grant' }));
      }
    } };
    return await Promise.race([transfer(), expired]);
  } catch {
    await stopBody(activeResponse, activeRequest);
    // Do not manufacture a settlement on transport/worker failure. Rust's
    // durable outstanding grant remains charged conservatively on restoration.
    throw refusal();
  } finally {
    clearTimeout(deadlineTimer);
  }
}
