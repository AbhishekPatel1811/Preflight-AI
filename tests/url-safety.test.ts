import assert from "node:assert/strict";
import test from "node:test";
import * as urlSafety from "../lib/server/urlSafety";
import { fetchPublicTextResource } from "../lib/server/publicFetch";

const { assertPublicHttpUrl, isPublicIpAddress } = urlSafety;

type LookupAddress = {
  address: string;
  family: 4 | 6;
};

type LookupFn = (hostname: string, options: { all: true; order: "verbatim" }) => Promise<LookupAddress[]>;

function createLookup(records: Record<string, LookupAddress[]>): LookupFn {
  return async (hostname, options) => {
    assert.deepEqual(options, { all: true, order: "verbatim" });
    return records[hostname] ?? [];
  };
}

function createTextStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    }
  });
}

function createCancelableTextStream(chunks: string[], onCancel: () => void): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
    },
    cancel() {
      onCancel();
    }
  });
}

function assertErrorCode(error: unknown, code: string): asserts error is NodeJS.ErrnoException {
  assert.equal(error instanceof Error, true);
  assert.equal((error as NodeJS.ErrnoException).code, code);
}

test("isPublicIpAddress classifies public, private, and mapped addresses", () => {
  assert.equal(isPublicIpAddress("93.184.216.34"), true);
  assert.equal(isPublicIpAddress("127.0.0.1"), false);
  assert.equal(isPublicIpAddress("10.0.0.1"), false);
  assert.equal(isPublicIpAddress("100.64.0.1"), false);
  assert.equal(isPublicIpAddress("169.254.169.254"), false);
  assert.equal(isPublicIpAddress("192.0.2.15"), false);
  assert.equal(isPublicIpAddress("198.18.0.10"), false);
  assert.equal(isPublicIpAddress("::1"), false);
  assert.equal(isPublicIpAddress("fc00::1"), false);
  assert.equal(isPublicIpAddress("fe80::1"), false);
  assert.equal(isPublicIpAddress("2001:db8::10"), false);
  assert.equal(isPublicIpAddress("2001:4860:4860::8888"), true);
  assert.equal(isPublicIpAddress("::ffff:127.0.0.1"), false);
  assert.equal(isPublicIpAddress("::ffff:93.184.216.34"), true);
});

test("isPublicIpAddress classifies required IPv4 ranges", () => {
  const cases: Array<[string, boolean]> = [
    ["0.0.0.0", false],
    ["8.8.8.8", true],
    ["10.0.0.1", false],
    ["100.64.0.1", false],
    ["127.0.0.1", false],
    ["169.254.169.254", false],
    ["172.16.0.1", false],
    ["192.0.0.1", false],
    ["192.0.2.1", false],
    ["192.88.99.1", false],
    ["192.168.0.1", false],
    ["198.18.0.1", false],
    ["198.51.100.1", false],
    ["203.0.113.1", false],
    ["224.0.0.1", false],
    ["240.0.0.1", false]
  ];

  for (const [address, expected] of cases) {
    assert.equal(isPublicIpAddress(address), expected, address);
  }
});

test("isPublicIpAddress classifies required IPv6 ranges with byte prefixes", () => {
  const cases: Array<[string, boolean]> = [
    ["::", false],
    ["::1", false],
    ["::10.0.0.1", false],
    ["::ffff:10.0.0.1", false],
    ["::ffff:93.184.216.34", true],
    ["64:ff9b::0808:0808", true],
    ["64:ff9b::0a00:0001", false],
    ["64:ff9b:1::", false],
    ["2002:0808:0808::1", true],
    ["2002:0a00:0001::1", false],
    ["3fff::1", false],
    ["100:0:0:1::1", false],
    ["5f00::1", false],
    ["fc00::1", false],
    ["fe80::1", false],
    ["ff00::1", false],
    ["2001:db8::1", false],
    ["100::1", false],
    ["2001:4860:4860::8888", true],
    ["2606:2800:220:1:248:1893:25c8:1946", true]
  ];

  for (const [address, expected] of cases) {
    assert.equal(isPublicIpAddress(address), expected, address);
  }
});

test("resolvePublicHttpUrl returns exact validated DNS addresses", async () => {
  const lookup = createLookup({
    "example.com": [
      { address: "93.184.216.34", family: 4 },
      { address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 }
    ]
  });
  const resolvePublicHttpUrl = (
    urlSafety as typeof urlSafety & {
      resolvePublicHttpUrl?: typeof assertPublicHttpUrl extends (
        value: string,
        dependencies?: infer Dependencies
      ) => Promise<URL>
        ? (value: string, dependencies?: Dependencies) => Promise<{ url: URL; addresses: LookupAddress[] }>
        : never;
    }
  ).resolvePublicHttpUrl;

  assert.equal(typeof resolvePublicHttpUrl, "function");

  const target = await resolvePublicHttpUrl("https://example.com/path?x=1", { lookup });

  assert.equal(target.url.toString(), "https://example.com/path?x=1");
  assert.deepEqual(target.addresses, [
    { address: "93.184.216.34", family: 4 },
    { address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 }
  ]);
});

test("resolvePublicHttpUrl returns IP literal addresses without DNS", async () => {
  const lookupCalls: string[] = [];
  const lookup: LookupFn = async (hostname) => {
    lookupCalls.push(hostname);
    return [{ address: "93.184.216.34", family: 4 }];
  };
  const resolvePublicHttpUrl = (
    urlSafety as typeof urlSafety & {
      resolvePublicHttpUrl?: (
        value: string,
        dependencies?: { lookup?: LookupFn }
      ) => Promise<{ url: URL; addresses: LookupAddress[] }>;
    }
  ).resolvePublicHttpUrl;

  assert.equal(typeof resolvePublicHttpUrl, "function");

  const ipv4Target = await resolvePublicHttpUrl("https://93.184.216.34/", { lookup });
  const ipv6Target = await resolvePublicHttpUrl("https://[2606:2800:220:1:248:1893:25c8:1946]/", {
    lookup
  });

  assert.deepEqual(ipv4Target.addresses, [{ address: "93.184.216.34", family: 4 }]);
  assert.deepEqual(ipv6Target.addresses, [{ address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 }]);
  assert.deepEqual(lookupCalls, []);
});

test("assertPublicHttpUrl accepts a public https URL with verbatim DNS results", async () => {
  const lookup = createLookup({
    "example.com": [
      { address: "93.184.216.34", family: 4 },
      { address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 }
    ]
  });

  const result = await assertPublicHttpUrl("https://example.com/path?x=1", { lookup });

  assert.equal(result.toString(), "https://example.com/path?x=1");
});

test("assertPublicHttpUrl rejects mixed public and private DNS answers", async () => {
  const lookup = createLookup({
    "example.com": [
      { address: "93.184.216.34", family: 4 },
      { address: "127.0.0.1", family: 4 }
    ]
  });

  await assert.rejects(
    () => assertPublicHttpUrl("https://example.com/path", { lookup }),
    /public/
  );
});

test("assertPublicHttpUrl rejects hosts that do not resolve to any public address", async () => {
  const lookup = createLookup({});

  await assert.rejects(
    () => assertPublicHttpUrl("https://example.com/path", { lookup }),
    /resolve|public/i
  );
});

test("assertPublicHttpUrl rejects local hosts, credentials, and custom ports without needing DNS", async () => {
  const lookupCalls: string[] = [];
  const lookup: LookupFn = async (hostname) => {
    lookupCalls.push(hostname);
    return [{ address: "93.184.216.34", family: 4 }];
  };

  await assert.rejects(() => assertPublicHttpUrl("https://user:pass@example.com", { lookup }), /credentials/i);
  await assert.rejects(() => assertPublicHttpUrl("ftp://example.com/file", { lookup }), /http/i);
  await assert.rejects(() => assertPublicHttpUrl("https://localhost/path", { lookup }), /public/i);
  await assert.rejects(() => assertPublicHttpUrl("https://preview.localhost/path", { lookup }), /public/i);
  await assert.rejects(() => assertPublicHttpUrl("https://preview.local/path", { lookup }), /public/i);
  await assert.rejects(() => assertPublicHttpUrl("https://example.com:8443/path", { lookup }), /default port/i);
  assert.deepEqual(lookupCalls, []);
});

test("fetchPublicTextResource production request path pins validated addresses", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() => {
    throw new Error("default fetch should not be used");
  }) as typeof fetch;

  try {
    const lookup = createLookup({
      "example.com": [
        { address: "93.184.216.34", family: 4 },
        { address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 }
      ]
    });
    const lookupResults: unknown[] = [];
    const requestImpl = async (url: URL, options: Record<string, unknown>) => {
      assert.equal(url.hostname, "example.com");
      assert.equal(typeof options.lookup, "function");
      const pinnedLookup = options.lookup as (
        hostname: string,
        options: { all?: boolean; family?: number },
        callback: (error: NodeJS.ErrnoException | null, address?: string | LookupAddress[], family?: number) => void
      ) => void;

      pinnedLookup("example.com", { all: true }, (error, addresses) => {
        assert.equal(error, null);
        lookupResults.push(addresses);
      });
      pinnedLookup("example.com", { family: 4 }, (error, address, family) => {
        assert.equal(error, null);
        lookupResults.push({ address, family });
      });
      pinnedLookup("attacker.example", { all: true }, (error) => {
        assertErrorCode(error, "ENOTFOUND");
      });
      pinnedLookup("example.com", { family: 6 }, (error, address, family) => {
        assert.equal(error, null);
        lookupResults.push({ address, family });
      });

      return new Response("hello", {
        status: 200,
        headers: { "content-type": "text/plain" }
      });
    };

    const result = await fetchPublicTextResource(
      {
        url: "https://example.com/start",
        timeoutMs: 100,
        maxBytes: 1024,
        acceptedContentTypes: ["text/plain"]
      },
      { lookup, requestImpl } as Parameters<typeof fetchPublicTextResource>[1]
    );

    assert.equal(result.text, "hello");
    assert.deepEqual(lookupResults, [
      [
        { address: "93.184.216.34", family: 4 },
        { address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 }
      ],
      { address: "93.184.216.34", family: 4 },
      { address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 }
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchPublicTextResource follows manual redirects and returns bounded text", async () => {
  const lookup = createLookup({
    "example.com": [{ address: "93.184.216.34", family: 4 }],
    "www.example.com": [{ address: "93.184.216.35", family: 4 }]
  });

  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.toString();
    requests.push({ url, init });

    if (url === "https://example.com/start") {
      return new Response(null, {
        status: 302,
        headers: { location: "https://www.example.com/landing" }
      });
    }

    return new Response(createTextStream(["<html>", "<body>Hello</body></html>"]), {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" }
    });
  };

  const result = await fetchPublicTextResource(
    {
      url: "https://example.com/start",
      timeoutMs: 100,
      maxBytes: 1024,
      acceptedContentTypes: ["text/html", "text/plain"]
    },
    { lookup, fetchImpl }
  );

  assert.equal(result.requestedUrl, "https://example.com/start");
  assert.equal(result.finalUrl, "https://www.example.com/landing");
  assert.equal(result.status, 200);
  assert.equal(result.contentType, "text/html");
  assert.equal(result.text, "<html><body>Hello</body></html>");
  assert.equal(requests.length, 2);
  assert.equal(requests[0]?.init?.redirect, "manual");
  assert.equal(requests[0]?.init?.headers instanceof Headers, true);
  assert.equal(
    (requests[0]?.init?.headers as Headers).get("user-agent"),
    "PreflightAI/0.1 (+local launch readiness audit)"
  );
});

test("fetchPublicTextResource rejects redirects to private targets", async () => {
  const lookup = createLookup({
    "example.com": [{ address: "93.184.216.34", family: 4 }],
    "internal.example.com": [{ address: "10.0.0.8", family: 4 }]
  });

  const fetchImpl: typeof fetch = async () =>
    new Response(null, {
      status: 301,
      headers: { location: "https://internal.example.com/private" }
    });

  await assert.rejects(
    () =>
      fetchPublicTextResource(
        {
          url: "https://example.com/start",
          timeoutMs: 100,
          maxBytes: 1024,
          acceptedContentTypes: ["text/html"]
        },
        { lookup, fetchImpl }
      ),
    /public/
  );
});

test("fetchPublicTextResource rejects redirect loops that exceed the default limit", async () => {
  const lookup = createLookup({
    "example.com": [{ address: "93.184.216.34", family: 4 }]
  });

  const fetchImpl: typeof fetch = async (input) => {
    const url = typeof input === "string" ? input : input.toString();
    const current = new URL(url);
    const step = Number(current.searchParams.get("step") ?? "0");
    const next = new URL("https://example.com/start");
    next.searchParams.set("step", String(step + 1));
    return new Response(null, {
      status: 302,
      headers: { location: next.toString() }
    });
  };

  await assert.rejects(
    () =>
      fetchPublicTextResource(
        {
          url: "https://example.com/start?step=0",
          timeoutMs: 100,
          maxBytes: 1024,
          acceptedContentTypes: ["text/html"]
        },
        { lookup, fetchImpl }
      ),
    /redirect/i
  );
});

test("fetchPublicTextResource rejects the first redirect when maxRedirects is zero", async () => {
  const lookup = createLookup({
    "example.com": [{ address: "93.184.216.34", family: 4 }]
  });

  const fetchImpl: typeof fetch = async () =>
    new Response(null, {
      status: 302,
      headers: { location: "https://example.com/next" }
    });

  await assert.rejects(
    () =>
      fetchPublicTextResource(
        {
          url: "https://example.com/start",
          timeoutMs: 100,
          maxBytes: 1024,
          acceptedContentTypes: ["text/html"],
          maxRedirects: 0
        },
        { lookup, fetchImpl }
      ),
    /redirect limit of 0/i
  );
});

test("fetchPublicTextResource rejects invalid limits before requesting", async () => {
  const lookup = createLookup({
    "example.com": [{ address: "93.184.216.34", family: 4 }]
  });
  let requests = 0;
  const fetchImpl: typeof fetch = async () => {
    requests += 1;
    return new Response("unexpected", { status: 200 });
  };
  const baseInput = {
    url: "https://example.com/start",
    timeoutMs: 100,
    maxBytes: 1024,
    acceptedContentTypes: ["text/plain"]
  };

  await assert.rejects(
    () => fetchPublicTextResource({ ...baseInput, timeoutMs: Number.POSITIVE_INFINITY }, { lookup, fetchImpl }),
    /timeout/i
  );
  await assert.rejects(() => fetchPublicTextResource({ ...baseInput, timeoutMs: 0 }, { lookup, fetchImpl }), /timeout/i);
  await assert.rejects(() => fetchPublicTextResource({ ...baseInput, maxBytes: -1 }, { lookup, fetchImpl }), /max bytes/i);
  await assert.rejects(
    () => fetchPublicTextResource({ ...baseInput, maxBytes: 1.5 }, { lookup, fetchImpl }),
    /max bytes/i
  );
  await assert.rejects(
    () => fetchPublicTextResource({ ...baseInput, maxRedirects: -1 }, { lookup, fetchImpl }),
    /redirect/i
  );
  await assert.rejects(
    () => fetchPublicTextResource({ ...baseInput, acceptedContentTypes: [" ", "\t"] }, { lookup, fetchImpl }),
    /content type/i
  );
  assert.equal(requests, 0);
});

test("fetchPublicTextResource rejects already-aborted signals before requesting", async () => {
  const lookup = createLookup({
    "example.com": [{ address: "93.184.216.34", family: 4 }]
  });
  let requests = 0;
  const fetchImpl: typeof fetch = async () => {
    requests += 1;
    return new Response("unexpected", { status: 200 });
  };
  const controller = new AbortController();
  controller.abort(new Error("already aborted"));

  await assert.rejects(
    () =>
      fetchPublicTextResource(
        {
          url: "https://example.com/start",
          signal: controller.signal,
          timeoutMs: 100,
          maxBytes: 1024,
          acceptedContentTypes: ["text/plain"]
        },
        { lookup, fetchImpl }
      ),
    /already aborted/
  );
  assert.equal(requests, 0);
});

test("fetchPublicTextResource allows maxBytes zero only for an empty body", async () => {
  const lookup = createLookup({
    "example.com": [{ address: "93.184.216.34", family: 4 }]
  });
  const emptyFetch: typeof fetch = async () =>
    new Response("", {
      status: 200,
      headers: { "content-type": "text/plain" }
    });
  const nonEmptyFetch: typeof fetch = async () =>
    new Response("x", {
      status: 200,
      headers: { "content-type": "text/plain" }
    });

  const result = await fetchPublicTextResource(
    {
      url: "https://example.com/start",
      timeoutMs: 100,
      maxBytes: 0,
      acceptedContentTypes: ["text/plain"]
    },
    { lookup, fetchImpl: emptyFetch }
  );
  assert.equal(result.text, "");

  await assert.rejects(
    () =>
      fetchPublicTextResource(
        {
          url: "https://example.com/start",
          timeoutMs: 100,
          maxBytes: 0,
          acceptedContentTypes: ["text/plain"]
        },
        { lookup, fetchImpl: nonEmptyFetch }
      ),
    /max bytes|limit/i
  );
});

test("fetchPublicTextResource returns empty text for null bodies", async () => {
  const lookup = createLookup({
    "example.com": [{ address: "93.184.216.34", family: 4 }]
  });
  const fetchImpl: typeof fetch = async () =>
    new Response(null, {
      status: 200,
      headers: { "content-type": "text/plain" }
    });

  const result = await fetchPublicTextResource(
    {
      url: "https://example.com/start",
      timeoutMs: 100,
      maxBytes: 1024,
      acceptedContentTypes: ["text/plain"]
    },
    { lookup, fetchImpl }
  );

  assert.equal(result.text, "");
});

test("fetchPublicTextResource aborts when the internal timeout fires", async () => {
  const lookup = createLookup({
    "example.com": [{ address: "93.184.216.34", family: 4 }]
  });

  const fetchImpl: typeof fetch = async (_input, init) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener(
        "abort",
        () => reject(init.signal?.reason ?? new Error("aborted")),
        { once: true }
      );
    });

  await assert.rejects(
    () =>
      fetchPublicTextResource(
        {
          url: "https://example.com/start",
          timeoutMs: 10,
          maxBytes: 1024,
          acceptedContentTypes: ["text/html"]
        },
        { lookup, fetchImpl }
      ),
    /timed out|abort/i
  );
});

test("fetchPublicTextResource honors caller abort signals", async () => {
  const lookup = createLookup({
    "example.com": [{ address: "93.184.216.34", family: 4 }]
  });

  const controller = new AbortController();
  const fetchImpl: typeof fetch = async (_input, init) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener(
        "abort",
        () => reject(init.signal?.reason ?? new Error("aborted")),
        { once: true }
      );
      controller.abort(new Error("caller aborted"));
    });

  await assert.rejects(
    () =>
      fetchPublicTextResource(
        {
          url: "https://example.com/start",
          signal: controller.signal,
          timeoutMs: 100,
          maxBytes: 1024,
          acceptedContentTypes: ["text/html"]
        },
        { lookup, fetchImpl }
      ),
    /caller aborted|abort/i
  );
});

test("fetchPublicTextResource rejects missing or unsupported content types", async () => {
  const lookup = createLookup({
    "example.com": [{ address: "93.184.216.34", family: 4 }]
  });

  const missingTypeFetch: typeof fetch = async () => new Response("hello", { status: 200 });
  const unsupportedTypeFetch: typeof fetch = async () =>
    new Response("{}", {
      status: 200,
      headers: { "content-type": "application/json" }
    });

  await assert.rejects(
    () =>
      fetchPublicTextResource(
        {
          url: "https://example.com/start",
          timeoutMs: 100,
          maxBytes: 1024,
          acceptedContentTypes: ["text/html"]
        },
        { lookup, fetchImpl: missingTypeFetch }
      ),
    /content type/i
  );

  await assert.rejects(
    () =>
      fetchPublicTextResource(
        {
          url: "https://example.com/start",
          timeoutMs: 100,
          maxBytes: 1024,
          acceptedContentTypes: ["text/html"]
        },
        { lookup, fetchImpl: unsupportedTypeFetch }
      ),
    /content type/i
  );
});

test("fetchPublicTextResource cancels redirect and rejected terminal bodies", async () => {
  const lookup = createLookup({
    "example.com": [{ address: "93.184.216.34", family: 4 }]
  });
  let redirectCanceled = false;
  let terminalCanceled = false;
  let unsupportedCanceled = false;

  const redirectFetch: typeof fetch = async (input) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.endsWith("/start")) {
      return new Response(createCancelableTextStream(["redirect body"], () => {
        redirectCanceled = true;
      }), {
        status: 302,
        headers: { location: "https://example.com/next" }
      });
    }

    return new Response("ok", {
      status: 200,
      headers: { "content-type": "text/plain" }
    });
  };

  await fetchPublicTextResource(
    {
      url: "https://example.com/start",
      timeoutMs: 100,
      maxBytes: 1024,
      acceptedContentTypes: ["text/plain"]
    },
    { lookup, fetchImpl: redirectFetch }
  );
  assert.equal(redirectCanceled, true);

  const terminalFetch: typeof fetch = async () =>
    new Response(createCancelableTextStream(["server error"], () => {
      terminalCanceled = true;
    }), {
      status: 500,
      headers: { "content-type": "text/plain" }
    });

  await assert.rejects(
    () =>
      fetchPublicTextResource(
        {
          url: "https://example.com/start",
          timeoutMs: 100,
          maxBytes: 1024,
          acceptedContentTypes: ["text/plain"]
        },
        { lookup, fetchImpl: terminalFetch }
      ),
    /500/
  );
  assert.equal(terminalCanceled, true);

  const unsupportedFetch: typeof fetch = async () =>
    new Response(createCancelableTextStream(["{}"], () => {
      unsupportedCanceled = true;
    }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });

  await assert.rejects(
    () =>
      fetchPublicTextResource(
        {
          url: "https://example.com/start",
          timeoutMs: 100,
          maxBytes: 1024,
          acceptedContentTypes: ["text/plain"]
        },
        { lookup, fetchImpl: unsupportedFetch }
      ),
    /content type/i
  );
  assert.equal(unsupportedCanceled, true);
});

test("fetchPublicTextResource aborts streamed responses that exceed maxBytes", async () => {
  const lookup = createLookup({
    "example.com": [{ address: "93.184.216.34", family: 4 }]
  });

  const fetchImpl: typeof fetch = async () =>
    new Response(createTextStream(["hello", " world"]), {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" }
    });

  await assert.rejects(
    () =>
      fetchPublicTextResource(
        {
          url: "https://example.com/start",
          timeoutMs: 100,
          maxBytes: 5,
          acceptedContentTypes: ["text/plain"]
        },
        { lookup, fetchImpl }
      ),
    /max bytes|too large|limit/i
  );
});

test("fetchPublicTextResource sanitizes terminal response errors", async () => {
  const lookup = createLookup({
    "example.com": [{ address: "93.184.216.34", family: 4 }]
  });

  const fetchImpl: typeof fetch = async () =>
    new Response("secret upstream body", {
      status: 500,
      headers: { "content-type": "text/plain" }
    });

  await assert.rejects(
    () =>
      fetchPublicTextResource(
        {
          url: "https://example.com/start",
          timeoutMs: 100,
          maxBytes: 1024,
          acceptedContentTypes: ["text/plain"]
        },
        { lookup, fetchImpl }
      ),
    (error: unknown) => {
      assert.equal(error instanceof Error, true);
      assert.match((error as Error).message, /500/);
      assert.doesNotMatch((error as Error).message, /secret upstream body/);
      return true;
    }
  );
});
