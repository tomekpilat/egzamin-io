import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { normalizeSchoolSearch, type RecruitmentThresholdRecord } from "@/lib/recruitment-schools";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const query = normalizeSchoolSearch(new URL(request.url).searchParams.get("q") ?? "");
  if (query.length < 2) return Response.json({ results: [] });

  try {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase.rpc("search_public_recruitment_thresholds", { search_query: query, requested_limit: 8 });
    if (error) return Response.json({ message: "Baza progów jest chwilowo niedostępna." }, { status: 503 });
    return Response.json({ results: (data ?? []) as RecruitmentThresholdRecord[] }, { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } });
  } catch {
    return Response.json({ message: "Baza progów jest jeszcze przygotowywana." }, { status: 503 });
  }
}
