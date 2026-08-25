import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const panel = readFileSync(join(process.cwd(), "app/panel/page.tsx"), "utf8");
const practice = readFileSync(join(process.cwd(), "components/student-practice.tsx"), "utf8");

describe("student panel navigation", () => {
  it("defines a separate view for every student menu item", () => {
    expect(practice).toContain('export type StudentView = "start" | "exercises" | "progress" | "settings"');
    expect(panel).toContain('onClick={() => setStudentView("start")}');
    expect(panel).toContain('onClick={() => setStudentView("exercises")}');
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
    expect(practice).toContain('supabase.rpc("submit_practice_answer"');
    expect(practice).toContain("answer_explanation");
  });
});
