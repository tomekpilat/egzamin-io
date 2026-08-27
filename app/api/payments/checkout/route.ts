import { LEGAL_VERSION } from "@/lib/legal";
import { validateCheckoutRequest } from "@/lib/payments";
import { getSupabaseServiceClient, verifySupabaseAccessToken } from "@/lib/supabase-server";
import { applyCheckoutSession, createPlusCheckoutSession, retrieveCheckoutSession } from "@/lib/stripe-server";
import { resolvePaymentRuntimeConfig } from "@/lib/payments";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store, max-age=0" };

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: noStoreHeaders });
}

function bearerToken(request: Request) {
  const header = request.headers.get("authorization");
  return header?.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

export async function POST(request: Request) {
  let orderId = "";
  try {
    const config = resolvePaymentRuntimeConfig();
    if (!config.enabled || !config.accessUntil) return json({ error: "Płatności nie są jeszcze aktywne." }, 503);
    const token = bearerToken(request);
    const user = token ? await verifySupabaseAccessToken(token) : null;
    if (!user) return json({ error: "Zaloguj się ponownie." }, 401);

    const declaredLength = Number(request.headers.get("content-length")) || 0;
    if (declaredLength > 2_000) return json({ error: "Żądanie jest zbyt duże." }, 413);
    const rawBody = await request.text();
    if (rawBody.length > 2_000) return json({ error: "Żądanie jest zbyt duże." }, 413);
    let body: unknown;
    try { body = JSON.parse(rawBody); } catch { return json({ error: "Nieprawidłowe żądanie." }, 400); }
    const validation = validateCheckoutRequest(body);
    if (!validation.ok) return json({ error: validation.message }, 422);

    const supabase = getSupabaseServiceClient();
    const [{ data: parent, error: parentError }, { data: student, error: studentError }] = await Promise.all([
      supabase.from("profiles").select("id,email,role,onboarding_completed,legal_version").eq("id", user.id).single(),
      supabase.from("profiles").select("id,role").eq("id", validation.studentId).single(),
    ]);
    if (parentError || !parent || parent.role !== "parent" || !parent.onboarding_completed) return json({ error: "Aktywne konto rodzica jest wymagane." }, 403);
    if (parent.legal_version !== LEGAL_VERSION) return json({ error: "Przed zakupem zaakceptuj aktualne dokumenty prawne.", code: "legal_update_required" }, 409);
    if (studentError || !student || student.role !== "student") return json({ error: "Nieprawidłowe konto dziecka." }, 404);

    const { data: orderRows, error: orderError } = await supabase.rpc("create_parent_payment_order", {
      requested_parent_id: user.id,
      target_student_id: validation.studentId,
      requested_client_request_id: validation.requestId,
      requested_customer_email: String(parent.email),
      requested_access_valid_until: config.accessUntil,
      requested_terms_version: LEGAL_VERSION,
    });
    if (orderError) {
      if (orderError.message.includes("already has active Plus")) return json({ error: "To dziecko ma już aktywny pakiet Plus." }, 409);
      if (orderError.message.includes("payment already in progress")) return json({ error: "Dla tego dziecka trwa już inna płatność. Spróbuj ponownie za chwilę." }, 409);
      if (orderError.message.includes("linked child required")) return json({ error: "Najpierw połącz konto dziecka z kontem rodzica." }, 403);
      throw orderError;
    }
    orderId = String((orderRows as Array<{ payment_order_id: string }> | null)?.[0]?.payment_order_id ?? "");
    if (!orderId) throw new Error("missing_payment_order");

    const { data: existingOrder } = await supabase.from("payment_orders")
      .select("client_request_id,stripe_checkout_session_id")
      .eq("id", orderId)
      .single();
    if (existingOrder?.stripe_checkout_session_id) {
      const existingSession = await retrieveCheckoutSession(existingOrder.stripe_checkout_session_id);
      if (existingSession.url && existingSession.status === "open") return json({ checkoutUrl: existingSession.url });
      const synchronized = await applyCheckoutSession({
        session: existingSession,
        eventId: `checkout-retry:${existingSession.id}:${existingSession.status}:${existingSession.payment_status}`,
        eventType: "checkout.session.retry_sync",
        eventCreated: existingSession.created,
        livemode: existingSession.livemode,
        forcedStatus: existingSession.payment_status === "paid" ? "paid" : existingSession.status === "complete" ? "processing" : "expired",
        expectedParentId: user.id,
      });
      if (synchronized.status === "paid") return json({ error: "Płatność została już potwierdzona, a pakiet jest aktywny." }, 409);
      if (synchronized.status === "processing") return json({ error: "Poprzednia płatność jest nadal przetwarzana. Nie rozpoczynaj kolejnej." }, 409);
      if (existingOrder.client_request_id === validation.requestId) return json({ error: "Poprzednia sesja płatności wygasła. Kliknij przycisk ponownie." }, 409);

      const { data: retryRows, error: retryError } = await supabase.rpc("create_parent_payment_order", {
        requested_parent_id: user.id,
        target_student_id: validation.studentId,
        requested_client_request_id: validation.requestId,
        requested_customer_email: String(parent.email),
        requested_access_valid_until: config.accessUntil,
        requested_terms_version: LEGAL_VERSION,
      });
      if (retryError) throw retryError;
      orderId = String((retryRows as Array<{ payment_order_id: string }> | null)?.[0]?.payment_order_id ?? "");
      if (!orderId) throw new Error("missing_retry_payment_order");
    }

    const session = await createPlusCheckoutSession({
      orderId,
      customerEmail: String(parent.email),
      termsVersion: LEGAL_VERSION,
    });
    if (!session.url) throw new Error("missing_checkout_url");
    const { error: attachError } = await supabase.rpc("attach_stripe_checkout_session", {
      target_order_id: orderId,
      target_checkout_session_id: session.id,
      target_stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
    });
    if (attachError) throw attachError;
    return json({ checkoutUrl: session.url });
  } catch (error) {
    if (orderId) {
      await getSupabaseServiceClient().from("payment_orders")
        .update({ status: "payment_failed", updated_at: new Date().toISOString() })
        .eq("id", orderId)
        .eq("status", "draft");
    }
    console.error("[stripe-checkout] failed", error instanceof Error ? error.message : "unknown_error");
    return json({ error: "Nie udało się rozpocząć płatności. Spróbuj ponownie za chwilę." }, 503);
  }
}
