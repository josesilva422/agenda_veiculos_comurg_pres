-- Atualização 0005_alteracao_mantem_reserva para um banco Supabase que já existe. Cole no SQL Editor e clique em Run, UMA vez.
-- GERADO por scripts/pg-sql-editor.ts (npm run db:pg:sql).

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

-- registro para o Prisma não aplicar de novo
INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "applied_steps_count") VALUES
  (gen_random_uuid()::text, 'e1dd19a56de6da62fa71f752a0af4608e58929810e1872efaa3f4a1bae5161bf', now(), '0005_alteracao_mantem_reserva', 1);
