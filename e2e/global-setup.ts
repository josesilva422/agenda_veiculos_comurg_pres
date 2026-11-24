import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

/**
 * Prepara o banco de testes e os dados-base.
 * - SQLite: cria prisma/e2e.db novo, com as migrações.
 * - PostgreSQL (E2E_BANCO=postgres): o banco (PGlite) já nasce pronto pelo servidor; aqui só entram os dados-base.
 */
export default function globalSetup() {
  const postgres = process.env.E2E_BANCO === "postgres";
  const url = postgres
    ? "postgresql://postgres:postgres@127.0.0.1:5433/postgres?pgbouncer=true&connection_limit=1&sslmode=disable"
    : "file:./e2e.db";
  const env = { ...process.env, DATABASE_URL: url, DIRECT_URL: url };
  if (!postgres) {
    const banco = path.join(process.cwd(), "prisma", "e2e.db");
    for (const f of [banco, `${banco}-journal`]) if (existsSync(f)) rmSync(f);
    execSync("npx prisma migrate deploy", { stdio: "inherit", env });
  }
  execSync("npx tsx e2e/seed.ts", { stdio: "inherit", env });
}
