-- AlterTable
ALTER TABLE "User" ADD COLUMN "trocarSenha" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "User_matricula_key" ON "User"("matricula");
