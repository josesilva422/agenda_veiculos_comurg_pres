import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";

/**
 * Política de conteúdo (CSP): o navegador só carrega scripts, estilos, imagens e conexões do próprio sistema,
 * não deixa a página ser aberta dentro de outro site e só envia formulários para cá.
 * 'unsafe-inline' é exigido pelo Next.js (scripts de inicialização) e pelo calendário (estilos); em
 * desenvolvimento também 'unsafe-eval' e WebSocket, usados pelo recarregamento automático.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${dev ? " ws: wss:" : ""}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

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
          { key: "Content-Security-Policy", value: csp },
          // só HTTPS por 2 anos (em produção; em localhost não há HTTPS)
          ...(dev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
        ],
      },
    ];
  },
};

export default nextConfig;
