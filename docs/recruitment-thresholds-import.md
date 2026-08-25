# Import progów rekrutacyjnych

Kalkulator nie publikuje progu bez źródła i ręcznej weryfikacji. Tabele z migracji `20260826120000_marketing_and_recruitment_thresholds.sql` oddzielają szkołę, zestaw źródłowy i próg konkretnego oddziału.

## Minimalny plik wejściowy

```csv
city,school_name,school_type,official_identifier,class_name,class_code,profile_subjects,threshold_points,recruitment_year,source_label,source_url,retrieved_at,verified_at,verified_by
```

- `school_type`: `liceum` albo `technikum`.
- `profile_subjects`: tablica JSON, np. `["biologia","chemia"]`.
- `threshold_points`: liczba od 0 do 200 dla ostatniej przyjętej osoby; nie średnia i nie przewidywany próg.
- `source_url`: bezpośredni adres publicznego wyniku lub dokumentu.
- `verified_at` i `verified_by`: ślad ręcznej kontroli.

## Bezpieczny proces

1. Zapisz osobny dataset dla miasta, roku i źródła. Zachowaj adres, datę pobrania i informację o prawie do ponownego wykorzystania danych.
2. Znormalizuj szkoły po oficjalnym identyfikatorze, a oddziały po kodzie i nazwie. Nie łącz automatycznie klas o podobnych nazwach.
3. Zaimportuj dataset jako nieopublikowany (`is_published = false`).
4. Porównaj próbkę z dokumentem źródłowym, sprawdź zakres 0–200, duplikaty szkoła–oddział–rok i przedmioty profilowe.
5. Ustaw `verified_at`, `verified_by` i dopiero potem publikację progu oraz datasetu. Publiczne RPC zwraca wyłącznie rekordy spełniające oba warunki publikacji.
6. Po korekcie nie nadpisuj pochodzenia danych. Utwórz nowy dataset albo zapisz zmianę w dzienniku importu.

Samo publiczne wyświetlenie danych przez system naborowy nie zawsze przesądza o prawie do masowego pobrania lub ponownej publikacji. Przed automatyzacją należy sprawdzić regulamin źródła, podstawę ponownego wykorzystania i zakres licencji.
