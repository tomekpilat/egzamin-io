import { describe, expect, it } from "vitest";
import { calculateRecruitmentPoints, compareWithThreshold, pointsForGrade } from "@/lib/recruitment-points";

describe("recruitment points calculator", () => {
  it("calculates the legal maximum of 200 points", () => {
    const result = calculateRecruitmentPoints({
      polishExamPercent: 100,
      mathematicsExamPercent: 100,
      foreignLanguageExamPercent: 100,
      grades: [6, 6, 6, 6],
      honorsCertificate: true,
      volunteering: true,
      achievementPoints: 18,
    });

    expect(result.exam).toMatchObject({ polish: 35, mathematics: 35, foreignLanguage: 30, total: 100, remainingPotential: 0 });
    expect(result.certificate).toMatchObject({ grades: 72, honors: 7, volunteering: 3, achievements: 18, total: 100 });
    expect(result.total).toBe(200);
  });

  it("uses the official grade-to-points table", () => {
    expect([6, 5, 4, 3, 2].map((grade) => pointsForGrade(grade as 2 | 3 | 4 | 5 | 6))).toEqual([18, 17, 14, 8, 2]);
    expect(pointsForGrade(null)).toBe(0);
  });

  it("calculates the sample result shown in the product", () => {
    const result = calculateRecruitmentPoints({
      polishExamPercent: 70,
      mathematicsExamPercent: 70,
      foreignLanguageExamPercent: 80,
      grades: [5, 5, 5, 5],
      honorsCertificate: true,
      volunteering: true,
      achievementPoints: 0,
    });

    expect(result.exam.total).toBe(73);
    expect(result.certificate.total).toBe(78);
    expect(result.total).toBe(151);
    expect(compareWithThreshold(result.total, 172)).toEqual({ threshold: 172, reached: false, difference: 21 });
  });

  it("clamps percentages, achievement points and thresholds to legal ranges", () => {
    const result = calculateRecruitmentPoints({
      polishExamPercent: 120,
      mathematicsExamPercent: -10,
      foreignLanguageExamPercent: Number.NaN,
      grades: [2, 2, 2, 2],
      honorsCertificate: false,
      volunteering: false,
      achievementPoints: 99,
    });

    expect(result.exam.total).toBe(35);
    expect(result.certificate.total).toBe(26);
    expect(result.total).toBe(61);
    expect(compareWithThreshold(result.total, 250)).toEqual({ threshold: 200, reached: false, difference: 139 });
    expect(compareWithThreshold(result.total, null)).toBeNull();
  });
});
