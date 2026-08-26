import { describe, expect, it } from "vitest";
import { calculatePlusPackageEconomics, formatPln, PLAN_COMPARISON_ROWS, PLUS_AI_QUESTIONS_PER_DAY, PLUS_PACKAGE_PRICE_PLN, resolvePlusCheckout } from "@/lib/plans";

describe("Plus package economics", () => {
  it("compares the one-time package with a transparent tutoring example", () => {
    expect(PLUS_PACKAGE_PRICE_PLN).toBe(149);
    expect(calculatePlusPackageEconomics()).toEqual({ tutoringHourlyPrice: 80, twoTutoringHours: 160, differenceVsTwoHours: 11, tutoringHoursEquivalent: 1.86 });
    expect(formatPln(11)).toBe("11,00");
  });

  it("keeps the Plus AI limit explicit", () => {
    expect(PLUS_AI_QUESTIONS_PER_DAY).toBe(50);
    expect(PLAN_COMPARISON_ROWS).toContainEqual(["Cena", "0 zł", "149 zł / pakiet"]);
    expect(PLAN_COMPARISON_ROWS).toContainEqual(["Płatność", "Bez opłat", "Jednorazowa, bez odnowienia"]);
    expect(PLAN_COMPARISON_ROWS).toContainEqual(["Pytania do AI", "3 dziennie", "50 dziennie"]);
  });

  it("supports a different tutoring reference rate", () => {
    expect(calculatePlusPackageEconomics(149, 100)).toMatchObject({ twoTutoringHours: 200, differenceVsTwoHours: 51, tutoringHoursEquivalent: 1.49 });
  });

  it("enables only a configured HTTPS checkout", () => {
    expect(resolvePlusCheckout()).toEqual({ enabled: false, url: null });
    expect(resolvePlusCheckout("not-a-url")).toEqual({ enabled: false, url: null });
    expect(resolvePlusCheckout("http://payments.example.com/plus")).toEqual({ enabled: false, url: null });
    expect(resolvePlusCheckout("https://payments.example.com/plus")).toEqual({ enabled: true, url: "https://payments.example.com/plus" });
  });
});
