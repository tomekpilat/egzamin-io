"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getSupabaseClient } from "@/lib/supabase-browser";
import { SubjectIcon, subjectLabels, type SubjectKey } from "@/components/subject-icon";

export type ParentProgressChild = {
  student_id: string;
  student_display_name: string | null;
  student_email: string;
  weekly_goal: number;
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

const subjectOrder: Subject[] = ["mathematics", "polish", "english"];

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isSubject(value: unknown): value is Subject {
  return value === "mathematics" || value === "polish" || value === "english";
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

function TopicList({ title, empty, topics, variant }: { title: string; empty: string; topics: TopicStat[]; variant: "strong" | "focus" }) {
  return (
    <Card className={`parent-topic-card ${variant}`}>
      <CardHeader><CardTitle>{title}</CardTitle><CardDescription>{topics.length ? "Na podstawie ostatnich odpowiedzi w wybranym okresie." : empty}</CardDescription></CardHeader>
      <CardContent>
        {topics.length > 0 && <ul>{topics.map((topic) => <li key={`${topic.subject}-${topic.topic}`}><div><b>{topic.topic}</b><span>{subjectLabels[topic.subject]} · {topic.solved} {topic.solved === 1 ? "zadanie" : "zadania"}</span></div><Badge variant={variant === "strong" ? "secondary" : "outline"}>{topic.accuracy}%</Badge></li>)}</ul>}
      </CardContent>
    </Card>
  );
}

export function ParentProgress({ linkedChildren, pendingRequests, onConnect }: { linkedChildren: ParentProgressChild[]; pendingRequests: number; onConnect: () => void }) {
  const [selectedStudentId, setSelectedStudentId] = useState(linkedChildren[0]?.student_id ?? "");
  const [range, setRange] = useState<ProgressRange>(7);
  const [refreshKey, setRefreshKey] = useState(0);
  const [result, setResult] = useState<{ key: string; summary: ParentProgressSummary | null; error: string }>({ key: "", summary: null, error: "" });
  const effectiveStudentId = linkedChildren.some((child) => child.student_id === selectedStudentId)
    ? selectedStudentId
    : linkedChildren[0]?.student_id ?? "";
  const requestKey = `${effectiveStudentId}:${range}:${refreshKey}`;
  const loading = Boolean(effectiveStudentId) && result.key !== requestKey;
  const summary = result.key === requestKey ? result.summary : null;
  const error = result.key === requestKey ? result.error : "";

  useEffect(() => {
    if (!effectiveStudentId) return;

    let active = true;
    getSupabaseClient()
      .then(async (supabase) => {
        const { data, error: progressError } = await supabase.rpc("get_parent_child_progress", {
          target_student_id: effectiveStudentId,
          requested_range_days: range,
        });
        if (progressError) throw progressError;
        const row = (data as Record<string, unknown>[] | null)?.[0];
        if (!row) throw new Error("missing_parent_progress");
        if (active) setResult({ key: requestKey, summary: normalizeParentProgress(row), error: "" });
      })
      .catch(() => {
        if (active) setResult({ key: requestKey, summary: null, error: "Nie udało się pobrać postępów. Spróbuj ponownie za chwilę." });
      });

    return () => {
      active = false;
    };
  }, [effectiveStudentId, range, requestKey]);

  const selectedChild = linkedChildren.find((child) => child.student_id === effectiveStudentId) ?? linkedChildren[0];
  const subjectStats = useMemo(() => new Map(summary?.subject_stats.map((item) => [item.subject, item]) ?? []), [summary]);

  if (!linkedChildren.length) {
    return (
      <>
        <div className="dashboard-view-heading"><div><span className="dashboard-kicker dark-kicker">Postępy</span><h2>Postępy dziecka</h2></div></div>
        <Card className="parent-empty-view"><CardHeader><CardTitle>{pendingRequests ? "Połączenie czeka na zatwierdzenie" : "Najpierw połącz konto dziecka"}</CardTitle><CardDescription>{pendingRequests ? "Po zatwierdzeniu prośby pierwsze wyniki pojawią się tutaj automatycznie." : "Wyślij dziecku link rejestracyjny i zatwierdź relację, aby zobaczyć postęp."}</CardDescription></CardHeader><CardContent><Button type="button" onClick={onConnect}>{pendingRequests ? "Przejdź do próśb" : "Połącz konto dziecka"}</Button></CardContent></Card>
      </>
    );
  }

  const childName = selectedChild?.student_display_name || selectedChild?.student_email || "Uczeń";
  const weeklyPercent = summary ? Math.min(100, Math.round((summary.weekly_sessions / summary.weekly_goal) * 100)) : 0;
  const trend = summary?.trend_percentage_points ?? 0;

  return (
    <>
      <div className="dashboard-view-heading parent-progress-heading"><div><span className="dashboard-kicker dark-kicker">Postępy</span><h2>{childName}</h2></div>{summary?.latest_activity_at && <small>Ostatnia aktywność: {new Date(summary.latest_activity_at).toLocaleDateString("pl-PL")}</small>}</div>

      <section className="parent-progress-toolbar" aria-label="Wybierz dziecko i okres">
        <div className="parent-child-selector"><span>Dziecko</span><div>{linkedChildren.map((child) => <Button key={child.student_id} type="button" size="sm" variant={effectiveStudentId === child.student_id ? "default" : "outline"} aria-pressed={effectiveStudentId === child.student_id} onClick={() => setSelectedStudentId(child.student_id)}>{child.student_display_name || child.student_email}</Button>)}</div></div>
        <div className="parent-range-selector"><span>Okres</span><div>{ranges.map((item) => <Button key={item.value} type="button" size="sm" variant={range === item.value ? "default" : "outline"} aria-pressed={range === item.value} onClick={() => setRange(item.value)}>{item.label}</Button>)}</div></div>
      </section>

      {loading && <section className="parent-progress-loading" aria-live="polite"><Card><CardContent>Liczymy postęp dla wybranego okresu…</CardContent></Card></section>}
      {error && <Alert variant="destructive" className="dashboard-alert"><AlertTitle>Postępy są chwilowo niedostępne</AlertTitle><AlertDescription>{error}<Button variant="outline" size="sm" type="button" onClick={() => setRefreshKey((value) => value + 1)}>Spróbuj ponownie</Button></AlertDescription></Alert>}

      {!loading && !error && summary && summary.solved_count === 0 && <Card className="parent-empty-view parent-progress-empty"><CardHeader><CardTitle>Brak aktywności w tym okresie</CardTitle><CardDescription>{summary.recommendation}</CardDescription></CardHeader><CardContent><p>Gdy dziecko sprawdzi pierwszą odpowiedź, zobaczysz tutaj skuteczność, regularność i tematy do powtórki.</p></CardContent></Card>}

      {!loading && !error && summary && summary.solved_count > 0 && <>
        <section className="dashboard-grid four-columns parent-progress-metrics">
          <article className="metric-card"><span>Rozwiązane zadania</span><b>{summary.solved_count}</b><small>{summary.total_attempts} wszystkich prób w okresie.</small></article>
          <article className="metric-card"><span>Skuteczność</span><b>{summary.accuracy_percent}%</b><small>{summary.correct_count} poprawnych ostatnich odpowiedzi.</small></article>
          <article className="metric-card"><span>Regularność</span><b>{summary.active_days} dni</b><small>Aktywne dni w wybranym okresie.</small></article>
          <article className="metric-card"><span>Trend</span><b className={trend > 0 ? "positive-trend" : trend < 0 ? "negative-trend" : ""}>{trend > 0 ? "+" : ""}{trend} pp</b><small>Zmiana względem poprzedniego porównywalnego okresu.</small></article>
        </section>

        <Card className="parent-weekly-goal-card">
          <CardHeader><div><CardTitle>Cel tygodniowy</CardTitle><CardDescription>{summary.weekly_sessions} z {summary.weekly_goal} zaplanowanych dni nauki</CardDescription></div><Badge variant={weeklyPercent >= 100 ? "secondary" : "outline"}>{weeklyPercent}%</Badge></CardHeader>
          <CardContent><Progress value={weeklyPercent} /></CardContent>
        </Card>

        <section className="parent-subject-progress" aria-labelledby="parent-subject-title">
          <div className="guardian-section-heading"><div><Badge variant="secondary">Przedmioty</Badge><h3 id="parent-subject-title">Wyniki według przedmiotu</h3></div><small>Liczymy ostatnią odpowiedź dla każdego zadania w okresie.</small></div>
          <div>{subjectOrder.map((subject) => {
            const stat = subjectStats.get(subject);
            return <Card key={subject}><CardHeader><div className="subject-card-heading"><SubjectIcon subject={subject} /><div><CardTitle>{subjectLabels[subject]}</CardTitle><CardDescription>{stat?.solved ?? 0} rozwiązanych</CardDescription></div></div></CardHeader><CardContent><div className="subject-progress-value"><b>{stat?.accuracy ?? 0}%</b><span>{stat?.correct ?? 0} poprawnych</span></div><Progress value={stat?.accuracy ?? 0} /></CardContent></Card>;
          })}</div>
        </section>

        <section className="parent-topic-grid">
          <TopicList title="Mocne tematy" empty="Potrzeba kilku odpowiedzi, aby wskazać mocne strony." topics={summary.strong_topics} variant="strong" />
          <TopicList title="Do krótkiej powtórki" empty="W tym okresie nie ma tematów wymagających pilnej powtórki." topics={summary.focus_topics} variant="focus" />
        </section>

        <Alert variant="success" className="parent-recommendation"><AlertTitle>Jedna rzecz na kolejny tydzień</AlertTitle><AlertDescription>{summary.recommendation}</AlertDescription></Alert>
      </>}
    </>
  );
}
