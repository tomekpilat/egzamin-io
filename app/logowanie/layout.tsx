import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Logowanie i rejestracja — egzaminio",
  description: "Zaloguj się albo załóż darmowe konto ucznia, rodzica lub nauczyciela.",
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
