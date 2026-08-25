import type { Metadata } from "next";
import "./calculator.css";

export const metadata: Metadata = {
  title: "Kalkulator punktów do liceum — egzaminio",
  description: "Darmowy kalkulator punktów rekrutacyjnych do liceum i technikum. Policz wynik egzaminu, świadectwa, osiągnięć i porównaj go z wybranym progiem.",
  alternates: { canonical: "/kalkulator-punktow" },
  openGraph: {
    title: "Kalkulator punktów do liceum — egzaminio",
    description: "Policz bezpłatnie punkty do szkoły ponadpodstawowej: egzamin, oceny, wyróżnienie, wolontariat i osiągnięcia.",
    type: "website",
    locale: "pl_PL",
    url: "/kalkulator-punktow",
    images: [],
  },
  twitter: {
    card: "summary",
    title: "Kalkulator punktów do liceum — egzaminio",
    description: "Policz bezpłatnie wynik rekrutacyjny do 200 punktów.",
    images: [],
  },
};

export default function RecruitmentCalculatorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
