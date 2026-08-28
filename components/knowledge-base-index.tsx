"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Full-page anchors avoid a Vinext production navigation failure. */

import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { SEO_CATEGORIES, pagesForCategory } from "@/lib/seo-pages";

type KnowledgeFilter = "all" | (typeof SEO_CATEGORIES)[number]["slug"];
type KnowledgeCategory = (typeof SEO_CATEGORIES)[number]["slug"];

const categoryEntries = SEO_CATEGORIES.map((category) => ({
  ...category,
  pages: pagesForCategory(category.label),
}));
const articleCount = categoryEntries.reduce((sum, category) => sum + category.pages.length, 0);
const updatedAt = categoryEntries.flatMap((category) => category.pages)[0]?.updatedAt ?? "25 sierpnia 2026";

function articleLabel(count: number) {
  if (count === 1) return "poradnik";
  if (count > 1 && count < 5) return "poradniki";
  return "poradników";
}

export function KnowledgeBaseIndex() {
  const [filter, setFilter] = useState<KnowledgeFilter>("all");
  const [expandedCategory, setExpandedCategory] = useState<KnowledgeCategory | "">(categoryEntries[0]?.slug ?? "");
  const visibleCategories = filter === "all" ? categoryEntries : categoryEntries.filter((category) => category.slug === filter);

  function selectFilter(nextFilter: KnowledgeFilter) {
    setFilter(nextFilter);
    if (nextFilter !== "all") setExpandedCategory(nextFilter);
  }

  return <>
    <section className="knowledge-list-hero">
      <div className="knowledge-list-container">
        <span className="knowledge-list-eyebrow">Baza wiedzy egzaminio</span>
        <h1>Konkretna odpowiedź. Potem ćwiczenie.</h1>
        <p>Aktualne terminy i zasady sprawdzamy w źródłach CKE oraz MEN. Tematy przedmiotowe wyjaśniamy na przykładach, bez gotowców do skopiowania.</p>
        <div className="knowledge-list-meta" aria-label="Informacje o bazie wiedzy"><span>{articleCount} poradników</span><i aria-hidden="true">·</i><span>{categoryEntries.length} kategorii</span><i aria-hidden="true">·</i><span>Ostatnia aktualizacja {updatedAt}</span></div>
      </div>
    </section>

    <div className="knowledge-list-container knowledge-list-body">
      <nav className="knowledge-filter" aria-label="Filtruj poradniki">
        <Button type="button" size="sm" variant={filter === "all" ? "default" : "outline"} aria-pressed={filter === "all"} onClick={() => selectFilter("all")}>Wszystkie</Button>
        {categoryEntries.map((category) => <Button key={category.slug} type="button" size="sm" variant={filter === category.slug ? "default" : "outline"} aria-pressed={filter === category.slug} onClick={() => selectFilter(category.slug)}>{category.label} · {category.pages.length}</Button>)}
      </nav>

      <Accordion className="knowledge-list-sections" type="single" collapsible value={expandedCategory} onValueChange={(value) => setExpandedCategory(value as KnowledgeCategory | "")} aria-live="polite">
        {visibleCategories.map((category) => <AccordionItem className="knowledge-list-section" value={category.slug} key={category.slug}>
          <AccordionTrigger className="knowledge-category-trigger" headingLabel={category.heading}>
            <span><span className="knowledge-category-title" id={`knowledge-category-${category.slug}`}>{category.heading}</span><p>{category.description}</p></span>
            <small>{category.pages.length} {articleLabel(category.pages.length)}</small>
          </AccordionTrigger>
          <AccordionContent className="knowledge-category-content">
            <div className="knowledge-category-actions"><span>{category.pages.length} {articleLabel(category.pages.length)} w tej kategorii</span><a href={`/${category.slug}`}>Zobacz kategorię <i aria-hidden="true">→</i></a></div>
            <div className="knowledge-list-grid">
              {category.pages.map((page) => <a className={`knowledge-list-card${page.path === "/matematyka/twierdzenie-pitagorasa-zadania" ? " is-featured" : ""}`} key={page.path} href={page.path}>
                <small>{page.eyebrow}</small>
                <h3>{page.heading}</h3>
                <p>{page.description}</p>
                <span>Czytaj poradnik <i aria-hidden="true">→</i></span>
              </a>)}
            </div>
          </AccordionContent>
        </AccordionItem>)}
      </Accordion>

      <aside className="knowledge-list-cta">
        <div><h2>Wiedza to połowa punktów</h2><p>Druga połowa to arkusze CKE rozwiązane z wyjaśnieniem każdego kroku.</p></div>
        <Button asChild><a href="/logowanie?tryb=rejestracja&rola=uczen">Rozwiąż zadania</a></Button>
      </aside>
    </div>
  </>;
}
