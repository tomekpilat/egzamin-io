import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeedbackDialog } from "@/components/feedback-dialog";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("@/lib/supabase-browser", () => ({
  getSupabaseClient: async () => ({ rpc }),
}));

afterEach(() => {
  cleanup();
  rpc.mockReset();
});

describe("FeedbackDialog", () => {
  it("preserves the optional-contact choice and confirms a saved reference", async () => {
    rpc.mockResolvedValue({ data: [{ feedback_reference: "12345678-abcd-4000-8000-123456789abc" }], error: null });
    const user = userEvent.setup();
    render(<FeedbackDialog userEmail="uczen@example.com" screenContext="student:progress" />);

    await user.click(screen.getByRole("button", { name: "Feedback" }));
    expect(screen.getByRole("dialog", { name: "Powiedz nam, co poprawić" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Wiadomość"), "Chciałbym łatwiej znaleźć zadania z procentów.");
    await user.click(screen.getByRole("button", { name: "Wyślij opinię" }));

    await waitFor(() => expect(rpc).toHaveBeenCalledWith("submit_user_feedback", expect.objectContaining({
      feedback_category: "other",
      feedback_contact_consent: false,
      feedback_screen_context: "student:progress",
      feedback_page_path: "/",
    })));
    expect(await screen.findByText("Dziękujemy za opinię")).toBeInTheDocument();
    expect(screen.getByText("12345678", { exact: false })).toBeInTheDocument();
  });

  it("keeps the message available when persistence fails", async () => {
    rpc.mockResolvedValue({ data: null, error: new Error("network") });
    const user = userEvent.setup();
    render(<FeedbackDialog userEmail="rodzic@example.com" screenContext="parent:children" />);

    await user.click(screen.getByRole("button", { name: "Feedback" }));
    const message = screen.getByLabelText("Wiadomość");
    await user.type(message, "Formularz powinien pamiętać tę wiadomość po błędzie.");
    await user.click(screen.getByRole("button", { name: "Wyślij opinię" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Treść pozostała w formularzu");
    expect(message).toHaveValue("Formularz powinien pamiętać tę wiadomość po błędzie.");
  });
});
