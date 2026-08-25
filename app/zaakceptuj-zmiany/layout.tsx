import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aktualizacja dokumentów — egzaminio",
  robots: { index: false, follow: false },
};

export default function LegalUpdateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
