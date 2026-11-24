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

  let msg = "Alteração enviada para aprovação do administrador.";
  const r: Result = await prisma.$transaction(async (tx): Promise<Result> => {
    const atual = await tx.booking.findUnique({ where: { id }, include: { vehicle: true } });
    if (!atual || atual.userId !== u.id) return { erro: "Agendamento não encontrado." };
    if (!podeModificar(atual.status, atual.inicio)) return { erro: "Este agendamento não pode mais ser editado." };
    const pedido = JSON.stringify(snap(d));

    // ainda não aprovada: a própria solicitação é alterada e continua aguardando
    if (atual.status === "PENDENTE") {
      if (JSON.stringify(snap(atual)) === pedido) return { erro: "Nenhuma alteração foi feita." };
      const erro = await validarRegras(tx, u.id, d, id);
      if (erro) return { erro };
      const b = await tx.booking.update({ where: { id }, data: d, include: { vehicle: true } });
      await notificarAdmins(
        tx, id, "ALTERACAO",
        `${u.name} alterou a solicitação de ${atual.vehicle.prefixo}: agora ${b.vehicle.prefixo}, ${fmtDateTime(b.inicio)} a ${fmtDateTime(b.fim)}.`,
      );
      return { id };
    }

    // já aprovada: a reserva aprovada continua valendo (e segurando o veículo) até o administrador decidir;
    // o pedido fica guardado à parte. Voltar aos dados aprovados retira o pedido.
    if (JSON.stringify(snap(atual)) === pedido) {
      if (atual.status === "APROVADO") return { erro: "Nenhuma alteração foi feita." };
      await tx.booking.update({ where: { id }, data: { status: "APROVADO", versaoAnterior: null } });
      await notificarAdmins(tx, id, "ALTERACAO", `${u.name} retirou o pedido de alteração da reserva de ${atual.vehicle.prefixo} (${fmtDateTime(atual.inicio)}).`);
      msg = "Pedido de alteração retirado. A reserva aprovada continua como estava.";
      return { id };
    }
    if (atual.versaoAnterior === pedido) return { erro: "Esta alteração já foi pedida e aguarda o administrador." };
    const erro = await validarRegras(tx, u.id, d, id);
    if (erro) return { erro };
    await tx.booking.update({ where: { id }, data: { status: "ALTERACAO_PENDENTE", versaoAnterior: pedido } });
    const veiculo = d.vehicleId === atual.vehicleId ? atual.vehicle : await tx.vehicle.findUnique({ where: { id: d.vehicleId } });
    await notificarAdmins(
      tx, id, "ALTERACAO",
      `${u.name} pediu alteração da reserva de ${atual.vehicle.prefixo} (${fmtDateTime(atual.inicio)}): ${veiculo?.prefixo ?? "?"}, ${fmtDateTime(d.inicio)} a ${fmtDateTime(d.fim)}.`,
    );
    return { id };
  });

  if ("erro" in r) voltar(back, r);
  revalidatePath(BASE);
  voltar(BASE, { ok: msg });
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
