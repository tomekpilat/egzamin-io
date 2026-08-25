import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const route = readFileSync(join(process.cwd(), "app/[...seoSlug]/page.tsx"), "utf8");
const template = readFileSync(join(process.cwd(), "components/seo-content-page.tsx"), "utf8");
const sitemap = readFileSync(join(process.cwd(), "app/sitemap.ts"), "utf8");
const robots = readFileSync(join(process.cwd(), "app/robots.ts"), "utf8");

describe("technical SEO foundation", () => {
  it("builds unique metadata, canonical URLs and non-indexable 404 metadata", () => {
    expect(route).toContain("generateMetadata");
    expect(route).toContain("alternates: { canonical: path }");
    expect(route).toContain("robots: { index: false, follow: false }");
    expect(route).toContain("generateStaticParams");
  });

  it("renders visible breadcrumbs, sources and matching structured data", () => {
    expect(template).toContain('"@type": "Article"');
    expect(template).toContain('"@type": "BreadcrumbList"');
    expect(template).toContain('"@type": "FAQPage"');
    expect(template).toContain("Najczęstsze pytania");
    expect(template).toContain("Źródła");
    expect(template).toContain("knowledge-breadcrumbs");
  });

  it("keeps private routes out of robots and adds only cataloged content to sitemap", () => {
    expect(robots).toContain('disallow: ["/panel", "/api/"]');
    expect(sitemap).toContain("SEO_CATEGORIES");
    expect(sitemap).toContain("SEO_PAGES");
    expect(sitemap).toContain("getPublicCkeSeoIndex");
    expect(sitemap).not.toContain("/panel");
  });
});
