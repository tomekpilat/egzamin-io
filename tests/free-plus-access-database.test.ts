import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/20260828230000_free_papers_plus_interactivity.sql"), "utf8");
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

  it("gates progress and Tutor AI on the server", () => {
    expect(migration).toContain("plus plan required for progress");
    expect(migration).toContain("plus plan required for AI usage");
    expect(migration).toContain("plus plan required for AI");
    expect(migration).toContain("grant execute on function public.reserve_ai_tutor_request(uuid, text, text) to service_role");
    expect(route).toContain("requireActivePlusStudent");
    expect(route).toContain("PlusRequiredError");
    expect(route).toContain('code: "plus_required"');
  });
});
