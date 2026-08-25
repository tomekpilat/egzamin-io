import { getSupabaseServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export async function POST(request: Request) {
  let token = "";
  try {
    const body = await request.json() as { token?: unknown };
    token = typeof body.token === "string" ? body.token.trim() : "";
  } catch {
    return Response.json({ message: "Nieprawidłowe żądanie." }, { status: 400 });
  }
  if (!UUID.test(token)) return Response.json({ message: "Link wypisu jest nieprawidłowy." }, { status: 400 });

  try {
    const { data, error } = await getSupabaseServiceClient().rpc("unsubscribe_marketing_contact", { target_token: token });
    if (error) return Response.json({ message: "Wypis jest chwilowo niedostępny." }, { status: 503 });
    return Response.json({ message: data ? "Adres został wypisany." : "Ten link nie jest już aktywny." });
  } catch {
    return Response.json({ message: "Wypis jest chwilowo niedostępny." }, { status: 503 });
  }
}
