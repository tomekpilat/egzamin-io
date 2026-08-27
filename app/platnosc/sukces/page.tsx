"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Full-page anchors avoid a Vinext production navigation failure. */

import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseClient } from "@/lib/supabase-browser";

type PaymentResult = {
  status: string;
  access_valid_until: string | null;
  paid_at: string | null;
  receipt_url: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf_url: string | null;
};

const formatter = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric" });

export default function PaymentSuccessPage() {
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    const sessionId = new URLSearchParams(window.location.search).get("session_id") ?? "";

    async function confirmPayment() {
      attempts += 1;
      try {
        const supabase = await getSupabaseClient();
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          window.location.replace(`/logowanie?powrot=${encodeURIComponent(window.location.pathname + window.location.search)}`);
          return;
        }
        const response = await fetch(`/api/payments/status?sessionId=${encodeURIComponent(sessionId)}`, {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
          cache: "no-store",
        });
        const payload = await response.json() as PaymentResult & { error?: string };
        if (!response.ok) throw new Error(payload.error || "Nie udało się potwierdzić płatności.");
        if (!active) return;
        setResult(payload);
        setLoading(false);
        if (["processing", "checkout_created"].includes(payload.status) && attempts < 5) timer = setTimeout(() => void confirmPayment(), 1800);
      } catch (statusError) {
        if (!active) return;
        setError(statusError instanceof Error ? statusError.message : "Nie udało się potwierdzić płatności.");
        setLoading(false);
      }
    }

    if (!sessionId) {
      timer = setTimeout(() => {
        if (!active) return;
        setError("Brakuje identyfikatora płatności.");
        setLoading(false);
      }, 0);
    } else {
      void confirmPayment();
    }
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, []);

  const paid = result?.status === "paid" || result?.status === "partially_refunded";

  return <main className="payment-result-page">
    <a className="payment-result-brand" href="/" aria-label="egzaminio — strona główna"><BrandLogo /></a>
    <Card className="payment-result-card">
      <CardHeader>
        <span className={`payment-result-mark${paid ? " paid" : ""}`} aria-hidden="true">{paid ? "✓" : loading ? "…" : "i"}</span>
        <CardTitle>{paid ? "Płatność potwierdzona" : loading ? "Potwierdzamy płatność" : "Status płatności"}</CardTitle>
        <CardDescription>{paid ? `Pakiet Plus jest aktywny${result?.access_valid_until ? ` do ${formatter.format(new Date(result.access_valid_until))}` : ""}.` : "Nie zamykaj tej strony — sprawdzamy wynik bezpośrednio w Stripe."}</CardDescription>
      </CardHeader>
      <CardContent>
        {error && <Alert variant="destructive"><AlertTitle>Nie udało się potwierdzić wyniku</AlertTitle><AlertDescription>{error} Środki nie zostaną uznane wyłącznie na podstawie tej strony — stan zawsze weryfikujemy w Stripe. Sprawdź historię za chwilę.</AlertDescription></Alert>}
        {result && !paid && <Alert variant="warning"><AlertTitle>Płatność jest jeszcze przetwarzana</AlertTitle><AlertDescription>Nie ponawiaj płatności. Odśwież historię w panelu za chwilę; dostęp włączy się automatycznie po potwierdzeniu przez Stripe.</AlertDescription></Alert>}
        {paid && <div className="payment-result-documents">{result?.receipt_url && <a href={result.receipt_url} target="_blank" rel="noreferrer">Otwórz potwierdzenie</a>}{result?.hosted_invoice_url && <a href={result.hosted_invoice_url} target="_blank" rel="noreferrer">Otwórz fakturę</a>}{result?.invoice_pdf_url && <a href={result.invoice_pdf_url} target="_blank" rel="noreferrer">Pobierz PDF</a>}</div>}
        <Button asChild><a href="/panel?widok=platnosci">Przejdź do płatności w panelu</a></Button>
        <p>Potwierdzenie zakupu i dokument płatności znajdziesz również w historii konta rodzica.</p>
      </CardContent>
    </Card>
  </main>;
}
