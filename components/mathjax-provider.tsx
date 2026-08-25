"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    MathJax?: Record<string, unknown> & { startup?: { promise?: Promise<unknown> } };
  }
}

export function MathJaxProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (document.querySelector("script[data-egzaminio-mathjax]")) return;

    window.MathJax = {
      loader: { load: ["ui/safe"] },
      tex: {
        inlineMath: [["\\(", "\\)"]],
        displayMath: [["\\[", "\\]"]],
        packages: { "[-]": ["require", "autoload"] },
      },
      options: {
        ignoreHtmlClass: "mathjax_ignore",
        processHtmlClass: "mathjax_process",
        menuOptions: { settings: { enrich: true, speech: true, braille: true, assistiveMml: false } },
      },
      startup: {
        ready() {
          const mathJax = window.MathJax as { startup: { defaultReady: () => void; promise: Promise<unknown> } };
          mathJax.startup.defaultReady();
          void mathJax.startup.promise.then(() => window.dispatchEvent(new Event("mathjax-ready")));
        },
      },
    };

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/mathjax@4.0.0/tex-mml-chtml.js";
    script.async = true;
    script.dataset.egzaminioMathjax = "true";
    document.head.appendChild(script);
  }, []);

  return children;
}
