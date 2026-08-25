import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const homepage = readFileSync(join(process.cwd(), "app/page.tsx"), "utf8");

describe("homepage subject section", () => {
  it("renders the shared subject configuration without Unicode stand-ins", () => {
    expect(homepage).toContain("SUBJECT_CATEGORIES.map");
    expect(homepage).toContain("<SubjectIcon subject={category.key}");
    expect(homepage).not.toContain("<b>∑</b>");
    expect(homepage).not.toContain("<b>ą</b>");
    expect(homepage).not.toContain("<b>A</b>");
    expect(homepage).not.toContain("<b>✓</b>");
  });
});
