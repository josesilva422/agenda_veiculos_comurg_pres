"use server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { duplicado, retornoSeguro, validar, voltar } from "@/lib/action";
import { gerarSenhaProvisoria } from "@/lib/senha";
import { userSchema } from "@/lib/validation";
import { ATIVOS } from "@/lib/status";
import { COOKIE_SENHA_PROVISORIA } from "./senha-provisoria";

const LISTA = "/admin/usuarios";
const editar = (id: string) => `${LISTA}?editar=${id}`;

/** Senha provisória aleatória e o código (hash) que vai para o banco. */
async function novaSenhaProvisoria() {
  const senha = gerarSenhaProvisoria();
  return { senha, senhaHash: await bcrypt.hash(senha, 10) };
}

/**
 * Guarda o texto da senha provisória num cookie de curta duração, só no navegador do administrador,
 * para a tela mostrá-la. Nunca vai na URL nem fica gravado em texto no banco.
 */
async function mostrarSenhaProvisoria(userId: string, senha: string) {
  (await cookies()).set(COOKIE_SENHA_PROVISORIA, JSON.stringify({ userId, senha }), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: LISTA,
    maxAge: 120,
  });
}

/** Cria (id nulo) ou atualiza um usuário. Novo usuário recebe uma senha provisória aleatória. */
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
    if (id) {
      await prisma.user.update({ where: { id }, data: dados });
    } else {
      const { senha, senhaHash } = await novaSenhaProvisoria();
      salvoId = (await prisma.user.create({ data: { ...dados, senhaHash, trocarSenha: true } })).id;
      await mostrarSenhaProvisoria(salvoId, senha);
    }
  } catch (e) {
    if (!duplicado(e)) throw e;
    const campo = String((e as { meta?: { target?: unknown } }).meta?.target ?? "");
    voltar(back, { erro: campo.includes("matricula") ? "Já existe um usuário com esta matrícula." : "Já existe um usuário com este e-mail." });
  }
  revalidatePath(LISTA);
  // cadastro: abre a edição do novo usuário, que mostra a senha provisória para o administrador entregar
  if (!id) voltar(editar(salvoId!), { ok: "Usuário criado. Entregue a senha provisória abaixo; ele vai trocá-la no primeiro acesso." });
  voltar(retorno ?? editar(id), { ok: "Dados atualizados." });
}

/** Gera uma nova senha provisória para o usuário (esqueceu a senha); ele terá de trocá-la no próximo acesso. */
export async function redefinirSenha(id: string) {
  const admin = await requireAdmin();
  if (id === admin.id) voltar(editar(id), { erro: "Para a sua própria senha, use Meu perfil." });
  if (!(await prisma.user.findUnique({ where: { id }, select: { id: true } }))) voltar(LISTA);
  // a senha nova também derruba as sessões abertas desse usuário (veja getSession)
  const { senha, senhaHash } = await novaSenhaProvisoria();
  await prisma.user.update({ where: { id }, data: { senhaHash, trocarSenha: true } });
  await mostrarSenhaProvisoria(id, senha);
  voltar(editar(id), { ok: "Nova senha provisória gerada. Entregue-a ao usuário; ele vai trocá-la no próximo acesso." });
}

/**
 * Desativa ou reativa um usuário. Ao desativar, as reservas dele que ainda não começaram são canceladas
 * (liberando os veículos); as que já estão em andamento continuam até o fim.
 */
export async function toggleUserAtivo(id: string) {
  const admin = await requireAdmin();
  if (id === admin.id) voltar(LISTA, { erro: "Você não pode desativar a si mesmo." });
  const u = await prisma.user.findUnique({ where: { id } });
  if (!u) voltar(LISTA);
  if (!u.ativo) {
    await prisma.user.update({ where: { id }, data: { ativo: true } });
    revalidatePath(LISTA);
    voltar(LISTA, { ok: "Usuário reativado." });
  }
  const canceladas = await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id }, data: { ativo: false } });
    const r = await tx.booking.updateMany({
      where: { userId: id, status: { in: ATIVOS }, inicio: { gt: new Date() } },
      data: {
        status: "CANCELADO",
        justificativa: "Cancelada porque o usuário foi desativado.",
        decididoPorId: admin.id,
        decididoEm: new Date(),
        versaoAnterior: null,
      },
    });
    return r.count;
  });
  revalidatePath(LISTA);
  revalidatePath("/admin");
  revalidatePath("/admin/agendamentos");
  voltar(LISTA, {
    ok: canceladas
      ? `Usuário desativado. ${canceladas === 1 ? "1 reserva futura foi cancelada" : `${canceladas} reservas futuras foram canceladas`} e o veículo liberado.`
      : "Usuário desativado.",
  });
}
