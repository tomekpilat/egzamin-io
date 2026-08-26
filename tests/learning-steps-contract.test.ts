import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(join(process.cwd(), "app/page.tsx"), "utf8");
const styles = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

describe("learning steps section", () => {
  it("uses small muted icons for the learning steps but not the calculator hook", () => {
    expect(page).toContain("PencilLine");
    expect(page).toContain("MessageCircleQuestion");
    expect(page).toContain("Lightbulb");
    expect(page).toContain('className="step-heading"');
    expect(page).not.toContain("recruitment-hook-icon");
    expect(page).not.toContain("<Target />");
    expect(styles).not.toContain(".step-icon");
    expect(styles).not.toContain(".recruitment-hook-icon");
    expect(styles).toContain(".step-heading svg { width: 18px; height: 18px; flex: 0 0 18px; opacity: .38; stroke-width: 1.65; }");
  });

  it("keeps the cards compact on desktop and mobile", () => {
    expect(styles).toContain(".step-card { position: relative; min-height: 160px; overflow: hidden; padding: 24px; display: grid; align-content: center;");
    expect(styles).toContain(".step-card { min-height: 150px; padding: 22px; }");
    expect(styles).toContain(".step-card { min-height: 150px; }");
  });
});
