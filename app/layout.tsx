import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./account.css";

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
    <html lang="pl">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `window.MathJax={loader:{load:['ui/safe']},tex:{inlineMath:[['\\\\(','\\\\)']],displayMath:[['\\\\[','\\\\]']],packages:{'[-]':['require','autoload']}},options:{ignoreHtmlClass:'mathjax_ignore',processHtmlClass:'mathjax_process',menuOptions:{settings:{enrich:true,speech:true,braille:true,assistiveMml:false}}},startup:{ready(){MathJax.startup.defaultReady();MathJax.startup.promise.then(()=>window.dispatchEvent(new Event('mathjax-ready')))}}};` }} />
        <script defer src="https://cdn.jsdelivr.net/npm/mathjax@4.0.0/tex-mml-chtml.js" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased mathjax_ignore`}
      >
        {children}
      </body>
    </html>
  );
}
