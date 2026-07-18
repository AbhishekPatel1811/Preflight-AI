import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import type { PreflightInput } from "@/lib/types";
import type { PageSignals } from "@/lib/types/pageSignals";
import { fetchPublicTextResource, type PublicFetchInput, type PublicTextResource } from "./publicFetch";
import { isPublicIpAddress } from "./urlSafety";

type FetchResource = (input: PublicFetchInput) => Promise<PublicTextResource>;

type ExtractOptions = {
  source: PageSignals["source"];
  requestedUrl?: string;
  finalUrl?: string;
  warnings?: string[];
};

type ResolveDependencies = {
  fetchResource?: FetchResource;
  signal?: AbortSignal;
};

const MAIN_TIMEOUT_MS = 8000;
const MAIN_MAX_BYTES = 1024 * 1024;
const PROBE_MAX_BYTES = 128 * 1024;
const MAX_EXTRACTED_TEXT = 15000;

const TIMEOUT_WARNING = "The page could not be reached within the time limit.";
const UNSUPPORTED_WARNING = "The page returned an unsupported content type.";
const SIZE_WARNING = "The page response was larger than the audit limit.";
const PUBLIC_WARNING = "The URL is not available for public auditing.";
export function extractSignalsFromHtml(html: string, options: ExtractOptions): PageSignals {
  const $ = cheerio.load(html);
  const baseUrl = options.finalUrl ?? options.requestedUrl;
  const metadata = collectMetadata($);
  const jsonLdTypes = collectJsonLdTypes($);

  $("script, style, noscript, template, svg, [hidden], [aria-hidden='true']").remove();

  return {
    source: options.source,
    status: options.warnings?.length ? "partial" : "success",
    requestedUrl: safeOutputUrl(options.requestedUrl),
    finalUrl: safeOutputUrl(options.finalUrl),
    title: truncate(normalizeText($("title").first().text()), 300),
    description: truncate(metadata.description ?? "", 1000),
    language: truncate(normalizeText($("html").first().attr("lang") ?? ""), 32),
    h1: uniqueText($, "h1", 300).slice(0, 5),
    h2: uniqueText($, "h2", 300).slice(0, 20),
    ctas: collectCtas($, baseUrl),
    links: collectLinks($, baseUrl),
    ogTags: metadata.ogTags,
    twitterTags: metadata.twitterTags,
    robotsMeta: metadata.robotsMeta,
    jsonLdTypes,
    hasRobotsTxt: false,
    hasSitemap: false,
    hasLlmsTxt: false,
    extractedText: truncate(normalizeText($("body").text()), MAX_EXTRACTED_TEXT),
    warnings: safeWarnings(options.warnings ?? [])
  };
}

export async function resolvePageSignals(
  input: PreflightInput,
  dependencies: ResolveDependencies = {}
): Promise<PageSignals | undefined> {
  const fetchResource = dependencies.fetchResource ?? fetchPublicTextResource;
  const productUrl = input.productUrl.trim();
  const manualPageCopy = input.manualPageCopy.trim();

  if (!productUrl && manualPageCopy) {
    return buildManualSignals(manualPageCopy);
  }

  if (!productUrl) {
    return undefined;
  }

  let page: PublicTextResource;
  try {
    page = await fetchResource({
      url: productUrl,
      signal: dependencies.signal,
      timeoutMs: MAIN_TIMEOUT_MS,
      maxBytes: MAIN_MAX_BYTES,
      acceptedContentTypes: ["text/html", "text/plain"],
      maxRedirects: 3
    });
  } catch (error) {
    throwIfCallerAborted(dependencies.signal);
    const warning = classifyFetchWarning(error);
    if (manualPageCopy) {
      return buildManualSignals(manualPageCopy, { requestedUrl: productUrl, warnings: [warning] });
    }

    return buildUnavailableSignals(productUrl, warning);
  }

  const probes = await resolvePageProbes(page.finalUrl, fetchResource, dependencies.signal);
  const signals = extractSignalsFromHtml(page.text, {
    source: "url",
    requestedUrl: page.requestedUrl,
    finalUrl: page.finalUrl,
    warnings: probes.warnings
  });

  return {
    ...signals,
    status: probes.warnings.length ? "partial" : "success",
    hasRobotsTxt: probes.hasRobotsTxt,
    hasSitemap: probes.hasSitemap,
    hasLlmsTxt: probes.hasLlmsTxt,
    warnings: probes.warnings
  };
}

function buildManualSignals(
  manualPageCopy: string,
  options: { requestedUrl?: string; warnings?: string[] } = {}
): PageSignals {
  return {
    source: "manual",
    status: "partial",
    requestedUrl: options.requestedUrl,
    finalUrl: undefined,
    title: "",
    description: "",
    language: "",
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
    extractedText: truncate(normalizeText(manualPageCopy), MAX_EXTRACTED_TEXT),
    warnings: dedupe(options.warnings ?? []).slice(0, 10)
  };
}

function buildUnavailableSignals(requestedUrl: string, warning: string): PageSignals {
  return {
    ...buildManualSignals("", { requestedUrl, warnings: [warning] }),
    source: "url",
    status: "unavailable"
  };
}

async function resolvePageProbes(
  finalUrl: string,
  fetchResource: FetchResource,
  signal?: AbortSignal
): Promise<Pick<PageSignals, "hasRobotsTxt" | "hasSitemap" | "hasLlmsTxt" | "warnings">> {
  const origin = new URL(finalUrl).origin;
  const [robots, sitemap, llms] = await Promise.all([
    probeTextResource(fetchResource, new URL("/robots.txt", origin).toString(), ["text/plain"], signal),
    probeTextResource(fetchResource, new URL("/sitemap.xml", origin).toString(), ["application/xml", "text/xml", "text/plain"], signal),
    probeTextResource(fetchResource, new URL("/llms.txt", origin).toString(), ["text/plain", "text/markdown"], signal)
  ]);

  return {
    hasRobotsTxt: robots.ok,
    hasSitemap: sitemap.ok || (robots.ok && /(^|\n)\s*sitemap\s*:/i.test(robots.text)),
    hasLlmsTxt: llms.ok,
    warnings: dedupe([probeWarning(robots), probeWarning(sitemap), probeWarning(llms)].filter(isString)).slice(0, 10)
  };
}

async function probeTextResource(
  fetchResource: FetchResource,
  url: string,
  acceptedContentTypes: string[],
  signal?: AbortSignal
): Promise<{ ok: true; text: string } | { ok: false; warning: string }> {
  try {
    const resource = await fetchResource({
      url,
      signal,
      timeoutMs: MAIN_TIMEOUT_MS,
      maxBytes: PROBE_MAX_BYTES,
      acceptedContentTypes,
      maxRedirects: 3
    });

    return { ok: true, text: resource.text };
  } catch (error) {
    throwIfCallerAborted(signal);
    return { ok: false, warning: classifyFetchWarning(error) };
  }
}

function collectMetadata($: CheerioAPI) {
  const ogTags: Record<string, string> = {};
  const twitterTags: Record<string, string> = {};
  const robotsMeta: string[] = [];
  let description: string | undefined;

  $("meta").each((_, element) => {
    const $meta = $(element);
    const key = normalizeText($meta.attr("property") ?? $meta.attr("name") ?? "").toLowerCase();
    const content = normalizeText($meta.attr("content") ?? "");

    if (!key || !content) return;
    if (key === "description" && !description) {
      description = truncate(content, 1000);
      return;
    }
    if (key.startsWith("og:") && Object.keys(ogTags).length < 30) {
      ogTags[truncate(key, 100)] = truncate(content, 1000);
      return;
    }
    if (key.startsWith("twitter:") && Object.keys(twitterTags).length < 30) {
      twitterTags[truncate(key, 100)] = truncate(content, 1000);
      return;
    }
    if (key === "robots") {
      robotsMeta.push(...content.split(",").map((item) => item.trim().toLowerCase()));
    }
  });

  return {
    description,
    ogTags,
    twitterTags,
    robotsMeta: dedupe(robotsMeta.filter(Boolean)).slice(0, 10)
  };
}

function collectCtas($: CheerioAPI, baseUrl?: string): PageSignals["ctas"] {
  const ctas: PageSignals["ctas"] = [];

  $("button, input[type='submit'], input[type='button'], [role='button']").each((_, element) => {
    if (ctas.length >= 20) return false;

    const $element = $(element);
    const text = truncate(normalizeText($element.is("input") ? $element.attr("value") ?? "" : $element.text()), 300);
    if (!text) return;

    pushUniqueCta(ctas, { text });
  });

  $("a[href]").each((_, element) => {
    if (ctas.length >= 20) return false;

    const text = truncate(normalizeText($(element).text()), 300);
    const href = resolveSafeHref($(element).attr("href"), baseUrl);
    if (!text || !href) return;

    pushUniqueCta(ctas, { text, href });
  });

  return ctas;
}

function probeWarning(result: { ok: true; text: string } | { ok: false; warning: string }): string | undefined {
  return result.ok ? undefined : result.warning;
}

function collectLinks($: CheerioAPI, baseUrl?: string): PageSignals["links"] {
  if (!baseUrl) return [];

  const base = new URL(baseUrl);
  const links: PageSignals["links"] = [];

  $("a[href]").each((_, element) => {
    if (links.length >= 40) return false;

    const text = truncate(normalizeText($(element).text()), 300);
    const href = resolveSafeHref($(element).attr("href"), baseUrl);
    if (!text || !href || new URL(href).origin !== base.origin) return;

    if (!links.some((link) => link.text === text && link.href === href)) {
      links.push({ text, href });
    }
  });

  return links;
}

function collectJsonLdTypes($: CheerioAPI): string[] {
  const types: string[] = [];

  $("script[type='application/ld+json']").each((_, element) => {
    try {
      collectTypes(JSON.parse($(element).text()), types);
    } catch {
      // Invalid page-owned JSON-LD should not block extraction.
    }
  });

  return dedupe(types.map((type) => truncate(type, 100))).slice(0, 20);
}

function collectTypes(value: unknown, types: string[]): void {
  if (Array.isArray(value)) {
    value.forEach((item) => collectTypes(item, types));
    return;
  }

  if (!value || typeof value !== "object") return;

  const record = value as Record<string, unknown>;
  const typeValue = record["@type"];
  if (typeof typeValue === "string") {
    types.push(typeValue);
  } else if (Array.isArray(typeValue)) {
    for (const item of typeValue) {
      if (typeof item === "string") types.push(item);
    }
  }

  Object.values(record).forEach((nested) => collectTypes(nested, types));
}

function uniqueText($: CheerioAPI, selector: string, maxLength: number): string[] {
  const values: string[] = [];
  $(selector).each((_, element) => {
    const text = truncate(normalizeText($(element).text()), maxLength);
    if (text && !values.includes(text)) values.push(text);
  });
  return values;
}

function pushUniqueCta(ctas: PageSignals["ctas"], candidate: PageSignals["ctas"][number]) {
  if (!ctas.some((cta) => cta.text === candidate.text && cta.href === candidate.href)) {
    ctas.push(candidate);
  }
}

function resolveSafeHref(rawHref: string | undefined, baseUrl?: string): string | undefined {
  if (!rawHref || !baseUrl) return undefined;

  try {
    const parsed = new URL(rawHref, baseUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return undefined;
    if (parsed.username || parsed.password || parsed.port) return undefined;

    const hostname = parsed.hostname.toLowerCase();
    if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
      return undefined;
    }
    if (isIpAddress(hostname) && !isPublicIpAddress(hostname)) return undefined;

    return parsed.toString().length <= 2048 ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

function safeOutputUrl(value: string | undefined): string | undefined {
  if (!value || value.length > 2048) return undefined;
  return resolveSafeHref(value, value);
}

function safeWarnings(warnings: string[]): string[] {
  return dedupe(warnings.filter(isKnownWarning)).slice(0, 10);
}

function isKnownWarning(warning: string): boolean {
  return [TIMEOUT_WARNING, UNSUPPORTED_WARNING, SIZE_WARNING, PUBLIC_WARNING].includes(warning);
}

function throwIfCallerAborted(signal: AbortSignal | undefined): void {
  if (!signal?.aborted) return;

  const reason = signal.reason;
  throw reason instanceof Error ? reason : new Error("Page signal resolution aborted.");
}

function isIpAddress(hostname: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":");
}

function classifyFetchWarning(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (/timed out|aborted/i.test(message)) return TIMEOUT_WARNING;
  if (/content type/i.test(message)) return UNSUPPORTED_WARNING;
  if (/max bytes|limit/i.test(message)) return SIZE_WARNING;
  return PUBLIC_WARNING;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values));
}

function isString(value: string | undefined): value is string {
  return typeof value === "string" && value.length > 0;
}
