"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Full-page anchors avoid a Vinext production navigation failure. */

import { useMemo, useState } from "react";
import { Info, ShieldCheck } from "lucide-react";
import { SchoolThresholdRequestForm } from "@/components/school-threshold-request-form";
import { SchoolThresholdSearch } from "@/components/school-threshold-search";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calculateRecruitmentPoints, compareWithThreshold, type RecruitmentGrade, type RecruitmentGradeInput } from "@/lib/recruitment-points";
import type { RecruitmentThresholdRecord } from "@/lib/recruitment-schools";

const GRADES: RecruitmentGrade[] = [6, 5, 4, 3, 2];
const GRADE_LABELS: Record<RecruitmentGrade, string> = {
  6: "6 — celujący (18 pkt)", 5: "5 — bardzo dobry (17 pkt)", 4: "4 — dobry (14 pkt)",
  3: "3 — dostateczny (8 pkt)", 2: "2 — dopuszczający (2 pkt)",
};
const ACHIEVEMENT_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

const FAQS = [
  { question: "Ile punktów można zdobyć w rekrutacji do liceum lub technikum?", answer: "Maksymalnie 200 punktów: do 100 za egzamin ósmoklasisty oraz do 100 za oceny, wyróżnienie, osiągnięcia i aktywność społeczną." },
  { question: "Jak przelicza się procenty z egzaminu na punkty?", answer: "Wynik z języka polskiego i matematyki mnoży się przez 0,35, a wynik z języka obcego przez 0,30. Łącznie egzamin daje maksymalnie 100 punktów." },
  { question: "Ile punktów daje ocena na świadectwie?", answer: "Celujący daje 18 punktów, bardzo dobry 17, dobry 14, dostateczny 8, a dopuszczający 2. Liczą się cztery przedmioty wskazane w zasadach rekrutacji do danej klasy." },
  { question: "Czy próg z poprzedniego roku gwarantuje przyjęcie?", answer: "Nie. Próg jest wynikiem ostatniej przyjętej osoby i co roku zależy od kandydatów, ich wyników oraz liczby miejsc." },
];

type CalculatorStep = "points" | "school" | "result";
type CalculatorState = {
  polish: number;
  mathematics: number;
  foreignLanguage: number;
  grades: [RecruitmentGradeInput, RecruitmentGradeInput, RecruitmentGradeInput, RecruitmentGradeInput];
  honors: boolean;
  volunteering: boolean;
  achievements: number;
};

const INITIAL_STATE: CalculatorState = {
  polish: 0,
  mathematics: 0,
  foreignLanguage: 0,
  grades: [null, null, null, null],
  honors: false,
  volunteering: false,
  achievements: 0,
};

function formatPoints(value: number) {
  return new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2 }).format(value);
}

function PercentField({ id, label, value, onChange }: { id: string; label: string; value: number; onChange: (value: number) => void }) {
  return <div className="calculator-field"><Label htmlFor={id}>{label}</Label><div className="calculator-number-input"><Input id={id} type="number" inputMode="decimal" min={0} max={100} value={value} onChange={(event) => onChange(Number(event.target.value))} /><span aria-hidden="true">%</span></div></div>;
}

function GradeField({ id, label, value, onChange }: { id: string; label: string; value: RecruitmentGradeInput; onChange: (value: RecruitmentGrade) => void }) {
  return <div className="calculator-field"><Label htmlFor={id}>{label}</Label><Select value={value === null ? "" : String(value)} onValueChange={(next) => onChange(Number(next) as RecruitmentGrade)}><SelectTrigger id={id} className="calculator-grade-trigger"><SelectValue placeholder="Wybierz" /></SelectTrigger><SelectContent>{GRADES.map((grade) => <SelectItem key={grade} value={String(grade)}>{GRADE_LABELS[grade]}</SelectItem>)}</SelectContent></Select></div>;
}

function CalculatorSteps({ activeStep, points, targetName, onNavigate }: { activeStep: CalculatorStep; points: number; targetName: string; onNavigate: (step: CalculatorStep) => void }) {
  return <nav id="calculator-flow" className="calculator-steps" aria-label="Etapy kalkulatora">
    <a href="#kalkulator" aria-current={activeStep === "points" ? "step" : undefined} onClick={(event) => { event.preventDefault(); onNavigate("points"); }}><b>1. {activeStep === "points" ? "Oblicz punkty" : `Punkty · ${formatPoints(points)}`}</b></a>
    <a href="#szkola" aria-current={activeStep === "school" ? "step" : undefined} onClick={(event) => { event.preventDefault(); onNavigate("school"); }}><b>2. {activeStep === "result" && targetName ? targetName : "Znajdź szkołę"}</b></a>
    <a href="#wynik" aria-current={activeStep === "result" ? "step" : undefined} onClick={(event) => { event.preventDefault(); onNavigate("result"); }}><b>3. {activeStep === "result" ? "Porównaj" : "Porównaj wynik"}</b></a>
  </nav>;
}

export default function RecruitmentCalculatorPage() {
  const [form, setForm] = useState<CalculatorState>(INITIAL_STATE);
  const [targetName, setTargetName] = useState("");
  const [threshold, setThreshold] = useState("");
  const [verifiedThreshold, setVerifiedThreshold] = useState<RecruitmentThresholdRecord | null>(null);
  const [activeStep, setActiveStep] = useState<CalculatorStep>("points");

  const result = useMemo(() => calculateRecruitmentPoints({
    polishExamPercent: form.polish,
    mathematicsExamPercent: form.mathematics,
    foreignLanguageExamPercent: form.foreignLanguage,
    grades: form.grades,
    honorsCertificate: form.honors,
    volunteering: form.volunteering,
    achievementPoints: form.achievements,
  }), [form]);
  const comparison = compareWithThreshold(result.total, threshold.trim() === "" ? null : Number(threshold));
  const signedDifference = comparison ? result.total - comparison.threshold : null;

  const setGrade = (index: number, grade: RecruitmentGrade) => setForm((current) => {
    const grades = [...current.grades] as CalculatorState["grades"];
    grades[index] = grade;
    return { ...current, grades };
  });

  const goToStep = (step: CalculatorStep) => {
    const sectionId = step === "points" ? "kalkulator" : step === "school" ? "szkola" : "wynik";
    setActiveStep(step);
    window.history.replaceState(null, "", `#${sectionId}`);
    window.setTimeout(() => {
      const flow = document.getElementById("calculator-flow-start");
      if (!flow) return;
      const flowTop = flow.offsetTop;
      const headerHeight = document.querySelector<HTMLElement>(".site-header")?.offsetHeight ?? 0;
      window.scrollTo({ top: Math.max(0, flowTop - headerHeight), behavior: "auto" });
    }, 0);
  };

  const selectThreshold = (record: RecruitmentThresholdRecord) => {
    setVerifiedThreshold(record);
    setTargetName(`${record.school_name} — ${record.class_name}`);
    setThreshold(String(record.threshold_points));
    window.setTimeout(() => goToStep("result"), 120);
  };

  const sourceDescription = verifiedThreshold
    ? `Dane: ${verifiedThreshold.source_label}, ${verifiedThreshold.recruitment_year}.`
    : "Próg wpisany ręcznie — sprawdź jego rok i źródło przed złożeniem wniosku.";
  const faqJsonLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQS.map(({ question, answer }) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) };

  return (
    <main className="calculator-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <SiteHeader currentPath="/kalkulator-punktow" />

      <div id="calculator-flow-start" className="calculator-flow-start" aria-hidden="true" />
      <section className="calculator-app" data-step={activeStep}>
        <header className="calculator-intro"><h1>Kalkulator punktów do liceum</h1><p>Bez zakładania konta. Maksymalnie 200 punktów: 100 z egzaminu i 100 ze świadectwa oraz osiągnięć.</p></header>
        <CalculatorSteps activeStep={activeStep} points={result.total} targetName={targetName} onNavigate={goToStep} />

        {activeStep === "points" ? <section id="kalkulator" className="calculator-screen calculator-points-screen" aria-label="Oblicz punkty">
          <div className="calculator-points-layout">
            <div className="calculator-form-stack">
              <section className="calculator-panel calculator-exam-panel">
                <h2>Wyniki egzaminu ósmoklasisty</h2>
                <div className="calculator-grid calculator-grid-three">
                  <PercentField id="exam-polish" label="Polski (%)" value={form.polish} onChange={(polish) => setForm((current) => ({ ...current, polish }))} />
                  <PercentField id="exam-mathematics" label="Matematyka (%)" value={form.mathematics} onChange={(mathematics) => setForm((current) => ({ ...current, mathematics }))} />
                  <PercentField id="exam-language" label="Język obcy (%)" value={form.foreignLanguage} onChange={(foreignLanguage) => setForm((current) => ({ ...current, foreignLanguage }))} />
                </div>
                <p className="calculator-formula">Polski i matematyka × 0,35; język obcy × 0,30.</p>
              </section>

              <section className="calculator-panel calculator-certificate-card">
                <div className="calculator-certificate-section">
                  <h2>Oceny na świadectwie</h2>
                  <div className="calculator-grid calculator-grid-four">
                    <GradeField id="grade-polish" label="Polski" value={form.grades[0]} onChange={(grade) => setGrade(0, grade)} />
                    <GradeField id="grade-mathematics" label="Matematyka" value={form.grades[1]} onChange={(grade) => setGrade(1, grade)} />
                    <GradeField id="grade-profile-one" label="Przedmiot 3" value={form.grades[2]} onChange={(grade) => setGrade(2, grade)} />
                    <GradeField id="grade-profile-two" label="Przedmiot 4" value={form.grades[3]} onChange={(grade) => setGrade(3, grade)} />
                  </div>
                </div>
                <div className="calculator-extras">
                  <label className="calculator-check-row" htmlFor="honors"><Checkbox id="honors" checked={form.honors} onCheckedChange={(checked) => setForm((current) => ({ ...current, honors: checked === true }))} /><span>Świadectwo z wyróżnieniem <small>+7 pkt</small></span></label>
                  <label className="calculator-check-row" htmlFor="volunteering"><Checkbox id="volunteering" checked={form.volunteering} onCheckedChange={(checked) => setForm((current) => ({ ...current, volunteering: checked === true }))} /><span>Wolontariat <small>+3 pkt</small></span></label>
                  <div className="calculator-achievements"><Label htmlFor="achievements">Konkursy i osiągnięcia</Label><Select value={String(form.achievements)} onValueChange={(value) => setForm((current) => ({ ...current, achievements: Number(value) }))}><SelectTrigger id="achievements"><SelectValue /></SelectTrigger><SelectContent>{ACHIEVEMENT_OPTIONS.map((points) => <SelectItem key={points} value={String(points)}>{points === 0 ? "Brak" : `${points} pkt`}</SelectItem>)}</SelectContent></Select></div>
                </div>
              </section>
            </div>

            <aside className="calculator-live-score" aria-live="polite">
              <span>Twój wynik</span><strong>{formatPoints(result.total)}</strong><small>z 200 punktów</small>
              <div>
                <p><span>Egzamin</span><b>{formatPoints(result.exam.total)}</b></p>
                <p><span>Oceny</span><b>{formatPoints(result.certificate.grades)}</b></p>
                <p><span>Wyróżnienie</span><b>{formatPoints(result.certificate.honors)}</b></p>
                <p><span>Osiągnięcia</span><b>{formatPoints(result.certificate.achievements + result.certificate.volunteering)}</b></p>
              </div>
              <Button type="button" onClick={() => goToStep("school")}>Znajdź szkołę →</Button>
            </aside>
          </div>
        </section> : null}

        {activeStep === "school" ? <section id="szkola" className="calculator-screen calculator-school-screen" aria-label="Znajdź szkołę">
          <div className="calculator-school-search-card">
            <SchoolThresholdSearch query={targetName} onQueryChange={(value) => { setTargetName(value); setVerifiedThreshold(null); }} onSelect={selectThreshold} />
            {verifiedThreshold ? <div className="calculator-verified-threshold"><b>{verifiedThreshold.school_name} · {verifiedThreshold.class_name}</b><span>Próg z {verifiedThreshold.recruitment_year}: {formatPoints(verifiedThreshold.threshold_points)} pkt · źródło: <a href={verifiedThreshold.source_url} target="_blank" rel="noreferrer">{verifiedThreshold.source_label}</a></span></div> : null}
            <details className="calculator-manual-threshold"><summary>Wpisz próg ręcznie</summary><div><Label htmlFor="target-threshold">Próg z poprzedniego roku</Label><div className="calculator-number-input"><Input id="target-threshold" type="number" inputMode="decimal" min={0} max={200} value={threshold} onChange={(event) => { setThreshold(event.target.value); setVerifiedThreshold(null); }} placeholder="np. 172" /><span>pkt</span></div><Button type="button" disabled={!threshold.trim()} onClick={() => goToStep("result")}>Porównaj wynik</Button></div></details>
          </div>
          <div className="calculator-school-request"><span>Brak szkoły w bazie</span><h2>Nie ma Twojej szkoły? Zgłoś ją</h2><SchoolThresholdRequestForm suggestedSchool={targetName} /></div>
        </section> : null}

        {activeStep === "result" ? <section id="wynik" className="calculator-screen calculator-result-screen" aria-label="Porównaj wynik">
          <div className="calculator-result-card">
            <header className="calculator-comparison-summary">
              <div><span>Twoje punkty</span><strong>{formatPoints(result.total)}</strong></div>
              <div><span>{verifiedThreshold ? `Próg ${verifiedThreshold.recruitment_year} · ${targetName}` : "Wybrany próg"}</span><strong>{comparison ? formatPoints(comparison.threshold) : "—"}</strong></div>
              <div><span>Różnica</span><strong className={signedDifference === null ? "" : signedDifference >= 0 ? "positive" : "negative"}>{signedDifference === null ? "—" : `${signedDifference > 0 ? "+" : signedDifference < 0 ? "−" : ""}${formatPoints(Math.abs(signedDifference))}`}</strong></div>
            </header>
            {comparison ? <div className="calculator-comparison-scale" aria-label={`Twoje punkty ${formatPoints(result.total)}, próg ${formatPoints(comparison.threshold)}`}><div><span style={{ width: `${Math.min(100, result.total / 2)}%` }} /><i style={{ left: `${Math.min(100, comparison.threshold / 2)}%` }} /></div><p><span>0</span><span>próg {formatPoints(comparison.threshold)}</span><span>200</span></p></div> : null}
            {comparison ? <div className={`calculator-gap${comparison.reached ? " calculator-gap-positive" : ""}`} aria-live="polite"><b>{comparison.reached ? `Masz ${formatPoints(comparison.difference)} punktu zapasu` : `Brakuje ${formatPoints(comparison.difference)} punktu`}</b><p>{comparison.reached ? "Twój wynik jest powyżej historycznego progu. Nadal potraktuj go jako wskazówkę, nie gwarancję przyjęcia." : "Egzamin jest częścią wyniku, na którą nadal możesz wpłynąć. Wróć do pierwszego kroku i sprawdź różne scenariusze wyników."}</p></div> : <div className="calculator-gap"><b>Najpierw wybierz szkołę lub wpisz próg.</b><p>Wróć do kroku 2, aby porównać swój wynik z konkretną klasą.</p></div>}
            <p className="calculator-threshold-disclaimer">Progi z lat poprzednich nie gwarantują przyjęcia — zależą od liczby kandydatów w danym roku. {sourceDescription}</p>
            <div className="calculator-result-actions"><Button asChild><a href="/logowanie?tryb=rejestracja&rola=uczen">Ćwicz matematykę z arkuszy CKE</a></Button><Button variant="outline" asChild><a href="/logowanie?tryb=rejestracja&rola=rodzic">Jestem rodzicem — jak pomóc?</a></Button></div>
          </div>
        </section> : null}
      </section>

      <article className="calculator-method calculator-guide" aria-labelledby="calculator-method-title">
        <div><Badge variant="outline"><ShieldCheck aria-hidden="true" /> Zasady punktacji 2027</Badge><h2 id="calculator-method-title">Jak liczyć punkty do liceum i technikum?</h2><p>W rekrutacji do publicznej szkoły ponadpodstawowej można uzyskać maksymalnie 200 punktów. Połowa wyniku pochodzi z egzaminu ósmoklasisty, a druga połowa ze świadectwa i dodatkowych osiągnięć. Kalkulator stosuje przeliczniki z obowiązujących zasad; przed złożeniem wniosku zawsze sprawdź regulamin konkretnego naboru.</p></div>
        <div className="calculator-method-list"><span><b>100 pkt</b> egzamin ósmoklasisty</span><span><b>72 pkt</b> cztery oceny</span><span><b>7 pkt</b> świadectwo z wyróżnieniem</span><span><b>18 pkt</b> szczególne osiągnięcia</span><span><b>3 pkt</b> wolontariat</span></div>
        <section><h3>Jak przeliczyć wynik egzaminu?</h3><p>Procent z języka polskiego mnożysz przez 0,35, procent z matematyki również przez 0,35, a wynik z języka obcego przez 0,30. Przykładowo 70% z polskiego to 24,5 punktu, 70% z matematyki to kolejne 24,5, a 80% z języka obcego daje 24 punkty. Razem to 73 punkty za egzamin.</p></section>
        <section><h3>Ile punktów dają oceny?</h3><p>Liczą się cztery oceny ze świadectwa ukończenia szkoły podstawowej: język polski, matematyka oraz dwa przedmioty ustalone dla konkretnego oddziału. W profilu biologiczno-chemicznym mogą to być inne przedmioty niż w klasie humanistycznej. Dlatego sama nazwa szkoły nie wystarcza — porównuj dokładny oddział lub klasę.</p><div className="calculator-grade-table" role="region" aria-label="Tabela punktów za oceny"><table><thead><tr><th>Ocena</th><th>Punkty</th></tr></thead><tbody><tr><td>Celujący (6)</td><td>18</td></tr><tr><td>Bardzo dobry (5)</td><td>17</td></tr><tr><td>Dobry (4)</td><td>14</td></tr><tr><td>Dostateczny (3)</td><td>8</td></tr><tr><td>Dopuszczający (2)</td><td>2</td></tr></tbody></table></div></section>
        <section><h3>Wyróżnienie, konkursy i wolontariat</h3><p>Świadectwo z wyróżnieniem daje 7 punktów, a aktywność społeczna — w tym wolontariat — 3 punkty, jeśli informacja znajduje się na świadectwie. Za szczególne osiągnięcia można otrzymać łącznie maksymalnie 18 punktów. Nie każdy konkurs daje punkty; sprawdź aktualny wykaz właściwego kuratora oświaty i dokumenty wymagane w rekrutacji.</p></section>
        <section><h3>Jak rozumieć próg punktowy?</h3><p>Próg z poprzedniego roku to wynik ostatniej osoby przyjętej do danego oddziału. Nie jest wymaganiem ustalonym z góry i nie gwarantuje przyjęcia w kolejnym naborze. Zależy od liczby kandydatów, ich wyników i liczby miejsc. Z tego powodu pokazujemy rok, klasę i źródło każdej wartości dostępnej w wyszukiwarce. Jeśli nie mamy zweryfikowanego wpisu, możesz podać liczbę ręcznie — potraktuj ją jednak jako scenariusz porównawczy.</p></section>
        <section className="calculator-faq"><h3>Najczęstsze pytania</h3>{FAQS.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</section>
        <div className="calculator-disclaimer"><Info aria-hidden="true" /><p>Wynik jest orientacyjny. Sprawdź dwa przedmioty punktowane dla konkretnej klasy, wykaz osiągnięć i aktualne zasady lokalnego naboru. Kalkulator nie zapisuje ocen ani procentów. Adres e-mail zapisujemy tylko wtedy, gdy dobrowolnie ustawisz alert i zaznaczysz osobną zgodę.</p></div>
        <nav aria-label="Oficjalne źródła zasad rekrutacji"><a href="https://eli.gov.pl/api/acts/DU/2024/989/text.html" target="_blank" rel="noreferrer">Tekst rozporządzenia ↗</a><a href="https://www.gov.pl/web/edukacja/zasady-przeprowadzania-postepowania-rekrutacyjnego-i-postepowania-uzupelniajacego-do-szkol-ponadpodstawowych" target="_blank" rel="noreferrer">Wyjaśnienie Ministerstwa Edukacji ↗</a></nav>
      </article>

      <SiteFooter />
    </main>
  );
}
