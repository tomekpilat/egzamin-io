import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/panel", "/api/"] },
    sitemap: "https://egzamin.io/sitemap.xml",
    host: "https://egzamin.io",
  };
}
