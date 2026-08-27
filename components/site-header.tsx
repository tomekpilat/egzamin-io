/* eslint-disable @next/next/no-html-link-for-pages -- Full-page anchors avoid a Vinext production navigation failure. */

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";

const navigation = [
  { key: "calculator", label: "Kalkulator", href: "/kalkulator-punktow" },
  { key: "knowledge", label: "Baza wiedzy", href: "/baza-wiedzy" },
  { key: "parent", label: "Dla rodzica", href: "/#dla-rodzica" },
  { key: "plans", label: "Plany", href: "/#dostep" },
] as const;

function activeNavigationKey(currentPath?: string) {
  if (currentPath?.startsWith("/kalkulator-punktow")) return "calculator";
  if (currentPath?.startsWith("/baza-wiedzy") || currentPath?.startsWith("/egzamin-osmoklasisty")) return "knowledge";
  if (currentPath === "/plan-plus") return "plans";
  return null;
}

export function SiteHeader({ currentPath }: { currentPath?: string }) {
  const activeKey = activeNavigationKey(currentPath);

  return (
    <header className="site-header">
      <a className="brand" href="/" aria-label="egzaminio — strona główna"><BrandLogo /></a>
      <nav className="desktop-nav" aria-label="Główna nawigacja">
        {navigation.map((item) => (
          <a href={item.href} key={item.key} aria-current={activeKey === item.key ? "page" : undefined}>{item.label}</a>
        ))}
      </nav>
      <div className="header-actions">
        <a className="header-login" href="/logowanie">Zaloguj się</a>
        <Button variant="outline" className="header-cta" asChild><a href="/logowanie?tryb=rejestracja">Załóż konto</a></Button>
      </div>
    </header>
  );
}
