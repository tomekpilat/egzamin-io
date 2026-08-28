export type CkeSeoIndexEntry = {
  canonical_path: string;
  updated_at: string;
};

export type CkeSeoPage = CkeSeoIndexEntry & {
  exam_year: number;
  exam_session: "main" | "additional";
  subject: "mathematics" | "polish" | "english" | "french" | "spanish" | "german" | "russian" | "italian";
  variant_code: string;
  source_label: string;
  source_url: string;
  source_page_from: number;
  source_page_to: number;
  question_number: string;
  topic: string;
  prompt_markdown: string;
  answer_options: string[];
  answer_key: Record<string, unknown>;
  scoring: Record<string, unknown>;
  explanation: string;
  common_mistakes: string[];
  related_topic: string;
};

export const CKE_SUBJECT_LABELS: Record<CkeSeoPage["subject"], string> = {
  mathematics: "Matematyka",
  polish: "Język polski",
  english: "Język angielski",
  french: "Język francuski",
  spanish: "Język hiszpański",
  german: "Język niemiecki",
  russian: "Język rosyjski",
  italian: "Język włoski",
};

function publicSupabaseConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
}

async function callPublicRpc<T>(name: string, body: object): Promise<T | null> {
  const config = publicSupabaseConfig();
  if (!config) return null;

  try {
    const response = await fetch(`${config.url}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!response.ok) return null;
    return await response.json() as T;
  } catch {
    // Fail closed: an unavailable database must never create an indexable placeholder.
    return null;
  }
}

export async function getPublicCkeSeoIndex(): Promise<CkeSeoIndexEntry[]> {
  return await callPublicRpc<CkeSeoIndexEntry[]>("list_public_cke_seo_pages", {}) ?? [];
}

export async function getPublicCkeSeoPage(canonicalPath: string): Promise<CkeSeoPage | null> {
  if (!canonicalPath.startsWith("/arkusze/") || canonicalPath.includes("..")) return null;
  const rows = await callPublicRpc<CkeSeoPage[]>("get_public_cke_seo_page", { target_canonical_path: canonicalPath });
  return rows?.[0] ?? null;
}

export function scoringSummary(scoring: Record<string, unknown>) {
  const maxPoints = scoring.max_points;
  if (typeof maxPoints === "number") return `Maksymalnie ${maxPoints} ${maxPoints === 1 ? "punkt" : "punkty"}.`;
  return "Punktacja zgodna z oficjalnym kluczem CKE jest opisana poniżej.";
}
