import type { Metadata } from "next";
import { SeoFooter, SeoHeader } from "@/components/seo-content-page";
import { SEO_CATEGORIES, pagesForCategory } from "@/lib/seo-pages";

export const metadata: Metadata = {
  title: "Baza wiedzy do egzaminu ósmoklasisty — egzaminio",
  description: "Aktualne poradniki o egzaminie ósmoklasisty, rekrutacji, matematyce, polskim, angielskim i wspieraniu ucznia.",
  alternates: { canonical: "/baza-wiedzy" },
  openGraph: { title: "Baza wiedzy do egzaminu ósmoklasisty — egzaminio", description: "Poradniki o E8 i rekrutacji oparte na oficjalnych źródłach.", type: "website", locale: "pl_PL", url: "/baza-wiedzy", images: [] },
  twitter: { card: "summary", title: "Baza wiedzy — egzaminio", description: "Poradniki o E8 i rekrutacji oparte na oficjalnych źródłach.", images: [] },
};

export default function KnowledgeBasePage() {
  return (
    <main className="knowledge-page knowledge-index-page">
      <SeoHeader />
      <section className="knowledge-index-hero"><span className="knowledge-eyebrow">Baza wiedzy egzaminio</span><h1>Konkretna odpowiedź. Potem ćwiczenie.</h1><p>Aktualne terminy i zasady sprawdzamy w źródłach CKE oraz MEN. Tematy przedmiotowe wyjaśniamy na przykładach, bez gotowców do skopiowania.</p></section>
      <section className="knowledge-category-grid" aria-label="Kategorie bazy wiedzy">{SEO_CATEGORIES.map((category) => { const count = pagesForCategory(category.label).length; return <a className="knowledge-category-card" key={category.slug} href={`/${category.slug}`}><small>{count} {count === 1 ? "poradnik" : "poradniki"}</small><h2>{category.heading}</h2><p>{category.description}</p><span>Zobacz kategorię</span></a>; })}</section>
      <SeoFooter />
    </main>
  );
}
