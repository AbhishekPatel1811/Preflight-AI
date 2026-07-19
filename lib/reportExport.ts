import { PRODUCT_NAME } from "@/lib/brand";
import { mapPreflightResultToPreflightReport } from "@/lib/agents/preflightReport";
import type { PreflightInput, PreflightResult } from "@/lib/types";
import type { PageSignals } from "@/lib/types/pageSignals";

function lineOrFallback(value: string, fallback: string) {
  return value.trim() || fallback;
}

function formatBool(value: boolean) {
  return value ? "yes" : "no";
}

function formatCount(value: number) {
  return value.toString();
}

function sanitizeWarning(warning: string) {
  const trimmed = warning.trim();
  if (!trimmed) {
    return "";
  }

  const normalized = trimmed.toLowerCase();
  if (normalized.includes("error:") || normalized.includes("econn") || normalized.includes("stack trace")) {
    return "";
  }

  return trimmed;
}

function getExportWarnings(signals: PageSignals | undefined) {
  if (!signals) {
    return [];
  }

  return signals.warnings.map(sanitizeWarning).filter(Boolean).slice(0, 3);
}

function getRequestedUrl(input: PreflightInput, signals: PageSignals | undefined) {
  return signals?.requestedUrl || input.productUrl.trim() || "Not provided";
}

function getInspectedUrl(input: PreflightInput, signals: PageSignals | undefined) {
  return signals?.finalUrl || signals?.requestedUrl || input.productUrl.trim() || "Not inspected";
}

function getSignalStatus(signals: PageSignals | undefined) {
  return signals?.status || "not captured";
}

function getSignalValue(value: string | undefined) {
  return value?.trim() || "Not captured";
}

function getCrawlFileSummary(signals: PageSignals | undefined) {
  if (!signals) {
    return "robots.txt: not inspected, sitemap: not inspected, llms.txt: not inspected";
  }

  if (signals.status === "unavailable") {
    return "robots.txt: not inspected, sitemap: not inspected, llms.txt: not inspected";
  }

  return `robots.txt: ${formatBool(signals.hasRobotsTxt)}, sitemap: ${formatBool(signals.hasSitemap)}, llms.txt: ${formatBool(
    signals.hasLlmsTxt
  )}`;
}

export function formatPreflightReportMarkdown(input: PreflightInput, result: PreflightResult) {
  const report = mapPreflightResultToPreflightReport(input, result);
  const signals = result.pageSignals;
  const warnings = getExportWarnings(signals);
  const lines = [
    `# ${PRODUCT_NAME} report`,
    "",
    report.summary,
    "",
    "## Audit target",
    "",
    `- Requested URL: ${getRequestedUrl(input, signals)}`,
    `- Inspected URL: ${getInspectedUrl(input, signals)}`,
    `- Status: ${getSignalStatus(signals)}`,
    "",
    "## Page signals",
    "",
    `- Title: ${getSignalValue(signals?.title)}`,
    `- Description: ${getSignalValue(signals?.description)}`,
    `- H1 count: ${formatCount(signals?.h1.length ?? 0)}`,
    `- CTA count: ${formatCount(signals?.ctas.length ?? 0)}`,
    `- Social metadata: Open Graph ${formatCount(Object.keys(signals?.ogTags ?? {}).length)}, Twitter ${formatCount(
      Object.keys(signals?.twitterTags ?? {}).length
    )}`,
    `- Robots meta entries: ${formatCount(signals?.robotsMeta.length ?? 0)}`,
    `- JSON-LD types: ${formatCount(signals?.jsonLdTypes.length ?? 0)}`,
    `- Crawl files: ${getCrawlFileSummary(signals)}`,
    `- Warnings: ${warnings.length === 0 ? "none" : warnings.length}`,
    ...warnings.map((warning) => `  - ${warning}`),
    "",
    "## Module scores",
    "",
    `- Overall: ${report.overallScore}/100`,
    `- Positioning: ${report.moduleScores.positioning}/100`,
    `- Conversion: ${report.moduleScores.conversion}/100`,
    `- Trust: ${report.moduleScores.trust}/100`,
    `- Demo clarity: ${report.moduleScores.demoClarity}/100`,
    `- GEO readiness: ${report.moduleScores.geoReadiness}/100`,
    `- Launch ops: ${report.moduleScores.launchOps}/100`,
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
