import { z } from "zod";

const inputTextField = (max: number, message: string) => z.string().trim().max(max, message).default("");
const productBriefSchema = z
  .string()
  .trim()
  .min(20, "Add at least a short launch goal and context.")
  .max(6000, "Keep the product brief under 6,000 characters.")
  .default("");
const launchDatePattern = /^\d{4}-\d{2}-\d{2}$/;
export const PREFLIGHT_DATE_TIME_ZONE = "Asia/Kolkata";

export function getLaunchDateInputValue(daysFromToday = 0, now = new Date()) {
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PREFLIGHT_DATE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const values = Object.fromEntries(dateParts.map((part) => [part.type, part.value]));
  const date = new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)));
  date.setUTCDate(date.getUTCDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

function addProductUrlIssue(ctx: z.RefinementCtx, message: string) {
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message
  });
}

function isIpLiteralHostname(hostname: string) {
  const normalized = hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;

  if (normalized.includes(":")) {
    return true;
  }

  const octets = normalized.split(".");
  return (
    octets.length === 4 &&
    octets.every((octet) => /^\d{1,3}$/.test(octet) && Number(octet) >= 0 && Number(octet) <= 255)
  );
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

  if (isIpLiteralHostname(hostname)) {
    addProductUrlIssue(ctx, "Enter a public product URL with a hostname.");
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

export function isValidLaunchDate(value: string) {
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
    productUrl: z
      .string()
      .trim()
      .min(1, "Product URL is required.")
      .max(2048, "Product URL must be 2,048 characters or fewer.")
      .default("")
      .superRefine(validateProductUrl),
    productBrief: productBriefSchema,
    audience: z.string().trim().min(3, "Target audience is required.").max(1000, "Keep the audience under 1,000 characters."),
    launchDate: z
      .string()
      .trim()
      .min(1, "Launch date is required.")
      .superRefine((value, ctx) => {
        if (!value) {
          return;
        }

        if (!isValidLaunchDate(value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Use a valid launch date."
          });
          return;
        }

        if (value < getLaunchDateInputValue()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Choose today or a future launch date."
          });
        }
      }),
    constraints: inputTextField(2000, "Keep constraints under 2,000 characters."),
    availableAssets: inputTextField(2000, "Keep available assets under 2,000 characters."),
    manualPageCopy: inputTextField(15000, "Keep manual page copy under 15,000 characters.")
  });
