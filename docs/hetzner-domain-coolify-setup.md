# egzamin.io na istniejącym serwerze Coolify

Stan instrukcji: 24 sierpnia 2026 r. Zakładamy, że serwer Hetzner już działa, Coolify obsługuje na nim inne aplikacje, a panel administratora ma HTTPS. Nie instalujemy drugiej instancji Coolify, nie zmieniamy nameserverów domeny i nie otwieramy portów instalacyjnych 8000/6001/6002.

Docelowy układ:

```text
egzamin.io / www.egzamin.io
          │ DNS A / CNAME
          ▼
istniejący serwer Hetzner
          │ 80/443
          ▼
istniejący Coolify + reverse proxy
          │ port kontenera 3000
          ▼
egzaminio z gałęzi main
          │ HTTPS
          ▼
Supabase EU: Auth + PostgreSQL + RLS
```

## 1. Zbierz cztery wartości

Przed rozpoczęciem przygotuj:

| Symbol w instrukcji | Skąd go wziąć |
|---|---|
| `<COOLIFY_IPV4>` | publiczne IPv4 istniejącego serwera Hetzner |
| `<COOLIFY_PANEL_URL>` | działający adres panelu, np. `https://coolify.twojadomena.pl` |
| `<SUPABASE_PROJECT_REF>` | Supabase → Project Settings → General |
| `<SUPABASE_PUBLISHABLE_KEY>` | Supabase → Project Settings → API Keys |

Nie używaj w aplikacji klucza `service_role` ani sekretów Google/Facebook.

## 2. Kontrola istniejącej maszyny — bez zmian w działających aplikacjach

W Coolify otwórz **Servers**, wybierz obecną maszynę i sprawdź:

- status serwera i proxy jest zielony,
- porty publiczne 80 i 443 są dostępne,
- panel działa przez HTTPS,
- na dysku jest co najmniej 10 GB wolnego miejsca na pierwszy build,
- serwer ma zapas pamięci na równoległy build; przy małej ilości RAM wdrażaj poza godzinami ruchu,
- backup lub snapshot serwera jest aktualny.

Opcjonalna kontrola przez SSH:

```bash
df -h /
df -h /data
free -h
docker system df
```

Nie uruchamiaj `docker system prune` na współdzielonej maszynie bez sprawdzenia zasobów innych aplikacji. Nie zmieniaj globalnego firewalla, proxy ani domeny panelu Coolify, jeśli obecne aplikacje działają poprawnie.

## 3. Podepnij DNS egzamin.io do istniejącego serwera

W aktualnie używanej strefie DNS domeny dodaj:

| Typ | Nazwa | Wartość | TTL na czas wdrożenia |
|---|---|---|---:|
| A | `@` | `<COOLIFY_IPV4>` | 300 |
| CNAME | `www` | `egzamin.io` | 300 |

Jeżeli dostawca DNS nie pozwala użyć CNAME dla `www`, dodaj drugi rekord A wskazujący `<COOLIFY_IPV4>`.

Rekord AAAA dodaj wyłącznie wtedy, gdy ten sam serwer i Coolify już poprawnie obsługują IPv6 dla innych domen. Nie zmieniaj rekordów MX, SPF, DKIM, DMARC ani delegacji nameserverów. Nie dodawaj nowego rekordu `coolify`, ponieważ panel ma już działający adres.

Jeżeli DNS jest w Cloudflare, na czas pierwszego certyfikatu ustaw rekord jako **DNS only**. Proxy możesz włączyć dopiero po potwierdzeniu działania domeny i OAuth.

Kontrola propagacji:

```bash
dig +short A egzamin.io
dig +short CNAME www.egzamin.io
```

Pierwsze polecenie ma zwrócić `<COOLIFY_IPV4>`.

## 4. Podłącz repozytorium do istniejącego Coolify

Jeżeli obecna GitHub App w Coolify ma już dostęp do `tomekpilat/egzamin-io`, użyj jej. W przeciwnym razie edytuj instalację GitHub App na GitHubie i dodaj wyłącznie to repozytorium; nie twórz drugiej aplikacji bez potrzeby.

W Coolify:

1. Otwórz **Projects → Add** i utwórz projekt `egzaminio`.
2. Dodaj środowisko `production`.
3. Wybierz **New Resource → Private Repository (with GitHub App)**.
4. Wybierz repozytorium `tomekpilat/egzamin-io`.
5. Branch: `main`.
6. Build Pack: `Dockerfile`.
7. Base Directory: `/`.
8. Dockerfile Location: `/Dockerfile`.
9. Włącz **Auto Deploy** dla pushy do `main`.
10. Preview Deployments pozostaw wyłączone, dopóki nie będą potrzebne dla PR-ów.

Jeżeli repozytorium jest publiczne, można użyć **Public Repository** i adresu:

```text
https://github.com/tomekpilat/egzamin-io
```

## 5. Ustaw aplikację

W konfiguracji zasobu ustaw:

```text
Ports Exposes: 3000
Ports Mappings: puste
Domains: https://egzamin.io,https://www.egzamin.io
```

Nie mapuj portu 3000 na hosta. Reverse proxy istniejącego Coolify połączy domenę bezpośrednio z portem kontenera.

Dodaj dwie zmienne środowiskowe jako dostępne podczas buildu i runtime:

```text
SUPABASE_URL=https://<SUPABASE_PROJECT_REF>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<SUPABASE_PUBLISHABLE_KEY>
```

Ustaw health check:

| Pole | Wartość |
|---|---|
| Method | `GET` |
| Path | `/api/health` |
| Port | `3000` |
| Expected status | `200` |
| Interval | `30s` |
| Timeout | `5s` |
| Retries | `3` |

Nie dodawaj `PORT`, `HOST`, `service_role`, Client Secret Google ani App Secret Facebook. `Dockerfile` ustawia port i host, a sekrety providerów zostają w Supabase.

## 6. Zastosuj migracje Supabase i wykonaj pierwszy deploy

Na komputerze z repozytorium:

```bash
supabase login
supabase link --project-ref <SUPABASE_PROJECT_REF>
supabase db push
```

Następnie od razu kliknij **Deploy** w Coolify. Migracja blokuje starszy, bezpośredni zapis roli i zgody opiekuna, dlatego po jej zastosowaniu nie cofaj samej aplikacji do wersji bez RPC `complete_onboarding`. W razie problemu naprawiaj wdrożenie do przodu.

Jeżeli istnieją już aktywni użytkownicy, zaplanuj krótkie okno wdrożeniowe i wyłącz w tym czasie nowe rejestracje. Migracja celowo unieważnia wcześniejsze zgody ucznia zaznaczone samodzielnie i wymaga potwierdzenia przez konto rodzica.

Po deploymencie sprawdź:

```text
https://egzamin.io
https://egzamin.io/api/health
```

Oczekiwana odpowiedź:

```json
{"status":"ok","service":"egzaminio"}
```

W Coolify sprawdź także, czy kontener jest healthy i czy certyfikat obejmuje `egzamin.io` oraz `www.egzamin.io`.

## 7. Konfiguracja URL w Supabase

W **Authentication → URL Configuration** ustaw:

```text
Site URL:
https://egzamin.io

Redirect URLs:
https://egzamin.io/panel
https://egzamin.io/wybierz-role
https://egzamin.io/oczekuje-na-zgode
http://localhost:3000/panel
http://localhost:3000/wybierz-role
http://localhost:3000/oczekuje-na-zgode
```

Następnie:

- włącz potwierdzanie adresu e-mail,
- skonfiguruj własny SMTP, np. `noreply@egzamin.io`,
- ustaw ważność OTP maksymalnie na 3600 sekund,
- przejrzyj Auth Rate Limits,
- włącz CAPTCHA przed kampanią marketingową,
- włącz MFA na koncie właściciela i sprawdź Security Advisor/RLS.

## 8. Google OAuth

W Google Auth Platform:

1. Uzupełnij Branding, Audience i ekran zgody.
2. Dodaj `egzamin.io` jako authorized domain.
3. Ustaw:
   - Homepage: `https://egzamin.io`
   - Privacy Policy: `https://egzamin.io/polityka-prywatnosci`
   - Terms: `https://egzamin.io/regulamin`
4. Utwórz OAuth Client typu **Web application**.
5. Authorized JavaScript origins:

   ```text
   https://egzamin.io
   https://www.egzamin.io
   http://localhost:3000
   ```

6. Authorized redirect URI:

   ```text
   https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback
   ```

7. Client ID i Client Secret wklej w **Supabase → Authentication → Providers → Google**.

## 9. Facebook OAuth

W Meta for Developers:

1. Utwórz aplikację i dodaj Facebook Login.
2. Valid OAuth Redirect URI:

   ```text
   https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback
   ```

3. Włącz `public_profile` i `email`.
4. Uzupełnij:
   - App Domains: `egzamin.io`
   - Privacy Policy URL: `https://egzamin.io/polityka-prywatnosci`
   - Terms of Service URL: `https://egzamin.io/regulamin`
   - User Data Deletion: `https://egzamin.io/usun-konto`
5. App ID i App Secret wklej w **Supabase → Authentication → Providers → Facebook**.
6. Przetestuj kontem testera, przełącz aplikację na Live i wykonaj wymagany App Review.

## 10. Test ról po wdrożeniu

Wykonaj test osobnymi adresami e-mail:

1. Zarejestruj ucznia i podaj e-mail rodzica.
2. Potwierdź, że uczeń trafia na `/oczekuje-na-zgode` i nie otworzy panelu.
3. Zarejestruj rodzica dokładnie tym adresem, który podał uczeń.
4. W panelu rodzica zatwierdź prośbę i sprawdź dostęp ucznia.
5. Zarejestruj nauczyciela i potwierdź status `pending` oraz zablokowane funkcje grup.
6. Po sprawdzeniu tożsamości nauczyciela wykonaj w SQL Editor:

   ```sql
   select public.set_teacher_verification(
     (select id from public.profiles where lower(email) = lower('nauczyciel@szkola.pl')),
     'verified'
   );
   ```

7. Sprawdź rejestrację e-mail, Google i Facebook w prywatnym oknie przeglądarki.

## 11. Utrzymanie współdzielonego serwera

- Ustaw w Coolify powiadomienia o nieudanym deploymencie.
- Monitoruj `/api/health`, certyfikat, RAM i przestrzeń w `/data`.
- Backup serwera nie zastępuje backupu Supabase; testuj oba procesy odtworzenia.
- Przed aktualizacją Coolify lub większym deployem wykonaj snapshot serwera.
- Aktualizacje i czyszczenie obrazów Dockera planuj z uwzględnieniem innych aplikacji na maszynie.
- Przy problemach z zasobami ogranicz równoległe buildy lub przenieś build poza godziny ruchu, zamiast zmieniać konfigurację działających usług.

## 12. Checklista produkcyjna

- [ ] `A egzamin.io` wskazuje istniejący serwer Coolify.
- [ ] Nie zmieniono rekordów pocztowych ani domen innych aplikacji.
- [ ] Zasób używa `main`, `Dockerfile` i portu wewnętrznego 3000.
- [ ] Port mapping hosta jest pusty.
- [ ] Ustawiono tylko publiczny URL i publishable key Supabase.
- [ ] Wszystkie migracje Supabase są zastosowane.
- [ ] `/api/health` zwraca 200, a kontener jest healthy.
- [ ] Certyfikat działa dla domeny głównej i `www`.
- [ ] E-mail wymaga potwierdzenia i działa własny SMTP.
- [ ] Google i Facebook działają poza kontami deweloperskimi.
- [ ] Uczeń wymaga zatwierdzenia przez właściwe konto rodzica.
- [ ] Nieweryfikowany nauczyciel nie ma dostępu do danych grup.
- [ ] Powiadomienia, backupy i monitoring są aktywne.
- [ ] Dokumenty prawne zostały uzupełnione danymi operatora i sprawdzone przez prawnika.

## Oficjalne źródła

- Coolify: [domeny](https://coolify.io/docs/knowledge-base/domains), [GitHub App](https://next.coolify.io/docs/applications/sources/github/app), [automatyczne deploymenty](https://coolify.io/docs/applications/ci-cd/github/auto-deploy) i [health checks](https://coolify.io/docs/knowledge-base/health-checks).
- Supabase: [Google Login](https://supabase.com/docs/guides/auth/social-login/auth-google), [Facebook Login](https://supabase.com/docs/guides/auth/social-login/auth-facebook) i [Production Checklist](https://supabase.com/docs/guides/deployment/going-into-prod).
- Hetzner: [backupy i snapshoty](https://docs.hetzner.com/cloud/servers/backups-snapshots/overview/).
