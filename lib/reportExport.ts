import { PRODUCT_NAME } from "@/lib/brand";
import type { PreflightInput, PreflightResult } from "@/lib/types";

function lineOrFallback(value: string, fallback: string) {
  return value.trim() || fallback;
}

export function formatPreflightReportMarkdown(input: PreflightInput, result: PreflightResult) {
  const lines = [
    `# ${PRODUCT_NAME} report`,
    "",
    result.summary,
    "",
    "## Launch context",
    "",
    `- Product brief: ${lineOrFallback(input.productBrief, "Not provided")}`,
    `- Audience: ${lineOrFallback(input.audience, "Not provided")}`,
    `- Launch date: ${lineOrFallback(input.launchDate, "Not provided")}`,
    `- Constraints: ${lineOrFallback(input.constraints, "Not provided")}`,
    `- Available assets: ${lineOrFallback(input.availableAssets, "Not provided")}`,
    "",
    "## Prioritized plan",
    "",
    ...result.prioritizedPlan.map(
      (item, index) => `${index + 1}. [${item.priority}] ${item.task} - ${item.suggestedOwner}\n   - ${item.rationale}`
    ),
    "",
    "## Risk register",
    "",
    ...result.riskRegister.map((item) => `- [${item.severity}] ${item.risk}\n  - Mitigation: ${item.mitigation}`),
    "",
    "## Owner checklist",
    "",
    ...result.ownerChecklist.flatMap((group) => [
      `### ${group.owner}`,
      "",
      ...group.items.map((item) => `- ${item}`),
      ""
    ]),
    "## Launch copy",
    "",
    ...result.launchCopy.flatMap((item) => [
      `### ${item.channel}`,
      "",
      item.headline,
      "",
      item.body,
      ""
    ]),
    "## Follow-up questions",
    "",
    ...result.followUpQuestions.map((question) => `- ${question}`)
  ];

  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}
