import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/20260827210000_parent_ai_usage_and_report_backlog.sql"), "utf8");
const usageFunction = migration.slice(
  migration.indexOf("create or replace function public.get_parent_child_ai_usage"),
  migration.indexOf("revoke all on function public.get_parent_child_ai_usage"),
);

describe("parent AI usage database contract", () => {
  it("keeps weekly report delivery disabled while it is in backlog", () => {
    expect(migration).toContain("alter column summary_email_enabled set default false");
    expect(migration).toContain("set summary_email_enabled = false");
    expect(migration).toContain("coalesce(preferences.weekly_goal, 5), false");
  });

  it("checks the exact parent-child link before returning usage", () => {
    expect(usageFunction).toContain("where guardian_id = parent_id and student_id = target_student_id");
    expect(usageFunction.indexOf("raise exception 'linked child required'")).toBeLessThan(usageFunction.indexOf("return query"));
  });

  it("returns only completed-question counts and never conversation content", () => {
    expect(usageFunction).toContain("requests.status = 'completed'");
    expect(usageFunction).toContain("count(*)::integer");
    expect(usageFunction).not.toContain("user_message");
    expect(usageFunction).not.toContain("ai_tutor_messages");
    expect(migration).toContain("grant execute on function public.get_parent_child_ai_usage(uuid, integer) to authenticated");
  });
});
