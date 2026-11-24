import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PESSOAS } from "./dados";

// recusa rodar contra qualquer banco que não seja o de testes
const url = process.env.DATABASE_URL ?? "";
const bancoDeTestes = url === "file:./e2e.db" || (process.env.E2E_BANCO === "postgres" && url.includes("127.0.0.1:5433"));
if (!bancoDeTestes) throw new Error("Este seed só roda no banco de testes (SQLite file:./e2e.db ou o PGlite local da porta 5433).");

const prisma = new PrismaClient();

async function main() {
  for (const p of Object.values(PESSOAS)) {
    await prisma.user.create({
      data: {
        nome: p.nome, email: p.email, matricula: p.matricula, senhaHash: await bcrypt.hash(p.senha, 10),
        role: p.role, telefone: "62999990000", cargo: "Analista", setor: p.setor, contato: "ramal 100", trocarSenha: false,
      },
    });
  }
  await prisma.vehicle.create({ data: { prefixo: "VTR-E2E", placa: "EEE1E11", tipo: "Sedan de teste", lotacao: 4 } });
  await prisma.vehicle.create({ data: { prefixo: "VTR-E2F", placa: "EEF2F22", tipo: "Van de teste", lotacao: 9 } });
  console.log("banco de testes pronto");
}

main().finally(() => prisma.$disconnect());
