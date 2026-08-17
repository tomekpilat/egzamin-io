import { BrandLogo } from "@/components/brand-logo";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Polityka prywatności — egzaminio",
  description: "Informacje o danych przetwarzanych przez egzaminio.",
};

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <header className="account-header">
        <Link href="/" aria-label="egzaminio — strona główna"><BrandLogo /></Link>
        <Link href="/" className="account-back">← Wróć na stronę</Link>
      </header>
      <article>
        <span className="section-kicker">Dokument roboczy MVP</span>
        <h1>Polityka prywatności egzaminio</h1>
        <p className="legal-lead">Ostatnia aktualizacja: 17 sierpnia 2026 r.</p>
        <div className="legal-alert"><b>Przed publicznym uruchomieniem</b><p>Ten dokument wymaga uzupełnienia o dane administratora, wybrany region Supabase, okresy retencji oraz przeglądu prawnego procesu zgody rodzica.</p></div>
        <h2>Jakie dane przetwarzamy</h2>
        <p>Na etapie konta są to: adres e-mail, nazwa wyświetlana, wybrana rola, identyfikator konta oraz techniczne informacje niezbędne do utrzymania bezpiecznej sesji. Dla konta ucznia zapisujemy również informację o potwierdzeniu zgody rodzica lub opiekuna.</p>
        <h2>Do czego używamy danych</h2>
        <p>Dane służą do logowania, wyświetlania właściwego panelu, zapisywania postępów, limitowania bezpłatnych pytań do AI oraz ochrony konta przed nieuprawnionym dostępem.</p>
        <h2>Logowanie zewnętrzne</h2>
        <p>Jeżeli wybierzesz Google lub Facebook, operator logowania przekaże Supabase podstawowe dane konta potrzebne do uwierzytelnienia. Nie publikujemy niczego w Twoim imieniu.</p>
        <h2>Konta uczniów</h2>
        <p>egzaminio jest projektowane dla osób niepełnoletnich, dlatego język komunikatów powinien być zrozumiały, zakres danych minimalny, a proces zgody opiekuna zweryfikowany przed publicznym startem produktu.</p>
        <h2>Twoje prawa</h2>
        <p>Możesz poprosić o dostęp do danych, ich poprawienie, usunięcie, ograniczenie przetwarzania albo wycofać zgodę, pisząc na <a href="mailto:kontakt@egzamin.io">kontakt@egzamin.io</a>.</p>
      </article>
    </main>
  );
}
