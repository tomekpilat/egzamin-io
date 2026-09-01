import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  countResponseWords,
  hasUnsavedPracticeAnswer,
  StudentPractice,
  type PracticeSelection,
  type StudentView,
  UNSAVED_ANSWER_MESSAGE,
} from "@/components/student-practice";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

function StudentPracticeHarness({ initialView }: { initialView: StudentView }) {
  const [view, setView] = useState<StudentView>(initialView);
  return <StudentPractice activeView={view} onNavigate={setView} />;
}

function RemountingStudentPracticeHarness() {
  const [view, setView] = useState<StudentView>("start");
  const [selection, setSelection] = useState<PracticeSelection | null>(null);
  return <StudentPractice
    key={view === "exercises" ? "focus" : "panel"}
    activeView={view}
    onNavigate={setView}
    selection={selection}
    onSelectionChange={setSelection}
  />;
}

vi.mock("@/lib/supabase-browser", () => ({
  getSupabaseClient: async () => ({
    rpc,
    auth: { getSession: async () => ({ data: { session: { access_token: "test-token" } } }) },
  }),
}));

const questions = [
  {
    question_id: "demo-mat-01",
    source_type: "demo",
    source_label: "Zestaw demonstracyjny egzaminio",
    exam_paper_id: null,
    exam_year: null,
    exam_session: null,
    exam_variant: null,
    source_document_id: null,
    paper_question_number: null,
    subject: "mathematics",
    topic: "Procenty",
    prompt: "Ile wynosi 20% z 50?",
    options: ["5", "10", "15", "20"],
    difficulty: 1,
    sort_order: 1,
    selected_answer: null,
    is_correct: null,
    attempt_count: 0,
    correct_answer: null,
    explanation: null,
  },
  {
    question_id: "demo-pol-01",
    source_type: "demo",
    source_label: "Zestaw demonstracyjny egzaminio",
    exam_paper_id: null,
    exam_year: null,
    exam_session: null,
    exam_variant: null,
    source_document_id: null,
    paper_question_number: null,
    subject: "polish",
    topic: "Części mowy",
    prompt: "Które słowo jest rzeczownikiem?",
    options: ["szybko", "dom", "zielony", "biegnie"],
    difficulty: 1,
    sort_order: 2,
    selected_answer: null,
    is_correct: null,
    attempt_count: 0,
    correct_answer: null,
    explanation: null,
  },
];

function prepareRpc(questionRows: Record<string, unknown>[] = questions, progressRows: Record<string, unknown>[] = [], submitResult?: (params: Record<string, unknown>) => Record<string, unknown>, access: { active_plan: string; practice_used_today: number; practice_daily_limit: number | null; progress_enabled: boolean; ai_enabled: boolean } = { active_plan: "plus", practice_used_today: 0, practice_daily_limit: null, progress_enabled: true, ai_enabled: true }, progressError: unknown = null, basicProgress = { solved_count: questionRows.filter((question) => question.selected_answer != null || question.selected_response != null).length, correct_count: questionRows.filter((question) => question.is_correct === true).length, accuracy_percent: 0 }) {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => new Response(JSON.stringify(init?.method === "POST" ? {
    message: { id: "ai-response-1", role: "assistant", content: "Wyjaśnienie AI do aktualnego zadania.", created_at: "2026-08-28T10:00:00.000Z" },
    usage: { used: 1, limit: 3, remaining: 2, plan: "free" },
  } : {
    messages: [],
    usage: { used: 0, limit: 3, remaining: 3, plan: "free" },
    available: true,
    hints: ["Zamień procent na ułamek.", "Pomnóż przez liczbę."],
  }), { status: 200, headers: { "Content-Type": "application/json" } })));
  rpc.mockImplementation(async (name: string, params: Record<string, unknown>) => {
    if (name === "get_practice_questions") return { data: questionRows, error: null };
    if (name === "get_student_practice_access") return { data: [access], error: null };
    if (name === "get_student_basic_progress") return { data: [basicProgress], error: null };
    if (name === "get_student_paper_progress") return { data: progressRows, error: progressError };
    if (name === "submit_practice_response") {
      return {
        data: [submitResult?.(params) ?? {
          answer_is_correct: true,
          answer_correct_index: 1,
          answer_key: { correct_index: 1 },
          answer_explanation: "20% z 50 to 10.",
          answer_attempt_count: 1,
          awarded_points: 1,
          question_max_points: 1,
          response_grading_status: "auto",
          solved_count: 1,
          correct_count: 1,
        }],
        error: null,
      };
    }
    throw new Error(`Unexpected RPC: ${name}`);
  });
}

afterEach(() => {
  cleanup();
  rpc.mockReset();
  vi.restoreAllMocks();
});

describe("StudentPractice focus mode", () => {
  it("counts words in a Polish extended response", () => {
    expect(countResponseWords("  Każdy może\nkształtować swoją przyszłość. ")).toBe(5);
    expect(countResponseWords("   ")).toBe(0);
  });

  it("renders the redesigned learning, progress and settings views with working actions", async () => {
    prepareRpc();
    const onNavigate = vi.fn();
    const { rerender } = render(<StudentPractice activeView="start" onNavigate={onNavigate} />);

    expect(await screen.findByRole("region", { name: "Nauka" })).toBeInTheDocument();
    expect(screen.getByText("Zacznij od jednego zadania", { selector: '[data-slot="card-title"]' })).toBeInTheDocument();
    expect(screen.getByText("Wybierz materiał", { selector: '[data-slot="card-title"]' })).toBeInTheDocument();

    rerender(<StudentPractice activeView="progress" onNavigate={onNavigate} />);
    expect(screen.getByRole("heading", { name: "Twój postęp" })).toBeInTheDocument();
    expect(screen.getByText("Postęp według przedmiotu", { selector: '[data-slot="card-title"]' })).toBeInTheDocument();
    expect(screen.getByText("Do powtórki", { selector: '[data-slot="card-title"]' })).toBeInTheDocument();

    rerender(<StudentPractice activeView="settings" onNavigate={onNavigate} />);
    expect(screen.getByText("Ustawienia konta", { selector: '[data-slot="card-title"]' })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Polityka prywatności" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Usuń konto i dane" })).toHaveAttribute("href", "/usun-konto");
  });

  it("groups paper results by year and opens the selected paper from the redesigned cards", async () => {
    const cke2026 = {
      ...questions[0],
      question_id: "cke-2026-mat-01",
      source_type: "cke",
      source_label: "Wariant standardowy",
      exam_paper_id: "cke-2026-main-mathematics-100-x",
      exam_year: 2026,
      exam_session: "main",
      exam_variant: "100-X",
      source_document_id: "OMAP-100-X-2605",
      paper_question_number: 1,
      selected_answer: 1,
      selected_response: { index: 1 },
      is_correct: true,
      points_awarded: 1,
      max_points: 1,
      grading_status: "auto",
      correct_answer: 1,
      revealed_answer_key: { correct_index: 1 },
      explanation: "20% z 50 to 10.",
    };
    const cke2025 = {
      ...cke2026,
      question_id: "cke-2025-pol-01",
      source_label: "Wariant standardowy",
      exam_paper_id: "cke-2025-main-polish-100-x",
      exam_year: 2025,
      subject: "polish",
      source_document_id: "OPOP-100-X-2505",
    };
    const cke2024 = {
      ...cke2026,
      question_id: "cke-2024-eng-01",
      source_label: "Wariant standardowy",
      exam_paper_id: "cke-2024-main-english-100-x",
      exam_year: 2024,
      subject: "english",
      source_document_id: "OJAP-100-X-2405",
      selected_answer: null,
      selected_response: null,
      is_correct: null,
      points_awarded: null,
    };
    prepareRpc([cke2026, cke2025, cke2024], [
      { progress_paper_id: cke2026.exam_paper_id, exam_year: 2026, exam_session: "main", subject: "mathematics", variant_code: "100-X", source_label: "Wariant standardowy", total_questions: 20, answered_questions: 1, correct_questions: 1, accuracy_percent: 100, earned_points: 1, available_points: 1, score_percent: 100, completion_status: "in_progress" },
      { progress_paper_id: cke2025.exam_paper_id, exam_year: 2025, exam_session: "main", subject: "polish", variant_code: "100-X", source_label: "Wariant standardowy", total_questions: 20, answered_questions: 20, correct_questions: 17, accuracy_percent: 85, earned_points: 22, available_points: 26, score_percent: 85, completion_status: "completed" },
    ]);
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<StudentPractice activeView="progress" onNavigate={onNavigate} />);

    expect(await screen.findByRole("heading", { name: "Wyniki według rocznika i arkusza" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Wszystkie roczniki" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "CKE 2026" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "CKE 2025" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "CKE 2024" })).toBeInTheDocument();
    const catalogSummary = screen.getByLabelText("Podsumowanie dostępnych arkuszy");
    expect(within(catalogSummary).getByText("Dostępnych arkuszy").previousSibling).toHaveTextContent("3");
    expect(within(catalogSummary).getByText("Rozpoczętych").previousSibling).toHaveTextContent("2");
    expect(within(catalogSummary).getByText("Ukończonych").previousSibling).toHaveTextContent("1");
    expect(screen.getByText("Nierozpoczęty")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "CKE 2024" })).toHaveTextContent("1");
    expect(screen.getByText("W toku")).toBeInTheDocument();
    expect(screen.getByText("Ukończony")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "CKE 2025" }));
    expect(screen.queryByRole("heading", { name: "CKE 2026" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "CKE 2025" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Wszystkie roczniki" }));
    await user.click(screen.getByRole("button", { name: "Wróć do zadania 2 →" }));
    expect(onNavigate).toHaveBeenCalledWith("exercises");
  });

  it("opens the selected mathematics paper and keeps mathematics selected in focus mode", async () => {
    const mathematics = {
      ...questions[0],
      question_id: "cke-2026-mat-selection",
      source_type: "cke",
      source_label: "Wariant standardowy",
      exam_paper_id: "cke-2026-main-mathematics-100-x",
      exam_year: 2026,
      exam_session: "main",
      exam_variant: "100-X",
      source_document_id: "OMAP-100-X-2605",
      paper_question_number: 1,
      subject: "mathematics",
      prompt: "Zadanie wyłącznie z matematyki",
    };
    const english = {
      ...mathematics,
      question_id: "cke-2026-eng-selection",
      exam_paper_id: "cke-2026-main-english-200-x",
      exam_variant: "200-X",
      source_document_id: "OJAP-200-X-2605",
      subject: "english",
      prompt: "English task that must not open",
    };
    prepareRpc([english, mathematics], [
      { progress_paper_id: mathematics.exam_paper_id, exam_year: 2026, exam_session: "main", subject: "mathematics", variant_code: "100-X", source_label: "Wariant standardowy", total_questions: 1, answered_questions: 0, correct_questions: 0, accuracy_percent: 0, earned_points: 0, available_points: 0, score_percent: 0, completion_status: "not_started" },
      { progress_paper_id: english.exam_paper_id, exam_year: 2026, exam_session: "main", subject: "english", variant_code: "200-X", source_label: "Wariant standardowy", total_questions: 1, answered_questions: 0, correct_questions: 0, accuracy_percent: 0, earned_points: 0, available_points: 0, score_percent: 0, completion_status: "not_started" },
    ]);
    const user = userEvent.setup();
    render(<StudentPracticeHarness initialView="progress" />);

    const mathematicsHeading = await screen.findByRole("heading", { name: "Matematyka" });
    const mathematicsCard = mathematicsHeading.closest(".paper-result-card");
    expect(mathematicsCard).not.toBeNull();
    await user.click(within(mathematicsCard as HTMLElement).getByRole("button", { name: "Rozpocznij arkusz →" }));

    expect(await screen.findByRole("heading", { name: "Zadanie wyłącznie z matematyki" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Wybierz przedmiot" })).toHaveTextContent("Matematyka");
    expect(screen.queryByRole("heading", { name: "English task that must not open" })).not.toBeInTheDocument();
  });

  it("preserves a subject chosen from the material breakdown when focus mode remounts", async () => {
    const mathematics = {
      ...questions[0],
      question_id: "cke-2026-mat-remount",
      source_type: "cke",
      source_label: "Wariant standardowy",
      exam_paper_id: "cke-2026-main-mathematics-100-x",
      exam_year: 2026,
      exam_session: "main",
      exam_variant: "100-X",
      source_document_id: "OMAP-100-X-2605",
      paper_question_number: 1,
      subject: "mathematics",
      prompt: "Właściwe zadanie z matematyki",
    };
    const english = {
      ...mathematics,
      question_id: "cke-2026-eng-remount",
      exam_paper_id: "cke-2026-main-english-100-x",
      source_document_id: "OJAP-100-X-2605",
      subject: "english",
      prompt: "Niewłaściwe zadanie z angielskiego",
    };
    prepareRpc([english, mathematics]);
    const user = userEvent.setup();
    render(<RemountingStudentPracticeHarness />);

    const breakdown = await screen.findByLabelText("Rozbicie wybranego materiału");
    await user.click(within(breakdown).getByRole("button", { name: /Matematyka/ }));
    const launchCard = breakdown.closest('[data-slot="card"]');
    expect(launchCard).not.toBeNull();
    await user.click(within(launchCard as HTMLElement).getByRole("button", { name: "Otwórz arkusz" }));

    expect(await screen.findByRole("heading", { name: "Właściwe zadanie z matematyki" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Wybierz przedmiot" })).toHaveTextContent("Matematyka");
    expect(screen.queryByRole("heading", { name: "Niewłaściwe zadanie z angielskiego" })).not.toBeInTheDocument();
  });

  it("counts available CKE papers from the question catalog even without progress rows", async () => {
    const firstPaper = {
      ...questions[0],
      question_id: "cke-summary-mat",
      source_type: "cke",
      source_label: "Wariant standardowy",
      exam_paper_id: "cke-2026-main-mathematics-100-x",
      exam_year: 2026,
      exam_session: "main",
      exam_variant: "100-X",
      source_document_id: "OMAP-100-X-2605",
      paper_question_number: 1,
      selected_answer: 1,
      selected_response: { index: 1 },
      is_correct: true,
    };
    const secondPaper = {
      ...firstPaper,
      question_id: "cke-summary-pol",
      exam_paper_id: "cke-2025-main-polish-100-x",
      exam_year: 2025,
      source_document_id: "OPOP-100-X-2505",
      subject: "polish",
      selected_answer: 0,
      selected_response: { index: 0 },
      is_correct: false,
    };
    prepareRpc([firstPaper, secondPaper], []);
    render(<StudentPractice activeView="start" onNavigate={() => undefined} />);

    const summaryLabel = await screen.findByText("Dostępne arkusze CKE", { selector: ".student-summary-card span" });
    expect(summaryLabel.nextElementSibling).toHaveTextContent("2");
    expect(summaryLabel.parentElement).toHaveTextContent("2 zadań w 2 rocznikach");
    const accuracyLabel = screen.getByText("Poprawne odpowiedzi", { selector: ".student-summary-card span" });
    expect(accuracyLabel.nextElementSibling).toHaveTextContent("50%");
    expect(accuracyLabel.parentElement).toHaveTextContent("1 z 2 sprawdzonych");
  });

  it("keeps questions available when only paper progress fails to load", async () => {
    prepareRpc(questions, [], undefined, { active_plan: "plus", practice_used_today: 0, practice_daily_limit: null, progress_enabled: true, ai_enabled: true }, { message: "missing progress function" });
    const { rerender } = render(<StudentPractice activeView="start" onNavigate={() => undefined} />);

    expect(await screen.findByText("Zacznij od jednego zadania", { selector: '[data-slot="card-title"]' })).toBeInTheDocument();
    expect(screen.queryByText("Zestaw demo jest niedostępny")).not.toBeInTheDocument();

    rerender(<StudentPractice activeView="progress" onNavigate={() => undefined} />);
    expect(screen.getByText("Wyniki arkuszy są chwilowo niedostępne")).toBeInTheDocument();
    expect(screen.getByText(/Zadania nadal są dostępne/)).toBeInTheDocument();
  });

  it("detects only a changed, unsubmitted draft", () => {
    expect(hasUnsavedPracticeAnswer("q1", null, { questionId: "q1", index: 2 })).toBe(true);
    expect(hasUnsavedPracticeAnswer("q1", 2, { questionId: "q1", index: 2 })).toBe(false);
    expect(hasUnsavedPracticeAnswer("q1", null, { questionId: "q2", index: 2 })).toBe(false);
  });

  it("keeps every paper, three AI questions and basic progress in Free while gating the sixteenth daily check", async () => {
    prepareRpc(questions, [], undefined, { active_plan: "free", practice_used_today: 15, practice_daily_limit: 15, progress_enabled: true, ai_enabled: true }, null, { solved_count: 8, correct_count: 5, accuracy_percent: 63 });
    const { rerender } = render(<StudentPractice activeView="exercises" onNavigate={() => undefined} hasPlusAccess={false} />);

    expect(await screen.findByText("0 / 15 sprawdzeń dziś")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ile wynosi 20% z 50?" })).toBeInTheDocument();
    expect(await screen.findByText("Zostały 3 z 3 pytań dziś")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Limit 15 pytań wykorzystany" })).toBeDisabled();
    expect(rpc).toHaveBeenCalledWith("get_student_basic_progress");
    expect(rpc).not.toHaveBeenCalledWith("get_student_paper_progress");

    rerender(<StudentPractice activeView="progress" onNavigate={() => undefined} hasPlusAccess={false} />);
    expect(screen.getByText("Podstawowe podsumowanie w wersji Free")).toBeInTheDocument();
    expect(screen.getByText("8", { selector: ".metric-card b" })).toBeInTheDocument();
    expect(screen.getByText("63%", { selector: ".metric-card b" })).toBeInTheDocument();
    expect(screen.getByText("Zobacz dokładnie, co warto powtórzyć")).toBeInTheDocument();
  });

  it("shows one question with minimal progress and keyboard answer navigation", async () => {
    prepareRpc();
    const user = userEvent.setup();
    render(<StudentPractice activeView="exercises" onNavigate={() => undefined} />);

    expect(await screen.findByRole("region", { name: "Tryb skupienia" })).toBeInTheDocument();
    expect(screen.queryByText("Tryb skupienia")).not.toBeInTheDocument();
    expect(screen.getByText((_content, element) => element?.textContent === "Zadanie 1 z 2")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Postęp w bieżącym zestawie" })).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByRole("button", { name: "Poprzednie pytanie" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Następne pytanie" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Poprzednie pytanie" })).toHaveTextContent("← Poprzednie");
    expect(screen.getByRole("button", { name: "Następne pytanie" })).toHaveTextContent("Następne →");
    expect(screen.getByRole("button", { name: "Zakończ" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Odpowiedź, podpowiedzi i rozmowa z AI" })).toBeInTheDocument();
    expect(screen.getByText("Podpowiedzi")).toBeInTheDocument();
    expect(await screen.findByText("Zamień procent na ułamek.")).toBeInTheDocument();
    expect(screen.queryByText("Pomnóż przez liczbę.")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Wyjaśnij kolejny krok/ }));
    expect(screen.getByText("Pomnóż przez liczbę.")).toBeInTheDocument();

    const answers = screen.getAllByRole("radio");
    answers[0].focus();
    await user.keyboard("{ArrowRight}");
    expect(answers[1]).toHaveFocus();
    expect(answers[1]).toHaveAttribute("aria-checked", "true");
  });

  it("protects a draft before changing questions or leaving the page", async () => {
    prepareRpc();
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<StudentPractice activeView="exercises" onNavigate={onNavigate} />);

    await user.click(await screen.findByRole("radio", { name: "B 10" }));
    const unload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);

    await user.click(screen.getByRole("button", { name: "Następne pytanie" }));
    expect(screen.getByRole("heading", { name: "Ile wynosi 20% z 50?" })).toBeInTheDocument();
    expect(confirm).toHaveBeenCalledWith(UNSAVED_ANSWER_MESSAGE);

    await user.click(screen.getByRole("button", { name: "Zakończ" }));
    expect(onNavigate).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Następne pytanie" }));
    expect(screen.getByRole("heading", { name: "Które słowo jest rzeczownikiem?" })).toBeInTheDocument();
  });

  it("keeps the Tutor composer usable and sends a question about the current task", async () => {
    prepareRpc();
    const user = userEvent.setup();
    render(<StudentPractice activeView="exercises" onNavigate={() => undefined} />);

    await user.click(await screen.findByRole("tab", { name: "Maja AI" }));
    const composer = screen.getByRole("textbox", { name: "Pytanie do nauczyciela AI" });
    await user.type(composer, "Dlaczego?");
    await user.click(screen.getByRole("button", { name: "Wyślij pytanie" }));

    expect(await screen.findByText("Wyjaśnienie AI do aktualnego zadania.")).toBeInTheDocument();
    expect(composer).toHaveValue("");
  });

  it("offers ready questions without consuming the daily AI limit", async () => {
    prepareRpc();
    const user = userEvent.setup();
    render(<StudentPractice activeView="exercises" onNavigate={() => undefined} />);

    await user.click(await screen.findByRole("tab", { name: "Maja AI" }));
    expect(await screen.findByText("Zostały 3 z 3 pytań dziś")).toBeInTheDocument();
    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole("button", { name: /Od czego zacząć/ }));

    expect(await screen.findByText("Zamień procent na ułamek.")).toBeInTheDocument();
    expect(screen.getByText("Zostały 3 z 3 pytań dziś")).toBeInTheDocument();
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it("saves the answer before navigation and exits without a discard warning", async () => {
    prepareRpc();
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const confirm = vi.spyOn(window, "confirm");
    render(<StudentPractice activeView="exercises" onNavigate={onNavigate} />);

    await user.click(await screen.findByRole("radio", { name: "B 10" }));
    await user.click(screen.getByRole("button", { name: "Sprawdź odpowiedź" }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("submit_practice_response", {
      target_question_id: "demo-mat-01",
      student_response: { index: 1 },
      self_awarded_points: null,
    }));
    expect(await screen.findByText("Dobrze")).toBeInTheDocument();
    expect(screen.getByText("B. 10")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Wskazówki" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Rozwiązanie" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("radio", { name: "B 10 Poprawna" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Następne zadanie" }));
    expect(screen.getByRole("heading", { name: "Które słowo jest rzeczownikiem?" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Zakończ" }));
    expect(confirm).not.toHaveBeenCalled();
    expect(onNavigate).toHaveBeenCalledWith("start");
  });

  it("proposes the newest imported CKE year and preserves its context in focus mode", async () => {
    const cke2024 = {
      ...questions[0],
      question_id: "cke-2024-mat-01",
      source_type: "cke",
      source_label: "CKE 2024 matematyka",
      exam_paper_id: "cke-2024-main-mat",
      exam_year: 2024,
      exam_session: "main",
      exam_variant: "standard",
      source_document_id: "MOMA-P0-100-2405",
      paper_question_number: 1,
      prompt: "Pytanie z 2024 roku",
    };
    const cke2025 = {
      ...cke2024,
      question_id: "cke-2025-mat-01",
      source_label: "CKE 2025 matematyka",
      exam_paper_id: "cke-2025-main-mat",
      exam_year: 2025,
      source_document_id: "MOMA-P0-100-2505",
      prompt: "Pytanie z 2025 roku",
    };
    prepareRpc([questions[0], cke2024, cke2025]);
    const user = userEvent.setup();
    const { rerender } = render(<StudentPractice activeView="start" onNavigate={(view) => rerender(<StudentPractice activeView={view} onNavigate={() => undefined} />)} />);

    expect(await screen.findByRole("combobox", { name: "Rocznik" })).toHaveTextContent("CKE 2025");
    expect(screen.getByText("1", { selector: ".practice-launch-summary b" })).toBeInTheDocument();
    const launchCard = screen.getByText("Wybierz materiał", { selector: '[data-slot="card-title"]' }).closest('[data-slot="card"]');
    expect(launchCard).not.toBeNull();
    await user.click(within(launchCard as HTMLElement).getByRole("button", { name: "Otwórz arkusz" }));
    expect(await screen.findByRole("heading", { name: "Pytanie z 2025 roku" })).toBeInTheDocument();
    expect(screen.getByText(/CKE 2025 · termin główny · zadanie 1/)).toBeInTheDocument();
  });

  it("reveals the CKE rubric before saving a student's self-assessed score", async () => {
    const openQuestion = {
      ...questions[0],
      question_id: "cke-2026-mat-q15",
      source_type: "cke",
      source_label: "CKE 2026 matematyka",
      exam_paper_id: "cke-2026-main-mathematics-100-x",
      exam_year: 2026,
      exam_session: "main",
      exam_variant: "100-X",
      source_document_id: "OMAP-100-X-2605",
      paper_question_number: 15,
      question_type: "long_text",
      prompt: "Oblicz liczbę kartek niebieskich.",
      options: [],
      scoring: { max_points: 2, rules: ["2 pkt – poprawna metoda i wynik 57", "1 pkt – poprawne równanie"] },
      selected_response: null,
      grading_status: null,
    };
    prepareRpc([openQuestion], [], (params) => ({
      answer_is_correct: params.self_awarded_points == null ? null : params.self_awarded_points === 2,
      answer_correct_index: null,
      answer_key: { accepted_results: ["57"], assessment: "rubric" },
      answer_explanation: "Z równania otrzymujemy 57 kartek.",
      answer_attempt_count: 1,
      awarded_points: params.self_awarded_points ?? null,
      question_max_points: 2,
      response_grading_status: params.self_awarded_points == null ? "awaiting_self_assessment" : "self_assessed",
      solved_count: 1,
      correct_count: 0,
    }));
    const user = userEvent.setup();
    render(<StudentPractice activeView="exercises" onNavigate={() => undefined} />);

    const response = await screen.findByRole("textbox", { name: "Twoje rozwiązanie" });
    await user.type(response, "x + 1,5x + x - 10 + 37 = 160, więc 1,5x = 57");
    await user.click(screen.getByRole("button", { name: "Pokaż rozwiązanie i kryteria" }));

    expect(await screen.findByText("Porównaj rozwiązanie")).toBeInTheDocument();
    expect(screen.getByText("Kryteria punktowania CKE")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "2 punkty" }));
    await waitFor(() => expect(rpc).toHaveBeenLastCalledWith("get_student_paper_progress"));
    expect(await screen.findByText("Punkty zapisane")).toBeInTheDocument();
    expect(screen.getByText("2 / 2 pkt")).toBeInTheDocument();
  });
});
