/* eslint-disable @next/next/no-html-link-for-pages -- Full-page anchors keep navigation consistent with the public site. */

import { BrandLogo } from "@/components/brand-logo";

export function SiteFooter() {
  return <footer className="design-home-footer">
    <div className="design-home-container design-footer-main">
      <div><a href="/" aria-label="egzaminio — strona główna"><BrandLogo compact /></a><span>Przygotowanie do egzaminu ósmoklasisty</span></div>
      <div className="design-footer-links">
        <div><b>Produkt</b><a href="/#zadania">Jak to działa</a><a href="/#cennik">Cennik</a><a href="/kalkulator-punktow">Kalkulator punktów</a></div>
        <div><b>Dokumenty</b><a href="/regulamin">Regulamin</a><a href="/polityka-prywatnosci">Polityka prywatności</a><a href="/polityka-cookies">Pliki cookie</a><a href="/bezpieczenstwo-dzieci-ai">Dzieci i AI</a></div>
        <div><b>Kontakt</b><a href="mailto:kontakt@egzamin.io">kontakt@egzamin.io</a><a href="/odstapienie-od-umowy">Odstąpienie od umowy</a></div>
      </div>
    </div>
    <div className="design-footer-note"><div className="design-home-container">Zadania pochodzą z arkuszy CKE. Aplikacja nie zastępuje nauczyciela ani korepetytora.</div></div>
  </footer>;
}
