"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { DEFAULT_CKE_ACCOMMODATION, getCkeAccommodation, isCkeAccommodationCode, type CkeAccommodationCode } from "@/lib/cke-accommodations";

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
  exam_accommodation_code: CkeAccommodationCode | null;
  exam_accommodation_label: string | null;
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
  accommodation_code: CkeAccommodationCode;
  accommodation_label: string;
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
    exam_accommodation_code: isCkeAccommodationCode(value.exam_accommodation_code) ? value.exam_accommodation_code : null,
    exam_accommodation_label: value.exam_accommodation_label == null ? null : String(value.exam_accommodation_label),
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
    accommodation_code: isCkeAccommodationCode(value.accommodation_code) ? value.accommodation_code : DEFAULT_CKE_ACCOMMODATION,
    accommodation_label: String(value.accommodation_label),
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
  const accommodation = question.exam_accommodation_label ? ` · ${question.exam_accommodation_label}` : "";
  return `CKE ${question.exam_year} · ${session}${variant}${accommodation}`;
}

function useQuestionTimer(questionId: string | null, running: boolean) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!running || !questionId) return;
    const startedAt = Date.now();
    queueMicrotask(() => setElapsedSeconds(0));
    const timer = window.setInterval(() => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1_000);
    return () => window.clearInterval(timer);
  }, [questionId, running]);

  const minutes = Math.floor(elapsedSeconds / 60).toString().padStart(2, "0");
  const seconds = (elapsedSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function StudentPractice({ activeView, onNavigate }: { activeView: StudentView; onNavigate: (view: StudentView) => void }) {
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [paperProgress, setPaperProgress] = useState<PaperProgress[]>([]);
  const [subject, setSubject] = useState<SubjectFilter>("all");
  const [material, setMaterial] = useState<MaterialFilter>("demo");
  const [paperId, setPaperId] = useState("all");
  const [accommodationCode, setAccommodationCode] = useState<CkeAccommodationCode>(DEFAULT_CKE_ACCOMMODATION);
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
        const [{ data, error: questionsError }, { data: progressData, error: progressError }, { data: preferenceData, error: preferenceError }] = await Promise.all([
          supabase.rpc("get_practice_questions"),
          supabase.rpc("get_student_paper_progress"),
          supabase.rpc("get_my_cke_preference"),
        ]);
        if (questionsError || progressError || preferenceError) throw questionsError ?? progressError ?? preferenceError;
        const loaded = ((data as Record<string, unknown>[] | null) ?? []).map(normalizeQuestion);
        const progress = ((progressData as Record<string, unknown>[] | null) ?? []).map(normalizePaperProgress);
        const preference = (preferenceData as Record<string, unknown>[] | null)?.[0];
        if (active) {
          setQuestions(loaded);
          setPaperProgress(progress);
          setMaterial(defaultMaterialFilter(loaded));
          setAccommodationCode(isCkeAccommodationCode(preference?.accommodation_code) ? preference.accommodation_code : DEFAULT_CKE_ACCOMMODATION);
        }
      })
      .catch(() => {
        if (active) setError("Nie udało się pobrać materiałów. Administrator powinien zastosować najnowszą migrację Supabase.");
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
  const questionTime = useQuestionTimer(currentQuestion?.question_id ?? null, activeView === "exercises");
  const accommodation = getCkeAccommodation(accommodationCode);
  const answeredCount = questions.filter((question) => question.selected_answer !== null).length;
  const correctCount = questions.filter((question) => question.is_correct).length;
  const score = answeredCount ? Math.round((correctCount / answeredCount) * 100) : 0;
  const reviewTopics = useMemo(() => {
    const byTopic = new Map<string, { subject: Subject; topic: string; answered: number; correct: number }>();
    questions.forEach((question) => {
      if (question.selected_answer === null) return;
      const key = `${question.subject}:${question.topic}`;
      const current = byTopic.get(key) ?? { subject: question.subject, topic: question.topic, answered: 0, correct: 0 };
      current.answered += 1;
      if (question.is_correct) current.correct += 1;
      byTopic.set(key, current);
    });
    return Array.from(byTopic.values())
      .map((item) => ({ ...item, accuracy: Math.round((item.correct / item.answered) * 100) }))
      .sort((a, b) => a.accuracy - b.accuracy || b.answered - a.answered)
      .slice(0, 3);
  }, [questions]);
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
  const tutorFeedback = currentQuestion && answerResult ? {
    isCorrect: answerResult.answer_is_correct,
    correctAnswer: `${String.fromCharCode(65 + answerResult.answer_correct_index)}. ${currentQuestion.options[answerResult.answer_correct_index]}`,
    explanation: answerResult.answer_explanation,
  } : null;
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
        <div className="dashboard-view-heading student-start-heading"><div><span className="dashboard-kicker dark-kicker">Panel ucznia</span><h2>Nauka</h2><small>Arkusze CKE i wyraźnie oznaczony zestaw demonstracyjny</small></div><Button variant="outline" type="button" onClick={() => onNavigate("progress")}>Twój postęp</Button></div>
        <section className="student-resume-grid">
          <Card className="student-resume-card">
            <CardHeader><CardDescription>{answeredCount ? `Ostatnio: ${material === "demo" ? "zestaw demonstracyjny" : material.replace("year:", "CKE ")}` : "Pierwsza sesja"}</CardDescription><CardTitle>{answeredCount ? "Wróć do nauki" : "Zacznij od jednego zadania"}</CardTitle></CardHeader>
            <CardContent><p>{filteredQuestions.length ? `${Math.max(filteredQuestions.length - answeredCount, 0)} zadań czeka w wybranym materiale. Nie musisz kończyć całego arkusza podczas jednej sesji.` : "Wybierz dostępny materiał poniżej, aby rozpocząć."}</p><div><Button type="button" onClick={startPractice} disabled={!filteredQuestions.length}>{answeredCount ? "Kontynuuj arkusz" : "Rozpocznij"}</Button><Button variant="outline" type="button" onClick={() => onNavigate("progress")}>Zobacz wyniki</Button></div></CardContent>
          </Card>
          <Card className="student-summary-card"><CardContent><div><span>Rozwiązane zadania</span><b>{answeredCount}</b></div><div><span>Poprawne odpowiedzi</span><b>{score}%</b></div><div><span>Twój arkusz CKE</span><strong>{accommodation.label} ({accommodation.code})</strong><small>Ustawia rodzic</small></div></CardContent></Card>
        </section>
        <Card className="practice-launch-card">
          <CardHeader><div><CardTitle>Wybierz materiał</CardTitle><CardDescription>Dostępne {questions.length} zadań · {questions.length - answeredCount} nierozwiązanych · wariant CKE {accommodation.code}</CardDescription></div></CardHeader>
          <CardContent>
            {!questions.length && <Alert><AlertTitle>Brak opublikowanych arkuszy dla wariantu „{accommodation.label}”</AlertTitle><AlertDescription>Nie przełączamy Cię automatycznie na inny wariant. Rodzic może sprawdzić ustawienie w panelu „Dzieci”, a nowe dopasowane arkusze pojawią się po publikacji.</AlertDescription></Alert>}
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
      </>}

      {activeView === "exercises" && <section className="task-screen" aria-label="Tryb skupienia">
        <header className="task-topbar">
          <div className="task-topbar-context">
            <button type="button" className="task-exit" aria-label="Zakończ" onClick={exitPractice} disabled={submitting}>← Wyjdź</button>
            <div className="task-filters">
              <Select value={material} onValueChange={(value) => selectMaterial(value as MaterialFilter)} disabled={submitting}>
                <SelectTrigger aria-label="Wybierz rocznik"><SelectValue /></SelectTrigger>
                <SelectContent>{materialOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={subject} onValueChange={(value) => selectSubject(value as SubjectFilter)} disabled={submitting}>
                <SelectTrigger aria-label="Wybierz przedmiot"><SelectValue /></SelectTrigger>
                <SelectContent>{availableSubjects.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
              </Select>
              {currentQuestion && <span>· {currentQuestion.source_type === "cke" ? `${currentQuestion.exam_accommodation_label || "Arkusz CKE"} · ${currentQuestion.exam_session ? sessionLabels[currentQuestion.exam_session] : "sesja główna"}` : "Zestaw demonstracyjny"}</span>}
            </div>
          </div>
          <div className="task-progress" aria-live="polite">
            <span className="task-timer"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></svg>{questionTime}</span>
            <span>Zadanie <strong>{currentQuestion ? questionIndex + 1 : "—"}</strong> z {filteredQuestions.length}</span>
            <Progress value={currentQuestion ? ((questionIndex + 1) / Math.max(filteredQuestions.length, 1)) * 100 : 0} aria-label="Postęp w bieżącym zestawie" />
          </div>
        </header>

        {error && <Alert variant="destructive" className="task-screen-alert"><AlertDescription>{error}</AlertDescription></Alert>}
        {!currentQuestion && <div className="task-empty"><Alert><AlertTitle>Brak pytań w tym przedmiocie</AlertTitle><AlertDescription>Wybierz inny przedmiot, aby kontynuować ćwiczenia.</AlertDescription></Alert></div>}
        {currentQuestion && <div className="task-workspace">
          <main className="task-question">
            <div className="task-question-meta">
              <span>{currentQuestion.source_type === "cke" ? "Arkusz CKE" : "Demo"}</span>
              <span>{currentQuestion.topic}</span>
              <p>{currentQuestion.source_type === "cke" ? `Egzamin ósmoklasisty ${currentQuestion.exam_year ?? ""}` : subjectLabels[currentQuestion.subject]}{currentQuestion.paper_question_number ? ` · zadanie ${currentQuestion.paper_question_number}` : ""}</p>
            </div>

            <div className="task-prompt">
              <h1 className="mathjax_process">{currentQuestion.prompt}</h1>
              <small>Pytanie {questionIndex + 1} z {filteredQuestions.length} · {formatQuestionSource(currentQuestion)}{currentQuestion.paper_question_number ? ` · zadanie ${currentQuestion.paper_question_number}` : ""}</small>
            </div>

            <div className="task-answers" role="radiogroup" aria-label="Wybierz odpowiedź">
              {currentQuestion.options.map((option, index) => {
                const correct = answerResult?.answer_correct_index === index;
                const incorrect = Boolean(answerResult) && selectedAnswer === index && !correct;
                const muted = Boolean(answerResult) && !correct && !incorrect;
                const answerClass = ["task-answer", selectedAnswer === index && "is-selected", correct && "is-correct", incorrect && "is-incorrect", muted && "is-muted"].filter(Boolean).join(" ");
                return <button key={option} ref={(element) => { answerRefs.current[index] = element; }} type="button" role="radio" aria-checked={selectedAnswer === index} tabIndex={selectedAnswer === index || (selectedAnswer === null && index === 0) ? 0 : -1} className={answerClass} onClick={() => selectAnswer(index)} onKeyDown={(event) => handleAnswerKeyDown(event, index)} disabled={submitting || Boolean(answerResult)}><b>{String.fromCharCode(65 + index)}</b><span>{option}</span>{incorrect && <em>Twoja odpowiedź</em>}{correct && <em>Poprawna</em>}</button>;
              })}
            </div>

            {answerResult && <div className={`task-verdict ${answerResult.answer_is_correct ? "is-correct" : "is-incorrect"}`} data-comment-anchor="verdict">
              <div><span>{answerResult.answer_is_correct ? "✓" : "✕"}</span><b>{answerResult.answer_is_correct ? "Dobrze" : "Jeszcze nie to"}</b><small>{answerResult.answer_is_correct ? "1 / 1 pkt" : "0 / 1 pkt"}</small></div>
              <p>{answerResult.answer_is_correct ? answerResult.answer_explanation : `Poprawna odpowiedź: ${String.fromCharCode(65 + answerResult.answer_correct_index)}. ${currentQuestion.options[answerResult.answer_correct_index]}. ${answerResult.answer_explanation}`}</p>
            </div>}

            <footer className="task-actions">
              <Button type="button" size="lg" onClick={answerResult ? () => moveQuestion(1) : () => void submitAnswer()} disabled={!answerResult && (selectedAnswer === null || submitting)}>{submitting ? "Sprawdzam…" : answerResult ? "Następne zadanie" : "Sprawdź odpowiedź"}</Button>
              <span>{answerResult ? `Wynik zapisany w postępie. Następne: zadanie ${(questionIndex + 1) % filteredQuestions.length + 1} z ${filteredQuestions.length}.` : selectedAnswer === null ? "Wybierz jedną z odpowiedzi, żeby sprawdzić." : "Odpowiedź zapisujemy dopiero po sprawdzeniu."}</span>
              <nav aria-label="Nawigacja między zadaniami"><button type="button" aria-label="Poprzednie pytanie" onClick={() => moveQuestion(-1)} disabled={submitting || filteredQuestions.length < 2}>← Poprzednie</button><button type="button" aria-label="Następne pytanie" onClick={() => moveQuestion(1)} disabled={submitting || filteredQuestions.length < 2}>Następne →</button></nav>
            </footer>
          </main>

          <aside className={`task-support${tutorFeedback ? " has-feedback" : ""}`} aria-label="Odpowiedź, podpowiedzi i rozmowa z AI"><AiTutor questionId={currentQuestion.question_id} feedback={tutorFeedback} /></aside>
        </div>}
      </section>}

      {activeView === "progress" && <>
        <div className="dashboard-view-heading"><div><h2>Twój postęp</h2><small>Wyniki z arkuszy CKE i materiałów demonstracyjnych</small></div><Button variant="outline" type="button" onClick={() => onNavigate("exercises")}>Wróć do ćwiczeń</Button></div>
        <section className="dashboard-grid four-columns student-progress-metrics">
          <article className="metric-card"><span>Rozwiązane zadania</span><b>{answeredCount}</b><small>{questions.length - answeredCount} nadal czeka.</small></article>
          <article className="metric-card"><span>Poprawne odpowiedzi</span><b>{correctCount}</b><small>Liczymy ostatnią odpowiedź.</small></article>
          <article className="metric-card"><span>Skuteczność</span><b>{score}%</b><small>Ze sprawdzonych zadań.</small></article>
          <article className="metric-card"><span>Arkusze CKE</span><b>{paperProgress.filter((paper) => paper.completion_status !== "not_started").length}</b><small>Rozpoczęte lub ukończone.</small></article>
        </section>
        <section className="student-progress-layout">
          <Card className="student-subject-overview">
            <CardHeader><CardTitle>Postęp według przedmiotu</CardTitle></CardHeader>
            <CardContent>{(["mathematics", "polish", "english"] as Subject[]).map((item) => {
              const stats = subjectStats(item);
              const percent = stats.answered ? Math.round((stats.correct / stats.answered) * 100) : 0;
              return <div className="student-subject-row" key={item}><div className="subject-card-heading"><SubjectIcon subject={item} /><div><b>{subjectLabels[item]}</b><span>{stats.answered} zadań · {percent}% poprawnych</span></div></div><Progress value={(stats.answered / Math.max(stats.total, 1)) * 100} /></div>;
            })}</CardContent>
          </Card>
          <Card className="student-review-card">
            <CardHeader><CardTitle>Do powtórki</CardTitle><CardDescription>Tematy z najniższą skutecznością.</CardDescription></CardHeader>
            <CardContent>{reviewTopics.length ? reviewTopics.map((topic) => <div key={`${topic.subject}:${topic.topic}`}><span><b>{topic.topic}</b><small>{subjectLabels[topic.subject]} · {topic.correct} z {topic.answered} poprawnych</small></span><Badge variant="outline">{topic.accuracy}%</Badge></div>) : <p>Po pierwszych sprawdzonych zadaniach pokażemy tutaj tematy do krótkiej powtórki.</p>}</CardContent>
          </Card>
        </section>
        <section className="practice-paper-progress" aria-labelledby="paper-progress-title">
          <div className="guardian-section-heading"><div><Badge variant="secondary">Arkusze CKE</Badge><h3 id="paper-progress-title">Wyniki według rocznika i arkusza</h3></div><small>Pełny arkusz liczymy osobno od sesji mieszających zadania.</small></div>
          {paperProgress.length ? <div className="practice-paper-grid">{paperProgress.map((paper) => {
            const statusLabel = paper.completion_status === "completed" ? "Ukończony" : paper.completion_status === "in_progress" ? "Rozpoczęty" : "Nierozpoczęty";
            return <Card key={paper.progress_paper_id} className="practice-paper-card"><CardHeader><div className="practice-paper-title"><Badge variant={paper.completion_status === "completed" ? "default" : "outline"}>{statusLabel}</Badge><span>CKE {paper.exam_year} · {sessionLabels[paper.exam_session]} · kod {paper.accommodation_code}</span></div><div className="subject-card-heading compact"><SubjectIcon subject={paper.subject} /><div><CardTitle>{subjectLabels[paper.subject]}</CardTitle><CardDescription>{paper.accommodation_label} · {paper.source_label}</CardDescription></div></div></CardHeader><CardContent><div className="subject-progress-value"><b>{paper.accuracy_percent}%</b><span>{paper.correct_questions} poprawnych z {paper.answered_questions} rozwiązanych</span></div><Progress value={(paper.answered_questions / Math.max(paper.total_questions, 1)) * 100} aria-label={`Ukończenie arkusza ${paper.exam_year}: ${paper.answered_questions} z ${paper.total_questions}`} /></CardContent></Card>;
          })}</div> : <Card className="practice-paper-empty"><CardContent><b>Brak opublikowanych arkuszy CKE</b><p>Gdy pierwszy zweryfikowany arkusz zostanie zaimportowany, pojawi się tutaj jako osobny rocznik — bez mieszania z zestawem demo.</p></CardContent></Card>}
        </section>
      </>}

      {activeView === "settings" && <Card className="student-cke-settings-card">
        <CardHeader><Badge variant="secondary">Kryteria CKE</Badge><CardTitle>Twój wariant arkuszy</CardTitle><CardDescription>To ustawienie określa, które oficjalne arkusze mogą pojawić się na Twoim koncie.</CardDescription></CardHeader>
        <CardContent><div className="student-cke-current"><span>Kod CKE {accommodation.code}</span><b>{accommodation.label}</b><p>{accommodation.audience}</p></div><Alert><AlertTitle>Ustawienie kontroluje rodzic</AlertTitle><AlertDescription>Rodzic może zmienić wariant przy Twoim koncie w panelu „Dzieci”. Nie prosimy o diagnozę ani dokumentację medyczną.</AlertDescription></Alert></CardContent>
      </Card>}
    </>
  );
}
