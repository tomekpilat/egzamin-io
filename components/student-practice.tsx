"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSupabaseClient } from "@/lib/supabase-browser";
import { SubjectIcon, subjectLabels, type SubjectKey } from "@/components/subject-icon";
import { AiTutor } from "@/components/ai-tutor";
import { trackAnalyticsEvent } from "@/lib/analytics";

export type StudentView = "start" | "exercises" | "progress" | "settings";
type Subject = SubjectKey;
type SubjectFilter = "all" | Subject;
export type MaterialFilter = "demo" | "all-cke" | `year:${number}`;
type ExamSession = "main" | "additional";

export type PracticeQuestion = {
  question_id: string;
  source_type: "demo" | "cke";
  source_label: string;
  exam_paper_id: string | null;
  exam_year: number | null;
  exam_session: ExamSession | null;
  exam_variant: string | null;
  source_document_id: string | null;
  paper_question_number: number | null;
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

type PaperProgress = {
  progress_paper_id: string;
  exam_year: number;
  exam_session: ExamSession;
  subject: Subject;
  variant_code: string;
  source_label: string;
  total_questions: number;
  answered_questions: number;
  correct_questions: number;
  accuracy_percent: number;
  completion_status: "not_started" | "in_progress" | "completed";
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

const sessionLabels: Record<ExamSession, string> = {
  main: "termin główny",
  additional: "termin dodatkowy",
};

export const UNSAVED_ANSWER_MESSAGE = "Masz wybraną odpowiedź, której jeszcze nie sprawdzono. Opuścić ją bez zapisywania?";

export function hasUnsavedPracticeAnswer(
  questionId: string | null,
  persistedAnswer: number | null,
  draftAnswer: { questionId: string; index: number } | null,
) {
  return Boolean(questionId && draftAnswer?.questionId === questionId && draftAnswer.index !== persistedAnswer);
}

function normalizeQuestion(value: Record<string, unknown>): PracticeQuestion {
  const subject = value.subject;
  const sourceType = value.source_type;
  if (subject !== "mathematics" && subject !== "polish" && subject !== "english") {
    throw new Error("invalid_subject");
  }
  if (sourceType !== "demo" && sourceType !== "cke") {
    throw new Error("invalid_source_type");
  }
  if (!Array.isArray(value.options) || value.options.length !== 4) {
    throw new Error("invalid_options");
  }
  const examSession = value.exam_session;
  if (examSession != null && examSession !== "main" && examSession !== "additional") {
    throw new Error("invalid_exam_session");
  }

  return {
    question_id: String(value.question_id),
    source_type: sourceType,
    source_label: String(value.source_label),
    exam_paper_id: value.exam_paper_id == null ? null : String(value.exam_paper_id),
    exam_year: value.exam_year == null ? null : Number(value.exam_year),
    exam_session: examSession ?? null,
    exam_variant: value.exam_variant == null ? null : String(value.exam_variant),
    source_document_id: value.source_document_id == null ? null : String(value.source_document_id),
    paper_question_number: value.paper_question_number == null ? null : Number(value.paper_question_number),
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

function normalizePaperProgress(value: Record<string, unknown>): PaperProgress {
  const subject = value.subject;
  const session = value.exam_session;
  const status = value.completion_status;
  if (subject !== "mathematics" && subject !== "polish" && subject !== "english") throw new Error("invalid_subject");
  if (session !== "main" && session !== "additional") throw new Error("invalid_exam_session");
  if (status !== "not_started" && status !== "in_progress" && status !== "completed") throw new Error("invalid_completion_status");
  return {
    progress_paper_id: String(value.progress_paper_id),
    exam_year: Number(value.exam_year),
    exam_session: session,
    subject,
    variant_code: String(value.variant_code),
    source_label: String(value.source_label),
    total_questions: Number(value.total_questions),
    answered_questions: Number(value.answered_questions),
    correct_questions: Number(value.correct_questions),
    accuracy_percent: Number(value.accuracy_percent),
    completion_status: status,
  };
}

export function defaultMaterialFilter(questions: PracticeQuestion[]): MaterialFilter {
  const years = questions.flatMap((question) => question.source_type === "cke" && question.exam_year ? [question.exam_year] : []);
  return years.length ? `year:${Math.max(...years)}` : "demo";
}

export function filterPracticeQuestions(
  questions: PracticeQuestion[],
  subject: SubjectFilter,
  material: MaterialFilter,
  paperId = "all",
) {
  return questions.filter((question) => {
    const matchesSubject = subject === "all" || question.subject === subject;
    const matchesMaterial = material === "demo"
      ? question.source_type === "demo"
      : material === "all-cke"
        ? question.source_type === "cke"
        : question.source_type === "cke" && question.exam_year === Number(material.slice(5));
    const matchesPaper = paperId === "all" || question.exam_paper_id === paperId;
    return matchesSubject && matchesMaterial && matchesPaper;
  });
}

export function formatQuestionSource(question: PracticeQuestion) {
  if (question.source_type === "demo") return "Zestaw demonstracyjny egzaminio";
  const session = question.exam_session ? sessionLabels[question.exam_session] : "arkusz CKE";
  const variant = question.exam_variant && question.exam_variant !== "standard" ? ` · wariant ${question.exam_variant}` : "";
  return `CKE ${question.exam_year} · ${session}${variant}`;
}

export function StudentPractice({ activeView, onNavigate }: { activeView: StudentView; onNavigate: (view: StudentView) => void }) {
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [paperProgress, setPaperProgress] = useState<PaperProgress[]>([]);
  const [subject, setSubject] = useState<SubjectFilter>("all");
  const [material, setMaterial] = useState<MaterialFilter>("demo");
  const [paperId, setPaperId] = useState("all");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [draftAnswer, setDraftAnswer] = useState<{ questionId: string; index: number } | null>(null);
  const [submittedAnswer, setSubmittedAnswer] = useState<(AnswerResult & { questionId: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const answerRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    let active = true;
    getSupabaseClient()
      .then(async (supabase) => {
        const [{ data, error: questionsError }, { data: progressData, error: progressError }] = await Promise.all([
          supabase.rpc("get_practice_questions"),
          supabase.rpc("get_student_paper_progress"),
        ]);
        if (questionsError || progressError) throw questionsError ?? progressError;
        const loaded = ((data as Record<string, unknown>[] | null) ?? []).map(normalizeQuestion);
        const progress = ((progressData as Record<string, unknown>[] | null) ?? []).map(normalizePaperProgress);
        if (active) {
          setQuestions(loaded);
          setPaperProgress(progress);
          setMaterial(defaultMaterialFilter(loaded));
        }
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

  const examYears = useMemo(
    () => Array.from(new Set(questions.flatMap((question) => question.source_type === "cke" && question.exam_year ? [question.exam_year] : []))).sort((a, b) => b - a),
    [questions],
  );
  const materialOptions = useMemo(() => {
    const options: { value: MaterialFilter; label: string; count: number }[] = [];
    if (examYears.length) options.push({ value: "all-cke", label: "Wszystkie lata CKE", count: questions.filter((question) => question.source_type === "cke").length });
    examYears.forEach((year) => options.push({ value: `year:${year}`, label: `CKE ${year}`, count: questions.filter((question) => question.source_type === "cke" && question.exam_year === year).length }));
    if (questions.some((question) => question.source_type === "demo")) options.push({ value: "demo", label: "Zestaw demo egzaminio", count: questions.filter((question) => question.source_type === "demo").length });
    return options;
  }, [examYears, questions]);
  const materialQuestions = useMemo(
    () => filterPracticeQuestions(questions, "all", material),
    [questions, material],
  );
  const availableSubjects = useMemo(
    () => subjects.filter((item) => item.value === "all" || materialQuestions.some((question) => question.subject === item.value)),
    [materialQuestions],
  );
  const availablePapers = useMemo(() => {
    const byPaper = new Map<string, { id: string; label: string; count: number }>();
    filterPracticeQuestions(questions, subject, material).forEach((question) => {
      if (!question.exam_paper_id) return;
      const current = byPaper.get(question.exam_paper_id);
      byPaper.set(question.exam_paper_id, {
        id: question.exam_paper_id,
        label: `${question.exam_year} · ${question.exam_session ? sessionLabels[question.exam_session] : "CKE"}${question.exam_variant && question.exam_variant !== "standard" ? ` · ${question.exam_variant}` : ""}`,
        count: (current?.count ?? 0) + 1,
      });
    });
    return Array.from(byPaper.values());
  }, [questions, subject, material]);
  const filteredQuestions = useMemo(
    () => filterPracticeQuestions(questions, subject, material, paperId),
    [questions, subject, material, paperId],
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
  const hasUnsavedAnswer = hasUnsavedPracticeAnswer(
    currentQuestion?.question_id ?? null,
    currentQuestion?.selected_answer ?? null,
    draftAnswer,
  );

  useEffect(() => {
    if (!hasUnsavedAnswer) return;
    const preventAccidentalExit = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", preventAccidentalExit);
    return () => window.removeEventListener("beforeunload", preventAccidentalExit);
  }, [hasUnsavedAnswer]);

  function confirmDraftDiscard() {
    return !hasUnsavedAnswer || window.confirm(UNSAVED_ANSWER_MESSAGE);
  }

  function selectSubject(nextSubject: SubjectFilter) {
    if (nextSubject === subject || !confirmDraftDiscard()) return;
    setSubject(nextSubject);
    setPaperId("all");
    setQuestionIndex(0);
    setDraftAnswer(null);
    setSubmittedAnswer(null);
    setError("");
  }

  function selectMaterial(nextMaterial: MaterialFilter) {
    if (nextMaterial === material || !confirmDraftDiscard()) return;
    const nextQuestions = filterPracticeQuestions(questions, "all", nextMaterial);
    setMaterial(nextMaterial);
    setPaperId("all");
    if (subject !== "all" && !nextQuestions.some((question) => question.subject === subject)) setSubject("all");
    setQuestionIndex(0);
    setDraftAnswer(null);
    setSubmittedAnswer(null);
    setError("");
  }

  function selectPaper(nextPaperId: string) {
    if (nextPaperId === paperId || !confirmDraftDiscard()) return;
    setPaperId(nextPaperId);
    setQuestionIndex(0);
    setDraftAnswer(null);
    setSubmittedAnswer(null);
    setError("");
  }

  function startPractice() {
    if (!filteredQuestions.length) {
      setError("Brak pytań dla wybranego roku i przedmiotu. Wybierz inny zestaw.");
      return;
    }
    setQuestionIndex(0);
    setError("");
    trackAnalyticsEvent("practice_started");
    onNavigate("exercises");
  }

  function selectAnswer(index: number) {
    if (!currentQuestion) return;
    setDraftAnswer({ questionId: currentQuestion.question_id, index });
    setSubmittedAnswer(null);
  }

  function handleAnswerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + direction + currentQuestion!.options.length) % currentQuestion!.options.length;
    selectAnswer(nextIndex);
    answerRefs.current[nextIndex]?.focus();
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
      trackAnalyticsEvent("answer_checked");
      setDraftAnswer(null);
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
      const { data: progressData, error: progressError } = await supabase.rpc("get_student_paper_progress");
      if (!progressError) setPaperProgress(((progressData as Record<string, unknown>[] | null) ?? []).map(normalizePaperProgress));
    } catch {
      setError("Nie udało się zapisać odpowiedzi. Spróbuj ponownie.");
    } finally {
      setSubmitting(false);
    }
  }

  function moveQuestion(direction: -1 | 1) {
    if (!filteredQuestions.length) return;
    if (!confirmDraftDiscard()) return;
    setQuestionIndex((current) => (current + direction + filteredQuestions.length) % filteredQuestions.length);
    setDraftAnswer(null);
    setSubmittedAnswer(null);
    setError("");
  }

  function exitPractice() {
    if (!confirmDraftDiscard()) return;
    setDraftAnswer(null);
    setSubmittedAnswer(null);
    onNavigate("start");
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
            <span className="dashboard-kicker">Arkusze CKE i zestaw demonstracyjny</span>
            <h2>{answeredCount ? "Kontynuuj tam, gdzie skończyłeś." : "Zacznij od jednego pytania."}</h2>
            <p>Wybierz rok, arkusz i przedmiot. Oficjalne materiały CKE są zawsze wyraźnie oddzielone od ćwiczeń demonstracyjnych egzaminio.</p>
          </div>
          <div className="daily-ring"><b>{answeredCount}/{questions.length}</b><span>rozwiązanych</span></div>
        </section>
        <Card className="practice-launch-card">
          <CardHeader><Badge variant="secondary">Wybór materiału</Badge><CardTitle>Co chcesz teraz ćwiczyć?</CardTitle><CardDescription>Dostępne lata i arkusze wynikają wyłącznie z materiałów opublikowanych w bazie.</CardDescription></CardHeader>
          <CardContent>
            <div className="practice-launch-filters">
              <label htmlFor="practice-material-start">Rocznik
                <Select value={material} onValueChange={(value) => selectMaterial(value as MaterialFilter)}>
                  <SelectTrigger id="practice-material-start"><SelectValue /></SelectTrigger>
                  <SelectContent>{materialOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label} · {item.count}</SelectItem>)}</SelectContent>
                </Select>
              </label>
              <label htmlFor="practice-subject-start">Przedmiot
                <Select value={subject} onValueChange={(value) => selectSubject(value as SubjectFilter)}>
                  <SelectTrigger id="practice-subject-start"><SelectValue /></SelectTrigger>
                  <SelectContent>{availableSubjects.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
                </Select>
              </label>
              {availablePapers.length > 1 && <label htmlFor="practice-paper-start">Arkusz
                <Select value={paperId} onValueChange={selectPaper}>
                  <SelectTrigger id="practice-paper-start"><SelectValue placeholder="Wszystkie arkusze" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Wszystkie arkusze</SelectItem>{availablePapers.map((paper) => <SelectItem key={paper.id} value={paper.id}>{paper.label} · {paper.count}</SelectItem>)}</SelectContent>
                </Select>
              </label>}
            </div>
            <div className="practice-launch-summary"><div><b>{filteredQuestions.length}</b><span>{filteredQuestions.length === 1 ? "dostępne pytanie" : "dostępnych pytań"}</span></div><Button type="button" size="lg" onClick={startPractice} disabled={!filteredQuestions.length}>{answeredCount ? "Kontynuuj ćwiczenia" : "Rozpocznij ćwiczenia"} <span>→</span></Button></div>
            {material === "demo" && <p className="practice-demo-note">To autorski zestaw demonstracyjny egzaminio — nie jest oficjalnym arkuszem CKE.</p>}
          </CardContent>
        </Card>
        <section className="dashboard-grid three-columns">
          <article className="metric-card"><span>Pytania demo</span><b>{questions.length}</b><small>Trzy przedmioty w jednym zestawie.</small></article>
          <article className="metric-card"><span>Poprawne odpowiedzi</span><b>{correctCount}</b><small>{answeredCount ? String(score) + "% skuteczności" : "Wynik pojawi się po pierwszym pytaniu."}</small></article>
          <article className="metric-card"><span>Do rozwiązania</span><b>{questions.length - answeredCount}</b><small>Postęp zapisujemy na koncie ucznia.</small></article>
        </section>
      </>}

      {activeView === "exercises" && <section className="practice-focus-shell" aria-label="Tryb skupienia">
        <header className="practice-focus-header">
          <div className="practice-focus-subject">
            <span>Tryb skupienia</span>
            <div><label htmlFor="practice-material">Rocznik</label><Select value={material} onValueChange={(value) => selectMaterial(value as MaterialFilter)} disabled={submitting}>
              <SelectTrigger id="practice-material" aria-label="Wybierz rocznik"><SelectValue /></SelectTrigger>
              <SelectContent>{materialOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
            </Select></div>
            <div><label htmlFor="practice-subject">Przedmiot</label><Select value={subject} onValueChange={(value) => selectSubject(value as SubjectFilter)} disabled={submitting}>
              <SelectTrigger id="practice-subject" aria-label="Wybierz przedmiot"><SelectValue /></SelectTrigger>
              <SelectContent>{availableSubjects.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
            </Select></div>
          </div>
          <div className="practice-focus-progress" aria-live="polite">
            <div><span>{currentQuestion ? subjectLabels[currentQuestion.subject] : "Ćwiczenia"}</span><b>{currentQuestion ? `${questionIndex + 1} z ${filteredQuestions.length}` : "—"}</b></div>
            <Progress value={currentQuestion ? ((questionIndex + 1) / Math.max(filteredQuestions.length, 1)) * 100 : 0} aria-label="Postęp w bieżącym zestawie" />
          </div>
          <div className="practice-focus-controls">
            <Button type="button" size="icon" variant="ghost" aria-label="Poprzednie pytanie" onClick={() => moveQuestion(-1)} disabled={submitting || filteredQuestions.length < 2}><ChevronLeft aria-hidden="true" /></Button>
            <Button type="button" size="icon" variant="ghost" aria-label="Następne pytanie" onClick={() => moveQuestion(1)} disabled={submitting || filteredQuestions.length < 2}><ChevronRight aria-hidden="true" /></Button>
            <Button type="button" variant="outline" className="practice-focus-exit" onClick={exitPractice} disabled={submitting}><LogOut aria-hidden="true" /><span>Zakończ</span></Button>
          </div>
        </header>
        <div className="practice-focus-stage">
          {error && <Alert variant="destructive" className="dashboard-alert"><AlertDescription>{error}</AlertDescription></Alert>}
          {!currentQuestion && <Alert><AlertTitle>Brak pytań w tym przedmiocie</AlertTitle><AlertDescription>Wybierz inny przedmiot, aby kontynuować ćwiczenia.</AlertDescription></Alert>}
          {currentQuestion && <Card className="practice-question-card practice-focus-question-card">
            <CardHeader>
              <div className="practice-meta"><Badge variant="outline">{subjectLabels[currentQuestion.subject]}</Badge><span>{currentQuestion.topic}</span><span>Poziom {currentQuestion.difficulty}/3</span></div>
              <h1 data-slot="card-title">{currentQuestion.prompt}</h1>
              <CardDescription>Pytanie {questionIndex + 1} z {filteredQuestions.length} · {formatQuestionSource(currentQuestion)}{currentQuestion.paper_question_number ? ` · zadanie ${currentQuestion.paper_question_number}` : ""}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="practice-answers" role="radiogroup" aria-label="Wybierz odpowiedź">
                {currentQuestion.options.map((option, index) => {
                  const correct = answerResult?.answer_correct_index === index;
                  const incorrect = Boolean(answerResult) && selectedAnswer === index && !correct;
                  const answerClass = ["practice-answer", selectedAnswer === index && "selected", correct && "correct", incorrect && "incorrect"].filter(Boolean).join(" ");
                  return <button key={option} ref={(element) => { answerRefs.current[index] = element; }} type="button" role="radio" aria-checked={selectedAnswer === index} tabIndex={selectedAnswer === index || (selectedAnswer === null && index === 0) ? 0 : -1} className={answerClass} onClick={() => selectAnswer(index)} onKeyDown={(event) => handleAnswerKeyDown(event, index)} disabled={submitting}><b>{String.fromCharCode(65 + index)}</b><span>{option}</span></button>;
                })}
              </div>
              {answerResult && <Alert variant={answerResult.answer_is_correct ? "success" : "warning"} className="practice-feedback"><AlertTitle>{answerResult.answer_is_correct ? "Dobra odpowiedź!" : "Jeszcze nie tym razem"}</AlertTitle><AlertDescription>{answerResult.answer_explanation}</AlertDescription></Alert>}
              {answerResult && <AiTutor questionId={currentQuestion.question_id} />}
              <div className="practice-actions"><Button type="button" size="lg" onClick={() => void submitAnswer()} disabled={selectedAnswer === null || submitting}>{submitting ? "Sprawdzam…" : answerResult ? "Sprawdź ponownie" : "Sprawdź odpowiedź"}</Button>{answerResult && <Button type="button" size="lg" variant="outline" onClick={() => moveQuestion(1)}>Następne pytanie <ChevronRight aria-hidden="true" /></Button>}</div>
            </CardContent>
          </Card>
          }
          <p className="practice-save-note" role="status">Odpowiedź zapisuje się na koncie po kliknięciu „Sprawdź odpowiedź”.</p>
        </div>
      </section>}

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
            return <Card key={item}><CardHeader><div className="subject-card-heading"><SubjectIcon subject={item} /><div><CardTitle>{subjectLabels[item]}</CardTitle><CardDescription>{stats.answered} z {stats.total} rozwiązanych</CardDescription></div></div></CardHeader><CardContent><div className="subject-progress-value"><b>{percent}%</b><span>{stats.correct} poprawnych</span></div><Progress value={(stats.answered / Math.max(stats.total, 1)) * 100} /></CardContent></Card>;
          })}
        </section>
        <section className="practice-paper-progress" aria-labelledby="paper-progress-title">
          <div className="guardian-section-heading"><div><Badge variant="secondary">Arkusze CKE</Badge><h3 id="paper-progress-title">Wyniki według rocznika i arkusza</h3></div><small>Pełny arkusz liczymy osobno od sesji mieszających zadania.</small></div>
          {paperProgress.length ? <div className="practice-paper-grid">{paperProgress.map((paper) => {
            const statusLabel = paper.completion_status === "completed" ? "Ukończony" : paper.completion_status === "in_progress" ? "Rozpoczęty" : "Nierozpoczęty";
            return <Card key={paper.progress_paper_id} className="practice-paper-card"><CardHeader><div className="practice-paper-title"><Badge variant={paper.completion_status === "completed" ? "default" : "outline"}>{statusLabel}</Badge><span>CKE {paper.exam_year} · {sessionLabels[paper.exam_session]}</span></div><div className="subject-card-heading compact"><SubjectIcon subject={paper.subject} /><div><CardTitle>{subjectLabels[paper.subject]}</CardTitle><CardDescription>{paper.source_label}</CardDescription></div></div></CardHeader><CardContent><div className="subject-progress-value"><b>{paper.accuracy_percent}%</b><span>{paper.correct_questions} poprawnych z {paper.answered_questions} rozwiązanych</span></div><Progress value={(paper.answered_questions / Math.max(paper.total_questions, 1)) * 100} aria-label={`Ukończenie arkusza ${paper.exam_year}: ${paper.answered_questions} z ${paper.total_questions}`} /></CardContent></Card>;
          })}</div> : <Card className="practice-paper-empty"><CardContent><b>Brak opublikowanych arkuszy CKE</b><p>Gdy pierwszy zweryfikowany arkusz zostanie zaimportowany, pojawi się tutaj jako osobny rocznik — bez mieszania z zestawem demo.</p></CardContent></Card>}
        </section>
      </>}
    </>
  );
}
