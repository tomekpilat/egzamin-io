import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(join(process.cwd(), "supabase/migrations/20260826120000_marketing_and_recruitment_thresholds.sql"), "utf8");

describe("marketing and threshold database contract", () => {
  it("stores auditable consent privately and limits subscription writes to the service role", () => {
    expect(sql).toContain("consent_version text not null");
    expect(sql).toContain("consent_text text not null");
    expect(sql).toContain("consented_at timestamptz not null");
    expect(sql).toContain("revoke all on public.marketing_contacts from anon, authenticated");
    expect(sql).toContain("service role required");
  });

  it("supports idempotent signups, throttling and token-based withdrawal", () => {
    expect(sql).toContain("on conflict (email, subscription_type, recruitment_year, school_name) do update");
    expect(sql).toContain("too many signup attempts");
    expect(sql).toContain("unsubscribe_token uuid");
    expect(sql).toContain("unsubscribe_marketing_contact");
  });

  it("publishes only verified source-backed thresholds", () => {
    expect(sql).toContain("source_url text not null");
    expect(sql).toContain("verified_at timestamptz not null");
    expect(sql).toContain("where threshold.is_published and dataset.is_published");
    expect(sql).not.toMatch(/insert into public\.recruitment_thresholds[\s\S]*values/i);
  });
});
