import assert from "node:assert/strict";
import test from "node:test";
import { pageSignalsSchema } from "../lib/types/pageSignals";
import { preflightCoreResultSchema, preflightResultSchema } from "../lib/types";
import { preflightInputSchema } from "../lib/validators";

function utcDateFromToday(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const urlOnlyContext = {
  productUrl: "https://example.com/product",
  productBrief: "Launch this product publicly.",
  audience: "Indie SaaS founders",
  launchDate: utcDateFromToday(30),
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
  landingRecommendations: {
    heroHeadline: "Launch with confidence",
    heroSupportingCopy: "Find launch risks and move every owner toward release day with a clear plan.",
    primaryCta: "Run your launch audit",
    ctaRationale: "The action names the immediate outcome.",
    proofRecommendations: [
      "Show one quantified outcome.",
      "Add a customer quote.",
      "Link to the audit methodology."
    ]
  },
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

test("rejects IPv4 and IPv6 product URL literals", () => {
  const urls = [
    "http://127.0.0.1",
    "http://10.0.0.4",
    "https://192.168.1.25/product",
    "https://8.8.8.8/product",
    "http://[::1]",
    "https://[2606:4700:4700::1111]/product"
  ];

  for (const productUrl of urls) {
    assert.equal(preflightInputSchema.safeParse({ ...urlOnlyContext, productUrl }).success, false, productUrl);
  }
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

test("rejects product URLs longer than the audit URL limit", () => {
  const result = preflightInputSchema.safeParse({
    ...urlOnlyContext,
    productUrl: `https://example.com/${"a".repeat(2048)}`
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(result.error.issues[0]?.message ?? "", /2,048 characters/i);
  }
});

test("requires a public product URL even when other source text is provided", () => {
  const result = preflightInputSchema.safeParse({
    ...urlOnlyContext,
    productUrl: "",
    manualPageCopy: "Visible landing page copy supplied as supporting evidence."
  });

  assert.equal(result.success, false);
  assert.equal(result.error.issues[0]?.path[0], "productUrl");
  assert.equal(result.error.issues[0]?.message, "Product URL is required.");
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
  const nextLeapYear = (() => {
    let year = new Date().getUTCFullYear() + 1;
    while (year % 4 !== 0 || (year % 100 === 0 && year % 400 !== 0)) {
      year += 1;
    }
    return `${year}-02-29`;
  })();

  assert.equal(preflightInputSchema.safeParse({ ...urlOnlyContext, launchDate: nextLeapYear }).success, true);
});

test("rejects launch dates before today", () => {
  const result = preflightInputSchema.safeParse({
    ...urlOnlyContext,
    launchDate: utcDateFromToday(-1)
  });

  assert.equal(result.success, false);
  assert.equal(result.error.issues[0]?.message, "Choose today or a future launch date.");
});

test("accepts today and future launch dates", () => {
  assert.equal(preflightInputSchema.safeParse({ ...urlOnlyContext, launchDate: utcDateFromToday(0) }).success, true);
  assert.equal(preflightInputSchema.safeParse({ ...urlOnlyContext, launchDate: utcDateFromToday(1) }).success, true);
});

test("requires meaningful launch goal and context", () => {
  const result = preflightInputSchema.safeParse({ ...urlOnlyContext, productBrief: "Too short" });

  assert.equal(result.success, false);
  assert.equal(result.error.issues[0]?.message, "Add at least a short launch goal and context.");
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

test("structured reports enforce bounded text and collection sizes", () => {
  assert.equal(preflightCoreResultSchema.safeParse({ ...coreResult, summary: "x".repeat(4001) }).success, false);
  assert.equal(
    preflightCoreResultSchema.safeParse({
      ...coreResult,
      prioritizedPlan: Array.from({ length: 31 }, () => coreResult.prioritizedPlan[0])
    }).success,
    false
  );
  assert.equal(
    preflightCoreResultSchema.safeParse({
      ...coreResult,
      ownerChecklist: [{ owner: "Engineering", items: Array.from({ length: 51 }, () => "Verify signup") }]
    }).success,
    false
  );
  assert.equal(
    preflightCoreResultSchema.safeParse({
      ...coreResult,
      launchCopy: [{ channel: "Email", headline: "Launch ready", body: "x".repeat(8001) }]
    }).success,
    false
  );
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
