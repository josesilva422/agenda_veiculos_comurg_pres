import { defineConfig, devices } from "@playwright/test";

/**
 * Testes ponta a ponta (E2E): sobem uma cópia do sistema em modo de produção, com um banco SQLite novo e à parte
 * (prisma/e2e.db), e usam um navegador de verdade. Não mexem no banco de desenvolvimento nem na pasta .next.
 *   npm run e2e
 */
const PORTA = 3107;
export const URL_BASE = `http://localhost:${PORTA}`;

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
  webServer: {
    // E2E_SEM_BUILD=1 pula o build (reaproveita .next-e2e) para repetir os testes mais rápido
    command: (process.env.E2E_SEM_BUILD ? "" : "npx next build && ") + "npx next start -p " + PORTA,
    url: `${URL_BASE}/login`,
    timeout: 600_000,
    reuseExistingServer: false,
    env: {
      NEXT_DIST_DIR: ".next-e2e",
      DATABASE_URL: "file:./e2e.db",
      NEXTAUTH_URL: URL_BASE,
      NEXTAUTH_SECRET: "segredo-somente-para-testes-e2e-0123456789abcdef",
      TRUST_PROXY: "0",
    },
  },
});
