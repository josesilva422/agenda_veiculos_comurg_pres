import type { BookingStatus } from "./status";

export type ReportRow = {
  userId: string;
  vehicleId: string;
  inicio: Date;
  fim: Date;
  status: BookingStatus;
  user: { nome: string; setor: string | null };
  vehicle: { prefixo: string; placa: string };
};

export type Agg = {
  nome: string;
  detalhe: string;
  total: number;
  aprovadas: number;
  canceladas: number;
  rejeitadas: number;
  horasAprovadas: number;
};

export const horas = (r: { inicio: Date; fim: Date }) => (r.fim.getTime() - r.inicio.getTime()) / 3600_000;

function agg(map: Map<string, Agg>, key: string, nome: string, detalhe: string, r: ReportRow) {
  const a = map.get(key) ?? { nome, detalhe, total: 0, aprovadas: 0, canceladas: 0, rejeitadas: 0, horasAprovadas: 0 };
  a.total++;
  if (r.status === "APROVADO") {
    a.aprovadas++;
    a.horasAprovadas += horas(r);
  }
  if (r.status === "CANCELADO") a.canceladas++;
  if (r.status === "REJEITADO") a.rejeitadas++;
  map.set(key, a);
}

export function summarize(rows: ReportRow[]) {
  const porStatus: Record<BookingStatus, number> = {
    PENDENTE: 0, APROVADO: 0, REJEITADO: 0, CANCELADO: 0, ALTERACAO_PENDENTE: 0,
  };
  const veic = new Map<string, Agg>();
  const usu = new Map<string, Agg>();
  for (const r of rows) {
    porStatus[r.status]++;
    agg(veic, r.vehicleId, r.vehicle.prefixo, r.vehicle.placa, r);
    agg(usu, r.userId, r.user.nome, r.user.setor ?? "—", r);
  }
  const ordena = (m: Map<string, Agg>) =>
    [...m.values()].sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, "pt-BR"));
  return {
    total: rows.length,
    horasAprovadas: rows.filter((r) => r.status === "APROVADO").reduce((s, r) => s + horas(r), 0),
    porStatus,
    porVeiculo: ordena(veic),
    porUsuario: ordena(usu),
  };
}

export type Summary = ReturnType<typeof summarize>;
