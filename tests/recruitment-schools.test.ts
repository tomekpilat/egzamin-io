import { describe, expect, it } from "vitest";
import { normalizeSchoolSearch, schoolThresholdLabel } from "@/lib/recruitment-schools";

describe("recruitment school search helpers", () => {
  it("normalizes whitespace and limits user queries", () => {
    expect(normalizeSchoolSearch("  XIV   LO Warszawa ")).toBe("XIV LO Warszawa");
    expect(normalizeSchoolSearch("a".repeat(200))).toHaveLength(120);
  });

  it("builds a class-specific label", () => {
    expect(schoolThresholdLabel({ threshold_id: "1", school_name: "XIV LO", school_type: "liceum", city: "Warszawa", class_name: "1A mat-fiz", class_code: "1A", profile_subjects: ["matematyka", "fizyka"], threshold_points: 172, recruitment_year: 2026, source_label: "Nabór", source_url: "https://example.pl", verified_at: "2026-08-25" })).toBe("XIV LO — 1A mat-fiz");
  });
});
