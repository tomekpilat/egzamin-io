/* eslint-disable @next/next/no-html-link-for-pages -- Full-page anchors avoid a Vinext production navigation failure. */

import { ArrowRight, BookOpenCheck, CalendarDays, CheckCircle2, ExternalLink, Info, LibraryBig } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type SeoPage, pagesForCategory, relatedSeoPages } from "@/lib/seo-pages";

function JsonLd({ value }: { value: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(value).replace(/</g, "\\u003c") }} />;
}

export function SeoHeader() {
  return <SiteHeader currentPath="/baza-wiedzy" />;
}

export function SeoFooter() {
  return (
    <footer className="knowledge-footer"><a href="/"><BrandLogo /></a><div><a href="/baza-wiedzy">Baza wiedzy</a><a href="/polityka-prywatnosci">Polityka prywatności</a><a href="mailto:kontakt@egzamin.io">Kontakt</a></div><small>© 2026 egzaminio · Niezależny projekt edukacyjny, niepowiązany z CKE.</small></footer>
  );
}

export function SeoContentPage({ page }: { page: SeoPage }) {
  const related = relatedSeoPages(page);
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.heading,
    description: page.description,
    dateModified: "2026-08-25",
    datePublished: "2026-08-25",
    inLanguage: "pl-PL",
    author: { "@type": "Organization", name: "egzaminio", url: "https://egzamin.io" },
    publisher: { "@type": "Organization", name: "egzaminio", url: "https://egzamin.io" },
    mainEntityOfPage: `https://egzamin.io${page.path}`,
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Strona główna", item: "https://egzamin.io" },
      { "@type": "ListItem", position: 2, name: "Baza wiedzy", item: "https://egzamin.io/baza-wiedzy" },
      { "@type": "ListItem", position: 3, name: page.heading, item: `https://egzamin.io${page.path}` },
    ],
  };
  const faqJsonLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: page.faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })) };

  return (
    <main className="knowledge-page">
      <JsonLd value={articleJsonLd} /><JsonLd value={breadcrumbJsonLd} /><JsonLd value={faqJsonLd} />
      <SeoHeader />
      <article className="mathjax_process">
        <nav className="knowledge-breadcrumbs" aria-label="Okruszki"><a href="/">Strona główna</a><span>/</span><a href="/baza-wiedzy">Baza wiedzy</a><span>/</span><span>{page.category}</span></nav>
        <header className="knowledge-hero">
          <div><Badge variant="secondary">{page.eyebrow}</Badge><h1>{page.heading}</h1><p>{page.lead}</p><div className="knowledge-updated"><CalendarDays aria-hidden="true" /> Zaktualizowano {page.updatedAt}</div></div>
          <div className="knowledge-facts" aria-label="Najważniejsze liczby">{page.facts.map((fact) => <div key={fact.label}><b>{fact.value}</b><span>{fact.label}</span></div>)}</div>
        </header>

        <div className="knowledge-layout">
          <div className="knowledge-content">
            {page.sections.map((section) => (
              <section key={section.title} className="knowledge-section">
                <h2>{section.title}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.bullets && <ul>{section.bullets.map((bullet) => <li key={bullet}><CheckCircle2 aria-hidden="true" /><span>{bullet}</span></li>)}</ul>}
                {section.example && <Card className="knowledge-example"><CardHeader><Badge variant="outline">Przykład</Badge><CardTitle>{section.example.prompt}</CardTitle></CardHeader><CardContent><ol>{section.example.steps.map((step) => <li key={step}>{step}</li>)}</ol><b>{section.example.answer}</b></CardContent></Card>}
                {section.note && <aside className="knowledge-note"><Info aria-hidden="true" /><p>{section.note}</p></aside>}
              </section>
            ))}

            <section className="knowledge-faq" aria-labelledby="knowledge-faq-title"><h2 id="knowledge-faq-title">Najczęstsze pytania</h2>{page.faqs.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</section>
            <section className="knowledge-sources" aria-labelledby="knowledge-sources-title"><h2 id="knowledge-sources-title">Źródła</h2><p>Informacje zmienne w czasie sprawdzamy w dokumentach instytucji odpowiedzialnych za egzamin i rekrutację.</p><ul>{page.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label}<ExternalLink aria-hidden="true" /></a></li>)}</ul></section>
          </div>

          <aside className="knowledge-aside">
            <Card className="knowledge-cta"><CardHeader><BookOpenCheck aria-hidden="true" /><CardTitle>{page.cta.title}</CardTitle></CardHeader><CardContent><p>{page.cta.body}</p><Button asChild><a href={page.cta.href}>{page.cta.label}<ArrowRight aria-hidden="true" /></a></Button></CardContent></Card>
            {related.length > 0 && <nav className="knowledge-related" aria-label="Powiązane poradniki"><b>Przeczytaj również</b>{related.map((item) => <a key={item.path} href={item.path}>{item.heading}<ArrowRight aria-hidden="true" /></a>)}</nav>}
          </aside>
        </div>
      </article>
      <SeoFooter />
    </main>
  );
}

export function SeoCategoryPage({ category }: { category: { slug: string; label: SeoPage["category"]; heading: string; description: string } }) {
  const pages = pagesForCategory(category.label);
  return (
    <main className="knowledge-page knowledge-index-page">
      <SeoHeader />
      <section className="knowledge-index-hero"><Badge variant="secondary"><LibraryBig aria-hidden="true" /> {category.label}</Badge><h1>{category.heading}</h1><p>{category.description}</p></section>
      <section className="knowledge-index-grid" aria-label={`Poradniki: ${category.label}`}>{pages.map((page) => <Card key={page.path}><CardHeader><Badge variant="outline">{page.category}</Badge><CardTitle>{page.heading}</CardTitle></CardHeader><CardContent><p>{page.description}</p><Button variant="ghost" asChild><a href={page.path}>Czytaj poradnik <ArrowRight aria-hidden="true" /></a></Button></CardContent></Card>)}</section>
      <SeoFooter />
    </main>
  );
}
