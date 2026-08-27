import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SiteHeader } from "@/components/site-header";

const { getSession, onAuthStateChange, signOut, unsubscribe } = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signOut: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock("@/lib/supabase-browser", () => ({
  getSupabaseClient: async () => ({
    auth: { getSession, onAuthStateChange, signOut },
  }),
}));

beforeEach(() => {
  onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe } } });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("SiteHeader session state", () => {
  it("shows the account dropdown and panel link for an authenticated user", async () => {
    getSession.mockResolvedValue({
      data: { session: { user: { email: "ala@example.com", user_metadata: { display_name: "Ala" } } } },
      error: null,
    });
    const user = userEvent.setup();

    render(<SiteHeader />);

    const menu = await screen.findByRole("button", { name: "Menu konta: Ala" });
    expect(screen.queryByRole("link", { name: "Zaloguj się" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Załóż konto" })).not.toBeInTheDocument();

    await user.click(menu);
    expect(await screen.findByRole("menuitem", { name: /Przejdź do panelu/ })).toHaveAttribute("href", "/panel");
    expect(screen.getAllByText("ala@example.com").length).toBeGreaterThan(0);
    expect(screen.getByRole("menuitem", { name: /Wyloguj się/ })).toBeInTheDocument();
  });

  it("keeps login and registration actions for a visitor", async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null });

    render(<SiteHeader />);

    expect(await screen.findByRole("link", { name: "Zaloguj się" })).toHaveAttribute("href", "/logowanie");
    expect(screen.getByRole("link", { name: "Załóż konto" })).toHaveAttribute("href", "/logowanie?tryb=rejestracja");
    expect(screen.queryByRole("link", { name: /Przejdź do panelu/ })).not.toBeInTheDocument();
  });
});
