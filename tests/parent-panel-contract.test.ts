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
    expect(login).toContain('searchParams.get("rola") === "rodzic"');
  });

  it("supports consent decisions and child settings", () => {
    expect(panel).toContain('supabase.rpc(functionName, { target_request_id: requestId })');
    expect(panel).toContain('supabase.rpc("update_guardian_preferences"');
    expect(panel).toContain("Ustawienia dziecka zostały zapisane.");
  });

  it("links visibly to child-safety information", () => {
    expect(panel).toContain('href="/bezpieczenstwo-dzieci-ai"');
  });
});
