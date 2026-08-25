import type { Metadata } from "next";
import { ArrowRight, LibraryBig } from "lucide-react";
import { SeoFooter, SeoHeader } from "@/components/seo-content-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <section className="knowledge-index-hero"><Badge variant="secondary"><LibraryBig aria-hidden="true" /> Baza wiedzy egzaminio</Badge><h1>Konkretna odpowiedź. Potem ćwiczenie.</h1><p>Aktualne terminy i zasady sprawdzamy w źródłach CKE oraz MEN. Tematy przedmiotowe wyjaśniamy na przykładach, bez gotowców do skopiowania.</p></section>
      <section className="knowledge-category-grid" aria-label="Kategorie bazy wiedzy">{SEO_CATEGORIES.map((category) => { const count = pagesForCategory(category.label).length; return <Card key={category.slug}><CardHeader><Badge variant="outline">{count} {count === 1 ? "poradnik" : "poradniki"}</Badge><CardTitle>{category.heading}</CardTitle></CardHeader><CardContent><p>{category.description}</p><Button variant="ghost" asChild><a href={`/${category.slug}`}>Zobacz kategorię <ArrowRight aria-hidden="true" /></a></Button></CardContent></Card>; })}</section>
      <SeoFooter />
    </main>
  );
}
