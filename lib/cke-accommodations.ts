export const CKE_ACCOMMODATIONS = [
  { code: "100", label: "Wariant standardowy", audience: "Uczniowie bez niepełnosprawności lub ze specyficznymi trudnościami w uczeniu się" },
  { code: "200", label: "Autyzm, w tym zespół Aspergera", audience: "Uczniowie z autyzmem, w tym z zespołem Aspergera" },
  { code: "400", label: "Słabowidzenie — czcionka 16 pkt", audience: "Uczniowie słabowidzący korzystający z arkusza z czcionką 16 pkt" },
  { code: "500", label: "Słabowidzenie — czcionka 24 pkt", audience: "Uczniowie słabowidzący korzystający z arkusza z czcionką 24 pkt" },
  { code: "660", label: "Niewidzenie", audience: "Uczniowie niewidomi" },
  { code: "700", label: "Niesłyszenie lub słabosłyszenie", audience: "Uczniowie niesłyszący i słabosłyszący" },
  { code: "800", label: "Niepełnosprawność intelektualna w stopniu lekkim", audience: "Uczniowie z niepełnosprawnością intelektualną w stopniu lekkim" },
  { code: "900", label: "Afazja", audience: "Uczniowie z afazją" },
  { code: "Q00", label: "Niepełnosprawność ruchowa — MPD", audience: "Uczniowie z niepełnosprawnością ruchową spowodowaną mózgowym porażeniem dziecięcym" },
  { code: "K00", label: "Zaburzenie widzenia barw", audience: "Uczniowie z zaburzeniem widzenia barw" },
  { code: "C00", label: "Ograniczona znajomość języka polskiego", audience: "Uczniowie, którym ograniczona znajomość polskiego utrudnia rozumienie czytanego tekstu" },
] as const;

export type CkeAccommodationCode = (typeof CKE_ACCOMMODATIONS)[number]["code"];

export const DEFAULT_CKE_ACCOMMODATION: CkeAccommodationCode = "100";

export function isCkeAccommodationCode(value: unknown): value is CkeAccommodationCode {
  return typeof value === "string" && CKE_ACCOMMODATIONS.some((item) => item.code === value);
}

export function getCkeAccommodation(value: unknown) {
  return CKE_ACCOMMODATIONS.find((item) => item.code === value) ?? CKE_ACCOMMODATIONS[0];
}
