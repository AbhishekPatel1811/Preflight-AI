import type { PreflightInput, PreflightResult } from "@/lib/types";
import type { PageSignals } from "@/lib/types/pageSignals";
import type { LandingLensAssessment, LandingLensCriterionId } from "@/lib/types/landingLens";
import type { LaunchArtifact, LaunchDiagnostic, LaunchFix, PreflightModuleScores, PreflightReport } from "@/lib/types/preflight";

const PHASE_ONE_OVERALL_SCORE = 72;
const PHASE_ONE_MODULE_SCORES = {
  positioning: 66,
  conversion: 62,
  trust: 58,
  demoClarity: 60,
  geoReadiness: 35,
  launchOps: 72
} satisfies PreflightModuleScores;

const MODULE_WEIGHTS = {
  positioning: 0.2,
  conversion: 0.2,
  trust: 0.15,
  demoClarity: 0.15,
  geoReadiness: 0.15,
  launchOps: 0.15
} satisfies Record<keyof PreflightModuleScores, number>;

const ACTION_LINK_PATTERN = /(book|contact|demo|get started|join|pricing|request|schedule|sign ?up|start|trial|waitlist)/i;
const TRUST_LINK_PATTERN = /(about|case stud|contact|customer|docs|faq|pricing|privacy|security|support|terms|testimonial|trust)/i;

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

function mapLandingFixes(landingLens: LandingLensAssessment | undefined): LaunchFix[] {
  return (landingLens?.fixes ?? []).map((fix) => ({
    priority: fix.priority,
    area: fix.area,
    issue: fix.issue,
    evidence: fix.evidence,
    recommendation: fix.recommendation,
    effort: fix.effort,
    impact: fix.impact,
    suggestedOwner: fix.suggestedOwner
  }));
}

function mapTopFixes(result: PreflightResult) {
  return [...mapLandingFixes(result.landingLens), ...mapPlanToFixes(result)].slice(0, 10);
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function hasText(value: string | undefined) {
  return Boolean(value?.trim());
}

function countObserved(values: boolean[]) {
  return values.filter(Boolean).length;
}

function scoreByCoverage(count: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return clampScore((count / total) * 100);
}

function countActionLinks(signals: PageSignals) {
  return signals.links.filter((link) => ACTION_LINK_PATTERN.test(`${link.text} ${link.href}`)).length;
}

function countTrustSurfaceLinks(signals: PageSignals) {
  return signals.links.filter((link) => TRUST_LINK_PATTERN.test(`${link.text} ${link.href}`)).length;
}

function scorePositioning(signals: PageSignals) {
  return scoreByCoverage(
    countObserved([hasText(signals.title), hasText(signals.description), signals.h1.length > 0]),
    3
  );
}

function scoreConversion(signals: PageSignals) {
  const conversionSignals = Math.min(signals.ctas.length + countActionLinks(signals), 4);
  return scoreByCoverage(conversionSignals, 4);
}

function scoreTrust(signals: PageSignals) {
  return scoreByCoverage(Math.min(countTrustSurfaceLinks(signals), 3), 3);
}

function landingCriterionScore(landingLens: LandingLensAssessment, id: LandingLensCriterionId) {
  return landingLens.criteria.find((criterion) => criterion.id === id)?.score ?? 0;
}

function scoreLandingPositioning(landingLens: LandingLensAssessment) {
  return clampScore(
    (landingCriterionScore(landingLens, "heroClarity") * 20 +
      landingCriterionScore(landingLens, "icpClarity") * 15 +
      landingCriterionScore(landingLens, "problemPromise") * 15 +
      landingCriterionScore(landingLens, "differentiation") * 10) /
      60
  );
}

function scoreLandingConversion(landingLens: LandingLensAssessment) {
  return clampScore(
    (landingCriterionScore(landingLens, "ctaStrength") * 15 +
      landingCriterionScore(landingLens, "objectionHandling") * 10) /
      25
  );
}

function scoreGeoReadiness(signals: PageSignals) {
  return scoreByCoverage(
    countObserved([
      signals.hasRobotsTxt,
      signals.hasSitemap,
      signals.hasLlmsTxt,
      Object.keys(signals.ogTags).length + Object.keys(signals.twitterTags).length > 0,
      signals.robotsMeta.length > 0,
      signals.jsonLdTypes.length > 0
    ]),
    6
  );
}

function calculateSignalAwareScores(result: PreflightResult): PreflightModuleScores {
  const signals = result.pageSignals!;
  const scoredLandingLens = result.landingLens?.score !== null ? result.landingLens : undefined;

  return {
    positioning: scoredLandingLens ? scoreLandingPositioning(scoredLandingLens) : scorePositioning(signals),
    conversion: scoredLandingLens ? scoreLandingConversion(scoredLandingLens) : scoreConversion(signals),
    trust: scoredLandingLens ? landingCriterionScore(scoredLandingLens, "trustProof") : scoreTrust(signals),
    demoClarity: PHASE_ONE_MODULE_SCORES.demoClarity,
    geoReadiness: scoreGeoReadiness(signals),
    launchOps: PHASE_ONE_MODULE_SCORES.launchOps
  };
}

function calculateOverallScore(moduleScores: PreflightModuleScores) {
  return clampScore(
    moduleScores.positioning * MODULE_WEIGHTS.positioning +
      moduleScores.conversion * MODULE_WEIGHTS.conversion +
      moduleScores.trust * MODULE_WEIGHTS.trust +
      moduleScores.demoClarity * MODULE_WEIGHTS.demoClarity +
      moduleScores.geoReadiness * MODULE_WEIGHTS.geoReadiness +
      moduleScores.launchOps * MODULE_WEIGHTS.launchOps
  );
}

function getProductUrl(input: PreflightInput, signals?: PageSignals) {
  return signals?.finalUrl || signals?.requestedUrl || input.productUrl.trim() || undefined;
}

function getProductName(input: PreflightInput, signals?: PageSignals) {
  return hasText(signals?.title) ? signals!.title.trim() : inferProductName(input.productBrief);
}

function getCoreDiagnostic(moduleScores: PreflightModuleScores, result: PreflightResult): LaunchDiagnostic {
  return {
    module: "PreflightAI Core",
    score: moduleScores.launchOps,
    title: "Launch planning foundation generated",
    evidence: `Observed fact: ${result.summary}`,
    recommendation: "Use this as the launch-operations baseline, then close the observed page gaps before launch."
  };
}

function getSignalStatusDiagnostics(signals: PageSignals): LaunchDiagnostic[] {
  if (signals.status === "partial") {
    return [
      {
        module: "Page Signals",
        title: "Partial page evidence",
        evidence: `Observed fact: Status is partial for ${signals.requestedUrl ?? "the requested target"}. ${
          signals.warnings[0] ?? "Only a limited subset of page elements was inspected."
        }`,
        recommendation: "Treat any missing page fields as uninspected until a fuller crawl is available."
      }
    ];
  }

  if (signals.status === "unavailable") {
    return [
      {
        module: "Page Signals",
        title: "Unavailable page evidence",
        evidence: `Observed fact: No public page elements were inspected for ${signals.requestedUrl ?? "the requested target"}. ${
          signals.warnings[0] ?? "The page could not be inspected from the public URL."
        }`,
        recommendation: "Keep the report limited to observed launch context until the page can be inspected."
      }
    ];
  }

  return [];
}

function getTitleDiagnostic(signals: PageSignals, moduleScores: PreflightModuleScores): LaunchDiagnostic {
  return {
    module: "Positioning",
    score: moduleScores.positioning,
    title: "Observed title coverage",
    evidence: hasText(signals.title)
      ? `Observed fact: Title = "${signals.title.trim()}". Description captured: ${hasText(signals.description) ? "yes" : "no"}.`
      : "Observed fact: No page title was captured for the inspected target.",
    recommendation: "Keep a concise, product-specific title and description on the inspected page."
  };
}

function getH1Diagnostic(signals: PageSignals, moduleScores: PreflightModuleScores): LaunchDiagnostic {
  return {
    module: "Positioning",
    score: moduleScores.positioning,
    title: "Observed H1 coverage",
    evidence:
      signals.h1.length > 0
        ? `Observed fact: ${signals.h1.length} H1 captured. Primary H1: "${signals.h1[0]}".`
        : "Observed fact: No H1 was captured during this inspection.",
    recommendation: "Make sure one clear H1 states the launch promise on the page."
  };
}

function getCtaDiagnostic(signals: PageSignals, moduleScores: PreflightModuleScores): LaunchDiagnostic {
  const actionLinkCount = countActionLinks(signals);

  return {
    module: "Conversion",
    score: moduleScores.conversion,
    title: "CTA coverage",
    evidence: `Observed fact: ${signals.ctas.length} CTA candidates and ${actionLinkCount} action links were captured.`,
    recommendation: "Keep one obvious next step above the fold and reinforce it with linked action paths."
  };
}

function getTrustDiagnostic(signals: PageSignals, moduleScores: PreflightModuleScores): LaunchDiagnostic {
  const trustLinkCount = countTrustSurfaceLinks(signals);

  return {
    module: "Trust",
    score: moduleScores.trust,
    title: "Trust surface links",
    evidence: `Observed fact: ${trustLinkCount} trust-surface links were captured.`,
    recommendation: "Expose proof, pricing, docs, security, or support paths that lower decision risk."
  };
}

function getMetadataDiagnostic(signals: PageSignals, moduleScores: PreflightModuleScores): LaunchDiagnostic {
  const hasOpenGraph = Object.keys(signals.ogTags).length > 0;
  const hasTwitter = Object.keys(signals.twitterTags).length > 0;

  return {
    module: "GEO readiness",
    score: moduleScores.geoReadiness,
    title: "Metadata coverage",
    evidence: `Observed fact: Open Graph: ${hasOpenGraph ? "yes" : "no"}. Twitter tags: ${
      hasTwitter ? "yes" : "no"
    }. Robots meta entries: ${signals.robotsMeta.length}. JSON-LD types: ${signals.jsonLdTypes.length}.`,
    recommendation: "Keep social metadata, crawl directives, and structured data aligned with the current page."
  };
}

function getCrawlFileDiagnostic(signals: PageSignals, moduleScores: PreflightModuleScores): LaunchDiagnostic {
  return {
    module: "GEO readiness",
    score: moduleScores.geoReadiness,
    title: "Crawl files",
    evidence:
      signals.status === "unavailable"
        ? "Observed fact: Crawl files were not inspected because page evidence was unavailable."
        : `Observed fact: robots.txt: ${signals.hasRobotsTxt ? "yes" : "no"}, sitemap: ${
            signals.hasSitemap ? "yes" : "no"
          }, llms.txt: ${signals.hasLlmsTxt ? "yes" : "no"}.${
            signals.status === "partial" ? " Some crawl files may not have been fully inspected." : ""
          }`,
    recommendation: "Publish crawl files only when they exist and point to the current canonical surfaces."
  };
}

function mapRiskDiagnostics(result: PreflightResult): LaunchDiagnostic[] {
  return result.riskRegister.map((risk) => ({
    module: "PreflightAI Core",
    title: risk.risk,
    evidence: `Observed fact: Severity is ${risk.severity}.`,
    recommendation: risk.mitigation
  }));
}

function mapLandingDiagnostics(landingLens: LandingLensAssessment): LaunchDiagnostic[] {
  return landingLens.criteria.map((criterion) => ({
    module: "Landing Lens",
    score: criterion.score ?? undefined,
    title: criterion.label,
    evidence: criterion.evidence,
    recommendation: criterion.recommendation
  }));
}

function mapDiagnostics(result: PreflightResult, moduleScores: PreflightModuleScores): LaunchDiagnostic[] {
  const signals = result.pageSignals;

  if (!signals) {
    return [getCoreDiagnostic(moduleScores, result), ...mapRiskDiagnostics(result)];
  }

  return [
    getCoreDiagnostic(moduleScores, result),
    ...getSignalStatusDiagnostics(signals),
    ...(result.landingLens
      ? mapLandingDiagnostics(result.landingLens)
      : [
          getTitleDiagnostic(signals, moduleScores),
          getH1Diagnostic(signals, moduleScores),
          getCtaDiagnostic(signals, moduleScores),
          getTrustDiagnostic(signals, moduleScores)
        ]),
    getMetadataDiagnostic(signals, moduleScores),
    getCrawlFileDiagnostic(signals, moduleScores),
    ...mapRiskDiagnostics(result)
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
    {
      type: "hero_rewrite",
      title: "Landing page hero upgrade",
      content: [
        result.landingRecommendations.heroHeadline,
        result.landingRecommendations.heroSupportingCopy,
        `Primary CTA: ${result.landingRecommendations.primaryCta}`,
        result.landingRecommendations.ctaRationale
      ].join("\n")
    },
    ...launchCopyArtifacts,
    ...checklistArtifacts
  ];
}

export function mapPreflightResultToPreflightReport(input: PreflightInput, result: PreflightResult): PreflightReport {
  const moduleScores = result.pageSignals
    ? result.landingLens?.status === "unavailable"
      ? {
          ...PHASE_ONE_MODULE_SCORES,
          geoReadiness: scoreGeoReadiness(result.pageSignals)
        }
      : calculateSignalAwareScores(result)
    : PHASE_ONE_MODULE_SCORES;
  const overallScore = result.pageSignals ? calculateOverallScore(moduleScores) : PHASE_ONE_OVERALL_SCORE;

  return {
    source: "preflight_core",
    product: {
      name: getProductName(input, result.pageSignals),
      url: getProductUrl(input, result.pageSignals),
      targetAudience: input.audience,
      launchGoal: "Plan launch from rough brief",
      launchChannel: "Not specified",
      launchDate: input.launchDate
    },
    overallScore,
    moduleScores,
    landingLens: result.landingLens,
    summary: result.summary,
    topFixes: mapTopFixes(result),
    diagnostics: mapDiagnostics(result, moduleScores),
    artifacts: mapArtifacts(result),
    followUpQuestions: result.followUpQuestions
  };
}
