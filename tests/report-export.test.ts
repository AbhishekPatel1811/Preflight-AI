import assert from "node:assert/strict";
import test from "node:test";
import { formatPreflightReportMarkdown } from "../lib/reportExport";
import type { PreflightInput, PreflightResult } from "../lib/types";
import type { PageSignals } from "../lib/types/pageSignals";
import { scoreLandingLens } from "../lib/agents/landingLens";

const input: PreflightInput = {
  productUrl: "",
  productBrief: "We are launching an AI code review assistant for small engineering teams.",
  audience: "Startup CTOs and engineering leads",
  launchDate: "2026-07-15",
  constraints: "Small team, no paid ads, limited design assets",
  availableAssets: "Landing page draft, product demo video",
  manualPageCopy: ""
};

const result: PreflightResult = {
  summary: "The launch is promising but needs sharper onboarding before a public push.",
  prioritizedPlan: [
    {
      priority: "P0",
      task: "Verify onboarding for first-time users",
      rationale: "Launch traffic is wasted if activation breaks during the first wave.",
      suggestedOwner: "Engineering"
    }
  ],
  riskRegister: [
    {
      risk: "Demo video depends on unfinished UI polish.",
      severity: "high",
      mitigation: "Record a fallback walkthrough with the current build by T-3 days."
    }
  ],
  ownerChecklist: [
    {
      owner: "Engineering",
      items: ["Test invite flow", "Prepare rollback plan"]
    }
  ],
  launchCopy: [
    {
      channel: "Landing page",
      headline: "Ship cleaner reviews before sprint planning.",
      body: "Improve pull request quality without slowing the team down."
    }
  ],
  landingRecommendations: {
    heroHeadline: "Ship cleaner reviews before sprint planning",
    heroSupportingCopy: "Give engineering teams faster, more consistent pull-request feedback without slowing delivery.",
    primaryCta: "Review your first pull request",
    ctaRationale: "The action states the first product outcome.",
    proofRecommendations: [
      "Show the median review-time reduction.",
      "Add one engineering-lead quote.",
      "Publish supported repository and privacy details."
    ]
  },
  followUpQuestions: ["Is this a waitlist launch, public launch, or private beta?"]
};

const successSignals: PageSignals = {
  source: "url",
  status: "success",
  requestedUrl: "https://example.com/product",
  finalUrl: "https://example.com/final",
  title: "PreflightAI for launch teams",
  description: "Plan launch readiness, proof, and owner follow-through from one page.",
  language: "en",
  h1: ["Ship launch plans without surprises"],
  h2: ["Proof"],
  ctas: [
    { text: "Start free", href: "https://example.com/signup" },
    { text: "Book demo", href: "https://example.com/demo" }
  ],
  links: [
    { text: "Pricing", href: "https://example.com/pricing" },
    { text: "Customer stories", href: "https://example.com/customers" },
    { text: "Security", href: "https://example.com/security" },
    { text: "Contact sales", href: "https://example.com/contact" }
  ],
  ogTags: { "og:title": "PreflightAI for launch teams" },
  twitterTags: { "twitter:card": "summary_large_image" },
  robotsMeta: ["index", "follow"],
  jsonLdTypes: ["SoftwareApplication"],
  hasRobotsTxt: true,
  hasSitemap: true,
  hasLlmsTxt: false,
  extractedText: "Sensitive extracted text that must never be exported.",
  warnings: []
};

const partialSignals: PageSignals = {
  source: "url",
  status: "partial",
  requestedUrl: "https://example.com/product",
  title: "PreflightAI",
  description: "",
  language: "en",
  h1: [],
  h2: [],
  ctas: [{ text: "Request access" }],
  links: [],
  ogTags: {},
  twitterTags: {},
  robotsMeta: [],
  jsonLdTypes: [],
  hasRobotsTxt: false,
  hasSitemap: false,
  hasLlmsTxt: false,
  extractedText: "",
  warnings: ["Only a limited subset of page elements was inspected."]
};

const unavailableSignals: PageSignals = {
  source: "url",
  status: "unavailable",
  requestedUrl: "https://example.com/product",
  title: "",
  description: "",
  language: "en",
  h1: [],
  h2: [],
  ctas: [],
  links: [],
  ogTags: {},
  twitterTags: {},
  robotsMeta: [],
  jsonLdTypes: [],
  hasRobotsTxt: false,
  hasSitemap: false,
  hasLlmsTxt: false,
  extractedText: "Internal stack traces must stay out.",
  warnings: ["The page could not be inspected from the public URL.", "Error: connect ECONNREFUSED 127.0.0.1:443"]
};

test("formats the generated PreflightAI report as portable markdown", () => {
  const markdown = formatPreflightReportMarkdown(input, result);

  assert.match(markdown, /^# PreflightAI report/m);
  assert.match(markdown, /## Launch context/);
  assert.match(markdown, /Audience: Startup CTOs and engineering leads/);
  assert.match(markdown, /## Prioritized plan/);
  assert.match(markdown, /1\. \[P0\] Verify onboarding for first-time users - Engineering/);
  assert.match(markdown, /## Risk register/);
  assert.match(markdown, /- \[high\] Demo video depends on unfinished UI polish\./);
  assert.match(markdown, /## Launch copy/);
  assert.match(markdown, /### Landing page/);
  assert.match(markdown, /## Landing page upgrade/);
  assert.match(markdown, /Primary CTA: Review your first pull request/);
  assert.match(markdown, /## Follow-up questions/);
  assert.ok(!markdown.includes("undefined"));
});

test("exports signal-aware audit target, page evidence, and module scores before the plan", () => {
  const markdown = formatPreflightReportMarkdown(input, {
    ...result,
    pageSignals: successSignals,
    landingLens: scoreLandingLens(input, successSignals)
  });

  assert.match(markdown, /## Audit target/);
  assert.match(markdown, /Requested URL: https:\/\/example\.com\/product/);
  assert.match(markdown, /Inspected URL: https:\/\/example\.com\/final/);
  assert.match(markdown, /## Page signals/);
  assert.match(markdown, /Status: success/);
  assert.match(markdown, /Title: PreflightAI for launch teams/);
  assert.match(markdown, /CTA count: 2/);
  assert.match(markdown, /robots\.txt: yes/);
  assert.match(markdown, /llms\.txt: no/);
  assert.match(markdown, /## Module scores/);
  assert.match(markdown, /## Landing Lens/);
  assert.match(markdown, /Landing score: \d+\/100/);
  assert.match(markdown, /Hero clarity: \d+\/100/);
  assert.ok(markdown.indexOf("## Audit target") < markdown.indexOf("## Page signals"));
  assert.ok(markdown.indexOf("## Page signals") < markdown.indexOf("## Module scores"));
  assert.ok(markdown.indexOf("## Module scores") < markdown.indexOf("## Prioritized plan"));
  assert.ok(!markdown.includes("Sensitive extracted text"));
});

test("exports partial and unavailable page evidence conservatively", () => {
  const partialMarkdown = formatPreflightReportMarkdown(input, {
    ...result,
    pageSignals: partialSignals,
    landingLens: scoreLandingLens(input, partialSignals)
  });
  const unavailableMarkdown = formatPreflightReportMarkdown(input, {
    ...result,
    pageSignals: unavailableSignals,
    landingLens: scoreLandingLens(input, unavailableSignals)
  });

  assert.match(partialMarkdown, /Status: partial/);
  assert.match(partialMarkdown, /Warnings: 1/);
  assert.match(partialMarkdown, /Only a limited subset of page elements was inspected\./);

  assert.match(unavailableMarkdown, /Status: unavailable/);
  assert.match(unavailableMarkdown, /Landing score: Not scored/);
  assert.match(unavailableMarkdown, /Title: Not captured/);
  assert.match(unavailableMarkdown, /CTA count: 0/);
  assert.match(unavailableMarkdown, /The page could not be inspected from the public URL\./);
  assert.doesNotMatch(unavailableMarkdown, /Internal stack traces/);
  assert.doesNotMatch(unavailableMarkdown, /ECONNREFUSED/);
});
