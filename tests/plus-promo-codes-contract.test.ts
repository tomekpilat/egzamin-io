import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const migration = read("supabase/migrations/20260828235900_plus_promo_codes.sql");
const redemption = read("components/promo-code-redemption.tsx");
const admin = read("components/admin-promo-codes.tsx");
const parent = read("components/parent-payments.tsx");
const student = read("components/student-practice.tsx");
const legal = `${read("app/regulamin/page.tsx")}\n${read("app/polityka-prywatnosci/page.tsx")}`;
const promoCodeTable = migration.split("create table if not exists public.plus_promo_codes (")[1]?.split(");")[0] ?? "";

describe("complimentary Plus promo-code contract", () => {
  it("stores only a normalized SHA-256 digest and keeps the underlying tables private", () => {
    expect(migration).toContain("extensions.digest");
    expect(migration).toContain("'sha256'");
    expect(migration).toContain("code_hash text not null unique");
    expect(promoCodeTable).not.toContain("raw_code");
    expect(migration).toContain("revoke all on public.plus_promo_codes from anon, authenticated");
    expect(migration).toContain("revoke all on public.plus_promo_redemptions from anon, authenticated");
  });

  it("lets only a student or their linked parent redeem and rate-limits guessing", () => {
    expect(migration).toContain("effective_student_id := actor_id");
    expect(migration).toContain("from public.student_guardians");
    expect(migration).toContain("guardian_id = actor_id and student_id = effective_student_id");
    expect(migration).toContain("interval '15 minutes'");
    expect(migration).toContain(">= 10");
    expect(migration).toContain("insert into public.plus_promo_attempts (user_id, student_id)");
    expect(migration).toContain("attempted_at < now() - interval '30 days'");
  });

  it("locks code usage, enforces limits and grants the plan through one entitlement calculator", () => {
    expect(migration).toContain("for update");
    expect(migration).toContain("target_code.redemption_count >= target_code.max_redemptions");
    expect(migration).toContain("unique (promo_code_id, student_id)");
    expect(migration).toContain("perform public.recompute_student_plan(effective_student_id)");
    expect(migration).toContain("plan_source = 'promo'");
    expect(migration).toContain("perform public.recompute_student_plan(target_student_id)");
  });

  it("provides self-service redemption and a private admin management surface", () => {
    expect(redemption).toContain('supabase.rpc("redeem_plus_promo_code"');
    expect(redemption).toContain("Nie pobraliśmy żadnej płatności");
    expect(parent).toContain("<PromoCodeRedemption studentId={effectiveStudentId}");
    expect(student).toContain("<PromoCodeRedemption disabled={hasPlusAccess}");
    expect(admin).toContain('supabase.rpc("create_plus_promo_code"');
    expect(admin).toContain('supabase.rpc("set_plus_promo_code_active"');
    expect(admin).toContain("pełnego kodu nie można później odzyskać");
  });

  it("clearly separates complimentary access from Stripe payments", () => {
    expect(legal).toContain("nie tworzy zamówienia Stripe, faktury ani prawa do zwrotu ceny");
    expect(legal).toContain("Nie przechowujemy pełnej treści kodu");
    expect(legal).toContain("nie przekazuje danych do Stripe");
  });
});
