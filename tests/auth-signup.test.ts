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

  it("keeps a missing guardian address empty for defensive server validation", () => {
    const credentials = buildEmailSignupCredentials({
      email: "uczen@example.pl",
      password: "Bezpieczne-Haslo-123",
      role: "student",
      redirectOrigin: "https://egzamin.io",
    });

    expect(credentials.options.data.guardian_email).toBe("");
  });

  it("normalizes email used by password login as well", () => {
    expect(normalizeAuthEmail(" User@Example.PL ")).toBe("user@example.pl");
  });
});

describe("friendly auth errors", () => {
  it.each([
    ["Invalid login credentials", "Nieprawidłowy e-mail lub hasło."],
    ["Email not confirmed", "Potwierdź adres e-mail"],
    ["User already registered", "Konto z tym adresem już istnieje."],
    ["Database error saving new user", "Nie udało się utworzyć profilu."],
    ["Error sending confirmation email", "Nie udało się wysłać e-maila potwierdzającego."],
    ["over_email_send_rate_limit", "Przekroczono chwilowy limit wiadomości."],
    ["Signups not allowed for this instance", "Zakładanie nowych kont jest chwilowo wyłączone."],
    ["Captcha verification process failed", "Nie udało się potwierdzić zabezpieczenia formularza."],
    ["Password should be at least 8 characters", "Hasło musi mieć co najmniej 8 znaków."],
    ["Unexpected network problem", "Nie udało się wykonać operacji."],
  ])("turns %s into an actionable Polish message", (source, expected) => {
    expect(friendlyAuthError(source)).toContain(expected);
  });
});
