import { ATIVOS, type BookingStatus } from "./status";

export const MIN_ANTECEDENCIA_MIN = Number(process.env.MIN_ANTECEDENCIA_MIN ?? 30);
export const MAX_DURACAO_H = 24 * 7;

/** Intervalos [inicio, fim) — encostar (fim == início do outro) não é conflito. */
export function overlaps(a: { inicio: Date; fim: Date }, b: { inicio: Date; fim: Date }) {
  return a.inicio < b.fim && b.inicio < a.fim;
}

/**
 * Confere início, fim e duração. `minAntecedenciaMin` = null dispensa a antecedência e permite datas passadas
 * (lançamentos do administrador: uso em andamento ou que já aconteceu).
 */
export function validateWindow(
  inicio: Date,
  fim: Date,
  agora = new Date(),
  minAntecedenciaMin: number | null = MIN_ANTECEDENCIA_MIN,
): string | null {
  if (fim <= inicio) return "O fim deve ser posterior ao início.";
  if (minAntecedenciaMin !== null && inicio.getTime() < agora.getTime() + minAntecedenciaMin * 60_000) {
    return minAntecedenciaMin > 0
      ? `O início deve ter ao menos ${minAntecedenciaMin} minutos de antecedência.`
      : "O início não pode estar no passado.";
  }
  if (fim.getTime() - inicio.getTime() > MAX_DURACAO_H * 3600_000) {
    return `A duração máxima é de ${MAX_DURACAO_H / 24} dias.`;
  }
  return null;
}

/** Edição/cancelamento pelo solicitante: só reservas ativas que ainda não começaram. */
export function podeModificar(status: BookingStatus, inicio: Date, agora = new Date()) {
  return ATIVOS.includes(status) && inicio > agora;
}
