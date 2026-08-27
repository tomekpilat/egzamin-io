import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const header = readFileSync(join(root, "components/site-header.tsx"), "utf8");
const styles = readFileSync(join(root, "app/globals.css"), "utf8");
const publicSurfaces = [
  "app/page.tsx",
  "app/logowanie/page.tsx",
  "app/kalkulator-punktow/page.tsx",
  "app/plan-plus/page.tsx",
  "app/wypisz/page.tsx",
  "components/legal-shell.tsx",
  "components/seo-content-page.tsx",
].map((path) => ({ path, source: readFileSync(join(root, path), "utf8") }));

describe("shared public site header", () => {
  it("keeps the same navigation and account actions on every public surface", () => {
    for (const label of ["Kalkulator", "Baza wiedzy", "Dla rodzica", "Plany", "Zaloguj się", "Załóż konto"]) {
      expect(header).toContain(label);
    }

    for (const surface of publicSurfaces) {
      expect(surface.source, surface.path).toContain("<SiteHeader");
    }
  });

  it("uses stable home anchors from every route", () => {
    expect(header).toContain('href: "/#dla-rodzica"');
    expect(header).toContain('href: "/#dostep"');
  });

  it("uses one desktop and mobile header height", () => {
    expect(styles).toMatch(/\.site-header\s*\{[^}]*height:\s*82px;/s);
    expect(styles).toMatch(/@media \(max-width:\s*680px\)[\s\S]*?\.site-header\s*\{\s*height:\s*72px;/);
  });
});
