import { afterEach, describe, expect, it, vi } from "vitest";
import { getPublicCkeSeoIndex, getPublicCkeSeoPage, scoringSummary } from "@/lib/cke-seo";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllGlobals();
});

describe("public CKE SEO data client", () => {
  it("fails closed when public Supabase config is unavailable", async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    expect(await getPublicCkeSeoIndex()).toEqual([]);
    expect(await getPublicCkeSeoPage("/arkusze/2025/matematyka/glowny/paper/zadanie/1")).toBeNull();
  });

  it("reads only the explicit public RPC and rejects unrelated paths", async () => {
    process.env.SUPABASE_URL = "https://project.supabase.co/";
    process.env.SUPABASE_PUBLISHABLE_KEY = "public-key";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [{ canonical_path: "/arkusze/2025/matematyka/glowny/paper/zadanie/1" }] });
    vi.stubGlobal("fetch", fetchMock);

    expect(await getPublicCkeSeoPage("/panel")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await getPublicCkeSeoPage("/arkusze/2025/matematyka/glowny/paper/zadanie/1")).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://project.supabase.co/rest/v1/rpc/get_public_cke_seo_page",
      expect.objectContaining({ method: "POST", body: expect.stringContaining("target_canonical_path") }),
    );
  });

  it("handles provider errors without exposing a placeholder", async () => {
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_PUBLISHABLE_KEY = "public-key";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await getPublicCkeSeoIndex()).toEqual([]);
  });

  it("formats point totals without inventing unavailable criteria", () => {
    expect(scoringSummary({ max_points: 1 })).toBe("Maksymalnie 1 punkt.");
    expect(scoringSummary({ max_points: 3 })).toBe("Maksymalnie 3 punkty.");
    expect(scoringSummary({ rules: [] })).toContain("oficjalnym kluczem CKE");
  });
});
