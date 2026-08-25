# Publikacja stron pojedynczych zadań CKE

Strony programatyczne są osobnym etapem po imporcie arkusza. Samo opublikowanie pytania w panelu ucznia nie dodaje go do Google.

## Stabilny adres

```text
/arkusze/{rok}/{przedmiot}/{termin}/{paper-id}/zadanie/{numer}
```

Adres zawiera rok, przedmiot, termin i stabilny identyfikator arkusza. Nie zależy od tytułu ani późniejszej korekty tekstu. Canonical powstaje po stronie bazy i jest unikalny.

## Bramka jakości

Funkcja `publish_cke_seo_page` przyjmuje wyłącznie zadanie z opublikowanego batcha CKE i wymaga:

- recenzji pytania oraz całego arkusza,
- oficjalnego źródła, stron źródłowych, klucza i kryteriów punktowania,
- rozwiązania krok po kroku o minimalnej kompletności,
- co najmniej jednego ręcznie sprawdzonego typowego błędu,
- powiązanego tematu i nazwiska lub identyfikatora recenzenta.

Sitemap pobiera wyłącznie wpisy, które przeszły tę bramkę i nadal należą do aktywnego, opublikowanego arkusza. Wycofanie arkusza automatycznie usuwa stronę z publicznego RPC, a awaria bazy nie tworzy placeholdera.

## Kolejność pilotażu

1. Zaimportuj jeden kompletny arkusz z ostatnich sześciu lat przez proces opisany w `docs/cke-import-process.md`.
2. Zweryfikuj każde zadanie z oryginałem oraz oficjalnymi zasadami oceniania.
3. Opublikuj arkusz do aplikacji.
4. Dla każdej wartościowej strony wywołaj `publish_cke_seo_page`; zadania bez pełnego rozwiązania pozostają poza indeksem.
5. Sprawdź próbkę ręcznie, zgłoś sitemap w Search Console i obserwuj indeksację przed drugim arkuszem.

Na dziś repozytorium nie zawiera kompletnego arkusza CKE. Dlatego mechanizm jest gotowy, ale żadna strona pojedynczego zadania nie trafia jeszcze do sitemap — zgodnie z ochroną przed thin content i fałszywym oznaczaniem danych demo jako CKE.
