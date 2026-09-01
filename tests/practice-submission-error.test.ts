import { describe, expect, it } from "vitest";
import { practiceSubmissionDiagnostic, practiceSubmissionErrorMessage } from "@/lib/practice-submission-error";

describe("practice submission errors", () => {
  it("explains the Free daily limit", () => {
    expect(practiceSubmissionErrorMessage({ message: "practice_daily_limit_reached" })).toContain("limit 15 pytań");
  });

  it("recognizes a stale database function", () => {
    expect(practiceSubmissionErrorMessage({
      code: "42883",
      message: "function public.student_can_access_question(uuid, text) does not exist",
    })).toContain("aktualizacji bazy aplikacji");
  });

  it("keeps a safe generic message while retaining diagnostics for the console", () => {
    const failure = { code: "23514", message: "database constraint failed", details: "row rejected", hint: "check migration" };
    expect(practiceSubmissionErrorMessage(failure)).toBe("Nie udało się zapisać odpowiedzi. Spróbuj ponownie.");
    expect(practiceSubmissionDiagnostic(failure)).toEqual(failure);
  });
});
