import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const login = read("app/logowanie/page.tsx");
const requestPage = read("app/odzyskaj-haslo/page.tsx");
const updatePage = read("app/ustaw-nowe-haslo/page.tsx");
const template = read("docs/supabase-email-templates/reset-password.html");
const setup = read("docs/supabase-auth-setup.md");

describe("password recovery contract", () => {
  it("links login to a non-enumerating recovery request", () => {
    expect(login).toContain('href="/odzyskaj-haslo"');
    expect(requestPage).toContain("resetPasswordForEmail");
    expect(requestPage).toContain('redirectTo: `${window.location.origin}/ustaw-nowe-haslo`');
    expect(requestPage).toContain("Jeśli konto z tym adresem istnieje");
    expect(requestPage).not.toContain("Nie znaleziono konta");
  });

  it("requires a valid recovery session and matching new passwords", () => {
    expect(updatePage).toContain('event === "PASSWORD_RECOVERY"');
    expect(updatePage).toContain("supabase.auth.getSession()");
    expect(updatePage).toContain("supabase.auth.updateUser({ password })");
    expect(updatePage).toContain("validatePasswordReset(password, passwordConfirmation)");
  });

  it("ships a localized Supabase template and redirect configuration", () => {
    expect(template).toContain("{{ .ConfirmationURL }}");
    expect(template).toContain("Ustaw nowe hasło");
    expect(template).toContain("kontakt@egzamin.io");
    expect(setup).toContain("https://egzamin.io/ustaw-nowe-haslo");
    expect(setup).toContain("Subject: Ustaw nowe hasło do egzaminio");
  });
});
