"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { retornoSeguro, voltar } from "@/lib/action";
import { fmtDateTime } from "@/lib/datetime";
import { referenciasKm, validarKm } from "@/lib/km";
import { notificarUsuario } from "@/lib/booking-service";

const ORIGENS = ["/usuario/agendamentos", "/admin", "/admin/agendamentos", "/admin/calendario"];

/** Campo opcional de km: vazio = não informado (null); texto não numérico = NaN (a validação recusa). */
function lerKm(fd: FormData, nome: string): number | null {
  const v = String(fd.get(nome) ?? "").trim();
  if (v === "") return null;
  return /^\d+$/.test(v) ? Number(v) : Number.NaN;
}

/**
 * Registra a quilometragem de um agendamento aprovado.
 * - O solicitante informa a dele (inicial a qualquer momento depois da aprovação; final só depois do início do uso),
 *   com conferência contra as reservas vizinhas do mesmo veículo. Campo em branco mantém o valor já registrado.
 * - O administrador pode incluir ou corrigir qualquer reserva ativa (campo em branco apaga) e o solicitante é avisado.
 */
export async function registrarKm(id: string, fd: FormData) {
  const u = await requireUser();
  const admin = u.role === "ADMIN";
  const retorno = retornoSeguro(fd, ORIGENS);
  const padrao = admin ? "/admin/agendamentos" : "/usuario/agendamentos";
  // erro: volta para o pop-up certo (o administrador usa o de decisão; o solicitante, o de km)
  const back = `${retorno ?? padrao}?${admin ? "decidir" : "km"}=${id}`;
  const fim = retorno ?? padrao;

  const b = await prisma.booking.findUnique({ where: { id }, include: { vehicle: true } });
  if (!b || (!admin && b.userId !== u.id)) voltar(fim, { erro: "Agendamento não encontrado." });
  if (admin ? !["APROVADO", "ALTERACAO_PENDENTE"].includes(b.status) : b.status !== "APROVADO") {
    voltar(fim, { erro: "A quilometragem só é registrada em reservas aprovadas." });
  }

  const novoInicial = lerKm(fd, "kmInicial");
  const novoFinal = lerKm(fd, "kmFinal");
  if (!admin && novoInicial === null && novoFinal === null) voltar(back, { erro: "Informe o km inicial ou o km final." });

  // solicitante: em branco mantém; administrador: o formulário é a verdade (em branco apaga)
  const kmInicial = admin ? novoInicial : (novoInicial ?? b.kmInicial);
  const kmFinal = admin ? novoFinal : (novoFinal ?? b.kmFinal);

  if (!admin && novoFinal !== null && b.inicio > new Date()) {
    voltar(back, { erro: "O km final só pode ser informado depois do início do uso do veículo." });
  }
  if (!admin && kmFinal !== null && kmInicial === null) {
    voltar(back, { erro: "Informe também o km inicial: o km final precisa dele para ser conferido." });
  }

  const ref = await referenciasKm(prisma, b);
  const erro = validarKm({ kmInicial, kmFinal, ...ref, conferirVizinhos: !admin });
  if (erro) voltar(back, { erro });

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({ where: { id }, data: { kmInicial, kmFinal } });
    if (admin && b.userId !== u.id) {
      await notificarUsuario(
        tx, b.userId, id, "KM_AJUSTADO",
        `O administrador ajustou a quilometragem da sua reserva de ${b.vehicle.prefixo} (${fmtDateTime(b.inicio)}).`,
      );
    }
  });
  revalidatePath("/usuario/agendamentos");
  revalidatePath("/admin");
  revalidatePath("/admin/agendamentos");
  revalidatePath("/", "layout");
  voltar(fim, { ok: "Quilometragem registrada." });
}
