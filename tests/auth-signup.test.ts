import { describe, expect, it } from "vitest";

import { buildEmailSignupCredentials, friendlyAuthError, normalizeAuthEmail } from "@/lib/auth-signup";
import { LEGAL_VERSION } from "@/lib/legal";

describe("email signup payload", () => {
  it("normalizes parent email and does not derive a constrained display name from it", () => {
    const credentials = buildEmailSignupCredentials({
      email: " A@Example.pl ",
      password: "Bezpieczne-Haslo-123",
      role: "parent",
      redirectOrigin: "https://egzamin.io",
    });

    expect(credentials).toEqual({
      email: "a@example.pl",
      password: "Bezpieczne-Haslo-123",
      options: {
        emailRedirectTo: "https://egzamin.io/panel",
        data: {
          requested_role: "parent",
          guardian_email: null,
          legal_accepted: true,
          legal_version: LEGAL_VERSION,
        },
      },
    });
    expect(credentials.options.data).not.toHaveProperty("display_name");
  });

  it("normalizes both student and guardian addresses", () => {
    const credentials = buildEmailSignupCredentials({
      email: " Uczen@Example.pl ",
      password: "Bezpieczne-Haslo-123",
      role: "student",
      guardianEmail: " RODZIC@Example.pl ",
      redirectOrigin: "http://localhost:3000",
    });

    expect(credentials.email).toBe("uczen@example.pl");
    expect(credentials.options.data.guardian_email).toBe("rodzic@example.pl");
  });

  it("normalizes email used by password login as well", () => {
    expect(normalizeAuthEmail(" User@Example.PL ")).toBe("user@example.pl");
  });
});

describe("friendly auth errors", () => {
  it.each([
    ["Database error saving new user", "Nie udało się utworzyć profilu."],
    ["Error sending confirmation email", "Nie udało się wysłać e-maila potwierdzającego."],
    ["over_email_send_rate_limit", "Przekroczono chwilowy limit wiadomości."],
    ["Signups not allowed for this instance", "Zakładanie nowych kont jest chwilowo wyłączone."],
  ])("turns %s into an actionable Polish message", (source, expected) => {
    expect(friendlyAuthError(source)).toContain(expected);
  });
});
