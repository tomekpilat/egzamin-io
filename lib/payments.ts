import { PLUS_PACKAGE_PRICE_PLN } from "@/lib/plans";

export const PLUS_PACKAGE_AMOUNT_MINOR = PLUS_PACKAGE_PRICE_PLN * 100;
export const PLUS_PACKAGE_CURRENCY = "pln";
export const PLUS_PRODUCT_CODE = "plus_package";

export const PAYMENT_STATUSES = [
  "draft",
  "checkout_created",
  "processing",
  "paid",
  "payment_failed",
  "expired",
  "partially_refunded",
  "refunded",
  "disputed",
  "chargeback",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  draft: "Przygotowywanie płatności",
  checkout_created: "Oczekuje na płatność",
  processing: "Płatność jest przetwarzana",
  paid: "Opłacona",
  payment_failed: "Nieudana",
  expired: "Sesja wygasła",
  partially_refunded: "Częściowo zwrócona",
  refunded: "Zwrócona",
  disputed: "Płatność zakwestionowana",
  chargeback: "Środki zwrócone przez bank",
};

export function isPaymentStatus(value: unknown): value is PaymentStatus {
  return typeof value === "string" && PAYMENT_STATUSES.includes(value as PaymentStatus);
}

export function formatPaymentAmount(amountMinor: number, currency = PLUS_PACKAGE_CURRENCY) {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: currency.toUpperCase() }).format(amountMinor / 100);
}

type PaymentEnvironment = Record<string, string | undefined>;

function validAppUrl(value?: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !(local && url.protocol === "http:")) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function resolvePaymentRuntimeConfig(environment: PaymentEnvironment = process.env, now = new Date()) {
  const appUrl = validAppUrl(environment.APP_URL);
  const accessUntil = environment.PLUS_ACCESS_UNTIL ? new Date(environment.PLUS_ACCESS_UNTIL) : null;
  const validAccessUntil = accessUntil && Number.isFinite(accessUntil.getTime()) && accessUntil > now ? accessUntil : null;
  const stripeSecretKey = environment.STRIPE_SECRET_KEY?.startsWith("sk_") ? environment.STRIPE_SECRET_KEY : null;
  const stripePriceId = environment.STRIPE_PRICE_ID_PLUS?.startsWith("price_") ? environment.STRIPE_PRICE_ID_PLUS : null;
  const stripeWebhookSecret = environment.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_") ? environment.STRIPE_WEBHOOK_SECRET : null;
  const configured = Boolean(appUrl && validAccessUntil && stripeSecretKey && stripePriceId && stripeWebhookSecret);

  return {
    enabled: environment.PAYMENTS_ENABLED === "true" && configured,
    configured,
    appUrl,
    accessUntil: validAccessUntil?.toISOString() ?? null,
    stripeSecretKey,
    stripePriceId,
    stripeWebhookSecret,
    automaticTax: environment.STRIPE_AUTOMATIC_TAX === "true",
    amountMinor: PLUS_PACKAGE_AMOUNT_MINOR,
    currency: PLUS_PACKAGE_CURRENCY,
  };
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateCheckoutRequest(value: unknown) {
  if (!value || typeof value !== "object") return { ok: false as const, message: "Nieprawidłowe żądanie." };
  const body = value as Record<string, unknown>;
  if (typeof body.studentId !== "string" || !UUID_PATTERN.test(body.studentId)) return { ok: false as const, message: "Wybierz dziecko." };
  if (typeof body.requestId !== "string" || !UUID_PATTERN.test(body.requestId)) return { ok: false as const, message: "Nieprawidłowa próba płatności." };
  if (body.acceptedTerms !== true) return { ok: false as const, message: "Zaakceptuj regulamin i politykę prywatności." };
  if (body.requestedImmediateAccess !== true) return { ok: false as const, message: "Potwierdź żądanie rozpoczęcia świadczenia przed upływem 14 dni." };
  return { ok: true as const, studentId: body.studentId, requestId: body.requestId };
}
