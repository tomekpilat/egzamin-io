import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const panel = readFileSync(join(process.cwd(), "app/panel/page.tsx"), "utf8");
const login = readFileSync(join(process.cwd(), "app/logowanie/page.tsx"), "utf8");

describe("parent panel actions", () => {
  it("creates a child-registration link without putting personal data in the URL", () => {
    expect(panel).toContain('const invitePath = "/logowanie?tryb=rejestracja&rola=uczen"');
    expect(panel).not.toContain("opiekun=${encodeURIComponent(parentEmail)}");
    expect(panel).toContain("navigator.clipboard.writeText");
    expect(panel).toContain("Kopiuj mój e-mail");
    expect(panel).toContain("Wyślij e-mailem");
    expect(login).toContain('requestedRole === "rodzic"');
  });

  it("supports consent decisions and child settings", () => {
    expect(panel).toContain('supabase.rpc(functionName, { target_request_id: requestId })');
    expect(panel).toContain('supabase.rpc("update_child_learning_settings"');
    expect(panel).toContain("Ustawienia dziecka zostały zapisane.");
  });

  it("switches the parent dashboard content instead of using page anchors", () => {
    expect(panel).toContain('type ParentView = "start" | "progress" | "children" | "connect" | "payments" | "settings"');
    expect(panel).toContain('onClick={() => setParentView("progress")}');
    expect(panel).toContain('onClick={() => setParentView("children")}');
    expect(panel).toContain('onClick={() => setParentView("connect")}');
    expect(panel).toContain('onClick={() => setParentView("payments")}');
    expect(panel).toContain('parentView === "settings"');
    expect(panel).not.toContain('profile.role === "parent" ? "#polacz-dziecko"');
  });

  it("keeps plan, privacy and theme controls in their intended places", () => {
    expect(panel).toContain('"/plan-plus#dla-rodzica"');
    expect(panel).toContain('"/plan-plus#dla-ucznia"');
    expect(panel).toContain('<a href="/polityka-prywatnosci">Polityka prywatności</a>');
    expect(panel).not.toContain("ThemeToggle");
    expect(panel).toContain('<span>Wygląd aplikacji</span><ThemeSettings />');
  });

  it("links visibly to child-safety information", () => {
    expect(panel).toContain('href="/bezpieczenstwo-dzieci-ai"');
  });

  it("keeps weekly e-mail reports out of the parent panel", () => {
    expect(panel).not.toContain("Tygodniowe podsumowanie");
    expect(panel).not.toContain("Raporty e-mail");
    expect(panel).not.toContain("Tygodniowy raport");
    expect(panel).toContain("Zobacz pełny postęp");
    expect(panel).toContain("wykorzystanie AI");
  });
});
