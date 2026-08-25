import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/20260825180000_parent_progress.sql"), "utf8");
const parentFunction = migration.slice(
  migration.indexOf("create or replace function public.get_parent_child_progress"),
  migration.indexOf("revoke all on function public.submit_practice_answer"),
);

describe("parent progress database contract", () => {
  it("stores every answer as a durable event", () => {
    expect(migration).toContain("create table if not exists public.student_answer_events");
    expect(migration).toContain("insert into public.student_answer_events");
    expect(migration).toContain("answered_at timestamptz not null default now()");
  });

  it("keeps raw attempts private and exposes an aggregate RPC", () => {
    expect(migration).toContain("alter table public.student_answer_events enable row level security");
    expect(migration).toContain("revoke all on public.student_answer_events from anon, authenticated");
    expect(parentFunction).toContain("returns table (");
    expect(parentFunction).not.toContain("selected_answer");
    expect(parentFunction).not.toContain("answer_explanation");
  });

  it("authorizes the exact parent-child relationship before reading progress", () => {
    expect(parentFunction).toContain("where guardian_id = parent_id and student_id = target_student_id");
    expect(parentFunction).toContain("raise exception 'linked child required'");
    expect(parentFunction.indexOf("raise exception 'linked child required'")).toBeLessThan(parentFunction.indexOf("return query"));
  });

  it("supports 7 days, 30 days and the entire history", () => {
    expect(parentFunction).toContain("requested_range_days not in (0, 7, 30)");
    expect(parentFunction).toContain("weekly_sessions integer");
    expect(parentFunction).toContain("trend_percentage_points integer");
    expect(parentFunction).toContain("subject_stats jsonb");
    expect(parentFunction).toContain("focus_topics jsonb");
  });
});
