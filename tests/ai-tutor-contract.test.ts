import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const route = readFileSync(join(process.cwd(), "app/api/ai/tutor/route.ts"), "utf8");
const provider = readFileSync(join(process.cwd(), "lib/ai-provider.ts"), "utf8");
const component = readFileSync(join(process.cwd(), "components/ai-tutor.tsx"), "utf8");
const practice = readFileSync(join(process.cwd(), "components/student-practice.tsx"), "utf8");
const styles = readFileSync(join(process.cwd(), "app/account.css"), "utf8");

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
    expect(practice).toContain("practice-support-panel");
    expect(practice).toContain("<AiTutor questionId={currentQuestion.question_id} feedback={tutorFeedback}");
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
    expect(component).toContain("{usage.remaining} z {usage.limit} pytań AI");
    expect(component).toContain("Pokaż podpowiedź");
    expect(component).toContain("Spróbuj ponownie");
    expect(component).toContain("Nie wpisuj danych osobowych");
    expect(component).toContain('href="/plan-plus#porownanie"');
    expect(route).toContain("pytanie nie zostało odliczone");
  });

  it("expands an active conversation and keeps a usable chat viewport", () => {
    expect(component).toContain('data-conversation-active={messages.length > 0 ? "true" : "false"}');
    expect(component).toContain('role="log"');
    expect(component).toContain('rows={3}');
    expect(styles).toContain('.practice-focus-workspace:has(.ai-tutor-card[data-conversation-active="true"])');
    expect(styles).toContain('.ai-tutor-card[data-conversation-active="true"] .ai-tutor-conversation');
    expect(component).toContain("conversationRef.current.scrollTop = conversationRef.current.scrollHeight");
  });

  it("shows hints first and replaces them with readable answer feedback", () => {
    expect(component).toContain('displayedTab === "hints" && !feedback');
    expect(component).toContain('displayedTab === "solution" && feedback');
    expect(component).toContain('feedback && activeTab === "hints"');
    expect(component).toContain('data-has-feedback={feedback ? "true" : "false"}');
    expect(component).toContain("Następne zadanie");
    expect(practice).toContain('className={`practice-support-panel${tutorFeedback ? " has-feedback" : ""}`}');
    expect(component).toContain('className={`practice-feedback ${feedback.isCorrect ? "is-correct" : "is-incorrect"}`}');
    expect(styles).toContain(".dark .practice-feedback.is-correct");
    expect(styles).toContain(".dark .practice-feedback.is-incorrect");
    expect(styles).toContain('.dark .ai-assistance-section .practice-feedback [data-slot="alert-description"] > b { color: inherit; }');
  });
});
