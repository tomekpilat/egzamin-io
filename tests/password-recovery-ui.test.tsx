import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PasswordRecoveryPage from "@/app/odzyskaj-haslo/page";
import UpdatePasswordPage from "@/app/ustaw-nowe-haslo/page";

const authMocks = vi.hoisted(() => ({
  session: null as null | { user: { email: string; user_metadata: Record<string, string> } },
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock("@/lib/supabase-browser", () => ({
  getSupabaseClient: async () => ({
    auth: {
      resetPasswordForEmail: authMocks.resetPasswordForEmail,
      updateUser: authMocks.updateUser,
      getSession: authMocks.getSession,
      onAuthStateChange: authMocks.onAuthStateChange,
    },
  }),
}));

describe("password recovery UI", () => {
  beforeEach(() => {
    authMocks.session = null;
    authMocks.resetPasswordForEmail.mockReset().mockResolvedValue({ error: null });
    authMocks.updateUser.mockReset().mockResolvedValue({ error: null });
    authMocks.getSession.mockReset().mockImplementation(async () => ({ data: { session: authMocks.session }, error: null }));
    authMocks.unsubscribe.mockReset();
    authMocks.onAuthStateChange.mockReset().mockReturnValue({ data: { subscription: { unsubscribe: authMocks.unsubscribe } } });
  });

  afterEach(() => cleanup());

  it("sends and can resend a recovery link without revealing account existence", async () => {
    const user = userEvent.setup();
    render(<PasswordRecoveryPage />);

    await user.type(screen.getByLabelText("Twój e-mail"), " Uczen@Example.pl ");
    await user.click(screen.getByRole("button", { name: "Wyślij link do zmiany hasła" }));

    await waitFor(() => expect(authMocks.resetPasswordForEmail).toHaveBeenCalledWith("uczen@example.pl", {
      redirectTo: "http://localhost:3000/ustaw-nowe-haslo",
    }));
    expect(screen.getByText(/Jeśli konto z tym adresem istnieje/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Wyślij link ponownie" }));
    expect(authMocks.resetPasswordForEmail).toHaveBeenCalledTimes(2);
  });

  it("updates the password after Supabase restores the recovery session", async () => {
    authMocks.session = { user: { email: "uczen@example.pl", user_metadata: {} } };
    const user = userEvent.setup();
    render(<UpdatePasswordPage />);

    await user.type(await screen.findByLabelText("Nowe hasło"), "NoweHaslo-123");
    await user.type(screen.getByLabelText("Powtórz nowe hasło"), "NoweHaslo-123");
    await user.click(screen.getByRole("button", { name: "Zapisz nowe hasło" }));

    await waitFor(() => expect(authMocks.updateUser).toHaveBeenCalledWith({ password: "NoweHaslo-123" }));
    expect(await screen.findByText("Hasło zostało zmienione. Możesz wrócić do nauki.")).toBeInTheDocument();
  });
});
