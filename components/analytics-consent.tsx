"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Full-page anchors match the Vinext navigation strategy used by the app. */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  ANALYTICS_CONSENT_KEY,
  ANALYTICS_COOKIE_MAX_AGE_SECONDS,
  createAnalyticsConsentRecord,
  clearGoogleAnalyticsCookies,
  parseAnalyticsConsentRecord,
  sanitizeAnalyticsPath,
  trackAnalyticsEvent,
  validGoogleMeasurementId,
  type AnalyticsConsentChoice,
} from "@/lib/analytics";

function configureAnalytics(measurementId: string) {
  if (window.__egzaminioAnalyticsReady) return;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = window.gtag ?? function gtag() {
    // Google requires the native Arguments object here; a rest-parameter array is not parsed as a gtag command.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("consent", "default", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  window.gtag("set", "ads_data_redaction", true);
  window.gtag("set", "url_passthrough", false);
  window.gtag("consent", "update", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  window.gtag("js", new Date());
  window.gtag("config", measurementId, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    allow_interest_groups: false,
    cookie_expires: ANALYTICS_COOKIE_MAX_AGE_SECONDS,
    cookie_update: false,
    ...(process.env.NODE_ENV === "production" ? {} : { debug_mode: true }),
  });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  script.dataset.egzaminioAnalytics = "true";
  document.head.appendChild(script);
  window.__egzaminioAnalyticsReady = true;
}

function disableAnalytics() {
  window.gtag?.("consent", "update", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  clearGoogleAnalyticsCookies(window.location.hostname, document.cookie.split(";").map((part) => part.trim().split("=")[0]));
  document.querySelectorAll('script[data-egzaminio-analytics="true"]').forEach((script) => script.remove());
  delete window.__egzaminioAnalyticsReady;
  delete window.gtag;
  delete window.dataLayer;
}

export function AnalyticsConsent({ measurementId }: { measurementId?: string }) {
  const pathname = typeof window === "undefined" ? "/" : window.location.pathname;
  const enabled = validGoogleMeasurementId(measurementId);
  const [choice, setChoice] = useState<AnalyticsConsentChoice | "pending" | "loading">("loading");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const record = parseAnalyticsConsentRecord(window.localStorage.getItem(ANALYTICS_CONSENT_KEY));
      const nextChoice = record?.choice ?? "pending";
      setChoice(nextChoice);
      setAnalyticsEnabled(nextChoice === "accepted");
    });
    return () => { active = false; };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || choice !== "accepted") return;
    configureAnalytics(measurementId!.trim());
    trackAnalyticsEvent("page_view");
    if (sanitizeAnalyticsPath(pathname) === "/plan-plus") trackAnalyticsEvent("plan_plus_viewed");
    const authIntent = window.sessionStorage.getItem("egzaminio:analytics-auth-intent");
    if (sanitizeAnalyticsPath(pathname) === "/panel" && authIntent === "login") {
      trackAnalyticsEvent("login_completed");
      window.sessionStorage.removeItem("egzaminio:analytics-auth-intent");
    }
    if (["/panel", "/oczekuje-na-zgode"].includes(sanitizeAnalyticsPath(pathname)) && authIntent === "signup") {
      trackAnalyticsEvent("signup_completed");
      window.sessionStorage.removeItem("egzaminio:analytics-auth-intent");
    }
  }, [choice, enabled, measurementId, pathname]);

  useEffect(() => {
    if (!enabled) return;
    const onClick = (event: MouseEvent) => {
      const target = (event.target as Element | null)?.closest<HTMLElement>("[data-analytics-event]");
      const name = target?.dataset.analyticsEvent;
      if (name === "signup_started" || name === "plan_plus_cta_clicked") trackAnalyticsEvent(name);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [enabled]);

  if (!enabled) return null;

  function save(nextChoice: AnalyticsConsentChoice) {
    const wasAccepted = choice === "accepted";
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, JSON.stringify(createAnalyticsConsentRecord(nextChoice)));
    setChoice(nextChoice);
    setAnalyticsEnabled(nextChoice === "accepted");
    setSettingsOpen(false);
    if (nextChoice === "rejected") {
      disableAnalytics();
      if (wasAccepted) window.location.reload();
    }
  }

  return <>
    {choice === "pending" ? <section className="analytics-consent-banner" role="dialog" aria-modal="false" aria-labelledby="analytics-consent-title"><div><b id="analytics-consent-title">Pomóż nam ulepszać egzaminio</b><p>Za Twoją zgodą użyjemy Google Analytics. Nie wysyłamy danych konta, odpowiedzi ani rozmów z AI. <button type="button" className="analytics-consent-settings-link" onClick={() => setSettingsOpen(true)}>Ustawienia i cookies</button></p></div><div className="analytics-consent-actions"><Button variant="outline" onClick={() => save("accepted")}>Zgadzam się</Button><Button variant="outline" onClick={() => save("rejected")}>Nie, dziękuję</Button></div></section> : null}

    <nav className="privacy-quick-links" aria-label="Prywatność i cookies"><a href="/polityka-prywatnosci">Prywatność</a><a href="/polityka-cookies">Cookies</a><button type="button" className="privacy-settings-trigger" onClick={() => { setAnalyticsEnabled(choice === "accepted"); setSettingsOpen(true); }}>Ustawienia prywatności</button></nav>

    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}><DialogContent><DialogHeader><DialogTitle>Ustawienia prywatności</DialogTitle><DialogDescription>Niezbędna pamięć sesji działa zawsze. Analityka jest dobrowolna i nie wpływa na konto ani naukę.</DialogDescription></DialogHeader><div className="analytics-settings-row"><div><Label htmlFor="analytics-consent-toggle">Analityka Google Analytics</Label><p>Anonimizowany pomiar odsłon i podstawowych etapów korzystania z aplikacji. Bez treści edukacyjnych i identyfikatorów kont.</p></div><Checkbox id="analytics-consent-toggle" checked={analyticsEnabled} onCheckedChange={(checked) => setAnalyticsEnabled(checked === true)} /></div><DialogFooter><Button variant="outline" onClick={() => setSettingsOpen(false)}>Anuluj</Button><Button onClick={() => save(analyticsEnabled ? "accepted" : "rejected")}>Zapisz ustawienia</Button></DialogFooter></DialogContent></Dialog>
  </>;
}
