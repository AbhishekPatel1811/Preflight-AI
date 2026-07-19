import assert from "node:assert/strict";
import test from "node:test";
import { getPreflightSignalsView } from "../lib/ui/preflightSignalsViewModel";
import type {
  PreflightSignalsGroup,
  PreflightSignalsListSection,
  PreflightSignalsValueSection
} from "../lib/ui/preflightSignalsViewModel";
import type { PageSignals } from "../lib/types/pageSignals";

function getGroup(view: NonNullable<ReturnType<typeof getPreflightSignalsView>>, groupId: PreflightSignalsGroup["id"]) {
  const group = view.groups.find((entry) => entry.id === groupId);
  assert.ok(group, `expected ${groupId} group`);
  return group;
}

function getListSection(group: PreflightSignalsGroup, sectionId: string) {
  const section = group.sections.find((entry): entry is PreflightSignalsListSection => entry.id === sectionId && entry.kind === "list");
  assert.ok(section, `expected ${group.id}.${sectionId} list section`);
  return section;
}

function getValueSection(group: PreflightSignalsGroup, sectionId: string) {
  const section = group.sections.find((entry): entry is PreflightSignalsValueSection => entry.id === sectionId && entry.kind === "value");
  assert.ok(section, `expected ${group.id}.${sectionId} value section`);
  return section;
}

const successSignals: PageSignals = {
  source: "url",
  status: "success",
  requestedUrl: "https://example.com/product",
  finalUrl: "https://example.com/final",
  title: "PreflightAI for launch teams",
  description:
    "Plan launch readiness, proof, owner follow-through, and follow-up coverage from one place without losing the thread when a release gets busy. ".repeat(
      3
    ),
  language: "en",
  h1: [
    "Ship launch plans without surprises",
    "Coordinate owners in one place",
    "Track launch risk before release",
    "This extra hero line should be trimmed from the sample view"
  ],
  h2: ["Proof", "Owners", "Readiness", "Signals", "This extra subheading should be trimmed"],
  ctas: [
    { text: "Start free", href: "https://example.com/signup" },
    { text: "Book demo", href: "https://example.com/demo" },
    { text: "Read docs", href: "https://example.com/docs" },
    { text: "Contact sales", href: "https://example.com/contact" },
    { text: "This extra CTA should be trimmed", href: "https://example.com/extra" }
  ],
  links: [{ text: "Pricing", href: "https://example.com/pricing" }],
  ogTags: {
    "og:title": "PreflightAI for launch teams",
    "og:description": "Observed OG description",
    "og:image": "https://example.com/og.png",
    "og:url": "https://example.com/final",
    "og:site_name": "PreflightAI"
  },
  twitterTags: {
    "twitter:card": "summary_large_image",
    "twitter:title": "PreflightAI for launch teams",
    "twitter:description": "Observed Twitter description",
    "twitter:image": "https://example.com/twitter.png",
    "twitter:site": "@preflightai"
  },
  robotsMeta: ["index", "follow", "max-snippet:-1", "max-image-preview:large", "unavailable_after: 1 day"],
  jsonLdTypes: ["SoftwareApplication", "FAQPage", "Organization", "WebPage", "BreadcrumbList"],
  hasRobotsTxt: true,
  hasSitemap: true,
  hasLlmsTxt: false,
  extractedText: "<html><body>secret raw html that must stay out of the UI view model</body></html>",
  warnings: [
    "Missing canonical tag",
    "Limited social preview coverage",
    "Hero image is unusually large",
    "One CTA points off-domain",
    "This extra warning should be trimmed"
  ]
};

const partialSignals: PageSignals = {
  source: "manual",
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
  extractedText: "Manual notes that should never show up directly.",
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
  extractedText: "<html>raw fallback text</html>",
  warnings: [
    "The page could not be inspected from the public URL.",
    "Error: connect ECONNREFUSED 127.0.0.1:443"
  ]
};

test("builds bounded signal groups from successful page evidence without leaking raw extracts", () => {
  const view = getPreflightSignalsView(successSignals);

  assert.ok(view);
  assert.equal(view.target.sourceLabel, "Public URL");
  assert.equal(view.target.statusLabel, "Success");
  assert.equal(view.target.requestedUrl, "https://example.com/product");
  assert.equal(view.target.finalUrl, "https://example.com/final");
  assert.match(view.target.statusSummary, /public HTML and metadata/i);
  assert.deepEqual(view.groups.map((group) => group.id), [
    "pageSummary",
    "structure",
    "metadata",
    "crawlability",
    "warnings"
  ]);

  const pageSummary = getGroup(view, "pageSummary");
  assert.equal(getValueSection(pageSummary, "title").value, "PreflightAI for launch teams");
  assert.match(getValueSection(pageSummary, "description").value, /\.\.\.$/);
  assert.ok(getValueSection(pageSummary, "description").value.length < successSignals.description.length);
  assert.equal(getValueSection(pageSummary, "language").value, "en");

  const structure = getGroup(view, "structure");
  const h1Section = getListSection(structure, "h1");
  assert.equal(h1Section.totalCount, 4);
  assert.deepEqual(h1Section.items.map((item) => item.text), [
    "Ship launch plans without surprises",
    "Coordinate owners in one place",
    "Track launch risk before release"
  ]);
  const h2Section = getListSection(structure, "h2");
  assert.equal(h2Section.totalCount, 5);
  assert.equal(h2Section.items.length, 4);
  const ctasSection = getListSection(structure, "ctas");
  assert.equal(ctasSection.totalCount, 5);
  assert.equal(ctasSection.items.length, 4);
  assert.equal(ctasSection.items[0]?.href, "https://example.com/signup");

  const metadata = getGroup(view, "metadata");
  assert.equal(getListSection(metadata, "openGraph").items.length, 4);
  assert.equal(getListSection(metadata, "openGraph").totalCount, 5);
  assert.equal(getListSection(metadata, "twitter").items.length, 4);
  assert.equal(getListSection(metadata, "robotsMeta").items.length, 4);
  assert.equal(getListSection(metadata, "jsonLd").items.length, 4);

  const crawlability = getGroup(view, "crawlability");
  assert.equal(getValueSection(crawlability, "robotsTxt").value, "Yes");
  assert.equal(getValueSection(crawlability, "sitemap").value, "Yes");
  assert.equal(getValueSection(crawlability, "llmsTxt").value, "No");

  const warnings = getGroup(view, "warnings");
  const warningsSection = getListSection(warnings, "warnings");
  assert.equal(warningsSection.totalCount, 5);
  assert.equal(warningsSection.items.length, 4);

  const serializedView = JSON.stringify(view);
  assert.doesNotMatch(serializedView, /secret raw html/i);
  assert.doesNotMatch(serializedView, /<html>/i);
});

test("omits empty groups while keeping partial evidence conservative and explicit", () => {
  const view = getPreflightSignalsView(partialSignals);

  assert.ok(view);
  assert.equal(view.target.sourceLabel, "Manual copy");
  assert.equal(view.target.statusLabel, "Partial");
  assert.match(view.target.statusSummary, /limited subset|manual copy/i);
  assert.deepEqual(view.groups.map((group) => group.id), ["pageSummary", "structure", "crawlability", "warnings"]);

  const structure = getGroup(view, "structure");
  assert.deepEqual(structure.sections.map((section) => section.id), ["ctas"]);
  assert.deepEqual(getListSection(structure, "ctas").items.map((item) => item.text), ["Request access"]);
  assert.equal(view.groups.some((group) => group.id === "metadata"), false);

  const crawlability = getGroup(view, "crawlability");
  assert.equal(getValueSection(crawlability, "robotsTxt").value, "Not inspected");
  assert.equal(getValueSection(crawlability, "sitemap").value, "Not inspected");
  assert.equal(getValueSection(crawlability, "llmsTxt").value, "Not inspected");
});

test("keeps unavailable evidence explicit, omits empty summary groups, and sanitizes raw warning details", () => {
  const view = getPreflightSignalsView(unavailableSignals);

  assert.ok(view);
  assert.equal(view.target.sourceLabel, "Public URL");
  assert.equal(view.target.statusLabel, "Unavailable");
  assert.match(view.target.statusSummary, /brief|manual copy|unavailable/i);
  assert.deepEqual(view.groups.map((group) => group.id), ["crawlability", "warnings"]);

  const crawlability = getGroup(view, "crawlability");
  assert.equal(getValueSection(crawlability, "robotsTxt").value, "Not inspected");
  assert.equal(getValueSection(crawlability, "sitemap").value, "Not inspected");
  assert.equal(getValueSection(crawlability, "llmsTxt").value, "Not inspected");

  const warnings = getGroup(view, "warnings");
  assert.deepEqual(getListSection(warnings, "warnings").items.map((item) => item.text), [
    "The page could not be inspected from the public URL."
  ]);
});
