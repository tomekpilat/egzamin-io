import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/20260825213000_cke_import_pipeline.sql"), "utf8");

describe("CKE import database workflow", () => {
  it("keeps imports and every question in a private staging area", () => {
    expect(migration).toContain("create table if not exists public.cke_import_batches");
    expect(migration).toContain("create table if not exists public.cke_import_questions");
    expect(migration).toContain("alter table public.cke_import_batches enable row level security");
    expect(migration).toContain("revoke all on public.cke_import_questions from anon, authenticated");
    expect(migration).toContain("permission_reference text not null");
    expect(migration).toContain("source_page_from integer not null");
  });

  it("implements idempotency, version conflicts and duplicate PDF detection", () => {
    expect(migration).toContain("unique (manifest_id, manifest_version)");
    expect(migration).toContain("return query select existing_batch.id, 'unchanged'::text");
    expect(migration).toContain("manifest version conflict: increment manifest_version");
    expect(migration).toContain("source PDF already belongs to another manifest");
  });

  it("requires question-by-question review and a separate publication decision", () => {
    expect(migration).toContain("create or replace function public.review_cke_import_question");
    expect(migration).toContain("every question must be approved first");
    expect(migration).toContain("create or replace function public.promote_cke_import_batch");
    expect(migration).toContain("update public.cke_import_batches set status = 'imported'");
    expect(migration).toContain("create or replace function public.publish_cke_exam_paper");
    expect(migration).toContain("batch.source_document_id, batch.source_label, batch.source_url, true");
    expect(migration).toContain("status = 'superseded'");
  });

  it("preserves unsupported open tasks in staging and supports withdrawal", () => {
    expect(migration).toContain("current student UI can publish only single_choice questions; other types remain safely staged");
    expect(migration).toContain("create or replace function public.withdraw_cke_exam_paper");
    expect(migration).toContain("set is_published = false where exam_paper_id = batch.paper_id");
    expect(migration).toContain("status = 'withdrawn'");
  });
});
