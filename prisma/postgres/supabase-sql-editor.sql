-- ============================================================
-- Agendamento de Veículos — banco completo para o SQL Editor do Supabase
-- Migrações incluídas: 0001_init, 0002_sem_sobreposicao, 0003_rls, 0004_km_registro, 0005_alteracao_mantem_reserva, 0006_remove_cnh
-- Cole tudo e clique em Run. Rode UMA vez, em projeto vazio.
-- GERADO por scripts/pg-sql-editor.ts (npm run db:pg:sql). Não edite à mão.
-- ============================================================

-- ---------- 0001_init ----------
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('ATIVO', 'MANUTENCAO', 'INATIVO');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO', 'CANCELADO', 'ALTERACAO_PENDENTE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "matricula" TEXT,
    "telefone" TEXT,
    "setor" TEXT,
    "cargo" TEXT,
    "contato" TEXT,
    "cnh" TEXT,
    "cnhValidade" TIMESTAMP(3),
    "role" "Role" NOT NULL DEFAULT 'USER',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "trocarSenha" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "prefixo" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "lotacao" INTEGER NOT NULL,
    "contrato" TEXT,
    "status" "VehicleStatus" NOT NULL DEFAULT 'ATIVO',
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3) NOT NULL,
    "destino" TEXT NOT NULL,
    "passageiros" INTEGER NOT NULL DEFAULT 1,
    "motorista" TEXT,
    "termoAceitoEm" TIMESTAMP(3),
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDENTE',
    "decididoPorId" TEXT,
    "decididoEm" TIMESTAMP(3),
    "justificativa" TEXT,
    "versaoAnterior" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "bookingId" TEXT,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginTentativa" (
    "chave" TEXT NOT NULL,
    "falhas" INTEGER NOT NULL DEFAULT 0,
    "desde" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoginTentativa_pkey" PRIMARY KEY ("chave")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_matricula_key" ON "User"("matricula");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_prefixo_key" ON "Vehicle"("prefixo");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_placa_key" ON "Vehicle"("placa");

-- CreateIndex
CREATE INDEX "Booking_vehicleId_inicio_fim_idx" ON "Booking"("vehicleId", "inicio", "fim");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "Booking_inicio_idx" ON "Booking"("inicio");

-- CreateIndex
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_lida_idx" ON "Notification"("userId", "lida");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_decididoPorId_fkey" FOREIGN KEY ("decididoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------- 0002_sem_sobreposicao ----------
-- Garante no próprio banco que um veículo não tenha duas reservas APROVADAS no mesmo horário.
-- (O sistema já confere antes de aprovar; esta regra é a última barreira contra duas aprovações simultâneas.)
-- Intervalos que apenas se encostam (fim de uma = início da outra) são permitidos.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking"
  ADD CONSTRAINT "booking_no_overlap"
  EXCLUDE USING gist ("vehicleId" WITH =, tsrange("inicio", "fim") WITH &&)
  WHERE ("status" = 'APROVADO');

-- ---------- 0003_rls ----------
-- Segurança no Supabase: as tabelas do schema "public" ficam expostas pela API REST do Supabase.
-- Ligar o RLS (sem nenhuma política) bloqueia qualquer acesso por essa API (chaves anon/authenticated).
-- O sistema não usa essa API: acessa o banco pelo Prisma, com o usuário dono das tabelas, que não é afetado pelo RLS.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vehicle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Booking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoginTentativa" ENABLE ROW LEVEL SECURITY;

-- ---------- 0004_km_registro ----------
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "kmInicial" INTEGER,
ADD COLUMN "kmFinal" INTEGER;

-- ---------- 0005_alteracao_mantem_reserva ----------
-- Pedido de alteração de uma reserva aprovada: a versão aprovada continua na reserva (e segura o veículo)
-- até o administrador decidir, e o pedido fica em JSON no campo "versaoAnterior". Antes era o contrário:
-- a reserva recebia os dados pedidos e a versão aprovada ia para o JSON, liberando o horário original.

-- 1) Reservas com alteração pendente no formato antigo cujo horário original já foi ocupado por outra:
--    não há como devolver o horário; viram uma solicitação nova (pendente) com os dados pedidos.
WITH original AS (
  SELECT b."id",
         (b."versaoAnterior"::jsonb ->> 'vehicleId') AS "vehicleId",
         ((b."versaoAnterior"::jsonb ->> 'inicio')::timestamptz AT TIME ZONE 'UTC') AS "inicio",
         ((b."versaoAnterior"::jsonb ->> 'fim')::timestamptz AT TIME ZONE 'UTC') AS "fim"
  FROM "Booking" b
  WHERE b."status" = 'ALTERACAO_PENDENTE' AND b."versaoAnterior" IS NOT NULL
)
UPDATE "Booking" SET "status" = 'PENDENTE', "versaoAnterior" = NULL
WHERE "id" IN (
  SELECT o."id" FROM original o
  WHERE EXISTS (
    SELECT 1 FROM "Booking" x
    WHERE x."status" = 'APROVADO' AND x."vehicleId" = o."vehicleId"
      AND tsrange(x."inicio", x."fim") && tsrange(o."inicio", o."fim")
  ) OR EXISTS (
    SELECT 1 FROM original y
    WHERE y."id" <> o."id" AND y."vehicleId" = o."vehicleId"
      AND tsrange(y."inicio", y."fim") && tsrange(o."inicio", o."fim")
  )
);

-- 2) As demais: troca os dados da reserva (o pedido) com o JSON (a versão aprovada).
UPDATE "Booking" SET
  "vehicleId"   = ("versaoAnterior"::jsonb ->> 'vehicleId'),
  "inicio"      = (("versaoAnterior"::jsonb ->> 'inicio')::timestamptz AT TIME ZONE 'UTC'),
  "fim"         = (("versaoAnterior"::jsonb ->> 'fim')::timestamptz AT TIME ZONE 'UTC'),
  "destino"     = ("versaoAnterior"::jsonb ->> 'destino'),
  "passageiros" = ("versaoAnterior"::jsonb ->> 'passageiros')::int,
  "motorista"   = ("versaoAnterior"::jsonb ->> 'motorista'),
  "versaoAnterior" = json_build_object(
    'vehicleId', "vehicleId",
    'inicio', to_char("inicio", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'fim', to_char("fim", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'destino', "destino",
    'passageiros', "passageiros",
    'motorista', "motorista"
  )::text
WHERE "status" = 'ALTERACAO_PENDENTE' AND "versaoAnterior" IS NOT NULL;

-- 3) A trava contra horário sobreposto passa a valer também para reservas com pedido de alteração.
ALTER TABLE "Booking" DROP CONSTRAINT "booking_no_overlap";
ALTER TABLE "Booking"
  ADD CONSTRAINT "booking_no_overlap"
  EXCLUDE USING gist ("vehicleId" WITH =, tsrange("inicio", "fim") WITH &&)
  WHERE ("status" IN ('APROVADO', 'ALTERACAO_PENDENTE'));

-- ---------- 0006_remove_cnh ----------
-- A CNH não é usada pelo sistema: deixa de ser coletada e os dados já guardados são apagados (LGPD: só o necessário).
ALTER TABLE "User" DROP COLUMN "cnh";
ALTER TABLE "User" DROP COLUMN "cnhValidade";

-- ---------- registro das migrações (para o Prisma não aplicar de novo) ----------
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
  (gen_random_uuid()::text, '04a6ffe17595c85992865c0882d12a7e37abfac24bb4dbc7cb8557734745b088', now(), '0001_init', 1),
  (gen_random_uuid()::text, 'd0d30381a5047c9b35dadff17cae2a9fca673353875a0eab5125a5f088667de6', now(), '0002_sem_sobreposicao', 1),
  (gen_random_uuid()::text, '9fd562e798a76e4f5461458f2030e6640dda4fc815755ef6294dfbfad7647106', now(), '0003_rls', 1),
  (gen_random_uuid()::text, '3dbb0a78f16692e286935930d1172ff1c45f1f9e97de9ca05e13341c6187ff0d', now(), '0004_km_registro', 1),
  (gen_random_uuid()::text, 'e1dd19a56de6da62fa71f752a0af4608e58929810e1872efaa3f4a1bae5161bf', now(), '0005_alteracao_mantem_reserva', 1),
  (gen_random_uuid()::text, 'a064ed7f5b236e8a01e85a8f0e400a831375d84bf49af146e17a24a1c53fe912', now(), '0006_remove_cnh', 1);
