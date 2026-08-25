import { describe, expect, it } from "vitest";
import { calculatePlusEconomics, formatPln, PLUS_AI_QUESTIONS_PER_DAY, PLUS_ANNUAL_PRICE_PLN } from "@/lib/plans";

describe("Plus plan economics", () => {
  it("calculates the yearly price accurately", () => {
    expect(PLUS_ANNUAL_PRICE_PLN).toBe(119);
    expect(calculatePlusEconomics()).toEqual({ monthly: 9.92, daily: 0.33, perSession: 0.76 });
    expect(formatPln(9.92)).toBe("9,92");
  });

  it("keeps the Plus AI limit explicit", () => {
    expect(PLUS_AI_QUESTIONS_PER_DAY).toBe(50);
  });

  it("supports a different session rhythm", () => {
    expect(calculatePlusEconomics(119, 1).perSession).toBe(2.29);
  });
});
