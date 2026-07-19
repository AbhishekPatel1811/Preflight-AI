import { NextRequest } from "next/server";
import { runPreflightAgent, streamPreflightAgent } from "@/lib/agents/preflightAgent";
import { PRODUCT_NAME } from "@/lib/brand";
import { getServerEnv, MissingOpenAIKeyError } from "@/lib/server/env";
import { openAIErrorLog, openAIUserMessage } from "@/lib/server/openaiErrors";
import { jsonNoStore } from "@/lib/server/responses";
import { encodeSseEvent } from "@/lib/server/sse";
import { preflightInputSchema } from "@/lib/validators";

export const runtime = "nodejs";

function safeErrorMessage(error: unknown, model = "the configured model") {
  if (error instanceof MissingOpenAIKeyError) {
    return error.message;
  }

  return openAIUserMessage(error, model);
}

function isAbortLike(error: unknown, signal: AbortSignal) {
  if (signal.aborted) {
    return true;
  }

  return error instanceof DOMException && error.name === "AbortError";
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
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

    if (request.nextUrl.searchParams.get("mode") === "json") {
      const data = await runPreflightAgent(parsed.data, env, { signal: request.signal });
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
          for await (const event of streamPreflightAgent(parsed.data, env, { signal: request.signal })) {
            if (!enqueue(event)) {
              break;
            }
          }
        } catch (error) {
          if (isAbortLike(error, request.signal) || cancelled) {
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
    console.error(`${PRODUCT_NAME} agent request failed`, openAIErrorLog(error));

    return jsonNoStore(
      {
        error: safeErrorMessage(error)
      },
      { status: error instanceof MissingOpenAIKeyError ? 500 : 502 }
    );
  }
}
