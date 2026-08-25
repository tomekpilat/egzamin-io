import type { MetadataRoute } from "next";
import { getPublicCkeSeoIndex } from "@/lib/cke-seo";
import { SEO_CATEGORIES, SEO_PAGES } from "@/lib/seo-pages";

const baseUrl = "https://egzamin.io";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const updated = new Date("2026-08-25T00:00:00.000Z");
  const publicRoutes = ["", "/baza-wiedzy", "/kalkulator-punktow", "/plan-plus", "/bezpieczenstwo-dzieci-ai"];
  const ckeSolutions = await getPublicCkeSeoIndex();

  return [
    ...publicRoutes.map((path, index) => ({ url: `${baseUrl}${path}`, lastModified: updated, changeFrequency: index < 2 ? "weekly" as const : "monthly" as const, priority: index === 0 ? 1 : .8 })),
    ...SEO_CATEGORIES.map((category) => ({ url: `${baseUrl}/${category.slug}`, lastModified: updated, changeFrequency: "weekly" as const, priority: .8 })),
    ...SEO_PAGES.map((page) => ({ url: `${baseUrl}${page.path}`, lastModified: updated, changeFrequency: "monthly" as const, priority: page.category === "Rekrutacja" ? .9 : .7 })),
    ...ckeSolutions.map((page) => ({ url: `${baseUrl}${page.canonical_path}`, lastModified: new Date(page.updated_at), changeFrequency: "yearly" as const, priority: .6 })),
  ];
}
