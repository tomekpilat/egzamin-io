import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const migration = read("supabase/migrations/20260829090000_fix_practice_response_submission.sql");
const component = read("components/cke-question-content.tsx");
const dialog = read("components/ui/dialog.tsx");
const css = read("app/redesign.css");

describe("practice response and image enlargement regression", () => {
  it("uses one final atomic response function independent of retired CKE preferences", () => {
    expect(migration).toContain("create or replace function public.submit_practice_response");
    expect(migration).not.toContain("student_can_access_question");
    expect(migration).not.toContain("student_cke_preferences");
    expect(migration).not.toContain("submit_practice_response_unlimited");
    expect(migration).toContain("coalesce(paper.accommodation_code, '100') = '100'");
    expect(migration).toContain("for update");
  });

  it("supports every interactive question type and persists response plus event", () => {
    expect(migration).toContain("question_record.question_type = 'single_choice'");
    expect(migration).toContain("question_record.question_type = 'multiple_choice'");
    expect(migration).toContain("question_record.question_type in ('numeric', 'short_text', 'long_text')");
    expect(migration).toContain("insert into public.student_question_attempts");
    expect(migration).toContain("insert into public.student_response_events");
    expect(migration).toContain("awaiting_self_assessment");
    expect(migration).toContain("self_assessed");
  });

  it("retains the Free daily quota without blocking a self-assessment follow-up", () => {
    expect(migration).toContain("count(distinct event.question_id)");
    expect(migration).toContain("practice_daily_limit_reached");
    expect(migration).toContain("event.question_id = target_question_id");
    expect(migration).toContain("Europe/Warsaw");
  });

  it("expands the dialog image to the available viewport instead of intrinsic pixels", () => {
    expect(component).toContain('className="cke-image-dialog-media"');
    expect(css).toContain(".cke-image-dialog > figure > .cke-image-dialog-media");
    expect(css).toContain("width: 100%; height: 100%");
    expect(css).toContain("width: calc(100vw - 16px)");
    expect(css).toContain("height: calc(100dvh - 16px)");
    expect(dialog.match(/z-\[100\]/g)).toHaveLength(2);
    expect(css).toContain(".task-route-shell { position: fixed; z-index: 60;");
  });
});
