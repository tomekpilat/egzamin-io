import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { validateManifest } from "@/scripts/cke-import.mjs";

const languages = [
  ["french", "francuski"],
  ["spanish", "hiszpański"],
  ["german", "niemiecki"],
  ["russian", "rosyjski"],
  ["italian", "włoski"],
] as const;

describe.each(languages)("CKE 2026 — język %s", (subject, polishLabel) => {
  const manifestPath = join(process.cwd(), `content/cke/cke-2026-main-${subject}-100-x.json`);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    paper: {
      subject: string;
      question_count: number;
      source_pdf_sha256: string;
      source_label: string;
      supplementary_sources: Array<{ path: string; sha256: string }>;
    };
    questions: Array<{
      number: string;
      prompt: string;
      scoring: { max_points: number };
      content_blocks: Array<{ type: string }>;
      assets: Array<{ path: string; sha256: string }>;
    }>;
  };

  it("ma komplet 14 zadań i 55 punktów", () => {
    expect(validateManifest(manifest)).toEqual({ valid: true, errors: [] });
    expect(manifest.paper.subject).toBe(subject);
    expect(manifest.paper.source_label).toContain(polishLabel);
    expect(manifest.paper.question_count).toBe(14);
    expect(manifest.questions.map((question) => question.number)).toEqual(Array.from({ length: 14 }, (_, index) => String(index + 1)));
    expect(manifest.questions.reduce((sum, question) => sum + question.scoring.max_points, 0)).toBe(55);
    expect(manifest.questions.every((question) => question.prompt.length > 100)).toBe(true);
  });

  it("udostępnia oficjalne nagranie w zadaniach 1–4", () => {
    expect(manifest.questions.slice(0, 4).every((question) => question.content_blocks.some((block) => block.type === "audio"))).toBe(true);
    expect(manifest.questions[0].content_blocks.some((block) => block.type === "image")).toBe(true);
  });

  it("weryfikuje sumy kontrolne źródeł i publicznych mediów", () => {
    const uniqueFiles = new Map(
      [...manifest.paper.supplementary_sources, ...manifest.questions.flatMap((question) => question.assets)]
        .map((asset) => [asset.path, asset]),
    );
    for (const asset of uniqueFiles.values()) {
      const path = join(process.cwd(), asset.path);
      expect(existsSync(path), asset.path).toBe(true);
      expect(createHash("sha256").update(readFileSync(path)).digest("hex")).toBe(asset.sha256);
    }
  });
});

describe("pozostałe języki obce w bazie", () => {
  it("rozszerza ograniczenia i ścieżki SEO dla wszystkich pięciu języków", () => {
    const migration = readFileSync(join(process.cwd(), "supabase/migrations/20260828190000_add_remaining_foreign_languages.sql"), "utf8");
    for (const subject of languages.map(([value]) => value)) expect(migration).toContain(`'${subject}'`);
    for (const slug of ["jezyk-francuski", "jezyk-hiszpanski", "jezyk-niemiecki", "jezyk-rosyjski", "jezyk-wloski"]) {
      expect(migration).toContain(slug);
    }
  });
});
