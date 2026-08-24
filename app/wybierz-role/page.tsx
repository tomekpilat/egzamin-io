"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseClient } from "@/lib/supabase-browser";
import type { SelfServiceRole } from "@/lib/roles";
import { LEGAL_VERSION } from "@/lib/legal";

const choices: Array<{
  value: SelfServiceRole;
  title: string;
  description: string;
  detail: string;
}> = [
  {
    value: "student",
    title: "Jestem uczniem",
    description: "Chcę ćwiczyć do egzaminu",
    detail: "Zadania CKE, podpowiedzi AI i codzienny plan.",
  },
  {
    value: "parent",
    title: "Jestem rodzicem",
    description: "Chcę wspierać dziecko",
    detail: "Raport postępów, regularność i obszary do powtórki.",
  },
  {
    value: "teacher",
    title: "Jestem nauczycielem",
    description: "Chcę pracować z uczniami",
    detail: "Zestawy ćwiczeń, grupy i podgląd wyników.",
  },
];

export default function ChooseRolePage() {
  const [role, setRole] = useState<SelfServiceRole>("student");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getSupabaseClient()
      .then(async (supabase) => {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          window.location.replace("/logowanie");
          return;
        }
        const { data: profile } = await supabase
          .from("profiles")
          .select("role,guardian_email,legal_version")
          .eq("id", data.session.user.id)
          .single();
        if (profile?.role === "student" || profile?.role === "parent" || profile?.role === "teacher") setRole(profile.role);
        setGuardianEmail(profile?.guardian_email ?? "");
        setAcceptedLegal(profile?.legal_version === LEGAL_VERSION);
        setBusy(false);
      })
      .catch(() => {
        setError("Nie udało się odczytać sesji. Zaloguj się ponownie.");
        setBusy(false);
      });
  }, []);

  async function saveRole() {
    if (!acceptedLegal) {
      setError("Zaakceptuj regulamin i zapoznaj się z polityką prywatności.");
      return;
    }

    if (role === "student" && !guardianEmail.trim()) {
      setError("Podaj e-mail rodzica lub opiekuna, który zatwierdzi konto.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const supabase = await getSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        window.location.replace("/logowanie");
        return;
      }

      if (role === "student" && guardianEmail.trim().toLowerCase() === user.email?.toLowerCase()) {
        setError("E-mail opiekuna musi być inny niż e-mail ucznia.");
        setBusy(false);
        return;
      }

      const { error: legalError } = await supabase.rpc("record_legal_acceptance", {
        accepted_version: LEGAL_VERSION,
      });
      if (legalError) throw legalError;

      if (role === "student") {
        const { error: roleError } = await supabase.from("profiles").update({ role, updated_at: new Date().toISOString() }).eq("id", user.id);
        if (roleError) throw roleError;
        const { error: consentError } = await supabase.rpc("request_guardian_consent", { requested_guardian_email: guardianEmail.trim().toLowerCase() });
        if (consentError) throw consentError;
        window.location.assign("/oczekuje-na-zgode");
        return;
      }

      const { error: updateError } = await supabase.from("profiles").update({ role, onboarding_completed: true, guardian_consent_at: null, updated_at: new Date().toISOString() }).eq("id", user.id);

      if (updateError) throw updateError;
      window.location.assign("/panel");
    } catch {
      setError("Nie udało się zapisać roli. Spróbuj ponownie.");
      setBusy(false);
    }
  }

  return (
    <main className="onboarding-page">
      <Link className="onboarding-brand" href="/" aria-label="egzaminio — strona główna">
        <BrandLogo />
      </Link>
      <section className="onboarding-card">
        <span className="section-kicker">Ostatni krok</span>
        <h1>Jak chcesz korzystać z egzaminio?</h1>
        <p>Na tej podstawie przygotujemy właściwy panel i pierwsze zadania.</p>
        <div className="onboarding-roles">
          {choices.map((choice) => (
            <button
              type="button"
              key={choice.value}
              className={role === choice.value ? "selected" : ""}
              onClick={() => setRole(choice.value)}
              aria-pressed={role === choice.value}
            >
              <span>{choice.value === "student" ? "U" : choice.value === "parent" ? "R" : "N"}</span>
              <div>
                <b>{choice.title}</b>
                <em>{choice.description}</em>
                <small>{choice.detail}</small>
              </div>
              <i>✓</i>
            </button>
          ))}
        </div>
        {role === "student" && (
          <Label className="onboarding-field" htmlFor="onboarding-guardian-email">
            E-mail rodzica lub opiekuna
            <Input id="onboarding-guardian-email" type="email" value={guardianEmail} onChange={(event) => setGuardianEmail(event.target.value)} placeholder="rodzic@email.pl" maxLength={254} required />
            <small>Opiekun zatwierdzi prośbę po zalogowaniu na własne konto rodzica.</small>
          </Label>
        )}
        {role === "teacher" && <Alert variant="warning" className="onboarding-role-note"><AlertDescription>Konto nauczyciela pozwala obejrzeć panel od razu. Zapraszanie uczniów i dostęp do wyników grupy zostaną odblokowane po weryfikacji nauczyciela.</AlertDescription></Alert>}
        <label className="check-row onboarding-consent legal-consent">
          <input type="checkbox" checked={acceptedLegal} onChange={(event) => setAcceptedLegal(event.target.checked)} />
          <span>Akceptuję <a href="/regulamin" target="_blank">regulamin</a> i potwierdzam zapoznanie się z <a href="/polityka-prywatnosci" target="_blank">polityką prywatności</a>.</span>
        </label>
        {error && <Alert variant="destructive" className="auth-notice error"><AlertDescription role="status">{error}</AlertDescription></Alert>}
        <Button className="auth-submit" type="button" disabled={busy} onClick={saveRole}>
          {busy ? "Chwila…" : "Przejdź do mojego panelu"}<span>→</span>
        </Button>
      </section>
    </main>
  );
}
