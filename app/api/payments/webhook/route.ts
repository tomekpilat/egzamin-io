import type Stripe from "stripe";
import { findOrderByStripeReference, getStripeClient, getStripeWebhookSecret, recordPaymentEvent, retrieveCheckoutSession, applyCheckoutSession } from "@/lib/stripe-server";

export const dynamic = "force-dynamic";

const MAX_WEBHOOK_BYTES = 1_000_000;

function objectId(value: string | { id: string } | null | undefined) {
  return typeof value === "string" ? value : value?.id ?? null;
}

async function handleRefund(event: Stripe.Event) {
  const refund = event.data.object as Stripe.Refund;
  const paymentIntentId = objectId(refund.payment_intent);
  const chargeId = objectId(refund.charge);
  const order = await findOrderByStripeReference({ paymentIntentId, chargeId });
  const charge = chargeId ? await getStripeClient().charges.retrieve(chargeId) : null;
  const amountRefunded = charge?.amount_refunded ?? (refund.status === "failed" ? 0 : refund.amount);
  const status = refund.status === "failed" ? (amountRefunded > 0 ? "partially_refunded" : "paid") : amountRefunded >= order.amount_total ? "refunded" : "partially_refunded";
  await recordPaymentEvent({
    eventId: event.id, eventType: event.type, eventCreated: event.created, livemode: event.livemode,
    orderId: order.id, status, amountTotal: order.amount_total, amountRefunded,
    currency: refund.currency, paymentIntentId, chargeId,
    receiptUrl: charge?.receipt_url ?? null,
  });
}

async function handleDispute(event: Stripe.Event) {
  const dispute = event.data.object as Stripe.Dispute;
  const paymentIntentId = objectId(dispute.payment_intent);
  const chargeId = objectId(dispute.charge);
  const order = await findOrderByStripeReference({ paymentIntentId, chargeId });
  const charge = chargeId ? await getStripeClient().charges.retrieve(chargeId) : null;
  const amountRefunded = charge?.amount_refunded ?? 0;
  const status = event.type === "charge.dispute.created"
    ? "disputed"
    : amountRefunded >= order.amount_total
      ? "refunded"
      : dispute.status === "won" || dispute.status === "warning_closed"
        ? "paid"
        : "chargeback";
  await recordPaymentEvent({
    eventId: event.id, eventType: event.type, eventCreated: event.created, livemode: event.livemode,
    orderId: order.id, status, amountTotal: order.amount_total, amountRefunded,
    currency: dispute.currency, paymentIntentId, chargeId,
    receiptUrl: charge?.receipt_url ?? null,
  });
}

async function handleInvoice(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  const orderId = invoice.metadata?.order_id;
  if (!orderId) return;
  await recordPaymentEvent({
    eventId: event.id, eventType: event.type, eventCreated: event.created, livemode: event.livemode,
    orderId, status: "paid", amountTotal: invoice.amount_paid, currency: invoice.currency,
    invoiceId: invoice.id, hostedInvoiceUrl: invoice.hosted_invoice_url, invoicePdfUrl: invoice.invoice_pdf,
  });
}

export async function POST(request: Request) {
  try {
    const declaredLength = Number(request.headers.get("content-length")) || 0;
    if (declaredLength > MAX_WEBHOOK_BYTES) return new Response("Payload too large", { status: 413 });
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_WEBHOOK_BYTES) return new Response("Payload too large", { status: 413 });
    const signature = request.headers.get("stripe-signature");
    if (!signature) return new Response("Missing signature", { status: 400 });
    const event = getStripeClient().webhooks.constructEvent(rawBody, signature, getStripeWebhookSecret());

    if (["checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed", "checkout.session.expired"].includes(event.type)) {
      const source = event.data.object as Stripe.Checkout.Session;
      const session = await retrieveCheckoutSession(source.id);
      const forcedStatus = event.type === "checkout.session.async_payment_failed" ? "payment_failed" : event.type === "checkout.session.expired" ? "expired" : undefined;
      await applyCheckoutSession({ session, eventId: event.id, eventType: event.type, eventCreated: event.created, livemode: event.livemode, forcedStatus });
    } else if (["refund.created", "refund.updated", "refund.failed"].includes(event.type)) {
      await handleRefund(event);
    } else if (["charge.dispute.created", "charge.dispute.closed"].includes(event.type)) {
      await handleDispute(event);
    } else if (event.type === "invoice.paid") {
      await handleInvoice(event);
    }

    return Response.json({ received: true });
  } catch (error) {
    const signatureError = error instanceof Error && /signature|webhook/i.test(error.message);
    console.error("[stripe-webhook] failed", error instanceof Error ? error.message : "unknown_error");
    return new Response(signatureError ? "Invalid signature" : "Webhook processing failed", { status: signatureError ? 400 : 500 });
  }
}
