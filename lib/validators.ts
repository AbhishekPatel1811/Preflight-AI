import { z } from "zod";

const inputTextField = (max: number, message: string) => z.string().trim().max(max, message).default("");
const productBriefSchema = inputTextField(6000, "Keep the product brief under 6,000 characters.");
const launchDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function addProductUrlIssue(ctx: z.RefinementCtx, message: string) {
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message
  });
}

function validateProductUrl(value: string, ctx: z.RefinementCtx) {
  if (!value) {
    return;
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(value);
  } catch {
    addProductUrlIssue(ctx, "Enter a valid public product URL.");
    return;
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    addProductUrlIssue(ctx, "Use an http or https product URL.");
  }

  if (parsedUrl.username || parsedUrl.password) {
    addProductUrlIssue(ctx, "Product URLs cannot include credentials.");
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    addProductUrlIssue(ctx, "Enter a public product URL.");
  }

  if (parsedUrl.port) {
    const isStandardPort =
      (parsedUrl.protocol === "http:" && parsedUrl.port === "80") ||
      (parsedUrl.protocol === "https:" && parsedUrl.port === "443");

    if (!isStandardPort) {
      addProductUrlIssue(ctx, "Use a product URL without a custom port.");
    }
  }
}

function isValidLaunchDate(value: string) {
  if (!launchDatePattern.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  return (
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() === month - 1 &&
    parsedDate.getUTCDate() === day
  );
}

export const preflightInputSchema = z
  .object({
    productUrl: z.string().trim().default("").superRefine(validateProductUrl),
    productBrief: productBriefSchema,
    audience: z.string().trim().min(3, "Target audience is required.").max(1000, "Keep the audience under 1,000 characters."),
    launchDate: z
      .string()
      .trim()
      .min(1, "Launch date is required.")
      .refine((value) => value === "" || isValidLaunchDate(value), "Use a valid launch date."),
    constraints: inputTextField(2000, "Keep constraints under 2,000 characters."),
    availableAssets: inputTextField(2000, "Keep available assets under 2,000 characters."),
    manualPageCopy: inputTextField(15000, "Keep manual page copy under 15,000 characters.")
  })
  .superRefine((value, ctx) => {
    if (!value.productUrl && !value.manualPageCopy && value.productBrief.trim().length < 20) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["productBrief"],
        message: "Add at least a short product brief."
      });
    }
  });
