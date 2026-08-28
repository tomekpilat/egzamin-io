import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeParentProgress, ParentProgress } from "@/components/parent-progress";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("@/lib/supabase-browser", () => ({
  getSupabaseClient: async () => ({ rpc }),
}));

afterEach(() => {
  cleanup();
  rpc.mockReset();
});

function progressRow(studentId: string, range = 7) {
  return {
    progress_student_id: studentId,
    progress_range_days: range,
    solved_count: studentId === "student-b" ? 9 : 6,
    correct_count: 4,
    total_attempts: 8,
    accuracy_percent: 67,
    active_days: 3,
    ai_questions_used: 5,
    weekly_goal: 5,
    weekly_sessions: 3,
    trend_percentage_points: 7,
    subject_stats: [{ subject: "mathematics", solved: 6, correct: 4, accuracy: 67 }],
    strong_topics: [{ subject: "mathematics", topic: "Procenty", solved: 2, accuracy: 100 }],
    focus_topics: [{ subject: "mathematics", topic: "Równania", solved: 2, accuracy: 50 }],
    recommendation: "Najbliższy krok: krótka powtórka z tematu „Równania”.",
    latest_activity_at: "2026-08-25T12:00:00.000Z",
  };
}

const children = [
  { student_id: "student-a", student_display_name: "Ala", student_email: "ala@example.com", weekly_goal: 5 },
  { student_id: "student-b", student_display_name: "Bartek", student_email: "bartek@example.com", weekly_goal: 4 },
];

describe("ParentProgress", () => {
  it("normalizes safe aggregate values", () => {
    const result = normalizeParentProgress(progressRow("student-a"));
    expect(result.solved_count).toBe(6);
    expect(result.ai_questions_used).toBe(5);
    expect(result.subject_stats[0]).toEqual({ subject: "mathematics", solved: 6, correct: 4, accuracy: 67 });
    expect(result.focus_topics[0]?.topic).toBe("Równania");
  });

  it("loads the first child and switches children without mixing requests", async () => {
    rpc.mockImplementation(async (name: string, args: { target_student_id: string; requested_range_days: number }) => name === "get_parent_child_ai_usage"
      ? { data: [{ ai_questions_used: args.target_student_id === "student-b" ? 8 : 5 }], error: null }
      : { data: [progressRow(args.target_student_id, args.requested_range_days)], error: null });
    const user = userEvent.setup();
    render(<ParentProgress linkedChildren={children} pendingRequests={0} onConnect={() => undefined} />);

    await waitFor(() => expect(rpc).toHaveBeenCalledWith("get_parent_child_progress", {
      target_student_id: "student-a",
      requested_range_days: 7,
    }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("get_parent_child_ai_usage", {
      target_student_id: "student-a",
      requested_range_days: 7,
    }));
    await user.click(screen.getByRole("button", { name: "Bartek" }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("get_parent_child_progress", {
      target_student_id: "student-b",
      requested_range_days: 7,
    }));
    expect(screen.getByRole("heading", { name: "Bartek" })).toBeInTheDocument();
  });

  it("reloads the selected child for a 30-day range", async () => {
    rpc.mockImplementation(async (name: string, args: { target_student_id: string; requested_range_days: number }) => name === "get_parent_child_ai_usage"
      ? { data: [{ ai_questions_used: 5 }], error: null }
      : { data: [progressRow(args.target_student_id, args.requested_range_days)], error: null });
    const user = userEvent.setup();
    render(<ParentProgress linkedChildren={children.slice(0, 1)} pendingRequests={0} onConnect={() => undefined} />);

    await user.click(screen.getByRole("button", { name: "30 dni" }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("get_parent_child_progress", {
      target_student_id: "student-a",
      requested_range_days: 30,
    }));
    expect(await screen.findByText("Pytania do AI")).toBeInTheDocument();
  });

  it("still renders child progress when the optional AI usage RPC is unavailable", async () => {
    rpc.mockImplementation(async (name: string, args: { target_student_id: string; requested_range_days: number }) => {
      if (name === "get_parent_child_ai_usage") return { data: null, error: { code: "PGRST202", message: "function not found" } };
      const row = progressRow(args.target_student_id, args.requested_range_days);
      delete (row as Partial<typeof row>).ai_questions_used;
      return { data: [row], error: null };
    });

    render(<ParentProgress linkedChildren={children.slice(0, 1)} pendingRequests={0} onConnect={() => undefined} />);

    expect(await screen.findByText("Postęp został wczytany")).toBeInTheDocument();
    expect(screen.getByText("Rozwiązane zadania")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.queryByText("Postępy są chwilowo niedostępne")).not.toBeInTheDocument();
  });

  it("shows the connection state without calling progress RPC", () => {
    render(<ParentProgress linkedChildren={[]} pendingRequests={1} onConnect={() => undefined} />);
    expect(screen.getByText("Połączenie czeka na zatwierdzenie")).toBeInTheDocument();
    expect(rpc).not.toHaveBeenCalled();
  });
});
