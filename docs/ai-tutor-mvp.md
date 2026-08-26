# Nauczyciel AI — wdrożenie MVP

## Co zostało zbudowane

Nauczyciel AI pojawia się dopiero po sprawdzeniu odpowiedzi ucznia. Rozmowa jest zawsze przypisana do jednego zadania i korzysta z zatwierdzonego opracowania, a nie z samej wiedzy modelu.

- plan Free: 3 udane pytania dziennie,
- pakiet Plus: 50 udanych pytań dziennie,
- limit jest rezerwowany atomowo w PostgreSQL, więc równoległe żądania go nie omijają,
- awaria lub timeout modelu zwalnia rezerwację i nie zużywa pytania,
- zapisujemy model, tokeny, szacowany koszt, czas odpowiedzi i status błędu,
- rodzic nie ma dostępu do treści prywatnej rozmowy dziecka,
- model nie otrzymuje e-maila, nazwy profilu, wyników ani surowego identyfikatora konta,
- oczywiste dane kontaktowe i treści alarmowe są zatrzymywane przed wywołaniem dostawcy.
- pytanie musi odnosić się do bieżącego zadania, odpowiedzi lub kroku rozwiązania; polecenia niezwiązane z zadaniem i próby prompt injection są odrzucane przed rezerwacją limitu i wywołaniem modelu,
- po 10 odrzuconych wiadomościach dziennie w planie Free lub 30 w Plus dalsze próby są blokowane do następnego dnia.

## Konfiguracja Coolify

W zasobie aplikacji dodaj jako sekrety runtime:

```text
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DEEPSEEK_API_KEY=sk-...
AI_USER_HASH_SECRET=<losowy sekret co najmniej 32 znaki>
```

Pozostałe wartości mają bezpieczne ustawienia domyślne, ale można je jawnie nadpisać:

```text
AI_PROVIDER_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-v4-flash
AI_TIMEOUT_MS=25000
AI_CACHE_HIT_USD_PER_MILLION=0.0028
AI_INPUT_USD_PER_MILLION=0.14
AI_OUTPUT_USD_PER_MILLION=0.28
```

`SUPABASE_SERVICE_ROLE_KEY`, `DEEPSEEK_API_KEY` i `AI_USER_HASH_SECRET` nie mogą być dostępne w kodzie przeglądarki, w logach ani jako zmienne publiczne. W Coolify ustaw je tylko dla runtime. Po dodaniu zmiennych wykonaj redeploy.

Przed deployem zastosuj migrację:

```bash
supabase db push
```

Bez klucza DeepSeek moduł pokazuje bezpieczny komunikat konfiguracyjny, a pytanie nie jest odliczane.

## Opracowania przed rozmową

Każde opracowanie ma wersję, model, datę, migawkę zatwierdzonego klucza oraz jeden ze statusów:

```text
generated → in_review → approved
                    ↘ rejected
approved → withdrawn
```

Format opracowania jest wspólny dla wszystkich przedmiotów:

1. `solution_steps` — co najmniej dwa krótkie kroki rozwiązania,
2. `hints` — co najmniej dwie podpowiedzi od ogólnej do bardziej konkretnej,
3. `final_explanation` — pełne wyjaśnienie po polsku,
4. `answer_key_snapshot` — klucz pobrany z bazy, którego model nie może zmienić.

Matematyka wymaga składni MathJax. Polski wymaga wskazania dowodu w tekście i nazwania zasady. Angielski jest wyjaśniany po polsku z krótkimi przykładami angielskimi.

Tworzenie roboczych opracowań:

```bash
npm run ai:generate -- --limit 10
npm run ai:generate -- --question demo-mat-01
```

Generator nigdy nie publikuje wyniku. Administrator musi przesłać wersję do recenzji i zatwierdzić ją funkcjami `review_ai_explanation`. Przy zatwierdzeniu baza ponownie porównuje migawkę klucza z aktualną poprawną odpowiedzią. Rozmowa AI nie uruchomi się bez statusu `approved`.

## Benchmark przed zwiększeniem ruchu

Benchmark bierze po 10 zadań z matematyki, polskiego i angielskiego, sprawdza zgodność odpowiedzi z kluczem oraz mierzy błędy, opóźnienie i koszt:

```bash
npm run ai:benchmark
AI_BENCHMARK_MODELS=deepseek-v4-flash,deepseek-v4-pro npm run ai:benchmark
```

Rekomendowany próg wejścia dla modelu produkcyjnego:

- minimum 90% zgodności na całej próbce,
- minimum 80% osobno dla każdego przedmiotu,
- mniej niż 2% błędów technicznych,
- mediana odpowiedzi poniżej 6 sekund,
- ręczna recenzja wszystkich 30 wyjaśnień przez nauczyciela.

## Monitoring i retencja

Administrator może odczytać dzienne agregaty funkcją `get_ai_usage_metrics(30)`. Zwracane są liczby udanych i błędnych wywołań, tokeny, szacowany koszt oraz średnie opóźnienie.

Próby użycia AI poza zakresem zadania są agregowane osobno przez `get_ai_scope_rejection_metrics(30)`. Treść odrzuconej wiadomości nie jest zapisywana w historii rozmowy ani przesyłana do dostawcy.

Funkcja `purge_expired_ai_chat_history(90)` usuwa rozmowy starsze niż 90 dni. Należy uruchamiać ją codziennie przez Supabase Cron albo zaufany harmonogram serwera.

## Warunek prawny przed produkcją

DeepSeek jest atrakcyjny kosztowo, ale jego polityka wskazuje przetwarzanie danych w Chinach i szczególne ograniczenia dotyczące danych dzieci. Modułu nie należy aktywować produkcyjnie przed potwierdzeniem przez prawnika umowy powierzenia, podstawy transferu poza EOG, retencji API, opt-out z treningu i oceny skutków. Dzięki warstwie providerowej model można zmienić bez przebudowy bazy i interfejsu.
