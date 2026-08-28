import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BrandLogo } from "@/components/brand-logo";

describe("BrandLogo", () => {
  it("renders the wordmark from the supplied design without an extra symbol", () => {
    const { container } = render(<BrandLogo />);

    expect(screen.getByRole("img", { name: "egzaminio" })).toBeInTheDocument();
    expect(container.querySelector(".wordmark-text")).toHaveTextContent("egzaminio");
    expect(container.querySelector(".wordmark-tick")).not.toBeInTheDocument();
  });

  it("keeps the same wordmark in compact contexts", () => {
    const { container } = render(<BrandLogo compact />);

    expect(container.querySelector(".wordmark")).toHaveClass("wordmark-compact");
    expect(container.querySelector(".wordmark-text")).toHaveTextContent("egzaminio");
    expect(container.querySelector(".wordmark-tick")).not.toBeInTheDocument();
  });
});
