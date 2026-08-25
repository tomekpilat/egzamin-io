import { describe, expect, it } from "vitest";
import { validateFeedbackInput } from "@/lib/feedback";

const valid = { category: "idea", rating: 5, message: "Przydałby się filtr zadań według tematu.", email: "rodzic@example.com", contactConsent: true };

describe("feedback validation", () => {
  it("accepts a complete feedback entry", () => {
    expect(validateFeedbackInput(valid)).toEqual({ valid: true, errors: {} });
  });

  it("requires a known category and a useful message", () => {
    const result = validateFeedbackInput({ ...valid, category: "spam", message: "Za krótko" });
    expect(result.valid).toBe(false);
    expect(result.errors.category).toBeTruthy();
    expect(result.errors.message).toBeTruthy();
  });

  it("validates rating and contact address only when contact is requested", () => {
    expect(validateFeedbackInput({ ...valid, rating: 6 }).errors.rating).toBeTruthy();
    expect(validateFeedbackInput({ ...valid, email: "nie-email" }).errors.email).toBeTruthy();
    expect(validateFeedbackInput({ ...valid, email: "nie-email", contactConsent: false }).errors.email).toBeUndefined();
  });

  it("rejects messages longer than the database limit", () => {
    expect(validateFeedbackInput({ ...valid, message: "x".repeat(2001) }).errors.message).toBeTruthy();
  });
});
