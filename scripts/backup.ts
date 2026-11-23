/**
 * Backup consistente do banco (SQLite, via VACUUM INTO).
 *   npm run backup
 * Variáveis: BACKUP_DIR (padrão ./backups), BACKUP_KEEP_DAYS (padrão 14).
 */
import { PrismaClient } from "@prisma/client";
import { mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

async function main() {
  const base = path.resolve(process.env.BACKUP_DIR ?? "backups");
  const manter = Number(process.env.BACKUP_KEEP_DAYS ?? 14);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(base, stamp);
  mkdirSync(dir, { recursive: true });

  const destinoDb = path.join(dir, "banco.db");
  await prisma.$executeRawUnsafe(`VACUUM INTO '${destinoDb.replace(/'/g, "''")}'`);
  console.log(`Backup criado em ${dir}`);

  // retenção: remove backups mais antigos que BACKUP_KEEP_DAYS (somente pastas com nome de timestamp)
  const limite = Date.now() - manter * 86400_000;
  for (const nome of readdirSync(base)) {
    const p = path.join(base, nome);
    if (/^\d{4}-\d{2}-\d{2}T/.test(nome) && statSync(p).isDirectory() && statSync(p).mtimeMs < limite) {
      rmSync(p, { recursive: true, force: true });
      console.log(`Removido backup antigo: ${nome}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(`Falha no backup: ${e instanceof Error ? e.message : e}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
