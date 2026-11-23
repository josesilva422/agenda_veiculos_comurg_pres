-- Garante no próprio banco que um veículo não tenha duas reservas APROVADAS no mesmo horário.
-- (O sistema já confere antes de aprovar; esta regra é a última barreira contra duas aprovações simultâneas.)
-- Intervalos que apenas se encostam (fim de uma = início da outra) são permitidos.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking"
  ADD CONSTRAINT "booking_no_overlap"
  EXCLUDE USING gist ("vehicleId" WITH =, tsrange("inicio", "fim") WITH &&)
  WHERE ("status" = 'APROVADO');
