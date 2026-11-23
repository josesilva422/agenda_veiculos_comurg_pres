/**
 * Junta as migrações PostgreSQL em UM arquivo para colar no SQL Editor do Supabase:
 * prisma/postgres/supabase-sql-editor.sql
 * O arquivo também registra as migrações na tabela `_prisma_migrations`, para o Prisma (deploy da Vercel)
 * entender que o banco já está atualizado, sem nenhum passo extra.
 *   npm run db:pg:sql
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "prisma", "postgres", "migrations");
const nomes = readdirSync(dir)
  .filter((n) => statSync(path.join(dir, n)).isDirectory())
  .sort();

let sql = `-- ============================================================
-- Agendamento de Veículos — banco completo para o SQL Editor do Supabase
-- Migrações incluídas: ${nomes.join(", ")}
-- Cole tudo e clique em Run. Rode UMA vez, em projeto vazio.
-- GERADO por scripts/pg-sql-editor.ts (npm run db:pg:sql). Não edite à mão.
-- ============================================================

`;

const registros: { nome: string; checksum: string }[] = [];
const registra = (r: { nome: string; checksum: string }) =>
  `INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "applied_steps_count") VALUES\n  (gen_random_uuid()::text, '${r.checksum}', now(), '${r.nome}', 1);\n`;
// migrações depois da 0003 também saem em arquivos próprios (para colar em um banco que já existe)
const atualizacoesDir = path.join(process.cwd(), "prisma", "postgres", "atualizacoes");
mkdirSync(atualizacoesDir, { recursive: true });
for (const nome of nomes) {
  const conteudo = readFileSync(path.join(dir, nome, "migration.sql"));
  sql += `-- ---------- ${nome} ----------\n${conteudo.toString("utf8").trimEnd()}\n\n`;
  // o Prisma guarda o SHA-256 do arquivo da migração
  const reg = { nome, checksum: createHash("sha256").update(conteudo).digest("hex") };
  registros.push(reg);
  if (nome.slice(0, 4) > "0003") {
    writeFileSync(
      path.join(atualizacoesDir, `${nome}.sql`),
      `-- Atualização ${nome} para um banco Supabase que já existe. Cole no SQL Editor e clique em Run, UMA vez.\n-- GERADO por scripts/pg-sql-editor.ts (npm run db:pg:sql).\n\n${conteudo.toString("utf8").trimEnd()}\n\n-- registro para o Prisma não aplicar de novo\n${registra(reg)}`,
    );
  }
}

sql += `-- ---------- registro das migrações (para o Prisma não aplicar de novo) ----------
CREATE TABLE "_prisma_migrations" (
    "id" VARCHAR(36) PRIMARY KEY NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "applied_steps_count") VALUES
${registros.map((r) => `  (gen_random_uuid()::text, '${r.checksum}', now(), '${r.nome}', 1)`).join(",\n")};
`;

writeFileSync(path.join(process.cwd(), "prisma", "postgres", "supabase-sql-editor.sql"), sql);
console.log(`supabase-sql-editor.sql gerado (${nomes.length} migrações).`);
