import { z } from "zod";

export const preflightInputSchema = z.object({
  productBrief: z.string().trim().min(20, "Add at least a short product brief."),
  audience: z.string().trim().min(3, "Target audience is required."),
  launchDate: z
    .string()
    .trim()
    .min(1, "Launch date is required.")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Use a valid launch date."),
  constraints: z.string().trim().max(2000, "Keep constraints under 2,000 characters.").default(""),
  availableAssets: z.string().trim().max(2000, "Keep available assets under 2,000 characters.").default("")
});
