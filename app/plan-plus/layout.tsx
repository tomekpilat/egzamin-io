import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Plan Plus — egzaminio",
  description: "Porównaj plan Free i plan Plus za 119 zł na 12 miesięcy.",
};

export default function PlanPlusLayout({ children }: { children: React.ReactNode }) {
  return children;
}
