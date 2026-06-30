import { tool } from "@openai/agents";
import { z } from "zod";
import type { PreflightInput } from "@/lib/types";
import { splitList, type CandidateTask } from "./shared";

export type ExtractTasksOutput = {
  candidateTasks: CandidateTask[];
  missingInformation: string[];
};

export function extractTasksFromBrief(input: PreflightInput): ExtractTasksOutput {
  const assets = splitList(input.availableAssets);
  const constraints = input.constraints.toLowerCase();
  const missingInformation: string[] = [];

  if (!input.availableAssets.trim()) {
    missingInformation.push("Available launch assets are not listed.");
  }

  if (!/channel|email|linkedin|product hunt|in-app|landing|x\b/i.test(input.availableAssets + input.constraints)) {
    missingInformation.push("Launch channels are not specified.");
  }

  if (!/owner|engineering|product|marketing|design|support|founder|lead/i.test(input.constraints)) {
    missingInformation.push("Named owners or accountable teams are not specified.");
  }

  const candidateTasks: CandidateTask[] = [
    {
      task: "Lock launch scope and success criteria",
      priority: "P0",
      suggestedOwner: "Product",
      reason: "The team needs a crisp definition of what is launching and how success will be judged."
    },
    {
      task: "Complete QA and release readiness review",
      priority: "P0",
      suggestedOwner: "Engineering",
      reason: "Engineering-led launches need explicit quality and rollback checks before public motion."
    },
    {
      task: "Finalize positioning for the target audience",
      priority: "P0",
      suggestedOwner: "Product marketing",
      reason: `The audience is ${input.audience}, so messaging should map directly to their pains and desired outcomes.`
    },
    {
      task: "Prepare support notes and customer-facing FAQ",
      priority: "P1",
      suggestedOwner: "Support",
      reason: "Support needs known limitations, setup steps, and escalation paths before launch."
    },
    {
      task: "Assemble launch assets and publication checklist",
      priority: assets.length > 0 ? "P1" : "P0",
      suggestedOwner: "Marketing",
      reason: assets.length > 0 ? `Current assets include ${assets.slice(0, 3).join(", ")}.` : "Missing assets can block the launch path."
    }
  ];

  if (constraints.includes("no paid ads") || constraints.includes("limited")) {
    candidateTasks.push({
      task: "Prioritize organic channels and founder-led distribution",
      priority: "P1",
      suggestedOwner: "Founder / lead",
      reason: "The stated constraints point toward focused, low-budget channel execution."
    });
  }

  return { candidateTasks, missingInformation };
}

export const extractTasksTool = tool({
  name: "extract_launch_tasks",
  description: "Convert a rough launch brief into candidate launch tasks and identify missing information.",
  parameters: z.object({
    productBrief: z.string(),
    audience: z.string(),
    launchDate: z.string(),
    constraints: z.string(),
    availableAssets: z.string()
  }),
  async execute(input) {
    // Deterministic local planning helper; no external services are called.
    return extractTasksFromBrief(input);
  }
});
