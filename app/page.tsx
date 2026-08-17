"use client";

function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`wordmark${compact ? " wordmark-compact" : ""}`}
      role="img"
      aria-label="egzaminio"
    >
      <span aria-hidden="true">
        <span className="wordmark-main">egzamin</span>
        <span className="wordmark-io">
          i<span className="wordmark-o">o<span className="wordmark-check">✓</span></span>
        </span>
      </span>
    </span>
  );
}

export default function Home() {
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
        <a className="header-cta" href="#zapisz-sie">Powiadom mnie</a>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span /> Nowy sposób na egzamin ósmoklasisty</div>
          <h1>Egzamin bez paniki.<br /><em>Krok po kroku.</em></h1>
          <p className="hero-lead">
            Ćwicz na zadaniach z arkuszy CKE. A gdy utkniesz, nauczyciel AI wyjaśni Ci wszystko prostym językiem — bez podawania gotowca.
          </p>
          <div className="hero-actions">
            <a className="primary-action" href="#zapisz-sie">Chcę wiedzieć o starcie <span>→</span></a>
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
                <div className="triangle-figure" aria-hidden="true">
                  <div className="triangle-shape" />
                  <span className="side-six">6 cm</span>
                  <span className="side-eight">8 cm</span>
                  <span className="side-x">x</span>
                </div>
                <div className="answers">
                  <span>A&nbsp; 7 cm</span><span className="chosen">B&nbsp; 10 cm</span><span>C&nbsp; 12 cm</span><span>D&nbsp; 14 cm</span>
                </div>
              </section>
              <aside className="ai-preview">
                <div className="ai-title"><span>AI</span><div><b>Nauczyciel obok</b><small>Wyjaśnia, ale nie wyręcza</small></div></div>
                <div className="ai-message"><b>Mała podpowiedź</b>To trójkąt prostokątny. Pamiętasz wzór, który łączy długości jego boków?</div>
                <div className="ai-suggestion">A jeśli nie pamiętam wzoru?</div>
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
          <article className="step-card step-coral">
            <span className="step-number">01</span>
            <div className="step-icon">✎</div>
            <h3>Rozwiązujesz</h3>
            <p>Zadania pochodzące ze zdigitalizowanych arkuszy CKE, uporządkowane według tematu i poziomu.</p>
            <span className="step-detail">Bez przypadkowych ćwiczeń</span>
          </article>
          <article className="step-card step-navy">
            <span className="step-number">02</span>
            <div className="step-icon">AI</div>
            <h3>Pytasz</h3>
            <p>Gdy utkniesz, AI daje małą podpowiedź. Możesz dopytać tak, jak zapytałbyś nauczyciela.</p>
            <span className="step-detail">Własnymi słowami</span>
          </article>
          <article className="step-card step-mint">
            <span className="step-number">03</span>
            <div className="step-icon">↗</div>
            <h3>Rozumiesz</h3>
            <p>Wyjaśnienie prowadzi krok po kroku i pokazuje tok myślenia, zamiast zdradzać sam wynik.</p>
            <span className="step-detail">Wiedza zostaje na dłużej</span>
          </article>
        </div>
      </section>

      <section className="explain-section">
        <div className="explain-demo">
          <div className="demo-question"><span>Ty</span><p>Nie rozumiem, skąd wzięło się 100.</p></div>
          <div className="demo-answer">
            <span className="demo-ai">AI</span>
            <div><b>Spójrzmy tylko na ten krok.</b><p>Mamy 6² + 8². To inaczej 36 + 64. Kiedy je dodasz, otrzymasz 100. Chcesz, żebym pokazał też, dlaczego potem wyciągamy pierwiastek?</p></div>
          </div>
          <div className="demo-chips"><span>Tak, pokaż</span><span>Co oznacza ²?</span></div>
          <div className="demo-input">Dopytaj własnymi słowami… <b>↑</b></div>
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
          <article className="plan-card free-plan">
            <span className="plan-label">Na początek</span>
            <h3>Plan bezpłatny</h3>
            <div className="plan-price">0 zł <small>/ miesiąc</small></div>
            <ul><li>✓ Wybrane ćwiczenia CKE</li><li>✓ 3 pytania do AI dziennie</li><li>✓ Podstawowy podgląd postępów</li></ul>
            <a href="#zapisz-sie">Powiadom mnie o starcie</a>
          </article>
          <article className="plan-card plus-plan">
            <span className="plan-label">Więcej nauki</span>
            <h3>Plan Plus</h3>
            <div className="plan-price">Wkrótce</div>
            <ul><li>✓ Pełna baza ćwiczeń</li><li>✓ Więcej rozmów z AI</li><li>✓ Plan nauki i inteligentne powtórki</li></ul>
            <span className="plan-soon">Szczegóły przed premierą</span>
          </article>
        </div>
      </section>

      <section className="signup-section" id="zapisz-sie">
        <span className="signup-orbit orbit-one" />
        <span className="signup-orbit orbit-two" />
        <div className="signup-logo"><BrandLogo /></div>
        <span className="section-kicker">Premiera w przygotowaniu</span>
        <h2>Spokojniejszy egzamin<br />zaczyna się od jednego zadania.</h2>
        <p>egzaminio powstaje z myślą o uczniach ósmej klasy i ich rodzicach. Już wkrótce podamy datę startu.</p>
        <a className="primary-action signup-action" href="mailto:kontakt@egzamin.io?subject=Chcę%20wiedzieć%20o%20starcie%20egzaminio">Chcę wiedzieć o starcie <span>→</span></a>
        <small>Bez spamu. Tylko informacja o premierze i dostępie testowym.</small>
      </section>

      <footer className="site-footer">
        <a className="brand" href="#top" aria-label="egzaminio — wróć na górę"><BrandLogo /></a>
        <p>Ćwiczenia do egzaminu ósmoklasisty, które naprawdę tłumaczą.</p>
        <div><a href="mailto:kontakt@egzamin.io">kontakt@egzamin.io</a><span>© 2026 egzaminio</span></div>
        <small>egzaminio jest niezależnym projektem edukacyjnym i nie jest powiązany z Centralną Komisją Egzaminacyjną.</small>
      </footer>
    </main>
  );
}
