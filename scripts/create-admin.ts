/**
 * Cria o primeiro administrador (uso em produção; o seed de desenvolvimento NÃO deve ser usado lá).
 *   ADMIN_NAME="Fulano" ADMIN_EMAIL=fulano@empresa.com ADMIN_PASSWORD='senha-forte-aqui' npm run admin:create
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const nome = process.env.ADMIN_NAME?.trim() || "Administrador";
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const senha = process.env.ADMIN_PASSWORD ?? "";

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error("Defina ADMIN_EMAIL com um e-mail válido.");
  if (senha.length < 10) throw new Error("ADMIN_PASSWORD deve ter ao menos 10 caracteres.");
  if (await prisma.user.findUnique({ where: { email } })) throw new Error(`Já existe um usuário com o e-mail ${email}.`);

  await prisma.user.create({
    data: { nome, email, senhaHash: await bcrypt.hash(senha, 12), role: "ADMIN" },
  });
  console.log(`Administrador criado: ${email}`);
}

main()
  .catch((e) => {
    console.error(`Erro: ${e instanceof Error ? e.message : e}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
