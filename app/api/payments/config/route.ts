import { PLUS_PACKAGE_PRICE_PLN } from "@/lib/plans";
import { resolvePaymentRuntimeConfig } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = resolvePaymentRuntimeConfig();
  return Response.json({
    enabled: config.enabled,
    pricePln: PLUS_PACKAGE_PRICE_PLN,
    amountMinor: config.amountMinor,
    currency: config.currency,
    accessUntil: config.accessUntil,
    recurring: false,
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
