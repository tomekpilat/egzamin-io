import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const homepage = readFileSync(join(process.cwd(), "app/page.tsx"), "utf8");

describe("homepage subject section", () => {
  it("does not reintroduce the removed legacy subject strip", () => {
    expect(homepage).not.toContain("SUBJECT_CATEGORIES.map");
    expect(homepage).not.toContain("subject-strip");
    expect(homepage).toContain("Arkusze CKE 2019–2026");
  });
});
