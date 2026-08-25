import type { Metadata } from "next";
import "./calculator.css";

export const metadata: Metadata = {
  title: "Kalkulator punktów do liceum i technikum 2027 — egzaminio",
  description: "Darmowy kalkulator punktów do liceum i technikum 2027. Policz egzamin, świadectwo i osiągnięcia oraz porównaj wynik ze zweryfikowanym progiem.",
  alternates: { canonical: "/kalkulator-punktow" },
  openGraph: {
    title: "Kalkulator punktów do liceum i technikum 2027 — egzaminio",
    description: "Policz bezpłatnie punkty do szkoły ponadpodstawowej: egzamin, oceny, wyróżnienie, wolontariat i osiągnięcia.",
    type: "website",
    locale: "pl_PL",
    url: "/kalkulator-punktow",
    images: [],
  },
  twitter: {
    card: "summary",
    title: "Kalkulator punktów do liceum i technikum 2027 — egzaminio",
    description: "Policz bezpłatnie wynik rekrutacyjny do 200 punktów.",
    images: [],
  },
};

export const dynamic = "force-static";

export default function RecruitmentCalculatorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
