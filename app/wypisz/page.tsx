"use client";

import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UnsubscribePage() {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function unsubscribe() {
    setStatus("sending");
    const token = new URLSearchParams(window.location.search).get("token") ?? "";
    try {
      const response = await fetch("/api/marketing-unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      const payload = await response.json() as { message?: string };
      setMessage(payload.message ?? "Gotowe.");
      setStatus(response.ok ? "done" : "error");
    } catch {
      setMessage("Nie udało się wypisać. Napisz na kontakt@egzaminio.io.");
      setStatus("error");
    }
  }

  return <main className="auth-page"><SiteHeader currentPath="/wypisz" /><div className="auth-shell"><Card><CardHeader><CardTitle>Rezygnacja z wiadomości</CardTitle></CardHeader><CardContent className="auth-form">{status === "done" ? <p role="status">{message}</p> : <><p>Jedno kliknięcie potwierdzi rezygnację z alertu lub listy oczekujących powiązanej z tym linkiem.</p><Button onClick={unsubscribe} disabled={status === "sending"}>{status === "sending" ? "Wypisuję…" : "Wypisz mój adres"}</Button>{status === "error" ? <p role="alert">{message}</p> : null}</>}</CardContent></Card></div></main>;
}
