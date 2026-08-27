import { describe, expect, it } from "vitest";
import { parseCkePage } from "../scripts/cke-download-sources.mjs";

const sourcePage = `
  <p><strong>Język angielski</strong></p>
  <p>Arkusz egzaminacyjny dla uczniów bez niepełnosprawności wersja X (OJAP-100-X-2605)</p>
  <ul>
    <li><a href="https://cke.gov.pl/images/_EGZAMIN_OSMOKLASISTY/Arkusze-egzaminacyjne/2026/jezyk_angielski/test.pdf">Zeszyt zadań egzaminacyjnych</a></li>
    <li><a href="http://cke.gov.pl/images/_EGZAMIN_OSMOKLASISTY/Arkusze-egzaminacyjne/2026/jezyk_angielski/shared.mp3">Nagrania</a></li>
  </ul>
  <p>Arkusz egzaminacyjny dla uczniów z autyzmem (OJAP-200-X-2605)</p>
  <ul><li><a href="http://cke.gov.pl/images/_EGZAMIN_OSMOKLASISTY/Arkusze-egzaminacyjne/2026/jezyk_angielski/shared.mp3">Nagrania</a></li></ul>
`;

describe("CKE source downloader", () => {
  it("deduplicates shared files while retaining every audience usage", () => {
    const files = parseCkePage(sourcePage);
    expect(files).toHaveLength(2);
    const audio = files.find((file) => file.extension === "mp3");
    expect(audio?.url).toMatch(/^https:/);
    expect(audio?.usages.map((usage) => usage.variant_code)).toEqual(["OJAP-100-X-2605", "OJAP-200-X-2605"]);
  });
});
