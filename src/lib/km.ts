import type { Prisma, PrismaClient } from "@prisma/client";

/** Quilometragem (hodômetro) registrada a cada agendamento: regras de validação e consultas. */

export const KM_MAX = 9_999_999;
/** Percurso acima disso é só destacado para o administrador conferir (não bloqueia). */
export const PERCURSO_ALERTA_KM = 1000;

export type Referencia = { km: number; quando: Date } | null;

const n = (v: number) => v.toLocaleString("pt-BR");
const dia = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

/**
 * Confere os números digitados. Retorna a mensagem de erro ou null.
 * `conferirVizinhos` liga a conferência com as reservas vizinhas do mesmo veículo (o hodômetro nunca anda para trás):
 * usada para o solicitante; o administrador pode corrigir sem essa trava.
 */
export function validarKm(p: {
  kmInicial: number | null;
  kmFinal: number | null;
  anterior: Referencia;
  proximo: Referencia;
  conferirVizinhos: boolean;
}): string | null {
  const { kmInicial, kmFinal } = p;
  for (const v of [kmInicial, kmFinal]) {
    if (v !== null && (!Number.isInteger(v) || v < 0 || v > KM_MAX)) return "Quilometragem inválida: use só números inteiros (sem vírgula ou ponto).";
  }
  if (kmInicial !== null && kmFinal !== null && kmFinal < kmInicial) {
    return `O km final (${n(kmFinal)}) não pode ser menor que o km inicial (${n(kmInicial)}).`;
  }
  if (!p.conferirVizinhos) return null;
  if (kmInicial !== null && p.anterior && kmInicial < p.anterior.km) {
    return `O km inicial (${n(kmInicial)}) é menor que o último km registrado deste veículo (${n(p.anterior.km)}, em ${dia(p.anterior.quando)}). Confira o hodômetro.`;
  }
  const ultimo = kmFinal ?? kmInicial;
  if (ultimo !== null && p.proximo && ultimo > p.proximo.km) {
    return `O km informado (${n(ultimo)}) é maior que o km já registrado na reserva seguinte deste veículo (${n(p.proximo.km)}, em ${dia(p.proximo.quando)}). Confira o hodômetro.`;
  }
  return null;
}

/** Percurso em km (ou null se faltar algum dos dois números). */
export const percurso = (kmInicial: number | null, kmFinal: number | null) =>
  kmInicial !== null && kmFinal !== null ? kmFinal - kmInicial : null;

/**
 * O que falta registrar numa reserva aprovada: o km inicial passa a ser devido quando o uso começa,
 * e o km final quando o uso termina.
 */
export function pendenciaKm(
  b: { status: string; inicio: Date; fim: Date; kmInicial: number | null; kmFinal: number | null },
  agora = new Date(),
): { inicial: boolean; final: boolean } | null {
  if (b.status !== "APROVADO") return null;
  const inicial = b.kmInicial === null && b.inicio <= agora;
  const final = b.kmFinal === null && b.fim <= agora;
  return inicial || final ? { inicial, final } : null;
}

/** "km inicial", "km final" ou "km inicial e final". */
export const textoPendencia = (p: { inicial: boolean; final: boolean }) =>
  p.inicial && p.final ? "km inicial e final" : p.final ? "km final" : "km inicial";

type Cliente = PrismaClient | Prisma.TransactionClient;

/** Último km conhecido antes da reserva e primeiro depois dela, no mesmo veículo (só reservas aprovadas). */
export async function referenciasKm(
  db: Cliente,
  b: { id: string; vehicleId: string; inicio: Date },
): Promise<{ anterior: Referencia; proximo: Referencia }> {
  const comKm = { OR: [{ kmInicial: { not: null } }, { kmFinal: { not: null } }] };
  const [ant, prox] = await Promise.all([
    db.booking.findFirst({
      where: { vehicleId: b.vehicleId, status: "APROVADO", id: { not: b.id }, inicio: { lt: b.inicio }, ...comKm },
      orderBy: { inicio: "desc" },
      select: { inicio: true, kmInicial: true, kmFinal: true },
    }),
    db.booking.findFirst({
      where: { vehicleId: b.vehicleId, status: "APROVADO", id: { not: b.id }, inicio: { gt: b.inicio }, ...comKm },
      orderBy: { inicio: "asc" },
      select: { inicio: true, kmInicial: true, kmFinal: true },
    }),
  ]);
  return {
    anterior: ant ? { km: (ant.kmFinal ?? ant.kmInicial)!, quando: ant.inicio } : null,
    proximo: prox ? { km: (prox.kmInicial ?? prox.kmFinal)!, quando: prox.inicio } : null,
  };
}
