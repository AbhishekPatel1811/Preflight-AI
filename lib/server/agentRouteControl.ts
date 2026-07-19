import { openAIUserMessage } from "./openaiErrors";

type AgentRequestErrorBody = {
  cancelled?: true;
  error?: string;
};

export function createAgentRunSignal(requestSignal: AbortSignal, timeoutMs: number) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("Agent run timeout must be a positive finite number.");
  }

  return AbortSignal.any([requestSignal, AbortSignal.timeout(timeoutMs)]);
}

export function isRequestAbort(error: unknown, signal: AbortSignal) {
  if (signal.aborted) {
    return true;
  }

  return error instanceof DOMException && error.name === "AbortError";
}

export function agentRequestErrorResponse(error: unknown, signal: AbortSignal, model: string) {
  if (isRequestAbort(error, signal)) {
    return {
      status: 499,
      body: { cancelled: true } satisfies AgentRequestErrorBody
    };
  }

  return {
    status: 502,
    body: { error: openAIUserMessage(error, model) } satisfies AgentRequestErrorBody
  };
}
