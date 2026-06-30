import "server-only";
import { Agent, run, setDefaultOpenAIKey, setTracingDisabled } from "@openai/agents";
import { PRODUCT_NAME } from "@/lib/brand";
import type { PreflightInput, PreflightResult, StreamEvent } from "@/lib/types";
import { preflightResultSchema } from "@/lib/types";
import { readLocalEnv } from "@/lib/server/localEnv";
import type { ServerEnv } from "@/lib/server/env";
import { preflightInstructions } from "./instructions";
import { normalizeRunStreamEvent } from "./streaming";
import { checkLaunchReadiness, checkLaunchReadinessTool } from "./tools/checkLaunchReadiness";
import { draftLaunchCopy, draftLaunchCopyTool } from "./tools/draftLaunchCopy";
import { extractTasksFromBrief, extractTasksTool } from "./tools/extractTasks";
import { generateOwnerChecklist, generateOwnerChecklistTool } from "./tools/generateOwnerChecklist";

const localEnv = readLocalEnv();

setTracingDisabled((localEnv.OPENAI_AGENTS_DISABLE_TRACING ?? process.env.OPENAI_AGENTS_DISABLE_TRACING) !== "0");

const tools = [
  extractTasksTool,
  checkLaunchReadinessTool,
  generateOwnerChecklistTool,
  draftLaunchCopyTool
];

function configureOpenAI(env: ServerEnv) {
  setDefaultOpenAIKey(env.openAIKey);
}

function createPreflightAgent(model: string) {
  return new Agent({
    name: PRODUCT_NAME,
    instructions: preflightInstructions,
    model,
    tools,
    outputType: preflightResultSchema
  });
}

function buildPrompt(input: PreflightInput) {
  return `
Create a launch plan from this brief.

Product brief:
${input.productBrief}

Target audience:
${input.audience}

Launch date:
${input.launchDate}

Constraints:
${input.constraints || "Not specified"}

Available assets:
${input.availableAssets || "Not specified"}

Call the available local tools before producing the final structured output. Include follow-up questions for any important unknowns.
`.trim();
}

function normalizeResult(value: unknown): PreflightResult {
  return preflightResultSchema.parse(value);
}

export async function runPreflightAgent(input: PreflightInput, env: ServerEnv) {
  configureOpenAI(env);

  const result = await run(createPreflightAgent(env.model), buildPrompt(input));

  return normalizeResult(result.finalOutput);
}

export async function* streamPreflightAgent(input: PreflightInput, env: ServerEnv): AsyncGenerator<StreamEvent> {
  configureOpenAI(env);

  yield {
    type: "run_started",
    message: `${PRODUCT_NAME} is reviewing the brief and preparing local planning tools.`
  };

  const preflightTools = [
    ["extract_launch_tasks", () => extractTasksFromBrief(input)],
    ["check_launch_readiness", () => checkLaunchReadiness(input)],
    ["generate_owner_checklist", () => generateOwnerChecklist(input)],
    ["draft_channel_launch_copy", () => draftLaunchCopy(input)]
  ] as const;

  for (const [toolName, execute] of preflightTools) {
    yield { type: "tool_started", toolName, message: `${toolName} running locally.` };
    execute();
    yield { type: "tool_completed", toolName, message: `${toolName} completed locally.` };
  }

  const result = await run(createPreflightAgent(env.model), buildPrompt(input), {
    stream: true
  });

  for await (const event of result) {
    const normalizedEvent = normalizeRunStreamEvent(event);

    if (normalizedEvent) {
      yield normalizedEvent;
    }
  }

  await result.completed;
  yield {
    type: "final",
    data: normalizeResult(result.finalOutput)
  };
}
