export const PLUS_ANNUAL_PRICE_PLN = 119;
export const PLUS_AI_QUESTIONS_PER_DAY = 50;

export const PLAN_COMPARISON_ROWS = [
  ["Cena", "0 zł", `${PLUS_ANNUAL_PRICE_PLN} zł / 12 miesięcy`],
  ["Koszt miesięczny", "0 zł", "9,92 zł (przeliczenie)"],
  ["Zadania", "Wybrane zestawy", "Pełna baza ćwiczeń"],
  ["Pytania do AI", "3 dziennie", `${PLUS_AI_QUESTIONS_PER_DAY} dziennie`],
  ["Plan nauki", "Podstawowy postęp", "Plan i inteligentne powtórki"],
  ["Panel rodzica", "Cel tygodniowy", "Raport, trendy i rekomendacje"],
] as const;

export function resolvePlusCheckout(checkoutUrl?: string) {
  if (!checkoutUrl) return { enabled: false as const, url: null };
  try {
    const parsed = new URL(checkoutUrl);
    if (parsed.protocol !== "https:") return { enabled: false as const, url: null };
    return { enabled: true as const, url: parsed.toString() };
  } catch {
    return { enabled: false as const, url: null };
  }
}

export function calculatePlusEconomics(annualPrice = PLUS_ANNUAL_PRICE_PLN, sessionsPerWeek = 3) {
  return {
    monthly: Math.round((annualPrice / 12) * 100) / 100,
    daily: Math.round((annualPrice / 365) * 100) / 100,
    perSession: Math.round((annualPrice / (52 * sessionsPerWeek)) * 100) / 100,
  };
}

export function formatPln(value: number) {
  return value.toFixed(2).replace(".", ",");
}
