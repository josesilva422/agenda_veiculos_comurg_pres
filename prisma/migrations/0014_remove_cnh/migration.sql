-- A CNH não é usada pelo sistema: deixa de ser coletada e os dados já guardados são apagados (LGPD: só o necessário).
ALTER TABLE "User" DROP COLUMN "cnh";
ALTER TABLE "User" DROP COLUMN "cnhValidade";
