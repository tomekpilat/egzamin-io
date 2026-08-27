import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase", "migrations", "20260827140000_cke_student_accommodations.sql"), "utf8");

describe("CKE student accommodation database", () => {
  it("separates accommodation codes from X/Y paper versions", () => {
    expect(migration).toContain("create table if not exists public.cke_accommodation_profiles");
    expect(migration).toContain("accommodation_code text not null default '100'");
    expect(migration).toContain("paper_version text check");
    expect(migration).toContain("set_exam_paper_accommodation");
  });

  it("lets only a linked guardian set a non-standard preference with acknowledgement", () => {
    expect(migration).toContain("create or replace function public.update_child_cke_accommodation");
    expect(migration).toContain("linked child required");
    expect(migration).toContain("confirms_sensitive_preference");
    expect(migration).toContain("explicit acknowledgement required for a non-standard CKE preference");
    expect(migration).toContain("special_category_acknowledged_at");
    expect(migration).toContain("create or replace function public.update_child_learning_settings");
  });

  it("filters questions, progress, answers and AI access on the server", () => {
    expect(migration).toContain("paper.accommodation_code = selected_accommodation");
    expect(migration).toContain("q.source_type = 'demo' and selected_accommodation = '100'");
    expect(migration).toContain("student_can_access_question");
    expect(migration).toContain("validate_ai_tutor_question_access");
    expect(migration).toContain("question is not available for the selected CKE accommodation");
  });

  it("does not grant direct access to sensitive preference rows", () => {
    expect(migration).toContain("alter table public.student_cke_preferences enable row level security");
    expect(migration).toContain("revoke all on public.student_cke_preferences from anon, authenticated");
    expect(migration).not.toMatch(/grant select on public\.student_cke_preferences/);
  });
});
