# Arkusze CKE 2026 — warianty i konfiguracja ucznia

Źródło: [CKE — arkusze egzaminu ósmoklasisty 2026](https://cke.gov.pl/egzamin-osmoklasisty/arkusze/2026-2/).

## Stan pobrania

- 149 unikalnych plików i 177 przypisań plik–wariant,
- 122 PDF, 18 MP3, 6 DXB i 3 DOCX,
- 42 warianty arkuszy,
- łączny rozmiar źródeł: 605 494 236 bajtów (około 578 MiB),
- każdy plik ma w katalogu URL źródłowy, rozmiar i SHA-256,
- pliki binarne znajdują się lokalnie w `content/cke/sources/2026/` i są wyłączone z Gita,
- wersjonowany indeks: `content/cke/source-catalog-2026.json`.

Ponowne uruchomienie:

```bash
npm run cke:download
```

Narzędzie nie pobiera ponownie istniejących plików. Przelicza ich rozmiar i SHA-256, a następnie odświeża katalog.

## Co rzeczywiście oznaczają kody CKE

| Kod dostosowania | Odbiorca materiału |
| --- | --- |
| `100` | uczeń bez niepełnosprawności lub ze specyficznymi trudnościami w uczeniu się |
| `200` | uczeń z autyzmem, w tym z zespołem Aspergera |
| `400` | uczeń słabowidzący — czcionka 16 pkt |
| `500` | uczeń słabowidzący — czcionka 24 pkt |
| `660` | uczeń niewidomy; CKE publikuje również materiały DOCX/DXB |
| `700` | uczeń niesłyszący lub słabosłyszący |
| `800` | uczeń z niepełnosprawnością intelektualną w stopniu lekkim |
| `900` | uczeń z afazją |
| `Q00` | uczeń z niepełnosprawnością ruchową wynikającą z mózgowego porażenia dziecięcego |
| `K00` | zdający z zaburzeniem widzenia barw |
| `C00` | uczeń, któremu ograniczona znajomość polskiego utrudnia rozumienie tekstu |

`X` i `Y` nie są profilami dziecka. To wersje danego arkusza. Muszą być przechowywane osobno od kodu dostosowania.

## Dostępność wariantów w 2026

| Przedmiot | Dostępne warianty |
| --- | --- |
| Język polski | `100-X`, `100-Y`, `200`, `400`, `500`, `660`, `700`, `800`, `900`, `Q00`, `K00`, `C00` |
| Matematyka | `100-X`, `100-Y`, `200`, `400`, `500`, `660`, `700`, `800`, `900`, `Q00`, `K00`, `C00` |
| Język angielski | `100-X`, `100-Y`, `200`, `400`, `500`, `660`, `700`, `800`, `900`, `Q00`, `K00` |
| Język niemiecki | `100`, `200`, `800` |
| Francuski, hiszpański, rosyjski, włoski | tylko `100` |

Materiały językowe mogą dodatkowo zawierać nagranie, nagranie z wydłużonymi przerwami i transkrypcję. Brak wariantu dla danego języka trzeba komunikować wprost; aplikacja nie powinna po cichu podmieniać go na wariant standardowy.

## Wniosek dla modelu produktu

Obecne pole `variant_code` w importerze pozwala zapisać kod, ale nie wystarcza do bezpiecznej konfiguracji. Potrzebne są cztery niezależne wymiary:

1. przedmiot lub język,
2. kod dostosowania (`100`, `200`, `400` itd.),
3. wersja arkusza (`X`, `Y` albo brak),
4. format zasobu (`question_booklet`, `answer_sheet`, `open_answer_sheet`, `scoring_rules`, `transcript`, `audio`, `extended_pause_audio`, `braille_source`, `title_page`).

Jeden zasób może należeć do kilku wariantów. Przykładowo zasady oceniania albo nagranie bywają wspólne. Dlatego załączniki powinny być osobnymi rekordami z relacją wiele-do-wielu, a nie kolejnymi kopiami PDF w każdym arkuszu.

## Zalecana konfiguracja konta ucznia

Domyślnie konto korzysta z wariantu `100`. Rodzic lub administrator może opcjonalnie ustawić:

- preferowany język obcy,
- wariant materiału osobno dla każdego przedmiotu,
- preferencje prezentacji: wielkość tekstu, kontrast, ograniczenie animacji,
- preferencje audio: zwykłe lub wydłużone przerwy, tempo, widoczność transkrypcji.

Preferencje interfejsu należy trzymać osobno od wariantu treści. Powiększenie fontu nie zamienia arkusza `100` w arkusz `400`, ponieważ wersje dostosowane mogą różnić się również konstrukcją i treścią zadań.

## Prywatność

Przypisanie do konta opcji opisanej jako materiał dla ucznia z konkretną niepełnosprawnością może ujawniać lub pozwalać wnioskować o zdrowiu dziecka. Dane dotyczące zdrowia są szczególną kategorią danych w art. 9 RODO. Dlatego produkt powinien:

- nie pytać o diagnozę ani orzeczenie,
- zapisywać wyłącznie wybrany wariant materiału i niezbędne preferencje prezentacji,
- jasno wyjaśnić cel i czas przechowywania ustawienia,
- ograniczyć dostęp do rodzica, ucznia i niezbędnych procesów systemowych,
- umożliwić usunięcie lub powrót do wariantu standardowego,
- przed wdrożeniem konfiguracji konta przejść konsultację prawną i ocenę ryzyka dla danych małoletnich.

Źródło prawne: [RODO — oficjalny tekst EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj), w szczególności art. 5 i 9.

## Luki w obecnym MVP

- importer dopuszcza tylko `mathematics`, `polish` i `english`,
- jeden arkusz ma obecnie tylko jeden `source_url` i jeden checksum PDF,
- nie ma typu załącznika ani obsługi MP3, DOCX i DXB,
- `variant_code` miesza kod dostosowania z wersją X/Y,
- panel ucznia nie przechowuje wyboru wariantu per przedmiot,
- interfejs rozwiązywania produkcyjnie obsługuje tylko zadania jednokrotnego wyboru,
- brak bezpiecznego fallbacku, gdy CKE nie publikuje danego wariantu dla wybranego języka.

## Kolejność wdrożenia

1. Rozszerzyć model arkusza i załączników bez przypisywania danych do użytkownika.
2. Zaimportować katalog źródłowy i zbudować administracyjny podgląd kompletności wariantów.
3. Dodać opcjonalny wybór wariantu per przedmiot z domyślnym `100`.
4. Dodać audio/transkrypcje oraz niezależne ustawienia dostępności UI.
5. Dopiero potem digitalizować pytania dla kolejnych wariantów i publikować je po istniejącym review workflow.

Pobranie dokumentów nie oznacza ich digitalizacji ani publikacji w aplikacji. Każdy arkusz nadal wymaga manifestu, ręcznej kontroli treści, klucza, punktacji i końcowej decyzji `publish`.
