import { Agent, run, setDefaultOpenAIKey, setTracingDisabled } from "@openai/agents";
import { PRODUCT_NAME } from "@/lib/brand";
import type { PreflightInput, PreflightResult, StreamEvent } from "@/lib/types";
import { preflightCoreResultSchema, preflightResultSchema } from "@/lib/types";
import { resolvePageSignals } from "@/lib/server/pageSignals";
import { readLocalEnv } from "@/lib/server/localEnv";
import type { ServerEnv } from "@/lib/server/env";
import { pageSignalsSchema, type PageSignals } from "@/lib/types/pageSignals";
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
    outputType: preflightCoreResultSchema
  });
}

type PreflightAgentInstance = ReturnType<typeof createPreflightAgent>;

type NonStreamModelResult = {
  finalOutput: unknown;
};

type StreamModelResult = AsyncIterable<unknown> & {
  completed: Promise<unknown>;
  finalOutput: unknown;
};

export type PreflightAgentRunner = {
  run(agent: PreflightAgentInstance, prompt: string, options: { signal?: AbortSignal }): Promise<NonStreamModelResult>;
  stream(agent: PreflightAgentInstance, prompt: string, options: { signal?: AbortSignal }): Promise<StreamModelResult>;
};

export type PreflightRunOptions = {
  signal?: AbortSignal;
  resolveSignals?: typeof resolvePageSignals;
  runner?: PreflightAgentRunner;
};

const sdkRunner: PreflightAgentRunner = {
  run(agent, prompt, options) {
    return run(agent, prompt, { signal: options.signal });
  },
  stream(agent, prompt, options) {
    return run(agent, prompt, { stream: true, signal: options.signal });
  }
};

function buildPrompt(input: PreflightInput, pageSignals?: PageSignals) {
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

${serializePageEvidence(pageSignals)}

Call the available local tools before producing the final structured output. Include follow-up questions for any important unknowns.
`.trim();
}

function serializePageEvidence(pageSignals: PageSignals | undefined) {
  if (!pageSignals) {
    return "Observed page evidence:\nNot provided.";
  }

  const signals = pageSignalsSchema.parse(pageSignals);
  const lines = [
    "Observed page evidence:",
    "Use this as observed page evidence. Do not claim a page element exists unless it appears here. If status is unavailable, limit findings to the manual launch context.",
    `Source: ${signals.source}`,
    `Status: ${signals.status}`
  ];

  if (signals.status === "unavailable") {
    lines.push("Inspection limitation: Page evidence is unavailable, so limit page-specific findings to the manual launch context.");
  }

  pushField(lines, "Requested URL", signals.requestedUrl);
  pushField(lines, "Final URL", signals.finalUrl);
  pushField(lines, "Title", signals.title);
  pushField(lines, "Description", signals.description);
  pushField(lines, "Language", signals.language);
  pushList(lines, "H1", signals.h1);
  pushList(lines, "H2", signals.h2);
  pushList(
    lines,
    "CTA text",
    signals.ctas.map((cta) => cta.href ? `${cta.text} (${cta.href})` : cta.text)
  );
  pushEntries(lines, "Open Graph tags", signals.ogTags);
  pushEntries(lines, "Twitter tags", signals.twitterTags);
  pushList(lines, "Robots meta", signals.robotsMeta);
  lines.push(`Has robots.txt: ${signals.hasRobotsTxt ? "yes" : "no"}`);
  lines.push(`Has sitemap: ${signals.hasSitemap ? "yes" : "no"}`);
  lines.push(`Has llms.txt: ${signals.hasLlmsTxt ? "yes" : "no"}`);
  pushList(lines, "JSON-LD types", signals.jsonLdTypes);
  pushField(lines, "Extracted text", signals.extractedText);
  pushList(lines, "Warnings", signals.warnings);

  return lines.join("\n");
}

function pushField(lines: string[], label: string, value: string | undefined) {
  if (value) {
    lines.push(`${label}: ${value}`);
  }
}

function pushList(lines: string[], label: string, values: string[]) {
  if (values.length > 0) {
    lines.push(`${label}: ${values.join("; ")}`);
  }
}

function pushEntries(lines: string[], label: string, values: Record<string, string>) {
  const entries = Object.entries(values);
  if (entries.length > 0) {
    lines.push(`${label}: ${entries.map(([key, value]) => `${key}=${value}`).join("; ")}`);
  }
}

function normalizeResult(value: unknown, pageSignals: PageSignals | undefined): PreflightResult {
  const coreResult = preflightCoreResultSchema.parse(value);

  return preflightResultSchema.parse(pageSignals ? { ...coreResult, pageSignals } : coreResult);
}

function shouldResolvePageSignals(input: PreflightInput) {
  return Boolean(input.productUrl.trim() || input.manualPageCopy.trim());
}

async function preparePreflightRun(input: PreflightInput, options: PreflightRunOptions = {}) {
  const resolveSignals = options.resolveSignals ?? resolvePageSignals;
  const pageSignals = shouldResolvePageSignals(input)
    ? pageSignalsSchema.parse(await resolveSignals(input, { signal: options.signal }))
    : undefined;

  return {
    pageSignals,
    prompt: buildPrompt(input, pageSignals)
  };
}

export async function runPreflightAgent(input: PreflightInput, env: ServerEnv, options: PreflightRunOptions = {}) {
  configureOpenAI(env);

  const prepared = await preparePreflightRun(input, options);
  const runner = options.runner ?? sdkRunner;
  const result = await runner.run(createPreflightAgent(env.model), prepared.prompt, {
    signal: options.signal
  });

  return normalizeResult(result.finalOutput, prepared.pageSignals);
}

export async function* streamPreflightAgent(
  input: PreflightInput,
  env: ServerEnv,
  options: PreflightRunOptions = {}
): AsyncGenerator<StreamEvent> {
  configureOpenAI(env);

  yield {
    type: "run_started",
    message: `${PRODUCT_NAME} is reviewing the brief and preparing local planning tools.`
  };

  let prepared: Awaited<ReturnType<typeof preparePreflightRun>>;
  if (shouldResolvePageSignals(input)) {
    yield {
      type: "tool_started",
      toolName: "extract_page_signals",
      message: "extract_page_signals running locally."
    };
    prepared = await preparePreflightRun(input, options);
    yield {
      type: "tool_completed",
      toolName: "extract_page_signals",
      message: "extract_page_signals completed locally."
    };
  } else {
    prepared = await preparePreflightRun(input, options);
  }

  const preflightTools = [
    ["extract_launch_tasks", () => extractTasksFromBrief(input)],
    ["check_launch_readiness", () => checkLaunchReadiness(input)],
    ["generate_owner_checklist", () => generateOwnerChecklist(input)],
    ["draft_channel_launch_copy", () => draftLaunchCopy(input)]
  ] as const;

  for (const [toolName, execute] of preflightTools) {
    yield { type: "tool_started", toolName, message: `${toolName} running locally.` };
    await Promise.resolve(execute());
    yield { type: "tool_completed", toolName, message: `${toolName} completed locally.` };
  }

  const runner = options.runner ?? sdkRunner;
  const result = await runner.stream(createPreflightAgent(env.model), prepared.prompt, {
    signal: options.signal
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
    data: normalizeResult(result.finalOutput, prepared.pageSignals)
  };
}
