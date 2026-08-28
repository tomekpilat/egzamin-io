import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const checkout = read("app/api/payments/checkout/route.ts");
const webhook = read("app/api/payments/webhook/route.ts");
const stripe = read("lib/stripe-server.ts");
const migration = read("supabase/migrations/20260827180000_stripe_payments.sql");
const panel = read("components/parent-payments.tsx");
const legal = [read("app/regulamin/page.tsx"), read("app/polityka-prywatnosci/page.tsx"), read("app/polityka-cookies/page.tsx"), read("app/odstapienie-od-umowy/page.tsx")].join("\n");

describe("Stripe payment flow contract", () => {
  it("creates a one-time hosted checkout for exactly 149 PLN", () => {
    expect(stripe).toContain('mode: "payment"');
    expect(stripe).toContain('customer_creation: "always"');
    expect(stripe).toContain("verifyConfiguredPlusPrice");
    expect(stripe).toContain("price.unit_amount !== config.amountMinor");
    expect(checkout).toContain("create_parent_payment_order");
    expect(checkout).toContain("attach_stripe_checkout_session");
  });

  it("fulfills from signed, idempotent webhooks rather than the return URL", () => {
    expect(webhook).toContain("request.text()");
    expect(webhook).toContain("webhooks.constructEvent(rawBody, signature");
    expect(webhook).toContain('"checkout.session.completed"');
    expect(webhook).toContain('"refund.created"');
    expect(migration).toContain("stripe_event_id text primary key");
    expect(migration).toContain("on conflict (stripe_event_id) do nothing");
    expect(migration).toContain("recompute_stripe_student_plan");
  });

  it("keeps tables private and exposes only the parent history RPC", () => {
    expect(migration).toContain("revoke all on public.payment_orders from anon, authenticated");
    expect(migration).toContain("revoke all on public.stripe_webhook_events from anon, authenticated");
    expect(migration).toContain("grant execute on function public.get_parent_payment_history() to authenticated");
    expect(migration).toContain("where orders.parent_id = (select auth.uid())");
  });

  it("requires parent confirmations and shows purchase history and documents", () => {
    expect(panel).toContain("Pakiet dla ucznia");
    expect(panel).toContain("Zamawiam pakiet Plus — płacę 149 zł");
    expect(panel).toContain("requestedImmediateAccess");
    expect(panel).toContain('supabase.rpc("get_parent_payment_history")');
    expect(panel).toContain("Faktura PDF");
    expect(panel).toContain("Nie pobierzemy kolejnej płatności");
  });

  it("shows a truthful payment summary in the redesigned parent panel", () => {
    expect(panel).toContain('className="parent-payment-summary"');
    expect(panel).toContain("Aktywne pakiety Plus");
    expect(panel).toContain("Wartość zakupów");
    expect(panel).toContain("Jednorazowy");
    expect(panel).toContain("bez automatycznego odnowienia");
  });

  it("discloses Stripe, withdrawals, no renewal and card-data minimization", () => {
    expect(legal).toContain("Stripe");
    expect(legal).toContain("automatycznego odnowienia");
    expect(legal).toContain("14 dni");
    expect(legal).toContain("pełnego numeru karty");
    expect(legal).toContain("trwałym nośniku");
  });
});
