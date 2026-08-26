import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(join(process.cwd(), "app/page.tsx"), "utf8");
const styles = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

describe("learning steps section", () => {
  it("keeps decorative icons out of the learning steps and calculator hook", () => {
    expect(page).not.toContain("PencilLine");
    expect(page).not.toContain("MessageCircleQuestion");
    expect(page).not.toContain("Lightbulb");
    expect(page).not.toContain("recruitment-hook-icon");
    expect(page).not.toContain("<Target />");
    expect(styles).not.toContain(".step-icon");
    expect(styles).not.toContain(".recruitment-hook-icon");
  });

  it("keeps the cards compact on desktop and mobile", () => {
    expect(styles).toContain(".step-card { position: relative; min-height: 160px; overflow: hidden; padding: 24px; display: grid; align-content: center;");
    expect(styles).toContain(".step-card { min-height: 150px; padding: 22px; }");
    expect(styles).toContain(".step-card { min-height: 150px; }");
  });
});
