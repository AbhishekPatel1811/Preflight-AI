import assert from "node:assert/strict";
import test from "node:test";
import type { PreflightInput, PreflightResult } from "../lib/types";
import type { PageSignals } from "../lib/types/pageSignals";
import { scoreLandingLens } from "../lib/agents/landingLens";

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
  landingRecommendations: {
    heroHeadline: "Ship cleaner reviews before sprint planning",
    heroSupportingCopy: "Give engineering teams faster, more consistent pull-request feedback without slowing delivery.",
    primaryCta: "Review your first pull request",
    ctaRationale: "The action states the first product outcome.",
    proofRecommendations: [
      "Show the median review-time reduction.",
      "Add one engineering-lead quote.",
      "Publish supported repository and privacy details."
    ]
  },
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

  const matchedInput: PreflightInput = {
    ...input,
    productBrief: "Launch readiness planning workspace for product teams.",
    audience: "Product launch teams"
  };
  const landingLens = scoreLandingLens(matchedInput, successSignals);
  const report = reportAgent.mapPreflightResultToPreflightReport(matchedInput, {
    ...result,
    pageSignals: successSignals,
    landingLens
  });
  const parsed = reportTypes.preflightReportSchema.safeParse(report);

  assert.equal(parsed.success, true);
  assert.equal(report.product.name, "PreflightAI for launch teams");
  assert.equal(report.product.url, "https://example.com/final");
  const criterionScores = Object.fromEntries(
    landingLens.criteria.map((criterion) => [criterion.id, criterion.score ?? 0])
  ) as Record<(typeof landingLens.criteria)[number]["id"], number>;
  assert.equal(
    report.moduleScores.positioning,
    Math.round(
      (criterionScores.heroClarity * 20 +
        criterionScores.icpClarity * 15 +
        criterionScores.problemPromise * 15 +
        criterionScores.differentiation * 10) /
        60
    )
  );
  assert.equal(
    report.moduleScores.conversion,
    Math.round((criterionScores.ctaStrength * 15 + criterionScores.objectionHandling * 10) / 25)
  );
  assert.equal(report.moduleScores.trust, criterionScores.trustProof);
  assert.deepEqual(report.landingLens, landingLens);
  assert.ok(
    report.diagnostics.some(
      (diagnostic) =>
        diagnostic.module === "Landing Lens" &&
        diagnostic.title.includes("Hero clarity") &&
        diagnostic.evidence.includes("Ship launch plans without surprises") &&
        diagnostic.recommendation.length > 0
    )
  );
  assert.ok(
    report.diagnostics.some(
      (diagnostic) => diagnostic.module === "Landing Lens" && diagnostic.title.includes("CTA strength")
    )
  );
  assert.ok(
    report.diagnostics.some(
      (diagnostic) => diagnostic.module === "Landing Lens" && diagnostic.evidence.startsWith("Observed")
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
  assert.equal(report.diagnostics.filter((diagnostic) => diagnostic.module === "Landing Lens").length, 7);
  assert.ok(report.topFixes.some((fix) => fix.area.startsWith("Landing page - ")));
  assert.ok(report.artifacts.some((artifact) => artifact.type === "hero_rewrite"));
});

test("keeps partial and unavailable page evidence honest", async () => {
  const reportAgent = await import("../lib/agents/preflightReport");

  const partialReport = reportAgent.mapPreflightResultToPreflightReport(input, {
    ...result,
    pageSignals: partialSignals,
    landingLens: scoreLandingLens(input, partialSignals)
  });
  const unavailableReport = reportAgent.mapPreflightResultToPreflightReport(input, {
    ...result,
    pageSignals: unavailableSignals,
    landingLens: scoreLandingLens(input, unavailableSignals)
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
        diagnostic.module === "Landing Lens" &&
        diagnostic.title.includes("Hero clarity") &&
        diagnostic.evidence.includes("Observed H1: none")
    )
  );
  assert.equal(partialReport.landingLens?.status, "partial");

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
  assert.equal(unavailableReport.landingLens?.score, null);
  assert.equal(unavailableReport.moduleScores.positioning, 66);
  assert.equal(unavailableReport.moduleScores.conversion, 62);
  assert.equal(unavailableReport.moduleScores.trust, 58);
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
