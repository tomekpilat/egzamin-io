import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const route = readFileSync(join(process.cwd(), "app/api/ai/tutor/route.ts"), "utf8");
const provider = readFileSync(join(process.cwd(), "lib/ai-provider.ts"), "utf8");
const component = readFileSync(join(process.cwd(), "components/ai-tutor.tsx"), "utf8");
const practice = readFileSync(join(process.cwd(), "components/student-practice.tsx"), "utf8");
const styles = readFileSync(join(process.cwd(), "app/redesign.css"), "utf8");

describe("AI tutor end-to-end contract", () => {
  it("verifies the user and keeps provider and service keys on the server", () => {
    expect(route).toContain("verifySupabaseAccessToken");
    expect(route).toContain("getSupabaseServiceClient");
    expect(provider).toContain("process.env.DEEPSEEK_API_KEY");
    expect(provider).toContain('thinking: { type: "disabled" }');
    expect(provider).toContain("pseudonymousUserId");
    expect(component).not.toContain("DEEPSEEK_API_KEY");
    expect(component).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("releases failed reservations and keeps help beside the active question", () => {
    expect(route).toContain('supabase.rpc("fail_ai_tutor_request"');
    expect(route).toContain('supabase.rpc("complete_ai_tutor_request"');
    expect(practice).toContain("task-support");
    expect(practice).toContain('<AiTutor questionId={currentQuestion.question_id} feedback={tutorFeedback} aiEnabled={aiEnabled}');
  });

  it("loads chat state directly instead of relying on the broken legacy bootstrap RPC", () => {
    expect(route).toContain('.from("ai_tutor_threads")');
    expect(route).toContain('.from("ai_usage_daily")');
    expect(route).not.toContain('supabase.rpc("get_ai_chat_for_student"');
  });

  it("rejects off-topic and injection attempts before reserving quota or calling the provider", () => {
    expect(route).toContain("validateTutorScope");
    expect(route).toContain('supabase.rpc("record_ai_scope_rejection"');
    const guardCall = route.indexOf("const scopeValidation = validateTutorScope");
    expect(guardCall).toBeGreaterThan(0);
    expect(guardCall).toBeLessThan(route.indexOf('supabase.rpc("reserve_ai_tutor_request"'));
    expect(guardCall).toBeLessThan(route.indexOf("askTutorProvider(context"));
    expect(route).toContain("declaredLength > 2_000");
  });

  it("shows usage, privacy guidance, retry-safe errors and a Plus path", () => {
    expect(component).toContain("Zostały {usage.remaining} z {usage.limit} pytań dziś");
    expect(component).toContain("Pokaż podpowiedź");
    expect(component).toContain("Spróbuj ponownie");
    expect(component).toContain("Nie wpisuj danych osobowych");
    expect(component).toContain('href="/plan-plus#porownanie"');
    expect(route).toContain("pytanie nie zostało odliczone");
    expect(route).toContain("requireActiveStudent");
    expect(route).toContain("FREE_AI_QUESTIONS_PER_DAY");
    expect(component).toContain("W wersji Free otrzymujesz 3 własne pytania do Mai dziennie");
    expect(component).toContain("Cześć, jestem Maia — Twoja pomocniczka w nauce");
    expect(component).not.toContain('TUTOR_NAME = "Maja"');
  });

  it("expands an active conversation and keeps a usable chat viewport", () => {
    expect(component).toContain('data-conversation-active={messages.length > 0 ? "true" : "false"}');
    expect(component).toContain('role="log"');
    expect(component).toContain('rows={1}');
    expect(component).toContain('className="task-chat-entry"');
    expect(component).toContain("task-quick-questions");
    expect(component).toContain("Te podpowiedzi nie zmniejszają dziennego limitu");
    expect(component).toContain("handleQuickQuestion");
    expect(styles).toContain(".task-workspace { min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) 452px;");
    expect(styles).toContain(".task-chat { min-height: 180px;");
    expect(component).toContain("conversationRef.current.scrollTop = conversationRef.current.scrollHeight");
  });

  it("shows hints first and switches to the supplied step-by-step solution", () => {
    expect(component).toContain('displayedTab === "hints" && !feedback');
    expect(component).toContain('displayedTab === "solution" && feedback');
    expect(component).toContain('setActiveTab("solution")');
    expect(component).toContain("Rozwiązanie krok po kroku");
    expect(component).toContain("task-solution-answer");
    expect(practice).toContain('className={`task-support${tutorFeedback ? " has-feedback" : ""}`}');
    expect(practice).toContain("task-verdict");
    expect(styles).toContain(".task-verdict.is-correct");
    expect(styles).toContain(".task-verdict.is-incorrect");
  });
});
