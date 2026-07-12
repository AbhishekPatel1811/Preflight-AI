const encoder = new TextEncoder();

export function sseEventName(event: unknown) {
  if (typeof event !== "object" || event === null || !("type" in event)) {
    return "message";
  }

  const type = (event as { type?: unknown }).type;

  return typeof type === "string" ? type.replace(/[^a-zA-Z0-9_-]/g, "_") : "message";
}

export function encodeSseEvent(event: unknown) {
  return encoder.encode(`event: ${sseEventName(event)}\ndata: ${JSON.stringify(event)}\n\n`);
}
