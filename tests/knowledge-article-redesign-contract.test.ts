import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const route = readFileSync(join(root, "app", "[...seoSlug]", "page.tsx"), "utf8");
const template = readFileSync(join(root, "components", "seo-content-page.tsx"), "utf8");
const styles = readFileSync(join(root, "app", "[...seoSlug]", "knowledge-article.css"), "utf8");

describe("knowledge article redesign contract", () => {
  it("uses the new shared article template and route stylesheet", () => {
    expect(route).toContain('import "./knowledge-article.css"');
    expect(template).toContain("ArticleReadingProgress");
    expect(template).toContain("ArticleTableOfContents");
    expect(template).toContain("knowledge-article-example");
    expect(template).toContain("knowledge-article-freshness");
  });

  it("matches the supplied wide two-column layout without shadows", () => {
    expect(styles).toContain("article.knowledge-article-shell { width: min(1140px, 100%)");
    expect(styles).toContain("grid-template-columns: minmax(0, 1fr) 292px");
    expect(styles).toContain("max-width: 700px");
    expect(styles).toContain("font-size: 42px");
    expect(styles).not.toContain("box-shadow");
  });
});
