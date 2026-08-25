import { createClient } from "@supabase/supabase-js";

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Brak zmiennej ${name}`);
  return value;
};

function estimatedMicrousd(usage) {
  const hit = Number(usage?.prompt_cache_hit_tokens) || 0;
  const miss = Number(usage?.prompt_cache_miss_tokens) || Math.max(0, (Number(usage?.prompt_tokens) || 0) - hit);
  const output = Number(usage?.completion_tokens) || 0;
  return Math.round(hit * 0.0028 + miss * 0.14 + output * 0.28);
}

async function evaluate(question, model, apiKey) {
  const started = Date.now();
  const response = await fetch(`${(process.env.AI_PROVIDER_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      thinking: { type: "disabled" },
      temperature: 0,
      max_tokens: 500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Rozwiąż zadanie ósmoklasisty. Zwróć wyłącznie JSON: {\"correct_index\":0,\"explanation\":\"krótkie wyjaśnienie po polsku\"}." },
        { role: "user", content: `${question.prompt}\n${question.options.map((option, index) => `${index}: ${option}`).join("\n")}` },
      ],
    }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  const parsed = JSON.parse(payload.choices?.[0]?.message?.content || "{}");
  return {
    correct: Number(parsed.correct_index) === question.correct_answer,
    latencyMs: Date.now() - started,
    costMicrousd: estimatedMicrousd(payload.usage),
  };
}

async function main() {
  const supabase = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const apiKey = process.env.AI_PROVIDER_API_KEY || required("DEEPSEEK_API_KEY");
  const models = (process.env.AI_BENCHMARK_MODELS || process.env.AI_MODEL || "deepseek-v4-flash").split(",").map((item) => item.trim()).filter(Boolean);
  const { data, error } = await supabase.from("practice_questions")
    .select("id,subject,prompt,options,correct_answer").eq("is_published", true).order("sort_order");
  if (error) throw error;
  const questions = ["mathematics", "polish", "english"].flatMap((subject) => (data || []).filter((item) => item.subject === subject).slice(0, 10));
  if (questions.length < 30) throw new Error("Benchmark wymaga co najmniej 10 opublikowanych zadań z każdego przedmiotu");

  const report = [];
  for (const model of models) {
    const results = [];
    for (const question of questions) {
      try {
        results.push(await evaluate(question, model, apiKey));
      } catch (benchmarkError) {
        results.push({ correct: false, latencyMs: 0, costMicrousd: 0, error: benchmarkError instanceof Error ? benchmarkError.message : String(benchmarkError) });
      }
    }
    const successful = results.filter((item) => !item.error);
    const totalCost = results.reduce((sum, item) => sum + item.costMicrousd, 0);
    report.push({
      model,
      questions: results.length,
      correct: results.filter((item) => item.correct).length,
      accuracyPercent: Math.round(results.filter((item) => item.correct).length / results.length * 1000) / 10,
      errors: results.filter((item) => item.error).length,
      averageLatencyMs: successful.length ? Math.round(successful.reduce((sum, item) => sum + item.latencyMs, 0) / successful.length) : null,
      measuredCostUsd: totalCost / 1_000_000,
      projectedCostPer1000Usd: totalCost ? Math.round(totalCost / results.length * 1000) / 1_000_000 : null,
    });
  }
  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), sample: "10 mathematics + 10 polish + 10 english", report }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
