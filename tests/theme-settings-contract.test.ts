import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const provider = readFileSync(join(root, "components/theme-provider.tsx"), "utf8");
const settings = readFileSync(join(root, "components/theme-settings.tsx"), "utf8");
const panel = readFileSync(join(root, "app/panel/page.tsx"), "utf8");
const publicSurfaces = [
  "app/page.tsx",
  "app/logowanie/page.tsx",
  "app/kalkulator-punktow/page.tsx",
  "components/seo-content-page.tsx",
  "components/legal-shell.tsx",
  "app/wybierz-role/page.tsx",
  "app/oczekuje-na-zgode/page.tsx",
  "app/zaakceptuj-zmiany/page.tsx",
].map((file) => readFileSync(join(root, file), "utf8"));

describe("theme preference placement", () => {
  it("uses the operating-system preference by default", () => {
    expect(provider).toContain('defaultTheme="system"');
    expect(provider).toContain("enableSystem");
    expect(provider).toContain('storageKey="egzaminio-theme"');
    expect(settings).toContain('{ value: "system", label: "Systemowy" }');
  });

  it("keeps manual theme controls only in authenticated account settings", () => {
    expect(panel).toContain('import { ThemeSettings } from "@/components/theme-settings"');
    expect(panel).toContain("<ThemeSettings />");
    for (const surface of publicSurfaces) {
      expect(surface).not.toContain("ThemeToggle");
      expect(surface).not.toContain("ThemeSettings");
    }
  });

  it("lets the user select system, light or dark without decorative icons", () => {
    expect(settings).toContain('{ value: "light", label: "Jasny" }');
    expect(settings).toContain('{ value: "dark", label: "Ciemny" }');
    expect(settings).toContain("setTheme(choice.value)");
    expect(settings).not.toContain("lucide-react");
  });
});
