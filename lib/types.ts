import { z } from "zod";

export const preflightResultSchema = z.object({
  summary: z.string(),
  prioritizedPlan: z.array(
    z.object({
      priority: z.enum(["P0", "P1", "P2"]),
      task: z.string(),
      rationale: z.string(),
      suggestedOwner: z.string()
    })
  ),
  riskRegister: z.array(
    z.object({
      risk: z.string(),
      severity: z.enum(["low", "medium", "high"]),
      mitigation: z.string()
    })
  ),
  ownerChecklist: z.array(
    z.object({
      owner: z.string(),
      items: z.array(z.string())
    })
  ),
  launchCopy: z.array(
    z.object({
      channel: z.string(),
      headline: z.string(),
      body: z.string()
    })
  ),
  followUpQuestions: z.array(z.string())
});

export type PreflightResult = z.infer<typeof preflightResultSchema>;

export type PreflightInput = {
  productBrief: string;
  audience: string;
  launchDate: string;
  constraints: string;
  availableAssets: string;
};

export type StreamEvent =
  | { type: "run_started"; message: string }
  | { type: "tool_started"; toolName: string; message: string }
  | { type: "tool_completed"; toolName: string; message: string }
  | { type: "text_delta"; delta: string }
  | { type: "final"; data: PreflightResult }
  | { type: "error"; message: string };
