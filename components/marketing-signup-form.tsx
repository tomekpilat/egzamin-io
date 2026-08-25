"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Full-page anchors avoid a Vinext production navigation failure. */

import { useId, useMemo, useState } from "react";
import { BellRing, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MARKETING_CONSENT_VERSION, marketingConsentText, type MarketingSubscriptionType } from "@/lib/marketing-signup";

type Props = {
  subscriptionType: MarketingSubscriptionType;
  sourcePath: string;
  title: string;
  description: string;
  submitLabel: string;
  schoolName?: string;
  city?: string;
  recruitmentYear?: number;
  compact?: boolean;
};

export function MarketingSignupForm({
  subscriptionType,
  sourcePath,
  title,
  description,
  submitLabel,
  schoolName = "",
  city = "",
  recruitmentYear = 2027,
  compact = false,
}: Props) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const consentText = useMemo(() => marketingConsentText(subscriptionType, schoolName), [subscriptionType, schoolName]);
  const needsSchool = subscriptionType === "recruitment_thresholds" && schoolName.trim().length < 2;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");
    if (needsSchool) {
      setStatus("error");
      setMessage("Najpierw wpisz szkołę lub klasę w polu powyżej.");
      return;
    }

    try {
      const response = await fetch("/api/marketing-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          subscriptionType,
          schoolName,
          city,
          recruitmentYear,
          sourcePath,
          consent,
          consentText,
          consentVersion: MARKETING_CONSENT_VERSION,
          website,
        }),
      });
      const payload = await response.json() as { message?: string; errors?: string[] };
      if (!response.ok) throw new Error(payload.errors?.[0] ?? payload.message ?? "Nie udało się zapisać.");
      setStatus("success");
      setMessage(payload.message ?? "Zapisaliśmy Twój adres.");
      setEmail("");
      setConsent(false);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Nie udało się zapisać. Spróbuj ponownie.");
    }
  }

  if (status === "success") {
    return <div className={`marketing-signup marketing-signup-success${compact ? " marketing-signup-compact" : ""}`} role="status"><CheckCircle2 aria-hidden="true" /><div><b>Dziękujemy.</b><p>{message}</p></div></div>;
  }

  return (
    <form className={`marketing-signup${compact ? " marketing-signup-compact" : ""}`} onSubmit={submit} noValidate>
      <div className="marketing-signup-heading"><BellRing aria-hidden="true" /><div><b>{title}</b><p>{description}</p></div></div>
      <div className="marketing-signup-fields"><Label htmlFor={`${id}-email`} className="sr-only">Adres e-mail</Label><Input id={`${id}-email`} type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="twój@email.pl" required /><Button type="submit" disabled={status === "sending" || needsSchool}>{status === "sending" ? "Zapisuję…" : submitLabel}</Button></div>
      <div className="marketing-signup-honeypot" aria-hidden="true"><Label htmlFor={`${id}-website`}>Strona internetowa</Label><Input id={`${id}-website`} tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></div>
      <div className="marketing-signup-consent"><Checkbox id={`${id}-consent`} checked={consent} onCheckedChange={(checked) => setConsent(checked === true)} required /><Label htmlFor={`${id}-consent`}>{consentText} <a href="/polityka-prywatnosci#newsletter">Polityka prywatności</a>.</Label></div>
      {needsSchool && <p className="marketing-signup-message">Wpisz szkołę lub klasę powyżej, aby alert był konkretny.</p>}
      {status === "error" && <p className="marketing-signup-message marketing-signup-error" role="alert">{message}</p>}
    </form>
  );
}
