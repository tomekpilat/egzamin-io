import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const homepage = readFileSync(join(root, "app", "page.tsx"), "utf8");
const panel = readFileSync(join(root, "app", "panel", "page.tsx"), "utf8");
const practice = readFileSync(join(root, "components", "student-practice.tsx"), "utf8");
const privacy = readFileSync(join(root, "app", "polityka-prywatnosci", "page.tsx"), "utf8");

describe("CKE accommodation UI", () => {
  it("keeps the parent privacy promise on the simplified homepage", () => {
    expect(homepage).toContain("Rodzic widzi postęp, nie prywatne rozmowy");
    expect(homepage).toContain("Rodzic nie czyta rozmów");
    expect(homepage).toContain('rola=rodzic');
  });

  it("lets a linked parent select and explicitly confirm a non-standard variant", () => {
    expect(panel).toContain("CKE_ACCOMMODATIONS.map");
    expect(panel).toContain("confirms_sensitive_preference");
    expect(panel).toContain('supabase.rpc("update_child_learning_settings"');
    expect(panel).toContain("ustawienie może ujawniać informacje o szczególnych potrzebach edukacyjnych dziecka");
  });

  it("shows the selected profile to the student and never promises a silent fallback", () => {
    expect(practice).toContain('supabase.rpc("get_my_cke_preference")');
    expect(practice).toContain("Nie przełączamy Cię automatycznie na inny wariant");
    expect(practice).toContain("Ustawienie kontroluje rodzic");
    expect(practice).toContain("exam_accommodation_label");
  });

  it("documents the sensitive-data implications", () => {
    expect(privacy).toContain("może jednak ujawniać lub pozwalać wnioskować o zdrowiu");
    expect(privacy).toContain("art. 9 ust. 2 RODO");
    expect(privacy).toContain("nie przekazujemy go do analityki ani AI");
  });
});
