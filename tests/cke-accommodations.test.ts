import { describe, expect, it } from "vitest";
import { CKE_ACCOMMODATIONS, DEFAULT_CKE_ACCOMMODATION, getCkeAccommodation, isCkeAccommodationCode } from "@/lib/cke-accommodations";

describe("CKE accommodation profiles", () => {
  it("covers every 2026 CKE accommodation code without mixing in X/Y paper versions", () => {
    expect(CKE_ACCOMMODATIONS.map((item) => item.code)).toEqual(["100", "200", "400", "500", "660", "700", "800", "900", "Q00", "K00", "C00"]);
    expect(CKE_ACCOMMODATIONS.some((item) => item.code === "X" || item.code === "Y")).toBe(false);
  });

  it("uses the standard profile as the safe default", () => {
    expect(DEFAULT_CKE_ACCOMMODATION).toBe("100");
    expect(isCkeAccommodationCode("900")).toBe(true);
    expect(isCkeAccommodationCode("unknown")).toBe(false);
    expect(getCkeAccommodation("unknown").code).toBe("100");
  });
});
