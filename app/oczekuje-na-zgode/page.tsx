"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Full-page anchors avoid a Vinext production navigation failure. */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/lib/supabase-browser";

type ConsentStatus = {
  guardian_email: string;
  request_status: "pending" | "approved" | "rejected" | "withdrawn";
  requested_at: string;
  expires_at: string;
};

export default function WaitingForGuardianPage() {
  const [status, setStatus] = useState<ConsentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestDate = status?.requested_at ? new Intl.DateTimeFormat("pl-PL", { dateStyle: "long", timeZone: "Europe/Warsaw" }).format(new Date(status.requested_at)) : null;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = await getSupabaseClient();
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        window.location.replace("/logowanie");
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("role,guardian_consent_at").eq("id", session.session.user.id).single();
      if (profile?.role !== "student") {
        window.location.replace("/panel");
        return;
      }
      if (profile.guardian_consent_at) {
        window.location.replace("/panel");
        return;
      }
      const { data, error: statusError } = await supabase.rpc("get_my_guardian_consent_status");
      if (statusError) throw statusError;
      setStatus((data?.[0] as ConsentStatus | undefined) ?? null);
    } catch {
      setError("Nie udało się sprawdzić statusu. Spróbuj ponownie lub popraw e-mail opiekuna.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  return (
    <main className="consent-page">
      <div className="consent-top"><a href="/" aria-label="egzaminio — strona główna"><BrandLogo /></a></div>
      <section className="consent-card">
        <span className={`consent-status ${status?.request_status === "rejected" ? "rejected" : ""}`}>{status?.request_status === "rejected" ? "Prośba odrzucona" : "Oczekuje na zgodę rodzica"}</span>
        <h1>{status?.request_status === "rejected" ? "Rodzic nie zatwierdził prośby" : `Czekamy na potwierdzenie od ${status?.guardian_email ?? "rodzica lub opiekuna"}`}</h1>
        <p>{status?.request_status === "rejected" ? "Jeśli podany adres jest nieprawidłowy, popraw go i wyślij prośbę ponownie. Konto pozostaje zablokowane do czasu zgody opiekuna." : `Masz mniej niż 16 lat, więc konto musi zatwierdzić rodzic lub opiekun. ${requestDate ? `Wysłaliśmy prośbę ${requestDate}. ` : ""}Wystarczy, że utworzy konto na podany adres i kliknie „Zatwierdź”.`}</p>
        <div className="consent-visibility">
          <b>Co rodzic zobaczy</b>
          <span>Liczbę rozwiązanych zadań, poprawność, przedmioty, tematy do powtórki, wykorzystanie AI i regularność nauki.</span>
          <b>Czego nie zobaczy</b>
          <span>Treści Twoich rozmów z Maią AI ani pojedynczych pytań, które jej zadajesz.</span>
        </div>
        {status?.request_status === "withdrawn" && <Alert variant="warning"><AlertTitle>Zgoda została wycofana</AlertTitle><AlertDescription>Do dalszego korzystania potrzebne jest ponowne zatwierdzenie przez opiekuna.</AlertDescription></Alert>}
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        <div className="consent-actions">
          <Button onClick={() => void refresh()} disabled={loading}>{loading ? "Sprawdzam…" : "Odśwież status"}</Button>
          <Button variant="outline" asChild><Link href="/wybierz-role">Popraw e-mail rodzica</Link></Button>
          <Button variant="ghost" asChild><Link href="/logowanie">Wróć do logowania</Link></Button>
        </div>
        <p className="consent-privacy"><Link href="/bezpieczenstwo-dzieci-ai">Poznaj zasady ochrony dzieci →</Link></p>
      </section>
    </main>
  );
}
