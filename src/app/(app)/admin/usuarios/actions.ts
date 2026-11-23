"use server";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { duplicado, retornoSeguro, validar, voltar } from "@/lib/action";
import { SENHA_PADRAO } from "@/lib/senha";
import { userSchema } from "@/lib/validation";

const LISTA = "/admin/usuarios";

/** Cria (id nulo) ou atualiza um usuário. Novo usuário nasce com a senha padrão e troca no primeiro acesso. */
export async function salvarUsuario(id: string | null, fd: FormData) {
  const admin = await requireAdmin();
  // vindo do pop-up de cadastro/edição, volta para a lista (com o pop-up aberto se der erro)
  const retorno = retornoSeguro(fd, [LISTA]);
  const back = retorno ? `${LISTA}?${id ? `editar=${id}` : "novo=1"}` : `${LISTA}/${id ?? "novo"}`;
  const dados = validar(userSchema, fd, back);
  if (id === admin.id && dados.role !== "ADMIN") {
    voltar(back, { erro: "Você não pode remover seu próprio perfil de administrador." });
  }
  let salvoId = id;
  try {
    if (id) await prisma.user.update({ where: { id }, data: dados });
    else {
      const senhaHash = await bcrypt.hash(SENHA_PADRAO, 10);
      salvoId = (await prisma.user.create({ data: { ...dados, senhaHash, trocarSenha: true } })).id;
    }
  } catch (e) {
    if (!duplicado(e)) throw e;
    const campo = String((e as { meta?: { target?: unknown } }).meta?.target ?? "");
    voltar(back, { erro: campo.includes("matricula") ? "Já existe um usuário com esta matrícula." : "Já existe um usuário com este e-mail." });
  }
  revalidatePath(LISTA);
  voltar(retorno ?? `${LISTA}/${salvoId}`, { ok: id ? "Dados atualizados." : "Usuário criado. Senha inicial: a senha padrão." });
}

/** Volta a senha do usuário para a senha padrão; ele terá de trocá-la no próximo acesso. */
export async function redefinirSenha(id: string, fd: FormData) {
  const admin = await requireAdmin();
  const retorno = retornoSeguro(fd, [LISTA]);
  const back = retorno ? `${LISTA}?editar=${id}` : `${LISTA}/${id}`;
  if (id === admin.id) voltar(back, { erro: "Para a sua própria senha, use Meu perfil." });
  if (!(await prisma.user.findUnique({ where: { id } }))) voltar(LISTA);
  await prisma.user.update({ where: { id }, data: { senhaHash: await bcrypt.hash(SENHA_PADRAO, 10), trocarSenha: true } });
  voltar(retorno ?? back, { ok: "Senha redefinida para a senha padrão. O usuário deve trocá-la no próximo acesso." });
}

export async function toggleUserAtivo(id: string) {
  const admin = await requireAdmin();
  if (id === admin.id) voltar(LISTA, { erro: "Você não pode desativar a si mesmo." });
  const u = await prisma.user.findUnique({ where: { id } });
  if (!u) voltar(LISTA);
  await prisma.user.update({ where: { id }, data: { ativo: !u.ativo } });
  revalidatePath(LISTA);
  voltar(LISTA, { ok: u.ativo ? "Usuário desativado." : "Usuário reativado." });
}
