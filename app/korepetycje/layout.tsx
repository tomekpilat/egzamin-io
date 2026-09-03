import type { Metadata } from "next";
import "./tutoring-pilot.css";

export const metadata: Metadata = {
  title: "Korepetycje — pilotaż | egzaminio",
  description: "Zamknięty pilotaż korepetycji w egzaminio.",
  robots: { index: false, follow: false },
};

export default function TutoringLayout({ children }: { children: React.ReactNode }) {
  return children;
}

