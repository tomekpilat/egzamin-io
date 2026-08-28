import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "@/app/panel/page";
import { LEGAL_VERSION } from "@/lib/legal";

const child = {
  student_id: "student-1",
  student_display_name: "Kasia Nowak",
  student_email: "kasia@example.com",
  linked_at: "2026-08-01T00:00:00Z",
  weekly_goal: 5,
  summary_email_enabled: false,
  cke_accommodation_code: "100",
  cke_accommodation_label: "arkusz standardowy",
  plan_tier: "free",
  plan_valid_until: null,
};

const supabase = {
  auth: {
    getSession: vi.fn(async () => ({ data: { session: { user: { id: "parent-1", email: "anna@example.com", user_metadata: {} } } } })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    signOut: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(async () => ({ data: {
          id: "parent-1",
          email: "anna@example.com",
          display_name: "Anna Nowak",
          role: "parent",
          onboarding_completed: true,
          legal_version: LEGAL_VERSION,
          guardian_email: null,
          guardian_consent_at: null,
          teacher_verification_status: "not_required",
        }, error: null })),
      })),
    })),
  })),
  rpc: vi.fn(async (name: string) => ({ data: name === "get_linked_children" ? [child] : [], error: null })),
};

vi.mock("@/lib/supabase-browser", () => ({ getSupabaseClient: async () => supabase }));
vi.mock("@/components/feedback-dialog", () => ({ FeedbackDialog: () => null }));
vi.mock("@/components/brand-logo", () => ({ BrandLogo: () => <span>egzaminio</span> }));
vi.mock("@/components/parent-progress", () => ({ ParentProgress: () => <section>Widok postępu</section> }));
vi.mock("@/components/parent-payments", () => ({ ParentPayments: () => <section>Widok płatności</section> }));
vi.mock("@/components/theme-settings", () => ({ ThemeSettings: () => <div>Motyw systemowy</div> }));

afterEach(() => cleanup());

describe("redesigned parent panel", () => {
  it("keeps every parent destination interactive inside the new shell", async () => {
    const user = userEvent.setup();
    render(<DashboardPage />);

    await waitFor(() => expect(screen.getByRole("heading", { name: "Przegląd" })).toBeInTheDocument());
    expect(screen.getAllByText(/Konto rodzica/)).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Plan Free · 1 dziecko" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Menu konta: Anna Nowak" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Dokumenty i prywatność" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Regulamin" })).toHaveAttribute("href", "/regulamin");
    expect(screen.getByRole("link", { name: "Pliki cookie" })).toHaveAttribute("href", "/polityka-cookies");
    expect(screen.getByRole("link", { name: "Dzieci i AI" })).toHaveAttribute("href", "/bezpieczenstwo-dzieci-ai");

    await user.click(screen.getByRole("button", { name: "Dzieci" }));
    expect(screen.getByRole("heading", { name: "Dzieci" })).toBeInTheDocument();
    expect(screen.getByText("Kasia Nowak")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Liczba sesji w tygodniu" })).toBeInTheDocument();
    expect(screen.getByRole("banner")).toHaveTextContent("Dzieci");

    await user.click(screen.getByRole("button", { name: "Podłącz dziecko" }));
    expect(screen.getByRole("heading", { name: "Podłącz dziecko" })).toBeInTheDocument();
    expect(screen.getByText("Dziecko wpisuje Twój e-mail")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kopiuj link dla dziecka" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ustawienia" }));
    expect(screen.getByRole("heading", { name: "Ustawienia" })).toBeInTheDocument();
    expect(screen.getByText("Motyw systemowy")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Polityka prywatności" })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Polityka prywatności" })).toHaveAttribute("href", "/polityka-prywatnosci");
  });
});
