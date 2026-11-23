/** Fonte única de rótulos e cores de status. Mudou aqui, muda em telas, calendário e relatórios. */
export type BookingStatus = "PENDENTE" | "ALTERACAO_PENDENTE" | "APROVADO" | "REJEITADO" | "CANCELADO";

/** Cores de situação, usadas nos marcadores (bolinhas) e no calendário. */
export const COR = { ok: "#16a34a", alerta: "#d97706", erro: "#dc2626", info: "#2563eb", neutro: "#94a3b8" };

export const statusInfo: Record<BookingStatus, { label: string; cor: string }> = {
  PENDENTE: { label: "Pendente", cor: COR.alerta },
  ALTERACAO_PENDENTE: { label: "Alteração pendente", cor: COR.info },
  APROVADO: { label: "Aprovado", cor: COR.ok },
  REJEITADO: { label: "Rejeitado", cor: COR.erro },
  CANCELADO: { label: "Cancelado", cor: COR.neutro },
};

export const STATUS = Object.keys(statusInfo) as BookingStatus[];
/** Aguardando decisão do administrador. */
export const AGUARDANDO: BookingStatus[] = ["PENDENTE", "ALTERACAO_PENDENTE"];
/** Ainda ocupam (ou podem ocupar) o veículo. */
export const ATIVOS: BookingStatus[] = [...AGUARDANDO, "APROVADO"];
export const ehStatus = (v: unknown): v is BookingStatus => STATUS.includes(v as BookingStatus);

/** Cor das reservas de terceiros no calendário do usuário. */
export const COR_OCUPADO = "#64748b";

export const veiculoStatus = {
  ATIVO: { label: "Ativo", cor: COR.ok },
  MANUTENCAO: { label: "Em manutenção", cor: COR.alerta },
  INATIVO: { label: "Inativo", cor: COR.neutro },
} as const;
export const VEICULO_STATUS = Object.keys(veiculoStatus) as (keyof typeof veiculoStatus)[];
