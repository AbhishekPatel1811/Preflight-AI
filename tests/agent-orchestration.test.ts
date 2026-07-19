import assert from "node:assert/strict";
import test from "node:test";
import { preflightCoreResultSchema, type PreflightInput, type PreflightResult } from "../lib/types";
import type { PageSignals } from "../lib/types/pageSignals";
import { runPreflightAgent, streamPreflightAgent } from "../lib/agents/preflightAgent";
import type { ServerEnv } from "../lib/server/env";

const env: ServerEnv = {
  openAIKey: "test-key",
  model: "test-model"
};

const input: PreflightInput = {
  productUrl: "https://example.com/product",
  productBrief: "Launch a release planning assistant for small engineering-led SaaS teams.",
  audience: "Founders and engineering leads",
  launchDate: "2026-08-01",
  constraints: "No paid ads. Engineering owns launch readiness.",
  availableAssets: "Landing page, email draft, changelog",
  manualPageCopy: ""
};

const coreResult = {
  summary: "Ready to plan.",
  prioritizedPlan: [
    {
      priority: "P0" as const,
      task: "Finalize launch narrative",
      rationale: "The launch needs a crisp promise.",
      suggestedOwner: "Product marketing"
    }
  ],
  riskRegister: [
    {
      risk: "Messaging may be vague.",
      severity: "medium" as const,
      mitigation: "Review page evidence before publishing."
    }
  ],
  ownerChecklist: [
    {
      owner: "Engineering",
      items: ["Confirm release readiness"]
    }
  ],
  launchCopy: [
    {
      channel: "Email",
      headline: "Launch with fewer surprises",
      body: "Prepare every owner before launch day."
    }
  ],
  followUpQuestions: ["Who owns support coverage?"]
};

const pageSignals: PageSignals = {
  source: "url",
  status: "success",
  requestedUrl: "https://example.com/product",
  finalUrl: "https://example.com/final",
  title: "Observed Launch Page",
  description: "A launch planning workspace for product teams.",
  language: "en",
  h1: ["Launch without surprises"],
  h2: ["Plan", "Ship"],
  ctas: [{ text: "Start free", href: "https://example.com/signup" }],
  links: [{ text: "Pricing", href: "https://example.com/pricing" }],
  ogTags: { "og:title": "Observed Launch Page" },
  twitterTags: { "twitter:card": "summary_large_image" },
  robotsMeta: ["index", "follow"],
  jsonLdTypes: ["SoftwareApplication"],
  hasRobotsTxt: true,
  hasSitemap: true,
  hasLlmsTxt: false,
  extractedText: "Observed page evidence only. No raw markup remains.",
  warnings: []
};

const replacementSignals: PageSignals = {
  ...pageSignals,
  title: "Model tried to replace signals",
  extractedText: "This should not win."
};

function createRunner(calls: { prompt?: string; signal?: AbortSignal; agent?: unknown; order?: string[] } = {}) {
  return {
    async run(agent: unknown, prompt: string, options: { signal?: AbortSignal }) {
      calls.agent = agent;
      calls.prompt = prompt;
      calls.signal = options.signal;
      calls.order?.push("model");
      return {
        finalOutput: {
          ...coreResult,
          pageSignals: replacementSignals
        }
      };
    },
    async stream(agent: unknown, prompt: string, options: { signal?: AbortSignal }) {
      calls.agent = agent;
      calls.prompt = prompt;
      calls.signal = options.signal;
      calls.order?.push("model");

      async function* events() {
        yield {
          type: "raw_model_stream_event",
          data: { type: "output_text_delta", delta: "Planning" }
        };
      }

      return Object.assign(events(), {
        completed: Promise.resolve(undefined),
        finalOutput: coreResult
      });
    }
  };
}

async function collectAsync<T>(iterable: AsyncIterable<T>) {
  const items: T[] = [];
  for await (const item of iterable) {
    items.push(item);
  }

  return items;
}

test("URL runs resolve page signals once before the model and attach deterministic signals", async () => {
  const order: string[] = [];
  let resolveCount = 0;
  const calls: { prompt?: string; agent?: unknown; order: string[] } = { order };

  const result = await runPreflightAgent(input, env, {
    runner: createRunner(calls),
    async resolveSignals(receivedInput) {
      resolveCount += 1;
      assert.deepEqual(receivedInput, input);
      order.push("signals");
      return pageSignals;
    }
  });

  assert.equal(resolveCount, 1);
  assert.deepEqual(order, ["signals", "model"]);
  assert.deepEqual(result.pageSignals, pageSignals);
  assert.notDeepEqual(result.pageSignals, replacementSignals);
  assert.equal((calls.agent as { outputType?: unknown }).outputType, preflightCoreResultSchema);
});

test("brief-only runs skip page-signal extraction", async () => {
  const briefOnlyInput = { ...input, productUrl: "", manualPageCopy: "" };

  const result = await runPreflightAgent(briefOnlyInput, env, {
    runner: createRunner(),
    async resolveSignals() {
      throw new Error("brief-only runs should not resolve page signals");
    }
  });

  assert.equal(result.pageSignals, undefined);
});

test("prompt serializes bounded page evidence without raw HTML and includes unavailable limitations", async () => {
  const unavailableSignals: PageSignals = {
    ...pageSignals,
    status: "unavailable",
    title: "",
    description: "",
    h1: [],
    h2: [],
    ctas: [],
    links: [],
    ogTags: {},
    twitterTags: {},
    jsonLdTypes: [],
    hasRobotsTxt: false,
    hasSitemap: false,
    hasLlmsTxt: false,
    extractedText: "",
    warnings: ["The URL is not available for public auditing."]
  };
  const calls: { prompt?: string } = {};

  await runPreflightAgent(
    {
      ...input,
      manualPageCopy: "<html><body><h1>RAW HTML SHOULD NOT APPEAR</h1></body></html>"
    },
    env,
    {
      runner: createRunner(calls),
      async resolveSignals() {
        return unavailableSignals;
      }
    }
  );

  assert.match(
    calls.prompt ?? "",
    /Use this as observed page evidence\. Do not claim a page element exists unless it appears here\. If status is unavailable, limit findings to the manual launch context\./
  );
  assert.match(calls.prompt ?? "", /Status: unavailable/);
  assert.match(calls.prompt ?? "", /Inspection limitation: Page evidence is unavailable/);
  assert.match(calls.prompt ?? "", /The URL is not available for public auditing\./);
  assert.doesNotMatch(calls.prompt ?? "", /RAW HTML SHOULD NOT APPEAR/);
  assert.doesNotMatch(calls.prompt ?? "", /<html>/);
});

test("same abort signal reaches page-signal resolution and non-streaming model options", async () => {
  const controller = new AbortController();
  const calls: { signal?: AbortSignal } = {};
  let extractionSignal: AbortSignal | undefined;

  await runPreflightAgent(input, env, {
    signal: controller.signal,
    runner: createRunner(calls),
    async resolveSignals(_receivedInput, options) {
      extractionSignal = options?.signal;
      return pageSignals;
    }
  });

  assert.equal(extractionSignal, controller.signal);
  assert.equal(calls.signal, controller.signal);
});

test("streaming emits extraction progress before local tools, model events, and final", async () => {
  const events = await collectAsync(
    streamPreflightAgent(input, env, {
      runner: createRunner(),
      async resolveSignals() {
        return pageSignals;
      }
    })
  );

  assert.deepEqual(
    events.map((event) =>
      event.type === "tool_started" || event.type === "tool_completed" ? `${event.type}:${event.toolName}` : event.type
    ),
    [
      "run_started",
      "tool_started:extract_page_signals",
      "tool_completed:extract_page_signals",
      "tool_started:extract_launch_tasks",
      "tool_completed:extract_launch_tasks",
      "tool_started:check_launch_readiness",
      "tool_completed:check_launch_readiness",
      "tool_started:generate_owner_checklist",
      "tool_completed:generate_owner_checklist",
      "tool_started:draft_channel_launch_copy",
      "tool_completed:draft_channel_launch_copy",
      "text_delta",
      "final"
    ]
  );

  const finalEvent = events.at(-1);
  assert.equal(finalEvent?.type, "final");
  assert.deepEqual((finalEvent as { data: PreflightResult }).data.pageSignals, pageSignals);
});

test("same abort signal reaches page-signal resolution and streaming model options", async () => {
  const controller = new AbortController();
  const calls: { signal?: AbortSignal } = {};
  let extractionSignal: AbortSignal | undefined;

  await collectAsync(
    streamPreflightAgent(input, env, {
      signal: controller.signal,
      runner: createRunner(calls),
      async resolveSignals(_receivedInput, options) {
        extractionSignal = options?.signal;
        return pageSignals;
      }
    })
  );

  assert.equal(extractionSignal, controller.signal);
  assert.equal(calls.signal, controller.signal);
});
