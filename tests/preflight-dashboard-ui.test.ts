import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LaunchPlanResult } from "../components/LaunchPlanResult";
import { LaunchPack } from "../components/LaunchPack";
import { PreflightBriefStep } from "../components/PreflightBriefStep";
import { PreflightDashboardShell } from "../components/PreflightDashboardShell";
import { PreflightSignalsPanel } from "../components/PreflightSignalsPanel";
import type { PreflightInput, PreflightResult } from "../lib/types";
import { scoreLandingLens } from "../lib/agents/landingLens";
import type { PageSignals } from "../lib/types/pageSignals";

const manualInput: PreflightInput = {
  productUrl: "",
  productBrief: "Launch a planning assistant for product teams.",
  audience: "Product leads",
  launchDate: "2026-07-21",
  constraints: "Small launch team",
  availableAssets: "Landing page copy",
  manualPageCopy: "Plan your launch with a readiness report. Start your audit today."
};

const manualSignals: PageSignals = {
  source: "manual",
  status: "partial",
  title: "",
  description: "",
  language: "",
  h1: ["Plan your launch"],
  h2: [],
  ctas: [{ text: "Start your audit" }],
  links: [],
  ogTags: {},
  twitterTags: {},
  robotsMeta: [],
  jsonLdTypes: [],
  hasRobotsTxt: false,
  hasSitemap: false,
  hasLlmsTxt: false,
  extractedText: manualInput.manualPageCopy,
  warnings: ["Manual page copy was used."]
};

const result: PreflightResult = {
  summary: "The launch has a clear foundation and needs stronger proof.",
  prioritizedPlan: [
    {
      priority: "P0",
      task: "Clarify the value proposition",
      rationale: "Visitors need a clear outcome.",
      suggestedOwner: "Marketing"
    },
    {
      priority: "P1",
      task: "Add proof",
      rationale: "Buyers need evidence.",
      suggestedOwner: "Founder"
    },
    {
      priority: "P2",
      task: "Polish launch copy",
      rationale: "Channels should stay consistent.",
      suggestedOwner: "Marketing"
    }
  ],
  riskRegister: [
    {
      risk: "Proof is not ready.",
      severity: "medium",
      mitigation: "Publish one verified customer outcome."
    }
  ],
  ownerChecklist: [{ owner: "Founder", items: ["Approve the launch message"] }],
  launchCopy: [
    {
      channel: "Landing page",
      headline: "Launch with fewer surprises.",
      body: "Turn a rough brief into an actionable readiness report."
    }
  ],
  landingRecommendations: {
    heroHeadline: "Launch with fewer surprises",
    heroSupportingCopy: "Turn page evidence into a clear readiness report with owners and priorities.",
    primaryCta: "Run your launch audit",
    ctaRationale: "The label describes the immediate outcome.",
    proofRecommendations: [
      "Show one quantified launch outcome.",
      "Add a customer quote with role and company.",
      "Link to the audit methodology."
    ]
  },
  followUpQuestions: ["Which customer proof can be published?"],
  pageSignals: manualSignals,
  landingLens: scoreLandingLens(manualInput, manualSignals)
};

test("manual evidence is labeled as submitted copy rather than URL extraction", () => {
  const html = renderToStaticMarkup(
    createElement(PreflightDashboardShell, {
      input: manualInput,
      result,
      isRunning: false,
      onNewAudit: () => undefined,
      onRerun: () => undefined
    })
  );

  assert.match(html, /Audited source<\/span><span[^>]*>Manual page copy<\/span>/);
  assert.match(html, /Evidence status: manual page copy partial\. Only the submitted text was inspected\./);
  assert.doesNotMatch(html, /Public HTML and metadata only/);
  assert.doesNotMatch(html, /Brief-only run/);
});

test("dashboard grid and primary columns can shrink to a mobile viewport", () => {
  const html = renderToStaticMarkup(
    createElement(PreflightDashboardShell, {
      input: manualInput,
      result,
      isRunning: false,
      onNewAudit: () => undefined,
      onRerun: () => undefined
    })
  );

  assert.match(html, /<div class="[^"]*grid min-w-0[^"]*">/);
  assert.match(html, /<aside class="[^"]*min-w-0[^"]*">/);
  assert.match(html, /<section class="[^"]*min-w-0[^"]*">/);
});

test("report workspace exposes one selected tab and a linked tabpanel", () => {
  const html = renderToStaticMarkup(
    createElement(LaunchPlanResult, {
      input: manualInput,
      result,
      activeTab: "overview",
      onActiveTabChange: () => undefined
    })
  );

  assert.match(html, /role="tablist"/);
  assert.equal((html.match(/role="tab"/g) ?? []).length, 4);
  assert.equal((html.match(/aria-selected="true"/g) ?? []).length, 1);
  assert.match(html, /id="preflight-tab-overview"[^>]*aria-controls="preflight-panel-overview"/);
  assert.match(html, /id="preflight-panel-overview"[^>]*role="tabpanel"[^>]*aria-labelledby="preflight-tab-overview"/);
  assert.match(html, /Landing Lens/);
  assert.match(html, /Partial evidence/);
  assert.equal((html.match(/data-landing-criterion="true"/g) ?? []).length, 7);
});

test("launch pack renders copy-ready landing recommendations", () => {
  const html = renderToStaticMarkup(createElement(LaunchPack, { result }));

  assert.match(html, /Landing page upgrade/);
  assert.match(html, /Launch with fewer surprises/);
  assert.match(html, /Run your launch audit/);
  assert.match(html, /Show one quantified launch outcome/);
  assert.match(html, /aria-label="Copy hero recommendation"/);
  assert.match(html, /aria-label="Copy CTA recommendation"/);
  assert.match(html, /aria-label="Copy proof recommendations"/);
});

test("sample loading is not a form submission and manual copy keeps a native disclosure marker", () => {
  const html = renderToStaticMarkup(
    createElement(PreflightBriefStep, {
      input: manualInput,
      errors: {},
      isSubmitting: false,
      onFieldChange: () => undefined,
      onSubmit: () => undefined,
      onLoadSample: () => undefined
    })
  );

  assert.match(html, /<button[^>]*type="button"[^>]*>[^<]*(?:<svg[\s\S]*?<\/svg>)?[^<]*Load sample/);
  assert.doesNotMatch(html, /<summary[^>]*list-none/);
});

test("brief fields expose required semantics and prevent past launch dates", () => {
  const html = renderToStaticMarkup(
    createElement(PreflightBriefStep, {
      input: manualInput,
      errors: {},
      isSubmitting: false,
      onFieldChange: () => undefined,
      onSubmit: () => undefined,
      onLoadSample: () => undefined
    })
  );
  const today = new Date().toISOString().slice(0, 10);

  assert.equal((html.match(/data-required-marker="true"/g) ?? []).length, 4);
  assert.match(html, /id="productUrl"[^>]*required=""/);
  assert.match(html, /id="productBrief"[^>]*required=""/);
  assert.match(html, /id="audience"[^>]*required=""/);
  assert.match(html, new RegExp(`id="launchDate"[^>]*min="${today}"[^>]*required=""`));
  assert.match(html, /Required fields are marked/);
});

test("brief validation renders an accessible error summary", () => {
  const html = renderToStaticMarkup(
    createElement(PreflightBriefStep, {
      input: manualInput,
      errors: {
        productUrl: "Product URL is required.",
        launchDate: "Choose today or a future launch date."
      },
      isSubmitting: false,
      onFieldChange: () => undefined,
      onSubmit: () => undefined,
      onLoadSample: () => undefined
    })
  );

  assert.match(html, /role="alert"/);
  assert.match(html, /Review the 2 highlighted fields before generating the report/);
});

test("embedded brief preserves the landing page landmark and heading hierarchy", () => {
  const html = renderToStaticMarkup(
    createElement(PreflightBriefStep, {
      input: manualInput,
      errors: {},
      isSubmitting: false,
      embedded: true,
      onFieldChange: () => undefined,
      onSubmit: () => undefined,
      onLoadSample: () => undefined
    })
  );

  assert.doesNotMatch(html, /<main/);
  assert.doesNotMatch(html, /<h1/);
  assert.match(html, /<h3[^>]*>Shape your launch<\/h3>/);
});

test("launch pack discloses prioritized tasks beyond the compact preview", () => {
  const overflowResult: PreflightResult = {
    ...result,
    prioritizedPlan: [
      ...result.prioritizedPlan,
      {
        priority: "P2",
        task: "Review launch analytics",
        rationale: "Confirm the measurement plan before launch day.",
        suggestedOwner: "Product"
      },
      {
        priority: "P2",
        task: "Polish secondary copy",
        rationale: "Refine supporting copy after launch blockers are cleared.",
        suggestedOwner: "Marketing"
      }
    ],
    riskRegister: Array.from({ length: 5 }, (_, index) => ({
      risk: `Launch risk ${index + 1}`,
      severity: "medium" as const,
      mitigation: `Mitigation ${index + 1}`
    })),
    ownerChecklist: [
      { owner: "Engineering", items: ["Task 1", "Task 2", "Task 3", "Task 4"] },
      { owner: "Marketing", items: ["Prepare message"] },
      { owner: "Support", items: ["Prepare replies"] },
      { owner: "Product", items: ["Review metrics"] }
    ],
    launchCopy: Array.from({ length: 4 }, (_, index) => ({
      channel: `Channel ${index + 1}`,
      headline: `Headline ${index + 1}`,
      body: `Body ${index + 1}`
    }))
  };
  const html = renderToStaticMarkup(createElement(LaunchPack, { result: overflowResult }));

  assert.match(html, /View 1 more launch task/);
  assert.match(html, /Polish secondary copy/);
  assert.match(html, /View 1 more launch risk/);
  assert.match(html, /Launch risk 5/);
  assert.match(html, /View 1 more owner/);
  assert.match(html, /Review metrics/);
  assert.match(html, /View 1 more owner task/);
  assert.match(html, /Task 4/);
  assert.match(html, /View 1 more message/);
  assert.match(html, /Headline 4/);
});

test("a submitted source without signals does not show brief-only evidence copy", () => {
  const html = renderToStaticMarkup(createElement(PreflightSignalsPanel, { input: manualInput, signals: undefined }));

  assert.match(html, /No page signals were returned for the submitted source/);
  assert.doesNotMatch(html, /Brief-only reports use/);
});

test("public signal targets and observed links remain actionable", () => {
  const publicInput = { ...manualInput, productUrl: "https://example.com", manualPageCopy: "" };
  const publicSignals = {
    ...result.pageSignals!,
    source: "url" as const,
    status: "success" as const,
    requestedUrl: "https://example.com/",
    finalUrl: "https://example.com/product",
    ctas: [{ text: "Pricing", href: "https://example.com/pricing" }],
    links: [{ text: "Pricing", href: "https://example.com/pricing" }]
  };
  const html = renderToStaticMarkup(
    createElement(PreflightSignalsPanel, { input: publicInput, signals: publicSignals })
  );

  assert.match(html, /href="https:\/\/example\.com\/"/);
  assert.match(html, /href="https:\/\/example\.com\/product"/);
  assert.match(html, /href="https:\/\/example\.com\/pricing"/);
  assert.match(html, /rel="noreferrer"/);
});
