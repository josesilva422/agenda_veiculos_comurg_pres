-- ============================================================
-- Agendamento de Veículos — banco completo para o SQL Editor do Supabase
-- Migrações incluídas: 0001_init, 0002_sem_sobreposicao, 0003_rls
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
  (gen_random_uuid()::text, '9fd562e798a76e4f5461458f2030e6640dda4fc815755ef6294dfbfad7647106', now(), '0003_rls', 1);
