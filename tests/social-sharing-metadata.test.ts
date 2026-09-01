import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const metadataFiles = [
  "app/layout.tsx",
  "app/kalkulator-punktow/layout.tsx",
  "app/baza-wiedzy/page.tsx",
  "app/[...seoSlug]/page.tsx",
  "app/arkusze/[year]/[subject]/[session]/[paper]/zadanie/[number]/page.tsx",
  "app/plan-plus/layout.tsx",
].map((path) => readFileSync(join(root, path), "utf8"));

describe("social sharing metadata", () => {
  it("uses the branded large social card on every public content type", () => {
    for (const source of metadataFiles) {
      expect(source).toContain("DEFAULT_SOCIAL_IMAGE");
      expect(source).toContain('card: "summary_large_image"');
      expect(source).not.toContain("images: []");
    }
  });

  it("keeps the Open Graph asset at the recommended 1200 by 630 pixels", () => {
    const png = readFileSync(join(root, "public/og.png"));
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    expect(png.subarray(0, 8).equals(signature)).toBe(true);
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
  });

  it("defines canonical URLs for the homepage and Pakiet Plus", () => {
    expect(metadataFiles[0]).toContain('alternates: { canonical: "/" }');
    expect(metadataFiles[5]).toContain('alternates: { canonical: "/plan-plus" }');
  });
});
