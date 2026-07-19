import type { PageSignals } from "@/lib/types/pageSignals";

export type PreflightSignalsGroupId = "pageSummary" | "structure" | "metadata" | "crawlability" | "warnings";
export type PreflightSignalsTone = "success" | "warning" | "neutral";

export type PreflightSignalsListItem = {
  text: string;
  href?: string;
  detail?: string;
};

export type PreflightSignalsValueSection = {
  id: string;
  kind: "value";
  label: string;
  value: string;
};

export type PreflightSignalsListSection = {
  id: string;
  kind: "list";
  label: string;
  items: PreflightSignalsListItem[];
  totalCount: number;
};

export type PreflightSignalsSection = PreflightSignalsValueSection | PreflightSignalsListSection;

export type PreflightSignalsGroup = {
  id: PreflightSignalsGroupId;
  title: string;
  sections: PreflightSignalsSection[];
};

export type PreflightSignalsTargetView = {
  source: PageSignals["source"];
  sourceLabel: string;
  status: PageSignals["status"];
  statusLabel: string;
  tone: PreflightSignalsTone;
  statusSummary: string;
  requestedUrl?: string;
  finalUrl?: string;
};

export type PreflightSignalsView = {
  target: PreflightSignalsTargetView;
  groups: PreflightSignalsGroup[];
};

const MAX_VALUE_LENGTH = 180;
const MAX_ITEM_TEXT_LENGTH = 96;
const MAX_ITEM_DETAIL_LENGTH = 120;
const LIST_LIMITS = {
  h1: 3,
  h2: 4,
  ctas: 4,
  metadata: 4,
  warnings: 4
} as const;

const INTERNAL_WARNING_PATTERNS = [/error:/i, /econn/i, /stack trace/i];

export function getPreflightSignalsView(signals: PageSignals | undefined): PreflightSignalsView | null {
  if (!signals) {
    return null;
  }

  return {
    target: getTargetView(signals),
    groups: compact([
      getPageSummaryGroup(signals),
      getStructureGroup(signals),
      getMetadataGroup(signals),
      getCrawlabilityGroup(signals),
      getWarningsGroup(signals)
    ])
  };
}

function getTargetView(signals: PageSignals): PreflightSignalsTargetView {
  return {
    source: signals.source,
    sourceLabel: signals.source === "manual" ? "Manual copy" : "Public URL",
    status: signals.status,
    statusLabel: capitalize(signals.status),
    tone: getStatusTone(signals.status),
    statusSummary: getStatusSummary(signals),
    requestedUrl: signals.requestedUrl,
    finalUrl: signals.finalUrl
  };
}

function getStatusTone(status: PageSignals["status"]): PreflightSignalsTone {
  if (status === "success") {
    return "success";
  }

  if (status === "partial") {
    return "warning";
  }

  return "neutral";
}

function getStatusSummary(signals: PageSignals) {
  if (signals.status === "success") {
    return signals.source === "manual"
      ? "Using the provided manual copy as the observed HTML and metadata source."
      : "Captured public HTML and metadata from the requested target.";
  }

  if (signals.status === "partial") {
    return signals.source === "manual"
      ? "Using manual copy because only a limited subset of public page evidence was available."
      : "Only a limited subset of the public HTML and metadata could be captured. Treat missing fields as uninspected.";
  }

  return "Public HTML and metadata were unavailable for this target. Use the brief and any manual copy until the URL can be audited.";
}

function getPageSummaryGroup(signals: PageSignals): PreflightSignalsGroup | null {
  if (signals.status === "unavailable") {
    return null;
  }

  const sections = compact([
    valueSection("title", "Title", signals.title),
    valueSection("description", "Description", signals.description),
    valueSection("language", "Language", signals.language)
  ]);

  if (sections.length === 0) {
    return null;
  }

  return {
    id: "pageSummary",
    title: "Page summary",
    sections
  };
}

function getStructureGroup(signals: PageSignals): PreflightSignalsGroup | null {
  const sections = compact([
    listSection("h1", "H1", signals.h1, LIST_LIMITS.h1),
    listSection("h2", "H2", signals.h2, LIST_LIMITS.h2),
    ctaSection(signals)
  ]);

  if (sections.length === 0) {
    return null;
  }

  return {
    id: "structure",
    title: "Structure",
    sections
  };
}

function getMetadataGroup(signals: PageSignals): PreflightSignalsGroup | null {
  const sections = compact([
    recordSection("openGraph", "Open Graph", signals.ogTags),
    recordSection("twitter", "Twitter", signals.twitterTags),
    listSection("robotsMeta", "Robots meta", signals.robotsMeta, LIST_LIMITS.metadata),
    listSection("jsonLd", "JSON-LD", signals.jsonLdTypes, LIST_LIMITS.metadata)
  ]);

  if (sections.length === 0) {
    return null;
  }

  return {
    id: "metadata",
    title: "Metadata",
    sections
  };
}

function getCrawlabilityGroup(signals: PageSignals): PreflightSignalsGroup {
  const uninspected = signals.status === "unavailable" || signals.source === "manual";
  return {
    id: "crawlability",
    title: "Crawlability",
    sections: [
      booleanSection("robotsTxt", "robots.txt", uninspected ? null : signals.hasRobotsTxt),
      booleanSection("sitemap", "Sitemap", uninspected ? null : signals.hasSitemap),
      booleanSection("llmsTxt", "llms.txt", uninspected ? null : signals.hasLlmsTxt)
    ]
  };
}

function getWarningsGroup(signals: PageSignals): PreflightSignalsGroup | null {
  const warnings = sanitizeWarnings(signals.warnings);

  if (warnings.length === 0) {
    return null;
  }

  return {
    id: "warnings",
    title: "Warnings",
    sections: [
      {
        id: "warnings",
        kind: "list",
        label: "Warnings",
        totalCount: warnings.length,
        items: warnings.slice(0, LIST_LIMITS.warnings).map((warning) => ({ text: truncateText(warning, MAX_ITEM_TEXT_LENGTH) }))
      }
    ]
  };
}

function valueSection(id: string, label: string, value: string | undefined): PreflightSignalsValueSection | null {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  return {
    id,
    kind: "value",
    label,
    value: truncateText(normalized, MAX_VALUE_LENGTH)
  };
}

function booleanSection(id: string, label: string, value: boolean | null): PreflightSignalsValueSection {
  return {
    id,
    kind: "value",
    label,
    value: value === null ? "Not inspected" : value ? "Yes" : "No"
  };
}

function listSection(id: string, label: string, values: string[], limit: number): PreflightSignalsListSection | null {
  const items = values
    .map((value) => normalizeText(value))
    .filter((value): value is string => Boolean(value));

  if (items.length === 0) {
    return null;
  }

  return {
    id,
    kind: "list",
    label,
    totalCount: items.length,
    items: items.slice(0, limit).map((value) => ({ text: truncateText(value, MAX_ITEM_TEXT_LENGTH) }))
  };
}

function ctaSection(signals: PageSignals): PreflightSignalsListSection | null {
  const items = compact(
    signals.ctas.map((cta) => {
      const text = normalizeText(cta.text);
      if (!text) {
        return null;
      }

      return {
        text: truncateText(text, MAX_ITEM_TEXT_LENGTH),
        href: cta.href
      } satisfies PreflightSignalsListItem;
    })
  );

  if (items.length === 0) {
    return null;
  }

  return {
    id: "ctas",
    kind: "list",
    label: "CTAs",
    totalCount: items.length,
    items: items.slice(0, LIST_LIMITS.ctas)
  };
}

function recordSection(id: string, label: string, values: Record<string, string>): PreflightSignalsListSection | null {
  const entries = compact(
    Object.entries(values).map(([key, value]) => {
      const normalizedKey = normalizeText(key);
      const normalizedValue = normalizeText(value);
      if (!normalizedKey || !normalizedValue) {
        return null;
      }

      return {
        text: truncateText(normalizedKey, MAX_ITEM_TEXT_LENGTH),
        detail: truncateText(normalizedValue, MAX_ITEM_DETAIL_LENGTH)
      } satisfies PreflightSignalsListItem;
    })
  );

  if (entries.length === 0) {
    return null;
  }

  return {
    id,
    kind: "list",
    label,
    totalCount: entries.length,
    items: entries.slice(0, LIST_LIMITS.metadata)
  };
}

function sanitizeWarnings(warnings: string[]) {
  return warnings
    .map((warning) => normalizeText(warning))
    .filter((warning): warning is string => Boolean(warning))
    .filter((warning) => INTERNAL_WARNING_PATTERNS.every((pattern) => !pattern.test(warning)));
}

function normalizeText(value: string | undefined) {
  return value?.replace(/\s+/g, " ").trim() || "";
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function capitalize(value: string) {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}

function compact<T>(values: Array<T | null | undefined>): T[] {
  return values.filter((value): value is T => value != null);
}
