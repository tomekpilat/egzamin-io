import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { parsePracticePrompt, PracticeQuestionPrompt } from "@/components/practice-question-prompt";

const longListeningPrompt = "Listen to five recordings and write one answer (A, B or C) for each item. 1.1 Which homework are they going to do first? 1.2 How did the woman book her trip? 1.3 Where are the boy and his mother talking? 1.4 In the conversation, Dad: A asks Julie to lend him something; B suggests a solution to Julie’s problem; C gives an opinion about Julie’s friend. 1.5 The teacher is talking about: A a classroom task; B a school trip; C a historical event.";

afterEach(cleanup);

describe("readable practice question prompt", () => {
  it("separates a long flattened CKE prompt into its instruction and numbered items", () => {
    const layout = parsePracticePrompt(longListeningPrompt);

    expect(layout.intro).toBe("Listen to five recordings and write one answer (A, B or C) for each item.");
    expect(layout.items).toHaveLength(5);
    expect(layout.items.map((item) => item.label)).toEqual(["1.1", "1.2", "1.3", "1.4", "1.5"]);
    expect(layout.items[3].text).toBe("In the conversation, Dad:");
    expect(layout.items[3].choices.map((choice) => choice.label)).toEqual(["A", "B", "C"]);
    expect(layout.isLong).toBe(true);
  });

  it("renders numbered questions and inline choices as accessible lists", () => {
    render(<PracticeQuestionPrompt prompt={longListeningPrompt} />);

    expect(screen.getByRole("heading", { name: "Listen to five recordings and write one answer (A, B or C) for each item." })).toBeInTheDocument();
    const items = screen.getByRole("list", { name: "Podpunkty zadania" }).querySelectorAll(":scope > li");
    expect(items).toHaveLength(5);
    expect(within(items[3] as HTMLElement).getByText("1.4")).toBeInTheDocument();
    expect(within(items[3] as HTMLElement).getByText("B")).toBeInTheDocument();
    expect(within(items[3] as HTMLElement).getByText(/suggests a solution/)).toBeInTheDocument();
  });

  it("keeps a short single question as one heading", () => {
    render(<PracticeQuestionPrompt prompt="Ile wynosi 20% z 50?" />);

    expect(screen.getByRole("heading", { name: "Ile wynosi 20% z 50?" })).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("separates a shared A–E answer bank from a long instruction", () => {
    const layout = parsePracticePrompt("Listen to four speakers. Match 2.1–2.4 with A–E. A My friend changed his plans. B We went to a concert. C We look very similar. One sentence does not match.");

    expect(layout.items).toHaveLength(0);
    expect(layout.intro).toBe("Listen to four speakers. Match 2.1–2.4 with A–E.");
    expect(layout.choices.map((choice) => choice.label)).toEqual(["A", "B", "C"]);
    expect(layout.choices[1].text).toBe("We went to a concert.");
  });
});
