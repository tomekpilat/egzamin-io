import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BrandLogo } from "@/components/brand-logo";

describe("BrandLogo", () => {
  it("renders the brand name and a separate lightweight tick", () => {
    const { container } = render(<BrandLogo />);

    expect(screen.getByRole("img", { name: "egzaminio" })).toBeInTheDocument();
    expect(container.querySelector(".wordmark-text")).toHaveTextContent("egzaminio");
    expect(container.querySelector(".wordmark-tick")).toHaveTextContent("✓");
  });

  it("keeps the tick in the compact logo", () => {
    const { container } = render(<BrandLogo compact />);

    expect(container.querySelector(".wordmark")).toHaveClass("wordmark-compact");
    expect(container.querySelector(".wordmark-tick")).toBeInTheDocument();
  });
});
