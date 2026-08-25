export const FEEDBACK_CATEGORIES = [
  { value: "technical", label: "Problem techniczny" },
  { value: "question_error", label: "Błąd w zadaniu" },
  { value: "idea", label: "Pomysł na ulepszenie" },
  { value: "other", label: "Inna opinia" },
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]["value"];
export type FeedbackStatus = "new" | "reviewing" | "resolved" | "rejected";

export const feedbackStatusLabels: Record<FeedbackStatus, string> = {
  new: "Nowe",
  reviewing: "W analizie",
  resolved: "Rozwiązane",
  rejected: "Odrzucone",
};

export type FeedbackInput = {
  category: string;
  rating: number | null;
  message: string;
  email: string;
  contactConsent: boolean;
};

export function validateFeedbackInput(input: FeedbackInput) {
  const errors: Partial<Record<keyof FeedbackInput, string>> = {};
  const messageLength = input.message.trim().length;
  const validCategory = FEEDBACK_CATEGORIES.some((item) => item.value === input.category);

  if (!validCategory) errors.category = "Wybierz rodzaj zgłoszenia.";
  if (input.rating !== null && (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5)) errors.rating = "Ocena musi mieścić się w skali od 1 do 5.";
  if (messageLength < 20) errors.message = "Napisz co najmniej 20 znaków, abyśmy mogli zrozumieć zgłoszenie.";
  if (messageLength > 2000) errors.message = "Wiadomość może mieć maksymalnie 2000 znaków.";
  if (input.contactConsent && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) errors.email = "Podaj poprawny adres e-mail albo wyłącz zgodę na kontakt.";

  return { valid: Object.keys(errors).length === 0, errors };
}
