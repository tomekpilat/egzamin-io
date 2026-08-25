import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ANALYTICS_CONSENT_VERSION,
  clearGoogleAnalyticsCookies,
  createAnalyticsConsentRecord,
  parseAnalyticsConsentRecord,
  sanitizeAnalyticsPath,
  trackAnalyticsEvent,
  validGoogleMeasurementId,
} from "@/lib/analytics";

describe("privacy-safe analytics helpers", () => {
  beforeEach(() => {
    delete window.__egzaminioAnalyticsReady;
    delete window.gtag;
    document.cookie = "_ga=; Max-Age=0; Path=/";
    document.cookie = "_ga_TEST=; Max-Age=0; Path=/";
  });

  it("validates only GA4 web measurement identifiers", () => {
    expect(validGoogleMeasurementId("G-ABC12345")).toBe(true);
    expect(validGoogleMeasurementId(" G-ABC12345 ")).toBe(true);
    expect(validGoogleMeasurementId("UA-123")).toBe(false);
    expect(validGoogleMeasurementId(undefined)).toBe(false);
  });

  it("stores a versioned, expiring local choice", () => {
    const now = new Date("2026-08-25T10:00:00.000Z");
    const record = createAnalyticsConsentRecord("accepted", now);
    expect(record).toMatchObject({ version: ANALYTICS_CONSENT_VERSION, choice: "accepted", decidedAt: now.toISOString() });
    expect(parseAnalyticsConsentRecord(JSON.stringify(record), now)).toEqual(record);
    expect(parseAnalyticsConsentRecord(JSON.stringify(record), new Date("2027-03-01T00:00:00.000Z"))).toBeNull();
  });

  it("rejects malformed, stale and unknown consent records", () => {
    expect(parseAnalyticsConsentRecord(null)).toBeNull();
    expect(parseAnalyticsConsentRecord("not-json")).toBeNull();
    expect(parseAnalyticsConsentRecord(JSON.stringify({ version: "old", choice: "accepted", decidedAt: "2026-01-01", expiresAt: "2027-01-01" }))).toBeNull();
    expect(parseAnalyticsConsentRecord(JSON.stringify({ version: ANALYTICS_CONSENT_VERSION, choice: "other", decidedAt: "2026-01-01", expiresAt: "2027-01-01" }))).toBeNull();
    expect(parseAnalyticsConsentRecord(JSON.stringify({ version: ANALYTICS_CONSENT_VERSION, choice: "rejected", decidedAt: "bad", expiresAt: "2027-01-01" }))).toBeNull();
    expect(parseAnalyticsConsentRecord(JSON.stringify({ version: ANALYTICS_CONSENT_VERSION, choice: "rejected", decidedAt: "2026-01-01", expiresAt: "2027-01-01" }), new Date("2026-02-01"))?.choice).toBe("rejected");
    expect(parseAnalyticsConsentRecord(JSON.stringify({ version: ANALYTICS_CONSENT_VERSION, choice: "accepted", decidedAt: "2026-01-01" }))).toBeNull();
    expect(parseAnalyticsConsentRecord(JSON.stringify({ version: ANALYTICS_CONSENT_VERSION, choice: "accepted", decidedAt: "2026-01-01", expiresAt: 123 }))).toBeNull();
  });

  it("removes query strings, fragments and identifier-like path segments", () => {
    expect(sanitizeAnalyticsPath("https://egzamin.io/plan-plus?email=x#kup")).toBe("/plan-plus");
    expect(sanitizeAnalyticsPath("/zadanie/550e8400-e29b-41d4-a716-446655440000?token=secret")).toBe("/zadanie/:id");
    expect(sanitizeAnalyticsPath("/rekord/abcdefghijklmnopqrstuvwxyz")).toBe("/rekord/:id");
    expect(sanitizeAnalyticsPath("/arkusz/2027/123456")).toBe("/arkusz/2027/:id");
    expect(sanitizeAnalyticsPath("/%E0%A4%A")).toBe("/%E0%A4%A");
  });

  it("does not emit anything before analytics is ready", () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    expect(trackAnalyticsEvent("page_view")).toBe(false);
    expect(gtag).not.toHaveBeenCalled();
  });

  it("emits only an approved event with a sanitized location after consent", () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    window.__egzaminioAnalyticsReady = true;
    window.history.replaceState({}, "", "/plan-plus?token=secret#buy");
    expect(trackAnalyticsEvent("plan_plus_viewed")).toBe(true);
    expect(gtag).toHaveBeenCalledWith("event", "plan_plus_viewed", expect.objectContaining({ page_path: "/plan-plus", page_location: "http://localhost:3000/plan-plus" }));
    expect(trackAnalyticsEvent("not_allowed" as "page_view")).toBe(false);
  });

  it("expires GA cookie names created by the app", () => {
    document.cookie = "_ga=abc; Path=/";
    document.cookie = "_ga_TEST=def; Path=/";
    document.cookie = "session=keep; Path=/";
    clearGoogleAnalyticsCookies("localhost", ["_ga", "_ga_TEST", "session"]);
    expect(document.cookie).not.toContain("_ga=");
    expect(document.cookie).not.toContain("_ga_TEST=");
    expect(document.cookie).toContain("session=keep");
    clearGoogleAnalyticsCookies("app.egzamin.io", ["_ga"]);
  });
});
