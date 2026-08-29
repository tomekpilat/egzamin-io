import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { validateManifest } from "@/scripts/cke-import.mjs";

const years = [2019, 2020, 2021, 2022, 2023, 2024] as const;
const subjects = ["mathematics", "polish", "english", "french", "spanish", "german", "russian", "italian"] as const;
const languages = new Set(["english", "french", "spanish", "german", "russian", "italian"]);

const expected = {
  2019: { mathematics: [21, 30], polish: [22, 50], language: [14, 60] },
  2020: { mathematics: [21, 30], polish: [22, 50], language: [14, 60] },
  2021: { mathematics: [19, 25], polish: [19, 45], language: [14, 55] },
  2022: { mathematics: [19, 25], polish: [19, 45], language: [14, 55] },
  2023: { mathematics: [19, 25], polish: [19, 45], language: [14, 55] },
  2024: { mathematics: [19, 25], polish: [18, 45], language: [14, 55] },
} as const;

type Manifest = {
  manifest_id: string;
  paper: { exam_year: number; subject: string; question_count: number; source_url: string };
  passages: Array<{ id: string }>;
  questions: Array<{
    number: string;
    answer_key: { accepted_results?: string[] };
    scoring: { max_points: number };
    content_blocks: Array<{ type: string }>;
    assets: Array<{ path: string; sha256: string; mime_type: string }>;
  }>;
};

const manifests = years.flatMap((year) => subjects.map((subject) => {
  const path = join(process.cwd(), `content/cke/cke-${year}-main-${subject}-100-x.json`);
  return JSON.parse(readFileSync(path, "utf8")) as Manifest;
}));

describe("CKE 2019–2024 imports", () => {
  it("contains all 48 papers and 741 complete question screens", () => {
    expect(manifests).toHaveLength(48);
    expect(manifests.flatMap((manifest) => manifest.questions)).toHaveLength(741);
    for (const manifest of manifests) {
      const subject = manifest.paper.subject as typeof subjects[number];
      const category = languages.has(subject) ? "language" : subject as "mathematics" | "polish";
      const [questionCount, points] = expected[manifest.paper.exam_year as keyof typeof expected][category];
      expect(manifest.paper.question_count, manifest.manifest_id).toBe(questionCount);
      expect(manifest.questions, manifest.manifest_id).toHaveLength(questionCount);
      expect(manifest.questions.reduce((sum, question) => sum + question.scoring.max_points, 0), manifest.manifest_id).toBe(points);
      expect(manifest.questions.map((question) => question.number), manifest.manifest_id)
        .toEqual(Array.from({ length: questionCount }, (_, index) => String(index + 1)));
    }
  });

  it("passes schema validation and keeps every question visually faithful to the source", () => {
    for (const manifest of manifests) {
      expect(validateManifest(manifest), manifest.manifest_id).toEqual({ valid: true, errors: [] });
      expect(manifest.paper.source_url).toBe(`https://cke.gov.pl/egzamin-osmoklasisty/arkusze/${manifest.paper.exam_year}-2/`);
      for (const question of manifest.questions) {
        const images = question.assets.filter((asset) => asset.mime_type === "image/webp");
        expect(images.length, `${manifest.manifest_id} q${question.number}`).toBeGreaterThan(0);
        for (const asset of images) {
          const path = join(process.cwd(), asset.path);
          expect(existsSync(path), asset.path).toBe(true);
          expect(createHash("sha256").update(readFileSync(path)).digest("hex"), asset.path).toBe(asset.sha256);
        }
      }
    }
  });

  it("includes complete official language keys and listening materials", () => {
    for (const manifest of manifests.filter((item) => languages.has(item.paper.subject))) {
      expect(manifest.questions.slice(0, 13).every((question) => question.answer_key.accepted_results?.length), manifest.manifest_id).toBe(true);
      const listeningType = manifest.paper.exam_year >= 2021 ? "audio" : "passage";
      expect(
        manifest.questions.slice(0, 4).every((question) => question.content_blocks.some((block) => block.type === listeningType)),
        manifest.manifest_id,
      ).toBe(true);
      if (listeningType === "audio") {
        for (const question of manifest.questions.slice(0, 4)) {
          const audio = question.assets.find((asset) => asset.mime_type === "audio/mpeg");
          expect(audio?.path, manifest.manifest_id).toMatch(/^https:\/\/cke\.gov\.pl\//);
        }
      } else {
        expect(manifest.passages.length, manifest.manifest_id).toBeGreaterThanOrEqual(4);
      }
    }
  });
});
