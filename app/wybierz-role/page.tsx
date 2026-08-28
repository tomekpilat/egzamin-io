"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Full-page anchors avoid a Vinext production navigation failure. */

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseClient } from "@/lib/supabase-browser";
import { isUserRole, type SelfServiceRole } from "@/lib/roles";
import { LEGAL_VERSION } from "@/lib/legal";
import { resolveAccountRoute } from "@/lib/account-routing";

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
];

function roleFromParam(value: string | null): SelfServiceRole | null {
  if (value === "rodzic" || value === "parent") return "parent";
  if (value === "uczen" || value === "student") return "student";
  return null;
}

export default function ChooseRolePage() {
  const searchParams = useSearchParams();
  const requestedRole = roleFromParam(searchParams.get("rola"));
  const [role, setRole] = useState<SelfServiceRole>(requestedRole ?? "student");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getSupabaseClient()
      .then(async (supabase) => {
        const storedRole = window.sessionStorage.getItem("egzaminio:signup-role");
        const preferredRole = requestedRole ?? roleFromParam(storedRole);
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          window.location.replace("/logowanie");
          return;
        }
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role,guardian_email,guardian_consent_at,legal_version,onboarding_completed")
          .eq("id", data.session.user.id)
          .single();
        if (profileError || !profile || !isUserRole(profile.role)) throw profileError ?? new Error("profile_not_found");
        const accountRoute = resolveAccountRoute(profile, LEGAL_VERSION);
        if (accountRoute !== "/wybierz-role") {
          window.location.replace(accountRoute);
          return;
        }
        if (!profile?.onboarding_completed && preferredRole) {
          setRole(preferredRole);
        } else if (profile?.role === "student" || profile?.role === "parent") {
          setRole(profile.role);
        }
        setGuardianEmail(profile?.guardian_email ?? "");
        setAcceptedLegal(profile?.legal_version === LEGAL_VERSION);
        setBusy(false);
      })
      .catch(() => {
        setError("Nie udało się odczytać sesji. Zaloguj się ponownie.");
        setBusy(false);
      });
  }, [requestedRole]);

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

      const { error: onboardingError } = await supabase.rpc("complete_onboarding", {
        selected_role: role,
        requested_guardian_email: role === "student" ? guardianEmail.trim().toLowerCase() : null,
      });
      if (onboardingError) throw onboardingError;
      window.sessionStorage.removeItem("egzaminio:signup-role");

      if (role === "student") {
        window.location.assign("/oczekuje-na-zgode");
        return;
      }
      window.location.assign("/panel");
    } catch {
      setError("Nie udało się zapisać roli. Spróbuj ponownie.");
      setBusy(false);
    }
  }

  return (
    <main className="onboarding-page">
      <div className="onboarding-top"><a className="onboarding-brand" href="/" aria-label="egzaminio — strona główna"><BrandLogo /></a></div>
      <section className="onboarding-card">
        <div className="onboarding-heading"><BrandLogo compact /><h1>Kim jesteś?</h1><p>Wybierz rolę, żebyśmy pokazali Ci właściwy panel. Później nie da się jej zmienić samodzielnie.</p></div>
        <div className="onboarding-roles">
          {choices.map((choice) => (
            <button
              type="button"
              key={choice.value}
              className={role === choice.value ? "selected" : ""}
              onClick={() => setRole(choice.value)}
              aria-pressed={role === choice.value}
            >
              <span className="role-choice-dot" aria-hidden="true" />
              <div>
                <b>{choice.value === "student" ? "Uczeń" : "Rodzic lub opiekun"}</b>
                <small>{choice.value === "student" ? "Rozwiązujesz zadania z arkuszy CKE, korzystasz ze wskazówek i tutora AI, śledzisz swój postęp." : "Zatwierdzasz konto dziecka, ustawiasz arkusz i cel tygodniowy, widzisz postęp, kupujesz Plus."}</small>
              </div>
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
        <div className="check-row onboarding-consent legal-consent">
          <Checkbox id="accepted-legal" checked={acceptedLegal} onCheckedChange={(checked) => setAcceptedLegal(checked === true)} />
          <label htmlFor="accepted-legal">Akceptuję <a href="/regulamin" target="_blank">regulamin</a> i potwierdzam zapoznanie się z <a href="/polityka-prywatnosci" target="_blank">polityką prywatności</a>.</label>
        </div>
        {error && <Alert variant="destructive" className="auth-notice error"><AlertDescription role="status">{error}</AlertDescription></Alert>}
        <Button className="auth-submit" type="button" disabled={busy} onClick={saveRole}>
          {busy ? "Chwila…" : "Dalej"}
        </Button>
        <p className="auth-role-note">Konto ucznia wymaga zgody rodzica. Rozmowy z tutorem AI pozostają prywatne.</p>
      </section>
    </main>
  );
}
