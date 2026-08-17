export const dynamic = "force-dynamic";

export function GET() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  const configured = Boolean(supabaseUrl && supabasePublishableKey);

  return Response.json(
    {
      configured,
      supabaseUrl: configured ? supabaseUrl : undefined,
      supabasePublishableKey: configured
        ? supabasePublishableKey
        : undefined,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
