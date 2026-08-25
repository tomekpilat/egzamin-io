export const MIN_WEEKLY_GOAL = 1;
export const MAX_WEEKLY_GOAL = 30;

export function normalizeWeeklyGoal(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return MIN_WEEKLY_GOAL;
  return Math.min(MAX_WEEKLY_GOAL, Math.max(MIN_WEEKLY_GOAL, Math.round(parsed)));
}

export function summarizeParentPreferences(
  children: Array<{ weekly_goal: number; summary_email_enabled: boolean }>,
) {
  return children.reduce(
    (summary, child) => ({
      totalWeeklyGoal: summary.totalWeeklyGoal + normalizeWeeklyGoal(child.weekly_goal),
      enabledReports: summary.enabledReports + (child.summary_email_enabled ? 1 : 0),
    }),
    { totalWeeklyGoal: 0, enabledReports: 0 },
  );
}
