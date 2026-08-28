import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RecruitmentCalculatorPage from "@/app/kalkulator-punktow/page";

vi.mock("@/components/site-header", () => ({ SiteHeader: () => <header>egzaminio</header> }));
vi.mock("@/components/brand-logo", () => ({ BrandLogo: () => <span>egzaminio</span> }));
vi.mock("@/components/school-threshold-request-form", () => ({ SchoolThresholdRequestForm: () => <form aria-label="Zgłoś szkołę" /> }));
vi.mock("@/components/school-threshold-search", () => ({
  SchoolThresholdSearch: ({ onSelect }: { onSelect: (record: Record<string, unknown>) => void }) => <button type="button" onClick={() => onSelect({
    threshold_id: "threshold-1",
    school_name: "V LO im. Witkowskiego",
    school_type: "liceum",
    city: "Kraków",
    class_name: "1A mat-fiz",
    class_code: "1A",
    profile_subjects: ["matematyka", "fizyka"],
    threshold_points: 158.2,
    recruitment_year: 2025,
    source_label: "system rekrutacji Kraków",
    source_url: "https://example.com/progi",
    verified_at: "2026-08-01T00:00:00Z",
  })}>Wybierz V LO 1A</button>,
}));

beforeEach(() => vi.stubGlobal("scrollTo", vi.fn()));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("recruitment calculator screens", () => {
  it("keeps entered points, selects a verified school and shows the sourced comparison", async () => {
    const user = userEvent.setup();
    render(<RecruitmentCalculatorPage />);

    await user.clear(screen.getByLabelText("Polski (%)"));
    await user.type(screen.getByLabelText("Polski (%)"), "78");
    await user.clear(screen.getByLabelText("Matematyka (%)"));
    await user.type(screen.getByLabelText("Matematyka (%)"), "64");
    await user.clear(screen.getByLabelText("Język obcy (%)"));
    await user.type(screen.getByLabelText("Język obcy (%)"), "85");
    expect(screen.getAllByText("75,2")).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Znajdź szkołę →" }));
    expect(screen.getByRole("region", { name: "Znajdź szkołę" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Wybierz V LO 1A" }));

    await waitFor(() => expect(screen.getByRole("region", { name: "Porównaj wynik" })).toBeInTheDocument());
    expect(screen.getByText("158,2")).toBeInTheDocument();
    expect(screen.getByText("−83")).toBeInTheDocument();
    expect(screen.getByText(/system rekrutacji Kraków, 2025/)).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: /1\. Punkty/ }));
    expect(screen.getByLabelText("Polski (%)")).toHaveValue(78);
    expect(screen.getByLabelText("Matematyka (%)")).toHaveValue(64);
    expect(screen.getByLabelText("Język obcy (%)")).toHaveValue(85);
  });

  it("supports a manual threshold when a school is not in the database", async () => {
    const user = userEvent.setup();
    render(<RecruitmentCalculatorPage />);

    await user.click(screen.getByRole("link", { name: "2. Znajdź szkołę" }));
    await user.click(screen.getByText("Wpisz próg ręcznie"));
    await user.type(screen.getByLabelText("Próg z poprzedniego roku"), "150");
    await user.click(screen.getByRole("button", { name: "Porównaj wynik" }));

    expect(screen.getByRole("region", { name: "Porównaj wynik" })).toBeInTheDocument();
    expect(screen.getByText("−150")).toBeInTheDocument();
    expect(screen.getByText(/Próg wpisany ręcznie/)).toBeInTheDocument();
  });
});
