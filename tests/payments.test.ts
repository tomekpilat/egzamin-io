import { describe, expect, it } from "vitest";
import { formatPaymentAmount, isPaymentStatus, resolvePaymentRuntimeConfig, validateCheckoutRequest } from "@/lib/payments";

const future = new Date("2027-07-31T21:59:59Z");
const now = new Date("2026-08-27T12:00:00Z");

const configuredEnvironment = {
  PAYMENTS_ENABLED: "true",
  APP_URL: "https://egzamin.io/path-is-ignored",
  PLUS_ACCESS_UNTIL: future.toISOString(),
  STRIPE_SECRET_KEY: "sk_test_example",
  STRIPE_PRICE_ID_PLUS: "price_example",
  STRIPE_WEBHOOK_SECRET: "whsec_example",
};

describe("payment runtime configuration", () => {
  it("uses a kill switch even when all Stripe values exist", () => {
    const disabled = resolvePaymentRuntimeConfig({ ...configuredEnvironment, PAYMENTS_ENABLED: "false" }, now);
    expect(disabled.configured).toBe(true);
    expect(disabled.enabled).toBe(false);
    expect(disabled.amountMinor).toBe(14900);
    expect(disabled.currency).toBe("pln");
  });

  it("enables only a complete HTTPS configuration with a future access end", () => {
    expect(resolvePaymentRuntimeConfig(configuredEnvironment, now)).toMatchObject({ enabled: true, appUrl: "https://egzamin.io", accessUntil: future.toISOString() });
    expect(resolvePaymentRuntimeConfig({ ...configuredEnvironment, APP_URL: "http://egzamin.io" }, now).enabled).toBe(false);
    expect(resolvePaymentRuntimeConfig({ ...configuredEnvironment, PLUS_ACCESS_UNTIL: "2025-01-01T00:00:00Z" }, now).enabled).toBe(false);
    expect(resolvePaymentRuntimeConfig({ ...configuredEnvironment, STRIPE_WEBHOOK_SECRET: "" }, now).enabled).toBe(false);
  });

  it("allows localhost HTTP only for local testing", () => {
    expect(resolvePaymentRuntimeConfig({ ...configuredEnvironment, APP_URL: "http://localhost:3000" }, now).appUrl).toBe("http://localhost:3000");
  });
});

describe("checkout input", () => {
  const request = { studentId: "8ba664db-a9c6-44d2-99f0-f6fb1c60db9b", requestId: "713046fb-c35a-4fe1-8247-9787f4e85a0c", acceptedTerms: true, requestedImmediateAccess: true };

  it("requires a student identifier and both confirmations", () => {
    expect(validateCheckoutRequest(request)).toMatchObject({ ok: true, studentId: request.studentId });
    expect(validateCheckoutRequest({ ...request, acceptedTerms: false })).toMatchObject({ ok: false });
    expect(validateCheckoutRequest({ ...request, requestedImmediateAccess: false })).toMatchObject({ ok: false });
    expect(validateCheckoutRequest({ ...request, studentId: "student" })).toMatchObject({ ok: false });
  });

  it("formats payment amounts and rejects unknown statuses", () => {
    expect(formatPaymentAmount(14900, "pln")).toContain("149,00");
    expect(isPaymentStatus("paid")).toBe(true);
    expect(isPaymentStatus("cancelled")).toBe(false);
  });
});
