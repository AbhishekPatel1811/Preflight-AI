import test from "node:test";
import assert from "node:assert/strict";
import { parseSseChunk, parseSseFrame } from "../lib/ui/sse";

test("parses named SSE frames with CRLF separators", () => {
  const frame = 'event: run_started\r\ndata: {"type":"run_started","message":"Starting"}';

  assert.deepEqual(parseSseFrame(frame), {
    type: "run_started",
    message: "Starting"
  });
});

test("keeps incomplete stream chunks buffered until the frame is complete", () => {
  const firstChunk = parseSseChunk(
    "",
    'event: run_started\ndata: {"type":"run_started","message":"Starting"}\n\n' +
      'event: text_delta\ndata: {"type":"text_delta","delta":"Hel'
  );

  assert.equal(firstChunk.events.length, 1);
  assert.equal(firstChunk.events[0].type, "run_started");
  assert.match(firstChunk.buffer, /text_delta/);

  const secondChunk = parseSseChunk(firstChunk.buffer, 'lo"}\n\n: keep-alive\n\n');

  assert.deepEqual(secondChunk.events, [{ type: "text_delta", delta: "Hello" }]);
  assert.equal(secondChunk.buffer, "");
});
