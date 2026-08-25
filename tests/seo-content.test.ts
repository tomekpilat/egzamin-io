import { describe, expect, it } from "vitest";
import { SEO_CATEGORIES, SEO_PAGES, getSeoCategory, getSeoPage, pagesForCategory, relatedSeoPages } from "@/lib/seo-pages";

describe("SEO content catalog", () => {
  it("publishes unique, complete and source-backed pilot pages", () => {
    expect(SEO_PAGES).toHaveLength(19);
    expect(new Set(SEO_PAGES.map((page) => page.path)).size).toBe(SEO_PAGES.length);
    expect(new Set(SEO_PAGES.map((page) => page.title)).size).toBe(SEO_PAGES.length);

    for (const page of SEO_PAGES) {
      expect(page.path).toMatch(/^\/[a-z0-9/-]+$/);
      expect(page.title.length).toBeGreaterThan(25);
      expect(page.description.length).toBeGreaterThan(70);
      expect(page.sections.length).toBeGreaterThanOrEqual(3);
      expect(page.faqs.length).toBeGreaterThan(0);
      expect(page.sources.length).toBeGreaterThan(0);
      expect(page.updatedAt).toBe("25 sierpnia 2026");
      expect(page.cta.href).toMatch(/^\//);
      expect(JSON.stringify(page)).not.toMatch(/TODO|LOREM|wymyślony próg/i);
    }
  });

  it("groups all category pages and resolves normalized paths", () => {
    for (const category of SEO_CATEGORIES) {
      expect(getSeoCategory(category.slug)).toEqual(category);
      expect(pagesForCategory(category.label).length).toBeGreaterThan(0);
    }
    expect(getSeoCategory("brak")).toBeNull();
    expect(getSeoPage("egzamin-osmoklasisty-2027")?.path).toBe("/egzamin-osmoklasisty-2027");
    expect(getSeoPage("/brak")).toBeNull();
  });

  it("only returns published catalog entries as related articles", () => {
    const recruitment = getSeoPage("/rekrutacja/ile-punktow-do-liceum");
    expect(recruitment).not.toBeNull();
    const related = relatedSeoPages(recruitment!);
    expect(related.map((page) => page.path)).toContain("/rekrutacja/progi-punktowe/warszawa-2027");
    expect(related.map((page) => page.path)).not.toContain("/kalkulator-punktow");
  });
});
