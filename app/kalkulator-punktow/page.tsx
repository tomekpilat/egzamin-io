"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Full-page anchors avoid a Vinext production navigation failure. */

import { useMemo, useState } from "react";
import { ArrowRight, BookOpenCheck, Calculator, Database, GraduationCap, Info, RotateCcw, ShieldCheck, Target, Trophy } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { MarketingSignupForm } from "@/components/marketing-signup-form";
import { SchoolThresholdSearch } from "@/components/school-threshold-search";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { calculateRecruitmentPoints, compareWithThreshold, type RecruitmentGrade, type RecruitmentGradeInput } from "@/lib/recruitment-points";
import type { RecruitmentThresholdRecord } from "@/lib/recruitment-schools";

const GRADES: RecruitmentGrade[] = [6, 5, 4, 3, 2];
const GRADE_LABELS: Record<RecruitmentGrade, string> = {
  6: "6 — celujący (18 pkt)", 5: "5 — bardzo dobry (17 pkt)", 4: "4 — dobry (14 pkt)",
  3: "3 — dostateczny (8 pkt)", 2: "2 — dopuszczający (2 pkt)",
};

const FAQS = [
  { question: "Ile punktów można zdobyć w rekrutacji do liceum lub technikum?", answer: "Maksymalnie 200 punktów: do 100 za egzamin ósmoklasisty oraz do 100 za oceny, wyróżnienie, osiągnięcia i aktywność społeczną." },
  { question: "Jak przelicza się procenty z egzaminu na punkty?", answer: "Wynik z języka polskiego i matematyki mnoży się przez 0,35, a wynik z języka obcego przez 0,30. Łącznie egzamin daje maksymalnie 100 punktów." },
  { question: "Ile punktów daje ocena na świadectwie?", answer: "Celujący daje 18 punktów, bardzo dobry 17, dobry 14, dostateczny 8, a dopuszczający 2. Liczą się cztery przedmioty wskazane w zasadach rekrutacji do danej klasy." },
  { question: "Czy próg z poprzedniego roku gwarantuje przyjęcie?", answer: "Nie. Próg jest wynikiem ostatniej przyjętej osoby i co roku zależy od kandydatów, ich wyników oraz liczby miejsc." },
];

type ExamMode = "unknown" | "estimate";
type CalculatorState = {
  polish: number; mathematics: number; foreignLanguage: number;
  grades: [RecruitmentGradeInput, RecruitmentGradeInput, RecruitmentGradeInput, RecruitmentGradeInput];
  honors: boolean; volunteering: boolean; achievements: number;
};

const INITIAL_STATE: CalculatorState = {
  polish: 0, mathematics: 0, foreignLanguage: 0, grades: [null, null, null, null],
  honors: false, volunteering: false, achievements: 0,
};

function formatPoints(value: number) {
  return new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2 }).format(value);
}

function PercentField({ id, label, value, onChange }: { id: string; label: string; value: number; onChange: (value: number) => void }) {
  return <div className="calculator-field"><Label htmlFor={id}>{label}</Label><div className="calculator-number-input"><Input id={id} type="number" inputMode="decimal" min={0} max={100} value={value} onChange={(event) => onChange(Number(event.target.value))} /><span aria-hidden="true">%</span></div></div>;
}

function GradeField({ id, label, value, onChange }: { id: string; label: string; value: RecruitmentGradeInput; onChange: (value: RecruitmentGrade) => void }) {
  return <div className="calculator-field"><Label htmlFor={id}>{label}</Label><Select value={value === null ? "" : String(value)} onValueChange={(next) => onChange(Number(next) as RecruitmentGrade)}><SelectTrigger id={id} className="calculator-grade-trigger"><SelectValue placeholder="Wybierz ocenę" /></SelectTrigger><SelectContent>{GRADES.map((grade) => <SelectItem key={grade} value={String(grade)}>{GRADE_LABELS[grade]}</SelectItem>)}</SelectContent></Select></div>;
}

export default function RecruitmentCalculatorPage() {
  const [form, setForm] = useState<CalculatorState>(INITIAL_STATE);
  const [examMode, setExamMode] = useState<ExamMode>("unknown");
  const [targetName, setTargetName] = useState("");
  const [threshold, setThreshold] = useState("");
  const [verifiedThreshold, setVerifiedThreshold] = useState<RecruitmentThresholdRecord | null>(null);

  const result = useMemo(() => calculateRecruitmentPoints({
    polishExamPercent: examMode === "estimate" ? form.polish : 0,
    mathematicsExamPercent: examMode === "estimate" ? form.mathematics : 0,
    foreignLanguageExamPercent: examMode === "estimate" ? form.foreignLanguage : 0,
    grades: form.grades, honorsCertificate: form.honors, volunteering: form.volunteering,
    achievementPoints: form.achievements,
  }), [form, examMode]);
  const comparison = compareWithThreshold(result.total, threshold.trim() === "" ? null : Number(threshold));
  const examPointsNeeded = threshold.trim() === "" ? null : Math.max(0, Number(threshold) - result.certificate.total);

  const setGrade = (index: number, grade: RecruitmentGrade) => setForm((current) => {
    const grades = [...current.grades] as CalculatorState["grades"];
    grades[index] = grade;
    return { ...current, grades };
  });

  const selectThreshold = (record: RecruitmentThresholdRecord) => {
    setVerifiedThreshold(record);
    setTargetName(`${record.school_name} — ${record.class_name}`);
    setThreshold(String(record.threshold_points));
  };

  const reset = () => {
    setForm(INITIAL_STATE); setExamMode("unknown"); setTargetName(""); setThreshold(""); setVerifiedThreshold(null);
  };

  const faqJsonLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQS.map(({ question, answer }) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) };

  return (
    <main className="calculator-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <SiteHeader currentPath="/kalkulator-punktow" />

      <section className="calculator-hero"><div><Badge variant="secondary"><Calculator aria-hidden="true" /> Kalkulator 2027</Badge><h1>Kalkulator punktów<br />do liceum i technikum.</h1><p>Wpisz swoje dane, znajdź klasę w bazie progów i od razu zobacz, jakiego wyniku potrzebujesz. Bez logowania.</p><div className="calculator-source-inline"><ShieldCheck aria-hidden="true" /><span>Aktualne przeliczniki · progi ze wskazanym rokiem i źródłem</span></div></div></section>

      <section className="calculator-steps" aria-label="Jak użyć kalkulatora"><div><span>1</span><p><b>Uzupełnij punkty</b><small>Oceny, egzamin i osiągnięcia.</small></p></div><div className="calculator-step-featured"><span>2</span><p><b>Znajdź szkołę w naszej bazie</b><small>Próg i źródło uzupełnią się automatycznie.</small></p></div><div><span>3</span><p><b>Porównaj wynik</b><small>Zobacz zapas albo brakujące punkty.</small></p></div></section>

      <div className="calculator-shell">
        <div className="calculator-form-column">
          <Card className="calculator-input-card"><CardContent>
            <section className="calculator-input-section calculator-exam-section"><div className="calculator-section-heading"><BookOpenCheck aria-hidden="true" /><div><h2>Wynik egzaminu</h2><p>Możesz zacząć bez prognozy i uzupełnić ją później.</p></div><b>{formatPoints(result.exam.total)} / 100</b></div><div className="calculator-mode-options"><Button type="button" variant={examMode === "unknown" ? "default" : "outline"} onClick={() => setExamMode("unknown")}>Jeszcze nie znam</Button><Button type="button" variant={examMode === "estimate" ? "default" : "outline"} onClick={() => setExamMode("estimate")}>Mam prognozę</Button></div>{examMode === "estimate" ? <><div className="calculator-grid calculator-grid-three"><PercentField id="exam-polish" label="Język polski" value={form.polish} onChange={(polish) => setForm((c) => ({ ...c, polish }))} /><PercentField id="exam-mathematics" label="Matematyka" value={form.mathematics} onChange={(mathematics) => setForm((c) => ({ ...c, mathematics }))} /><PercentField id="exam-language" label="Język obcy" value={form.foreignLanguage} onChange={(foreignLanguage) => setForm((c) => ({ ...c, foreignLanguage }))} /></div><p className="calculator-formula">polski × 0,35 + matematyka × 0,35 + język obcy × 0,30</p></> : <p className="calculator-mode-note">W rekrutacji liczą się oceny na świadectwie ukończenia szkoły podstawowej, nie świadectwo z klasy VII.</p>}</section>

            <section className="calculator-input-section"><div className="calculator-section-heading"><GraduationCap aria-hidden="true" /><div><h2>Oceny na świadectwie</h2><p>Polski, matematyka i dwa przedmioty dla wybranej klasy.</p></div><b>{result.certificate.grades} / 72</b></div><div className="calculator-grid calculator-grid-two"><GradeField id="grade-polish" label="Język polski" value={form.grades[0]} onChange={(grade) => setGrade(0, grade)} /><GradeField id="grade-mathematics" label="Matematyka" value={form.grades[1]} onChange={(grade) => setGrade(1, grade)} /><GradeField id="grade-profile-one" label="Przedmiot profilowy 1" value={form.grades[2]} onChange={(grade) => setGrade(2, grade)} /><GradeField id="grade-profile-two" label="Przedmiot profilowy 2" value={form.grades[3]} onChange={(grade) => setGrade(3, grade)} /></div></section>

            <section className="calculator-input-section"><div className="calculator-section-heading"><Trophy aria-hidden="true" /><div><h2>Dodatkowe punkty</h2><p>Wyróżnienie, wolontariat i osiągnięcia.</p></div><b>{formatPoints(result.certificate.honors + result.certificate.volunteering + result.certificate.achievements)} / 28</b></div><div className="calculator-extras"><div className="calculator-switch-row"><div><Label htmlFor="honors">Świadectwo z wyróżnieniem</Label><small>+7 punktów</small></div><Switch id="honors" checked={form.honors} onCheckedChange={(honors) => setForm((c) => ({ ...c, honors }))} /></div><div className="calculator-switch-row"><div><Label htmlFor="volunteering">Aktywność społeczna lub wolontariat</Label><small>+3 punkty</small></div><Switch id="volunteering" checked={form.volunteering} onCheckedChange={(volunteering) => setForm((c) => ({ ...c, volunteering }))} /></div><div className="calculator-achievements"><div><Label htmlFor="achievements">Szczególne osiągnięcia i konkursy</Label><small>Maksymalnie 18 punktów.</small></div><Input id="achievements" type="number" inputMode="decimal" min={0} max={18} value={form.achievements} onChange={(event) => setForm((c) => ({ ...c, achievements: Number(event.target.value) }))} /></div></div></section>
          </CardContent></Card>
          <Button type="button" variant="ghost" className="calculator-reset" onClick={reset}><RotateCcw aria-hidden="true" /> Wyczyść kalkulator</Button>
        </div>

        <aside className="calculator-result-column"><Card className="calculator-result-card"><CardHeader><Badge variant="outline">Twój wynik</Badge><CardTitle><strong>{formatPoints(result.total)}</strong> <span>punktów z 200</span></CardTitle></CardHeader><CardContent>
          <div className="calculator-breakdown"><div><span>Egzamin {examMode === "unknown" ? <small>jeszcze niewpisany</small> : null}</span><b>{formatPoints(result.exam.total)} / 100</b></div><Progress value={result.exam.total} /><div><span>Świadectwo i osiągnięcia</span><b>{formatPoints(result.certificate.total)} / 100</b></div><Progress value={result.certificate.total} /></div>
          <div className="calculator-target-fields">
            <div className="calculator-threshold-intro"><Database aria-hidden="true" /><div><Badge>Baza progów</Badge><h2>Znajdź szkołę i konkretną klasę</h2><p>Wybierz wynik z naszej bazy. Pokażemy rok oraz źródło, a próg wpisze się sam.</p></div></div>
            <SchoolThresholdSearch query={targetName} onQueryChange={(value) => { setTargetName(value); setVerifiedThreshold(null); }} onSelect={selectThreshold} />
            <details className="calculator-manual-threshold"><summary>Nie ma szkoły w bazie? Wpisz próg ręcznie</summary><div><Label htmlFor="target-threshold">Próg z poprzedniego roku</Label><div className="calculator-number-input"><Input id="target-threshold" type="number" inputMode="decimal" min={0} max={200} value={threshold} onChange={(event) => { setThreshold(event.target.value); setVerifiedThreshold(null); }} placeholder="np. 172" /><span>pkt</span></div></div></details>
            {verifiedThreshold ? <div className="calculator-verified-threshold"><ShieldCheck aria-hidden="true" /><span>Zweryfikowano: {verifiedThreshold.source_label}, {verifiedThreshold.recruitment_year}. <a href={verifiedThreshold.source_url} target="_blank" rel="noreferrer">Źródło ↗</a></span></div> : null}
          </div>

          {examMode === "unknown" && examPointsNeeded !== null ? <div className={`calculator-gap ${examPointsNeeded <= 100 ? "" : "calculator-gap-neutral"}`}><Target aria-hidden="true" /><div><b>{examPointsNeeded <= 100 ? `Do wpisanego progu potrzeba około ${formatPoints(examPointsNeeded)} pkt z egzaminu.` : "Sam egzamin nie wystarczy przy tej prognozie świadectwa."}</b><p>Egzamin daje maksymalnie 100 punktów. To scenariusz, nie gwarancja przyjęcia.</p></div></div> : comparison ? <div className={`calculator-gap ${comparison.reached ? "calculator-gap-positive" : ""}`} aria-live="polite"><Target aria-hidden="true" /><div><b>{comparison.reached ? `Masz ${formatPoints(comparison.difference)} pkt zapasu.` : `Brakuje Ci ${formatPoints(comparison.difference)} pkt.`}</b><p>{comparison.reached ? `Względem wpisanego progu${targetName ? ` dla ${targetName}` : ""}. To nie gwarantuje przyjęcia.` : "Jeśli wpisane wyniki są prognozą, tę różnicę możesz jeszcze wypracować na egzaminie."}</p></div></div> : <div className="calculator-gap calculator-gap-neutral"><Info aria-hidden="true" /><div><b>Wybierz klasę albo dodaj próg.</b><p>Publikujemy tylko progi z zapisanym źródłem i datą weryfikacji.</p></div></div>}

          <MarketingSignupForm subscriptionType="recruitment_thresholds" sourcePath="/kalkulator-punktow" schoolName={targetName} recruitmentYear={2027} title="Dostań alert o progach" description={targetName ? `Podaj e-mail, a damy znać, gdy pojawią się nowe dane dla: ${targetName}.` : "Podaj e-mail, a przypomnimy o progach rekrutacyjnych na 2027 rok."} submitLabel="Ustaw alert" compact />

          <div className="calculator-plan-callout"><span>Egzamin to aż 100 z 200 punktów</span><h2>Zamień wynik w plan nauki.</h2><p>Ćwicz zadania CKE i pytaj AI dokładnie tam, gdzie utkniesz.</p><div className="calculator-role-actions"><Button size="lg" asChild><a href="/logowanie?tryb=rejestracja&rola=rodzic">Załóż konto rodzica <ArrowRight aria-hidden="true" /></a></Button><Button size="lg" variant="outline" asChild><a href="/logowanie?tryb=rejestracja&rola=uczen">Jestem uczniem</a></Button></div></div>
        </CardContent></Card></aside>
      </div>

      <article className="calculator-method calculator-guide" aria-labelledby="calculator-method-title">
        <div><Badge variant="outline"><ShieldCheck aria-hidden="true" /> Zasady punktacji 2027</Badge><h2 id="calculator-method-title">Jak liczyć punkty do liceum i technikum?</h2><p>W rekrutacji do publicznej szkoły ponadpodstawowej można uzyskać maksymalnie 200 punktów. Połowa wyniku pochodzi z egzaminu ósmoklasisty, a druga połowa ze świadectwa i dodatkowych osiągnięć. Kalkulator stosuje przeliczniki z obowiązujących zasad; przed złożeniem wniosku zawsze sprawdź regulamin konkretnego naboru.</p></div>
        <div className="calculator-method-list"><span><b>100 pkt</b> egzamin ósmoklasisty</span><span><b>72 pkt</b> cztery oceny</span><span><b>7 pkt</b> świadectwo z wyróżnieniem</span><span><b>18 pkt</b> szczególne osiągnięcia</span><span><b>3 pkt</b> wolontariat</span></div>
        <section><h3>Jak przeliczyć wynik egzaminu?</h3><p>Procent z języka polskiego mnożysz przez 0,35, procent z matematyki również przez 0,35, a wynik z języka obcego przez 0,30. Przykładowo 70% z polskiego to 24,5 punktu, 70% z matematyki to kolejne 24,5, a 80% z języka obcego daje 24 punkty. Razem to 73 punkty za egzamin. Jeśli nie znasz jeszcze wyniku próbnego, nie musisz go zgadywać: wybierz wariant bez prognozy i zobacz osobno część zależną od świadectwa.</p></section>
        <section><h3>Ile punktów dają oceny?</h3><p>Liczą się cztery oceny ze świadectwa ukończenia szkoły podstawowej: język polski, matematyka oraz dwa przedmioty ustalone dla konkretnego oddziału. W profilu biologiczno-chemicznym mogą to być inne przedmioty niż w klasie humanistycznej. Dlatego sama nazwa szkoły nie wystarcza — porównuj dokładny oddział lub klasę.</p><div className="calculator-grade-table" role="region" aria-label="Tabela punktów za oceny"><table><thead><tr><th>Ocena</th><th>Punkty</th></tr></thead><tbody><tr><td>Celujący (6)</td><td>18</td></tr><tr><td>Bardzo dobry (5)</td><td>17</td></tr><tr><td>Dobry (4)</td><td>14</td></tr><tr><td>Dostateczny (3)</td><td>8</td></tr><tr><td>Dopuszczający (2)</td><td>2</td></tr></tbody></table></div></section>
        <section><h3>Wyróżnienie, konkursy i wolontariat</h3><p>Świadectwo z wyróżnieniem daje 7 punktów, a aktywność społeczna — w tym wolontariat — 3 punkty, jeśli informacja znajduje się na świadectwie. Za szczególne osiągnięcia można otrzymać łącznie maksymalnie 18 punktów. Nie każdy konkurs daje punkty; sprawdź aktualny wykaz właściwego kuratora oświaty i dokumenty wymagane w rekrutacji.</p></section>
        <section><h3>Jak rozumieć próg punktowy?</h3><p>Próg z poprzedniego roku to wynik ostatniej osoby przyjętej do danego oddziału. Nie jest wymaganiem ustalonym z góry i nie gwarantuje przyjęcia w kolejnym naborze. Zależy od liczby kandydatów, ich wyników i liczby miejsc. Z tego powodu pokazujemy rok, klasę i źródło każdej wartości dostępnej w wyszukiwarce. Jeśli nie mamy zweryfikowanego wpisu, możesz podać liczbę ręcznie — potraktuj ją jednak jako scenariusz porównawczy.</p></section>
        <section className="calculator-faq"><h3>Najczęstsze pytania</h3>{FAQS.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</section>
        <div className="calculator-disclaimer"><Info aria-hidden="true" /><p>Wynik jest orientacyjny. Sprawdź dwa przedmioty punktowane dla konkretnej klasy, wykaz osiągnięć i aktualne zasady lokalnego naboru. Kalkulator nie zapisuje ocen ani procentów. Adres e-mail zapisujemy tylko wtedy, gdy dobrowolnie ustawisz alert i zaznaczysz osobną zgodę.</p></div>
        <nav aria-label="Oficjalne źródła zasad rekrutacji"><a href="https://eli.gov.pl/api/acts/DU/2024/989/text.html" target="_blank" rel="noreferrer">Tekst rozporządzenia ↗</a><a href="https://www.gov.pl/web/edukacja/zasady-przeprowadzania-postepowania-rekrutacyjnego-i-postepowania-uzupelniajacego-do-szkol-ponadpodstawowych" target="_blank" rel="noreferrer">Wyjaśnienie Ministerstwa Edukacji ↗</a></nav>
      </article>

      <footer className="calculator-footer"><a href="/" aria-label="egzaminio — strona główna"><BrandLogo /></a><div><a href="/polityka-prywatnosci">Polityka prywatności</a><a href="mailto:kontakt@egzamin.io">Kontakt</a></div><small>© 2026 egzaminio · Niezależny projekt edukacyjny, niepowiązany z CKE.</small></footer>
    </main>
  );
}
