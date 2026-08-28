"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Full-page anchors match the rest of the public application. */

import { useId, useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MARKETING_CONSENT_VERSION, marketingConsentText } from "@/lib/marketing-signup";

export function SchoolThresholdRequestForm({ suggestedSchool = "" }: { suggestedSchool?: string }) {
  const id = useId();
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const effectiveSchoolName = schoolName ?? suggestedSchool;
  const consentText = useMemo(() => marketingConsentText("recruitment_thresholds", effectiveSchoolName), [effectiveSchoolName]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");

    try {
      const response = await fetch("/api/marketing-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          subscriptionType: "recruitment_thresholds",
          schoolName: effectiveSchoolName,
          city,
          recruitmentYear: 2027,
          sourcePath: "/kalkulator-punktow",
          consent,
          consentText,
          consentVersion: MARKETING_CONSENT_VERSION,
          website,
        }),
      });
      const payload = await response.json() as { message?: string; errors?: string[] };
      if (!response.ok) throw new Error(payload.errors?.[0] ?? payload.message ?? "Nie udało się wysłać zgłoszenia.");
      setStatus("success");
      setMessage(payload.message ?? "Powiadomimy Cię, gdy dodamy dane tej szkoły.");
      setEmail("");
      setConsent(false);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Nie udało się wysłać zgłoszenia. Spróbuj ponownie.");
    }
  }

  if (status === "success") {
    return <div className="calculator-school-request-success" role="status"><b>Zgłoszenie zapisane</b><p>{message}</p><Button type="button" variant="outline" onClick={() => { setStatus("idle"); setMessage(""); }}>Zgłoś inną szkołę</Button></div>;
  }

  return (
    <form className="calculator-school-request-form" onSubmit={submit} noValidate>
      <div className="calculator-request-grid">
        <div><Label htmlFor={`${id}-school`}>Szkoła lub klasa</Label><Input id={`${id}-school`} value={effectiveSchoolName} onChange={(event) => setSchoolName(event.target.value)} placeholder="np. V LO, klasa 1A mat-fiz" required /></div>
        <div><Label htmlFor={`${id}-city`}>Miasto</Label><Input id={`${id}-city`} value={city} onChange={(event) => setCity(event.target.value)} placeholder="np. Kraków" /></div>
      </div>
      <div><Label htmlFor={`${id}-email`}>Twój e-mail</Label><Input id={`${id}-email`} type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="twój@email.pl" required /></div>
      <div className="calculator-request-honeypot" aria-hidden="true"><Label htmlFor={`${id}-website`}>Strona internetowa</Label><Input id={`${id}-website`} tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></div>
      <div className="calculator-request-consent"><Checkbox id={`${id}-consent`} checked={consent} onCheckedChange={(checked) => setConsent(checked === true)} required /><Label htmlFor={`${id}-consent`}>{consentText} <a href="/polityka-prywatnosci#newsletter">Polityka prywatności</a>.</Label></div>
      {status === "error" ? <Alert variant="destructive" role="alert"><AlertDescription>{message}</AlertDescription></Alert> : null}
      <Button type="submit" variant="secondary" disabled={status === "sending"}>{status === "sending" ? "Wysyłam…" : "Zgłoś szkołę"}</Button>
    </form>
  );
}
