"use client";

import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SocialAuthButtons, type SocialProvider } from "@/components/social-auth-buttons";
import { validateSignupConfirmation } from "@/lib/auth-validation";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { LEGAL_VERSION } from "@/lib/legal";
import { getSupabaseClient } from "@/lib/supabase-browser";
import type { SelfServiceRole } from "@/lib/roles";
import { SiteHeader } from "@/components/site-header";

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
];

const roleJourneys: Record<
  SelfServiceRole,
  {
    kicker: string;
    title: string;
    lead: string;
    steps: Array<{ title: string; description: string }>;
    note: string;
  }
> = {
  student: {
    kicker: "Konto ucznia",
    title: "Ty ćwiczysz. Rodzic wspiera.",
    lead: "Wiesz dokładnie, co wydarzy się po założeniu konta.",
    steps: [
      {
        title: "Rozwiązujesz zadania CKE",
        description: "Ćwiczysz z podpowiedziami AI i własnym planem nauki.",
      },
      {
        title: "Zapraszasz rodzica",
        description: "Podajesz jego e-mail, a my wysyłamy prośbę o zgodę.",
      },
      {
        title: "Uczycie się spokojniej",
        description: "Ty widzisz zadania, a rodzic postęp i tygodniowy cel.",
      },
    ],
    note: "Konto ucznia uruchomimy po akceptacji rodzica lub opiekuna.",
  },
  parent: {
    kicker: "Konto rodzica",
    title: "Wspierasz. Nie odrabiasz za dziecko.",
    lead: "Trzy proste kroki do wspólnego planu nauki.",
    steps: [
      {
        title: "Zapraszasz dziecko",
        description: "Wysyłasz link do rejestracji i swój adres e-mail.",
      },
      {
        title: "Łączysz konta",
        description: "Zatwierdzasz prośbę dziecka w panelu rodzica.",
      },
      {
        title: "Widzisz to, co ważne",
        description: "Śledzisz regularność, postęp i ustawiasz tygodniowy cel.",
      },
    ],
    note: "Jedno konto rodzica może wspierać więcej niż jedno dziecko.",
  },
};

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
  const [email, setEmail] = useState("");
  const [emailConfirmation, setEmailConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [role, setRole] = useState<SelfServiceRole>(searchParams.get("rola") === "rodzic" ? "parent" : "student");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<SocialProvider | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const busy = emailBusy || pendingProvider !== null;

  useEffect(() => {
    if (mode === "signup") trackAnalyticsEvent("signup_started");
  }, [mode]);

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setNotice(null);
    setPassword("");
    setPasswordConfirmation("");
    setEmailConfirmation("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    if (mode === "signup") {
      const confirmationError = validateSignupConfirmation(
        email,
        emailConfirmation,
        password,
        passwordConfirmation,
      );
      if (confirmationError) {
        setNotice({ type: "error", message: confirmationError });
        return;
      }
    }

    if (mode === "signup" && !acceptedTerms) {
      setNotice({
        type: "error",
        message: "Zaakceptuj regulamin i zapoznaj się z polityką prywatności.",
      });
      return;
    }

    if (mode === "signup" && role === "student" && !guardianEmail.trim()) {
      setNotice({
        type: "error",
        message: "Podaj e-mail rodzica lub opiekuna, który zatwierdzi konto ucznia.",
      });
      return;
    }

    if (mode === "signup" && role === "student" && guardianEmail.trim().toLowerCase() === email.trim().toLowerCase()) {
      setNotice({ type: "error", message: "E-mail opiekuna musi być inny niż e-mail ucznia." });
      return;
    }

    setEmailBusy(true);
    try {
      const supabase = await getSupabaseClient();
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/panel`,
            data: {
              display_name: email.trim().split("@")[0],
              requested_role: role,
              guardian_email: role === "student" ? guardianEmail.trim().toLowerCase() : null,
              legal_accepted: true,
              legal_version: LEGAL_VERSION,
            },
          },
        });
        if (error) throw error;

        trackAnalyticsEvent("signup_completed");

        setPassword("");
        setPasswordConfirmation("");
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
        trackAnalyticsEvent("login_completed");
        window.location.assign("/panel");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      setNotice({ type: "error", message: friendlyAuthError(message) });
    } finally {
      setEmailBusy(false);
    }
  }

  async function handleSocial(provider: SocialProvider) {
    if (busy) return;

    setPendingProvider(provider);
    setNotice(null);
    try {
      const supabase = await getSupabaseClient();
      if (mode === "signup") {
        window.sessionStorage.setItem("egzaminio:signup-role", role);
      } else {
        window.sessionStorage.removeItem("egzaminio:signup-role");
      }
      window.sessionStorage.setItem("egzaminio:analytics-auth-intent", mode);
      const roleParam = role === "parent" ? "rodzic" : "uczen";
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo:
            mode === "signup"
              ? `${window.location.origin}/wybierz-role?rola=${roleParam}`
              : `${window.location.origin}/panel`,
        },
      });
      if (error) throw error;
    } catch (error) {
      window.sessionStorage.removeItem("egzaminio:analytics-auth-intent");
      const message = error instanceof Error ? error.message : "unknown";
      setNotice({ type: "error", message: friendlyAuthError(message) });
      setPendingProvider(null);
    }
  }

  const selectedJourney = roleJourneys[role];
  const storyImage =
    mode === "signup" && role === "parent"
      ? {
          src: "/rodzic-i-uczen-nauka.png",
          alt: "Rodzic wspiera ucznia podczas nauki przy laptopie",
          label: "Wspólny plan, spokojne wsparcie",
        }
      : {
          src: "/uczen-nauka-logowanie.png",
          alt: "Ósmoklasista przygotowuje się do egzaminu przy biurku",
          label: mode === "signup" ? "Nauka we własnym tempie" : "Wracaj do swojego planu",
        };

  return (
    <main className="account-page">
      <SiteHeader currentPath="/logowanie" />

      <section className="auth-shell">
        <div className="auth-story">
          <div className="auth-story-image">
            <Image
              src={storyImage.src}
              alt={storyImage.alt}
              width={1536}
              height={1024}
              sizes="(max-width: 680px) calc(100vw - 30px), (max-width: 900px) 650px, 430px"
              priority
            />
            <span>{storyImage.label}</span>
          </div>
          {mode === "signup" ? (
            <div className="auth-journey" aria-live="polite">
              <span className="section-kicker">{selectedJourney.kicker}</span>
              <h1>{selectedJourney.title}</h1>
              <p>{selectedJourney.lead}</p>
              <ol>
                {selectedJourney.steps.map((step) => (
                  <li key={step.title}>
                    <span aria-hidden="true">✓</span>
                    <div>
                      <b>{step.title}</b>
                      <small>{step.description}</small>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="auth-journey-note">{selectedJourney.note}</p>
            </div>
          ) : (
            <>
              <span className="section-kicker">Twoje miejsce do nauki</span>
              <h1>
                Spokojnie. Zrobimy to <em>krok po kroku.</em>
              </h1>
              <p>
                Wróć do zadań CKE, rozmów z nauczycielem AI i swojego planu
                nauki.
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
                „Nie podaje gotowca. Pomaga zrozumieć dokładnie ten krok, na
                którym utknąłem.”
                <small>— Kuba, klasa 8</small>
              </blockquote>
            </>
          )}
        </div>

        <div className="auth-card">
          <div className="auth-tabs" role="tablist" aria-label="Dostęp do konta">
            <Button
              type="button"
              variant="ghost"
              role="tab"
              className={mode === "login" ? "active" : ""}
              aria-selected={mode === "login"}
              onClick={() => changeMode("login")}
            >
              Logowanie
            </Button>
            <Button
              type="button"
              variant="ghost"
              role="tab"
              className={mode === "signup" ? "active" : ""}
              aria-selected={mode === "signup"}
              onClick={() => changeMode("signup")}
            >
              Rejestracja
            </Button>
          </div>

          <div className="auth-card-heading">
            <h2>{mode === "signup" ? "Załóż darmowe konto" : "Dobrze Cię widzieć"}</h2>
            <p>
              {mode === "signup"
                ? "Bez karty płatniczej. Zacznij od planu bezpłatnego."
                : "Zaloguj się i wróć do swojego planu nauki."}
            </p>
          </div>

          {mode === "signup" && (
            <fieldset className="role-picker signup-role-picker">
              <legend>Rejestruję się jako</legend>
              <RadioGroup
                value={role}
                onValueChange={(value) => {
                  setRole(value as SelfServiceRole);
                  setNotice(null);
                }}
              >
                {roleOptions.map((option) => (
                  <label
                    key={option.value}
                    htmlFor={`role-${option.value}`}
                    className={role === option.value ? "selected" : ""}
                  >
                    <RadioGroupItem
                      id={`role-${option.value}`}
                      value={option.value}
                      className="sr-only"
                    />
                    <span className="role-icon">{option.icon}</span>
                    <span>
                      <b>{option.title}</b>
                      <small>{option.description}</small>
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </fieldset>
          )}

          <SocialAuthButtons
            disabled={emailBusy}
            pendingProvider={pendingProvider}
            onSelect={handleSocial}
          />

          <div className="auth-divider"><span>lub użyj e-maila</span></div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className={mode === "signup" ? "registration-fields" : "login-fields"}>
              <Label htmlFor="auth-email">
                E-mail
                <Input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  maxLength={254}
                  autoComplete="email"
                  placeholder="twoj@email.pl"
                  required
                />
              </Label>

              {mode === "signup" && (
                <Label htmlFor="auth-email-confirmation">
                  Powtórz e-mail
                  <Input
                    id="auth-email-confirmation"
                    type="email"
                    value={emailConfirmation}
                    onChange={(event) => setEmailConfirmation(event.target.value)}
                    maxLength={254}
                    autoComplete="email"
                    placeholder="Wpisz ten sam e-mail"
                    aria-invalid={Boolean(emailConfirmation) && email.trim().toLowerCase() !== emailConfirmation.trim().toLowerCase()}
                    required
                  />
                </Label>
              )}

              <Label htmlFor="auth-password">
                Hasło
                <Input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  maxLength={128}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  placeholder={mode === "signup" ? "Minimum 8 znaków" : "Twoje hasło"}
                  required
                />
              </Label>

              {mode === "signup" && (
                <Label htmlFor="auth-password-confirmation">
                  Powtórz hasło
                  <Input
                    id="auth-password-confirmation"
                    type="password"
                    value={passwordConfirmation}
                    onChange={(event) => setPasswordConfirmation(event.target.value)}
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    placeholder="Wpisz to samo hasło"
                    aria-invalid={Boolean(passwordConfirmation) && password !== passwordConfirmation}
                    required
                  />
                </Label>
              )}
            </div>

            {mode === "signup" && role === "student" && (
              <Label htmlFor="guardian-email">
                E-mail rodzica lub opiekuna do zatwierdzenia konta
                <Input
                  id="guardian-email"
                  type="email"
                  value={guardianEmail}
                  onChange={(event) => setGuardianEmail(event.target.value)}
                  maxLength={254}
                  autoComplete="email"
                  placeholder="rodzic@email.pl"
                  required
                />
                <small className="guardian-help">Wyślemy prośbę o zgodę. Rodzic zaakceptuje ją po zalogowaniu na swoje konto.</small>
              </Label>
            )}

            {mode === "signup" && (
              <div className="check-row">
                <Checkbox
                  id="accepted-terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                />
                <label htmlFor="accepted-terms">
                  Akceptuję <a href="/regulamin" target="_blank">regulamin</a> i potwierdzam zapoznanie się z <a href="/polityka-prywatnosci" target="_blank">polityką prywatności</a>.
                </label>
              </div>
            )}

            {notice && (
              <Alert variant={notice.type === "error" ? "destructive" : "success"} className={`auth-notice ${notice.type}`}>
                <AlertDescription role="status" aria-live="polite">{notice.message}</AlertDescription>
              </Alert>
            )}

            <Button className="auth-submit" type="submit" disabled={busy}>
              {emailBusy
                ? "Chwila…"
                : mode === "signup"
                  ? `Załóż konto ${role === "student" ? "ucznia" : "rodzica"}`
                  : "Zaloguj się"}
              <span>→</span>
            </Button>
          </form>

          <p className="auth-security">Sesję i hasło bezpiecznie obsługuje Supabase Auth.</p>
        </div>
      </section>
    </main>
  );
}
