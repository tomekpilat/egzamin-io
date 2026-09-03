import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("favicon metadata", () => {
  it.each([
    "favicon.svg",
    "favicon-16.svg",
    "apple-touch-icon.svg",
  ])("ships %s as a public asset", (filename) => {
    expect(fs.existsSync(path.join(root, "public", filename))).toBe(true);
  });

  it("advertises every supplied icon from the root metadata", () => {
    const layout = fs.readFileSync(path.join(root, "app/layout.tsx"), "utf8");

    expect(layout).toContain('url: "/favicon.svg"');
    expect(layout).toContain('url: "/favicon-16.svg"');
    expect(layout).toContain('url: "/apple-touch-icon.svg"');
  });
});
