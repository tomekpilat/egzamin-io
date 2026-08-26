import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { validateMarketingSignup } from "@/lib/marketing-signup";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 8_192) return Response.json({ message: "Zbyt duże zgłoszenie." }, { status: 413 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Nieprawidłowe dane formularza." }, { status: 400 });
  }

  const validation = validateMarketingSignup(body && typeof body === "object" ? body : {});
  if (!validation.valid) return Response.json({ errors: validation.errors }, { status: 400 });
  if (validation.bot) return Response.json({ message: "Zapisaliśmy Twój adres." }, { status: 202 });

  try {
    const supabase = getSupabaseServiceClient();
    const { error } = await supabase.rpc("subscribe_marketing_contact", {
      contact_email: validation.value.email,
      contact_subscription_type: validation.value.subscriptionType,
      contact_school_name: validation.value.schoolName,
      contact_city: validation.value.city,
      contact_recruitment_year: validation.value.recruitmentYear,
      contact_source_path: validation.value.sourcePath,
      contact_consent_version: validation.value.consentVersion,
      contact_consent_text: validation.value.consentText,
    });
    if (error) {
      const limited = /too many/i.test(error.message);
      return Response.json({ message: limited ? "Spróbuj ponownie za kilka minut." : "Zapis jest chwilowo niedostępny." }, { status: limited ? 429 : 503 });
    }
    return Response.json({ message: validation.value.subscriptionType === "plus_waitlist" ? "Powiadomimy Cię o starcie pakietu Plus." : `Powiadomimy Cię, gdy zweryfikujemy progi dla ${validation.value.schoolName}.` }, { status: 201 });
  } catch {
    return Response.json({ message: "Zapis jest chwilowo niedostępny." }, { status: 503 });
  }
}
