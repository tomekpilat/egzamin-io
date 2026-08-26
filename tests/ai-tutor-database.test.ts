import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/20260825230000_ai_tutor.sql"), "utf8");
const chatStatusFix = readFileSync(join(process.cwd(), "supabase/migrations/20260826130000_fix_ai_chat_status.sql"), "utf8");

describe("AI tutor database security and accounting", () => {
  it("requires reviewed, versioned explanations tied to the answer key", () => {
    expect(migration).toContain("create table if not exists public.ai_question_explanations");
    expect(migration).toContain("answer_key_snapshot jsonb not null");
    expect(migration).toContain("status in ('generated', 'in_review', 'approved', 'rejected', 'withdrawn')");
    expect(migration).toContain("answer key changed; regenerate explanation");
    expect(migration).toContain("where e.question_id = target_question_id and e.status = 'approved'");
  });

  it("enforces Free and Plus limits inside a locked server-only reservation", () => {
    expect(migration).toContain("limit_value := case when plan_name = 'plus' then 50 else 3 end");
    expect(migration).toContain("for update;");
    expect(migration).toContain("ai_daily_limit_reached");
    expect(migration).toContain("grant execute on function public.reserve_ai_tutor_request(uuid, text, text) to service_role");
    expect(migration).not.toContain("grant execute on function public.reserve_ai_tutor_request(uuid, text, text) to authenticated");
  });

  it("keeps private messages out of direct authenticated access and stores operational metrics", () => {
    expect(migration).toContain("revoke all on public.ai_tutor_messages from anon, authenticated");
    expect(migration).toContain("cost_microusd bigint not null default 0");
    expect(migration).toContain("latency_ms_total bigint not null default 0");
    expect(migration).toContain("purge_expired_ai_chat_history");
  });

  it("repairs the chat status return shape without widening database access", () => {
    expect(chatStatusFix).toContain("returns table (chat_messages jsonb, used_count integer, daily_limit integer, active_plan text)");
    expect(chatStatusFix).toContain("limit_value,\n    plan_name;");
    expect(chatStatusFix).not.toContain("limit_value,\n    limit_value,");
    expect(chatStatusFix).toContain("grant execute on function public.get_ai_chat_for_student(uuid, text) to service_role");
  });
});
