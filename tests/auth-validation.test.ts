import { describe, expect, it } from "vitest";

import { validateSignupConfirmation } from "@/lib/auth-validation";

describe("signup confirmation", () => {
  it("accepts matching emails regardless of case and surrounding spaces", () => {
    expect(
      validateSignupConfirmation(
        " Uczen@Example.pl ",
        "uczen@example.pl",
        "bezpieczne-haslo",
        "bezpieczne-haslo",
      ),
    ).toBeNull();
  });

  it("rejects different email addresses", () => {
    expect(
      validateSignupConfirmation(
        "uczen@example.pl",
        "rodzic@example.pl",
        "bezpieczne-haslo",
        "bezpieczne-haslo",
      ),
    ).toBe("Podane adresy e-mail nie są identyczne.");
  });

  it("requires passwords to be exactly identical", () => {
    expect(
      validateSignupConfirmation(
        "uczen@example.pl",
        "uczen@example.pl",
        "Haslo-123",
        "haslo-123",
      ),
    ).toBe("Podane hasła nie są identyczne.");
  });
});
