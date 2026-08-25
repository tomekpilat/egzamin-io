import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const panel = readFileSync(join(process.cwd(), "app/panel/page.tsx"), "utf8");

describe("student panel navigation", () => {
  it("defines a separate view for every student menu item", () => {
    expect(panel).toContain('type StudentView = "start" | "exercises" | "progress" | "settings"');
    expect(panel).toContain('onClick={() => setStudentView("start")}');
    expect(panel).toContain('onClick={() => setStudentView("exercises")}');
    expect(panel).toContain('onClick={() => setStudentView("progress")}');
    expect(panel).toContain('onClick={() => setStudentView("settings")}');
  });

  it("renders exercises, progress and settings only in their selected views", () => {
    expect(panel).toContain('activeView === "exercises"');
    expect(panel).toContain('activeView === "progress"');
    expect(panel).toContain('profile.role === "student" && studentView === "settings"');
    expect(panel).toContain("<StudentPanel activeView={studentView} onNavigate={setStudentView} />");
  });
});
