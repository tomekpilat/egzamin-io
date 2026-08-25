import { afterEach, describe, expect, it, vi } from "vitest";
import { AiProviderError, askTutorProvider } from "@/lib/ai-provider";
import type { TutorQuestionContext } from "@/lib/ai-tutor";

const context: TutorQuestionContext = {
  questionId: "demo-mat-01",
  subject: "mathematics",
  topic: "Procenty",
  prompt: "Ile to 20% z 50?",
  options: ["5", "10", "20", "25"],
  answerKey: { correct_index: 1 },
  solutionSteps: ["Zapisz 20/100.", "Pomnóż przez 50."],
  hints: ["Zamień procent na ułamek.", "Wykonaj mnożenie."],
  finalExplanation: "20% z 50 to 10.",
  history: [],
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("DeepSeek tutor provider", () => {
  it("fails safely before a network request when the server key is missing", async () => {
    vi.stubEnv("AI_PROVIDER_API_KEY", "");
    vi.stubEnv("DEEPSEEK_API_KEY", "");
    await expect(askTutorProvider(context, "Pomóż mi", "student-id"))
      .rejects.toEqual(expect.objectContaining<Partial<AiProviderError>>({ code: "provider_not_configured", retryable: false }));
  });

  it("uses the current cheap model, disables thinking and sends only a hashed user id", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "secret-key");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      model: "deepseek-v4-flash",
      choices: [{ message: { content: "Zacznij od zamiany procentu na ułamek." } }],
      usage: { prompt_tokens: 3000, prompt_cache_hit_tokens: 1000, prompt_cache_miss_tokens: 2000, completion_tokens: 500 },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await askTutorProvider(context, "Pomóż mi", "private-student-id");
    const request = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(request.model).toBe("deepseek-v4-flash");
    expect(request.thinking).toEqual({ type: "disabled" });
    expect(request.user_id).toMatch(/^egz_[a-f0-9]{24}$/);
    expect(JSON.stringify(request)).not.toContain("private-student-id");
    expect(result).toMatchObject({ inputTokens: 3000, outputTokens: 500, estimatedCostMicrousd: 423 });
  });

  it("marks throttling as retryable without exposing the provider body", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "secret-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("provider details", { status: 429 })));
    await expect(askTutorProvider(context, "Pomóż mi", "student-id"))
      .rejects.toEqual(expect.objectContaining<Partial<AiProviderError>>({ code: "provider_http_429", retryable: true }));
  });
});
