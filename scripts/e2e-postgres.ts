/**
 * Roda os testes E2E contra PostgreSQL (PGlite, como no Supabase), SEM mexer no seu ambiente de desenvolvimento.
 * O cliente do Prisma para PostgreSQL substituiria o do SQLite em node_modules, por isso tudo roda numa CÓPIA do projeto
 * (pasta temporária), com as próprias dependências. Na primeira vez demora (npm ci); depois reaproveita as dependências.
 *   npm run e2e:pg            PostgreSQL (PGlite)
 *   npm run e2e:pg -- sqlite  a mesma cópia, mas com SQLite (útil para validar uma troca de dependências)
 */
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const origem = process.cwd();
const modoSqlite = process.argv.includes("sqlite");
const destino = path.join(os.tmpdir(), "agendamento-e2e-pg");

const IGNORAR = new Set([
  "node_modules", ".git", ".next", ".claude", "test-results", "playwright-report", "uploads", "backups",
  ".env", "tsconfig.tsbuildinfo", "next-env.d.ts",
]);
const ignorar = (arquivo: string) => {
  const rel = path.relative(origem, arquivo);
  if (!rel) return false;
  const topo = rel.split(path.sep)[0];
  return IGNORAR.has(topo) || topo.startsWith(".next-") || /^prisma[\\/][^\\/]+\.(db|db-journal|db\.bak.*)$/.test(rel) || /\.env(\..*)?$/.test(rel) && !rel.endsWith(".env.example");
};

const exec = (cmd: string, env: NodeJS.ProcessEnv = process.env) => execSync(cmd, { cwd: destino, stdio: "inherit", env });

// 1) cópia limpa do projeto (mantém só as dependências já instaladas da cópia anterior)
mkdirSync(destino, { recursive: true });
for (const f of readdirSync(destino)) if (f !== "node_modules") rmSync(path.join(destino, f), { recursive: true, force: true });
cpSync(origem, destino, { recursive: true, filter: (f) => !ignorar(f) });

// 2) dependências (só reinstala se o package-lock mudou)
const lockAtual = readFileSync(path.join(origem, "package-lock.json"), "utf8");
const lockInstalado = path.join(destino, "node_modules", ".package-lock.copiado");
const igual = existsSync(lockInstalado) && readFileSync(lockInstalado, "utf8") === lockAtual;
if (!igual) {
  console.log("Instalando dependências na cópia (primeira vez ou package-lock novo)...");
  exec("npm ci");
  cpSync(path.join(origem, "package-lock.json"), lockInstalado);
}

// 3) cliente do Prisma para PostgreSQL e SQL do banco (no modo SQLite fica o cliente padrão, gerado pelo npm ci)
if (!modoSqlite) {
  exec("npx tsx scripts/pg-schema.ts");
  exec("npx tsx scripts/pg-sql-editor.ts");
  exec("npx prisma generate --schema prisma/postgres/schema.prisma");
} else {
  exec("npx prisma generate");
}

// 4) conferências rápidas na cópia (tipos, lint, testes das regras) e depois a suíte E2E
if (!process.env.E2E_SO_TESTES) {
  exec("npx tsc --noEmit");
  exec("npx eslint");
  exec("npx vitest run");
}
// a suíte E2E
const env: NodeJS.ProcessEnv = { ...process.env, ...(modoSqlite ? {} : { E2E_BANCO: "postgres" }) };
if (modoSqlite) delete env.E2E_BANCO;
try {
  exec("npx playwright test", env);
} catch {
  process.exitCode = 1;
}
