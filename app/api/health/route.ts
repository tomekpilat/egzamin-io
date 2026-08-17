export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    {
      status: "ok",
      service: "egzaminio",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
