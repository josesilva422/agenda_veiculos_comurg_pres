"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { retornoSeguro, validar, voltar } from "@/lib/action";
import { fmtDateTime } from "@/lib/datetime";
import { AGUARDANDO, ATIVOS } from "@/lib/status";
import {
  bookingSchema,
  conflitoAprovado,
  ehSobreposicao,
  lerSnap,
  MSG_SOBREPOSICAO,
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

/** Aprova uma solicitação (dentro de uma transação). Retorna erro ou null. */
async function aprovarUma(tx: Tx, id: string, adminId: string): Promise<string | null> {
  const b = await tx.booking.findUnique({ where: { id }, include: { vehicle: true } });
  if (!b) return "Agendamento não encontrado.";
  if (!AGUARDANDO.includes(b.status)) return "Esta solicitação já foi decidida.";
  if (b.vehicle.status !== "ATIVO") return `Veículo ${b.vehicle.prefixo} indisponível.`;
  if (b.fim <= new Date()) return "O período desta solicitação já terminou.";
  const c = await conflitoAprovado(tx, b.vehicleId, b.inicio, b.fim, id);
  if (c) return `Conflito com reserva aprovada de ${fmtDateTime(c.inicio)} a ${fmtDateTime(c.fim)}.`;

  const eraAlteracao = b.status === "ALTERACAO_PENDENTE";
  await tx.booking.update({
    where: { id },
    data: { status: "APROVADO", decididoPorId: adminId, decididoEm: new Date(), justificativa: null, versaoAnterior: null },
  });
  await notificarUsuario(
    tx, b.userId, id, "APROVADO",
    `${eraAlteracao ? "Alteração aprovada" : "Solicitação aprovada"}: ${b.vehicle.prefixo}, ${fmtDateTime(b.inicio)} a ${fmtDateTime(b.fim)}.`,
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
    // volta para a última versão aprovada, guardada na própria reserva
    const anterior = lerSnap(b.versaoAnterior);
    if (!anterior) return "Não foi possível localizar a versão aprovada anterior. Cancele a reserva em vez de rejeitar.";
    const original = {
      vehicleId: anterior.vehicleId, destino: anterior.destino, passageiros: anterior.passageiros, motorista: anterior.motorista ?? null,
      inicio: new Date(anterior.inicio), fim: new Date(anterior.fim),
    };
    const c = await conflitoAprovado(tx, original.vehicleId, original.inicio, original.fim, id);
    if (c) return "O horário original já foi ocupado por outra reserva aprovada. Cancele esta reserva em vez de rejeitar a alteração.";
    await tx.booking.update({
      where: { id },
      data: { ...original, status: "APROVADO", justificativa: `Alteração rejeitada: ${motivo}`, versaoAnterior: null, ...decisao },
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

/** Admin cria um agendamento em nome de um usuário; já nasce aprovado. */
export async function criarPeloAdmin(fd: FormData) {
  const admin = await requireAdmin();
  // vindo do pop-up, volta para a página de origem (com o pop-up aberto se der erro)
  const retorno = retornoSeguro(fd, ["/admin/calendario", LISTA]);
  const back = retorno ? `${retorno}?novo=1` : `${LISTA}/novo`;
  const { userId, ...d } = validar(adminBookingSchema, fd, back);

  const r: Result = await prisma.$transaction(async (tx): Promise<Result> => {
    const erro = await validarRegras(tx, userId, d);
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
    const erro = await validarRegras(tx, atual.userId, d, id);
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
