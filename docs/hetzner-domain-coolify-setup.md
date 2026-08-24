# Hetzner + Coolify + domena egzamin.io — instrukcja produkcyjna

Stan instrukcji: 24 sierpnia 2026 r. Architektura: aplikacja Docker na Hetzner Cloud, zarządzana przez self-hosted Coolify; Supabase pozostaje usługą uwierzytelniania i bazy danych.

## 1. Docelowy układ

```text
egzamin.io / www.egzamin.io
          │ DNS A/AAAA
          ▼
Hetzner Cloud (Ubuntu 24.04 LTS)
          │ 80/443
          ▼
Coolify + reverse proxy + Let's Encrypt
          │ port wewnętrzny 3000
          ▼
kontener egzaminio z repozytorium GitHub
          │ HTTPS
          ▼
Supabase EU: Auth + PostgreSQL + RLS
```

Rekomendacja startowa: serwer **CX33**, lokalizacja **Nuremberg (NBG1)** albo **Falkenstein (FSN1)**, Ubuntu 24.04 LTS, publiczny IPv4 i IPv6, automatyczne backupy. CX33 daje zapas na buildy Dockera i Coolify; oficjalne minimum Coolify to 2 rdzenie, 2 GB RAM i co najmniej 30 GB przestrzeni, ale build na tym samym serwerze potrzebuje większego marginesu.

Po zmianie cen z 15 czerwca 2026 r. CX33 w Niemczech kosztuje 8,49 EUR miesięcznie bez VAT i bez opłaty za IPv4. Przed zakupem sprawdź aktualną kwotę w podsumowaniu Hetznera; backup i IPv4 są doliczane osobno.

## 2. Przygotuj klucz SSH

Na swoim komputerze wykonaj:

```bash
ssh-keygen -t ed25519 -a 64 -C "egzaminio-hetzner" -f ~/.ssh/egzaminio_hetzner
cat ~/.ssh/egzaminio_hetzner.pub
```

Skopiuj cały klucz publiczny zaczynający się od `ssh-ed25519`. Klucza prywatnego bez `.pub` nie wysyłaj nikomu i nie dodawaj do GitHuba.

## 3. Utwórz projekt i serwer w Hetzner Console

1. Zaloguj się do Hetzner Console i utwórz projekt `egzaminio-production`.
2. W **Security → SSH Keys** dodaj skopiowany klucz jako `egzaminio-owner`.
3. Wybierz **Add Server**:
   - Location: `Nuremberg` lub `Falkenstein`.
   - Image: `Ubuntu 24.04 LTS`.
   - Type: `Shared vCPU → CX33`.
   - Networking: IPv4 i IPv6 włączone.
   - SSH key: `egzaminio-owner`.
   - Backups: włączone.
   - Name: `egzaminio-prod-01`.
4. Po utworzeniu włącz **Deletion protection** i **Rebuild protection**.
5. Zapisz publiczny adres IPv4 jako `<SERVER_IPV4>` oraz pierwszy adres IPv6 jako `<SERVER_IPV6>`.

Połącz się:

```bash
ssh -i ~/.ssh/egzaminio_hetzner root@<SERVER_IPV4>
```

Sprawdź system i miejsce:

```bash
lsb_release -a
df -h /
free -h
```

## 4. Firewall Hetznera

W **Firewalls → Create Firewall** utwórz `egzaminio-production` i przypnij do serwera.

Reguły przychodzące podczas instalacji:

| Protokół | Port | Źródło | Cel |
|---|---:|---|---|
| TCP | 22 | Twój publiczny adres IP `/32` | SSH |
| TCP | 80 | `0.0.0.0/0`, `::/0` | HTTP i wydanie certyfikatu |
| TCP | 443 | `0.0.0.0/0`, `::/0` | HTTPS |
| TCP | 8000 | Twój publiczny adres IP `/32` | panel Coolify podczas instalacji |
| TCP | 6001 | Twój publiczny adres IP `/32` | komunikacja realtime Coolify podczas instalacji |
| TCP | 6002 | Twój publiczny adres IP `/32` | terminal Coolify podczas instalacji |

Ruch wychodzący pozostaw dozwolony. Jeżeli zmienia Ci się domowy adres IP, tymczasowo zaktualizuj regułę SSH zamiast otwierać port 22 dla całego internetu. Firewall Hetznera jest ważniejszy niż samo UFW, ponieważ publikowane porty Dockera mogą omijać typowe reguły UFW.

## 5. Zainstaluj Coolify

Zaloguj się jako `root`, następnie:

```bash
apt update
apt upgrade -y
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Installer instaluje Docker Engine, narzędzia systemowe i Coolify w `/data/coolify`. Nie instaluj Dockera ze Snap.

Po zakończeniu otwórz:

```text
http://<SERVER_IPV4>:8000
```

Od razu utwórz pierwsze konto administratora — pierwsza osoba, która otworzy rejestrację świeżej instancji, może przejąć panel.

## 6. DNS domeny

Masz dwie poprawne opcje. Wybierz jedną; nie utrzymuj dwóch niesynchronizowanych stref.

### Opcja A — DNS zostaje u obecnego rejestratora

Dodaj rekordy:

| Typ | Nazwa | Wartość | TTL na czas wdrożenia |
|---|---|---|---:|
| A | `@` | `<SERVER_IPV4>` | 300 |
| A | `www` | `<SERVER_IPV4>` | 300 |
| A | `coolify` | `<SERVER_IPV4>` | 300 |
| AAAA | `@` | `<SERVER_IPV6>` | 300 |
| AAAA | `www` | `<SERVER_IPV6>` | 300 |
| AAAA | `coolify` | `<SERVER_IPV6>` | 300 |

Jeżeli IPv6 nie jest poprawnie skonfigurowany na serwerze i proxy, pomiń rekordy AAAA — błędne AAAA potrafi powodować pozornie losowe problemy z HTTPS.

### Opcja B — cała strefa DNS w Hetznerze

1. W projekcie przejdź do **DNS → Add zone → Primary zone** i dodaj `egzamin.io`.
2. Dodaj rekordy A/AAAA z tabeli powyżej.
3. Skopiuj nameservery pokazane przez Hetznera. Dla standardowej strefy są to obecnie:

   ```text
   hydrogen.ns.hetzner.com
   oxygen.ns.hetzner.com
   helium.ns.hetzner.de
   ```

4. U rejestratora domeny zmień delegację domeny na te trzy serwery. Sama zmiana rekordów NS wewnątrz starej strefy nie wystarczy.
5. Jeżeli domena ma aktywny DNSSEC, usuń stary rekord DS przed zmianą delegacji albo skonfiguruj nowy poprawny DS; inaczej domena może przestać się rozwiązywać.
6. Przenieś wszystkie istniejące rekordy poczty: MX, SPF, DKIM i DMARC. Nie usuwaj ich podczas migracji DNS.

Kontrola propagacji:

```bash
dig +short A egzamin.io
dig +short A coolify.egzamin.io
dig +short NS egzamin.io
```

Każde A powinno wskazać `<SERVER_IPV4>`.

## 7. Przenieś panel Coolify pod HTTPS

Gdy rekord `coolify.egzamin.io` już wskazuje serwer:

1. W Coolify otwórz **Settings**.
2. Ustaw Instance Domain na `https://coolify.egzamin.io`.
3. Zapisz i odczekaj na certyfikat Let's Encrypt.
4. Otwórz panel przez `https://coolify.egzamin.io`.
5. Dopiero po potwierdzeniu działania usuń z Hetzner Firewall publiczne reguły portów `8000`, `6001` i `6002`. Zostają 22, 80 i 443.

Coolify automatycznie odnawia 90-dniowe certyfikaty Let's Encrypt. Port 80 musi pozostać dostępny dla wystawiania i odnowień certyfikatów.

## 8. Połącz GitHub

Rekomendowana jest GitHub App z dostępem tylko do repozytorium `tomekpilat/egzamin-io`:

1. W Coolify otwórz **Sources → Add → GitHub App**.
2. Wybierz **Automated Installation** i jako publiczny endpoint użyj `https://coolify.egzamin.io` — bez dopisywania `/webhooks`.
3. Na GitHubie utwórz aplikację z poziomu prowadzonego procesu Coolify.
4. W **Install Repositories** wybierz **Only select repositories** i zaznacz `egzamin-io`.
5. Preview Deployments włącz dopiero wtedy, gdy chcesz tworzyć środowiska dla PR-ów. Nie zezwalaj publicznym fork PR-om na deployment.

GitHub App daje automatyczne deploymenty po pushu. W aplikacji sprawdź **Advanced → Auto Deploy = enabled**.

## 9. Utwórz aplikację egzaminio w Coolify

1. **Projects → Add**: projekt `egzaminio`, środowisko `production`.
2. **New Resource → Private Repository (with GitHub App)**.
3. Wybierz `tomekpilat/egzamin-io` i gałąź `main`.
4. Build Pack: `Dockerfile`.
5. Base Directory: `/`.
6. Dockerfile Location: `/Dockerfile`.
7. Internal/Exposed Port: `3000`.
8. Port mapping hosta pozostaw pusty — ruch obsługuje reverse proxy.
9. Domains:

   ```text
   https://egzamin.io,https://www.egzamin.io
   ```

10. Health check:
    - Method: `GET`
    - Path: `/api/health`
    - Port: `3000`
    - Expected status: `200`
    - Interval: `30s`
    - Timeout: `5s`
    - Retries: `3`

11. Dodaj runtime environment variables:

    ```text
    SUPABASE_URL=https://TWOJ_PROJECT_REF.supabase.co
    SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
    ```

Nie dodawaj `service_role`, sekretu Google ani sekretu Facebooka do frontendu lub repozytorium. Sekrety providerów zostają w Supabase.

12. Kliknij **Deploy** i sprawdź:

    ```text
    https://egzamin.io
    https://egzamin.io/api/health
    ```

Oczekiwana odpowiedź health check:

```json
{"status":"ok","service":"egzaminio"}
```

## 10. Supabase i migracje

1. Utwórz projekt Supabase w regionie UE, możliwie blisko serwera.
2. Z lokalnego repozytorium wykonaj:

   ```bash
   supabase login
   supabase link --project-ref TWOJ_PROJECT_REF
   supabase db push
   ```

3. W **Authentication → URL Configuration** ustaw:

   ```text
   Site URL: https://egzamin.io
   Redirect URLs:
   https://egzamin.io/panel
   https://egzamin.io/wybierz-role
   https://egzamin.io/oczekuje-na-zgode
   http://localhost:3000/panel
   http://localhost:3000/wybierz-role
   http://localhost:3000/oczekuje-na-zgode
   ```

4. Włącz potwierdzanie e-maila i ustaw własny SMTP z domeny, np. `noreply@egzamin.io`. Wyłącz tracking linków u dostawcy SMTP, bo może uszkadzać jednorazowe linki Supabase.
5. Ustaw czas ważności OTP maksymalnie na 3600 sekund, przejrzyj Auth Rate Limits i włącz CAPTCHA dla rejestracji/logowania przed kampanią marketingową.
6. Włącz MFA na koncie właściciela Supabase, SSL Enforcement i sprawdź Security Advisor/RLS.

## 11. Google OAuth

W Google Auth Platform:

1. Utwórz projekt i skonfiguruj **Branding**, **Audience** oraz ekran zgody.
2. Dodaj domenę `egzamin.io` jako authorized domain.
3. Ustaw linki:
   - Homepage: `https://egzamin.io`
   - Privacy policy: `https://egzamin.io/polityka-prywatnosci`
   - Terms: `https://egzamin.io/regulamin`
4. Utwórz OAuth Client typu **Web application**.
5. Authorized JavaScript origins:

   ```text
   https://egzamin.io
   https://www.egzamin.io
   http://localhost:3000
   ```

6. Authorized redirect URI — dokładnie callback pokazany w Supabase:

   ```text
   https://TWOJ_PROJECT_REF.supabase.co/auth/v1/callback
   ```

7. Client ID i Client Secret wklej w **Supabase → Authentication → Providers → Google**.

## 12. Facebook OAuth

W Meta for Developers:

1. Utwórz aplikację i dodaj przypadek użycia Facebook Login.
2. W ustawieniach Facebook Login wpisz jako **Valid OAuth Redirect URI**:

   ```text
   https://TWOJ_PROJECT_REF.supabase.co/auth/v1/callback
   ```

3. Włącz wymagane pola `public_profile` oraz `email`.
4. Uzupełnij:
   - App Domains: `egzamin.io`
   - Privacy Policy URL: `https://egzamin.io/polityka-prywatnosci`
   - Terms of Service URL: `https://egzamin.io/regulamin`
   - User Data Deletion: `https://egzamin.io/usun-konto`
5. App ID i App Secret wklej w **Supabase → Authentication → Providers → Facebook**.
6. Dodaj testera, przeprowadź test, następnie przełącz aplikację z Development na Live i wykonaj wymagany App Review.

## 13. Bezpieczeństwo dzieci i nauczycieli

Po `supabase db push` obowiązuje następujący przepływ:

1. Uczeń podaje własny e-mail i osobny e-mail opiekuna.
2. Konto ucznia jest zablokowane na `/oczekuje-na-zgode`.
3. Opiekun rejestruje konto rodzica z dokładnie tym samym adresem, który podał uczeń.
4. Rodzic widzi prośbę, weryfikuje tożsamość dziecka poza serwisem i zatwierdza lub odrzuca.
5. Baza zapisuje czas, konto rodzica, prośbę i powiązanie rodzic–dziecko.
6. Nauczyciel może obejrzeć panel, ale grupy, zaproszenia i dane uczniów pozostają zablokowane do administracyjnego potwierdzenia statusu.

Weryfikacja nauczyciela przez SQL Editor po sprawdzeniu tożsamości:

```sql
select public.set_teacher_verification(
  (select id from public.profiles where lower(email) = lower('nauczyciel@szkola.pl')),
  'verified'
);
```

## 14. Backup, aktualizacje i monitoring

- Włącz Hetzner Backups: 7 automatycznych dziennych kopii dysku. Pamiętaj, że osobne Hetzner Volumes nie są nimi objęte.
- Zrób ręczny Snapshot po poprawnym skonfigurowaniu Coolify i przed dużą aktualizacją.
- Włącz ochronę przed usunięciem serwera i snapshotu.
- Backup serwera nie zastępuje backupu Supabase. Skonfiguruj osobny eksport bazy i test odtworzenia.
- W Coolify ustaw powiadomienia o nieudanym deploymencie i sprawdzaj zajętość dysku przez obrazy Dockera.
- Monitoruj co najmniej `/api/health`, czas odpowiedzi, wygasanie certyfikatu oraz wykorzystanie RAM/dysku.
- Raz w miesiącu instaluj aktualizacje systemu i Coolify po wykonaniu snapshotu.

## 15. Checklista „gotowe do ruchu”

- [ ] DNS A/AAAA wskazuje właściwy serwer.
- [ ] `https://coolify.egzamin.io` ma poprawny certyfikat.
- [ ] Porty 8000/6001/6002 są zamknięte publicznie.
- [ ] `https://egzamin.io/api/health` zwraca 200.
- [ ] Wszystkie migracje Supabase są zastosowane.
- [ ] E-mail wymaga potwierdzenia i działa własny SMTP.
- [ ] Google działa dla zwykłego użytkownika spoza zespołu testowego.
- [ ] Facebook jest Live, zwraca e-mail i ma komplet adresów prawnych.
- [ ] Uczeń nie wejdzie do panelu bez zatwierdzenia rodzica.
- [ ] Rodzic nie widzi obcych próśb ani prywatnych rozmów AI.
- [ ] Nieweryfikowany nauczyciel nie ma dostępu do danych grup.
- [ ] Backup i odtworzenie zostały przetestowane.
- [ ] Polityka prywatności ma uzupełnione dane Hetznera, Supabase i operatora.

## Oficjalne źródła

- Hetzner: [tworzenie serwera](https://docs.hetzner.com/cloud/servers/getting-started/creating-a-server/), [DNS](https://docs.hetzner.com/networking/dns/overview/), [łączenie przez SSH](https://docs.hetzner.com/cloud/servers/getting-started/connecting-to-the-server/) i [backupy](https://docs.hetzner.com/cloud/servers/backups-snapshots/overview/).
- Coolify: [instalacja](https://coolify.io/docs/get-started/installation), [firewall](https://coolify.io/docs/knowledge-base/server/firewall), [domeny](https://coolify.io/docs/knowledge-base/domains), [GitHub App](https://next.coolify.io/docs/applications/sources/github/app) i [automatyczne deploymenty](https://coolify.io/docs/applications/ci-cd/github/auto-deploy).
- Supabase: [Google Login](https://supabase.com/docs/guides/auth/social-login/auth-google), [Facebook Login](https://supabase.com/docs/guides/auth/social-login/auth-facebook) i [Production Checklist](https://supabase.com/docs/guides/deployment/going-into-prod).
- UI i wzory matematyczne: [shadcn/ui dla Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4) oraz [MathJax 4 — komponenty przeglądarkowe](https://docs.mathjax.org/en/v4.0/web/components/combined.html).
