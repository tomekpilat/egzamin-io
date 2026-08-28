import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const homepage = readFileSync(join(root, "app", "page.tsx"), "utf8");
const panel = readFileSync(join(root, "app", "panel", "page.tsx"), "utf8");
const practice = readFileSync(join(root, "components", "student-practice.tsx"), "utf8");
const privacy = readFileSync(join(root, "app", "polityka-prywatnosci", "page.tsx"), "utf8");
const childSafety = readFileSync(join(root, "app", "bezpieczenstwo-dzieci-ai", "page.tsx"), "utf8");

describe("standard CKE papers in the MVP UI", () => {
  it("keeps the parent privacy promise on the simplified homepage", () => {
    expect(homepage).toContain("Rodzic widzi postęp, nie prywatne rozmowy");
    expect(homepage).toContain("Rodzic nie czyta rozmów");
    expect(homepage).toContain('rola=rodzic');
  });

  it("keeps only the weekly learning goal in child settings", () => {
    expect(panel).toContain('supabase.rpc("update_child_learning_settings"');
    expect(panel).toContain('next_accommodation_code: "100"');
    expect(panel).not.toContain("CKE_ACCOMMODATIONS");
    expect(panel).not.toContain("Materiał przeznaczony dla");
    expect(panel).not.toContain("Wariant arkuszy");
  });

  it("does not load or show a material profile in the student panel", () => {
    expect(practice).not.toContain('supabase.rpc("get_my_cke_preference")');
    expect(practice).not.toContain("Twój wariant arkuszy");
    expect(practice).not.toContain("Ustawienie kontroluje rodzic");
    expect(practice).not.toContain("exam_accommodation_label");
  });

  it("removes the discontinued feature from user-facing legal information", () => {
    expect(privacy).not.toContain("Wariant arkuszy CKE");
    expect(privacy).not.toContain("art. 9 ust. 2 RODO");
    expect(childSafety).not.toContain("Wariant arkuszy według kryteriów CKE");
    expect(childSafety).not.toContain("afazją");
  });
});
