/* eslint-disable @next/next/no-html-link-for-pages -- Full-page anchors avoid a Vinext production navigation failure. */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, ExternalLink, FileCheck2 } from "lucide-react";
import { SeoFooter, SeoHeader } from "@/components/seo-content-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CKE_SUBJECT_LABELS, getPublicCkeSeoPage, scoringSummary } from "@/lib/cke-seo";

type Params = { year: string; subject: string; session: string; paper: string; number: string };
type RouteProps = { params: Promise<Params> };

function canonicalPath(params: Params) {
  return `/arkusze/${params.year}/${params.subject}/${params.session}/${params.paper}/zadanie/${params.number}`;
}

function jsonLd(value: object) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function answerLabel(answerKey: Record<string, unknown>, options: string[]) {
  const index = answerKey.correct_index;
  if (typeof index === "number" && options[index]) return `${String.fromCharCode(65 + index)}. ${options[index]}`;
  const accepted = answerKey.accepted_answers;
  if (Array.isArray(accepted)) return accepted.join("; ");
  if (typeof answerKey.answer === "string") return answerKey.answer;
  return "Zobacz kryteria punktowania poniżej.";
}

function scoringLines(scoring: Record<string, unknown>) {
  const criteria = scoring.criteria;
  if (Array.isArray(criteria)) return criteria.map((item) => typeof item === "string" ? item : JSON.stringify(item));
  return Object.entries(scoring).map(([key, value]) => `${key.replaceAll("_", " ")}: ${typeof value === "string" || typeof value === "number" ? value : JSON.stringify(value)}`);
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const resolved = await params;
  const path = canonicalPath(resolved);
  const page = await getPublicCkeSeoPage(path);
  if (!page) return { title: "Zadanie niedostępne — egzaminio", robots: { index: false, follow: false } };

  const subject = CKE_SUBJECT_LABELS[page.subject];
  const title = `Egzamin ósmoklasisty ${page.exam_year} ${subject} — zadanie ${page.question_number}`;
  const description = `Zadanie ${page.question_number} z arkusza CKE ${page.exam_year}: rozwiązanie krok po kroku, odpowiedź, punktacja i typowe błędy.`;
  return {
    title,
    description,
    alternates: { canonical: page.canonical_path },
    openGraph: { title, description, type: "article", locale: "pl_PL", url: page.canonical_path, images: [] },
    twitter: { card: "summary", title, description, images: [] },
  };
}

export default async function CkeSolutionPage({ params }: RouteProps) {
  const resolved = await params;
  const page = await getPublicCkeSeoPage(canonicalPath(resolved));
  if (!page) notFound();

  const subject = CKE_SUBJECT_LABELS[page.subject];
  const session = page.exam_session === "main" ? "termin główny" : "termin dodatkowy";
  const answer = answerLabel(page.answer_key, page.answer_options);
  const criteria = scoringLines(page.scoring);
  const title = `${subject} ${page.exam_year} — zadanie ${page.question_number}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    dateModified: page.updated_at,
    inLanguage: "pl-PL",
    mainEntityOfPage: `https://egzamin.io${page.canonical_path}`,
    author: { "@type": "Organization", name: "egzaminio" },
    isBasedOn: page.source_url,
  };

  return (
    <main className="knowledge-page cke-solution-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
      <SeoHeader />
      <article className="mathjax_process">
        <nav className="knowledge-breadcrumbs" aria-label="Okruszki"><a href="/">Strona główna</a><span>/</span><a href="/arkusze">Arkusze</a><span>/</span><span>Zadanie {page.question_number}</span></nav>
        <header className="knowledge-hero cke-solution-hero">
          <div><Badge variant="secondary">CKE · {page.exam_year} · {session}</Badge><h1>{title}</h1><p>{page.topic}. Pełne, ręcznie zweryfikowane rozwiązanie zgodne z opublikowanym kluczem.</p></div>
          <div className="knowledge-facts"><div><b>{page.question_number}</b><span>numer zadania</span></div><div><b>{page.source_page_from === page.source_page_to ? page.source_page_from : `${page.source_page_from}–${page.source_page_to}`}</b><span>strona arkusza</span></div><div><b>CKE</b><span>źródło</span></div></div>
        </header>

        <div className="knowledge-layout">
          <div className="knowledge-content">
            <section className="knowledge-section"><h2>Treść zadania</h2><div className="cke-prompt">{page.prompt_markdown}</div>{page.answer_options.length > 0 && <ol className="cke-options">{page.answer_options.map((option, index) => <li key={`${index}-${option}`}><b>{String.fromCharCode(65 + index)}</b><span>{option}</span></li>)}</ol>}</section>
            <section className="knowledge-section"><h2>Rozwiązanie krok po kroku</h2><div className="cke-explanation">{page.explanation}</div><Card className="knowledge-example"><CardHeader><Badge variant="outline">Odpowiedź</Badge><CardTitle>{answer}</CardTitle></CardHeader></Card></section>
            <section className="knowledge-section"><h2>Kryteria punktowania</h2><p>{scoringSummary(page.scoring)}</p><ul>{criteria.map((line) => <li key={line}><CheckCircle2 aria-hidden="true" /><span>{line}</span></li>)}</ul></section>
            <section className="knowledge-section"><h2>Typowe błędy</h2><ul>{page.common_mistakes.map((mistake) => <li key={mistake}><CheckCircle2 aria-hidden="true" /><span>{mistake}</span></li>)}</ul></section>
            <section className="knowledge-sources"><h2>Źródło</h2><p>{page.source_label}, strony {page.source_page_from === page.source_page_to ? page.source_page_from : `${page.source_page_from}–${page.source_page_to}`}.</p><a href={page.source_url} target="_blank" rel="noreferrer">Otwórz dokument źródłowy CKE <ExternalLink aria-hidden="true" /></a></section>
          </div>
          <aside className="knowledge-aside"><Card className="knowledge-cta"><CardHeader><FileCheck2 aria-hidden="true" /><CardTitle>Rozwiąż zadanie samodzielnie</CardTitle></CardHeader><CardContent><p>W aplikacji możesz najpierw podać własną odpowiedź, a dopiero potem zobaczyć wyjaśnienie i zapytać AI o konkretny krok.</p><Button asChild><a href="/logowanie?tryb=rejestracja&rola=uczen">Przejdź do ćwiczeń <ArrowRight aria-hidden="true" /></a></Button></CardContent></Card><nav className="knowledge-related" aria-label="Powiązany temat"><b>Powiązany temat</b><a href={`/${page.subject === "mathematics" ? "matematyka" : page.subject === "polish" ? "jezyk-polski" : "jezyk-angielski"}`}>{page.related_topic}<ArrowRight aria-hidden="true" /></a></nav></aside>
        </div>
      </article>
      <SeoFooter />
    </main>
  );
}
