import { prisma } from "./prisma";

/**
 * Limite de tentativas de login com erro, guardado no banco (vale entre servidores e reinícios). Duas contagens:
 * - por conta + origem (IP): 5 erros em 15 min bloqueiam aquela conta só para aquela origem. Quem está de fora
 *   não consegue travar a conta de outra pessoa (por exemplo, a do administrador).
 * - por origem: 100 erros em 15 min, em quaisquer contas, bloqueiam a origem. Impede testar uma mesma senha
 *   em muitas matrículas. O limite é alto porque, na rede da empresa, todos saem pelo mesmo IP.
 */
export const LIMITE = { conta: 5, origem: 100 };
export const JANELA_MS = 15 * 60_000;

type Reg = { falhas: number; desde: Date };

/** Regras puras (testáveis): a janela de 15 min recomeça quando expira. */
export const expirou = (r: Reg, agora: number) => agora - r.desde.getTime() > JANELA_MS;
export const bloqueado = (r: Reg | null, agora: number, max: number) => !!r && !expirou(r, agora) && r.falhas >= max;

export const chaves = (login: string, origem: string) => ({
  conta: `conta:${login.trim().toLowerCase()}|${origem}`,
  origem: `origem:${origem}`,
});

/**
 * Origem (IP) de quem tenta entrar. Só confia no cabeçalho do proxy quando há um proxy que o define
 * (Vercel, ou TRUST_PROXY=1 atrás de um proxy reverso próprio); sem isso o cabeçalho poderia ser forjado
 * para escapar do limite, então todas as tentativas contam como a mesma origem.
 */
export function origemDaRequisicao(headers: Record<string, unknown> | undefined, env: NodeJS.ProcessEnv = process.env): string {
  if (!env.VERCEL && env.TRUST_PROXY !== "1") return "local";
  const xff = headers?.["x-forwarded-for"];
  const ip = (typeof xff === "string" ? xff.split(",")[0] : "").trim() || String(headers?.["x-real-ip"] ?? "").trim();
  return ip || "desconhecida";
}

export async function estaBloqueado(login: string, origem: string, agora = Date.now()): Promise<boolean> {
  const k = chaves(login, origem);
  const regs = await prisma.loginTentativa.findMany({ where: { chave: { in: [k.conta, k.origem] } } });
  const reg = (c: string) => regs.find((r) => r.chave === c) ?? null;
  return bloqueado(reg(k.conta), agora, LIMITE.conta) || bloqueado(reg(k.origem), agora, LIMITE.origem);
}

async function somarFalha(chave: string, agora: number) {
  const r = await prisma.loginTentativa.findUnique({ where: { chave } });
  if (!r || expirou(r, agora)) {
    await prisma.loginTentativa.upsert({
      where: { chave },
      create: { chave, falhas: 1, desde: new Date(agora) },
      update: { falhas: 1, desde: new Date(agora) },
    });
  } else {
    await prisma.loginTentativa.update({ where: { chave }, data: { falhas: { increment: 1 } } });
  }
}

export async function registrarFalha(login: string, origem: string, agora = Date.now()) {
  const k = chaves(login, origem);
  await somarFalha(k.conta, agora);
  await somarFalha(k.origem, agora);
  // limpa registros antigos para a tabela não crescer
  await prisma.loginTentativa.deleteMany({ where: { desde: { lt: new Date(agora - JANELA_MS) } } });
}

/** Login certo: zera a contagem daquela conta naquela origem (a contagem da origem continua). */
export async function limparFalhas(login: string, origem: string) {
  await prisma.loginTentativa.deleteMany({ where: { chave: chaves(login, origem).conta } });
}
