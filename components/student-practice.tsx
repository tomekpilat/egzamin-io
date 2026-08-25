"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getSupabaseClient } from "@/lib/supabase-browser";

export type StudentView = "start" | "exercises" | "progress" | "settings";
type Subject = "mathematics" | "polish" | "english";
type SubjectFilter = "all" | Subject;

type PracticeQuestion = {
  question_id: string;
  source_label: string;
  subject: Subject;
  topic: string;
  prompt: string;
  options: string[];
  difficulty: number;
  sort_order: number;
  selected_answer: number | null;
  is_correct: boolean | null;
  attempt_count: number;
  correct_answer: number | null;
  explanation: string | null;
};

type AnswerResult = {
  answer_is_correct: boolean;
  answer_correct_index: number;
  answer_explanation: string;
  answer_attempt_count: number;
  solved_count: number;
  correct_count: number;
};

const subjects: { value: SubjectFilter; label: string }[] = [
  { value: "all", label: "Wszystkie" },
  { value: "mathematics", label: "Matematyka" },
  { value: "polish", label: "Język polski" },
  { value: "english", label: "Język angielski" },
];

const subjectLabels: Record<Subject, string> = {
  mathematics: "Matematyka",
  polish: "Język polski",
  english: "Język angielski",
};

function normalizeQuestion(value: Record<string, unknown>): PracticeQuestion {
  const subject = value.subject;
  if (subject !== "mathematics" && subject !== "polish" && subject !== "english") {
    throw new Error("invalid_subject");
  }
  if (!Array.isArray(value.options) || value.options.length !== 4) {
    throw new Error("invalid_options");
  }

  return {
    question_id: String(value.question_id),
    source_label: String(value.source_label),
    subject,
    topic: String(value.topic),
    prompt: String(value.prompt),
    options: value.options.map(String),
    difficulty: Number(value.difficulty),
    sort_order: Number(value.sort_order),
    selected_answer: value.selected_answer == null ? null : Number(value.selected_answer),
    is_correct: value.is_correct == null ? null : Boolean(value.is_correct),
    attempt_count: Number(value.attempt_count ?? 0),
    correct_answer: value.correct_answer == null ? null : Number(value.correct_answer),
    explanation: value.explanation == null ? null : String(value.explanation),
  };
}

export function StudentPractice({ activeView, onNavigate }: { activeView: StudentView; onNavigate: (view: StudentView) => void }) {
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [subject, setSubject] = useState<SubjectFilter>("all");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [draftAnswer, setDraftAnswer] = useState<{ questionId: string; index: number } | null>(null);
  const [submittedAnswer, setSubmittedAnswer] = useState<(AnswerResult & { questionId: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getSupabaseClient()
      .then(async (supabase) => {
        const { data, error: questionsError } = await supabase.rpc("get_practice_questions");
        if (questionsError) throw questionsError;
        const loaded = ((data as Record<string, unknown>[] | null) ?? []).map(normalizeQuestion);
        if (active) setQuestions(loaded);
      })
      .catch(() => {
        if (active) setError("Nie udało się pobrać zestawu demo. Administrator powinien zastosować najnowszą migrację Supabase.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredQuestions = useMemo(
    () => questions.filter((question) => subject === "all" || question.subject === subject),
    [questions, subject],
  );
  const currentQuestion = filteredQuestions[questionIndex] ?? null;
  const answeredCount = questions.filter((question) => question.selected_answer !== null).length;
  const correctCount = questions.filter((question) => question.is_correct).length;
  const score = answeredCount ? Math.round((correctCount / answeredCount) * 100) : 0;
  const selectedAnswer = currentQuestion && draftAnswer?.questionId === currentQuestion.question_id ? draftAnswer.index : currentQuestion?.selected_answer ?? null;
  const answerResult = currentQuestion && submittedAnswer?.questionId === currentQuestion.question_id
    ? submittedAnswer
    : currentQuestion?.correct_answer !== null && currentQuestion?.correct_answer !== undefined && currentQuestion.explanation
      ? {
          questionId: currentQuestion.question_id,
          answer_is_correct: Boolean(currentQuestion.is_correct),
          answer_correct_index: currentQuestion.correct_answer,
          answer_explanation: currentQuestion.explanation,
          answer_attempt_count: currentQuestion.attempt_count,
          solved_count: answeredCount,
          correct_count: correctCount,
        }
      : null;

  function selectSubject(nextSubject: SubjectFilter) {
    setSubject(nextSubject);
    setQuestionIndex(0);
    setError("");
  }

  function selectAnswer(index: number) {
    if (!currentQuestion) return;
    setDraftAnswer({ questionId: currentQuestion.question_id, index });
    setSubmittedAnswer(null);
  }

  async function submitAnswer() {
    if (!currentQuestion || selectedAnswer === null) return;
    setSubmitting(true);
    setError("");
    try {
      const supabase = await getSupabaseClient();
      const { data, error: submitError } = await supabase.rpc("submit_practice_answer", {
        target_question_id: currentQuestion.question_id,
        selected_answer: selectedAnswer,
      });
      if (submitError) throw submitError;
      const result = (data as AnswerResult[] | null)?.[0];
      if (!result) throw new Error("missing_result");
      setSubmittedAnswer({ ...result, questionId: currentQuestion.question_id });
      setQuestions((current) =>
        current.map((question) =>
          question.question_id === currentQuestion.question_id
            ? {
                ...question,
                selected_answer: selectedAnswer,
                is_correct: result.answer_is_correct,
                attempt_count: result.answer_attempt_count,
                correct_answer: result.answer_correct_index,
                explanation: result.answer_explanation,
              }
            : question,
        ),
      );
    } catch {
      setError("Nie udało się zapisać odpowiedzi. Spróbuj ponownie.");
    } finally {
      setSubmitting(false);
    }
  }

  function nextQuestion() {
    if (!filteredQuestions.length) return;
    setQuestionIndex((current) => (current + 1) % filteredQuestions.length);
  }

  function subjectStats(target: Subject) {
    const available = questions.filter((question) => question.subject === target);
    const answered = available.filter((question) => question.selected_answer !== null).length;
    const correct = available.filter((question) => question.is_correct).length;
    return { total: available.length, answered, correct };
  }

  if (loading) {
    return <Card className="practice-loading"><CardContent>Ładujemy 50 pytań demonstracyjnych…</CardContent></Card>;
  }

  if (error && !questions.length) {
    return <Alert variant="destructive"><AlertTitle>Zestaw demo jest niedostępny</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  }

  return (
    <>
      {activeView === "start" && <>
        <section className="dashboard-hero student-hero">
          <div>
            <span className="dashboard-kicker">Zestaw demonstracyjny · {questions.length} pytań</span>
            <h2>{answeredCount ? "Kontynuuj tam, gdzie skończyłeś." : "Zacznij od jednego pytania."}</h2>
            <p>Autorskie zadania z matematyki, polskiego i angielskiego pokazują cały przebieg ćwiczenia przed importem arkuszy CKE.</p>
            <Button type="button" onClick={() => onNavigate("exercises")}>{answeredCount ? "Kontynuuj ćwiczenia" : "Rozpocznij demo"} <span>→</span></Button>
          </div>
          <div className="daily-ring"><b>{answeredCount}/{questions.length}</b><span>rozwiązanych</span></div>
        </section>
        <section className="dashboard-grid three-columns">
          <article className="metric-card"><span>Pytania demo</span><b>{questions.length}</b><small>Trzy przedmioty w jednym zestawie.</small></article>
          <article className="metric-card"><span>Poprawne odpowiedzi</span><b>{correctCount}</b><small>{answeredCount ? String(score) + "% skuteczności" : "Wynik pojawi się po pierwszym pytaniu."}</small></article>
          <article className="metric-card"><span>Do rozwiązania</span><b>{questions.length - answeredCount}</b><small>Postęp zapisujemy na koncie ucznia.</small></article>
        </section>
      </>}

      {activeView === "exercises" && <>
        <div className="dashboard-view-heading"><div><span className="dashboard-kicker dark-kicker">Ćwiczenia demo</span><h2>Rozwiąż pytanie krok po kroku</h2></div><Badge variant="secondary">{answeredCount}/{questions.length} ukończonych</Badge></div>
        <div className="practice-subjects" aria-label="Filtruj pytania według przedmiotu">
          {subjects.map((item) => <Button key={item.value} type="button" size="sm" variant={subject === item.value ? "default" : "outline"} aria-pressed={subject === item.value} onClick={() => selectSubject(item.value)}>{item.label}</Button>)}
        </div>
        {error && <Alert variant="destructive" className="dashboard-alert"><AlertDescription>{error}</AlertDescription></Alert>}
        {currentQuestion && <section className="practice-layout">
          <Card className="practice-question-card">
            <CardHeader>
              <div className="practice-meta"><Badge variant="outline">{subjectLabels[currentQuestion.subject]}</Badge><span>{currentQuestion.topic}</span><span>Poziom {currentQuestion.difficulty}/3</span></div>
              <CardTitle>{currentQuestion.prompt}</CardTitle>
              <CardDescription>Pytanie {questionIndex + 1} z {filteredQuestions.length} · {currentQuestion.source_label}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="practice-answers" role="radiogroup" aria-label="Wybierz odpowiedź">
                {currentQuestion.options.map((option, index) => {
                  const correct = answerResult?.answer_correct_index === index;
                  const incorrect = Boolean(answerResult) && selectedAnswer === index && !correct;
                  const answerClass = ["practice-answer", selectedAnswer === index && "selected", correct && "correct", incorrect && "incorrect"].filter(Boolean).join(" ");
                  return <button key={option} type="button" role="radio" aria-checked={selectedAnswer === index} className={answerClass} onClick={() => selectAnswer(index)}><b>{String.fromCharCode(65 + index)}</b><span>{option}</span></button>;
                })}
              </div>
              {answerResult && <Alert variant={answerResult.answer_is_correct ? "success" : "warning"} className="practice-feedback"><AlertTitle>{answerResult.answer_is_correct ? "Dobra odpowiedź!" : "Jeszcze nie tym razem"}</AlertTitle><AlertDescription>{answerResult.answer_explanation}</AlertDescription></Alert>}
              <div className="practice-actions"><Button type="button" onClick={() => void submitAnswer()} disabled={selectedAnswer === null || submitting}>{submitting ? "Sprawdzam…" : answerResult ? "Sprawdź ponownie" : "Sprawdź odpowiedź"}</Button><Button type="button" variant="outline" onClick={nextQuestion}>Następne pytanie →</Button></div>
            </CardContent>
          </Card>
          <Card className="practice-progress-card">
            <CardHeader><CardTitle>Twój postęp</CardTitle><CardDescription>Wynik zapisuje się po każdym sprawdzeniu.</CardDescription></CardHeader>
            <CardContent><div className="practice-score"><b>{score}%</b><span>{correctCount} poprawnych z {answeredCount} rozwiązanych</span></div><Progress value={(answeredCount / Math.max(questions.length, 1)) * 100} /><Button variant="ghost" type="button" onClick={() => onNavigate("progress")}>Zobacz szczegóły →</Button></CardContent>
          </Card>
        </section>}
      </>}

      {activeView === "progress" && <>
        <div className="dashboard-view-heading"><div><span className="dashboard-kicker dark-kicker">Postępy</span><h2>Twój wynik w zestawie demo</h2></div><Button variant="outline" type="button" onClick={() => onNavigate("exercises")}>Wróć do ćwiczeń</Button></div>
        <section className="dashboard-grid three-columns">
          <article className="metric-card"><span>Rozwiązane pytania</span><b>{answeredCount}/{questions.length}</b><small>{questions.length - answeredCount} pozostało w zestawie.</small></article>
          <article className="metric-card"><span>Poprawne odpowiedzi</span><b>{correctCount}</b><small>Liczymy ostatnią odpowiedź dla każdego pytania.</small></article>
          <article className="metric-card"><span>Skuteczność</span><b>{score}%</b><small>Spróbuj ponownie, aby poprawić wynik.</small></article>
        </section>
        <section className="practice-subject-progress">
          {(["mathematics", "polish", "english"] as Subject[]).map((item) => {
            const stats = subjectStats(item);
            const percent = stats.answered ? Math.round((stats.correct / stats.answered) * 100) : 0;
            return <Card key={item}><CardHeader><CardTitle>{subjectLabels[item]}</CardTitle><CardDescription>{stats.answered} z {stats.total} rozwiązanych</CardDescription></CardHeader><CardContent><div className="subject-progress-value"><b>{percent}%</b><span>{stats.correct} poprawnych</span></div><Progress value={(stats.answered / Math.max(stats.total, 1)) * 100} /></CardContent></Card>;
          })}
        </section>
      </>}
    </>
  );
}
