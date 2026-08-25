import { createHmac } from "node:crypto";
import { buildTutorSystemPrompt, estimateDeepSeekCostMicrousd, type TutorQuestionContext } from "@/lib/ai-tutor";

type DeepSeekResponse = {
  model?: string;
  choices?: Array<{ message?: { content?: string } }>;
  usage?: {
    prompt_tokens?: number;
    prompt_cache_hit_tokens?: number;
    prompt_cache_miss_tokens?: number;
    completion_tokens?: number;
  };
};

export type TutorProviderResult = {
  content: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheHitInputTokens: number;
  cacheMissInputTokens: number;
  estimatedCostMicrousd: number;
};

export class AiProviderError extends Error {
  constructor(public readonly code: string, public readonly retryable: boolean) {
    super(code);
  }
}

function numericEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function pseudonymousUserId(studentId: string, secret: string) {
  return `egz_${createHmac("sha256", secret).update(studentId).digest("hex").slice(0, 24)}`;
}

export async function askTutorProvider(
  context: TutorQuestionContext,
  userMessage: string,
  studentId: string,
): Promise<TutorProviderResult> {
  const apiKey = process.env.AI_PROVIDER_API_KEY || process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new AiProviderError("provider_not_configured", false);

  const baseUrl = (process.env.AI_PROVIDER_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
  const model = process.env.AI_MODEL || "deepseek-v4-flash";
  const timeoutMs = numericEnv("AI_TIMEOUT_MS", 25_000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: buildTutorSystemPrompt(context) },
          ...context.history,
          { role: "user", content: userMessage },
        ],
        thinking: { type: "disabled" },
        temperature: 0.2,
        max_tokens: 500,
        stream: false,
        user_id: pseudonymousUserId(studentId, process.env.AI_USER_HASH_SECRET || apiKey),
      }),
    });

    if (!response.ok) {
      throw new AiProviderError(`provider_http_${response.status}`, response.status === 408 || response.status === 429 || response.status >= 500);
    }

    const data = await response.json() as DeepSeekResponse;
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new AiProviderError("provider_empty_response", true);

    const promptTokens = Math.max(0, Number(data.usage?.prompt_tokens) || 0);
    const cacheHitInputTokens = Math.max(0, Number(data.usage?.prompt_cache_hit_tokens) || 0);
    const cacheMissInputTokens = Math.max(0, Number(data.usage?.prompt_cache_miss_tokens) || Math.max(0, promptTokens - cacheHitInputTokens));
    const outputTokens = Math.max(0, Number(data.usage?.completion_tokens) || 0);
    const prices = {
      cacheHit: numericEnv("AI_CACHE_HIT_USD_PER_MILLION", 0.0028),
      cacheMiss: numericEnv("AI_INPUT_USD_PER_MILLION", 0.14),
      output: numericEnv("AI_OUTPUT_USD_PER_MILLION", 0.28),
    };

    return {
      content: content.slice(0, 5_000),
      provider: "deepseek",
      model: data.model || model,
      inputTokens: promptTokens,
      outputTokens,
      cacheHitInputTokens,
      cacheMissInputTokens,
      estimatedCostMicrousd: estimateDeepSeekCostMicrousd({ cacheHitInputTokens, cacheMissInputTokens, outputTokens }, prices),
    };
  } catch (error) {
    if (error instanceof AiProviderError) throw error;
    if (error instanceof Error && error.name === "AbortError") throw new AiProviderError("provider_timeout", true);
    throw new AiProviderError("provider_unavailable", true);
  } finally {
    clearTimeout(timeout);
  }
}
