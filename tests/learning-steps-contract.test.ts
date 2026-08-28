import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(join(process.cwd(), "app/page.tsx"), "utf8");

describe("learning steps section", () => {
  it("uses the compact icon-led sequence from the latest supplied HTML", () => {
    expect(page).toContain("Rozwiąż → Zapytaj → Zrozum");
    expect(page).toContain("design-process-list");
    expect(page).toContain("FileText");
    expect(page).toContain("MessageCircleQuestion");
    expect(page).toContain("CircleCheck");
  });

  it("keeps all three explanations concise", () => {
    expect(page).toContain("Wybierasz rok, przedmiot i arkusz.");
    expect(page).toContain("Wskazówka, kolejny krok albo prostszy przykład.");
    expect(page).toContain("Widzisz rozwiązanie i pytasz, co poszło nie tak.");
  });
});
