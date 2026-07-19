import assert from "node:assert/strict";
import test from "node:test";
import type { PreflightInput, PreflightResult } from "../lib/types";
import type { PageSignals } from "../lib/types/pageSignals";

const input: PreflightInput = {
  productUrl: "",
  productBrief: "We are launching an AI code review assistant for small engineering teams.",
  audience: "Startup CTOs and engineering leads",
  launchDate: "2026-07-15",
  constraints: "Small team, no paid ads, limited design assets, need a reliable QA and rollback plan",
  availableAssets: "Landing page draft, product demo video, waitlist form, LinkedIn founder post",
  manualPageCopy: ""
};

const result: PreflightResult = {
  summary: "The launch is promising but needs sharper onboarding, proof, and fallback planning before a public push.",
  prioritizedPlan: [
    {
      priority: "P0",
      task: "Verify onboarding for first-time users",
      rationale: "Launch traffic is wasted if activation breaks during the first wave.",
      suggestedOwner: "Engineering"
    },
    {
      priority: "P1",
      task: "Tighten landing page proof",
      rationale: "The audience needs a concrete reason to trust the product before signup.",
      suggestedOwner: "Marketing"
    },
    {
      priority: "P2",
      task: "Polish launch copy variations",
      rationale: "Secondary channels should feel consistent after the core path is ready.",
      suggestedOwner: "Founder"
    }
  ],
  riskRegister: [
    {
      risk: "Demo video depends on unfinished UI polish.",
      severity: "high",
      mitigation: "Record a fallback walkthrough with the current build by T-3 days."
    }
  ],
  ownerChecklist: [
    {
      owner: "Engineering",
      items: ["Test invite flow", "Prepare rollback plan"]
    }
  ],
  launchCopy: [
    {
      channel: "Landing page",
      headline: "Ship cleaner reviews before sprint planning.",
      body: "Improve pull request quality without slowing the team down."
    }
  ],
  followUpQuestions: ["Is this a waitlist launch, public launch, or private beta?"]
};

const successSignals: PageSignals = {
  source: "url",
  status: "success",
  requestedUrl: "https://example.com/product",
  finalUrl: "https://example.com/final",
  title: "PreflightAI for launch teams",
  description: "Plan launch readiness, proof, and owner follow-through from one page.",
  language: "en",
  h1: ["Ship launch plans without surprises"],
  h2: ["Proof", "Owners", "Readiness"],
  ctas: [
    { text: "Start free", href: "https://example.com/signup" },
    { text: "Book demo", href: "https://example.com/demo" }
  ],
  links: [
    { text: "Pricing", href: "https://example.com/pricing" },
    { text: "Customer stories", href: "https://example.com/customers" },
    { text: "Security", href: "https://example.com/security" },
    { text: "Contact sales", href: "https://example.com/contact" }
  ],
  ogTags: { "og:title": "PreflightAI for launch teams" },
  twitterTags: { "twitter:card": "summary_large_image" },
  robotsMeta: ["index", "follow"],
  jsonLdTypes: ["SoftwareApplication"],
  hasRobotsTxt: true,
  hasSitemap: true,
  hasLlmsTxt: false,
  extractedText: "This should stay out of exports.",
  warnings: []
};

const partialSignals: PageSignals = {
  source: "url",
  status: "partial",
  requestedUrl: "https://example.com/product",
  title: "PreflightAI",
  description: "",
  language: "en",
  h1: [],
  h2: [],
  ctas: [{ text: "Request access" }],
  links: [{ text: "Docs", href: "https://example.com/docs" }],
  ogTags: {},
  twitterTags: {},
  robotsMeta: [],
  jsonLdTypes: [],
  hasRobotsTxt: false,
  hasSitemap: false,
  hasLlmsTxt: false,
  extractedText: "",
  warnings: ["Only a limited subset of page elements was inspected."]
};

const unavailableSignals: PageSignals = {
  source: "url",
  status: "unavailable",
  requestedUrl: "https://example.com/product",
  title: "",
  description: "",
  language: "en",
  h1: [],
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
  extractedText: "Raw text must not leak into exported markdown.",
  warnings: ["The page could not be inspected from the public URL."]
};

test("maps core agent output into a PreflightAI report", async () => {
  const reportTypes = await import("../lib/types/preflight").catch(() => null);
  const reportAgent = await import("../lib/agents/preflightReport").catch(() => null);

  assert.ok(reportTypes, "expected lib/types/preflight.ts to exist");
  assert.ok(reportAgent, "expected lib/agents/preflightReport.ts to exist");

  const report = reportAgent.mapPreflightResultToPreflightReport(input, result);
  const parsed = reportTypes.preflightReportSchema.safeParse(report);

  assert.equal(parsed.success, true);
  assert.equal(report.source, "preflight_core");
  assert.equal(report.product.name, "AI code review assistant");
  assert.equal(report.product.targetAudience, input.audience);
  assert.equal(report.product.launchGoal, "Plan launch from rough brief");
  assert.equal(report.product.launchChannel, "Not specified");
  assert.equal(report.overallScore, 72);
  assert.deepEqual(Object.keys(report.moduleScores), [
    "positioning",
    "conversion",
    "trust",
    "demoClarity",
    "geoReadiness",
    "launchOps"
  ]);
  assert.ok(report.topFixes.some((fix) => fix.priority === "P0" && fix.area === "Launch ops"));
  assert.ok(report.diagnostics.some((diagnostic) => diagnostic.module === "PreflightAI Core"));
  assert.ok(report.artifacts.some((artifact) => artifact.type === "launch_post"));
  assert.deepEqual(report.followUpQuestions, result.followUpQuestions);
});

test("maps observed page signals into deterministic report coverage and diagnostics", async () => {
  const reportTypes = await import("../lib/types/preflight");
  const reportAgent = await import("../lib/agents/preflightReport");

  const report = reportAgent.mapPreflightResultToPreflightReport(input, {
    ...result,
    pageSignals: successSignals
  });
  const parsed = reportTypes.preflightReportSchema.safeParse(report);

  assert.equal(parsed.success, true);
  assert.equal(report.product.name, "PreflightAI for launch teams");
  assert.equal(report.product.url, "https://example.com/final");
  assert.deepEqual(report.moduleScores, {
    positioning: 100,
    conversion: 100,
    trust: 100,
    demoClarity: 60,
    geoReadiness: 83,
    launchOps: 72
  });
  assert.equal(report.overallScore, 87);
  assert.ok(report.overallScore > 72);
  assert.ok(
    report.diagnostics.some(
      (diagnostic) =>
        diagnostic.title.includes("Observed title") &&
        diagnostic.evidence.includes("PreflightAI for launch teams") &&
        diagnostic.recommendation.length > 0
    )
  );
  assert.ok(
    report.diagnostics.some(
      (diagnostic) =>
        diagnostic.title.includes("Observed H1") &&
        diagnostic.evidence.includes("Ship launch plans without surprises")
    )
  );
  assert.ok(
    report.diagnostics.some(
      (diagnostic) => diagnostic.title.includes("CTA coverage") && diagnostic.evidence.includes("2 CTA")
    )
  );
  assert.ok(
    report.diagnostics.some(
      (diagnostic) =>
        diagnostic.title.includes("Metadata coverage") &&
        diagnostic.evidence.includes("Open Graph") &&
        diagnostic.evidence.includes("JSON-LD")
    )
  );
  assert.ok(
    report.diagnostics.some(
      (diagnostic) =>
        diagnostic.title.includes("Crawl files") &&
        diagnostic.evidence.includes("robots.txt: yes") &&
        diagnostic.evidence.includes("llms.txt: no")
    )
  );
  assert.ok(!report.diagnostics.some((diagnostic) => diagnostic.title.includes("Landing Lens")));
});

test("keeps partial and unavailable page evidence honest", async () => {
  const reportAgent = await import("../lib/agents/preflightReport");

  const partialReport = reportAgent.mapPreflightResultToPreflightReport(input, {
    ...result,
    pageSignals: partialSignals
  });
  const unavailableReport = reportAgent.mapPreflightResultToPreflightReport(input, {
    ...result,
    pageSignals: unavailableSignals
  });

  assert.equal(partialReport.product.url, "https://example.com/product");
  assert.equal(partialReport.product.name, "PreflightAI");
  assert.ok(
    partialReport.diagnostics.some(
      (diagnostic) =>
        diagnostic.title.includes("Partial") &&
        diagnostic.evidence.includes("Only a limited subset of page elements was inspected")
    )
  );
  assert.ok(
    partialReport.diagnostics.some(
      (diagnostic) =>
        diagnostic.title.includes("Observed H1") &&
        diagnostic.evidence.includes("No H1 was captured")
    )
  );
  assert.ok(partialReport.overallScore < 72);

  assert.equal(unavailableReport.product.url, "https://example.com/product");
  assert.equal(unavailableReport.product.name, "AI code review assistant");
  assert.ok(
    unavailableReport.diagnostics.some(
      (diagnostic) =>
        diagnostic.title.includes("Unavailable") &&
        diagnostic.evidence.includes("No public page elements were inspected")
    )
  );
  assert.ok(
    unavailableReport.diagnostics.some(
      (diagnostic) =>
        diagnostic.title.includes("Crawl files") && diagnostic.evidence.includes("not inspected")
    )
  );
  assert.ok(unavailableReport.overallScore < partialReport.overallScore);
});

test("builds a customer-friendly PreflightAI report view model", async () => {
  const reportAgent = await import("../lib/agents/preflightReport");
  const reportView = await import("../lib/ui/preflightViewModel");

  const report = reportAgent.mapPreflightResultToPreflightReport(input, result);
  const view = reportView.getPreflightReportView(report);

  assert.equal(view.moduleCards.length, 6);
  assert.deepEqual(
    view.moduleCards.map((module) => module.label),
    ["Positioning", "Conversion", "Trust", "Demo clarity", "GEO readiness", "Launch ops"]
  );
  assert.equal(view.moduleCards.find((module) => module.id === "geoReadiness")?.tone, "destructive");
  assert.equal(view.fixLanes.length, 3);
  assert.deepEqual(
    view.fixLanes.map((lane) => lane.title),
    ["Fix now", "Improve next", "Polish later"]
  );
  assert.deepEqual(
    view.fixLanes.map((lane) => lane.fixes.map((fix) => fix.priority)),
    [["P0"], ["P1"], ["P2"]]
  );
  assert.equal(view.spotlightFix?.priority, "P0");
  assert.equal(view.spotlightFix?.issue, "Verify onboarding for first-time users");
});
