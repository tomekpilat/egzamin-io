import { getSupabaseServiceClient, verifySupabaseAccessToken } from "@/lib/supabase-server";
import { syncCheckoutSessionForParent } from "@/lib/stripe-server";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store, max-age=0" };

function bearerToken(request: Request) {
  const header = request.headers.get("authorization");
  return header?.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

export async function GET(request: Request) {
  try {
    const token = bearerToken(request);
    const user = token ? await verifySupabaseAccessToken(token) : null;
    if (!user) return Response.json({ error: "Zaloguj się ponownie." }, { status: 401, headers: noStoreHeaders });
    const sessionId = new URL(request.url).searchParams.get("sessionId") ?? "";
    const result = await syncCheckoutSessionForParent(sessionId, user.id);
    const { data: order, error } = await getSupabaseServiceClient().from("payment_orders")
      .select("status,access_valid_until,paid_at,receipt_url,hosted_invoice_url,invoice_pdf_url")
      .eq("id", result.orderId)
      .eq("parent_id", user.id)
      .single();
    if (error || !order) throw error ?? new Error("payment_order_not_found");
    return Response.json(order, { headers: noStoreHeaders });
  } catch (error) {
    const forbidden = error instanceof Error && error.message === "payment_order_forbidden";
    console.error("[stripe-status] failed", error instanceof Error ? error.message : "unknown_error");
    return Response.json({ error: forbidden ? "Brak dostępu do tej płatności." : "Nie udało się potwierdzić płatności." }, { status: forbidden ? 403 : 503, headers: noStoreHeaders });
  }
}
