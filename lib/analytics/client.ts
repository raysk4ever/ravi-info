import type { DeviceInfo, PageContext } from "./types";

/**
 * Browser-side helpers for chat analytics.
 *
 * Hard rule: nothing in here may ever block or delay the chat response. Every
 * function is synchronous and side-effect free until `sendAnalytics` is called,
 * which is always deferred and always best-effort.
 */

const VISITOR_KEY = "chat-visitor-id";
const SESSION_KEY = "chat-session-id";
const TURN_KEY = "chat-turn-count";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readStore(kind: "local" | "session", key: string): string | null {
  try {
    const store = kind === "local" ? window.localStorage : window.sessionStorage;
    return store.getItem(key);
  } catch {
    return null;
  }
}

function writeStore(kind: "local" | "session", key: string, value: string): void {
  try {
    const store = kind === "local" ? window.localStorage : window.sessionStorage;
    store.setItem(key, value);
  } catch {
    /* private mode / quota - not important enough to surface */
  }
}

export interface VisitorInfo {
  visitorId: string;
  sessionId: string;
  isNewVisitor: boolean;
  isNewSession: boolean;
}

export function getVisitorInfo(): VisitorInfo {
  let visitorId = readStore("local", VISITOR_KEY);
  const isNewVisitor = !visitorId;
  if (!visitorId) {
    visitorId = uuid();
    writeStore("local", VISITOR_KEY, visitorId);
  }

  let sessionId = readStore("session", SESSION_KEY);
  const isNewSession = !sessionId;
  if (!sessionId) {
    sessionId = uuid();
    writeStore("session", SESSION_KEY, sessionId);
  }

  return { visitorId, sessionId, isNewVisitor, isNewSession };
}

export function nextTurnIndex(): number {
  const current = Number(readStore("session", TURN_KEY) || "0") || 0;
  writeStore("session", TURN_KEY, String(current + 1));
  return current;
}

/** Device/screen details the browser knows better than the user-agent does. */
export function collectDevice(): DeviceInfo {
  if (typeof window === "undefined") return {};
  const nav = window.navigator;
  const conn = (nav as unknown as { connection?: { effectiveType?: string } })
    .connection;
  const uaData = (
    nav as unknown as { userAgentData?: { platform?: string } }
  ).userAgentData;

  return {
    platform: uaData?.platform ?? nav.platform ?? undefined,
    language: nav.language ?? undefined,
    languages: Array.from(nav.languages ?? []).slice(0, 5),
    timezone: (() => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
      } catch {
        return undefined;
      }
    })(),
    timezoneOffsetMinutes: new Date().getTimezoneOffset(),
    screenWidth: window.screen?.width,
    screenHeight: window.screen?.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
    colorDepth: window.screen?.colorDepth,
    hardwareConcurrency: nav.hardwareConcurrency,
    deviceMemoryGb: (nav as unknown as { deviceMemory?: number }).deviceMemory,
    maxTouchPoints: nav.maxTouchPoints,
    isTouch:
      typeof window.matchMedia === "function"
        ? window.matchMedia("(pointer: coarse)").matches
        : undefined,
    prefersDarkMode:
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
        : undefined,
    connectionType: conn?.effectiveType,
  };
}

export function collectPage(): PageContext {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const host = (() => {
    try {
      return document.referrer ? new URL(document.referrer).host : "";
    } catch {
      return "";
    }
  })();

  return {
    path: window.location.pathname,
    referrer: document.referrer || undefined,
    referrerHost: host || undefined,
    landingPage: readStore("session", "chat-landing") ?? window.location.pathname,
    utmSource: params.get("utm_source") ?? undefined,
    utmMedium: params.get("utm_medium") ?? undefined,
    utmCampaign: params.get("utm_campaign") ?? undefined,
    utmTerm: params.get("utm_term") ?? undefined,
    utmContent: params.get("utm_content") ?? undefined,
  };
}

/**
 * Fire-and-forget POST.
 *
 * Uses text/plain so the request stays a CORS "simple request" (no preflight),
 * and sendBeacon so the browser owns delivery off the main thread. Falls back to
 * a keepalive fetch. Never throws, never returns a promise you must await.
 */
export function sendAnalytics(path: string, payload: unknown): void {
  if (typeof window === "undefined") return;
  let body: string;
  try {
    body = JSON.stringify(payload);
  } catch {
    return;
  }
  if (body.length > 60_000) return; // stay under the sendBeacon size cap

  // Defer so we never touch the network in the caller's task - the chat stream
  // has already finished by the time this runs.
  const run = () => {
    try {
      const blob = new Blob([body], { type: "text/plain;charset=UTF-8" });
      const queued =
        typeof navigator.sendBeacon === "function" &&
        navigator.sendBeacon(path, blob);
      if (!queued) {
        void fetch(path, {
          method: "POST",
          body,
          headers: { "Content-Type": "text/plain;charset=UTF-8" },
          keepalive: true,
        }).catch(() => undefined);
      }
    } catch {
      /* analytics must never surface */
    }
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 2000 });
  } else {
    window.setTimeout(run, 0);
  }
}
