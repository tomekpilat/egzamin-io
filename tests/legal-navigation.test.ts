import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const shell = readFileSync(join(root, "components/legal-shell.tsx"), "utf8");
const hub = readFileSync(join(root, "app/informacje-prawne/page.tsx"), "utf8");

const legalRoutes = [
  "/informacje-prawne",
  "/polityka-prywatnosci",
  "/regulamin",
  "/polityka-cookies",
  "/bezpieczenstwo-dzieci-ai",
  "/odstapienie-od-umowy",
  "/usun-konto",
];

describe("legal navigation", () => {
  it("uses reliable full-page anchors for every legal route", () => {
    expect(shell).not.toContain('from "next/link"');
    legalRoutes.forEach((route) => expect(shell).toContain(`["${route}"`));
    expect(shell).toContain("<a href={href}");
  });

  it("makes every legal hub document card a full-page link", () => {
    expect(hub).not.toContain('from "next/link"');
    expect(hub).toContain("<a href={href} key={href}>");
    expect(hub).toContain("Czytaj →");
  });
});
