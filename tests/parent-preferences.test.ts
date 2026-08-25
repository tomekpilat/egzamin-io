import { describe, expect, it } from "vitest";
import { MAX_WEEKLY_GOAL, MIN_WEEKLY_GOAL, normalizeWeeklyGoal, summarizeParentPreferences } from "@/lib/parent-preferences";

describe("parent preferences", () => {
  it("normalizes the weekly goal to an integer between 1 and 30", () => {
    expect(normalizeWeeklyGoal("7")).toBe(7);
    expect(normalizeWeeklyGoal(4.6)).toBe(5);
    expect(normalizeWeeklyGoal(-10)).toBe(MIN_WEEKLY_GOAL);
    expect(normalizeWeeklyGoal(99)).toBe(MAX_WEEKLY_GOAL);
    expect(normalizeWeeklyGoal("not-a-number")).toBe(MIN_WEEKLY_GOAL);
  });

  it("summarizes all linked children without exposing conversation data", () => {
    expect(summarizeParentPreferences([
      { weekly_goal: 5, summary_email_enabled: true },
      { weekly_goal: 8, summary_email_enabled: false },
      { weekly_goal: 100, summary_email_enabled: true },
    ])).toEqual({ totalWeeklyGoal: 43, enabledReports: 2 });
    expect(summarizeParentPreferences([])).toEqual({ totalWeeklyGoal: 0, enabledReports: 0 });
  });
});
