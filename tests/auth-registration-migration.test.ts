import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260901160000_repair_auth_registration.sql"),
  "utf8",
);

describe("auth registration repair migration", () => {
  it("keeps one-character metadata from violating the profile display-name constraint", () => {
    expect(migration).toContain("if char_length(selected_name) < 2 then");
    expect(migration).toContain("selected_name := null;");
  });

  it("normalizes account emails and recreates the Auth trigger", () => {
    expect(migration).toContain("normalized_user_email text := lower(trim");
    expect(migration).toContain("drop trigger if exists on_egzaminio_user_created on auth.users");
    expect(migration).toContain("after insert on auth.users");
  });

  it("does not create a guardian request addressed to the student", () => {
    expect(migration).toContain("requested_guardian_email = normalized_user_email");
  });
});
