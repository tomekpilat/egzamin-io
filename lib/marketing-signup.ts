export const MARKETING_CONSENT_VERSION = "2026-08-25-marketing";

export type MarketingSubscriptionType = "recruitment_thresholds" | "plus_waitlist";

export type MarketingSignupInput = {
  email?: unknown;
  subscriptionType?: unknown;
  schoolName?: unknown;
  city?: unknown;
  recruitmentYear?: unknown;
  sourcePath?: unknown;
  consent?: unknown;
  consentText?: unknown;
  consentVersion?: unknown;
  website?: unknown;
};

export type ValidMarketingSignup = {
  email: string;
  subscriptionType: MarketingSubscriptionType;
  schoolName: string;
  city: string;
  recruitmentYear: number;
  sourcePath: string;
  consentText: string;
  consentVersion: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u;
const TYPES = new Set<MarketingSubscriptionType>(["recruitment_thresholds", "plus_waitlist"]);

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, maxLength) : "";
}

export function marketingConsentText(type: MarketingSubscriptionType, schoolName = "") {
  if (type === "recruitment_thresholds") {
    const school = clean(schoolName, 160);
    return `Chcę otrzymać e-mailem informację o progach rekrutacyjnych${school ? ` dla ${school}` : " dla wskazanej szkoły"} oraz materiały egzaminio pomagające przygotować się do rekrutacji. Zgodę mogę wycofać w każdej chwili jednym kliknięciem w wiadomości.`;
  }
  return "Chcę otrzymać e-mailem informację o starcie i ofercie planu egzaminio Plus. Zgodę mogę wycofać w każdej chwili jednym kliknięciem w wiadomości.";
}

export function validateMarketingSignup(input: MarketingSignupInput) {
  const subscriptionType = clean(input.subscriptionType, 40) as MarketingSubscriptionType;
  const schoolName = clean(input.schoolName, 160);
  const city = clean(input.city, 100);
  const email = clean(input.email, 254).toLowerCase();
  const sourcePath = clean(input.sourcePath, 240);
  const consentText = clean(input.consentText, 800);
  const consentVersion = clean(input.consentVersion, 60);
  const recruitmentYear = Number(input.recruitmentYear);
  const errors: string[] = [];

  if (clean(input.website, 200)) return { valid: true as const, bot: true as const, value: null };
  if (!EMAIL.test(email) || email.length > 254) errors.push("Podaj poprawny adres e-mail.");
  if (!TYPES.has(subscriptionType)) errors.push("Nieprawidłowy typ zapisu.");
  if (input.consent !== true) errors.push("Zaznacz dobrowolną zgodę na wiadomości e-mail.");
  if (!sourcePath.startsWith("/") || sourcePath.startsWith("//")) errors.push("Nieprawidłowe źródło formularza.");
  if (!Number.isInteger(recruitmentYear) || recruitmentYear < 2026 || recruitmentYear > 2035) errors.push("Nieprawidłowy rok rekrutacji.");
  if (subscriptionType === "recruitment_thresholds" && schoolName.length < 2) errors.push("Wpisz szkołę lub klasę, której progi Cię interesują.");
  if (consentVersion !== MARKETING_CONSENT_VERSION) errors.push("Odśwież stronę i zaznacz aktualną zgodę.");
  if (consentText !== marketingConsentText(subscriptionType, schoolName)) errors.push("Treść zgody jest nieaktualna.");

  if (errors.length) return { valid: false as const, bot: false as const, errors };
  return {
    valid: true as const,
    bot: false as const,
    value: { email, subscriptionType, schoolName, city, recruitmentYear, sourcePath, consentText, consentVersion } satisfies ValidMarketingSignup,
  };
}
