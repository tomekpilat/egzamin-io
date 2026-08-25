import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(join(process.cwd(), "app/page.tsx"), "utf8");
const styles = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

describe("learning steps section", () => {
  it("uses one accessible Lucide icon for every step", () => {
    expect(page).toContain('import { Lightbulb, MessageCircleQuestion, PencilLine } from "lucide-react"');
    expect(page).toContain('<PencilLine aria-hidden="true" />');
    expect(page).toContain('<MessageCircleQuestion aria-hidden="true" />');
    expect(page).toContain('<Lightbulb aria-hidden="true" />');
    expect(page).not.toContain('<div className="step-icon">✎</div>');
    expect(page).not.toContain('<div className="step-icon">AI</div>');
    expect(page).not.toContain('<div className="step-icon">↗</div>');
  });

  it("keeps the cards compact on desktop and mobile", () => {
    expect(styles).toContain(".step-card { position: relative; min-height: 220px; overflow: hidden; padding: 24px;");
    expect(styles).toContain(".step-icon { width: 52px; height: 52px; margin: 2px 0 18px;");
    expect(styles).toContain(".step-card { min-height: 190px; }");
  });
});
