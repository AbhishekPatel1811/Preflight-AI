import assert from "node:assert/strict";
import test from "node:test";
import { scoreLandingLens } from "../lib/agents/landingLens";
import { getLandingLensView } from "../lib/ui/landingLensViewModel";
import type { PreflightInput } from "../lib/types";
import type { PageSignals } from "../lib/types/pageSignals";

const input: PreflightInput = {
  productUrl: "https://example.com",
  productBrief: "Launch readiness workspace for SaaS founders.",
  audience: "SaaS founders",
  launchDate: "2026-08-01",
  constraints: "",
  availableAssets: "",
  manualPageCopy: ""
};

const signals: PageSignals = {
  source: "url",
  status: "success",
  requestedUrl: "https://example.com",
  finalUrl: "https://example.com",
  title: "Launch readiness for SaaS founders",
  description: "Find launch risks and ship with confidence.",
  language: "en",
  h1: ["Ship your SaaS launch with fewer surprises"],
  h2: ["Customer results", "Frequently asked questions"],
  ctas: [{ text: "Run your launch audit", href: "https://example.com/start" }],
  links: [{ text: "Customer stories", href: "https://example.com/customers" }],
  ogTags: {},
  twitterTags: {},
  robotsMeta: [],
  jsonLdTypes: [],
  hasRobotsTxt: false,
  hasSitemap: false,
  hasLlmsTxt: false,
  extractedText: "Built for SaaS founders. Unlike a generic checklist, every risk becomes an owner-ready fix.",
  warnings: []
};

test("builds a compact seven-row Landing Lens view", () => {
  const view = getLandingLensView(scoreLandingLens(input, signals));

  assert.equal(view.statusLabel, "Scored");
  assert.match(view.scoreLabel, /^\d+$/);
  assert.equal(view.criteria.length, 7);
  assert.ok(view.criteria.every((criterion) => criterion.scoreLabel.endsWith("/100")));
  assert.ok(view.criteria.every((criterion) => criterion.evidence.length <= 183));
});

test("shows an honest not-scored state for unavailable evidence", () => {
  const view = getLandingLensView(
    scoreLandingLens(input, {
      ...signals,
      status: "unavailable",
      title: "",
      description: "",
      h1: [],
      h2: [],
      ctas: [],
      links: [],
      extractedText: "",
      warnings: ["The page could not be inspected from the public URL."]
    })
  );

  assert.equal(view.statusLabel, "Not scored");
  assert.equal(view.scoreLabel, "Not scored");
  assert.equal(view.tone, "neutral");
  assert.match(view.limitation ?? "", /could not be inspected/i);
  assert.ok(view.criteria.every((criterion) => criterion.scoreLabel === "Not scored"));
});
