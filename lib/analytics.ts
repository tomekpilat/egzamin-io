export const ANALYTICS_CONSENT_VERSION = "2026-08-25-ga4-v1";
export const ANALYTICS_CONSENT_KEY = "egzaminio:privacy-consent";
export const ANALYTICS_CONSENT_MAX_AGE_DAYS = 180;
export const ANALYTICS_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

export type AnalyticsConsentChoice = "accepted" | "rejected";
export type AnalyticsEventName =
  | "page_view"
  | "signup_started"
  | "signup_completed"
  | "login_completed"
  | "practice_started"
  | "answer_checked"
  | "plan_plus_viewed"
  | "plan_plus_cta_clicked";

export type AnalyticsConsentRecord = {
  version: string;
  choice: AnalyticsConsentChoice;
  decidedAt: string;
  expiresAt: string;
};

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
    __egzaminioAnalyticsReady?: boolean;
  }
}

const ALLOWED_EVENTS = new Set<AnalyticsEventName>([
  "page_view", "signup_started", "signup_completed", "login_completed",
  "practice_started", "answer_checked", "plan_plus_viewed", "plan_plus_cta_clicked",
]);

export function validGoogleMeasurementId(value: string | undefined) {
  return typeof value === "string" && /^G-[A-Z0-9]{6,20}$/u.test(value.trim());
}

export function createAnalyticsConsentRecord(choice: AnalyticsConsentChoice, now = new Date()): AnalyticsConsentRecord {
  const expiresAt = new Date(now.getTime() + ANALYTICS_CONSENT_MAX_AGE_DAYS * 86_400_000);
  return { version: ANALYTICS_CONSENT_VERSION, choice, decidedAt: now.toISOString(), expiresAt: expiresAt.toISOString() };
}

export function parseAnalyticsConsentRecord(raw: string | null, now = new Date()): AnalyticsConsentRecord | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<AnalyticsConsentRecord>;
    if (value.version !== ANALYTICS_CONSENT_VERSION || (value.choice !== "accepted" && value.choice !== "rejected")) return null;
    if (typeof value.decidedAt !== "string" || typeof value.expiresAt !== "string") return null;
    if (!Number.isFinite(Date.parse(value.decidedAt)) || Date.parse(value.expiresAt) <= now.getTime()) return null;
    return value as AnalyticsConsentRecord;
  } catch {
    return null;
  }
}

export function sanitizeAnalyticsPath(input: string) {
  let pathname = "/";
  try {
    pathname = new URL(input, "https://egzamin.io").pathname;
  } catch {
    pathname = "/";
  }
  const safeSegments = pathname.split("/").map((segment) => {
    const decoded = (() => { try { return decodeURIComponent(segment); } catch { return segment; } })();
    if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/iu.test(decoded)) return ":id";
    if (/^[A-Za-z0-9_-]{24,}$/u.test(decoded)) return ":id";
    if (/^\d{5,}$/u.test(decoded)) return ":id";
    return segment;
  });
  return safeSegments.join("/") || "/";
}

export function trackAnalyticsEvent(name: AnalyticsEventName) {
  if (typeof window === "undefined" || !window.__egzaminioAnalyticsReady || !window.gtag || !ALLOWED_EVENTS.has(name)) return false;
  const pagePath = sanitizeAnalyticsPath(window.location.href);
  window.gtag("event", name, {
    page_path: pagePath,
    page_location: `${window.location.origin}${pagePath}`,
    transport_type: "beacon",
    ...(process.env.NODE_ENV === "production" ? {} : { debug_mode: true }),
  });
  return true;
}

export function clearGoogleAnalyticsCookies(hostname: string, cookieNames: string[]) {
  if (typeof document === "undefined") return;
  const hasProductionDomain = hostname === "egzamin.io" || hostname.endsWith(".egzamin.io");
  cookieNames.filter((name) => name === "_ga" || name.startsWith("_ga_")).forEach((name) => {
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
    if (hasProductionDomain) document.cookie = `${name}=; Max-Age=0; Path=/; Domain=.egzamin.io; SameSite=Lax`;
  });
}
