import test from "node:test";
import assert from "node:assert/strict";
import { extractTextDelta, normalizeRunStreamEvent } from "../lib/agents/streaming";

test("normalizes generic raw model text deltas", () => {
  const event = {
    type: "raw_model_stream_event",
    data: {
      type: "output_text_delta",
      delta: "Hello"
    }
  };

  assert.equal(extractTextDelta(event), "Hello");
  assert.deepEqual(normalizeRunStreamEvent(event), { type: "text_delta", delta: "Hello" });
});

test("normalizes Responses raw model text deltas", () => {
  const event = {
    type: "raw_model_stream_event",
    data: {
      event: {
        type: "response.output_text.delta",
        delta: "Launch"
      }
    }
  };

  assert.equal(extractTextDelta(event), "Launch");
});

test("normalizes tool call and tool output events by SDK event name", () => {
  assert.deepEqual(
    normalizeRunStreamEvent({
      type: "run_item_stream_event",
      name: "tool_called",
      item: { rawItem: { name: "check_launch_readiness" } }
    }),
    {
      type: "tool_started",
      toolName: "check_launch_readiness",
      message: "check_launch_readiness started."
    }
  );

  assert.deepEqual(
    normalizeRunStreamEvent({
      type: "run_item_stream_event",
      name: "tool_output",
      item: { rawItem: { name: "check_launch_readiness" } }
    }),
    {
      type: "tool_completed",
      toolName: "check_launch_readiness",
      message: "check_launch_readiness completed."
    }
  );
});
