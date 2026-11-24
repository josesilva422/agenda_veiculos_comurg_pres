"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { retornoSeguro, validar, voltar } from "@/lib/action";
import { fmtDateTime } from "@/lib/datetime";
import { AGUARDANDO, ATIVOS, OCUPAM } from "@/lib/status";
import {
  bookingSchema,
  conflitoAprovado,
  ehSobreposicao,
  lerAlteracao,
  MSG_SOBREPOSICAO,
  periodoEmDecisao,
  notificarUsuario,
  validarRegras,
  type Result,
  type Tx,
} from "@/lib/booking-service";

const PAINEL = "/admin";
const LISTA = "/admin/agendamentos";
/** Páginas de onde o pop-up de decisão pode ser aberto (e para onde a ação volta). */
const ORIGENS = [PAINEL, LISTA, "/admin/calendario"];

function refresh() {
  revalidatePath(PAINEL);
  revalidatePath(LISTA);
  revalidatePath("/admin/calendario");
  revalidatePath("/usuario/agendamentos");
}

/** Duas aprovações simultâneas: o banco recusa a segunda; vira mensagem em vez de erro genérico. */
function semSobreposicao(e: unknown): string {
  if (ehSobreposicao(e)) return MSG_SOBREPOSICAO;
  throw e;
}
function semSobreposicaoR(e: unknown): Result {
  return { erro: semSobreposicao(e) };
}

/**
 * Aprova uma solicitação (dentro de uma transação). Retorna erro ou null.
 * Pedido de alteração: os dados pedidos passam a valer na reserva.
 */
async function aprovarUma(tx: Tx, id: string, adminId: string): Promise<string | null> {
  const b = await tx.booking.findUnique({ where: { id } });
  if (!b) return "Agendamento não encontrado.";
  if (!AGUARDANDO.includes(b.status)) return "Esta solicitação já foi decidida.";
  const alteracao = lerAlteracao(b);
  if (b.status === "ALTERACAO_PENDENTE" && !alteracao) return "Não foi possível ler o pedido de alteração. Rejeite-o e peça ao solicitante para refazer.";
  const novo = alteracao ?? b;
  const vehicle = await tx.vehicle.findUnique({ where: { id: novo.vehicleId } });
  if (!vehicle || vehicle.status !== "ATIVO") return `Veículo ${vehicle?.prefixo ?? "escolhido"} indisponível.`;
  if (novo.fim <= new Date()) return "O período desta solicitação já terminou.";
  const c = await conflitoAprovado(tx, novo.vehicleId, novo.inicio, novo.fim, id);
  if (c) return `Conflito com reserva aprovada de ${fmtDateTime(c.inicio)} a ${fmtDateTime(c.fim)}.`;

  const dados = alteracao
    ? { vehicleId: alteracao.vehicleId, inicio: alteracao.inicio, fim: alteracao.fim, destino: alteracao.destino, passageiros: alteracao.passageiros, motorista: alteracao.motorista }
    : {};
  await tx.booking.update({
    where: { id },
    data: { ...dados, status: "APROVADO", decididoPorId: adminId, decididoEm: new Date(), justificativa: null, versaoAnterior: null },
  });
  await notificarUsuario(
    tx, b.userId, id, "APROVADO",
    `${alteracao ? "Alteração aprovada" : "Solicitação aprovada"}: ${vehicle.prefixo}, ${fmtDateTime(novo.inicio)} a ${fmtDateTime(novo.fim)}.`,
  );
  return null;
}

async function rejeitarUma(tx: Tx, id: string, adminId: string, motivo: string): Promise<string | null> {
  const b = await tx.booking.findUnique({ where: { id }, include: { vehicle: true } });
  if (!b) return "Agendamento não encontrado.";
  const decisao = { decididoPorId: adminId, decididoEm: new Date() };

  if (b.status === "PENDENTE") {
    await tx.booking.update({ where: { id }, data: { status: "REJEITADO", justificativa: motivo, ...decisao } });
    await notificarUsuario(tx, b.userId, id, "REJEITADO", `Solicitação rejeitada (${b.vehicle.prefixo}, ${fmtDateTime(b.inicio)}). Motivo: ${motivo}`);
    return null;
  }

  if (b.status === "ALTERACAO_PENDENTE") {
    // a reserva já está com os dados aprovados: basta descartar o pedido de alteração
    await tx.booking.update({
      where: { id },
      data: { status: "APROVADO", justificativa: `Alteração rejeitada: ${motivo}`, versaoAnterior: null, ...decisao },
    });
    await notificarUsuario(tx, b.userId, id, "ALTERACAO_REJEITADA", `Alteração rejeitada; a reserva original foi mantida. Motivo: ${motivo}`);
    return null;
  }
  return "Esta solicitação já foi decidida.";
}

export async function aprovar(id: string, fd?: FormData) {
  const admin = await requireAdmin();
  const retorno = fd ? retornoSeguro(fd, ORIGENS) : null;
  const erro = await prisma.$transaction((tx) => aprovarUma(tx, id, admin.id)).catch(semSobreposicao);
  refresh();
  if (erro) voltar(retorno ? `${retorno}?decidir=${id}` : `${LISTA}/${id}`, { erro });
  voltar(retorno ?? PAINEL, { ok: "Solicitação aprovada." });
}

/** Erro de regra de negócio dentro de uma transação: desfaz tudo e vira mensagem para o administrador. */
class ErroNegocio extends Error {}

/**
 * Cancela a(s) reserva(s) APROVADA(s) que conflitam com a solicitação e aprova a solicitação, tudo numa transação:
 * se a aprovação falhar por qualquer motivo, nenhum cancelamento é mantido. Os donos das reservas canceladas são avisados.
 */
export async function substituirEAprovar(id: string, fd: FormData) {
  const admin = await requireAdmin();
  const retorno = retornoSeguro(fd, ORIGENS);
  const back = retorno ? `${retorno}?decidir=${id}` : `${LISTA}/${id}`;
  if (fd.get("confirmo") !== "on") voltar(back, { erro: "Marque a confirmação para cancelar a(s) reserva(s) em conflito." });
  const motivo = String(fd.get("justificativa") ?? "").trim().slice(0, 300) || null;

  let canceladas = 0;
  const erro = await prisma
    .$transaction(async (tx): Promise<string | null> => {
      const b = await tx.booking.findUnique({ where: { id } });
      if (!b) throw new ErroNegocio("Agendamento não encontrado.");
      if (!AGUARDANDO.includes(b.status)) throw new ErroNegocio("Esta solicitação já foi decidida.");
      const p = periodoEmDecisao(b);
      const conflitos = await tx.booking.findMany({
        where: { vehicleId: p.vehicleId, status: { in: OCUPAM }, id: { not: id }, inicio: { lt: p.fim }, fim: { gt: p.inicio } },
        include: { vehicle: true },
      });
      if (conflitos.length === 0) throw new ErroNegocio("Não há mais reserva em conflito: use Aprovar.");
      for (const c of conflitos) {
        await tx.booking.update({
          where: { id: c.id },
          data: {
            status: "CANCELADO",
            justificativa: motivo ?? "Substituída por outra solicitação aprovada.",
            decididoPorId: admin.id,
            decididoEm: new Date(),
            versaoAnterior: null,
          },
        });
        await notificarUsuario(
          tx, c.userId, c.id, "CANCELADO",
          `Sua reserva de ${c.vehicle.prefixo} (${fmtDateTime(c.inicio)} a ${fmtDateTime(c.fim)}) foi cancelada pelo administrador para atender outra solicitação.${motivo ? ` Motivo: ${motivo}` : ""}`,
        );
      }
      canceladas = conflitos.length;
      const e = await aprovarUma(tx, id, admin.id);
      if (e) throw new ErroNegocio(e);
      return null;
    })
    .catch((e) => {
      if (e instanceof ErroNegocio) return e.message;
      return semSobreposicao(e);
    });
  refresh();
  if (erro) voltar(back, { erro });
  voltar(retorno ?? PAINEL, {
    ok: `Solicitação aprovada. ${canceladas === 1 ? "A reserva em conflito foi cancelada" : `${canceladas} reservas em conflito foram canceladas`} e o solicitante foi avisado.`,
  });
}

export async function aprovarLote(fd: FormData) {
  const admin = await requireAdmin();
  const ids = fd.getAll("ids").map(String);
  if (ids.length === 0) voltar(PAINEL, { erro: "Selecione ao menos uma solicitação." });
  const falhas: string[] = [];
  for (const id of ids) {
    const erro = await prisma.$transaction((tx) => aprovarUma(tx, id, admin.id)).catch(semSobreposicao);
    if (erro) falhas.push(erro);
  }
  refresh();
  voltar(PAINEL, {
    ok: `${ids.length - falhas.length} aprovada(s).`,
    erro: falhas.length ? `${falhas.length} não aprovada(s): ${falhas[0]}` : undefined,
  });
}

const motivoSchema = z.object({ justificativa: z.string().trim().min(3, "Informe a justificativa.").max(300) });

export async function rejeitar(id: string, fd: FormData) {
  const admin = await requireAdmin();
  const retorno = retornoSeguro(fd, ORIGENS);
  const back = retorno ? `${retorno}?decidir=${id}` : `${LISTA}/${id}`;
  const { justificativa } = validar(motivoSchema, fd, back);
  const erro = await prisma.$transaction((tx) => rejeitarUma(tx, id, admin.id, justificativa));
  refresh();
  if (erro) voltar(back, { erro });
  voltar(retorno ?? PAINEL, { ok: "Solicitação rejeitada." });
}

export async function cancelarPeloAdmin(id: string, fd: FormData) {
  const admin = await requireAdmin();
  const retorno = retornoSeguro(fd, ORIGENS);
  const motivo = String(fd.get("justificativa") ?? "").trim().slice(0, 300) || null;
  const erro = await prisma.$transaction(async (tx): Promise<string | null> => {
    const b = await tx.booking.findUnique({ where: { id }, include: { vehicle: true } });
    if (!b) return "Agendamento não encontrado.";
    if (!ATIVOS.includes(b.status)) return "Este agendamento não está ativo.";
    await tx.booking.update({
      where: { id },
      data: { status: "CANCELADO", justificativa: motivo, decididoPorId: admin.id, decididoEm: new Date(), versaoAnterior: null },
    });
    await notificarUsuario(
      tx, b.userId, id, "CANCELADO",
      `Sua reserva de ${b.vehicle.prefixo} (${fmtDateTime(b.inicio)}) foi cancelada pelo administrador.${motivo ? ` Motivo: ${motivo}` : ""}`,
    );
    return null;
  });
  refresh();
  if (erro) voltar(retorno ? `${retorno}?decidir=${id}` : `${LISTA}/${id}`, { erro });
  voltar(retorno ?? LISTA, { ok: "Agendamento cancelado." });
}

const adminBookingSchema = bookingSchema.extend({ userId: z.string().min(1, "Selecione o solicitante.") });

/** Admin cria um agendamento em nome de um usuário; já nasce aprovado. Pode ser uso em andamento ou que já aconteceu. */
export async function criarPeloAdmin(fd: FormData) {
  const admin = await requireAdmin();
  // vindo do pop-up, volta para a página de origem (com o pop-up aberto se der erro)
  const retorno = retornoSeguro(fd, ["/admin/calendario", LISTA]);
  const back = retorno ? `${retorno}?novo=1` : `${LISTA}/novo`;
  const { userId, ...d } = validar(adminBookingSchema, fd, back);

  const r: Result = await prisma.$transaction(async (tx): Promise<Result> => {
    const erro = await validarRegras(tx, userId, d, undefined, true);
    if (erro) return { erro };
    const b = await tx.booking.create({
      data: { ...d, userId, status: "APROVADO", decididoPorId: admin.id, decididoEm: new Date() },
      include: { vehicle: true },
    });
    await notificarUsuario(
      tx, userId, b.id, "APROVADO",
      `O administrador agendou ${b.vehicle.prefixo} para você: ${fmtDateTime(b.inicio)} a ${fmtDateTime(b.fim)}.`,
    );
    return { id: b.id };
  }).catch((e): Result => semSobreposicaoR(e));
  if ("erro" in r) voltar(back, r);
  refresh();
  voltar(retorno ?? `${LISTA}/${r.id}`, { ok: "Agendamento criado e aprovado." });
}

/** Admin edita dados de um agendamento ativo; o status é mantido e o solicitante é avisado. */
export async function editarPeloAdmin(id: string, fd: FormData) {
  await requireAdmin();
  const back = `${LISTA}/${id}/editar`;
  const d = validar(bookingSchema, fd, back);

  const r: Result = await prisma.$transaction(async (tx): Promise<Result> => {
    const atual = await tx.booking.findUnique({ where: { id } });
    if (!atual) return { erro: "Agendamento não encontrado." };
    if (!ATIVOS.includes(atual.status)) return { erro: "Este agendamento não está ativo." };
    const erro = await validarRegras(tx, atual.userId, d, id, true);
    if (erro) return { erro };
    const b = await tx.booking.update({ where: { id }, data: d, include: { vehicle: true } });
    await notificarUsuario(
      tx, atual.userId, id, "EDITADO_ADMIN",
      `O administrador alterou sua reserva: ${b.vehicle.prefixo}, ${fmtDateTime(b.inicio)} a ${fmtDateTime(b.fim)}.`,
    );
    return { id };
  }).catch((e): Result => semSobreposicaoR(e));
  if ("erro" in r) voltar(back, r);
  refresh();
  voltar(`${LISTA}/${id}`, { ok: "Agendamento atualizado." });
}
