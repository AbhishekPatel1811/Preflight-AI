import { z } from "zod";

const scoreSchema = z.number().int().min(0).max(100);

export const preflightModuleScoresSchema = z.object({
  positioning: scoreSchema,
  conversion: scoreSchema,
  trust: scoreSchema,
  demoClarity: scoreSchema,
  geoReadiness: scoreSchema,
  launchOps: scoreSchema
});

export const launchFixSchema = z.object({
  priority: z.enum(["P0", "P1", "P2"]),
  area: z.string(),
  issue: z.string(),
  evidence: z.string(),
  recommendation: z.string(),
  effort: z.enum(["low", "medium", "high"]),
  impact: z.enum(["low", "medium", "high"]),
  suggestedOwner: z.string()
});

export const launchDiagnosticSchema = z.object({
  module: z.string(),
  score: scoreSchema.optional(),
  title: z.string(),
  evidence: z.string(),
  recommendation: z.string()
});

export const launchArtifactSchema = z.object({
  type: z.enum([
    "demo_script",
    "product_hunt_tagline",
    "launch_post",
    "llms_txt",
    "faq_suggestions",
    "hero_rewrite",
    "owner_checklist",
    "risk_register",
    "launch_plan"
  ]),
  title: z.string(),
  content: z.string()
});

export const preflightReportSchema = z.object({
  source: z.enum(["preflight_core"]),
  product: z.object({
    name: z.string(),
    url: z.string().url().optional(),
    targetAudience: z.string(),
    launchGoal: z.string(),
    launchChannel: z.string().optional(),
    launchDate: z.string().optional()
  }),
  overallScore: scoreSchema,
  moduleScores: preflightModuleScoresSchema,
  summary: z.string(),
  topFixes: z.array(launchFixSchema),
  diagnostics: z.array(launchDiagnosticSchema),
  artifacts: z.array(launchArtifactSchema),
  followUpQuestions: z.array(z.string())
});

export type PreflightModuleScores = z.infer<typeof preflightModuleScoresSchema>;
export type LaunchFix = z.infer<typeof launchFixSchema>;
export type LaunchDiagnostic = z.infer<typeof launchDiagnosticSchema>;
export type LaunchArtifact = z.infer<typeof launchArtifactSchema>;
export type PreflightReport = z.infer<typeof preflightReportSchema>;
