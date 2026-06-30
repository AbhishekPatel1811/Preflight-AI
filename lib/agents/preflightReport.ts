import type { PreflightInput, PreflightResult } from "@/lib/types";
import type { LaunchArtifact, LaunchDiagnostic, LaunchFix, PreflightReport } from "@/lib/types/preflight";

const PHASE_ONE_OVERALL_SCORE = 72;
const PHASE_ONE_MODULE_SCORES = {
  positioning: 66,
  conversion: 62,
  trust: 58,
  demoClarity: 60,
  geoReadiness: 35,
  launchOps: 72
} satisfies PreflightReport["moduleScores"];

function inferProductName(productBrief: string) {
  const cleaned = productBrief
    .trim()
    .replace(/^we\s+(are|'re)\s+launching\s+/i, "")
    .replace(/^launching\s+/i, "")
    .replace(/^a\s+/i, "")
    .replace(/^an\s+/i, "");

  const [name] = cleaned.split(/\s+(?:for|to|with|that|which)\s+/i);
  return name?.trim().replace(/[.?!]$/, "") || "Launch project";
}

function impactForPriority(priority: LaunchFix["priority"]): LaunchFix["impact"] {
  if (priority === "P0") {
    return "high";
  }

  if (priority === "P1") {
    return "medium";
  }

  return "low";
}

function mapPlanToFixes(result: PreflightResult): LaunchFix[] {
  return result.prioritizedPlan.slice(0, 10).map((item) => ({
    priority: item.priority,
    area: "Launch ops",
    issue: item.task,
    evidence: item.rationale,
    recommendation: item.rationale,
    effort: item.priority === "P0" ? "medium" : "low",
    impact: impactForPriority(item.priority),
    suggestedOwner: item.suggestedOwner
  }));
}

function mapDiagnostics(result: PreflightResult): LaunchDiagnostic[] {
  const riskDiagnostics = result.riskRegister.map((risk) => ({
    module: "PreflightAI Core",
    title: risk.risk,
    evidence: `Severity: ${risk.severity}`,
    recommendation: risk.mitigation
  }));

  return [
    {
      module: "PreflightAI Core",
      score: PHASE_ONE_MODULE_SCORES.launchOps,
      title: "Launch planning foundation generated",
      evidence: result.summary,
      recommendation: "Use Phase 1 as the report wrapper, then add URL-based preflight modules in later phases."
    },
    ...riskDiagnostics
  ];
}

function mapArtifacts(result: PreflightResult): LaunchArtifact[] {
  const launchCopyArtifacts = result.launchCopy.map((copy) => ({
    type: "launch_post" as const,
    title: `${copy.channel}: ${copy.headline}`,
    content: copy.body
  }));

  const checklistArtifacts = result.ownerChecklist.map((checklist) => ({
    type: "owner_checklist" as const,
    title: `${checklist.owner} checklist`,
    content: checklist.items.join("\n")
  }));

  return [
    {
      type: "launch_plan",
      title: "Prioritized launch plan",
      content: result.prioritizedPlan.map((item) => `${item.priority}: ${item.task}`).join("\n")
    },
    ...launchCopyArtifacts,
    ...checklistArtifacts
  ];
}

export function mapPreflightResultToPreflightReport(input: PreflightInput, result: PreflightResult): PreflightReport {
  return {
    source: "preflight_core",
    product: {
      name: inferProductName(input.productBrief),
      targetAudience: input.audience,
      launchGoal: "Plan launch from rough brief",
      launchChannel: "Not specified",
      launchDate: input.launchDate
    },
    overallScore: PHASE_ONE_OVERALL_SCORE,
    moduleScores: PHASE_ONE_MODULE_SCORES,
    summary: result.summary,
    topFixes: mapPlanToFixes(result),
    diagnostics: mapDiagnostics(result),
    artifacts: mapArtifacts(result),
    followUpQuestions: result.followUpQuestions
  };
}
