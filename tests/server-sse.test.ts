import test from "node:test";
import assert from "node:assert/strict";
import { agentRequestErrorResponse, isRequestAbort } from "../lib/server/agentRouteControl";
import { encodeSseEvent, sseEventName } from "../lib/server/sse";

const decoder = new TextDecoder();

test("sanitizes SSE event names from structured event types", () => {
  assert.equal(sseEventName({ type: "tool:started/v2" }), "tool_started_v2");
});

test("falls back to message for events without string types", () => {
  assert.equal(sseEventName({ type: 42 }), "message");
  assert.equal(sseEventName(null), "message");
});

test("encodes SSE frames with sanitized event names and JSON data", () => {
  const frame = decoder.decode(encodeSseEvent({ type: "text delta", delta: "Launch" }));

  assert.equal(frame, 'event: text_delta\ndata: {"type":"text delta","delta":"Launch"}\n\n');
});

test("classifies already-aborted requests as request cancellation", () => {
  const controller = new AbortController();
  controller.abort();

  assert.equal(isRequestAbort(new Error("late provider error"), controller.signal), true);
});

test("returns a cancellation response shape without provider error details", () => {
  const controller = new AbortController();
  controller.abort();

  assert.deepEqual(agentRequestErrorResponse(new Error("secret provider detail"), controller.signal, "test-model"), {
    status: 499,
    body: { cancelled: true }
  });
});
