import { isOpenAIResponsesRawModelStreamEvent } from "@openai/agents";
import type { StreamEvent } from "@/lib/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringAt(value: unknown, keys: string[]) {
  let cursor: unknown = value;

  for (const key of keys) {
    if (!isRecord(cursor)) {
      return undefined;
    }

    cursor = cursor[key];
  }

  return typeof cursor === "string" ? cursor : undefined;
}

export function extractTextDelta(event: unknown) {
  if (!isRecord(event) || event.type !== "raw_model_stream_event") {
    return null;
  }

  const genericDelta = stringAt(event, ["data", "delta"]);
  const genericType = stringAt(event, ["data", "type"]);

  if (genericType === "output_text_delta" && genericDelta) {
    return genericDelta;
  }

  const responsesDelta = stringAt(event, ["data", "event", "delta"]);
  const responsesType = stringAt(event, ["data", "event", "type"]);

  if (responsesType === "response.output_text.delta" && responsesDelta) {
    return responsesDelta;
  }

  type RawModelEvent = Parameters<typeof isOpenAIResponsesRawModelStreamEvent>[0];

  if (isOpenAIResponsesRawModelStreamEvent(event as unknown as RawModelEvent)) {
    return stringAt(event, ["data", "delta"]) || null;
  }

  return null;
}

export function extractToolName(item: unknown) {
  return (
    stringAt(item, ["rawItem", "name"]) ||
    stringAt(item, ["rawItem", "function", "name"]) ||
    stringAt(item, ["name"]) ||
    stringAt(item, ["toolName"]) ||
    "local_tool"
  );
}

export function normalizeRunStreamEvent(event: unknown): StreamEvent | null {
  const delta = extractTextDelta(event);

  if (delta) {
    return { type: "text_delta", delta };
  }

  if (!isRecord(event) || event.type !== "run_item_stream_event") {
    return null;
  }

  const name = stringAt(event, ["name"]);
  const toolName = extractToolName(event.item);

  if (name === "tool_called") {
    return {
      type: "tool_started",
      toolName,
      message: `${toolName} started.`
    };
  }

  if (name === "tool_output") {
    return {
      type: "tool_completed",
      toolName,
      message: `${toolName} completed.`
    };
  }

  return null;
}
