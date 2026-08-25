/* eslint-disable @next/next/no-html-link-for-pages -- Full-page anchors avoid a Vinext production navigation failure. */

import type { Metadata } from "next";
import { LegalShell } from "@/components/legal-shell";
import { LEGAL_UPDATED_LABEL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Polityka prywatności — egzaminio",
  description: "Jak egzaminio przetwarza dane uczniów, rodziców i nauczycieli.",
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  return (
    <LegalShell currentPath="/polityka-prywatnosci" title="Polityka prywatności" description={`Wersja robocza · ostatnia aktualizacja: ${LEGAL_UPDATED_LABEL}`}>
      <div className="legal-alert legal-alert-critical">
        <b>Uzupełnij przed publicznym uruchomieniem</b>
        <p>Administratorem będzie: <mark>[NAZWA / IMIĘ I NAZWISKO, ADRES, KRAJ, DANE REJESTROWE]</mark>. Kontakt: <a href="mailto:kontakt@egzamin.io">kontakt@egzamin.io</a>. Jeżeli administrator jest poza EOG i oferuje usługę osobom w Polsce, prawnik powinien zweryfikować obowiązek wyznaczenia przedstawiciela w UE.</p>
      </div>

      <nav className="legal-toc" aria-label="Spis treści">
        <b>Na tej stronie</b><a href="#administrator">Administrator</a><a href="#dane">Dane i źródła</a><a href="#cele">Cele i podstawy</a><a href="#dzieci">Dzieci i rodzice</a><a href="#ai">Nauczyciel AI</a><a href="#feedback">Feedback</a><a href="#newsletter">Alerty i lista Plus</a><a href="#odbiorcy">Dostawcy i transfery</a><a href="#retencja">Jak długo przechowujemy</a><a href="#prawa">Twoje prawa</a>
      </nav>

      <section className="legal-section" id="administrator">
        <h2>1. Kto odpowiada za dane</h2>
        <p>Administratorem danych osobowych użytkowników egzaminio jest podmiot wskazany powyżej. To on decyduje, po co i jak przetwarzane są dane. W sprawach prywatności, usunięcia konta lub wycofania zgody napisz na <a href="mailto:kontakt@egzamin.io">kontakt@egzamin.io</a>. Inspektor ochrony danych: <mark>[NIE WYZNACZONO / UZUPEŁNIJ KONTAKT]</mark>.</p>
      </section>

      <section className="legal-section" id="dane">
        <h2>2. Jakie dane przetwarzamy i skąd je mamy</h2>
        <div className="legal-table-wrap"><table>
          <thead><tr><th>Obszar</th><th>Przykładowe dane</th><th>Źródło</th></tr></thead>
          <tbody>
            <tr><td>Konto i logowanie</td><td>E-mail, nazwa wyświetlana, identyfikator konta, dostawca logowania, znaczniki czasu, rola</td><td>Od Ciebie lub z Google/Facebook po wybraniu logowania społecznościowego</td></tr>
            <tr><td>Konto ucznia</td><td>Wybrana rola, informacja i dowód zgody/upoważnienia opiekuna, powiązanie z kontem rodzica</td><td>Od ucznia i opiekuna</td></tr>
            <tr><td>Nauka</td><td>Odpowiedzi, wyniki, czas pracy, tematy, postęp, limity pytań</td><td>Z aktywności w usłudze</td></tr>
            <tr><td>Rozmowy z AI</td><td>Treść pytania, kontekst zadania, odpowiedź modelu, liczba tokenów, szacowany koszt i czas odpowiedzi</td><td>Od użytkownika, aplikacji i dostawcy modelu</td></tr>
            <tr><td>Rodzic i nauczyciel</td><td>Zaproszenia, powiązania kont, grupy, zestawy i raporty postępów</td><td>Od użytkowników i z ich aktywności</td></tr>
            <tr><td>Płatności</td><td>Plan, status płatności, identyfikator transakcji, dane do dokumentu sprzedaży; bez pełnych danych karty</td><td>Od użytkownika i operatora płatności po uruchomieniu planu płatnego</td></tr>
            <tr><td>Bezpieczeństwo</td><td>Adres IP, typ urządzenia i przeglądarki, zdarzenia logowania, błędy, identyfikatory sesji</td><td>Automatycznie z urządzenia i infrastruktury</td></tr>
            <tr><td>Feedback w aplikacji</td><td>Kategoria, opcjonalna ocena, treść opinii, rola konta, bieżący ekran i identyfikator zadania; adres e-mail tylko po zgodzie na kontakt</td><td>Od użytkownika i z kontekstu bieżącego ekranu</td></tr>
            <tr><td>Alerty rekrutacyjne i lista Plus</td><td>Adres e-mail, typ zapisu, wskazana szkoła lub klasa i rok rekrutacji, dokładna treść i wersja zgody, czas i źródło zapisu oraz status wypisu</td><td>Od osoby wypełniającej osobny formularz</td></tr>
            <tr><td>Kontakt</td><td>Treść wiadomości, adres kontaktowy, historia rozwiązania sprawy</td><td>Od osoby kontaktującej się</td></tr>
          </tbody>
        </table></div>
        <p>Nie prosimy o dane szczególnej kategorii, numery PESEL, adres domowy ucznia ani informacje medyczne. Nie wpisuj ich do rozmowy z AI. Jeżeli trafią tam przypadkowo, mogą zostać usunięte lub zanonimizowane.</p>
      </section>

      <section className="legal-section" id="cele">
        <h2>3. Po co i na jakiej podstawie</h2>
        <div className="legal-table-wrap"><table>
          <thead><tr><th>Cel</th><th>Podstawa</th></tr></thead>
          <tbody>
            <tr><td>Utworzenie konta, logowanie, ćwiczenia, zapis postępu i obsługa AI</td><td>Niezbędność do wykonania umowy lub działań przed jej zawarciem — art. 6 ust. 1 lit. b RODO</td></tr>
            <tr><td>Rozliczenia, rachunkowość, obowiązki konsumenckie i odpowiedzi organom</td><td>Obowiązek prawny — art. 6 ust. 1 lit. c RODO</td></tr>
            <tr><td>Bezpieczeństwo, zapobieganie nadużyciom, diagnostyka, obrona roszczeń i podstawowe statystyki usługi</td><td>Prawnie uzasadniony interes — art. 6 ust. 1 lit. f RODO, po teście równowagi uwzględniającym szczególną ochronę dzieci</td></tr>
            <tr><td>Przyjmowanie i analiza feedbacku, naprawa błędów oraz rozwój aplikacji</td><td>Prawnie uzasadniony interes w ulepszaniu i zabezpieczaniu usługi — art. 6 ust. 1 lit. f RODO; kontakt zwrotny następuje wyłącznie po dobrowolnej zgodzie — art. 6 ust. 1 lit. a RODO</td></tr>
            <tr><td>Wysyłanie zamówionego alertu o progach oraz informacji o starcie i ofercie Plus</td><td>Dobrowolna zgoda — art. 6 ust. 1 lit. a RODO oraz zgoda na przesyłanie informacji handlowej/marketingu zgodnie z art. 398 Prawa komunikacji elektronicznej</td></tr>
            <tr><td>Opcjonalna analityka, personalizacja marketingowa lub newsletter</td><td>Zgoda — art. 6 ust. 1 lit. a RODO; dla zapisu/odczytu na urządzeniu również zgoda, jeżeli jest wymagana</td></tr>
            <tr><td>Usługa dla dziecka, gdy jej podstawą jest zgoda</td><td>Zgoda dziecka lub opiekuna zgodnie z właściwym progiem wieku i art. 8 RODO; przed startem publicznym wdrożymy rozsądną weryfikację opiekuna</td></tr>
          </tbody>
        </table></div>
        <p>Podanie danych konta jest dobrowolne, ale bez e-maila lub zewnętrznego identyfikatora nie utworzymy konta. Dane oznaczone jako opcjonalne nie wpływają na dostęp do podstawowej usługi. Zgodę można wycofać równie łatwo, jak została udzielona.</p>
      </section>

      <section className="legal-section" id="dzieci">
        <h2>4. Konta dzieci i rola rodzica</h2>
        <p>Usługa jest projektowana dla ósmoklasistów, dlatego stosujemy minimalizację danych, komunikaty zrozumiałe dla dziecka i ustawienia zapewniające wysoki poziom prywatności. Uczeń nie może sam oświadczyć zgody za rodzica: podaje osobny adres opiekuna, konto pozostaje zablokowane, a rodzic zatwierdza prośbę po zalogowaniu na własne konto. Zapisujemy datę, konto zatwierdzające i powiązanie rodzic–dziecko. Przed publicznym startem prawnik powinien potwierdzić, czy ten poziom weryfikacji jest wystarczający dla ostatecznego modelu usługi.</p>
        <ul>
          <li>Rodzic zobaczy po połączeniu konta postęp, regularność i obszary do powtórki.</li>
          <li>Treść prywatnych rozmów ucznia z AI nie będzie domyślnie wyświetlana rodzicowi, chyba że wymaga tego bezpieczeństwo, prawo lub uczeń sam ją udostępni.</li>
          <li>Nie kierujemy do dzieci reklam opartych na profilowaniu ani bezpośrednich wezwań do zakupu lub namawiania rodzica na zakup.</li>
          <li>Opiekun może wycofać zgodę i poprosić o usunięcie konta dziecka zgodnie z procedurą <a href="/usun-konto">usunięcia konta i danych</a>.</li>
        </ul>
        <p>Więcej wyjaśniamy na stronie <a href="/bezpieczenstwo-dzieci-ai">Dzieci i AI</a>.</p>
      </section>

      <section className="legal-section" id="ai">
        <h2>5. Jak działa nauczyciel AI</h2>
        <p>Użytkownik jest wyraźnie informowany, że rozmawia z systemem sztucznej inteligencji, a nie z człowiekiem. W pierwszym wdrożeniu planowanym dostawcą API jest <b>Hangzhou DeepSeek Artificial Intelligence Co., Ltd.</b>, a domyślnym modelem <b>DeepSeek V4 Flash</b>. Do modelu wysyłamy aktualne zadanie, zatwierdzone opracowanie, bieżące pytanie i maksymalnie osiem ostatnich wiadomości dotyczących tego zadania. Nie wysyłamy e-maila, nazwy profilu, wyników ani identyfikatora konta; techniczny identyfikator izolujący pamięć podręczną jest pseudonimizowany jednokierunkowo.</p>
        <p>Formularz blokuje oczywiste adresy e-mail, numery telefonów, PESEL, linki i zwroty wskazujące na adres lub szkołę, ale filtr nie daje stuprocentowej gwarancji. Użytkownik nie powinien wpisywać żadnych danych osobowych. Odpowiedzi mogą zawierać błędy. Nie gwarantujemy wyniku egzaminu i zachęcamy do sprawdzenia odpowiedzi w materiale źródłowym lub z nauczycielem.</p>
        <p>Profil nauki może dopasowywać kolejność ćwiczeń i podpowiedzi, ale MVP nie podejmuje wyłącznie automatycznych decyzji wywołujących skutki prawne lub podobnie istotnie wpływających na użytkownika. Jeżeli taka funkcja powstanie, polityka i mechanizm kontroli człowieka zostaną zaktualizowane przed jej użyciem.</p>
      </section>

      <section className="legal-section" id="feedback">
        <h2>6. Opinie i zgłoszenia z aplikacji</h2>
        <p>Formularz feedbacku jest opcjonalny. Do zgłoszenia zapisujemy jego kategorię, treść, opcjonalną ocenę, rolę konta, ścieżkę strony i nazwę bieżącego ekranu. Gdy zgłoszenie dotyczy konkretnego zadania, możemy dołączyć jego identyfikator i arkusz źródłowy. Nie dołączamy odpowiedzi ucznia ani treści prywatnych rozmów z AI.</p>
        <p>Adres e-mail zapisujemy tylko wtedy, gdy użytkownik zaznaczy zgodę na kontakt w sprawie zgłoszenia. Zgodę można wycofać przez wiadomość na <a href="mailto:kontakt@egzamin.io">kontakt@egzamin.io</a>; nie wpływa to na wcześniejsze, zgodne z prawem przetwarzanie. Dla ochrony usługi ograniczamy formularz do 3 zgłoszeń w ciągu 10 minut na konto.</p>
      </section>

      <section className="legal-section" id="newsletter">
        <h2>7. Alerty rekrutacyjne i lista oczekujących Plus</h2>
        <p>Zapis nie wymaga konta i jest niezależny od użycia kalkulatora. Adres e-mail zapisujemy dopiero po zaznaczeniu osobnej, niewymuszonej zgody. Przy alercie rekrutacyjnym zapisujemy również nazwę szkoły lub klasy i rok, aby wysłać informację odpowiadającą prośbie. Nie zapisujemy ocen, procentów ani wyniku wpisanego do kalkulatora.</p>
        <p>Każda wiadomość wysłana z tych list powinna zawierać indywidualny link rezygnacji prowadzący do strony <a href="/wypisz">wypisu</a>. Zgodę można wycofać jednym kliknięciem lub przez wiadomość na <a href="mailto:kontakt@egzamin.io">kontakt@egzamin.io</a>. Wycofanie nie wpływa na zgodność wcześniejszego przetwarzania i nie ogranicza korzystania z bezpłatnego kalkulatora ani konta.</p>
      </section>

      <section className="legal-section" id="odbiorcy">
        <h2>8. Komu powierzamy dane</h2>
        <p>Dostęp otrzymują tylko podmioty potrzebne do działania usługi i osoby upoważnione:</p>
        <ul>
          <li><b>Supabase</b> — uwierzytelnianie i baza danych; <mark>[UZUPEŁNIJ REGION PROJEKTU I DPA]</mark>.</li>
          <li><b>Google i Meta</b> — wyłącznie gdy użytkownik wybierze odpowiednie logowanie; dostawca przetwarza też dane według własnych zasad.</li>
          <li><b>Hosting i kopie zapasowe</b> — <mark>[UZUPEŁNIJ FAKTYCZNEGO DOSTAWCĘ, LOKALIZACJĘ I PODPROCESORÓW; Coolify jest oprogramowaniem, nie nazwą hostingu]</mark>.</li>
          <li><b>DeepSeek</b> — planowany dostawca modelu DeepSeek V4 Flash. Według polityki dostawcy dane mogą być przetwarzane w Chińskiej Republice Ludowej. <mark>Przed włączeniem produkcyjnym trzeba potwierdzić umowę powierzenia, podstawę transferu poza EOG, ocenę skutków transferu, retencję API oraz skuteczne wyłączenie używania treści do trenowania.</mark></li>
          <li><b>E-mail, płatności, obsługa i analityka</b> — <mark>[UZUPEŁNIJ PRZED WŁĄCZENIEM KAŻDEJ USŁUGI]</mark>.</li>
          <li>Organy publiczne — tylko gdy wymaga tego prawo.</li>
        </ul>
        <p>DeepSeek wskazuje, że bezpośrednio przetwarza i przechowuje dane w Chińskiej Republice Ludowej. Samo usunięcie identyfikatorów nie zastępuje wymaganej oceny prawnej transferu. Moduł AI nie powinien zostać włączony dla użytkowników produkcyjnych do czasu udokumentowania właściwego mechanizmu z rozdziału V RODO, warunków powierzenia i oceny ryzyka albo wyboru dostawcy zapewniającego akceptowalny region i warunki.</p>
      </section>

      <section className="legal-section" id="retencja">
        <h2>9. Jak długo przechowujemy dane</h2>
        <p>Poniższe okresy są rekomendacją MVP i muszą zostać wdrożone technicznie oraz potwierdzone po wyborze infrastruktury:</p>
        <div className="legal-table-wrap"><table>
          <thead><tr><th>Dane</th><th>Planowany okres</th></tr></thead>
          <tbody>
            <tr><td>Konto, profil i postęp</td><td>Do usunięcia konta lub zakończenia umowy, następnie do 30 dni w systemach aktywnych i do 90 dni w rotacyjnych kopiach zapasowych</td></tr>
            <tr><td>Surowa treść rozmów z AI</td><td>90 dni, chyba że użytkownik usunie ją wcześniej, dłuższe zachowanie jest potrzebne do zgłoszenia lub prawo wymaga inaczej</td></tr>
            <tr><td>Zanonimizowane statystyki nauki</td><td>Bezterminowo, jeżeli nie pozwalają już zidentyfikować osoby</td></tr>
            <tr><td>Logi bezpieczeństwa</td><td>12 miesięcy, dłużej wyłącznie dla konkretnego incydentu lub roszczenia</td></tr>
            <tr><td>Feedback z aplikacji</td><td>24 miesiące od zamknięcia zgłoszenia, krócej po skutecznym żądaniu usunięcia, chyba że dane są potrzebne do obrony roszczeń</td></tr>
            <tr><td>Alert rekrutacyjny i lista Plus</td><td>Alert do 31 sierpnia danego roku rekrutacji, a lista Plus do 12 miesięcy po starcie sprzedaży — zawsze krócej po wycofaniu zgody; minimalny dowód zgody lub wypisu może być przechowywany przez okres potrzebny do wykazania zgodności lub obrony roszczeń</td></tr>
            <tr><td>Kontakt i reklamacje</td><td>24 miesiące od zamknięcia sprawy lub przez okres dochodzenia/obrony roszczeń</td></tr>
            <tr><td>Zgody i ich wycofanie</td><td>Przez czas korzystania z podstawy zgody i okres niezbędny do wykazania zgodności lub obrony roszczeń</td></tr>
            <tr><td>Dokumenty rozliczeniowe</td><td>Przez okres wymagany przez przepisy podatkowe i rachunkowe właściwe dla operatora</td></tr>
          </tbody>
        </table></div>
      </section>

      <section className="legal-section" id="prawa">
        <h2>10. Twoje prawa</h2>
        <p>W zależności od podstawy i sytuacji możesz żądać:</p>
        <ul><li>dostępu do danych i ich kopii,</li><li>sprostowania danych,</li><li>usunięcia danych lub ograniczenia przetwarzania,</li><li>przeniesienia danych dostarczonych na podstawie zgody lub umowy,</li><li>sprzeciwu wobec przetwarzania opartego na prawnie uzasadnionym interesie,</li><li>wycofania zgody bez wpływu na zgodność wcześniejszego przetwarzania.</li></ul>
        <p>Napisz na <a href="mailto:kontakt@egzamin.io">kontakt@egzamin.io</a>. Możemy poprosić o rozsądną weryfikację tożsamości. Odpowiemy co do zasady w ciągu miesiąca. Masz też prawo złożyć skargę do <a href="https://uodo.gov.pl/pl/p/skargi" target="_blank" rel="noreferrer">Prezesa Urzędu Ochrony Danych Osobowych</a> lub właściwego organu w swoim kraju.</p>
      </section>

      <section className="legal-section">
        <h2>11. Bezpieczeństwo i zmiany dokumentu</h2>
        <p>Stosujemy kontrolę dostępu opartą na rolach, polityki dostępu do wierszy bazy, szyfrowane połączenia, ograniczone klucze aplikacji, kopie zapasowe i rejestrowanie zdarzeń. Żaden system nie daje jednak absolutnego bezpieczeństwa. Incydenty oceniamy i zgłaszamy osobom lub organowi, gdy wymaga tego prawo.</p>
        <p>O istotnej zmianie poinformujemy w aplikacji lub e-mailem z wyprzedzeniem właściwym do jej wpływu. Gdy zmieni się cel oparty na zgodzie albo warunki umowy, poprosimy o nową zgodę lub akceptację, jeżeli będzie to wymagane.</p>
      </section>

      <section className="legal-section legal-source-note">
        <h2>Oficjalne źródła</h2>
        <p><a href="https://eur-lex.europa.eu/eli/reg/2016/679/oj" target="_blank" rel="noreferrer">RODO — EUR-Lex</a>, <a href="https://eli.gov.pl/api/acts/DU/2024/1221/text.html" target="_blank" rel="noreferrer">Prawo komunikacji elektronicznej — art. 398</a>, <a href="https://uodo.gov.pl/pl/701/4467" target="_blank" rel="noreferrer">UODO o wycofaniu zgody</a>, <a href="https://uodo.gov.pl/pl/493/2261" target="_blank" rel="noreferrer">prawa dzieci według UODO</a> i <a href="https://digital-strategy.ec.europa.eu/en/policies/guidelines-transparency-ai-generated-content" target="_blank" rel="noreferrer">przejrzystość AI — Komisja Europejska</a>.</p>
      </section>
    </LegalShell>
  );
}
