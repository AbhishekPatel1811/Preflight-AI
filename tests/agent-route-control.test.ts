import assert from "node:assert/strict";
import test from "node:test";
import { agentRequestErrorResponse, createAgentRunSignal } from "../lib/server/agentRouteControl";

test("classifies JSON request aborts as cancellation without provider error payload", () => {
  const controller = new AbortController();
  controller.abort();

  const response = agentRequestErrorResponse(new Error("provider should not leak"), controller.signal, "test-model");

  assert.deepEqual(response, {
    status: 499,
    body: { cancelled: true }
  });
});

test("keeps normal provider failures as sanitized provider errors", () => {
  const response = agentRequestErrorResponse(new Error("upstream exploded"), new AbortController().signal, "test-model");

  assert.equal(response.status, 502);
  assert.equal(typeof response.body.error, "string");
  assert.doesNotMatch(response.body.error ?? "", /upstream exploded/);
});

test("agent run signals stop on either caller cancellation or the run deadline", async () => {
  const caller = new AbortController();
  const cancelled = createAgentRunSignal(caller.signal, 1000);
  caller.abort(new Error("caller stopped"));
  assert.equal(cancelled.aborted, true);

  const timedOut = createAgentRunSignal(new AbortController().signal, 10);
  await new Promise<void>((resolve) => timedOut.addEventListener("abort", () => resolve(), { once: true }));
  assert.equal(timedOut.aborted, true);
  assert.equal((timedOut.reason as DOMException).name, "TimeoutError");
});
