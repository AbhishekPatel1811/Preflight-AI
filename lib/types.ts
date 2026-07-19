import { z } from "zod";
import { pageSignalsSchema } from "./types/pageSignals";
import { landingLensAssessmentSchema, landingRecommendationsSchema } from "./types/landingLens";

const resultText = (max: number) => z.string().max(max);

export const preflightCoreResultSchema = z.object({
  summary: resultText(4000),
  prioritizedPlan: z.array(
    z.object({
      priority: z.enum(["P0", "P1", "P2"]),
      task: resultText(1000),
      rationale: resultText(4000),
      suggestedOwner: resultText(500)
    })
  ).max(30),
  riskRegister: z.array(
    z.object({
      risk: resultText(1000),
      severity: z.enum(["low", "medium", "high"]),
      mitigation: resultText(4000)
    })
  ).max(30),
  ownerChecklist: z.array(
    z.object({
      owner: resultText(500),
      items: z.array(resultText(1000)).max(50)
    })
  ).max(30),
  launchCopy: z.array(
    z.object({
      channel: resultText(200),
      headline: resultText(1000),
      body: resultText(8000)
    })
  ).max(20),
  landingRecommendations: landingRecommendationsSchema,
  followUpQuestions: z.array(resultText(2000)).max(30)
});

export const preflightResultSchema = preflightCoreResultSchema.extend({
  pageSignals: pageSignalsSchema.optional(),
  landingLens: landingLensAssessmentSchema.optional()
});

export type PreflightCoreResult = z.infer<typeof preflightCoreResultSchema>;
export type PreflightResult = z.infer<typeof preflightResultSchema>;

export type PreflightInput = {
  productUrl: string;
  productBrief: string;
  audience: string;
  launchDate: string;
  constraints: string;
  availableAssets: string;
  manualPageCopy: string;
};

export type StreamEvent =
  | { type: "run_started"; message: string }
  | { type: "tool_started"; toolName: string; message: string }
  | { type: "tool_completed"; toolName: string; message: string }
  | { type: "text_delta"; delta: string }
  | { type: "final"; data: PreflightResult }
  | { type: "error"; message: string };
