export const PLUS_PACKAGE_PRICE_PLN = 149;
export const FREE_PRACTICE_QUESTIONS_PER_DAY = 15;
export const FREE_AI_QUESTIONS_PER_DAY = 3;
export const PLUS_AI_QUESTIONS_PER_DAY = 50;
export const TUTORING_REFERENCE_HOURLY_PRICE_PLN = 80;

export const PLAN_COMPARISON_ROWS = [
  ["Cena", "0 zł", `${PLUS_PACKAGE_PRICE_PLN} zł / pakiet`],
  ["Płatność", "Bez opłat", "Jednorazowa, bez odnowienia"],
  ["Arkusze CKE", "Pełny dostęp", "Pełny dostęp"],
  ["Interaktywne rozwiązywanie", `${FREE_PRACTICE_QUESTIONS_PER_DAY} pytań dziennie`, "Bez limitu"],
  ["Nauczyciel AI", `${FREE_AI_QUESTIONS_PER_DAY} pytania dziennie`, `${PLUS_AI_QUESTIONS_PER_DAY} pytań dziennie`],
  ["Śledzenie postępów", "Podstawowe podsumowanie", "Wyniki, trendy i powtórki"],
  ["Panel rodzica", "Połączenie konta", "Postęp, użycie AI i rekomendacje"],
] as const;

export function calculatePlusPackageEconomics(
  packagePrice = PLUS_PACKAGE_PRICE_PLN,
  tutoringHourlyPrice = TUTORING_REFERENCE_HOURLY_PRICE_PLN,
) {
  const twoTutoringHours = tutoringHourlyPrice * 2;
  return {
    tutoringHourlyPrice,
    twoTutoringHours,
    differenceVsTwoHours: Math.round((twoTutoringHours - packagePrice) * 100) / 100,
    tutoringHoursEquivalent: Math.round((packagePrice / tutoringHourlyPrice) * 100) / 100,
  };
}

export function formatPln(value: number) {
  return value.toFixed(2).replace(".", ",");
}
