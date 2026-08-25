# Wybór modelu AI dla MVP

Stan cen: 25 sierpnia 2026 r. Ceny dostawców zmieniają się, dlatego konfiguracja kosztu znajduje się w zmiennych środowiskowych, a faktyczne zużycie jest rejestrowane dla każdego wywołania.

## Wybór startowy

Do kontrolowanego benchmarku wybrano `deepseek-v4-flash` w trybie bez rozszerzonego rozumowania. Oficjalny cennik DeepSeek podaje obecnie 0,14 USD za milion tokenów wejściowych bez trafienia w cache, 0,0028 USD z trafieniem oraz 0,28 USD za milion tokenów wyjściowych. Model obsługuje format zgodny z Chat Completions i kontekst 1M tokenów.

To wybór kosztowy, a nie ostateczna akceptacja prawna lub jakościowa. Starsze nazwy `deepseek-chat` i `deepseek-reasoner` zostały wycofane, dlatego aplikacja używa aktualnej nazwy `deepseek-v4-flash`.

Oficjalne źródła:

- [DeepSeek — Models & Pricing](https://api-docs.deepseek.com/quick_start/pricing)
- [DeepSeek — API quick start](https://api-docs.deepseek.com/)
- [DeepSeek — privacy policy](https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html)

## Szacunek kosztu

Konserwatywny przykład jednej odpowiedzi: 2000 tokenów wejścia bez cache i 500 tokenów wyjścia.

```text
wejście: 2 000 / 1 000 000 × 0,14 USD = 0,00028 USD
wyjście: 500 / 1 000 000 × 0,28 USD = 0,00014 USD
razem: 0,00042 USD
1000 odpowiedzi: około 0,42 USD
```

Przy pełnym wykorzystaniu 50 pytań dziennie przez cały rok daje to około 7,67 USD na aktywnego użytkownika Plus rocznie przed ewentualnym podwojeniem cen w godzinach szczytu, podatkami i innymi kosztami infrastruktury. Przy cenie 119 zł rocznie sam koszt modelu pozostawia zapas, ale rentowność trzeba oceniać łącznie z płatnościami, hostingiem, obsługą i podatkami.

## Co jeszcze trzeba zmierzyć

Repo zawiera powtarzalny benchmark 30 zadań. Bez produkcyjnego klucza API nie wpisujemy zmyślonego wyniku jakości. Po uruchomieniu należy zachować raport i decyzję nauczyciela dla każdej wersji modelu. Model może wejść do produkcji dopiero po osiągnięciu progów opisanych w instrukcji modułu.

Ze względu na dzieci i transfer danych rekomendowana jest równoległa ocena co najmniej jednego dostawcy oferującego odpowiedni region EOG, umowę powierzenia i jasne wyłączenie treningu. Warstwa serwerowa pozwala zmienić zgodny endpoint, klucz i nazwę modelu bez zmian w UI.
