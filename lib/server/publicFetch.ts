import { request as httpRequest, type RequestOptions } from "node:http";
import { request as httpsRequest } from "node:https";
import { Readable } from "node:stream";
import { resolvePublicHttpUrl, type LookupAddress, type PublicHttpTarget } from "./urlSafety";

type LookupFn = (hostname: string, options: { all: true; order: "verbatim" }) => Promise<LookupAddress[]>;

type PinnedLookup = (
  hostname: string,
  options:
    | number
    | {
        all?: boolean;
        family?: number;
      },
  callback: (
    error: NodeJS.ErrnoException | null,
    address?: string | LookupAddress[],
    family?: 4 | 6
  ) => void
) => void;

type PublicRequestOptions = {
  method: "GET";
  headers: Record<string, string>;
  signal: AbortSignal;
  lookup: PinnedLookup;
};

type PublicRequestImpl = (url: URL, options: PublicRequestOptions) => Promise<Response>;

type PublicFetchDependencies = {
  fetchImpl?: typeof fetch;
  lookup?: LookupFn;
  requestImpl?: PublicRequestImpl;
};

export type PublicFetchInput = {
  url: string;
  signal?: AbortSignal;
  timeoutMs: number;
  maxBytes: number;
  acceptedContentTypes: string[];
  maxRedirects?: number;
};

export type PublicTextResource = {
  requestedUrl: string;
  finalUrl: string;
  contentType: string;
  status: number;
  text: string;
};

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const USER_AGENT = "PreflightAI/0.1 (+local launch readiness audit)";

export async function fetchPublicTextResource(
  input: PublicFetchInput,
  dependencies: PublicFetchDependencies = {}
): Promise<PublicTextResource> {
  const maxRedirects = validateRedirectLimit(input.maxRedirects ?? 3);
  const maxBytes = validateMaxBytes(input.maxBytes);
  const timeoutMs = validateTimeoutMs(input.timeoutMs);
  const acceptedContentTypes = normalizeAcceptedContentTypes(input.acceptedContentTypes);
  input.signal?.throwIfAborted();

  const lookup = dependencies.lookup;
  const timeoutController = new AbortController();
  const timeoutHandle = setTimeout(() => {
    timeoutController.abort(new Error(`Public fetch timed out after ${timeoutMs}ms.`));
  }, timeoutMs);

  const signal = input.signal
    ? AbortSignal.any([input.signal, timeoutController.signal])
    : timeoutController.signal;

  try {
    signal.throwIfAborted();

    const requestedTarget = await resolvePublicHttpUrl(input.url, { lookup });
    let currentTarget = requestedTarget;
    let redirectsFollowed = 0;

    while (true) {
      signal.throwIfAborted();

      const response = await performRequest(
        currentTarget,
        acceptedContentTypes,
        signal,
        dependencies
      );

      if (REDIRECT_STATUSES.has(response.status)) {
        if (redirectsFollowed >= maxRedirects) {
          await cancelResponseBody(response);
          throw new Error(`Public fetch exceeded the redirect limit of ${maxRedirects}.`);
        }

        const location = response.headers.get("location");
        if (!location) {
          await cancelResponseBody(response);
          throw new Error("Public fetch received a redirect without a Location header.");
        }

        await cancelResponseBody(response);
        currentTarget = await resolvePublicHttpUrl(new URL(location, currentTarget.url).toString(), { lookup });
        redirectsFollowed += 1;
        continue;
      }

      if (response.status < 200 || response.status >= 300) {
        await cancelResponseBody(response);
        throw new Error(`Public fetch failed with HTTP ${response.status}.`);
      }

      let contentType: string;
      try {
        contentType = getAcceptedContentType(response, acceptedContentTypes);
      } catch (error) {
        await cancelResponseBody(response);
        throw error;
      }

      const text = await readBoundedText(response, maxBytes, signal);

      return {
        requestedUrl: requestedTarget.url.toString(),
        finalUrl: currentTarget.url.toString(),
        contentType,
        status: response.status,
        text
      };
    }
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function performRequest(
  target: PublicHttpTarget,
  acceptedContentTypes: string[],
  signal: AbortSignal,
  dependencies: PublicFetchDependencies
): Promise<Response> {
  const headers = buildRequestHeaders(acceptedContentTypes);

  try {
    if (dependencies.fetchImpl) {
      return await dependencies.fetchImpl(target.url.toString(), {
        method: "GET",
        headers: headers.web,
        redirect: "manual",
        signal
      });
    }

    return await (dependencies.requestImpl ?? nodeRequest)(target.url, {
      method: "GET",
      headers: headers.node,
      signal,
      lookup: createPinnedLookup(target)
    });
  } catch {
    throw sanitizeAbortOrNetworkError(signal);
  }
}

function buildRequestHeaders(acceptedContentTypes: string[]): {
  web: Headers;
  node: Record<string, string>;
} {
  const headers = new Headers();
  headers.set("user-agent", USER_AGENT);
  if (acceptedContentTypes.length > 0) {
    headers.set("accept", acceptedContentTypes.join(", "));
  }

  return {
    web: headers,
    node: Object.fromEntries(headers.entries())
  };
}

function getAcceptedContentType(response: Response, acceptedContentTypes: string[]): string {
  const rawContentType = response.headers.get("content-type");
  if (!rawContentType) {
    throw new Error("Public fetch requires a supported content type.");
  }

  const normalized = rawContentType.split(";")[0]?.trim().toLowerCase() ?? "";
  const allowed = new Set(acceptedContentTypes);
  if (!allowed.has(normalized)) {
    throw new Error(`Public fetch requires a supported content type. Received ${normalized || "unknown"}.`);
  }

  return normalized;
}

async function readBoundedText(response: Response, maxBytes: number, signal: AbortSignal): Promise<string> {
  signal.throwIfAborted();

  if (!response.body) {
    return "";
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = "";

  try {
    while (true) {
      signal.throwIfAborted();

      let result: ReadableStreamReadResult<Uint8Array>;
      try {
        result = await reader.read();
      } catch {
        throw sanitizeAbortOrNetworkError(signal);
      }

      signal.throwIfAborted();

      if (result.done) {
        text += decoder.decode();
        return text;
      }

      bytesRead += result.value.byteLength;
      if (bytesRead > maxBytes) {
        await reader.cancel("Public fetch exceeded max bytes.");
        throw new Error(`Public fetch exceeded the max bytes limit of ${maxBytes}.`);
      }

      text += decoder.decode(result.value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}

async function nodeRequest(url: URL, options: PublicRequestOptions): Promise<Response> {
  return new Promise<Response>((resolve, reject) => {
    const requestOptions: RequestOptions = {
      method: options.method,
      headers: options.headers,
      lookup: options.lookup as RequestOptions["lookup"],
      signal: options.signal
    };
    const request = (url.protocol === "http:" ? httpRequest : httpsRequest)(
      url,
      requestOptions,
      (incoming) => {
        try {
          resolve(incomingMessageToResponse(incoming));
        } catch (error) {
          reject(error);
        }
      }
    );

    request.on("error", reject);
    request.end();
  });
}

function incomingMessageToResponse(incoming: import("node:http").IncomingMessage): Response {
  const headers = new Headers();
  for (const [name, value] of Object.entries(incoming.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(name, item);
      }
      continue;
    }

    if (value !== undefined) {
      headers.set(name, value);
    }
  }

  const status = incoming.statusCode ?? 502;
  const body = status === 204 || status === 304 ? null : (Readable.toWeb(incoming) as ReadableStream<Uint8Array>);

  return new Response(body, {
    status,
    statusText: incoming.statusMessage,
    headers
  });
}

function createPinnedLookup(target: PublicHttpTarget): PinnedLookup {
  const expectedHostname = normalizeLookupHostname(target.url.hostname);
  const addresses = target.addresses.map((entry) => ({ ...entry }));

  return (hostname, options, callback) => {
    const requestedHostname = normalizeLookupHostname(hostname);
    if (requestedHostname !== expectedHostname) {
      callback(createLookupError(hostname));
      return;
    }

    const family = typeof options === "number" ? options : options.family;
    const matching = family === 4 || family === 6 ? addresses.filter((entry) => entry.family === family) : addresses;

    if (matching.length === 0) {
      callback(createLookupError(hostname));
      return;
    }

    if (typeof options !== "number" && options.all === true) {
      callback(null, matching.map((entry) => ({ ...entry })));
      return;
    }

    const [first] = matching;
    callback(null, first.address, first.family);
  };
}

function createLookupError(hostname: string): NodeJS.ErrnoException {
  const error = new Error(`getaddrinfo ENOTFOUND ${hostname}`) as NodeJS.ErrnoException & {
    hostname: string;
  };
  error.code = "ENOTFOUND";
  error.errno = -3008;
  error.syscall = "getaddrinfo";
  error.hostname = hostname;
  return error;
}

function normalizeLookupHostname(hostname: string): string {
  const stripped = hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;
  return stripped.toLowerCase();
}

async function cancelResponseBody(response: Response): Promise<void> {
  if (!response.body) {
    return;
  }

  try {
    await response.body.cancel("Public fetch stopped reading this response.");
  } catch {
    // Cancellation is best effort because the request is already rejected or redirected.
  }
}

function validateTimeoutMs(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Public fetch timeoutMs must be a finite number greater than 0.");
  }
  return value;
}

function validateMaxBytes(value: number): number {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new Error("Public fetch max bytes must be a finite integer greater than or equal to 0.");
  }
  return value;
}

function validateRedirectLimit(value: number): number {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new Error("Public fetch maxRedirects must be a finite integer greater than or equal to 0.");
  }
  return value;
}

function normalizeAcceptedContentTypes(values: string[]): string[] {
  const normalized = values.map((value) => value.trim().toLowerCase()).filter((value) => value.length > 0);
  if (normalized.length === 0) {
    throw new Error("Public fetch acceptedContentTypes must include at least one content type.");
  }
  return normalized;
}

function sanitizeAbortOrNetworkError(signal: AbortSignal): Error {
  if (signal.aborted) {
    const reason = signal.reason;
    if (reason instanceof Error) {
      return reason;
    }
    if (typeof reason === "string" && reason.length > 0) {
      return new Error(reason);
    }
    return new Error("Public fetch aborted.");
  }

  return new Error("Public fetch failed before receiving a safe response.");
}
