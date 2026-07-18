import { tool } from "@openai/agents";
import { z } from "zod";
import type { PreflightInput } from "@/lib/types";
import { daysUntilLaunch } from "./shared";

export type OwnerChecklistOutput = {
  owners: {
    owner: string;
    items: string[];
    dependencies: string[];
    dueDateHint: string;
  }[];
};

export function generateOwnerChecklist(input: PreflightInput): OwnerChecklistOutput {
  const days = daysUntilLaunch(input);
  const dueDateHint = days === null ? "Before launch" : days <= 14 ? "Within the next 3 business days" : "At least 10 days before launch";

  return {
    owners: [
      {
        owner: "Engineering",
        items: ["Confirm release scope", "Complete QA pass", "Prepare rollback and monitoring notes"],
        dependencies: ["Product signs off on scope", "Known issues are triaged"],
        dueDateHint
      },
      {
        owner: "Product",
        items: ["Finalize launch narrative", "Define success metrics", "Confirm follow-up questions are answered"],
        dependencies: ["Audience and constraints are agreed"],
        dueDateHint
      },
      {
        owner: "Marketing",
        items: ["Map assets to channels", "Draft launch copy", "Schedule launch-day publishing tasks"],
        dependencies: ["Positioning and available assets are confirmed"],
        dueDateHint
      },
      {
        owner: "Support",
        items: ["Prepare FAQ", "Document escalation paths", "Review known limitations"],
        dependencies: ["Engineering provides support notes"],
        dueDateHint
      }
    ]
  };
}

export const generateOwnerChecklistTool = tool({
  name: "generate_owner_checklist",
  description: "Generate owner-specific launch checklist items, dependencies, and due-date hints.",
  parameters: z.object({
    productBrief: z.string(),
    audience: z.string(),
    launchDate: z.string(),
    constraints: z.string(),
    availableAssets: z.string()
  }),
  async execute(input) {
    // Deterministic owner checklist generator for launch planning handoffs.
    return generateOwnerChecklist({ ...input, productUrl: "", manualPageCopy: "" });
  }
});
