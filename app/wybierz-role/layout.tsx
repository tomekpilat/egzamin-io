import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wybierz typ konta — egzaminio",
  robots: { index: false, follow: false },
};

export default function RoleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
