import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { encodeSseEvent, sseEventName } from "../lib/server/sse";

const decoder = new TextDecoder();
const agentRouteSource = fs.readFileSync(new URL("../app/api/agent/route.ts", import.meta.url), "utf8");

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

test("agent route passes the request abort signal into JSON and streaming agent runs", () => {
  assert.match(agentRouteSource, /runPreflightAgent\(parsed\.data, env, \{ signal: request\.signal \}\)/);
  assert.match(agentRouteSource, /streamPreflightAgent\(parsed\.data, env, \{ signal: request\.signal \}\)/);
});

test("agent route guards cancelled SSE enqueue and close operations", () => {
  assert.match(agentRouteSource, /request\.signal\.aborted/);
  assert.match(agentRouteSource, /cancel\(\)\s*\{\s*cancelled = true;/);
  assert.match(agentRouteSource, /isAbortLike\(error, request\.signal\) \|\| cancelled/);
  assert.match(agentRouteSource, /try\s*\{\s*controller\.enqueue\(encodeSseEvent\(event\)\);/);
  assert.match(agentRouteSource, /try\s*\{\s*controller\.close\(\);/);
});
