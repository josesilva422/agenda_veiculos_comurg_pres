import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "./providers";
import { APP } from "@/lib/config";

export const metadata: Metadata = {
  title: APP.nome,
  description: "Solicitação e controle de uso de veículos",
  applicationName: APP.nome,
  appleWebApp: { capable: true, title: "Veículos", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#0e4c5a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning className="min-h-screen bg-fundo text-slate-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
