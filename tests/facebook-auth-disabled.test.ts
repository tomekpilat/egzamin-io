import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const component = readFileSync(join(process.cwd(), "components/social-auth-buttons.tsx"), "utf8");
const css = readFileSync(join(process.cwd(), "app/account.css"), "utf8");

describe("Facebook authentication availability", () => {
  it("does not expose Facebook until the Meta application is verified", () => {
    expect(component).not.toContain('id: "facebook"');
    expect(component).not.toContain("FacebookBrandIcon");
    expect(component).not.toContain("Kontynuuj z Facebookiem");
    expect(css).not.toContain('data-provider="facebook"');
  });
});
