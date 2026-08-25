import { AiProviderError, askTutorProvider } from "@/lib/ai-provider";
import { normalizeUsage, validateTutorMessage, validateTutorScope, type AiChatMessage, type TutorQuestionContext } from "@/lib/ai-tutor";
import { getSupabaseServiceClient, verifySupabaseAccessToken } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store, max-age=0" };

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: noStoreHeaders });
}

function bearerToken(request: Request) {
  const header = request.headers.get("authorization");
  return header?.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

function validQuestionId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9][a-z0-9-]{2,119}$/i.test(value);
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function providerMessage(error: AiProviderError) {
  if (error.code === "provider_not_configured") return "Nauczyciel AI nie został jeszcze skonfigurowany przez administratora.";
  if (error.code === "provider_timeout") return "AI potrzebuje teraz zbyt dużo czasu. Spróbuj ponownie za chwilę — pytanie nie zostało odliczone.";
  return "Nauczyciel AI jest chwilowo niedostępny. Spróbuj ponownie — pytanie nie zostało odliczone.";
}

async function authenticatedStudent(request: Request) {
  const token = bearerToken(request);
  if (!token) return null;
  const user = await verifySupabaseAccessToken(token);
  return user ? { user, token } : null;
}

async function loadChat(studentId: string, questionId: string) {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.rpc("get_ai_chat_for_student", {
    requested_student_id: studentId,
    target_question_id: questionId,
  });
  if (error) throw error;
  const row = (data as Record<string, unknown>[] | null)?.[0];
  if (!row) throw new Error("missing_chat_status");
  return {
    messages: (Array.isArray(row.chat_messages) ? row.chat_messages : []) as AiChatMessage[],
    usage: normalizeUsage(row.used_count, row.daily_limit, row.active_plan),
  };
}

export async function GET(request: Request) {
  try {
    const auth = await authenticatedStudent(request);
    if (!auth) return json({ error: "Zaloguj się ponownie." }, 401);
    const questionId = new URL(request.url).searchParams.get("questionId");
    if (!validQuestionId(questionId)) return json({ error: "Nieprawidłowe zadanie." }, 400);
    return json(await loadChat(auth.user.id, questionId));
  } catch {
    return json({ error: "Nie udało się pobrać rozmowy z AI." }, 503);
  }
}

export async function POST(request: Request) {
  let requestId = "";
  try {
    const auth = await authenticatedStudent(request);
    if (!auth) return json({ error: "Zaloguj się ponownie." }, 401);

    const declaredLength = Number(request.headers.get("content-length")) || 0;
    if (declaredLength > 2_000) return json({ error: "Żądanie jest zbyt duże." }, 413);
    const rawBody = await request.text();
    if (rawBody.length > 2_000) return json({ error: "Żądanie jest zbyt duże." }, 413);
    let body: { questionId?: unknown; message?: unknown };
    try {
      body = JSON.parse(rawBody) as { questionId?: unknown; message?: unknown };
    } catch {
      return json({ error: "Nieprawidłowe żądanie." }, 400);
    }
    if (!validQuestionId(body.questionId)) return json({ error: "Nieprawidłowe zadanie." }, 400);
    const validation = validateTutorMessage(body.message);
    if (!validation.ok) return json({ error: validation.message, code: validation.code }, 422);

    const supabase = getSupabaseServiceClient();
    const [{ data: scopeQuestion, error: scopeQuestionError }, { data: scopeExplanation, error: scopeExplanationError }] = await Promise.all([
      supabase.from("practice_questions")
        .select("subject,topic,prompt,options")
        .eq("id", body.questionId)
        .eq("is_published", true)
        .single(),
      supabase.from("ai_question_explanations")
        .select("solution_steps,hints,final_explanation")
        .eq("question_id", body.questionId)
        .eq("status", "approved")
        .single(),
    ]);
    if (scopeQuestionError || !scopeQuestion) return json({ error: "Nieprawidłowe zadanie." }, 404);
    if (scopeExplanationError || !scopeExplanation) return json({ error: "To zadanie czeka jeszcze na zatwierdzone opracowanie.", code: "explanation_unavailable" }, 409);
    const scopeValidation = validateTutorScope(validation.message, {
      subject: String(scopeQuestion.subject) as TutorQuestionContext["subject"],
      topic: String(scopeQuestion.topic),
      prompt: String(scopeQuestion.prompt),
      options: stringArray(scopeQuestion.options),
      solutionSteps: stringArray(scopeExplanation.solution_steps),
      hints: stringArray(scopeExplanation.hints),
      finalExplanation: String(scopeExplanation.final_explanation),
    });
    if (!scopeValidation.ok) {
      const { data: rejectionData, error: rejectionError } = await supabase.rpc("record_ai_scope_rejection", {
        requested_student_id: auth.user.id,
      });
      if (rejectionError) throw rejectionError;
      const rejection = (rejectionData as Record<string, unknown>[] | null)?.[0];
      const blocked = rejection?.blocked === true;
      return json({
        error: blocked ? "Zbyt wiele pytań niezwiązanych z zadaniami. Spróbuj ponownie jutro." : scopeValidation.message,
        code: blocked ? "scope_rate_limit" : scopeValidation.code,
      }, blocked ? 429 : 422);
    }

    const { data, error: reserveError } = await supabase.rpc("reserve_ai_tutor_request", {
      requested_student_id: auth.user.id,
      target_question_id: body.questionId,
      student_message: validation.message,
    });
    if (reserveError) {
      if (reserveError.message.includes("ai_daily_limit_reached")) {
        const chat = await loadChat(auth.user.id, body.questionId);
        return json({ error: "Dzisiejszy limit pytań został wykorzystany.", code: "daily_limit", ...chat }, 429);
      }
      if (reserveError.message.includes("approved AI explanation required")) {
        return json({ error: "To zadanie czeka jeszcze na zatwierdzone opracowanie.", code: "explanation_unavailable" }, 409);
      }
      throw reserveError;
    }

    const row = (data as Record<string, unknown>[] | null)?.[0];
    if (!row) throw new Error("missing_reservation");
    requestId = String(row.reserved_request_id);
    const context: TutorQuestionContext = {
      questionId: body.questionId,
      subject: String(row.question_subject) as TutorQuestionContext["subject"],
      topic: String(row.question_topic),
      prompt: String(row.question_prompt),
      options: stringArray(row.question_options),
      answerKey: (row.approved_answer_key ?? {}) as Record<string, unknown>,
      solutionSteps: stringArray(row.approved_solution_steps),
      hints: stringArray(row.approved_hints),
      finalExplanation: String(row.approved_final_explanation),
      history: (Array.isArray(row.chat_history) ? row.chat_history : []) as TutorQuestionContext["history"],
    };

    const startedAt = Date.now();
    let result;
    try {
      result = await askTutorProvider(context, validation.message, auth.user.id);
    } catch (error) {
      const providerError = error instanceof AiProviderError ? error : new AiProviderError("provider_unavailable", true);
      await supabase.rpc("fail_ai_tutor_request", { target_request_id: requestId, failure_code: providerError.code });
      return json({ error: providerMessage(providerError), code: providerError.code, retryable: providerError.retryable }, providerError.code === "provider_not_configured" ? 503 : 502);
    }

    const latencyMs = Date.now() - startedAt;
    const { error: completeError } = await supabase.rpc("complete_ai_tutor_request", {
      target_request_id: requestId,
      assistant_message: result.content,
      provider_name: result.provider,
      model_name: result.model,
      prompt_token_count: result.inputTokens,
      completion_token_count: result.outputTokens,
      cache_hit_token_count: result.cacheHitInputTokens,
      estimated_cost_microusd: result.estimatedCostMicrousd,
      response_latency_ms: latencyMs,
    });
    if (completeError) {
      await supabase.rpc("fail_ai_tutor_request", { target_request_id: requestId, failure_code: "completion_store_failed" });
      throw completeError;
    }

    const usage = normalizeUsage(row.used_count, row.daily_limit, row.active_plan);
    return json({
      message: {
        id: requestId,
        role: "assistant",
        content: result.content,
        created_at: new Date().toISOString(),
      },
      usage,
    });
  } catch {
    if (requestId) {
      try {
        await getSupabaseServiceClient().rpc("fail_ai_tutor_request", { target_request_id: requestId, failure_code: "internal_error" });
      } catch {
        // The reservation expires automatically; never expose server details to a student.
      }
    }
    return json({ error: "Nie udało się połączyć z nauczycielem AI. Spróbuj ponownie." }, 500);
  }
}
