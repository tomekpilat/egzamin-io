import { describe, expect, it } from "vitest";
import { calculatePlusPackageEconomics, formatPln, FREE_AI_QUESTIONS_PER_DAY, FREE_PRACTICE_QUESTIONS_PER_DAY, PLAN_COMPARISON_ROWS, PLUS_AI_QUESTIONS_PER_DAY, PLUS_PACKAGE_PRICE_PLN } from "@/lib/plans";

describe("Plus package economics", () => {
  it("compares the one-time package with a transparent tutoring example", () => {
    expect(PLUS_PACKAGE_PRICE_PLN).toBe(149);
    expect(calculatePlusPackageEconomics()).toEqual({ tutoringHourlyPrice: 80, twoTutoringHours: 160, differenceVsTwoHours: 11, tutoringHoursEquivalent: 1.86 });
    expect(formatPln(11)).toBe("11,00");
  });

  it("keeps the Plus AI limit explicit", () => {
    expect(PLUS_AI_QUESTIONS_PER_DAY).toBe(50);
    expect(FREE_AI_QUESTIONS_PER_DAY).toBe(3);
    expect(FREE_PRACTICE_QUESTIONS_PER_DAY).toBe(15);
    expect(PLAN_COMPARISON_ROWS).toContainEqual(["Cena", "0 zł", "149 zł / pakiet"]);
    expect(PLAN_COMPARISON_ROWS).toContainEqual(["Płatność", "Bez opłat", "Jednorazowa, bez odnowienia"]);
    expect(PLAN_COMPARISON_ROWS).toContainEqual(["Arkusze CKE", "Pełny dostęp", "Pełny dostęp"]);
    expect(PLAN_COMPARISON_ROWS).toContainEqual(["Interaktywne rozwiązywanie", "15 pytań dziennie", "Bez limitu"]);
    expect(PLAN_COMPARISON_ROWS).toContainEqual(["Nauczyciel AI", "3 pytania dziennie", "50 pytań dziennie"]);
    expect(PLAN_COMPARISON_ROWS).toContainEqual(["Śledzenie postępów", "Podstawowe podsumowanie", "Wyniki, trendy i powtórki"]);
  });

  it("supports a different tutoring reference rate", () => {
    expect(calculatePlusPackageEconomics(149, 100)).toMatchObject({ twoTutoringHours: 200, differenceVsTwoHours: 51, tutoringHoursEquivalent: 1.49 });
  });

});
