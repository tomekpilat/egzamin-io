import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/20260828230000_free_papers_plus_interactivity.sql"), "utf8");
const freeValueMigration = readFileSync(join(process.cwd(), "supabase/migrations/20260831120000_free_ai_and_basic_progress.sql"), "utf8");
const route = readFileSync(join(process.cwd(), "app/api/ai/tutor/route.ts"), "utf8");

describe("Free papers and Plus interactivity access", () => {
  it("keeps all published questions visible while hiding Free history", () => {
    expect(migration).toContain("create function public.get_practice_questions()");
    expect(migration).toContain("from public.get_practice_questions_with_progress() source");
    expect(migration).toContain("null::smallint, null::jsonb, null::boolean, 0");
    expect(migration).toContain("grant execute on function public.get_practice_questions() to authenticated");
  });

  it("enforces 15 distinct daily checks atomically in Polish time", () => {
    expect(migration).toContain("count(distinct event.question_id)");
    expect(migration).toContain("at time zone 'Europe/Warsaw'");
    expect(migration).toContain("for update;");
    expect(migration).toContain(">= 15");
    expect(migration).toContain("practice_daily_limit_reached");
  });

  it("keeps detailed and parent progress in Plus", () => {
    expect(migration).toContain("plus plan required for progress");
    expect(migration).toContain("plus plan required for AI usage");
  });

  it("restores three Free AI questions and aggregate student progress on the server", () => {
    expect(freeValueMigration).toContain("create or replace function public.get_student_basic_progress()");
    expect(freeValueMigration).toContain("count(*) filter (where attempt.is_correct)");
    expect(freeValueMigration).toContain("grant execute on function public.get_student_basic_progress() to authenticated");
    expect(freeValueMigration).toContain("return query select * from public.reserve_ai_tutor_request_plus_unchecked");
    expect(freeValueMigration).not.toContain("plus plan required for AI");
    expect(migration).toContain("grant execute on function public.reserve_ai_tutor_request(uuid, text, text) to service_role");
    expect(route).toContain("requireActiveStudent");
    expect(route).toContain("FREE_AI_QUESTIONS_PER_DAY");
    expect(route).not.toContain("PlusRequiredError");
  });
});
