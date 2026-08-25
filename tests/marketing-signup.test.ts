import { describe, expect, it } from "vitest";
import { MARKETING_CONSENT_VERSION, marketingConsentText, validateMarketingSignup } from "@/lib/marketing-signup";

function valid(overrides: Record<string, unknown> = {}) {
  const subscriptionType = (overrides.subscriptionType ?? "recruitment_thresholds") as "recruitment_thresholds" | "plus_waitlist";
  const schoolName = String(overrides.schoolName ?? (subscriptionType === "recruitment_thresholds" ? "XIV LO — 1A" : ""));
  return { email: " Rodzic@Example.pl ", subscriptionType, schoolName, city: "Warszawa", recruitmentYear: 2027, sourcePath: "/kalkulator-punktow", consent: true, consentVersion: MARKETING_CONSENT_VERSION, consentText: marketingConsentText(subscriptionType, schoolName), website: "", ...overrides };
}

describe("marketing signup validation", () => {
  it("normalizes an explicit recruitment alert consent", () => {
    const result = validateMarketingSignup(valid());
    expect(result.valid).toBe(true);
    if (result.valid && !result.bot) expect(result.value.email).toBe("rodzic@example.pl");
  });

  it("accepts Plus without a school and generates purpose-specific text", () => {
    const result = validateMarketingSignup(valid({ subscriptionType: "plus_waitlist", schoolName: "", sourcePath: "/", consentText: marketingConsentText("plus_waitlist") }));
    expect(result.valid).toBe(true);
    expect(marketingConsentText("plus_waitlist")).toContain("o starcie i ofercie");
  });

  it.each([
    [{ email: "bad" }, "Podaj poprawny"],
    [{ consent: false }, "dobrowolną zgodę"],
    [{ subscriptionType: "other" }, "typ zapisu"],
    [{ schoolName: "", consentText: marketingConsentText("recruitment_thresholds", "") }, "Wpisz szkołę"],
    [{ recruitmentYear: 2040 }, "rok rekrutacji"],
    [{ sourcePath: "//evil.example" }, "źródło"],
    [{ consentVersion: "old" }, "aktualną zgodę"],
    [{ consentText: "zmieniona" }, "Treść zgody"],
  ])("rejects invalid input %#", (overrides, expected) => {
    const result = validateMarketingSignup(valid(overrides));
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.join(" ")).toContain(expected);
  });

  it("silently classifies the honeypot as a bot", () => {
    expect(validateMarketingSignup(valid({ website: "spam.example" }))).toMatchObject({ valid: true, bot: true, value: null });
  });
});
