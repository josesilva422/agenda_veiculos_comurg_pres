"use server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { voltar } from "@/lib/action";
import { validarSenhaForte } from "@/lib/senha";

const PERFIL = "/usuario/perfil";

export async function alterarSenha(fd: FormData) {
  const u = await requireUser();
  const atual = String(fd.get("atual") ?? "");
  const nova = String(fd.get("nova") ?? "");

  const regra = validarSenhaForte(nova);
  if (regra) voltar(PERFIL, { erro: regra });
  if (nova !== String(fd.get("confirmar") ?? "")) voltar(PERFIL, { erro: "A confirmação não confere com a nova senha." });
  if (nova === atual) voltar(PERFIL, { erro: "A nova senha deve ser diferente da atual." });

  const user = await prisma.user.findUnique({ where: { id: u.id } });
  if (!user || !(await bcrypt.compare(atual, user.senhaHash))) voltar(PERFIL, { erro: "Senha atual incorreta." });
  await prisma.user.update({ where: { id: u.id }, data: { senhaHash: await bcrypt.hash(nova, 10), trocarSenha: false } });
  voltar(PERFIL, { ok: "Senha alterada." });
}
