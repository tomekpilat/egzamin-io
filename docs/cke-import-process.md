# Ręczny import arkuszy CKE

Ten proces przyjmuje ręcznie przepisany i sprawdzony manifest JSON. Sam importer nie wykonuje OCR i nigdy nie publikuje materiału automatycznie. Oficjalne pliki źródłowe można pobrać osobnym, kontrolowanym narzędziem `scripts/cke-download-sources.mjs`.

## Założenie prawne

Operator egzaminio potwierdził, że posiada zgodę CKE na wykorzystanie materiałów. Każdy manifest mimo to musi zawierać:

- `permission.reference` — numer, nazwę albo wewnętrzną lokalizację zgody,
- `permission.verified_by` — osobę, która sprawdziła zakres zgody,
- `permission.verified_at` — datę weryfikacji.

Jeżeli sama zgoda zawiera dane osobowe, przechowuj ją poza repozytorium. W manifeście zapisuj wyłącznie bezpieczną referencję. CKE jest podmiotem przygotowującym materiały egzaminacyjne, a ponowne wykorzystywanie informacji sektora publicznego może podlegać warunkom dotyczącym m.in. źródła i praw własności intelektualnej. Dlatego manifest zawsze zachowuje oficjalny URL, kod dokumentu, sumę PDF i informację o zgodzie. Źródła: [zadania ustawowe CKE](https://bip.cke.gov.pl/artykul/190/1600/zadania-cke), [BIP CKE — egzamin ósmoklasisty](https://bip.cke.gov.pl/artykul/214/1652/egzamin-osmoklasisty), [informacja rządowa o ponownym wykorzystywaniu](https://www.gov.pl/web/gov/wykorzystaj-informacje-sektora-publicznego2).

To jest kontrola operacyjna, nie opinia prawna. Zakres zgody powinien obejmować planowany sposób prezentacji, przetworzenia i komercyjnego użycia.

## Pliki

- schemat: `content/cke/cke-paper.schema.json`,
- formularz do skopiowania: `content/cke/manual-import.template.json`,
- narzędzie: `scripts/cke-import.mjs`,
- staging i workflow: migracje `20260825213000_cke_import_pipeline.sql` i `20260828120000_full_cke_question_types.sql`,
- kompletne arkusze 2026: `content/cke/cke-2026-main-mathematics-100-x.json`, `content/cke/cke-2026-main-polish-100-x.json` i `content/cke/cke-2026-main-english-100-x.json`,
- kompletne arkusze 2025: `content/cke/cke-2025-main-mathematics-100-x.json`, `content/cke/cke-2025-main-polish-100-x.json`, `content/cke/cke-2025-main-polish-100-y.json` i `content/cke/cke-2025-main-english-100-x.json`,
- powtarzalne przygotowanie mediów: `scripts/extract-cke-2026-mathematics-assets.py`, `scripts/extract-cke-2026-polish-assets.py` i `scripts/extract-cke-2026-english-assets.py`.
- przygotowanie mediów i manifestów 2025: `scripts/extract-cke-2025-*-assets.py` oraz `scripts/build-cke-2025-manifests.mjs`.

Manifest jest źródłem prawdy. Nie edytuj zadań bezpośrednio w tabeli `practice_questions`.

## 1. Przygotowanie manifestu

Skopiuj formularz i nadaj plikowi jednoznaczną nazwę, np.:

```bash
cp content/cke/manual-import.template.json content/cke/cke-2025-main-mathematics-standard.json
```

Nie commituj pliku przed sprawdzeniem, czy zgoda pozwala przechowywać pełną treść w prywatnym lub publicznym repozytorium.

Uzupełnij:

- rok, przedmiot, termin i wariant,
- kod dostosowania CKE widoczny w identyfikatorze arkusza (np. `100` dla wariantu standardowego albo `900` dla afazji),
- oficjalny URL i kod dokumentu widoczny na arkuszu,
- dokładną liczbę zadań,
- każde zadanie w kolejności arkusza,
- stronę albo strony źródłowe,
- typ zadania, temat i trudność,
- treść, klucz, punktację i wyjaśnienie,
- ilustracje, tabele i wzory.

Stabilne identyfikatory nie mogą się zmieniać między wersjami. Zalecany wzór:

```text
cke-<rok>-<termin>-<przedmiot>-<wariant>-q<numer>
```

### Kod dostosowania a wersja arkusza

Kod dostosowania i wersja arkusza opisują dwie różne cechy. Przykładowo `900` oznacza materiał przeznaczony dla uczniów z afazją, natomiast `X` albo `Y` jest wersją konkretnego arkusza. Nie zapisuj `X/Y` jako kodu dostosowania.

Pole `paper.source_document_id` albo `paper.variant_code` musi zawierać oficjalny kod dostosowania oddzielony myślnikami, np. `OMAP-900-2605` lub `900-X`. Podczas publikacji baza automatycznie zapisze osobno `accommodation_code` i `paper_version`. Jeśli kodu brakuje, arkusz zostanie oznaczony jako standardowy (`100`), dlatego zgodność tego pola z dokumentem CKE należy zawsze sprawdzić przed publikacją.

Po wybraniu przez rodzica niestandardowego wariantu uczeń otrzymuje wyłącznie opublikowane arkusze z dokładnie tym samym kodem. System celowo nie przełącza go po cichu na wariant standardowy, gdy nie ma pasujących materiałów.

## 2. Sumy kontrolne

Oblicz SHA-256 oryginalnego PDF:

```bash
npm run cke:hash -- /bezpieczna/sciezka/arkusz.pdf
```

Wynik wklej do `paper.source_pdf_sha256`. Tak samo oblicz sumę każdej wyciętej ilustracji i wpisz ją do `assets[].sha256`. Pozwala to rozpoznać przypadkową zmianę lub duplikat.

Checksum każdego zadania i całego manifestu generuje narzędzie. Nie wpisuje się ich ręcznie.

## 3. Format treści

`prompt` zawiera podstawową treść tekstową. Dodatkowe elementy zapisuj w `content_blocks` w kolejności wyświetlania:

- `markdown` — akapit lub lista,
- `math` — LaTeX renderowany przez MathJax,
- `image` — odwołanie do wpisu z `assets`,
- `audio` — odwołanie do lokalnego nagrania z `assets`; odtwarzacz nie pobiera całego pliku przed użyciem,
- `table` — tablica wierszy i opcjonalna liczba wierszy nagłówka,
- `passage` — odwołanie przez `passage_id` do współdzielonego tekstu źródłowego z `passages`; przed stagingiem jest rozwijane do kompletnego, zwijanego bloku tekstu.

Każda ilustracja wymaga bezpiecznej ścieżki względnej, SHA-256 i tekstu alternatywnego. Nie osadzaj danych base64 ani zewnętrznych trackerów w manifeście.

Typy odpowiedzi:

- `single_choice` — dokładnie cztery odpowiedzi i `answer_key.correct_index` od 0 do 3,
- `multiple_choice`,
- `numeric`,
- `short_text`,
- `long_text`.

Ekran ucznia obsługuje wszystkie wymienione typy. `single_choice` i `multiple_choice` są oceniane automatycznie. Dla `numeric`, `short_text` i `long_text` uczeń najpierw zapisuje własne rozwiązanie, następnie porównuje je ze zweryfikowanym rozwiązaniem i kryteriami CKE oraz zapisuje samoocenę punktową. Tutor AI pomaga przejść przez tok rozumowania, ale nie udaje oficjalnego egzaminatora.

## 4. Walidacja lokalna

```bash
npm run cke:validate -- content/cke/cke-2025-main-mathematics-standard.json
```

Gotowe arkusze OMAP-100-X-2605, OPOP-100-X-2605 i OJAP-100-X-2605 sprawdzisz poleceniami:

```bash
npm run cke:validate -- content/cke/cke-2026-main-mathematics-100-x.json
npm run cke:validate -- content/cke/cke-2026-main-polish-100-x.json
npm run cke:validate -- content/cke/cke-2026-main-english-100-x.json
```

Komplet 2025 sprawdzisz poleceniami:

```bash
npm run cke:validate -- content/cke/cke-2025-main-mathematics-100-x.json
npm run cke:validate -- content/cke/cke-2025-main-polish-100-x.json
npm run cke:validate -- content/cke/cke-2025-main-polish-100-y.json
npm run cke:validate -- content/cke/cke-2025-main-english-100-x.json
```

Walidator sprawdza m.in.:

- kompletność metadanych i zgody,
- zgodność liczby zadań,
- unikalność ID, numerów i kolejności,
- strony źródłowe,
- klucze i liczbę odpowiedzi,
- referencje do ilustracji, ich sumy i teksty alternatywne,
- obsługiwane bloki MathJax i tabele.

Walidacja nie oznacza publikacji.

## 5. Staging w Supabase

Uruchamiaj tylko na zaufanym komputerze. Klucz `service_role` omija RLS — nie wolno umieszczać go w `NEXT_PUBLIC_*`, przeglądarce, Coolify build args ani repozytorium.

```bash
export SUPABASE_URL='https://PROJECT.supabase.co'
export SUPABASE_SERVICE_ROLE_KEY='...'
npm run cke:stage -- content/cke/cke-2025-main-mathematics-standard.json
```

Dla przygotowanych arkuszy 2026 użyj:

```bash
npm run cke:stage -- content/cke/cke-2026-main-mathematics-100-x.json
npm run cke:stage -- content/cke/cke-2026-main-polish-100-x.json
npm run cke:stage -- content/cke/cke-2026-main-english-100-x.json
```

Dla arkuszy 2025 użyj:

```bash
npm run cke:stage -- content/cke/cke-2025-main-mathematics-100-x.json
npm run cke:stage -- content/cke/cke-2025-main-polish-100-x.json
npm run cke:stage -- content/cke/cke-2025-main-polish-100-y.json
npm run cke:stage -- content/cke/cke-2025-main-english-100-x.json
```

Polecenie zwraca `import_batch_id`. Ten sam manifest i wersja mają ten sam efekt (`unchanged`). Zmiana zawartości bez podniesienia `manifest_version` jest odrzucana. Ten sam PDF przypisany do innego manifestu również jest odrzucany.

## 6. Ręczna weryfikacja

Każde zadanie musi dostać status `approved`:

```bash
npm run cke:workflow -- review-question <BATCH_ID> <QUESTION_ID> approved 'Porównano z PDF i zasadami oceniania'
```

W razie błędu użyj `needs_changes` albo `rejected`. Po sprawdzeniu całego arkusza:

```bash
npm run cke:workflow -- review-batch <BATCH_ID> approve 'Komplet sprawdzony przez dwie osoby'
```

Batch nie może zostać zatwierdzony, dopóki choć jedno zadanie nie jest zatwierdzone.

Zalecana kontrola czterech oczu:

1. osoba A przepisuje manifest,
2. osoba B porównuje każdą treść, stronę, odpowiedź i punktację z PDF oraz kluczem CKE,
3. osoba B zatwierdza zadania,
4. operator zatwierdza cały batch.

## 7. Import i osobna publikacja

Dla arkusza, którego wszystkie typy zadań są obsługiwane przez bieżący ekran ucznia:

```bash
npm run cke:workflow -- promote <BATCH_ID>
```

To wykonuje końcową kontrolę kompatybilności i oznacza batch jako gotowy do publikacji, ale nie zmienia jeszcze aktywnego arkusza ani zadań. Po końcowym smoke teście manifestu wykonaj osobną decyzję publikacyjną:

```bash
npm run cke:workflow -- publish <BATCH_ID>
```

`publish` przenosi całą wersję do aktywnego katalogu w jednej transakcji. Poprzednia opublikowana wersja pozostaje widoczna aż do tej chwili, a potem otrzymuje status `superseded`. Rozdzielenie `promote` i `publish` zapobiega przypadkowemu pokazaniu niezweryfikowanej lub częściowo zapisanej treści.

## 8. Poprawki, wersje i wycofanie

- Jeśli lokalna walidacja nie przeszła, popraw ten sam plik.
- Jeśli batch został już wysłany i treść się zmienia, zwiększ `manifest_version`.
- Nie zmieniaj `manifest_id`, `paper.id` ani identyfikatorów istniejących zadań.
- Nowa wersja przechodzi pełny review od początku.

Natychmiastowe wycofanie arkusza:

```bash
npm run cke:workflow -- withdraw <BATCH_ID> 'Błędny klucz odpowiedzi w zadaniu 12'
```

Operacja wyłącza arkusz i jego zadania, ale zachowuje historię importu i powód decyzji.

## Checklista przed `publish`

- [ ] Zgoda CKE obejmuje ten materiał i sposób użycia.
- [ ] URL, kod dokumentu i SHA-256 odpowiadają właściwemu PDF.
- [ ] Kod dostosowania CKE oraz wersja `X/Y` zostały zapisane oddzielnie i odpowiadają oznaczeniom dokumentu.
- [ ] `question_count` odpowiada pełnemu arkuszowi.
- [ ] Każde zadanie ma prawidłowy numer strony.
- [ ] Treść, odpowiedzi i zasady punktacji porównano z oryginałem.
- [ ] Wzory MathJax, tabele i ilustracje sprawdzono wizualnie.
- [ ] Każda ilustracja ma sensowny tekst alternatywny.
- [ ] Wszystkie zadania i batch mają status `approved`.
- [ ] Wykonano smoke test na koncie ucznia bez ujawnienia klucza przed odpowiedzią.
