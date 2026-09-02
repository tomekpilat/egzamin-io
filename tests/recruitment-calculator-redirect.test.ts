import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("legacy recruitment calculator URL", () => {
  it("permanently redirects to the canonical calculator route", () => {
    const route = fs.readFileSync(
      path.join(root, "app/kalkulator-punktow-do-liceum/page.tsx"),
      "utf8",
    );

    expect(route).toContain('import { permanentRedirect } from "next/navigation"');
    expect(route).toContain('permanentRedirect("/kalkulator-punktow")');
  });

  it("uses the canonical URL in marketing documentation", () => {
    const strategy = fs.readFileSync(
      path.join(root, "docs/marketing-strategy-mvp.md"),
      "utf8",
    );

    expect(strategy).not.toContain("egzamin.io/kalkulator-punktow-do-liceum");
    expect(strategy).toContain(
      "egzamin.io/kalkulator-punktow?utm_source=instagram",
    );
  });
});
