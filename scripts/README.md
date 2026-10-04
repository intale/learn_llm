# Maintained development-script helpers

These small modules support deterministic repository tooling; they do not
implement learner-facing LLM algorithms or grant callers additional authority.
Run their focused tests with the pinned development Node environment declared by
the owning `BUILD_STATE.yaml` step.

## Bounded response byte reader

`lib/bounded-response.mjs` exports:

- `responseBodyLimit(status, successByteLimit)`: returns the supplied success
  byte cap for a 2xx status; returns 65,536 bytes for redirects, other
  non-success statuses, and statuses outside the success range.
- `readBoundedResponse(response, limit)`: reads `response.body` through its
  stream reader and returns `{ body, bytesReceived, overflow }`. `body` is a
  `Buffer` containing no more than `limit` bytes. `bytesReceived` counts the
  complete chunks delivered by `reader.read()`; a chunk that crosses the cap is
  counted in full even though only its fitting prefix is retained. This is not
  a count of wire bytes, headers, or bytes read ahead by a transport. The cap
  bounds retained response-body bytes, not transient memory used for a large
  chunk the transport has already delivered; creating a `Buffer` from that
  chunk can temporarily occupy more memory than the retained cap.

The reader validates that `limit` is a nonnegative safe integer. A missing or
null body produces an empty result. When a chunk crosses the cap, the reader
best-effort cancels the stream and reports `overflow: true`; cancellation
failure does not invalidate the bounded retained bytes. Read errors propagate
to the caller.

This helper buffers a single explicitly bounded byte response, not a large
corpus stream. Callers own URL/authority selection, redirects, retries,
timeouts, decompression, response sequencing, and aggregate/total-response byte
budgets. The status-dependent 65,536-byte cap is a default policy for
non-success bodies, not permission to make a request. It has no network access.

Focused tests: `node --test scripts/tests/bounded-response.test.mjs`.
