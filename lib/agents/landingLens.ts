import type { PreflightInput } from "@/lib/types";
import type {
  LandingLensAssessment,
  LandingLensCriterion,
  LandingLensCriterionId,
  LandingLensFix
} from "@/lib/types/landingLens";
import { landingLensAssessmentSchema } from "@/lib/types/landingLens";
import type { PageSignals } from "@/lib/types/pageSignals";

const CRITERIA = [
  { id: "heroClarity", label: "Hero clarity", weight: 20 },
  { id: "icpClarity", label: "ICP clarity", weight: 15 },
  { id: "problemPromise", label: "Problem and promise", weight: 15 },
  { id: "ctaStrength", label: "CTA strength", weight: 15 },
  { id: "trustProof", label: "Trust and proof", weight: 15 },
  { id: "objectionHandling", label: "Objection handling", weight: 10 },
  { id: "differentiation", label: "Differentiation", weight: 10 }
] as const;

const STOP_WORDS = new Set([
  "about",
  "after",
  "also",
  "and",
  "are",
  "from",
  "have",
  "into",
  "more",
  "that",
  "their",
  "this",
  "with",
  "your"
]);

const PROMISE_PATTERN = /\b(automate|avoid|build|coordinate|deliver|find|grow|improve|launch|prevent|reduce|save|ship|simplify|speed|turn|win)\w*\b/gi;
const CTA_PATTERN = /\b(book|build|create|generate|get|join|request|schedule|ship|sign up|start|try|view)\b/i;
const GENERIC_CTA_PATTERN = /^(click here|learn more|more|read more|submit)$/i;
const TRUST_PATTERN = /\b(case stud|customer|gdpr|proof|result|review|security|soc ?2|testimonial|trusted|used by)\w*\b/gi;
const TRUST_SURFACE_PATTERN = /(case stud|customer|docs|pricing|privacy|security|support|testimonial|trust)/i;
const OBJECTION_PATTERN = /(compare|comparison|contact|docs|faq|pricing|privacy|security|support|terms)/i;
const DIFFERENTIATION_PATTERN = /\b(built for|compared|different|instead|only|speciali[sz]ed|unlike|versus|without)\b/gi;

const RECOMMENDATIONS: Record<LandingLensCriterionId, string> = {
  heroClarity: "Use one concise H1 that names the product outcome and add supporting copy that explains how it works.",
  icpClarity: "Name the primary buyer or user in the hero or first supporting section using the language that audience uses.",
  problemPromise: "Connect the audience's launch problem to one concrete outcome instead of describing features alone.",
  ctaStrength: "Use one descriptive primary action with a working destination and repeat the same intent consistently.",
  trustProof: "Place specific proof near the decision point, such as a quantified result, customer example, security fact, or product evidence.",
  objectionHandling: "Answer the highest-friction questions with visible pricing, FAQ, security, docs, comparison, or support paths.",
  differentiation: "State why this product is a better fit than the default alternative for the named audience."
};

const ISSUE_LABELS: Record<LandingLensCriterionId, string> = {
  heroClarity: "The observed hero does not explain the product and outcome clearly enough.",
  icpClarity: "The target audience is not explicit in the observed page copy.",
  problemPromise: "The observed copy does not connect a clear problem to a concrete promise.",
  ctaStrength: "The observed primary action is weak, generic, or missing a destination.",
  trustProof: "The observed page lacks enough decision-stage trust or proof.",
  objectionHandling: "The observed page leaves key buyer objections unanswered.",
  differentiation: "The observed page does not make the product's distinct advantage clear."
};

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function compactText(value: string, max = 420) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= max ? normalized : `${normalized.slice(0, max - 3).trimEnd()}...`;
}

function meaningfulTokens(value: string) {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length >= 4 && !STOP_WORDS.has(token))
    )
  );
}

function matchingTokens(expected: string, observed: string) {
  const observedTokens = new Set(meaningfulTokens(observed));
  return meaningfulTokens(expected).filter((token) => observedTokens.has(token));
}

function patternMatches(value: string, pattern: RegExp) {
  return Array.from(new Set(Array.from(value.matchAll(pattern), (match) => match[0].toLowerCase())));
}

function observedPageText(signals: PageSignals) {
  return [
    signals.title,
    signals.description,
    ...signals.h1,
    ...signals.h2,
    ...signals.ctas.map((cta) => cta.text),
    ...signals.links.map((link) => link.text),
    signals.extractedText
  ]
    .filter(Boolean)
    .join(" ");
}

function observedHeroText(signals: PageSignals) {
  return [signals.title, signals.description, ...signals.h1].filter(Boolean).join(" ");
}

function scoreHero(input: PreflightInput, signals: PageSignals) {
  const h1 = signals.h1[0]?.trim() ?? "";
  const wordCount = meaningfulTokens(h1).length;
  const overlap = matchingTokens(input.productBrief, observedHeroText(signals));
  const score =
    (h1 ? 25 : 0) +
    (wordCount >= 4 && wordCount <= 14 ? 20 : 0) +
    (signals.description.trim() ? 20 : 0) +
    (overlap.length >= 2 ? 35 : overlap.length === 1 ? 18 : 0);

  return {
    score: clampScore(score),
    evidence: `Observed H1: ${h1 ? `"${compactText(h1, 180)}"` : "none"}. Supporting description: ${
      signals.description.trim() ? "yes" : "no"
    }. Brief terms in the hero: ${overlap.length > 0 ? overlap.slice(0, 5).join(", ") : "none"}.`
  };
}

function scoreIcp(input: PreflightInput, signals: PageSignals) {
  const audienceTokens = meaningfulTokens(input.audience);
  const matches = matchingTokens(input.audience, observedPageText(signals));
  const coverage = audienceTokens.length > 0 ? matches.length / audienceTokens.length : 0;
  const builtForCue = /\b(built|designed|made) for\b/i.test(observedPageText(signals));

  return {
    score: clampScore(coverage * 80 + (builtForCue ? 20 : 0)),
    evidence: `Observed audience terms: ${matches.length > 0 ? matches.slice(0, 6).join(", ") : "none"}. Expected from the brief: ${
      audienceTokens.slice(0, 6).join(", ") || "not specified"
    }.`
  };
}

function scoreProblemPromise(input: PreflightInput, signals: PageSignals) {
  const pageText = observedPageText(signals);
  const promiseCues = patternMatches(pageText, PROMISE_PATTERN);
  const briefMatches = matchingTokens(input.productBrief, pageText);
  const briefTokenCount = Math.max(meaningfulTokens(input.productBrief).length, 1);
  const score = Math.min(promiseCues.length, 2) * 20 + Math.min(briefMatches.length / briefTokenCount, 1) * 60;

  return {
    score: clampScore(score),
    evidence: `Observed outcome cues: ${promiseCues.slice(0, 6).join(", ") || "none"}. Brief-specific terms on the page: ${
      briefMatches.slice(0, 6).join(", ") || "none"
    }.`
  };
}

function scoreCta(signals: PageSignals) {
  const primary = signals.ctas[0];
  const label = primary?.text.trim() ?? "";
  const isDescriptive = CTA_PATTERN.test(label) && !GENERIC_CTA_PATTERN.test(label);
  const score =
    (primary ? 30 : 0) +
    (primary?.href ? 25 : 0) +
    (isDescriptive ? 30 : 0) +
    (label && !GENERIC_CTA_PATTERN.test(label) ? 15 : 0);

  return {
    score: clampScore(score),
    evidence: `Observed CTA labels: ${
      signals.ctas.length > 0 ? signals.ctas.slice(0, 4).map((cta) => `"${compactText(cta.text, 80)}"`).join(", ") : "none"
    }. Primary CTA destination: ${primary?.href ? "yes" : "no"}.`
  };
}

function scoreTrust(signals: PageSignals) {
  const pageText = observedPageText(signals);
  const proofCues = patternMatches(pageText, TRUST_PATTERN);
  const trustLinks = signals.links.filter((link) => TRUST_SURFACE_PATTERN.test(`${link.text} ${link.href}`));
  const structuredProof = signals.jsonLdTypes.some((type) => /organization|product|softwareapplication/i.test(type));
  const score = Math.min(proofCues.length, 2) * 25 + Math.min(trustLinks.length, 2) * 20 + (structuredProof ? 10 : 0);

  return {
    score: clampScore(score),
    evidence: `Observed proof cues: ${proofCues.slice(0, 5).join(", ") || "none"}. Trust-surface links: ${
      trustLinks.slice(0, 5).map((link) => link.text || link.href).join(", ") || "none"
    }.`
  };
}

function scoreObjections(signals: PageSignals) {
  const surfaces = Array.from(
    new Set(
      [...signals.h2, ...signals.links.map((link) => `${link.text} ${link.href}`)]
        .filter((value) => OBJECTION_PATTERN.test(value))
        .map((value) => compactText(value, 100))
    )
  );

  return {
    score: clampScore(Math.min(surfaces.length, 4) * 25),
    evidence: `Observed objection-handling surfaces: ${surfaces.slice(0, 5).join(", ") || "none"}.`
  };
}

function scoreDifferentiation(input: PreflightInput, signals: PageSignals) {
  const pageText = observedPageText(signals);
  const cues = patternMatches(pageText, DIFFERENTIATION_PATTERN);
  const briefMatches = matchingTokens(input.productBrief, pageText);
  const score = Math.min(cues.length, 3) * 25 + (briefMatches.length >= 3 ? 25 : briefMatches.length > 0 ? 12 : 0);

  return {
    score: clampScore(score),
    evidence: `Observed differentiation cues: ${cues.slice(0, 5).join(", ") || "none"}. Brief-specific terms: ${
      briefMatches.slice(0, 5).join(", ") || "none"
    }.`
  };
}

function toneForScore(score: number): LandingLensCriterion["tone"] {
  if (score >= 75) {
    return "strong";
  }

  if (score >= 50) {
    return "mixed";
  }

  return "weak";
}

function priorityForScore(score: number): LandingLensFix["priority"] {
  if (score < 50) {
    return "P0";
  }

  if (score < 75) {
    return "P1";
  }

  return "P2";
}

function buildCriterion(
  id: LandingLensCriterionId,
  label: string,
  weight: number,
  result: { score: number; evidence: string }
): LandingLensCriterion {
  return {
    id,
    label,
    weight,
    score: result.score,
    tone: toneForScore(result.score),
    evidence: compactText(result.evidence, 1000),
    recommendation: RECOMMENDATIONS[id]
  };
}

function buildUnavailableCriteria(limitation: string): LandingLensCriterion[] {
  return CRITERIA.map((criterion) => ({
    ...criterion,
    score: null,
    tone: "unscored" as const,
    evidence: `Observed limitation: ${compactText(limitation, 850)}`,
    recommendation: "Provide inspectable public page evidence or manual page copy before treating this criterion as scored."
  }));
}

function buildFixes(criteria: LandingLensCriterion[]): LandingLensFix[] {
  return criteria
    .filter((criterion) => criterion.score !== null && criterion.score < 90)
    .sort((left, right) => (left.score ?? 100) - (right.score ?? 100))
    .map((criterion) => {
      const priority = priorityForScore(criterion.score ?? 0);
      return {
        priority,
        criterionId: criterion.id,
        area: `Landing page - ${criterion.label}`,
        issue: ISSUE_LABELS[criterion.id],
        evidence: criterion.evidence,
        recommendation: criterion.recommendation,
        effort: criterion.id === "heroClarity" || criterion.id === "differentiation" ? "medium" : "low",
        impact: priority === "P0" ? "high" : priority === "P1" ? "medium" : "low",
        suggestedOwner: criterion.id === "trustProof" ? "Founder or marketing" : "Product marketing"
      } satisfies LandingLensFix;
    });
}

export function scoreLandingLens(input: PreflightInput, signals: PageSignals): LandingLensAssessment {
  if (signals.status === "unavailable") {
    const limitation = signals.warnings[0] || "Page evidence is unavailable for this audit.";
    return landingLensAssessmentSchema.parse({
      status: "unavailable",
      source: signals.source,
      score: null,
      criteria: buildUnavailableCriteria(limitation),
      fixes: [],
      limitation
    });
  }

  const scoredResults = {
    heroClarity: scoreHero(input, signals),
    icpClarity: scoreIcp(input, signals),
    problemPromise: scoreProblemPromise(input, signals),
    ctaStrength: scoreCta(signals),
    trustProof: scoreTrust(signals),
    objectionHandling: scoreObjections(signals),
    differentiation: scoreDifferentiation(input, signals)
  } satisfies Record<LandingLensCriterionId, { score: number; evidence: string }>;

  const criteria = CRITERIA.map((criterion) =>
    buildCriterion(criterion.id, criterion.label, criterion.weight, scoredResults[criterion.id])
  );
  const score = clampScore(
    criteria.reduce((total, criterion) => total + ((criterion.score ?? 0) * criterion.weight) / 100, 0)
  );
  const isPartial = signals.status === "partial" || signals.source === "manual";

  return landingLensAssessmentSchema.parse({
    status: isPartial ? "partial" : "scored",
    source: signals.source,
    score,
    criteria,
    fixes: buildFixes(criteria),
    limitation: isPartial
      ? signals.source === "manual"
        ? "This score uses partial manual page evidence and cannot verify visual placement or complete public-page coverage."
        : "This score uses partial public page evidence. Missing elements may be uninspected rather than absent."
      : undefined
  });
}
