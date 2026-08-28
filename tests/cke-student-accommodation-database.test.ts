import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase", "migrations", "20260828210000_standard_cke_papers_only_mvp.sql"), "utf8");

describe("standard CKE papers database migration", () => {
  it("resets every previous student preference to the standard paper", () => {
    expect(migration).toContain("update public.student_cke_preferences");
    expect(migration).toContain("accommodation_code = '100'");
    expect(migration).toContain("special_category_acknowledged_at = null");
    expect(migration).toContain("selected_via = 'default'");
  });

  it("preserves the compatibility RPC but rejects non-standard codes", () => {
    expect(migration).toContain("create or replace function public.update_child_cke_accommodation");
    expect(migration).toContain("linked child required");
    expect(migration).toContain("only standard CKE papers are available in the MVP");
    expect(migration).toContain("coalesce(next_accommodation_code, '100') <> '100'");
  });

  it("never stores an acknowledgement or selecting account in the compatibility row", () => {
    expect(migration).toContain("target_student_id, '100', null, null, 'default', now()");
    expect(migration).not.toContain("then now()");
  });
});
