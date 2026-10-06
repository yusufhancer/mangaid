import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800"],
});

const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "MangaID — Universal Manga Translator",
  description: "Baca manga dan manhwa apa pun dalam bahasa Indonesia.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`dark ${instrument.variable} ${bricolage.variable} ${jetbrains.variable}`}>
      <body className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--text)] antialiased font-sans selection:bg-[var(--accent)] selection:text-white">
        {children}
      </body>
    </html>
  );
}
