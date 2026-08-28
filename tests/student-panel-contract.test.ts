import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const panel = readFileSync(join(process.cwd(), "app/panel/page.tsx"), "utf8");
const practice = readFileSync(join(process.cwd(), "components/student-practice.tsx"), "utf8");
const styles = readFileSync(join(process.cwd(), "app/redesign.css"), "utf8");
const studentStyles = readFileSync(join(process.cwd(), "app/panel/student-dashboard.css"), "utf8");
const select = readFileSync(join(process.cwd(), "components/ui/select.tsx"), "utf8");

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
    expect(practice).toContain('activeView === "settings"');
    expect(panel).toContain('<StudentPractice activeView={studentView} onNavigate={setStudentView} hasPlusAccess={studentHasPlus} />');
  });

  it("loads questions and saves answers through authenticated database functions", () => {
    expect(practice).toContain('supabase.rpc("get_practice_questions")');
    expect(practice).toContain('supabase.rpc("get_student_paper_progress")');
    expect(practice).toContain('supabase.rpc("submit_practice_response"');
    expect(practice).toContain("answer_explanation");
  });

  it("keeps CKE years visible as filters and reports each paper separately", () => {
    expect(practice).toContain("defaultMaterialFilter");
    expect(practice).toContain("filterPracticeQuestions");
    expect(practice).toContain('aria-label="Wybierz rocznik"');
    expect(practice).toContain('id="paper-progress-title"');
    expect(practice).toContain("formatQuestionSource(currentQuestion)");
    expect(select).toContain('className={cn("z-[120]');
  });

  it("removes dashboard chrome while the student is solving a question", () => {
    expect(panel).toContain('const focusMode = profile.role === "student" && studentView === "exercises"');
    expect(panel).toContain('if (focusMode)');
    expect(panel).toContain('className="task-route-shell"');
    expect(panel).toContain('<StudentPractice activeView="exercises" onNavigate={setStudentView} hasPlusAccess={studentHasPlus} />');
    expect(styles).toContain(".task-route-shell { position: fixed;");
    expect(styles).toContain("width: 100vw; max-width: none; height: 100dvh;");
    expect(panel).toContain('!focusMode && profile.role !== "student" && <aside');
    expect(panel).toContain('!focusMode && profile.role === "student" && <aside className="dashboard-sidebar student-dashboard-sidebar"');
    expect(panel).toContain('!focusMode && profile.role === "student" && <header className="student-dashboard-topbar"');
    expect(practice).toContain('className="task-screen"');
    expect(practice).toContain("hasUnsavedPracticeAnswer");
    expect(practice).toContain('window.addEventListener("beforeunload"');
  });

  it("uses the parent-aligned student shell and redesigned content views", () => {
    expect(panel).toContain('<span className="dashboard-nav-label">Konto ucznia</span>');
    expect(panel).toContain('className="student-session-card"');
    expect(panel).toContain('className="dashboard-sidebar-legal"');
    expect(panel).toContain('triggerClassName="header-account-session"');
    expect(practice).toContain('className="student-content-view student-learning-view"');
    expect(practice).toContain('className="student-content-view student-progress-view"');
    expect(practice).toContain('className="student-content-view student-settings-view"');
    expect(practice).toContain("<ThemeSettings />");
    expect(studentStyles).toContain("grid-template-columns: 250px minmax(0, 1fr)");
    expect(studentStyles).toContain(".dashboard-student-page .student-resume-grid");
    expect(panel).toContain('className="student-session-card" onClick={() => setStudentView("exercises")}');
    expect(styles).toContain(".dark .task-answer.is-correct");
    expect(styles).toContain(".dark .task-answer.is-incorrect");
  });
});
