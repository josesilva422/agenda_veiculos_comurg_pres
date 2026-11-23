import { prisma } from "./prisma";

/** Limite de tentativas de login por e-mail/matrícula, guardado no banco (vale entre servidores e reinícios). */
export const MAX_FALHAS = 5;
export const JANELA_MS = 15 * 60_000;

type Reg = { falhas: number; desde: Date };

const chave = (login: string) => login.trim().toLowerCase();

/** Regras puras (testáveis): a janela de 15 min recomeça quando expira. */
export const expirou = (r: Reg, agora: number) => agora - r.desde.getTime() > JANELA_MS;
export const bloqueado = (r: Reg | null, agora: number) => !!r && !expirou(r, agora) && r.falhas >= MAX_FALHAS;

export async function estaBloqueado(login: string, agora = Date.now()): Promise<boolean> {
  const r = await prisma.loginTentativa.findUnique({ where: { chave: chave(login) } });
  return bloqueado(r, agora);
}

export async function registrarFalha(login: string, agora = Date.now()) {
  const k = chave(login);
  const r = await prisma.loginTentativa.findUnique({ where: { chave: k } });
  if (!r || expirou(r, agora)) {
    await prisma.loginTentativa.upsert({
      where: { chave: k },
      create: { chave: k, falhas: 1, desde: new Date(agora) },
      update: { falhas: 1, desde: new Date(agora) },
    });
  } else {
    await prisma.loginTentativa.update({ where: { chave: k }, data: { falhas: { increment: 1 } } });
  }
  // limpa registros antigos para a tabela não crescer
  await prisma.loginTentativa.deleteMany({ where: { desde: { lt: new Date(agora - JANELA_MS) } } });
}

export async function limparFalhas(login: string) {
  await prisma.loginTentativa.deleteMany({ where: { chave: chave(login) } });
}
