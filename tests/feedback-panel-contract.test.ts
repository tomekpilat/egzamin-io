import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const panel = readFileSync(join(process.cwd(), "app/panel/page.tsx"), "utf8");
const form = readFileSync(join(process.cwd(), "components/feedback-dialog.tsx"), "utf8");
const privacy = readFileSync(join(process.cwd(), "app/polityka-prywatnosci/page.tsx"), "utf8");

describe("feedback product flow", () => {
  it("shows one unobtrusive entry point outside student focus mode", () => {
    expect(panel).toContain("<FeedbackDialog userEmail={profile.email}");
    expect(panel.indexOf("<FeedbackDialog")).toBeGreaterThan(panel.indexOf("{!focusMode && <header"));
    expect(panel).toContain('const focusMode = profile.role === "student" && studentView === "exercises"');
  });

  it("submits the required context without learning answers or chat content", () => {
    expect(form).toContain('supabase.rpc("submit_user_feedback"');
    expect(form).toContain("feedback_screen_context: screenContext");
    expect(form).toContain("feedback_page_path: window.location.pathname");
    expect(form).not.toContain("selected_answer");
    expect(form).not.toContain("chat_message");
  });

  it("provides an admin status workflow and an explicit privacy notice", () => {
    expect(panel).toContain('supabase.rpc("get_admin_feedback"');
    expect(panel).toContain('supabase.rpc("update_feedback_status"');
    expect(panel).toContain("Feedback użytkowników");
    expect(privacy).toContain('id="feedback"');
    expect(privacy).toContain("3 zgłoszeń w ciągu 10 minut");
  });
});
