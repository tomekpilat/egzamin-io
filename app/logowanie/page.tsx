"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { getSupabaseClient } from "@/lib/supabase-browser";
import type { SelfServiceRole } from "@/lib/roles";

type Mode = "login" | "signup";
type Notice = { type: "error" | "success"; message: string } | null;

const roleOptions: Array<{
  value: SelfServiceRole;
  title: string;
  description: string;
  icon: string;
}> = [
  {
    value: "student",
    title: "Uczeń",
    description: "Ćwiczenia, podpowiedzi AI i Twój postęp",
    icon: "U",
  },
  {
    value: "parent",
    title: "Rodzic",
    description: "Postępy dziecka i tygodniowy plan nauki",
    icon: "R",
  },
  {
    value: "teacher",
    title: "Nauczyciel",
    description: "Zestawy zadań i wyniki uczniów",
    icon: "N",
  },
];

function friendlyAuthError(message: string) {
  if (/invalid login credentials/i.test(message)) {
    return "Nieprawidłowy e-mail lub hasło.";
  }
  if (/email not confirmed/i.test(message)) {
    return "Potwierdź adres e-mail przez link, który wysłaliśmy.";
  }
  if (/user already registered/i.test(message)) {
    return "Konto z tym adresem już istnieje. Spróbuj się zalogować.";
  }
  if (/password/i.test(message)) {
    return "Hasło musi mieć co najmniej 8 znaków.";
  }
  return "Nie udało się wykonać operacji. Spróbuj ponownie za chwilę.";
}

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>(
    searchParams.get("tryb") === "rejestracja" ? "signup" : "login",
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<SelfServiceRole>("student");
  const [guardianConsent, setGuardianConsent] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setNotice(null);
    setPassword("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    if (mode === "signup" && !acceptedTerms) {
      setNotice({
        type: "error",
        message: "Zaakceptuj politykę prywatności, aby utworzyć konto.",
      });
      return;
    }

    if (mode === "signup" && role === "student" && !guardianConsent) {
      setNotice({
        type: "error",
        message: "Konto ucznia wymaga potwierdzenia zgody rodzica lub opiekuna.",
      });
      return;
    }

    setBusy(true);
    try {
      const supabase = await getSupabaseClient();
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/panel`,
            data: {
              display_name: name.trim(),
              requested_role: role,
              guardian_consent_confirmed:
                role === "student" ? guardianConsent : false,
            },
          },
        });
        if (error) throw error;

        setPassword("");
        if (data.session) {
          window.location.assign("/panel");
          return;
        }

        setNotice({
          type: "success",
          message:
            "Konto utworzone. Sprawdź skrzynkę i potwierdź adres e-mail, aby się zalogować.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        window.location.assign("/panel");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      setNotice({ type: "error", message: friendlyAuthError(message) });
    } finally {
      setBusy(false);
    }
  }

  async function handleSocial(provider: "google" | "facebook") {
    setBusy(true);
    setNotice(null);
    try {
      const supabase = await getSupabaseClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/wybierz-role`,
        },
      });
      if (error) throw error;
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      setNotice({ type: "error", message: friendlyAuthError(message) });
      setBusy(false);
    }
  }

  return (
    <main className="account-page">
      <header className="account-header">
        <Link href="/" aria-label="egzaminio — strona główna">
          <BrandLogo />
        </Link>
        <Link href="/" className="account-back">
          ← Wróć na stronę
        </Link>
      </header>

      <section className="auth-shell">
        <div className="auth-story">
          <span className="section-kicker">Twoje miejsce do nauki</span>
          <h1>
            Spokojnie. Zrobimy to <em>krok po kroku.</em>
          </h1>
          <p>
            Jedno konto otwiera ćwiczenia CKE, rozmowę z nauczycielem AI i
            postęp dopasowany do Twojej roli.
          </p>
          <div className="auth-proof">
            <div>
              <b>3</b>
              <span>pytania do AI dziennie bez opłat</span>
            </div>
            <div>
              <b>100%</b>
              <span>zadań opartych na arkuszach CKE</span>
            </div>
          </div>
          <blockquote>
            „Nie podaje gotowca. Pomaga zrozumieć dokładnie ten krok, na którym
            utknąłem.”
            <small>— Kuba, klasa 8</small>
          </blockquote>
        </div>

        <div className="auth-card">
          <div className="auth-tabs" role="tablist" aria-label="Dostęp do konta">
            <button
              type="button"
              role="tab"
              className={mode === "login" ? "active" : ""}
              aria-selected={mode === "login"}
              onClick={() => changeMode("login")}
            >
              Logowanie
            </button>
            <button
              type="button"
              role="tab"
              className={mode === "signup" ? "active" : ""}
              aria-selected={mode === "signup"}
              onClick={() => changeMode("signup")}
            >
              Rejestracja
            </button>
          </div>

          <div className="auth-card-heading">
            <h2>{mode === "signup" ? "Załóż darmowe konto" : "Dobrze Cię widzieć"}</h2>
            <p>
              {mode === "signup"
                ? "Bez karty płatniczej. Zacznij od planu bezpłatnego."
                : "Zaloguj się i wróć do swojego planu nauki."}
            </p>
          </div>

          <div className="social-buttons">
            <button type="button" disabled={busy} onClick={() => handleSocial("google")}>
              <span className="provider-mark google-mark">G</span>
              Kontynuuj z Google
            </button>
            <button type="button" disabled={busy} onClick={() => handleSocial("facebook")}>
              <span className="provider-mark facebook-mark">f</span>
              Kontynuuj z Facebookiem
            </button>
          </div>

          <div className="auth-divider"><span>lub przez e-mail</span></div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === "signup" && (
              <>
                <label>
                  Imię
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    minLength={2}
                    maxLength={80}
                    autoComplete="name"
                    placeholder="Jak mamy się do Ciebie zwracać?"
                    required
                  />
                </label>

                <fieldset className="role-picker">
                  <legend>Zakładam konto jako</legend>
                  <div>
                    {roleOptions.map((option) => (
                      <label
                        key={option.value}
                        className={role === option.value ? "selected" : ""}
                      >
                        <input
                          type="radio"
                          name="role"
                          value={option.value}
                          checked={role === option.value}
                          onChange={() => setRole(option.value)}
                        />
                        <span className="role-icon">{option.icon}</span>
                        <b>{option.title}</b>
                        <small>{option.description}</small>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </>
            )}

            <label>
              E-mail
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={254}
                autoComplete="email"
                placeholder="twoj@email.pl"
                required
              />
            </label>
            <label>
              Hasło
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                maxLength={128}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder={mode === "signup" ? "Minimum 8 znaków" : "Twoje hasło"}
                required
              />
            </label>

            {mode === "signup" && role === "student" && (
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={guardianConsent}
                  onChange={(event) => setGuardianConsent(event.target.checked)}
                />
                <span>Mam zgodę rodzica lub opiekuna na utworzenie konta.</span>
              </label>
            )}

            {mode === "signup" && (
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                />
                <span>
                  Akceptuję <a href="/polityka-prywatnosci">politykę prywatności</a>.
                </span>
              </label>
            )}

            {notice && (
              <div className={`auth-notice ${notice.type}`} role="status" aria-live="polite">
                {notice.message}
              </div>
            )}

            <button className="auth-submit" type="submit" disabled={busy}>
              {busy
                ? "Chwila…"
                : mode === "signup"
                  ? "Załóż darmowe konto"
                  : "Zaloguj się"}
              <span>→</span>
            </button>
          </form>

          <p className="auth-security">Sesję i hasło bezpiecznie obsługuje Supabase Auth.</p>
        </div>
      </section>
    </main>
  );
}
