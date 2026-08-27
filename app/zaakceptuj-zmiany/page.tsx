"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Full-page anchors avoid a Vinext production navigation failure. */

import { useEffect, useState } from "react";
import { FileCheck2 } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { resolveAccountRoute } from "@/lib/account-routing";
import { LEGAL_UPDATED_LABEL, LEGAL_VERSION } from "@/lib/legal";
import { isUserRole } from "@/lib/roles";
import { getSupabaseClient } from "@/lib/supabase-browser";

export default function AcceptLegalChangesPage() {
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  function returnPath() {
    const requested = new URLSearchParams(window.location.search).get("powrot") ?? "";
    return requested.startsWith("/panel") && !requested.startsWith("//") ? requested : "/panel";
  }

  useEffect(() => {
    let active = true;
    getSupabaseClient()
      .then(async (supabase) => {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;
        if (!user) {
          window.location.replace("/logowanie");
          return;
        }
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role,onboarding_completed,legal_version,guardian_email,guardian_consent_at")
          .eq("id", user.id)
          .single();
        if (profileError || !profile || !isUserRole(profile.role)) throw profileError ?? new Error("profile_not_found");
        const route = resolveAccountRoute(profile, LEGAL_VERSION);
        if (route !== "/zaakceptuj-zmiany") {
          window.location.replace(route === "/panel" ? returnPath() : route);
          return;
        }
        if (active) setBusy(false);
      })
      .catch(() => {
        if (!active) return;
        setError("Nie udało się sprawdzić profilu. Zaloguj się ponownie.");
        setBusy(false);
      });
    return () => { active = false; };
  }, []);

  async function acceptChanges() {
    if (!accepted) {
      setError("Potwierdź zapoznanie się ze zaktualizowanymi dokumentami.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const supabase = await getSupabaseClient();
      const { error: acceptanceError } = await supabase.rpc("record_legal_acceptance", { accepted_version: LEGAL_VERSION });
      if (acceptanceError) throw acceptanceError;
      window.location.replace(returnPath());
    } catch {
      setError("Nie udało się zapisać potwierdzenia. Spróbuj ponownie.");
      setBusy(false);
    }
  }

  return (
    <main className="consent-page">
      <div className="consent-top"><a href="/" aria-label="egzaminio — strona główna"><BrandLogo /></a></div>
      <Card className="consent-card legal-update-card">
        <CardHeader>
          <Badge variant="secondary"><FileCheck2 size={13} aria-hidden="true" /> Aktualizacja dokumentów</Badge>
          <CardTitle>Twoja rola i ustawienia pozostają bez zmian</CardTitle>
          <CardDescription>Zaktualizowaliśmy dokumenty prawne {LEGAL_UPDATED_LABEL}. Nie musisz ponownie wybierać typu konta.</CardDescription>
        </CardHeader>
        <CardContent className="consent-content legal-update-content">
          <p>Przed powrotem do panelu zapoznaj się z aktualną wersją dokumentów. Twoje postępy, połączone konta i ustawienia nie zostaną zmienione.</p>
          <nav aria-label="Zaktualizowane dokumenty"><Button variant="outline" asChild><a href="/regulamin" target="_blank">Otwórz regulamin</a></Button><Button variant="outline" asChild><a href="/polityka-prywatnosci" target="_blank">Otwórz politykę prywatności</a></Button></nav>
          <div className="feedback-contact-consent legal-update-consent"><Checkbox id="accept-legal-update" checked={accepted} onCheckedChange={(value) => setAccepted(value === true)} /><Label htmlFor="accept-legal-update">Akceptuję regulamin i potwierdzam zapoznanie się z polityką prywatności.</Label></div>
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <Button type="button" size="lg" onClick={() => void acceptChanges()} disabled={busy}>{busy ? "Sprawdzam…" : "Zapisz i przejdź do panelu"}</Button>
        </CardContent>
      </Card>
    </main>
  );
}
