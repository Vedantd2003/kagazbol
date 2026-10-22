import type { Metadata, Viewport } from "next";
import "@fontsource/mukta/latin-400.css";
import "@fontsource/mukta/latin-600.css";
import "@fontsource/mukta/latin-700.css";
import "@fontsource/mukta/devanagari-400.css";
import "@fontsource/mukta/devanagari-600.css";
import "@fontsource/mukta/devanagari-700.css";
import "@fontsource/tiro-devanagari-marathi/latin-400.css";
import "@fontsource/tiro-devanagari-marathi/devanagari-400.css";
import "./globals.css";
import { PreferencesProvider } from "@/hooks/usePreferences";

export const metadata: Metadata = {
  title: "KagazBol — Understand every document. In your language.",
  description:
    "Photograph a bill, prescription, bank notice or government form and get a simple explanation in English, Hindi or Marathi — then ask questions by voice.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e9eeea" },
    { media: "(prefers-color-scheme: dark)", color: "#131923" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <PreferencesProvider>{children}</PreferencesProvider>
      </body>
    </html>
  );
}
