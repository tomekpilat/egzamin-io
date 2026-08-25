export const PLUS_ANNUAL_PRICE_PLN = 119;
export const PLUS_AI_QUESTIONS_PER_DAY = 50;

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
