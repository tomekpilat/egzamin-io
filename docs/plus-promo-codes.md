# Bezpłatny dostęp Plus przez kod promocyjny

Kody promocyjne przyznają wskazanemu uczniowi Pakiet Plus bez płatności i bez tworzenia zamówienia Stripe.

## Uruchomienie

1. Zastosuj migrację `supabase/migrations/20260828235900_plus_promo_codes.sql` w projekcie Supabase (SQL Editor albo `supabase db push`).
2. Zaloguj się na konto z rolą `admin` i otwórz `/panel`.
3. W sekcji „Kody bezpłatnego dostępu Plus” wygeneruj kod, ustaw datę końca dostępu i limit użyć.
4. Skopiuj pełny kod od razu. Baza zapisuje wyłącznie SHA-256 oraz krótką podpowiedź, więc później nie da się go odzyskać.

Uczeń wpisuje kod w ustawieniach swojego panelu. Rodzic może wpisać kod w płatnościach po wybraniu połączonego dziecka. Dostęp jest zawsze przypisany do profilu ucznia.

## Zabezpieczenia

- tylko administrator może tworzyć, przeglądać i wyłączać kody;
- uczeń aktywuje kod wyłącznie dla siebie, a rodzic wyłącznie dla połączonego dziecka;
- kod ma datę końca aktywacji, datę końca dostępu i limit użyć;
- jeden kod można wykorzystać dla danego ucznia tylko raz;
- po 10 próbach w 15 minut następuje czasowa blokada;
- log prób nie zawiera wpisanej treści kodu;
- wyłączenie kodu blokuje tylko nowe aktywacje i nie odbiera wcześniej przyznanego dostępu.

Płatny dostęp Stripe, ręczny dostęp administratora i dostęp z kodu są przeliczane wspólnie. Aktywne ręczne nadanie pozostaje nadrzędne; w pozostałych przypadkach obowiązuje najdłuższy aktywny dostęp Stripe lub promocyjny.
