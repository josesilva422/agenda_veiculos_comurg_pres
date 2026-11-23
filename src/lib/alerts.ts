export type AlertaTipo = "CNH_VENCIDA" | "CNH_VENCE";

export type Alerta = { userId: string; nome: string; tipo: AlertaTipo; data: Date | null };

export const alertaLabel: Record<AlertaTipo, string> = {
  CNH_VENCIDA: "CNH vencida",
  CNH_VENCE: "CNH vence em breve",
};

type U = {
  id: string;
  nome: string;
  ativo: boolean;
  cnhValidade: Date | null;
};

export const DIAS_AVISO = 30;

/** Pendências de usuários ativos: CNH vencida ou a vencer. (O termo de responsabilidade é opcional.) */
export function calcularAlertas(users: U[], agora = new Date()): Alerta[] {
  const limite = new Date(agora.getTime() + DIAS_AVISO * 86400_000);
  const out: Alerta[] = [];
  for (const u of users) {
    if (!u.ativo || !u.cnhValidade) continue;
    if (u.cnhValidade < agora) out.push({ userId: u.id, nome: u.nome, tipo: "CNH_VENCIDA", data: u.cnhValidade });
    else if (u.cnhValidade <= limite) out.push({ userId: u.id, nome: u.nome, tipo: "CNH_VENCE", data: u.cnhValidade });
  }
  return out;
}
