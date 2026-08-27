import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

function rule(selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return styles.match(new RegExp(`${escaped} \\{[^}]*\\}`))?.[0] ?? "";
}

describe("landing-page structural borders", () => {
  it("uses the shared border token for neutral cards and sections", () => {
    for (const selector of [
      ".product-window",
      ".subject-category",
      ".recruitment-hook",
      ".step-card",
      ".explain-demo",
      ".plan-card",
    ]) {
      expect(rule(selector), selector).toContain("border: 1px solid var(--border)");
    }
  });

  it("does not tint the calculator border with the accent color", () => {
    expect(rule(".recruitment-hook")).not.toMatch(/border:\s*1px\s+solid\s+color-mix/);
  });
});
