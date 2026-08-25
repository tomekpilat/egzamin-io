import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/20260825233000_ai_scope_guard.sql"), "utf8");

describe("AI scope abuse guard", () => {
  it("counts rejected requests without consuming the paid-model quota", () => {
    expect(migration).toContain("scope_rejection_count integer not null default 0");
    expect(migration).toContain("create or replace function public.record_ai_scope_rejection");
    expect(migration).not.toContain("reserved_count = reserved_count + 1");
  });

  it("rate-limits repeated abuse and exposes only an admin aggregate", () => {
    expect(migration).toContain("case when plan_name = 'plus' then 30 else 10 end");
    expect(migration).toContain("return query select current_count, limit_value, true");
    expect(migration).toContain("grant execute on function public.record_ai_scope_rejection(uuid) to service_role");
    expect(migration).toContain("get_ai_scope_rejection_metrics");
  });
});
