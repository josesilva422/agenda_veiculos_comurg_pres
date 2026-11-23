import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import type { z } from "zod";

/** Redireciona levando a mensagem que o AppShell mostra no topo da página. */
export function voltar(path: string, msg: { ok?: string; erro?: string } = {}): never {
  const q = new URLSearchParams(Object.entries(msg).filter(([, v]) => v));
  const sep = path.includes("?") ? "&" : "?";
  redirect(q.size ? `${path}${sep}${q}` : path);
}

/** Valida o formulário; se inválido, volta para `back` com o primeiro erro. */
export function validar<S extends z.ZodType>(schema: S, fd: FormData, back: string): z.output<S> {
  juntarDataHora(fd, ["inicio", "fim"]);
  const p = schema.safeParse(Object.fromEntries(fd));
  if (!p.success) voltar(back, { erro: p.error.issues[0]?.message ?? "Dados inválidos." });
  return p.data;
}

/** Violação de campo único (e-mail, placa, prefixo). */
export const duplicado = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

/**
 * Página de retorno informada pelo formulário (campo `retorno`), aceita só se estiver na lista.
 * Evita redirecionar para endereços arbitrários.
 */
export function retornoSeguro(fd: FormData, permitidos: string[]): string | null {
  const r = fd.get("retorno");
  return typeof r === "string" && permitidos.includes(r) ? r : null;
}

/** Formulários com data e hora em campos separados (`inicio_data` + `inicio_hora`) viram `inicio` = "AAAA-MM-DDTHH:mm". */
function juntarDataHora(fd: FormData, campos: string[]) {
  for (const c of campos) {
    const data = fd.get(`${c}_data`);
    const hora = fd.get(`${c}_hora`);
    if (typeof data === "string" && typeof hora === "string" && data && hora) fd.set(c, `${data}T${hora}`);
  }
}
