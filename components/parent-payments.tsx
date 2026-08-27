"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, FileText } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPaymentAmount, isPaymentStatus, paymentStatusLabels, type PaymentStatus } from "@/lib/payments";
import { getSupabaseClient } from "@/lib/supabase-browser";

export type PaymentChild = {
  student_id: string;
  student_display_name: string | null;
  student_email: string;
  plan_tier: "free" | "plus";
  plan_valid_until: string | null;
};

type PaymentConfig = {
  enabled: boolean;
  amountMinor: number;
  currency: string;
  accessUntil: string | null;
  recurring: boolean;
};

type PaymentHistoryItem = {
  payment_order_id: string;
  student_id: string;
  student_display_name: string;
  product_code: string;
  payment_status: PaymentStatus;
  amount_total: number;
  amount_refunded: number;
  currency: string;
  access_valid_until: string;
  paid_at: string | null;
  refunded_at: string | null;
  receipt_url: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf_url: string | null;
  created_at: string;
};

const dateFormatter = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric" });

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? dateFormatter.format(date) : "—";
}

function isActivePlus(child: PaymentChild, asOf: number) {
  if (child.plan_tier !== "plus") return false;
  if (!child.plan_valid_until) return true;
  return new Date(child.plan_valid_until).getTime() > asOf;
}

function statusVariant(status: PaymentStatus) {
  if (status === "paid") return "secondary" as const;
  if (["payment_failed", "chargeback", "disputed"].includes(status)) return "destructive" as const;
  return "outline" as const;
}

function PaymentDocuments({ item }: { item: PaymentHistoryItem }) {
  const documents = [
    [item.receipt_url, "Potwierdzenie"],
    [item.hosted_invoice_url, "Faktura online"],
    [item.invoice_pdf_url, "Faktura PDF"],
  ] as const;
  const available = documents.filter(([url]) => Boolean(url));
  const refundable = ["paid", "partially_refunded"].includes(item.payment_status);
  if (!available.length && !refundable) return <span className="payment-no-documents">Dokument pojawi się po zaksięgowaniu płatności.</span>;
  return <div className="payment-document-links">{available.map(([url, label]) => <a key={label} href={url!} target="_blank" rel="noreferrer"><FileText aria-hidden="true" />{label}<ExternalLink aria-hidden="true" /></a>)}{refundable && <a href={`mailto:kontakt@egzamin.io?subject=${encodeURIComponent(`Prośba o zwrot — ${item.payment_order_id}`)}&body=${encodeURIComponent(`Proszę o sprawdzenie możliwości zwrotu dla zamówienia ${item.payment_order_id}.\n\nPowód (opcjonalnie): `)}`}>Poproś o zwrot</a>}</div>;
}

export function ParentPayments({ linkedChildren, onConnect }: { linkedChildren: PaymentChild[]; onConnect: () => void }) {
  const [renderedAt] = useState(() => Date.now());
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [history, setHistory] = useState<PaymentHistoryItem[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState(linkedChildren[0]?.student_id ?? "");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [immediateAccess, setImmediateAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = await getSupabaseClient();
      const [{ data: paymentConfig, ok }, { data: paymentHistory, error: historyError }] = await Promise.all([
        fetch("/api/payments/config", { cache: "no-store" }).then(async (response) => ({ data: await response.json() as PaymentConfig, ok: response.ok })),
        supabase.rpc("get_parent_payment_history"),
      ]);
      if (!ok) throw new Error("payment_config_unavailable");
      if (historyError) throw historyError;
      setConfig(paymentConfig);
      setHistory(((paymentHistory as PaymentHistoryItem[] | null) ?? []).filter((item) => isPaymentStatus(item.payment_status)));
    } catch {
      setError("Nie udało się pobrać historii płatności. Odśwież stronę i spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const effectiveStudentId = linkedChildren.some((child) => child.student_id === selectedStudentId) ? selectedStudentId : linkedChildren[0]?.student_id ?? "";
  const selectedChild = useMemo(() => linkedChildren.find((child) => child.student_id === effectiveStudentId) ?? null, [effectiveStudentId, linkedChildren]);
  const checkoutCancelled = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("checkout") === "anulowana";
  const canPurchase = Boolean(config?.enabled && selectedChild && !isActivePlus(selectedChild, renderedAt) && acceptedTerms && immediateAccess && !submitting);

  async function startCheckout() {
    if (!canPurchase) return;
    setSubmitting(true);
    setError("");
    try {
      const supabase = await getSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("missing_session");
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          studentId: effectiveStudentId,
          requestId: crypto.randomUUID(),
          acceptedTerms,
          requestedImmediateAccess: immediateAccess,
        }),
      });
      const payload = await response.json() as { checkoutUrl?: string; error?: string; code?: string };
      if (payload.code === "legal_update_required") {
        window.location.assign(`/zaakceptuj-zmiany?powrot=${encodeURIComponent("/panel?widok=platnosci")}`);
        return;
      }
      if (!response.ok || !payload.checkoutUrl) throw new Error(payload.error || "checkout_failed");
      window.location.assign(payload.checkoutUrl);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error && checkoutError.message !== "checkout_failed" ? checkoutError.message : "Nie udało się rozpocząć płatności. Spróbuj ponownie.");
      setSubmitting(false);
    }
  }

  return <section className="parent-payments" aria-labelledby="parent-payments-title">
    <div className="dashboard-view-heading"><div><span className="dashboard-kicker dark-kicker">Płatności</span><h2 id="parent-payments-title">Pakiet Plus i historia płatności</h2></div><Button variant="outline" type="button" onClick={() => void refresh()} disabled={loading}>Odśwież historię</Button></div>

    {checkoutCancelled && <Alert><AlertTitle>Płatność nie została pobrana</AlertTitle><AlertDescription>Checkout został zamknięty. Możesz wrócić do zakupu w dowolnym momencie.</AlertDescription></Alert>}
    {error && <Alert variant="destructive"><AlertTitle>Nie udało się wykonać operacji</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

    {!linkedChildren.length ? <Card className="parent-payment-empty"><CardHeader><CardTitle>Najpierw połącz konto dziecka</CardTitle><CardDescription>Pakiet Plus jest przypisywany do konkretnego ucznia. Połącz konto, aby kupić dostęp i zobaczyć dokumenty płatności.</CardDescription></CardHeader><CardContent><Button type="button" onClick={onConnect}>Połącz konto dziecka</Button></CardContent></Card> : <Card className="parent-payment-checkout">
      <CardHeader><div><Badge variant="secondary">Jednorazowo · bez abonamentu</Badge><CardTitle>Pakiet Plus — 149 zł</CardTitle><CardDescription>Pełna baza ćwiczeń, do 50 pytań do AI dziennie, plan nauki i powtórki.</CardDescription></div>{config?.accessUntil && <div className="payment-access-date"><span>Dostęp do</span><b>{formatDate(config.accessUntil)}</b></div>}</CardHeader>
      <CardContent>
        <div className="payment-child-picker">
          <Label htmlFor="payment-student">Pakiet dla ucznia</Label>
          <Select value={effectiveStudentId} onValueChange={(value) => { setSelectedStudentId(value); setAcceptedTerms(false); setImmediateAccess(false); }}>
            <SelectTrigger id="payment-student"><SelectValue /></SelectTrigger>
            <SelectContent>{linkedChildren.map((child) => <SelectItem key={child.student_id} value={child.student_id}>{child.student_display_name || child.student_email}{isActivePlus(child, renderedAt) ? " · Plus aktywny" : ""}</SelectItem>)}</SelectContent>
          </Select>
          {selectedChild && isActivePlus(selectedChild, renderedAt) && <p className="payment-active-plan">Pakiet Plus jest już aktywny{selectedChild.plan_valid_until ? ` do ${formatDate(selectedChild.plan_valid_until)}` : ""}. Nie pobierzemy kolejnej płatności.</p>}
        </div>

        <div className="payment-consents">
          <label htmlFor="payment-terms"><Checkbox id="payment-terms" checked={acceptedTerms} onCheckedChange={(checked) => setAcceptedTerms(checked === true)} /><span>Akceptuję <a href="/regulamin" target="_blank">Regulamin</a> i potwierdzam zapoznanie się z <a href="/polityka-prywatnosci" target="_blank">Polityką prywatności</a>. Mam ukończone 18 lat albo jestem uprawnionym opiekunem.</span></label>
          <label htmlFor="payment-immediate"><Checkbox id="payment-immediate" checked={immediateAccess} onCheckedChange={(checked) => setImmediateAccess(checked === true)} /><span>Wyraźnie żądam rozpoczęcia świadczenia od razu, przed upływem 14 dni. Przyjmuję do wiadomości zasady odstąpienia i rozliczenia świadczenia rozpoczętego na moje żądanie opisane <a href="/odstapienie-od-umowy" target="_blank">tutaj</a>.</span></label>
        </div>

        {!config?.enabled && !loading ? <Alert variant="warning"><AlertTitle>Sprzedaż nie jest jeszcze aktywna</AlertTitle><AlertDescription>Historia pozostaje dostępna. Administrator musi ukończyć konfigurację Stripe przed przyjmowaniem płatności.</AlertDescription></Alert> : null}
        <div className="payment-checkout-action"><div><b>Do zapłaty: {config ? formatPaymentAmount(config.amountMinor, config.currency) : "149,00 zł"}</b><span>Jednorazowo. Brak automatycznego odnowienia.</span></div><Button type="button" size="lg" disabled={!canPurchase} onClick={() => void startCheckout()}>{submitting ? "Przekierowujemy do Stripe…" : "Zamawiam pakiet Plus — płacę 149 zł"}</Button></div>
        <p className="payment-provider-note">Bezpieczna płatność odbywa się na stronie Stripe. egzaminio nie otrzymuje pełnego numeru karty.</p>
      </CardContent>
    </Card>}

    <Card className="parent-payment-history">
      <CardHeader><CardTitle>Historia płatności</CardTitle><CardDescription>Zamówienia, zwroty i dokumenty dotyczące zakupów z tego konta rodzica.</CardDescription></CardHeader>
      <CardContent>{loading ? <p className="payment-history-empty">Pobieramy historię…</p> : !history.length ? <p className="payment-history-empty">Nie masz jeszcze żadnych płatności.</p> : <div className="payment-history-list">{history.map((item) => <article key={item.payment_order_id}>
        <div className="payment-history-main"><div><b>Pakiet Plus · {item.student_display_name}</b><span>Zamówienie {item.payment_order_id.slice(0, 8).toUpperCase()} · {formatDate(item.created_at)} · dostęp do {formatDate(item.access_valid_until)}</span></div><div><strong>{formatPaymentAmount(item.amount_total, item.currency)}</strong><Badge variant={statusVariant(item.payment_status)}>{paymentStatusLabels[item.payment_status]}</Badge></div></div>
        {item.amount_refunded > 0 && <p className="payment-refund">Zwrócono: {formatPaymentAmount(item.amount_refunded, item.currency)}{item.refunded_at ? ` · ${formatDate(item.refunded_at)}` : ""}</p>}
        <PaymentDocuments item={item} />
      </article>)}</div>}</CardContent>
    </Card>

    <p className="payment-help">Problem z płatnością lub prośba o zwrot? Napisz na <a href="mailto:kontakt@egzamin.io">kontakt@egzamin.io</a> i podaj adres konta rodzica.</p>
  </section>;
}
