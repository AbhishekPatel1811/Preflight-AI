import type { StreamEvent } from "@/lib/types";

export function parseSseFrame(frame: string): StreamEvent | null {
  const data = frame
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).replace(/^ /, ""))
    .join("\n");

  return data ? (JSON.parse(data) as StreamEvent) : null;
}

export function parseSseChunk(buffer: string, chunk: string) {
  const frames = `${buffer}${chunk}`.split(/\r?\n\r?\n/);
  const nextBuffer = frames.pop() || "";
  const events = frames.map(parseSseFrame).filter((event): event is StreamEvent => event !== null);

  return { buffer: nextBuffer, events };
}
