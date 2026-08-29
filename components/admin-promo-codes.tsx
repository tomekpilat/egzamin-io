"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseClient } from "@/lib/supabase-browser";

type AdminPromoCode = {
  promo_code_id: string;
  code_hint: string;
  code_label: string;
  access_valid_until: string;
  redeem_by: string;
  max_redemptions: number;
  redemption_count: number;
  active: boolean;
  created_at: string;
};

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const dateFormatter = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short", year: "numeric" });

function defaultAccessDate() {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

function generateCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const value = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
  return `PLUS-${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8)}`;
}

function endOfDay(value: string) {
  return new Date(`${value}T23:59:59.999Z`).toISOString();
}

export function AdminPromoCodes() {
  const [codes, setCodes] = useState<AdminPromoCode[]>([]);
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("Bezpłatny dostęp Plus");
  const [accessUntil, setAccessUntil] = useState(defaultAccessDate);
  const [maxRedemptions, setMaxRedemptions] = useState(1);
  const [createdCode, setCreatedCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const supabase = await getSupabaseClient();
    const { data, error: loadError } = await supabase.rpc("get_admin_plus_promo_codes");
    if (loadError) throw loadError;
    setCodes((data as AdminPromoCode[] | null) ?? []);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh().catch(() => setError("Nie udało się pobrać kodów promocyjnych.")), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const canCreate = useMemo(() => code.replace(/[^A-Z0-9]/gi, "").length >= 10 && label.trim().length >= 3 && Boolean(accessUntil) && maxRedemptions >= 1, [accessUntil, code, label, maxRedemptions]);

  async function createCode() {
    if (!canCreate) return;
    setBusy(true);
    setError("");
    setCreatedCode("");
    try {
      const supabase = await getSupabaseClient();
      const { error: createError } = await supabase.rpc("create_plus_promo_code", {
        raw_code: code,
        code_label: label.trim(),
        target_access_valid_until: endOfDay(accessUntil),
        target_max_redemptions: maxRedemptions,
        target_redeem_by: endOfDay(accessUntil),
      });
      if (createError) throw createError;
      setCreatedCode(code);
      setCode("");
      await refresh();
    } catch {
      setError("Nie udało się utworzyć kodu. Sprawdź, czy kod jest unikalny i data jest w przyszłości.");
    } finally {
      setBusy(false);
    }
  }

  async function setActive(promoCodeId: string, active: boolean) {
    setBusy(true);
    setError("");
    try {
      const supabase = await getSupabaseClient();
      const { error: updateError } = await supabase.rpc("set_plus_promo_code_active", {
        target_promo_code_id: promoCodeId,
        next_active: active,
      });
      if (updateError) throw updateError;
      await refresh();
    } catch {
      setError("Nie udało się zmienić statusu kodu.");
    } finally {
      setBusy(false);
    }
  }

  return <Card className="admin-promo-card" id="kody-plus">
    <CardHeader><CardTitle>Kody bezpłatnego dostępu Plus</CardTitle><CardDescription>Utwórz kod z limitem użyć. W bazie zapisujemy wyłącznie jego skrót — pełnego kodu nie można później odzyskać.</CardDescription></CardHeader>
    <CardContent>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {createdCode && <Alert variant="success"><AlertDescription><b>Kod utworzony:</b> <code>{createdCode}</code> <Button type="button" size="sm" variant="outline" onClick={() => void navigator.clipboard.writeText(createdCode)}><Copy aria-hidden="true" /> Kopiuj</Button></AlertDescription></Alert>}
      <div className="admin-promo-form">
        <Label htmlFor="admin-promo-code">Kod<Input id="admin-promo-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="PLUS-ABCD-EFGH-JKLM" autoComplete="off" spellCheck={false} /></Label>
        <Button type="button" variant="outline" onClick={() => setCode(generateCode())}>Generuj bezpieczny kod</Button>
        <Label htmlFor="admin-promo-label">Opis<Input id="admin-promo-label" value={label} onChange={(event) => setLabel(event.target.value)} maxLength={120} /></Label>
        <Label htmlFor="admin-promo-until">Dostęp do<Input id="admin-promo-until" type="date" value={accessUntil} onChange={(event) => setAccessUntil(event.target.value)} /></Label>
        <Label htmlFor="admin-promo-limit">Limit użyć<Input id="admin-promo-limit" type="number" min={1} max={10000} value={maxRedemptions} onChange={(event) => setMaxRedemptions(Number(event.target.value))} /></Label>
        <Button type="button" onClick={() => void createCode()} disabled={!canCreate || busy}>{busy ? "Zapisuję…" : "Utwórz kod"}</Button>
      </div>
      <div className="admin-promo-list-heading"><b>Utworzone kody</b><Button type="button" size="sm" variant="ghost" onClick={() => void refresh()} disabled={busy}><RefreshCw aria-hidden="true" /> Odśwież</Button></div>
      {!codes.length ? <p className="admin-promo-empty">Nie utworzono jeszcze żadnego kodu.</p> : <div className="admin-promo-list">{codes.map((item) => <article key={item.promo_code_id}>
        <div><code>{item.code_hint}</code><b>{item.code_label}</b><span>Dostęp do {dateFormatter.format(new Date(item.access_valid_until))} · użycia {item.redemption_count}/{item.max_redemptions}</span></div>
        <Badge variant={item.active ? "secondary" : "outline"}>{item.active ? "Aktywny" : "Wyłączony"}</Badge>
        <Button type="button" size="sm" variant="outline" onClick={() => void setActive(item.promo_code_id, !item.active)} disabled={busy}>{item.active ? "Wyłącz" : "Włącz"}</Button>
      </article>)}</div>}
    </CardContent>
  </Card>;
}
