import { defineConfig, devices } from "@playwright/test";

/**
 * Testes ponta a ponta (E2E): sobem uma cópia do sistema em modo de produção, com um banco novo e à parte,
 * e usam um navegador de verdade. Não mexem no banco de desenvolvimento nem na pasta .next.
 *   npm run e2e       banco SQLite (prisma/e2e.db), como no desenvolvimento
 *   npm run e2e:pg    banco PostgreSQL (PGlite), como no Supabase — roda numa cópia do projeto (veja scripts/e2e-postgres.ts)
 */
const PORTA = 3107;
export const URL_BASE = `http://localhost:${PORTA}`;

const POSTGRES = process.env.E2E_BANCO === "postgres";
const PORTA_PG = 5433;
const URL_BANCO = POSTGRES
  ? `postgresql://postgres:postgres@127.0.0.1:${PORTA_PG}/postgres?pgbouncer=true&connection_limit=1&sslmode=disable`
  : "file:./e2e.db";

export default defineConfig({
  testDir: "./e2e",
  // os arquivos formam uma história (um cria dados que o seguinte usa): rodam em ordem, um de cada vez
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: URL_BASE,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    ...(POSTGRES
      ? [{ command: "node e2e/pglite-servidor.mjs", port: PORTA_PG, timeout: 180_000, reuseExistingServer: false }]
      : []),
    {
      // E2E_SEM_BUILD=1 pula o build (reaproveita .next-e2e) para repetir os testes mais rápido
      command: (process.env.E2E_SEM_BUILD ? "" : "npx next build && ") + "npx next start -p " + PORTA,
      url: `${URL_BASE}/login`,
      timeout: 600_000,
      reuseExistingServer: false,
      env: {
        NEXT_DIST_DIR: ".next-e2e",
        DATABASE_URL: URL_BANCO,
        DIRECT_URL: URL_BANCO,
        NEXTAUTH_URL: URL_BASE,
        NEXTAUTH_SECRET: "segredo-somente-para-testes-e2e-0123456789abcdef",
        TRUST_PROXY: "0",
      },
    },
  ],
});
