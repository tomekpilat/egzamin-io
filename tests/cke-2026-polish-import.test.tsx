import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CkeQuestionContent } from "@/components/cke-question-content";
import { prepareManifest, validateManifest } from "../scripts/cke-import.mjs";

const manifestPath = join(process.cwd(), "content/cke/cke-2026-main-polish-100-x.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
  paper: { question_count: number; source_pdf_sha256: string; supplementary_sources: Array<{ path: string; sha256: string }> };
  passages: Array<{ id: string; title: string; paragraphs: string[] }>;
  questions: Array<{
    number: string;
    type: string;
    scoring: { max_points: number };
    content_blocks: Array<Record<string, unknown>>;
    assets: Array<{ path: string; sha256: string }>;
  }>;
};

afterEach(cleanup);

describe("CKE 2026 Polish import", () => {
  it("contains all 18 questions worth exactly 45 points", () => {
    expect(validateManifest(manifest)).toEqual({ valid: true, errors: [] });
    expect(manifest.paper.question_count).toBe(18);
    expect(manifest.questions).toHaveLength(18);
    expect(manifest.questions.map((question) => question.number)).toEqual(Array.from({ length: 18 }, (_, index) => String(index + 1)));
    expect(manifest.questions.reduce((sum, question) => sum + question.scoring.max_points, 0)).toBe(45);
  });

  it("models closed, short and extended written responses", () => {
    const types = new Set(manifest.questions.map((question) => question.type));
    expect(types).toEqual(new Set(["single_choice", "multiple_choice", "long_text"]));
    expect(manifest.questions.find((question) => question.number === "18")?.scoring.max_points).toBe(20);
    expect(manifest.passages.map((passage) => passage.id)).toEqual(["przyjaciel-automateusza", "wieczne-pioro", "ksztaltowac-przyszlosc"]);
  });

  it("expands shared passage references before staging", () => {
    const prepared = prepareManifest(manifest).manifest;
    const firstBlock = prepared.questions[0].content_blocks[0];
    expect(firstBlock).toMatchObject({ type: "passage", id: "przyjaciel-automateusza", default_open: true });
    expect(firstBlock.paragraphs.length).toBeGreaterThan(5);
    expect(firstBlock.passage_id).toBeUndefined();
  });

  it("keeps source documents and the task 9 illustration checksum-verified", () => {
    const booklet = join(process.cwd(), "content/cke/sources/2026/jezyk_polski/OPOP-100-X-2605-zeszyt-zadan.pdf");
    expect(createHash("sha256").update(readFileSync(booklet)).digest("hex")).toBe(manifest.paper.source_pdf_sha256);
    const assets = [...manifest.questions.flatMap((question) => question.assets), ...manifest.paper.supplementary_sources];
    expect(assets).toHaveLength(3);
    for (const asset of assets) {
      const path = join(process.cwd(), asset.path);
      expect(existsSync(path), asset.path).toBe(true);
      expect(createHash("sha256").update(readFileSync(path)).digest("hex")).toBe(asset.sha256);
    }
  });

  it("renders an accessible collapsible source passage", () => {
    render(<CkeQuestionContent
      blocks={[{ type: "passage", id: "source", title: "Czy możemy kształtować naszą przyszłość?", author: "Stephen Hawking", paragraphs: ["Treść pierwszego akapitu."], footnotes: ["Przypis."], source: "Źródło.", default_open: true }]}
      assets={[]}
    />);
    expect(screen.getByText("Stephen Hawking, Czy możemy kształtować naszą przyszłość?")).toBeInTheDocument();
    expect(screen.getByText("Treść pierwszego akapitu.")).toBeVisible();
    expect(document.querySelector("details")).toHaveAttribute("open");
  });
});
