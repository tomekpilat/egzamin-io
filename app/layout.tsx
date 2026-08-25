import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MathJaxProvider } from "@/components/mathjax-provider";
import { AnalyticsConsent } from "@/components/analytics-consent";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";
import "./account.css";
import "./seo.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://egzamin.io"),
  title: "egzaminio — Egzamin bez paniki",
  description:
    "Ćwiczenia z arkuszy CKE i nauczyciel AI, który wyjaśnia zadania krok po kroku.",
  openGraph: {
    title: "egzaminio — Egzamin bez paniki. Krok po kroku.",
    description:
      "Ćwicz na zadaniach z arkuszy CKE i pytaj nauczyciela AI, gdy czegoś nie rozumiesz.",
    type: "website",
    locale: "pl_PL",
    images: [
      {
        url: "/og.png",
        width: 1730,
        height: 909,
        alt: "egzaminio — Egzamin bez paniki. Krok po kroku.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "egzaminio — Egzamin bez paniki. Krok po kroku.",
    description:
      "Ćwiczenia z arkuszy CKE i nauczyciel AI, który naprawdę tłumaczy.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased mathjax_ignore`}
      >
        <ThemeProvider>
          <MathJaxProvider>{children}</MathJaxProvider>
          <AnalyticsConsent measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
        </ThemeProvider>
      </body>
    </html>
  );
}
