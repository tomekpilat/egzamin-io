import { describe, expect, it } from "vitest";
import {
  defaultMaterialFilter,
  filterPracticeQuestions,
  formatQuestionSource,
  resolvePaperSelection,
  type PracticeQuestion,
} from "@/components/student-practice";

function question(overrides: Partial<PracticeQuestion>): PracticeQuestion {
  return {
    question_id: "demo-1",
    source_type: "demo",
    source_label: "Zestaw demonstracyjny egzaminio",
    exam_paper_id: null,
    exam_year: null,
    exam_session: null,
    exam_variant: null,
    exam_accommodation_code: null,
    exam_accommodation_label: null,
    source_document_id: null,
    paper_question_number: null,
    subject: "mathematics",
    topic: "Procenty",
    prompt: "Pytanie",
    options: ["A", "B", "C", "D"],
    difficulty: 1,
    sort_order: 1,
    selected_answer: null,
    is_correct: null,
    attempt_count: 0,
    correct_answer: null,
    explanation: null,
    ...overrides,
  };
}

const catalog = [
  question({ question_id: "demo-1" }),
  question({ question_id: "cke-2024-mat-1", source_type: "cke", source_label: "CKE 2024 matematyka", exam_paper_id: "cke-2024-main-mat", exam_year: 2024, exam_session: "main", exam_variant: "standard", source_document_id: "MOMA-P0-100-2405", paper_question_number: 1 }),
  question({ question_id: "cke-2025-mat-1", source_type: "cke", source_label: "CKE 2025 matematyka", exam_paper_id: "cke-2025-main-mat", exam_year: 2025, exam_session: "main", exam_variant: "standard", source_document_id: "MOMA-P0-100-2505", paper_question_number: 1 }),
  question({ question_id: "cke-2025-pol-1", source_type: "cke", source_label: "CKE 2025 polski", exam_paper_id: "cke-2025-main-pol", exam_year: 2025, exam_session: "main", exam_variant: "form-100", source_document_id: "OPNP-P0-100-2505", paper_question_number: 1, subject: "polish" }),
];

describe("practice year catalog", () => {
  it("defaults to the latest imported CKE year and falls back to demo", () => {
    expect(defaultMaterialFilter(catalog)).toBe("year:2025");
    expect(defaultMaterialFilter(catalog.slice(0, 1))).toBe("demo");
  });

  it("keeps demo separate from all CKE years", () => {
    expect(filterPracticeQuestions(catalog, "all", "demo").map((item) => item.question_id)).toEqual(["demo-1"]);
    expect(filterPracticeQuestions(catalog, "all", "all-cke")).toHaveLength(3);
  });

  it("filters by year, subject and exact paper", () => {
    expect(filterPracticeQuestions(catalog, "mathematics", "year:2025").map((item) => item.question_id)).toEqual(["cke-2025-mat-1"]);
    expect(filterPracticeQuestions(catalog, "all", "all-cke", "cke-2024-main-mat").map((item) => item.question_id)).toEqual(["cke-2024-mat-1"]);
  });

  it("derives the year and subject from the exact selected paper", () => {
    const selection = resolvePaperSelection(catalog, "cke-2025-main-mat");
    expect(selection).toMatchObject({
      paperId: "cke-2025-main-mat",
      material: "year:2025",
      subject: "mathematics",
    });
    expect(selection?.questions.map((item) => item.question_id)).toEqual(["cke-2025-mat-1"]);
  });

  it("formats official context without relabelling demo as CKE", () => {
    expect(formatQuestionSource(catalog[0])).toBe("Zestaw demonstracyjny egzaminio");
    expect(formatQuestionSource(catalog[2])).toBe("CKE 2025 · termin główny");
    expect(formatQuestionSource(catalog[3])).toBe("CKE 2025 · termin główny · wariant form-100");
  });
});
