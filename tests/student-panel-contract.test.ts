import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const panel = readFileSync(join(process.cwd(), "app/panel/page.tsx"), "utf8");
const practice = readFileSync(join(process.cwd(), "components/student-practice.tsx"), "utf8");

describe("student panel navigation", () => {
  it("defines a separate view for every student menu item", () => {
    expect(practice).toContain('export type StudentView = "start" | "exercises" | "progress" | "settings"');
    expect(panel).toContain('onClick={() => setStudentView("start")}');
    expect(practice).toContain('onNavigate("exercises")');
    expect(panel).toContain('onClick={() => setStudentView("progress")}');
    expect(panel).toContain('onClick={() => setStudentView("settings")}');
  });

  it("renders exercises, progress and settings only in their selected views", () => {
    expect(practice).toContain('activeView === "exercises"');
    expect(practice).toContain('activeView === "progress"');
    expect(panel).toContain('profile.role === "student" && studentView === "settings"');
    expect(panel).toContain("<StudentPractice activeView={studentView} onNavigate={setStudentView} />");
  });

  it("loads questions and saves answers through authenticated database functions", () => {
    expect(practice).toContain('supabase.rpc("get_practice_questions")');
    expect(practice).toContain('supabase.rpc("get_student_paper_progress")');
    expect(practice).toContain('supabase.rpc("submit_practice_answer"');
    expect(practice).toContain("answer_explanation");
  });

  it("keeps CKE years visible as filters and reports each paper separately", () => {
    expect(practice).toContain("defaultMaterialFilter");
    expect(practice).toContain("filterPracticeQuestions");
    expect(practice).toContain('aria-label="Wybierz rocznik"');
    expect(practice).toContain('id="paper-progress-title"');
    expect(practice).toContain("formatQuestionSource(currentQuestion)");
  });

  it("removes dashboard chrome while the student is solving a question", () => {
    expect(panel).toContain('const focusMode = profile.role === "student" && studentView === "exercises"');
    expect(panel).toContain('!focusMode && profile.role !== "student" && <aside');
    expect(panel).toContain('!focusMode && profile.role === "student" && <header className="student-app-header"');
    expect(practice).toContain('className="task-screen"');
    expect(practice).toContain("hasUnsavedPracticeAnswer");
    expect(practice).toContain('window.addEventListener("beforeunload"');
  });
});
