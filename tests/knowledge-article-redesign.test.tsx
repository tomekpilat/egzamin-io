import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SeoContentPage } from "@/components/seo-content-page";
import { getSeoPage } from "@/lib/seo-pages";

afterEach(() => cleanup());

describe("redesigned knowledge article", () => {
  it("renders the supplied article composition from catalog data", () => {
    const page = getSeoPage("/matematyka/twierdzenie-pitagorasa-zadania");
    expect(page).not.toBeNull();
    const { container } = render(<SeoContentPage page={page!} />);

    expect(screen.getByRole("heading", { name: "Twierdzenie Pitagorasa: najpierw nazwij boki", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("4 min czytania")).toBeInTheDocument();
    expect(container.querySelectorAll(".knowledge-article-facts > div")).toHaveLength(3);
    expect(screen.getByRole("navigation", { name: "W tym poradniku" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Schemat rozwiązania" })).toHaveAttribute("href", "#schemat-rozwiazania");
    expect(screen.getByRole("heading", { name: "Przykład 6–8–10" })).toBeInTheDocument();
    expect(screen.getByText("Przeciwprostokątna ma 10 cm.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /CKE — informator z matematyki/ })).toHaveAttribute("target", "_blank");
  });

  it("keeps calls to action and related articles clickable", () => {
    const page = getSeoPage("/matematyka/twierdzenie-pitagorasa-zadania")!;
    render(<SeoContentPage page={page} />);

    expect(screen.getAllByRole("link", { name: "Rozwiąż zadania" })[0]).toHaveAttribute("href", "/logowanie?tryb=rejestracja&rola=uczen");
    expect(screen.getByRole("link", { name: /Procenty bez zgadywania/ })).toHaveAttribute("href", "/matematyka/procenty-zadania-egzamin-osmoklasisty");
    expect(screen.getByRole("link", { name: "Matematyka" })).toHaveAttribute("href", "/matematyka");
  });
});
