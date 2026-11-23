import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Uma conta institucional por unidade (setor/lotação).
const UNIDADES = [
  { email: "compliance@comurg.com.br", setor: "Assessoria de Gestão e Compliance" },
  { email: "assessoria.ia@comurg.com.br", setor: "Assessoria Técnica Jurídica em IA" },
  { email: "licitacao.pesquisa@comurg.com.br", setor: "Licitação — pesquisa de mercado" },
  { email: "licitacao.editais@comurg.com.br", setor: "Licitação — editais e contratos" },
  { email: "gerencia.tecnica@comurg.com.br", setor: "Gerência Técnica Executiva" },
  { email: "suprimentos@comurg.com.br", setor: "Coordenação de Suprimentos (DIROP)" },
  { email: "controle.interno@comurg.com.br", setor: "Controle Interno" },
  { email: "juridico@comurg.com.br", setor: "Jurídico" },
  { email: "dp@comurg.com.br", setor: "Departamento Pessoal" },
];

async function main() {
  // Defina SENHA_INICIAL no ambiente; sem ela, usa um valor provisório de desenvolvimento.
  const senhaHash = await bcrypt.hash(process.env.SENHA_INICIAL ?? "trocar123", 10);
  for (const u of UNIDADES) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { setor: u.setor },
      create: { nome: u.setor, email: u.email, senhaHash, role: "USER", setor: u.setor },
    });
    console.log(`ok  ${u.email}  ->  ${u.setor}`);
  }
}

main().finally(() => prisma.$disconnect());
