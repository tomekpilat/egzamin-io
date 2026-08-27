import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SocialAuthButtons } from "@/components/social-auth-buttons";

afterEach(cleanup);

describe("SocialAuthButtons", () => {
  it("offers Google as the only currently available social provider", () => {
    const { container } = render(<SocialAuthButtons onSelect={() => undefined} />);

    expect(screen.getByRole("button", { name: "Kontynuuj z Google" })).toBeEnabled();
    expect(container.querySelector('[data-brand-icon="google"]')).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Facebook/i })).not.toBeInTheDocument();
    expect(container.querySelector('[data-brand-icon="facebook"]')).not.toBeInTheDocument();
  });

  it("starts the selected OAuth provider on click", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<SocialAuthButtons onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: "Kontynuuj z Google" }));

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith("google");
  });

  it("locks Google and announces its loading state", () => {
    render(
      <SocialAuthButtons
        pendingProvider="google"
        onSelect={() => undefined}
      />,
    );

    const googleButton = screen.getByRole("button", { name: "Kontynuuj z Google" });

    expect(googleButton).toBeDisabled();
    expect(googleButton).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Łączenie z Google…")).toBeInTheDocument();
  });

  it("keeps keyboard focus available when idle", async () => {
    const user = userEvent.setup();
    render(<SocialAuthButtons onSelect={() => undefined} />);

    await user.tab();

    expect(screen.getByRole("button", { name: "Kontynuuj z Google" })).toHaveFocus();
  });
});
