import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { prepareManifest, validateManifest } from "../scripts/cke-import.mjs";

const names = [
  "cke-2025-main-mathematics-100-x",
  "cke-2025-main-polish-100-x",
  "cke-2025-main-polish-100-y",
  "cke-2025-main-english-100-x",
];

const manifests = names.map((name) => JSON.parse(readFileSync(join(process.cwd(), `content/cke/${name}.json`), "utf8")));

describe("CKE 2025 imports", () => {
  it("contains the complete four-paper set and 73 question screens", () => {
    expect(manifests.map((manifest) => manifest.paper.question_count)).toEqual([21, 19, 19, 14]);
    expect(manifests.flatMap((manifest) => manifest.questions)).toHaveLength(73);
    expect(manifests.map((manifest) => manifest.questions.reduce((sum: number, question: { scoring: { max_points: number } }) => sum + question.scoring.max_points, 0))).toEqual([30, 45, 45, 55]);
  });

  it("passes schema validation and expands every shared passage", () => {
    for (const manifest of manifests) {
      expect(validateManifest(manifest), manifest.manifest_id).toEqual({ valid: true, errors: [] });
      const prepared = prepareManifest(manifest).manifest;
      expect(prepared.questions).toHaveLength(manifest.questions.length);
      for (const block of prepared.questions.flatMap((question: { content_blocks: Array<Record<string, unknown>> }) => question.content_blocks)) {
        if (block.type === "passage") expect(block.passage_id).toBeUndefined();
      }
    }
  });

  it("keeps source files and public assets checksum-verified", () => {
    for (const manifest of manifests) {
      const sources = [
        ...manifest.paper.supplementary_sources,
        ...manifest.questions.flatMap((question: { assets: Array<{ path: string; sha256: string }> }) => question.assets),
      ];
      const unique = new Map(sources.map((item: { path: string; sha256: string }) => [item.path, item]));
      for (const item of unique.values()) {
        const path = join(process.cwd(), item.path);
        expect(existsSync(path), item.path).toBe(true);
        expect(createHash("sha256").update(readFileSync(path)).digest("hex"), item.path).toBe(item.sha256);
      }
    }
  });

  it("models the two Polish versions as distinct CKE answer orders", () => {
    const polishX = manifests[1];
    const polishY = manifests[2];
    expect(polishX.paper.variant_code).toBe("100-X");
    expect(polishY.paper.variant_code).toBe("100-Y");
    expect(polishX.questions[0].prompt).not.toBe(polishY.questions[0].prompt);
    expect(polishX.questions[2].answer_options).not.toEqual(polishY.questions[2].answer_options);
    expect(polishX.questions[17].prompt).toBe(polishY.questions[17].prompt);
  });

  it("ships official English audio and all mathematics diagrams", () => {
    const mathematics = manifests[0];
    const english = manifests[3];
    expect(new Set(mathematics.questions.flatMap((question: { assets: Array<{ path: string }> }) => question.assets.map((item) => item.path))).size).toBe(10);
    const audioBlock = english.questions[0].content_blocks.find((block: { type: string }) => block.type === "audio");
    expect(audioBlock).toEqual({ type: "audio", asset_id: "ojap-100-2505-recording" });
    expect(english.questions[0].assets.find((item: { mime_type?: string }) => item.mime_type === "audio/mpeg")).toBeTruthy();
  });
});
