import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MathFormula } from "@/components/math-formula";

afterEach(() => {
  cleanup();
  delete window.MathJax;
});

describe("MathFormula", () => {
  it("typesets each formula once even when MathJax announces readiness", async () => {
    const typesetPromise = vi.fn(async (elements?: HTMLElement[]) => {
      const element = elements?.[0];
      if (element) element.innerHTML = '<mjx-container display="true"></mjx-container>';
    });
    const typesetClear = vi.fn();
    window.MathJax = { typesetPromise, typesetClear };

    const { container, rerender } = render(<MathFormula latex="x^2" display />);

    await waitFor(() => expect(typesetPromise).toHaveBeenCalledTimes(1));
    window.dispatchEvent(new Event("mathjax-ready"));
    await Promise.resolve();

    expect(typesetPromise).toHaveBeenCalledTimes(1);
    expect(container.querySelector(".math-formula")).toHaveAttribute("aria-label", "Wzór matematyczny: x^2");
    expect(container.querySelectorAll("mjx-container")).toHaveLength(1);

    rerender(<MathFormula latex="y^2" display />);
    await waitFor(() => expect(typesetPromise).toHaveBeenCalledTimes(2));

    expect(container.querySelector(".math-formula")).toHaveAttribute("aria-label", "Wzór matematyczny: y^2");
    expect(container.querySelectorAll("mjx-container")).toHaveLength(1);
  });
});
