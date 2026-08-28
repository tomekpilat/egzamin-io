import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const header = readFileSync(join(root, "components/site-header.tsx"), "utf8");
const styles = readFileSync(join(root, "app/redesign.css"), "utf8");
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
    for (const label of ["Przedmioty", "Dla rodziców", "Kalkulator", "Baza wiedzy", "Zaloguj się", "Załóż konto"]) {
      expect(header).toContain(label);
    }

    for (const surface of publicSurfaces) {
      expect(surface.source, surface.path).toContain("<SiteHeader");
    }
  });

  it("replaces login actions with the account menu when a Supabase session exists", () => {
    expect(header).toContain("supabase.auth.getSession()");
    expect(header).toContain("supabase.auth.onAuthStateChange");
    expect(header).toContain("Przejdź do panelu");
    expect(header).toContain("Wyloguj się");
    expect(header).toContain('href="/panel"');
    expect(header).toContain("header-session-placeholder");
    expect(header).toContain("mobile-nav-trigger");
  });

  it("restores the established public destinations with working routes", () => {
    expect(header).toContain('href: "/#zadania"');
    expect(header).toContain('href: "/#rodzice"');
    expect(header).toContain('href: "/kalkulator-punktow"');
    expect(header).toContain('href: "/baza-wiedzy"');
  });

  it("uses one desktop and mobile header height", () => {
    expect(styles).toMatch(/\.site-header\s*\{[^}]*height:\s*70px;/s);
    expect(styles).toMatch(/@media \(max-width:\s*680px\)[\s\S]*?\.site-header\s*\{\s*height:\s*64px;/);
  });
});
