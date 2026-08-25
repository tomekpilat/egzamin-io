import { describe, expect, it } from "vitest";
import { calculatePlusEconomics, formatPln, PLAN_COMPARISON_ROWS, PLUS_AI_QUESTIONS_PER_DAY, PLUS_ANNUAL_PRICE_PLN, resolvePlusCheckout } from "@/lib/plans";

describe("Plus plan economics", () => {
  it("calculates the yearly price accurately", () => {
    expect(PLUS_ANNUAL_PRICE_PLN).toBe(119);
    expect(calculatePlusEconomics()).toEqual({ monthly: 9.92, daily: 0.33, perSession: 0.76 });
    expect(formatPln(9.92)).toBe("9,92");
  });

  it("keeps the Plus AI limit explicit", () => {
    expect(PLUS_AI_QUESTIONS_PER_DAY).toBe(50);
    expect(PLAN_COMPARISON_ROWS).toContainEqual(["Cena", "0 zł", "119 zł / 12 miesięcy"]);
    expect(PLAN_COMPARISON_ROWS).toContainEqual(["Pytania do AI", "3 dziennie", "50 dziennie"]);
  });

  it("supports a different session rhythm", () => {
    expect(calculatePlusEconomics(119, 1).perSession).toBe(2.29);
  });

  it("enables only a configured HTTPS checkout", () => {
    expect(resolvePlusCheckout()).toEqual({ enabled: false, url: null });
    expect(resolvePlusCheckout("not-a-url")).toEqual({ enabled: false, url: null });
    expect(resolvePlusCheckout("http://payments.example.com/plus")).toEqual({ enabled: false, url: null });
    expect(resolvePlusCheckout("https://payments.example.com/plus")).toEqual({ enabled: true, url: "https://payments.example.com/plus" });
  });
});
