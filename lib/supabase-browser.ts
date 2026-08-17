import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type PublicConfig = {
  configured: boolean;
  supabaseUrl?: string;
  supabasePublishableKey?: string;
};

let clientPromise: Promise<SupabaseClient> | null = null;

async function createBrowserClient(): Promise<SupabaseClient> {
  const response = await fetch("/api/public-config", {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("Nie udało się odczytać konfiguracji logowania.");
  }

  const config = (await response.json()) as PublicConfig;
  if (
    !config.configured ||
    !config.supabaseUrl ||
    !config.supabasePublishableKey
  ) {
    throw new Error(
      "Logowanie wymaga konfiguracji Supabase przez administratora.",
    );
  }

  return createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export function getSupabaseClient(): Promise<SupabaseClient> {
  clientPromise ??= createBrowserClient();
  return clientPromise;
}
