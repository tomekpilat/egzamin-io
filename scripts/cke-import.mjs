#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const SUBJECTS = new Set(["mathematics", "polish", "english", "french", "spanish", "german", "russian", "italian"]);
const SESSIONS = new Set(["main", "additional"]);
const QUESTION_TYPES = new Set(["single_choice", "multiple_choice", "numeric", "short_text", "long_text"]);
const BLOCK_TYPES = new Set(["markdown", "math", "image", "audio", "table", "passage"]);
const SHA256 = /^[a-f0-9]{64}$/;
const SLUG = /^[a-z0-9][a-z0-9-]{2,119}$/;

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function prepareManifest(input) {
  const manifest = structuredClone(input);
  const passages = new Map((manifest.passages ?? []).map((passage) => [passage.id, passage]));
  if (Array.isArray(manifest.questions)) {
    manifest.questions = manifest.questions.map((question) => {
      const normalized = {
        ...question,
        content_blocks: (question.content_blocks ?? []).map((block) => {
          if (block.type !== "passage" || !block.passage_id) return block;
          const passage = passages.get(block.passage_id);
          return passage ? { type: "passage", ...passage, default_open: block.default_open ?? false } : block;
        }),
      };
      delete normalized.source_checksum;
      return { ...normalized, source_checksum: sha256(canonicalJson(normalized)) };
    });
  }
  return { manifest, checksum: sha256(canonicalJson(manifest)) };
}

export function validateManifest(input) {
  const errors = [];
  const add = (path, message) => errors.push(`${path}: ${message}`);
  if (!input || typeof input !== "object" || Array.isArray(input)) return { valid: false, errors: ["manifest: wymagany obiekt JSON"] };

  if (input.schema_version !== 1) add("schema_version", "obsługiwana jest wersja 1");
  if (!SLUG.test(input.manifest_id ?? "")) add("manifest_id", "użyj 3–120 małych liter, cyfr i łączników");
  if (!Number.isInteger(input.manifest_version) || input.manifest_version < 1) add("manifest_version", "wymagana dodatnia liczba całkowita");

  const paper = input.paper;
  if (!paper || typeof paper !== "object" || Array.isArray(paper)) {
    add("paper", "wymagany obiekt");
  } else {
    if (!SLUG.test(paper.id ?? "")) add("paper.id", "niepoprawny stabilny identyfikator");
    if (!nonEmpty(paper.source_document_id)) add("paper.source_document_id", "wymagany kod dokumentu CKE");
    if (!SHA256.test(paper.source_pdf_sha256 ?? "")) add("paper.source_pdf_sha256", "wymagany SHA-256 oryginalnego PDF");
    if (!/^https:\/\//.test(paper.source_url ?? "")) add("paper.source_url", "wymagany oficjalny adres HTTPS");
    if (!nonEmpty(paper.source_label)) add("paper.source_label", "wymagana etykieta źródła");
    if (!Number.isInteger(paper.exam_year) || paper.exam_year < 2019 || paper.exam_year > 2100) add("paper.exam_year", "rok poza zakresem 2019–2100");
    if (!SESSIONS.has(paper.exam_session)) add("paper.exam_session", "dozwolone: main, additional");
    if (!SUBJECTS.has(paper.subject)) add("paper.subject", `dozwolone: ${[...SUBJECTS].join(", ")}`);
    if (!nonEmpty(paper.variant_code)) add("paper.variant_code", "wymagany wariant, np. standard");
    if (!Number.isInteger(paper.question_count) || paper.question_count < 1) add("paper.question_count", "wymagana dodatnia liczba zadań");
    const supplementarySources = paper.supplementary_sources ?? [];
    if (!Array.isArray(supplementarySources)) add("paper.supplementary_sources", "wymagana tablica");
    else supplementarySources.forEach((source, index) => {
      if (!SLUG.test(source?.id ?? "")) add(`paper.supplementary_sources[${index}].id`, "niepoprawny identyfikator");
      if (!nonEmpty(source?.path) || source.path.startsWith("/") || source.path.includes("..")) add(`paper.supplementary_sources[${index}].path`, "wymagana bezpieczna ścieżka względna");
      if (!SHA256.test(source?.sha256 ?? "")) add(`paper.supplementary_sources[${index}].sha256`, "wymagany SHA-256 pliku");
      if (!nonEmpty(source?.label)) add(`paper.supplementary_sources[${index}].label`, "wymagana etykieta źródła");
    });
  }

  const permission = input.permission;
  if (!permission || typeof permission !== "object" || Array.isArray(permission)) {
    add("permission", "wymagany obiekt dokumentujący zgodę CKE");
  } else {
    if (!nonEmpty(permission.reference)) add("permission.reference", "wymagany numer, nazwa lub lokalizacja zgody CKE");
    if (!nonEmpty(permission.verified_by)) add("permission.verified_by", "wymagana osoba potwierdzająca zgodę");
    if (!nonEmpty(permission.verified_at) || Number.isNaN(Date.parse(permission.verified_at))) add("permission.verified_at", "wymagana data ISO 8601");
  }

  const passages = input.passages ?? [];
  const passageIds = new Set();
  if (!Array.isArray(passages)) add("passages", "wymagana tablica");
  else passages.forEach((passage, index) => {
    const path = `passages[${index}]`;
    if (!SLUG.test(passage?.id ?? "")) add(`${path}.id`, "niepoprawny identyfikator");
    else if (passageIds.has(passage.id)) add(`${path}.id`, "duplikat identyfikatora");
    passageIds.add(passage?.id);
    if (!nonEmpty(passage?.title)) add(`${path}.title`, "wymagany tytuł");
    if (!Array.isArray(passage?.paragraphs) || !passage.paragraphs.length || passage.paragraphs.some((paragraph) => !nonEmpty(paragraph))) add(`${path}.paragraphs`, "wymagana niepusta lista akapitów");
  });

  const questions = input.questions;
  if (!Array.isArray(questions) || !questions.length) {
    add("questions", "wymagana niepusta tablica");
    return { valid: false, errors };
  }
  if (paper?.question_count !== questions.length) add("paper.question_count", `zadeklarowano ${paper?.question_count ?? "brak"}, znaleziono ${questions.length}`);

  const ids = new Set();
  const numbers = new Set();
  const orders = new Set();
  questions.forEach((question, index) => {
    const path = `questions[${index}]`;
    if (!question || typeof question !== "object" || Array.isArray(question)) return add(path, "wymagany obiekt");
    if (!SLUG.test(question.id ?? "")) add(`${path}.id`, "niepoprawny stabilny identyfikator");
    else if (ids.has(question.id)) add(`${path}.id`, "duplikat identyfikatora");
    ids.add(question.id);
    if (!/^[0-9]+(\.[0-9]+)?$/.test(question.number ?? "")) add(`${path}.number`, "użyj numeru, np. 12 albo 12.1");
    else if (numbers.has(question.number)) add(`${path}.number`, "duplikat numeru zadania");
    numbers.add(question.number);
    if (!Number.isInteger(question.sort_order) || question.sort_order < 1) add(`${path}.sort_order`, "wymagana dodatnia liczba całkowita");
    else if (orders.has(question.sort_order)) add(`${path}.sort_order`, "duplikat kolejności");
    orders.add(question.sort_order);
    if (!Array.isArray(question.source_pages) || !question.source_pages.length || question.source_pages.some((page) => !Number.isInteger(page) || page < 1)) add(`${path}.source_pages`, "wymagana lista dodatnich numerów stron");
    if (!QUESTION_TYPES.has(question.type)) add(`${path}.type`, "nieobsługiwany typ zadania");
    if (!nonEmpty(question.topic)) add(`${path}.topic`, "wymagany temat");
    if (![1, 2, 3].includes(question.difficulty)) add(`${path}.difficulty`, "dozwolone wartości: 1, 2, 3");
    if (!nonEmpty(question.prompt)) add(`${path}.prompt`, "wymagana treść zadania");
    if (!nonEmpty(question.explanation)) add(`${path}.explanation`, "wymagane zweryfikowane wyjaśnienie");
    if (!Array.isArray(question.solution_steps) || !question.solution_steps.length || question.solution_steps.some((step) => !nonEmpty(step))) add(`${path}.solution_steps`, "wymagana niepusta lista zweryfikowanych kroków");
    if (!Array.isArray(question.hints) || !question.hints.length || question.hints.some((hint) => !nonEmpty(hint))) add(`${path}.hints`, "wymagana niepusta lista podpowiedzi");
    if (!question.answer_key || typeof question.answer_key !== "object" || Array.isArray(question.answer_key)) add(`${path}.answer_key`, "wymagany obiekt klucza odpowiedzi");
    if (!question.scoring || typeof question.scoring !== "object" || Array.isArray(question.scoring)) add(`${path}.scoring`, "wymagany obiekt punktacji");
    if (!Number.isInteger(question.scoring?.max_points) || question.scoring.max_points < 1) add(`${path}.scoring.max_points`, "wymagana dodatnia liczba punktów");

    const options = question.answer_options ?? [];
    if (question.type === "single_choice") {
      if (!Array.isArray(options) || options.length !== 4 || options.some((option) => !nonEmpty(option))) add(`${path}.answer_options`, "zadanie single_choice wymaga czterech odpowiedzi tekstowych");
      if (!Number.isInteger(question.answer_key?.correct_index) || question.answer_key.correct_index < 0 || question.answer_key.correct_index > 3) add(`${path}.answer_key.correct_index`, "wymagany indeks 0–3");
    }
    if (question.type === "multiple_choice") {
      if (!Array.isArray(options) || options.length < 2 || options.some((option) => !nonEmpty(option))) add(`${path}.answer_options`, "zadanie multiple_choice wymaga co najmniej dwóch odpowiedzi tekstowych");
      const correctIndices = question.answer_key?.correct_indices;
      if (!Array.isArray(correctIndices) || !correctIndices.length || correctIndices.some((item) => !Number.isInteger(item) || item < 0 || item >= options.length) || new Set(correctIndices).size !== correctIndices.length) add(`${path}.answer_key.correct_indices`, "wymagana unikalna lista indeksów mieszczących się w odpowiedziach");
    }

    const assets = Array.isArray(question.assets) ? question.assets : [];
    const assetIds = new Set();
    assets.forEach((asset, assetIndex) => {
      if (!nonEmpty(asset?.id)) add(`${path}.assets[${assetIndex}].id`, "wymagany identyfikator");
      else if (assetIds.has(asset.id)) add(`${path}.assets[${assetIndex}].id`, "duplikat zasobu");
      assetIds.add(asset?.id);
      if (!nonEmpty(asset?.path) || asset.path.startsWith("/") || asset.path.includes("..")) add(`${path}.assets[${assetIndex}].path`, "wymagana bezpieczna ścieżka względna");
      if (!SHA256.test(asset?.sha256 ?? "")) add(`${path}.assets[${assetIndex}].sha256`, "wymagany SHA-256 pliku");
      if (!nonEmpty(asset?.alt)) add(`${path}.assets[${assetIndex}].alt`, "wymagany tekst alternatywny");
    });
    const blocks = question.content_blocks ?? [];
    if (!Array.isArray(blocks)) add(`${path}.content_blocks`, "wymagana tablica");
    else blocks.forEach((block, blockIndex) => {
      if (!BLOCK_TYPES.has(block?.type)) add(`${path}.content_blocks[${blockIndex}].type`, "nieobsługiwany typ bloku");
      if (block?.type === "image" && !assetIds.has(block.asset_id)) add(`${path}.content_blocks[${blockIndex}].asset_id`, "brak odpowiadającego zasobu");
      if (block?.type === "audio" && !assetIds.has(block.asset_id)) add(`${path}.content_blocks[${blockIndex}].asset_id`, "brak odpowiadającego nagrania");
      if (block?.type === "math" && !nonEmpty(block.latex)) add(`${path}.content_blocks[${blockIndex}].latex`, "wymagany zapis LaTeX");
      if (block?.type === "table" && !Array.isArray(block.rows)) add(`${path}.content_blocks[${blockIndex}].rows`, "wymagana tablica wierszy");
      if (block?.type === "passage" && !passageIds.has(block.passage_id)) add(`${path}.content_blocks[${blockIndex}].passage_id`, "brak odpowiadającego tekstu źródłowego");
    });
  });

  return { valid: errors.length === 0, errors };
}

async function callRpc(functionName, payload, env = process.env) {
  const baseUrl = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !serviceKey) throw new Error("Ustaw SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY. Klucza service role nie umieszczaj w przeglądarce ani repozytorium.");
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Supabase odrzucił operację ${functionName} (${response.status}): ${await response.text()}`);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export async function stageManifest(input, env = process.env) {
  const validation = validateManifest(input);
  if (!validation.valid) throw new Error(`Manifest zawiera błędy:\n- ${validation.errors.join("\n- ")}`);
  const { manifest, checksum } = prepareManifest(input);
  const result = await callRpc("stage_cke_import", { import_manifest: manifest, import_checksum: checksum }, env);
  return { checksum, result };
}

async function run() {
  const [command, ...args] = process.argv.slice(2);
  const fileCommands = new Set(["validate", "stage", "hash"]);
  const workflowCommands = new Set(["review-question", "review-batch", "promote", "publish", "withdraw"]);
  if (!command || (!fileCommands.has(command) && !workflowCommands.has(command))) {
    throw new Error("Użycie: node scripts/cke-import.mjs <validate|stage|hash|review-question|review-batch|promote|publish|withdraw> [...argumenty]");
  }
  const [file] = args;
  if (command === "hash") {
    if (!file) throw new Error("Podaj ścieżkę do pliku.");
    console.log(sha256(await readFile(file)));
    return;
  }
  if (command === "validate" || command === "stage") {
    if (!file) throw new Error("Podaj ścieżkę do manifestu JSON.");
    const input = JSON.parse(await readFile(file, "utf8"));
    const validation = validateManifest(input);
    if (!validation.valid) throw new Error(`Manifest zawiera błędy:\n- ${validation.errors.join("\n- ")}`);
    const prepared = prepareManifest(input);
    if (command === "validate") {
      console.log(JSON.stringify({ valid: true, manifest_id: input.manifest_id, version: input.manifest_version, questions: input.questions.length, checksum: prepared.checksum }, null, 2));
      return;
    }
    console.log(JSON.stringify(await stageManifest(input), null, 2));
    return;
  }

  const [batchId, value, statusOrNotes, ...remaining] = args;
  if (!batchId) throw new Error("Podaj identyfikator batcha zwrócony przez polecenie stage.");
  let result;
  if (command === "review-question") {
    if (!value || !statusOrNotes) throw new Error("Użycie review-question: <batch-id> <question-id> <approved|needs_changes|rejected> [notatka]");
    result = await callRpc("review_cke_import_question", { target_batch_id: batchId, target_stable_id: value, next_status: statusOrNotes, notes: remaining.join(" ") || null });
  } else if (command === "review-batch") {
    if (!value) throw new Error("Użycie review-batch: <batch-id> <approve|request_changes> [notatka]");
    result = await callRpc("review_cke_import_batch", { target_batch_id: batchId, decision: value, notes: [statusOrNotes, ...remaining].filter(Boolean).join(" ") || null });
  } else if (command === "promote") {
    result = await callRpc("promote_cke_import_batch", { target_batch_id: batchId });
  } else if (command === "publish") {
    result = await callRpc("publish_cke_exam_paper", { target_batch_id: batchId });
  } else {
    const reason = [value, statusOrNotes, ...remaining].filter(Boolean).join(" ");
    if (reason.length < 10) throw new Error("Podaj powód wycofania (minimum 10 znaków).");
    result = await callRpc("withdraw_cke_exam_paper", { target_batch_id: batchId, reason });
  }
  console.log(JSON.stringify({ ok: true, command, batch_id: batchId, result }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
