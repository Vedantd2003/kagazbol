import type { Metadata } from "next";
import { Noto_Sans, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-devanagari",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KagazBol — Talk to any Indian document",
  description:
    "Photograph any Indian document and have a voice conversation about it in Hindi, Marathi, or English.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // lang defaults to "en"; the client updates it via useLangSync in page.tsx
    // whenever the user switches language. This keeps the HTML attribute in sync
    // with the CSS :lang() pseudo-class selectors and screen-reader pronunciation.
    <html
      lang="en"
      className={`${notoSans.variable} ${notoDevanagari.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
