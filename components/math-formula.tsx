"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    MathJax?: {
      typesetPromise?: (elements?: HTMLElement[]) => Promise<void>;
      typesetClear?: (elements?: HTMLElement[]) => void;
    };
  }
}

export function MathFormula({ latex, display = false, className }: { latex: string; display?: boolean; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const source = display ? `\\[${latex}\\]` : `\\(${latex}\\)`;

  useEffect(() => {
    const typeset = () => {
      const element = ref.current;
      if (!element || !window.MathJax?.typesetPromise || element.querySelector("mjx-container")) return;
      void window.MathJax.typesetPromise([element]).catch(() => {
        if (ref.current && !ref.current.querySelector("mjx-container")) ref.current.textContent = latex;
      });
    };

    const element = ref.current;
    if (!element) return;
    window.MathJax?.typesetClear?.([element]);
    element.textContent = source;
    typeset();
    window.addEventListener("mathjax-ready", typeset);
    return () => {
      window.removeEventListener("mathjax-ready", typeset);
      if (ref.current) window.MathJax?.typesetClear?.([ref.current]);
    };
  }, [latex, source]);

  return <span ref={ref} className={cn("math-formula", "mathjax_process", display && "block overflow-x-auto py-2 text-center", className)} aria-label={`Wzór matematyczny: ${latex}`} />;
}
