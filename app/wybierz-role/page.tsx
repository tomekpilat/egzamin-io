"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { getSupabaseClient } from "@/lib/supabase-browser";
import type { SelfServiceRole } from "@/lib/roles";

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
  const [guardianConsent, setGuardianConsent] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getSupabaseClient()
      .then((supabase) => supabase.auth.getSession())
      .then(({ data }) => {
        if (!data.session) window.location.replace("/logowanie");
        else setBusy(false);
      })
      .catch(() => {
        setError("Nie udało się odczytać sesji. Zaloguj się ponownie.");
        setBusy(false);
      });
  }, []);

  async function saveRole() {
    if (role === "student" && !guardianConsent) {
      setError("Konto ucznia wymaga potwierdzenia zgody rodzica lub opiekuna.");
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

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          role,
          onboarding_completed: true,
          guardian_consent_at:
            role === "student" && guardianConsent
              ? new Date().toISOString()
              : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

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
          <label className="check-row onboarding-consent">
            <input
              type="checkbox"
              checked={guardianConsent}
              onChange={(event) => setGuardianConsent(event.target.checked)}
            />
            <span>Mam zgodę rodzica lub opiekuna na utworzenie konta.</span>
          </label>
        )}
        {error && <div className="auth-notice error" role="status">{error}</div>}
        <button className="auth-submit" type="button" disabled={busy} onClick={saveRole}>
          {busy ? "Chwila…" : "Przejdź do mojego panelu"}<span>→</span>
        </button>
      </section>
    </main>
  );
}
