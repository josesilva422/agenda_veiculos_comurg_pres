-- Atualização 0004_km_registro para um banco Supabase que já existe. Cole no SQL Editor e clique em Run, UMA vez.
-- GERADO por scripts/pg-sql-editor.ts (npm run db:pg:sql).

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "kmInicial" INTEGER,
ADD COLUMN "kmFinal" INTEGER;

-- registro para o Prisma não aplicar de novo
INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "applied_steps_count") VALUES
  (gen_random_uuid()::text, '3dbb0a78f16692e286935930d1172ff1c45f1f9e97de9ca05e13341c6187ff0d', now(), '0004_km_registro', 1);
