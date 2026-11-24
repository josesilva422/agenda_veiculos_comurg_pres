import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

/** Cria um banco novo (prisma/e2e.db) com as migrações e os dados-base dos testes. */
export default function globalSetup() {
  const banco = path.join(process.cwd(), "prisma", "e2e.db");
  for (const f of [banco, `${banco}-journal`]) if (existsSync(f)) rmSync(f);
  const env = { ...process.env, DATABASE_URL: "file:./e2e.db" };
  execSync("npx prisma migrate deploy", { stdio: "inherit", env });
  execSync("npx tsx e2e/seed.ts", { stdio: "inherit", env });
}
