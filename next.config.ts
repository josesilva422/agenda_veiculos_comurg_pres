import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // permite medir/construir sem mexer na pasta .next do servidor de desenvolvimento em uso
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // pdfkit lê arquivos de fontes do disco; não pode ser empacotado
  serverExternalPackages: ["pdfkit", "exceljs"],
  poweredByHeader: false,
  // na Vercel, os arquivos de fonte do pdfkit (.afm) não são detectados sozinhos: sem isto o PDF falha
  outputFileTracingIncludes: {
    "/api/relatorios/[formato]": ["./node_modules/pdfkit/js/data/**/*"],
  },
  async headers() {
    return [
      {
        // o navegador deve sempre conferir se há service worker novo
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
