"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { retornoSeguro, validar, voltar } from "@/lib/action";
import { fmtDateTime } from "@/lib/datetime";
import { podeModificar } from "@/lib/booking-rules";
import { bookingSchema, notificarAdmins, snap, validarRegras, type Result } from "@/lib/booking-service";

const BASE = "/usuario/agendamentos";

export async function criarAgendamento(fd: FormData) {
  const u = await requireUser();
  // vindo do pop-up, volta para a página de origem (com o pop-up aberto se der erro)
  const retorno = retornoSeguro(fd, ["/usuario", BASE]);
  const back = retorno ? `${retorno}?novo=1` : `${BASE}/novo`;
  if (fd.get("aceiteTermo") !== "on") voltar(back, { erro: "Marque que concorda com o Termo de Responsabilidade." });
  const d = validar(bookingSchema, fd, back);

  const r: Result = await prisma.$transaction(async (tx): Promise<Result> => {
    const erro = await validarRegras(tx, u.id, d);
    if (erro) return { erro };
    const b = await tx.booking.create({ data: { ...d, userId: u.id, termoAceitoEm: new Date() }, include: { vehicle: true } });
    await notificarAdmins(
      tx, b.id, "NOVA_SOLICITACAO",
      `${u.name} solicitou ${b.vehicle.prefixo} de ${fmtDateTime(b.inicio)} a ${fmtDateTime(b.fim)}.`,
    );
    return { id: b.id };
  });

  if ("erro" in r) voltar(back, r);
  revalidatePath(BASE);
  revalidatePath("/usuario");
  voltar(retorno ?? BASE, { ok: "Solicitação enviada. Aguarde a aprovação do administrador." });
}

export async function editarAgendamento(id: string, fd: FormData) {
  const u = await requireUser();
  const back = `${BASE}/${id}`;
  const d = validar(bookingSchema, fd, back);

  const r: Result = await prisma.$transaction(async (tx): Promise<Result> => {
    const atual = await tx.booking.findUnique({ where: { id }, include: { vehicle: true } });
    if (!atual || atual.userId !== u.id) return { erro: "Agendamento não encontrado." };
    if (!podeModificar(atual.status, atual.inicio)) return { erro: "Este agendamento não pode mais ser editado." };
    if (JSON.stringify(snap(atual)) === JSON.stringify(snap(d))) return { erro: "Nenhuma alteração foi feita." };

    const erro = await validarRegras(tx, u.id, d, id);
    if (erro) return { erro };

    // guarda a última versão aprovada (só uma vez) para poder desfazer se o admin rejeitar a alteração
    const versaoAnterior =
      atual.status === "APROVADO"
        ? JSON.stringify(snap(atual))
        : atual.status === "ALTERACAO_PENDENTE"
          ? atual.versaoAnterior
          : null;
    const b = await tx.booking.update({
      where: { id },
      data: {
        ...d,
        status: atual.status === "PENDENTE" ? "PENDENTE" : "ALTERACAO_PENDENTE",
        decididoPorId: null, decididoEm: null, justificativa: null, versaoAnterior,
      },
      include: { vehicle: true },
    });
    await notificarAdmins(
      tx, id, "ALTERACAO",
      `${u.name} alterou a solicitação de ${atual.vehicle.prefixo}: agora ${b.vehicle.prefixo}, ${fmtDateTime(b.inicio)} a ${fmtDateTime(b.fim)}.`,
    );
    return { id };
  });

  if ("erro" in r) voltar(back, r);
  revalidatePath(BASE);
  voltar(BASE, { ok: "Alteração enviada para aprovação do administrador." });
}

export async function cancelarAgendamento(id: string) {
  const u = await requireUser();
  const r: Result = await prisma.$transaction(async (tx): Promise<Result> => {
    const b = await tx.booking.findUnique({ where: { id }, include: { vehicle: true } });
    if (!b || b.userId !== u.id) return { erro: "Agendamento não encontrado." };
    if (!podeModificar(b.status, b.inicio)) return { erro: "Este agendamento não pode mais ser cancelado." };
    await tx.booking.update({ where: { id }, data: { status: "CANCELADO", versaoAnterior: null } });
    await notificarAdmins(
      tx, id, "CANCELAMENTO",
      `${u.name} cancelou a reserva de ${b.vehicle.prefixo} (${fmtDateTime(b.inicio)} a ${fmtDateTime(b.fim)}).`,
    );
    return { id };
  });
  revalidatePath(BASE);
  if ("erro" in r) voltar(BASE, r);
  voltar(BASE, { ok: "Agendamento cancelado." });
}
