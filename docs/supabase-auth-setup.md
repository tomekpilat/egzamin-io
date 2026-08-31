# Konfiguracja logowania Supabase

egzaminio korzysta z tego samego modelu co kancelio.pl: Supabase Auth odpowiada za e-mail/hasło i logowanie społecznościowe, PostgreSQL przechowuje profile, a Row Level Security pilnuje uprawnień.

## 1. Projekt i migracja

1. Utwórz projekt Supabase, najlepiej w regionie UE.
2. Zainstaluj i zaloguj Supabase CLI.
3. W katalogu repozytorium wykonaj:

   ```bash
   supabase link --project-ref TWOJ_PROJECT_REF
   supabase db push
   ```

Migracje w `supabase/migrations/` tworzą profile, zapis wersjonowanej akceptacji dokumentów, zweryfikowany przepływ zgody opiekuna, stan weryfikacji nauczyciela i cztery role:

- `student` — ćwiczenia, nauczyciel AI i własny postęp,
- `parent` — połączone konta dzieci i raporty,
- `teacher` — zestawy i grupy uczniów,
- `admin` — użytkownicy, treści i stan produktu.

Uczeń, rodzic i nauczyciel mogą wybrać rolę podczas onboardingu. Rola `admin` jest celowo wykluczona z samoobsługowej rejestracji.

## 2. E-mail i hasło

W **Authentication → Providers → Email** pozostaw włączony provider e-mail. Dla produkcji:

- włącz potwierdzenie adresu,
- skonfiguruj własny SMTP,
- ustaw szablony wiadomości po polsku,
- ustaw minimalną długość hasła na co najmniej 8 znaków.

Domyślna wysyłka Supabase służy tylko do testów i ma niskie limity.

### Polski e-mail do odzyskiwania hasła

W **Authentication → Email Templates → Reset password** ustaw:

```text
Subject: Ustaw nowe hasło do egzaminio
```

Jako treść wklej zawartość pliku [`docs/supabase-email-templates/reset-password.html`](supabase-email-templates/reset-password.html). Szablon używa oficjalnej zmiennej Supabase `{{ .ConfirmationURL }}` i nie wymaga wpisywania adresu projektu na stałe.

W **Authentication → SMTP Settings** ustaw nazwę nadawcy `egzaminio` oraz adres z własnej domeny, na przykład `powiadomienia@egzamin.io`. Po zapisaniu wyślij wiadomość testową i sprawdź Gmail, Outlook oraz folder spam.

## 3. Adresy aplikacji

W **Authentication → URL Configuration** ustaw:

```text
Site URL: https://egzamin.io
```

Dodaj do Redirect URLs:

```text
https://egzamin.io/panel
https://egzamin.io/wybierz-role
https://egzamin.io/oczekuje-na-zgode
https://egzamin.io/ustaw-nowe-haslo
http://localhost:3000/panel
http://localhost:3000/wybierz-role
http://localhost:3000/oczekuje-na-zgode
http://localhost:3000/ustaw-nowe-haslo
```

Jeśli używasz `www`, dodaj analogiczne adresy z `https://www.egzamin.io`.

## 4. Google

1. W Google Cloud utwórz OAuth Client typu **Web application**.
2. Skopiuj callback widoczny w **Supabase → Authentication → Providers → Google**. Ma postać:

   ```text
   https://TWOJ_PROJECT_REF.supabase.co/auth/v1/callback
   ```

3. Dodaj go jako **Authorized redirect URI** w Google.
4. Wklej Client ID i Client Secret w providerze Google w Supabase i włącz provider.

## 5. Facebook

> Status: logowanie Facebookiem jest tymczasowo wyłączone w interfejsie egzamin.io do czasu weryfikacji aplikacji przez Meta i przełączenia jej w tryb Live. Poniższe kroki zachowujemy jako instrukcję ponownego uruchomienia providera.

1. Utwórz aplikację w Meta for Developers i dodaj Facebook Login.
2. W **Valid OAuth Redirect URIs** wpisz ten sam callback Supabase:

   ```text
   https://TWOJ_PROJECT_REF.supabase.co/auth/v1/callback
   ```

3. Upewnij się, że aplikacja ma uprawnienia `public_profile` i `email`.
4. Wklej App ID i App Secret w providerze Facebook w Supabase.
5. Przed publicznym startem przełącz aplikację Meta z trybu Development na Live i przejdź wymagany App Review.

## 6. Coolify

Dodaj do aplikacji dwie zmienne runtime:

```text
SUPABASE_URL=https://TWOJ_PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Są to wartości publiczne przeznaczone dla klienta przeglądarkowego. Aplikacja udostępnia je przez `GET /api/public-config`, dzięki czemu nie trzeba przebudowywać obrazu dla każdej zmiany projektu.

Nie dodawaj do aplikacji frontendowej klucza `service_role` ani sekretów providerów Google/Facebook. Sekrety providerów pozostają wyłącznie w panelu Supabase.

## 7. Nadanie administratora

Po utworzeniu zwykłego konta wykonaj w Supabase SQL Editor:

```sql
update public.profiles
set role = 'admin', onboarding_completed = true
where lower(email) = lower('twoj@email.pl');
```

Tej operacji nie da się wykonać przez formularz rejestracji ani kluczem publishable.

## 8. Test przed produkcją

Sprawdź kolejno:

1. rejestrację e-mail i link potwierdzający,
2. logowanie istniejącym hasłem,
3. wysłanie linku na `/odzyskaj-haslo`, powrót na `/ustaw-nowe-haslo` i zapis nowego hasła,
4. ponowne wysłanie linku oraz neutralny komunikat dla adresu bez konta,
5. Google i powrót na `/wybierz-role`,
6. Facebook na koncie testera Meta,
7. wybór każdej roli i właściwy panel,
8. brak możliwości ustawienia `admin` przez żądanie z przeglądarki,
9. wylogowanie i wygaśnięcie sesji,
10. zapis `terms_accepted_at`, `privacy_acknowledged_at` i `legal_version` po rejestracji e-mail oraz onboardingu OAuth,
11. blokadę konta ucznia do czasu zatwierdzenia przez konto rodzica o zgodnym adresie e-mail,
12. brak dostępu nieweryfikowanego nauczyciela do funkcji grup i wyników uczniów.

## Ważne przed publicznym MVP

Ósmoklasiści są zazwyczaj osobami niepełnoletnimi. Interfejs nie uznaje już checkboxa ucznia za zgodę: uczeń podaje osobny e-mail, czeka na `/oczekuje-na-zgode`, a zalogowany rodzic zatwierdza prośbę w panelu. Przed publicznym startem prawnik musi potwierdzić wystarczalność tej weryfikacji dla ostatecznego modelu usługi. Pakiet roboczych dokumentów jest dostępny pod `/informacje-prawne`; wszystkie pola oznaczone `[UZUPEŁNIJ]` i okresy retencji muszą zostać potwierdzone przed startem.
