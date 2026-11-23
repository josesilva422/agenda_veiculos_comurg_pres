"use client";
import { useEffect } from "react";

/** Registra o service worker (só em produção, que é onde o app é instalado). */
export default function RegistrarSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
  }, []);
  return null;
}
