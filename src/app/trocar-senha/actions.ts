"use server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { SENHA_PADRAO, validarSenhaForte } from "@/lib/senha";

/** Define a nova senha no primeiro acesso. A tela faz logout em seguida para o usuário entrar com a nova. */
export async function definirNovaSenha(fd: FormData): Promise<{ erro?: string }> {
  const u = await requireUser({ permitirTrocaSenha: true });
  const nova = String(fd.get("nova") ?? "");
  const confirmar = String(fd.get("confirmar") ?? "");

  const regra = validarSenhaForte(nova);
  if (regra) return { erro: regra };
  if (nova !== confirmar) return { erro: "A confirmação não confere com a nova senha." };
  if (nova === SENHA_PADRAO) return { erro: "Escolha uma senha diferente da senha padrão." };

  await prisma.user.update({ where: { id: u.id }, data: { senhaHash: await bcrypt.hash(nova, 10), trocarSenha: false } });
  return {};
}
