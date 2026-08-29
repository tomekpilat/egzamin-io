"use client";

import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseClient } from "@/lib/supabase-browser";

type PromoResult = {
  result_code: "redeemed" | "already_redeemed" | "already_active" | "invalid_code" | "unavailable" | "rate_limited";
  granted_plan: "free" | "plus";
  access_valid_until: string | null;
};

const dateFormatter = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric" });

function formatDate(value: string | null) {
  if (!value) return "bezterminowo";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? `do ${dateFormatter.format(date)}` : "do daty wskazanej w kodzie";
}

function failureMessage(code: PromoResult["result_code"]) {
  if (code === "already_redeemed") return "Ten kod został już wykorzystany dla tego konta ucznia.";
  if (code === "already_active") return "To konto ma już aktywny dostęp Plus co najmniej na tak długo jak oferuje ten kod.";
  if (code === "rate_limited") return "Wykonano zbyt wiele prób. Odczekaj 15 minut i spróbuj ponownie.";
  if (code === "unavailable") return "Limit wykorzystania tego kodu został wyczerpany.";
  return "Kod jest nieprawidłowy, wygasł albo został wyłączony.";
}

export function PromoCodeRedemption({
  studentId = null,
  disabled = false,
  onRedeemed,
}: {
  studentId?: string | null;
  disabled?: boolean;
  onRedeemed?: () => void;
}) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PromoResult | null>(null);
  const [error, setError] = useState("");

  async function redeem() {
    if (disabled || code.trim().length < 8 || submitting) return;
    setSubmitting(true);
    setError("");
    setResult(null);
    try {
      const supabase = await getSupabaseClient();
      const { data, error: redeemError } = await supabase.rpc("redeem_plus_promo_code", {
        raw_code: code.trim(),
        target_student_id: studentId,
      });
      if (redeemError) throw redeemError;
      const nextResult = ((data as PromoResult[] | null) ?? [])[0];
      if (!nextResult) throw new Error("missing_promo_result");
      setResult(nextResult);
      if (nextResult.result_code === "redeemed") {
        setCode("");
        window.setTimeout(() => onRedeemed?.(), 900);
      }
    } catch {
      setError("Nie udało się sprawdzić kodu. Odśwież stronę i spróbuj ponownie.");
    } finally {
      setSubmitting(false);
    }
  }

  return <section className="promo-code-redemption" aria-labelledby="promo-code-title">
    <div>
      <b id="promo-code-title">Masz kod promocyjny?</b>
      <span>Aktywuj Pakiet Plus bez przechodzenia do płatności.</span>
    </div>
    <div className="promo-code-form">
      <Label htmlFor={`plus-promo-code-${studentId ?? "self"}`} className="sr-only">Kod promocyjny</Label>
      <Input
        id={`plus-promo-code-${studentId ?? "self"}`}
        value={code}
        onChange={(event) => setCode(event.target.value.toUpperCase())}
        onKeyDown={(event) => { if (event.key === "Enter") void redeem(); }}
        placeholder="Wpisz kod"
        autoComplete="off"
        spellCheck={false}
        maxLength={80}
        disabled={disabled || submitting}
      />
      <Button type="button" variant="outline" onClick={() => void redeem()} disabled={disabled || submitting || code.trim().length < 8}>
        {submitting ? "Sprawdzamy…" : "Aktywuj kod"}
      </Button>
    </div>
    {disabled && <p className="promo-code-disabled">Pakiet Plus jest już aktywny dla tego ucznia.</p>}
    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
    {result?.result_code === "redeemed" && <Alert variant="success"><AlertTitle>Pakiet Plus został aktywowany</AlertTitle><AlertDescription>Dostęp działa {formatDate(result.access_valid_until)}. Nie pobraliśmy żadnej płatności.</AlertDescription></Alert>}
    {result && result.result_code !== "redeemed" && <Alert variant="warning"><AlertDescription>{failureMessage(result.result_code)}</AlertDescription></Alert>}
  </section>;
}
