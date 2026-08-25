"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(() => () => undefined, () => true, () => false);

  const dark = mounted && resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={`theme-toggle ${className}`}
      aria-label={dark ? "Włącz jasny motyw" : "Włącz ciemny motyw"}
      title={dark ? "Jasny motyw" : "Ciemny motyw"}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </Button>
  );
}
