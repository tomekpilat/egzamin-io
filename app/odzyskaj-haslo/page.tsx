"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Full-page anchors avoid a Vinext production navigation failure. */

import { FormEvent, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseClient } from "@/lib/supabase-browser";

export default function PasswordRecoveryPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function sendRecoveryEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setErrorMessage("");

    try {
      const supabase = await getSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/ustaw-nowe-haslo`,
      });
      if (error) throw error;
      setSent(true);
    } catch {
      setErrorMessage("Nie udało się wysłać wiadomości. Spróbuj ponownie za chwilę.");
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
            <h1>Odzyskaj hasło</h1>
            <p>Podaj adres użyty podczas rejestracji. Wyślemy bezpieczny link do ustawienia nowego hasła.</p>
          </div>
          <form className="auth-recovery-form" onSubmit={sendRecoveryEmail}>
            <Label htmlFor="recovery-email">Twój e-mail<Input id="recovery-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} autoComplete="email" placeholder="twoj@email.pl" required /></Label>
            {sent && <Alert variant="success" className="auth-notice success"><AlertDescription role="status" aria-live="polite">Jeśli konto z tym adresem istnieje, wysłaliśmy link do zmiany hasła. Sprawdź także folder spam.</AlertDescription></Alert>}
            {errorMessage && <Alert variant="destructive" className="auth-notice error"><AlertDescription role="alert">{errorMessage}</AlertDescription></Alert>}
            <Button className="auth-submit" type="submit" disabled={busy || !email.trim()}>{busy ? "Wysyłamy…" : sent ? "Wyślij link ponownie" : "Wyślij link do zmiany hasła"}</Button>
          </form>
          <p className="auth-recovery-help">Ze względów bezpieczeństwa nie potwierdzamy, czy podany adres ma konto w egzaminio.</p>
          <a className="auth-recovery-back" href="/logowanie">← Wróć do logowania</a>
        </div>
      </section>
    </main>
  );
}
