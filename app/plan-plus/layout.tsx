import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pakiet Plus — egzaminio",
  description: "Porównaj wersję Free i pakiet Plus za 149 zł jednorazowo, bez automatycznego odnowienia.",
};

export default function PlanPlusLayout({ children }: { children: React.ReactNode }) {
  return children;
}
