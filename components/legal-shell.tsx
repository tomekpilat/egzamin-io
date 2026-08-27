/* eslint-disable @next/next/no-html-link-for-pages -- Full-page anchors avoid a Vinext production navigation failure. */

import { BrandLogo } from "@/components/brand-logo";
import { SiteHeader } from "@/components/site-header";

const legalLinks = [
  ["/informacje-prawne", "Centrum prawne"],
  ["/polityka-prywatnosci", "Prywatność"],
  ["/regulamin", "Regulamin"],
  ["/polityka-cookies", "Cookies i pamięć urządzenia"],
  ["/bezpieczenstwo-dzieci-ai", "Dzieci i AI"],
  ["/odstapienie-od-umowy", "Odstąpienie od umowy"],
  ["/usun-konto", "Usunięcie konta i danych"],
] as const;

type LegalShellProps = {
  title: string;
  description: string;
  currentPath: string;
  children: React.ReactNode;
  kicker?: string;
};

export function LegalShell({ title, description, currentPath, children, kicker = "Informacje prawne" }: LegalShellProps) {
  return (
    <main className="legal-page">
      <SiteHeader currentPath={currentPath} />
      <div className="legal-shell">
        <aside className="legal-sidebar" aria-label="Dokumenty prawne">
          <span>Dokumenty</span>
          <nav>
            {legalLinks.map(([href, label]) => (
              <a href={href} key={href} className={currentPath === href ? "active" : ""} aria-current={currentPath === href ? "page" : undefined}>{label}</a>
            ))}
          </nav>
          <p>Wersja robocza do konsultacji prawnej przed publicznym startem.</p>
        </aside>
        <article>
          <span className="section-kicker">{kicker}</span>
          <h1>{title}</h1>
          <p className="legal-lead">{description}</p>
          {children}
        </article>
      </div>
      <footer className="legal-footer">
        <BrandLogo />
        <div><a href="/informacje-prawne">Informacje prawne</a><a href="/usun-konto">Usuń konto</a><a href="mailto:kontakt@egzamin.io">kontakt@egzamin.io</a><span>© 2026 egzaminio</span></div>
      </footer>
    </main>
  );
}
