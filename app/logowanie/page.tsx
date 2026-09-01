"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Full-page anchors avoid a Vinext production navigation failure. */

import { useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { SiteHeader } from "@/components/site-header";
import { SocialAuthButtons, type SocialProvider } from "@/components/social-auth-buttons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { validateSignupConfirmation } from "@/lib/auth-validation";
import { LEGAL_VERSION } from "@/lib/legal";
import type { SelfServiceRole } from "@/lib/roles";
import { getSupabaseClient } from "@/lib/supabase-browser";

type Mode = "login" | "signup";
type SignupStage = "role" | "form";
type Notice = { type: "error" | "success"; message: string } | null;

const ROLE_OPTIONS: Array<{ value: SelfServiceRole; title: string; description: string }> = [
  { value: "student", title: "Uczeń", description: "Masz wszystkie arkusze CKE, 15 interaktywnych odpowiedzi, 3 pytania do AI dziennie i podstawowy podgląd postępu." },
  { value: "parent", title: "Rodzic lub opiekun", description: "Zatwierdzasz konto dziecka, kupujesz Plus i wtedy widzisz postęp oraz wykorzystanie AI." },
];

function friendlyAuthError(message: string) {
  if (/invalid login credentials/i.test(message)) return "Nieprawidłowy e-mail lub hasło.";
  if (/email not confirmed/i.test(message)) return "Potwierdź adres e-mail przez link, który wysłaliśmy.";
  if (/user already registered/i.test(message)) return "Konto z tym adresem już istnieje. Spróbuj się zalogować.";
  if (/password/i.test(message)) return "Hasło musi mieć co najmniej 8 znaków.";
  return "Nie udało się wykonać operacji. Spróbuj ponownie za chwilę.";
}

export default function LoginPage() {
  const searchParams = useSearchParams();
  const initialMode: Mode = searchParams.get("tryb") === "rejestracja" ? "signup" : "login";
  const requestedRole = searchParams.get("rola");
  const hasRequestedRole = requestedRole === "uczen" || requestedRole === "student" || requestedRole === "rodzic" || requestedRole === "parent";
  const [mode, setMode] = useState<Mode>(initialMode);
  const [signupStage, setSignupStage] = useState<SignupStage>(initialMode === "signup" && hasRequestedRole ? "form" : "role");
  const [role, setRole] = useState<SelfServiceRole>(requestedRole === "rodzic" || requestedRole === "parent" ? "parent" : "student");
  const [email, setEmail] = useState("");
  const [emailConfirmation, setEmailConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<SocialProvider | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const busy = emailBusy || pendingProvider !== null;
  const emailMismatch = Boolean(emailConfirmation) && email.trim().toLowerCase() !== emailConfirmation.trim().toLowerCase();
  const passwordMismatch = Boolean(passwordConfirmation) && password !== passwordConfirmation;
  const signupReady = Boolean(
    email.trim() &&
    emailConfirmation.trim() &&
    password.length >= 8 &&
    passwordConfirmation.length >= 8 &&
    !emailMismatch &&
    !passwordMismatch &&
    acceptedTerms &&
    (role === "parent" || (guardianEmail.trim() && guardianEmail.trim().toLowerCase() !== email.trim().toLowerCase())),
  );

  useEffect(() => {
    if (mode === "signup") trackAnalyticsEvent("signup_started");
  }, [mode]);

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setSignupStage(nextMode === "signup" ? "role" : "form");
    setNotice(null);
    setPassword("");
    setPasswordConfirmation("");
    setEmailConfirmation("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    if (mode === "signup") {
      const confirmationError = validateSignupConfirmation(email, emailConfirmation, password, passwordConfirmation);
      if (confirmationError) { setNotice({ type: "error", message: confirmationError }); return; }
      if (!acceptedTerms) { setNotice({ type: "error", message: "Zaakceptuj regulamin i zapoznaj się z polityką prywatności." }); return; }
      if (role === "student" && !guardianEmail.trim()) { setNotice({ type: "error", message: "Podaj e-mail rodzica lub opiekuna, który zatwierdzi konto ucznia." }); return; }
      if (role === "student" && guardianEmail.trim().toLowerCase() === email.trim().toLowerCase()) { setNotice({ type: "error", message: "E-mail opiekuna musi być inny niż e-mail ucznia." }); return; }
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
            data: { display_name: email.trim().split("@")[0], requested_role: role, guardian_email: role === "student" ? guardianEmail.trim().toLowerCase() : null, legal_accepted: true, legal_version: LEGAL_VERSION },
          },
        });
        if (error) throw error;
        trackAnalyticsEvent("signup_completed");
        setPassword("");
        setPasswordConfirmation("");
        if (data.session) { window.location.assign("/panel"); return; }
        setNotice({ type: "success", message: "Konto utworzone. Sprawdź skrzynkę i potwierdź adres e-mail, aby się zalogować." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        trackAnalyticsEvent("login_completed");
        window.location.assign("/panel");
      }
    } catch (error) {
      setNotice({ type: "error", message: friendlyAuthError(error instanceof Error ? error.message : "unknown") });
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
      if (mode === "signup") window.sessionStorage.setItem("egzaminio:signup-role", role);
      else window.sessionStorage.removeItem("egzaminio:signup-role");
      window.sessionStorage.setItem("egzaminio:analytics-auth-intent", mode);
      const roleParam = role === "parent" ? "rodzic" : "uczen";
      const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: mode === "signup" ? `${window.location.origin}/wybierz-role?rola=${roleParam}` : `${window.location.origin}/panel` } });
      if (error) throw error;
    } catch (error) {
      window.sessionStorage.removeItem("egzaminio:analytics-auth-intent");
      setNotice({ type: "error", message: friendlyAuthError(error instanceof Error ? error.message : "unknown") });
      setPendingProvider(null);
    }
  }

  return (
    <main className="account-page auth-design-page">
      <SiteHeader currentPath="/logowanie" />
      <section className="auth-shell">
        {mode === "signup" && signupStage === "role" ? (
          <div className="auth-card auth-role-card">
            <div className="auth-role-heading"><BrandLogo compact /><h1>Kim jesteś?</h1><p>Wybierz rolę, żebyśmy pokazali Ci właściwy panel. Później nie da się jej zmienić samodzielnie.</p></div>
            <fieldset className="role-picker signup-role-picker">
              <legend className="sr-only">Rejestruję się jako</legend>
              <RadioGroup value={role} onValueChange={(value) => { setRole(value as SelfServiceRole); setNotice(null); }}>
                {ROLE_OPTIONS.map((option) => <label key={option.value} htmlFor={`role-${option.value}`} className={role === option.value ? "selected" : ""}><RadioGroupItem id={`role-${option.value}`} value={option.value} className="sr-only" /><span className="role-choice-dot" aria-hidden="true" /><span><b>{option.title}</b><small>{option.description}</small></span></label>)}
              </RadioGroup>
            </fieldset>
            <Button type="button" className="auth-submit" onClick={() => setSignupStage("form")}>Dalej</Button>
            <p className="auth-role-note">Konto ucznia wymaga zgody rodzica. Rozmowy z Mają AI pozostają prywatne.</p>
            <button type="button" className="auth-mode-link" onClick={() => changeMode("login")}>Masz już konto? Zaloguj się</button>
          </div>
        ) : (
          <div className="auth-card">
            <div className="auth-tabs" role="tablist" aria-label="Dostęp do konta"><Button type="button" variant="ghost" role="tab" className={mode === "login" ? "active" : ""} aria-selected={mode === "login"} onClick={() => changeMode("login")}>Zaloguj się</Button><Button type="button" variant="ghost" role="tab" className={mode === "signup" ? "active" : ""} aria-selected={mode === "signup"} onClick={() => changeMode("signup")}>Utwórz konto</Button></div>
            {mode === "login" && <div className="auth-card-heading"><h1>Dobrze Cię widzieć</h1><p>Zaloguj się i wróć do swojego planu nauki.</p></div>}
            {mode === "signup" && <button type="button" className="auth-change-role" onClick={() => setSignupStage("role")}>← Zmień rolę · {role === "student" ? "Uczeń" : "Rodzic lub opiekun"}</button>}
            <SocialAuthButtons disabled={emailBusy} pendingProvider={pendingProvider} onSelect={handleSocial} />
            <div className="auth-divider"><span>albo e-mailem</span></div>
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className={mode === "signup" ? "registration-fields" : "login-fields"}>
                <Label htmlFor="auth-email">Twój e-mail<Input id="auth-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} autoComplete="email" placeholder="twoj@email.pl" required /></Label>
                {mode === "signup" && <Label htmlFor="auth-email-confirmation" className={emailMismatch ? "auth-field-invalid" : ""}>Powtórz e-mail<Input id="auth-email-confirmation" type="email" value={emailConfirmation} onChange={(event) => setEmailConfirmation(event.target.value)} maxLength={254} autoComplete="email" placeholder="Wpisz ten sam e-mail" aria-invalid={emailMismatch} aria-describedby={emailMismatch ? "auth-email-confirmation-error" : undefined} required />{emailMismatch && <small id="auth-email-confirmation-error" className="auth-field-error">Adresy e-mail nie są takie same.</small>}</Label>}
                <Label htmlFor="auth-password">Hasło<Input id="auth-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={128} autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder={mode === "signup" ? "Minimum 8 znaków" : "Twoje hasło"} required /></Label>
                {mode === "signup" && <Label htmlFor="auth-password-confirmation" className={passwordMismatch ? "auth-field-invalid" : ""}>Powtórz hasło<Input id="auth-password-confirmation" type="password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} minLength={8} maxLength={128} autoComplete="new-password" placeholder="Wpisz to samo hasło" aria-invalid={passwordMismatch} aria-describedby={passwordMismatch ? "auth-password-confirmation-error" : undefined} required />{passwordMismatch && <small id="auth-password-confirmation-error" className="auth-field-error">Hasła nie są takie same.</small>}</Label>}
              </div>
              {mode === "login" && <a className="auth-forgot-password" href="/odzyskaj-haslo">Nie pamiętasz hasła?</a>}
              {mode === "signup" && role === "student" && <Label htmlFor="guardian-email">E-mail rodzica lub opiekuna<Input id="guardian-email" type="email" value={guardianEmail} onChange={(event) => setGuardianEmail(event.target.value)} maxLength={254} autoComplete="email" placeholder="np. anna.n@example.com" required /><small className="guardian-help">Wyślemy tam prośbę o zgodę. Bez niej nie odblokujemy zadań ani Mai AI.</small></Label>}
              {mode === "signup" && <div className="check-row"><Checkbox id="accepted-terms" checked={acceptedTerms} onCheckedChange={(checked) => setAcceptedTerms(checked === true)} /><label htmlFor="accepted-terms">Akceptuję <a href="/regulamin" target="_blank">regulamin</a> i <a href="/polityka-prywatnosci" target="_blank">politykę prywatności</a>.</label></div>}
              {notice && <Alert variant={notice.type === "error" ? "destructive" : "success"} className={`auth-notice ${notice.type}`}><AlertDescription role="status" aria-live="polite">{notice.message}</AlertDescription></Alert>}
              <Button className="auth-submit" type="submit" disabled={busy || (mode === "signup" && !signupReady)}>{emailBusy ? "Chwila…" : mode === "signup" ? "Utwórz konto" : "Zaloguj się"}</Button>
            </form>
          </div>
        )}
      </section>
    </main>
  );
}
