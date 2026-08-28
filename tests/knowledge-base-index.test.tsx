import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { KnowledgeBaseIndex } from "@/components/knowledge-base-index";

afterEach(() => cleanup());

describe("redesigned knowledge base index", () => {
  it("renders the published catalog and filters complete category sections", async () => {
    const user = userEvent.setup();
    const { container } = render(<KnowledgeBaseIndex />);

    expect(screen.getByRole("heading", { name: "Konkretna odpowiedź. Potem ćwiczenie." })).toBeInTheDocument();
    expect(screen.getByText("17 poradników")).toBeInTheDocument();
    expect(screen.getByText("6 kategorii")).toBeInTheDocument();
    expect(container.querySelectorAll(".knowledge-list-card")).toHaveLength(17);

    await user.click(screen.getByRole("button", { name: "Matematyka · 3" }));
    expect(screen.getByRole("heading", { name: "Matematyka krok po kroku" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Punkty, progi i wybór szkoły" })).not.toBeInTheDocument();
    expect(container.querySelectorAll(".knowledge-list-card")).toHaveLength(3);
    expect(screen.getByText("3 poradniki w tej kategorii")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Wszystkie" }));
    expect(container.querySelectorAll(".knowledge-list-card")).toHaveLength(17);
  });

  it("keeps category, article and learning destinations as real links", () => {
    render(<KnowledgeBaseIndex />);
    expect(screen.getAllByRole("link", { name: /Zobacz kategorię/ })[0]).toHaveAttribute("href", "/rekrutacja");
    expect(screen.getByRole("link", { name: /Ile punktów można zdobyć do liceum/ })).toHaveAttribute("href", "/rekrutacja/ile-punktow-do-liceum");
    expect(screen.getByRole("link", { name: "Rozwiąż zadania" })).toHaveAttribute("href", "/logowanie?tryb=rejestracja&rola=uczen");
  });
});
