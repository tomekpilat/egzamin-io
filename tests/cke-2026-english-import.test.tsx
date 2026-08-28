import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CkeQuestionContent } from "@/components/cke-question-content";
import { prepareManifest, validateManifest } from "@/scripts/cke-import.mjs";

const manifestPath = join(process.cwd(), "content/cke/cke-2026-main-english-100-x.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
  paper: { question_count: number; source_pdf_sha256: string; supplementary_sources: Array<{ path: string; sha256: string }> };
  passages: Array<{ id: string; paragraphs: string[] }>;
  questions: Array<{
    number: string;
    type: string;
    scoring: { max_points: number };
    content_blocks: Array<Record<string, unknown>>;
    assets: Array<{ path: string; sha256: string }>;
  }>;
};

afterEach(cleanup);

describe("CKE 2026 English import", () => {
  it("contains all 14 tasks worth exactly 55 points", () => {
    expect(validateManifest(manifest)).toEqual({ valid: true, errors: [] });
    expect(manifest.paper.question_count).toBe(14);
    expect(manifest.questions).toHaveLength(14);
    expect(manifest.questions.map((question) => question.number)).toEqual(Array.from({ length: 14 }, (_, index) => String(index + 1)));
    expect(manifest.questions.reduce((sum, question) => sum + question.scoring.max_points, 0)).toBe(55);
  });

  it("keeps composite tasks together so partial CKE points can be self-assessed", () => {
    expect(manifest.questions.every((question) => question.type === "long_text")).toBe(true);
    expect(manifest.questions.slice(0, 4).reduce((sum, question) => sum + question.scoring.max_points, 0)).toBe(16);
    expect(manifest.questions.find((question) => question.number === "14")?.scoring.max_points).toBe(10);
  });

  it("expands shared reading passages before staging", () => {
    const prepared = prepareManifest(manifest).manifest;
    const task7 = prepared.questions.find((question: { number: string }) => question.number === "7");
    expect(task7.content_blocks[0]).toMatchObject({ type: "passage", id: "task-7-reading", default_open: true });
    expect(task7.content_blocks[0].paragraphs).toHaveLength(4);
  });

  it("keeps every source and public media asset checksum-verified", () => {
    const booklet = join(process.cwd(), "content/cke/sources/2026/jezyk_angielski/OJAP-100-X-2605-zeszyt-zadan.pdf");
    expect(createHash("sha256").update(readFileSync(booklet)).digest("hex")).toBe(manifest.paper.source_pdf_sha256);
    const uniqueAssets = new Map(
      [...manifest.questions.flatMap((question) => question.assets), ...manifest.paper.supplementary_sources]
        .map((asset) => [asset.path, asset]),
    );
    expect(uniqueAssets.size).toBe(6);
    for (const asset of uniqueAssets.values()) {
      const path = join(process.cwd(), asset.path);
      expect(existsSync(path), asset.path).toBe(true);
      expect(createHash("sha256").update(readFileSync(path)).digest("hex")).toBe(asset.sha256);
    }
  });

  it("renders an accessible lazy-loaded audio player", () => {
    render(<CkeQuestionContent
      blocks={[{ type: "audio", asset_id: "recording" }]}
      assets={[{ id: "recording", path: "public/cke/recording.mp3", sha256: "0".repeat(64), alt: "Nagranie do zadań", caption: "Oficjalne nagranie", mime_type: "audio/mpeg" }]}
    />);
    expect(screen.getByText("Oficjalne nagranie")).toBeInTheDocument();
    expect(screen.getByText("Nagranie do zadań")).toBeInTheDocument();
    expect(document.querySelector("audio")).toHaveAttribute("preload", "metadata");
    expect(document.querySelector("source")).toHaveAttribute("src", "/cke/recording.mp3");
  });
});
