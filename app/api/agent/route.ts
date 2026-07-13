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
      const data = await runPreflightAgent(parsed.data, env);
      return jsonNoStore({ data });
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of streamPreflightAgent(parsed.data, env)) {
            controller.enqueue(encodeSseEvent(event));
          }
        } catch (error) {
          console.error(`${PRODUCT_NAME} agent stream failed`, openAIErrorLog(error));
          controller.enqueue(
            encodeSseEvent({
              type: "error",
              message: safeErrorMessage(error, env.model)
            })
          );
        } finally {
          controller.close();
        }
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
