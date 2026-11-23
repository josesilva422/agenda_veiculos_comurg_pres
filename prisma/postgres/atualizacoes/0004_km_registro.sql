-- Atualização 0004_km_registro para um banco Supabase que já existe. Cole no SQL Editor e clique em Run, UMA vez.
-- GERADO por scripts/pg-sql-editor.ts (npm run db:pg:sql).

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "kmInicial" INTEGER,
ADD COLUMN "kmFinal" INTEGER;

-- registro para o Prisma não aplicar de novo
INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "applied_steps_count") VALUES
  (gen_random_uuid()::text, '53a8973900f7af81b570147aaa175b548f5a37a4cd5c51b0de15289d7c48567f', now(), '0004_km_registro', 1);
