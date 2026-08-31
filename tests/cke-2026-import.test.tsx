import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { CkeQuestionContent } from "@/components/cke-question-content";

const manifestPath = join(process.cwd(), "content/cke/cke-2026-main-mathematics-100-x.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
  paper: { question_count: number; supplementary_sources: Array<{ path: string; sha256: string }> };
  questions: Array<{
    number: string;
    type: string;
    scoring: { max_points: number };
    content_blocks: Array<Record<string, unknown>>;
    assets: Array<{ path: string; sha256: string }>;
  }>;
};

afterEach(cleanup);

describe("CKE 2026 mathematics import", () => {
  it("contains all 20 questions worth exactly 30 points", () => {
    expect(manifest.paper.question_count).toBe(20);
    expect(manifest.questions).toHaveLength(20);
    expect(manifest.questions.map((question) => question.number)).toEqual(Array.from({ length: 20 }, (_, index) => String(index + 1)));
    expect(manifest.questions.reduce((sum, question) => sum + question.scoring.max_points, 0)).toBe(30);
  });

  it("models closed and open tasks explicitly", () => {
    expect(manifest.questions.slice(0, 14).every((question) => ["single_choice", "multiple_choice"].includes(question.type))).toBe(true);
    expect(manifest.questions.slice(14).every((question) => question.type === "long_text")).toBe(true);
    expect(manifest.questions.filter((question) => question.type === "multiple_choice").map((question) => question.number)).toEqual(["6", "8", "10", "12"]);
  });

  it("keeps every referenced illustration present and checksum-verified", () => {
    const assets = [...manifest.questions.flatMap((question) => question.assets), ...manifest.paper.supplementary_sources];
    expect(assets).toHaveLength(9);
    for (const asset of assets) {
      const path = join(process.cwd(), asset.path);
      expect(existsSync(path), asset.path).toBe(true);
      expect(createHash("sha256").update(readFileSync(path)).digest("hex")).toBe(asset.sha256);
    }
  });

  it("renders accessible, enlargeable image, math and table content", async () => {
    const user = userEvent.setup();
    render(<CkeQuestionContent
      blocks={[
        { type: "math", latex: "x^2", display: true },
        { type: "image", asset_id: "diagram" },
        { type: "table", header_rows: 1, caption: "Dane", rows: [["A", "B"], ["1", "2"]] },
      ]}
      assets={[{ id: "diagram", path: "public/cke/example.png", sha256: "0".repeat(64), alt: "Opis diagramu", caption: "Źródło" }]}
    />);
    expect(screen.getByRole("img", { name: "Opis diagramu" })).toHaveAttribute("src", "/cke/example.png");
    await user.click(screen.getByRole("button", { name: "Powiększ obraz: Opis diagramu" }));
    expect(screen.getByRole("dialog", { name: "Powiększony obraz: Opis diagramu" })).toHaveClass("z-[100]");
    expect(document.querySelector('[data-slot="dialog-overlay"]')).toHaveClass("z-[100]");
    expect(screen.getByRole("img", { name: "Opis diagramu" })).toHaveAttribute("src", "/cke/example.png");
    expect(screen.getByRole("img", { name: "Opis diagramu" })).toHaveClass("cke-image-dialog-media");
    await user.click(screen.getByRole("button", { name: "Zamknij" }));
    expect(screen.getByRole("table", { name: "Dane" })).toBeInTheDocument();
    expect(document.querySelector(".cke-math-block")).toHaveTextContent("x^2");
  });
});
