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

  it("parses a historical CKE page using its requested year", () => {
    const sourcePage = `
      <p>Matematyka</p>
      <p>Arkusz egzaminacyjny dla uczniów bez niepełnosprawności (OMAP-100-X-2505)</p>
      <a href="http://cke.gov.pl/images/_EGZAMIN_OSMOKLASISTY/Arkusze-egzaminacyjne/2025/matematyka/OMAP-100-X-2505-zeszyt-zadan.pdf">Zeszyt zadań egzaminacyjnych</a>
    `;

    const files = parseCkePage(sourcePage, "https://cke.gov.pl/egzamin-osmoklasisty/arkusze/2025-2/", 2025);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatchObject({
      subject_directory: "matematyka",
      file_name: "OMAP-100-X-2505-zeszyt-zadan.pdf",
    });
  });
});
