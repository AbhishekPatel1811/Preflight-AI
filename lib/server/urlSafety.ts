import { isIP } from "node:net";

export type LookupAddress = {
  address: string;
  family: 4 | 6;
};

type LookupFn = (hostname: string, options: { all: true; order: "verbatim" }) => Promise<LookupAddress[]>;

type PublicUrlDependencies = {
  lookup?: LookupFn;
};

export type PublicHttpTarget = {
  url: URL;
  addresses: LookupAddress[];
};

const DEFAULT_LOOKUP_OPTIONS = { all: true as const, order: "verbatim" as const };

export async function assertPublicHttpUrl(
  value: string,
  dependencies: PublicUrlDependencies = {}
): Promise<URL> {
  const target = await resolvePublicHttpUrl(value, dependencies);
  return target.url;
}

export async function resolvePublicHttpUrl(
  value: string,
  dependencies: PublicUrlDependencies = {}
): Promise<PublicHttpTarget> {
  const parsed = parseUrl(value);

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only public http and https URLs are allowed.");
  }

  if (parsed.username || parsed.password) {
    throw new Error("Public URLs cannot include credentials.");
  }

  if (parsed.port) {
    throw new Error("Public URLs must use a default port.");
  }

  const hostname = normalizeHostname(parsed.hostname);
  if (!hostname || isBlockedHostname(hostname)) {
    throw new Error("Public URLs must resolve to a public host.");
  }

  if (isIP(hostname) !== 0) {
    if (!isPublicIpAddress(hostname)) {
      throw new Error("Public URLs must resolve to a public host.");
    }
    return {
      url: parsed,
      addresses: [{ address: hostname, family: isIP(hostname) as 4 | 6 }]
    };
  }

  const lookup = dependencies.lookup ?? defaultLookup;
  const resolved = await lookup(hostname, DEFAULT_LOOKUP_OPTIONS);
  if (resolved.length === 0) {
    throw new Error("Public URLs must resolve to at least one public address.");
  }

  for (const entry of resolved) {
    if ((entry.family !== 4 && entry.family !== 6) || isIP(entry.address) !== entry.family) {
      throw new Error("Public URLs must resolve only to public addresses.");
    }

    if (!isPublicIpAddress(entry.address)) {
      throw new Error("Public URLs must resolve only to public addresses.");
    }
  }

  return { url: parsed, addresses: resolved.map((entry) => ({ ...entry })) };
}

export function isPublicIpAddress(address: string): boolean {
  const normalized = normalizeHostname(address);
  const family = isIP(normalized);

  if (family === 4) {
    const bytes = parseIpv4Bytes(normalized);
    return bytes !== null && isPublicIpv4Bytes(bytes);
  }

  if (family === 6) {
    const bytes = parseIpv6Bytes(normalized);
    return bytes !== null && isPublicIpv6Bytes(bytes);
  }

  return false;
}

function parseUrl(value: string): URL {
  try {
    return new URL(value);
  } catch {
    throw new Error("Invalid public URL.");
  }
}

function normalizeHostname(hostname: string): string {
  return hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;
}

function isBlockedHostname(hostname: string): boolean {
  const lowered = hostname.toLowerCase();
  return lowered === "localhost" || lowered.endsWith(".localhost") || lowered.endsWith(".local");
}

function parseIpv4Bytes(address: string): number[] | null {
  const parts = address.split(".");
  if (parts.length !== 4) {
    return null;
  }

  const bytes: number[] = [];
  for (const part of parts) {
    if (part.length === 0 || !isDecimalDigits(part)) {
      return null;
    }

    const value = Number(part);
    if (!Number.isInteger(value) || value < 0 || value > 255) {
      return null;
    }
    bytes.push(value);
  }

  return bytes;
}

function isPublicIpv4Bytes(bytes: number[]): boolean {
  const [a, b, c] = bytes;

  if (a === 0) return false;
  if (a === 10) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 0 && c === 0) return false;
  if (a === 192 && b === 0 && c === 2) return false;
  if (a === 192 && b === 88 && c === 99) return false;
  if (a === 192 && b === 168) return false;
  if (a === 198 && (b === 18 || b === 19)) return false;
  if (a === 198 && b === 51 && c === 100) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  if (a >= 224 && a <= 239) return false;
  if (a >= 240) return false;

  return true;
}

function parseIpv6Bytes(address: string): number[] | null {
  const normalized = normalizeHostname(address).toLowerCase();
  const doubleColonIndex = normalized.indexOf("::");
  if (doubleColonIndex !== normalized.lastIndexOf("::")) {
    return null;
  }

  const [headSource, tailSource = ""] = normalized.split("::");
  const head = parseIpv6Side(headSource);
  const tail = parseIpv6Side(tailSource);
  if (head === null || tail === null) {
    return null;
  }

  let segments: number[];
  if (doubleColonIndex === -1) {
    segments = head;
  } else {
    const zeroCount = 8 - (head.length + tail.length);
    if (zeroCount < 1) {
      return null;
    }
    segments = [...head, ...Array.from({ length: zeroCount }, () => 0), ...tail];
  }

  if (segments.length !== 8) {
    return null;
  }

  return segments.flatMap((segment) => [(segment >> 8) & 0xff, segment & 0xff]);
}

function parseIpv6Side(source: string): number[] | null {
  if (source === "") {
    return [];
  }

  const parts = source.split(":");
  const segments: number[] = [];
  for (const part of parts) {
    if (part.length === 0) {
      return null;
    }

    if (part.includes(".")) {
      const bytes = parseIpv4Bytes(part);
      if (bytes === null) {
        return null;
      }
      segments.push((bytes[0] << 8) | bytes[1], (bytes[2] << 8) | bytes[3]);
      continue;
    }

    if (part.length > 4 || !isHexDigits(part)) {
      return null;
    }

    const value = Number.parseInt(part, 16);
    if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
      return null;
    }
    segments.push(value);
  }

  return segments;
}

function isPublicIpv6Bytes(bytes: number[]): boolean {
  if (bytes.every((byte) => byte === 0)) return false;
  if (bytes.slice(0, 15).every((byte) => byte === 0) && bytes[15] === 1) return false;

  if (isIpv4Mapped(bytes)) {
    return isPublicIpv4Bytes(bytes.slice(12));
  }

  if (isIpv4Compatible(bytes)) return false;

  if (matchesPrefix(bytes, [0x00, 0x64, 0xff, 0x9b, 0x00, 0x01], 48)) return false;
  if (
    matchesPrefix(
      bytes,
      [0x00, 0x64, 0xff, 0x9b, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
      96
    )
  ) {
    return isPublicIpv4Bytes(bytes.slice(12));
  }

  if (matchesPrefix(bytes, [0x20, 0x02], 16)) {
    return isPublicIpv4Bytes(bytes.slice(2, 6));
  }

  if ((bytes[0] & 0xfe) === 0xfc) return false;
  if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80) return false;
  if (bytes[0] === 0xff) return false;

  if (matchesPrefix(bytes, [0x20, 0x01, 0x0d, 0xb8], 32)) return false;
  if (matchesPrefix(bytes, [0x20, 0x01, 0x00, 0x00], 23)) return false;
  if (matchesPrefix(bytes, [0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], 64)) return false;
  if (matchesPrefix(bytes, [0x01, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00], 64)) return false;
  if (matchesPrefix(bytes, [0x3f, 0xff], 20)) return false;
  if (matchesPrefix(bytes, [0x5f, 0x00], 16)) return false;

  return matchesPrefix(bytes, [0x20], 3);
}

function isIpv4Mapped(bytes: number[]): boolean {
  return (
    bytes.length === 16 &&
    bytes.slice(0, 10).every((byte) => byte === 0) &&
    bytes[10] === 0xff &&
    bytes[11] === 0xff
  );
}

function isIpv4Compatible(bytes: number[]): boolean {
  return (
    bytes.length === 16 &&
    bytes.slice(0, 12).every((byte) => byte === 0) &&
    bytes.slice(12).some((byte) => byte !== 0)
  );
}

function matchesPrefix(bytes: number[], prefix: number[], prefixLength: number): boolean {
  const fullBytes = Math.floor(prefixLength / 8);
  const remainderBits = prefixLength % 8;

  for (let index = 0; index < fullBytes; index += 1) {
    if (bytes[index] !== prefix[index]) {
      return false;
    }
  }

  if (remainderBits === 0) {
    return true;
  }

  const mask = 0xff << (8 - remainderBits);
  return (bytes[fullBytes] & mask) === (prefix[fullBytes] & mask);
}

async function defaultLookup(hostname: string, options: { all: true; order: "verbatim" }): Promise<LookupAddress[]> {
  const { lookup } = await import("node:dns/promises");
  return lookup(hostname, options) as Promise<LookupAddress[]>;
}

function isDecimalDigits(value: string): boolean {
  return Array.from(value).every((character) => character >= "0" && character <= "9");
}

function isHexDigits(value: string): boolean {
  return Array.from(value).every((character) => {
    const lowered = character.toLowerCase();
    return (lowered >= "0" && lowered <= "9") || (lowered >= "a" && lowered <= "f");
  });
}
