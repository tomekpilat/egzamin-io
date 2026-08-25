"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Full-page anchors avoid a Vinext production navigation failure. */

import Image from "next/image";
import { useState } from "react";
import { Lightbulb, MessageCircleQuestion, PencilLine } from "lucide-react";
import { ArrowRight, Calculator, Target } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { MarketingSignupForm } from "@/components/marketing-signup-form";
import { MathFormula } from "@/components/math-formula";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { SUBJECT_CATEGORIES, SubjectIcon } from "@/components/subject-icon";
import { calculatePlusEconomics, formatPln, PLAN_COMPARISON_ROWS, PLUS_ANNUAL_PRICE_PLN } from "@/lib/plans";

const plusEconomics = calculatePlusEconomics();

export default function Home() {
  const [selectedAnswer, setSelectedAnswer] = useState("B");
  const [hintExpanded, setHintExpanded] = useState(false);
  const [demoReply, setDemoReply] = useState("6² to 36, a 8² to 64. Razem dają 100. Teraz szukamy liczby, której kwadrat to 100.");

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="/" aria-label="egzaminio — strona główna"><BrandLogo /></a>
        <nav className="desktop-nav" aria-label="Główna nawigacja"><a href="/kalkulator-punktow">Kalkulator</a><a href="/baza-wiedzy">Baza wiedzy</a><a href="#dla-rodzica">Dla rodzica</a><a href="#dostep">Plany</a></nav>
        <div className="header-actions"><ThemeToggle /><a className="header-login" href="/logowanie">Zaloguj się</a><Button variant="outline" className="header-cta" asChild><a href="/logowanie?tryb=rejestracja">Załóż konto</a></Button></div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span /> Przygotowanie do egzaminu ósmoklasisty</div>
          <h1>Egzamin bez paniki.<br /><em>Krok po kroku.</em></h1>
          <p className="hero-lead">Zadania CKE i nauczyciel AI, który tłumaczy dokładnie ten krok, na którym uczeń utknął.</p>
          <div className="hero-actions"><Button size="lg" className="primary-action" asChild><a href="/logowanie?tryb=rejestracja">Wypróbuj za darmo <span>→</span></a></Button><a className="text-action" href="#jak-to-dziala">Zobacz jak działa <span>↓</span></a></div>
          <div className="hero-trust"><span className="trust-avatars"><i>K</i><i>M</i><i>A</i></span><span><b>Start bez opłat</b><br />3 pytania do AI dziennie</span></div>
        </div>

        <div className="product-stage" aria-label="Podgląd ćwiczenia w aplikacji egzaminio">
          <div className="stage-glow" />
          <div className="product-window">
            <div className="window-bar"><span className="mini-brand"><BrandLogo compact /></span><span className="lesson-count">Zadanie 2 z 6</span><span className="mini-avatar">KN</span></div>
            <div className="product-body">
              <section className="task-preview">
                <div className="task-meta"><span>CKE</span> Matematyka · maj 2025</div>
                <h2>Trójkąt prostokątny ma boki 6 cm i 8 cm. Ile ma przeciwprostokątna?</h2>
                <MathFormula latex="x=\\sqrt{6^2+8^2}" display className="task-formula" />
                <div className="triangle-figure" aria-hidden="true"><div className="triangle-shape" /><span className="side-six">6 cm</span><span className="side-eight">8 cm</span><span className="side-x">x</span></div>
                <div className="answers" aria-label="Przykładowe odpowiedzi">
                  {["A|7 cm", "B|10 cm", "C|12 cm", "D|14 cm"].map((answer) => {
                    const [letter, value] = answer.split("|");
                    return <Button variant="outline" type="button" key={letter} className={selectedAnswer === letter ? "chosen" : ""} aria-pressed={selectedAnswer === letter} onClick={() => setSelectedAnswer(letter)}>{letter}&nbsp; {value}</Button>;
                  })}
                </div>
              </section>
              <aside className="ai-preview">
                <div className="ai-title"><span>AI</span><div><b>Nauczyciel obok</b><small>Wyjaśnia, nie wyręcza</small></div></div>
                <div className="ai-message" aria-live="polite"><b>{hintExpanded ? "Jeszcze jeden krok" : "Mała podpowiedź"}</b>{hintExpanded ? "Skorzystaj z twierdzenia Pitagorasa: suma kwadratów krótszych boków daje kwadrat przeciwprostokątnej." : "Jaki wzór łączy trzy boki trójkąta prostokątnego?"}</div>
                <Button variant="outline" type="button" className="ai-suggestion" onClick={() => setHintExpanded((value) => !value)}>{hintExpanded ? "Wróć" : "Nie pamiętam wzoru"}</Button>
                <div className="ai-limit"><b>3</b> darmowe pytania dziennie</div>
              </aside>
            </div>
          </div>
          <div className="streak-card"><span>🔥</span><div><b>5 dni z rzędu</b><small>Dobry rytm, Kuba!</small></div></div>
          <div className="progress-card"><b>68%</b><span>celu tygodniowego</span></div>
        </div>
      </section>

      <section className="subject-strip" aria-label="Zakres przygotowań">
        {SUBJECT_CATEGORIES.map((category) => <div className="subject-category" key={category.key}><SubjectIcon subject={category.key} /><span>{category.label}</span></div>)}
      </section>

      <section className="recruitment-hook" aria-labelledby="recruitment-hook-title">
        <div className="recruitment-hook-icon"><Calculator aria-hidden="true" /></div>
        <div className="recruitment-hook-copy"><span className="section-kicker">Darmowy kalkulator</span><h2 id="recruitment-hook-title">Ile masz punktów do liceum?</h2><p>Policz wynik do 200 punktów i porównaj go z progiem wybranej klasy. Bez logowania.</p></div>
        <div className="recruitment-hook-example" aria-hidden="true"><span><Target /></span><div><small>Przykład</small><b>151 / 200 pkt</b></div></div>
        <Button size="lg" className="recruitment-hook-action" asChild><a href="/kalkulator-punktow">Policz swoje punkty <ArrowRight aria-hidden="true" /></a></Button>
      </section>

      <section className="section how-section" id="jak-to-dziala">
        <div className="section-heading"><span className="section-kicker">Jak to działa</span><h2>Zadanie. Podpowiedź. Zrozumienie.</h2></div>
        <div className="steps-grid">
          <Card className="step-card step-coral"><div className="step-icon"><PencilLine aria-hidden="true" /></div><h3>Rozwiązujesz</h3><p>Prawdziwe zadanie z arkusza CKE.</p></Card>
          <Card className="step-card step-navy"><div className="step-icon"><MessageCircleQuestion aria-hidden="true" /></div><h3>Pytasz</h3><p>AI pomaga dokładnie tam, gdzie utkniesz.</p></Card>
          <Card className="step-card step-mint"><div className="step-icon"><Lightbulb aria-hidden="true" /></div><h3>Rozumiesz</h3><p>Wracasz do zadania i kończysz je samodzielnie.</p></Card>
        </div>
      </section>

      <section className="explain-section">
        <div className="explain-demo">
          <div className="demo-question"><span>Ty</span><p>Skąd wzięło się 100?</p></div>
          <div className="demo-answer"><span className="demo-ai">AI</span><div><b>Spójrzmy tylko na ten krok.</b><p aria-live="polite">{demoReply}</p></div></div>
          <div className="demo-chips"><Button variant="outline" type="button" onClick={() => setDemoReply("Pierwiastek odwraca podnoszenie do kwadratu. Skoro x² = 100, to x = 10.")}>Pokaż dalej</Button><Button variant="outline" type="button" onClick={() => setDemoReply("6² oznacza 6 · 6, czyli 36. Mała dwójka mówi: pomnóż liczbę przez samą siebie.")}>Co oznacza ²?</Button></div>
        </div>
        <div className="explain-copy"><span className="section-kicker">Pomoc bez gotowca</span><h2>Uczeń pyta własnymi słowami.</h2><ul><li><span>✓</span> Podpowiedzi zamiast odpowiedzi</li><li><span>✓</span> Język dla ósmoklasisty</li><li><span>✓</span> Dalsze pytania do jednego zadania</li></ul></div>
      </section>

      <section className="family-story" id="dla-rodzica" aria-labelledby="family-story-title">
        <Image src="/rodzic-i-uczen-nauka.png" width={1536} height={1024} sizes="(max-width: 900px) 100vw, 1120px" alt="Uczeń pracuje nad zadaniem przy wsparciu rodzica" />
        <div className="family-story-copy"><span className="section-kicker">Panel rodzica</span><h2 id="family-story-title">Wspieraj rytm, nie kontroluj rozmów.</h2><p>Ustaw cel tygodniowy, zatwierdź konto dziecka i włącz raport e-mail. Treść rozmów z AI pozostaje prywatna.</p><div className="family-actions"><Button variant="secondary" asChild><a href="/logowanie?tryb=rejestracja&rola=rodzic">Załóż konto rodzica</a></Button><Button variant="outline" asChild><a href="/bezpieczenstwo-dzieci-ai">Jak chronimy dzieci</a></Button></div></div>
      </section>

      <section className="section pricing-section" id="dostep">
        <div className="section-heading"><span className="section-kicker">Proste plany</span><h2>Free na start. Plus do regularnej nauki.</h2><p>{PLUS_ANNUAL_PRICE_PLN} zł rocznie to {formatPln(plusEconomics.monthly)} zł miesięcznie lub około {Math.round(plusEconomics.daily * 100)} gr dziennie.</p></div>
        <Card className="pricing-table-card">
          <div className="pricing-table-head"><span>Porównanie</span><div><b>Free</b><small>0 zł</small></div><div className="plus-heading"><b>Plus</b><small>119 zł / rok</small></div></div>
          <div className="pricing-table" role="table" aria-label="Porównanie planu Free i Plus">{PLAN_COMPARISON_ROWS.map(([feature, free, plus]) => <div className="pricing-row" role="row" key={feature}><b role="rowheader">{feature}</b><span role="cell">{free}</span><span role="cell">{plus}</span></div>)}</div>
          <div className="pricing-value"><b>Czy Plus się opłaca?</b><span>Przy 3 sesjach tygodniowo koszt jednej sesji to około {Math.round(plusEconomics.perSession * 100)} gr.</span></div>
          <div className="pricing-actions"><Button asChild><a href="/logowanie?tryb=rejestracja">Zacznij za darmo</a></Button><Button variant="outline" asChild><a href="/plan-plus" data-analytics-event="plan_plus_cta_clicked">Poznaj plan Plus</a></Button></div>
          <MarketingSignupForm subscriptionType="plus_waitlist" sourcePath="/" title="Powiadom mnie o starcie Plus" description="Zostaw e-mail. Napiszemy, gdy sprzedaż ruszy — bez zakładania konta." submitLabel="Dołącz do listy" compact />
        </Card>
      </section>

      <footer className="site-footer"><a className="brand" href="/" aria-label="egzaminio — strona główna"><BrandLogo /></a><p>Ćwiczenia CKE, które naprawdę tłumaczą.</p><div><a href="/kalkulator-punktow">Kalkulator punktów</a><a href="/baza-wiedzy">Baza wiedzy</a><a href="/logowanie">Logowanie</a><a href="/informacje-prawne">Informacje prawne</a><a href="/bezpieczenstwo-dzieci-ai">Dzieci i AI</a><a href="mailto:kontakt@egzamin.io">Kontakt</a></div><small>© 2026 egzaminio · Niezależny projekt edukacyjny, niepowiązany z CKE.</small></footer>
    </main>
  );
}
