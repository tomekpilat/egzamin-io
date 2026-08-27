import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function collectSources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectSources(path);
    return /\.(css|tsx|ts)$/.test(entry.name) ? [path] : [];
  });
}

describe("flat interface and persistent account session", () => {
  it("does not use decorative CSS or utility shadows", () => {
    const forbidden = /box-shadow|text-shadow|drop-shadow|\bshadow-(?:xs|sm|md|lg|xl|2xl|inner|none)\b|transition-shadow/;
    const offenders = [...collectSources(join(root, "app")), ...collectSources(join(root, "components"))]
      .filter((file) => forbidden.test(readFileSync(file, "utf8")))
      .map((file) => file.slice(root.length + 1));

    expect(offenders).toEqual([]);
  });

  it("keeps the logged-in identity and sign-out action fixed outside focus-mode conditionals", () => {
    const panel = readFileSync(join(root, "app/panel/page.tsx"), "utf8");
    const styles = readFileSync(join(root, "app/account.css"), "utf8");
    const sessionIndex = panel.indexOf('className="dashboard-session"');

    expect(sessionIndex).toBeGreaterThan(0);
    expect(sessionIndex).toBeLessThan(panel.indexOf("{!focusMode && <aside"));
    expect(panel).toContain('aria-label="Wyloguj się"');
    expect(panel).toContain("onClick={signOut}");
    expect(styles).toMatch(/\.dashboard-session\s*\{[^}]*position:\s*fixed;[^}]*top:[^;}]+;[^}]*right:[^;}]+;/s);
  });
});
