"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Full-page anchors avoid a Vinext production navigation failure. */

import { FormEvent, useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validatePasswordReset } from "@/lib/auth-validation";
import { getSupabaseClient } from "@/lib/supabase-browser";

type RecoveryStatus = "loading" | "ready" | "invalid" | "success";

export default function UpdatePasswordPage() {
  const [status, setStatus] = useState<RecoveryStatus>("loading");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const passwordMismatch = Boolean(passwordConfirmation) && password !== passwordConfirmation;

  useEffect(() => {
    let active = true;
    let unsubscribe: () => void = () => undefined;

    void getSupabaseClient().then(async (supabase) => {
      if (!active) return;
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (active && event === "PASSWORD_RECOVERY" && session) setStatus("ready");
      });
      unsubscribe = () => subscription.unsubscribe();

      const { data, error } = await supabase.auth.getSession();
      if (!active) return;
      setStatus(!error && data.session ? "ready" : "invalid");
    }).catch(() => {
      if (active) setStatus("invalid");
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validatePasswordReset(password, passwordConfirmation);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setBusy(true);
    setErrorMessage("");
    try {
      const supabase = await getSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setPasswordConfirmation("");
      setStatus("success");
    } catch {
      setErrorMessage("Nie udało się zmienić hasła. Link mógł wygasnąć — poproś o nową wiadomość.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="account-page auth-design-page">
      <SiteHeader currentPath="/logowanie" />
      <section className="auth-shell">
        <div className="auth-card auth-recovery-card">
          <div className="auth-card-heading">
            <h1>Ustaw nowe hasło</h1>
            <p>Nowe hasło powinno mieć co najmniej 8 znaków i być inne niż hasła używane w innych serwisach.</p>
          </div>

          {status === "loading" && <p className="auth-recovery-help" role="status">Sprawdzamy link do zmiany hasła…</p>}
          {status === "invalid" && <><Alert variant="destructive" className="auth-notice error"><AlertDescription role="alert">Link jest nieprawidłowy albo wygasł.</AlertDescription></Alert><a className="auth-recovery-back" href="/odzyskaj-haslo">Wyślij nowy link</a></>}
          {status === "success" && <><Alert variant="success" className="auth-notice success"><AlertDescription role="status">Hasło zostało zmienione. Możesz wrócić do nauki.</AlertDescription></Alert><Button className="auth-submit" asChild><a href="/panel">Przejdź do panelu</a></Button></>}
          {status === "ready" && <form className="auth-recovery-form" onSubmit={updatePassword}>
            <Label htmlFor="new-password">Nowe hasło<Input id="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={128} autoComplete="new-password" placeholder="Minimum 8 znaków" required /></Label>
            <Label htmlFor="new-password-confirmation" className={passwordMismatch ? "auth-field-invalid" : ""}>Powtórz nowe hasło<Input id="new-password-confirmation" type="password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} minLength={8} maxLength={128} autoComplete="new-password" placeholder="Wpisz to samo hasło" aria-invalid={passwordMismatch} aria-describedby={passwordMismatch ? "new-password-confirmation-error" : undefined} required />{passwordMismatch && <small id="new-password-confirmation-error" className="auth-field-error">Hasła nie są takie same.</small>}</Label>
            {errorMessage && <Alert variant="destructive" className="auth-notice error"><AlertDescription role="alert">{errorMessage}</AlertDescription></Alert>}
            <Button className="auth-submit" type="submit" disabled={busy || password.length < 8 || passwordMismatch}>{busy ? "Zapisujemy…" : "Zapisz nowe hasło"}</Button>
          </form>}
        </div>
      </section>
    </main>
  );
}
