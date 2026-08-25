import { createClient } from "@supabase/supabase-js";

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Brak zmiennej ${name}`);
  return value;
};

const subjectInstructions = {
  mathematics: "Podziel rozwiązanie na krótkie obliczenia. Wzory zapisuj w MathJax jako \\( ... \\) lub \\[ ... \\].",
  polish: "Wskaż dowód w treści, nazwij zasadę lub środek językowy i dopiero potem sformułuj wniosek.",
  english: "Wyjaśniaj po polsku, ale przykłady i reguły języka angielskiego zapisuj po angielsku.",
};

function numberArgument(name, fallback) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? Number(process.argv[index + 1]) : fallback;
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function textArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function validateGenerated(value, correctIndex) {
  if (!value || !Array.isArray(value.steps) || value.steps.length < 2 || !Array.isArray(value.hints) || value.hints.length < 2) {
    throw new Error("Model nie zwrócił wymaganych kroków i podpowiedzi");
  }
  if (Number(value.correct_index) !== correctIndex) throw new Error("Model zmienił zatwierdzony klucz odpowiedzi");
  if (typeof value.final_explanation !== "string" || value.final_explanation.trim().length < 10) {
    throw new Error("Model nie zwrócił końcowego wyjaśnienia");
  }
  return {
    steps: value.steps.map(String).filter(Boolean),
    hints: value.hints.map(String).filter(Boolean),
    finalExplanation: value.final_explanation.trim(),
  };
}

async function generate(question, apiKey, model) {
  const response = await fetch(`${(process.env.AI_PROVIDER_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      thinking: { type: "disabled" },
      temperature: 0.1,
      max_tokens: 1500,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Tworzysz robocze opracowanie zadania dla ósmoklasisty. Nie wolno zmienić podanego klucza. ${subjectInstructions[question.subject]} Zwróć wyłącznie JSON: {"steps":["..."],"hints":["..."],"final_explanation":"...","correct_index":0}. Podpowiedzi mają naprowadzać, a nie od razu zdradzać odpowiedź.`,
        },
        {
          role: "user",
          content: `Temat: ${question.topic}\nZadanie: ${question.prompt}\nOdpowiedzi: ${question.options.map((option, index) => `${index}: ${option}`).join(" | ")}\nZatwierdzony correct_index: ${question.correct_answer}\nDotychczasowe wyjaśnienie redakcyjne: ${question.explanation}`,
        },
      ],
    }),
  });
  if (!response.ok) throw new Error(`DeepSeek HTTP ${response.status}`);
  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("Pusta odpowiedź modelu");
  return validateGenerated(JSON.parse(content), question.correct_answer);
}

async function main() {
  const supabase = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const apiKey = process.env.AI_PROVIDER_API_KEY || required("DEEPSEEK_API_KEY");
  const model = process.env.AI_MODEL || "deepseek-v4-flash";
  const limit = numberArgument("--limit", 10);
  const requestedQuestion = textArgument("--question");

  let query = supabase.from("practice_questions")
    .select("id,subject,topic,prompt,options,correct_answer,explanation")
    .eq("is_published", true)
    .order("sort_order")
    .limit(limit);
  if (requestedQuestion) query = query.eq("id", requestedQuestion);
  const { data: questions, error: questionError } = await query;
  if (questionError) throw questionError;

  const { data: approved, error: approvedError } = await supabase.from("ai_question_explanations")
    .select("question_id").eq("status", "approved");
  if (approvedError) throw approvedError;
  const approvedIds = new Set((approved || []).map((item) => item.question_id));
  const pending = (questions || []).filter((question) => requestedQuestion || !approvedIds.has(question.id));
  if (!pending.length) {
    console.log("Brak zadań oczekujących na opracowanie.");
    return;
  }

  for (const question of pending) {
    try {
      const generated = await generate(question, apiKey, model);
      const { data: draftId, error } = await supabase.rpc("create_ai_explanation_draft", {
        target_question_id: question.id,
        generated_steps: generated.steps,
        generated_hints: generated.hints,
        generated_explanation: generated.finalExplanation,
        generator_model: model,
      });
      if (error) throw error;
      console.log(`${question.id}: utworzono wersję roboczą ${draftId}`);
    } catch (error) {
      console.error(`${question.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
