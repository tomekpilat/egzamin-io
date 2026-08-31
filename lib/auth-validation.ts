export function validateSignupConfirmation(
  email: string,
  emailConfirmation: string,
  password: string,
  passwordConfirmation: string,
) {
  if (email.trim().toLowerCase() !== emailConfirmation.trim().toLowerCase()) {
    return "Podane adresy e-mail nie są identyczne.";
  }

  if (password !== passwordConfirmation) {
    return "Podane hasła nie są identyczne.";
  }

  return null;
}

export function validatePasswordReset(
  password: string,
  passwordConfirmation: string,
) {
  if (password.length < 8) {
    return "Hasło musi mieć co najmniej 8 znaków.";
  }

  if (password !== passwordConfirmation) {
    return "Podane hasła nie są identyczne.";
  }

  return null;
}
