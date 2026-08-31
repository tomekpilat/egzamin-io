/* eslint-disable @next/next/no-html-link-for-pages -- Full-page anchors avoid a Vinext production navigation failure. */

import { ArticleReadingProgress, ArticleTableOfContents } from "@/components/knowledge-article-navigation";
import { BrandLogo } from "@/components/brand-logo";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { SEO_CATEGORIES, type SeoPage, pagesForCategory, relatedSeoPages } from "@/lib/seo-pages";

function JsonLd({ value }: { value: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(value).replace(/</g, "\\u003c") }} />;
}

function sectionId(title: string) {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function readingTime(page: SeoPage) {
  const words = [page.lead, ...page.sections.flatMap((section) => [section.title, ...section.paragraphs, ...(section.bullets ?? [])]), ...page.faqs.flatMap((faq) => [faq.question, faq.answer])]
    .join(" ")
    .trim()
    .split(/\s+/).length;
  return Math.max(4, Math.ceil(words / 180));
}

function categoryHref(page: SeoPage) {
  if (page.category === "Arkusze") return "/arkusze";
  return `/${SEO_CATEGORIES.find((category) => category.label === page.category)?.slug ?? "baza-wiedzy"}`;
}

export function SeoHeader() {
  return <SiteHeader currentPath="/baza-wiedzy" />;
}

export function SeoFooter() {
  return (
    <footer className="knowledge-footer"><a href="/"><BrandLogo /></a><div><a href="/baza-wiedzy">Baza wiedzy</a><a href="/polityka-prywatnosci">Polityka prywatności</a><a href="mailto:kontakt@egzaminio.io">Kontakt</a></div><small>© 2026 egzaminio · Tomasz Piłat · Niezależny projekt edukacyjny, niepowiązany z CKE.</small></footer>
  );
}

export function SeoContentPage({ page }: { page: SeoPage }) {
  const related = relatedSeoPages(page);
  const categoryUrl = categoryHref(page);
  const timeToRead = readingTime(page);
  const tableOfContents = [
    ...page.sections.map((section) => ({ id: sectionId(section.title), label: section.title })),
    { id: "najczestsze-pytania", label: "Najczęstsze pytania" },
    { id: "zrodla", label: "Źródła" },
  ];
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
    <main className="knowledge-page knowledge-article-page">
      <JsonLd value={articleJsonLd} /><JsonLd value={breadcrumbJsonLd} /><JsonLd value={faqJsonLd} />
      <SeoHeader />
      <ArticleReadingProgress />

      <article className="knowledge-article-shell mathjax_process">
        <div className="knowledge-article-main">
          <nav className="knowledge-breadcrumbs knowledge-article-breadcrumbs" aria-label="Okruszki">
            <a href="/">Strona główna</a><span aria-hidden="true">/</span><a href="/baza-wiedzy">Baza wiedzy</a><span aria-hidden="true">/</span><a href={categoryUrl}>{page.category}</a>
          </nav>

          <header className="knowledge-article-hero">
            <span className="knowledge-article-eyebrow">{page.eyebrow}</span>
            <h1>{page.heading}</h1>
            <p>{page.lead}</p>
            <div className="knowledge-article-meta">
              <span>Zaktualizowano {page.updatedAt}</span><i aria-hidden="true">·</i><span>{timeToRead} min czytania</span><i aria-hidden="true">·</i><span>Klasa 8</span>
            </div>
          </header>

          <div className="knowledge-article-facts" aria-label="Najważniejsze informacje">
            {page.facts.map((fact) => <div key={fact.label}><b>{fact.value}</b><span>{fact.label}</span></div>)}
          </div>

          <div className="knowledge-article-content">
            {page.sections.map((section) => (
              <section id={sectionId(section.title)} key={section.title} className="knowledge-article-section">
                <h2>{section.title}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.bullets && <ol className="knowledge-article-steps">{section.bullets.map((bullet, index) => <li key={bullet}><span aria-hidden="true">{index + 1}</span><p>{bullet}</p></li>)}</ol>}
                {section.example && <div className="knowledge-article-example">
                  <header><span>Przykład</span><b>{section.example.prompt}</b></header>
                  <div>{section.example.steps.map((step, index) => <p key={step}><span>{index + 1}.</span><b>{step}</b></p>)}<strong>{section.example.answer}</strong></div>
                </div>}
                {section.note && <aside className="knowledge-article-note"><p>{section.note}</p></aside>}
              </section>
            ))}

            <section id="najczestsze-pytania" className="knowledge-article-section knowledge-article-faq" aria-labelledby="knowledge-faq-title">
              <h2 id="knowledge-faq-title">Najczęstsze pytania</h2>
              <div>{page.faqs.map((faq) => <article key={faq.question}><h3>{faq.question}</h3><p>{faq.answer}</p></article>)}</div>
            </section>

            <section id="zrodla" className="knowledge-article-section knowledge-article-sources" aria-labelledby="knowledge-sources-title">
              <h2 id="knowledge-sources-title">Źródła</h2>
              <p>Informacje zmienne w czasie sprawdzamy w dokumentach instytucji odpowiedzialnych za egzamin i rekrutację.</p>
              <div>{page.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer"><span>{source.label}</span><i aria-hidden="true">↗</i></a>)}</div>
            </section>

            <aside className="knowledge-article-cta">
              <div><h2>{page.cta.title}</h2><p>{page.cta.body}</p></div>
              <Button asChild><a href={page.cta.href}>{page.cta.label}</a></Button>
            </aside>

            {related.length > 0 && <nav className="knowledge-article-related" aria-label="Powiązane poradniki">
              <b>Przeczytaj również</b>
              <div>{related.map((item) => <a key={item.path} href={item.path}><span><small>{item.eyebrow}</small><strong>{item.heading}</strong></span><i aria-hidden="true">→</i></a>)}</div>
            </nav>}
          </div>
        </div>

        <aside className="knowledge-article-aside">
          <ArticleTableOfContents items={tableOfContents} />
          <div className="knowledge-article-practice"><b>Sprawdź się w zadaniach</b><p>{page.cta.body}</p><Button variant="outline" asChild><a href={page.cta.href}>{page.cta.label}</a></Button></div>
          <div className="knowledge-article-freshness"><b>Aktualność treści</b><p>Terminy i zasady sprawdzamy w dokumentach CKE i MEN. Ostatni przegląd: {page.updatedAt}.</p></div>
        </aside>
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
      <section className="knowledge-index-hero"><span className="knowledge-eyebrow">{category.label}</span><h1>{category.heading}</h1><p>{category.description}</p></section>
      <section className="knowledge-index-grid" aria-label={`Poradniki: ${category.label}`}>{pages.map((page) => <a className="knowledge-category-card" key={page.path} href={page.path}><small>{page.category}</small><h2>{page.heading}</h2><p>{page.description}</p><span>Czytaj poradnik</span></a>)}</section>
      <SeoFooter />
    </main>
  );
}
