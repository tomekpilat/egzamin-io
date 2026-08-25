"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Full-page anchors avoid a Vinext production navigation failure. */

import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
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
      setMessage("Nie udało się wypisać. Napisz na kontakt@egzamin.io.");
      setStatus("error");
    }
  }

  return <main className="auth-page"><header className="auth-header"><a href="/" aria-label="egzaminio — strona główna"><BrandLogo /></a></header><div className="auth-shell"><Card><CardHeader><CardTitle>Rezygnacja z wiadomości</CardTitle></CardHeader><CardContent className="auth-form">{status === "done" ? <p role="status">{message}</p> : <><p>Jedno kliknięcie potwierdzi rezygnację z alertu lub listy oczekujących powiązanej z tym linkiem.</p><Button onClick={unsubscribe} disabled={status === "sending"}>{status === "sending" ? "Wypisuję…" : "Wypisz mój adres"}</Button>{status === "error" ? <p role="alert">{message}</p> : null}</>}</CardContent></Card></div></main>;
}
