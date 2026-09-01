"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PlusLockedPreview } from "@/components/plus-locked-preview";
import { getSupabaseClient } from "@/lib/supabase-browser";
import { isSubjectKey, SUBJECT_KEYS, SubjectIcon, subjectLabels, type SubjectKey } from "@/components/subject-icon";

export type ParentProgressChild = {
  student_id: string;
  student_display_name: string | null;
  student_email: string;
  weekly_goal: number;
  plan_tier: "free" | "plus";
  plan_valid_until: string | null;
};

type ProgressRange = 7 | 30 | 0;
type Subject = SubjectKey;
type SubjectStat = { subject: Subject; solved: number; correct: number; accuracy: number };
type TopicStat = { subject: Subject; topic: string; solved: number; accuracy: number };

export type ParentProgressSummary = {
  progress_student_id: string;
  progress_range_days: ProgressRange;
  solved_count: number;
  correct_count: number;
  total_attempts: number;
  accuracy_percent: number;
  active_days: number;
  ai_questions_used: number;
  weekly_goal: number;
  weekly_sessions: number;
  trend_percentage_points: number;
  subject_stats: SubjectStat[];
  strong_topics: TopicStat[];
  focus_topics: TopicStat[];
  recommendation: string;
  latest_activity_at: string | null;
};

const ranges: Array<{ value: ProgressRange; label: string }> = [
  { value: 7, label: "7 dni" },
  { value: 30, label: "30 dni" },
  { value: 0, label: "Cały okres" },
];

const subjectOrder: Subject[] = [...SUBJECT_KEYS];

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isSubject(value: unknown): value is Subject {
  return isSubjectKey(value);
}

export function normalizeParentProgress(value: Record<string, unknown>): ParentProgressSummary {
  const range = numberValue(value.progress_range_days);
  const progressRange: ProgressRange = range === 30 ? 30 : range === 0 ? 0 : 7;
  const normalizeSubjects = (items: unknown): SubjectStat[] => Array.isArray(items)
    ? items.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as Record<string, unknown>;
      if (!isSubject(row.subject)) return [];
      return [{ subject: row.subject, solved: numberValue(row.solved), correct: numberValue(row.correct), accuracy: numberValue(row.accuracy) }];
    })
    : [];
  const normalizeTopics = (items: unknown): TopicStat[] => Array.isArray(items)
    ? items.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as Record<string, unknown>;
      if (!isSubject(row.subject)) return [];
      return [{ subject: row.subject, topic: String(row.topic ?? ""), solved: numberValue(row.solved), accuracy: numberValue(row.accuracy) }];
    }).filter((item) => item.topic)
    : [];

  return {
    progress_student_id: String(value.progress_student_id ?? ""),
    progress_range_days: progressRange,
    solved_count: numberValue(value.solved_count),
    correct_count: numberValue(value.correct_count),
    total_attempts: numberValue(value.total_attempts),
    accuracy_percent: numberValue(value.accuracy_percent),
    active_days: numberValue(value.active_days),
    ai_questions_used: numberValue(value.ai_questions_used),
    weekly_goal: Math.max(1, numberValue(value.weekly_goal)),
    weekly_sessions: numberValue(value.weekly_sessions),
    trend_percentage_points: numberValue(value.trend_percentage_points),
    subject_stats: normalizeSubjects(value.subject_stats),
    strong_topics: normalizeTopics(value.strong_topics),
    focus_topics: normalizeTopics(value.focus_topics),
    recommendation: String(value.recommendation ?? "Zacznijcie od jednej krótkiej sesji."),
    latest_activity_at: value.latest_activity_at ? String(value.latest_activity_at) : null,
  };
}

export function ParentProgress({ linkedChildren, pendingRequests, onConnect }: { linkedChildren: ParentProgressChild[]; pendingRequests: number; onConnect: () => void }) {
  const [renderedAt] = useState(() => Date.now());
  const [selectedStudentId, setSelectedStudentId] = useState(linkedChildren[0]?.student_id ?? "");
  const [range, setRange] = useState<ProgressRange>(7);
  const [refreshKey, setRefreshKey] = useState(0);
  const [result, setResult] = useState<{ key: string; summary: ParentProgressSummary | null; error: string; aiUsageUnavailable: boolean }>({ key: "", summary: null, error: "", aiUsageUnavailable: false });
  const effectiveStudentId = linkedChildren.some((child) => child.student_id === selectedStudentId)
    ? selectedStudentId
    : linkedChildren[0]?.student_id ?? "";
  const selectedChild = linkedChildren.find((child) => child.student_id === effectiveStudentId) ?? linkedChildren[0];
  const hasPlusAccess = Boolean(selectedChild?.plan_tier === "plus" && (!selectedChild.plan_valid_until || new Date(selectedChild.plan_valid_until).getTime() > renderedAt));
  const requestKey = `${effectiveStudentId}:${range}:${refreshKey}`;
  const loading = Boolean(effectiveStudentId) && result.key !== requestKey;
  const summary = result.key === requestKey ? result.summary : null;
  const error = result.key === requestKey ? result.error : "";
  const aiUsageUnavailable = result.key === requestKey && result.aiUsageUnavailable;

  useEffect(() => {
    if (!effectiveStudentId || !hasPlusAccess) return;

    let active = true;
    getSupabaseClient()
      .then(async (supabase) => {
        const args = { target_student_id: effectiveStudentId, requested_range_days: range };
        const [{ data, error: progressError }, { data: aiUsage, error: aiUsageError }] = await Promise.all([
          supabase.rpc("get_parent_child_progress", args),
          supabase.rpc("get_parent_child_ai_usage", args),
        ]);
        if (progressError) throw progressError;
        const row = (data as Record<string, unknown>[] | null)?.[0];
        const aiUsageRow = (aiUsage as Record<string, unknown>[] | null)?.[0];
        if (!row) throw new Error("missing_parent_progress");
        const aiQuestionsUsed = aiUsageError ? row.ai_questions_used : aiUsageRow?.ai_questions_used;
        if (active) setResult({
          key: requestKey,
          summary: normalizeParentProgress({ ...row, ai_questions_used: aiQuestionsUsed }),
          error: "",
          aiUsageUnavailable: Boolean(aiUsageError) && row.ai_questions_used == null,
        });
      })
      .catch(() => {
        if (active) setResult({ key: requestKey, summary: null, error: "Nie udało się pobrać postępów. Spróbuj ponownie za chwilę.", aiUsageUnavailable: false });
      });

    return () => {
      active = false;
    };
  }, [effectiveStudentId, hasPlusAccess, range, requestKey]);

  const subjectStats = useMemo(() => new Map(summary?.subject_stats.map((item) => [item.subject, item]) ?? []), [summary]);

  if (!linkedChildren.length) {
    return (
      <section className="parent-content-view parent-progress-view" aria-labelledby="parent-progress-empty-title">
        <div className="dashboard-view-heading"><div><h2>Postęp dziecka</h2><small>Wyniki, regularność i wykorzystanie pomocy AI</small></div></div>
        <Card className="parent-empty-view"><CardHeader><CardTitle id="parent-progress-empty-title">{pendingRequests ? "Prośba czeka na zatwierdzenie" : "Najpierw dodaj dziecko"}</CardTitle><CardDescription>{pendingRequests ? "Po zatwierdzeniu prośby pierwsze wyniki pojawią się tutaj automatycznie." : "Wyślij dziecku link rejestracyjny i zatwierdź jego konto, aby zobaczyć postęp."}</CardDescription></CardHeader><CardContent><Button type="button" onClick={onConnect}>{pendingRequests ? "Przejdź do próśb" : "Dodaj dziecko"}</Button></CardContent></Card>
      </section>
    );
  }

  const childName = selectedChild?.student_display_name || selectedChild?.student_email || "Uczeń";
  const weeklyPercent = summary ? Math.min(100, Math.round((summary.weekly_sessions / summary.weekly_goal) * 100)) : 0;
  const trend = summary?.trend_percentage_points ?? 0;

  return (
    <section className="parent-content-view parent-progress-view" aria-labelledby="parent-progress-title">
      <div className="dashboard-view-heading parent-progress-heading"><div><h2 id="parent-progress-title">{childName}</h2><small>Postęp dziecka i najważniejsze obszary nauki</small></div>{summary?.latest_activity_at && <small>Ostatnia aktywność: {new Date(summary.latest_activity_at).toLocaleDateString("pl-PL")}</small>}</div>

      <section className="parent-progress-toolbar" aria-label="Wybierz dziecko i okres">
        <div className="parent-child-selector"><span>Dziecko</span><div>{linkedChildren.map((child) => <Button key={child.student_id} type="button" size="sm" variant={effectiveStudentId === child.student_id ? "default" : "outline"} aria-pressed={effectiveStudentId === child.student_id} onClick={() => setSelectedStudentId(child.student_id)}>{child.student_display_name || child.student_email}</Button>)}</div></div>
        <div className="parent-range-selector"><span>Okres</span><div>{ranges.map((item) => <Button key={item.value} type="button" size="sm" variant={range === item.value ? "default" : "outline"} aria-pressed={range === item.value} onClick={() => setRange(item.value)}>{item.label}</Button>)}</div></div>
      </section>

      {!hasPlusAccess && <PlusLockedPreview
        title="Szczegółowy postęp dziecka jest dostępny w Plus"
        description="Dodanie dziecka pozostaje bezpłatne. Plus daje rodzicowi czytelny obraz nauki i podpowiada, gdzie warto wesprzeć dziecko."
        href="/panel?widok=platnosci"
        actionLabel="Wykup Plus dla dziecka"
        features={[
          { title: "Wyniki według przedmiotu", description: "Skuteczność i liczba rozwiązanych zadań z każdego przedmiotu." },
          { title: "Regularność i cel tygodniowy", description: "Aktywne dni oraz realizacja ustalonego planu nauki." },
          { title: "Wykorzystanie Mai AI", description: "Liczba zadanych pytań bez ujawniania treści rozmów dziecka." },
          { title: "Tematy do powtórki", description: "Słabsze obszary i konkretna rekomendacja następnego kroku." },
        ]}
      />}

      {hasPlusAccess && loading && <section className="parent-progress-loading" aria-live="polite"><Card><CardContent>Liczymy postęp dla wybranego okresu…</CardContent></Card></section>}
      {error && <Alert variant="destructive" className="dashboard-alert"><AlertTitle>Postępy są chwilowo niedostępne</AlertTitle><AlertDescription>{error}<Button variant="outline" size="sm" type="button" onClick={() => setRefreshKey((value) => value + 1)}>Spróbuj ponownie</Button></AlertDescription></Alert>}
      {!loading && !error && aiUsageUnavailable && <Alert className="dashboard-alert parent-ai-usage-warning"><AlertTitle>Postęp został wczytany</AlertTitle><AlertDescription>Licznik pytań do AI jest chwilowo niedostępny. Pozostałe wyniki są aktualne.</AlertDescription></Alert>}

      {!loading && !error && summary && summary.solved_count === 0 && summary.ai_questions_used === 0 && <Card className="parent-empty-view parent-progress-empty"><CardHeader><CardTitle>Brak aktywności w tym okresie</CardTitle><CardDescription>{summary.recommendation}</CardDescription></CardHeader><CardContent><p>Gdy dziecko sprawdzi pierwszą odpowiedź lub użyje pomocy AI, zobaczysz tutaj aktywność i tematy do powtórki.</p></CardContent></Card>}

      {!loading && !error && summary && (summary.solved_count > 0 || summary.ai_questions_used > 0) && <>
        <section className="dashboard-grid parent-progress-metrics">
          <article className="metric-card"><span>Rozwiązane zadania</span><b>{summary.solved_count}</b><small>{summary.total_attempts} wszystkich prób w okresie.</small></article>
          <article className="metric-card"><span>Skuteczność</span><b>{summary.accuracy_percent}%</b><small>{summary.correct_count} poprawnych ostatnich odpowiedzi.</small></article>
          <article className="metric-card"><span>Pytania do AI</span><b>{aiUsageUnavailable ? "—" : summary.ai_questions_used}</b><small>{aiUsageUnavailable ? "Licznik chwilowo niedostępny." : "Tylko liczba — bez treści rozmów."}</small></article>
          <article className="metric-card"><span>Regularność</span><b>{summary.active_days} dni</b><small>Aktywne dni w wybranym okresie.</small></article>
          <article className="metric-card"><span>Trend</span><b className={trend > 0 ? "positive-trend" : trend < 0 ? "negative-trend" : ""}>{trend > 0 ? "+" : ""}{trend} pp</b><small>Zmiana względem poprzedniego porównywalnego okresu.</small></article>
        </section>

        <Card className="parent-weekly-goal-card">
          <CardHeader><div><CardTitle>Cel tygodniowy</CardTitle><CardDescription>{summary.weekly_sessions} z {summary.weekly_goal} zaplanowanych dni nauki</CardDescription></div><Badge variant={weeklyPercent >= 100 ? "secondary" : "outline"}>{weeklyPercent}%</Badge></CardHeader>
          <CardContent><Progress value={weeklyPercent} /></CardContent>
        </Card>

        <section className="parent-subject-progress" aria-labelledby="parent-subject-title">
          <div className="guardian-section-heading"><div><Badge variant="secondary">Przedmioty</Badge><h3 id="parent-subject-title">Wyniki według przedmiotu</h3></div><small>Liczymy ostatnią odpowiedź dla każdego zadania w okresie.</small></div>
          <div>{subjectOrder.filter((subject) => subjectStats.has(subject)).map((subject) => {
            const stat = subjectStats.get(subject);
            return <Card key={subject}><CardHeader><div className="subject-card-heading"><SubjectIcon subject={subject} /><div><CardTitle>{subjectLabels[subject]}</CardTitle><CardDescription>{stat?.solved ?? 0} rozwiązanych</CardDescription></div></div></CardHeader><CardContent><div className="subject-progress-value"><b>{stat?.accuracy ?? 0}%</b><span>{stat?.correct ?? 0} poprawnych</span></div><Progress value={stat?.accuracy ?? 0} /></CardContent></Card>;
          })}</div>
        </section>

      </>}
    </section>
  );
}
