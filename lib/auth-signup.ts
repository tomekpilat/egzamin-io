import { LEGAL_VERSION } from "@/lib/legal";
import type { SelfServiceRole } from "@/lib/roles";

export type EmailSignupInput = {
  email: string;
  password: string;
  role: SelfServiceRole;
  guardianEmail?: string;
  redirectOrigin: string;
};

export function normalizeAuthEmail(email: string) {
  return email.trim().toLowerCase();
}

export function buildEmailSignupCredentials(input: EmailSignupInput) {
  const email = normalizeAuthEmail(input.email);
  const guardianEmail = input.role === "student"
    ? normalizeAuthEmail(input.guardianEmail ?? "")
    : null;

  return {
    email,
    password: input.password,
    options: {
      emailRedirectTo: `${input.redirectOrigin}/panel`,
      data: {
        requested_role: input.role,
        guardian_email: guardianEmail,
        legal_accepted: true,
        legal_version: LEGAL_VERSION,
      },
    },
  };
}

export function friendlyAuthError(message: string) {
  if (/invalid login credentials/i.test(message)) return "Nieprawidłowy e-mail lub hasło.";
  if (/email not confirmed/i.test(message)) return "Potwierdź adres e-mail przez link, który wysłaliśmy.";
  if (/user already registered|already been registered/i.test(message)) return "Konto z tym adresem już istnieje. Spróbuj się zalogować.";
  if (/signup.*disabled|signups not allowed/i.test(message)) return "Zakładanie nowych kont jest chwilowo wyłączone. Napisz na kontakt@egzaminio.io.";
  if (/captcha/i.test(message)) return "Nie udało się potwierdzić zabezpieczenia formularza. Odśwież stronę i spróbuj ponownie.";
  if (/email rate limit|over_email_send_rate_limit|rate limit.*email/i.test(message)) return "Przekroczono chwilowy limit wiadomości. Odczekaj kilka minut i spróbuj ponownie.";
  if (/error sending confirmation email|confirmation email/i.test(message)) return "Nie udało się wysłać e-maila potwierdzającego. Spróbuj ponownie za chwilę lub napisz na kontakt@egzaminio.io.";
  if (/database error saving new user/i.test(message)) return "Nie udało się utworzyć profilu. Spróbuj ponownie; jeśli błąd wróci, napisz na kontakt@egzaminio.io.";
  if (/password/i.test(message)) return "Hasło musi mieć co najmniej 8 znaków.";
  return "Nie udało się wykonać operacji. Spróbuj ponownie za chwilę.";
}
