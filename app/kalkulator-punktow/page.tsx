"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Full-page anchors avoid a Vinext production navigation failure. */

import { useMemo, useState } from "react";
import { ArrowRight, BookOpenCheck, Calculator, GraduationCap, Info, RotateCcw, ShieldCheck, Target, Trophy } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { calculateRecruitmentPoints, compareWithThreshold, type RecruitmentGrade } from "@/lib/recruitment-points";

const GRADES: RecruitmentGrade[] = [6, 5, 4, 3, 2];
const GRADE_LABELS: Record<RecruitmentGrade, string> = {
  6: "6 — celujący (18 pkt)",
  5: "5 — bardzo dobry (17 pkt)",
  4: "4 — dobry (14 pkt)",
  3: "3 — dostateczny (8 pkt)",
  2: "2 — dopuszczający (2 pkt)",
};

type CalculatorState = {
  polish: number;
  mathematics: number;
  foreignLanguage: number;
  grades: [RecruitmentGrade, RecruitmentGrade, RecruitmentGrade, RecruitmentGrade];
  honors: boolean;
  volunteering: boolean;
  achievements: number;
};

const SAMPLE_STATE: CalculatorState = {
  polish: 70,
  mathematics: 70,
  foreignLanguage: 80,
  grades: [5, 5, 5, 5],
  honors: true,
  volunteering: true,
  achievements: 0,
};

function formatPoints(value: number) {
  return new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2 }).format(value);
}

function PercentField({ id, label, value, onChange }: { id: string; label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="calculator-field">
      <Label htmlFor={id}>{label}</Label>
      <div className="calculator-number-input">
        <Input id={id} type="number" inputMode="decimal" min={0} max={100} value={value} onChange={(event) => onChange(Number(event.target.value))} />
        <span aria-hidden="true">%</span>
      </div>
    </div>
  );
}

function GradeField({ id, label, value, onChange }: { id: string; label: string; value: RecruitmentGrade; onChange: (value: RecruitmentGrade) => void }) {
  return (
    <div className="calculator-field">
      <Label htmlFor={id}>{label}</Label>
      <Select value={String(value)} onValueChange={(nextValue) => onChange(Number(nextValue) as RecruitmentGrade)}>
        <SelectTrigger id={id} className="calculator-grade-trigger"><SelectValue /></SelectTrigger>
        <SelectContent>{GRADES.map((grade) => <SelectItem key={grade} value={String(grade)}>{GRADE_LABELS[grade]}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

export default function RecruitmentCalculatorPage() {
  const [form, setForm] = useState<CalculatorState>(SAMPLE_STATE);
  const [targetName, setTargetName] = useState("");
  const [threshold, setThreshold] = useState("172");

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

  const setGrade = (index: number, grade: RecruitmentGrade) => {
    setForm((current) => {
      const grades = [...current.grades] as CalculatorState["grades"];
      grades[index] = grade;
      return { ...current, grades };
    });
  };

  return (
    <main className="calculator-page">
      <header className="calculator-header">
        <a href="/" aria-label="egzaminio — strona główna"><BrandLogo /></a>
        <div className="calculator-header-actions"><ThemeToggle /><Button variant="outline" asChild><a href="/logowanie">Zaloguj się</a></Button></div>
      </header>

      <section className="calculator-hero">
        <div>
          <Badge variant="secondary"><Calculator aria-hidden="true" /> Darmowe narzędzie</Badge>
          <h1>Policz punkty<br />do liceum.</h1>
          <p>Egzamin, oceny, pasek, wolontariat i osiągnięcia — wszystko w jednym wyniku do 200 punktów.</p>
        </div>
        <div className="calculator-score-hero" aria-live="polite">
          <span>Twój wynik</span>
          <strong>{formatPoints(result.total)}</strong>
          <small>z 200 punktów</small>
          <Progress value={result.total / 2} aria-label={`${formatPoints(result.total)} z 200 punktów`} />
        </div>
      </section>

      <div className="calculator-shell">
        <div className="calculator-form-column">
          <Card className="calculator-card">
            <CardHeader><div className="calculator-card-heading"><span><BookOpenCheck aria-hidden="true" /></span><div><CardTitle>Wyniki egzaminu</CardTitle><p>Wpisz wyniki lub swoją obecną prognozę.</p></div></div><b>{formatPoints(result.exam.total)} / 100</b></CardHeader>
            <CardContent className="calculator-grid calculator-grid-three">
              <PercentField id="exam-polish" label="Język polski" value={form.polish} onChange={(polish) => setForm((current) => ({ ...current, polish }))} />
              <PercentField id="exam-mathematics" label="Matematyka" value={form.mathematics} onChange={(mathematics) => setForm((current) => ({ ...current, mathematics }))} />
              <PercentField id="exam-language" label="Język obcy" value={form.foreignLanguage} onChange={(foreignLanguage) => setForm((current) => ({ ...current, foreignLanguage }))} />
            </CardContent>
            <div className="calculator-formula">polski × 0,35 + matematyka × 0,35 + język obcy × 0,30</div>
          </Card>

          <Card className="calculator-card">
            <CardHeader><div className="calculator-card-heading"><span><GraduationCap aria-hidden="true" /></span><div><CardTitle>Oceny na świadectwie</CardTitle><p>Polski, matematyka i dwa przedmioty wskazane przez wybraną klasę.</p></div></div><b>{result.certificate.grades} / 72</b></CardHeader>
            <CardContent className="calculator-grid calculator-grid-two">
              <GradeField id="grade-polish" label="Język polski" value={form.grades[0]} onChange={(grade) => setGrade(0, grade)} />
              <GradeField id="grade-mathematics" label="Matematyka" value={form.grades[1]} onChange={(grade) => setGrade(1, grade)} />
              <GradeField id="grade-profile-one" label="Przedmiot profilowy 1" value={form.grades[2]} onChange={(grade) => setGrade(2, grade)} />
              <GradeField id="grade-profile-two" label="Przedmiot profilowy 2" value={form.grades[3]} onChange={(grade) => setGrade(3, grade)} />
            </CardContent>
          </Card>

          <Card className="calculator-card">
            <CardHeader><div className="calculator-card-heading"><span><Trophy aria-hidden="true" /></span><div><CardTitle>Dodatkowe punkty</CardTitle><p>Liczą się wyłącznie informacje wpisane na świadectwie.</p></div></div><b>{formatPoints(result.certificate.honors + result.certificate.volunteering + result.certificate.achievements)} / 28</b></CardHeader>
            <CardContent className="calculator-extras">
              <div className="calculator-switch-row"><div><Label htmlFor="honors">Świadectwo z wyróżnieniem</Label><small>+7 punktów</small></div><Switch id="honors" checked={form.honors} onCheckedChange={(honors) => setForm((current) => ({ ...current, honors }))} /></div>
              <div className="calculator-switch-row"><div><Label htmlFor="volunteering">Aktywność społeczna lub wolontariat</Label><small>+3 punkty</small></div><Switch id="volunteering" checked={form.volunteering} onCheckedChange={(volunteering) => setForm((current) => ({ ...current, volunteering }))} /></div>
              <div className="calculator-achievements"><div><Label htmlFor="achievements">Szczególne osiągnięcia i konkursy</Label><small>Wpisz łączną liczbę punktów (maks. 18) zgodnie z wykazem kuratora lub szkoły.</small></div><Input id="achievements" type="number" inputMode="decimal" min={0} max={18} value={form.achievements} onChange={(event) => setForm((current) => ({ ...current, achievements: Number(event.target.value) }))} /></div>
            </CardContent>
          </Card>

          <Button type="button" variant="ghost" className="calculator-reset" onClick={() => setForm(SAMPLE_STATE)}><RotateCcw aria-hidden="true" /> Przywróć przykładowe dane</Button>
        </div>

        <aside className="calculator-result-column">
          <Card className="calculator-result-card">
            <CardHeader><Badge variant="outline">Wynik na żywo</Badge><CardTitle>{formatPoints(result.total)} <span>/ 200 pkt</span></CardTitle></CardHeader>
            <CardContent>
              <div className="calculator-breakdown"><div><span>Egzamin</span><b>{formatPoints(result.exam.total)} / 100</b></div><Progress value={result.exam.total} /><div><span>Świadectwo i osiągnięcia</span><b>{formatPoints(result.certificate.total)} / 100</b></div><Progress value={result.certificate.total} /></div>
              <div className="calculator-target-fields">
                <div><Label htmlFor="target-name">Szkoła lub klasa <small>(opcjonalnie)</small></Label><Input id="target-name" value={targetName} onChange={(event) => setTargetName(event.target.value)} placeholder="np. XIV LO, mat-fiz" /></div>
                <div><Label htmlFor="target-threshold">Próg z poprzedniego roku</Label><div className="calculator-number-input"><Input id="target-threshold" type="number" inputMode="decimal" min={0} max={200} value={threshold} onChange={(event) => setThreshold(event.target.value)} /><span>pkt</span></div></div>
              </div>

              {comparison ? (
                <div className={`calculator-gap ${comparison.reached ? "calculator-gap-positive" : ""}`} aria-live="polite">
                  <Target aria-hidden="true" />
                  <div>
                    <b>{comparison.reached ? `Masz ${formatPoints(comparison.difference)} pkt zapasu.` : `Brakuje Ci ${formatPoints(comparison.difference)} pkt.`}</b>
                    <p>{comparison.reached ? `Względem wpisanego progu${targetName ? ` dla ${targetName}` : ""}. To nie gwarantuje przyjęcia.` : comparison.difference <= result.exam.remainingPotential ? "Jeśli wpisane wyniki są prognozą, tę różnicę możesz jeszcze wypracować na egzaminie." : "Sam wynik egzaminu nie pokryje całej różnicy — sprawdź również oceny i osiągnięcia."}</p>
                  </div>
                </div>
              ) : <div className="calculator-gap calculator-gap-neutral"><Info aria-hidden="true" /><div><b>Dodaj próg, aby zobaczyć różnicę.</b><p>Najlepiej użyj wyniku konkretnej klasy z poprzedniego roku.</p></div></div>}

              <div className="calculator-plan-callout">
                <span>Egzamin to aż 100 z 200 punktów.</span>
                <h2>Zamień brakujące punkty w plan nauki.</h2>
                <p>Ćwicz zadania CKE i pytaj nauczyciela AI dokładnie tam, gdzie utkniesz.</p>
                <Button size="lg" asChild><a href="/logowanie?tryb=rejestracja&rola=uczen">Zacznij ćwiczyć za darmo <ArrowRight aria-hidden="true" /></a></Button>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      <section className="calculator-method" aria-labelledby="calculator-method-title">
        <div><Badge variant="outline"><ShieldCheck aria-hidden="true" /> Zasady punktacji</Badge><h2 id="calculator-method-title">Skąd bierze się 200 punktów?</h2><p>100 pkt pochodzi z egzaminu, a 100 pkt z ocen i osiągnięć. Kalkulator stosuje przelicznik z obowiązującego rozporządzenia.</p></div>
        <div className="calculator-method-list"><span><b>100 pkt</b> egzamin ósmoklasisty</span><span><b>72 pkt</b> cztery oceny</span><span><b>7 pkt</b> świadectwo z wyróżnieniem</span><span><b>18 pkt</b> szczególne osiągnięcia</span><span><b>3 pkt</b> wolontariat</span></div>
        <div className="calculator-disclaimer"><Info aria-hidden="true" /><p>Wynik jest orientacyjny. Sprawdź, które dwa przedmioty profilowe wskazała konkretna klasa oraz aktualny wykaz punktowanych osiągnięć. Progi z poprzednich lat nie gwarantują przyjęcia. Kalkulator nie zapisuje wpisanych danych.</p></div>
        <nav aria-label="Oficjalne źródła zasad rekrutacji"><a href="https://eli.gov.pl/api/acts/DU/2024/989/text.html" target="_blank" rel="noreferrer">Aktualny tekst rozporządzenia ↗</a><a href="https://www.gov.pl/web/edukacja/zasady-przeprowadzania-postepowania-rekrutacyjnego-i-postepowania-uzupelniajacego-do-szkol-ponadpodstawowych" target="_blank" rel="noreferrer">Wyjaśnienie Ministerstwa Edukacji ↗</a></nav>
      </section>

      <footer className="calculator-footer"><a href="/" aria-label="egzaminio — strona główna"><BrandLogo /></a><div><a href="/polityka-prywatnosci">Polityka prywatności</a><a href="mailto:kontakt@egzamin.io">Kontakt</a></div><small>© 2026 egzaminio · Niezależny projekt edukacyjny, niepowiązany z CKE.</small></footer>
    </main>
  );
}
