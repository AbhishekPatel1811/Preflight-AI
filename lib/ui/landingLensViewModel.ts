import type { LandingLensAssessment, LandingLensCriterion } from "@/lib/types/landingLens";

export type LandingLensViewTone = "success" | "warning" | "destructive" | "neutral";

export type LandingLensCriterionView = {
  id: LandingLensCriterion["id"];
  label: string;
  weightLabel: string;
  score: number | null;
  scoreLabel: string;
  tone: LandingLensViewTone;
  evidence: string;
  recommendation: string;
};

export type LandingLensView = {
  statusLabel: string;
  score: number | null;
  scoreLabel: string;
  tone: LandingLensViewTone;
  limitation?: string;
  criteria: LandingLensCriterionView[];
};

function truncate(value: string, max: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= max ? normalized : `${normalized.slice(0, max).trimEnd()}...`;
}

function toneForScore(score: number | null): LandingLensViewTone {
  if (score === null) {
    return "neutral";
  }

  if (score >= 75) {
    return "success";
  }

  if (score >= 50) {
    return "warning";
  }

  return "destructive";
}

function statusLabel(assessment: LandingLensAssessment) {
  if (assessment.status === "unavailable") {
    return "Not scored";
  }

  if (assessment.status === "partial") {
    return "Partial evidence";
  }

  return "Scored";
}

export function getLandingLensView(assessment: LandingLensAssessment): LandingLensView {
  return {
    statusLabel: statusLabel(assessment),
    score: assessment.score,
    scoreLabel: assessment.score === null ? "Not scored" : assessment.score.toString(),
    tone: toneForScore(assessment.score),
    limitation: assessment.limitation ? truncate(assessment.limitation, 300) : undefined,
    criteria: assessment.criteria.map((criterion) => ({
      id: criterion.id,
      label: criterion.label,
      weightLabel: `${criterion.weight}% weight`,
      score: criterion.score,
      scoreLabel: criterion.score === null ? "Not scored" : `${criterion.score}/100`,
      tone: toneForScore(criterion.score),
      evidence: truncate(criterion.evidence, 180),
      recommendation: truncate(criterion.recommendation, 240)
    }))
  };
}
