import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SchoolThresholdRequestForm } from "@/components/school-threshold-request-form";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("SchoolThresholdRequestForm", () => {
  it("submits the requested school, city, email and explicit consent", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Powiadomimy Cię po weryfikacji." }), { status: 201, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<SchoolThresholdRequestForm suggestedSchool="V LO, klasa 1A" />);

    await user.type(screen.getByLabelText("Miasto"), "Kraków");
    await user.type(screen.getByLabelText("Twój e-mail"), "rodzic@example.com");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Zgłoś szkołę" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const request = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(request).toMatchObject({
      schoolName: "V LO, klasa 1A",
      city: "Kraków",
      email: "rodzic@example.com",
      subscriptionType: "recruitment_thresholds",
      consent: true,
    });
    expect(await screen.findByText("Zgłoszenie zapisane")).toBeInTheDocument();
  });
});
