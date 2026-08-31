import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const component = readFileSync(join(process.cwd(), "components/social-auth-buttons.tsx"), "utf8");
const css = readFileSync(join(process.cwd(), "app/redesign.css"), "utf8");
const officialMark = readFileSync(join(process.cwd(), "public/google-g-official.svg"), "utf8");

describe("Google sign-in branding", () => {
  it("uses the localized recommended CTA and the official downloaded Super G asset", () => {
    expect(component).toContain('label: "Kontynuuj z Google"');
    expect(component).toContain('data-brand-icon="google"');
    expect(component).not.toContain("#EA4335");
    expect(css).toContain('url("/google-g-official.svg")');
    expect(officialMark).toContain("data-figma-gradient-fill");
    expect(officialMark).toContain("#3186FF");
  });

  it("matches Google light and dark colors, typography and web padding", () => {
    expect(css).toContain('grid-template-columns: 40px minmax(0, 1fr) 40px');
    expect(css).toContain('min-height: 52px; padding: 5px 12px');
    expect(css).toContain('.social-brand-icon.google-brand-icon { width: 40px; height: 40px;');
    expect(css).toContain('font-family: "Google Sans", Roboto, Arial, sans-serif');
    expect(css).toContain('border: 1px solid #747775');
    expect(css).toContain('background: #fff; color: #1f1f1f');
    expect(css).toContain('border-color: #8e918f; background: #131314; color: #e3e3e3');
  });
});
