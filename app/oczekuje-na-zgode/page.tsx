"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Full-page anchors avoid a Vinext production navigation failure. */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Clock3, MailCheck, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseClient } from "@/lib/supabase-browser";
import { ThemeToggle } from "@/components/theme-toggle";

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
      <div className="consent-top"><a href="/" aria-label="egzaminio — strona główna"><BrandLogo /></a><ThemeToggle /></div>
      <Card className="consent-card">
        <CardHeader>
          <Badge variant="secondary"><ShieldCheck size={13} /> Bezpieczne konto ucznia</Badge>
          <CardTitle>Czekamy na zgodę rodzica</CardTitle>
          <CardDescription>Konto ucznia jest utworzone, ale ćwiczenia i nauczyciel AI pozostają zablokowane do zatwierdzenia przez opiekuna.</CardDescription>
        </CardHeader>
        <CardContent className="consent-content">
          <div className="consent-step"><MailCheck /><div><b>1. Opiekun zakłada konto rodzica</b><span>Powinien użyć adresu <strong>{status?.guardian_email ?? "podanego podczas rejestracji"}</strong>.</span></div></div>
          <div className="consent-step"><ShieldCheck /><div><b>2. Zatwierdza prośbę w swoim panelu</b><span>Po zalogowaniu zobaczy imię i e-mail ucznia oraz datę prośby.</span></div></div>
          <div className="consent-step"><Clock3 /><div><b>3. Konto odblokuje się automatycznie</b><span>Prośba jest ważna przez 30 dni. Nie prosimy ucznia o udawanie zgody opiekuna.</span></div></div>

          {status?.request_status === "rejected" && <Alert variant="destructive"><AlertTitle>Prośba została odrzucona</AlertTitle><AlertDescription>Popraw adres opiekuna albo porozmawiaj z rodzicem przed wysłaniem kolejnej prośby.</AlertDescription></Alert>}
          {status?.request_status === "withdrawn" && <Alert variant="warning"><AlertTitle>Zgoda została wycofana</AlertTitle><AlertDescription>Do dalszego korzystania potrzebne jest ponowne zatwierdzenie przez opiekuna.</AlertDescription></Alert>}
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

          <div className="consent-actions">
            <Button onClick={() => void refresh()} disabled={loading}>{loading ? "Sprawdzam…" : "Sprawdź, czy rodzic zatwierdził"}</Button>
            <Button variant="outline" asChild><Link href="/wybierz-role">Popraw e-mail opiekuna</Link></Button>
          </div>
          <p className="consent-privacy">Rodzic otrzyma dostęp do postępów i regularności, ale nie do prywatnej treści rozmów ucznia z AI. <Link href="/bezpieczenstwo-dzieci-ai">Poznaj zasady ochrony dzieci →</Link></p>
        </CardContent>
      </Card>
    </main>
  );
}
