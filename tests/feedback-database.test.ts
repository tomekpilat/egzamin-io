import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/20260825203000_user_feedback.sql"), "utf8");

describe("feedback database contract", () => {
  it("stores only scoped feedback context behind RPC access", () => {
    expect(migration).toContain("create table if not exists public.user_feedback");
    expect(migration).toContain("alter table public.user_feedback enable row level security");
    expect(migration).toContain("revoke all on public.user_feedback from anon, authenticated");
    expect(migration).not.toContain("selected_answer");
    expect(migration).not.toContain("chat_message");
  });

  it("validates submissions and limits each account to three per ten minutes", () => {
    expect(migration).toContain("create or replace function public.submit_user_feedback");
    expect(migration).toContain("feedback message must contain 20 to 2000 characters");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("now() - interval '10 minutes'");
    expect(migration).toContain(") >= 3 then");
    expect(migration).toContain("feedback rate limit exceeded");
  });

  it("stores contact details only with consent and derives published question context", () => {
    expect(migration).toContain("check (contact_consent or contact_email is null)");
    expect(migration).toContain("if not feedback_contact_consent then normalized_email := null");
    expect(migration).toContain("where q.id = target_question_id and q.is_published");
    expect(migration).toContain("select q.exam_paper_id into linked_paper_id");
  });

  it("allows only admins to inspect and update the queue", () => {
    expect(migration.match(/is_egzaminio_admin\(\)/g)).toHaveLength(2);
    expect(migration).toContain("create or replace function public.get_admin_feedback");
    expect(migration).toContain("create or replace function public.update_feedback_status");
    expect(migration).toContain("grant execute on function public.get_admin_feedback(integer) to authenticated");
  });
});
