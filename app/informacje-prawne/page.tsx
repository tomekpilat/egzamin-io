import type { Metadata } from "next";
import { LegalShell } from "@/components/legal-shell";
import { LEGAL_UPDATED_LABEL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Informacje prawne — egzaminio",
  description: "Dokumenty prawne, prywatność i zasady bezpieczeństwa egzaminio.",
  robots: { index: false, follow: false },
};

const documents = [
  ["/polityka-prywatnosci", "Polityka prywatności", "Jakie dane zbieramy, po co, na jakiej podstawie i jak skorzystać ze swoich praw."],
  ["/regulamin", "Regulamin", "Zasady kont ucznia, rodzica, nauczyciela i administratora oraz korzystania z nauczyciela AI."],
  ["/polityka-cookies", "Cookies i pamięć urządzenia", "Niezbędna sesja oraz Google Analytics uruchamiane wyłącznie po dobrowolnej zgodzie."],
  ["/bezpieczenstwo-dzieci-ai", "Dzieci i AI", "Prostym językiem o błędach AI, zgodzie opiekuna, reklamach i bezpiecznych pytaniach."],
  ["/odstapienie-od-umowy", "Odstąpienie od umowy", "Informacja dla konsumenta, zasady zwrotu przez Stripe i wzór oświadczenia."],
  ["/usun-konto", "Usunięcie konta i danych", "Procedura dla kont e-mail i Google oraz zgód opiekuna."],
] as const;

export default function LegalHubPage() {
  return (
    <LegalShell currentPath="/informacje-prawne" title="Zasady, które da się zrozumieć" description={`Pakiet dokumentów egzaminio. Ostatnia aktualizacja: ${LEGAL_UPDATED_LABEL}`}>
      <div className="legal-alert legal-alert-critical">
        <b>Wersja przed konsultacją prawną</b>
        <p>Operatorem i administratorem danych jest Tomasz Piłat, a adresem kontaktowym <a href="mailto:kontakt@egzaminio.io">kontakt@egzaminio.io</a>. Przed publicznym uruchomieniem trzeba jeszcze uzupełnić adres i — jeżeli dotyczy — dane rejestrowe, a także potwierdzić dostawców, regiony przetwarzania i realne okresy retencji. Techniczny Checkout Stripe pozostaje wyłączony przełącznikiem środowiskowym do czasu zakończenia tej kontroli.</p>
      </div>
      <div className="legal-cards">
        {documents.map(([href, title, description]) => (
          <a href={href} key={href}><span>Dokument</span><h2>{title}</h2><p>{description}</p><b>Czytaj →</b></a>
        ))}
      </div>
      <section className="legal-section">
        <h2>Co trzeba uzupełnić przed publikacją</h2>
        <ul className="legal-checklist">
          <li>Dane administratora i usługodawcy: Tomasz Piłat i kontakt@egzaminio.io są uzupełnione; nadal trzeba dodać adres, kraj oraz — jeżeli dotyczy — NIP, REGON i dane rejestrowe.</li>
          <li>Faktyczny hosting, region Supabase, dostawca modelu AI, e-maili i płatności.</li>
          <li>Umowy powierzenia, podprocesorzy i mechanizmy transferów poza EOG.</li>
          <li>Prawna akceptacja wdrożonego procesu zgody: osobny e-mail, zablokowane konto ucznia i decyzja z zalogowanego konta rodzica.</li>
          <li>Retencja wdrożona technicznie: usuwanie rozmów, logów, kont i kopii zapasowych.</li>
          <li>Licencja i sposób oznaczania każdego materiału źródłowego CKE.</li>
          <li>Utworzenie w Stripe jednorazowej ceny 149 zł brutto, ustawienie danych i brandingu sprzedawcy, podatków, e-maili z potwierdzeniem i podpisanego webhooka produkcyjnego.</li>
          <li>Dokładna data końca dostępu, potwierdzenie umowy na trwałym nośniku, kwalifikacja świadczenia i proces odstąpienia zatwierdzone przez prawnika.</li>
          <li>Ocena skutków dla ochrony danych dzieci i ocena ryzyka funkcji AI.</li>
          <li>Akceptacja warunków Google Analytics, wyłączenie funkcji reklamowych i udokumentowanie ustawień retencji oraz udostępniania danych.</li>
        </ul>
      </section>
      <section className="legal-section legal-source-note">
        <h2>Podstawa przygotowania wersji roboczej</h2>
        <p>Dokumenty oparto na RODO, polskiej ustawie o świadczeniu usług drogą elektroniczną, Prawie komunikacji elektronicznej, ustawie o prawach konsumenta oraz obowiązujących od 2 sierpnia 2026 r. wymogach przejrzystości AI. To projekt operacyjny, nie opinia prawna.</p>
      </section>
    </LegalShell>
  );
}
