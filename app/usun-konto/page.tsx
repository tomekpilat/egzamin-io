import type { Metadata } from "next";
import { LegalShell } from "@/components/legal-shell";

export const metadata: Metadata = {
  title: "Usunięcie konta i danych — egzaminio",
  description: "Jak usunąć konto egzaminio i dane powiązane z logowaniem e-mail lub Google.",
  robots: { index: false, follow: false },
};

export default function DeleteAccountPage() {
  return (
    <LegalShell currentPath="/usun-konto" title="Usunięcie konta i danych" description="Instrukcja dla kont e-mail i Google · 24 sierpnia 2026 r.">
      <div className="legal-alert"><b>Funkcja samoobsługowa jest w planie MVP</b><p>Do czasu dodania przycisku w ustawieniach obsługujemy żądania przez zweryfikowany adres e-mail. Nie wysyłaj hasła, numeru PESEL ani dokumentu tożsamości.</p></div>
      <section className="legal-section"><h2>Jak wysłać żądanie</h2><ol><li>Napisz z adresu przypisanego do konta na <a href="mailto:kontakt@egzamin.io?subject=Usuniecie%20konta%20egzaminio">kontakt@egzamin.io</a>.</li><li>W tytule wpisz „Usunięcie konta egzaminio”.</li><li>Podaj rolę konta: uczeń, rodzic albo nauczyciel. W przypadku dziecka żądanie może złożyć także połączony i zweryfikowany opiekun.</li><li>Potwierdzimy przyjęcie oraz poprosimy o minimalną weryfikację, jeżeli adres wiadomości nie wystarcza.</li></ol></section>
      <section className="legal-section"><h2>Co usuwamy</h2><p>Usuniemy aktywne konto, profil, powiązania rodzic–dziecko, postępy oraz rozmowy AI w zakresie, w jakim nie musimy zachować danych z obowiązku prawnego albo do ustalenia, dochodzenia lub obrony roszczeń. Dane w aktywnych systemach planujemy usunąć do 30 dni, a rotacyjne kopie zapasowe wygasną zgodnie z cyklem opisanym w polityce prywatności.</p></section>
      <section className="legal-section"><h2>Google</h2><p>Odłączenie egzaminio w ustawieniach Google zatrzymuje przyszły dostęp przez tego providera, ale nie zawsze usuwa konto zapisane w egzaminio. Aby usunąć dane z naszej bazy, wykonaj procedurę powyżej. Nie publikujemy treści w Twoim imieniu.</p></section>
      <section className="legal-section"><h2>Wycofanie zgody opiekuna</h2><p>Połączony rodzic może poprosić o wycofanie zgody na konto ucznia. Dostęp ucznia zostanie zablokowany, a dalszy los danych ustalimy zgodnie z żądaniem usunięcia i obowiązkami prawnymi administratora.</p></section>
    </LegalShell>
  );
}
