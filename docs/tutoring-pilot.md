# Pilotaż modułu korepetycji

Moduł `/korepetycje` jest ukryty za flagą `tutoring_marketplace`. Dostęp ma wyłącznie zalogowany użytkownik wskazany przez administratora. Sam adres URL nie wystarcza: funkcje zapisujące i odczytujące zgłoszenie ponownie sprawdzają flagę w bazie.

## Wdrożenie

1. Wdróż migrację `supabase/migrations/20260903150000_tutoring_pilot_feature.sql` tak samo jak pozostałe migracje projektu (lokalnie przez `supabase db push` albo przez SQL Editor w Supabase).
2. Wdróż aktualną wersję aplikacji w Coolify.
3. Zaloguj się na konto administratora i w panelu, w sekcji „Pilotaż korepetycji”, wpisz e-mail użytkownika oraz wybierz „Włącz dostęp”.
4. Po ponownym otwarciu panelu wybranego użytkownika pojawi się pozycja „Korepetycje”.

Wyłączenie dostępu odbywa się w tej samej sekcji przez wybór „Wyłącz dostęp”. Dotychczasowe zgłoszenie zostaje w bazie, ale użytkownik nie może go odczytać ani zmienić do czasu ponownego włączenia flagi.

## Awaryjne włączenie przez SQL Editor

Jeśli panel administratora jest niedostępny, dostęp można nadać bezpośrednio w Supabase SQL Editor:

```sql
insert into public.user_feature_flags (user_id, feature_key)
select id, 'tutoring_marketplace'
from public.profiles
where lower(email) = lower('uzytkownik@example.com')
on conflict (user_id, feature_key) do update set enabled_at = now();
```

Wyłączenie:

```sql
delete from public.user_feature_flags
where feature_key = 'tutoring_marketplace'
  and user_id = (
    select id from public.profiles
    where lower(email) = lower('uzytkownik@example.com')
  );
```

## Zakres pierwszej wersji

Pilot pozwala uczniowi lub rodzicowi opisać potrzebę, a zweryfikowanemu nauczycielowi — dostępność i ofertę. Zgłoszenia są dopasowywane ręcznie. Publiczne profile, rezerwacje, rozliczenia nauczycieli i prowadzenie lekcji w aplikacji pozostają poza tym etapem.

