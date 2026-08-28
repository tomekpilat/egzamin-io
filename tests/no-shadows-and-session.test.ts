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

  it("keeps account actions in a dropdown and removes it from exercise focus mode", () => {
    const panel = readFileSync(join(root, "app/panel/page.tsx"), "utf8");
    const accountTrigger = readFileSync(join(root, "components/account-menu-trigger.tsx"), "utf8");
    const styles = readFileSync(join(root, "app/redesign.css"), "utf8");

    expect(panel).toContain("function AccountMenu(");
    expect(panel).toContain('<AccountMenuTrigger displayName={displayName} email={email} className={`${triggerClassName} ${className}`.trim()} />');
    expect(accountTrigger).toContain('aria-label={`Menu konta: ${displayName}`}');
    expect(panel).toContain("<DropdownMenuItem onSelect={onSettings}");
    expect(panel).toContain('className="dashboard-signout-item"');
    expect(panel).toContain('!focusMode && profile.role !== "parent" && profile.role !== "student"');
    expect(panel).toContain('!focusMode && profile.role === "student"');
    expect(panel).toContain('!focusMode && profile.role !== "student"');
    expect(styles).toMatch(/\.dashboard-session-floating\s*\{[^}]*position:\s*fixed;[^}]*top:[^;}]+;[^}]*right:[^;}]+;/s);
    expect(styles).toMatch(/\.dashboard-sidebar-account\s*\{[^}]*margin-top:\s*auto;/s);
  });
});
