import assert from "node:assert/strict";
import test from "node:test";
import { scoreLandingLens } from "../lib/agents/landingLens";
import { landingLensAssessmentSchema } from "../lib/types/landingLens";
import type { PreflightInput } from "../lib/types";
import type { PageSignals } from "../lib/types/pageSignals";

const input: PreflightInput = {
  productUrl: "https://example.com",
  productBrief: "AI launch readiness workspace for SaaS founders and product teams.",
  audience: "SaaS founders and product leaders",
  launchDate: "2026-08-01",
  constraints: "Small team",
  availableAssets: "Customer quotes and a product demo",
  manualPageCopy: ""
};

const strongSignals: PageSignals = {
  source: "url",
  status: "success",
  requestedUrl: "https://example.com",
  finalUrl: "https://example.com",
  title: "Acme launch readiness for SaaS founders",
  description: "Find launch risks, coordinate product teams, and ship with confidence.",
  language: "en",
  h1: ["Ship your SaaS launch with fewer surprises"],
  h2: ["Built for SaaS founders", "Customer results", "Frequently asked questions", "Why Acme is different"],
  ctas: [{ text: "Start your launch audit", href: "https://example.com/start" }],
  links: [
    { text: "Customer stories", href: "https://example.com/customers" },
    { text: "Pricing", href: "https://example.com/pricing" },
    { text: "Security", href: "https://example.com/security" },
    { text: "Docs", href: "https://example.com/docs" }
  ],
  ogTags: { "og:title": "Acme launch readiness for SaaS founders" },
  twitterTags: { "twitter:card": "summary_large_image" },
  robotsMeta: ["index", "follow"],
  jsonLdTypes: ["SoftwareApplication", "FAQPage", "Organization"],
  hasRobotsTxt: true,
  hasSitemap: true,
  hasLlmsTxt: false,
  extractedText:
    "Acme helps SaaS founders find launch risks before release. Unlike generic checklists, it turns page evidence into owner-ready fixes. Trusted by product teams. Compare plans and review customer results.",
  warnings: []
};

const weakSignals: PageSignals = {
  ...strongSignals,
  title: "Acme",
  description: "",
  h1: ["Welcome to Acme"],
  h2: [],
  ctas: [{ text: "Learn more" }],
  links: [],
  ogTags: {},
  twitterTags: {},
  jsonLdTypes: [],
  extractedText: "Welcome to Acme. Learn more.",
  warnings: []
};

test("scores the seven Landing Lens criteria with stable weights and observed evidence", () => {
  const assessment = scoreLandingLens(input, strongSignals);
  const parsed = landingLensAssessmentSchema.safeParse(assessment);

  assert.equal(parsed.success, true);
  assert.equal(assessment.status, "scored");
  assert.equal(assessment.source, "url");
  assert.equal(assessment.criteria.length, 7);
  assert.deepEqual(
    assessment.criteria.map((criterion) => criterion.weight),
    [20, 15, 15, 15, 15, 10, 10]
  );
  assert.equal(
    assessment.criteria.reduce((total, criterion) => total + criterion.weight, 0),
    100
  );
  assert.ok(assessment.criteria.every((criterion) => criterion.score !== null));
  assert.ok(assessment.criteria.every((criterion) => criterion.evidence.startsWith("Observed")));

  const expectedScore = Math.round(
    assessment.criteria.reduce(
      (total, criterion) => total + ((criterion.score ?? 0) * criterion.weight) / 100,
      0
    )
  );
  assert.equal(assessment.score, expectedScore);
  assert.ok((assessment.score ?? 0) >= 75);
});

test("turns weak observed criteria into evidence-backed priority fixes", () => {
  const assessment = scoreLandingLens(input, weakSignals);

  assert.equal(assessment.status, "scored");
  assert.ok((assessment.score ?? 100) < 50);
  assert.ok(assessment.fixes.length > 0);
  assert.ok(assessment.fixes.some((fix) => fix.priority === "P0" && fix.criterionId === "heroClarity"));
  assert.ok(assessment.fixes.some((fix) => fix.criterionId === "ctaStrength" && fix.evidence.includes("Learn more")));
  assert.ok(
    assessment.fixes.every(
      (fix) => fix.evidence.startsWith("Observed") && fix.recommendation.length > 0 && fix.suggestedOwner.length > 0
    )
  );
});

test("labels partial evidence without pretending it is complete", () => {
  const assessment = scoreLandingLens(input, {
    ...strongSignals,
    source: "manual",
    status: "partial",
    requestedUrl: undefined,
    finalUrl: undefined,
    warnings: ["Only manual page copy was available."]
  });

  assert.equal(assessment.status, "partial");
  assert.equal(assessment.source, "manual");
  assert.equal(typeof assessment.score, "number");
  assert.match(assessment.limitation ?? "", /partial|manual/i);
});

test("keeps unavailable page evidence unscored", () => {
  const assessment = scoreLandingLens(input, {
    ...weakSignals,
    status: "unavailable",
    title: "",
    h1: [],
    ctas: [],
    extractedText: "",
    warnings: ["The page could not be inspected from the public URL."]
  });

  assert.equal(assessment.status, "unavailable");
  assert.equal(assessment.score, null);
  assert.ok(assessment.criteria.every((criterion) => criterion.score === null && criterion.tone === "unscored"));
  assert.equal(assessment.fixes.length, 0);
  assert.match(assessment.limitation ?? "", /could not be inspected|unavailable/i);
});
