import type { Metadata } from "next";
import { KnowledgeBaseIndex } from "@/components/knowledge-base-index";
import { SeoFooter, SeoHeader } from "@/components/seo-content-page";

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
      <KnowledgeBaseIndex />
      <SeoFooter />
    </main>
  );
}
