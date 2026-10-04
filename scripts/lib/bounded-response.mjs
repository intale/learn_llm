// Bounded byte-response helpers. This module performs no network requests.

export function responseBodyLimit(status, successByteLimit) {
  if ([301, 302, 303, 307, 308].includes(status) || status < 200 || status >= 300) {
    return 65536;
  }
  return successByteLimit;
}

export async function readBoundedResponse(response, limit) {
  if (!Number.isSafeInteger(limit) || limit < 0) {
    throw new TypeError('invalid frozen response limit');
  }
  const reader = response.body?.getReader();
  if (!reader) return { body: Buffer.alloc(0), bytesReceived: 0, overflow: false };

  const chunks = [];
  let retained = 0;
  let bytesReceived = 0;
  let overflow = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = Buffer.from(value);
    bytesReceived += chunk.length;
    const remaining = Math.max(0, limit - retained);
    if (chunk.length > remaining) {
      if (remaining) chunks.push(chunk.subarray(0, remaining));
      retained += remaining;
      overflow = true;
      try {
        await reader.cancel('frozen byte ceiling exceeded');
      } catch {
        // Cancellation is best effort; the retained body still respects the cap.
      }
      break;
    }
    chunks.push(chunk);
    retained += chunk.length;
  }
  return { body: Buffer.concat(chunks, retained), bytesReceived, overflow };
}
