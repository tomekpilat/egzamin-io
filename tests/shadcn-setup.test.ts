import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("shadcn/ui setup", () => {
  it("uses the official shadcn schema and local component aliases", () => {
    const config = JSON.parse(readFileSync(join(process.cwd(), "components.json"), "utf8"));
    expect(config.$schema).toBe("https://ui.shadcn.com/schema.json");
    expect(config.style).toBe("new-york");
    expect(config.tailwind.css).toBe("app/globals.css");
    expect(config.aliases.ui).toBe("@/components/ui");
  });

  it.each(["accordion", "alert", "badge", "button", "card", "checkbox", "dialog", "dropdown-menu", "input", "label", "progress", "radio-group", "select", "switch", "textarea"])("provides the %s primitive locally", (name) => {
    expect(existsSync(join(process.cwd(), "components", "ui", `${name}.tsx`))).toBe(true);
  });
});
