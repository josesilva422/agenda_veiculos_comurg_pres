import { prisma } from "./prisma";
import { fmtData } from "./datetime";
import { pendenciaKm, textoPendencia } from "./km";

const DIA_MS = 86400_000;
/** Só lembra de reservas recentes (as muito antigas ficam apenas na lista de pendências). */
const JANELA_DIAS = 30;
/** Enquanto a pendência existir, o lembrete se repete a cada 24 h (se o usuário abrir o sistema). */
const INTERVALO_MS = DIA_MS;

export const TIPO_KM_PENDENTE = "KM_PENDENTE";

/**
 * Cria notificações para as reservas aprovadas do usuário em que falta o km inicial (o uso já começou)
 * ou o km final (o uso já terminou). Chamada ao abrir o sistema; sem tarefa agendada, funciona local e na Vercel.
 * Idempotente: no máximo um lembrete por reserva a cada 24 h.
 */
export async function gerarLembretesKm(userId: string): Promise<void> {
  const agora = new Date();
  const reservas = await prisma.booking.findMany({
    where: {
      userId,
      status: "APROVADO",
      inicio: { lte: agora },
      fim: { gte: new Date(agora.getTime() - JANELA_DIAS * DIA_MS) },
      OR: [{ kmInicial: null }, { kmFinal: null, fim: { lte: agora } }],
    },
    select: { id: true, status: true, inicio: true, fim: true, kmInicial: true, kmFinal: true, vehicle: { select: { prefixo: true } } },
  });
  const pendentes = reservas.flatMap((b) => {
    const p = pendenciaKm(b, agora);
    return p ? [{ b, texto: textoPendencia(p) }] : [];
  });
  if (pendentes.length === 0) return;

  const recentes = await prisma.notification.findMany({
    where: {
      userId,
      tipo: TIPO_KM_PENDENTE,
      bookingId: { in: pendentes.map((x) => x.b.id) },
      criadoEm: { gt: new Date(agora.getTime() - INTERVALO_MS) },
    },
    select: { bookingId: true },
  });
  const jaAvisadas = new Set(recentes.map((r) => r.bookingId));
  const novas = pendentes.filter((x) => !jaAvisadas.has(x.b.id));
  if (novas.length === 0) return;

  await prisma.notification.createMany({
    data: novas.map(({ b, texto }) => ({
      userId,
      tipo: TIPO_KM_PENDENTE,
      bookingId: b.id,
      mensagem: `Informe o ${texto} da reserva de ${b.vehicle.prefixo} (${fmtData(b.inicio)}).`,
    })),
  });
}
