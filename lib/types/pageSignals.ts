import { z } from "zod";

const boundedText = (max: number) => z.string().max(max);
const boundedUrl = (max: number) => z.string().max(max).url();

const metadataRecord = z
  .record(z.string().max(100), z.string().max(1000))
  .superRefine((value, ctx) => {
    if (Object.keys(value).length > 30) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Metadata tags must contain at most 30 entries."
      });
    }
  });

export const pageSignalsSchema = z.object({
  source: z.enum(["url", "manual"]),
  status: z.enum(["success", "partial", "unavailable"]),
  requestedUrl: boundedUrl(2048).optional(),
  finalUrl: boundedUrl(2048).optional(),
  title: boundedText(300),
  description: boundedText(1000),
  language: boundedText(32),
  h1: z.array(boundedText(300)).max(5),
  h2: z.array(boundedText(300)).max(20),
  ctas: z.array(z.object({ text: boundedText(300), href: boundedUrl(2048).optional() })).max(20),
  links: z.array(z.object({ text: boundedText(300), href: boundedUrl(2048) })).max(40),
  ogTags: metadataRecord,
  twitterTags: metadataRecord,
  robotsMeta: z.array(boundedText(200)).max(10),
  jsonLdTypes: z.array(boundedText(100)).max(20),
  hasRobotsTxt: z.boolean(),
  hasSitemap: z.boolean(),
  hasLlmsTxt: z.boolean(),
  extractedText: z.string().max(15000),
  warnings: z.array(boundedText(300)).max(10)
});

export type PageSignals = z.infer<typeof pageSignalsSchema>;
