import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const component = readFileSync(join(process.cwd(), "components/social-auth-buttons.tsx"), "utf8");
const css = readFileSync(join(process.cwd(), "app/account.css"), "utf8");

describe("Facebook sign-in branding", () => {
  it("uses the localized current CTA and the official-color Facebook mark", () => {
    expect(component).toContain('label: "Kontynuuj z Facebookiem"');
    expect(component).toContain('data-brand-icon="facebook"');
    expect(component).toContain('<path fill="#FFF"');
    expect(component).toContain('<path fill="#1877F2"');
  });

  it("matches the blue large login button in both color themes", () => {
    expect(css).toContain('min-height: 40px');
    expect(css).toContain('.social-auth-button[data-provider="facebook"]');
    expect(css).toContain('border: 1px solid #1877f2');
    expect(css).toContain('background: #1877f2; color: #fff');
    expect(css).toContain('font-family: Helvetica, Arial, sans-serif');
    expect(css).toContain('grid-template-columns: 20px minmax(0, 1fr); gap: 10px');
    expect(css).toContain('.dark .social-buttons .social-auth-button[data-provider="facebook"]');
  });
});
