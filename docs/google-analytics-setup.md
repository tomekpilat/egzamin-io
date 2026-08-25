# Konfiguracja Google Analytics 4 dla egzamin.io

Kod korzysta z podstawowego Consent Mode. Samo ustawienie identyfikatora nie omija banera: tag Google ładuje się dopiero po zgodzie. Brak identyfikatora całkowicie wyłącza GA4 i panel zgody.

## 1. Utwórz usługę GA4

1. Wejdź na [analytics.google.com](https://analytics.google.com/) i otwórz **Administracja**.
2. Utwórz osobne konto lub usługę dla `egzamin.io`. Ustaw strefę `Polska` i walutę `PLN`.
3. W **Zbieranie i modyfikowanie danych → Strumienie danych** dodaj strumień **Sieć**:
   - URL: `https://egzamin.io`
   - nazwa: `egzamin.io — produkcja`
4. Wyłącz **Pomiar zaawansowany**. Aplikacja wysyła własny, zamknięty słownik zdarzeń i nie potrzebuje automatycznego mierzenia scrollowania, wyszukiwania ani kliknięć wychodzących.
5. Skopiuj identyfikator pomiaru w formacie `G-XXXXXXXXXX`.

Nie twórz kontenera Google Tag Manager. Ten projekt ładuje bezpośrednio `gtag.js`, dzięki czemu zakres jest mniejszy i łatwiejszy do audytu.

## 2. Ustaw prywatność w GA4

Nazwy sekcji w panelu Google mogą nieznacznie zmieniać się językowo. W usłudze GA4 ustaw:

1. **Ustawienia danych → Przechowywanie danych**:
   - retencja danych użytkownika i zdarzeń: **2 miesiące**,
   - resetowanie okresu przy nowej aktywności: **wyłączone**.
2. **Zbieranie danych**:
   - Google Signals: **wyłączone**,
   - zbieranie danych dostarczonych przez użytkownika: **wyłączone**,
   - personalizacja reklam: **wyłączona**.
3. **Połączenia usług**:
   - nie łącz Google Ads, Search Ads, Display & Video ani Merchant Center,
   - nie twórz odbiorców remarketingowych.
4. Na poziomie konta, w **Ustawienia udostępniania danych**, wyłącz opcjonalne udostępnianie do produktów i usług Google, benchmarkingu, rekomendacji i wsparcia, o ile nie jest rzeczywiście potrzebne.
5. W strumieniu WWW pozostaw wyłączony pomiar zaawansowany. Nie dodawaj `user_id`, user properties, wymiarów zawierających role ani danych edukacyjnych.
6. W ustawieniach zbierania danych szczegółowych o lokalizacji i urządzeniu wyłącz je dla Polski (najbezpieczniej: dla wszystkich regionów).
7. W strumieniu WWW włącz redagowanie adresów e-mail i dodaj do redagowania parametrów URL co najmniej: `email`, `token`, `code`, `access_token`, `refresh_token`, `invite`. Kod już usuwa query string z analityki, ale to dodatkowe zabezpieczenie po stronie Google.
8. Zapoznaj się i zaakceptuj właściwe warunki Google Measurement / Google Analytics oraz zapisz w rejestrze dostawców datę akceptacji, podmiot Google Ireland Limited, ustawienia transferów i używane zabezpieczenia.

Kod dodatkowo wymusza: brak sygnałów Google, brak personalizacji reklam, reklamy i dane reklamowe zawsze `denied`, 90-dniowe cookies bez odnawiania i oczyszczony adres strony.

## 3. Dodaj identyfikator w Coolify

1. Otwórz projekt egzamin.io w Coolify.
2. Wejdź w aplikację → **Environment Variables**.
3. Dodaj:

```text
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

4. Ustaw zmienną dla środowiska produkcyjnego i zaznacz w Coolify opcję **Available at Buildtime** (lub **Build Variable**, zależnie od wersji). Nie oznaczaj jej jako sekretu — Measurement ID jest publicznym identyfikatorem widocznym w przeglądarce.
5. Zapisz i wykonaj pełny **Redeploy**. Sam restart nie wystarczy, ponieważ zmienne `NEXT_PUBLIC_*` są wbudowywane podczas budowania aplikacji.

Usunięcie zmiennej i ponowny build całkowicie wyłącza tag oraz baner.

## 4. Sprawdź wdrożenie

Test wykonaj w nowym oknie incognito:

1. Przed wyborem w banerze otwórz DevTools → **Network** i filtruj `google`, `gtag`, `collect` oraz `analytics`.
   - nie może być żądania do `googletagmanager.com` ani `google-analytics.com`,
   - w Application → Cookies nie może być `_ga` ani `_ga_*`.
2. Kliknij **Odrzucam opcjonalne** i odśwież stronę. Nadal nie może być requestów ani cookies GA.
3. Wyczyść dane witryny, otwórz stronę ponownie i kliknij **Akceptuję**.
   - powinien załadować się `gtag/js?id=G-...`,
   - powinny pojawić się `_ga` i `_ga_<id>`,
   - w raporcie **Czas rzeczywisty** pojawi się odsłona.
4. Kliknij stały przycisk **Ustawienia prywatności**, wyłącz analitykę i zapisz. Strona przeładuje się, cookies GA zostaną usunięte, a kolejne requesty nie powinny być wysyłane.
5. Uruchom Google Tag Assistant i potwierdź poprawny stan Consent Mode. Sprawdź, że adresy wysyłane do GA nie zawierają query stringów, tokenów ani identyfikatorów rekordów.

## 5. Zdarzenia MVP

Kod dopuszcza wyłącznie:

- `page_view`
- `signup_started`
- `signup_completed`
- `login_completed`
- `practice_started`
- `answer_checked`
- `plan_plus_viewed`
- `plan_plus_cta_clicked`

Po pojawieniu się zdarzeń możesz oznaczyć `signup_completed` jako **kluczowe zdarzenie** w GA4. Nie dodawaj parametrów zawierających odpowiedź, poprawność, wynik, temat zadania, szkołę, rolę, e-mail lub identyfikator użytkownika.

Przed uruchomieniem produkcyjnym dokumenty i konfigurację powinien zatwierdzić prawnik, zwłaszcza ze względu na użytkowników niepełnoletnich i transfery danych przez Google.
