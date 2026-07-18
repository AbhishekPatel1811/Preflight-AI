import { tool } from "@openai/agents";
import { z } from "zod";
import type { PreflightInput } from "@/lib/types";
import { daysUntilLaunch } from "./shared";

export type ReadinessOutput = {
  readinessScore: number;
  failingAreas: string[];
  suggestedFixes: string[];
};

const rubric = [
  { area: "positioning clarity", test: (input: PreflightInput) => input.productBrief.length > 60 },
  { area: "audience clarity", test: (input: PreflightInput) => input.audience.length > 10 },
  { area: "asset readiness", test: (input: PreflightInput) => input.availableAssets.length > 10 },
  { area: "engineering readiness", test: (input: PreflightInput) => /qa|test|release|rollback|bug|engineering/i.test(input.constraints + input.productBrief) },
  { area: "support readiness", test: (input: PreflightInput) => /support|faq|docs|help/i.test(input.constraints + input.availableAssets) },
  { area: "launch channel readiness", test: (input: PreflightInput) => /email|linkedin|product hunt|landing|in-app|x\b|changelog/i.test(input.availableAssets + input.constraints) },
  { area: "risk preparedness", test: (input: PreflightInput) => /risk|constraint|limited|small team|no paid|approval/i.test(input.constraints) },
  { area: "schedule realism", test: (input: PreflightInput) => (daysUntilLaunch(input) ?? 999) >= 7 }
];

export function checkLaunchReadiness(input: PreflightInput): ReadinessOutput {
  const failingAreas = rubric.filter((item) => !item.test(input)).map((item) => item.area);
  const passed = rubric.length - failingAreas.length;
  const readinessScore = Math.round((passed / rubric.length) * 100);

  return {
    readinessScore,
    failingAreas,
    suggestedFixes: failingAreas.map((area) => {
      if (area === "engineering readiness") {
        return "Add explicit QA, rollback, release owner, and launch-day monitoring checks.";
      }

      if (area === "launch channel readiness") {
        return "Choose the channels that fit the audience and list required assets per channel.";
      }

      if (area === "schedule realism") {
        return "Reduce launch scope or move low-priority work after launch if the date is inside one week.";
      }

      return `Clarify ${area} before committing to the final launch checklist.`;
    })
  };
}

export const checkLaunchReadinessTool = tool({
  name: "check_launch_readiness",
  description: "Score a launch brief against a practical readiness rubric and suggest fixes.",
  parameters: z.object({
    productBrief: z.string(),
    audience: z.string(),
    launchDate: z.string(),
    constraints: z.string(),
    availableAssets: z.string()
  }),
  async execute(input) {
    // Deterministic rubric scorer used to anchor the model's risk assessment.
    return checkLaunchReadiness({ ...input, productUrl: "", manualPageCopy: "" });
  }
});
