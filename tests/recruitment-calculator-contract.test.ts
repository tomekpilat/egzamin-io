import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const page = readFileSync(join(root, "app", "kalkulator-punktow", "page.tsx"), "utf8");
const layout = readFileSync(join(root, "app", "kalkulator-punktow", "layout.tsx"), "utf8");
const homepage = readFileSync(join(root, "app", "page.tsx"), "utf8");
const styles = readFileSync(join(root, "app", "kalkulator-punktow", "calculator.css"), "utf8");
const requestForm = readFileSync(join(root, "components", "school-threshold-request-form.tsx"), "utf8");

describe("public recruitment calculator", () => {
  it("is discoverable from the homepage without requiring an account", () => {
    expect(homepage).toContain('href="/kalkulator-punktow"');
    expect(homepage).toContain("Bezpłatnie i bez konta");
    expect(page).not.toMatch(/requireAuth|getSession|supabase/);
  });

  it("covers the complete 200-point formula and an optional target threshold", () => {
    expect(page).toContain("Maksymalnie 200 punktów: 100 z egzaminu i 100 ze świadectwa oraz osiągnięć");
    expect(page).toContain("Świadectwo z wyróżnieniem");
    expect(page).toContain("Wolontariat");
    expect(page).toContain("Konkursy i osiągnięcia");
    expect(page).toContain('id="target-threshold"');
  });

  it("links to official rules and explains the estimate limitations", () => {
    expect(page).toContain("eli.gov.pl");
    expect(page).toContain("gov.pl/web/edukacja");
    expect(page).toContain("Nie jest wymaganiem ustalonym z góry");
    expect(page).toContain("Kalkulator nie zapisuje ocen ani procentów");
  });

  it("collects all three exam results and exposes separate parent/student paths", () => {
    expect(page).toContain('id="exam-polish"');
    expect(page).toContain('id="exam-mathematics"');
    expect(page).toContain('id="exam-language"');
    expect(page).toContain('rola=rodzic');
    expect(page).toContain('rola=uczen');
  });

  it("starts empty and exposes three linked, progressive steps", () => {
    expect(page).toContain("grades: [null, null, null, null]");
    expect(page).toContain('href="#kalkulator"');
    expect(page).toContain('href="#szkola"');
    expect(page).toContain('href="#wynik"');
    expect(page).toContain('useState<CalculatorStep>("points")');
    expect(page).toContain('goToStep("school")');
    expect(page).toContain('goToStep("result")');
    expect(page).toContain("SchoolThresholdSearch");
    expect(page).toContain("sourceDescription");
  });

  it("keeps the calculator flow compact and stable between steps", () => {
    expect(page).toContain('id="calculator-flow"');
    expect(page).toContain('id="calculator-flow-start"');
    expect(page).toContain('document.getElementById("calculator-flow-start")');
    expect(page).toContain('window.scrollTo({ top: flowTop, behavior: "auto" })');
    expect(page).toContain("const flowTop = flow.offsetTop");
    expect(page).not.toContain('behavior: "smooth"');
    expect(page).not.toContain("<br />do liceum");
    expect(page).toContain("calculator-certificate-card");
    expect(page).toContain("calculator-live-score");
    expect(page).toContain("calculator-comparison-summary");
    expect(page).toContain("calculator-comparison-scale");
    expect(styles).toMatch(/\.calculator-steps \{[^}]*position: sticky/);
    expect(styles).toContain("grid-template-columns: repeat(3, minmax(0, 1fr))");
  });

  it("lets visitors request a missing school threshold", () => {
    expect(page).toContain("Nie ma Twojej szkoły? Zgłoś ją");
    expect(page).toContain("SchoolThresholdRequestForm");
    expect(requestForm).toContain("Szkoła lub klasa");
    expect(requestForm).toContain("Miasto");
    expect(requestForm).toContain("Twój e-mail");
  });

  it("uses verified school thresholds, a consent-backed alert and FAQ structured data", () => {
    expect(page).toContain("SchoolThresholdSearch");
    expect(requestForm).toContain('subscriptionType: "recruitment_thresholds"');
    expect(requestForm).toContain("MARKETING_CONSENT_VERSION");
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
