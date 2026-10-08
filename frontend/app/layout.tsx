import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegister from "./ServiceWorkerRegister";

export const viewport: Viewport = {
  themeColor: "#0D0D0E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: "MangaID — Universal Manga Translator",
  description: "Baca manga dan manhwa apa pun dalam bahasa Indonesia.",
  manifest: "/manifest.json",
  referrer: "no-referrer",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MangaID",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark">
      <head>
        <meta name="referrer" content="no-referrer" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-touch-fullscreen" content="yes" />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--text)] antialiased font-sans selection:bg-[var(--accent)] selection:text-white">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
