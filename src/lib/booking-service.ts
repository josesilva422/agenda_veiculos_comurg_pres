import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { parseLocalBr, fmtDateTime } from "./datetime";
import { validateWindow } from "./booking-rules";

export type Tx = Prisma.TransactionClient;
export type Result = { erro: string } | { id: string };

const dataHora = (erro: string) =>
  z.string().transform((v, ctx) => {
    const d = parseLocalBr(v);
    if (d) return d;
    ctx.addIssue({ code: "custom", message: erro });
    return z.NEVER;
  });

export const bookingSchema = z.object({
  vehicleId: z.string().min(1, "Selecione um veículo."),
  inicio: dataHora("Data/hora de início inválida."),
  fim: dataHora("Data/hora de fim inválida."),
  destino: z.string().trim().min(3, "Informe o destino/motivo.").max(200),
  passageiros: z.coerce.number().int("Nº de passageiros inválido.").min(1, "Informe ao menos 1 passageiro."),
  // opcional: texto livre com o nome de quem dirige
  motorista: z
    .string()
    .trim()
    .max(100, "O nome do motorista é longo demais.")
    .optional()
    .transform((v) => (v ? v : null)),
});

/** Os cinco campos que o solicitante preenche; é o que vai para o banco. */
export type BookingInput = z.output<typeof bookingSchema>;

/** Cópia dos dados da reserva, guardada em `versaoAnterior` enquanto há alteração pendente. */
export const snap = (b: BookingInput) => ({
  vehicleId: b.vehicleId,
  inicio: b.inicio.toISOString(),
  fim: b.fim.toISOString(),
  destino: b.destino,
  passageiros: b.passageiros,
  motorista: b.motorista ?? null,
});

export function lerSnap(json: string | null): ReturnType<typeof snap> | null {
  try {
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

export async function notificarAdmins(tx: Tx, bookingId: string, tipo: string, mensagem: string) {
  const admins = await tx.user.findMany({ where: { role: "ADMIN", ativo: true }, select: { id: true } });
  if (admins.length === 0) return;
  await tx.notification.createMany({
    data: admins.map((a) => ({ userId: a.id, tipo, mensagem, bookingId })),
  });
}

export async function notificarUsuario(tx: Tx, userId: string, bookingId: string, tipo: string, mensagem: string) {
  await tx.notification.create({ data: { userId, tipo, mensagem, bookingId } });
}

/** Aprovado que se sobrepõe à janela (opcionalmente ignorando uma reserva). */
export function conflitoAprovado(tx: Tx, vehicleId: string, inicio: Date, fim: Date, excludeId?: string) {
  return tx.booking.findFirst({
    where: {
      vehicleId,
      status: "APROVADO",
      inicio: { lt: fim },
      fim: { gt: inicio },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
}

/** Regras de negócio comuns a criação e edição. Retorna mensagem de erro ou null. */
export async function validarRegras(
  tx: Tx,
  userId: string,
  d: BookingInput,
  excludeId?: string,
): Promise<string | null> {
  const user = await tx.user.findUnique({ where: { id: userId }, select: { ativo: true } });
  if (!user || !user.ativo) return "Usuário inativo.";

  const janela = validateWindow(d.inicio, d.fim);
  if (janela) return janela;

  const veiculo = await tx.vehicle.findUnique({ where: { id: d.vehicleId } });
  if (!veiculo) return "Veículo não encontrado.";
  if (veiculo.status !== "ATIVO") return "Este veículo não está disponível para agendamento.";
  if (d.passageiros > veiculo.lotacao) return `A lotação deste veículo é de ${veiculo.lotacao} passageiros.`;

  const conflito = await conflitoAprovado(tx, d.vehicleId, d.inicio, d.fim, excludeId);
  if (conflito) {
    return `Veículo já reservado de ${fmtDateTime(conflito.inicio)} a ${fmtDateTime(conflito.fim)}.`;
  }
  return null;
}

/** Mensagem mostrada quando o próprio banco (PostgreSQL) recusa duas reservas aprovadas no mesmo horário. */
export const MSG_SOBREPOSICAO = "Conflito: outra reserva aprovada acabou de ocupar este veículo nesse horário.";

/** A regra "booking_no_overlap" do PostgreSQL disparou (duas aprovações ao mesmo tempo). */
export function ehSobreposicao(e: unknown): boolean {
  return e instanceof Error && e.message.includes("booking_no_overlap");
}
