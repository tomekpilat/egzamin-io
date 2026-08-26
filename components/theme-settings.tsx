"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const THEME_CHOICES = [
  { value: "system", label: "Systemowy" },
  { value: "light", label: "Jasny" },
  { value: "dark", label: "Ciemny" },
] as const;

export function ThemeSettings() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(() => () => undefined, () => true, () => false);
  const selectedTheme = mounted ? (theme ?? "system") : "system";

  return (
    <div className="theme-settings" role="group" aria-label="Motyw aplikacji">
      {THEME_CHOICES.map((choice) => (
        <Button
          key={choice.value}
          type="button"
          size="sm"
          variant={selectedTheme === choice.value ? "secondary" : "ghost"}
          aria-pressed={selectedTheme === choice.value}
          onClick={() => setTheme(choice.value)}
        >
          {choice.label}
        </Button>
      ))}
    </div>
  );
}
