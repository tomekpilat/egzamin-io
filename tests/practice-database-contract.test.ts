import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/20260825153000_demo_practice_questions.sql"), "utf8");

describe("practice database contract", () => {
  it("ships exactly 50 clearly labelled demo questions", () => {
    expect(migration.match(/\('demo-(?:mat|pol|eng)-\d{2}'/g)).toHaveLength(50);
    expect(migration).toContain("Zestaw demonstracyjny egzaminio");
    expect(migration).toContain("source_type in ('demo', 'cke')");
  });

  it("keeps answer keys behind authenticated functions", () => {
    expect(migration).toContain("revoke all on public.practice_questions from anon, authenticated");
    expect(migration).toContain("create or replace function public.get_practice_questions()");
    expect(migration).toContain("create or replace function public.submit_practice_answer");
    expect(migration).toContain("role = 'student' and onboarding_completed");
  });

  it("stores progress per student and question", () => {
    expect(migration).toContain("primary key (student_id, question_id)");
    expect(migration).toContain("attempt_count = public.student_question_attempts.attempt_count + 1");
  });
});
