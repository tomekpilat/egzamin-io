import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Potwierdzenie płatności | egzaminio",
  robots: { index: false, follow: false },
};

export default function PaymentResultLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
