import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import LoginPage from "@/app/logowanie/page";
import { LEGAL_VERSION } from "@/lib/legal";

const authMocks = vi.hoisted(() => ({
  params: new URLSearchParams("tryb=rejestracja&rola=rodzic"),
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => authMocks.params,
}));

vi.mock("@/components/site-header", () => ({
  SiteHeader: () => <header data-testid="site-header" />,
}));

vi.mock("@/components/social-auth-buttons", () => ({
  SocialAuthButtons: () => <div data-testid="social-auth" />,
}));

vi.mock("@/lib/analytics", () => ({
  trackAnalyticsEvent: vi.fn(),
}));

vi.mock("@/lib/supabase-browser", () => ({
  getSupabaseClient: async () => ({
    auth: {
      signUp: authMocks.signUp,
      signInWithPassword: authMocks.signInWithPassword,
    },
  }),
}));

async function completeSharedSignupFields(email: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Twój e-mail"), email);
  await user.type(screen.getByLabelText("Powtórz e-mail"), email);
  await user.type(screen.getByLabelText("Hasło"), "Bezpieczne-Haslo-123");
  await user.type(screen.getByLabelText("Powtórz hasło"), "Bezpieczne-Haslo-123");
  await user.click(screen.getByRole("checkbox", { name: /Akceptuję/ }));
  return user;
}

function signupSubmitButton() {
  const buttons = screen.getAllByRole("button", { name: "Utwórz konto" });
  return buttons[buttons.length - 1];
}

describe("registration submit", () => {
  beforeEach(() => {
    authMocks.params = new URLSearchParams("tryb=rejestracja&rola=rodzic");
    authMocks.signUp.mockReset().mockResolvedValue({ data: { user: { id: "parent-id" }, session: null }, error: null });
    authMocks.signInWithPassword.mockReset();
  });

  afterEach(() => cleanup());

  it("submits a complete parent registration to Supabase", async () => {
    render(<LoginPage />);
    const user = await completeSharedSignupFields(" RODZIC@Example.pl ");

    expect(signupSubmitButton()).toBeEnabled();
    await user.click(signupSubmitButton());

    await waitFor(() => expect(authMocks.signUp).toHaveBeenCalledTimes(1));
    expect(authMocks.signUp).toHaveBeenCalledWith({
      email: "rodzic@example.pl",
      password: "Bezpieczne-Haslo-123",
      options: {
        emailRedirectTo: "http://localhost:3000/panel",
        data: {
          requested_role: "parent",
          guardian_email: null,
          legal_accepted: true,
          legal_version: LEGAL_VERSION,
        },
      },
    });
    expect(await screen.findByText(/Konto utworzone/)).toBeInTheDocument();
  });

  it("submits the separate guardian address for a student account", async () => {
    authMocks.params = new URLSearchParams("tryb=rejestracja&rola=uczen");
    authMocks.signUp.mockResolvedValue({ data: { user: { id: "student-id" }, session: null }, error: null });
    render(<LoginPage />);
    const user = await completeSharedSignupFields("UCZEN@Example.pl");
    await user.type(screen.getByLabelText(/E-mail rodzica lub opiekuna/), " OPIEKUN@Example.pl ");

    expect(signupSubmitButton()).toBeEnabled();
    await user.click(signupSubmitButton());

    await waitFor(() => expect(authMocks.signUp).toHaveBeenCalledTimes(1));
    expect(authMocks.signUp.mock.calls[0][0].options.data).toMatchObject({
      requested_role: "student",
      guardian_email: "opiekun@example.pl",
    });
  });

  it("shows the real profile-creation failure category and allows retry", async () => {
    authMocks.signUp.mockResolvedValue({ data: { user: null, session: null }, error: new Error("Database error saving new user") });
    render(<LoginPage />);
    const user = await completeSharedSignupFields("a@example.pl");
    await user.click(signupSubmitButton());

    expect(await screen.findByText(/Nie udało się utworzyć profilu/)).toBeInTheDocument();
    expect(signupSubmitButton()).toBeEnabled();
  });
});
