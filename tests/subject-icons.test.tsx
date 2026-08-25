import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SUBJECT_CATEGORIES, SubjectIcon, subjectLabels } from "@/components/subject-icon";

describe("subject icon system", () => {
  it("provides one semantic Lucide icon for every subject category", () => {
    const { container } = render(<>{SUBJECT_CATEGORIES.map((item) => <div key={item.key}><SubjectIcon subject={item.key} /><span>{item.label}</span></div>)}</>);
    expect(SUBJECT_CATEGORIES.map((item) => item.label)).toEqual(["Matematyka", "Język polski", "Język angielski", "Arkusze CKE"]);
    expect(container.querySelectorAll("svg")).toHaveLength(4);
    container.querySelectorAll("svg").forEach((icon) => expect(icon).toHaveAttribute("aria-hidden", "true"));
    expect(screen.getByText(subjectLabels.mathematics)).toBeInTheDocument();
  });
});
