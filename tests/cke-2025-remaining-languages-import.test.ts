import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { validateManifest } from "@/scripts/cke-import.mjs";

const languages = [
  ["french", "francuski", "OJFP"],
  ["spanish", "hiszpański", "OJHP"],
  ["german", "niemiecki", "OJNP"],
  ["russian", "rosyjski", "OJRP"],
  ["italian", "włoski", "OJWP"],
] as const;

describe.each(languages)("CKE 2025 — język %s", (subject, polishLabel) => {
  const manifestPath = join(process.cwd(), `content/cke/cke-2025-main-${subject}-100-x.json`);
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
    expect(manifest.questions[0].content_blocks.filter((block) => block.type === "image")).toHaveLength(2);
  });

  it("weryfikuje metadane źródeł i sumy kontrolne publicznych mediów", () => {
    for (const source of manifest.paper.supplementary_sources) {
      expect(source.path).toMatch(/^content\/cke\/sources\/2025\//);
      expect(source.sha256).toMatch(/^[a-f0-9]{64}$/);
    }
    const uniqueFiles = new Map(
      manifest.questions.flatMap((question) => question.assets)
        .map((asset) => [asset.path, asset]),
    );
    for (const asset of uniqueFiles.values()) {
      const path = join(process.cwd(), asset.path);
      expect(existsSync(path), asset.path).toBe(true);
      expect(createHash("sha256").update(readFileSync(path)).digest("hex")).toBe(asset.sha256);
    }
  });
});

describe("katalog źródeł CKE 2025", () => {
  const catalog = JSON.parse(readFileSync(join(process.cwd(), "content/cke/source-catalog-2025.json"), "utf8")) as {
    subjects: string[];
    files: Array<{ file_name: string }>;
  };

  it("obejmuje standardowe arkusze wszystkich pozostałych języków", () => {
    for (const [, polishLabel, code] of languages) {
      expect(catalog.subjects).toContain(`Język ${polishLabel}`);
      expect(catalog.files.some((file) => file.file_name === `${code}-100-X-2505-zeszyt-zadan.pdf`)).toBe(true);
    }
  });
});
