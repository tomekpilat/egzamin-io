import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(join(process.cwd(), "app/plan-plus/page.tsx"), "utf8");
const panel = readFileSync(join(process.cwd(), "app/panel/page.tsx"), "utf8");
const landing = readFileSync(join(process.cwd(), "app/page.tsx"), "utf8");

describe("Plan Plus screen", () => {
  it("uses one shared plan comparison on the landing and dedicated page", () => {
    expect(page).toContain("PLAN_COMPARISON_ROWS.map");
    expect(landing).toContain("PLAN_COMPARISON_ROWS.map");
    expect(page).toContain("PLUS_ANNUAL_PRICE_PLN");
    expect(page).toContain("formatPln(economics.monthly)");
  });

  it("links both dashboard roles to their benefit section", () => {
    expect(panel).toContain('"/plan-plus#dla-rodzica"');
    expect(panel).toContain('"/plan-plus#dla-ucznia"');
    expect(page).toContain('id="dla-rodzica"');
    expect(page).toContain('id="dla-ucznia"');
  });

  it("uses a waitlist before payments instead of a dead checkout", () => {
    expect(page).toContain("Powiadom mnie o starcie");
    expect(page).toContain("Sprzedaż jeszcze nie wystartowała");
    expect(page).not.toMatch(/href=["']\/checkout/);
  });

  it("supports an explicit payment CTA only after a valid checkout is configured", () => {
    expect(page).toContain("resolvePlusCheckout(process.env.NEXT_PUBLIC_PLUS_CHECKOUT_URL)");
    expect(page).toContain("Zamawiam i płacę");
    expect(page).toContain("Plan odnawia się co 12 miesięcy");
  });

  it("links all required legal information and the panel return", () => {
    expect(page).toContain('href="/panel"');
    expect(page).toContain('href="/regulamin"');
    expect(page).toContain('href="/polityka-prywatnosci"');
    expect(page).toContain('href="/odstapienie-od-umowy"');
    expect(page).toContain('href="/informacje-prawne"');
  });
});
