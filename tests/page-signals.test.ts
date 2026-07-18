import assert from "node:assert/strict";
import test from "node:test";
import type { PreflightInput } from "../lib/types";
import type { PublicFetchInput, PublicTextResource } from "../lib/server/publicFetch";
import { extractSignalsFromHtml, resolvePageSignals } from "../lib/server/pageSignals";

type FetchResource = (input: PublicFetchInput) => Promise<PublicTextResource>;

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function createInput(overrides: Partial<PreflightInput> = {}): PreflightInput {
  return {
    productUrl: "https://example.com/product",
    productBrief: "Launch the new product page with a clearer plan.",
    audience: "B2B SaaS teams",
    launchDate: "2026-08-01",
    constraints: "",
    availableAssets: "",
    manualPageCopy: "",
    ...overrides
  };
}

function createTextResource(url: string, text: string, contentType = "text/html"): PublicTextResource {
  return {
    requestedUrl: url,
    finalUrl: url,
    contentType,
    status: 200,
    text
  };
}

const TIMEOUT_WARNING = "The page could not be reached within the time limit.";
const UNSUPPORTED_WARNING = "The page returned an unsupported content type.";
const SIZE_WARNING = "The page response was larger than the audit limit.";
const PUBLIC_WARNING = "The URL is not available for public auditing.";

test("extractSignalsFromHtml normalizes, deduplicates, and bounds HTML signals", () => {
  const html = `<!doctype html>
  <html lang=" en-US ">
    <head>
      <title>
        Example Product
      </title>
      <meta name="description" content="  Turn rough launch ideas into release-ready plans.  " />
      <meta property="og:title" content=" Example Product " />
      <meta property="og:description" content=" Open Graph description " />
      <meta name="twitter:title" content=" Example Product on X " />
      <meta name="twitter:card" content=" summary_large_image " />
      <meta name="robots" content="index, follow" />
      <meta name="robots" content="follow, max-image-preview:large" />
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "offers": { "@type": "Offer" },
          "mainEntity": [{ "@type": ["WebPage", "CreativeWork"] }]
        }
      </script>
      <script type="application/ld+json">
        [{"@type":"FAQPage"}]
      </script>
      <script type="application/ld+json">
        {"broken":
      </script>
      <style>.ignored { display: none; }</style>
    </head>
    <body>
      <script>window.secret = "ignore me";</script>
      <noscript>Ignore noscript text</noscript>
      <svg><text>Ignore svg text</text></svg>
      <template>Ignore template text</template>
      <div hidden>Ignore hidden text</div>
      <h1> Example Product </h1>
      <h1>Example Product</h1>
      <h1> Launch planning made easier </h1>
      <h2>Why teams switch</h2>
      <h2>Why teams switch</h2>
      <h2> Launch checklist </h2>
      <a href="/signup">Start free</a>
      <a href="/signup">Start free</a>
      <a href="https://book.example.net/demo">Book demo</a>
      <button> Request invite </button>
      <input type="submit" value="Get started" />
      <input type="button" value="Talk to sales" />
      <div role="button">See pricing</div>
      <a href="/pricing">Pricing</a>
      <a href="/pricing">Pricing</a>
      <a href="https://example.com/docs">Docs</a>
      <a href="https://external.example/blog">External blog</a>
      <a href="javascript:alert(1)">Unsafe link</a>
      <p>${"Alpha ".repeat(4000)}</p>
    </body>
  </html>`;

  const result = extractSignalsFromHtml(html, {
    source: "url",
    requestedUrl: "https://example.com/product",
    finalUrl: "https://example.com/product"
  });

  assert.equal(result.source, "url");
  assert.equal(result.status, "success");
  assert.equal(result.requestedUrl, "https://example.com/product");
  assert.equal(result.finalUrl, "https://example.com/product");
  assert.equal(result.title, "Example Product");
  assert.equal(result.description, "Turn rough launch ideas into release-ready plans.");
  assert.equal(result.language, "en-US");
  assert.deepEqual(result.h1, ["Example Product", "Launch planning made easier"]);
  assert.deepEqual(result.h2, ["Why teams switch", "Launch checklist"]);
  assert.deepEqual(result.ctas, [
    { text: "Request invite" },
    { text: "Get started" },
    { text: "Talk to sales" },
    { text: "See pricing" },
    { text: "Start free", href: "https://example.com/signup" },
    { text: "Book demo", href: "https://book.example.net/demo" },
    { text: "Pricing", href: "https://example.com/pricing" },
    { text: "Docs", href: "https://example.com/docs" },
    { text: "External blog", href: "https://external.example/blog" }
  ]);
  assert.deepEqual(result.links, [
    { text: "Start free", href: "https://example.com/signup" },
    { text: "Pricing", href: "https://example.com/pricing" },
    { text: "Docs", href: "https://example.com/docs" }
  ]);
  assert.deepEqual(result.ogTags, {
    "og:title": "Example Product",
    "og:description": "Open Graph description"
  });
  assert.deepEqual(result.twitterTags, {
    "twitter:title": "Example Product on X",
    "twitter:card": "summary_large_image"
  });
  assert.deepEqual(result.robotsMeta, ["index", "follow", "max-image-preview:large"]);
  assert.deepEqual(result.jsonLdTypes, ["SoftwareApplication", "Offer", "WebPage", "CreativeWork", "FAQPage"]);
  assert.equal(result.hasRobotsTxt, false);
  assert.equal(result.hasSitemap, false);
  assert.equal(result.hasLlmsTxt, false);
  assert.equal(result.warnings.length, 0);
  assert.equal(result.extractedText.length, 15000);
  assert.match(result.extractedText, /^Example Product Example Product Launch planning made easier /);
  assert.doesNotMatch(result.extractedText, /ignore me|Ignore noscript text|Ignore svg text|Ignore template text|Ignore hidden text/i);
});

test("extractSignalsFromHtml keeps meaningful CTA labels and filters unsafe href evidence", () => {
  const html = `<!doctype html>
  <html lang="en">
    <head><title>CTA recall</title></head>
    <body>
      <button>Learn more</button>
      <input type="submit" value="Download" />
      <div role="button">Pricing</div>
      <a href="/explore">Explore</a>
      <a href="/aprende">Aprende mas</a>
      <a href="/zh">了解详情</a>
      <a href="https://user:pass@example.com/private">Unsafe credentials</a>
      <a href="https://localhost/hidden">Unsafe localhost</a>
      <a href="https://10.0.0.4/private">Unsafe private ip</a>
      <a href="https://example.com:8443/port">Unsafe port</a>
      <a href="javascript:alert(1)">Unsafe js</a>
      <a href="data:text/plain,hello">Unsafe data</a>
    </body>
  </html>`;

  const result = extractSignalsFromHtml(html, {
    source: "url",
    requestedUrl: "https://example.com/product",
    finalUrl: "https://example.com/product"
  });

  assert.deepEqual(result.ctas, [
    { text: "Learn more" },
    { text: "Download" },
    { text: "Pricing" },
    { text: "Explore", href: "https://example.com/explore" },
    { text: "Aprende mas", href: "https://example.com/aprende" },
    { text: "了解详情", href: "https://example.com/zh" }
  ]);
  assert.deepEqual(result.links, [
    { text: "Explore", href: "https://example.com/explore" },
    { text: "Aprende mas", href: "https://example.com/aprende" },
    { text: "了解详情", href: "https://example.com/zh" }
  ]);
});

test("extractSignalsFromHtml enforces caps, sanitizes requestedUrl, and keeps warnings in the safe vocabulary", () => {
  const h1 = Array.from({ length: 8 }, (_, index) => `<h1>Hero ${index}</h1>`).join("");
  const h2 = Array.from({ length: 24 }, (_, index) => `<h2>Section ${index}</h2>`).join("");
  const buttons = Array.from({ length: 12 }, (_, index) => `<button>Action ${index}</button>`).join("");
  const anchors = Array.from({ length: 50 }, (_, index) => `<a href="/path-${index}">Link ${index}</a>`).join("");
  const robots = Array.from({ length: 12 }, (_, index) => `rule-${index}`).join(", ");
  const ogTags = Array.from(
    { length: 35 },
    (_, index) => `<meta property="og:key-${index}" content="Value ${index}" />`
  ).join("");
  const twitterTags = Array.from(
    { length: 35 },
    (_, index) => `<meta name="twitter:key-${index}" content="Value ${index}" />`
  ).join("");
  const jsonLdTypes = Array.from({ length: 24 }, (_, index) => `"Type${index}"`).join(", ");
  const html = `<!doctype html>
  <html lang="en">
    <head>
      <title>Caps</title>
      <meta name="robots" content="${robots}" />
      ${ogTags}
      ${twitterTags}
      <script type="application/ld+json">{ "@type": [${jsonLdTypes}] }</script>
    </head>
    <body>
      ${h1}
      ${h2}
      ${buttons}
      ${anchors}
      <p>${"Signal ".repeat(4000)}</p>
    </body>
  </html>`;

  const result = extractSignalsFromHtml(html, {
    source: "url",
    requestedUrl: `https://example.com/${"a".repeat(2050)}`,
    finalUrl: "https://example.com/base",
    warnings: [
      TIMEOUT_WARNING,
      UNSUPPORTED_WARNING,
      SIZE_WARNING,
      PUBLIC_WARNING,
      "raw detail: 10.0.0.9 timed out",
      "raw host resolution detail"
    ]
  });

  assert.equal(result.requestedUrl, undefined);
  assert.equal(result.h1.length, 5);
  assert.equal(result.h2.length, 20);
  assert.equal(result.ctas.length, 20);
  assert.equal(result.links.length, 40);
  assert.equal(Object.keys(result.ogTags).length, 30);
  assert.equal(Object.keys(result.twitterTags).length, 30);
  assert.equal(result.robotsMeta.length, 10);
  assert.equal(result.jsonLdTypes.length, 20);
  assert.equal(result.extractedText.length, 15000);
  assert.ok(result.warnings.length <= 10);
  assert.deepEqual(result.warnings, [
    TIMEOUT_WARNING,
    UNSUPPORTED_WARNING,
    SIZE_WARNING,
    PUBLIC_WARNING
  ]);
});

test("resolvePageSignals fetches the page, launches probes in parallel, and passes the caller signal through", async () => {
  const controller = new AbortController();
  const html = "<html lang='en'><head><title>Example</title></head><body><h1>Example</h1></body></html>";
  const started: string[] = [];
  const pendingProbeUrls = new Set<string>();
  const probeDeferred = {
    robots: createDeferred<PublicTextResource>(),
    sitemap: createDeferred<PublicTextResource>(),
    llms: createDeferred<PublicTextResource>()
  };

  const fetchCalls: PublicFetchInput[] = [];
  const fetchResource: FetchResource = async (input) => {
    fetchCalls.push(input);
    started.push(input.url);
    assert.equal(input.signal, controller.signal);

    if (input.url === "https://example.com/product") {
      assert.deepEqual(input.acceptedContentTypes, ["text/html", "text/plain"]);
      assert.equal(input.timeoutMs, 8000);
      assert.equal(input.maxBytes, 1024 * 1024);
      assert.equal(input.maxRedirects, 3);
      return {
        requestedUrl: "https://example.com/product",
        finalUrl: "https://example.com/landing",
        contentType: "text/html",
        status: 200,
        text: html
      };
    }

    assert.equal(input.timeoutMs, 8000);
    assert.equal(input.maxBytes, 128 * 1024);
    pendingProbeUrls.add(input.url);

    if (input.url === "https://example.com/robots.txt") {
      return probeDeferred.robots.promise;
    }
    if (input.url === "https://example.com/sitemap.xml") {
      return probeDeferred.sitemap.promise;
    }
    if (input.url === "https://example.com/llms.txt") {
      return probeDeferred.llms.promise;
    }

    throw new Error(`Unexpected URL ${input.url}`);
  };

  const pendingResult = resolvePageSignals(createInput(), {
    fetchResource,
    signal: controller.signal
  });

  await Promise.resolve();
  await Promise.resolve();

  assert.deepEqual(started, [
    "https://example.com/product",
    "https://example.com/robots.txt",
    "https://example.com/sitemap.xml",
    "https://example.com/llms.txt"
  ]);
  assert.deepEqual(new Set(pendingProbeUrls), new Set([
    "https://example.com/robots.txt",
    "https://example.com/sitemap.xml",
    "https://example.com/llms.txt"
  ]));

  probeDeferred.robots.resolve(
    createTextResource("https://example.com/robots.txt", "User-agent: *\nSitemap: https://example.com/generated-sitemap.xml", "text/plain")
  );
  probeDeferred.sitemap.resolve(
    createTextResource("https://example.com/sitemap.xml", "<urlset></urlset>", "application/xml")
  );
  probeDeferred.llms.resolve(createTextResource("https://example.com/llms.txt", "Public llms instructions", "text/plain"));

  const result = await pendingResult;

  assert.equal(result?.status, "success");
  assert.equal(result?.source, "url");
  assert.equal(result?.requestedUrl, "https://example.com/product");
  assert.equal(result?.finalUrl, "https://example.com/landing");
  assert.equal(result?.hasRobotsTxt, true);
  assert.equal(result?.hasSitemap, true);
  assert.equal(result?.hasLlmsTxt, true);
  assert.deepEqual(result?.warnings, []);
  assert.equal(fetchCalls.length, 4);
});

test("resolvePageSignals rejects caller cancellation during the main fetch even when manual fallback exists", async () => {
  const controller = new AbortController();
  const cancellation = new Error("caller cancelled main fetch");
  let fetchCalls = 0;

  const resultPromise = resolvePageSignals(
    createInput({
      manualPageCopy: "Manual fallback should not be used."
    }),
    {
      signal: controller.signal,
      fetchResource: async (input) =>
        new Promise<PublicTextResource>((_resolve, reject) => {
          fetchCalls += 1;
          assert.equal(input.signal, controller.signal);
          input.signal?.addEventListener(
            "abort",
            () => reject(input.signal?.reason ?? new Error("aborted")),
            { once: true }
          );
          controller.abort(cancellation);
        })
    }
  );

  await assert.rejects(resultPromise, (error: unknown) => {
    assert.equal(error, cancellation);
    return true;
  });
  assert.equal(fetchCalls, 1);
});

test("resolvePageSignals rejects caller cancellation during the probe phase instead of returning partial", async () => {
  const controller = new AbortController();
  const cancellation = new Error("caller cancelled probes");
  const started: string[] = [];

  const resultPromise = resolvePageSignals(createInput(), {
    signal: controller.signal,
    fetchResource: async (input) => {
      started.push(input.url);

      if (input.url === "https://example.com/product") {
        return {
          requestedUrl: "https://example.com/product",
          finalUrl: "https://example.com/landing",
          contentType: "text/html",
          status: 200,
          text: "<html><head><title>Example</title></head><body><h1>Example</h1></body></html>"
        };
      }

      return new Promise<PublicTextResource>((_resolve, reject) => {
        input.signal?.addEventListener(
          "abort",
          () => reject(input.signal?.reason ?? new Error("aborted")),
          { once: true }
        );
        if (started.length === 4) {
          controller.abort(cancellation);
        }
      });
    }
  });

  await assert.rejects(resultPromise, (error: unknown) => {
    assert.equal(error, cancellation);
    return true;
  });
  assert.deepEqual(started, [
    "https://example.com/product",
    "https://example.com/robots.txt",
    "https://example.com/sitemap.xml",
    "https://example.com/llms.txt"
  ]);
});

test("resolvePageSignals falls back to manual copy when the URL fetch fails", async () => {
  const fetchCalls: string[] = [];
  const fetchResource: FetchResource = async (input) => {
    fetchCalls.push(input.url);
    throw new Error("Public fetch timed out after 8000ms.");
  };

  const result = await resolvePageSignals(
    createInput({
      manualPageCopy: "  <h1>Manual notes</h1>\n  Key proof points for the launch  "
    }),
    { fetchResource }
  );

  assert.deepEqual(fetchCalls, ["https://example.com/product"]);
  assert.equal(result?.source, "manual");
  assert.equal(result?.status, "partial");
  assert.equal(result?.requestedUrl, "https://example.com/product");
  assert.equal(result?.finalUrl, undefined);
  assert.equal(result?.title, "");
  assert.equal(result?.description, "");
  assert.equal(result?.language, "");
  assert.equal(result?.extractedText, "<h1>Manual notes</h1> Key proof points for the launch");
  assert.deepEqual(result?.warnings, [TIMEOUT_WARNING]);
});

test("resolvePageSignals returns safe unavailable warnings for URL failures without manual copy", async () => {
  const cases = [
    {
      name: "timeout",
      error: new Error("Public fetch timed out after 8000ms."),
      warning: TIMEOUT_WARNING
    },
    {
      name: "unsupported content type",
      error: new Error("Public fetch requires a supported content type. Received application/json."),
      warning: UNSUPPORTED_WARNING
    },
    {
      name: "size limit",
      error: new Error("Public fetch exceeded the max bytes limit of 1048576."),
      warning: SIZE_WARNING
    },
    {
      name: "generic unavailable",
      error: new Error("Public fetch failed before receiving a safe response."),
      warning: PUBLIC_WARNING
    }
  ];

  for (const entry of cases) {
    const result = await resolvePageSignals(createInput(), {
      fetchResource: async () => {
        throw entry.error;
      }
    });

    assert.equal(result?.source, "url", entry.name);
    assert.equal(result?.status, "unavailable", entry.name);
    assert.equal(result?.requestedUrl, "https://example.com/product", entry.name);
    assert.equal(result?.finalUrl, undefined, entry.name);
    assert.deepEqual(result?.warnings, [entry.warning], entry.name);
  }
});

test("resolvePageSignals keeps successful HTML extraction when probes fail and deduplicates warnings", async () => {
  const fetchResource: FetchResource = async (input) => {
    if (input.url === "https://example.com/product") {
      return {
        requestedUrl: "https://example.com/product",
        finalUrl: "https://example.com/landing",
        contentType: "text/html",
        status: 200,
        text: "<html><head><title>Example</title></head><body><h1>Example</h1></body></html>"
      };
    }

    throw new Error("Public fetch timed out after 8000ms.");
  };

  const result = await resolvePageSignals(createInput(), { fetchResource });

  assert.equal(result?.source, "url");
  assert.equal(result?.status, "partial");
  assert.equal(result?.finalUrl, "https://example.com/landing");
  assert.equal(result?.hasRobotsTxt, false);
  assert.equal(result?.hasSitemap, false);
  assert.equal(result?.hasLlmsTxt, false);
  assert.deepEqual(result?.warnings, [TIMEOUT_WARNING]);
  assert.ok((result?.warnings.length ?? 0) <= 10);
});

test("resolvePageSignals uses manual-only input without any fetch calls", async () => {
  let fetchCalls = 0;

  const result = await resolvePageSignals(
    createInput({
      productUrl: "",
      manualPageCopy: "  This is plain text copied from the page.  "
    }),
    {
      fetchResource: async () => {
        fetchCalls += 1;
        throw new Error("This fetcher should not run.");
      }
    }
  );

  assert.equal(fetchCalls, 0);
  assert.equal(result?.source, "manual");
  assert.equal(result?.status, "partial");
  assert.equal(result?.requestedUrl, undefined);
  assert.equal(result?.finalUrl, undefined);
  assert.equal(result?.extractedText, "This is plain text copied from the page.");
  assert.deepEqual(result?.warnings, []);
});

test("resolvePageSignals returns undefined for brief-only input", async () => {
  const result = await resolvePageSignals(
    createInput({
      productUrl: "",
      manualPageCopy: "",
      productBrief: "Just use the written launch context."
    }),
    {
      fetchResource: async () => {
        throw new Error("This fetcher should not run.");
      }
    }
  );

  assert.equal(result, undefined);
});
