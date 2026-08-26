import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AnalyticsConsent } from "@/components/analytics-consent";
import { ANALYTICS_CONSENT_KEY } from "@/lib/analytics";

describe("AnalyticsConsent", () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete window.__egzaminioAnalyticsReady;
    delete window.gtag;
    delete window.dataLayer;
    document.querySelectorAll('script[data-egzaminio-analytics="true"]').forEach((node) => node.remove());
    document.cookie = "_ga=; Max-Age=0; Path=/";
  });

  afterEach(() => cleanup());

  it("does not render or load Google when the Measurement ID is absent", async () => {
    render(<AnalyticsConsent />);
    await Promise.resolve();
    expect(screen.queryByText("Zgadzam się")).not.toBeInTheDocument();
    expect(document.querySelector('script[src*="googletagmanager.com"]')).toBeNull();
  });

  it("does not load a script, set GA cookies or create requests before consent and after rejection", async () => {
    render(<AnalyticsConsent measurementId="G-ABC12345" />);
    const reject = await screen.findByRole("button", { name: "Nie, dziękuję" });
    expect(document.querySelector('script[src*="googletagmanager.com"]')).toBeNull();
    expect(document.cookie).not.toContain("_ga");
    expect(window.dataLayer).toBeUndefined();
    fireEvent.click(reject);
    expect(document.querySelector('script[src*="googletagmanager.com"]')).toBeNull();
    expect(window.dataLayer).toBeUndefined();
    expect(JSON.parse(window.localStorage.getItem(ANALYTICS_CONSENT_KEY) ?? "{}").choice).toBe("rejected");
  });

  it("loads gtag only after explicit acceptance with ads still denied", async () => {
    render(<AnalyticsConsent measurementId="G-ABC12345" />);
    fireEvent.click(await screen.findByRole("button", { name: "Zgadzam się" }));
    await waitFor(() => expect(document.querySelector('script[src*="googletagmanager.com"]')).not.toBeNull());
    expect(window.__egzaminioAnalyticsReady).toBe(true);
    expect(window.dataLayer).toEqual(expect.arrayContaining([
      expect.arrayContaining(["consent", "default", expect.objectContaining({ analytics_storage: "denied", ad_storage: "denied" })]),
      expect.arrayContaining(["consent", "update", expect.objectContaining({ analytics_storage: "granted", ad_storage: "denied" })]),
    ]));
  });
});
