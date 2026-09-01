type PracticeSubmissionFailure = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
};

const GENERIC_MESSAGE = "Nie udało się zapisać odpowiedzi. Spróbuj ponownie.";

function failureText(failure: unknown) {
  if (failure instanceof Error) return failure.message;
  if (!failure || typeof failure !== "object") return String(failure ?? "");

  const candidate = failure as PracticeSubmissionFailure;
  return [candidate.code, candidate.message, candidate.details, candidate.hint]
    .filter((value): value is string => typeof value === "string")
    .join(" ");
}

export function practiceSubmissionErrorMessage(failure: unknown) {
  const message = failureText(failure).toLowerCase();

  if (message.includes("practice_daily_limit_reached")) {
    return "Dzisiejszy limit 15 pytań został wykorzystany. Nadal możesz przeglądać wszystkie arkusze albo odblokować ćwiczenia bez limitu w Plus.";
  }
  if (message.includes("active_student_profile_required") || message.includes("active student profile required")) {
    return "Dokończ konfigurację konta ucznia, aby zapisywać odpowiedzi.";
  }
  if (message.includes("published_practice_question_required") || message.includes("published question not found")) {
    return "To zadanie nie jest już dostępne. Wróć do listy arkuszy i otwórz je ponownie.";
  }
  if (
    message.includes("student_can_access_question")
    || message.includes("submit_practice_response_unlimited")
    || message.includes("pgrst202")
    || message.includes("schema cache")
  ) {
    return "Zapisywanie odpowiedzi wymaga aktualizacji bazy aplikacji. Spróbuj ponownie po wdrożeniu poprawki.";
  }
  if (
    message.includes("invalid_practice_response")
    || message.includes("invalid_answer_index")
    || message.includes("invalid_selected_indices")
    || message.includes("written_response_required")
  ) {
    return "Nie udało się odczytać tej odpowiedzi. Wybierz lub wpisz ją ponownie.";
  }

  return GENERIC_MESSAGE;
}

export function practiceSubmissionDiagnostic(failure: unknown) {
  if (!failure || typeof failure !== "object") return { message: failureText(failure) };
  const candidate = failure as PracticeSubmissionFailure;
  return {
    code: typeof candidate.code === "string" ? candidate.code : undefined,
    message: typeof candidate.message === "string" ? candidate.message : undefined,
    details: typeof candidate.details === "string" ? candidate.details : undefined,
    hint: typeof candidate.hint === "string" ? candidate.hint : undefined,
  };
}
