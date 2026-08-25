# Wdrożenie egzaminio w Coolify

Projekt jest gotowy do wdrożenia jako aplikacja z `Dockerfile`. Kontener uruchamia produkcyjny serwer Node.js na porcie `3000` i udostępnia endpoint kontrolny `GET /api/health`.

Pełna instrukcja wdrożenia na istniejącej maszynie z Coolify — od kontroli zasobów i DNS po Supabase oraz Google/Facebook — znajduje się w [hetzner-domain-coolify-setup.md](hetzner-domain-coolify-setup.md). Ten dokument pozostaje skróconą instrukcją samego zasobu aplikacji.

## 1. Dodanie aplikacji

1. W Coolify otwórz wybrany projekt i środowisko produkcyjne.
2. Wybierz **New Resource → Application**.
3. Podłącz repozytorium przez GitHub App albo wybierz **Public Repository** i podaj:

   ```text
   https://github.com/tomekpilat/egzamin-io
   ```

4. Ustaw gałąź **main**.
5. Jako **Build Pack** wybierz **Dockerfile**.
6. Pozostaw **Base Directory** jako `/`, a ścieżkę do pliku jako `/Dockerfile`.

## 2. Port i domena

W konfiguracji sieci aplikacji ustaw:

- **Ports Exposes:** `3000`
- **Ports Mappings:** pozostaw puste
- **Domain:** `https://egzamin.io`

Opcjonalnie dodaj również `https://www.egzamin.io` i ustaw przekierowanie na domenę główną. Kontener nasłuchuje na `0.0.0.0:3000`, więc nie trzeba dodawać zmiennych `PORT` ani `HOST` w Coolify.

Do działania logowania dodaj zmienne runtime:

```text
SUPABASE_URL=https://TWOJ_PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Do działania nauczyciela AI dodaj również trzy sekrety dostępne wyłącznie w runtime:

```text
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DEEPSEEK_API_KEY=sk-...
AI_USER_HASH_SECRET=<losowy sekret co najmniej 32 znaki>
```

Pełna konfiguracja modelu, limitów i monitoringu znajduje się w [ai-tutor-mvp.md](ai-tutor-mvp.md).

Pełna konfiguracja bazy, Google i Facebooka jest opisana w [supabase-auth-setup.md](supabase-auth-setup.md).

## 3. DNS

U dostawcy domeny ustaw rekord `A` dla domeny głównej na publiczny adres IPv4 serwera Coolify:

```text
Typ: A
Nazwa: @
Wartość: <IP_SERWERA_COOLIFY>
```

Dla subdomeny `www` dodaj rekord `CNAME` wskazujący na `egzamin.io` albo drugi rekord `A` z tym samym adresem IP. Jeżeli serwer obsługuje IPv6, możesz dodać również rekord `AAAA`.

Po propagacji DNS Coolify automatycznie skonfiguruje reverse proxy i certyfikat TLS dla domeny wpisanej jako `https://egzamin.io`.

## 4. Health check

Kontrola zdrowia jest już zdefiniowana w `Dockerfile`, więc Coolify odczyta ją z obrazu. Endpoint można sprawdzić ręcznie:

```text
https://egzamin.io/api/health
```

Oczekiwana odpowiedź:

```json
{"status":"ok","service":"egzaminio"}
```

Jeżeli konfigurujesz health check także w panelu Coolify, użyj:

- metoda: `GET`
- ścieżka: `/api/health`
- port: `3000`
- oczekiwany kod: `200`
- interwał: `30s`
- timeout: `5s`
- retries: `3`

## 5. Deploy

Kliknij **Deploy**. Pierwszy build wykona kolejno instalację zależności, kompilację produkcyjną i utworzenie małego obrazu zawierającego tylko serwer standalone.

Po wdrożeniu sprawdź:

- status aplikacji i health check w Coolify,
- `https://egzamin.io`,
- `https://egzamin.io/api/health`,
- logi aplikacji pod kątem błędów startu.

Przy integracji przez GitHub App można włączyć automatyczne wdrażanie po każdym pushu do `main`.

## Rozwiązywanie problemów

- **502 Bad Gateway:** sprawdź, czy **Ports Exposes** ma wartość `3000`; nie dodawaj mapowania portu hosta.
- **Domena bez HTTPS:** upewnij się, że rekord DNS wskazuje na serwer Coolify i domena w panelu zaczyna się od `https://`.
- **Aplikacja jest unhealthy:** otwórz logi kontenera i sprawdź `/api/health`; Docker daje serwerowi 20 sekund na start.
- **Stara wersja po wdrożeniu:** użyj **Redeploy** z opcją przebudowania obrazu bez cache.

## Dokumentacja Coolify

- [Dockerfile Build Pack](https://next.coolify.io/docs/applications/build-packs/dockerfile)
- [Domeny i automatyczny HTTPS](https://coolify.io/docs/knowledge-base/domains)
- [Health checks](https://coolify.io/docs/knowledge-base/health-checks)
- [Rozwiązywanie błędu 502](https://coolify.io/docs/troubleshoot/applications/bad-gateway)
