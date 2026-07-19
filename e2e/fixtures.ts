import type { Page, Route } from "@playwright/test";
import { scoreLandingLens } from "../lib/agents/landingLens";
import type { PreflightInput, PreflightResult, StreamEvent } from "../lib/types";
import type { PageSignals } from "../lib/types/pageSignals";

const sampleInput: PreflightInput = {
  productUrl: "https://example.com",
  productBrief: "We are launching an AI code review assistant for small engineering teams.",
  audience: "Startup CTOs and engineering leads",
  launchDate: "2026-08-01",
  constraints: "Small team, no paid ads",
  availableAssets: "Landing page draft and demo video",
  manualPageCopy: ""
};

const sampleSignals: PageSignals = {
  source: "url",
  status: "success",
  requestedUrl: "https://example.com",
  finalUrl: "https://example.com",
  title: "AI code review for startup engineering teams",
  description: "Find review risks and ship cleaner pull requests without slowing delivery.",
  language: "en",
  h1: ["Ship cleaner code reviews with fewer surprises"],
  h2: ["Built for engineering leads", "Customer results", "Frequently asked questions"],
  ctas: [{ text: "Review your first pull request", href: "https://example.com/start" }],
  links: [
    { text: "Customer stories", href: "https://example.com/customers" },
    { text: "Security", href: "https://example.com/security" },
    { text: "Pricing", href: "https://example.com/pricing" }
  ],
  ogTags: { "og:title": "AI code review for startup engineering teams" },
  twitterTags: { "twitter:card": "summary_large_image" },
  robotsMeta: ["index", "follow"],
  jsonLdTypes: ["SoftwareApplication", "FAQPage"],
  hasRobotsTxt: true,
  hasSitemap: true,
  hasLlmsTxt: false,
  extractedText:
    "Built for startup engineering leads. Unlike generic review checklists, every finding becomes an actionable fix. Trusted by small product teams.",
  warnings: []
};

export const sampleResult = {
  summary: "The launch is close, with a focused set of fixes before public traffic.",
  prioritizedPlan: [
    { priority: "P0", task: "Clarify the launch promise", rationale: "The first screen needs one clear outcome.", suggestedOwner: "Product" },
    { priority: "P0", task: "Verify the signup path", rationale: "The primary conversion path must work before launch.", suggestedOwner: "Engineering" },
    { priority: "P1", task: "Add customer proof", rationale: "Specific evidence will improve trust.", suggestedOwner: "Marketing" },
    { priority: "P1", task: "Prepare support notes", rationale: "The team needs a launch-day escalation path.", suggestedOwner: "Support" },
    { priority: "P2", task: "Polish secondary copy", rationale: "Refine supporting messages after blockers are cleared.", suggestedOwner: "Marketing" }
  ],
  riskRegister: [
    { risk: "The signup path may regress.", severity: "high", mitigation: "Run the release checklist before launch." },
    { risk: "Support ownership is unclear.", severity: "medium", mitigation: "Assign an escalation owner." }
  ],
  ownerChecklist: [
    { owner: "Engineering", items: ["Verify signup", "Check monitoring", "Confirm rollback"] },
    { owner: "Marketing", items: ["Finalize message", "Prepare announcement"] }
  ],
  launchCopy: [
    { channel: "LinkedIn", headline: "Launch with fewer surprises", body: "Preflight the work before public traffic." },
    { channel: "Email", headline: "Your launch readiness report", body: "See the fixes, risks, owners, and next actions." }
  ],
  landingRecommendations: {
    heroHeadline: "Launch with fewer surprises",
    heroSupportingCopy: "Turn page evidence into a focused readiness report with owners, priorities, and next actions.",
    primaryCta: "Run your launch audit",
    ctaRationale: "The action names the report users receive.",
    proofRecommendations: [
      "Show one quantified launch outcome.",
      "Add a customer quote with role and company.",
      "Link to the audit methodology."
    ]
  },
  followUpQuestions: ["Who owns launch-day support?", "What is the primary conversion goal?"],
  pageSignals: sampleSignals,
  landingLens: scoreLandingLens(sampleInput, sampleSignals)
} satisfies PreflightResult;

const manualSignals: PageSignals = {
  source: "manual",
  status: "partial",
  title: "PreflightAI",
  description: "A launch readiness preflight for product teams.",
  language: "en",
  h1: ["Launch with fewer surprises"],
  h2: [],
  ctas: [],
  links: [],
  ogTags: {},
  twitterTags: {},
  robotsMeta: [],
  jsonLdTypes: [],
  hasRobotsTxt: false,
  hasSitemap: false,
  hasLlmsTxt: false,
  extractedText: "Submitted manual page copy.",
  warnings: []
};

export const manualResult = {
  ...sampleResult,
  pageSignals: manualSignals,
  landingLens: scoreLandingLens({ ...sampleInput, manualPageCopy: manualSignals.extractedText }, manualSignals)
} satisfies PreflightResult;

function toSseFrame(event: StreamEvent) {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export async function fulfillSse(route: Route, events: StreamEvent[]) {
  await route.fulfill({
    status: 200,
    headers: {
      "cache-control": "no-cache, no-transform",
      "content-type": "text/event-stream; charset=utf-8",
      connection: "keep-alive",
      "x-accel-buffering": "no"
    },
    body: events.map(toSseFrame).join("")
  });
}

export async function mockSuccessfulAgent(page: Page, result: PreflightResult = sampleResult) {
  await page.route("**/api/agent", async (route) => {
    await fulfillSse(route, [
      { type: "run_started", message: "PreflightAI is reviewing the brief." },
      { type: "tool_started", toolName: "check_launch_readiness", message: "Checking readiness." },
      { type: "tool_completed", toolName: "check_launch_readiness", message: "Readiness checked." },
      { type: "text_delta", delta: "Preparing the report." },
      { type: "final", data: result }
    ]);
  });
}

export function trackBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}
