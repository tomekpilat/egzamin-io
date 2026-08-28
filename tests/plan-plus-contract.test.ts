import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(join(process.cwd(), "app/plan-plus/page.tsx"), "utf8");
const panel = readFileSync(join(process.cwd(), "app/panel/page.tsx"), "utf8");
const landing = readFileSync(join(process.cwd(), "app/page.tsx"), "utf8");

describe("Plan Plus screen", () => {
  it("uses the shared full comparison on the dedicated page and a compact landing comparison", () => {
    expect(page).toContain("PLAN_COMPARISON_ROWS.map");
    expect(landing).toContain("FREE_FEATURES.map");
    expect(landing).toContain("PLUS_FEATURES.map");
    expect(landing).toContain("design-plan-grid");
    expect(page).toContain("PLUS_PACKAGE_PRICE_PLN");
    expect(page).toContain("calculatePlusPackageEconomics");
  });

  it("links both dashboard roles to their benefit section", () => {
    expect(panel).toContain('"/plan-plus#dla-rodzica"');
    expect(panel).toContain('"/plan-plus#dla-ucznia"');
    expect(page).toContain('id="dla-rodzica"');
    expect(page).toContain('id="dla-ucznia"');
  });

  it("presents Plus as immediately available without a launch waitlist", () => {
    expect(page).toContain("Pakiet Plus · dostępny");
    expect(page).not.toContain("Powiadom mnie o starcie");
    expect(page).not.toContain('subscriptionType="plus_waitlist"');
    expect(page).toContain('href="/panel?widok=platnosci"');
    expect(page).toContain("dostępny od razu po skutecznej płatności");
    expect(page).toContain("Pakiet nie odnawia się automatycznie");
    expect(page).toContain("Zamawiam pakiet i płacę");
  });

  it("compares the package with tutoring without claiming it replaces a teacher", () => {
    expect(page).toContain("dwie korepetycje kosztują");
    expect(page).toContain("nie zastępuje indywidualnego nauczyciela");
    expect(landing).toContain("Godzina korepetycji to zwykle 80–120 zł");
  });

  it("links all required legal information and the panel return", () => {
    expect(page).toContain('href="/panel"');
    expect(page).toContain('href="/regulamin"');
    expect(page).toContain('href="/polityka-prywatnosci"');
    expect(page).toContain('href="/odstapienie-od-umowy"');
    expect(page).toContain('href="/informacje-prawne"');
  });
});
