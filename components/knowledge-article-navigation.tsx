"use client";

import { useEffect, useState } from "react";

export function ArticleReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function updateProgress() {
      const root = document.documentElement;
      const available = root.scrollHeight - root.clientHeight;
      setProgress(available > 0 ? Math.min(100, Math.max(0, (root.scrollTop / available) * 100)) : 0);
    }

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  return <div className="knowledge-reading-progress" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>;
}

export function ArticleTableOfContents({ items }: { items: { id: string; label: string }[] }) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible?.target.id) setActiveId(visible.target.id);
    }, { rootMargin: "-18% 0px -68%", threshold: 0 });
    items.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [items]);

  return <nav className="knowledge-article-toc" aria-label="W tym poradniku"><b>W tym poradniku</b>{items.map((item) => <a className={activeId === item.id ? "is-active" : undefined} key={item.id} href={`#${item.id}`} onClick={() => setActiveId(item.id)}>{item.label}</a>)}</nav>;
}
