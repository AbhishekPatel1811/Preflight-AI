import assert from "node:assert/strict";
import test from "node:test";
import { pageSignalsSchema } from "../lib/types/pageSignals";
import { preflightCoreResultSchema, preflightResultSchema } from "../lib/types";
import { preflightInputSchema } from "../lib/validators";

const urlOnlyContext = {
  productUrl: "https://example.com/product",
  productBrief: "Launch publicly",
  audience: "Indie SaaS founders",
  launchDate: "2026-08-01",
  constraints: "",
  availableAssets: "",
  manualPageCopy: ""
};

const coreResult = {
  summary: "Ready to prepare the launch.",
  prioritizedPlan: [
    {
      priority: "P0" as const,
      task: "Finalize launch messaging",
      rationale: "Clear messaging reduces confusion.",
      suggestedOwner: "Marketing"
    }
  ],
  riskRegister: [
    {
      risk: "Homepage messaging is unclear.",
      severity: "medium" as const,
      mitigation: "Review copy before launch day."
    }
  ],
  ownerChecklist: [
    {
      owner: "Marketing",
      items: ["Finalize homepage copy"]
    }
  ],
  launchCopy: [
    {
      channel: "Landing page",
      headline: "Launch with confidence",
      body: "Plan the release and close launch risks."
    }
  ],
  followUpQuestions: ["Who owns launch-day support?"]
};

const pageSignals = {
  source: "url" as const,
  status: "success" as const,
  requestedUrl: "https://example.com/product",
  finalUrl: "https://example.com/product",
  title: "Example Product",
  description: "Example description",
  language: "en",
  h1: ["Example Product"],
  h2: ["Why teams switch"],
  ctas: [{ text: "Start free", href: "https://example.com/signup" }],
  links: [{ text: "Pricing", href: "https://example.com/pricing" }],
  ogTags: { "og:title": "Example Product" },
  twitterTags: { "twitter:title": "Example Product" },
  robotsMeta: ["index", "follow"],
  jsonLdTypes: ["SoftwareApplication"],
  hasRobotsTxt: true,
  hasSitemap: true,
  hasLlmsTxt: false,
  extractedText: "Example Product helps teams launch with fewer surprises.",
  warnings: []
};

test("accepts a valid product URL alongside lightweight launch context", () => {
  assert.equal(preflightInputSchema.safeParse(urlOnlyContext).success, true);
});

test("rejects localhost product URLs", () => {
  assert.equal(
    preflightInputSchema.safeParse({ ...urlOnlyContext, productUrl: "http://localhost:3000" }).success,
    false
  );
});

test("rejects ftp product URLs", () => {
  assert.equal(preflightInputSchema.safeParse({ ...urlOnlyContext, productUrl: "ftp://example.com/product" }).success, false);
});

test("rejects product URLs with credentials", () => {
  assert.equal(
    preflightInputSchema.safeParse({ ...urlOnlyContext, productUrl: "https://user:pass@example.com/product" }).success,
    false
  );
});

test("rejects product URLs on .local hosts", () => {
  assert.equal(
    preflightInputSchema.safeParse({ ...urlOnlyContext, productUrl: "https://preview.local/product" }).success,
    false
  );
});

test("rejects product URLs on .localhost hosts", () => {
  assert.equal(
    preflightInputSchema.safeParse({ ...urlOnlyContext, productUrl: "https://preview.localhost/product" }).success,
    false
  );
});

test("rejects product URLs with non-standard ports", () => {
  assert.equal(
    preflightInputSchema.safeParse({ ...urlOnlyContext, productUrl: "https://example.com:8443/product" }).success,
    false
  );
});

test("rejects product URLs with explicit http custom ports", () => {
  assert.equal(
    preflightInputSchema.safeParse({ ...urlOnlyContext, productUrl: "http://example.com:8080/product" }).success,
    false
  );
});

test("requires at least one primary source", () => {
  assert.equal(
    preflightInputSchema.safeParse({ ...urlOnlyContext, productUrl: "", productBrief: "", manualPageCopy: "" }).success,
    false
  );
});

test("requires audience with the existing message", () => {
  const result = preflightInputSchema.safeParse({ ...urlOnlyContext, audience: "" });
  assert.equal(result.success, false);
  assert.equal(result.error.issues[0]?.message, "Target audience is required.");
});

test("requires launch date with the existing message", () => {
  const result = preflightInputSchema.safeParse({ ...urlOnlyContext, launchDate: "" });
  assert.equal(result.success, false);
  assert.equal(result.error.issues[0]?.message, "Launch date is required.");
});

test("rejects invalid launch dates with the existing message", () => {
  const result = preflightInputSchema.safeParse({ ...urlOnlyContext, launchDate: "not-a-date" });
  assert.equal(result.success, false);
  assert.equal(result.error.issues[0]?.message, "Use a valid launch date.");
});

test("rejects impossible calendar launch dates with the existing message", () => {
  const result = preflightInputSchema.safeParse({ ...urlOnlyContext, launchDate: "2026-02-31" });
  assert.equal(result.success, false);
  assert.equal(result.error.issues[0]?.message, "Use a valid launch date.");
});

test("accepts leap-day launch dates on leap years", () => {
  assert.equal(preflightInputSchema.safeParse({ ...urlOnlyContext, launchDate: "2028-02-29" }).success, true);
});

test("requires a longer brief when URL and manual page copy are both absent", () => {
  const result = preflightInputSchema.safeParse({
    ...urlOnlyContext,
    productUrl: "",
    manualPageCopy: "",
    productBrief: "Too short"
  });
  assert.equal(result.success, false);
  assert.equal(result.error.issues[0]?.message, "Add at least a short product brief.");
});

test("public results accept page signals while core results stay independent", () => {
  const publicParse = preflightResultSchema.safeParse({ ...coreResult, pageSignals });
  assert.equal(publicParse.success, true);
  assert.deepEqual(publicParse.data?.pageSignals, pageSignals);

  const coreParse = preflightCoreResultSchema.safeParse(coreResult);
  assert.equal(coreParse.success, true);

  const strippedCoreResult = preflightCoreResultSchema.parse({ ...coreResult, pageSignals });
  assert.equal("pageSignals" in strippedCoreResult, false);
});

test("rejects page signals with oversized metadata collections", () => {
  const result = pageSignalsSchema.safeParse({
    ...pageSignals,
    ogTags: Object.fromEntries(Array.from({ length: 31 }, (_, index) => [`key-${index}`, "value"]))
  });
  assert.equal(result.success, false);
});

test("rejects page signals with oversized metadata values", () => {
  const result = pageSignalsSchema.safeParse({
    ...pageSignals,
    title: "t".repeat(301),
    requestedUrl: `https://example.com/${"a".repeat(2050)}`,
    warnings: ["w".repeat(301)]
  });
  assert.equal(result.success, false);
});
