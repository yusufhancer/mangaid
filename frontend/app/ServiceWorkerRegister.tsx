"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        // Auto unregister on localhost so development is never cached
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const reg of registrations) {
            reg.unregister();
          }
        });
        if (window.caches) {
          caches.keys().then((keys) => {
            keys.forEach((key) => caches.delete(key));
          });
        }
        return;
      }

      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            reg.update();
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
