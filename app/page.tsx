"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Full-page anchors avoid a Vinext production navigation failure. */

import Image from "next/image";
import { useState } from "react";
import { Calculator, CalendarDays, Check, CircleCheck, EyeOff, FileText, ListChecks, MessageCircleQuestion } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SubjectIcon } from "@/components/subject-icon";
import { Button } from "@/components/ui/button";
import { PLUS_PACKAGE_PRICE_PLN } from "@/lib/plans";

const FREE_FEATURES = [
  "Wybrane zadania z arkuszy",
  "3 pytania do tutora AI dziennie",
  "Cel tygodniowy dla rodzica",
] as const;

const PLUS_FEATURES = [
  "Pełna baza arkuszy 2019–2025",
  "50 pytań do tutora AI dziennie",
  "Raporty, trendy i rekomendacje",
] as const;

export default function Home() {
  const [selectedAnswer, setSelectedAnswer] = useState("B");

  return (
    <main className="design-home design-home-simple">
      <SiteHeader currentPath="/" />

      <section className="design-home-hero">
        <div className="design-home-container design-home-hero-grid">
          <div className="design-home-hero-copy">
            <span className="design-eyebrow">Egzamin ósmoklasisty</span>
            <h1>Prawdziwe zadania CKE i pomoc dokładnie tam, gdzie się zacięło</h1>
            <div className="design-home-actions">
              <Button size="lg" asChild><a href="/logowanie?tryb=rejestracja&rola=uczen">Zacznij jako uczeń</a></Button>
              <Button size="lg" variant="outline" asChild><a href="#rodzice">Jestem rodzicem</a></Button>
            </div>
            <div className="design-home-trust" aria-label="Najważniejsze zasady">
              <span><FileText aria-hidden="true" />Arkusze CKE 2019–2025</span>
              <span><MessageCircleQuestion aria-hidden="true" />Pomoc bez gotowej odpowiedzi</span>
              <span><EyeOff aria-hidden="true" />Rodzic nie czyta rozmów</span>
            </div>
          </div>
          <div className="design-home-hero-image"><Image src="/uczen-nauka-logowanie.png" width={1536} height={1024} priority sizes="(max-width: 880px) 100vw, 460px" alt="Uczeń przy biurku z arkuszem i laptopem" /></div>
        </div>
      </section>

      <section id="zadania" className="design-home-section">
        <div className="design-home-container design-how-grid">
          <div className="design-how-copy">
            <h2>Rozwiąż → Zapytaj → Zrozum</h2>
            <div className="design-process-list">
              <div><span><FileText aria-hidden="true" /></span><p><strong>Rozwiąż.</strong> Wybierasz rok, przedmiot i arkusz.</p></div>
              <div><span><MessageCircleQuestion aria-hidden="true" /></span><p><strong>Zapytaj.</strong> Wskazówka, kolejny krok albo prostszy przykład.</p></div>
              <div><span><CircleCheck aria-hidden="true" /></span><p><strong>Zrozum.</strong> Widzisz rozwiązanie i pytasz, co poszło nie tak.</p></div>
            </div>
          </div>

          <div className="design-task-preview" aria-label="Podgląd ćwiczenia">
            <div className="design-task-bar"><span>CKE 2024 · Matematyka · zadanie 7</span><span>Zostały 2 z 3 pytań dziś</span></div>
            <div className="design-task-content">
              <p>Trapez ma podstawy o długościach 8 cm i 12 cm oraz wysokość 5 cm. Oblicz pole tego trapezu.</p>
              <div className="design-task-answers" role="radiogroup" aria-label="Przykładowe odpowiedzi">
                {["A|40 cm²", "B|50 cm²", "C|60 cm²"].map((answer) => {
                  const [letter, value] = answer.split("|");
                  const chosen = selectedAnswer === letter;
                  return <button type="button" role="radio" aria-checked={chosen} className={chosen ? "selected" : ""} key={letter} onClick={() => setSelectedAnswer(letter)}><b>{letter}</b><span>{value}</span>{chosen && letter === "B" ? <small>Poprawna</small> : null}</button>;
                })}
              </div>
              <div className="design-ai-hint"><b>Tutor AI</b><span>Najpierw dzielimy sumę podstaw przez 2. Ile wyjdzie?</span></div>
            </div>
          </div>
        </div>
      </section>

      <section id="przedmioty" className="design-home-section design-subjects-section">
        <div className="design-home-container">
          <div className="design-subjects-heading"><span className="design-eyebrow">Przedmioty</span><h2>Ćwiczysz dokładnie to, co pojawia się na egzaminie</h2><p>Matematyka, język polski i wszystkie języki obce dostępne na egzaminie — w zadaniach z arkuszy CKE.</p></div>
          <div className="design-subjects-grid">
            <article><SubjectIcon subject="mathematics" /><b>Matematyka</b><span>Zadania zamknięte i otwarte, obliczenia oraz geometria.</span></article>
            <article><SubjectIcon subject="polish" /><b>Język polski</b><span>Czytanie ze zrozumieniem, język i przygotowanie do wypowiedzi.</span></article>
            <article><SubjectIcon subject="english" /><b>Języki obce</b><span>Język angielski, francuski, hiszpański, niemiecki, rosyjski i włoski.</span></article>
            <article><FileText aria-hidden="true" /><b>Arkusze CKE</b><span>Materiały oznaczone rokiem, sesją i właściwym wariantem ucznia.</span></article>
          </div>
        </div>
      </section>

      <section id="rodzice" className="design-home-section design-home-section-card">
        <div className="design-home-container design-parent-section">
          <h2>Rodzic widzi postęp, nie prywatne rozmowy</h2>
          <div className="design-parent-grid">
            <div><CalendarDays aria-hidden="true" /><b>Regularność</b><span>Ile dni w tygodniu dziecko siadło do zadań.</span></div>
            <div><ListChecks aria-hidden="true" /><b>Tematy do powtórki</b><span>Konkretne zagadnienia z arkuszy.</span></div>
            <div><EyeOff aria-hidden="true" /><b>Czego nie widzisz</b><span>Treści rozmów z tutorem AI.</span></div>
          </div>
          <Button asChild><a href="/logowanie?tryb=rejestracja&rola=rodzic">Załóż konto rodzica</a></Button>
        </div>
      </section>

      <section id="cennik" className="design-home-section">
        <div className="design-home-container design-pricing-section">
          <h2>Free i Plus</h2>
          <div className="design-plan-grid">
            <article className="design-plan-card">
              <header><b>Free</b><strong>0 zł</strong></header>
              <div>{FREE_FEATURES.map((feature) => <span key={feature}><Check aria-hidden="true" />{feature}</span>)}</div>
            </article>
            <article className="design-plan-card design-plan-card-plus">
              <header><b>Plus</b><strong>{PLUS_PACKAGE_PRICE_PLN} zł <small>jednorazowo</small></strong></header>
              <div>{PLUS_FEATURES.map((feature) => <span key={feature}><Check aria-hidden="true" />{feature}</span>)}</div>
            </article>
          </div>
          <p>Plus kupuje rodzic dla wybranego dziecka, bez odnawiania. Godzina korepetycji to zwykle 80–120 zł.</p>
        </div>
      </section>

      <section id="kalkulator" className="design-home-section design-home-section-card">
        <div className="design-home-container design-dual-cta">
          <div><Calculator aria-hidden="true" /><h2>Kalkulator punktów do liceum</h2><p>Bezpłatnie i bez konta. Sprawdź, ile punktów brakuje.</p><Button asChild><a href="/kalkulator-punktow">Policz punkty</a></Button></div>
          <div><CircleCheck aria-hidden="true" /><h2>Zacznij od jednego arkusza</h2><p>Uczeń podaje e-mail rodzica, rodzic zatwierdza konto.</p><Button asChild><a href="/logowanie?tryb=rejestracja&rola=uczen">Zacznij jako uczeń</a></Button></div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
