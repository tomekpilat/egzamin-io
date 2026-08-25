import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const page = readFileSync(join(root, "app", "kalkulator-punktow", "page.tsx"), "utf8");
const layout = readFileSync(join(root, "app", "kalkulator-punktow", "layout.tsx"), "utf8");
const homepage = readFileSync(join(root, "app", "page.tsx"), "utf8");

describe("public recruitment calculator", () => {
  it("is discoverable from the homepage without requiring an account", () => {
    expect(homepage).toContain('href="/kalkulator-punktow"');
    expect(homepage).toContain("Bez logowania");
    expect(page).not.toMatch(/requireAuth|getSession|supabase/);
  });

  it("covers the complete 200-point formula and an optional target threshold", () => {
    expect(page).toContain("Egzamin to aż 100 z 200 punktów");
    expect(page).toContain("Świadectwo z wyróżnieniem");
    expect(page).toContain("Aktywność społeczna lub wolontariat");
    expect(page).toContain("Szczególne osiągnięcia i konkursy");
    expect(page).toContain('id="target-threshold"');
  });

  it("links to official rules and explains the estimate limitations", () => {
    expect(page).toContain("eli.gov.pl");
    expect(page).toContain("gov.pl/web/edukacja");
    expect(page).toContain("Progi z poprzednich lat nie gwarantują przyjęcia");
    expect(page).toContain("Kalkulator nie zapisuje wpisanych danych");
  });

  it("has dedicated shareable metadata without inheriting an unrelated social image", () => {
    expect(layout).toContain("Kalkulator punktów do liceum — egzaminio");
    expect(layout).toContain('canonical: "/kalkulator-punktow"');
    expect(layout.match(/images: \[\]/g)).toHaveLength(2);
  });
});
