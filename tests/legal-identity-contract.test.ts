import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const legalDocuments = [
  "app/regulamin/page.tsx",
  "app/polityka-prywatnosci/page.tsx",
  "app/polityka-cookies/page.tsx",
  "app/odstapienie-od-umowy/page.tsx",
  "app/informacje-prawne/page.tsx",
  "app/bezpieczenstwo-dzieci-ai/page.tsx",
  "app/usun-konto/page.tsx",
].map(read).join("\n");

const contactSurfaces = [
  legalDocuments,
  read("components/legal-shell.tsx"),
  read("components/site-footer.tsx"),
  read("components/seo-content-page.tsx"),
  read("components/parent-payments.tsx"),
  read("app/panel/page.tsx"),
  read("app/wypisz/page.tsx"),
  read("docs/stripe-payments-setup.md"),
].join("\n");

describe("legal operator identity", () => {
  it("identifies Tomasz Piłat as the service operator and data controller", () => {
    expect(legalDocuments).toContain("Usługodawcą i operatorem serwisu jest <b>Tomasz Piłat</b>");
    expect(legalDocuments).toContain("Administratorem danych osobowych jest <b>Tomasz Piłat</b>");
    expect(legalDocuments).toContain("Adresat:</b> Tomasz Piłat");
  });

  it("uses the current contact address on every legal and support surface", () => {
    expect(contactSurfaces).toContain("kontakt@egzaminio.io");
    expect(contactSurfaces).not.toContain("kontakt@egzamin.io");
  });

  it("does not publish identity placeholders as operator data", () => {
    expect(legalDocuments).not.toContain("[NAZWA / IMIĘ I NAZWISKO");
    expect(legalDocuments).not.toContain("[NAZWA I ADRES PRZEDSIĘBIORCY]");
    expect(legalDocuments).not.toContain("[NIE WYZNACZONO / UZUPEŁNIJ KONTAKT]");
  });

  it("bumps the legal version so returning users can accept the update", () => {
    const legalVersion = read("lib/legal.ts");
    expect(legalVersion).toContain('LEGAL_VERSION = "2026-08-31-operator-contact"');
    expect(legalVersion).toContain('LEGAL_UPDATED_LABEL = "31 sierpnia 2026 r."');
  });
});
