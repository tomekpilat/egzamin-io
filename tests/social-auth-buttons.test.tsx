import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SocialAuthButtons } from "@/components/social-auth-buttons";

afterEach(cleanup);

describe("SocialAuthButtons", () => {
  it("uses recognizable provider labels and official-color brand marks", () => {
    const { container } = render(<SocialAuthButtons onSelect={() => undefined} />);

    expect(screen.getByRole("button", { name: "Kontynuuj z Google" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Kontynuuj z Facebookiem" })).toBeEnabled();
    expect(container.querySelector('[data-brand-icon="google"]')).toBeInTheDocument();
    expect(container.querySelector('[data-brand-icon="facebook"]')).toBeInTheDocument();
  });

  it("starts the selected OAuth provider on click", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<SocialAuthButtons onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: "Kontynuuj z Google" }));

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith("google");
  });

  it("locks both providers and announces the active loading state", () => {
    render(
      <SocialAuthButtons
        pendingProvider="facebook"
        onSelect={() => undefined}
      />,
    );

    const googleButton = screen.getByRole("button", { name: "Kontynuuj z Google" });
    const facebookButton = screen.getByRole("button", { name: "Kontynuuj z Facebookiem" });

    expect(googleButton).toBeDisabled();
    expect(facebookButton).toBeDisabled();
    expect(facebookButton).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Łączenie z Facebookiem…")).toBeInTheDocument();
  });

  it("keeps keyboard focus available when idle", async () => {
    const user = userEvent.setup();
    render(<SocialAuthButtons onSelect={() => undefined} />);

    await user.tab();

    expect(screen.getByRole("button", { name: "Kontynuuj z Google" })).toHaveFocus();
  });
});
