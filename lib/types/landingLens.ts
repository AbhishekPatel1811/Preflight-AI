import { z } from "zod";

const scoreSchema = z.number().int().min(0).max(100);
const boundedText = (max: number) => z.string().max(max);

export const landingLensCriterionIdSchema = z.enum([
  "heroClarity",
  "icpClarity",
  "problemPromise",
  "ctaStrength",
  "trustProof",
  "objectionHandling",
  "differentiation"
]);

export const landingLensCriterionSchema = z.object({
  id: landingLensCriterionIdSchema,
  label: boundedText(100),
  weight: z.number().int().min(1).max(100),
  score: scoreSchema.nullable(),
  tone: z.enum(["strong", "mixed", "weak", "unscored"]),
  evidence: boundedText(1000),
  recommendation: boundedText(2000)
});

export const landingLensFixSchema = z.object({
  priority: z.enum(["P0", "P1", "P2"]),
  criterionId: landingLensCriterionIdSchema,
  area: boundedText(100),
  issue: boundedText(500),
  evidence: boundedText(1000),
  recommendation: boundedText(2000),
  effort: z.enum(["low", "medium", "high"]),
  impact: z.enum(["low", "medium", "high"]),
  suggestedOwner: boundedText(200)
});

export const landingLensAssessmentSchema = z.object({
  status: z.enum(["scored", "partial", "unavailable"]),
  source: z.enum(["url", "manual"]),
  score: scoreSchema.nullable(),
  criteria: z.array(landingLensCriterionSchema).length(7),
  fixes: z.array(landingLensFixSchema).max(7),
  limitation: boundedText(1000).optional()
});

export const landingRecommendationsSchema = z.object({
  heroHeadline: boundedText(200),
  heroSupportingCopy: boundedText(800),
  primaryCta: boundedText(120),
  ctaRationale: boundedText(1000),
  proofRecommendations: z.array(boundedText(600)).min(3).max(5)
});

export type LandingLensCriterionId = z.infer<typeof landingLensCriterionIdSchema>;
export type LandingLensCriterion = z.infer<typeof landingLensCriterionSchema>;
export type LandingLensFix = z.infer<typeof landingLensFixSchema>;
export type LandingLensAssessment = z.infer<typeof landingLensAssessmentSchema>;
export type LandingRecommendations = z.infer<typeof landingRecommendationsSchema>;
