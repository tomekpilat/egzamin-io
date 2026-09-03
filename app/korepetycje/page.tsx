"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Full-page anchors avoid a Vinext production navigation failure. */

import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { TutoringPilot } from "@/components/tutoring-pilot";
import { TUTORING_MARKETPLACE_FEATURE } from "@/lib/feature-flags";
import { isUserRole, type UserRole } from "@/lib/roles";
import { getSupabaseClient } from "@/lib/supabase-browser";

type GateState = "loading" | "allowed" | "denied" | "error";

export default function TutoringPage() {
  const [gate, setGate] = useState<GateState>("loading");
  const [role, setRole] = useState<UserRole>("student");

  useEffect(() => {
    let active = true;
    getSupabaseClient().then(async (supabase) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        window.location.replace(`/logowanie?powrot=${encodeURIComponent("/korepetycje")}`);
        return;
      }
      const [{ data: profile, error: profileError }, { data: allowed, error: accessError }] = await Promise.all([
        supabase.from("profiles").select("role,onboarding_completed").eq("id", user.id).single(),
        supabase.rpc("has_feature_access", { requested_feature: TUTORING_MARKETPLACE_FEATURE }),
      ]);
      if (!active) return;
      if (profileError || accessError || !profile || !isUserRole(profile.role) || !profile.onboarding_completed) {
        setGate("error");
        return;
      }
      setRole(profile.role);
      setGate(allowed ? "allowed" : "denied");
    }).catch(() => {
      if (active) setGate("error");
    });
    return () => { active = false; };
  }, []);

  return (
    <main className="tutoring-pilot-page">
      <header className="tutoring-pilot-topbar"><a href="/" aria-label="egzaminio — strona główna"><BrandLogo /></a><a href="/panel">Wróć do panelu <span aria-hidden="true">→</span></a></header>
      {gate === "loading" && <section className="tutoring-gate-state"><h1>Otwieramy moduł korepetycji…</h1></section>}
      {gate === "denied" && <section className="tutoring-gate-state"><span>Pilotaż</span><h1>Ten moduł nie jest jeszcze aktywny na Twoim koncie.</h1><p>Korepetycje testujemy z małą grupą użytkowników. Jeśli otrzymasz dostęp, pozycja pojawi się automatycznie w panelu.</p><a href="/panel">Wróć do panelu</a></section>}
      {gate === "error" && <section className="tutoring-gate-state"><h1>Nie udało się sprawdzić dostępu.</h1><p>Upewnij się, że wdrożono najnowszą migrację bazy i spróbuj ponownie.</p><a href="/panel">Wróć do panelu</a></section>}
      {gate === "allowed" && (role === "admin" ? <section className="tutoring-gate-state"><span>Podgląd administratora</span><h1>Pilotaż korepetycji jest aktywny.</h1><p>Administrator zarządza dostępem z panelu. Formularz zgłoszenia jest przeznaczony dla uczniów, rodziców i zweryfikowanych nauczycieli.</p><a href="/panel">Przejdź do administracji</a></section> : <TutoringPilot role={role} />)}
    </main>
  );
}
