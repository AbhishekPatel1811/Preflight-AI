export class RequestBodyTooLargeError extends Error {
  constructor(maxBytes: number) {
    super(`Request body exceeds the ${maxBytes}-byte limit.`);
    this.name = "RequestBodyTooLargeError";
  }
}

export async function readBoundedJson(request: Request, maxBytes: number): Promise<unknown> {
  if (!Number.isInteger(maxBytes) || maxBytes <= 0) {
    throw new Error("Request body maxBytes must be a positive integer.");
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new RequestBodyTooLargeError(maxBytes);
  }

  if (!request.body) {
    return JSON.parse("");
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = "";

  try {
    while (true) {
      const result = await reader.read();
      if (result.done) {
        text += decoder.decode();
        return JSON.parse(text);
      }

      bytesRead += result.value.byteLength;
      if (bytesRead > maxBytes) {
        await reader.cancel("Request body limit exceeded.");
        throw new RequestBodyTooLargeError(maxBytes);
      }

      text += decoder.decode(result.value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}
