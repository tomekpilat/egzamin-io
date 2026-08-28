import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  hasUnsavedPracticeAnswer,
  StudentPractice,
  UNSAVED_ANSWER_MESSAGE,
} from "@/components/student-practice";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

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

function prepareRpc(questionRows = questions, progressRows: Record<string, unknown>[] = []) {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => new Response(JSON.stringify(init?.method === "POST" ? {
    message: { id: "ai-response-1", role: "assistant", content: "Wyjaśnienie AI do aktualnego zadania.", created_at: "2026-08-28T10:00:00.000Z" },
    usage: { used: 1, limit: 3, remaining: 2, plan: "free" },
  } : {
    messages: [],
    usage: { used: 0, limit: 3, remaining: 3, plan: "free" },
    available: true,
    hints: ["Zamień procent na ułamek.", "Pomnóż przez liczbę."],
  }), { status: 200, headers: { "Content-Type": "application/json" } })));
  rpc.mockImplementation(async (name: string) => {
    if (name === "get_practice_questions") return { data: questionRows, error: null };
    if (name === "get_student_paper_progress") return { data: progressRows, error: null };
    if (name === "get_my_cke_preference") return { data: [{ accommodation_code: "100", accommodation_label: "Wariant standardowy" }], error: null };
    if (name === "submit_practice_answer") {
      return {
        data: [{
          answer_is_correct: true,
          answer_correct_index: 1,
          answer_explanation: "20% z 50 to 10.",
          answer_attempt_count: 1,
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
    expect(screen.getByText("Twój wariant arkuszy", { selector: '[data-slot="card-title"]' })).toBeInTheDocument();
    expect(screen.getByText("Ustawienia konta", { selector: '[data-slot="card-title"]' })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Polityka prywatności" })).toHaveAttribute("href", "/polityka-prywatnosci");
    expect(screen.getByRole("link", { name: "Usuń konto i dane" })).toHaveAttribute("href", "/usun-konto");
  });

  it("detects only a changed, unsubmitted draft", () => {
    expect(hasUnsavedPracticeAnswer("q1", null, { questionId: "q1", index: 2 })).toBe(true);
    expect(hasUnsavedPracticeAnswer("q1", 2, { questionId: "q1", index: 2 })).toBe(false);
    expect(hasUnsavedPracticeAnswer("q1", null, { questionId: "q2", index: 2 })).toBe(false);
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

    await user.click(await screen.findByRole("tab", { name: "Tutor AI" }));
    const composer = screen.getByRole("textbox", { name: "Pytanie do nauczyciela AI" });
    await user.type(composer, "Dlaczego?");
    await user.click(screen.getByRole("button", { name: "Wyślij pytanie" }));

    expect(await screen.findByText("Wyjaśnienie AI do aktualnego zadania.")).toBeInTheDocument();
    expect(composer).toHaveValue("");
  });

  it("saves the answer before navigation and exits without a discard warning", async () => {
    prepareRpc();
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const confirm = vi.spyOn(window, "confirm");
    render(<StudentPractice activeView="exercises" onNavigate={onNavigate} />);

    await user.click(await screen.findByRole("radio", { name: "B 10" }));
    await user.click(screen.getByRole("button", { name: "Sprawdź odpowiedź" }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("submit_practice_answer", {
      target_question_id: "demo-mat-01",
      selected_answer: 1,
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
    await user.click(screen.getByRole("button", { name: "Rozpocznij ćwiczenia →" }));
    expect(await screen.findByRole("heading", { name: "Pytanie z 2025 roku" })).toBeInTheDocument();
    expect(screen.getByText(/CKE 2025 · termin główny · zadanie 1/)).toBeInTheDocument();
  });
});
