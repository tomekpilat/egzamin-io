import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeoCategoryPage, SeoContentPage } from "@/components/seo-content-page";
import { SEO_CATEGORIES, SEO_PAGES, getSeoCategory, getSeoPage } from "@/lib/seo-pages";
import { DEFAULT_SOCIAL_IMAGE } from "@/lib/site-metadata";
import "./knowledge-article.css";

type RouteProps = { params: Promise<{ seoSlug: string[] }> };

function routePath(segments: string[]) {
  return `/${segments.join("/")}`;
}

export function generateStaticParams() {
  return [
    ...SEO_PAGES.map((page) => ({ seoSlug: page.path.slice(1).split("/") })),
    ...SEO_CATEGORIES.map((category) => ({ seoSlug: [category.slug] })),
  ];
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { seoSlug } = await params;
  const path = routePath(seoSlug);
  const page = getSeoPage(path);
  const category = seoSlug.length === 1 ? getSeoCategory(seoSlug[0]) : null;
  if (!page && !category) return { title: "Nie znaleziono strony — egzaminio", robots: { index: false, follow: false } };

  const title = page?.title ?? `${category!.heading} — egzaminio`;
  const description = page?.description ?? category!.description;
  return {
    title,
    description,
    keywords: page?.keywords,
    alternates: { canonical: path },
    openGraph: { title, description, type: "article", locale: "pl_PL", url: path, images: [DEFAULT_SOCIAL_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [DEFAULT_SOCIAL_IMAGE] },
  };
}

export default async function SeoRoute({ params }: RouteProps) {
  const { seoSlug } = await params;
  const page = getSeoPage(routePath(seoSlug));
  if (page) return <SeoContentPage page={page} />;

  const category = seoSlug.length === 1 ? getSeoCategory(seoSlug[0]) : null;
  if (category) return <SeoCategoryPage category={category} />;
  notFound();
}
