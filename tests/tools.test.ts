import test from "node:test";
import assert from "node:assert/strict";
import { checkLaunchReadiness } from "../lib/agents/tools/checkLaunchReadiness";
import { draftLaunchCopy } from "../lib/agents/tools/draftLaunchCopy";
import { extractTasksFromBrief } from "../lib/agents/tools/extractTasks";
import { generateOwnerChecklist } from "../lib/agents/tools/generateOwnerChecklist";
import { preflightInputSchema } from "../lib/validators";

const input = {
  productUrl: "",
  productBrief: "We are launching an AI code review assistant for small engineering teams with inline pull request feedback.",
  audience: "Startup CTOs and engineering leads",
  launchDate: "2026-07-15",
  constraints: "Small team, no paid ads, limited design assets, QA and rollback must be ready",
  availableAssets: "Landing page draft, product demo video, waitlist form, LinkedIn post",
  manualPageCopy: ""
};

test("validates a usable launch brief", () => {
  assert.equal(preflightInputSchema.safeParse(input).success, true);
});

test("extracts candidate tasks with priorities", () => {
  const output = extractTasksFromBrief(input);
  assert.ok(output.candidateTasks.length >= 4);
  assert.ok(output.candidateTasks.some((task) => task.priority === "P0"));
});

test("scores launch readiness with rubric output", () => {
  const output = checkLaunchReadiness(input);
  assert.ok(output.readinessScore > 50);
  assert.ok(Array.isArray(output.failingAreas));
});

test("generates owner checklists", () => {
  const output = generateOwnerChecklist(input);
  assert.ok(output.owners.some((owner) => owner.owner === "Engineering"));
});

test("drafts channel-specific copy", () => {
  const output = draftLaunchCopy(input);
  assert.ok(output.copy.some((copy) => copy.channel === "Landing page"));
});
