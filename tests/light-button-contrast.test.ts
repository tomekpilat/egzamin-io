import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("light-mode button contrast", () => {
  it("does not overwrite colors of links rendered as shadcn buttons", () => {
    const styles = readFileSync(join(root, "app/globals.css"), "utf8");

    expect(styles).toContain('a:not([data-slot="button"])');
    expect(styles).not.toMatch(/(?:^|\n)\s*a\s*\{\s*color:\s*inherit;/);
  });

  it("gives outline buttons an explicit foreground and keeps labels on the variant color", () => {
    const button = readFileSync(join(root, "components/ui/button.tsx"), "utf8");
    const styles = readFileSync(join(root, "app/globals.css"), "utf8");

    expect(button).toContain('outline: "border border-border bg-background text-foreground');
    expect(styles).toMatch(/\[data-slot="button"\]\s*>\s*span\s*\{\s*color:\s*inherit;/);
  });
});
