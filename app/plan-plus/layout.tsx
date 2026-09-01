import type { Metadata } from "next";
import { DEFAULT_SOCIAL_IMAGE } from "@/lib/site-metadata";

export const metadata: Metadata = {
  title: "Pakiet Plus — egzaminio",
  description: "Porównaj wersję Free i pakiet Plus za 149 zł jednorazowo, bez automatycznego odnowienia.",
  alternates: { canonical: "/plan-plus" },
  openGraph: {
    title: "Pakiet Plus — egzaminio",
    description: "Interaktywne arkusze CKE, nauczyciel AI, szczegółowy postęp i powtórki za 149 zł jednorazowo.",
    type: "website",
    locale: "pl_PL",
    url: "/plan-plus",
    images: [DEFAULT_SOCIAL_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pakiet Plus — egzaminio",
    description: "Interaktywne arkusze CKE, nauczyciel AI, szczegółowy postęp i powtórki.",
    images: [DEFAULT_SOCIAL_IMAGE],
  },
};

export default function PlanPlusLayout({ children }: { children: React.ReactNode }) {
  return children;
}
