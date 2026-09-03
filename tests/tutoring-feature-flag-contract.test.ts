import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20260903150000_tutoring_pilot_feature.sql", "utf8");
const panel = readFileSync("app/panel/page.tsx", "utf8");
const route = readFileSync("app/korepetycje/page.tsx", "utf8");

describe("tutoring marketplace feature flag", () => {
  it("stores access per user and prevents direct table access", () => {
    expect(migration).toContain("create table if not exists public.user_feature_flags");
    expect(migration).toContain("primary key (user_id, feature_key)");
    expect(migration).toContain("alter table public.user_feature_flags enable row level security");
    expect(migration).toContain("revoke all on public.user_feature_flags from anon, authenticated");
  });

  it("requires an administrator to change access", () => {
    expect(migration).toContain("create or replace function public.set_user_feature_access");
    expect(migration).toContain("is_egzaminio_admin()");
    expect(migration).toContain("raise exception 'admin required'");
  });

  it("offers an admin-only queue for pilot applications", () => {
    expect(migration).toContain("create or replace function public.get_admin_tutoring_pilot_applications");
    expect(migration).toContain("join public.profiles p on p.id = a.user_id");
    expect(panel).toContain('id="tutoring-applications"');
  });

  it("checks access inside every application RPC", () => {
    expect(migration.match(/has_feature_access\('tutoring_marketplace'\)/g)).toHaveLength(2);
    expect(migration).toContain("revoke all on public.tutoring_pilot_applications from anon, authenticated");
    expect(migration).toContain("where a.user_id = (select auth.uid())");
  });

  it("only shows navigation after the access RPC succeeds", () => {
    expect(panel).toContain('supabase.rpc("has_feature_access"');
    expect(panel).toContain("{tutoringAccess &&");
    expect(panel).toContain('href="/korepetycje"');
  });

  it("requires a session and the server-side flag before rendering the pilot", () => {
    expect(route).toContain("supabase.auth.getSession()");
    expect(route).toContain('supabase.rpc("has_feature_access"');
    expect(route).toContain('gate === "allowed"');
    expect(route).toContain('gate === "denied"');
  });
});
