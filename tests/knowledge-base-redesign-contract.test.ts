import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const page = readFileSync(join(root, "app", "baza-wiedzy", "page.tsx"), "utf8");
const layout = readFileSync(join(root, "app", "baza-wiedzy", "layout.tsx"), "utf8");
const component = readFileSync(join(root, "components", "knowledge-base-index.tsx"), "utf8");
const styles = readFileSync(join(root, "app", "baza-wiedzy", "knowledge-list.css"), "utf8");

describe("knowledge base list design contract", () => {
  it("uses a dedicated interactive list while preserving the shared public shell", () => {
    expect(page).toContain("<SeoHeader />");
    expect(page).toContain("<KnowledgeBaseIndex />");
    expect(page).toContain("<SeoFooter />");
    expect(layout).toContain('import "./knowledge-list.css"');
    expect(component).toContain('useState<KnowledgeFilter>("all")');
    expect(component).toContain('aria-label="Filtruj poradniki"');
    expect(component).toContain("pagesForCategory(category.label)");
  });

  it("matches the supplied wide list composition without decorative shadows", () => {
    expect(styles).toContain("width: min(1140px, 100%)");
    expect(styles).toContain("padding-inline: 32px");
    expect(styles).toContain("font-size: 48px");
    expect(styles).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
    expect(styles).toContain("border-radius: 999px");
    expect(styles).not.toContain("box-shadow");
  });
});
