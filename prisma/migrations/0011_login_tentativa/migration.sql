-- CreateTable
CREATE TABLE "LoginTentativa" (
    "chave" TEXT NOT NULL PRIMARY KEY,
    "falhas" INTEGER NOT NULL DEFAULT 0,
    "desde" DATETIME NOT NULL
);
