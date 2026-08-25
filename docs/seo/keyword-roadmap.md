# Roadmapa SEO egzaminio

Data audytu: 25 sierpnia 2026  
Status danych wolumenowych: oczekuje na eksport z Senuto albo Semstorm

## Zasada decyzyjna

Lista fraz wejściowych jest hipotezą opartą na znajomości kategorii. Nie przypisujemy jej zmyślonych wolumenów ani poziomów trudności. Przed rozszerzeniem pilotażu każda grupa powinna otrzymać w Senuto lub Semstorm:

- średni miesięczny wolumen i sezonowość,
- trudność i aktualny SERP,
- dominującą intencję,
- widocznych konkurentów,
- propozycję frazy głównej oraz wariantów wspierających,
- decyzję: rozwijamy, łączymy z inną stroną albo odrzucamy.

Google Search Console po publikacji będzie ważniejszym źródłem decyzji o rozwijaniu treści niż szacunek przed publikacją. Klaster rozwijamy, gdy realne wyświetlenia, pozycja i przejścia do ćwiczeń potwierdzą potencjał.

## Kolejność wykonania

1. P0 — rekrutacja i kalkulator: najwyższa intencja komercyjna, szczyt kwiecień–lipiec.
2. P1 — trzy pilotażowe tematy matematyczne: evergreen i długi czas dojrzewania.
3. P1 — angielski: słabsze pokrycie konkurencyjne, wysoka zgodność z produktem.
4. P1 — polski: formy wypowiedzi i lista lektur; bez generycznych streszczeń.
5. P1 — oficjalne informacje 2027 oraz ZIU: wysoki ruch informacyjny, obowiązkowa aktualizacja roczna.
6. P1 — arkusze 2026 i hub roczników: szczyt listopad–grudzień.
7. P1 — treści rodzicielskie: intencja decyzyjna i przewaga produktowa.
8. P2 — pojedyncze zadania CKE: dopiero po imporcie zweryfikowanego pełnego arkusza.

## Roadmapa pierwszych 90 dni

Właściciel całości: operator produktu egzaminio. Pomiar wolumenów wymaga dostępu operatora do Senuto lub Semstorm; dane aplikacyjne i Search Console są przeglądane co tydzień po uruchomieniu analityki z #14.

| Okres | Publikacja i pomiar | Warunek przejścia dalej |
|---|---|---|
| Dni 1–14 | fundament techniczny, kalkulator, strony zasad punktowych, 19 stron pilotażowych | poprawny build, sitemap, canonical, źródła i brak placeholderów |
| Dni 15–30 | eksport wszystkich fraz z Senuto/Semstorm, analiza SERP i uzupełnienie `keyword-research-template.csv` | komplet: wolumen, trudność, źródło i data dla każdego klastra |
| Dni 31–45 | obserwacja indeksacji oraz zapytań w Search Console; korekta tytułów i linkowania | brak kanibalizacji i pierwsze wyświetlenia dla URL-i pilotażowych |
| Dni 46–60 | rozwój 20% tematów o najwyższym realnym potencjale; podłączenie zdarzeń z #14 | mierzalne wejście → ćwiczenie/kalkulator/rejestracja |
| Dni 61–75 | pierwszy kompletny, ręcznie zweryfikowany arkusz CKE i kontrolowany pilotaż stron zadań | 100% zadań ma źródło, klucz, punktację, rozwiązanie i recenzenta |
| Dni 76–90 | audyt jakości, thin content i Core Web Vitals; decyzja o drugim roczniku i miastach | pozytywny audyt próbki oraz brak stron bez realnej wartości |

## Plan na kolejne 12 miesięcy

- Wrzesień–październik: rozwój tematów evergreen z matematyki i angielskiego zgodnie z danymi Search Console.
- Listopad–grudzień: arkusze i próbne egzaminy; wyłącznie opublikowane zestawy z oficjalnym kluczem.
- Styczeń–marzec: terminy, wymagania, lektury i plan przygotowań dla rodziców.
- Kwiecień–lipiec: rekrutacja, kalkulator i zweryfikowane progi historyczne miast.
- Sierpień: coroczny audyt komunikatów CKE/MEN, przekierowań, wygasłych źródeł i treści o słabym popycie.

Nie rozwijamy generycznych streszczeń lektur, pustych stron miejskich, nieopublikowanych arkuszy ani wariantów słów kluczowych o tej samej intencji. Te grupy wracają do oceny dopiero po uzyskaniu danych, które uzasadnią osobny URL.

## Mapa fraza → kanoniczny URL

| Klaster | Frazy główne i wspierające | Kanoniczny URL | Status |
|---|---|---|---|
| Kalkulator | kalkulator punktów do liceum, kalkulator punktów do liceum 2027, przeliczanie procentów na punkty | `/kalkulator-punktow` | opublikowany |
| Zasady punktów | ile punktów do liceum, punkty za oceny, pasek, wolontariat, konkursy, technikum | `/rekrutacja/ile-punktow-do-liceum` | pilotaż |
| Progi Warszawa | progi punktowe liceum Warszawa 2027 | `/rekrutacja/progi-punktowe/warszawa-2027` | pilotaż bez wymyślonych progów |
| E8 2027 | terminy, czas, przybory, zdawalność, wymagania | `/egzamin-osmoklasisty-2027` | pilotaż |
| Wyniki | wyniki E8 2027, ZIU logowanie | `/egzamin-osmoklasisty-2027/wyniki-ziu` | pilotaż |
| Procenty | procenty zadania E8, obliczenia procentowe z rozwiązaniami | `/matematyka/procenty-zadania-egzamin-osmoklasisty` | pilotaż |
| Pitagoras | twierdzenie Pitagorasa zadania klasa 8 | `/matematyka/twierdzenie-pitagorasa-zadania` | pilotaż |
| Zadania otwarte | zadania otwarte matematyka E8, jak rozwiązywać | `/matematyka/zadania-otwarte` | pilotaż |
| Funkcje językowe | funkcje językowe E8 angielski | `/jezyk-angielski/funkcje-jezykowe` | pilotaż |
| Środki językowe | środki językowe, czasy angielskie E8 | `/jezyk-angielski/srodki-jezykowe` | pilotaż |
| E-mail | e-mail E8 wzór, ile słów | `/jezyk-angielski/email-wzor` | pilotaż |
| Lektury | lektury obowiązkowe E8, lista 2027 | `/jezyk-polski/lektury-obowiazkowe` | pilotaż |
| Rozprawka | jak napisać, schemat, ile słów, argumenty z lektur | `/jezyk-polski/rozprawka-egzamin-osmoklasisty` | pilotaż |
| Opowiadanie | opowiadanie twórcze, kryteria wypracowania | `/jezyk-polski/opowiadanie-tworcze` | pilotaż |
| Arkusze | arkusze PDF, testy online, lata ubiegłe | `/arkusze` | pilotaż |
| Arkusz 2026 | arkusz i odpowiedzi 2026, próbne 2026 | `/arkusze/egzamin-osmoklasisty-2026` | pilotaż |
| Plan rodzica | jak przygotować dziecko, kiedy zacząć | `/dla-rodzica/jak-przygotowac-dziecko-do-egzaminu` | pilotaż |
| Formy wsparcia | korepetycje czy kurs, koszt korepetycji | `/dla-rodzica/korepetycje-czy-kurs-online` | pilotaż |
| Stres | jak pomóc dziecku przed egzaminem | `/dla-rodzica/stres-przed-egzaminem` | pilotaż |
| Wybór szkoły | jakie liceum wybrać | `/dla-rodzica/jakie-liceum-wybrac` | pilotaż |

## Tematy odłożone do walidacji

- Pozostałe miasta: Kraków, Wrocław, Poznań, Gdańsk, Łódź, Katowice, Lublin, Szczecin i Białystok — wymagają kompletnych, porównywalnych i cytowalnych danych. Nie publikujemy pustych stron z nazwą miasta.
- Kolejne tematy matematyczne: potęgi, pierwiastki, bryły, prawdopodobieństwo, równania, prędkość, skala, układ współrzędnych, wykresy i karta wzorów — kolejność wyznaczy eksport wolumenów oraz dane Search Console z pilotażu.
- Motywy, środki stylistyczne i osobne kryteria wypracowania — rozwijamy, jeżeli nie będą kanibalizować istniejących stron.
- Słownictwo tematyczne po angielsku — wymaga osobnego modelu aktywnych powtórek, nie statycznych list.
- Generyczne streszczenia lektur, np. Zemsta streszczenie — wyłączone z pierwszego roku prac.

## Ochrona jakości

- Nie indeksujemy placeholderów, pustych roczników ani stron miejskich bez danych.
- Jedna strona odpowiada jednej intencji; warianty bliskoznaczne nie dostają osobnych URL-i.
- Informacje zmienne w czasie mają źródło, datę weryfikacji i właściciela aktualizacji.
- Strona zadania CKE wymaga źródła, treści, klucza, rozwiązania krok po kroku, punktacji i powiązanego tematu.
- Treści AI są szkicem. Publikacja wymaga walidacji merytorycznej i zgodności z oficjalnym kluczem.

## Kalendarz aktualizacji

| Obszar | Termin kontroli | Właściciel | Źródło nadrzędne |
|---|---|---|---|
| Terminy i wymagania E8 2027 | po każdym komunikacie oraz kontrola 15 stycznia 2027 | operator produktu | CKE i MEN |
| Wyniki i ZIU | 30 czerwca oraz 6 lipca 2027 | operator produktu | CKE |
| Zasady rekrutacji | 1 marca i po zmianie rozporządzenia | operator produktu | MEN / ISAP |
| Progi miejskie | po zakończeniu naboru, dopiero po pozyskaniu kompletnego źródła | operator produktu | oficjalny system miasta |
| Arkusze | listopad–grudzień i bezpośrednio po publikacji CKE | redaktor arkuszy | CKE |
| Treści przedmiotowe | przegląd merytoryczny co sześć miesięcy | recenzent przedmiotowy | aktualny informator CKE |
