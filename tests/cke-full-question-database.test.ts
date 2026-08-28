import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/20260828120000_full_cke_question_types.sql"), "utf8");

describe("full CKE question database support", () => {
  it("publishes all supported question types and audited content", () => {
    expect(migration).toContain("'single_choice', 'multiple_choice', 'numeric', 'short_text', 'long_text'");
    expect(migration).toContain("question_type, content_blocks, assets");
    expect(migration).toContain("answer_key, scoring");
    expect(migration).toContain("cke-editorial-import-v1");
  });

  it("redefines staging so multiple choice and open tasks are accepted", () => {
    expect(migration).toContain("create or replace function public.stage_cke_import");
    expect(migration).toContain("multiple_choice question % requires options and correct_indices");
    expect(migration).toContain("positive max_points required for question %");
  });

  it("stores response history without exposing it directly to clients", () => {
    expect(migration).toContain("create table if not exists public.student_response_events");
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("revoke all on public.student_response_events from anon, authenticated");
  });

  it("supports automatic grading and rubric-based self-assessment", () => {
    expect(migration).toContain("create or replace function public.submit_practice_response");
    expect(migration).toContain("status_value := 'auto'");
    expect(migration).toContain("status_value := 'awaiting_self_assessment'");
    expect(migration).toContain("status_value := 'self_assessed'");
    expect(migration).toContain("invalid self-assessed points");
  });
});
