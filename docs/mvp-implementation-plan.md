# Plan wdrożenia MVP egzaminio

Stan: 24 sierpnia 2026 r. Plan zakłada utrzymanie obecnego stacku: Vinext/React 19, Tailwind 4 + shadcn/ui, MathJax 4, Supabase Auth/PostgreSQL/RLS oraz Docker/Coolify na Hetznerze.

## Cel MVP

Uczeń rozwiązuje zadania z legalnie użytej i opisanej bazy arkuszy, otrzymuje sprawdzenie odpowiedzi oraz bezpieczne wyjaśnienie AI. Rodzic widzi regularność i postęp bez dostępu do prywatnych rozmów. Nauczyciel tworzy zestaw i widzi zagregowane wyniki wyłącznie przypisanej grupy.

## Zasady techniczne dla całego produktu

- Wszystkie nowe ekrany budujemy z lokalnych komponentów shadcn/ui i tokenów marki egzaminio.
- Wszystkie wzory zapisujemy jako TeX/MathML i renderujemy MathJax 4; dla treści użytkownika pozostaje włączone `ui/safe`.
- Autoryzacja jest egzekwowana w PostgreSQL przez RLS/RPC, nie tylko przez ukrywanie przycisków.
- Każdy materiał ma źródło, przedmiot, rok, sesję, numer zadania, wersję oraz status prawny/publikacyjny.
- Surowe rozmowy AI mają ograniczoną retencję; analityka produktowa nie może profilować dzieci reklamowo.
- Funkcje dla dzieci, płatności i nowe procesory danych mają osobną bramkę prawną przed produkcją.

## Etap 0 — infrastruktura i dostęp

Status po tej zmianie: fundament wykonany, a deployment wykorzystuje istniejącą maszynę Hetzner z Coolify; konfiguracja zewnętrzna pozostaje po stronie DNS/Supabase/Google/Meta.

Zakres:

- Istniejący Hetzner/Coolify, DNS, HTTPS, health check, backupy i auto-deploy z `main`.
- Supabase w regionie UE, migracje, RLS, Google, Facebook, e-mail/hasło i SMTP.
- Role: uczeń, rodzic, nauczyciel, administrator.
- Wersjonowana akceptacja regulaminu i polityki prywatności.
- Zweryfikowana zgoda opiekuna przez konto rodzica.
- Status weryfikacji nauczyciela przed dostępem do danych grup.

Kryterium wyjścia: pełna checklista z `docs/hetzner-domain-coolify-setup.md` przechodzi na produkcji.

## Etap 1 — model treści i panel redakcyjny

Priorytet: P0. Szacunkowo: 1–2 sprinty.

Zakres danych:

- `subjects`, `exam_sessions`, `source_documents`, `tasks`, `task_versions`.
- `answer_options`, `solutions`, `skills`, `task_skills`.
- statusy: draft → review → approved → published → archived.
- pola licencyjne: źródło, URL, autor/CKE, podstawa wykorzystania, data weryfikacji.
- import OCR jako draft, nigdy automatyczna publikacja.

Panel administratora:

- dodanie skanu/PDF i metadanych,
- korekta treści, tabel, grafik i TeX,
- podgląd MathJax desktop/mobile,
- podwójna akceptacja zadania i rozwiązania,
- historia zmian oraz osoba publikująca.

Kryteria wyjścia:

- co najmniej 100 zweryfikowanych zadań z matematyki,
- każde zadanie ma poprawną odpowiedź, rozwiązanie, umiejętność i źródło,
- losowa kontrola 20% przez drugą osobę,
- brak niezatwierdzonych materiałów w API ucznia.

## Etap 2 — silnik ćwiczeń ucznia

Priorytet: P0. Szacunkowo: 1–2 sprinty.

Zakres:

- wybór przedmiotu i tematu,
- sesja 5–10 zadań,
- odpowiedzi zamknięte i krótkie odpowiedzi liczbowe/tekstowe,
- poprawne renderowanie wzorów MathJax i grafik,
- natychmiastowa informacja „dobrze / spróbuj ponownie”, bez ujawnienia rozwiązania za wcześnie,
- zapis próby, czasu, liczby podejść i ukończenia,
- wznowienie przerwanej sesji,
- dostępna obsługa klawiatury i czytnika ekranu.

Tabele:

- `practice_sessions`, `task_attempts`, `student_skill_progress`, `daily_usage`.

Kryteria wyjścia:

- wynik jest liczony deterministycznie,
- ponowne wysłanie żądania nie tworzy podwójnej próby,
- uczeń widzi wyłącznie własne dane,
- rodzic nie widzi treści odpowiedzi ani rozmów AI.

## Etap 3 — nauczyciel AI

Priorytet: P0. Szacunkowo: 1–2 sprinty.

Zakres:

- wyjaśnienie generowane z zatwierdzonego rozwiązania i kontekstu konkretnego zadania,
- kolejne pytania w ograniczonym wątku,
- tryby: „mała podpowiedź”, „wyjaśnij krok”, „prostszy przykład”,
- limit 3 zapytań w planie bezpłatnym liczony po stronie serwera,
- oznaczenie, że odpowiedź generuje AI,
- cytowanie źródła zadania i przycisk zgłoszenia błędu,
- filtrowanie danych osobowych, treści niebezpiecznych i prompt injection,
- brak trenowania z użyciem rozmów dzieci, o ile pozwala na to konfiguracja dostawcy,
- retencja surowej rozmowy zgodna z polityką i automatyczne usuwanie.

Backend:

- wywołania modelu tylko po stronie serwera,
- klucz API poza frontendem,
- strukturalna odpowiedź modelu walidowana schematem,
- log kosztu, czasu i wersji promptu bez ujawniania sekretów,
- cache wyjaśnień bazowych, ale nie prywatnych dopytań.

Kryteria wyjścia:

- zestaw ewaluacyjny minimum 200 pytań,
- brak ujawnienia system promptu i danych innego użytkownika,
- ręczny przegląd błędnych/niebezpiecznych odpowiedzi,
- możliwość natychmiastowego wyłączenia AI feature flagą.

## Etap 4 — realny panel rodzica

Priorytet: P1. Szacunkowo: 1 sprint.

Zakres:

- zatwierdzenie/odrzucenie konta dziecka,
- lista połączonych dzieci i wycofanie zgody,
- tygodniowa regularność, czas nauki, ukończone sesje i tematy,
- rekomendacja jednego obszaru do powtórki,
- powiadomienie tygodniowe opt-in,
- eksport i usunięcie danych dziecka,
- brak prywatnych promptów i pełnej treści odpowiedzi.

Kryterium wyjścia: test RLS dowodzi, że rodzic nie odczyta danych niepołączonego dziecka nawet po ręcznej zmianie identyfikatora w żądaniu.

## Etap 5 — realny panel nauczyciela

Priorytet: P1. Szacunkowo: 1–2 sprinty.

Zakres:

- wniosek i administracyjna weryfikacja nauczyciela,
- grupy i jednorazowe kody dołączenia z datą wygaśnięcia,
- zestawy z biblioteki zatwierdzonych zadań,
- termin wykonania, status i zagregowane wyniki,
- widok umiejętności wymagających powtórki,
- brak prywatnych rozmów AI i danych spoza przypisanej grupy,
- usunięcie ucznia z grupy oraz zamknięcie grupy.

Kryterium wyjścia: nieweryfikowane konto nie może wywołać RPC tworzącego grupę ani pobrać wyników, nawet poza interfejsem.

## Etap 6 — pakiet Plus i płatności

Priorytet: P1 po potwierdzeniu retencji i jakości AI. Szacunkowo: 1 sprint.

Zakres:

- wybór operatora płatności i umowy powierzenia,
- jednorazowa cena 149 zł, dokładny zakres i czas dostępu, bez automatycznego odnowienia,
- checkout z jednoznacznym obowiązkiem zapłaty,
- zgody wymagane do wcześniejszego rozpoczęcia usługi cyfrowej,
- webhooki idempotentne i stan uprawnienia do pakietu po stronie serwera,
- faktury/rachunki, zwroty i obsługa odstąpienia,
- limity egzekwowane w bazie, nie w przeglądarce.

Kryterium wyjścia: prawnik zatwierdził checkout i regulamin, a testy obejmują płatność jednorazową, nadanie dostępu, błąd, zwrot, wygaśnięcie dostępu i powtórzony webhook.

## Etap 7 — analityka, marketing i pilotaż

Priorytet: P1/P2. Szacunkowo: 1 sprint + 4 tygodnie pilotażu.

- analityka bez cookies albo CMP przed analityką wymagającą zgody,
- bez profilowanych reklam wobec dzieci,
- mierniki: aktywacja, pierwsza ukończona sesja, D1/D7, liczba zadań, wykorzystanie AI, zgłoszenia błędów, konwersja rodzica,
- pilotaż 30–50 rodzin i 3–5 nauczycieli,
- cotygodniowa korekta treści i promptów,
- publiczny start dopiero po zamknięciu problemów P0 i przeglądzie prawnym.

## Kolejność decyzji właściciela produktu

1. Potwierdzić operatora prawnego, adres, kraj i dane rejestrowe.
2. Potwierdzić zakres wykorzystania arkuszy CKE i grafik.
3. Wybrać dostawcę AI, region, brak treningu na danych i budżet zapytań.
4. Wybrać SMTP, monitoring i backup Supabase.
5. Zatwierdzić definicję „3 darmowych pytań”: dziennie czy łącznie.
6. Zdecydować, czy nauczyciel ma widzieć wynik pojedynczego ucznia, czy tylko agregat grupy.
7. Dopiero potem wybrać operatora płatności i cenę Plus.

## Definicja gotowego MVP

- infrastruktura odtwarzalna z instrukcji i backupu,
- co najmniej jeden kompletny przedmiot z zatwierdzoną treścią,
- ćwiczenia, postęp i AI działają na telefonie i komputerze,
- uczeń ma zweryfikowanego opiekuna,
- RLS testuje każdą relację użytkownik–dane,
- dokumenty prawne nie mają pól `[UZUPEŁNIJ]` i zostały skonsultowane,
- retencja i usuwanie działają automatycznie,
- monitoring, alerty kosztowe i kill switch AI są aktywne,
- pilotaż nie ujawnił otwartych błędów bezpieczeństwa lub treści klasy P0.
