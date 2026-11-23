import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const senha = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@exemplo.com" },
    update: {},
    create: { nome: "Administrador", email: "admin@exemplo.com", senhaHash: senha, role: "ADMIN" },
  });
  const senhaUser = await bcrypt.hash("user123", 10);
  await prisma.user.upsert({
    where: { email: "usuario@exemplo.com" },
    update: {},
    create: { nome: "Usuário Teste", email: "usuario@exemplo.com", senhaHash: senhaUser, role: "USER", setor: "Operações" },
  });
  await prisma.vehicle.upsert({
    where: { prefixo: "VTR-01" },
    update: {},
    create: { prefixo: "VTR-01", placa: "ABC1D23", tipo: "Sedan", lotacao: 5 },
  });
}

main().finally(() => prisma.$disconnect());
