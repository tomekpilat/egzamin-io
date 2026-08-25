import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/20260825193000_cke_exam_years.sql"), "utf8");

describe("CKE paper years database contract", () => {
  it("stores structured and unique paper metadata", () => {
    expect(migration).toContain("create table if not exists public.exam_papers");
    expect(migration).toContain("exam_year integer not null check (exam_year between 2019 and 2100)");
    expect(migration).toContain("exam_session in ('main', 'additional')");
    expect(migration).toContain("source_document_id text not null unique");
    expect(migration).toContain("unique (exam_year, exam_session, subject, variant_code)");
  });

  it("links numbered questions to a paper and prevents duplicates", () => {
    expect(migration).toContain("exam_paper_id text references public.exam_papers(id) on delete restrict");
    expect(migration).toContain("practice_questions_paper_number_idx");
    expect(migration).toContain("on public.practice_questions (exam_paper_id, paper_question_number)");
    expect(migration).toContain("CKE questions require an exam paper and question number");
    expect(migration).toContain("question subject must match exam paper subject");
  });

  it("keeps demo content outside official CKE years", () => {
    expect(migration).toContain("demo questions cannot be assigned to a CKE paper or exam year");
    expect(migration).toContain("new.exam_year := paper_year");
  });

  it("returns only published metadata and separate per-paper progress", () => {
    expect(migration).toContain("create function public.get_practice_questions()");
    expect(migration).toContain("create or replace function public.get_student_paper_progress()");
    expect(migration).toContain("and (q.source_type = 'demo' or p.id is not null)");
    expect(migration).toContain("when count(a.question_id) = count(q.id) then 'completed'");
    expect(migration).toContain("revoke all on public.exam_papers from anon, authenticated");
    expect(migration).toContain("grant execute on function public.get_student_paper_progress() to authenticated");
  });
});
