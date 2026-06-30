import assert from "node:assert/strict";
import test from "node:test";
import type { PreflightInput, PreflightResult } from "../lib/types";

const input: PreflightInput = {
  productBrief: "We are launching an AI code review assistant for small engineering teams.",
  audience: "Startup CTOs and engineering leads",
  launchDate: "2026-07-15",
  constraints: "Small team, no paid ads, limited design assets, need a reliable QA and rollback plan",
  availableAssets: "Landing page draft, product demo video, waitlist form, LinkedIn founder post"
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
