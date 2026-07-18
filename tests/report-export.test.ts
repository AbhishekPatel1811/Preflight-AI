import assert from "node:assert/strict";
import test from "node:test";
import { formatPreflightReportMarkdown } from "../lib/reportExport";
import type { PreflightInput, PreflightResult } from "../lib/types";

const input: PreflightInput = {
  productUrl: "",
  productBrief: "We are launching an AI code review assistant for small engineering teams.",
  audience: "Startup CTOs and engineering leads",
  launchDate: "2026-07-15",
  constraints: "Small team, no paid ads, limited design assets",
  availableAssets: "Landing page draft, product demo video",
  manualPageCopy: ""
};

const result: PreflightResult = {
  summary: "The launch is promising but needs sharper onboarding before a public push.",
  prioritizedPlan: [
    {
      priority: "P0",
      task: "Verify onboarding for first-time users",
      rationale: "Launch traffic is wasted if activation breaks during the first wave.",
      suggestedOwner: "Engineering"
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

test("formats the generated PreflightAI report as portable markdown", () => {
  const markdown = formatPreflightReportMarkdown(input, result);

  assert.match(markdown, /^# PreflightAI report/m);
  assert.match(markdown, /## Launch context/);
  assert.match(markdown, /Audience: Startup CTOs and engineering leads/);
  assert.match(markdown, /## Prioritized plan/);
  assert.match(markdown, /1\. \[P0\] Verify onboarding for first-time users - Engineering/);
  assert.match(markdown, /## Risk register/);
  assert.match(markdown, /- \[high\] Demo video depends on unfinished UI polish\./);
  assert.match(markdown, /## Launch copy/);
  assert.match(markdown, /### Landing page/);
  assert.match(markdown, /## Follow-up questions/);
  assert.ok(!markdown.includes("undefined"));
});
