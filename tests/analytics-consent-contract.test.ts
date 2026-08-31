import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const component = readFileSync(join(root, "components/analytics-consent.tsx"), "utf8");
const layout = readFileSync(join(root, "app/layout.tsx"), "utf8");
const privacy = readFileSync(join(root, "app/polityka-prywatnosci/page.tsx"), "utf8");
const cookies = readFileSync(join(root, "app/polityka-cookies/page.tsx"), "utf8");
const styles = readFileSync(join(root, "app/globals.css"), "utf8");

describe("GA4 basic consent contract", () => {
  it("keeps the tag outside server markup and creates it only after accepted state", () => {
    expect(layout).not.toContain("googletagmanager.com");
    expect(component).toContain('if (!enabled || choice !== "accepted") return');
    expect(component).toContain("document.createElement(\"script\")");
    expect(component).toContain("googletagmanager.com/gtag/js");
    expect(component).toContain("window.dataLayer!.push(arguments)");
    expect(component).not.toContain("window.dataLayer!.push(args)");
  });

  it("defaults every Consent Mode v2 storage purpose to denied and never grants ads", () => {
    expect(component).toContain('analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied"');
    expect(component).toContain('analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied"');
    expect(component).toContain('allow_google_signals: false');
    expect(component).toContain('allow_ad_personalization_signals: false');
    expect(component).toContain('allow_interest_groups: false');
  });

  it("offers equal banner choices, persistent settings and cookie cleanup", () => {
    expect(component).toContain("Zgadzam się");
    expect(component).toContain("Nie, dziękuję");
    expect(component).toContain("Ustawienia prywatności");
    expect(component).toContain("clearGoogleAnalyticsCookies");
    expect(component).toContain("window.location.reload()");
    expect(component).toContain("window.addEventListener(OPEN_PRIVACY_SETTINGS_EVENT, openSettings)");
    const quickLinksRule = styles.match(/\.privacy-quick-links\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(quickLinksRule).not.toContain("position: fixed");
    expect(quickLinksRule).toContain("border-top");
    expect(styles).toContain("body:has(.dashboard-page) .privacy-quick-links { display: none; }");
  });

  it("documents Google, consent, retention, cookies and prohibited education data", () => {
    expect(privacy).toContain("Google Ireland Limited");
    expect(privacy).toContain("2 miesiące");
    expect(privacy).toContain("treści zadania");
    expect(cookies).toContain("_ga");
    expect(cookies).toContain("90 dni");
    expect(cookies).toContain("180 dni");
  });
});
