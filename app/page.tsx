"use client";

import Image from "next/image";
import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { MathFormula } from "@/components/math-formula";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  const [selectedAnswer, setSelectedAnswer] = useState("B");
  const [hintExpanded, setHintExpanded] = useState(false);
  const [demoReply, setDemoReply] = useState("Mamy 6² + 8². To inaczej 36 + 64. Kiedy je dodasz, otrzymasz 100. Chcesz, żebym pokazał też, dlaczego potem wyciągamy pierwiastek?");

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="egzaminio — strona główna">
          <BrandLogo />
        </a>
        <nav className="desktop-nav" aria-label="Główna nawigacja">
          <a href="#jak-to-dziala">Jak to działa</a>
          <a href="#dla-rodzica">Dla rodzica</a>
          <a href="#dostep">Dostęp</a>
        </nav>
        <div className="header-actions">
          <ThemeToggle />
          <a className="header-login" href="/logowanie">Zaloguj się</a>
          <Button variant="outline" className="header-cta" asChild><a href="/logowanie?tryb=rejestracja">Załóż konto</a></Button>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span /> Nowy sposób na egzamin ósmoklasisty</div>
          <h1>Egzamin bez paniki.<br /><em>Krok po kroku.</em></h1>
          <p className="hero-lead">
            Ćwicz na zadaniach z arkuszy CKE. A gdy utkniesz, nauczyciel AI wyjaśni Ci wszystko prostym językiem — bez podawania gotowca.
          </p>
          <div className="hero-actions">
            <Button size="lg" className="primary-action" asChild><a href="/logowanie?tryb=rejestracja">Wypróbuj za darmo <span>→</span></a></Button>
            <a className="text-action" href="#jak-to-dziala">Zobacz, jak to działa <span>↓</span></a>
          </div>
          <div className="hero-trust">
            <span className="trust-avatars"><i>K</i><i>M</i><i>A</i></span>
            <span><b>Darmowy start</b><br />3 pytania do AI bez opłat</span>
          </div>
        </div>

        <div className="product-stage" aria-label="Podgląd ćwiczenia w aplikacji egzaminio">
          <div className="stage-glow" />
          <div className="product-window">
            <div className="window-bar">
              <span className="mini-brand"><BrandLogo compact /></span>
              <span className="lesson-count">Zadanie 2 z 6</span>
              <span className="mini-avatar">KN</span>
            </div>
            <div className="product-body">
              <section className="task-preview">
                <div className="task-meta"><span>CKE</span> Matematyka · maj 2025</div>
                <h2>Trójkąt prostokątny ma boki długości 6 cm i 8 cm. Ile ma przeciwprostokątna?</h2>
                <MathFormula latex="x=\\sqrt{6^2+8^2}" display className="task-formula" />
                <div className="triangle-figure" aria-hidden="true">
                  <div className="triangle-shape" />
                  <span className="side-six">6 cm</span>
                  <span className="side-eight">8 cm</span>
                  <span className="side-x">x</span>
                </div>
                <div className="answers" aria-label="Przykładowe odpowiedzi">
                  {["A|7 cm", "B|10 cm", "C|12 cm", "D|14 cm"].map((answer) => {
                    const [letter, value] = answer.split("|");
                    return <Button variant="outline" type="button" key={letter} className={selectedAnswer === letter ? "chosen" : ""} aria-pressed={selectedAnswer === letter} onClick={() => setSelectedAnswer(letter)}>{letter}&nbsp; {value}</Button>;
                  })}
                </div>
              </section>
              <aside className="ai-preview">
                <div className="ai-title"><span>AI</span><div><b>Nauczyciel obok</b><small>Wyjaśnia, ale nie wyręcza</small></div></div>
                <div className="ai-message" aria-live="polite"><b>{hintExpanded ? "Jeszcze jeden krok" : "Mała podpowiedź"}</b>{hintExpanded ? "To twierdzenie Pitagorasa: suma kwadratów przyprostokątnych jest równa kwadratowi przeciwprostokątnej." : "To trójkąt prostokątny. Pamiętasz wzór, który łączy długości jego boków?"}</div>
                <Button variant="outline" type="button" className="ai-suggestion" onClick={() => setHintExpanded((value) => !value)}>{hintExpanded ? "Wróć do pierwszej podpowiedzi" : "A jeśli nie pamiętam wzoru?"}</Button>
                <div className="ai-limit"><b>3</b> darmowe pytania dziennie</div>
              </aside>
            </div>
          </div>
          <div className="streak-card"><span>🔥</span><div><b>5 dni z rzędu</b><small>Świetny rytm, Kuba!</small></div></div>
          <div className="progress-card"><b>68%</b><span>celu na ten tydzień</span></div>
        </div>
      </section>

      <section className="subject-strip" aria-label="Zakres przygotowań">
        <span><b>∑</b> Matematyka</span>
        <span><b>ą</b> Język polski</span>
        <span><b>A</b> Język angielski</span>
        <span><b>✓</b> Zadania z arkuszy CKE</span>
      </section>

      <section className="section how-section" id="jak-to-dziala">
        <div className="section-heading">
          <span className="section-kicker">Jak to działa</span>
          <h2>Nie kolejna baza zadań.<br />Nauka, która odpowiada.</h2>
          <p>Zaczynasz od prawdziwego zadania egzaminacyjnego. Reszta dopasowuje się do tego, czego akurat nie rozumiesz.</p>
        </div>
        <div className="steps-grid">
          <Card className="step-card step-coral">
            <div className="step-icon">✎</div>
            <h3>Rozwiązujesz</h3>
            <p>Zadania pochodzące ze zdigitalizowanych arkuszy CKE, uporządkowane według tematu i poziomu.</p>
            <span className="step-detail">Bez przypadkowych ćwiczeń</span>
          </Card>
          <Card className="step-card step-navy">
            <div className="step-icon">AI</div>
            <h3>Pytasz</h3>
            <p>Gdy utkniesz, AI daje małą podpowiedź. Możesz dopytać tak, jak zapytałbyś nauczyciela.</p>
            <span className="step-detail">Własnymi słowami</span>
          </Card>
          <Card className="step-card step-mint">
            <div className="step-icon">↗</div>
            <h3>Rozumiesz</h3>
            <p>Wyjaśnienie prowadzi krok po kroku i pokazuje tok myślenia, zamiast zdradzać sam wynik.</p>
            <span className="step-detail">Wiedza zostaje na dłużej</span>
          </Card>
        </div>
      </section>

      <section className="explain-section">
        <div className="explain-demo">
          <div className="demo-question"><span>Ty</span><p>Nie rozumiem, skąd wzięło się 100.</p></div>
          <div className="demo-answer">
            <span className="demo-ai">AI</span>
            <div><b>Spójrzmy tylko na ten krok.</b><p aria-live="polite">{demoReply}</p></div>
          </div>
          <div className="demo-chips"><Button variant="outline" type="button" onClick={() => setDemoReply("Pierwiastek odwraca podnoszenie do kwadratu. Skoro x² = 100, to x = √100, czyli 10.")}>Tak, pokaż</Button><Button variant="outline" type="button" onClick={() => setDemoReply("Zapis 6² oznacza 6 · 6, czyli 36. Mała dwójka mówi: pomnóż liczbę przez samą siebie.")}>Co oznacza ²?</Button></div>
          <Button type="button" variant="outline" className="demo-input" onClick={() => setDemoReply("Napisz własne pytanie w aplikacji — AI odniesie je do dokładnie tego zadania.")}>Dopytaj własnymi słowami… <b>↑</b></Button>
        </div>
        <div className="explain-copy">
          <span className="section-kicker">Pomoc dokładnie wtedy, gdy trzeba</span>
          <h2>„Nie rozumiem” to początek rozmowy, nie koniec zadania.</h2>
          <p>Każde wyjaśnienie odnosi się do konkretnego ćwiczenia. Uczeń może zatrzymać się na jednym kroku, dopytać o pojęcie albo poprosić o prostszy przykład.</p>
          <ul>
            <li><span>✓</span> Podpowiedzi zamiast gotowych odpowiedzi</li>
            <li><span>✓</span> Język dopasowany do ósmoklasisty</li>
            <li><span>✓</span> Możliwość dalszej rozmowy z AI</li>
          </ul>
        </div>
      </section>

      <section className="family-story" aria-labelledby="family-story-title">
        <Image src="/rodzic-i-uczen-nauka.png" width={1536} height={1024} sizes="(max-width: 900px) 100vw, 1120px" alt="Uczeń pracuje nad zadaniem przy wsparciu rodzica" />
        <div className="family-story-copy"><span className="section-kicker">Nauka bez presji</span><h2 id="family-story-title">Rodzic wspiera rytm. Uczeń zachowuje samodzielność.</h2><p>Panel pokazuje cel i regularność, ale prywatna rozmowa ucznia z AI pozostaje prywatna.</p><Button variant="secondary" asChild><a href="#dla-rodzica">Zobacz panel rodzica</a></Button></div>
      </section>

      <section className="parent-section" id="dla-rodzica">
        <div className="parent-inner">
          <div className="parent-copy">
            <span className="section-kicker light-kicker">Dla rodzica</span>
            <h2>Ty widzisz postęp.<br />Dziecko widzi kolejny krok.</h2>
            <p>Bez pilnowania każdego zadania. Panel rodzica pokazuje regularność, opanowane tematy i obszary, do których warto wrócić.</p>
            <div className="parent-points">
              <span><b>5 dni</b>serii nauki</span>
              <span><b>34</b>zadania w tygodniu</span>
              <span><b>24 min</b>średnio dziennie</span>
            </div>
          </div>
          <div className="parent-dashboard">
            <div className="dashboard-top"><div><small>Panel rodzica</small><b>Dobry wieczór, Anno</b></div><span>KN</span></div>
            <div className="dashboard-message"><b>✓ Kuba uczy się regularnie</b><p>W tym tygodniu zrealizował 68% swojego celu.</p></div>
            <div className="bar-chart" aria-label="Aktywność od poniedziałku do niedzieli">
              <i style={{height: "43%"}}><small>Pn</small></i>
              <i style={{height: "70%"}}><small>Wt</small></i>
              <i style={{height: "52%"}}><small>Śr</small></i>
              <i style={{height: "94%"}}><small>Cz</small></i>
              <i style={{height: "61%"}}><small>Pt</small></i>
              <i className="empty" style={{height: "18%"}}><small>Sb</small></i>
              <i className="empty" style={{height: "18%"}}><small>Nd</small></i>
            </div>
            <div className="dashboard-note"><span>→</span><div><b>Warto powtórzyć</b><small>Procenty i zadania tekstowe</small></div></div>
          </div>
        </div>
      </section>

      <section className="section access-section" id="dostep">
        <div className="access-copy">
          <span className="section-kicker">Darmowy start</span>
          <h2>Najpierw sprawdź, czy to działa dla Was.</h2>
          <p>Podstawowe ćwiczenia będą dostępne bez opłat. Każdego dnia uczeń otrzyma 3 pytania do nauczyciela AI. Więcej rozmów i pełne ścieżki powtórkowe pojawią się w planie Plus.</p>
        </div>
        <div className="plans">
          <Card className="plan-card free-plan">
            <span className="plan-label">Na początek</span>
            <h3>Plan bezpłatny</h3>
            <div className="plan-price">0 zł <small>/ miesiąc</small></div>
            <ul><li>✓ Wybrane ćwiczenia CKE</li><li>✓ 3 pytania do AI dziennie</li><li>✓ Podstawowy podgląd postępów</li></ul>
            <a href="/logowanie?tryb=rejestracja">Załóż darmowe konto</a>
          </Card>
          <Card className="plan-card plus-plan">
            <span className="plan-label">Więcej nauki</span>
            <h3>Plan Plus</h3>
            <div className="plan-price">Wkrótce</div>
            <ul><li>✓ Pełna baza ćwiczeń</li><li>✓ Więcej rozmów z AI</li><li>✓ Plan nauki i inteligentne powtórki</li></ul>
            <Button variant="outline" asChild><a href="mailto:kontakt@egzamin.io?subject=Lista%20oczekujacych%20egzaminio%20Plus">Powiadom mnie o premierze</a></Button>
          </Card>
        </div>
      </section>

      <section className="signup-section" id="zapisz-sie">
        <span className="signup-orbit orbit-one" />
        <span className="signup-orbit orbit-two" />
        <div className="signup-logo"><BrandLogo /></div>
        <span className="section-kicker">Darmowy start</span>
        <h2>Spokojniejszy egzamin<br />zaczyna się od jednego zadania.</h2>
        <p>Załóż konto ucznia albo rodzica. Pierwsze ćwiczenia i 3 pytania do nauczyciela AI są bezpłatne. Konta nauczycieli nadajemy ręcznie po weryfikacji.</p>
        <Button size="lg" className="primary-action signup-action" asChild><a href="/logowanie?tryb=rejestracja">Załóż darmowe konto <span>→</span></a></Button>
        <small>Bez karty płatniczej. Konto ucznia wymaga zgody rodzica lub opiekuna.</small>
      </section>

      <footer className="site-footer">
        <a className="brand" href="#top" aria-label="egzaminio — wróć na górę"><BrandLogo /></a>
        <p>Ćwiczenia do egzaminu ósmoklasisty, które naprawdę tłumaczą.</p>
        <div><a href="/logowanie">Logowanie</a><a href="/informacje-prawne">Informacje prawne</a><a href="/regulamin">Regulamin</a><a href="/polityka-prywatnosci">Prywatność</a><a href="/polityka-cookies">Cookies</a><a href="/bezpieczenstwo-dzieci-ai">Dzieci i AI</a><a href="/usun-konto">Usuń konto</a><a href="mailto:kontakt@egzamin.io">kontakt@egzamin.io</a><span>© 2026 egzaminio</span></div>
        <small>egzaminio jest niezależnym projektem edukacyjnym i nie jest powiązany z Centralną Komisją Egzaminacyjną.</small>
      </footer>
    </main>
  );
}
