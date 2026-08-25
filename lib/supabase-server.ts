import { createClient } from "@supabase/supabase-js";

function requiredServerEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}

export async function verifySupabaseAccessToken(accessToken: string) {
  const client = createClient(
    requiredServerEnv("SUPABASE_URL"),
    requiredServerEnv("SUPABASE_PUBLISHABLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user) return null;
  return data.user;
}

export function getSupabaseServiceClient() {
  return createClient(
    requiredServerEnv("SUPABASE_URL"),
    requiredServerEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
