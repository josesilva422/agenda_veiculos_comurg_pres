// Fuso fixo de Brasília (UTC-3, sem horário de verão). Datas ficam em UTC no banco.
const OFFSET_H = 3;
const TZ = "America/Sao_Paulo";

/** "2026-11-20T08:30" (horário de Brasília) -> Date UTC. Retorna null se inválido. */
export function parseLocalBr(v: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null;
  const d = new Date(`${v}:00-0${OFFSET_H}:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Date UTC -> "YYYY-MM-DDTHH:mm" em Brasília, para <input type="datetime-local">. */
export function toInputDateTime(d: Date): string {
  return new Date(d.getTime() - OFFSET_H * 3600_000).toISOString().slice(0, 16);
}

/** Date UTC -> hora de parede de Brasília como string ISO sem fuso ("2026-12-02T08:00:00"). */
export function toWallIso(d: Date): string {
  return new Date(d.getTime() - OFFSET_H * 3600_000).toISOString().slice(0, 19);
}

/** Hora de parede de Brasília (lida como UTC pelo calendário) -> instante real. */
export function fromWall(d: Date): Date {
  return new Date(d.getTime() + OFFSET_H * 3600_000);
}

export const fmtDateTime = (d: Date) =>
  d.toLocaleString("pt-BR", { timeZone: TZ, dateStyle: "short", timeStyle: "short" });

export const fmtPeriodo = (b: { inicio: Date; fim: Date }) => `${fmtDateTime(b.inicio)} → ${fmtDateTime(b.fim)}`;

export const fmtData = (d: Date | null | undefined) => (d ? d.toLocaleDateString("pt-BR", { timeZone: TZ }) : "—");

/** Date -> "YYYY-MM-DD" para <input type="date">. */
export const toInputDate = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");
