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
    expect(page).toContain("Nie jest wymaganiem ustalonym z góry");
    expect(page).toContain("Kalkulator nie zapisuje ocen ani procentów");
  });

  it("supports an honest autumn forecast and separate parent/student paths", () => {
    expect(page).toContain('type ExamMode = "unknown" | "estimate"');
    expect(page).toContain("W rekrutacji liczą się oceny na świadectwie ukończenia szkoły podstawowej");
    expect(page).toContain('rola=rodzic');
    expect(page).toContain('rola=uczen');
  });

  it("starts empty and explains the three-step flow with the threshold database highlighted", () => {
    expect(page).toContain("grades: [null, null, null, null]");
    expect(page).toContain("Znajdź szkołę w naszej bazie");
    expect(page).toContain("Baza progów");
    expect(page).toContain("próg wpisze się sam");
  });

  it("uses verified school thresholds, a consent-backed alert and FAQ structured data", () => {
    expect(page).toContain("SchoolThresholdSearch");
    expect(page).toContain('subscriptionType="recruitment_thresholds"');
    expect(page).toContain('"@type": "FAQPage"');
    expect(page).toContain("Tabela punktów za oceny");
  });

  it("has dedicated shareable metadata without inheriting an unrelated social image", () => {
    expect(layout).toContain("Kalkulator punktów do liceum i technikum 2027 — egzaminio");
    expect(layout).toContain('canonical: "/kalkulator-punktow"');
    expect(layout.match(/images: \[\]/g)).toHaveLength(2);
    expect(layout).toContain('dynamic = "force-static"');
  });
});
