import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(join(process.cwd(), "app/page.tsx"), "utf8");
const styles = readFileSync(join(process.cwd(), "app/redesign.css"), "utf8");

describe("learning steps section", () => {
  it("uses the compact icon-led sequence from the latest supplied HTML", () => {
    expect(page).toContain("Rozwiąż → Zapytaj → Zrozum");
    expect(page).toContain("design-process-list");
    expect(page).toContain("FileText");
    expect(page).toContain("MessageCircleQuestion");
    expect(page).toContain("CircleCheck");
    expect(styles).toContain(".design-process-list { margin-top: 22px;");
  });

  it("keeps all three explanations concise", () => {
    expect(page).toContain("Wybierasz rok, przedmiot i arkusz.");
    expect(page).toContain("Wskazówka, kolejny krok albo prostszy przykład.");
    expect(page).toContain("Widzisz rozwiązanie i pytasz, co poszło nie tak.");
  });

  it("explains the authentic CKE content clearly in the hero", () => {
    expect(page).toContain("Ćwicz na autentycznych arkuszach CKE z poprzednich lat");
    expect(page).toContain("Ponad 1000 pytań wraz z odpowiedziami i wyjaśnieniami krok po kroku");
    expect(page).toContain("to, co pojawiało się na egzaminie");
    expect(page).not.toContain("pomoc dokładnie tam, gdzie się zacięło");
  });
});
