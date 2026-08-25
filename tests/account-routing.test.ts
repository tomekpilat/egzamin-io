import { describe, expect, it } from "vitest";
import { resolveAccountRoute, type AccountRoutingProfile } from "@/lib/account-routing";

const currentLegalVersion = "2026-08-25-draft";
const parent: AccountRoutingProfile = {
  role: "parent",
  onboarding_completed: true,
  legal_version: currentLegalVersion,
  guardian_email: null,
  guardian_consent_at: null,
};

describe("authenticated account routing", () => {
  it("sends a fully configured returning user directly to the panel", () => {
    expect(resolveAccountRoute(parent, currentLegalVersion)).toBe("/panel");
  });

  it("never sends a completed account back through role selection for a legal update", () => {
    expect(resolveAccountRoute({ ...parent, legal_version: "older-version" }, currentLegalVersion)).toBe("/zaakceptuj-zmiany");
  });

  it("uses role selection only for genuinely incomplete onboarding", () => {
    expect(resolveAccountRoute({ ...parent, onboarding_completed: false }, currentLegalVersion)).toBe("/wybierz-role");
  });

  it("keeps a student awaiting guardian consent on the consent path", () => {
    const student = { ...parent, role: "student" as const, onboarding_completed: false, guardian_email: "rodzic@example.com" };
    expect(resolveAccountRoute(student, currentLegalVersion)).toBe("/oczekuje-na-zgode");
    expect(resolveAccountRoute({ ...student, guardian_email: null }, currentLegalVersion)).toBe("/wybierz-role");
  });

  it("does not block administrators on user onboarding documents", () => {
    expect(resolveAccountRoute({ ...parent, role: "admin", legal_version: null }, currentLegalVersion)).toBe("/panel");
  });
});
