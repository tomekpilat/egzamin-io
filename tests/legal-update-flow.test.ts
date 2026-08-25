import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const panel = readFileSync(join(process.cwd(), "app/panel/page.tsx"), "utf8");
const rolePage = readFileSync(join(process.cwd(), "app/wybierz-role/page.tsx"), "utf8");
const legalUpdate = readFileSync(join(process.cwd(), "app/zaakceptuj-zmiany/page.tsx"), "utf8");

describe("returning user legal update flow", () => {
  it("uses the same account routing decision in panel and role selection", () => {
    expect(panel).toContain("resolveAccountRoute(nextProfile, LEGAL_VERSION)");
    expect(rolePage).toContain("resolveAccountRoute(profile, LEGAL_VERSION)");
  });

  it("accepts updated documents without changing the account role or onboarding", () => {
    expect(legalUpdate).toContain('supabase.rpc("record_legal_acceptance"');
    expect(legalUpdate).not.toContain("complete_onboarding");
    expect(legalUpdate).not.toContain("selected_role");
    expect(legalUpdate).toContain("Twoja rola i ustawienia pozostają bez zmian");
  });
});
