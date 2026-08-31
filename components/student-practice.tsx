"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Full-page anchors avoid a Vinext production navigation failure. */

import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getSupabaseClient } from "@/lib/supabase-browser";
import { isSubjectKey, SUBJECT_KEYS, SubjectIcon, subjectLabels, type SubjectKey } from "@/components/subject-icon";
import { AiTutor } from "@/components/ai-tutor";
import { ThemeSettings } from "@/components/theme-settings";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { CkeQuestionContent, type CkeContentBlock, type CkeQuestionAsset } from "@/components/cke-question-content";
import { FREE_PRACTICE_QUESTIONS_PER_DAY } from "@/lib/plans";
import { PromoCodeRedemption } from "@/components/promo-code-redemption";
import { PracticeQuestionPrompt } from "@/components/practice-question-prompt";
import { ArrowRight } from "lucide-react";

export type StudentView = "start" | "exercises" | "progress" | "settings";
type Subject = SubjectKey;
export type SubjectFilter = "all" | Subject;
export type MaterialFilter = "demo" | "all-cke" | `year:${number}`;
export type PracticeSelection = {
  subject: SubjectFilter;
  material: MaterialFilter;
  paperId: string;
};
type ExamSession = "main" | "additional";
type QuestionType = "single_choice" | "multiple_choice" | "numeric" | "short_text" | "long_text";
type GradingStatus = "auto" | "awaiting_self_assessment" | "self_assessed";

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
  question_type: QuestionType;
  content_blocks: CkeContentBlock[];
  assets: CkeQuestionAsset[];
  scoring: { max_points?: number; rules?: string[] };
  difficulty: number;
  sort_order: number;
  selected_answer: number | null;
  selected_response: Record<string, unknown> | null;
  is_correct: boolean | null;
  points_awarded: number | null;
  max_points: number | null;
  grading_status: GradingStatus | null;
  attempt_count: number;
  correct_answer: number | null;
  revealed_answer_key: Record<string, unknown> | null;
  explanation: string | null;
};

type PaperProgress = {
  progress_paper_id: string;
  exam_year: number;
  exam_session: ExamSession;
  subject: Subject;
  variant_code: string;
  source_label: string;
  source_document_id: string | null;
  total_questions: number;
  answered_questions: number;
  correct_questions: number;
  accuracy_percent: number;
  earned_points: number;
  available_points: number;
  score_percent: number;
  completion_status: "not_started" | "in_progress" | "completed";
};

type AnswerResult = {
  answer_is_correct: boolean | null;
  answer_correct_index: number | null;
  answer_key: Record<string, unknown>;
  answer_explanation: string;
  answer_attempt_count: number;
  awarded_points: number | null;
  question_max_points: number;
  response_grading_status: GradingStatus;
  solved_count: number;
  correct_count: number;
};

type PracticeAccess = {
  active_plan: "free" | "plus";
  practice_used_today: number;
  practice_daily_limit: number | null;
  progress_enabled: boolean;
  ai_enabled: boolean;
};

type BasicProgress = {
  solved_count: number;
  correct_count: number;
  accuracy_percent: number;
};

function normalizePracticeAccess(value: Record<string, unknown> | undefined, hasPlusAccess: boolean): PracticeAccess {
  const isPlus = value?.active_plan === "plus" || (value?.active_plan == null && hasPlusAccess);
  return {
    active_plan: isPlus ? "plus" : "free",
    practice_used_today: Math.max(0, Number(value?.practice_used_today) || 0),
    practice_daily_limit: isPlus ? null : Math.max(0, Number(value?.practice_daily_limit) || FREE_PRACTICE_QUESTIONS_PER_DAY),
    progress_enabled: true,
    ai_enabled: value?.ai_enabled !== false,
  };
}

function normalizeBasicProgress(value: Record<string, unknown> | undefined): BasicProgress {
  return {
    solved_count: Math.max(0, Number(value?.solved_count) || 0),
    correct_count: Math.max(0, Number(value?.correct_count) || 0),
    accuracy_percent: Math.min(100, Math.max(0, Number(value?.accuracy_percent) || 0)),
  };
}

const subjects: { value: SubjectFilter; label: string }[] = [
  { value: "all", label: "Wszystkie" },
  { value: "mathematics", label: "Matematyka" },
  { value: "polish", label: "Język polski" },
  { value: "english", label: "Język angielski" },
  { value: "french", label: "Język francuski" },
  { value: "spanish", label: "Język hiszpański" },
  { value: "german", label: "Język niemiecki" },
  { value: "russian", label: "Język rosyjski" },
  { value: "italian", label: "Język włoski" },
];

const sessionLabels: Record<ExamSession, string> = {
  main: "termin główny",
  additional: "termin dodatkowy",
};

function paperCountLabel(count: number) {
  if (count === 1) return "1 arkusz";
  if (count >= 2 && count <= 4) return `${count} arkusze`;
  return `${count} arkuszy`;
}

export const UNSAVED_ANSWER_MESSAGE = "Masz wybraną odpowiedź, której jeszcze nie sprawdzono. Opuścić ją bez zapisywania?";

export function hasUnsavedPracticeAnswer(
  questionId: string | null,
  persistedAnswer: number | null,
  draftAnswer: { questionId: string; index: number } | null,
) {
  return Boolean(questionId && draftAnswer?.questionId === questionId && draftAnswer.index !== persistedAnswer);
}

export function countResponseWords(value: string) {
  const normalized = value.trim();
  return normalized ? normalized.split(/\s+/u).length : 0;
}

function normalizeQuestion(value: Record<string, unknown>): PracticeQuestion {
  const subject = value.subject;
  const sourceType = value.source_type;
  if (!isSubjectKey(subject)) {
    throw new Error("invalid_subject");
  }
  if (sourceType !== "demo" && sourceType !== "cke") {
    throw new Error("invalid_source_type");
  }
  if (!Array.isArray(value.options)) {
    throw new Error("invalid_options");
  }
  const questionType = value.question_type ?? "single_choice";
  if (!["single_choice", "multiple_choice", "numeric", "short_text", "long_text"].includes(String(questionType))) throw new Error("invalid_question_type");
  if ((questionType === "single_choice" || questionType === "multiple_choice") && value.options.length < 2) throw new Error("invalid_options");
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
    question_type: questionType as QuestionType,
    content_blocks: Array.isArray(value.content_blocks) ? value.content_blocks as CkeContentBlock[] : [],
    assets: Array.isArray(value.assets) ? value.assets as CkeQuestionAsset[] : [],
    scoring: value.scoring && typeof value.scoring === "object" ? value.scoring as PracticeQuestion["scoring"] : { max_points: 1 },
    difficulty: Number(value.difficulty),
    sort_order: Number(value.sort_order),
    selected_answer: value.selected_answer == null ? null : Number(value.selected_answer),
    selected_response: value.selected_response && typeof value.selected_response === "object" ? value.selected_response as Record<string, unknown> : null,
    is_correct: value.is_correct == null ? null : Boolean(value.is_correct),
    points_awarded: value.points_awarded == null ? null : Number(value.points_awarded),
    max_points: value.max_points == null ? null : Number(value.max_points),
    grading_status: value.grading_status == null ? null : value.grading_status as GradingStatus,
    attempt_count: Number(value.attempt_count ?? 0),
    correct_answer: value.correct_answer == null ? null : Number(value.correct_answer),
    revealed_answer_key: value.revealed_answer_key && typeof value.revealed_answer_key === "object" ? value.revealed_answer_key as Record<string, unknown> : null,
    explanation: value.explanation == null ? null : String(value.explanation),
  };
}

function normalizePaperProgress(value: Record<string, unknown>): PaperProgress {
  const subject = value.subject;
  const session = value.exam_session;
  const status = value.completion_status;
  if (!isSubjectKey(subject)) throw new Error("invalid_subject");
  if (session !== "main" && session !== "additional") throw new Error("invalid_exam_session");
  if (status !== "not_started" && status !== "in_progress" && status !== "completed") throw new Error("invalid_completion_status");
  return {
    progress_paper_id: String(value.progress_paper_id),
    exam_year: Number(value.exam_year),
    exam_session: session,
    subject,
    variant_code: String(value.variant_code),
    source_label: String(value.source_label),
    source_document_id: value.source_document_id == null ? null : String(value.source_document_id),
    total_questions: Number(value.total_questions),
    answered_questions: Number(value.answered_questions),
    correct_questions: Number(value.correct_questions),
    accuracy_percent: Number(value.accuracy_percent),
    earned_points: Number(value.earned_points ?? 0),
    available_points: Number(value.available_points ?? 0),
    score_percent: Number(value.score_percent ?? value.accuracy_percent ?? 0),
    completion_status: status,
  };
}

export function buildPaperCatalog(questions: PracticeQuestion[], progress: PaperProgress[]) {
  const papers = new Map<string, PaperProgress>();
  questions.forEach((question) => {
    if (question.source_type !== "cke" || !question.exam_paper_id || !question.exam_year || !question.exam_session) return;
    const current = papers.get(question.exam_paper_id);
    papers.set(question.exam_paper_id, {
      progress_paper_id: question.exam_paper_id,
      exam_year: question.exam_year,
      exam_session: question.exam_session,
      subject: question.subject,
      variant_code: question.exam_variant ?? "standard",
      source_label: question.source_label,
      source_document_id: current?.source_document_id ?? question.source_document_id,
      total_questions: (current?.total_questions ?? 0) + 1,
      answered_questions: current?.answered_questions ?? 0,
      correct_questions: current?.correct_questions ?? 0,
      accuracy_percent: current?.accuracy_percent ?? 0,
      earned_points: current?.earned_points ?? 0,
      available_points: current?.available_points ?? 0,
      score_percent: current?.score_percent ?? 0,
      completion_status: current?.completion_status ?? "not_started",
    });
  });
  progress.forEach((result) => {
    const available = papers.get(result.progress_paper_id);
    papers.set(result.progress_paper_id, {
      ...available,
      ...result,
      source_document_id: available?.source_document_id ?? result.source_document_id,
      total_questions: Math.max(available?.total_questions ?? 0, result.total_questions),
    });
  });
  return Array.from(papers.values()).sort((left, right) =>
    right.exam_year - left.exam_year
    || SUBJECT_KEYS.indexOf(left.subject) - SUBJECT_KEYS.indexOf(right.subject)
    || left.exam_session.localeCompare(right.exam_session)
    || left.variant_code.localeCompare(right.variant_code),
  );
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

export function resolvePaperSelection(questions: PracticeQuestion[], selectedPaperId: string) {
  if (selectedPaperId === "all") return null;
  const paperQuestions = questions.filter((question) => question.exam_paper_id === selectedPaperId);
  const firstQuestion = paperQuestions[0];
  if (!firstQuestion || firstQuestion.source_type !== "cke" || !firstQuestion.exam_year) return null;
  return {
    paperId: selectedPaperId,
    material: `year:${firstQuestion.exam_year}` as MaterialFilter,
    subject: firstQuestion.subject,
    questions: paperQuestions,
  };
}

export function formatQuestionSource(question: PracticeQuestion) {
  if (question.source_type === "demo") return "Zestaw demonstracyjny egzaminio";
  const session = question.exam_session ? sessionLabels[question.exam_session] : "arkusz CKE";
  const variant = question.exam_variant && question.exam_variant !== "standard" ? ` · wariant ${question.exam_variant}` : "";
  return `CKE ${question.exam_year} · ${session}${variant}`;
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

export function StudentPractice({
  activeView,
  onNavigate,
  hasPlusAccess = true,
  selection,
  onSelectionChange,
}: {
  activeView: StudentView;
  onNavigate: (view: StudentView) => void;
  hasPlusAccess?: boolean;
  selection?: PracticeSelection | null;
  onSelectionChange?: (selection: PracticeSelection) => void;
}) {
  const initialSelection = useRef(selection);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [paperProgress, setPaperProgress] = useState<PaperProgress[]>([]);
  const [basicProgress, setBasicProgress] = useState<BasicProgress>(() => normalizeBasicProgress(undefined));
  const [paperYearFilter, setPaperYearFilter] = useState<number | null>(null);
  const [subject, setSubject] = useState<SubjectFilter>(selection?.subject ?? "all");
  const [material, setMaterial] = useState<MaterialFilter>(selection?.material ?? "demo");
  const [paperId, setPaperId] = useState(selection?.paperId ?? "all");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [draftAnswer, setDraftAnswer] = useState<{ questionId: string; index: number } | null>(null);
  const [draftMultiple, setDraftMultiple] = useState<{ questionId: string; indices: number[] } | null>(null);
  const [draftText, setDraftText] = useState<{ questionId: string; text: string } | null>(null);
  const [submittedAnswer, setSubmittedAnswer] = useState<(AnswerResult & { questionId: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [paperProgressError, setPaperProgressError] = useState("");
  const [access, setAccess] = useState<PracticeAccess>(() => normalizePracticeAccess(undefined, hasPlusAccess));
  const answerRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    let active = true;
    getSupabaseClient()
      .then(async (supabase) => {
        const { data, error: questionsError } = await supabase.rpc("get_practice_questions");
        if (questionsError) throw questionsError;
        const loaded = ((data as Record<string, unknown>[] | null) ?? []).map(normalizeQuestion);
        const [accessOutcome, basicProgressOutcome, progressOutcome] = await Promise.allSettled([
          supabase.rpc("get_student_practice_access"),
          supabase.rpc("get_student_basic_progress"),
          hasPlusAccess ? supabase.rpc("get_student_paper_progress") : Promise.resolve({ data: [], error: null }),
        ]);
        const accessResult = accessOutcome.status === "fulfilled" && !accessOutcome.value.error ? accessOutcome.value : null;
        const basicProgressResult = basicProgressOutcome.status === "fulfilled" && !basicProgressOutcome.value.error ? basicProgressOutcome.value : null;
        const progressResult = progressOutcome.status === "fulfilled" && !progressOutcome.value.error ? progressOutcome.value : null;
        const progress = ((progressResult?.data as Record<string, unknown>[] | null) ?? []).map(normalizePaperProgress);
        const basic = normalizeBasicProgress(((basicProgressResult?.data as Record<string, unknown>[] | null) ?? [])[0]);
        const nextAccess = normalizePracticeAccess(((accessResult?.data as Record<string, unknown>[] | null) ?? [])[0], hasPlusAccess);
        if (active) {
          setQuestions(loaded);
          setPaperProgress(progress);
          setBasicProgress(basic);
          setPaperProgressError(hasPlusAccess && !progressResult ? "Nie udało się pobrać wyników arkuszy. Zadania nadal są dostępne — spróbuj odświeżyć panel za chwilę." : "");
          setAccess(nextAccess);
          const restoredSelection = initialSelection.current;
          const canRestoreSelection = restoredSelection
            ? filterPracticeQuestions(loaded, restoredSelection.subject, restoredSelection.material, restoredSelection.paperId).length > 0
            : false;
          if (restoredSelection && canRestoreSelection) {
            setSubject(restoredSelection.subject);
            setMaterial(restoredSelection.material);
            setPaperId(restoredSelection.paperId);
          } else {
            const nextMaterial = defaultMaterialFilter(loaded);
            setSubject("all");
            setMaterial(nextMaterial);
            setPaperId("all");
            onSelectionChange?.({ subject: "all", material: nextMaterial, paperId: "all" });
          }
        }
      })
      .catch(() => {
        if (active) setError("Nie udało się pobrać zadań. Odśwież panel i spróbuj ponownie.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [hasPlusAccess, onSelectionChange]);

  const examYears = useMemo(
    () => Array.from(new Set(questions.flatMap((question) => question.source_type === "cke" && question.exam_year ? [question.exam_year] : []))).sort((a, b) => b - a),
    [questions],
  );
  const paperCatalog = useMemo(() => buildPaperCatalog(questions, paperProgress), [paperProgress, questions]);
  const paperProgressYears = useMemo(
    () => Array.from(new Set(paperCatalog.map((paper) => paper.exam_year))).sort((a, b) => b - a),
    [paperCatalog],
  );
  const groupedPaperProgress = useMemo(() => {
    const groups = new Map<number, PaperProgress[]>();
    paperCatalog
      .filter((paper) => paperYearFilter === null || paper.exam_year === paperYearFilter)
      .forEach((paper) => groups.set(paper.exam_year, [...(groups.get(paper.exam_year) ?? []), paper]));
    return Array.from(groups.entries()).sort(([left], [right]) => right - left);
  }, [paperCatalog, paperYearFilter]);
  const paperCatalogQuestionCount = paperCatalog.reduce((sum, paper) => sum + paper.total_questions, 0);
  const startedPaperCount = paperCatalog.filter((paper) => paper.completion_status !== "not_started").length;
  const completedPaperCount = paperCatalog.filter((paper) => paper.completion_status === "completed").length;
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
        label: `${subjectLabels[question.subject]} · ${question.exam_year} · ${question.exam_session ? sessionLabels[question.exam_session] : "CKE"}${question.exam_variant && question.exam_variant !== "standard" ? ` · ${question.exam_variant}` : ""}`,
        count: (current?.count ?? 0) + 1,
      });
    });
    return Array.from(byPaper.values());
  }, [questions, subject, material]);
  const materialBreakdown = useMemo(() => SUBJECT_KEYS.flatMap((subjectKey) => {
    const subjectQuestions = filterPracticeQuestions(questions, subjectKey, material);
    if (!subjectQuestions.length) return [];
    const paperCount = new Set(subjectQuestions.flatMap((question) => question.exam_paper_id ? [question.exam_paper_id] : [])).size;
    return [{ subject: subjectKey, questionCount: subjectQuestions.length, paperCount }];
  }), [material, questions]);
  const filteredQuestions = useMemo(
    () => filterPracticeQuestions(questions, subject, material, paperId),
    [questions, subject, material, paperId],
  );
  const currentQuestion = filteredQuestions[questionIndex] ?? null;
  const questionTime = useQuestionTimer(currentQuestion?.question_id ?? null, activeView === "exercises");
  const loadedAnsweredCount = questions.filter((question) => question.selected_response !== null || question.selected_answer !== null).length;
  const loadedCorrectCount = questions.filter((question) => question.is_correct).length;
  const answeredCount = Math.max(loadedAnsweredCount, basicProgress.solved_count);
  const correctCount = Math.max(loadedCorrectCount, basicProgress.correct_count);
  const correctAnswerPercentage = answeredCount ? Math.round((correctCount / answeredCount) * 100) : basicProgress.accuracy_percent;
  const earnedPoints = questions.reduce((sum, question) => sum + (question.points_awarded ?? (question.is_correct ? 1 : 0)), 0);
  const availablePoints = questions.reduce((sum, question) => sum + ((question.selected_response !== null || question.selected_answer !== null) ? (question.max_points ?? question.scoring.max_points ?? 1) : 0), 0);
  const score = availablePoints ? Math.round((earnedPoints / availablePoints) * 100) : 0;
  const practiceRemaining = access.practice_daily_limit === null ? null : Math.max(0, access.practice_daily_limit - access.practice_used_today);
  const practiceLimitReached = practiceRemaining === 0;
  const progressEnabled = access.progress_enabled;
  const detailedProgressEnabled = access.active_plan === "plus";
  const aiEnabled = access.ai_enabled;
  const reviewTopics = useMemo(() => {
    const byTopic = new Map<string, { subject: Subject; topic: string; answered: number; correct: number }>();
    questions.forEach((question) => {
      if (question.selected_response === null && question.selected_answer === null) return;
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
  const selectedIndices = currentQuestion && draftMultiple?.questionId === currentQuestion.question_id
    ? draftMultiple.indices
    : Array.isArray(currentQuestion?.selected_response?.indices)
      ? currentQuestion.selected_response.indices.map(Number)
      : [];
  const writtenAnswer = currentQuestion && draftText?.questionId === currentQuestion.question_id
    ? draftText.text
    : typeof currentQuestion?.selected_response?.text === "string"
      ? currentQuestion.selected_response.text
      : "";
  const isPolishEssay = currentQuestion?.subject === "polish" && currentQuestion.paper_question_number === 18;
  const isForeignLanguageEmail = Boolean(currentQuestion && !["mathematics", "polish"].includes(currentQuestion.subject) && currentQuestion.paper_question_number === 14);
  const isExtendedWriting = isPolishEssay || isForeignLanguageEmail;
  const answerResult = currentQuestion && submittedAnswer?.questionId === currentQuestion.question_id
    ? submittedAnswer
    : currentQuestion?.grading_status && currentQuestion.explanation
      ? {
          questionId: currentQuestion.question_id,
          answer_is_correct: currentQuestion.is_correct,
          answer_correct_index: currentQuestion.correct_answer,
          answer_key: currentQuestion.revealed_answer_key ?? {},
          answer_explanation: currentQuestion.explanation,
          answer_attempt_count: currentQuestion.attempt_count,
          awarded_points: currentQuestion.points_awarded,
          question_max_points: currentQuestion.max_points ?? currentQuestion.scoring.max_points ?? 1,
          response_grading_status: currentQuestion.grading_status,
          solved_count: answeredCount,
          correct_count: correctCount,
        }
      : null;
  const correctIndices = Array.isArray(answerResult?.answer_key?.correct_indices) ? answerResult.answer_key.correct_indices.map(Number) : [];
  const tutorFeedback = currentQuestion && answerResult ? {
    isCorrect: answerResult.answer_is_correct,
    correctAnswer: currentQuestion.question_type === "single_choice" && answerResult.answer_correct_index !== null
      ? `${String.fromCharCode(65 + answerResult.answer_correct_index)}. ${currentQuestion.options[answerResult.answer_correct_index]}`
      : currentQuestion.question_type === "multiple_choice"
        ? correctIndices.map((index) => `${String.fromCharCode(65 + index)}. ${currentQuestion.options[index]}`).join(" · ")
        : "Rozwiązanie otwarte · porównaj z kryteriami CKE",
    explanation: answerResult.answer_explanation,
  } : null;
  const hasUnsavedAnswer = hasUnsavedPracticeAnswer(
    currentQuestion?.question_id ?? null,
    currentQuestion?.selected_answer ?? null,
    draftAnswer,
  ) || Boolean(currentQuestion && draftMultiple?.questionId === currentQuestion.question_id && JSON.stringify([...draftMultiple.indices].sort()) !== JSON.stringify(Array.isArray(currentQuestion.selected_response?.indices) ? [...currentQuestion.selected_response.indices].map(Number).sort() : []))
    || Boolean(currentQuestion && draftText?.questionId === currentQuestion.question_id && draftText.text !== (typeof currentQuestion.selected_response?.text === "string" ? currentQuestion.selected_response.text : ""));

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

  function clearDrafts() {
    setDraftAnswer(null);
    setDraftMultiple(null);
    setDraftText(null);
  }

  function selectSubject(nextSubject: SubjectFilter) {
    if (nextSubject === subject || !confirmDraftDiscard()) return;
    setSubject(nextSubject);
    setPaperId("all");
    onSelectionChange?.({ subject: nextSubject, material, paperId: "all" });
    setQuestionIndex(0);
    clearDrafts();
    setSubmittedAnswer(null);
    setError("");
  }

  function selectMaterial(nextMaterial: MaterialFilter) {
    if (nextMaterial === material || !confirmDraftDiscard()) return;
    const nextQuestions = filterPracticeQuestions(questions, "all", nextMaterial);
    setMaterial(nextMaterial);
    setPaperId("all");
    const nextSubject = subject !== "all" && !nextQuestions.some((question) => question.subject === subject) ? "all" : subject;
    if (nextSubject !== subject) setSubject(nextSubject);
    onSelectionChange?.({ subject: nextSubject, material: nextMaterial, paperId: "all" });
    setQuestionIndex(0);
    clearDrafts();
    setSubmittedAnswer(null);
    setError("");
  }

  function selectPaper(nextPaperId: string) {
    if (nextPaperId === paperId || !confirmDraftDiscard()) return;
    if (nextPaperId !== "all") {
      const selection = resolvePaperSelection(questions, nextPaperId);
      if (!selection) {
        setError("Nie udało się otworzyć wybranego arkusza. Odśwież panel i spróbuj ponownie.");
        return;
      }
      setMaterial(selection.material);
      setSubject(selection.subject);
      onSelectionChange?.({ subject: selection.subject, material: selection.material, paperId: nextPaperId });
    } else {
      onSelectionChange?.({ subject, material, paperId: "all" });
    }
    setPaperId(nextPaperId);
    setQuestionIndex(0);
    clearDrafts();
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
    onSelectionChange?.({ subject, material, paperId });
    trackAnalyticsEvent("practice_started");
    onNavigate("exercises");
  }

  function openPaperFromProgress(paper: PaperProgress, mode: "resume" | "preview" | "partial" | "review") {
    const selection = resolvePaperSelection(questions, paper.progress_paper_id);
    if (!selection) {
      setError("Nie udało się otworzyć wybranego arkusza. Odśwież panel i spróbuj ponownie.");
      return;
    }
    const isAnswered = (question: PracticeQuestion) => question.selected_response !== null || question.selected_answer !== null;
    const preferredIndex = mode === "review"
      ? selection.questions.findIndex((question) => isAnswered(question) && question.is_correct === false)
      : mode === "partial"
        ? selection.questions.findIndex(isAnswered)
        : selection.questions.findIndex((question) => !isAnswered(question));

    setMaterial(selection.material);
    setSubject(selection.subject);
    setPaperId(selection.paperId);
    onSelectionChange?.({ subject: selection.subject, material: selection.material, paperId: selection.paperId });
    setQuestionIndex(preferredIndex >= 0 ? preferredIndex : 0);
    clearDrafts();
    setSubmittedAnswer(null);
    setError("");
    onNavigate("exercises");
  }

  function selectAnswer(index: number) {
    if (!currentQuestion) return;
    setDraftAnswer({ questionId: currentQuestion.question_id, index });
    setSubmittedAnswer(null);
  }

  function toggleMultipleAnswer(index: number) {
    if (!currentQuestion) return;
    const next = selectedIndices.includes(index)
      ? selectedIndices.filter((item) => item !== index)
      : [...selectedIndices, index].sort((a, b) => a - b);
    setDraftMultiple({ questionId: currentQuestion.question_id, indices: next });
    setSubmittedAnswer(null);
  }

  function setWrittenAnswer(text: string) {
    if (!currentQuestion) return;
    setDraftText({ questionId: currentQuestion.question_id, text });
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

  async function submitAnswer(selfAwardedPoints?: number) {
    if (!currentQuestion) return;
    const response = currentQuestion.question_type === "single_choice"
      ? selectedAnswer === null ? null : { index: selectedAnswer }
      : currentQuestion.question_type === "multiple_choice"
        ? selectedIndices.length ? { indices: selectedIndices } : null
        : writtenAnswer.trim().length ? { text: writtenAnswer.trim() } : null;
    if (!response) return;
    setSubmitting(true);
    setError("");
    try {
      const supabase = await getSupabaseClient();
      const { data, error: submitError } = await supabase.rpc("submit_practice_response", {
        target_question_id: currentQuestion.question_id,
        student_response: response,
        self_awarded_points: selfAwardedPoints ?? null,
      });
      if (submitError) throw submitError;
      const result = (data as AnswerResult[] | null)?.[0];
      if (!result) throw new Error("missing_result");
      setSubmittedAnswer({ ...result, questionId: currentQuestion.question_id });
      setBasicProgress({
        solved_count: result.solved_count,
        correct_count: result.correct_count,
        accuracy_percent: result.solved_count ? Math.round((result.correct_count / result.solved_count) * 100) : 0,
      });
      trackAnalyticsEvent("answer_checked");
      clearDrafts();
      setQuestions((current) =>
        current.map((question) =>
          question.question_id === currentQuestion.question_id
            ? {
                ...question,
                selected_answer: currentQuestion.question_type === "single_choice" ? selectedAnswer : null,
                selected_response: response,
                is_correct: result.answer_is_correct,
                points_awarded: result.awarded_points,
                max_points: result.question_max_points,
                grading_status: result.response_grading_status,
                attempt_count: result.answer_attempt_count,
                correct_answer: result.answer_correct_index,
                revealed_answer_key: result.answer_key,
                explanation: result.answer_explanation,
              }
            : question,
        ),
      );
      const { data: accessData } = await supabase.rpc("get_student_practice_access");
      const nextAccess = normalizePracticeAccess(((accessData as Record<string, unknown>[] | null) ?? [])[0], hasPlusAccess);
      setAccess(nextAccess);
      if (nextAccess.active_plan === "plus") {
        const { data: progressData, error: progressError } = await supabase.rpc("get_student_paper_progress");
        if (!progressError) setPaperProgress(((progressData as Record<string, unknown>[] | null) ?? []).map(normalizePaperProgress));
      }
    } catch (submitFailure) {
      const message = submitFailure instanceof Error ? submitFailure.message : String((submitFailure as { message?: unknown })?.message ?? "");
      setError(message.includes("practice_daily_limit_reached") ? "Dzisiejszy limit 15 pytań został wykorzystany. Nadal możesz przeglądać wszystkie arkusze albo odblokować ćwiczenia bez limitu w Plus." : "Nie udało się zapisać odpowiedzi. Spróbuj ponownie.");
    } finally {
      setSubmitting(false);
    }
  }

  function moveQuestion(direction: -1 | 1) {
    if (!filteredQuestions.length) return;
    if (!confirmDraftDiscard()) return;
    setQuestionIndex((current) => (current + direction + filteredQuestions.length) % filteredQuestions.length);
    clearDrafts();
    setSubmittedAnswer(null);
    setError("");
  }

  function exitPractice() {
    if (!confirmDraftDiscard()) return;
    clearDrafts();
    setSubmittedAnswer(null);
    onNavigate("start");
  }

  function subjectStats(target: Subject) {
    const available = questions.filter((question) => question.subject === target);
    const answered = available.filter((question) => question.selected_response !== null || question.selected_answer !== null).length;
    const correct = available.filter((question) => question.is_correct).length;
    return { total: available.length, answered, correct };
  }

  if (loading) {
    return <Card className="practice-loading"><CardContent>Ładujemy arkusze i zadania…</CardContent></Card>;
  }

  if (error && !questions.length) {
    return <Alert variant="destructive"><AlertTitle>Nie udało się załadować zadań</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  }

  return (
    <>
      {activeView === "start" && <section className="student-content-view student-learning-view" aria-label="Nauka">
        <section className="student-resume-grid">
          <Card className="student-resume-card">
            <CardHeader><CardDescription>{answeredCount ? `Ostatnio: ${material === "demo" ? "zestaw demonstracyjny" : material.replace("year:", "CKE ")}` : "Pierwsza sesja"}</CardDescription><CardTitle>{answeredCount ? "Wróć do nauki" : "Zacznij od jednego zadania"}</CardTitle></CardHeader>
            <CardContent><p>{filteredQuestions.length ? `${filteredQuestions.length} zadań w wybranym materiale. Wszystkie arkusze są dostępne bezpłatnie${practiceRemaining === null ? "." : `, a dziś możesz interaktywnie sprawdzić jeszcze ${practiceRemaining} odpowiedzi.`}` : "Wybierz dostępny materiał poniżej, aby rozpocząć."}</p><div><Button type="button" onClick={startPractice} disabled={!filteredQuestions.length}>Otwórz arkusz</Button><Button variant="outline" type="button" onClick={() => onNavigate("progress")}>Zobacz wyniki</Button></div></CardContent>
          </Card>
          <Card className="student-summary-card"><CardContent><div><span>Rozwiązane zadania</span><b>{answeredCount}</b></div><div><span>Poprawne odpowiedzi</span><b>{correctAnswerPercentage}%</b><small>{correctCount} z {answeredCount} sprawdzonych</small></div><div><span>Dostępne arkusze CKE</span><strong>{paperCatalog.length}</strong><small>{paperCatalogQuestionCount} zadań w {paperProgressYears.length} {paperProgressYears.length === 1 ? "roczniku" : "rocznikach"}</small></div></CardContent></Card>
        </section>
        <Card className="practice-launch-card">
          <CardHeader><div><CardTitle>Wybierz materiał</CardTitle><CardDescription>Dostępne {questions.length} zadań · {Math.max(0, questions.length - answeredCount)} nierozwiązanych</CardDescription></div></CardHeader>
          <CardContent>
            {!questions.length && <Alert><AlertTitle>Brak opublikowanych arkuszy</AlertTitle><AlertDescription>Materiały pojawią się tutaj po ich zweryfikowaniu i publikacji.</AlertDescription></Alert>}
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
            {materialBreakdown.length > 0 && <section className="practice-material-breakdown" aria-label="Rozbicie wybranego materiału">
              <header><b>Arkusze według przedmiotu</b><span>Wybierz przedmiot, aby zobaczyć tylko właściwe zadania.</span></header>
              <div>{materialBreakdown.map((item) => <button key={item.subject} type="button" aria-pressed={subject === item.subject} onClick={() => selectSubject(item.subject)}>
                <SubjectIcon subject={item.subject} className="practice-material-icon" />
                <span><b>{subjectLabels[item.subject]}</b><small>{item.paperCount ? paperCountLabel(item.paperCount) : "Zestaw demo"} · {item.questionCount} {item.questionCount === 1 ? "pytanie" : "pytań"}</small></span>
              </button>)}</div>
            </section>}
            <div className="practice-launch-summary"><div><b>{filteredQuestions.length}</b><span>{filteredQuestions.length === 1 ? "dostępne pytanie" : "dostępnych pytań"}{practiceRemaining !== null ? ` · ${practiceRemaining} z 15 sprawdzeń zostało dziś` : " · bez limitu w Plus"}</span></div><Button className="practice-launch-button" type="button" size="lg" onClick={startPractice} disabled={!filteredQuestions.length}>Otwórz arkusz <ArrowRight aria-hidden="true" /></Button></div>
            {material === "demo" && <p className="practice-demo-note">To autorski zestaw demonstracyjny egzaminio — nie jest oficjalnym arkuszem CKE.</p>}
          </CardContent>
        </Card>
      </section>}

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
              {currentQuestion && <span>· {currentQuestion.source_type === "cke" ? `Arkusz CKE · ${currentQuestion.exam_session ? sessionLabels[currentQuestion.exam_session] : "sesja główna"}` : "Zestaw demonstracyjny"}</span>}
            </div>
          </div>
          <div className="task-progress" aria-live="polite">
            <span className="task-timer"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></svg>{questionTime}</span>
            <span>Zadanie <strong>{currentQuestion ? questionIndex + 1 : "—"}</strong> z {filteredQuestions.length}</span>
            <Progress value={currentQuestion ? ((questionIndex + 1) / Math.max(filteredQuestions.length, 1)) * 100 : 0} aria-label="Postęp w bieżącym zestawie" />
            {practiceRemaining !== null && <span>{practiceRemaining} / 15 sprawdzeń dziś</span>}
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
              <PracticeQuestionPrompt prompt={currentQuestion.prompt} />
              <CkeQuestionContent blocks={currentQuestion.content_blocks} assets={currentQuestion.assets} />
              <small>Pytanie {questionIndex + 1} z {filteredQuestions.length} · {formatQuestionSource(currentQuestion)}{currentQuestion.paper_question_number ? ` · zadanie ${currentQuestion.paper_question_number}` : ""}</small>
            </div>

            {currentQuestion.question_type === "single_choice" && <div className="task-answers" role="radiogroup" aria-label="Wybierz jedną odpowiedź">
              {currentQuestion.options.map((option, index) => {
                const correct = answerResult?.answer_correct_index === index;
                const incorrect = Boolean(answerResult) && selectedAnswer === index && !correct;
                const muted = Boolean(answerResult) && !correct && !incorrect;
                const answerClass = ["task-answer", selectedAnswer === index && "is-selected", correct && "is-correct", incorrect && "is-incorrect", muted && "is-muted"].filter(Boolean).join(" ");
                return <button key={option} ref={(element) => { answerRefs.current[index] = element; }} type="button" role="radio" aria-checked={selectedAnswer === index} tabIndex={selectedAnswer === index || (selectedAnswer === null && index === 0) ? 0 : -1} className={answerClass} onClick={() => selectAnswer(index)} onKeyDown={(event) => handleAnswerKeyDown(event, index)} disabled={submitting || Boolean(answerResult)}><b>{String.fromCharCode(65 + index)}</b><span>{option}</span>{incorrect && <em>Twoja odpowiedź</em>}{correct && <em>Poprawna</em>}</button>;
              })}
            </div>}

            {currentQuestion.question_type === "multiple_choice" && <div className="task-answers task-multiple-answers" role="group" aria-label="Wybierz wszystkie poprawne odpowiedzi">
              {currentQuestion.options.map((option, index) => {
                const selected = selectedIndices.includes(index);
                const correct = Boolean(answerResult) && correctIndices.includes(index);
                const incorrect = Boolean(answerResult) && selected && !correct;
                const answerClass = ["task-answer", selected && "is-selected", correct && "is-correct", incorrect && "is-incorrect"].filter(Boolean).join(" ");
                return <button key={`${index}-${option}`} type="button" role="checkbox" aria-checked={selected} className={answerClass} onClick={() => toggleMultipleAnswer(index)} disabled={submitting || Boolean(answerResult)}><b>{selected ? "✓" : String.fromCharCode(65 + index)}</b><span>{option}</span>{incorrect && <em>Twój wybór</em>}{correct && <em>Poprawna</em>}</button>;
              })}
              {!answerResult && <small className="task-answer-instruction">Zaznacz wszystkie odpowiedzi, które są prawdziwe.</small>}
            </div>}

            {["numeric", "short_text", "long_text"].includes(currentQuestion.question_type) && <section className="task-written-response" aria-labelledby="written-answer-label">
              <label id="written-answer-label" htmlFor="written-answer">Twoje rozwiązanie</label>
              <Textarea id="written-answer" value={writtenAnswer} onChange={(event) => setWrittenAnswer(event.target.value)} rows={isPolishEssay ? 20 : isForeignLanguageEmail ? 14 : currentQuestion.question_type === "long_text" ? 8 : 3} placeholder={currentQuestion.subject === "mathematics" ? "Zapisz obliczenia, uzasadnienie i odpowiedź. Możesz używać zapisu matematycznego." : isPolishEssay ? "Napisz wypracowanie. Podziel tekst na akapity i pamiętaj o wszystkich warunkach wybranego tematu." : isForeignLanguageEmail ? "Napisz e-mail w języku egzaminu i rozwiń wszystkie trzy podpunkty." : "Zapisz pełną odpowiedź i uzasadnienie, jeśli wymaga go polecenie."} disabled={submitting || Boolean(answerResult)} />
              {!answerResult && <small>{isExtendedWriting ? `Liczba słów: ${countResponseWords(writtenAnswer)} · ${isPolishEssay ? "wymagane co najmniej 200" : "wymagane 50–120"}.` : "Po zapisaniu porównasz rozwiązanie z kryteriami CKE i samodzielnie przyznasz punkty."}</small>}
            </section>}

            {answerResult && <div className={`task-verdict ${answerResult.answer_is_correct === null ? "is-review" : answerResult.answer_is_correct ? "is-correct" : "is-incorrect"}`} data-comment-anchor="verdict">
              <div><span>{answerResult.answer_is_correct === null ? "↗" : answerResult.answer_is_correct ? "✓" : "✕"}</span><b>{answerResult.response_grading_status === "self_assessed" ? "Punkty zapisane" : answerResult.answer_is_correct === null ? "Porównaj rozwiązanie" : answerResult.answer_is_correct ? "Dobrze" : "Jeszcze nie to"}</b><small>{answerResult.awarded_points === null ? `— / ${answerResult.question_max_points} pkt` : `${answerResult.awarded_points} / ${answerResult.question_max_points} pkt`}</small></div>
              <p className="mathjax_process">{answerResult.answer_is_correct === false && answerResult.answer_correct_index !== null ? `Poprawna odpowiedź: ${String.fromCharCode(65 + answerResult.answer_correct_index)}. ${currentQuestion.options[answerResult.answer_correct_index]}. ${answerResult.answer_explanation}` : answerResult.answer_explanation}</p>
              {currentQuestion.scoring.rules?.length ? <section className="task-scoring-rules"><b>Kryteria punktowania CKE</b><ul>{currentQuestion.scoring.rules.map((rule) => <li key={rule}>{rule}</li>)}</ul></section> : null}
              {answerResult.response_grading_status === "awaiting_self_assessment" && <div className="task-self-score"><b>Ile punktów spełnia Twoje rozwiązanie?</b><div>{Array.from({ length: answerResult.question_max_points + 1 }, (_, points) => <Button key={points} type="button" variant="outline" onClick={() => void submitAnswer(points)} disabled={submitting}>{points} {points === 1 ? "punkt" : "punkty"}</Button>)}</div><small>To samoocena na podstawie oficjalnych kryteriów — nie ocena wystawiona przez AI.</small></div>}
            </div>}

            <footer className="task-actions">
              <Button type="button" size="lg" onClick={answerResult ? () => moveQuestion(1) : () => void submitAnswer()} disabled={submitting || (!answerResult && practiceLimitReached) || (!answerResult && (currentQuestion.question_type === "single_choice" ? selectedAnswer === null : currentQuestion.question_type === "multiple_choice" ? selectedIndices.length === 0 : writtenAnswer.trim().length === 0))}>{submitting ? "Zapisuję…" : answerResult ? "Następne zadanie" : practiceLimitReached ? "Limit 15 pytań wykorzystany" : currentQuestion.question_type === "single_choice" || currentQuestion.question_type === "multiple_choice" ? "Sprawdź odpowiedź" : "Pokaż rozwiązanie i kryteria"}</Button>
              <span>{answerResult ? progressEnabled ? `Odpowiedź zapisana w postępie. Następne: zadanie ${(questionIndex + 1) % filteredQuestions.length + 1} z ${filteredQuestions.length}.` : `Odpowiedź sprawdzona. Stały zapis postępu jest dostępny w Plus.` : practiceLimitReached ? "Nadal możesz przeglądać wszystkie zadania. Nowe sprawdzenia będą dostępne jutro." : currentQuestion.question_type === "single_choice" ? "Wybierz jedną odpowiedź." : currentQuestion.question_type === "multiple_choice" ? "Możesz zaznaczyć więcej niż jedną odpowiedź." : "Najpierw zapisz własny tok rozwiązania."}</span>
              <nav aria-label="Nawigacja między zadaniami"><button type="button" aria-label="Poprzednie pytanie" onClick={() => moveQuestion(-1)} disabled={submitting || filteredQuestions.length < 2}>← Poprzednie</button><button type="button" aria-label="Następne pytanie" onClick={() => moveQuestion(1)} disabled={submitting || filteredQuestions.length < 2}>Następne →</button></nav>
            </footer>
          </main>

          <aside className={`task-support${tutorFeedback ? " has-feedback" : ""}`} aria-label="Odpowiedź, podpowiedzi i rozmowa z AI"><AiTutor questionId={currentQuestion.question_id} feedback={tutorFeedback} aiEnabled={aiEnabled} /></aside>
        </div>}
      </section>}

      {activeView === "progress" && progressEnabled && !detailedProgressEnabled && <section className="student-content-view student-progress-view" aria-labelledby="student-basic-progress-title">
        <div className="dashboard-view-heading"><div><h2 id="student-basic-progress-title">Twój postęp</h2><small>Podstawowe podsumowanie w wersji Free</small></div><Button variant="outline" type="button" onClick={() => onNavigate("exercises")}>Wróć do ćwiczeń</Button></div>
        <section className="dashboard-grid three-columns student-progress-metrics">
          <article className="metric-card"><span>Rozwiązane zadania</span><b>{answeredCount}</b><small>Łącznie na tym koncie.</small></article>
          <article className="metric-card"><span>Poprawne odpowiedzi</span><b>{correctCount}</b><small>Liczymy ostatnią odpowiedź.</small></article>
          <article className="metric-card"><span>Skuteczność</span><b>{correctAnswerPercentage}%</b><small>Ze sprawdzonych zadań.</small></article>
        </section>
        <Card className="parent-empty-view"><CardHeader><Badge variant="secondary">Pakiet Plus</Badge><CardTitle>Zobacz dokładnie, co warto powtórzyć</CardTitle><CardDescription>Plus dodaje wyniki według arkusza i rocznika, trendy, słabsze tematy, powtórki oraz podgląd postępu dla rodzica.</CardDescription></CardHeader><CardContent><Button asChild><a href="/plan-plus#porownanie">Porównaj Free i Plus</a></Button></CardContent></Card>
      </section>}

      {activeView === "progress" && progressEnabled && detailedProgressEnabled && <section className="student-content-view student-progress-view" aria-labelledby="student-progress-title">
        <div className="dashboard-view-heading"><div><h2 id="student-progress-title">Twój postęp</h2><small>Wyniki z arkuszy CKE i materiałów demonstracyjnych</small></div><Button variant="outline" type="button" onClick={() => onNavigate("exercises")}>Wróć do ćwiczeń</Button></div>
        <section className="dashboard-grid four-columns student-progress-metrics">
          <article className="metric-card"><span>Rozwiązane zadania</span><b>{answeredCount}</b><small>{Math.max(0, questions.length - answeredCount)} nadal czeka.</small></article>
          <article className="metric-card"><span>Poprawne odpowiedzi</span><b>{correctCount}</b><small>Liczymy ostatnią odpowiedź.</small></article>
          <article className="metric-card"><span>Skuteczność</span><b>{score}%</b><small>Ze sprawdzonych zadań.</small></article>
          <article className="metric-card"><span>Dostępne arkusze CKE</span><b>{paperCatalog.length}</b><small>{paperCatalogQuestionCount} zadań w {paperProgressYears.length} {paperProgressYears.length === 1 ? "roczniku" : "rocznikach"}.</small></article>
        </section>
        <section className="student-progress-layout">
          <Card className="student-subject-overview">
            <CardHeader><CardTitle>Postęp według przedmiotu</CardTitle></CardHeader>
            <CardContent>{SUBJECT_KEYS.filter((item) => questions.some((question) => question.subject === item)).map((item) => {
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
          <header className="paper-progress-intro">
            <Badge variant="secondary" className="paper-progress-kicker">Arkusze CKE</Badge>
            <h3 id="paper-progress-title">Wyniki według rocznika i arkusza</h3>
            <p>Każdy arkusz liczony osobno. Wynik procentowy pokazuje punkty zdobyte względem maksymalnej liczby punktów w arkuszu.</p>
          </header>
          {paperCatalog.length > 0 && <div className="paper-catalog-summary" aria-label="Podsumowanie dostępnych arkuszy"><div><b>{paperCatalog.length}</b><span>Dostępnych arkuszy</span></div><div><b>{paperCatalogQuestionCount}</b><span>Zadań CKE</span></div><div><b>{paperProgressYears.length}</b><span>{paperProgressYears.length === 1 ? "Rocznik" : "Roczników"}</span></div><div><b>{startedPaperCount}</b><span>Rozpoczętych</span></div><div><b>{completedPaperCount}</b><span>Ukończonych</span></div></div>}
          {paperProgressError && <Alert variant="destructive" className="paper-progress-warning"><AlertTitle>Wyniki arkuszy są chwilowo niedostępne</AlertTitle><AlertDescription>{paperProgressError}</AlertDescription></Alert>}
          {paperCatalog.length ? <>
            <div className="paper-year-filters" role="group" aria-label="Filtruj wyniki według rocznika">
              <button type="button" className={paperYearFilter === null ? "active" : ""} aria-pressed={paperYearFilter === null} onClick={() => setPaperYearFilter(null)}>Wszystkie roczniki</button>
              {paperProgressYears.map((year) => <button key={year} type="button" className={paperYearFilter === year ? "active" : ""} aria-label={`CKE ${year}`} aria-pressed={paperYearFilter === year} onClick={() => setPaperYearFilter(year)}>CKE {year}<span>{paperCatalog.filter((paper) => paper.exam_year === year).length}</span></button>)}
            </div>
            <p className="paper-filter-result-count">Wyświetlamy <b>{groupedPaperProgress.reduce((sum, [, papers]) => sum + papers.length, 0)}</b> z <b>{paperCatalog.length}</b> dostępnych arkuszy.</p>
            <div className="paper-year-groups">{groupedPaperProgress.map(([year, papers]) => {
              const sessions = Array.from(new Set(papers.map((paper) => sessionLabels[paper.exam_session])));
              return <section className="paper-year-group" key={year} aria-labelledby={`paper-year-${year}`}>
                <header className="paper-year-heading"><h4 id={`paper-year-${year}`}>CKE {year}</h4><span>{sessions.join(" i ")} · {paperCountLabel(papers.length)}</span></header>
                <div className="paper-year-list">{papers.map((paper) => {
                  const statusLabel = paper.completion_status === "completed" ? "Ukończony" : paper.completion_status === "in_progress" ? "W toku" : "Nierozpoczęty";
                  const incorrectQuestions = Math.max(0, paper.answered_questions - paper.correct_questions);
                  const primaryLabel = paper.completion_status === "completed" ? "Zobacz omówienie →" : paper.completion_status === "in_progress" ? `Wróć do zadania ${Math.min(paper.answered_questions + 1, paper.total_questions)} →` : "Rozpocznij arkusz →";
                  const secondaryLabel = paper.completion_status === "completed" ? `Powtórz błędne zadania (${incorrectQuestions})` : paper.completion_status === "in_progress" ? "Wyniki cząstkowe" : "Podejrzyj zadania";
                  const primaryMode = paper.completion_status === "in_progress" ? "resume" : paper.completion_status === "completed" ? "partial" : "resume";
                  const secondaryMode = paper.completion_status === "completed" ? "review" : paper.completion_status === "in_progress" ? "partial" : "preview";
                  return <article className="paper-result-card" key={paper.progress_paper_id}>
                    <div className="paper-result-summary">
                      <SubjectIcon subject={paper.subject} className="paper-result-icon" />
                      <div className="paper-result-copy">
                        <div><h5>{subjectLabels[paper.subject]}</h5><span className={`paper-status paper-status-${paper.completion_status}`}>{statusLabel}</span></div>
                        <p>{paper.source_label} · {sessionLabels[paper.exam_session]}{paper.variant_code && paper.variant_code !== "standard" ? ` · wariant ${paper.variant_code}` : ""}{paper.source_document_id ? ` · dokument ${paper.source_document_id}` : ""}</p>
                      </div>
                      <div className={`paper-result-score${paper.completion_status === "not_started" ? " is-empty" : ""}`}><b>{paper.score_percent}%</b><span>{paper.earned_points} z {paper.available_points} pkt · {paper.answered_questions} z {paper.total_questions} zadań</span></div>
                    </div>
                    <Progress className="paper-result-progress" value={paper.score_percent} aria-label={`Wynik arkusza ${subjectLabels[paper.subject]} CKE ${year}: ${paper.score_percent}%`} />
                    <div className="paper-result-actions"><button type="button" onClick={() => openPaperFromProgress(paper, primaryMode)}>{primaryLabel}</button><button type="button" onClick={() => openPaperFromProgress(paper, secondaryMode)}>{secondaryLabel}</button></div>
                  </article>;
                })}</div>
              </section>;
            })}</div>
          </> : <Card className="practice-paper-empty"><CardContent><b>Brak opublikowanych arkuszy CKE</b><p>Gdy pierwszy zweryfikowany arkusz zostanie zaimportowany, pojawi się tutaj jako osobny rocznik — bez mieszania z zestawem demo.</p></CardContent></Card>}
        </section>
      </section>}

      {activeView === "settings" && <section className="student-content-view student-settings-view" id="ustawienia" aria-labelledby="student-settings-title">
        <Card className="account-settings-card student-account-settings-card">
          <CardHeader><CardTitle id="student-settings-title">Ustawienia konta</CardTitle><CardDescription>Motyw i zarządzanie kontem w jednym miejscu.</CardDescription></CardHeader>
          <CardContent className="student-account-settings-content">
            <div className="account-theme-setting"><span>Wygląd aplikacji</span><ThemeSettings /></div>
            <PromoCodeRedemption disabled={hasPlusAccess} onRedeemed={() => window.location.reload()} />
            <div className="student-account-links"><Button variant="outline" asChild><a href="/plan-plus#dla-ucznia">Poznaj pakiet Plus</a></Button><Button variant="outline" className="student-delete-account" asChild><a href="/usun-konto">Usuń konto i dane</a></Button></div>
          </CardContent>
        </Card>
      </section>}
    </>
  );
}
