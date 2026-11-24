-- Atualização 0006_remove_cnh para um banco Supabase que já existe. Cole no SQL Editor e clique em Run, UMA vez.
-- GERADO por scripts/pg-sql-editor.ts (npm run db:pg:sql).

-- A CNH não é usada pelo sistema: deixa de ser coletada e os dados já guardados são apagados (LGPD: só o necessário).
ALTER TABLE "User" DROP COLUMN "cnh";
ALTER TABLE "User" DROP COLUMN "cnhValidade";

-- registro para o Prisma não aplicar de novo
INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "applied_steps_count") VALUES
  (gen_random_uuid()::text, 'a064ed7f5b236e8a01e85a8f0e400a831375d84bf49af146e17a24a1c53fe912', now(), '0006_remove_cnh', 1);
