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

  useEffect(() => {
    const typeset = () => {
      if (!ref.current || !window.MathJax?.typesetPromise) return;
      window.MathJax.typesetClear?.([ref.current]);
      void window.MathJax.typesetPromise([ref.current]);
    };
    typeset();
    window.addEventListener("mathjax-ready", typeset);
    return () => window.removeEventListener("mathjax-ready", typeset);
  }, [latex, display]);

  return <span ref={ref} className={cn("mathjax_process", display && "block overflow-x-auto py-2 text-center", className)}>{display ? `\\[${latex}\\]` : `\\(${latex}\\)`}</span>;
}
