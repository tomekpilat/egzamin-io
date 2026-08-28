import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const login = readFileSync(join(process.cwd(), "app/logowanie/page.tsx"), "utf8");
const onboarding = readFileSync(join(process.cwd(), "app/wybierz-role/page.tsx"), "utf8");
const redesignStyles = readFileSync(join(process.cwd(), "app/redesign.css"), "utf8");

describe("simplified registration flow", () => {
  it("asks for the account role before showing registration methods", () => {
    expect(login.indexOf('className="role-picker signup-role-picker"')).toBeLessThan(
      login.indexOf("<SocialAuthButtons"),
    );
    expect(login).toContain('value: "student"');
    expect(login).toContain('value: "parent"');
  });

  it("uses the selected-card style without extra checkmarks on role cards", () => {
    const rolePicker = login.slice(
      login.indexOf('<fieldset className="role-picker signup-role-picker">'),
      login.indexOf("<SocialAuthButtons"),
    );

    expect(rolePicker).not.toContain("✓");
    expect(redesignStyles).toContain(".role-picker label.selected .role-choice-dot");
  });

  it("requires email and password confirmation", () => {
    expect(login).toContain('id="auth-email-confirmation"');
    expect(login).toContain('id="auth-password-confirmation"');
    expect(login).toContain("validateSignupConfirmation(");
  });

  it("explains both roles without teacher-account messaging", () => {
    expect(login).toContain("Rozwiązujesz zadania z arkuszy CKE");
    expect(login).toContain("Zatwierdzasz konto dziecka");
    expect(login).not.toMatch(/kont(a|o) nauczyciel/i);
    expect(onboarding).not.toMatch(/dostęp nauczycielski/i);
  });

  it("keeps the supplied fixed-width single-card composition", () => {
    expect(redesignStyles).toMatch(/\.auth-shell \{[^}]*width: min\(560px,/);
    expect(redesignStyles).toMatch(/\.auth-card \{[^}]*padding: 32px 36px;/);
  });

  it("does not mix the retired image-and-story login layout into the supplied design", () => {
    expect(login).not.toContain('className="auth-story-image"');
    expect(login).not.toContain("auth-journey");
    expect(redesignStyles).toContain(".auth-story {\n  display: none;");
  });
});
