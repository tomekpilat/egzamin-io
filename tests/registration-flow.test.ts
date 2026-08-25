import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const login = readFileSync(join(process.cwd(), "app/logowanie/page.tsx"), "utf8");
const onboarding = readFileSync(join(process.cwd(), "app/wybierz-role/page.tsx"), "utf8");
const accountStyles = readFileSync(join(process.cwd(), "app/account.css"), "utf8");

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
    expect(accountStyles).not.toContain(".role-picker label.selected i");
  });

  it("requires email and password confirmation", () => {
    expect(login).toContain('id="auth-email-confirmation"');
    expect(login).toContain('id="auth-password-confirmation"');
    expect(login).toContain("validateSignupConfirmation(");
  });

  it("explains both family journeys without teacher-account messaging", () => {
    expect(login).toContain("Zapraszasz rodzica");
    expect(login).toContain("Zapraszasz dziecko");
    expect(login).not.toMatch(/kont(a|o) nauczyciel/i);
    expect(onboarding).not.toMatch(/dostęp nauczycielski/i);
  });

  it("anchors the left column instead of vertically recentering it", () => {
    expect(accountStyles).toMatch(/\.auth-shell \{[^}]*align-items: start;/);
    expect(accountStyles).toContain(".auth-story { min-width: 0; }");
  });

  it("shows role-aware imagery on login and registration", () => {
    expect(login).toContain('src: "/uczen-nauka-logowanie.png"');
    expect(login).toContain('src: "/rodzic-i-uczen-nauka.png"');
    expect(login).toContain('className="auth-story-image"');
    expect(existsSync(join(process.cwd(), "public/uczen-nauka-logowanie.png"))).toBe(true);
  });
});
