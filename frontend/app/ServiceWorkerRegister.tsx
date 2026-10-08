"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("[MangaID PWA] Service Worker registered:", reg.scope);
          })
          .catch((err) => {
            console.error("[MangaID PWA] Service Worker registration failed:", err);
          });
      });
    }
  }, []);

  return null;
}
