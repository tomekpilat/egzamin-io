import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/20260824210000_parent_preferences_and_manual_teachers.sql"), "utf8");

describe("database authorization contract", () => {
  it("limits onboarding and auth metadata to self-service roles", () => {
    expect(migration).toContain("if selected_role not in ('student', 'parent')");
    expect(migration).toContain("if selected_role not in ('student', 'parent') then selected_role := 'student'; end if;");
  });

  it("requires an admin to grant the teacher role", () => {
    expect(migration).toContain("create or replace function public.grant_teacher_role");
    expect(migration).toContain("if not (select public.is_egzaminio_admin()) then raise exception 'admin required'; end if;");
    expect(migration).toContain("where student_id = target_id or guardian_id = target_id");
    expect(migration).toContain("set role = 'teacher'");
  });

  it("requires a linked parent before preference updates", () => {
    expect(migration).toContain("select 1 from public.student_guardians");
    expect(migration).toContain("where guardian_id = parent_id and student_id = target_student_id");
    expect(migration).toContain("raise exception 'linked child required'");
  });
});
