import type { MetadataRoute } from "next";
import { APP } from "@/lib/config";

/** Torna o sistema instalável no celular (Adicionar à tela inicial). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP.nome,
    short_name: "Veículos",
    description: "Solicitação e controle de uso de veículos",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#005f27",
    icons: [
      { src: "/pwa/icone/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/icone/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa/icone/512-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
