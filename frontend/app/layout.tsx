import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="id" className="dark">
      <body className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--text)] antialiased font-sans selection:bg-[var(--accent)] selection:text-white">
        {children}
      </body>
    </html>
  );
}
