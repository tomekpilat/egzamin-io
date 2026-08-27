import Stripe from "stripe";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { resolvePaymentRuntimeConfig, type PaymentStatus } from "@/lib/payments";

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  const config = resolvePaymentRuntimeConfig();
  if (!config.stripeSecretKey) throw new Error("stripe_not_configured");
  stripeClient ??= new Stripe(config.stripeSecretKey, {
    appInfo: { name: "egzaminio", version: "0.1.0" },
  });
  return stripeClient;
}

export function getStripeWebhookSecret() {
  const secret = resolvePaymentRuntimeConfig().stripeWebhookSecret;
  if (!secret) throw new Error("stripe_webhook_not_configured");
  return secret;
}

function objectId(value: string | { id: string } | null | undefined) {
  return typeof value === "string" ? value : value?.id ?? null;
}

function checkoutDocuments(session: Stripe.Checkout.Session) {
  const paymentIntent = typeof session.payment_intent === "object" ? session.payment_intent : null;
  const charge = paymentIntent && typeof paymentIntent.latest_charge === "object" ? paymentIntent.latest_charge : null;
  const invoice = typeof session.invoice === "object" ? session.invoice : null;
  return {
    paymentIntentId: objectId(session.payment_intent),
    customerId: objectId(session.customer),
    chargeId: charge?.id ?? null,
    invoiceId: invoice?.id ?? objectId(session.invoice),
    receiptUrl: charge?.receipt_url ?? null,
    hostedInvoiceUrl: invoice?.hosted_invoice_url ?? null,
    invoicePdfUrl: invoice?.invoice_pdf ?? null,
  };
}

export async function retrieveCheckoutSession(sessionId: string) {
  if (!/^cs_(test_|live_)?[A-Za-z0-9_]+$/.test(sessionId)) throw new Error("invalid_checkout_session_id");
  return getStripeClient().checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent.latest_charge", "invoice"],
  });
}

export async function verifyConfiguredPlusPrice() {
  const config = resolvePaymentRuntimeConfig();
  if (!config.enabled || !config.stripePriceId) throw new Error("payments_not_enabled");
  const price = await getStripeClient().prices.retrieve(config.stripePriceId);
  if (!price.active || price.type !== "one_time" || price.unit_amount !== config.amountMinor || price.currency !== config.currency) {
    throw new Error("stripe_price_mismatch");
  }
  return { config, price };
}

export async function createPlusCheckoutSession(input: {
  orderId: string;
  customerEmail: string;
  termsVersion: string;
}) {
  const { config, price } = await verifyConfiguredPlusPrice();
  const accessLabel = new Intl.DateTimeFormat("pl-PL", { dateStyle: "long", timeZone: "Europe/Warsaw" }).format(new Date(config.accessUntil!));
  return getStripeClient().checkout.sessions.create({
    mode: "payment",
    locale: "pl",
    line_items: [{ price: price.id, quantity: 1 }],
    customer_creation: "always",
    customer_email: input.customerEmail,
    client_reference_id: input.orderId,
    billing_address_collection: "required",
    automatic_tax: { enabled: config.automaticTax },
    invoice_creation: {
      enabled: true,
      invoice_data: {
        description: `Pakiet Plus egzaminio. Dostęp do ${accessLabel}.`,
        footer: `Zakup jednorazowy, bez automatycznego odnowienia. Wersja warunków: ${input.termsVersion}.`,
        metadata: { order_id: input.orderId },
      },
    },
    payment_intent_data: {
      receipt_email: input.customerEmail,
      description: "Pakiet Plus egzaminio",
      metadata: {
        order_id: input.orderId,
        product_code: "plus_package",
      },
    },
    metadata: {
      order_id: input.orderId,
      product_code: "plus_package",
      terms_version: input.termsVersion,
    },
    custom_text: {
      submit: { message: `Płatność jednorazowa. Dostęp do ${accessLabel}. Brak automatycznego odnowienia.` },
    },
    success_url: `${config.appUrl}/platnosc/sukces?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.appUrl}/panel?widok=platnosci&checkout=anulowana`,
  }, { idempotencyKey: `egzaminio-plus-${input.orderId}` });
}

type PaymentOrderRecord = {
  id: string;
  parent_id: string;
  student_id: string;
  amount_total: number;
  currency: string;
  stripe_checkout_session_id: string | null;
};

async function loadOrder(orderId: string) {
  const { data, error } = await getSupabaseServiceClient().from("payment_orders")
    .select("id,parent_id,student_id,amount_total,currency,stripe_checkout_session_id")
    .eq("id", orderId)
    .single();
  if (error || !data) throw new Error("payment_order_not_found");
  return data as PaymentOrderRecord;
}

export async function findOrderByStripeReference(input: { paymentIntentId?: string | null; chargeId?: string | null; invoiceId?: string | null }) {
  const supabase = getSupabaseServiceClient();
  let query = supabase.from("payment_orders").select("id,parent_id,student_id,amount_total,currency,stripe_checkout_session_id");
  if (input.paymentIntentId) query = query.eq("stripe_payment_intent_id", input.paymentIntentId);
  else if (input.chargeId) query = query.eq("stripe_charge_id", input.chargeId);
  else if (input.invoiceId) query = query.eq("stripe_invoice_id", input.invoiceId);
  else throw new Error("missing_stripe_order_reference");
  const { data, error } = await query.single();
  if (error || !data) throw new Error("payment_order_not_found");
  return data as PaymentOrderRecord;
}

export async function recordPaymentEvent(input: {
  eventId: string;
  eventType: string;
  eventCreated: number;
  livemode: boolean;
  orderId: string;
  status: PaymentStatus;
  amountTotal?: number | null;
  amountRefunded?: number | null;
  currency?: string | null;
  checkoutSessionId?: string | null;
  paymentIntentId?: string | null;
  customerId?: string | null;
  chargeId?: string | null;
  invoiceId?: string | null;
  receiptUrl?: string | null;
  hostedInvoiceUrl?: string | null;
  invoicePdfUrl?: string | null;
}) {
  const { data, error } = await getSupabaseServiceClient().rpc("record_stripe_payment_event", {
    received_event_id: input.eventId,
    received_event_type: input.eventType,
    received_event_created: input.eventCreated,
    received_livemode: input.livemode,
    target_order_id: input.orderId,
    next_status: input.status,
    received_amount_total: input.amountTotal ?? null,
    received_amount_refunded: input.amountRefunded ?? null,
    received_currency: input.currency ?? null,
    received_checkout_session_id: input.checkoutSessionId ?? null,
    received_payment_intent_id: input.paymentIntentId ?? null,
    received_customer_id: input.customerId ?? null,
    received_charge_id: input.chargeId ?? null,
    received_invoice_id: input.invoiceId ?? null,
    received_receipt_url: input.receiptUrl ?? null,
    received_hosted_invoice_url: input.hostedInvoiceUrl ?? null,
    received_invoice_pdf_url: input.invoicePdfUrl ?? null,
  });
  if (error) throw error;
  return (data as Array<{ event_applied: boolean; order_status: string }> | null)?.[0] ?? null;
}

export async function applyCheckoutSession(input: {
  session: Stripe.Checkout.Session;
  eventId: string;
  eventType: string;
  eventCreated: number;
  livemode: boolean;
  forcedStatus?: PaymentStatus;
  expectedParentId?: string;
}) {
  const orderId = input.session.metadata?.order_id || input.session.client_reference_id;
  if (!orderId) throw new Error("checkout_order_metadata_missing");
  const order = await loadOrder(orderId);
  if (input.expectedParentId && order.parent_id !== input.expectedParentId) throw new Error("payment_order_forbidden");
  if (input.session.metadata?.product_code !== "plus_package") throw new Error("checkout_metadata_mismatch");
  if (order.stripe_checkout_session_id && order.stripe_checkout_session_id !== input.session.id) throw new Error("checkout_session_mismatch");
  if (input.session.amount_total !== order.amount_total || input.session.currency !== order.currency) throw new Error("checkout_amount_mismatch");

  const documents = checkoutDocuments(input.session);
  const status: PaymentStatus = input.forcedStatus ?? (input.session.payment_status === "paid" ? "paid" : "processing");
  await recordPaymentEvent({
    eventId: input.eventId,
    eventType: input.eventType,
    eventCreated: input.eventCreated,
    livemode: input.livemode,
    orderId,
    status,
    amountTotal: input.session.amount_total,
    currency: input.session.currency,
    checkoutSessionId: input.session.id,
    ...documents,
  });
  return { orderId, parentId: order.parent_id, studentId: order.student_id, status };
}

export async function syncCheckoutSessionForParent(sessionId: string, parentId: string) {
  if (!/^cs_(test_|live_)?[A-Za-z0-9_]+$/.test(sessionId)) throw new Error("invalid_checkout_session_id");
  const { data: ownedOrder, error } = await getSupabaseServiceClient().from("payment_orders")
    .select("id")
    .eq("stripe_checkout_session_id", sessionId)
    .eq("parent_id", parentId)
    .maybeSingle();
  if (error) throw error;
  if (!ownedOrder) throw new Error("payment_order_forbidden");
  const session = await retrieveCheckoutSession(sessionId);
  return applyCheckoutSession({
    session,
    eventId: `sync:${session.id}:${session.payment_status}`,
    eventType: "checkout.session.sync",
    eventCreated: session.created,
    livemode: session.livemode,
    expectedParentId: parentId,
  });
}
