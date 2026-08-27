# Stripe Checkout dla Pakietu Plus

Integracja obsługuje jednorazowy zakup Pakietu Plus za 149 zł przez rodzica dla konkretnego, połączonego konta ucznia. Nie jest to subskrypcja i nic nie odnawia się automatycznie. Aplikacja używa hostowanego Stripe Checkout, a dostęp aktywuje wyłącznie zweryfikowany webhook.

## Blokady bezpieczeństwa przed startem

Sprzedaż jest domyślnie wyłączona przez `PAYMENTS_ENABLED=false`. Nie włączaj jej, dopóki:

- nie uzupełnisz danych usługodawcy i administratora w dokumentach prawnych;
- prawnik nie zatwierdzi regulaminu, procesu odstąpienia i kwalifikacji Pakietu Plus;
- księgowy nie potwierdzi podatku, ceny brutto oraz wymaganych danych dokumentu sprzedaży;
- wiadomość e-mail po zakupie nie zostanie przetestowana jako potwierdzenie umowy na trwałym nośniku;
- produkcyjny webhook nie przejdzie testów płatności, zwrotu, ponowienia i duplikatu zdarzenia.

## 1. Konto, dane sprzedawcy i branding Stripe

1. W Stripe przełącz się najpierw na **Test mode**.
2. Uzupełnij **Business → Business details**, publiczne dane firmy, adres, stronę `https://egzamin.io`, e-mail `kontakt@egzamin.io` i nazwę widoczną na wyciągu.
3. W **Branding** dodaj logo egzaminio, kolor marki i ikonę.
4. Uzupełnij dane podatkowe i wypłaty. Jeżeli używasz Stripe Tax, najpierw potwierdź obowiązek rejestracji z księgowym.
5. Włącz e-maile do klientów o udanych płatnościach i zwrotach. Zrób test rzeczywistego wyglądu wiadomości, nazwy nadawcy, języka oraz danych sprzedawcy.

## 2. Jednorazowy produkt i cena

W **Product catalog** utwórz:

- nazwa: `Pakiet Plus egzaminio`;
- model ceny: **One time**;
- kwota: dokładnie **149,00 PLN**;
- identyfikator ceny zaczynający się od `price_`.

Integracja celowo odrzuci inną walutę, cenę cykliczną, nieaktywną cenę albo kwotę inną niż 14900 groszy. Jeżeli włączasz `STRIPE_AUTOMATIC_TAX=true`, cena w Stripe musi być skonfigurowana jako zawierająca podatek, aby konsument nadal płacił łącznie 149 zł. Potwierdź to testowym Checkoutem.

## 3. Migracja Supabase

Przed wdrożeniem aplikacji zastosuj migrację:

```bash
supabase link --project-ref TWOJ_PROJECT_REF
supabase db push
```

Migracja tworzy chronioną historię zamówień, rejestr przetworzonych webhooków, funkcje dla panelu rodzica i źródło uprawnienia Stripe. Tabele nie są bezpośrednio dostępne dla zalogowanej przeglądarki; historia jest zwracana przez ograniczoną funkcję bazy.

## 4. Endpoint webhooka

W Stripe Workbench otwórz **Webhooks → Add destination**, wybierz zdarzenia z własnego konta i URL:

```text
https://egzamin.io/api/payments/webhook
```

Subskrybuj dokładnie:

```text
checkout.session.completed
checkout.session.async_payment_succeeded
checkout.session.async_payment_failed
checkout.session.expired
refund.created
refund.updated
refund.failed
charge.dispute.created
charge.dispute.closed
invoice.paid
```

Skopiuj **Signing secret** zaczynający się od `whsec_`. To nie jest klucz API. Endpoint wymaga niezmienionego, surowego body i podpisu Stripe; błędy przetwarzania zwracają kod 500, aby Stripe ponowił zdarzenie. Zdarzenia są idempotentne i mogą przyjść poza kolejnością.

## 5. Zmienne w Coolify

W zasobie aplikacji dodaj jako sekrety runtime:

```text
APP_URL=https://egzamin.io
PLUS_ACCESS_UNTIL=2027-07-31T21:59:59Z
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID_PLUS=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_AUTOMATIC_TAX=false
PAYMENTS_ENABLED=false
```

`PLUS_ACCESS_UNTIL` jest dokładną datą końca dostępu dla wszystkich nowych zamówień i zostaje zapisana jako snapshot. Przykład oznacza 31 lipca 2027 r., 23:59:59 czasu polskiego. Ustaw właściwy termin dla sprzedawanego rocznika.

Nigdy nie dodawaj prefiksu `NEXT_PUBLIC_` do sekretów Stripe. Po zmianie wartości wykonaj **Redeploy**, nie tylko restart.

## 6. Test przed uruchomieniem

1. Zaloguj się jako rodzic i połącz testowe konto ucznia.
2. Otwórz **Panel → Płatności**. Sprawdź ucznia, cenę, datę końca oraz dwa niezaznaczone domyślnie potwierdzenia.
3. Upewnij się, że przycisk brzmi „Zamawiam pakiet Plus — płacę 149 zł”.
4. Tymczasowo ustaw testowe klucze i `PAYMENTS_ENABLED=true`, wykonaj redeploy.
5. Zrealizuj udaną płatność testową. Sprawdź stronę powrotu, dostęp Plus, historię, potwierdzenie i fakturę.
6. Ponów `checkout.session.completed` w Stripe. Dostęp i historia nie mogą się zdublować.
7. Wykonaj częściowy i pełny zwrot. Historia i uprawnienie muszą zaktualizować się po webhooku.
8. Zamknij Checkout bez płatności i sprawdź komunikat anulowania.
9. Sprawdź nieudaną/asynchroniczną płatność oraz wygasłą sesję.
10. Wyłącz webhook lub podaj błędny sekret w środowisku testowym: strona sukcesu nie może sama aktywować planu.
11. Sprawdź wiadomość e-mail, polski język, dane firmy, zakres, cenę, datę dostępu, regulamin i informację o odstąpieniu. Jeżeli Stripe nie przekazuje wszystkich wymaganych informacji, przed startem dołącz osobny system e-maili transakcyjnych.

Po teście wróć do `PAYMENTS_ENABLED=false`.

## 7. Przejście na tryb live

1. Powtórz produkt/cenę w trybie live — testowy `price_` nie działa z live `sk_`.
2. Utwórz osobny live webhook i skopiuj jego nowy `whsec_`.
3. Podmień w Coolify `sk_test_`, testowy `price_` i testowy `whsec_` na wartości live.
4. Sprawdź ponownie datę `PLUS_ACCESS_UNTIL` i konfigurację podatku.
5. Dopiero po podpisaniu checklisty prawnej ustaw `PAYMENTS_ENABLED=true` i wykonaj redeploy.
6. Zrób zakup kontrolny małą rzeczywistą kartą, zwrot i kontrolę historii.

## 8. Codzienna obsługa i awarie

- Stripe jest źródłem prawdy dla stanu płatności; powrót użytkownika z Checkout nie jest dowodem zapłaty.
- Zwrot wykonuj w Stripe. Webhook automatycznie aktualizuje historię i dostęp.
- Przy błędzie sprawdź **Workbench → Webhooks → Event deliveries**, logi aplikacji i zamówienie w panelu rodzica.
- Po naprawie użyj **Retry** dla niedostarczonego zdarzenia. Nie edytuj statusu zamówienia ręcznie.
- W razie incydentu ustaw natychmiast `PAYMENTS_ENABLED=false` i wykonaj redeploy. Historia oraz webhook pozostaną dostępne.
- Obserwuj zdarzenia `charge.dispute.*`; spór może wyłączyć uprawnienie do czasu rozstrzygnięcia.

Dokumentacja źródłowa: [Stripe Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment), [podpisy webhooków](https://docs.stripe.com/webhooks), [potwierdzenia](https://docs.stripe.com/receipts), [zwroty](https://docs.stripe.com/refunds) i [Stripe Tax w Checkout](https://docs.stripe.com/tax/checkout).
