import { createHash } from "crypto";
import type { NextApiRequest } from "next";
import type { DeviceInfo, GeoInfo } from "./types";

/**
 * Turns a request into the device/geo metadata we store alongside a question.
 * Raw IPs are never persisted - only a salted hash, so we can still count
 * unique visitors without holding a directly identifying value (GDPR).
 */

function getClientIp(req: NextApiRequest): string | null {
  const xff = req.headers["x-forwarded-for"];
  const candidate =
    (typeof xff === "string" ? xff.split(",")[0].trim() : undefined) ??
    (Array.isArray(xff) ? xff[0]?.split(",")[0]?.trim() : undefined) ??
    req.socket?.remoteAddress ??
    null;
  if (!candidate) return null;
  // strip ::ffff: prefix from IPv4-mapped IPv6
  return candidate.replace(/^::ffff:/, "");
}

export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  const salt = process.env.ANALYTICS_IP_SALT || "ravi-info-analytics";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 24);
}

/* ── user-agent parsing ─────────────────────────────────────────────── */

function parseBrowser(ua: string): string {
  const tests: Array<[string, RegExp]> = [
    ["Edge", /Edg\/|Edge\//],
    ["Opera", /OPR\/|Opera/],
    ["Samsung Internet", /SamsungBrowser/],
    ["Chrome", /Chrome\/|CriOS/],
    ["Firefox", /Firefox\/|FxiOS/],
    ["Safari", /Safari\//],
    ["Internet Explorer", /MSIE|Trident/],
  ];
  for (const [name, re] of tests) if (re.test(ua)) return name;
  return "Other";
}

function parseOs(ua: string): string {
  const tests: Array<[string, RegExp]> = [
    ["Windows", /Windows/],
    ["iOS", /iPhone|iPad|iPod/],
    ["macOS", /Mac OS X|Macintosh/],
    ["Android", /Android/],
    ["Chrome OS", /CrOS/],
    ["Linux", /Linux/],
  ];
  for (const [name, re] of tests) if (re.test(ua)) return name;
  return "Other";
}

function parseDeviceType(ua: string): "mobile" | "tablet" | "desktop" | "bot" | "unknown" {
  if (/bot|crawler|spider|slurp|bingpreview|headlesschrome/i.test(ua)) return "bot";
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android.*mobile|windows phone/i.test(ua)) return "mobile";
  if (/windows|mac os x|linux|cros/i.test(ua)) return "desktop";
  return "unknown";
}

function parseOsVersion(ua: string): string | null {
  const patterns: Array<RegExp> = [
    /Windows NT ([\d.]+)/,
    /Android ([\d.]+)/,
    /(?:iPhone )?OS ([\d_]+)/,
    /Mac OS X ([\d_.]+)/,
    /Chrome OS ([\d.]+)/,
  ];
  for (const re of patterns) {
    const m = ua.match(re);
    if (m) return m[1].replace(/_/g, ".");
  }
  return null;
}

export function parseDevice(ua: string): DeviceInfo {
  return {
    ua: ua.slice(0, 400),
    browser: parseBrowser(ua),
    os: parseOs(ua),
    osVersion: parseOsVersion(ua),
    deviceType: parseDeviceType(ua),
  };
}

/* ── geolocation ────────────────────────────────────────────────────── */

const HEADER_MAP: Record<string, string> = {
  "x-vercel-ip-country": "countryCode",
  "x-vercel-ip-country-region": "region",
  "x-vercel-ip-city": "city",
  "x-vercel-ip-timezone": "timezone",
  "x-vercel-ip-latitude": "lat",
  "x-vercel-ip-longitude": "lon",
};

function readVercelGeo(req: NextApiRequest): Partial<GeoInfo> | null {
  const out: Record<string, string> = {};
  for (const [header, field] of Object.entries(HEADER_MAP)) {
    const value = req.headers[header];
    if (typeof value === "string" && value.trim()) out[field] = value.trim();
  }
  if (!out.countryCode) return null;
  return out as Partial<GeoInfo>;
}

const IPAPI_TIMEOUT_MS = 1500;

async function lookupViaIpApi(ip: string): Promise<Partial<GeoInfo> | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IPAPI_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://ipapi.co/${encodeURIComponent(ip)}/json/?fields=country_code,country_name,region,city,latitude,longitude,timezone,org`,
      { signal: controller.signal }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, string | undefined>;
    if (!data || data.error) return null;
    return {
      countryCode: data.country_code,
      country: data.country_name,
      region: data.region,
      city: data.city,
      lat: data.latitude ? Number(data.latitude) : undefined,
      lon: data.longitude ? Number(data.longitude) : undefined,
      timezone: data.timezone,
      isp: data.org,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Vercel injects geo headers in production; fall back to ipapi.co elsewhere
 * (local dev, self-hosted). Never throws - geo is a nice-to-have.
 */
export async function resolveGeo(
  req: NextApiRequest,
  ip: string | null
): Promise<GeoInfo> {
  const base: GeoInfo = { ipHash: hashIp(ip), source: "none" };

  const fromVercel = readVercelGeo(req);
  if (fromVercel) return { ...base, ...fromVercel, source: "vercel" };

  if (ip && !/^(::1|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip)) {
    const fromApi = await lookupViaIpApi(ip);
    if (fromApi) return { ...base, ...fromApi, source: "ipapi.co" };
  }
  return base;
}

export { getClientIp };
