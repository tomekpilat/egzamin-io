import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/20260826090000_public_cke_seo_pages.sql"), "utf8");

describe("CKE programmatic SEO publication gate", () => {
  it("keeps publication state private and requires an explicit reviewed release", () => {
    expect(migration).toContain("create table if not exists public.cke_seo_publications");
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("revoke all on public.cke_seo_publications from anon, authenticated");
    expect(migration).toContain("create or replace function public.publish_cke_seo_page");
    expect(migration).toContain("published CKE batch required");
    expect(migration).toContain("approved CKE question required");
  });

  it("blocks thin pages and generates a stable canonical", () => {
    expect(migration).toContain("at least one reviewed common mistake is required");
    expect(migration).toContain("at least 80 characters");
    expect(migration).toContain("official scoring criteria are required");
    expect(migration).toContain("/arkusze/%s/%s/%s/%s/zadanie/%s");
    expect(migration).toContain("canonical_path text not null unique");
  });

  it("returns only still-published CKE content to anonymous readers", () => {
    expect(migration).toContain("create or replace function public.list_public_cke_seo_pages");
    expect(migration).toContain("create or replace function public.get_public_cke_seo_page");
    expect(migration).toContain("batch.status = 'published'");
    expect(migration).toContain("paper.is_published");
    expect(migration).toContain("question.is_published and question.source_type = 'cke'");
    expect(migration).toContain("grant execute on function public.get_public_cke_seo_page(text) to anon, authenticated");
  });
});
