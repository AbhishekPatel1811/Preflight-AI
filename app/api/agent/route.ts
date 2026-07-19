import "server-only";
import { NextRequest } from "next/server";
import { runPreflightAgent, streamPreflightAgent } from "@/lib/agents/preflightAgent";
import { PRODUCT_NAME } from "@/lib/brand";
import { agentRequestErrorResponse, createAgentRunSignal, isRequestAbort } from "@/lib/server/agentRouteControl";
import { getServerEnv, MissingOpenAIKeyError } from "@/lib/server/env";
import { openAIErrorLog, openAIUserMessage } from "@/lib/server/openaiErrors";
import { readBoundedJson, RequestBodyTooLargeError } from "@/lib/server/requestBody";
import { jsonNoStore } from "@/lib/server/responses";
import { encodeSseEvent } from "@/lib/server/sse";
import { preflightInputSchema } from "@/lib/validators";

export const runtime = "nodejs";
const MAX_REQUEST_BYTES = 64 * 1024;
const AGENT_RUN_TIMEOUT_MS = 2 * 60 * 1000;

function safeErrorMessage(error: unknown, model = "the configured model") {
  if (error instanceof MissingOpenAIKeyError) {
    return error.message;
  }

  return openAIUserMessage(error, model);
}

export async function POST(request: NextRequest) {
  let body: unknown = null;
  try {
    body = await readBoundedJson(request, MAX_REQUEST_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return jsonNoStore({ error: "Launch brief is too large." }, { status: 413 });
    }
  }

  const parsed = preflightInputSchema.safeParse(body);

  if (!parsed.success) {
    return jsonNoStore(
      {
        error: "Invalid launch brief.",
        issues: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message
        }))
      },
      { status: 400 }
    );
  }

  try {
    const env = getServerEnv();
    const runSignal = createAgentRunSignal(request.signal, AGENT_RUN_TIMEOUT_MS);

    if (request.nextUrl.searchParams.get("mode") === "json") {
      const data = await runPreflightAgent(parsed.data, env, { signal: runSignal });
      return jsonNoStore({ data });
    }

    let cancelled = false;
    let closed = false;
    const markCancelled = () => {
      cancelled = true;
    };
    request.signal.addEventListener("abort", markCancelled, { once: true });

    const stream = new ReadableStream({
      async start(controller) {
        const enqueue = (event: Parameters<typeof encodeSseEvent>[0]) => {
          if (cancelled || closed || request.signal.aborted) {
            return false;
          }

          try {
            controller.enqueue(encodeSseEvent(event));
            return true;
          } catch {
            cancelled = true;
            return false;
          }
        };

        const close = () => {
          if (closed || cancelled) {
            return;
          }

          try {
            controller.close();
          } catch {
            cancelled = true;
          } finally {
            closed = true;
          }
        };

        try {
          for await (const event of streamPreflightAgent(parsed.data, env, { signal: runSignal })) {
            if (!enqueue(event)) {
              break;
            }
          }
        } catch (error) {
          if (isRequestAbort(error, request.signal) || cancelled) {
            return;
          }

          console.error(`${PRODUCT_NAME} agent stream failed`, openAIErrorLog(error));
          enqueue({
            type: "error",
            message: safeErrorMessage(error, env.model)
          });
        } finally {
          request.signal.removeEventListener("abort", markCancelled);
          close();
        }
      },
      cancel() {
        cancelled = true;
      }
    });

    return new Response(stream, {
      headers: {
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Content-Type": "text/event-stream; charset=utf-8",
        "X-Accel-Buffering": "no"
      }
    });
  } catch (error) {
    const response = agentRequestErrorResponse(error, request.signal, "the configured model");

    if (response.status === 499) {
      return jsonNoStore(response.body, { status: response.status });
    }

    console.error(`${PRODUCT_NAME} agent request failed`, openAIErrorLog(error));

    return jsonNoStore(
      error instanceof MissingOpenAIKeyError ? { error: safeErrorMessage(error) } : response.body,
      { status: error instanceof MissingOpenAIKeyError ? 500 : response.status }
    );
  }
}
